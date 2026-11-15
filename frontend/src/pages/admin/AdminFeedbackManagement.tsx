import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid2,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ThumbDownAltRoundedIcon from "@mui/icons-material/ThumbDownAltRounded";
import ThumbUpAltRoundedIcon from "@mui/icons-material/ThumbUpAltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { adminService } from "../../services/adminService";
import type { CollegeSummary } from "../../types/api";
import type {
  AdminFeedbackStats,
  FeedbackRecord,
  FeedbackStatus,
} from "../../types/feedback";
import { formatCategoryLabel, formatTimestamp } from "../../utils/formatters";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  colorBg: string;
  colorText: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorBg,
  colorText,
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
      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
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
    <Typography variant="body2" color="text.secondary" mt={2}>
      {subtitle}
    </Typography>
  </Card>
);

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; color: "default" | "primary" | "warning" | "success" | "error" }
> = {
  NEW: { label: "NEW", color: "primary" },
  REVIEWED: { label: "REVIEWED", color: "warning" },
  RESOLVED: { label: "RESOLVED", color: "success" },
  DISMISSED: { label: "DISMISSED", color: "default" },
};

export const AdminFeedbackManagement: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<AdminFeedbackStats | null>(null);
  const [colleges, setColleges] = useState<CollegeSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedReason, setSelectedReason] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Detail & Status Edit Dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackRecord | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>("NEW");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [colData, statsData, listData] = await Promise.all([
        adminService.listColleges(),
        adminService.getFeedbackStats(),
        adminService.listFeedback({
          college_id: selectedCollegeId !== "ALL" ? selectedCollegeId : undefined,
          rating: selectedRating !== "ALL" ? selectedRating : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          reason: selectedReason !== "ALL" ? selectedReason : undefined,
          search: searchQuery.trim() || undefined,
          page: page + 1,
          limit: rowsPerPage,
        }),
      ]);

      setColleges(colData.colleges);
      setStats(statsData);
      setFeedbackList(listData.feedback);
      setTotalRecords(listData.total_records);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load student feedback records.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollegeId, selectedRating, selectedStatus, selectedReason, page, rowsPerPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    void fetchData();
  };

  const handleOpenDetail = (item: FeedbackRecord) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setEditAdminNotes(item.admin_notes || "");
    setDetailDialogOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedItem) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateFeedback(selectedItem.feedback_id, {
        status: editStatus,
        admin_notes: editAdminNotes.trim() || undefined,
      });

      // Update in state
      setFeedbackList((prev) =>
        prev.map((rec) => (rec.feedback_id === updated.feedback_id ? updated : rec)),
      );

      // Refresh stats
      const nextStats = await adminService.getFeedbackStats();
      setStats(nextStats);

      setSnackbar({
        open: true,
        message: `Feedback record status updated to ${editStatus}.`,
        severity: "success",
      });
      setDetailDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to update feedback status.",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Student Feedback Management
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Monitor student ratings, inspect negative response reports, and update resolution statuses.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void fetchData()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Stack>

      {/* KPI Stats Overview */}
      {stats && (
        <Grid2 container spacing={2.5} mb={3.5}>
          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Total Feedback"
              value={stats.total_count}
              subtitle="All student ratings collected"
              icon={<FilterListRoundedIcon />}
              colorBg="#EFF6FF"
              colorText="#2563EB"
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Positive Ratings"
              value={stats.positive_count}
              subtitle="Thumbs up answers"
              icon={<ThumbUpAltRoundedIcon />}
              colorBg="#ECFDF5"
              colorText="#059669"
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Issue Reports"
              value={stats.negative_count}
              subtitle="Needs review or correction"
              icon={<ThumbDownAltRoundedIcon />}
              colorBg="#FEF2F2"
              colorText="#DC2626"
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Student Satisfaction"
              value={`${stats.positive_percentage}%`}
              subtitle="Positive response ratio"
              icon={<CheckCircleRoundedIcon />}
              colorBg="#F0FDF4"
              colorText="#16A34A"
            />
          </Grid2>
        </Grid2>
      )}

      {/* Filters and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        <Box component="form" onSubmit={handleSearchSubmit}>
          <Grid2 container spacing={2} alignItems="center">
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search questions, answers, comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid2>

            <Grid2 size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="feedback-college-filter-label">College</InputLabel>
                <Select
                  labelId="feedback-college-filter-label"
                  value={selectedCollegeId}
                  label="College"
                  onChange={(e) => {
                    setSelectedCollegeId(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="ALL">All Colleges</MenuItem>
                  {colleges.map((col) => (
                    <MenuItem key={col.college_id} value={col.college_id}>
                      {col.college_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="feedback-rating-filter-label">Rating</InputLabel>
                <Select
                  labelId="feedback-rating-filter-label"
                  value={selectedRating}
                  label="Rating"
                  onChange={(e) => {
                    setSelectedRating(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="ALL">All Ratings</MenuItem>
                  <MenuItem value="thumbs_up">Positive (Thumbs Up)</MenuItem>
                  <MenuItem value="thumbs_down">Negative (Thumbs Down)</MenuItem>
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="feedback-reason-filter-label">Reason</InputLabel>
                <Select
                  labelId="feedback-reason-filter-label"
                  value={selectedReason}
                  label="Reason"
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="ALL">All Reasons</MenuItem>
                  <MenuItem value="Incorrect answer">Incorrect answer</MenuItem>
                  <MenuItem value="Outdated information">Outdated information</MenuItem>
                  <MenuItem value="Irrelevant answer">Irrelevant answer</MenuItem>
                  <MenuItem value="Incomplete answer">Incomplete answer</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="feedback-status-filter-label">Status</InputLabel>
                <Select
                  labelId="feedback-status-filter-label"
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="NEW">NEW</MenuItem>
                  <MenuItem value="REVIEWED">REVIEWED</MenuItem>
                  <MenuItem value="RESOLVED">RESOLVED</MenuItem>
                  <MenuItem value="DISMISSED">DISMISSED</MenuItem>
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 12, md: 1 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="small"
                sx={{ height: 40 }}
              >
                Go
              </Button>
            </Grid2>
          </Grid2>
        </Box>
      </Paper>

      {/* Error Message */}
      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void fetchData()}>
              Retry
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      )}

      {/* Feedback Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          bgcolor: "#FFFFFF",
        }}
      >
        <TableContainer sx={{ minHeight: 320 }}>
          <Table aria-label="Student feedback table" size="medium">
            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>College</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Student Query</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Comment</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Loading student feedback records...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : feedbackList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <HelpOutlineRoundedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      No feedback records found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No student ratings match the current filters or query.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                feedbackList.map((row) => (
                  <TableRow key={row.feedback_id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                      {formatTimestamp(row.created_at)}
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Chip
                        size="small"
                        label={row.college_name || row.college_id}
                        variant="outlined"
                        sx={{ fontSize: "0.72rem", fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      {row.rating === "thumbs_up" ? (
                        <Chip
                          icon={<ThumbUpAltRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label="Helpful"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 24, fontSize: "0.72rem", fontWeight: 600 }}
                        />
                      ) : (
                        <Chip
                          icon={<ThumbDownAltRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label="Issue"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 24, fontSize: "0.72rem", fontWeight: 600 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {row.reason ? (
                        <Chip
                          label={row.reason}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            bgcolor: "#FEF3C7",
                            color: "#92400E",
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Tooltip title={row.question}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontSize: "0.82rem", fontWeight: 500 }}
                        >
                          {row.question}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 180 }}>
                      {row.comment ? (
                        <Tooltip title={row.comment}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            sx={{ fontSize: "0.82rem", fontStyle: "italic" }}
                          >
                            "{row.comment}"
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          None
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={STATUS_CONFIG[row.status]?.label ?? row.status}
                        color={STATUS_CONFIG[row.status]?.color ?? "default"}
                        size="small"
                        sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="View feedback details & update status">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDetail(row)}
                          aria-label={`View feedback for ${row.question}`}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Detail & Status Modal */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => !isUpdating && setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="feedback-detail-dialog-title"
      >
        <DialogTitle id="feedback-detail-dialog-title" sx={{ fontWeight: 700, pb: 1 }}>
          Feedback Inspection & Status
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#F8FAFC" }}>
          {selectedItem && (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #E2E8F0" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                  STUDENT QUESTION:
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                  {selectedItem.question}
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #E2E8F0" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                  BOT RESPONSE:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mt: 0.5, whiteSpace: "pre-line", maxHeight: 180, overflowY: "auto" }}
                >
                  {selectedItem.answer}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`College: ${selectedItem.college_name}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Intent: ${formatCategoryLabel(selectedItem.intent || "general")}`}
                  size="small"
                  sx={{ bgcolor: "#EEF2FF", color: "#3730A3" }}
                />
                <Chip
                  icon={
                    selectedItem.rating === "thumbs_up" ? (
                      <ThumbUpAltRoundedIcon sx={{ fontSize: "14px !important" }} />
                    ) : (
                      <ThumbDownAltRoundedIcon sx={{ fontSize: "14px !important" }} />
                    )
                  }
                  label={selectedItem.rating === "thumbs_up" ? "Helpful" : "Negative Report"}
                  color={selectedItem.rating === "thumbs_up" ? "success" : "error"}
                  size="small"
                />
                {selectedItem.reason && (
                  <Chip
                    label={`Reason: ${selectedItem.reason}`}
                    size="small"
                    sx={{ bgcolor: "#FEF3C7", color: "#92400E" }}
                  />
                )}
              </Stack>

              {selectedItem.comment && (
                <Paper
                  elevation={0}
                  sx={{ p: 2, borderRadius: 2, border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}
                >
                  <Typography variant="caption" color="error.dark" fontWeight={700} display="block">
                    STUDENT COMMENT:
                  </Typography>
                  <Typography variant="body2" color="error.dark" sx={{ mt: 0.5, fontStyle: "italic" }}>
                    "{selectedItem.comment}"
                  </Typography>
                </Paper>
              )}

              <Divider sx={{ my: 1 }} />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Administrative Resolution
                </Typography>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="edit-feedback-status-label">Review Status</InputLabel>
                  <Select
                    labelId="edit-feedback-status-label"
                    value={editStatus}
                    label="Review Status"
                    onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                  >
                    <MenuItem value="NEW">NEW (Awaiting review)</MenuItem>
                    <MenuItem value="REVIEWED">REVIEWED (Under investigation)</MenuItem>
                    <MenuItem value="RESOLVED">RESOLVED (FAQ updated/verified)</MenuItem>
                    <MenuItem value="DISMISSED">DISMISSED (Not actionable)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Administrative Notes (internal)"
                  placeholder="e.g. Updated fee FAQ record, verified with dean of admissions..."
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  size="small"
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDetailDialogOpen(false)}
            disabled={isUpdating}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSaveStatusUpdate()}
            variant="contained"
            color="primary"
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={16} /> : undefined}
          >
            {isUpdating ? "Saving..." : "Save Status"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
