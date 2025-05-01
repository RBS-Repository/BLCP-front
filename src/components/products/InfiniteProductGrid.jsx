import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import ProductCardSkeleton from '../common/ProductCardSkeleton';
import GalleryCard from './GalleryCard';
import { FaArrowDown, FaChevronUp } from 'react-icons/fa';

const InfiniteProductGrid = ({
  products = [],
  sortProducts,
  loading = false,
  gridLayout = 'standard',
  onLoadMore = () => {},
  hasMore = false,
  onQuickView = () => {},
  addToRecentlyViewed = () => {},
  loadingSkeletonCount = 8
}) => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isManualLoadVisible, setIsManualLoadVisible] = useState(false);
  const [loadBoundaryVisible, setLoadBoundaryVisible] = useState(false);
  const observer = useRef();
  const loadMoreRef = useRef(null);
  
  // Sort products if needed
  const sortedProducts = sortProducts ? sortProducts(products) : products;
  
  // Track scroll position for back to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollToTop(scrollTop > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Intersection observer for infinite scroll
  const lastProductElementRef = useCallback((node) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Use a small timeout to avoid race conditions
        setTimeout(() => {
          onLoadMore();
        }, 100);
        
        // Only show manual load button if there are many products (optional UX improvement)
        if (products.length > 20 && document.documentElement.scrollTop > 1000) {
          setIsManualLoadVisible(true);
        } else {
          setIsManualLoadVisible(false);
        }
        setLoadBoundaryVisible(true);
      }
    }, { 
      rootMargin: '300px', // Reduce the root margin to avoid triggering too early
      threshold: 0.1 // Lower threshold so it triggers more easily
    });
    
    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore, onLoadMore, products.length]);
  
  // We need a secondary observer to watch for the end of the list
  useEffect(() => {
    // Create a sentinel element at the bottom of the grid
    const sentinelElement = document.createElement('div');
    sentinelElement.id = 'product-grid-end-sentinel';
    sentinelElement.style.height = '20px';
    sentinelElement.style.width = '100%';
    sentinelElement.style.marginTop = '20px';
    
    // Append it to the container
    const gridContainer = document.querySelector('.product-grid-container');
    if (gridContainer) {
      // Remove existing sentinel if it exists to prevent duplicates
      const existingSentinel = document.getElementById('product-grid-end-sentinel');
      if (existingSentinel) {
        existingSentinel.remove();
      }
      
      gridContainer.appendChild(sentinelElement);
      
      // Create an observer for this sentinel
      const endObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          // Use requestAnimationFrame to avoid blocking UI
          requestAnimationFrame(() => {
            onLoadMore();
          });
        }
      }, { 
        rootMargin: '100px', // Reduce margin to prevent premature loading
        threshold: 0 
      });
      
      endObserver.observe(sentinelElement);
      
      return () => {
        endObserver.disconnect();
        if (gridContainer.contains(sentinelElement)) {
          gridContainer.removeChild(sentinelElement);
        }
      };
    }
  }, [hasMore, loading, onLoadMore]);
  
  // If we don't have many products, force loading more on mount
  useEffect(() => {
    if (hasMore && !loading && products.length <= 12) {
      // Use a small timeout to prevent immediate loading
      const timer = setTimeout(() => {
        onLoadMore();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasMore, loading, onLoadMore, products.length]);
  
  // Add a resize observer to detect if all content fits in viewport
  useEffect(() => {
    // If the grid doesn't fill the viewport and we have more to load, load more
    const checkViewportFill = () => {
      const gridElement = document.querySelector('.product-grid-container');
      if (gridElement) {
        const viewportHeight = window.innerHeight;
        const gridRect = gridElement.getBoundingClientRect();
        const gridBottom = gridRect.bottom;
        
        // If grid bottom is within viewport and we have more to load
        if (gridBottom < viewportHeight && hasMore && !loading) {
          // Use a small timeout to avoid race conditions
          setTimeout(() => {
            onLoadMore();
          }, 300);
        }
      }
    };
    
    // Check on mount and after any resize, but with a debounce
    let resizeTimer;
    const debouncedCheck = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkViewportFill, 200);
    };
    
    checkViewportFill();
    window.addEventListener('resize', debouncedCheck);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedCheck);
    };
  }, [hasMore, loading, onLoadMore]);
  
  // Handle manual load more
  const handleManualLoadMore = (e) => {
    // Prevent default to avoid any potential page refresh
    if (e) e.preventDefault();
    
    setIsManualLoadVisible(false);
    onLoadMore();
  };
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Get grid layout classes
  const getGridClasses = () => {
    switch (gridLayout) {
      case 'compact':
        return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'gallery':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'list':
        return 'grid-cols-1';
      case 'standard':
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3';
    }
  };
  
  // Add this helper function near the top of the component
  const normalizeProduct = (product) => {
    if (!product) return product;
    
    // Create a normalized copy of the product
    const normalized = {...product};
    
    // Handle category normalization
    if (normalized.category && typeof normalized.category === 'object') {
      // Keep the object but ensure it has a toString method for accidental rendering
      normalized.category = {
        ...normalized.category,
        toString: () => normalized.category.name || 'Uncategorized'
      };
    }
    
    return normalized;
  };
  
  // Render the appropriate card component based on layout
  const renderProductCard = (product, index) => {
    const normalizedProduct = normalizeProduct(product);
    
    const isLastElement = index === sortedProducts.length - 1;
    const ref = isLastElement ? lastProductElementRef : null;
    
    if (gridLayout === 'gallery') {
      return (
        <motion.div
          key={normalizedProduct._id || index}
          className="flex justify-center"
        >
          <GalleryCard
            product={normalizedProduct}
            onQuickView={() => onQuickView(normalizedProduct)}
            addToRecentlyViewed={() => addToRecentlyViewed(normalizedProduct)}
            ref={ref}
          />
        </motion.div>
      );
    }
    
    return (
      <motion.div
        key={normalizedProduct._id || index}
        className="flex justify-center"
      >
        <ProductCard
          product={normalizedProduct}
          viewMode={gridLayout === 'list' ? 'list' : 'grid'} 
          onQuickView={() => onQuickView(normalizedProduct)}
          addToRecentlyViewed={() => addToRecentlyViewed(normalizedProduct)}
          ref={ref}
          delay={index * 0.05}
          gridLayout={gridLayout}
        />
      </motion.div>
    );
  };
  
  return (
    <div className="relative product-grid-container">
      {/* Products Grid */}
      <motion.div className={`grid ${getGridClasses()} gap-6 md:gap-8`}>
        {sortedProducts.map((product, index) => renderProductCard(product, index))}
        
        {/* Loading skeletons */}
        {loading && (
          [...Array(loadingSkeletonCount)].map((_, index) => (
            <ProductCardSkeleton 
              key={`skeleton-${index}`} 
              viewMode={gridLayout === 'list' ? 'list' : 'grid'}
              layout={gridLayout}
            />
          ))
        )}
      </motion.div>
      
      {/* Load boundary - Make sure this is always visible */}
      {hasMore && (
        <div 
          className="flex justify-center my-8 py-4"
          ref={loadMoreRef}
        >
          {loading ? (
            <div className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 flex items-center">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[#363a94] animate-spin mr-2" />
              <span>Loading more products...</span>
            </div>
          ) : (
            <motion.button
              onClick={handleManualLoadMore}
              type="button" // Explicitly set button type to prevent default form submission
              className="px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 flex items-center hover:bg-gray-50 transition-colors"
              whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              whileTap={{ y: 0 }}
              aria-label="Load more products"
            >
              <FaArrowDown className="mr-2" />
              <span>Load More Products</span>
            </motion.button>
          )}
        </div>
      )}
      
      {/* Back to top button */}
      <AnimatePresence>
        {showScrollToTop && (
          <motion.button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 bg-[#363a94] text-white rounded-full shadow-md z-50"
            aria-label="Scroll to top"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaChevronUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfiniteProductGrid; 