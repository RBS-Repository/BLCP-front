/**
 * Cloudinary Service
 * Centralizes all Cloudinary-related functionality in one place
 */

// Use environment variables - NO HARDCODED FALLBACKS for security reasons
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_URL = import.meta.env.VITE_CLOUDINARY_API_URL;

// For debugging - log configuration on initialization
console.log('Cloudinary environment variables available:', { 
  cloudName: !!CLOUD_NAME, 
  uploadPreset: !!UPLOAD_PRESET,
  apiUrl: !!API_URL 
});

/**
 * Uploads a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {Object} options - Additional options (folder, transformation, etc.)
 * @returns {Promise<Object>} - The Cloudinary response
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Validate configuration
    if (!CLOUD_NAME || !UPLOAD_PRESET || !API_URL) {
      console.error('Cloudinary configuration missing. Make sure environment variables are set correctly.');
      throw new Error('Cloudinary is not properly configured. Please contact support.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // Add any additional options
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    const uploadUrl = `${API_URL}/${CLOUD_NAME}/image/upload`;
    
    const response = await fetch(
      uploadUrl,
      { method: 'POST', body: formData }
    );
    
    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.text();
        if (errorData) errorMessage += `: ${errorData}`;
      } catch (e) {
        // If we can't parse the error response, just use the status code
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Uploads an image and returns just the secure URL
 * @param {File} file - The file to upload
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadImage = async (file, options = {}) => {
  const result = await uploadToCloudinary(file, options);
  return result.secure_url;
};

/**
 * Uploads multiple images to Cloudinary
 * @param {File[]} files - Array of files to upload
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} - Array of secure URLs
 */
export const uploadMultipleImages = async (files, options = {}) => {
  if (!files || !files.length) {
    return [];
  }
  
  const uploadPromises = files.map(file => uploadToCloudinary(file, options));
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.secure_url);
};

/**
 * Checks if a string is already a Cloudinary URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
  return typeof url === 'string' && url.includes('cloudinary.com');
};

export default {
  uploadToCloudinary,
  uploadImage,
  uploadMultipleImages,
  isCloudinaryUrl,
}; 