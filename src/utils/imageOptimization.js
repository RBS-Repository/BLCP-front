/**
 * Image optimization utilities
 * Helps with loading optimized images based on screen size and browser support
 */

/**
 * Checks if the browser supports WebP format
 * @returns {Promise<boolean>} True if WebP is supported
 */
export const supportsWebP = async () => {
  if (!window.createImageBitmap) return false;
  
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());
  
  return createImageBitmap(blob).then(() => true, () => false);
};

/**
 * Checks if the browser supports AVIF format
 * @returns {Promise<boolean>} True if AVIF is supported
 */
export const supportsAVIF = async () => {
  if (!window.createImageBitmap) return false;
  
  const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  const blob = await fetch(avifData).then(r => r.blob());
  
  return createImageBitmap(blob).then(() => true, () => false);
};

/**
 * Gets the best supported image format for the current browser
 * @returns {Promise<string>} The best supported format extension
 */
export const getBestImageFormat = async () => {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpg';
};

/**
 * Converts an image path to the best supported format
 * @param {string} imagePath - Original image path
 * @returns {Promise<string>} Path with the best supported format
 */
export const getOptimizedImagePath = async (imagePath) => {
  const format = await getBestImageFormat();
  // Check if the path already has an extension
  if (imagePath.match(/\.(jpe?g|png|gif|svg|webp|avif)$/i)) {
    return imagePath.replace(/\.(jpe?g|png|gif|svg|webp|avif)$/i, `.${format}`);
  }
  return `${imagePath}.${format}`;
};

/**
 * Returns the appropriate image size based on device width
 * @param {Object} options - Size options
 * @param {string} options.src - Original image source
 * @param {number} options.defaultWidth - Default width if no size matches
 * @returns {string} Sized image URL
 */
export const getResponsiveImageUrl = ({ src, defaultWidth = 800 }) => {
  // If we're server-side rendering, return default size
  if (typeof window === 'undefined') {
    return src.replace(/\.(jpe?g|png|gif|webp|avif)$/i, `_${defaultWidth}.$1`);
  }

  // Define breakpoints and corresponding image sizes
  const breakpoints = [
    { width: 480, size: 480 },   // Mobile
    { width: 768, size: 720 },   // Tablet
    { width: 992, size: 920 },   // Small desktop
    { width: 1200, size: 1080 }, // Desktop
    { width: 1920, size: 1440 }, // Large desktop
    { width: Infinity, size: defaultWidth } // Fallback
  ];

  const deviceWidth = window.innerWidth;
  const breakpoint = breakpoints.find(bp => deviceWidth <= bp.width);
  const size = breakpoint ? breakpoint.size : defaultWidth;

  // Replace the file extension with size and keep original extension
  return src.replace(/(\.(jpe?g|png|gif|webp|avif))$/i, `_${size}$1`);
};

/**
 * Creates a complete picture element with multiple sources for responsive images
 * @param {Object} options - Options for the picture element
 * @param {string} options.src - Original image source
 * @param {string} options.alt - Alt text for the image
 * @param {number} options.width - Display width
 * @param {number} options.height - Display height
 * @param {string} options.className - CSS class for the img element
 * @param {string} options.loading - Loading strategy ('lazy', 'eager')
 * @returns {JSX.Element} Picture element with sources
 */
export const OptimizedPicture = ({ src, alt, width, height, className, loading = 'lazy' }) => {
  // This would need to be implemented in a React component that renders a picture element
  // with appropriate sources for different formats and sizes
  // This is a placeholder showing the structure
  return `
    <picture>
      <source srcSet="${src.replace(/\.(jpe?g|png)$/i, '.avif')}" type="image/avif" />
      <source srcSet="${src.replace(/\.(jpe?g|png)$/i, '.webp')}" type="image/webp" />
      <img 
        src="${src}" 
        alt="${alt || ''}" 
        width="${width}" 
        height="${height}" 
        className="${className || ''}" 
        loading="${loading}"
      />
    </picture>
  `;
};

// Utility to help with lazy-loading images that are below the fold
export const lazyLoadBelowFoldImages = () => {
  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      // If the image is not in the initial viewport, use lazy loading
      if (!isInViewport(img)) {
        img.setAttribute('loading', 'lazy');
      } else {
        // For critical above-the-fold images, load eagerly
        img.setAttribute('loading', 'eager');
      }
    });
  } else {
    // For browsers that don't support native lazy loading, 
    // could implement IntersectionObserver based solution here
    console.log('Browser does not support native lazy loading');
  }
};

// Helper function to check if an element is in the viewport
const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top <= window.innerHeight &&
    rect.bottom >= 0
  );
};

export default {
  getOptimizedImagePath,
  getResponsiveImageUrl,
  supportsWebP,
  supportsAVIF,
  getBestImageFormat,
  lazyLoadBelowFoldImages
}; 