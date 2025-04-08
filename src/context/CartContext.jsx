import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/client'; // Import API client

// 1. Create context with proper initialization
const CartContext = createContext({
  cartItems: [],
  loading: true,
  updateCart: () => {},
  clearCart: () => {}
});

// Add cache storage outside the component
const cartCache = {
  data: null,
  timestamp: 0,
  currentUser: null
};

// Add request deduplication map
const pendingRequests = new Map();

// Add this custom hook
const useCachedRequest = () => {
  const cache = useRef(new Map());
  
  return useCallback(async (config) => {
    const cacheKey = JSON.stringify(config);
    
    if (cache.current.has(cacheKey)) {
      return cache.current.get(cacheKey);
    }
    
    const promise = api(config)
      .then(response => {
        setTimeout(() => cache.current.delete(cacheKey), 5000);
        return response;
      })
      .catch(error => {
        cache.current.delete(cacheKey);
        throw error;
      });
    
    cache.current.set(cacheKey, promise);
    return promise;
  }, []); // Empty dependency array ensures stable function reference
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 2. Add proper error handling for cart fetch
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/cart');
      return response.data?.products || [];
    } catch (error) {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fix useEffect dependencies
  useEffect(() => {
    if (user?.uid) {
      fetchCart().then(items => setCartItems(items));
    } else {
      setCartItems([]);
    }
  }, [user?.uid, fetchCart]);

  // 4. Ensure all context functions are properly memoized
  const updateCart = useCallback((newCart) => {
    setCartItems(newCart);
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Add default value for cartItems
  const defaultValue = {
    cartItems,
    setCartItems,
    addToCart: async (product, quantity) => {
      try {
        const response = await api.post('/cart', {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: quantity
        });
        
        setCartItems(response.data.products);
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    removeFromCart: async (productId) => {
      try {
        const response = await api.delete(`/cart/${productId}`);
        
        setCartItems(response.data.products);
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    updateCart,
    clearCart
  };

  return (
    <CartContext.Provider value={defaultValue}>
      {children}
    </CartContext.Provider>
  );
};

// 5. Add safety checks to useCart hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 