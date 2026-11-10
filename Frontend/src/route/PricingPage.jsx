
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../Header";
import Footer from "../Footer";
import { useAuth } from "../AuthContext";

import "./PricingPage.css";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "A great starting point for exploring DEV@Deakin.",
    features: [
      "Browse community posts",
      "Create up to 5 posts per month",
      "Upload images up to 2 MB",
      "Access community tutorials",
      "Join the developer community",
    ],
  },
  {
    name: "Paid",
    price: "$9.99",
    period: "per month",
    description: "More room to share, create, and grow.",
    features: [
      "Everything included in Free",
      "Create up to 50 posts per month",
      "Upload images up to 10 MB",
      "Priority visibility for your posts",
      "Enhanced profile customisation",
    ],
    popular: true,
  },
];

function PricingPage() {
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuth();

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleUpgradeClick = () => {
    setError("");
    setSuccess("");

    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.plan === "paid") {
      setSuccess("You are already on the Paid plan.");
      return;
    }

    setShowUpgrade(true);
  };

  const handleUpgrade = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    if (!token || !user) {
      setShowUpgrade(false);
      navigate("/login");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to upgrade your subscription."
        );
      }

      // Reload the current user from the backend.
      await refreshUser();

      setShowUpgrade(false);
      setForm({
        cardholderName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
      });

      setSuccess("Upgrade successful! Your Paid plan is now active.");
    } catch (err) {
      console.error("Upgrade error:", err);
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <main className="pricing-page">
        <section className="pricing-intro">
          <p className="pricing-eyebrow">SIMPLE AND FLEXIBLE</p>
          <h1>Choose your plan</h1>
          <p>
            Find the right plan for your ideas, projects, and
            developer journey at DEV@Deakin.
          </p>
        </section>

        {success && (
          <p className="pricing-success" role="status">
            {success}
          </p>
        )}

        {error && !showUpgrade && (
          <p className="pricing-error" role="alert">
            {error}
          </p>
        )}

        <section className="pricing-grid">
          {plans.map((plan) => {
            const isCurrentPlan =
              user?.plan === plan.name.toLowerCase();

            return (
              <article
                key={plan.name}
                className={`pricing-card ${
                  plan.name === "Paid" ? "paid-plan" : "free-plan"
                }`}
              >
                {plan.popular && (
                  <span className="popular-label">RECOMMENDED</span>
                )}

                <h2>{plan.name}</h2>
                <p className="plan-description">
                  {plan.description}
                </p>

                <div className="plan-price">
                  <span>{plan.price}</span>
                  <small>{plan.period}</small>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className="feature-check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.name === "Free" ? (
                  <button
                    type="button"
                    className="pricing-button free-button"
                    disabled
                  >
                    {isCurrentPlan ? "Your Current Plan" : "Free Plan"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pricing-button paid-button"
                    onClick={handleUpgradeClick}
                    disabled={loading}
                  >
                    {isCurrentPlan
                      ? "Your Current Plan"
                      : "Upgrade to Paid"}
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <p className="pricing-note">
          Plan features and prices are for demonstration purposes only.
          No real payment is processed.
        </p>
      </main>

      {showUpgrade && (
        <div
          className="upgrade-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setShowUpgrade(false);
              setError("");
            }
          }}
        >
          <section
            className="upgrade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
          >
            <button
              type="button"
              className="upgrade-close"
              aria-label="Close upgrade form"
              disabled={submitting}
              onClick={() => {
                setShowUpgrade(false);
                setError("");
              }}
            >
              ×
            </button>

            <h2 id="upgrade-title">Upgrade to Paid</h2>
            <p className="upgrade-description">
              Complete this demonstration form to activate your Paid plan.
            </p>

            {error && (
              <p className="pricing-error" role="alert">
                {error}
              </p>
            )}

            <form onSubmit={handleUpgrade} className="upgrade-form">
              <label htmlFor="cardholderName">Cardholder name</label>
              <input
                id="cardholderName"
                name="cardholderName"
                type="text"
                autoComplete="off"
                value={form.cardholderName}
                onChange={handleChange}
                required
              />

              <label htmlFor="cardNumber">Demo card number</label>
              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="16 digits"
                maxLength={19}
                value={form.cardNumber}
                onChange={handleChange}
                required
              />

              <div className="upgrade-form-row">
                <div>
                  <label htmlFor="expiry">Expiry (MM/YY)</label>
                  <input
                    id="expiry"
                    name="expiry"
                    type="text"
                    placeholder="MM/YY"
                    autoComplete="off"
                    maxLength={5}
                    value={form.expiry}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="cvv">Demo CVV</label>
                  <input
                    id="cvv"
                    name="cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={form.cvv}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <p className="demo-payment-note">
                Demonstration only. Do not enter real payment details.
                Card details are not intended to be stored.
              </p>

              <button
                type="submit"
                className="pricing-button paid-button"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Activate Paid Plan"}
              </button>
            </form>
          </section>
        </div>
      )}

      <Footer />
    </>
  );
}

export default PricingPage; 
