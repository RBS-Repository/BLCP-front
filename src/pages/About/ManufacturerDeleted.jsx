import { motion } from 'framer-motion';
import '../../styles/About.css';

const Manufacturer = () => {
  const features = [
    {
      title: 'Experience',
      description: 'Over 20 years of expertise in cosmetic manufacturing'
    },
    {
      title: 'Quality',
      description: 'CGMP certified facility with stringent quality control'
    },
    {
      title: 'Innovation',
      description: 'State-of-the-art R&D facilities and advanced technology'
    },
    {
      title: 'Compliance',
      description: 'Full regulatory compliance and documentation support'
    }
  ];

  return (
    <div className="manufacturer-page bg-white">
      <motion.div 
        className="manufacturer-hero bg-gradient-to-r from-[#363a94] to-[#4a4eba]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content text-white">
          <h1 className="text-4xl md:text-5xl font-bold">Our Manufacturer</h1>
          <p className="text-xl mt-4 opacity-90">Hyunjin C&T - Excellence in Korean Cosmetics</p>
        </div>
      </motion.div>

      <div className="manufacturer-content max-w-6xl mx-auto px-6 py-16">
        <section className="manufacturer-intro mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-semibold text-[#363a94] mb-6">About Hyunjin C&T</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              Our partnership with Hyunjin C&T brings world-class Korean cosmetic manufacturing expertise 
              to the Philippines. With over two decades of experience, they are at the forefront of
              innovation and quality in the cosmetic industry.
            </p>
          </motion.div>
        </section>

        <section className="manufacturer-features">
          <h2 className="text-3xl font-semibold text-[#363a94] mb-10">Why Choose Us</h2>
          <div className="features-grid grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="feature-card bg-white p-8 rounded-lg border-l-4 border-[#363a94] shadow-md hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3 className="text-xl font-bold text-[#363a94] mb-3">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Manufacturer; 