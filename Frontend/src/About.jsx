import profileImage from './assets/images/siya.jpg'

function About() {
  return (
    <section id="about" className="about-section">

      <div className="about-container">

        <h2>About Me</h2>

        <p className="section-subtitle">
          Get to know me and my interests.
        </p>

        <img
          src={profileImage}
          alt="Profile"
          className="profile-image"
        />

        <p className="profile-text">
          I am a Software Engineering student with a keen interest
          in learning about new technologies and building practical
          solutions that solve real-world problems.
        </p>

        <div className="divider"></div>

        <h3>Here's what I've done so far</h3>

      </div>

    </section>
  )
}

export default About