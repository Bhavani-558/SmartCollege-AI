import React, { useState } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import logoUrl from "../assets/logo.svg";
import { Sidebar } from "../components/Sidebar";
import { useCollege } from "../contexts/CollegeContext";

const DRAWER_WIDTH = 300;

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenHistoryModal?: () => void;
  onOpenFaqsModal?: () => void;
  historyCount?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onOpenHistoryModal,
  onOpenFaqsModal,
  historyCount = 0,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { selectedCollege } = useCollege();

  const handleToggleDrawer = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleCloseDrawer = () => setMobileOpen(false);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "#F8FAFC" }}>
      {/* Mobile Header Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: "flex", md: "none" },
          bgcolor: "#FFFFFF",
          color: "text.primary",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Toolbar sx={{ gap: 1.5, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleToggleDrawer}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box
              component="img"
              src={logoUrl}
              alt="Logo"
              sx={{ width: 30, height: 30, borderRadius: 1.5, flexShrink: 0 }}
            />
            <Box minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                SmartCollege AI
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {selectedCollege ? selectedCollege.college_name : "Select a college"}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Sidebar Drawer */}
      <Box
        component="nav"
        aria-label="College and chat navigation"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleCloseDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          <Sidebar
            onCloseMobile={handleCloseDrawer}
            onOpenHistoryModal={onOpenHistoryModal}
            onOpenFaqsModal={onOpenFaqsModal}
            historyCount={historyCount}
          />
        </Drawer>

        <Box
          sx={{
            display: { xs: "none", md: "block" },
            width: DRAWER_WIDTH,
            height: "100%",
          }}
        >
          <Sidebar
            onOpenHistoryModal={onOpenHistoryModal}
            onOpenFaqsModal={onOpenFaqsModal}
            historyCount={historyCount}
          />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          pt: { xs: 7, md: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
