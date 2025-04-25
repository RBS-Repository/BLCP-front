import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import imageOptimization from '../../utils/imageOptimization';

/**
 * OptimizedImage component that provides:
 * 1. Responsive images with correct sizing
 * 2. Format selection (webp/avif with jpg fallback)
 * 3. Lazy loading for images below the fold
 * 4. Prevents layout shifts with proper dimensions
 * 5. Blur-up loading for a better UX
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  priority = false,
  objectFit = 'cover',
  sizes = '100vw',
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [bestFormat, setBestFormat] = useState('jpg');
  
  // Determine the best format for the browser
  useEffect(() => {
    const checkFormat = async () => {
      const format = await imageOptimization.getBestImageFormat();
      setBestFormat(format);
    };
    
    checkFormat();
  }, []);
  
  // Force eager loading for priority images
  const loadingStrategy = priority ? 'eager' : loading;
  
  // Properly handle image load event
  const handleImageLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };
  
  // Generate srcset based on the image format
  const generateSourceForFormat = (format) => {
    const baseSrc = src.replace(/\.(jpe?g|png|gif|webp|avif)$/i, '');
    return {
      srcSet: `
        ${baseSrc}_480.${format} 480w,
        ${baseSrc}_720.${format} 720w,
        ${baseSrc}_920.${format} 920w,
        ${baseSrc}_1080.${format} 1080w,
        ${baseSrc}_1440.${format} 1440w
      `.trim(),
      type: `image/${format}`
    };
  };

  return (
    <div 
      className={`relative overflow-hidden ${isLoaded ? '' : 'bg-gray-200'}`} 
      style={{ width, height, aspectRatio: width && height ? `${width} / ${height}` : 'auto' }}
    >
      <picture>
        {/* AVIF format - best compression but less support */}
        {bestFormat === 'avif' && (
          <source
            srcSet={generateSourceForFormat('avif').srcSet}
            type="image/avif"
            sizes={sizes}
          />
        )}
        
        {/* WebP format - good compression, good support */}
        {bestFormat === 'avif' || bestFormat === 'webp' ? (
          <source
            srcSet={generateSourceForFormat('webp').srcSet}
            type="image/webp"
            sizes={sizes}
          />
        ) : null}
        
        {/* Default format (jpg/png) for fallback */}
        <img
          src={src}
          alt={alt || ''}
          width={width}
          height={height}
          loading={loadingStrategy}
          onLoad={handleImageLoad}
          className={`
            ${className || ''} 
            transition-opacity duration-300 
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            objectFit,
            width: '100%',
            height: '100%',
          }}
        />
      </picture>
      
      {/* Show low-quality placeholder while loading */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ aspectRatio: width && height ? `${width} / ${height}` : 'auto' }}
        />
      )}
    </div>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  priority: PropTypes.bool,
  objectFit: PropTypes.oneOf(['contain', 'cover', 'fill', 'none', 'scale-down']),
  sizes: PropTypes.string,
  onLoad: PropTypes.func,
};

export default OptimizedImage; 