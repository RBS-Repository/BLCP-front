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
  
  const displayArticles = articles.length > 0 ? articles : [
    {
      id: 1,
      title: 'Understanding Korean Skincare Ingredients',
      excerpt: 'A comprehensive guide to popular Korean skincare ingredients and their benefits for different skin types. Learn about innovative ingredients that make K-beauty unique.',
      category: 'skincare',
      date: 'March 15, 2024',
      readTime: '8 min read',
      image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=2070',
      featured: true,
      content: `
        <p>Korean skincare has gained worldwide popularity for its innovative ingredients and effective formulations. This guide explores the most popular ingredients found in K-beauty products and their benefits for various skin concerns.</p>
        
        <h3>Snail Mucin</h3>
        <p>Snail mucin is a powerhouse ingredient known for its ability to repair damaged skin, improve hydration, and promote collagen production. Rich in hyaluronic acid, glycoproteins, and antimicrobial peptides, it helps soothe irritation while providing intense moisture.</p>
        
        <h3>Centella Asiatica (Cica)</h3>
        <p>This ancient medicinal herb contains madecassoside, which calms inflammation and strengthens the skin barrier. Ideal for sensitive and acne-prone skin, Centella Asiatica promotes wound healing and reduces redness.</p>
        
        <h3>Galactomyces Ferment Filtrate</h3>
        <p>A byproduct of fermented sake, this ingredient is packed with vitamins, amino acids, and minerals that brighten skin tone, minimize pores, and improve texture. It's often found in Korean first treatment essences.</p>
        
        <h3>Propolis</h3>
        <p>Collected by bees, propolis has antibacterial and antifungal properties that make it excellent for acne-prone skin. It also provides antioxidant protection and supports the skin's natural healing process.</p>
        
        <h3>Conclusion</h3>
        <p>The effectiveness of Korean skincare ingredients comes from both innovative science and time-tested natural remedies. When incorporating these ingredients into your routine, remember to introduce them gradually and pay attention to how your skin responds.</p>
      `
    },
    {
      id: 2,
      title: 'The FDA Registration Process Explained',
      excerpt: 'Step-by-step guide to registering your cosmetic products with the Philippine FDA. Navigate the regulatory landscape with confidence.',
      category: 'compliance',
      date: 'March 10, 2024',
      readTime: '10 min read',
      image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=2070',
      content: `
        <p>Navigating the FDA registration process for cosmetic products in the Philippines can be complex but is essential for legally marketing your beauty products.</p>
        
        <h3>Step 1: Determine Your Product Classification</h3>
        <p>Before beginning the registration process, determine whether your product is classified as a cosmetic, drug, or combination product, as this affects the registration requirements.</p>
        
        <h3>Step 2: Prepare Required Documents</h3>
        <p>Gather necessary documentation including:</p>
        <ul>
          <li>Product information file (PIF)</li>
          <li>Certificate of Analysis</li>
          <li>Good Manufacturing Practice (GMP) Certificate</li>
          <li>Product specifications and formula</li>
          <li>Packaging artwork and labels</li>
        </ul>
        
        <h3>Step 3: Submit Your Application</h3>
        <p>File your application through the FDA Electronic Portal. Pay the required fees and track your application status through the portal.</p>
        
        <h3>Step 4: Respond to FDA Queries</h3>
        <p>Be prepared to respond promptly to any FDA queries or requests for additional information about your product.</p>
        
        <h3>Step 5: Receive Your Certificate of Product Notification</h3>
        <p>Upon approval, you'll receive a Certificate of Product Notification (CPN) valid for 2-5 years depending on the product category.</p>
        
        <h3>Conclusion</h3>
        <p>While the FDA registration process requires careful attention to detail, working with experienced regulatory consultants can streamline the process and help ensure compliance with all requirements.</p>
      `
    },
    {
      id: 3,
      title: 'Private Label vs OEM Manufacturing',
      excerpt: 'Understanding the differences between private label and OEM manufacturing to choose the right option for your beauty brand.',
      category: 'manufacturing',
      date: 'March 5, 2024',
      readTime: '7 min read',
      image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=2008',
      content: `
        <p>When launching a beauty brand, one of the most important decisions is choosing between private label and OEM manufacturing. Understanding the key differences will help you make the right choice for your business goals and budget.</p>
        
        <h3>What is Private Label Manufacturing?</h3>
        <p>Private label manufacturing involves selecting ready-made formulations from a manufacturer's catalog and applying your brand name and packaging. The formulations are typically standardized with limited customization options.</p>
        
        <h3>Benefits of Private Label</h3>
        <ul>
          <li>Lower minimum order quantities (typically 250-500 units)</li>
          <li>Faster time to market (usually 4-8 weeks)</li>
          <li>Lower upfront costs and reduced development expenses</li>
          <li>Perfect for startups and smaller brands</li>
        </ul>
        
        <h3>What is OEM (Original Equipment Manufacturing)?</h3>
        <p>OEM manufacturing involves developing custom formulations specifically for your brand. You have control over ingredients, textures, scents, and performance characteristics.</p>
        
        <h3>Benefits of OEM</h3>
        <ul>
          <li>Completely unique formulations tailored to your brand vision</li>
          <li>Exclusive product offerings that can't be replicated</li>
          <li>Greater control over ingredients and product performance</li>
          <li>Better suited for established brands seeking differentiation</li>
        </ul>
        
        <h3>Which Option Is Right For You?</h3>
        <p>Choose private label if you're just starting out, have budget constraints, or need to launch quickly. Opt for OEM if product uniqueness is essential to your brand strategy and you can accommodate higher MOQs and longer development timelines.</p>
      `
    },
    {
      id: 4,
      title: 'Clean Beauty: Beyond the Buzzword',
      excerpt: 'What "clean beauty" really means and how to evaluate claims about natural and organic ingredients in cosmetic products.',
      category: 'business',
      date: 'February 25, 2024',
      readTime: '12 min read',
      image: 'https://images.unsplash.com/photo-1597854408833-ef0c9fd42c9f?q=80&w=1974',
      content: `
        <p>The term "clean beauty" has become ubiquitous in the cosmetics industry, but what does it actually mean? This article breaks down the reality behind the marketing to help you make informed decisions.</p>
        
        <h3>The Definition Problem</h3>
        <p>Unlike "organic" or "pharmaceutical," the term "clean beauty" lacks standardized regulation or certification. Each brand defines it differently, leading to consumer confusion and potential greenwashing.</p>
        
        <h3>Common Clean Beauty Claims</h3>
        <ul>
          <li>"Free from" claims (parabens, sulfates, phthalates, etc.)</li>
          <li>Natural or naturally-derived ingredients</li>
          <li>Sustainability and ethical sourcing</li>
          <li>Minimal processing and preservatives</li>
        </ul>
        
        <h3>Natural vs. Safe: The Scientific Perspective</h3>
        <p>The assumption that natural ingredients are inherently safer than synthetic ones isn't supported by science. Some natural ingredients can cause irritation (essential oils) while some synthetic ingredients have extensive safety data.</p>
        
        <h3>Evaluating Clean Beauty Products</h3>
        <p>Look beyond marketing claims and focus on transparency. Brands should provide clear information about ingredient sourcing, manufacturing processes, and substantiate any claims with evidence.</p>
        
        <h3>The Future of Clean Beauty</h3>
        <p>The industry is moving toward more standardized definitions and certifications for clean beauty. This will help consumers make better choices and hold brands accountable for their claims.</p>
      `
    },
    {
      id: 5,
      title: 'Launching Your Beauty Brand on a Budget',
      excerpt: 'Practical strategies for aspiring entrepreneurs to start a beauty business with limited capital without compromising on quality.',
      category: 'business',
      date: 'February 20, 2024',
      readTime: '9 min read',
      image: 'https://images.unsplash.com/photo-1583209814683-c023dd293cc6?q=80&w=2070',
      content: `
        <p>Starting a beauty brand doesn't require millions in capital. With strategic planning and a lean approach, you can launch a successful beauty business even with limited funds.</p>
        
        <h3>Start with a Focused Product Line</h3>
        <p>Instead of launching multiple products simultaneously, start with 1-3 hero products. This reduces upfront costs and allows you to perfect your formulations before expanding.</p>
        
        <h3>Consider White Label to Start</h3>
        <p>While custom formulations are ideal, starting with white label or private label products can significantly reduce R&D costs and minimum order quantities. You can transition to custom formulations as your brand grows.</p>
        
        <h3>Leverage Digital Marketing</h3>
        <p>Focus on low-cost, high-impact digital marketing strategies:</p>
        <ul>
          <li>Build an engaged Instagram community</li>
          <li>Partner with micro-influencers for authentic promotion</li>
          <li>Create valuable content that positions you as an industry expert</li>
          <li>Utilize email marketing for direct customer communication</li>
        </ul>
        
        <h3>Start Direct-to-Consumer</h3>
        <p>Selling directly to consumers through your website gives you higher margins than wholesale. Platforms like Shopify make it affordable to set up a professional e-commerce store.</p>
        
        <h3>Smart Packaging Choices</h3>
        <p>Packaging is crucial for beauty products but can be expensive. Look for stock packaging options that can be customized with labels and secondary packaging to reduce mold costs while maintaining a premium look.</p>
      `
    }
  ];

  // Fix around line 229 where the error is occurring
  // First, ensure displayArticles is always an array
  const filteredArticles = Array.isArray(displayArticles) 
    ? displayArticles.filter(article => {
        // Category filter
        if (activeCategory !== 'all' && article.category !== activeCategory) {
          return false;
        }
        
        // Search filter
        if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        return true;
      })
    : [];

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
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No articles found</h3>
                  <p className="text-gray-500">Try changing your filters or search criteria.</p>
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
                          {displayArticles.filter(article => article.category === category.id).length}
                        </span>
                      </button>
                    </li>
                  ))}
            </ul>
          </div>

              {/* Popular Posts */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Articles</h3>
                <div className="space-y-4">
                  {displayArticles.slice(0, 3).map((article) => (
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