import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../Header";
import Footer from "../Footer";
import QuestionForm from "../QuestionForm";
import ArticleForm from "../ArticleForm";
import { useAuth } from "../AuthContext";

function NewPost() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [postType, setPostType] = useState("Question");
  const [postPlan, setPostPlan] = useState("free");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [abstract, setAbstract] = useState("");
  const [articleText, setArticleText] = useState("");
  const [tags, setTags] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Clear form when switching post type
  const handlePostTypeChange = (type) => {
    setPostType(type);
    setTitle("");
    setDescription("");
    setAbstract("");
    setArticleText("");
    setTags("");
    setMessage("");
  };

  // Submit post to backend
  const handlePost = async () => {
    if (loading) {
      setMessage("Please wait while your session is loading.");
      return;
    }

    if (!user) {
      window.alert("Please log in before submitting a post.");
      navigate("/login");
      return;
    }

    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    let error = "";

    if (!title.trim()) {
      error = "Please enter a title.";
    } else if (title.trim().length < 5) {
      error = "Title must contain at least 5 characters.";
    } else if (tagList.length > 3) {
      error = "You can add a maximum of 3 tags.";
    } else if (postType === "Question" && !description.trim()) {
      error = "Please describe your problem.";
    } else if (postType === "Article" && !abstract.trim()) {
      error = "Please enter an abstract.";
    } else if (postType === "Article" && !articleText.trim()) {
      error = "Please enter the article text.";
    }

    if (error) {
      setMessage(error);
      window.alert(error);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      window.alert("Your session has expired. Please log in again.");
      navigate("/login");
      return;
    }

    const postData = {
      postType: postType.toLowerCase(),
      postPlan,
      title: title.trim(),
      description: description.trim(),
      abstract: abstract.trim(),
      articleText: articleText.trim(),
      tags: tagList,
    };

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit your post.");
      }

      const successMessage =
        data.message || "Your post has been submitted successfully!";

      setMessage(successMessage);
      window.alert(successMessage);

      // Reset form after successful submission
      setTitle("");
      setDescription("");
      setAbstract("");
      setArticleText("");
      setTags("");
      setPostPlan("free");

    } catch (error) {
      console.error("Post submission error:", error);

      setMessage(error.message);
      window.alert(error.message);

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <main className="new-post-page">
        <h1>Create a Post</h1>

        {/* Post Type Selection */}
        <div className="post-type-selector">
          <label>Select Post Type:</label>

          <label>
            <input
              type="radio"
              name="postType"
              value="Question"
              checked={postType === "Question"}
              onChange={() => handlePostTypeChange("Question")}
            />
            Question
          </label>

          <label>
            <input
              type="radio"
              name="postType"
              value="Article"
              checked={postType === "Article"}
              onChange={() => handlePostTypeChange("Article")}
            />
            Article
          </label>
        </div>

        {/* Post Plan Selection */}
        <div className="post-plan-selector">
          <label>Select Post Plan:</label>

          <label>
            <input
              type="radio"
              name="postPlan"
              value="free"
              checked={postPlan === "free"}
              onChange={() => setPostPlan("free")}
            />
            Free
          </label>

          <label>
            <input
              type="radio"
              name="postPlan"
              value="paid"
              checked={postPlan === "paid"}
              onChange={() => setPostPlan("paid")}
            />
            Paid
          </label>
        </div>

        {/* Conditional Form Rendering */}
        {postType === "Question" && (
          <QuestionForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            tags={tags}
            setTags={setTags}
            onPost={handlePost}
            message={message}
          />
        )}

        {postType === "Article" && (
          <ArticleForm
            title={title}
            setTitle={setTitle}
            abstract={abstract}
            setAbstract={setAbstract}
            articleText={articleText}
            setArticleText={setArticleText}
            tags={tags}
            setTags={setTags}
            onPost={handlePost}
            message={message}
          />
        )}

        {submitting && (
          <p role="status">Submitting your post...</p>
        )}
      </main>

      <Footer />
    </>
  );
}

export default NewPost;