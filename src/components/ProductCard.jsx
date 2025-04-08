import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaStar, FaHeart, FaEye, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import ImageLoader from './ImageLoader';

const ProductCard = ({ 
  product, 
  viewMode = 'grid', 
  onQuickView, 
  delay = 0,
  addToRecentlyViewed 
}) => {
  const { user } = useAuth();
  const isEmailVerified = user ? user.emailVerified : false;
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = product._id ? isInWishlist(product._id) : false;
  
  // Animations based on view mode
  const gridCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        delay,
        ease: 'easeOut' 
      }
    }
  };
  
  const listCardVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.4, 
        delay,
        ease: 'easeOut' 
      }
    }
  };
  
  // Click handlers
  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };
  
  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product._id);
  };
  
  const handleProductClick = () => {
    if (addToRecentlyViewed) {
      addToRecentlyViewed(product);
    }
  };
  
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={gridCardVariants}
        whileHover={{ y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
        className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-100"
      >
        {/* Product Image */}
        <div className="relative h-56 overflow-hidden bg-gray-100">
          <Link 
            to={`/products/${product._id}`} 
            onClick={handleProductClick}
            aria-label={`View details for ${product.name}`}
          >
            <ImageLoader
              src={product.image || 'https://via.placeholder.com/400x300'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </Link>
          
          {/* Overlay Actions */}
          <div className="absolute top-3 right-3 flex flex-col space-y-2">
            <button
              onClick={handleToggleWishlist}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            >
              <FaHeart className={isWishlisted ? "text-red-500" : "text-gray-400"} aria-hidden="true" />
            </button>
            
            <button
              onClick={handleQuickView}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label={`Quick view for ${product.name}`}
            >
              <FaEye className="text-gray-500" aria-hidden="true" />
            </button>
          </div>
          
          {/* Category Tag */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-block bg-[#363a94] text-white text-xs px-2 py-1 rounded-md">
              {product.category}
            </span>
          </div>
        </div>
        
        {/* Product Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <FaStar className="text-yellow-400 mr-1" aria-hidden="true" />
              <span className="text-sm text-gray-600">4.5</span>
            </div>
            <span className="text-xs text-gray-500">
              Min: {product.minOrder || 1} pcs
            </span>
          </div>
          
          <Link 
            to={`/products/${product._id}`}
            onClick={handleProductClick}
            className="block"
          >
            <h3 className="font-semibold text-gray-900 mb-1 hover:text-[#363a94] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between mt-auto">
            {user && isEmailVerified ? (
              <div className="font-bold text-lg text-[#363a94]">
                ₱{product.price?.toLocaleString()}
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                <FaLock className="mr-1.5 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium text-sm">Price hidden</span>
              </div>
            )}
            
            <Link 
              to={`/products/${product._id}`}
              onClick={handleProductClick}
              className="flex items-center justify-center bg-[#363a94] text-white px-3 py-2 rounded-lg hover:bg-[#2a2d73] transition-colors"
              aria-label={`View details for ${product.name}`}
            >
              <FaShoppingCart className="mr-1" aria-hidden="true" />
              <span>View</span>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  } else {
    // List view
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={listCardVariants}
        whileHover={{ x: 4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
        className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-100 flex flex-col md:flex-row"
      >
        {/* Product Image */}
        <div className="relative w-full md:w-1/4 h-48 md:h-auto overflow-hidden bg-gray-100">
          <Link 
            to={`/products/${product._id}`}
            onClick={handleProductClick}
            aria-label={`View details for ${product.name}`}
            className="block h-full"
          >
            <ImageLoader
              src={product.image || 'https://via.placeholder.com/400x300'}
              alt={product.name}
              className="w-full h-full object-cover md:object-center"
            />
          </Link>
          
          {/* Category Tag */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-block bg-[#363a94] text-white text-xs px-2 py-1 rounded-md">
              {product.category}
            </span>
          </div>
        </div>
        
        {/* Product Info */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <FaStar className="text-yellow-400 mr-1" aria-hidden="true" />
              <span className="text-sm text-gray-600">4.5</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleToggleWishlist}
                className="p-1.5 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <FaHeart className={isWishlisted ? "text-red-500" : "text-gray-400"} size={14} />
              </button>
              
              <button
                onClick={handleQuickView}
                className="p-1.5 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                aria-label={`Quick view for ${product.name}`}
              >
                <FaEye className="text-gray-500" size={14} />
              </button>
            </div>
          </div>
          
          <Link 
            to={`/products/${product._id}`}
            onClick={handleProductClick}
            className="block"
          >
            <h3 className="font-semibold text-gray-900 text-lg mb-1 hover:text-[#363a94] transition-colors">
              {product.name}
            </h3>
          </Link>
          
          <p className="text-sm text-gray-600 mb-4">
            {product.description}
          </p>
          
          <div className="mt-auto flex items-center justify-between">
            <div>
              {user && isEmailVerified ? (
                <div className="font-bold text-xl text-[#363a94]">
                  ₱{product.price?.toLocaleString()}
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <FaLock className="mr-1.5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">Price hidden</span>
                </div>
              )}
              <span className="text-xs text-gray-500 block mt-1">
                Min. Order: {product.minOrder || 1} pcs
              </span>
            </div>
            
            <Link 
              to={`/products/${product._id}`}
              onClick={handleProductClick}
              className="flex items-center justify-center bg-[#363a94] text-white px-4 py-2 rounded-lg hover:bg-[#2a2d73] transition-colors"
              aria-label={`View details for ${product.name}`}
            >
              <FaShoppingCart className="mr-2" aria-hidden="true" />
              <span>View Details</span>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }
};

export default ProductCard; 