import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const WishlistContext = createContext({
  wishlistItems: [],
  loading: true,
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  isInWishlist: () => false,
  toggleWishlist: () => {}
});

// Collection name in Firestore
const WISHLIST_COLLECTION = 'wishlists';

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Listen for changes to the user's wishlist in Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    
    const fetchWishlist = async () => {
      if (!user) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // Create a reference to the user's wishlist document
        const wishlistRef = doc(db, WISHLIST_COLLECTION, user.uid);
        
        // Set up real-time listener for wishlist changes
        unsubscribe = onSnapshot(wishlistRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data && data.items && Array.isArray(data.items)) {
              setWishlistItems(data.items);
            } else {
              setWishlistItems([]);
            }
          } else {
            // Document doesn't exist yet, initialize with empty array
            setWishlistItems([]);
            // Create an empty wishlist document
            setDoc(wishlistRef, { items: [] }, { merge: true })
              .catch(error => console.error('Error creating empty wishlist:', error));
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to wishlist:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up wishlist listener:', error);
        setLoading(false);
      }
    };

    fetchWishlist();
    
    // Cleanup listener on unmount or when user changes
    return () => unsubscribe();
  }, [user]);

  // Save wishlist to Firestore
  const saveWishlistToFirestore = useCallback(async (items) => {
    if (!user) return;
    
    try {
      const wishlistRef = doc(db, WISHLIST_COLLECTION, user.uid);
      await setDoc(wishlistRef, { items, updatedAt: new Date() }, { merge: true });
    } catch (error) {
      console.error('Error saving wishlist to Firestore:', error);
      // Fallback to localStorage if Firestore fails
      localStorage.setItem(`wishlist_${user.uid}`, JSON.stringify(items));
    }
  }, [user]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId) => {
    return wishlistItems.includes(productId);
  }, [wishlistItems]);

  // Add product to wishlist
  const addToWishlist = useCallback(async (productId) => {
    if (!user) {
      toast.error('Please log in to add items to your wishlist');
      return;
    }
    
    if (!isInWishlist(productId)) {
      const newWishlist = [...wishlistItems, productId];
      // Update local state
      setWishlistItems(newWishlist);
      // Save to Firestore
      await saveWishlistToFirestore(newWishlist);
      toast.success('Added to wishlist');
    }
  }, [wishlistItems, isInWishlist, user, saveWishlistToFirestore]);

  // Remove product from wishlist
  const removeFromWishlist = useCallback(async (productId) => {
    if (!user) return;
    
    const newWishlist = wishlistItems.filter(id => id !== productId);
    // Update local state
    setWishlistItems(newWishlist);
    // Save to Firestore
    await saveWishlistToFirestore(newWishlist);
    toast.success('Removed from wishlist');
  }, [wishlistItems, user, saveWishlistToFirestore]);

  // Toggle product in wishlist
  const toggleWishlist = useCallback(async (productId) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const contextValue = {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist
  };

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}; 