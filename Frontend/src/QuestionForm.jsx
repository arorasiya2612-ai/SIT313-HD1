function QuestionForm({
  title,
  setTitle,
  description,
  setDescription,
  tags,
  setTags,
  onPost,
  message,
}) {
  return (
    <section className="post-form">
      <h2>What do you want to ask or share</h2>

      <p>
        This section is designed for a question.
      </p>

      <label htmlFor="question-title">Title</label>
      <input
        id="question-title"
        type="text"
        placeholder="Start your question with how, what, why, etc."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="question-description">
        Describe your problem
      </label>
      <textarea
        id="question-description"
        placeholder="Describe your problem..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={8}
      />

      <label htmlFor="question-tags">Tags</label>
      <input
        id="question-tags"
        type="text"
        placeholder="Add up to 3 tags, separated by commas"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <button type="button" onClick={onPost}>
        Post
      </button>

      {message && <p role="status">{message}</p>}
    </section>
  );
}

export default QuestionForm;
