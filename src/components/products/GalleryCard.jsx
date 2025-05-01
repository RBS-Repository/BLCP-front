import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHeart, FaEye, FaShoppingCart } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import ImageLoader from '../common/ImageLoader';

const GalleryCard = ({ 
  product, 
  onQuickView = () => {},
  addToRecentlyViewed = () => {} 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { user } = useAuth();
  const isEmailVerified = user ? user.emailVerified : false;
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  
  const isWishlisted = product._id ? isInWishlist(product._id) : false;
  
  // Check if product is on sale
  const isOnSale = product.discount && product.discount > 0;
  
  // Add a formatting helper function at the top of the component function
  const formatCategory = (category) => {
    // Handle when category is an object
    if (category && typeof category === 'object') {
      return category.name || 'Uncategorized';
    }
    // Handle when category is a string or undefined
    return category || 'Uncategorized';
  };
  
  // Handle adding to cart
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }

    if (!isEmailVerified) {
      toast.error('Please verify your email to add items to cart');
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCart(product, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  // Handle wishlist toggle
  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product._id);
  };
  
  // Handle quick view
  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };
  
  // Handle product click - add to recently viewed
  const handleProductClick = () => {
    if (addToRecentlyViewed) {
      addToRecentlyViewed(product);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="rounded-xl overflow-hidden shadow-md border border-gray-100 relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        to={`/products/${product._id}`} 
        className="block h-full"
        onClick={handleProductClick}
      >
        {/* Image Container - taking up most of the space */}
        <div className="relative h-80 sm:h-96 overflow-hidden">
          <ImageLoader
            src={product.image || 'https://via.placeholder.com/800x960'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700"
            style={{ 
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
          />
          
          {/* Product badges - positioned at top left */}
          <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
            {isOnSale && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-md">
                SALE {product.discount}%
              </span>
            )}
            
            {product.isBestSeller && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">
                BEST SELLER
              </span>
            )}
          </div>
        </div>
        
        {/* Overlay that appears on hover */}
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-between p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Action buttons at top right */}
          <div className="self-end flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-white rounded-full"
              onClick={handleToggleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <FaHeart className={isWishlisted ? "text-red-500" : "text-gray-500"} size={18} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-white rounded-full"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <FaEye className="text-gray-500" size={18} />
            </motion.button>
          </div>
          
          {/* Product info at bottom */}
          <div className="text-white">
            <h3 className="font-semibold text-xl">{product.name}</h3>
            <p className="text-xs text-gray-500 mb-1">
              {formatCategory(product.category)}
            </p>
            
            {/* Price and add to cart */}
            <div className="flex items-center justify-between">
              {user && isEmailVerified ? (
                <div className="font-bold text-xl">
                  {isOnSale ? (
                    <div>
                      <span className="text-red-300">₱{((1 - product.discount / 100) * product.price).toLocaleString()}</span>
                      <span className="line-through opacity-70 text-sm ml-2">₱{product.price.toLocaleString()}</span>
                    </div>
                  ) : (
                    <span>₱{product.price.toLocaleString()}</span>
                  )}
                </div>
              ) : (
                <div className="text-white opacity-90">
                  <span className="font-medium">Price hidden</span>
                </div>
              )}
              
              {user && isEmailVerified && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={`p-2 bg-white rounded-full ${isAddingToCart ? 'opacity-70' : ''}`}
                  aria-label="Add to cart"
                >
                  <FaShoppingCart className="text-[#363a94]" size={18} />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default GalleryCard; 