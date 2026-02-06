import { Container, Box, Paper, Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname === "/register" ? 1 : 0;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    navigate(newValue === 0 ? "/login" : "/register");
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            width: "100%",
            maxWidth: 450,
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <h1 style={{ margin: 0, color: "#333" }}>Etolegko</h1>
            <p style={{ color: "#666", marginTop: 4 }}>
              {currentTab === 0 ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
            </p>
          </Box>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            centered
            sx={{ mb: 4 }}
          >
            <Tab label="Вход" />
            <Tab label="Регистрация" />
          </Tabs>

          {children}
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthLayout;