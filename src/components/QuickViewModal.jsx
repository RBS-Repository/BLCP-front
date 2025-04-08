import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaTimes, FaStar, FaHeart, FaShoppingCart } from 'react-icons/fa';
import ImageLoader from './ImageLoader';

const QuickViewModal = ({ product, isOpen, onClose, addToCart, isInWishlist, toggleWishlist }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= product.stock) {
      setQuantity(value);
    }
  };
  
  // Handle increment/decrement quantity
  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  // Handle adding to cart
  const handleAddToCart = () => {
    if (addToCart) {
      addToCart(product, quantity);
    }
  };
  
  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: 'spring', 
        duration: 0.5, 
        bounce: 0.3 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      transition: { duration: 0.2 }
    }
  };
  
  // Product images (primary + additional images if available)
  const images = [
    product.image,
    ...(product.additionalImages || [])
  ].filter(Boolean); // Filter out any undefined/null images
  
  if (images.length === 0) {
    images.push('https://via.placeholder.com/400x400?text=No+Image');
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <motion.div
              className="relative bg-white rounded-xl shadow-xl overflow-hidden max-w-4xl w-full mx-auto"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="absolute right-4 top-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                onClick={onClose}
                aria-label="Close modal"
              >
                <FaTimes className="text-gray-500" />
              </button>
              
              <div className="flex flex-col md:flex-row">
                {/* Product Images */}
                <div className="w-full md:w-1/2 p-4 bg-gray-50">
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                    <ImageLoader
                      src={images[selectedImage]}
                      alt={product.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                            selectedImage === idx ? 'border-[#363a94]' : 'border-transparent'
                          }`}
                          onClick={() => setSelectedImage(idx)}
                          aria-label={`View image ${idx + 1}`}
                        >
                          <img
                            src={img}
                            alt={`${product.name} - view ${idx + 1}`}
                            className="w-full h-full object-cover object-center"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Product Details */}
                <div className="w-full md:w-1/2 p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-600">4.5</span>
                      </div>
                      
                      {/* Category Tag */}
                      <span className="bg-[#363a94]/10 text-[#363a94] text-xs px-2 py-1 rounded">
                        {product.category}
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                    
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-[#363a94] mb-1">
                        ₱{product.price?.toLocaleString()}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {product.stock > 0 ? (
                          <span className="text-green-600">In Stock ({product.stock} available)</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Selector */}
                    <div className="mb-6">
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <div className="flex">
                        <button
                          className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                          onClick={decrementQuantity}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          id="quantity"
                          value={quantity}
                          onChange={handleQuantityChange}
                          min="1"
                          max={product.stock}
                          className="w-16 text-center border-t border-b border-gray-300 py-2"
                        />
                        <button
                          className="px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                          onClick={incrementQuantity}
                          disabled={quantity >= product.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                      <button
                        className="w-full px-4 py-3 bg-[#363a94] text-white rounded-lg hover:bg-[#2d327d] transition-colors flex items-center justify-center"
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                      >
                        <FaShoppingCart className="mr-2" />
                        Add to Cart
                      </button>
                      
                      <div className="flex gap-3">
                        {toggleWishlist && (
                          <button
                            className={`flex-1 px-4 py-3 rounded-lg border transition-colors flex items-center justify-center ${
                              isInWishlist?.(product.id)
                                ? 'bg-red-50 border-red-200 text-red-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleWishlist?.(product.id)}
                          >
                            <FaHeart className="mr-2" />
                            {isInWishlist?.(product.id) ? 'Saved' : 'Save'}
                          </button>
                        )}
                        
                        <Link
                          to={`/products/${product.id}`}
                          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                          onClick={onClose}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal; 