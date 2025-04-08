import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/Services.css';

const FDA = () => {
  const services = [
    {
      title: 'Documentation Support',
      description: 'Complete preparation of required FDA documents'
    },
    {
      title: 'Registration Process',
      description: 'Handling the entire FDA registration procedure'
    },
    {
      title: 'Compliance Guidance',
      description: 'Expert advice on regulatory requirements'
    },
    {
      title: 'Post-Registration',
      description: 'Ongoing support for maintaining compliance'
    }
  ];

  return (
    <div className="service-detail-page">
      <motion.div 
        className="service-hero fda-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content">
          <h1>FDA Licensing Support</h1>
          <p>Streamlined registration process for your cosmetic products</p>
        </div>
      </motion.div>

      <div className="service-content">
        <section className="service-intro">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Comprehensive FDA Support</h2>
            <p>Navigate the FDA registration process with confidence. Our experienced team handles all aspects of documentation and compliance to ensure a smooth registration process for your cosmetic products.</p>
          </motion.div>
        </section>

        <section className="service-features">
          <h2>Our FDA Services</h2>
          <div className="features-grid">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="process-section">
          <h2>Registration Process</h2>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Initial Assessment</h3>
              <p>Review of product documentation and requirements</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Documentation</h3>
              <p>Preparation of necessary forms and certificates</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Submission</h3>
              <p>Filing of application with FDA</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Follow-up</h3>
              <p>Monitoring and addressing FDA queries</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FDA; 