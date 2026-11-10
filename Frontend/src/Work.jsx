import projects from './Work.js'

function Work() {
  return (
    <section id="work" className="work-section">

      <h2>My Work</h2>

      <div className="project-grid">

        {projects.map((project) => (
          <div className="project-card" key={project.id}>

            <img src={project.image} alt={project.title} />

            <div className="card-content">

              <h3>{project.title}</h3>

              <p>{project.description}</p>

              <div className="tags">
                {project.tags.map((tag, index) => (
                  <span key={index}>{tag}</span>
                ))}
              </div>

              <a href={project.link}>
                View Project →
              </a>

            </div>

          </div>
        ))}

      </div>

    </section>
  )
}

export default Work