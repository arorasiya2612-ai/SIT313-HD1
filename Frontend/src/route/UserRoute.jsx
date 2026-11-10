import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

function UserRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default UserRoute;