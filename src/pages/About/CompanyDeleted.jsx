import { motion } from 'framer-motion';
import '../../styles/About.css';

const Company = () => {
  const timeline = [
    {
      year: '2023',
      title: 'MK Beauty Foundation',
      description: 'Started operations as MK Beauty in May 2023, focusing on bringing Korean cosmetic manufacturing to the Philippines.'
    },
    {
      year: '2024',
      title: 'Evolution to BLCP',
      description: 'Rebranded to Beauty Lab Cosmetic Products Corporation in January 2024, expanding our services and vision.'
    }
  ];

  return (
    <div className="company-page bg-white">
      <motion.div 
        className="company-hero bg-gradient-to-r from-[#363a94] to-[#4a4eba]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-content text-white">
          <h1 className="text-4xl md:text-5xl font-bold">Our Company History</h1>
          <p className="text-xl mt-4 opacity-90">A journey of growth and transformation</p>
        </div>
      </motion.div>

      <div className="company-content max-w-6xl mx-auto px-6 py-16">
        <section className="company-story mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-semibold text-[#363a94] mb-6">Our Story</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              BLCP began its journey as MK Beauty in May 2023. Through dedication to quality and customer service, 
              we've grown to become a trusted name in the cosmetic manufacturing industry.
            </p>
          </motion.div>
        </section>

        <section className="company-timeline">
          <h2 className="text-3xl font-semibold text-[#363a94] mb-10">Our Journey</h2>
          <div className="timeline">
            {timeline.map((item, index) => (
              <motion.div
                key={item.year}
                className="timeline-item border-l-4 border-[#363a94] pl-8 pb-10 relative"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="absolute w-6 h-6 bg-[#363a94] rounded-full -left-[13px] top-0 shadow-lg"></div>
                <div className="timeline-year text-white bg-[#363a94] inline-block px-4 py-1 rounded-full text-lg font-semibold mb-3">
                  {item.year}
                </div>
                <div className="timeline-content bg-gray-50 p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-bold text-[#363a94] mb-2">{item.title}</h3>
                  <p className="text-gray-700">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Company; 