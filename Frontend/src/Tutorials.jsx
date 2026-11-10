import tutorials from './Tutorials.js'

function Tutorials() {
  return (
    <section id="tutorials" className="tutorials-section">

      <h2>Featured Tutorials</h2>

      <div className="tutorial-grid">

        {tutorials.map((tutorial) => (
          <div className="tutorial-card" key={tutorial.id}>

            <img src={tutorial.image} alt={tutorial.title} />

            <div className="card-content">

              <h3>{tutorial.title}</h3>

              <p>{tutorial.description}</p>

              <p>⭐ {tutorial.rating}</p>

              <p>{tutorial.username}</p>

            </div>

          </div>
        ))}

      </div>

     

    </section>
  )
}

export default Tutorials