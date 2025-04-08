import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import '../styles/FAQ.css';
import { FiSearch, FiChevronRight, FiMail, FiCalendar, FiPlus, FiMinus } from 'react-icons/fi';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [faqContent, setFaqContent] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const faqRef = useRef(null);

  // Default FAQ data to use when API fails
  const defaultFaqData = {
    categories: [
      {
        title: 'Manufacturing Process',
        icon: '🏭',
        questions: [
          {
            q: 'What is your minimum order quantity (MOQ)?',
            a: 'Our standard MOQ varies by product type, typically starting at 500-1000 units per SKU. We can discuss flexible options for startups and small businesses.'
          },
          {
            q: 'How long does the manufacturing process take?',
            a: 'The typical timeline from order confirmation to delivery is 8-12 weeks, depending on the product complexity and quantity. This includes formulation, testing, production, and packaging.'
          },
          {
            q: 'Do you provide samples before full production?',
            a: 'Yes, we provide pre-production samples for approval. This ensures the final product meets your expectations in terms of formulation, packaging, and quality.'
          }
        ]
      },
      {
        title: 'Product Development',
        icon: '⚗️',
        questions: [
          {
            q: 'Can you help with custom formulations?',
            a: 'Yes, our R&D team can develop custom formulations based on your requirements, including natural, organic, and innovative ingredients.'
          },
          {
            q: 'What types of products can you manufacture?',
            a: 'We specialize in skincare, haircare, and body care products, including cleansers, serums, creams, masks, shampoos, and more.'
          },
          {
            q: 'Do you offer packaging design services?',
            a: 'Yes, our design team can help with packaging design, label design, and sourcing appropriate packaging materials.'
          }
        ]
      },
      {
        title: 'Quality & Compliance',
        icon: '✅',
        questions: [
          {
            q: 'What quality certifications do you have?',
            a: 'We are FDA-registered and follow GMP (Good Manufacturing Practice) guidelines. We also have ISO 9001 certification.'
          },
          {
            q: 'Do you conduct safety testing?',
            a: 'Yes, all products undergo stability testing, preservative efficacy testing, and safety assessments before release.'
          },
          {
            q: 'Are your products cruelty-free?',
            a: 'Yes, we do not conduct animal testing on any of our products or ingredients.'
          }
        ]
      },
      {
        title: 'Pricing & Payment',
        icon: '💰',
        questions: [
          {
            q: 'How is pricing determined?',
            a: 'Pricing depends on factors including formulation complexity, ingredients, packaging, quantity, and any additional services required.'
          },
          {
            q: 'What are your payment terms?',
            a: 'We typically require a 50% deposit to begin production, with the remaining balance due before shipment.'
          },
          {
            q: 'Do you offer payment plans?',
            a: 'We can discuss flexible payment options for larger orders or long-term partnerships.'
          }
        ]
      }
    ]
  };

  useEffect(() => {
    const fetchFaqContent = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/faq`);
        if (response.data && response.data.categories && response.data.categories.length > 0) {
          // Add default icons if not provided by API
          const categoriesWithIcons = response.data.categories.map((category, index) => ({
            ...category,
            icon: category.icon || defaultFaqData.categories[index % defaultFaqData.categories.length].icon || '❓'
          }));
          setFaqContent({ ...response.data, categories: categoriesWithIcons });
        } else {
          console.log('API returned empty content, using default data');
          setFaqContent(defaultFaqData);
        }
      } catch (error) {
        console.error('Error fetching FAQ content:', error);
        console.log('Using default FAQ data due to API error');
        setFaqContent(defaultFaqData);
      } finally {
        setLoading(false);
      }
    };

    fetchFaqContent();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const results = [];
      
      faqContent.categories.forEach(category => {
        category.questions.forEach(item => {
          if (
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            results.push({
              category: category.title,
              question: item.q,
              answer: item.a
            });
          }
        });
      });
      
      setSearchResults(results);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, faqContent]);

  const toggleQuestion = (categoryIndex, questionIndex) => {
    const newIndex = activeIndex === `${categoryIndex}-${questionIndex}` 
      ? null 
      : `${categoryIndex}-${questionIndex}`;
    setActiveIndex(newIndex);
  };

  const scrollToCategory = (index) => {
    setActiveCategory(index);
    const element = document.getElementById(`category-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className="bg-yellow-200 text-black px-1 rounded">{part}</span> 
        : part
    );
  };

  if (loading) {
    return (
      <div className="faq-page bg-gradient-to-b from-white to-blue-50 min-h-screen py-16 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#363a94]"></div>
      </div>
    );
  }

  return (
    <div className="faq-page bg-gradient-to-b from-white to-blue-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8" ref={faqRef}>
      <motion.div 
        className="faq-container max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#363a94] to-[#6066d8] mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p 
            className="text-gray-600 max-w-2xl mx-auto text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
          Find answers to common questions about our manufacturing services and processes.
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div 
          className="search-container mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search questions or keywords..."
              className="w-full py-4 pl-12 pr-4 border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#363a94] transition-colors text-gray-700 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </motion.div>

        {isSearching ? (
          <div className="search-results mb-10">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {searchResults.length} results for "{searchQuery}"
            </h2>
            <div className="space-y-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-gray-600">Try using different keywords or check out our categories below.</p>
                </div>
              ) : (
                searchResults.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="text-sm text-blue-600 mb-1">{result.category}</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {highlightText(result.question, searchQuery)}
                    </h3>
                    <p className="text-gray-600">
                      {highlightText(result.answer, searchQuery)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Category Navigation */}
            <div className="category-nav mb-8 overflow-x-auto pb-2 hide-scrollbar">
              <div className="flex space-x-2 md:justify-center">
                {faqContent.categories.map((category, index) => (
                  <button
                    key={index}
                    className={`flex items-center px-4 py-2.5 rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === index 
                        ? 'bg-[#363a94] text-white font-medium shadow-md' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => scrollToCategory(index)}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.title}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Content */}
        <div className="faq-content">
          {faqContent.categories.map((category, categoryIndex) => (
                <motion.div 
                  key={category.title} 
                  id={`category-${categoryIndex}`}
                  className="faq-category mb-12 scroll-mt-24"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 * categoryIndex }}
                >
                  <div className="category-header flex items-center mb-6">
                    <span className="category-icon flex items-center justify-center w-10 h-10 rounded-full bg-[#363a94] text-white mr-3 text-xl">
                      {category.icon}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800">{category.title}</h2>
                  </div>
                  
              <div className="questions-list space-y-4">
                {category.questions.map((item, questionIndex) => (
                  <motion.div
                    key={questionIndex}
                        className="faq-item bg-white rounded-lg shadow-sm border border-gray-100"
                    initial={false}
                        whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}
                        transition={{ duration: 0.2 }}
                  >
                    <button
                          className={`faq-question w-full text-left py-5 px-6 flex justify-between items-center ${
                        activeIndex === `${categoryIndex}-${questionIndex}` 
                          ? 'text-[#363a94] font-semibold' 
                          : 'text-gray-700'
                      } hover:text-[#363a94] transition-colors duration-200`}
                      onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          aria-expanded={activeIndex === `${categoryIndex}-${questionIndex}`}
                        >
                          <span className="pr-8">{item.q}</span>
                          <span className="flex-shrink-0">
                            {activeIndex === `${categoryIndex}-${questionIndex}` 
                              ? <FiMinus className="text-[#363a94]" /> 
                              : <FiPlus className="text-gray-400" />
                            }
                      </span>
                    </button>
                    <AnimatePresence>
                      {activeIndex === `${categoryIndex}-${questionIndex}` && (
                        <motion.div
                              className="faq-answer px-6 pb-5 text-gray-600"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                              <div className="pt-2 border-t border-gray-100">
                                <p className="leading-relaxed">{item.a}</p>
                              </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Contact Section */}
        <motion.div 
          className="faq-contact mt-16 bg-gradient-to-br from-[#363a94] to-[#4a4fbf] p-8 rounded-2xl text-center text-white shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Our team is here to help. Reach out through email or schedule a personal consultation for detailed answers to your specific questions.
          </p>
          <div className="contact-actions flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@blcp.com" 
              className="email-button bg-white text-[#363a94] hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <FiMail className="mr-2" />
              Email Support
            </a>
            <a 
              href="/schedule" 
              className="schedule-button bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#363a94] px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <FiCalendar className="mr-2" />
              Schedule Consultation
            </a>
          </div>
        </motion.div>

        {/* FAQ Stats */}
        <div className="faq-stats grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 text-center">
          {[
            { label: 'Categories', value: faqContent.categories.length },
            { label: 'Questions', value: faqContent.categories.reduce((acc, cat) => acc + cat.questions.length, 0) },
            { label: 'Clients Satisfied', value: '500+' },
            { label: 'Years of Experience', value: '15+' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="stat-item bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              viewport={{ once: true, amount: 0.5 }}
            >
              <div className="text-2xl font-bold text-[#363a94]">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FAQ; 