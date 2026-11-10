
function ArticleForm({
  title,
  setTitle,
  abstract,
  setAbstract,
  articleText,
  setArticleText,
  tags,
  setTags,
  onPost,
  message,
}) {
  return (
    <section className="post-form">
      <h2>What do you want to ask or share</h2>

      <p>
        This section is designed for an article.
      </p>

      <label htmlFor="article-title">Title</label>
      <input
        id="article-title"
        type="text"
        placeholder="Enter a descriptive title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="article-abstract">Abstract</label>
      <textarea
        id="article-abstract"
        placeholder="Enter a 1-paragraph abstract"
        value={abstract}
        onChange={(e) => setAbstract(e.target.value)}
        rows={3}
      />

      <label htmlFor="article-text">Article Text</label>
      <textarea
        id="article-text"
        placeholder="Write your article here..."
        value={articleText}
        onChange={(e) => setArticleText(e.target.value)}
        rows={8}
      />

      <label htmlFor="article-tags">Tags</label>
      <input
        id="article-tags"
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

export default ArticleForm;
