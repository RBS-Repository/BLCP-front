import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/Services.css';

const OEM = () => {
  const features = [
    {
      title: 'Custom Formulation',
      description: 'Develop unique products tailored to your target market'
    },
    {
      title: 'Quality Testing',
      description: 'Rigorous quality control and stability testing'
    },
    {
      title: 'Packaging Design',
      description: 'Creative packaging solutions that stand out'
    },
    {
      title: 'Documentation',
      description: 'Complete technical and regulatory documentation'
    }
  ];

  return (
    <div className="service-detail-page">
      <motion.div 
        className="service-hero oem-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content">
          <h1>OEM Manufacturing</h1>
          <p>Create your unique cosmetic products with us</p>
        </div>
      </motion.div>

      <div className="service-content">
        <section className="service-intro">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Custom Manufacturing Excellence</h2>
            <p>Partner with us to develop and manufacture unique cosmetic products that meet your exact specifications. Our state-of-the-art facilities and experienced team ensure the highest quality standards.</p>
          </motion.div>
        </section>

        <section className="service-features">
          <h2>Our OEM Services</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Ready to Start Your Project?</h2>
            <p>Contact us to discuss your product requirements and get started on your manufacturing journey.</p>
            <Link to="/schedule" className="cta-button">
              Schedule Consultation
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default OEM; 