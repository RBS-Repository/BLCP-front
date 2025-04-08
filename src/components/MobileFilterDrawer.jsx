import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import PriceRangeFilter from './PriceRangeFilter';

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onCategoryChange,
  sortOptions,
  sortBy,
  onSortChange,
  priceRange,
  selectedPriceRange,
  onPriceRangeChange
}) => {
  // Animation variants
  const drawerVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 30 
      }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { 
        duration: 0.2,
        ease: 'easeInOut' 
      }
    }
  };
  
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={backdropVariants}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-4/5 max-w-sm bg-white z-50 shadow-lg overflow-y-auto"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={drawerVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close filters"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            {/* Filter Content */}
            <div className="p-4">
              {/* Sort Options */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                        selectedCategory === category.id 
                          ? 'bg-[#363a94] text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => onCategoryChange(category.id)}
                      role="radio"
                      aria-checked={selectedCategory === category.id}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Range Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
                <div className="flex items-center mb-2">
                  <span className="text-sm text-[#363a94]">
                    ₱{selectedPriceRange.min?.toLocaleString() || priceRange.min.toLocaleString()} - 
                    ₱{selectedPriceRange.max?.toLocaleString() || priceRange.max.toLocaleString()}
                  </span>
                </div>
                <PriceRangeFilter
                  minPrice={priceRange.min}
                  maxPrice={priceRange.max}
                  initialMin={selectedPriceRange.min}
                  initialMax={selectedPriceRange.max}
                  onPriceChange={onPriceRangeChange}
                />
              </div>
            </div>
            
            {/* Apply Filters Button */}
            <div className="p-4 border-t sticky bottom-0 bg-white">
              <button 
                onClick={onClose}
                className="w-full px-4 py-2 bg-[#363a94] text-white rounded-lg hover:bg-[#2d327d] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterDrawer; 