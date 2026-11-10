
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

function LogoutButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Show the button only when a user is logged in
  if (!user) {
    return null;
  }

  return (
    <button type="button"
    className="post-button" onClick={handleLogout}>
      Logout
    </button>
  );
}

export default LogoutButton;
