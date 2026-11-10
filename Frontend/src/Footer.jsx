
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-column">
          <h3>Explore</h3>
          <a href="#">Home</a>
          <a href="#articles">Articles</a>
          <a href="#tutorials">Tutorials</a>
          <a href="#work">Projects</a>
        </div>

        <div className="footer-column">
          <h3>Support</h3>
          <a href="#">FAQs</a>
          <a href="#">Help</a>
          <a href="#contact">Contact Us</a>
        </div>

        <div className="footer-column">
          <h3>Stay Connected</h3>

          <div className="social-links">
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FaFacebookF />
              <span>Facebook</span>
            </a>

            <a
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            >
              <FaXTwitter />
              <span>Twitter</span>
            </a>

            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <FaInstagram />
              <span>Instagram</span>
            </a>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <h3>DEV@Deakin</h3>
        <p>© 2026 DEV@Deakin. All rights reserved.</p>

        <div className="footer-policies">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
          <a href="#">Code of Conduct</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
