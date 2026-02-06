import { useState } from "react";
import { Button, TextField, Typography, Box } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm = ({ onSuccess, onSwitchToLogin }: RegisterFormProps) => {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSubmit = async () => {
    
    if (!form.email.includes("@")) {
      setError("Введите корректный email");
      return;
    }
    
    if (form.password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    try {
      await register(form);
      onSuccess?.();
    } catch (err) {
        console.log(err)
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      <Typography variant="h5" gutterBottom align="center">
        Регистрация
      </Typography>
      
      {error && (
        <Typography color="error" align="center" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TextField
        fullWidth
        label="Имя"
        value={form.name}
        onChange={handleChange("name")}
        margin="normal"
        required
        disabled={isLoading}
      />

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={form.email}
        onChange={handleChange("email")}
        margin="normal"
        required
        disabled={isLoading}
      />

      <TextField
        fullWidth
        label="Телефон"
        value={form.phone}
        onChange={handleChange("phone")}
        margin="normal"
        disabled={isLoading}
      />

      <TextField
        fullWidth
        label="Пароль"
        type="password"
        value={form.password}
        onChange={handleChange("password")}
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
        {isLoading ? "Регистрация..." : "Зарегистрироваться"}
      </Button>

      {onSwitchToLogin && (
        <Button
          fullWidth
          onClick={onSwitchToLogin}
          sx={{ mt: 2 }}
        >
          Уже есть аккаунт? Войти
        </Button>
      )}
    </Box>
  );
};