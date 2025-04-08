import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ImageLoader = ({ src, alt, className, style, lowQualitySrc }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(lowQualitySrc || '');
  const placeholderBg = 'bg-gray-200';
  
  // Create blurred thumbnail if not provided
  const createLowQualitySrc = () => {
    if (lowQualitySrc) return;
    
    // If src is already a placeholder, don't attempt to create lower quality version
    if (src && src.includes('placeholder.com')) {
      setImageSrc(src);
      return;
    }
    
    // Base64 1x1px placeholder
    const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    setImageSrc(placeholder);
  };
  
  useEffect(() => {
    createLowQualitySrc();
    
    // Load the full-size image
    const imageToLoad = new Image();
    imageToLoad.src = src;
    imageToLoad.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    imageToLoad.onerror = () => {
      setError(true);
      setIsLoading(false);
      // Set to fallback image
      setImageSrc('https://via.placeholder.com/400x400?text=No+Image');
    };
    
    return () => {
      // Cleanup
      imageToLoad.onload = null;
      imageToLoad.onerror = null;
    };
  }, [src, lowQualitySrc]);
  
  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={style}>
      {isLoading && (
        <motion.div 
          className={`absolute inset-0 ${placeholderBg} animate-pulse rounded`}
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoading ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      <motion.img
        src={imageSrc}
        alt={alt || 'Image'}
        className={`w-full h-full object-cover ${isLoading ? 'blur-sm scale-110' : 'blur-0 scale-100'}`}
        style={{ 
          transition: 'filter 0.3s ease-out, transform 0.3s ease-out', 
          opacity: error ? 0.7 : 1 
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-60">
          <p className="text-gray-500 text-sm text-center px-2">Image failed to load</p>
        </div>
      )}
    </div>
  );
};

export default ImageLoader; 