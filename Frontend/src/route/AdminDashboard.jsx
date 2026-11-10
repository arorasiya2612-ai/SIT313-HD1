
import { useCallback, useEffect, useState } from "react";

import {
  FiUsers,
  FiCreditCard,
  FiUserCheck,
  FiUserX,
  FiFileText,
  FiHelpCircle,
  FiBookOpen,
  FiRefreshCw,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";

import { Link } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";

function AdminDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch dashboard statistics
  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load dashboard statistics."
        );
      }

      setStatistics(data.statistics);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // User statistics cards
  const userCards = statistics
    ? [
        {
          title: "Total Users",
          value: statistics.users.total,
          description: "All registered accounts",
          icon: FiUsers,
          color: "blue",
        },
        {
          title: "Paid Members",
          value: statistics.users.paid,
          description: "Users on paid subscriptions",
          icon: FiCreditCard,
          color: "purple",
        },
        {
          title: "Free Members",
          value: statistics.users.free,
          description: "Users on the free plan",
          icon: FiUserCheck,
          color: "green",
        },
        {
          title: "Suspended Users",
          value: statistics.users.suspended,
          description: "Currently restricted accounts",
          icon: FiUserX,
          color: "red",
        },
      ]
    : [];

  // Community content cards
  const postCards = statistics
    ? [
        {
          title: "Total Posts",
          value: statistics.posts.total,
          icon: FiFileText,
          color: "blue",
        },
        {
          title: "Questions",
          value: statistics.posts.questions,
          icon: FiHelpCircle,
          color: "orange",
        },
        {
          title: "Articles",
          value: statistics.posts.articles,
          icon: FiBookOpen,
          color: "purple",
        },
      ]
    : [];

  // Subscription calculations
  const totalUsers = statistics?.users.total || 0;

  const paidPercentage = totalUsers
    ? (statistics.users.paid / totalUsers) * 100
    : 0;

  const freePercentage = totalUsers
    ? (statistics.users.free / totalUsers) * 100
    : 0;

  return (
    <>
      <Header />

      <main className="admin-page">
        <div className="admin-container">

          {/* Dashboard heading */}
          <section className="admin-welcome">
            <div>
              <span className="admin-eyebrow">
                ADMINISTRATION
              </span>

              <h1>Dashboard Overview</h1>

              <p>
                Welcome to your DEV@Deakin control centre.
                Monitor users, subscriptions and community activity.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={fetchStatistics}
              disabled={loading}
            >
              <FiRefreshCw
                className={loading ? "spinning" : ""}
              />

              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </section>

          {/* Quick management actions */}
          <section className="admin-dashboard-actions">
            <Link
              to="/admin/users"
              className="admin-dashboard-action"
            >
              <FiUsers />
              <span>Manage Users</span>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link
              to="/admin/posts"
              className="admin-dashboard-action"
            >
              <FiFileText />
              <span>Manage Content</span>
              <FiArrowRight className="admin-action-arrow" />
            </Link>
          </section>

          {/* Error state */}
          {error && (
            <div className="admin-error">
              <FiAlertCircle />

              <div>
                <strong>Unable to load dashboard</strong>
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={fetchStatistics}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Initial loading state */}
          {loading && !statistics && !error && (
            <div className="admin-loading">
              <FiRefreshCw className="spinning" />
              <p>Loading dashboard information...</p>
            </div>
          )}

          {/* Dashboard content */}
          {statistics && (
            <>
              {/* User statistics */}
              <section className="admin-section">
                <div className="admin-section-heading">
                  <div>
                    <h2>User Statistics</h2>
                    <p>
                      Overview of registered platform members
                    </p>
                  </div>

                  <span className="admin-section-tag">
                    {totalUsers} Members
                  </span>
                </div>

                <div className="admin-stats-grid">
                  {userCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        className="admin-stat-card"
                        key={card.title}
                      >
                        <div className="admin-card-top">
                          <div
                            className={`admin-icon ${card.color}`}
                          >
                            <Icon />
                          </div>
                        </div>

                        <p className="admin-card-title">
                          {card.title}
                        </p>

                        <h3>{card.value}</h3>

                        <span className="admin-card-description">
                          {card.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Subscription overview */}
              <section className="admin-section">
                <div className="admin-section-heading">
                  <div>
                    <h2>Subscription Overview</h2>
                    <p>
                      Distribution of free and paid members
                    </p>
                  </div>
                </div>

                <div className="admin-overview-card">
                  {totalUsers > 0 ? (
                    <div className="admin-subscription-bar">
                      <div
                        className="admin-paid-bar"
                        style={{
                          width: `${paidPercentage}%`,
                        }}
                      />

                      <div
                        className="admin-free-bar"
                        style={{
                          width: `${freePercentage}%`,
                        }}
                      />
                    </div>
                  ) : (
                    <p>No registered users available.</p>
                  )}

                  <div className="admin-subscription-legend">
                    <div>
                      <span className="legend-dot paid-dot" />

                      <div>
                        <strong>Paid Members</strong>
                        <p>
                          {statistics.users.paid} users (
                          {paidPercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="legend-dot free-dot" />

                      <div>
                        <strong>Free Members</strong>
                        <p>
                          {statistics.users.free} users (
                          {freePercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Community content statistics */}
              <section className="admin-section">
                <div className="admin-section-heading">
                  <div>
                    <h2>Community Content</h2>
                    <p>
                      Content published across DEV@Deakin
                    </p>
                  </div>

                  <span className="admin-section-tag">
                    {statistics.posts.total} Posts
                  </span>
                </div>

                <div className="admin-stats-grid admin-post-grid">
                  {postCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        className="admin-stat-card"
                        key={card.title}
                      >
                        <div className="admin-card-top">
                          <div
                            className={`admin-icon ${card.color}`}
                          >
                            <Icon />
                          </div>
                        </div>

                        <p className="admin-card-title">
                          {card.title}
                        </p>

                        <h3>{card.value}</h3>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Footer note */}
              <div className="admin-footer-note">
                <span className="admin-status-dot" />
                Dashboard data retrieved from your Firestore database.
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default AdminDashboard;
