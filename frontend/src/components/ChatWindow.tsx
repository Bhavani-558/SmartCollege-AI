import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import { useCollege } from "../contexts/CollegeContext";
import type { ApiServiceError } from "../services/api";
import type { ChatMessage, MessageFeedback } from "../types/chat";
import {
  copyConversationText,
  exportConversationAsPdf,
  exportConversationAsTxt,
  shareConversation,
} from "../utils/exportUtils";
import {
  cleanVerifiedAnswerText,
  formatCategoryLabel,
  formatSourceLabel,
  isHttpUrl,
} from "../utils/formatters";
import { CollegeAvatar } from "./CollegeAvatar";
import { CollegeSelector } from "./CollegeSelector";
import { LoadingIndicator } from "./LoadingIndicator";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { SuggestedQuestions } from "./SuggestedQuestions";

interface ChatWindowProps {
  messages: ChatMessage[];
  isSending: boolean;
  chatError: ApiServiceError | null;
  faqsModalOpen: boolean;
  onSetFaqsModalOpen: (open: boolean) => void;
  onSendQuestion: (question: string) => Promise<void>;
  onClearConversation: () => void;
  onDismissChatError: () => void;
  onFeedbackChange?: (messageId: string, feedback: MessageFeedback) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isSending,
  chatError,
  faqsModalOpen,
  onSetFaqsModalOpen,
  onSendQuestion,
  onClearConversation,
  onDismissChatError,
  onFeedbackChange,
}) => {
  const {
    colleges,
    selectedCollege,
    collegeFaqs,
    collegeError,
    selectCollege,
    refreshColleges,
    clearCollegeError,
  } = useCollege();

  const [faqFilter, setFaqFilter] = useState<
    "ALL" | "VERIFIED" | "PENDING_VERIFICATION"
  >("ALL");

  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "info" | "warning" | "error";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  const filteredFaqs = useMemo(() => {
    if (!collegeFaqs) return [];
    if (faqFilter === "ALL") return collegeFaqs.faqs;
    return collegeFaqs.faqs.filter((item) => item.verification_status === faqFilter);
  }, [collegeFaqs, faqFilter]);

  const handleNotify = (
    message: string,
    severity: "success" | "info" | "warning" | "error" = "info",
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCopyFullConversation = async () => {
    setActionsMenuAnchor(null);
    const success = await copyConversationText(messages, selectedCollege?.college_name);
    if (success) {
      handleNotify("Full conversation copied to clipboard!", "success");
    } else {
      handleNotify("Failed to copy conversation", "error");
    }
  };

  const handleShareFullConversation = async () => {
    setActionsMenuAnchor(null);
    const result = await shareConversation(messages, selectedCollege?.college_name);
    if (result.shared) {
      handleNotify("Conversation shared successfully!", "success");
    } else if (result.copied) {
      handleNotify("Conversation transcript copied to clipboard for sharing!", "success");
    } else {
      handleNotify("Share was canceled or unavailable", "info");
    }
  };

  const handleExportTxt = () => {
    setActionsMenuAnchor(null);
    try {
      exportConversationAsTxt(messages, selectedCollege?.college_name);
      handleNotify("Conversation exported as text (.txt) file!", "success");
    } catch {
      handleNotify("Failed to export conversation as TXT", "error");
    }
  };

  const handleExportPdf = () => {
    setActionsMenuAnchor(null);
    try {
      exportConversationAsPdf(messages, selectedCollege?.college_name);
      handleNotify("Conversation exported as PDF document!", "success");
    } catch {
      handleNotify("Failed to generate PDF document", "error");
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#F8FAFC",
        minHeight: 0,
      }}
    >
      {/* Top Chat Header */}
      <Paper
        elevation={0}
        square
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: 1.5,
          borderBottom: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
            <CollegeAvatar
              logoUrl={selectedCollege?.logo_url}
              collegeName={selectedCollege?.college_name ?? "General Student Support"}
              size={40}
            />
            <Box minWidth={0}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {selectedCollege
                  ? selectedCollege.college_name
                  : "General Student Support"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {selectedCollege
                  ? `${selectedCollege.location ? `${selectedCollege.location} • ` : ""}${selectedCollege.verified_faq_count} Verified / ${selectedCollege.pending_faq_count} Pending`
                  : "Select a college to explore official FAQs, fees, and admissions"}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
            flexWrap="wrap"
            useFlexGap
          >
            {/* Compact selector on smaller viewports where sidebar is tucked into drawer */}
            <Box sx={{ display: { xs: "block", md: "none" }, minWidth: 210, flex: 1 }}>
              <CollegeSelector compact />
            </Box>

            {selectedCollege && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<MenuBookRoundedIcon />}
                onClick={() => onSetFaqsModalOpen(true)}
              >
                FAQs ({collegeFaqs?.total_records ?? 0})
              </Button>
            )}

            {/* Conversation Actions Menu: Share & Export */}
            <Tooltip title="Share & Export options">
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<ShareRoundedIcon />}
                endIcon={<MoreVertRoundedIcon />}
                onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                aria-label="Share & Export options"
              >
                Export
              </Button>
            </Tooltip>

            <Menu
              anchorEl={actionsMenuAnchor}
              open={Boolean(actionsMenuAnchor)}
              onClose={() => setActionsMenuAnchor(null)}
              PaperProps={{
                elevation: 3,
                sx: { minWidth: 200, borderRadius: 2 },
              }}
            >
              <MenuItem onClick={() => void handleCopyFullConversation()}>
                <ListItemIcon>
                  <ContentCopyRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Copy Conversation" />
              </MenuItem>

              <MenuItem onClick={() => void handleShareFullConversation()}>
                <ListItemIcon>
                  <ShareRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Share Conversation" />
              </MenuItem>

              <Divider />

              <MenuItem onClick={handleExportTxt}>
                <ListItemIcon>
                  <FileDownloadRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Export as TXT" />
              </MenuItem>

              <MenuItem onClick={handleExportPdf}>
                <ListItemIcon>
                  <PictureAsPdfRoundedIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Export as PDF" />
              </MenuItem>
            </Menu>

            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={onClearConversation}
              sx={{ borderColor: "#CBD5E1", color: "text.secondary" }}
            >
              Clear Chat
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Error Alerts */}
      <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: collegeError || chatError ? 1.5 : 0 }}>
        {collegeError && (
          <Alert
            severity="error"
            onClose={clearCollegeError}
            action={
              <Button color="inherit" size="small" onClick={() => void refreshColleges()}>
                Retry
              </Button>
            }
            sx={{ mb: 1, borderRadius: 2.5 }}
          >
            {collegeError}
          </Alert>
        )}

        {chatError && (
          <Alert
            severity="warning"
            onClose={onDismissChatError}
            action={
              chatError.errorCode === "MISSING_COLLEGE_ID" &&
              colleges.length > 0 ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    onDismissChatError();
                    void selectCollege(colleges[0].college_id);
                  }}
                >
                  Select {colleges[0].college_name}
                </Button>
              ) : undefined
            }
            sx={{ mb: 1, borderRadius: 2.5 }}
          >
            {chatError.message}
          </Alert>
        )}
      </Box>

      {/* Scrollable Messages Pane */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 1.5, sm: 3 },
          py: 2.5,
          minHeight: 0,
        }}
      >
        <Stack spacing={2.25} sx={{ maxWidth: 920, mx: "auto" }}>
          {messages.map((msg, idx) => {
            const precedingQuestion =
              msg.role === "assistant"
                ? messages
                    .slice(0, idx)
                    .reverse()
                    .find((m) => m.role === "student")?.content
                : undefined;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                precedingStudentQuestion={precedingQuestion}
                onFeedbackChange={onFeedbackChange}
                onNotify={handleNotify}
              />
            );
          })}

          {isSending && <LoadingIndicator />}

          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      {/* Sticky Composer Footer */}
      <Paper
        elevation={0}
        square
        sx={{
          borderTop: "1px solid #E2E8F0",
          bgcolor: "#F8FAFC",
        }}
      >
        <Box sx={{ maxWidth: 960, mx: "auto" }}>
          <SuggestedQuestions
            disabled={isSending}
            onSelectQuestion={(q) => void onSendQuestion(q)}
          />
          <MessageInput isSending={isSending} onSend={onSendQuestion} />
        </Box>
      </Paper>

      {/* College Scoped FAQs Explorer Modal */}
      <Dialog
        open={faqsModalOpen}
        onClose={() => onSetFaqsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedCollege?.college_name ?? ""} — Scoped FAQ Directory
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Records strictly filtered to {selectedCollege?.college_id ?? ""} via GET /api/colleges/{selectedCollege?.college_id ?? ""}/faqs
              </Typography>
            </Box>
            <IconButton
              aria-label="Close FAQ dialog"
              onClick={() => onSetFaqsModalOpen(false)}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Box sx={{ px: 3, borderBottom: "1px solid #E2E8F0" }}>
          <Tabs
            value={faqFilter}
            onChange={(_e, next) => setFaqFilter(next)}
            aria-label="FAQ verification filter"
          >
            <Tab label={`All (${collegeFaqs?.total_records ?? 0})`} value="ALL" />
            <Tab
              label={`Verified (${collegeFaqs?.verified_count ?? 0})`}
              value="VERIFIED"
            />
            <Tab
              label={`Pending (${collegeFaqs?.pending_count ?? 0})`}
              value="PENDING_VERIFICATION"
            />
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ bgcolor: "#F8FAFC" }}>
          <Stack spacing={1.5}>
            {filteredFaqs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No FAQ records match the selected verification filter.
              </Typography>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const displayAnswer =
                  faq.verification_status === "VERIFIED"
                    ? cleanVerifiedAnswerText(faq.answer, faq.source)
                    : faq.answer;

                return (
                  <Paper
                    key={`${faq.category}-${idx}`}
                    elevation={0}
                    sx={{ p: 2, border: "1px solid #E2E8F0", borderRadius: 3 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mb: 1 }}
                    >
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Chip
                          size="small"
                          label={formatCategoryLabel(faq.category)}
                          sx={{ bgcolor: "#EEF2FF", color: "#3730A3" }}
                        />
                        <Chip
                          size="small"
                          icon={
                            faq.verification_status === "VERIFIED" ? (
                              <CheckCircleOutlineRoundedIcon />
                            ) : (
                              <HourglassTopRoundedIcon />
                            )
                          }
                          label={
                            faq.verification_status === "VERIFIED"
                              ? "VERIFIED FAQ"
                              : "PENDING VERIFICATION"
                          }
                          color={
                            faq.verification_status === "VERIFIED"
                              ? "success"
                              : "warning"
                          }
                          variant="outlined"
                        />
                      </Stack>

                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          onSetFaqsModalOpen(false);
                          void onSendQuestion(faq.question);
                        }}
                      >
                        Ask in Chat
                      </Button>
                    </Stack>

                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {faq.question}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {displayAnswer}
                    </Typography>

                    <Divider sx={{ my: 0.75 }} />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      {isHttpUrl(faq.source) ? (
                        <Link
                          href={faq.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={faq.source}
                          variant="caption"
                          sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}
                        >
                          Source: {formatSourceLabel(faq.source)}
                          <LaunchRoundedIcon sx={{ fontSize: 12 }} />
                        </Link>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Source: {faq.source}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Last verified: {faq.last_verified}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Global Notifications Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2.5, boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
