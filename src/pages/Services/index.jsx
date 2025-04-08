import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/Services.css';

const ServicesIndex = () => {
  const [activeService, setActiveService] = useState(0);
  
  const services = [
    {
      id: 'oem',
      title: 'OEM Manufacturing',
      headline: 'Custom Formulation & Manufacturing',
      description: 'Create unique cosmetic products tailored to your brand specifications with our premium Korean manufacturing partners.',
      bullets: [
        'Custom formula development',
        'Quality ingredient sourcing',
        'Small batch production',
        'Scalable manufacturing',
        'Packaging design support',
        'Quality assurance testing'
      ],
      image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?q=80&w=2070',
      icon: '🏭',
      color: '#363a94'
    },
    {
      id: 'fda',
      title: 'FDA Licensing',
      headline: 'Comprehensive Regulatory Support',
      description: 'Navigate Philippine FDA regulations seamlessly with our end-to-end compliance and registration assistance.',
      bullets: [
        'Document preparation',
        'FDA application filing',
        'Labeling compliance',
        'Ingredient verification',
        'Regulatory consultations',
        'Product certification'
      ],
      image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=2070',
      icon: '📋',
      color: '#363a94'
    },
    {
      id: 'private-label',
      title: 'Private Label',
      headline: 'Ready-to-Launch Products',
      description: 'Fast-track your market entry with our high-quality ready-made formulations that simply need your branding.',
      bullets: [
        'Pre-formulated products',
        'Custom packaging options',
        'Label design services',
        'Low minimum order quantity',
        'Quick turnaround time',
        'Multiple product categories'
      ],
      image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=2070',
      icon: '🏷️',
      color: '#363a94'
    }
  ];

  const process = [
    { step: 1, title: 'Consultation', description: 'Initial discussion about your brand vision and requirements' },
    { step: 2, title: 'Proposal', description: 'Detailed service plan tailored to your specific needs' },
    { step: 3, title: 'Development', description: 'Creation of formulations, packaging, or regulatory documentation' },
    { step: 4, title: 'Quality Assurance', description: 'Rigorous testing to ensure product excellence' },
    { step: 5, title: 'Delivery', description: 'Final product manufacturing and delivery to your specifications' }
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <header className="bg-[#363a94] py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=2070')] bg-cover bg-center bg-no-repeat"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto text-center text-white">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Comprehensive Beauty Solutions
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-100 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              End-to-end services to bring your beauty brand vision to life
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link 
                to="/schedule" 
                className="px-8 py-3 bg-white text-[#363a94] font-medium rounded-full hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300"
              >
                Schedule a Consultation
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Value Proposition */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-12">
            <div className="flex items-center">
              <span className="text-[#363a94] mr-2">✓</span>
              <p className="font-medium">Korean Quality Standards</p>
            </div>
            <div className="flex items-center">
              <span className="text-[#363a94] mr-2">✓</span>
              <p className="font-medium">FDA Compliant Products</p>
            </div>
            <div className="flex items-center">
              <span className="text-[#363a94] mr-2">✓</span>
              <p className="font-medium">Expert Consultation</p>
            </div>
            <div className="flex items-center">
              <span className="text-[#363a94] mr-2">✓</span>
              <p className="font-medium">End-to-End Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Our Services</h2>
              <div className="w-24 h-1 bg-[#363a94] mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Comprehensive solutions to help you create, register, and launch your beauty brand
              </p>
      </motion.div>
          </div>

          {/* Service Tabs */}
          <div className="flex flex-wrap justify-center mb-12 gap-4">
        {services.map((service, index) => (
              <motion.button
                key={service.id}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  activeService === index 
                    ? 'bg-[#363a94] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveService(index)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="mr-2">{service.icon}</span>
                {service.title}
              </motion.button>
            ))}
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Service Info */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8"
              key={activeService}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block p-3 rounded-lg bg-[#363a94]/10 text-[#363a94] text-2xl mb-4">
                {services[activeService].icon}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{services[activeService].headline}</h3>
              <p className="text-gray-600 mb-6">{services[activeService].description}</p>
              
              <h4 className="font-bold text-gray-900 mb-3">What We Offer:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {services[activeService].bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-[#363a94] mr-2 mt-1">•</span>
                    <span className="text-gray-700">{bullet}</span>
                  </li>
                ))}
              </ul>
              
              <Link 
                to={`/services/${services[activeService].id}`}
                className="inline-block px-6 py-3 bg-[#363a94] text-white font-medium rounded-lg hover:bg-[#2a2d7a] transition-colors"
              >
                Learn More About {services[activeService].title}
              </Link>
            </motion.div>
            
            {/* Service Image */}
            <motion.div
              className="rounded-xl overflow-hidden shadow-lg h-[400px]"
              key={`img-${activeService}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src={services[activeService].image} 
                alt={services[activeService].title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Our Process</h2>
              <div className="w-24 h-1 bg-[#363a94] mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                A streamlined approach to bringing your beauty brand to market
              </p>
            </motion.div>
          </div>
          
          <div className="relative">
            {/* Process Line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 transform -translate-x-1/2"></div>
            
            {/* Process Steps */}
            <div className="space-y-12 relative">
              {process.map((step, index) => (
                <motion.div 
                  key={step.step}
                  className={`flex flex-col md:flex-row gap-8 md:items-center ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="md:w-1/2 flex justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-lg relative">
                      {/* Step Number */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                      w-12 h-12 rounded-full bg-[#363a94] text-white flex items-center justify-center 
                                      font-bold text-xl shadow-lg z-10">
                        {step.step}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-4 text-center">{step.title}</h3>
                      <p className="text-gray-600 text-center">{step.description}</p>
                    </div>
            </div>
                  <div className="md:w-1/2"></div>
          </motion.div>
        ))}
      </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Why Choose BLCP</h2>
              <div className="w-24 h-1 bg-[#363a94] mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Partner with us for a seamless beauty brand development experience
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-16 h-16 bg-[#363a94]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#363a94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Korean Quality</h3>
              <p className="text-gray-600">World-class manufacturing standards and innovative formulations</p>
            </motion.div>
            
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-[#363a94]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#363a94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Full Support</h3>
              <p className="text-gray-600">End-to-end assistance from concept to market launch</p>
            </motion.div>
            
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 bg-[#363a94]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#363a94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Compliance</h3>
              <p className="text-gray-600">Complete FDA documentation and registration support</p>
            </motion.div>
            
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-16 h-16 bg-[#363a94]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#363a94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Flexibility</h3>
              <p className="text-gray-600">Customizable solutions to meet your specific needs</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#363a94] text-white">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Bring Your Beauty Brand to Life?
          </h2>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto mb-10">
            Let's discuss how our services can help you create exceptional products that stand out in the market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/schedule" 
              className="px-8 py-4 bg-white text-[#363a94] font-bold text-lg rounded-full hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300"
            >
              Schedule a Consultation
            </Link>
            <Link 
              to="/articles" 
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-lg rounded-full hover:bg-white/10 transition-all transform hover:-translate-y-1 duration-300"
            >
              Read Our Articles
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default ServicesIndex; 