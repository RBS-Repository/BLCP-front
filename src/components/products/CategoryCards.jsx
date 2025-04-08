import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaLeaf, 
  FaSpa, 
  FaGem, 
  FaSprayCan, 
  FaSun, 
  FaSeedling, 
  FaShieldAlt, 
  FaUsers,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

// Map of category IDs to their respective icons and background colors
const CATEGORY_ICONS = {
  // Add your actual categories here
  'facial': { icon: FaSpa, color: '#f0fff4', iconColor: '#38a169' },
  'body': { icon: FaSun, color: '#fff5f5', iconColor: '#e53e3e' },
  'professional': { icon: FaGem, color: '#ebf4ff', iconColor: '#4299e1' },
  'skincare': { icon: FaLeaf, color: '#f0fff4', iconColor: '#48bb78' },
  'moisturizer': { icon: FaSeedling, color: '#fffaf0', iconColor: '#ed8936' },
  'cleanser': { icon: FaSprayCan, color: '#e6fffa', iconColor: '#38b2ac' },
  'spf': { icon: FaShieldAlt, color: '#fff5f7', iconColor: '#ed64a6' },
  'all': { icon: FaUsers, color: '#f7fafc', iconColor: '#4a5568' }
};

// Default icon for categories not in the map
const DEFAULT_CATEGORY = { icon: FaSpa, color: '#f7fafc', iconColor: '#4a5568' };

const CategoryCards = ({ 
  categories = [], 
  selectedCategory = 'all', 
  onCategoryChange = () => {},
  layout = 'grid' // 'grid' or 'carousel'
}) => {
  const carouselRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  // Check if overflow is occurring and update arrow visibility
  useEffect(() => {
    if (layout !== 'carousel' || !carouselRef.current) return;
    
    const checkOverflow = () => {
      const container = carouselRef.current;
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowRightArrow(hasOverflow && container.scrollLeft < container.scrollWidth - container.clientWidth);
      setShowLeftArrow(container.scrollLeft > 0);
    };
    
    checkOverflow();
    
    const container = carouselRef.current;
    container.addEventListener('scroll', checkOverflow);
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      container.removeEventListener('scroll', checkOverflow);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [layout, categories]);
  
  // Scroll carousel functions
  const scrollLeft = () => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };
  
  const scrollRight = () => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };
  
  // Get gradient color for category card
  const getCategoryGradient = (index) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-violet-500 to-purple-600',
      'from-cyan-500 to-blue-600',
      'from-lime-500 to-green-600',
      'from-fuchsia-500 to-pink-600',
    ];
    
    return gradients[index % gradients.length];
  };
  
  // If grid layout, show category cards in grid
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            whileTap={{ y: 0, scale: 0.98 }}
            className={`
              cursor-pointer rounded-xl overflow-hidden shadow-md
              bg-gradient-to-br ${getCategoryGradient(index)}
              ${selectedCategory === category.id ? 'ring-4 ring-offset-2 ring-[#363a94]' : ''}
            `}
            onClick={() => onCategoryChange(category.id)}
          >
            <div className="h-full py-6 px-4 flex items-center justify-center text-center">
              <h3 className="text-white font-semibold">{category.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
  
  // Carousel layout for horizontal scrolling
  return (
    <div className="relative">
      {/* Left Arrow */}
      {showLeftArrow && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2"
          onClick={scrollLeft}
          aria-label="Scroll categories left"
        >
          <FaChevronLeft className="text-gray-600" />
        </motion.button>
      )}
      
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto pb-4 pt-2 px-2 -mx-2 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            whileTap={{ y: 0, scale: 0.98 }}
            className={`
              flex-shrink-0 mx-2 cursor-pointer rounded-xl overflow-hidden shadow-md
              ${selectedCategory === category.id 
                ? 'bg-[#363a94] text-white' 
                : 'bg-white text-gray-800 hover:bg-gray-50'}
            `}
            onClick={() => onCategoryChange(category.id)}
            style={{ minWidth: '150px' }}
          >
            <div className="py-4 px-5 flex items-center justify-center text-center">
              <h3 className="font-medium">{category.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Right Arrow */}
      {showRightArrow && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2"
          onClick={scrollRight}
          aria-label="Scroll categories right"
        >
          <FaChevronRight className="text-gray-600" />
        </motion.button>
      )}
    </div>
  );
};

export default CategoryCards; 