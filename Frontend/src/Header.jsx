
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LogoutButton from "./route/LogoutButton";

function Header() {
  const { user, loading } = useAuth();

  const isAdmin = user?.role === "admin";
  const isLoggedIn = Boolean(user);

  return (
    <header className="navbar">
      <div className="logo">
        <Link to="/">DEV@Deakin</Link>
      </div>

      <div className="nav-actions">
        <input
          type="text"
          placeholder="Search..."
          className="search-box"
        />

        {/* Available to everyone */}
        <Link to="/browse" className="post-button">
          Browse Posts
        </Link>

        {!loading && isLoggedIn && !isAdmin && (
          <>
            <Link to="/dashboard" className="post-button">
              My Dashboard
            </Link>

            <Link to="/post" className="post-button">
              Post
            </Link>

            <Link to="/pricing" className="post-button">
              Pricing
            </Link>
          </>
        )}

        {!loading && isAdmin && (
          <Link to="/admin" className="post-button">
            Admin Dashboard
          </Link>
        )}

        {!loading && (
          isLoggedIn ? (
            <LogoutButton />
          ) : (
            <Link to="/login" className="login-link">
              Login
            </Link>
          )
        )}
      </div>
    </header>
  );
}

export default Header;
