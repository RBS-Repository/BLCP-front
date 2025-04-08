import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/Services.css';

const PrivateLabel = () => {
  const benefits = [
    {
      title: 'Quick Launch',
      description: 'Ready-to-go formulations for faster market entry'
    },
    {
      title: 'Cost-Effective',
      description: 'Lower development costs with proven formulas'
    },
    {
      title: 'Quality Assured',
      description: 'Pre-tested and market-proven products'
    },
    {
      title: 'Customizable',
      description: 'Flexible packaging and branding options'
    }
  ];

  return (
    <div className="service-detail-page">
      <motion.div 
        className="service-hero private-label-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content">
          <h1>Private Label Services</h1>
          <p>Launch your brand with proven formulations</p>
        </div>
      </motion.div>

      <div className="service-content">
        <section className="service-intro">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Start Your Beauty Brand</h2>
            <p>Launch your cosmetic brand quickly with our private label solutions. Choose from our extensive range of market-tested formulations and customize the packaging to match your brand identity.</p>
          </motion.div>
        </section>

        <section className="service-features">
          <h2>Benefits of Private Label</h2>
          <div className="features-grid">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="product-categories">
          <h2>Available Product Categories</h2>
          <div className="categories-grid">
            <div className="category-card">
              <h3>Skincare</h3>
              <ul>
                <li>Cleansers</li>
                <li>Toners</li>
                <li>Serums</li>
                <li>Moisturizers</li>
              </ul>
            </div>
            <div className="category-card">
              <h3>Body Care</h3>
              <ul>
                <li>Body Wash</li>
                <li>Lotions</li>
                <li>Scrubs</li>
                <li>Body Oils</li>
              </ul>
            </div>
            <div className="category-card">
              <h3>Hair Care</h3>
              <ul>
                <li>Shampoo</li>
                <li>Conditioner</li>
                <li>Treatments</li>
                <li>Styling Products</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivateLabel; 