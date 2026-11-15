import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export const AdminProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "#F8FAFC",
          gap: 2,
        }}
        data-testid="admin-auth-loading"
      >
        <CircularProgress size={44} thickness={4} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Verifying administrator credentials...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

