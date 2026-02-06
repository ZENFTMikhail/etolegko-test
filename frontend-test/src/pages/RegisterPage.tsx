import { RegisterForm } from "../components/Auth/RegisterForm";
import { useNavigate } from "react-router-dom";

export const RegisterPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/dashboard");
  };

  const handleSwitchToLogin = () => {
    navigate("/login");
  };

  return (
    <RegisterForm
      onSuccess={handleSuccess}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
};
