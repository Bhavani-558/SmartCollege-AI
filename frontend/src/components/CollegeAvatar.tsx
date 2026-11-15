import React, { useEffect, useState } from "react";
import { Avatar, type SxProps, type Theme } from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";

interface CollegeAvatarProps {
  logoUrl?: string | null;
  collegeName: string;
  size?: number;
  variant?: "rounded" | "circular" | "square";
  active?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Renders an official college logo inside a crisp light container,
 * falling back cleanly to a university icon if no logo is available or loading fails.
 */
export const CollegeAvatar: React.FC<CollegeAvatarProps> = ({
  logoUrl,
  collegeName,
  size = 36,
  variant = "rounded",
  active = true,
  sx,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const resolvedSrc = !imgError && logoUrl ? logoUrl : undefined;

  return (
    <Avatar
      src={resolvedSrc}
      alt={`${collegeName} logo`}
      variant={variant}
      slotProps={{
        img: {
          loading: "lazy",
          onError: () => setImgError(true),
          style: {
            objectFit: "contain",
            padding: Math.max(2, Math.round(size * 0.08)),
          },
        },
      }}
      sx={{
        width: size,
        height: size,
        bgcolor: resolvedSrc ? "#FFFFFF" : active ? "#EFF6FF" : "#F1F5F9",
        color: active ? "primary.main" : "text.disabled",
        border: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        ...sx,
      }}
    >
      <SchoolRoundedIcon sx={{ fontSize: Math.round(size * 0.54) }} />
    </Avatar>
  );
};

