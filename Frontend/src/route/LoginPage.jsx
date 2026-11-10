
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

import Header from "../Header";
import Footer from "../Footer";
import { useAuth } from "../AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Existing email/password login
  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please try again.");
      }

      if (!data.token || !data.user) {
        throw new Error("The server did not return a valid login session.");
      }

      await login(data.token, data.user);

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setError("");

    try {
      setLoading(true);

      // Open Google account selection popup
      const result = await signInWithPopup(auth, googleProvider);

      // Obtain Firebase ID token
      const idToken = await result.user.getIdToken();

      // Exchange Firebase token for application JWT
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Google sign-in failed. Please try again."
        );
      }

      if (!data.token || !data.user) {
        throw new Error("The server did not return a valid login session.");
      }

      // Save application JWT in AuthContext
      await login(data.token, data.user);

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google login error:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Please allow popups to continue with Google.");
      } else {
        setError(
          err.message || "Unable to sign in with Google. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="login-page">
        <div className="login-container">
          <h1>Login Page</h1>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-row">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>

              <Link to="/forgot-password" className="forgot-password-link">
                Forgot Password?
              </Link>

              <button type="submit" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>
            
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

         <button
            type="button"
            className="google-login-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className="google-icon"
            />
            <span>
              {loading ? "Please wait..." : "Continue with Google"}
            </span>
          </button>

          <p>
            Don't have an account?{" "}
            <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default LoginPage;
