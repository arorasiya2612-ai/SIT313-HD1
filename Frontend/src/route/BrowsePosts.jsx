import {
  useEffect,
  useMemo,
  useState,
  useOptimistic,
  useTransition,
  useDeferredValue,
  useReducer
} from "react";

import Header from "../Header";
import Footer from "../Footer";
import "./BrowsePosts.css";

// --------------------------------------------------
// LIKE / UNLIKE BUTTON
// --------------------------------------------------

function PostLikeButton({ post, onLikeSuccess }) {
  const token = localStorage.getItem("token");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [optimisticLike, setOptimisticLike] = useOptimistic(
    {
      liked: Boolean(post.likedByMe),
      likeCount: Number(post.likeCount) || 0
    },
    (current) => ({
      liked: !current.liked,
      likeCount: Math.max(
        0,
        current.likeCount + (current.liked ? -1 : 1)
      )
    })
  );

  function handleLike() {
    if (!token) {
      setError("Please log in to like posts.");
      return;
    }

    if (isPending) return;

    setError("");

    startTransition(async () => {
      setOptimisticLike();

      try {
        const response = await fetch(
          `/api/posts/${post.id}/like`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to update like."
          );
        }

        onLikeSuccess(post.id, data);

      } catch (err) {
        setError(
          err.message || "Something went wrong."
        );
      }
    });
  }

  return (
    <div className="browse-like-container">
      <button
        type="button"
        className={`browse-like-button ${
          optimisticLike.liked ? "liked" : ""
        }`}
        onClick={handleLike}
        disabled={isPending}
        aria-pressed={optimisticLike.liked}
      >
        {optimisticLike.liked ? "♥ Liked" : "♡ Like"}

        <span>{optimisticLike.likeCount}</span>
      </button>

      {error && (
        <p className="browse-like-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}


// --------------------------------------------------
// POST COMMENTS AND REPLIES - useReducer
// --------------------------------------------------

const initialCommentsState = {
  isOpen: false,
  comments: [],
  loading: false,
  submitting: false,
  commentText: "",
  replyingTo: null,
  replyText: "",
  error: ""
};

function commentsReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_COMMENTS":
      return { ...state, isOpen: !state.isOpen };

    case "FETCH_START":
      return { ...state, loading: true, error: "" };

    case "FETCH_SUCCESS":
      return {
        ...state,
        comments: action.comments,
        loading: false
      };

    case "FETCH_ERROR":
      return {
        ...state,
        error: action.error,
        loading: false
      };

    case "SET_COMMENT_TEXT":
      return { ...state, commentText: action.value };

    case "SET_REPLY_TEXT":
      return { ...state, replyText: action.value };

    case "SET_REPLYING_TO":
      return {
        ...state,
        replyingTo: action.commentId,
        replyText: "",
        error: ""
      };

    case "SUBMIT_START":
      return { ...state, submitting: true, error: "" };

    case "SUBMIT_END":
      return { ...state, submitting: false };

    case "ADD_COMMENT":
      return {
        ...state,
        comments: [
          ...state.comments,
          {
            ...action.comment,
            replies: action.comment.replies || []
          }
        ],
        commentText: ""
      };

    case "ADD_REPLY":
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.commentId
            ? {
                ...comment,
                replies: [
                  ...(comment.replies || []),
                  action.reply
                ]
              }
            : comment
        ),
        replyText: "",
        replyingTo: null
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    default:
      return state;
  }
}

function PostComments({ postId }) {
  const [state, dispatch] = useReducer(
    commentsReducer,
    initialCommentsState
  );

  const {
    isOpen,
    comments,
    loading,
    submitting,
    commentText,
    replyingTo,
    replyText,
    error
  } = state;

  const token = localStorage.getItem("token");

  // Fetch comments when the section is opened.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function fetchComments() {
      dispatch({ type: "FETCH_START" });

      try {
        const response = await fetch(
          `/api/posts/${postId}/comments`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load comments."
          );
        }

        if (!cancelled) {
          dispatch({
            type: "FETCH_SUCCESS",
            comments: data.comments || []
          });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "FETCH_ERROR",
            error: err.message || "Unable to load comments."
          });
        }
      }
    }

    fetchComments();

    return () => {
      cancelled = true;
    };
  }, [isOpen, postId]);

  // Add a new comment.
  async function handleAddComment(event) {
    event.preventDefault();

    if (!token) {
      dispatch({
        type: "SET_ERROR",
        error: "Please log in to comment."
      });
      return;
    }

    const text = commentText.trim();

    if (!text) {
      dispatch({
        type: "SET_ERROR",
        error: "Please enter a comment."
      });
      return;
    }

    if (submitting) return;

    dispatch({ type: "SUBMIT_START" });

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to add comment."
        );
      }

      if (!data.comment) {
        throw new Error(
          "Comment was submitted, but its details were not returned. Please reopen the comments."
        );
      }

      dispatch({
        type: "ADD_COMMENT",
        comment: data.comment
      });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err.message || "Something went wrong."
      });
    } finally {
      dispatch({ type: "SUBMIT_END" });
    }
  }

  // Add a reply to an existing comment.
  async function handleAddReply(event, commentId) {
    event.preventDefault();

    if (!token) {
      dispatch({
        type: "SET_ERROR",
        error: "Please log in to reply."
      });
      return;
    }

    const text = replyText.trim();

    if (!text) {
      dispatch({
        type: "SET_ERROR",
        error: "Please enter a reply."
      });
      return;
    }

    if (submitting) return;

    dispatch({ type: "SUBMIT_START" });

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments/${commentId}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to add reply."
        );
      }

      if (!data.reply) {
        throw new Error(
          "Reply was submitted, but its details were not returned. Please reopen the comments."
        );
      }

      dispatch({
        type: "ADD_REPLY",
        commentId,
        reply: data.reply
      });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err.message || "Something went wrong."
      });
    } finally {
      dispatch({ type: "SUBMIT_END" });
    }
  }

  return (
    <section className="post-comments">
      <button
        type="button"
        className="comments-toggle-button"
        onClick={() => dispatch({ type: "TOGGLE_COMMENTS" })}
      >
        {isOpen ? "Hide Comments" : "View Comments"}
      </button>

      {isOpen && (
        <div className="comments-content">
          <h4>Comments ({comments.length})</h4>

          {error && (
            <p className="comments-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading comments...</p>
          ) : (
            <>
              {comments.length === 0 && (
                <p className="comments-empty">
                  No comments yet. Be the first to comment!
                </p>
              )}

              {comments.map(comment => (
                <div className="comment-item" key={comment.id}>
                  <div className="comment-header">
                    <strong>
                      {comment.authorName || "Community member"}
                    </strong>

                    <span>
                      {comment.createdAt
                        ? new Date(comment.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>

                  <p className="comment-text">{comment.text}</p>

                  <button
                    type="button"
                    className="reply-toggle-button"
                    onClick={() =>
                      dispatch({
                        type: "SET_REPLYING_TO",
                        commentId:
                          replyingTo === comment.id ? null : comment.id
                      })
                    }
                  >
                    {replyingTo === comment.id
                      ? "Cancel Reply"
                      : "Reply"}
                  </button>

                  {replyingTo === comment.id && (
                    <form
                      className="reply-form"
                      onSubmit={event =>
                        handleAddReply(event, comment.id)
                      }
                    >
                      <textarea
                        value={replyText}
                        onChange={event =>
                          dispatch({
                            type: "SET_REPLY_TEXT",
                            value: event.target.value
                          })
                        }
                        placeholder="Write a reply..."
                        maxLength={1000}
                        rows={2}
                      />

                      <button type="submit" disabled={submitting}>
                        {submitting ? "Sending..." : "Post Reply"}
                      </button>
                    </form>
                  )}

                  {comment.replies?.length > 0 && (
                    <div className="comment-replies">
                      {comment.replies.map(reply => (
                        <div className="reply-item" key={reply.id}>
                          <div className="comment-header">
                            <strong>
                              {reply.authorName || "Community member"}
                            </strong>

                            <span>
                              {reply.createdAt
                                ? new Date(reply.createdAt).toLocaleString()
                                : ""}
                            </span>
                          </div>

                          <p className="comment-text">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <form
                className="add-comment-form"
                onSubmit={handleAddComment}
              >
                <textarea
                  value={commentText}
                  onChange={event =>
                    dispatch({
                      type: "SET_COMMENT_TEXT",
                      value: event.target.value
                    })
                  }
                  placeholder="Write a comment..."
                  maxLength={1000}
                  rows={3}
                />

                <button type="submit" disabled={submitting}>
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </section>
  );
}


// --------------------------------------------------
// BROWSE POSTS COMPONENT
// --------------------------------------------------

function BrowsePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filters.
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [postType, setPostType] = useState("all");
  const [postPlan, setPostPlan] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Post display state.
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [hiddenPosts, setHiddenPosts] = useState([]);

  // --------------------------------------------------
  // FETCH POSTS
  // --------------------------------------------------

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const response = await fetch("/api/posts", {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {}
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load posts."
          );
        }

        setPosts(data.posts || []);

      } catch (err) {
        setError(
          err.message || "Something went wrong."
        );

      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // --------------------------------------------------
  // UPDATE POST AFTER LIKE / UNLIKE
  // --------------------------------------------------

  function handleLikeSuccess(postId, data) {
    setPosts(previous =>
      previous.map(post =>
        post.id === postId
          ? {
              ...post,
              likedByMe: data.liked,
              likeCount: data.likeCount
            }
          : post
      )
    );
  }

  // --------------------------------------------------
  // COLLECT AVAILABLE TAGS
  // --------------------------------------------------

  const allTags = useMemo(() => {
    return [
      ...new Set(
        posts.flatMap(post => post.tags || [])
      )
    ].sort();
  }, [posts]);

  // --------------------------------------------------
  // SEARCH AND FILTER POSTS
  // --------------------------------------------------

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const searchText = deferredSearch.toLowerCase();

      const matchesSearch =
        post.title?.toLowerCase().includes(searchText) ||
        post.authorName?.toLowerCase().includes(searchText) ||
        (post.tags || []).some(tag =>
          tag.toLowerCase().includes(searchText)
        );

      const matchesType =
        postType === "all" ||
        post.postType === postType;

      const matchesPlan =
        postPlan === "all" ||
        post.postPlan === postPlan;

      const matchesTag =
        selectedTag === "all" ||
        (post.tags || []).includes(selectedTag);

      const postDate = post.createdAt
        ? new Date(post.createdAt).toISOString().slice(0, 10)
        : "";

      const matchesStartDate =
        !startDate ||
        (postDate && postDate >= startDate);

      const matchesEndDate =
        !endDate ||
        (postDate && postDate <= endDate);

      return (
        matchesSearch &&
        matchesType &&
        matchesPlan &&
        matchesTag &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    posts,
    deferredSearch,
    postType,
    postPlan,
    selectedTag,
    startDate,
    endDate
  ]);

  // --------------------------------------------------
  // EXPAND / COLLAPSE POSTS
  // --------------------------------------------------

  function toggleExpanded(postId) {
    setExpandedPosts(previous =>
      previous.includes(postId)
        ? previous.filter(id => id !== postId)
        : [...previous, postId]
    );
  }

  // --------------------------------------------------
  // HIDE POSTS
  // --------------------------------------------------

  function hidePost(postId) {
    setHiddenPosts(previous =>
      previous.includes(postId)
        ? previous
        : [...previous, postId]
    );
  }

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  function resetFilters() {
    setSearch("");
    setPostType("all");
    setPostPlan("all");
    setSelectedTag("all");
    setStartDate("");
    setEndDate("");
    setHiddenPosts([]);
    setExpandedPosts([]);
  }

  const visiblePosts = filteredPosts.filter(
    post => !hiddenPosts.includes(post.id)
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <>
      <Header />

      <main className="browse-posts-page">

        {/* PAGE HEADING */}

        <section className="browse-posts-heading">
          <h1>Browse Posts</h1>

          <p>
            Explore questions and articles shared by the DEV@Deakin
            community.
          </p>
        </section>


        {/* SEARCH AND FILTERS */}

        <section className="browse-posts-controls">

          <input
            type="text"
            placeholder="Search by title, author or tag..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />

          <div className="browse-filter-grid">

            <select
              value={postType}
              onChange={event => setPostType(event.target.value)}
            >
              <option value="all">All Post Types</option>
              <option value="question">Questions</option>
              <option value="article">Articles</option>
            </select>

            <select
              value={postPlan}
              onChange={event => setPostPlan(event.target.value)}
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={selectedTag}
              onChange={event => setSelectedTag(event.target.value)}
            >
              <option value="all">All Tags</option>

              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <label>
              From

              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={event =>
                  setStartDate(event.target.value)
                }
              />
            </label>

            <label>
              To

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={event =>
                  setEndDate(event.target.value)
                }
              />
            </label>

            <button
              type="button"
              onClick={resetFilters}
              className="browse-reset-button"
            >
              Reset Filters
            </button>

          </div>
        </section>


        {/* COMMUNITY POSTS */}

        <section className="browse-posts-results">

          <div className="browse-results-heading">
            <h2>Community Posts</h2>

            <span>
              {visiblePosts.length} posts found
            </span>
          </div>


          {loading && (
            <p>Loading posts...</p>
          )}

          {error && (
            <p className="browse-error">
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            visiblePosts.length === 0 && (
              <p className="browse-empty">
                No posts match your search or filters.
              </p>
            )}


          <div className="browse-posts-list">

            {visiblePosts.map(post => {
              const isExpanded =
                expandedPosts.includes(post.id);

              return (
                <article
                  className="browse-post-card"
                  key={post.id}
                >

                  {/* POST TYPE AND PLAN */}

                  <div className="browse-post-top">

                    <div>
                      <span
                        className={`post-type-label ${post.postType}`}
                      >
                        {post.postType}
                      </span>

                      <span
                        className={`post-plan-label ${post.postPlan}`}
                      >
                        {post.postPlan}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="browse-hide-button"
                      onClick={() => hidePost(post.id)}
                    >
                      Hide
                    </button>

                  </div>


                  {/* POST TITLE */}

                  <h3>{post.title}</h3>


                  {/* AUTHOR AND DATE */}

                  <div className="browse-post-meta">

                    <span>
                      By {post.authorName || "Unknown author"}
                    </span>

                    <span>
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString()
                        : "Date unavailable"}
                    </span>

                  </div>


                  {/* LIKE BUTTON */}

                  <PostLikeButton
                    post={post}
                    onLikeSuccess={handleLikeSuccess}
                  />


                  {/* TAGS */}

                  {post.tags?.length > 0 && (
                    <div className="browse-post-tags">
                      {post.tags.map(tag => (
                        <span key={tag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}


                  {/* ARTICLE ABSTRACT */}

                  {post.postType === "article" &&
                    post.abstract && (
                      <p className="browse-post-abstract">
                        {post.abstract}
                      </p>
                    )}


                  {/* PAID CONTENT RESTRICTION */}

                  {post.isLocked ? (

                    <div className="browse-locked-content">

                      <h4>Paid Content</h4>

                      <p>
                        This post is available to Paid members only.
                        Upgrade your plan to access the full content.
                      </p>

                    </div>

                  ) : (

                    <>
                      {isExpanded && (

                        <div className="browse-expanded-content">

                          {post.postType === "question" ? (
                            <p>{post.description}</p>
                          ) : (
                            <p>{post.articleText}</p>
                          )}

                        </div>

                      )}

                      <button
                        type="button"
                        className="browse-expand-button"
                        onClick={() => toggleExpanded(post.id)}
                      >
                        {isExpanded
                          ? "Show Less"
                          : "Read More"}
                      </button>

                    </>

                  )}

                  {/* COMMENTS AND REPLIES */}

                  <PostComments postId={post.id} />

                </article>
              );
            })}

          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

export default BrowsePosts;