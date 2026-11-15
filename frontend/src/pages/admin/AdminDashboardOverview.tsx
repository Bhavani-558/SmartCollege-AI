import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid2,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import QuestionAnswerRoundedIcon from "@mui/icons-material/QuestionAnswerRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { adminService } from "../../services/adminService";
import type { AdminOverviewStats } from "../../types/admin";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  colorBg: string;
  colorText: string;
  actionPath?: string;
  actionText?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorBg,
  colorText,
  actionPath,
  actionText,
}) => (
  <Card
    elevation={0}
    sx={{
      p: 2.5,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRadius: 3,
      border: "1px solid #E2E8F0",
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      },
    }}
  >
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} color="text.primary" mt={0.5}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            bgcolor: colorBg,
            color: colorText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>

    {actionPath && (
      <Box mt={2}>
        <Button
          component={RouterLink}
          to={actionPath}
          size="small"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ px: 0, fontWeight: 600 }}
        >
          {actionText || "Manage"}
        </Button>
      </Box>
    )}
  </Card>
);

export const AdminDashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.getOverviewStats();
      setStats(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard metrics. Please ensure the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 12,
          gap: 2,
        }}
        data-testid="admin-stats-loading"
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Loading dashboard statistics...
        </Typography>
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Box py={4}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchStats} startIcon={<RefreshRoundedIcon />}>
              Retry
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return null;
  }

  const verifiedPercent =
    stats.total_faqs > 0 ? Math.round((stats.verified_faqs / stats.total_faqs) * 100) : 0;
  const pendingPercent =
    stats.total_faqs > 0 ? Math.round((stats.pending_faqs / stats.total_faqs) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Page Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            System summary and institutional verification metrics across all participating colleges.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshRoundedIcon />}
            onClick={fetchStats}
          >
            Refresh
          </Button>
          <Button
            component={RouterLink}
            to="/admin/faqs"
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
          >
            Manage FAQs
          </Button>
        </Stack>
      </Stack>

      {/* KPI Cards Grid */}
      <Grid2 container spacing={2.5} mb={4}>
        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Colleges"
            value={stats.total_colleges}
            subtitle="Registered institutional profiles"
            icon={<AccountBalanceRoundedIcon />}
            colorBg="#EFF6FF"
            colorText="#2563EB"
            actionPath="/admin/colleges"
            actionText="View Colleges"
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total FAQs"
            value={stats.total_faqs}
            subtitle="Curated questions across colleges"
            icon={<QuestionAnswerRoundedIcon />}
            colorBg="#F3E8FF"
            colorText="#7C3AED"
            actionPath="/admin/faqs"
            actionText="Browse FAQs"
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Verified FAQs"
            value={stats.verified_faqs}
            subtitle={`${verifiedPercent}% with audited institutional proof`}
            icon={<CheckCircleRoundedIcon />}
            colorBg="#DCFCE7"
            colorText="#16A34A"
            actionPath="/admin/faqs"
            actionText="Inspect Verified"
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Pending Verification"
            value={stats.pending_faqs}
            subtitle={`${pendingPercent}% awaiting official source confirmation`}
            icon={<PendingActionsRoundedIcon />}
            colorBg="#FEF3C7"
            colorText="#D97706"
            actionPath="/admin/faqs"
            actionText="Review Pending"
          />
        </Grid2>
      </Grid2>

      {/* College Breakdown Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          mb: 4,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Institutional Verification Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status and verification counts per registered campus.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/admin/colleges"
            size="small"
            endIcon={<ArrowForwardRoundedIcon />}
          >
            All Colleges
          </Button>
        </Stack>

        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                <TableCell sx={{ fontWeight: 700 }}>College</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Identifier</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verified FAQs</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pending FAQs</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verification Health</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.colleges.map((college) => {
                const total = college.verified_faq_count + college.pending_faq_count;
                const percent = total > 0 ? Math.round((college.verified_faq_count / total) * 100) : 0;

                return (
                  <TableRow key={college.college_id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {college.college_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {college.short_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={college.college_id}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.75rem", fontFamily: "monospace" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {college.location || "Andhra Pradesh"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${college.verified_faq_count} Verified`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${college.pending_faq_count} Pending`}
                        size="small"
                        color={college.pending_faq_count > 0 ? "warning" : "default"}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 180 }}>
                      <Stack spacing={0.5}>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          color={percent > 70 ? "success" : percent > 40 ? "primary" : "warning"}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary" textAlign="right">
                          {percent}% verified
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Quick Access Info Banners */}
      <Grid2 container spacing={2.5}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #E2E8F0",
              bgcolor: "#EFF6FF",
              p: 2.5,
              height: "100%",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ForumRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Student Chatbot Testing
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verify live FAQ responses, badges, and citations.
                  </Typography>
                </Box>
              </Stack>
              <Button
                component={RouterLink}
                to="/chat"
                variant="contained"
                color="primary"
                size="small"
                sx={{ flexShrink: 0 }}
              >
                Open Chat
              </Button>
            </Stack>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #E2E8F0",
              bgcolor: "#F0FDF4",
              p: 2.5,
              height: "100%",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: "#16A34A",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FeedbackRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Student Feedback
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review ratings and student reported issues.
                  </Typography>
                </Box>
              </Stack>
              <Button
                component={RouterLink}
                to="/admin/feedback"
                variant="contained"
                color="success"
                size="small"
                sx={{ flexShrink: 0 }}
              >
                View Feedback
              </Button>
            </Stack>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};
