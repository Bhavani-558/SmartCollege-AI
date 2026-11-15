import React from "react";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useCollege } from "../contexts/CollegeContext";
import { CURATED_SUGGESTIONS } from "../utils/constants";

interface SuggestedQuestionsProps {
  disabled?: boolean;
  onSelectQuestion: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  disabled = false,
  onSelectQuestion,
}) => {
  const { selectedCollege, supportedCategories } = useCollege();

  const suggestions = CURATED_SUGGESTIONS.filter((item) => {
    if (!item.requiresCollege) return true;
    if (!selectedCollege) return true;
    if (supportedCategories.length === 0) return true;
    return supportedCategories.includes(item.category);
  });

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: 1.25, pb: 0.5 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.9 }}>
        <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: "secondary.main" }} />
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {selectedCollege
            ? `Suggested questions for ${selectedCollege.college_name}`
            : "Suggested questions"}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={0.8}
        sx={{
          overflowX: "auto",
          pb: 0.5,
          "&::-webkit-scrollbar": { height: 5 },
        }}
      >
        {suggestions.map((item) => {
          const needsCollegeWarning = item.requiresCollege && !selectedCollege;

          const chip = (
            <Chip
              key={item.id}
              label={item.label}
              size="small"
              disabled={disabled}
              onClick={() => onSelectQuestion(item.question)}
              variant="outlined"
              sx={{
                flexShrink: 0,
                bgcolor: "#FFFFFF",
                borderColor: needsCollegeWarning ? "#CBD5E1" : "#C7D2FE",
                color: needsCollegeWarning ? "text.secondary" : "primary.dark",
                "&:hover": {
                  bgcolor: "#EEF2FF",
                  borderColor: "primary.main",
                },
              }}
            />
          );

          return needsCollegeWarning ? (
            <Tooltip
              key={item.id}
              title="Select a college first (or click to test backend college check)"
            >
              <span>{chip}</span>
            </Tooltip>
          ) : (
            chip
          );
        })}
      </Stack>
    </Box>
  );
};
