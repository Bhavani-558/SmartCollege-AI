import React from "react";
import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";

export const LoadingIndicator: React.FC = () => {
  return (
    <Box
      role="status"
      aria-label="Assistant is typing"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        maxWidth: { xs: "92%", sm: "75%" },
      }}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
        }}
      >
        <SmartToyRoundedIcon fontSize="small" />
      </Avatar>

      <Paper
        elevation={0}
        sx={{
          px: 2.25,
          py: 1.5,
          borderRadius: "16px 16px 16px 4px",
          border: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Stack direction="row" spacing={0.6} alignItems="center">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </Stack>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Analyzing query & verifying college data...
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

