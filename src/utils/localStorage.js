/**
 * localStorage utility functions
 * 
 * This file contains helper functions for interacting with localStorage
 * to store and retrieve user preferences and other data.
 */

// Storage keys
const KEYS = {
  RECENTLY_VIEWED: 'recently_viewed',
  FILTER_PREFERENCES: 'filter_preferences',
  VIEW_MODE: 'view_mode',
  THEME: 'theme_preference'
};

// Maximum recently viewed products to store
const MAX_RECENT_ITEMS = 10;

/**
 * Safely store an item in localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {any} value - The value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export const setStoredItem = (key, value) => {
  try {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
    return false;
  }
};

/**
 * Safely retrieve an item from localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} The retrieved value or defaultValue
 */
export const getStoredItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    // Try to parse as JSON, but return the raw value if it fails
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Remove an item from localStorage
 * @param {string} key - The localStorage key to remove
 * @returns {boolean} Success status
 */
export const removeStoredItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

/**
 * Add a product to recently viewed
 * @param {Object} product - The product to add
 * @returns {boolean} Success status
 */
export const addToRecentlyViewed = (product) => {
  try {
    if (!product || !product._id) return false;
    
    // Get current list
    const recentItems = getStoredItem(KEYS.RECENTLY_VIEWED, []);
    
    // Remove the product if it's already in the list
    const filteredItems = Array.isArray(recentItems) 
      ? recentItems.filter(item => item._id !== product._id)
      : [];
    
    // Create a minimal product object to save space
    const minimalProduct = {
      _id: product._id,
      name: product.name,
      image: product.image,
      category: product.category,
      price: product.price
    };
    
    // Add product to the beginning of the list and limit length
    const updatedItems = [minimalProduct, ...filteredItems].slice(0, MAX_RECENT_ITEMS);
    
    // Save to localStorage
    return setStoredItem(KEYS.RECENTLY_VIEWED, updatedItems);
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    return false;
  }
};

/**
 * Get recently viewed products
 * @returns {Array} Recently viewed products
 */
export const getRecentlyViewed = () => {
  return getStoredItem(KEYS.RECENTLY_VIEWED, []);
};

/**
 * Save filter preferences
 * @param {Object} preferences - Filter preferences object
 * @returns {boolean} Success status
 */
export const saveFilterPreferences = (preferences) => {
  return setStoredItem(KEYS.FILTER_PREFERENCES, preferences);
};

/**
 * Get filter preferences
 * @returns {Object} Filter preferences
 */
export const getFilterPreferences = () => {
  return getStoredItem(KEYS.FILTER_PREFERENCES, {
    category: 'all',
    sortBy: 'featured',
    priceRange: { min: null, max: null }
  });
};

/**
 * Save view mode preference (grid or list)
 * @param {string} mode - The view mode ('grid' or 'list')
 * @returns {boolean} Success status
 */
export const saveViewMode = (mode) => {
  return setStoredItem(KEYS.VIEW_MODE, mode);
};

/**
 * Get view mode preference
 * @returns {string} The view mode ('grid' or 'list')
 */
export const getViewMode = () => {
  return getStoredItem(KEYS.VIEW_MODE, 'grid');
};

/**
 * Save theme preference
 * @param {string} theme - The theme ('light', 'dark', or 'system')
 * @returns {boolean} Success status
 */
export const saveThemePreference = (theme) => {
  return setStoredItem(KEYS.THEME, theme);
};

/**
 * Get theme preference
 * @returns {string} The theme preference
 */
export const getThemePreference = () => {
  return getStoredItem(KEYS.THEME, 'light');
}; 