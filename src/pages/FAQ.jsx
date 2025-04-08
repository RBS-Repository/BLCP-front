import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import '../styles/FAQ.css';
import { FiSearch, FiChevronRight, FiMail, FiCalendar, FiPlus, FiMinus, FiChevronDown, FiHelpCircle } from 'react-icons/fi';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [faqContent, setFaqContent] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const faqRef = useRef(null);

  useEffect(() => {
    const fetchFaqContent = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/faq`);
        
        // Only set the FAQ content if the API returns valid data
        if (response.data && response.data.categories && response.data.categories.length > 0) {
          // Add default icons if not provided by API
          const categoriesWithIcons = response.data.categories.map((category, index) => ({
            ...category,
            icon: category.icon || '❓'
          }));
          setFaqContent({ ...response.data, categories: categoriesWithIcons });
        } else {
          console.log('API returned empty content');
          setFaqContent({ categories: [] });
        }
      } catch (error) {
        console.error('Error fetching FAQ content:', error);
        setFaqContent({ categories: [] });
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
      <div className="faq-page min-h-screen pt-24 pb-16 flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#363a94]"></div>
      </div>
    );
  }

  return (
    <div className="faq-page bg-gradient-to-b from-gray-50 to-white min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" ref={faqRef}>
      {/* Header with Wave Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-r from-[#262977] to-[#4a4ecc] overflow-hidden -z-10">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" fill="none">
            <pattern id="header-dots" width="25" height="25" patternUnits="userSpaceOnUse">
              <circle cx="12.5" cy="12.5" r="1.5" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#header-dots)" />
          </svg>
        </div>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0L48 8.3C96 17 192 33 288 53.3C384 74 480 98 576 98.3C672 99 768 75 864 61.7C960 48 1056 44 1152 49.3C1248 55 1344 69 1392 76.7L1440 84V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V0Z" fill="white"/>
        </svg>
      </div>

      <div className="container max-w-6xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-6">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30">
              <FiHelpCircle className="w-10 h-10 text-[#363a94]" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-5 drop-shadow-lg tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-black font-medium max-w-2xl mx-auto text-lg drop-shadow-md bg-[#363a94]/20 backdrop-blur-sm py-2 px-4 rounded-full inline-block">
            Find answers to common questions about our products and services
          </p>
        </motion.div>
        
        {faqContent.categories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center">
                <FiHelpCircle className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">No FAQs Available</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              We're currently updating our FAQ section. Please check back later or contact our support team for any questions.
            </p>
            <a 
              href="/contact" 
              className="inline-flex items-center px-6 py-3 bg-[#363a94] text-white rounded-lg hover:bg-[#2a2e74] transition-colors shadow-md"
            >
              <FiMail className="mr-2" />
              Contact Support
            </a>
          </motion.div>
        ) : (
          <>
            {/* Search Bar - Elevated Card */}
            <motion.div 
              className="relative mx-auto max-w-2xl mb-12 -mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    placeholder="Search questions or keywords..."
                    className="w-full py-4 pl-12 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#363a94] focus:ring-2 focus:ring-[#363a94]/20 transition-all text-gray-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {isSearching ? (
              <motion.div 
                className="search-results mb-12 bg-white rounded-xl shadow-md p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="bg-[#363a94]/10 text-[#363a94] w-8 h-8 rounded-full flex items-center justify-center mr-2">
                    {searchResults.length}
                  </span>
                  <span>Results for "{searchQuery}"</span>
                </h2>
                
                <div className="space-y-5">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <div className="text-5xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold mb-2">No results found</h3>
                      <p className="text-gray-600 mb-6">Try using different keywords or check out our categories below.</p>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="px-5 py-2.5 bg-[#363a94] text-white rounded-lg hover:bg-[#2a2d7a] transition-colors shadow-sm"
                      >
                        Browse All FAQs
                      </button>
                    </div>
                  ) : (
                    searchResults.map((result, index) => (
                      <motion.div 
                        key={index} 
                        className="bg-white rounded-lg p-5 border border-gray-100 hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#363a94]/10 text-[#363a94] mb-2">
                          {result.category}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                          {highlightText(result.question, searchQuery)}
                        </h3>
                        <p className="text-gray-600">
                          {highlightText(result.answer, searchQuery)}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <>
                {/* Category Navigation - Card Style */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-8">
                  <div className="overflow-x-auto hide-scrollbar">
                    <div className="flex flex-nowrap space-x-2 md:space-x-4 p-1">
                      {faqContent.categories.map((category, index) => (
                        <button
                          key={index}
                          className={`flex items-center px-4 py-3 rounded-lg whitespace-nowrap transition-all ${
                            activeCategory === index 
                              ? 'bg-[#363a94] text-white font-medium shadow-sm translate-y-[-2px]' 
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-[#363a94]'
                          }`}
                          onClick={() => scrollToCategory(index)}
                        >
                          <span className="mr-2 text-lg">{category.icon}</span>
                          <span>{category.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FAQ Content - With Modern Cards */}
                <div className="faq-content space-y-12">
                  {faqContent.categories.map((category, categoryIndex) => (
                    <motion.div 
                      key={category.title} 
                      id={`category-${categoryIndex}`}
                      className="faq-category bg-white rounded-xl shadow-md p-6 md:p-8 scroll-mt-24"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div className="category-header flex items-center mb-8 border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#363a94] to-[#5a5fd6] text-white shadow-sm mr-4 text-2xl">
                          {category.icon}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#363a94] to-[#5a5fd6]">
                          {category.title}
                        </h2>
                      </div>
                      
                      <div className="questions-list space-y-4">
                        {category.questions.map((item, questionIndex) => (
                          <motion.div
                            key={questionIndex}
                            className={`faq-item rounded-lg border ${
                              activeIndex === `${categoryIndex}-${questionIndex}`
                                ? 'border-[#363a94]/30 bg-[#363a94]/5 shadow-sm'
                                : 'border-gray-200 hover:border-[#363a94]/20 hover:bg-gray-50'
                            } transition-all duration-200`}
                            initial={false}
                          >
                            <button
                              className={`faq-question w-full text-left py-5 px-6 flex justify-between items-center transition-colors duration-200 ${
                                activeIndex === `${categoryIndex}-${questionIndex}` 
                                  ? 'text-[#363a94] font-semibold' 
                                  : 'text-gray-800'
                              }`}
                              onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                              aria-expanded={activeIndex === `${categoryIndex}-${questionIndex}`}
                            >
                              <span className="pr-10 text-lg">{item.q}</span>
                              <span className={`flex-shrink-0 transition-transform duration-300 ${
                                activeIndex === `${categoryIndex}-${questionIndex}` ? 'rotate-180' : ''
                              }`}>
                                <FiChevronDown className={
                                  activeIndex === `${categoryIndex}-${questionIndex}` 
                                    ? 'text-[#363a94]' 
                                    : 'text-gray-400'
                                } size={20} />
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
                                  <div className="pt-2 border-t border-gray-200">
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

            {/* Contact Section - Redesigned */}
            <motion.div 
              className="mt-16 relative overflow-hidden bg-gradient-to-br from-[#363a94] to-[#4a4fbf] rounded-2xl shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, amount: 0.5 }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" fill="none">
                  <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="2" fill="white" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#dots)" />
                </svg>
              </div>
              
              <div className="relative p-8 md:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-6">
                  <FiMail className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Still have questions?</h2>
                <p className="text-white mb-8 max-w-2xl mx-auto text-lg">
                  Our support team is ready to help you. Contact us directly or schedule a call to get the answers you need.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="mailto:help@yourdomain.com" 
                    className="email-button bg-white text-[#363a94] hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center shadow-md"
                  >
                    <FiMail className="mr-2" />
                    Contact Support
                  </a>
                  <a 
                    href="/contact" 
                    className="schedule-button bg-[#363a94]/20 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <FiCalendar className="mr-2" />
                    Schedule a Call
                  </a>
                </div>
              </div>
            </motion.div>

            {/* FAQ Stats - Card Layout */}
            <div className="mt-12 bg-white rounded-xl shadow-md p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
             
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg text-center hover:shadow-sm transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="mb-2 text-xl">{stat.icon}</div>
                    <div className="text-2xl font-bold text-[#363a94] mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FAQ; 