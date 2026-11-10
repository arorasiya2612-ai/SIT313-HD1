import firstImage from './assets/images/first.jpg'
import secondImage from './assets/images/second.jpg'
import thirdImage from './assets/images/third.jpg'
import fourthImage from './assets/images/fourth.jpg'

function Gallery() {
  return (
    <section className="gallery-section">

      <div className="section-container">

        <h2>My Photos</h2>

        <p className="section-subtitle">
          A few moments from my university journey and
          learning experiences.
        </p>

        <div className="gallery">

          <img
            src={firstImage}
            alt="University experience"
          />

          <img
            src={secondImage}
            alt="University event"
          />

          <img
            src={thirdImage}
            alt="Technology event"
          />

          <img
            src={fourthImage}
            alt="University learning experience"
          />

        </div>

      </div>

    </section>
  )
}

export default Gallery