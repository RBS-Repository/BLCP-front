import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ImageLoader from '../common/ImageLoader';

const QuickViewModal = ({ isOpen, onClose, product }) => {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const isEmailVerified = user ? user.emailVerified : false;

  if (!isOpen || !product) return null;

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  const handleAddToCart = async () => {
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
        quantity,
        name: product.name,
        price: product.price,
        image: product.image || 'https://via.placeholder.com/400x300'
      };
      
      await addToCart(cartItem);
      toast.success(`${product.name} added to cart!`);
      onClose(); // Close modal after successful addition
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Quick View</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="rounded-lg overflow-hidden h-64 md:h-80 bg-gray-100">
              <ImageLoader 
                src={product.image || 'https://via.placeholder.com/400x400?text=No+Image'} 
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
              
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  <FaStar className="text-yellow-400 mr-1" />
                  <span className="text-sm text-gray-600">4.5</span>
                </div>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  Min: {product.minOrder} pcs
                </span>
              </div>
              
              {user && isEmailVerified ? (
                <div className="font-bold text-xl text-[#363a94] mb-4">
                  ₱{product.price?.toLocaleString()}
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center text-gray-500">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Price hidden</span>
                  </div>
                  {!user ? (
                    <Link to="/login" className="text-xs text-[#363a94] hover:text-[#2a2e75] underline">
                      Login to see price
                    </Link>
                  ) : (
                    <span className="text-xs text-[#363a94]">Verify email to see price</span>
                  )}
                </div>
              )}
              
              <div className="mb-4">
                <p className="text-gray-600">{product.description}</p>
              </div>
              
              {user && isEmailVerified && (
                <div className="mb-6">
                  <div className="flex items-center">
                    <span className="mr-3">Quantity:</span>
                    <div className="flex border border-gray-300 rounded-md">
                      <button 
                        onClick={decrementQuantity}
                        className="px-3 py-1 border-r border-gray-300 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center py-1 focus:outline-none"
                      />
                      <button 
                        onClick={incrementQuantity}
                        className="px-3 py-1 border-l border-gray-300 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-auto">
                {user && isEmailVerified && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2 px-4 ${
                      isAddingToCart 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#363a94] hover:bg-[#2a2d73] text-white'
                    } transition-colors`}
                  >
                    {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                )}
                
                <button
                  onClick={() => toggleWishlist(product._id)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <FaHeart 
                    className={isInWishlist(product._id) ? "text-red-500" : "text-gray-400"} 
                    size={20} 
                  />
                </button>
                
                <Link
                  to={`/products/${product._id}`}
                  className="flex-1 flex items-center justify-center bg-gray-100 text-gray-800 rounded-lg py-2 px-4 hover:bg-gray-200 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickViewModal; 