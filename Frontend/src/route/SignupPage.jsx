
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  signInWithPopup,
  signOut
} from "firebase/auth";

import {
  auth,
  googleProvider
} from "../firebase";

import Header from "../Header";
import Footer from "../Footer";
import { useAuth } from "../AuthContext";

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google registration
  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");

    try {
      setGoogleLoading(true);

      // Open Google account selection.
      const result = await signInWithPopup(auth, googleProvider);

      // Get Firebase ID token.
      const idToken = await result.user.getIdToken();

      // Send token to Express backend.
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Google registration failed."
        );
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid login session received.");
      }

      // Save application JWT and user information.
      await login(data.token, data.user);

      navigate("/", { replace: true });

    } catch (err) {
      console.error("Google signup error:", err);

      // Clear Firebase client session if backend registration fails.
      await signOut(auth).catch(() => {});

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-up was cancelled.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError(
          "An account already exists with this email. Please use your existing login method."
        );
      } else {
        setError(
          err.message || "Unable to sign up with Google."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Existing email/password registration
  const handleSignup = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create account.");
        return;
      }

      setSuccess(
        data.message || "Account created successfully!"
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      console.error("Signup error:", err);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="signup-page">
        <div className="signup-container">

          <h1>Create Account</h1>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p role="status">
              {success}
            </p>
          )}

          {/* Google Signup */}
          <button
            type="button"
            className="google-signup-button"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              "Connecting to Google..."
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.7 5.98c4.5-4.16 7.07-10.29 7.07-17.63z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.91-5.82l-7.7-5.98c-2.13 1.43-4.89 2.27-8.21 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="signup-divider">
            <span>OR</span>
          </div>

          <form
            className="signup-form"
            onSubmit={handleSignup}
          >

            <div className="form-row">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                autoComplete="name"
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <p>
            Already have an account?{" "}
            <Link to="/login">Login</Link>
          </p>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default SignupPage;
