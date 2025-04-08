import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { getRecentlyViewed } from '../utils/localStorage';
import ImageLoader from './ImageLoader';

const RecentlyViewed = () => {
  const [recentProducts, setRecentProducts] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = React.useRef(null);
  
  useEffect(() => {
    // Get recently viewed products from localStorage
    const products = getRecentlyViewed();
    if (products && products.length > 0) {
      setRecentProducts(products);
    }
  }, []);
  
  // Don't render if there are no recently viewed products
  if (recentProducts.length === 0) {
    return null;
  }
  
  // Handle scrolling the container
  const scroll = (direction) => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollAmount = 300; // Pixels to scroll
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  // Track scroll position for showing/hiding scroll buttons
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollPosition(containerRef.current.scrollLeft);
    }
  };
  
  // Animation variants
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
      transition: { duration: 0.3 }
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FaEye className="mr-2 text-[#363a94]" />
          Recently Viewed
        </h3>
      </div>
      
      <div className="relative">
        {/* Left Scroll Button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 hover:bg-gray-100 transition-colors focus:outline-none"
            aria-label="Scroll left"
          >
            <FaArrowLeft className="text-gray-700" />
          </button>
        )}
        
        {/* Scrollable Container */}
        <div 
          className="flex overflow-x-auto scrollbar-hide gap-4 py-2 px-1"
          ref={containerRef}
          onScroll={handleScroll}
        >
          <motion.div 
            className="flex gap-4" 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {recentProducts.map((product, index) => (
              <motion.div
                key={product._id}
                variants={itemVariants}
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                className="flex-shrink-0 w-40 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-all"
              >
                <Link to={`/products/${product._id}`} className="block">
                  <div className="h-36 overflow-hidden bg-gray-100">
                    <ImageLoader
                      src={product.image || 'https://via.placeholder.com/160x144'}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                    {product.price && (
                      <p className="text-[#363a94] font-semibold text-sm mt-1">
                        ₱{product.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
        
        {/* Right Scroll Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Scroll right"
        >
          <FaArrowRight className="text-gray-700" />
        </button>
      </div>
      
      {/* Custom scrollbar styles */}
      <style jsx="true">{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default RecentlyViewed; 