import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import logoUrl from "../../assets/logo.svg";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export const AdminLoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine redirection target (default to /admin)
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/admin";

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ username: trimmedUser, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid administrator credentials. Please check your username and password.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
          }}
        >
          {/* Header Accent Strip */}
          <Box
            sx={{
              height: 6,
              background: "linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)",
            }}
          />

          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3} alignItems="center" textAlign="center">
              {/* Logo & Shield Icon */}
              <Box sx={{ position: "relative" }}>
                <Box
                  component="img"
                  src={logoUrl}
                  alt="SmartCollege Logo"
                  sx={{ width: 56, height: 56, borderRadius: 2.5 }}
                />
              </Box>

              <Box>
                <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
                  Administrator Sign In
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Access the SmartCollege AI institutional console and FAQ management system
                </Typography>
              </Box>

              {errorMessage && (
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{ width: "100%", textAlign: "left", borderRadius: 2 }}
                  data-testid="admin-login-error"
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Login Form */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ width: "100%" }}
              >
                <Stack spacing={2.5}>
                  <TextField
                    id="admin-username"
                    name="username"
                    label="Administrator Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    fullWidth
                    disabled={isSubmitting}
                    inputProps={{ "data-testid": "admin-username-input" }}
                  />

                  <TextField
                    id="admin-password"
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    fullWidth
                    disabled={isSubmitting}
                    inputProps={{ "data-testid": "admin-password-input" }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? (
                              <VisibilityOffRoundedIcon fontSize="small" />
                            ) : (
                              <VisibilityRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <LockOutlinedIcon />
                      )
                    }
                    sx={{ py: 1.25, fontWeight: 700 }}
                    data-testid="admin-login-submit"
                  >
                    {isSubmitting ? "Authenticating..." : "Sign In to Dashboard"}
                  </Button>
                </Stack>
              </Box>

              {/* Return to Chatbot */}
              <Button
                component={RouterLink}
                to="/chat"
                size="small"
                color="inherit"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ color: "text.secondary", mt: 1 }}
              >
                Return to Student Chatbot
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

