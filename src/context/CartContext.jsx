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

  // Add to cart with variation support
  const addToCart = useCallback(async (item) => {
    try {
      // Validate that productId exists
      if (!item.productId) {
        console.error('Error: Attempting to add item to cart with undefined productId', item);
        throw new Error('Cannot add item to cart: Missing product ID');
      }
      
      // Debug logging
      console.log('Adding item to cart:', {
        productId: item.productId,
        name: item.name,
        price: item.price,
        variationDisplay: item.variationDisplay || 'No variation',
        variationSku: item.variationSku || 'No SKU (partial selection)',
        variationOptions: item.variationOptions || 'No options'
      });
      
      const payload = {
        product: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };

      // Add variation data if present
      if (item.variationSku) {
        payload.variationSku = item.variationSku;
      }

      if (item.variationOptions) {
        payload.variationOptions = item.variationOptions;
      }
      
      if (item.variationDisplay) {
        payload.variationDisplay = item.variationDisplay;
      }

      const response = await api.post('/cart', payload);
      setCartItems(response.data.products);
      return response.data;
    } catch (err) {
      console.error('Error adding to cart:', err);
      throw err;
    }
  }, []);

  // Remove from cart with variation support
  const removeFromCart = useCallback(async (productId, variationSku = null) => {
    try {
      let url = `/cart/${productId}`;
      
      // If a variation SKU is provided, append it to the URL
      if (variationSku) {
        url += `?variationSku=${variationSku}`;
      }
      
      const response = await api.delete(url);
      setCartItems(response.data.products);
      return response.data;
    } catch (err) {
      console.error('Error removing from cart:', err);
      throw err;
    }
  }, []);

  // Update cart item quantity with variation support
  const updateCartItemQuantity = useCallback(async (productId, quantity, variationSku = null) => {
    try {
      const payload = {
        quantity
      };
      
      // If a variation SKU is provided, include it in the payload
      if (variationSku) {
        payload.variationSku = variationSku;
      }
      
      const response = await api.patch(`/cart/${productId}`, payload);
      setCartItems(response.data.products);
      return response.data;
    } catch (err) {
      console.error('Error updating cart item quantity:', err);
      throw err;
    }
  }, []);

  // Get cart item - now supports checking by product ID and variation SKU
  const getCartItem = useCallback((productId, variationSku = null) => {
    if (variationSku) {
      return cartItems.find(item => 
        item.product === productId && 
        item.variationSku === variationSku
      );
    }
    return cartItems.find(item => item.product === productId);
  }, [cartItems]);

  // Check if item is in cart - now supports checking by product ID and variation SKU
  const isInCart = useCallback((productId, variationSku = null) => {
    return !!getCartItem(productId, variationSku);
  }, [getCartItem]);

  // Get the total price of items in the cart
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }, [cartItems]);

  // Get the total number of items in the cart
  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  }, [cartItems]);

  const contextValue = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCart,
    clearCart,
    getCartItem,
    isInCart,
    getTotalPrice,
    getTotalItems
  };

  return (
    <CartContext.Provider value={contextValue}>
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