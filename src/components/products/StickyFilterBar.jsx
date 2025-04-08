import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaFilter, FaSortAmountDown, FaSearch } from 'react-icons/fa';
import GridLayoutControls from './GridLayoutControls';

const StickyFilterBar = ({
  activeFilters = {},
  onClearFilter = () => {},
  onClearAll = () => {},
  gridLayout = 'standard',
  onLayoutChange = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  sortOptions = [],
  sortBy = 'featured',
  onSortChange = () => {}
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80); // Default header height (5rem)
  
  // Effect to track header height changes
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        const height = header.offsetHeight;
        setHeaderHeight(height);
      }
    };
    
    // Initial height
    updateHeaderHeight();
    
    // Update on scroll as header might change size
    window.addEventListener('scroll', updateHeaderHeight);
    // Update on resize as well
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => {
      window.removeEventListener('scroll', updateHeaderHeight);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);
  
  // Helper function to check if there are any active filters
  const hasActiveFilters = (activeFilters) => {
    return activeFilters.category !== 'all' || 
           activeFilters.searchQuery || 
           activeFilters.sortBy !== 'featured';
  };
  
  // Get label for sort option
  const getSortLabel = (sortId) => {
    const option = sortOptions.find(opt => opt.id === sortId);
    return option ? option.name : 'Featured';
  };
  
  return (
    <motion.div
      className="sticky z-30 bg-white shadow-md border-b border-gray-200"
      style={{ 
        top: `${headerHeight}px`,
        transition: 'top 0.3s ease, transform 0.3s ease-in-out' // Enhanced transition
      }}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Active Filters */}
          <div className="flex items-center flex-grow gap-2">
            <span className="text-gray-700 font-medium flex items-center">
              <FaFilter className="mr-2" /> 
              Filters:
            </span>
            
            {hasActiveFilters(activeFilters) ? (
              <div className="flex flex-wrap gap-2 items-center">
                {/* Category filter pill */}
                {activeFilters.category && (
                  <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm gap-2">
                    <span className="text-gray-800">{activeFilters.category}</span>
                    <button 
                      onClick={() => onClearFilter('category')}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Clear category filter"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                )}
                
                {/* Search query pill */}
                {activeFilters.search && (
                  <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm gap-2">
                    <span className="text-gray-800">"{activeFilters.search}"</span>
                    <button 
                      onClick={() => onClearFilter('search')}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Clear search filter"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                )}
                
                {/* Sort option pill */}
                {activeFilters.sort && (
                  <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm gap-2">
                    <span className="text-gray-800">Sort: {getSortLabel(activeFilters.sort)}</span>
                    <button 
                      onClick={() => onClearFilter('sort')}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Clear sort filter"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                )}
                
                {/* Clear all button */}
                <button 
                  onClick={onClearAll}
                  className="ml-2 text-sm text-[#363a94] hover:underline"
                  aria-label="Clear all filters"
                >
                  Clear All
                </button>
              </div>
            ) : (
              <span className="text-gray-500 text-sm">No active filters</span>
            )}
          </div>
          
          {/* Layout controls and quick filters */}
          <div className="flex items-center gap-2">
            {/* Expandable search */}
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 pr-4 py-1 border border-gray-300 rounded-full text-sm focus:ring-1 focus:ring-[#363a94] focus:border-[#363a94] outline-none"
                  autoFocus
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowSearch(false)}
                  aria-label="Close search"
                >
                  <FaTimes size={12} />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                aria-label="Open search"
              >
                <FaSearch size={14} />
              </button>
            )}
            
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="appearance-none pl-7 pr-8 py-1 border border-gray-300 rounded-full text-sm focus:ring-1 focus:ring-[#363a94] focus:border-[#363a94] outline-none cursor-pointer"
                aria-label="Sort options"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <FaSortAmountDown className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>
            
            {/* Grid layout controls */}
            <GridLayoutControls 
              activeLayout={gridLayout}
              onLayoutChange={onLayoutChange}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StickyFilterBar; 