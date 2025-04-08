import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../../styles/About.css';
import api from '../../api/client';
import { toast } from 'react-hot-toast';

const AboutIndex = () => {
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [error, setError] = useState(null);

  // Default content to use if API fails or returns no data
  const defaultContent = {
    title: 'About BLCP',
    sections: [
      {
        sectionId: 'hero',
        title: 'Elevate your brand and together, let\'s redefine beauty!',
        content: 'At BLCP, we provide you with greater flexibility to develop beauty products tailored to your brand\'s vision and identity. Stand out in the market by producing a diverse array of unique cosmetics that reflect your brand\'s values.'
      },
      {
        sectionId: 'whatWeDo',
        title: 'What We Do',
        content: 'BLCP bridges the gap between Korean cosmetic manufacturers and Filipino businesses. We\'re your one-stop solution for creating, importing, and rebranding beauty products.',
        items: [
          {
            title: 'OEM Manufacturing',
            description: 'Custom cosmetic manufacturing with Korean quality standards. We handle everything from formulation to packaging, allowing you to focus on your brand and marketing strategy.',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>'
          },
          {
            title: 'Korean Cosmetic Imports',
            description: 'Direct sourcing of premium Korean beauty products. We partner with leading Korean manufacturers to bring innovative formulations and cutting-edge beauty technology to the Philippine market.',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>'
          },
          {
            title: 'Rebranding Solutions',
            description: 'Transform existing products with your unique brand identity. Our rebranding services include custom packaging design, label creation, and marketing strategy consultation.',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>'
          }
        ]
      },
      {
        sectionId: 'companyHistory',
        title: 'Our Company History',
        subtitle: 'A journey of growth and transformation',
        content: 'BLCP began its journey as MK Beauty in May 2023. Through dedication to quality and customer service, we\'ve grown to become a trusted name in the cosmetic manufacturing industry.',
        items: [
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
        ]
      },
      {
        sectionId: 'manufacturer',
        title: 'Our Korean Manufacturer',
        subtitle: 'World-class facilities and expertise',
        content: 'Our partnership with leading Korean manufacturers gives you access to the latest innovations in K-beauty technology and formulations.',
        items: [
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
        ]
      }
    ]
  };

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        const response = await api.get('/content/about');
        if (response.data) {
          setPageContent(response.data);
        } else {
          setPageContent(defaultContent);
        }
      } catch (error) {
        console.error('Error fetching page content:', error);
        setError(error);
        setPageContent(defaultContent);
        toast.error('Failed to load page content. Using default content instead.');
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  // Use default content if loading or error
  const content = pageContent || defaultContent;

  // Find specific sections by ID
  const getSection = (sectionId) => {
    return content.sections.find(section => section.sectionId === sectionId);
  };

  // Function to safely render HTML from string
  const renderHTML = (htmlString) => {
    return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
  };

  const heroSection = getSection('hero');
  const whatWeDoSection = getSection('whatWeDo');
  const companyHistorySection = getSection('companyHistory');
  const manufacturerSection = getSection('manufacturer');

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-l-2 border-[#363a94] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{content.title} | BLCP</title>
        <meta name="description" content="Learn about BLCP, your partner in custom Korean cosmetics manufacturing and skincare solutions." />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Hero Section - Minimalist */}
        <section className="pt-32 pb-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-6 tracking-tight">
                  {content.title}
                </h1>
                
                {heroSection && (
                  <>
                    <div className="w-16 h-[1px] bg-[#363a94] mb-8"></div>
                    <h2 className="text-2xl md:text-3xl font-light text-gray-700 mb-8 leading-snug">
                      {heroSection.title}
                    </h2>
                    <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                      {heroSection.content}
                    </p>
                    
                    <div className="mt-12">
                      <Link 
                        to="/contact" 
                        className="inline-block py-3 px-8 border border-[#363a94] text-[#363a94] font-light hover:bg-[#363a94] hover:text-white transition-colors duration-300"
                      >
                        Contact
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* What We Do Section - Minimalist Grid */}
        {whatWeDoSection && (
          <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-6 md:px-12">
              <div className="max-w-5xl mx-auto">
                <div className="mb-20">
                  <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
                    {whatWeDoSection.title}
                  </h2>
                  <div className="w-16 h-[1px] bg-[#363a94] mb-8"></div>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    {whatWeDoSection.content}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {whatWeDoSection.items && whatWeDoSection.items.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      <h3 className="text-xl font-medium text-gray-900 mb-3">{service.title}</h3>
                      <p className="text-gray-600">
                        {service.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Company History Section - Minimalist Timeline */}
        {companyHistorySection && (
          <section className="py-24 bg-white">
            <div className="container mx-auto px-6 md:px-12">
              <div className="max-w-5xl mx-auto">
                <div className="mb-20">
                  <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
                    {companyHistorySection.title}
                  </h2>
                  <div className="w-16 h-[1px] bg-[#363a94] mb-8"></div>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    {companyHistorySection.subtitle}
                  </p>
                  <p className="text-lg text-gray-600 max-w-2xl mt-4">
                    {companyHistorySection.content}
                  </p>
                </div>
                
                <div className="space-y-16">
                  {companyHistorySection.items && companyHistorySection.items.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      className="flex flex-col md:flex-row"
                    >
                      <div className="md:w-1/4 mb-4 md:mb-0">
                        <span className="text-4xl font-light text-[#363a94]">{item.year}</span>
                      </div>
                      <div className="md:w-3/4 md:pl-12 md:border-l border-gray-200">
                        <h3 className="text-xl font-medium text-gray-900 mb-3">{item.title}</h3>
                        <p className="text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Manufacturer Section - Minimalist Grid */}
        {manufacturerSection && (
          <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-6 md:px-12">
              <div className="max-w-5xl mx-auto">
                <div className="mb-20">
                  <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
                    {manufacturerSection.title}
                  </h2>
                  <div className="w-16 h-[1px] bg-[#363a94] mb-8"></div>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    {manufacturerSection.subtitle}
                  </p>
                  <p className="text-lg text-gray-600 max-w-2xl mt-4">
                    {manufacturerSection.content}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {manufacturerSection.items && manufacturerSection.items.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="flex"
                    >
                      <div className="mr-6 flex-shrink-0">
                        <div className="w-10 h-10 border border-[#363a94] flex items-center justify-center text-[#363a94] font-light">
                          {index + 1}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* CTA Section - Minimalist */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="container mx-auto px-6 md:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">Ready to Transform Your Brand?</h2>
              <p className="text-lg text-gray-600 mb-12">
                Let's collaborate to create beauty products that truly represent your brand's unique identity.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link 
                  to="/contact" 
                  className="inline-block py-3 px-8 bg-[#363a94] text-white font-light hover:bg-[#282d7a] transition-colors duration-300 w-full sm:w-auto"
                >
                  Contact Us
                </Link>
                <Link 
                  to="/schedule" 
                  className="inline-block py-3 px-8 border border-gray-300 text-gray-700 font-light hover:border-[#363a94] hover:text-[#363a94] transition-colors duration-300 w-full sm:w-auto"
                >
                  Schedule a Call
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutIndex; 