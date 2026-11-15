import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import type { ChatConversationRecord } from "../types/chat";
import {
  exportConversationAsPdf,
  exportConversationAsTxt,
} from "../utils/exportUtils";

interface ChatHistoryDialogProps {
  open: boolean;
  conversations: ChatConversationRecord[];
  activeConversationId: string;
  onClose: () => void;
  onSelectConversation: (conversation: ChatConversationRecord) => Promise<unknown> | void;
  onDeleteConversation: (conversationId: string) => void;
  onDeleteAllHistory: () => void;
}

function formatHistoryDateTime(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ChatHistoryDialog: React.FC<ChatHistoryDialogProps> = ({
  open,
  conversations,
  activeConversationId,
  onClose,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllHistory,
}) => {
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmingDeleteAll(false);
    }
  }, [open]);

  const handleOpenConversation = async (record: ChatConversationRecord) => {
    await onSelectConversation(record);
    onClose();
  };

  const handleConfirmDeleteAll = () => {
    onDeleteAllHistory();
    setConfirmingDeleteAll(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="chat-history-dialog-title"
    >
      <DialogTitle sx={{ pb: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryRoundedIcon color="primary" />
            <Box>
              <Typography id="chat-history-dialog-title" variant="h6" fontWeight={700}>
                Chat History
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Saved automatically in this browser across sessions
              </Typography>
            </Box>
          </Stack>

          <IconButton aria-label="Close chat history" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        {conversations.length > 0 && !confirmingDeleteAll && (
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            sx={{ mt: 1.5 }}
          >
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={() => setConfirmingDeleteAll(true)}
            >
              Delete All
            </Button>
          </Stack>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#F8FAFC", p: 2 }}>
        {confirmingDeleteAll && (
          <Alert
            severity="warning"
            sx={{ mb: 2, borderRadius: 2.5 }}
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setConfirmingDeleteAll(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  onClick={handleConfirmDeleteAll}
                >
                  Confirm Delete All
                </Button>
              </Stack>
            }
          >
            Delete all saved conversations? This cannot be undone.
          </Alert>
        )}

        {conversations.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 3,
              border: "1px dashed #CBD5E1",
              bgcolor: "#FFFFFF",
            }}
          >
            <HistoryRoundedIcon
              sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              No saved conversations yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask a question about any college or general topic and your conversations will be saved here automatically.
            </Typography>
          </Paper>
        ) : (
          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {conversations.map((conv) => {
              const isCurrent = conv.id === activeConversationId;
              const messageCount = conv.messages.filter(
                (msg) => msg.role === "student",
              ).length;

              return (
                <Paper
                  key={conv.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: isCurrent ? "primary.main" : "#E2E8F0",
                    bgcolor: isCurrent ? "#F5F8FF" : "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Export conversation as TXT">
                          <IconButton
                            size="small"
                            aria-label={`Export as TXT ${conv.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              exportConversationAsTxt(conv.messages, conv.collegeName);
                            }}
                          >
                            <FileDownloadRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Export conversation as PDF">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Export as PDF ${conv.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              exportConversationAsPdf(conv.messages, conv.collegeName);
                            }}
                          >
                            <PictureAsPdfRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete conversation">
                          <IconButton
                            edge="end"
                            size="small"
                            color="error"
                            aria-label={`Delete conversation ${conv.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemButton
                      onClick={() => void handleOpenConversation(conv)}
                      sx={{ py: 1.35, pr: 14 }}
                    >
                      <Box sx={{ minWidth: 0, width: "100%" }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {conv.title}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.8}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.6 }}
                        >
                          <Chip
                            size="small"
                            label={conv.collegeName || "General Assistant"}
                            color={conv.collegeId ? "primary" : "default"}
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.68rem" }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatHistoryDateTime(conv.updatedAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {messageCount}{" "}
                            {messageCount === 1
                              ? "query"
                              : "queries"}
                          </Typography>
                          {isCurrent && (
                            <Chip
                              size="small"
                              label="Active"
                              color="success"
                              sx={{ height: 20, fontSize: "0.68rem" }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
