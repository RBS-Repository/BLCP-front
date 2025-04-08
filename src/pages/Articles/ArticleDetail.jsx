import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const contentRef = useRef(null);
  
  // Fetch article on component mount
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        
        // Replace axios with api client
        const response = await api.get(`/articles/${id}`);
        setArticle(response.data);
        
        // Set page title
        document.title = `${response.data.title} | BLCP Articles`;
        
        /* 
        // Related articles endpoint not yet implemented on backend
        // Uncomment when backend supports this endpoint
        try {
          const relatedResponse = await api.get(`/articles/related/${id}`);
          setRelatedArticles(relatedResponse.data.slice(0, 3));
        } catch (relatedError) {
          console.warn('Could not load related articles:', relatedError);
          setRelatedArticles([]);
        }
        */
        
        // For now, just set empty related articles to avoid API calls
        setRelatedArticles([]);
        
      } catch (error) {
        console.error('Error fetching article:', error);
        const errorMessage = error.response?.status === 404 
          ? 'Article not found' 
          : 'Failed to load article. Please try again later.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
    
    // Scroll to top when article page loads
    window.scrollTo(0, 0);
  }, [id]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner size="large" color="indigo" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-white py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Article Not Found</h1>
        <p className="text-gray-500 mb-8 text-center max-w-md">{error}</p>
        <button 
          onClick={() => navigate('/articles')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium shadow-lg hover:bg-indigo-700 transition duration-300"
        >
          Back to Articles
        </button>
      </div>
    );
  }
  
  if (!article) return null;
  
  // Format the date
  const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
  
  // Format category
  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Use full URL when sharing articles - changed to use frontend domain
  const shareUrl = `${window.location.origin}/articles/${article._id}`;

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to Articles Link */}
          <Link 
            to="/articles" 
            className="inline-flex items-center mb-8 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Articles
          </Link>
          
          {/* Category Badge */}
      <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 mb-4">
              {formatCategory(article.category)}
            </span>
          </motion.div>
          
          {/* Article Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
          >
            {article.title}
          </motion.h1>
          
          {/* Article Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center text-gray-500 mb-8"
          >
            <div className="flex items-center mr-8 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                <span className="text-indigo-700 font-medium">{article.author ? article.author.charAt(0) : 'B'}</span>
              </div>
              <span>{article.author || 'BLCP Team'}</span>
            </div>
            
            <div className="flex items-center mr-8 mb-2">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDate}</span>
          </div>
            
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{article.readTime}</span>
        </div>
      </motion.div>

          {/* Article Excerpt */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl"
          >
            {article.excerpt}
          </motion.p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Article Content */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-8"
          >
            {/* Featured Image */}
            <div className="rounded-2xl overflow-hidden shadow-lg mb-10">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-auto max-h-[500px] object-cover"
                onError={(e) => {e.target.src = 'https://via.placeholder.com/1200x600?text=No+Image'}}
              />
            </div>
            
            {/* Article Content */}
            <div 
              ref={contentRef}
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:text-indigo-500 prose-img:rounded-xl prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

            {/* Share Article */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Share this article:</h3>
              <div className="flex space-x-3">
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-block"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <button className="p-3 rounded-full bg-blue-400 text-white hover:bg-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.035 10.035 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
                <button className="p-3 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Author Box */}
            <div className="mt-12 p-6 bg-indigo-50 rounded-2xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-indigo-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-700">{article.author ? article.author.charAt(0) : 'B'}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">{article.author || 'BLCP Team'}</h3>
                  <p className="text-gray-600">Passionate about skincare, beauty, and helping people feel confident in their own skin. Follow for more articles on skincare tips and industry insights.</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-4 mt-12 lg:mt-0"
          >
            {/* Related Articles */}
            {relatedArticles.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-8 mb-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Related Articles</h3>
                <div className="space-y-6">
                  {relatedArticles.map(related => (
                    <Link 
                      key={related._id} 
                      to={`/articles/${related._id}`}
                      className="group block"
                    >
                      <div className="flex items-start">
                        <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden mr-4">
                          <img
                            src={related.image}
                            alt={related.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-300"
                            onError={(e) => {e.target.src = 'https://via.placeholder.com/80x80?text=Image'}}
                          />
                        </div>
                        <div>
                          <h4 className="text-gray-900 font-medium group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {related.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(related.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Categories */}
            <div className="bg-white rounded-2xl shadow-md p-8 mb-10">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Categories</h3>
              <div className="space-y-2">
                {['skincare', 'manufacturing', 'compliance', 'industry', 'trends'].map(category => (
                  <Link 
                    key={category}
                    to={`/articles?category=${category}`}
                    className={`block px-4 py-2 rounded-lg transition-colors ${
                      article.category === category 
                        ? 'bg-indigo-100 text-indigo-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* More Articles */}
      {relatedArticles.length > 0 ? (
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">More Articles You Might Like</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedArticles.map(related => (
                <motion.div
                  key={related._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Link to={`/articles/${related._id}`} className="block h-full">
                    <div className="bg-white rounded-xl overflow-hidden shadow-md h-full flex flex-col">
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={related.image}
                          alt={related.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {e.target.src = 'https://via.placeholder.com/400x200?text=No+Image'}}
                        />
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs text-gray-500 mb-3">
                          <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full mr-2">
                            {formatCategory(related.category)}
                          </span>
                          <span>{new Date(related.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 flex-grow">{related.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{related.excerpt}</p>
                        <span className="text-indigo-600 font-medium inline-flex items-center">
                          Read More
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ArticleDetail; 