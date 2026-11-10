
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

function AdminRoute({ children }) {
  const { user, loading, logout } = useAuth();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Quick frontend check before contacting the backend
      if (user.role !== "admin") {
        setChecking(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");

        const response = await fetch("/api/admin/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setIsAdmin(false);
          } else {
            throw new Error("Unable to verify administrator access.");
          }
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Admin verification error:", error);
        setIsAdmin(false);
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    if (!loading) {
      verifyAdmin();
    }

    return () => {
      isMounted = false;
    };
  }, [user, loading]);

  if (loading || checking) {
    return <p>Checking administrator access...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
