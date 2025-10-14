import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ requiresAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-4 text-content">Checking access...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresAdmin && !isAdmin) {
    return <Navigate to="/profile" replace state={{ from: location, reason: "admin-only" }} />;
  }

  return <Outlet />;
}
