import Header from "../Header";
import Banner from "../Banner";
import About from "../About";
import Work from "../Work.jsx";
import Gallery from "../Gallery.jsx";
import Articles from "../Articles.jsx";
import Tutorials from "../Tutorials.jsx";
import Newsletter from "../Newsletter.jsx";
import Contact from "../Contact.jsx";
import Footer from "../Footer";


function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Banner />
        <About />
        <Work />
        <Gallery />
        <Articles />
        <Tutorials />
        <Newsletter />
        <Contact />
      
      </main>

      <Footer />
    </>
  );
}

export default HomePage;