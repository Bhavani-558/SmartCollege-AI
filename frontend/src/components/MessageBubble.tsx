import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import { ApiServiceError } from "../services/api";
import { feedbackService } from "../services/feedbackService";
import type { ChatMessage, MessageFeedback } from "../types/chat";
import type { FeedbackReason } from "../types/feedback";
import { getOrCreateSessionId } from "../utils/chatHistoryStorage";
import { copyMessageText, shareMessage } from "../utils/exportUtils";
import {
  cleanVerifiedAnswerText,
  formatCategoryLabel,
  formatConfidencePercent,
  formatSourceLabel,
  formatTimestamp,
  isHttpUrl,
  splitTextWithLinks,
} from "../utils/formatters";

const FEEDBACK_REASONS: FeedbackReason[] = [
  "Incorrect answer",
  "Outdated information",
  "Irrelevant answer",
  "Incomplete answer",
  "Other",
];

interface MessageBubbleProps {
  message: ChatMessage;
  precedingStudentQuestion?: string;
  onFeedbackChange?: (messageId: string, feedback: MessageFeedback) => void;
  onNotify?: (message: string, severity?: "success" | "info" | "warning" | "error") => void;
}

const RichMessageText: React.FC<{
  text: string;
  inverted?: boolean;
}> = ({ text, inverted = false }) => {
  const segments = splitTextWithLinks(text);
  return (
    <Typography
      variant="body2"
      sx={{
        whiteSpace: "pre-line",
        lineHeight: 1.65,
        wordBreak: "break-word",
        color: inverted ? "#FFFFFF" : "text.primary",
      }}
    >
      {segments.map((seg, idx) => {
        if (seg.type === "link") {
          return (
            <Link
              key={`${seg.value}-${idx}`}
              href={seg.value}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
              sx={{
                color: inverted ? "#E0E7FF" : "primary.main",
                fontWeight: 600,
              }}
            >
              {seg.value}
            </Link>
          );
        }
        if (seg.type === "email") {
          return (
            <Link
              key={`${seg.value}-${idx}`}
              href={`mailto:${seg.value}`}
              underline="always"
              sx={{
                color: inverted ? "#E0E7FF" : "secondary.main",
                fontWeight: 600,
              }}
            >
              {seg.value}
            </Link>
          );
        }
        return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
      })}
    </Typography>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  precedingStudentQuestion,
  onFeedbackChange,
  onNotify,
}) => {
  const isStudent = message.role === "student";
  const meta = message.meta;

  const [copied, setCopied] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<FeedbackReason>("Incorrect answer");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleCopy = async () => {
    const ok = await copyMessageText(message);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify?.("Answer copied to clipboard!", "success");
    } else {
      onNotify?.("Failed to copy answer", "error");
    }
  };

  const handleShare = async () => {
    const result = await shareMessage(message);
    if (result.shared) {
      onNotify?.("Shared successfully!", "success");
    } else if (result.copied) {
      onNotify?.("Answer copied to clipboard for sharing!", "success");
    } else {
      onNotify?.("Share was canceled or unavailable", "info");
    }
  };

  const handleThumbsUp = async () => {
    if (message.feedback?.rating === "thumbs_up") {
      onNotify?.("You've already rated this answer as helpful.", "info");
      return;
    }

    const sessionId = getOrCreateSessionId();
    const collegeId = message.collegeId || "general";
    const collegeName = message.collegeName || "General Support";
    const question = precedingStudentQuestion || "Student Query";
    const answer = message.content;

    try {
      await feedbackService.submitFeedback({
        session_id: sessionId,
        message_id: message.id,
        college_id: collegeId,
        college_name: collegeName,
        question,
        answer,
        intent: message.meta?.intent || null,
        rating: "thumbs_up",
      });

      const updatedFeedback: MessageFeedback = {
        rating: "thumbs_up",
        submittedAt: new Date().toISOString(),
      };
      onFeedbackChange?.(message.id, updatedFeedback);
      onNotify?.("Thank you! Your feedback helps improve institutional answers.", "success");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to record feedback. Please check your network.";
      onNotify?.(errorMessage, "error");
    }
  };

  const handleOpenNegativeFeedbackDialog = () => {
    setFeedbackReason(
      (message.feedback?.reason as FeedbackReason) || "Incorrect answer",
    );
    setFeedbackComment(message.feedback?.comment || "");
    setFeedbackDialogOpen(true);
  };

  const handleSubmitNegativeFeedback = async () => {
    setIsSubmittingFeedback(true);
    const sessionId = getOrCreateSessionId();
    const collegeId = message.collegeId || "general";
    const collegeName = message.collegeName || "General Support";
    const question = precedingStudentQuestion || "Student Query";
    const answer = message.content;

    try {
      await feedbackService.submitFeedback({
        session_id: sessionId,
        message_id: message.id,
        college_id: collegeId,
        college_name: collegeName,
        question,
        answer,
        intent: message.meta?.intent || null,
        rating: "thumbs_down",
        reason: feedbackReason,
        comment: feedbackComment.trim() || null,
      });

      const updatedFeedback: MessageFeedback = {
        rating: "thumbs_down",
        reason: feedbackReason,
        comment: feedbackComment.trim() || undefined,
        submittedAt: new Date().toISOString(),
      };
      onFeedbackChange?.(message.id, updatedFeedback);
      setFeedbackDialogOpen(false);
      onNotify?.("Feedback received! Institutional administrators will review this query.", "success");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to submit feedback. Please check your network.";
      onNotify?.(errorMessage, "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isStudent) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          gap: 1.25,
        }}
      >
        <Box sx={{ maxWidth: { xs: "88%", sm: "72%" } }}>
          <Paper
            elevation={0}
            sx={{
              px: 2.25,
              py: 1.5,
              borderRadius: "16px 16px 4px 16px",
              background: "linear-gradient(135deg, #2563EB 0%, #6D28D9 100%)",
              color: "#FFFFFF",
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.22)",
            }}
          >
            <RichMessageText text={message.content} inverted />
          </Paper>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "right",
              mt: 0.5,
              fontSize: "0.72rem",
            }}
          >
            {message.collegeName ? `${message.collegeName} • ` : ""}
            {formatTimestamp(message.timestamp)}
          </Typography>
        </Box>

        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: "#EEF2FF",
            color: "primary.main",
            border: "1px solid #C7D2FE",
          }}
        >
          <PersonRoundedIcon fontSize="small" />
        </Avatar>
      </Box>
    );
  }

  const isVerified = meta?.responseType === "verified_faq";
  const isPending = meta?.responseType === "pending_verification";
  const isUnknown = meta?.responseType === "unknown";
  const isError = Boolean(meta?.isError);
  const currentRating = message.feedback?.rating;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        gap: 1.25,
      }}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          background: isError
            ? "#DC2626"
            : "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
        }}
      >
        {isError ? (
          <ErrorOutlineRoundedIcon fontSize="small" />
        ) : (
          <SmartToyRoundedIcon fontSize="small" />
        )}
      </Avatar>

      <Box sx={{ maxWidth: { xs: "90%", sm: "76%" } }}>
        <Paper
          elevation={0}
          sx={{
            px: 2.25,
            py: 1.75,
            borderRadius: "16px 16px 16px 4px",
            bgcolor: isError
              ? "#FEF2F2"
              : isPending
                ? "#FFFBEB"
                : "#FFFFFF",
            border: "1px solid",
            borderColor: isError
              ? "#FECACA"
              : isPending
                ? "#FDE68A"
                : isVerified
                  ? "#BFDBFE"
                  : "#E2E8F0",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
          }}
        >
          {(meta?.intent || meta?.verificationStatus || isError) && (
            <Stack
              direction="row"
              spacing={0.8}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.25 }}
            >
              {isVerified && (
                <Chip
                  size="small"
                  icon={<CheckCircleOutlineRoundedIcon />}
                  label="VERIFIED FAQ"
                  color="success"
                  variant="outlined"
                  sx={{ height: 24, fontSize: "0.7rem" }}
                />
              )}

              {isPending && (
                <Chip
                  size="small"
                  icon={<HourglassTopRoundedIcon />}
                  label="PENDING VERIFICATION"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 24, fontSize: "0.7rem" }}
                />
              )}

              {isUnknown && (
                <Chip
                  size="small"
                  icon={<HelpOutlineRoundedIcon />}
                  label="Needs Clarification"
                  color="default"
                  variant="outlined"
                  sx={{ height: 24, fontSize: "0.7rem" }}
                />
              )}

              {meta?.intent && meta.intent !== "unknown" && (
                <Chip
                  size="small"
                  label={formatCategoryLabel(meta.intent)}
                  sx={{
                    height: 24,
                    fontSize: "0.7rem",
                    bgcolor: "#EEF2FF",
                    color: "#3730A3",
                  }}
                />
              )}

              {typeof meta?.confidence === "number" && (
                <Chip
                  size="small"
                  label={`${formatConfidencePercent(meta.confidence)} confidence`}
                  sx={{
                    height: 24,
                    fontSize: "0.7rem",
                    bgcolor: "#F1F5F9",
                    color: "text.secondary",
                  }}
                />
              )}
            </Stack>
          )}

          <RichMessageText
            text={
              isStudent
                ? message.content
                : isVerified
                  ? cleanVerifiedAnswerText(message.content, meta?.source)
                  : message.content
            }
          />

          {isPending && message.collegeName && (
            <Typography
              variant="caption"
              color="warning.dark"
              sx={{ display: "block", mt: 1, fontWeight: 500 }}
            >
              {`Official verification pending with ${message.collegeName} (${message.collegeId || ""})${meta?.intent ? ` • Category: ${formatCategoryLabel(meta.intent)}` : ""}. Institutional staff will review this record.`}
            </Typography>
          )}

          {isVerified && (meta?.source || meta?.lastVerified) && (
            <>
              <Divider sx={{ my: 1.25 }} />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                {meta.source && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Source:
                    </Typography>
                    {isHttpUrl(meta.source) ? (
                      <Link
                        href={meta.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={meta.source}
                        variant="caption"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.35,
                          fontWeight: 600,
                        }}
                      >
                        {formatSourceLabel(meta.source)}
                        <LaunchRoundedIcon sx={{ fontSize: 13 }} />
                      </Link>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {meta.source}
                      </Typography>
                    )}
                  </Stack>
                )}

                {meta.lastVerified && (
                  <Typography variant="caption" color="text.secondary">
                    Last verified: {meta.lastVerified}
                  </Typography>
                )}
              </Stack>
            </>
          )}

          {/* Action Row: Copy, Share, Thumbs Up, Thumbs Down */}
          {!isError && (
            <>
              <Divider sx={{ my: 1.25, opacity: 0.6 }} />
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                useFlexGap
              >
                {/* Left group: Copy & Share */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title={copied ? "Copied!" : "Copy answer and citations"}>
                    <IconButton
                      size="small"
                      aria-label="Copy answer"
                      onClick={() => void handleCopy()}
                      sx={{
                        color: copied ? "success.main" : "text.secondary",
                        p: 0.75,
                        "&:hover": { bgcolor: "#F1F5F9" },
                      }}
                    >
                      {copied ? (
                        <CheckRoundedIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Share answer">
                    <IconButton
                      size="small"
                      aria-label="Share answer"
                      onClick={() => void handleShare()}
                      sx={{
                        color: "text.secondary",
                        p: 0.75,
                        "&:hover": { bgcolor: "#F1F5F9" },
                      }}
                    >
                      <ShareRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Right group: Thumbs Up / Down Feedback */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {currentRating === "thumbs_up" && (
                    <Chip
                      size="small"
                      label="Helpful"
                      color="success"
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.68rem" }}
                    />
                  )}
                  {currentRating === "thumbs_down" && (
                    <Chip
                      size="small"
                      label="Reported"
                      color="error"
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.68rem" }}
                    />
                  )}

                  <Tooltip title="Helpful answer">
                    <IconButton
                      size="small"
                      aria-label="Helpful answer"
                      onClick={() => void handleThumbsUp()}
                      sx={{
                        color:
                          currentRating === "thumbs_up"
                            ? "success.main"
                            : "text.secondary",
                        p: 0.75,
                        "&:hover": { bgcolor: "#ECFDF5" },
                      }}
                    >
                      {currentRating === "thumbs_up" ? (
                        <ThumbUpRoundedIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Report an issue with this answer">
                    <IconButton
                      size="small"
                      aria-label="Report issue"
                      onClick={handleOpenNegativeFeedbackDialog}
                      sx={{
                        color:
                          currentRating === "thumbs_down"
                            ? "error.main"
                            : "text.secondary",
                        p: 0.75,
                        "&:hover": { bgcolor: "#FEF2F2" },
                      }}
                    >
                      {currentRating === "thumbs_down" ? (
                        <ThumbDownRoundedIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </>
          )}
        </Paper>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.5,
            fontSize: "0.72rem",
          }}
        >
          Smart College Assistant
          {message.collegeName ? ` • ${message.collegeName}` : ""}
          {` • ${formatTimestamp(message.timestamp)}`}
        </Typography>
      </Box>

      {/* Negative Feedback Dialog */}
      <Dialog
        open={feedbackDialogOpen}
        onClose={() => !isSubmittingFeedback && setFeedbackDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="feedback-dialog-title"
      >
        <DialogTitle id="feedback-dialog-title" sx={{ pb: 1, fontWeight: 700 }}>
          Help Us Improve
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What was the issue with this response? Your feedback helps institutional administrators maintain accurate information.
          </Typography>

          <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
            <RadioGroup
              aria-label="feedback reason"
              name="feedback-reason"
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value as FeedbackReason)}
            >
              {FEEDBACK_REASONS.map((reason) => (
                <FormControlLabel
                  key={reason}
                  value={reason}
                  control={<Radio size="small" />}
                  label={<Typography variant="body2">{reason}</Typography>}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional comments (optional)"
            placeholder="Tell us more about what was incorrect or missing..."
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            disabled={isSubmittingFeedback}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setFeedbackDialogOpen(false)}
            disabled={isSubmittingFeedback}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmitNegativeFeedback()}
            variant="contained"
            color="primary"
            disabled={isSubmittingFeedback}
            startIcon={isSubmittingFeedback ? <CircularProgress size={16} /> : undefined}
          >
            {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
