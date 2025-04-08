import React from 'react';
import { FaTimes, FaSearch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  sortOptions,
  sortBy,
  onSortChange,
  searchQuery = '',
  onSearchChange = () => {},
  onClearAll = () => {}
}) => {
  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl z-[70] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium">Filters</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close filters"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Filter options */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Search Input - Enhanced and more prominent */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Search Products</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#363a94] focus:border-[#363a94] bg-gray-50 hover:bg-white transition-colors"
                    autoFocus
                  />
                  <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  {searchQuery && (
                    <button 
                      onClick={() => onSearchChange('')}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                      aria-label="Clear search"
                    >
                      <FaTimes size={16} />
                    </button>
                  )}
                </div>
                {/* Search suggestions or quick filters could go here */}
                {searchQuery && (
                  <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                    <span>Press Apply to search for "{searchQuery}"</span>
                    <button 
                      className="text-[#363a94] hover:underline"
                      onClick={() => {
                        onSearchChange(searchQuery);
                        onClose();
                      }}
                    >
                      Search now
                    </button>
                  </div>
                )}
              </div>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        id={`mobile-category-${category.id}`}
                        name="mobile-category"
                        value={category.id}
                        checked={selectedCategory === category.id}
                        onChange={() => onSelectCategory(category.id)}
                        className="h-4 w-4 text-[#363a94] focus:ring-[#363a94]"
                      />
                      <label
                        htmlFor={`mobile-category-${category.id}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Sort options */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Sort By</h3>
                <div className="space-y-2">
                  {sortOptions.map(option => (
                    <div key={option.id} className="flex items-center">
                      <input
                        type="radio"
                        id={`mobile-sort-${option.id}`}
                        name="mobile-sort"
                        value={option.id}
                        checked={sortBy === option.id}
                        onChange={() => onSortChange(option.id)}
                        className="h-4 w-4 text-[#363a94] focus:ring-[#363a94]"
                      />
                      <label
                        htmlFor={`mobile-sort-${option.id}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {option.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t p-4 flex flex-col gap-3">
              <button
                onClick={onClearAll}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All Filters
              </button>
              <button
                onClick={onClose}
                className="w-full bg-[#363a94] text-white py-2 px-4 rounded-lg hover:bg-[#2a2d73] transition-colors flex items-center justify-center"
              >
                {searchQuery ? (
                  <>
                    <FaSearch className="mr-2" size={14} />
                    Search & Apply Filters
                  </>
                ) : (
                  'Apply Filters'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterDrawer; 