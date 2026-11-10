
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./route/HomePage";
import LoginPage from "./route/LoginPage";
import SignupPage from "./route/SignupPage";
import ForgotPassword from "./route/ForgotPassword";
import NewPost from "./route/NewPost";
import PricingPage from "./route/PricingPage";
import BrowsePosts from "./route/BrowsePosts";
import AdminDashboard from "./route/AdminDashboard";
import AdminRoute from "./route/AdminRoute";
import AdminUsers from "./route/AdminUsers";
import AdminPosts from "./route/AdminPosts";
import UserDashboard from "./route/UserDashboard";
import UserRoute from "./route/UserRoute";
import "./App.css";
import { AuthProvider } from "./AuthContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/post" element={<NewPost />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/browse" element={<BrowsePosts />} />
          <Route
                path="/dashboard"
                element={
                  <UserRoute>
                    <UserDashboard />
                  </UserRoute>
                }
              />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/posts"
            element={
              <AdminRoute>
                <AdminPosts />
              </AdminRoute>
            }
          />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
