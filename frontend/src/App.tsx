import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { CollegeProvider } from "./contexts/CollegeContext";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminCollegeManagement } from "./pages/admin/AdminCollegeManagement";
import { AdminDashboardOverview } from "./pages/admin/AdminDashboardOverview";
import { AdminFAQManagement } from "./pages/admin/AdminFAQManagement";
import { AdminFeedbackManagement } from "./pages/admin/AdminFeedbackManagement";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { ChatPage } from "./pages/ChatPage";
import { LandingPage } from "./pages/LandingPage";
import theme from "./theme/theme";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Student Chatbot Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<ChatPage />} />

      {/* Admin Authentication Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Console Routes */}
      <Route path="/admin" element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboardOverview />} />
          <Route path="colleges" element={<AdminCollegeManagement />} />
          <Route path="faqs" element={<AdminFAQManagement />} />
          <Route path="feedback" element={<AdminFeedbackManagement />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AdminAuthProvider>
        <CollegeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CollegeProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
};

export default App;
