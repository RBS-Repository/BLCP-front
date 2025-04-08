// Keys for localStorage
export const STORAGE_KEYS = {
  RECENTLY_VIEWED: 'recently_viewed_products',
  FILTER_PREFERENCES: 'product_filter_preferences',
  VIEW_MODE: 'product_view_mode'
};

// Maximum number of products to store in recently viewed
export const MAX_RECENT_PRODUCTS = 10;

/**
 * Add a product to recently viewed
 * @param {string} productId - The ID of the product to add
 */
export const addToRecentlyViewed = (productId) => {
  try {
    if (!productId) return;
    
    // Get current list
    const currentList = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
    
    // Remove the product if it's already in the list
    const filteredList = currentList.filter(id => id !== productId);
    
    // Add product to the beginning of the list
    const newList = [productId, ...filteredList].slice(0, MAX_RECENT_PRODUCTS);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(newList));
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
};

/**
 * Get recently viewed product IDs
 * @returns {Array} Array of product IDs
 */
export const getRecentlyViewed = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
  } catch (error) {
    console.error('Error getting recently viewed products:', error);
    return [];
  }
};

/**
 * Save filter preferences to localStorage
 * @param {Object} preferences - The filter preferences to save
 */
export const saveFilterPreferences = (preferences) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving filter preferences:', error);
  }
};

/**
 * Get filter preferences from localStorage
 * @returns {Object} The filter preferences
 */
export const getFilterPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FILTER_PREFERENCES) || '{}');
  } catch (error) {
    console.error('Error getting filter preferences:', error);
    return {};
  }
};

/**
 * Save view mode preference (grid or list)
 * @param {string} mode - The view mode ('grid' or 'list')
 */
export const saveViewMode = (mode) => {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  } catch (error) {
    console.error('Error saving view mode:', error);
  }
};

/**
 * Get view mode preference
 * @returns {string} The view mode ('grid' or 'list')
 */
export const getViewMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.VIEW_MODE) || 'grid';
  } catch (error) {
    console.error('Error getting view mode:', error);
    return 'grid';
  }
}; 