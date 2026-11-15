import React from "react";
import {
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useCollege } from "../contexts/CollegeContext";
import { CollegeAvatar } from "./CollegeAvatar";

interface CollegeSelectorProps {
  compact?: boolean;
}

export const CollegeSelector: React.FC<CollegeSelectorProps> = ({
  compact = false,
}) => {
  const {
    colleges,
    selectedCollegeId,
    isLoadingColleges,
    isSelectingCollege,
    collegeError,
    selectCollege,
    refreshColleges,
  } = useCollege();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void selectCollege(value || null);
  };

  const renderSelectedCollege = (selectedValue: string) => {
    if (!selectedValue) {
      return (
        <Typography variant="body2" color="text.secondary" noWrap>
          No college selected (General queries)
        </Typography>
      );
    }

    const chosen = colleges.find((college) => college.college_id === selectedValue);
    if (!chosen) {
      return (
        <Typography variant="body2" color="text.secondary" noWrap>
          {selectedValue}
        </Typography>
      );
    }

    return (
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ width: "100%", minWidth: 0 }}
      >
        <CollegeAvatar
          logoUrl={chosen.logo_url}
          collegeName={chosen.college_name}
          size={compact ? 24 : 28}
          active={chosen.verified_faq_count > 0}
        />
        <Typography
          variant="body2"
          fontWeight={600}
          title={chosen.college_name}
          sx={{
            minWidth: 0,
            flex: 1,
            whiteSpace: "normal",
            lineHeight: 1.3,
            fontSize: compact ? "0.82rem" : "0.86rem",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            overflowWrap: "break-word",
          }}
        >
          {chosen.college_name}
        </Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl
          fullWidth
          size="small"
          disabled={isLoadingColleges || isSelectingCollege}
        >
          <InputLabel id={compact ? "compact-college-label" : "sidebar-college-label"}>
            Select College
          </InputLabel>
          <Select
            labelId={compact ? "compact-college-label" : "sidebar-college-label"}
            id={compact ? "compact-college-select" : "sidebar-college-select"}
            value={selectedCollegeId ?? ""}
            label="Select College"
            renderValue={renderSelectedCollege}
            onChange={handleChange}
            MenuProps={{
              PaperProps: {
                sx: { maxWidth: 360 },
              },
            }}
            sx={{
              bgcolor: "#FFFFFF",
              borderRadius: 2.5,
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                minWidth: 0,
                whiteSpace: "normal",
                py: compact ? 0.85 : 1,
              },
            }}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">
                No college selected (General queries)
              </Typography>
            </MenuItem>

            {colleges.map((college) => (
              <MenuItem key={college.college_id} value={college.college_id}>
                <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0} sx={{ width: "100%" }}>
                  <CollegeAvatar
                    logoUrl={college.logo_url}
                    collegeName={college.college_name}
                    size={compact ? 24 : 28}
                    active={college.verified_faq_count > 0}
                  />
                  <Box minWidth={0} flex={1}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        whiteSpace: "normal",
                        lineHeight: 1.3,
                        overflowWrap: "break-word",
                      }}
                    >
                      {college.college_name}
                    </Typography>
                    {!compact && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {college.location || `ID: ${college.college_id}`}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(isLoadingColleges || isSelectingCollege) && (
          <CircularProgress size={20} color="primary" aria-label="Loading colleges" />
        )}

        {collegeError && !isLoadingColleges && (
          <Tooltip title="Retry loading colleges">
            <IconButton
              size="small"
              color="primary"
              onClick={() => void refreshColleges()}
              aria-label="Retry loading colleges"
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

