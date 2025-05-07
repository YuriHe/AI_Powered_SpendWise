
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/shared/Loader";

const Index = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader size="large" />
    </div>
  );
};

export default Index;
