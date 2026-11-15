import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Grid2,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import logoUrl from "../assets/logo.svg";
import { CollegeAvatar } from "../components/CollegeAvatar";
import { useCollege } from "../contexts/CollegeContext";

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentBg: string;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { colleges, selectCollege } = useCollege();

  const handleOpenWithCollege = async (collegeId: string) => {
    await selectCollege(collegeId);
    navigate("/chat");
  };

  const featureItems: FeatureItem[] = [
    {
      title: "Multi-College Support",
      description: "Seamlessly switch between multiple registered colleges with strictly isolated context and FAQs.",
      icon: <AccountBalanceRoundedIcon fontSize="medium" color="primary" />,
      accentBg: "#EFF6FF",
    },
    {
      title: "AI-Based Intent Recognition",
      description: "Pre-trained TF-IDF and Logistic Regression pipeline recognizes student queries across 30 intents.",
      icon: <PsychologyRoundedIcon fontSize="medium" color="secondary" />,
      accentBg: "#F3E8FF",
    },
    {
      title: "Instant Student Query Responses",
      description: "Fast answers for general questions and verified institutional facts across all registered colleges.",
      icon: <BoltRoundedIcon fontSize="medium" sx={{ color: "#0284C7" }} />,
      accentBg: "#E0F2FE",
    },
    {
      title: "College-Specific Information",
      description: "Transparent verification status, official sources, and audited timestamps on every answer.",
      icon: <VerifiedUserRoundedIcon fontSize="medium" color="success" />,
      accentBg: "#DCFCE7",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      {/* Top Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #E2E8F0",
          color: "text.primary",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              py: 0.75,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src={logoUrl}
                alt="SmartCollege AI Logo"
                sx={{ width: 40, height: 40, borderRadius: 2.5 }}
              />
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
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
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  AI-Powered Multi-College Assistant
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/admin")}
                sx={{
                  borderRadius: 2,
                  borderColor: "#CBD5E1",
                  color: "text.primary",
                  fontSize: "0.82rem",
                  "&:hover": { borderColor: "primary.main", bgcolor: "#EFF6FF" },
                }}
                data-testid="landing-admin-portal-button"
              >
                Admin Portal
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          pt: { xs: 7, md: 10 },
          pb: { xs: 7, md: 9 },
          background:
            "radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.09), transparent 45%), radial-gradient(circle at 85% 20%, rgba(124, 58, 237, 0.09), transparent 45%)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={3}
            alignItems="center"
            textAlign="center"
            sx={{ maxWidth: 780, mx: "auto" }}
          >
            <Chip
              icon={<SchoolRoundedIcon />}
              label="Your Smart College Assistant"
              sx={{
                bgcolor: "#EEF2FF",
                color: "primary.dark",
                px: 1,
                border: "1px solid #C7D2FE",
              }}
            />

            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" },
                lineHeight: 1.15,
                color: "text.primary",
              }}
            >
              Empowering Students with Reliable, Accessible, and Institution-Specific Academic Guidance.
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", md: "1.125rem" }, lineHeight: 1.7 }}
            >
              Ask admissions, courses, fees, placements, scholarships, and hostel queries with strictly verified institutional answers or transparent pending-verification notices.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} pt={1}>
              <Button
                size="large"
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/chat")}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                }}
              >
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Key Features Grid */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h5" fontWeight={800} mb={1}>
            Platform Capabilities
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Designed for multi-college query handling with strict context isolation
          </Typography>
        </Box>

        <Grid2 container spacing={3}>
          {featureItems.map((feature) => (
            <Grid2 key={feature.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: feature.accentBg,
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.65}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>

      {/* Registered Colleges Preview */}
      {colleges.length > 0 && (
        <Container maxWidth="lg" sx={{ pt: 2, pb: 8 }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              Registered Institutions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a college below to open the chat assistant with its scoped knowledge base
            </Typography>
          </Box>

          <Grid2 container spacing={2.5} justifyContent="center">
            {colleges.map((college) => (
              <Grid2 key={college.college_id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <CardActionArea
                    onClick={() => void handleOpenWithCollege(college.college_id)}
                    sx={{ height: "100%", p: 0.5 }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1.5}
                        mb={1}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
                          <CollegeAvatar
                            logoUrl={college.logo_url}
                            collegeName={college.college_name}
                            size={42}
                          />
                          <Box minWidth={0}>
                            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.25}>
                              {college.college_name}
                            </Typography>
                            <Typography variant="caption" color="primary.main" fontWeight={600}>
                              {college.short_code}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          size="small"
                          label={college.college_id}
                          sx={{ fontSize: "0.72rem", flexShrink: 0 }}
                        />
                      </Stack>

                      {college.location && (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{ mb: 1, color: "text.secondary" }}
                        >
                          <LocationOnOutlinedIcon sx={{ fontSize: 15, flexShrink: 0 }} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {college.location}
                          </Typography>
                        </Stack>
                      )}

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1.75, minHeight: 40 }}
                      >
                        {college.official_name ||
                          "Template profile awaiting official institutional verification."}
                      </Typography>

                      <Stack direction="row" spacing={1}>
                        <Chip
                          size="small"
                          label={`${college.verified_faq_count} Verified`}
                          color={
                            college.verified_faq_count > 0 ? "success" : "default"
                          }
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        </Container>
      )}

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          mt: 8,
          borderTop: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} SmartCollege AI. Multi-College Assistant & FAQ Knowledge System.
            </Typography>
            <Stack direction="row" spacing={3}>
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate("/chat")}
                sx={{ color: "text.secondary" }}
              >
                Student Chat
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate("/admin")}
                sx={{ color: "text.secondary" }}
              >
                Staff Admin Portal
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};
