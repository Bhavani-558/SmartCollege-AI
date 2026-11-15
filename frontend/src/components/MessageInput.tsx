import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import { useCollege } from "../contexts/CollegeContext";
import {
  DEFAULT_SPEECH_LANGUAGE,
  useVoiceRecognition,
} from "../hooks/useVoiceRecognition";

interface MessageInputProps {
  isSending: boolean;
  onSend: (question: string) => Promise<void> | void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  isSending,
  onSend,
}) => {
  const [value, setValue] = useState("");
  const { selectedCollege } = useCollege();

  const {
    isSupported,
    isListening,
    voiceError,
    startListening,
    stopListening,
    cancelListening,
    clearVoiceError,
  } = useVoiceRecognition({
    language: DEFAULT_SPEECH_LANGUAGE,
    onTranscriptChange: setValue,
  });

  const canSend = value.trim().length > 0 && !isSending;

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    if (isListening) {
      stopListening();
    }
    setValue("");
    await onSend(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening(value);
  };

  const placeholder = selectedCollege
    ? `Ask a question about ${selectedCollege.college_name} (admissions, courses, location, fees...)`
    : "Ask a general question (e.g. 'Hello') or select a college for campus FAQs...";

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 1.5, sm: 2.25 }, pt: 0.75 }}>
      {voiceError && (
        <Alert
          severity="warning"
          onClose={clearVoiceError}
          sx={{ mb: 1, borderRadius: 2.5 }}
        >
          {voiceError}
        </Alert>
      )}

      {isListening && (
        <Paper
          elevation={0}
          role="status"
          aria-live="polite"
          sx={{
            mb: 1,
            px: 1.75,
            py: 0.85,
            borderRadius: 3,
            bgcolor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <GraphicEqRoundedIcon color="error" fontSize="small" />
            <Typography variant="caption" fontWeight={700} color="error.dark">
              Listening (en-IN)... Speak your question, then review or edit before sending.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<StopRoundedIcon />}
              onClick={stopListening}
              aria-label="Stop recording"
            >
              Stop Recording
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<CloseRoundedIcon />}
              onClick={cancelListening}
              aria-label="Cancel recording"
              sx={{ borderColor: "#FCA5A5", color: "error.dark" }}
            >
              Cancel Recording
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper
        component="form"
        elevation={0}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 4,
          border: "1px solid",
          borderColor: isListening ? "error.main" : "#CBD5E1",
          bgcolor: "#FFFFFF",
          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.05)",
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:focus-within": {
            borderColor: isListening ? "error.main" : "primary.main",
            boxShadow: isListening
              ? "0 6px 22px rgba(220, 38, 38, 0.14)"
              : "0 6px 22px rgba(37, 99, 235, 0.14)",
          },
        }}
      >
        <InputBase
          multiline
          maxRows={4}
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          inputProps={{
            "aria-label": "Student question input",
          }}
          sx={{
            fontSize: "0.95rem",
            py: 0.5,
          }}
        />

        <Tooltip
          title={
            !isSupported
              ? "Voice input is not supported in this browser"
              : isListening
                ? "Stop recording"
                : "Voice input (en-IN)"
          }
        >
          <span>
            <IconButton
              type="button"
              disabled={isSending}
              onClick={handleMicToggle}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              color={isListening ? "error" : "default"}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                bgcolor: isListening ? "#FEE2E2" : "#F1F5F9",
                color: isListening ? "error.main" : "text.secondary",
                "&:hover": {
                  bgcolor: isListening ? "#FECACA" : "#E2E8F0",
                },
              }}
            >
              {isListening ? (
                <StopRoundedIcon fontSize="small" />
              ) : (
                <MicRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={canSend ? "Send message (Enter)" : "Type a message first"}>
          <span>
            <IconButton
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                color: "#FFFFFF",
                background: canSend
                  ? "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
                  : "#CBD5E1",
                "&:hover": {
                  background: canSend
                    ? "linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)"
                    : "#CBD5E1",
                },
                "&.Mui-disabled": {
                  color: "#FFFFFF",
                  bgcolor: "#CBD5E1",
                },
              }}
            >
              <SendRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
    </Box>
  );
};
