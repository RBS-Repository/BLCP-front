import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStar, FaHeart, FaEye, FaShoppingCart, FaTags, FaClock, FaBox } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ImageLoader from '../common/ImageLoader';

// Calculate how many days ago a date was
const daysAgo = (dateString) => {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const ProductCard = ({ 
  product, 
  onQuickView = () => {}, 
  withActions = true,
  badges = true,
  viewMode = 'grid',  // Add viewMode prop with 'grid' as default
  gridLayout = 'standard' // New prop to identify if we're in compact layout
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const isEmailVerified = user ? user.emailVerified : false;

  // Config for compact mode
  const isCompact = gridLayout === 'compact';

  if (!product) return null;

  // Determine if product is new (less than 14 days old)
  const isNew = daysAgo(product.createdAt) < 14;
  
  // Check if product is on sale
  const isOnSale = product.discount && product.discount > 0;
  
  // Check if product has limited stock
  const hasLimitedStock = product.stock && product.stock <= 5;

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
      
      // Create a proper cart item with explicit productId
      const cartItem = {
        productId: product._id,
        quantity: 1,
        name: product.name,
        price: product.price,
        image: product.image || 'https://via.placeholder.com/400x300'
      };
      
      await addToCart(cartItem);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product._id);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  // Grid View (Original)
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        whileHover={{ 
          y: -8,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }}
        className="bg-white rounded-xl overflow-hidden shadow-md transition-all border border-gray-100 h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link to={`/products/${product._id}`} className="block h-full">
          {/* Product Image */}
          <div className={`relative ${isCompact ? 'h-48' : 'h-64'} overflow-hidden bg-gray-100`}>
            <ImageLoader 
              src={product.image || 'https://via.placeholder.com/400x300'} 
              alt={`${product.name} - ${product.category} Korean skincare product`}
              className="w-full h-full object-cover object-center"
              placeholderColor="#f9fafb"
            />
            
            {/* Quick Actions Overlay - Only visible on hover */}
            {withActions && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="flex space-x-2">
                  {user && isEmailVerified && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-2 rounded-full ${
                        isAddingToCart ? 'bg-gray-500' : 'bg-white hover:bg-[#363a94] hover:text-white'
                      } transition-colors`}
                      onClick={handleAddToCart}
                      disabled={isAddingToCart}
                      aria-label="Add to cart"
                    >
                      <FaShoppingCart size={isCompact ? 16 : 18} />
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white rounded-full hover:bg-[#363a94] hover:text-white transition-colors"
                    onClick={handleToggleWishlist}
                    aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <FaHeart 
                      size={isCompact ? 16 : 18} 
                      className={isInWishlist(product._id) ? "text-red-500 hover:text-white" : ""} 
                    />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white rounded-full hover:bg-[#363a94] hover:text-white transition-colors"
                    onClick={handleQuickView}
                    aria-label="Quick view"
                  >
                    <FaEye size={isCompact ? 16 : 18} />
                  </motion.button>
                </div>
              </motion.div>
            )}
            
            {/* Wishlist Button (always visible) */}
            {withActions && (
              <button
                onClick={handleToggleWishlist}
                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <FaHeart 
                  className={isInWishlist(product._id) ? "text-red-500" : "text-gray-400"} 
                  aria-hidden="true" 
                  size={isCompact ? 14 : 16}
                />
              </button>
            )}
            
            {/* Category Tag */}
            <div className="absolute bottom-3 left-3">
              <span className={`inline-block bg-[#363a94] text-white ${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-md`}>
                {product.category || 'Uncategorized'}
              </span>
            </div>
            
            {/* Product Badges */}
            {badges && (
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {isNew && (
                  <span className={`inline-block bg-blue-600 text-white ${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-md`}>
                    NEW
                  </span>
                )}
                
                {isOnSale && (
                  <span className={`inline-block bg-red-600 text-white ${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-md`}>
                    SALE {product.discount}%
                  </span>
                )}
                
                {hasLimitedStock && (
                  <span className={`inline-block bg-amber-600 text-white ${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-md`}>
                    Only {product.stock} left
                  </span>
                )}

                {product.isBestSeller && (
                  <span className={`inline-block bg-green-600 text-white ${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-md`}>
                    BEST SELLER
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className={`${isCompact ? 'p-3' : 'p-5'} flex flex-col flex-1`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FaStar className="text-yellow-400 mr-1" aria-hidden="true" size={isCompact ? 12 : 14} />
                <span className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-600`}>4.5</span>
              </div>
              <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                Min: {product.minOrder} pcs
              </span>
            </div>
            
            <h3 className={`font-semibold text-gray-900 mb-1 hover:text-[#363a94] transition-colors line-clamp-1 ${isCompact ? 'text-sm' : ''}`}>
              {product.name}
            </h3>
            
            {!isCompact && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {product.description}
              </p>
            )}
            
            <div className="mt-auto flex items-center justify-between">
              {user && isEmailVerified ? (
                <div className={`font-bold ${isCompact ? 'text-base' : 'text-lg'} text-[#363a94]`}>
                  {isOnSale ? (
                    <>
                      <span className="text-red-500">₱{((1 - product.discount / 100) * product.price).toLocaleString()}</span>
                      <span className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'} line-through ml-1`}>₱{product.price.toLocaleString()}</span>
                    </>
                  ) : (
                    <span>₱{product.price.toLocaleString()}</span>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex items-center text-gray-500 mb-1">
                    <svg className={`mr-1.5 ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className={`font-medium ${isCompact ? 'text-xs' : ''}`}>Price hidden</span>
                  </div>
                  {!user ? (
                    <Link to="/login" className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-[#363a94] hover:text-[#2a2e75] underline`}>
                      Login to see price
                    </Link>
                  ) : (
                    <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-[#363a94]`}>Verify email to see price</span>
                  )}
                </div>
              )}
              
              {!isCompact && (
                <button
                  onClick={handleQuickView}
                  className="flex items-center justify-center text-[#363a94] hover:text-[#2a2d73] ml-4"
                  aria-label={`Quick view of ${product.name}`}
                >
                  <span className="mr-1 text-sm">View</span>
                  <FaEye />
                </button>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  } else {
    // List View - New Design
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        whileHover={{ 
          scale: 1.01, 
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }}
        className="bg-white rounded-xl overflow-hidden shadow-md transition-all border border-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col md:flex-row">
          {/* Product Image Section - Now with better proportions */}
          <div className="relative md:w-1/4 lg:w-1/5 h-64 md:h-auto">
            <Link to={`/products/${product._id}`} className="block h-full">
              <div className="h-full">
                <ImageLoader 
                  src={product.image || 'https://via.placeholder.com/400x300'} 
                  alt={`${product.name} - ${product.category} Korean skincare product`}
                  className="w-full h-full object-cover md:object-contain"
                  placeholderColor="#f9fafb"
                />
              </div>
            </Link>
            
            {/* Category Badge - Now at top */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-block bg-[#363a94] text-white text-xs px-2 py-1 rounded-md shadow-sm">
                {product.category || 'Uncategorized'}
              </span>
            </div>
          </div>
          
          {/* Product Info Section - Better visual hierarchy */}
          <div className="flex-1 p-6 md:p-8 flex flex-col relative">
            {/* Quick action buttons positioned elegantly */}
            <div className="absolute top-6 md:top-8 right-6 md:right-8 flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleWishlist}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-100 transition-colors"
                aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <FaHeart 
                  className={isInWishlist(product._id) ? "text-red-500" : "text-gray-400"} 
                  size={18}
                />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleQuickView}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-100 transition-colors"
                aria-label="Quick view"
              >
                <FaEye className="text-gray-500" size={18} />
              </motion.button>
            </div>
            
            {/* Product Title and Rating */}
            <div className="mb-3 pr-24">
              <Link to={`/products/${product._id}`} className="block">
                <h3 className="text-xl font-semibold text-gray-900 mb-1 hover:text-[#363a94] transition-colors">
                  {product.name}
                </h3>
              </Link>
              
              <div className="flex items-center">
                <div className="flex items-center mr-3">
                  {[...Array(5)].map((_, i) => (
                    <FaStar 
                      key={i} 
                      className={i < 4 ? "text-yellow-400" : "text-gray-300"} 
                      size={14} 
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">4.0 (12 reviews)</span>
              </div>
            </div>
            
            {/* Product description with better readability */}
            <p className="text-gray-600 mb-5 line-clamp-2 md:line-clamp-3 max-w-3xl">
              {product.description}
            </p>
            
            {/* Product features/highlights - New section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center text-sm text-gray-600">
                <FaTags className="text-[#363a94] mr-2" />
                <span>Category: <span className="font-medium">{product.category}</span></span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <FaClock className="text-[#363a94] mr-2" />
                <span>Added: <span className="font-medium">{isNew ? 'Recently' : 'More than 2 weeks ago'}</span></span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <FaBox className="text-[#363a94] mr-2" />
                <span>Stock: <span className={`font-medium ${hasLimitedStock ? 'text-amber-600' : ''}`}>
                  {hasLimitedStock ? `Limited (${product.stock} left)` : 'Available'}
                </span></span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <FaShoppingCart className="text-[#363a94] mr-2" />
                <span>Min. Order: <span className="font-medium">{product.minOrder || 1} pcs</span></span>
              </div>
            </div>
            
            {/* Price and CTA - Now more prominent */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
              {/* Price Section */}
              {user && isEmailVerified ? (
                <div className="flex flex-col">
                  <div className="font-bold text-2xl text-[#363a94]">
                    {isOnSale ? (
                      <>
                        <span className="text-red-500">₱{((1 - product.discount / 100) * product.price).toLocaleString()}</span>
                        <span className="text-gray-400 text-sm line-through ml-2">₱{product.price.toLocaleString()}</span>
                      </>
                    ) : (
                      <span>₱{product.price.toLocaleString()}</span>
                    )}
                  </div>
                  {isOnSale && (
                    <span className="text-green-600 text-sm font-medium mt-1">
                      Save {product.discount}% ({Math.round(product.discount / 100 * product.price).toLocaleString()} PHP)
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center text-gray-500">
                    <svg className="mr-1.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium text-lg">Price hidden</span>
                  </div>
                  {!user ? (
                    <Link to="/login" className="text-sm text-[#363a94] hover:text-[#2a2e75] underline mt-1">
                      Login to see price
                    </Link>
                  ) : (
                    <span className="text-sm text-[#363a94] mt-1">Verify email to see price</span>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link 
                  to={`/products/${product._id}`}
                  className="px-6 py-3 bg-white border border-[#363a94] text-[#363a94] rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center"
                >
                  <FaEye className="mr-2" />
                  Details
                </Link>
                
                {user && isEmailVerified && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                      isAddingToCart 
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                        : 'bg-[#363a94] text-white hover:bg-[#2a2d73] transition-colors'
                    }`}
                  >
                    <FaShoppingCart className="mr-2" />
                    {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
};

export default ProductCard; 