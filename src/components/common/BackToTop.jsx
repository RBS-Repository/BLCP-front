import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BackToTop = ({ threshold = 300, right = 6, bottom = 6 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled beyond threshold
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    
    // Initial check on mount
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  // Scroll to top with smooth behavior
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            transition: { type: 'spring', stiffness: 300, damping: 20 }
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`fixed z-50 p-3 rounded-full shadow-lg bg-[#363a94] text-white hover:bg-[#2a2d73] focus:outline-none`}
          style={{ 
            right: `${right}rem`, 
            bottom: `${bottom}rem`,
          }}
          aria-label="Back to top"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 15l7-7 7 7"
            />
          </svg>
          
          {/* Ripple effect on hover */}
          <span className="absolute inset-0 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full hover:bg-white/20 transition-all duration-300"></span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTop; 