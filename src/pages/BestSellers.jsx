import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaShoppingCart, FaStar, FaFire, FaTrophy, FaMedal } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

// Mock data as fallback
const mockTopProducts = [
  {
    _id: '1',
    name: 'Premium Facial Serum',
    description: 'Advanced anti-aging formula with hyaluronic acid and vitamin C',
    price: 1299,
    discountPrice: 999,
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.8,
    totalQuantity: 1245
  },
  {
    _id: '2',
    name: 'Hydrating Face Mask',
    description: 'Deep moisturizing treatment for all skin types',
    price: 499,
    images: ['https://images.unsplash.com/photo-1567721913486-6585f069b332?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.6,
    totalQuantity: 987
  },
  {
    _id: '3',
    name: 'Collagen Booster Cream',
    description: 'Firms and tightens skin with peptides and natural extracts',
    price: 899,
    discountPrice: 799,
    images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.7,
    totalQuantity: 856
  },
  {
    _id: '4',
    name: 'Gentle Exfoliating Scrub',
    description: 'Removes dead skin cells without irritation',
    price: 599,
    images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.5,
    totalQuantity: 723
  },
  {
    _id: '5',
    name: 'Vitamin E Oil',
    description: 'Pure natural oil for skin and hair',
    price: 399,
    discountPrice: 349,
    images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.9,
    totalQuantity: 692
  },
  {
    _id: '6',
    name: 'Brightening Eye Cream',
    description: 'Reduces dark circles and puffiness',
    price: 699,
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.4,
    totalQuantity: 581
  },
  {
    _id: '7',
    name: 'Acne Treatment Gel',
    description: 'Fast-acting formula for blemishes',
    price: 449,
    images: ['https://images.unsplash.com/photo-1556228841-a3c527ebefe5?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.3,
    totalQuantity: 542
  },
  {
    _id: '8',
    name: 'Lip Repair Balm',
    description: 'Intensive moisture for dry, chapped lips',
    price: 249,
    images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=1974&auto=format&fit=crop'],
    rating: 4.7,
    totalQuantity: 498
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const BestSellers = () => {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const [timeFrame, setTimeFrame] = useState('all'); // 'all', 'month', 'week'
  const { user } = useAuth();

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        
        // Try to fetch from API first
        try {
          let token = null;
          if (user) {
            token = await user.getIdToken();
          }
          
          const endpoint = token 
            ? '/api/orders/dashboard/top-products' 
            : '/api/products/top-selling';
            
          const headers = token 
            ? { 'Authorization': `Bearer ${token}` }
            : {};
            
          const params = { timeFrame };
          
          const response = await axios.get(endpoint, {
            headers,
            params
          });
          
          if (response.data && Array.isArray(response.data)) {
            // Format the data for display
            setTopProducts(response.data.map(product => ({
              ...product,
              // Ensure we have all needed properties
              images: product.images || [],
              price: product.price || 0,
              discountPrice: product.discountPrice,
              rating: product.rating || 0,
              reviews: product.reviews || [],
              totalQuantity: product.totalQuantity || product.totalSold || 0
            })));
            setError(null);
            return;
          }
        } catch (apiError) {
          console.warn('API fetch failed, using mock data:', apiError.message);
          // Continue to fallback
        }
        
        // Fallback to mock data if API fails
        console.log('Using mock data for best sellers');
        let filteredProducts = [...mockTopProducts];
        
        if (timeFrame === 'week') {
          filteredProducts = filteredProducts.slice(0, 4);
        } else if (timeFrame === 'month') {
          filteredProducts = filteredProducts.slice(0, 6);
        }
        
        setTopProducts(filteredProducts);
        setError(null);
        
      } catch (err) {
        console.error('Error fetching top products:', err);
        setError('Failed to load best sellers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, [timeFrame, user]);

  const handleAddToCart = (product) => {
    addToCart({
      productId: product._id,
      name: product.name,
      price: product.discountPrice || product.price,
      image: product.images[0] || '',
      quantity: 1
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  // Get badge based on rank
  const getBadge = (index) => {
    switch(index) {
      case 0:
        return <FaTrophy className="text-yellow-500 text-xl" />;
      case 1:
        return <FaMedal className="text-gray-400 text-xl" />;
      case 2:
        return <FaMedal className="text-amber-700 text-xl" />;
      default:
        return <FaFire className="text-red-500 text-lg" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4 text-xl">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
        <Link to="/products" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Browse All Products
        </Link>
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-4 text-xl">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4" />
          </svg>
          No best sellers found
        </div>
        <Link to="/products" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Browse All Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Our Best Sellers
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Discover our most popular products loved by customers
          </motion.p>
        </div>

        {/* Time frame filter */}
        <div className="mb-10">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setTimeFrame('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeFrame === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFrame('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeFrame === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFrame('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeFrame === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        {/* Products grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
        >
          {topProducts.map((product, index) => (
            <motion.div 
              key={product._id}
              variants={itemVariants}
              className="bg-white rounded-xl shadow-md overflow-hidden relative group"
            >
              {/* Rank badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                <span className="mr-1.5">{getBadge(index)}</span>
                <span className="font-bold text-gray-800">#{index + 1}</span>
              </div>
              
              {/* Product image */}
              <Link to={`/products/${product._id}`} className="block relative h-64 overflow-hidden">
                <img 
                  src={product.images[0] || 'https://via.placeholder.com/300'} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                  }}
                />
                {product.discountPrice && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                    {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
                  </div>
                )}
              </Link>
              
              {/* Product details */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <Link to={`/products/${product._id}`} className="block">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span className="text-sm font-medium text-gray-700">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    {product.discountPrice ? (
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-900 mr-2">
                          ₱{product.discountPrice.toLocaleString('en-PH')}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          ₱{product.price.toLocaleString('en-PH')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        ₱{product.price.toLocaleString('en-PH')}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <FaShoppingCart className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Sales info */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{product.totalQuantity}</span> sold
                  </div>
                  <Link 
                    to={`/products/${product._id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* CTA section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Discover More Products
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Browse our complete collection to find the perfect products for your needs
          </p>
          <Link 
            to="/products" 
            className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BestSellers; 