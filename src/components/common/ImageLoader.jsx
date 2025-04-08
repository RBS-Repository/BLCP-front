import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ImageLoader = ({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  objectFit = 'cover',
  placeholderColor = '#f3f4f6' // light gray by default
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  // Local fallback image path
  const fallbackImage = '/images/placeholder.jpg'; // Make sure this file exists in your public/images folder
  
  const handleLoad = () => {
    setLoading(false);
  };
  
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  useEffect(() => {
    // Reset state when src changes
    setLoading(true);
    setError(false);
    
    // Create new image to track loading state
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    
    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const containerStyles = {
    position: 'relative',
    overflow: 'hidden',
    width: width || '100%',
    height: height || '100%',
    backgroundColor: placeholderColor,
  };

  return (
    <div className={`relative ${className}`} style={containerStyles}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse w-full h-full bg-gray-200"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <svg 
            className="w-10 h-10 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {imgSrc && (
        <motion.img
          src={error ? fallbackImage : imgSrc}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: loading ? 0 : 1,
            filter: loading ? 'blur(10px)' : 'blur(0)'
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default ImageLoader; 