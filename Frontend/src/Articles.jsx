import articles from './Articles.js'

function Articles() {
  return (
    <section id="articles" className="articles-section">

      <h2>Featured Articles</h2>

      <div className="article-grid">

        {articles.map((article) => (
          <div className="article-card" key={article.id}>

            <img src={article.image} alt={article.title} />

            <div className="card-content">

              <h3>{article.title}</h3>

              <p>{article.description}</p>

              <p>⭐ {article.rating}</p>

              <p>{article.author}</p>

            </div>

          </div>
        ))}

      </div>


    </section>
  )
}

export default Articles