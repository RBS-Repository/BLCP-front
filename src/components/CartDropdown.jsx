import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import api from '../api/client';

const CartDropdown = () => {
  const { cartItems = [], removeFromCart, updateCart } = useCart() || {};
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [enrichedCartItems, setEnrichedCartItems] = useState([]);
  const hasFetchedRef = useRef(false);
  
  // Calculate total price with null checks
  const totalPrice = Array.isArray(enrichedCartItems) 
    ? enrichedCartItems.reduce(
        (total, item) => total + (item?.price || 0) * (item?.quantity || 1), 
        0
      )
    : 0;

  // Fetch cart data when dropdown opens or user changes
  useEffect(() => {
    const fetchCartData = async () => {
      if (!user || !isOpen || hasFetchedRef.current) return;
      
      try {
        setLoading(true);
        setError(null);
        hasFetchedRef.current = true;
        
        const timeoutId = setTimeout(() => {
          if (loading) {
            setLoading(false);
            setError("Request timed out. Please try again.");
            hasFetchedRef.current = false;
          }
        }, 8000);
        
        const token = await user.getIdToken();
        
        const response = await api.get('/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        clearTimeout(timeoutId);
        
        const products = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.products || []);
          
        updateCart(products);
        setEnrichedCartItems(products);
        setLoading(false);
        setFetchAttempted(true);
      } catch (err) {
        console.error('Error fetching cart:', err);
        clearTimeout(timeoutId);
        
        if (err.response) {
          if (err.response.status === 401) {
            setError("Please log in again to view your cart");
          } else if (err.response.status === 404) {
            setEnrichedCartItems([]);
            setError(null);
          } else {
            setError(`Server error: ${err.response.data?.message || 'Could not load cart'}`);
          }
        } else if (err.request) {
          setError("Could not connect to server. Please check your connection.");
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
        
        setLoading(false);
        setFetchAttempted(true);
      }
    };

    if (!isOpen) {
      hasFetchedRef.current = false;
    }

    fetchCartData();
  }, [user, isOpen]);

  // Enrich cart items with product details
  useEffect(() => {
    const enrichCartItems = async () => {
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        setEnrichedCartItems([]);
        return;
      }
      
      try {
        const enrichedItems = await Promise.all(
          cartItems.map(async (item) => {
            // If product object exists and has name, use its data
            if (typeof item.product === 'object' && item.product?.name) {
              return {
                ...item,
                name: item.product.name,
                price: item.price || item.product.price,
                image: item.product.image || item.product.images?.[0] || null
              };
            } 
            // If item already has name, price, and image, use those directly
            else if (item.name && (item.price !== undefined) && item.image) {
              return item;
            } 
            // Handle case where item.product is null (deleted product)
            else if (item.product === null) {
              return {
                ...item,
                name: item.name || 'Product No Longer Available',
                price: item.price || 0,
                image: item.image || null,
                productUnavailable: true
              };
            }
            // Otherwise try to fetch product data
            else {
              try {
                let productId;
                if (typeof item.product === 'object' && item.product?._id) {
                  productId = item.product._id;
                } else {
                  productId = item.product;
                }
                
                // Safety check for productId
                if (!productId) {
                  return {
                    ...item,
                    name: item.name || 'Product No Longer Available',
                    price: item.price || 0,
                    image: item.image || null,
                    productUnavailable: true
                  };
                }
                
                productId = String(productId);

                const productRef = doc(db, 'products', productId);
                const productSnap = await getDoc(productRef);
                
                if (productSnap.exists()) {
                  const productData = productSnap.data();
                  return {
                    ...item,
                    name: productData.name || 'Product',
                    price: item.price || productData.price || 0,
                    image: productData.images?.[0] || null,
                  };
                }
                
                // Product not found in database
                return {
                  ...item,
                  name: item.name || 'Product No Longer Available',
                  price: item.price || 0, 
                  image: item.image || null,
                  productUnavailable: true
                };
              } catch (err) {
                console.error('Error fetching product details:', err);
                // Return item with defaults if fetching fails
                return {
                  ...item,
                  name: item.name || 'Product Unavailable',
                  price: item.price || 0,
                  image: item.image || null,
                  productUnavailable: true
                };
              }
            }
          })
        );
        
        setEnrichedCartItems(enrichedItems);
      } catch (err) {
        console.error('Error enriching cart items:', err);
      }
    };
    
    enrichCartItems();
  }, [cartItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsHovering(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle mouse enter
  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    setIsHovering(true);
    setIsOpen(true);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsHovering(false);
      setIsOpen(false);
    }, 300);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle removing item from cart
  const handleRemoveItem = async (productId) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Format price safely
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0';
    try {
      return price.toLocaleString();
    } catch (error) {
      return '0';
    }
  };

  // Navigate to cart page
  const goToCart = () => {
    setIsOpen(false);
    navigate('/cart');
  };

  // Generate a unique key for cart items
  const getItemKey = (item, index) => {
    if (item?.id) return `cart-item-id-${item.id}`;
    
    if (typeof item?.product === 'string') return `cart-item-product-${item.product}`;
    
    if (item?.name) return `cart-item-name-${item.name}-${index}`;
    
    return `cart-item-index-${index}`;
  };

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cart Icon Button */}
      <button 
        className="flex items-center text-gray-700 hover:text-blue-600 transition-colors relative"
        onClick={goToCart}
        aria-label="Shopping cart"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {Array.isArray(cartItems) && cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="text-lg font-semibold text-gray-800">Your Cart</h3>
              <p className="text-sm text-gray-500">{Array.isArray(cartItems) ? cartItems.length : 0} items</p>
            </div>

            {loading && !fetchAttempted ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-500">Loading your cart...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-600">{error}</p>
                <button 
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setError(null);
                    setFetchAttempted(false);
                    const refetch = async () => {
                      if (user) {
                        try {
                          const token = await user.getIdToken(true);
                          await fetchCartData();
                        } catch (err) {
                          console.error('Error refreshing token:', err);
                        }
                      }
                    };
                    refetch();
                  }}
                >
                  Try again
                </button>
              </div>
            ) : Array.isArray(enrichedCartItems) && enrichedCartItems.length > 0 ? (
              <>
                <div className="max-h-80 overflow-y-auto p-4">
                  {enrichedCartItems.map((item, index) => (
                    <div key={getItemKey(item, index)} className="flex items-center p-2 mb-2 last:mb-0 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          {item?.image ? (
                            <img 
                              src={item.image} 
                              alt={item?.name || 'Product'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                              }}
                            />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-1">
                          {item?.name || 'Product'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          ₱{formatPrice(item.product?.price || item.price)} × {item?.quantity || 1}
                        </p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-sm font-medium text-blue-600">
                          ₱{formatPrice((item.product?.price || item.price || 0) * (item?.quantity || 1))}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item?.product)}
                        className="ml-2 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                        aria-label="Remove item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Subtotal</span>
                    <span className="text-sm font-bold text-gray-800">₱{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={goToCart}
                      className="py-2 px-4 bg-white border border-gray-300 text-gray-700 text-center text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                      View Cart
                    </button>
                    <Link 
                      to="/checkout" 
                      className="py-2 px-4 bg-blue-600 text-white text-center text-sm rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">Your cart is empty</p>
                <Link 
                  to="/products" 
                  className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Start Shopping
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartDropdown; 