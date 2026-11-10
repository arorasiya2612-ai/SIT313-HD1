import bannerImage from './assets/images/banner.jpg'

function Banner() {
  return (
    <section className="banner">

      <img
        src={bannerImage}
        alt="DEV@Deakin banner"
      />

      <div className="banner-message">
        Hey, I'm Siya Arora
      </div>

    </section>
  )
}

export default Banner