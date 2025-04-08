import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SiteLoader = ({ isLoading }) => {
  // Add internal state to properly manage exit animations
  const [shouldRender, setShouldRender] = useState(isLoading);
  
  // Watch for changes to isLoading prop
  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
    } else {
      // Use a longer delay to ensure exit animations complete fully
      const exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 1200); // Extended to allow full fade out
      
      return () => clearTimeout(exitTimer);
    }
  }, [isLoading]);

  // We'll return the AnimatePresence wrapper even when not loading
  // This ensures the exit animation plays properly
  return (
    <AnimatePresence mode="wait" onExitComplete={() => setShouldRender(false)}>
      {shouldRender && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { 
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1] // Custom ease for smoother exit
            }
          }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, #2a2d73 0%, #363a94 100%)',
            pointerEvents: isLoading ? 'auto' : 'none', // Prevent interaction once loading is done
            zIndex: 99999, // Extremely high z-index to stay above everything
          }}
        >
          <div className="relative">
            {/* Animated logo container */}
            <motion.div
              className="flex flex-col items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ 
                scale: 0.95, 
                opacity: 0,
                transition: { duration: 0.6 } // Longer exit duration
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            >
              {/* Pulsing circle backdrop */}
              <motion.div
                className="absolute w-48 h-48 rounded-full bg-white/10"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Outer spinning ring */}
              <motion.div
                className="w-32 h-32 rounded-full border-4 border-white/30 border-t-white/80"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Inner spinning ring - opposite direction */}
              <motion.div
                className="absolute w-24 h-24 rounded-full border-4 border-white/20 border-b-white/60"
                animate={{ rotate: -360 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              
              {/* Brand logo/icon in the center */}
              <motion.div 
                className="absolute flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ 
                  scale: 1.2, 
                  opacity: 0,
                  transition: { duration: 0.6, delay: 0.1 } 
                }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                <motion.h2 
                  className="text-xl font-bold text-[#363a94]"
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  BLCP
                </motion.h2>
              </motion.div>
            </motion.div>
            
            {/* Loading text with typing animation */}
            <motion.div 
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                y: -10,
                transition: { duration: 0.5 } // Extended exit duration
              }}
              transition={{ delay: 0.4 }}
            >
              <LoadingText />
              <motion.p 
                className="text-white/70 text-sm mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Preparing your experience...
              </motion.p>
            </motion.div>
            
            {/* Decorative elements */}
            <DecorativeElements />
            
            {/* Success checkmark that appears right before exit */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: isLoading ? 0 : 1, 
                opacity: isLoading ? 0 : 1 
              }}
              exit={{ 
                scale: 1.5, 
                opacity: 0,
                transition: { duration: 0.7 } // Extended exit duration
              }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              <svg 
                className="w-16 h-16 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Typing animation for "Loading" text
const LoadingText = () => {
  const words = "Loading";
  
  return (
    <div className="flex justify-center">
      {words.split('').map((char, index) => (
        <motion.span
          key={index}
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            delay: 0.5 + index * 0.1,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 0.5,
            duration: 0.3
          }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="ml-1 text-2xl font-bold text-white"
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
      >
        .
      </motion.span>
      <motion.span
        className="ml-1 text-2xl font-bold text-white"
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatDelay: 0.2,
          delay: 0.3,
        }}
      >
        .
      </motion.span>
      <motion.span
        className="ml-1 text-2xl font-bold text-white"
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatDelay: 0.2,
          delay: 0.6,
        }}
      >
        .
      </motion.span>
    </div>
  );
};

// Decorative floating elements
const DecorativeElements = () => {
  return (
    <>
      {/* Floating circles and squares */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${i % 2 === 0 ? 'bg-white/10' : 'border border-white/20'}`}
          style={{
            width: `${Math.random() * 40 + 10}px`,
            height: `${Math.random() * 40 + 10}px`,
            left: `${Math.random() * 300 - 150}px`,
            top: `${Math.random() * 300 - 150}px`,
          }}
          animate={{
            y: [0, Math.random() * 30 - 15],
            x: [0, Math.random() * 30 - 15],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </>
  );
};

export default SiteLoader; 