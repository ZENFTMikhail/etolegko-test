import { useState } from "react";
import { Button, TextField, Typography, Box } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
    console.log(err)
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      <Typography variant="h5" gutterBottom align="center">
        Вход в систему
      </Typography>

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        margin="normal"
        required
        disabled={isLoading}
      />

      <TextField
        fullWidth
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        margin="normal"
        required
        disabled={isLoading}
      />

      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{ mt: 3 }}
      >
        {isLoading ? "Вход..." : "Войти"}
      </Button>
    </Box>
  );
};
