import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store";
import { authApi } from "@/services/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate("/signin", { replace: true });
      return;
    }

    if (!user) {
      authApi
        .getMe()
        .then((u) => setAuth(u, token))
        .catch(() => {
          clearAuth();
          navigate("/signin", { replace: true });
        });
    } else {
      setLoading(false);
    }
  }, [token, user, navigate, setAuth, clearAuth, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
