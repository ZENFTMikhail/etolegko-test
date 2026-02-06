import { LoginForm } from "../components/Auth/LoginForm";
import { useNavigate } from "react-router-dom";

export const LoginPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/dashboard");
  };

  return <LoginForm onSuccess={handleSuccess} />;
};