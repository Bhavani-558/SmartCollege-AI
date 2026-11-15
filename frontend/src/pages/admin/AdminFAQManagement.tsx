import React, { useEffect, useMemo, useState } from "react";
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
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { adminService } from "../../services/adminService";
import type {
  AdminFAQCreatePayload,
  AdminFAQItem,
  AdminFAQUpdatePayload,
} from "../../types/admin";
import type { CollegeSummary } from "../../types/api";

const CATEGORY_OPTIONS = [
  "admissions",
  "fees",
  "placements",
  "hostel",
  "facilities",
  "courses",
  "scholarships",
  "college_location",
  "contact_info",
  "general",
];

export const AdminFAQManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<AdminFAQItem[]>([]);
  const [colleges, setColleges] = useState<CollegeSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Snackbar notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Add / Edit Dialog
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [editingFaq, setEditingFaq] = useState<AdminFAQItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCollegeId, setFormCollegeId] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("admissions");
  const [formQuestion, setFormQuestion] = useState<string>("");
  const [formAnswer, setFormAnswer] = useState<string>("");
  const [formSource, setFormSource] = useState<string>("");
  const [formVerificationStatus, setFormVerificationStatus] = useState<
    "VERIFIED" | "PENDING_VERIFICATION"
  >("PENDING_VERIFICATION");

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [faqToDelete, setFaqToDelete] = useState<AdminFAQItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadInitialData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [faqData, colData] = await Promise.all([
        adminService.listFAQs(),
        adminService.listColleges(),
      ]);
      setFaqs(faqData.faqs);
      setColleges(colData.colleges);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load FAQ management records."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  // Filter FAQs locally for instant responsiveness
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // College filter
      if (selectedCollegeId !== "ALL" && faq.college_id !== selectedCollegeId) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "ALL" && faq.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL" && faq.verification_status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchQ = faq.question.toLowerCase().includes(q);
        const matchA = faq.answer.toLowerCase().includes(q);
        const matchC = faq.category.toLowerCase().includes(q);
        const matchCol = faq.college_name.toLowerCase().includes(q);
        if (!matchQ && !matchA && !matchC && !matchCol) {
          return false;
        }
      }
      return true;
    });
  }, [faqs, selectedCollegeId, selectedCategory, selectedStatus, searchQuery]);

  // Adjust pagination if page exceeds filtered results
  useEffect(() => {
    setPage(0);
  }, [selectedCollegeId, selectedCategory, selectedStatus, searchQuery]);

  const displayedFaqs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredFaqs.slice(start, start + rowsPerPage);
  }, [filteredFaqs, page, rowsPerPage]);

  const handleOpenAddDialog = () => {
    setEditingFaq(null);
    setFormCollegeId(colleges[0]?.college_id || "college_001");
    setFormCategory("admissions");
    setFormQuestion("");
    setFormAnswer("");
    setFormSource("");
    setFormVerificationStatus("PENDING_VERIFICATION");
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (faq: AdminFAQItem) => {
    setEditingFaq(faq);
    setFormCollegeId(faq.college_id);
    setFormCategory(faq.category);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSource(faq.source || "");
    setFormVerificationStatus(faq.verification_status);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formQuestion.trim() || !formAnswer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFaq) {
        const updatePayload: AdminFAQUpdatePayload = {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          category: formCategory.trim(),
          source: formSource.trim(),
          verification_status: formVerificationStatus,
        };
        const updated = await adminService.updateFAQ(editingFaq.id, updatePayload);
        setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        setSnackbar({
          open: true,
          message: "FAQ updated successfully.",
          severity: "success",
        });
      } else {
        const createPayload: AdminFAQCreatePayload = {
          college_id: formCollegeId,
          category: formCategory.trim(),
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          source: formSource.trim(),
          verification_status: formVerificationStatus,
        };
        const created = await adminService.createFAQ(createPayload);
        setFaqs((prev) => [created, ...prev]);
        setSnackbar({
          open: true,
          message: "New FAQ registered successfully.",
          severity: "success",
        });
      }

      setFormDialogOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to save FAQ record. Please verify question uniqueness within this college."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVerification = async (faq: AdminFAQItem) => {
    const nextStatus =
      faq.verification_status === "VERIFIED" ? "PENDING_VERIFICATION" : "VERIFIED";
    try {
      const updated = await adminService.updateFAQVerification(faq.id, nextStatus);
      setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSnackbar({
        open: true,
        message: `FAQ status changed to ${nextStatus}.`,
        severity: "info",
      });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to toggle verification status.",
        severity: "error",
      });
    }
  };

  const handleOpenDeleteDialog = (faq: AdminFAQItem) => {
    setFaqToDelete(faq);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;
    setIsDeleting(true);
    try {
      await adminService.deleteFAQ(faqToDelete.id);
      setFaqs((prev) => prev.filter((f) => f.id !== faqToDelete.id));
      setSnackbar({
        open: true,
        message: "FAQ deleted successfully.",
        severity: "success",
      });
      setDeleteDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to delete FAQ.",
        severity: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
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
            FAQ Management
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Search, verify, update, and manage student question-answer facts across all five colleges.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshRoundedIcon />}
            onClick={loadInitialData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddDialog}
            data-testid="admin-add-faq-button"
          >
            Add FAQ
          </Button>
        </Stack>
      </Stack>

      {errorMessage && (
        <Box mb={3}>
          <Alert severity="error">{errorMessage}</Alert>
        </Box>
      )}

      {/* Filter Toolbar Card */}
      <Card
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          {/* Search Box */}
          <TextField
            placeholder="Search FAQs by question, answer, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 2, minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* College Filter */}
          <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
            <InputLabel id="admin-faq-college-filter-label">College</InputLabel>
            <Select
              labelId="admin-faq-college-filter-label"
              value={selectedCollegeId}
              label="College"
              onChange={(e) => setSelectedCollegeId(e.target.value)}
            >
              <MenuItem value="ALL">All Colleges</MenuItem>
              {colleges.map((c) => (
                <MenuItem key={c.college_id} value={c.college_id}>
                  {c.short_code} — {c.college_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="admin-faq-category-filter-label">Category</InputLabel>
            <Select
              labelId="admin-faq-category-filter-label"
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="ALL">All Categories</MenuItem>
              {CATEGORY_OPTIONS.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Verification Status Filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="admin-faq-status-filter-label">Status</InputLabel>
            <Select
              labelId="admin-faq-status-filter-label"
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="VERIFIED">Verified Only</MenuItem>
              <MenuItem value="PENDING_VERIFICATION">Pending Verification</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Filter Summary Strip */}
        <Stack direction="row" spacing={2} alignItems="center" mt={2} pt={1.5} borderTop="1px solid #F1F5F9">
          <Typography variant="caption" color="text.secondary">
            Showing <strong>{filteredFaqs.length}</strong> of {faqs.length} FAQs
          </Typography>
          {(selectedCollegeId !== "ALL" ||
            selectedCategory !== "ALL" ||
            selectedStatus !== "ALL" ||
            searchQuery.trim()) && (
            <Button
              size="small"
              onClick={() => {
                setSelectedCollegeId("ALL");
                setSelectedCategory("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
              }}
              sx={{ fontSize: "0.75rem", p: 0 }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>
      </Card>

      {/* FAQs Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>College</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Question & Answer</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100, textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 8 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Loading FAQ dataset...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayedFaqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      No FAQs found matching your criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedFaqs.map((faq) => {
                  const isVerified = faq.verification_status === "VERIFIED";

                  return (
                    <TableRow key={faq.id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: "text.secondary" }}>
                        #{faq.id}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {faq.college_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {faq.college_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={faq.category}
                          size="small"
                          sx={{ textTransform: "capitalize", fontSize: "0.75rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                          {faq.question}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {faq.answer}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {faq.source ? (
                          <Link
                            href={faq.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: "0.8rem",
                              color: "primary.main",
                              maxWidth: 140,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Source Link
                            <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
                          </Link>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not specified
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {faq.last_verified}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Click to toggle status between Verified and Pending">
                          <Chip
                            icon={
                              isVerified ? (
                                <CheckCircleOutlineRoundedIcon sx={{ fontSize: "16px !important" }} />
                              ) : (
                                <PendingActionsRoundedIcon sx={{ fontSize: "16px !important" }} />
                              )
                            }
                            label={isVerified ? "VERIFIED" : "PENDING"}
                            color={isVerified ? "success" : "warning"}
                            variant="outlined"
                            size="small"
                            onClick={() => handleToggleVerification(faq)}
                            sx={{ fontWeight: 700, cursor: "pointer" }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit FAQ">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditDialog(faq)}
                              aria-label={`Edit FAQ #${faq.id}`}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete FAQ">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(faq)}
                              aria-label={`Delete FAQ #${faq.id}`}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredFaqs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => !isSubmitting && setFormDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          {editingFaq ? `Edit FAQ #${editingFaq.id}` : "Create New College FAQ"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveFaq}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && (
              <Alert severity="error" variant="outlined">
                {formError}
              </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {!editingFaq ? (
                <FormControl size="small" fullWidth required>
                  <InputLabel id="form-faq-college-select-label">Target College</InputLabel>
                  <Select
                    labelId="form-faq-college-select-label"
                    value={formCollegeId}
                    label="Target College"
                    onChange={(e) => setFormCollegeId(e.target.value)}
                  >
                    {colleges.map((c) => (
                      <MenuItem key={c.college_id} value={c.college_id}>
                        {c.college_name} ({c.short_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Target College"
                  value={`${editingFaq.college_name} (${editingFaq.college_id})`}
                  disabled
                  fullWidth
                  size="small"
                />
              )}

              <FormControl size="small" fullWidth required>
                <InputLabel id="form-faq-category-select-label">Category</InputLabel>
                <Select
                  labelId="form-faq-category-select-label"
                  value={formCategory}
                  label="Category"
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Question"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              required
              fullWidth
              size="small"
              helperText="Must be distinct within this college."
            />

            <TextField
              label="Institutional Answer"
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              required
              multiline
              rows={4}
              fullWidth
              size="small"
              helperText="Authoritative answer provided to students."
            />

            <TextField
              label="Official Source URL"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value)}
              fullWidth
              size="small"
              helperText="URL to the official college handbook, notification, or admission portal."
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="form-faq-status-select-label">Verification Status</InputLabel>
              <Select
                labelId="form-faq-status-select-label"
                value={formVerificationStatus}
                label="Verification Status"
                onChange={(e) =>
                  setFormVerificationStatus(
                    e.target.value as "VERIFIED" | "PENDING_VERIFICATION"
                  )
                }
              >
                <MenuItem value="VERIFIED">VERIFIED (Audited with official documentation)</MenuItem>
                <MenuItem value="PENDING_VERIFICATION">
                  PENDING_VERIFICATION (Draft or unconfirmed data)
                </MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setFormDialogOpen(false)} disabled={isSubmitting} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : editingFaq ? (
                "Update FAQ"
              ) : (
                "Save FAQ"
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700} color="error.main">
          Delete FAQ
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete FAQ #{faqToDelete?.id}?
            <br />
            <br />
            <strong>"{faqToDelete?.question}"</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : "Delete FAQ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

