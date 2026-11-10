
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import Header from "../Header";
import Footer from "../Footer";

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const deferredSearch = useDeferredValue(search);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch("/api/admin/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load posts.");
      }

      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updatePostStatus = async (postId, newStatus) => {
    const action = newStatus === "removed" ? "remove" : "restore";

    if (!window.confirm(`Are you sure you want to ${action} this post?`)) {
      return;
    }

    try {
      setUpdatingId(postId);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(`/api/admin/posts/${postId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Unable to ${action} post.`);
      }

      await fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const query = deferredSearch.toLowerCase();

    const matchesSearch =
      (post.title || "").toLowerCase().includes(query) ||
      (post.authorName || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      (post.status || "published") === statusFilter;

    const matchesType =
      typeFilter === "all" || post.postType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const publishedCount = posts.filter(
    (post) => (post.status || "published") === "published"
  ).length;

  const removedCount = posts.filter(
    (post) => post.status === "removed"
  ).length;

  return (
    <>
      <Header />

      <main className="admin-posts-page">
        <div className="admin-posts-heading">
          <div>
            <p className="admin-posts-eyebrow">ADMINISTRATION</p>
            <h1>Content Moderation</h1>
            <p>Review, manage and moderate community posts.</p>
          </div>

          <button
            className="admin-posts-refresh"
            onClick={fetchPosts}
            disabled={loading}
          >
            Refresh Posts
          </button>
        </div>

        <div className="admin-posts-stats">
          <div className="admin-post-stat">
            <span>Total Posts</span>
            <strong>{posts.length}</strong>
          </div>

          <div className="admin-post-stat">
            <span>Published</span>
            <strong>{publishedCount}</strong>
          </div>

          <div className="admin-post-stat">
            <span>Removed</span>
            <strong>{removedCount}</strong>
          </div>
        </div>

        <div className="admin-posts-filters">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="removed">Removed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All post types</option>
            <option value="question">Questions</option>
            <option value="article">Articles</option>
          </select>
        </div>

        {error && <div className="admin-posts-error">{error}</div>}

        {loading ? (
          <p className="admin-posts-message">Loading posts...</p>
        ) : filteredPosts.length === 0 ? (
          <p className="admin-posts-message">No posts found.</p>
        ) : (
          <div className="admin-posts-table-wrapper">
            <table className="admin-posts-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Author</th>
                  <th>Type</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPosts.map((post) => {
                  const currentStatus = post.status || "published";

                  return (
                    <tr key={post.id}>
                      <td>
                        <strong>{post.title}</strong>
                        <small>
                          {post.tags?.length
                            ? post.tags.map((tag) => `#${tag}`).join(" ")
                            : "No tags"}
                        </small>
                      </td>

                      <td>{post.authorName || "Unknown"}</td>

                      <td>
                        <span className="admin-post-type">
                          {post.postType}
                        </span>
                      </td>

                      <td>{post.postPlan || "free"}</td>

                      <td>
                        <span
                          className={`admin-post-status ${currentStatus}`}
                        >
                          {currentStatus}
                        </span>
                      </td>

                      <td>
                        {currentStatus === "published" ? (
                          <button
                            className="admin-post-remove"
                            disabled={updatingId === post.id}
                            onClick={() =>
                              updatePostStatus(post.id, "removed")
                            }
                          >
                            {updatingId === post.id
                              ? "Updating..."
                              : "Remove"}
                          </button>
                        ) : (
                          <button
                            className="admin-post-restore"
                            disabled={updatingId === post.id}
                            onClick={() =>
                              updatePostStatus(post.id, "published")
                            }
                          >
                            {updatingId === post.id
                              ? "Updating..."
                              : "Restore"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default AdminPosts;
