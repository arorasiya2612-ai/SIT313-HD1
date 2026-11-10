function Contact() {
  return (
    <section id="contact" className="contact-section">

      <div className="section-container">

        <h2>Contact</h2>

        <p className="section-subtitle">
          Feel free to connect with me or get in touch
          through the links below.
        </p>

        <div className="contact-links">

          <a
            href="mailto:arorasiya2612@gmail.com"
            className="contact-button"
          >
            📧 Email Me
          </a>

          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-button"
          >
            💻 GitHub →
          </a>

          <a
            href="https://www.linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-button"
          >
            🔗 LinkedIn →
          </a>

        </div>

      </div>

    </section>
  )
}

export default Contact