import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page grid min-h-screen place-items-center text-mute">Loading…</div>;
  return user ? children : <Navigate to="/" replace />;
}
