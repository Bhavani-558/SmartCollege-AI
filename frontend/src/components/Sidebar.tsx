import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import logoUrl from "../assets/logo.svg";
import { useCollege } from "../contexts/CollegeContext";
import { CollegeAvatar } from "./CollegeAvatar";
import { CollegeSelector } from "./CollegeSelector";

interface SidebarProps {
  onCloseMobile?: () => void;
  onOpenHistoryModal?: () => void;
  onOpenFaqsModal?: () => void;
  historyCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCloseMobile,
  onOpenHistoryModal,
  onOpenFaqsModal,
  historyCount = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedCollege,
    collegeDetail,
  } = useCollege();

  const handleNavigate = (path: string) => {
    navigate(path);
    onCloseMobile?.();
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
      }}
    >
      {/* Brand header */}
      <Box
        sx={{
          px: 2.25,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        <ButtonBase
          onClick={() => handleNavigate("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 1.5,
            minWidth: 0,
            flex: 1,
            textAlign: "left",
            borderRadius: 2,
            p: 0.5,
            ml: -0.5,
          }}
        >
          <Box
            component="img"
            src={logoUrl}
            alt="Smart College Assistant logo"
            sx={{ width: 40, height: 40, borderRadius: 2.5, flexShrink: 0 }}
          />
          <Box component="span" sx={{ minWidth: 0 }}>
            <Typography
              component="span"
              variant="subtitle1"
              fontWeight={800}
              noWrap
              display="block"
              sx={{
                background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.2,
              }}
            >
              SmartCollege AI
            </Typography>
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              AI Student Support Portal
            </Typography>
          </Box>
        </ButtonBase>

        {onCloseMobile && (
          <IconButton
            size="small"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            sx={{ display: { xs: "inline-flex", md: "none" }, flexShrink: 0 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Navigation links */}
      <List sx={{ px: 1.5, pt: 1.5, pb: 0.75 }}>
        <ListItemButton
          selected={location.pathname === "/"}
          onClick={() => handleNavigate("/")}
          sx={{
            borderRadius: 2.5,
            mb: 0.5,
            "&.Mui-selected": {
              bgcolor: "#EEF2FF",
              color: "primary.main",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <HomeRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Home"
            primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: 600 }}
          />
        </ListItemButton>

        <ListItemButton
          selected={location.pathname === "/chat"}
          onClick={() => handleNavigate("/chat")}
          sx={{
            borderRadius: 2.5,
            mb: 0.5,
            "&.Mui-selected": {
              bgcolor: "#EEF2FF",
              color: "primary.main",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <ChatBubbleOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Chat Assistant"
            primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: 600 }}
          />
        </ListItemButton>

        <ListItemButton
          selected={location.pathname.startsWith("/admin")}
          onClick={() => handleNavigate("/admin")}
          sx={{
            borderRadius: 2.5,
            "&.Mui-selected": {
              bgcolor: "#EEF2FF",
              color: "primary.main",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <AdminPanelSettingsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Admin Portal"
            primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: 600 }}
          />
        </ListItemButton>
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Scrollable College Selection + Scoped Profile Info */}
      <Box sx={{ px: 2, py: 1, flex: 1, overflowY: "auto" }}>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: 0.8, display: "block", mb: 1 }}
        >
          Active College
        </Typography>

        <CollegeSelector />

        <Card
          elevation={0}
          sx={{
            mt: 2,
            bgcolor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
            {!selectedCollege ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  General Assistant Mode
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.5}>
                  You can ask general questions like greetings, help, admissions guidelines, or select an AP college above to unlock scoped institutional facts.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                <Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                      <CollegeAvatar
                        logoUrl={selectedCollege.logo_url}
                        collegeName={selectedCollege.college_name}
                        size={32}
                      />
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {selectedCollege.college_name}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={selectedCollege.college_id}
                      sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#E2E8F0", flexShrink: 0 }}
                    />
                  </Stack>

                  {collegeDetail?.official_name && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.4 }}
                    >
                      {collegeDetail.official_name}
                    </Typography>
                  )}

                  {selectedCollege.location && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.25 }}
                    >
                      {selectedCollege.location}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    icon={<CheckCircleOutlineRoundedIcon />}
                    label={`${selectedCollege.verified_faq_count} Verified`}
                    color="success"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.7rem" }}
                  />
                  <Chip
                    size="small"
                    icon={<HourglassTopRoundedIcon />}
                    label={`${selectedCollege.pending_faq_count} Pending`}
                    color="warning"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.7rem" }}
                  />
                </Stack>

                {selectedCollege.verified_faq_count === 0 ? (
                  <Typography variant="caption" color="warning.dark" lineHeight={1.45}>
                    Template profile: college details are currently PENDING_VERIFICATION.
                    No unverified data is displayed or fabricated.
                  </Typography>
                ) : (
                  collegeDetail?.official_sources &&
                  collegeDetail.official_sources.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 0.4 }}
                      >
                        Official Sources:
                      </Typography>
                      {collegeDetail.official_sources.slice(0, 2).map((src) => (
                        <Link
                          key={src}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.4,
                            mb: 0.25,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <LaunchRoundedIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {src}
                          </span>
                        </Link>
                      ))}
                    </Box>
                  )
                )}

                {onOpenFaqsModal && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MenuBookRoundedIcon />}
                    onClick={() => {
                      onOpenFaqsModal();
                      onCloseMobile?.();
                    }}
                    fullWidth
                    sx={{ mt: 0.5 }}
                  >
                    Browse College FAQs
                  </Button>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Footer action: Chat History */}
      {onOpenHistoryModal && (
        <Box sx={{ p: 2, borderTop: "1px solid #F1F5F9" }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<HistoryRoundedIcon />}
            onClick={() => {
              onOpenHistoryModal();
              onCloseMobile?.();
            }}
            sx={{
              justifyContent: "flex-start",
              py: 1,
              borderRadius: 2.5,
              background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            }}
          >
            {historyCount > 0 ? `Chat History (${historyCount})` : "Chat History"}
          </Button>
        </Box>
      )}
    </Box>
  );
};
