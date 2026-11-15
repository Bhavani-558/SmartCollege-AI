import React, { useState } from "react";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import QuestionAnswerRoundedIcon from "@mui/icons-material/QuestionAnswerRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import logoUrl from "../assets/logo.svg";
import { useAdminAuth } from "../contexts/AdminAuthContext";

const ADMIN_DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard Overview",
    path: "/admin",
    icon: <DashboardRoundedIcon fontSize="small" />,
  },
  {
    label: "College Management",
    path: "/admin/colleges",
    icon: <AccountBalanceRoundedIcon fontSize="small" />,
  },
  {
    label: "FAQ Management",
    path: "/admin/faqs",
    icon: <QuestionAnswerRoundedIcon fontSize="small" />,
  },
  {
    label: "Feedback Management",
    path: "/admin/feedback",
    icon: <FeedbackRoundedIcon fontSize="small" />,
  },
];

export const AdminLayout: React.FC = () => {
  const { adminUser, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleConfirmLogout = async () => {
    setLogoutDialogOpen(false);
    await logout();
    navigate("/admin/login");
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FFFFFF" }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          component="img"
          src={logoUrl}
          alt="SmartCollege Logo"
          sx={{ width: 34, height: 34, borderRadius: 2 }}
        />
        <Box minWidth={0}>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2} noWrap>
            SmartCollege AI
          </Typography>
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            ADMIN CONSOLE
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Links */}
      <Box sx={{ flex: 1, py: 1.5, px: 1.5 }}>
        <List disablePadding sx={{ gap: 0.5, display: "flex", flexDirection: "column" }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);

            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    borderRadius: 2,
                    py: 1.25,
                    px: 1.75,
                    bgcolor: isActive ? "#EFF6FF" : "transparent",
                    color: isActive ? "primary.main" : "text.primary",
                    fontWeight: isActive ? 700 : 500,
                    "&:hover": {
                      bgcolor: isActive ? "#DBEAFE" : "#F1F5F9",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isActive ? "primary.main" : "text.secondary",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* Bottom Session Box */}
      <Box sx={{ p: 2, bgcolor: "#F8FAFC" }}>
        <Stack spacing={1.5}>
          <Button
            component={RouterLink}
            to="/chat"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            fullWidth
            sx={{
              borderColor: "#CBD5E1",
              color: "text.secondary",
              "&:hover": { borderColor: "#94A3B8", bgcolor: "#FFFFFF" },
            }}
          >
            Student Chatbot
          </Button>

          <Button
            variant="text"
            color="error"
            size="small"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => setLogoutDialogOpen(true)}
            fullWidth
            sx={{ justifyContent: "flex-start", px: 1.5 }}
          >
            Sign Out
          </Button>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      {/* Top Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${ADMIN_DRAWER_WIDTH}px)` },
          ml: { md: `${ADMIN_DRAWER_WIDTH}px` },
          bgcolor: "#FFFFFF",
          color: "text.primary",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", py: 0.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" } }}
              aria-label="Toggle admin drawer"
            >
              <MenuRoundedIcon />
            </IconButton>

            <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.1rem" }}>
              Administration Portal
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {adminUser && (
              <Chip
                avatar={
                  <Avatar sx={{ bgcolor: "primary.main", color: "#FFF", width: 26, height: 26 }}>
                    <SecurityRoundedIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                }
                label={`${adminUser.username} (${adminUser.role})`}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600, borderColor: "#CBD5E1" }}
              />
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutRoundedIcon />}
              onClick={() => setLogoutDialogOpen(true)}
              color="error"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Sign Out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { md: ADMIN_DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="Admin console navigation"
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: ADMIN_DRAWER_WIDTH,
              borderRight: "1px solid #E2E8F0",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: ADMIN_DRAWER_WIDTH,
              borderRight: "1px solid #E2E8F0",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${ADMIN_DRAWER_WIDTH}px)` },
          mt: { xs: 7, md: 8 },
          overflowX: "hidden",
        }}
      >
        <Outlet />
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
      >
        <DialogTitle id="logout-dialog-title" fontWeight={700}>
          Confirm Sign Out
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to end your administrative session? You will need to sign in again
            to access the dashboard.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmLogout} variant="contained" color="error">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

