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
  Grid2,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { CollegeAvatar } from "../../components/CollegeAvatar";
import { adminService } from "../../services/adminService";
import type { AdminCollegeCreatePayload, AdminCollegeUpdatePayload } from "../../types/admin";
import type { CollegeSummary } from "../../types/api";

export const AdminCollegeManagement: React.FC = () => {
  const [colleges, setColleges] = useState<CollegeSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Snackbar notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Add / Edit Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [editingCollege, setEditingCollege] = useState<CollegeSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCollegeId, setFormCollegeId] = useState<string>("");
  const [formCollegeName, setFormCollegeName] = useState<string>("");
  const [formOfficialName, setFormOfficialName] = useState<string>("");
  const [formShortCode, setFormShortCode] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formLogoUrl, setFormLogoUrl] = useState<string>("");
  const [formSources, setFormSources] = useState<string>("");
  const [formCategories, setFormCategories] = useState<string>("");

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [collegeToDelete, setCollegeToDelete] = useState<CollegeSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadColleges = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.listColleges();
      setColleges(data.colleges);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load registered colleges."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadColleges();
  }, []);

  const filteredColleges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter(
      (c) =>
        c.college_name.toLowerCase().includes(q) ||
        c.short_code.toLowerCase().includes(q) ||
        c.college_id.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q))
    );
  }, [colleges, searchQuery]);

  const handleOpenAddDialog = () => {
    setEditingCollege(null);
    setFormCollegeId("");
    setFormCollegeName("");
    setFormOfficialName("");
    setFormShortCode("");
    setFormLocation("");
    setFormLogoUrl("");
    setFormSources("");
    setFormCategories("admissions, fees, placements, hostel, facilities, courses");
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = async (college: CollegeSummary) => {
    setEditingCollege(college);
    setFormCollegeId(college.college_id);
    setFormCollegeName(college.college_name);
    setFormOfficialName(college.official_name || "");
    setFormShortCode(college.short_code);
    setFormLocation(college.location || "");
    setFormLogoUrl(college.logo_url || "");
    setFormError(null);

    try {
      const detail = await adminService.getCollege(college.college_id);
      setFormSources(detail.official_sources?.join("\n") || "");
      setFormCategories(detail.supported_categories?.join(", ") || "");
    } catch {
      setFormSources("");
      setFormCategories("");
    }

    setFormDialogOpen(true);
  };

  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCollegeName.trim() || !formShortCode.trim()) {
      setFormError("College name and short code are required.");
      return;
    }

    if (!editingCollege && !formCollegeId.trim()) {
      setFormError("College ID is required for registration.");
      return;
    }

    const sources = formSources
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const categories = formCategories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      if (editingCollege) {
        const updatePayload: AdminCollegeUpdatePayload = {
          college_name: formCollegeName.trim(),
          official_name: formOfficialName.trim() || null,
          short_code: formShortCode.trim(),
          location: formLocation.trim() || null,
          logo_url: formLogoUrl.trim() || null,
          official_sources: sources,
          supported_categories: categories,
        };
        await adminService.updateCollege(editingCollege.college_id, updatePayload);
        setSnackbar({
          open: true,
          message: `College "${formCollegeName.trim()}" updated successfully.`,
          severity: "success",
        });
      } else {
        const createPayload: AdminCollegeCreatePayload = {
          college_id: formCollegeId.trim(),
          college_name: formCollegeName.trim(),
          official_name: formOfficialName.trim() || null,
          short_code: formShortCode.trim(),
          location: formLocation.trim() || null,
          logo_url: formLogoUrl.trim() || null,
          official_sources: sources,
          supported_categories: categories,
        };
        await adminService.createCollege(createPayload);
        setSnackbar({
          open: true,
          message: `College "${formCollegeName.trim()}" registered successfully.`,
          severity: "success",
        });
      }

      setFormDialogOpen(false);
      await loadColleges();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save college profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (college: CollegeSummary) => {
    setCollegeToDelete(college);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!collegeToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await adminService.deleteCollege(collegeToDelete.college_id);
      setSnackbar({
        open: true,
        message: `College "${collegeToDelete.college_name}" deleted successfully.`,
        severity: "success",
      });
      setDeleteDialogOpen(false);
      await loadColleges();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to delete college. Please ensure all associated FAQs have been removed first.";
      setDeleteError(msg);
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
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            College Profiles
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage institutional records, branding metadata, official sources, and category support.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshRoundedIcon />}
            onClick={loadColleges}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddDialog}
            data-testid="admin-add-college-button"
          >
            Register College
          </Button>
        </Stack>
      </Stack>

      {/* Search and Filters */}
      <Box mb={3}>
        <TextField
          placeholder="Search colleges by name, short code, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{ maxWidth: 480, bgcolor: "#FFFFFF", borderRadius: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {errorMessage && (
        <Box mb={3}>
          <Alert severity="error">{errorMessage}</Alert>
        </Box>
      )}

      {/* College Cards Grid */}
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 10,
          }}
        >
          <CircularProgress size={36} />
        </Box>
      ) : filteredColleges.length === 0 ? (
        <Card elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid #E2E8F0" }}>
          <Typography variant="body1" color="text.secondary">
            No college profiles found matching your search.
          </Typography>
        </Card>
      ) : (
        <Grid2 container spacing={3}>
          {filteredColleges.map((college) => (
            <Grid2 size={{ xs: 12, md: 6 }} key={college.college_id}>
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #E2E8F0",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "box-shadow 0.2s",
                  "&:hover": {
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                  },
                }}
              >
                <Box>
                  {/* Top info row */}
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <CollegeAvatar
                      logoUrl={college.logo_url}
                      collegeName={college.college_name}
                      size={48}
                    />
                    <Box minWidth={0} flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={800} noWrap>
                          {college.college_name}
                        </Typography>
                        <Chip
                          label={college.short_code}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        ID: {college.college_id}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Location & Official Name */}
                  {college.location && (
                    <Stack direction="row" spacing={0.75} alignItems="center" mb={1}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {college.location}
                      </Typography>
                    </Stack>
                  )}

                  {college.official_name && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {college.official_name}
                    </Typography>
                  )}

                  {/* Metrics Badges */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                    <Chip
                      label={`${college.verified_faq_count} Verified FAQs`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`${college.pending_faq_count} Pending FAQs`}
                      size="small"
                      color={college.pending_faq_count > 0 ? "warning" : "default"}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    {college.is_primary_profile && (
                      <Chip label="Primary" size="small" color="primary" sx={{ fontWeight: 600 }} />
                    )}
                  </Stack>
                </Box>

                {/* Actions Footer */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  pt={2}
                  borderTop="1px solid #F1F5F9"
                >
                  <Typography variant="caption" color="text.secondary">
                    Audited: {college.last_verified || "2026-11-13"}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit College Profile">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(college)}
                        aria-label={`Edit ${college.college_name}`}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete College">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(college)}
                        aria-label={`Delete ${college.college_name}`}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => !isSubmitting && setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          {editingCollege ? "Edit College Profile" : "Register New College Profile"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveCollege}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && (
              <Alert severity="error" variant="outlined">
                {formError}
              </Alert>
            )}

            {!editingCollege && (
              <TextField
                label="College Identifier (e.g. college_006)"
                value={formCollegeId}
                onChange={(e) => setFormCollegeId(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Permanent machine identifier. Must be unique."
              />
            )}

            <TextField
              label="College Name"
              value={formCollegeName}
              onChange={(e) => setFormCollegeName(e.target.value)}
              required
              fullWidth
              size="small"
              helperText="Common display name (e.g. NRI University, SRM University-AP)"
            />

            <TextField
              label="Official Institutional Name"
              value={formOfficialName}
              onChange={(e) => setFormOfficialName(e.target.value)}
              fullWidth
              size="small"
              helperText="Full legal/accredited title"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Short Code"
                value={formShortCode}
                onChange={(e) => setFormShortCode(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="E.g. NRIU, SRMAP, KLU"
              />
              <TextField
                label="Location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                fullWidth
                size="small"
                helperText="Campus city/district"
              />
            </Stack>

            <TextField
              label="Logo Image URL"
              value={formLogoUrl}
              onChange={(e) => setFormLogoUrl(e.target.value)}
              fullWidth
              size="small"
              helperText="E.g. /logos/college_001.png or full HTTPS URL"
            />

            <TextField
              label="Official Sources (one per line)"
              value={formSources}
              onChange={(e) => setFormSources(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
              helperText="Authoritative institutional portal URLs"
            />

            <TextField
              label="Supported Categories (comma-separated)"
              value={formCategories}
              onChange={(e) => setFormCategories(e.target.value)}
              fullWidth
              size="small"
              helperText="E.g. admissions, fees, placements, hostel, facilities"
            />
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setFormDialogOpen(false)} disabled={isSubmitting} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : editingCollege ? (
                "Update Profile"
              ) : (
                "Register College"
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Safe Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700} color="error.main">
          Delete College Profile
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          ) : (
            <DialogContentText>
              Are you sure you want to delete{" "}
              <strong>{collegeToDelete?.college_name}</strong> ({collegeToDelete?.college_id})?
              <br />
              <br />
              <em>
                Note: Colleges with associated FAQs cannot be deleted. All mapped FAQs must be removed first.
              </em>
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} color="inherit">
            Cancel
          </Button>
          {!deleteError && (
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={isDeleting}
            >
              {isDeleting ? <CircularProgress size={20} color="inherit" /> : "Confirm Delete"}
            </Button>
          )}
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
