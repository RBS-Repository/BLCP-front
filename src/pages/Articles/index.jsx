import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const ArticlesIndex = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArticles, setExpandedArticles] = useState({});
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category) {
      setActiveCategory(category.toLowerCase());
    } else {
      setActiveCategory('all');
    }
  }, [location]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        
        const response = await api.get('/articles', {
          params: { 
            category: activeCategory !== 'all' ? activeCategory : undefined,
            search: searchQuery || undefined
          }
        });
        
        setArticles(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching articles:', error);
        toast.error('Failed to load articles');
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [activeCategory, searchQuery]);

  const categories = [
    { id: 'all', name: 'All Articles' },
    { id: 'skincare', name: 'Skincare' },
    { id: 'manufacturing', name: 'Manufacturing' },
    { id: 'compliance', name: 'Compliance' },
    { id: 'business', name: 'Business' }
  ];
  
  const filteredArticles = articles.filter(article => {
    // Category filter
    if (activeCategory !== 'all' && article.category !== activeCategory) {
      return false;
    }
    
    // Search filter
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const toggleArticleExpansion = (articleId) => {
    setExpandedArticles({
      ...expandedArticles,
      [articleId]: !expandedArticles[articleId]
    });
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    
    try {
      await api.post('/newsletter/subscribe', { email: newsletterEmail });
      toast.success('Thank you for subscribing!');
      setNewsletterEmail('');
    } catch (error) {
      console.error('Newsletter subscribe error:', error);
      toast.error('Failed to subscribe. Please try again.');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-900 to-blue-900 rounded-xl shadow-xl overflow-hidden mb-16 mx-auto max-w-7xl">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative px-6 py-16 sm:px-12 sm:py-24 lg:py-32 lg:px-16 flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Beauty & Business Insights
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-indigo-100">
            Expert guides, industry tips, and practical advice for beauty entrepreneurs and enthusiasts.
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="lg:flex lg:space-x-8">
          {/* Main Content */}
          <div className="lg:w-2/3">
            {/* Category Navigation */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category.id
                    ? 'bg-[#363a94] text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* Articles Grid */}
            <div className="space-y-8">
              {loading ? (
                <div className="flex justify-center py-12">
                  {/* Add your loading spinner here */}
                  <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                filteredArticles.map((article) => (
      <motion.div 
                    key={article._id || article.id}
                    layoutId={`article-${article._id || article.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`bg-white rounded-xl shadow-sm overflow-hidden border ${article.featured ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'}`}
                  >
                    <div className="md:flex">
                      {/* Article Image */}
                      <div className="md:w-1/3 h-64 md:h-auto">
                        <img 
                          src={article.image} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Article Content */}
                      <div className="p-6 md:w-2/3 flex flex-col">
                        <div className="flex items-center text-sm mb-2">
                          <span className="text-[#363a94] font-medium capitalize">{article.category}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-500">{article.date}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-500">{article.readTime}</span>
                        </div>
                        
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{article.title}</h2>
                        
                        <p className="text-gray-600 mb-4 flex-grow">{article.excerpt}</p>
                        
                        <Link
                          to={`/articles/${article._id || article.id}`}
                          className="text-[#363a94] font-medium hover:text-[#292e7a] transition-colors flex items-center self-start"
                        >
                          Read Article
                          <svg 
                            className="ml-1 w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
        </div>
      </motion.div>
                ))
              )}
              
              {!loading && filteredArticles.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No articles available</h3>
                  <p className="text-gray-500 mb-4">We couldn't find any articles that match your current filters.</p>
                  {activeCategory !== 'all' || searchQuery ? (
                    <button 
                      onClick={() => {
                        setActiveCategory('all');
                        setSearchQuery('');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear filters
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">New articles will be added soon!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 mt-10 lg:mt-0">
            <div className="lg:sticky lg:top-24 space-y-8">
              {/* Search Box */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Search Articles</h3>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <input 
                    type="text" 
                    placeholder="Search for articles..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 focus:outline-none text-gray-700"
                  />
                  <button className="bg-[#363a94] text-white p-2 hover:bg-[#2a2d7a] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Categories Box */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <ul className="space-y-2">
                  {categories.filter(cat => cat.id !== 'all').map((category) => (
                    <li key={category.id}>
                      <button 
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex items-center justify-between w-full p-2 rounded hover:bg-gray-100 transition-colors ${
                          activeCategory === category.id ? 'text-[#363a94] font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span>{category.name}</span>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {articles.filter(article => article.category === category.id).length}
                        </span>
                      </button>
                    </li>
                  ))}
            </ul>
          </div>

              {/* Popular Posts */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Articles</h3>
                {articles.length > 0 ? (
                  <div className="space-y-4">
                    {articles.slice(0, 3).map((article) => (
                      <Link 
                        key={article._id || article.id} 
                        to={`/articles/${article._id || article.id}`}
                        className="flex items-start space-x-3 group w-full text-left"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={article.image} 
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-[#363a94] transition-colors line-clamp-2">
                            {article.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{article.date}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No articles available yet</p>
                  </div>
                )}
              </div>

              {/* Newsletter Signup */}
              <div className="bg-gradient-to-br from-[#363a94] to-[#2a2d7a] rounded-xl shadow-md p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Subscribe to Our Newsletter</h3>
                <p className="text-sm text-gray-100 mb-4">Get the latest articles and industry updates straight to your inbox.</p>
                <form className="space-y-3" onSubmit={handleNewsletterSubmit}>
                  <input 
                    type="email" 
                    placeholder="Your email address" 
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
                    required
                  />
                  <button 
                    type="submit"
                    className="w-full bg-white text-[#363a94] font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlesIndex; 