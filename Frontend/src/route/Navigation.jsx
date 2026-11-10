
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LogoutButton from "./route/LogoutButton";

function Navigation() {
  const { user, loading } = useAuth();

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">DEV@Deakin</Link>
      </div>

      <div className="nav-actions">
        <input
          type="text"
          placeholder="Search..."
          className="search-box"
        />

        <Link to="/post" className="post-button">
          Post
        </Link>

        {!loading && (
          user ? (
            <LogoutButton />
          ) : (
            <Link to="/login" className="login-link">
              Login
            </Link>
          )
        )}
      </div>
    </nav>
  );
}

export default Navigation;
