
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  FiArrowLeft,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiShield,
} from "react-icons/fi";

import Header from "../Header";
import Footer from "../Footer";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [updatingId, setUpdatingId] = useState(null);

  // Fetch registered users from the backend
  const fetchUsers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to fetch registered users."
        );
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Search and filter registered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        (user.fullName || "").toLowerCase().includes(searchValue) ||
        (user.email || "").toLowerCase().includes(searchValue);

      const matchesPlan =
        planFilter === "all" || user.plan === planFilter;

      const matchesStatus =
        statusFilter === "all" ||
        user.accountStatus === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, search, planFilter, statusFilter]);

  // Dashboard statistics
  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.accountStatus === "active"
  ).length;

  const suspendedUsers = users.filter(
    (user) => user.accountStatus === "suspended"
  ).length;

  // Format Firestore dates
  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Suspend or reactivate a user
  const updateStatus = async (user) => {
    const isSuspended = user.accountStatus === "suspended";

    const newStatus = isSuspended ? "active" : "suspended";

    const actionText = isSuspended ? "reactivate" : "suspend";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} ${user.fullName || user.email}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(user.id);
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountStatus: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Unable to ${actionText} this user.`
        );
      }

      // Update the interface without refreshing the entire page
      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? { ...item, accountStatus: newStatus }
            : item
        )
      );

      setMessage(
        `${user.fullName || user.email} has been ${
          isSuspended ? "reactivated" : "suspended"
        } successfully.`
      );
    } catch (err) {
      setError(err.message || "Unable to update user status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Header />

      <main className="admin-dashboard admin-users-page">

        {/* Page heading */}
        <div className="admin-users-top">

          <Link to="/admin" className="admin-back-link">
            <FiArrowLeft />
            Back to Dashboard
          </Link>

          <div className="admin-users-heading">
            <span className="admin-section-label">
              ADMINISTRATION
            </span>

            <h1>User Management</h1>

            <p>
              View, search and manage registered DEV@Deakin users.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
          >
            <FiRefreshCw
              className={refreshing ? "admin-spinning" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh Users"}
          </button>
        </div>

        {/* Error and success messages */}
        {error && (
          <div className="admin-users-alert error">
            {error}
          </div>
        )}

        {message && (
          <div className="admin-users-alert success">
            {message}
          </div>
        )}

        {/* User statistics */}
        <section className="admin-user-summary">

          <div className="admin-user-summary-card">
            <div className="admin-summary-icon">
              <FiUsers />
            </div>

            <div>
              <h3>Total Users</h3>
              <strong>{totalUsers}</strong>
            </div>
          </div>

          <div className="admin-user-summary-card">
            <div className="admin-summary-icon active">
              <FiUserCheck />
            </div>

            <div>
              <h3>Active Users</h3>
              <strong>{activeUsers}</strong>
            </div>
          </div>

          <div className="admin-user-summary-card">
            <div className="admin-summary-icon suspended">
              <FiUserX />
            </div>

            <div>
              <h3>Suspended Users</h3>
              <strong>{suspendedUsers}</strong>
            </div>
          </div>

        </section>

        {/* Registered users */}
        <section className="admin-users-panel">

          <div className="admin-users-panel-heading">
            <div>
              <h2>Registered Users</h2>

              <p>
                Showing {filteredUsers.length} of {totalUsers} users
              </p>
            </div>
          </div>

          {/* Search and filters */}
          <div className="admin-user-filters">

            <div className="admin-search-wrapper">
              <FiSearch />

              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label="Filter by subscription plan"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by account status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

          </div>

          {/* Users table */}
          {loading ? (
            <div className="admin-users-loading">
              <FiRefreshCw className="admin-spinning" />
              <p>Loading registered users...</p>
            </div>
          ) : (
            <div className="admin-users-table-wrapper">

              <table className="admin-users-table">

                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Subscription</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const isAdmin = user.role === "admin";
                      const isSuspended =
                        user.accountStatus === "suspended";

                      return (
                        <tr key={user.id}>

                          {/* User name - no unwanted initials */}
                          <td>
                            <div className="admin-user-name">
                              {user.fullName || "Unknown User"}
                            </div>
                          </td>

                          <td className="admin-user-email">
                            {user.email}
                          </td>

                          <td>
                            <span
                              className={`admin-plan-badge ${
                                user.plan === "paid"
                                  ? "paid"
                                  : "free"
                              }`}
                            >
                              {user.plan || "free"}
                            </span>
                          </td>

                          <td>
                            {isAdmin ? (
                              <span className="admin-role-badge">
                                <FiShield />
                                Admin
                              </span>
                            ) : (
                              <span className="admin-role-user">
                                User
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`admin-status-badge ${
                                isSuspended
                                  ? "suspended"
                                  : "active"
                              }`}
                            >
                              {user.accountStatus || "active"}
                            </span>
                          </td>

                          <td className="admin-user-date">
                            {formatDate(user.createdAt)}
                          </td>

                          <td>
                            {isAdmin ? (
                              <span className="admin-protected-label">
                                Protected
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={`admin-user-action ${
                                  isSuspended
                                    ? "reactivate"
                                    : "suspend"
                                }`}
                                onClick={() => updateStatus(user)}
                                disabled={updatingId === user.id}
                              >
                                {updatingId === user.id
                                  ? "Updating..."
                                  : isSuspended
                                  ? "Reactivate"
                                  : "Suspend"}
                              </button>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="admin-users-empty"
                      >
                        No users found matching your search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

      <Footer />
    </>
  );
};

export default AdminUsers;
