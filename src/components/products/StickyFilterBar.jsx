import React, { useState } from 'react';
import { FaSearch, FaTimes, FaFilter, FaList, FaGripHorizontal, FaSortAmountDown } from 'react-icons/fa';
import { motion } from 'framer-motion';

const StickyFilterBar = ({ 
  activeFilters, 
  onClearFilter, 
  onClearAll, 
  gridLayout, 
  onLayoutChange, 
  searchQuery, 
  onSearchChange,
  sortOptions,
  sortBy,
  onSortChange
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || '');
  
  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    onSearchChange(value);
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchChange(inputValue);
    setShowSearch(false);
  };

  return (
    <div className="sticky-filter-bar w-full py-2 px-3">
      <div className="max-w-7xl mx-auto">
        {showSearch ? (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center"
            onSubmit={handleSearchSubmit}
          >
            <div className="relative flex-grow">
              <input
                type="text"
                value={inputValue}
                onChange={handleSearchChange}
                placeholder="Search products..."
                className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#363a94] focus:border-transparent text-sm"
                autoFocus
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FaSearch size={14} />
              </div>
              {inputValue && (
                <button 
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    onSearchChange('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setShowSearch(false)}
              className="ml-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FaTimes size={16} />
            </button>
          </motion.form>
        ) : (
          <div className="flex items-center justify-between">
            {/* Left side - Active filters or search button */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                aria-label="Search products"
              >
                <FaSearch size={14} />
              </button>
              
              {/* Display active category filter */}
              {activeFilters.category && (
                <div className="flex items-center bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs">
                  <span className="max-w-[120px] break-words" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                    {activeFilters.category}
                  </span>
                  <button 
                    onClick={() => onClearFilter('category')}
                    className="ml-1 text-purple-500 hover:text-purple-700 flex-shrink-0"
                  >
                    <FaTimes size={8} />
                  </button>
                </div>
              )}
              
              {/* Display active search filter */}
              {activeFilters.search && (
                <div className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs">
                  <span className="max-w-[120px] break-words" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                    {activeFilters.search}
                  </span>
                  <button 
                    onClick={() => onClearFilter('search')}
                    className="ml-1 text-blue-500 hover:text-blue-700 flex-shrink-0"
                  >
                    <FaTimes size={8} />
                  </button>
                </div>
              )}
              
              {/* Display active sort filter */}
              {activeFilters.sort && (
                <div className="flex items-center bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs">
                  <span className="max-w-[120px] break-words" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                    {sortOptions.find(opt => opt.id === activeFilters.sort)?.name || activeFilters.sort}
                  </span>
                  <button 
                    onClick={() => onClearFilter('sort')}
                    className="ml-1 text-amber-500 hover:text-amber-700 flex-shrink-0"
                  >
                    <FaTimes size={8} />
                  </button>
                </div>
              )}
              
              {/* Show clear all button if any filter is active */}
              {(activeFilters.category || activeFilters.search || activeFilters.sort) && (
                <button
                  onClick={onClearAll}
                  className="text-xs text-[#363a94] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Right side - View toggle and sort */}
            <div className="flex items-center space-x-2">
              {/* View mode toggle */}
              <button
                onClick={() => onLayoutChange(gridLayout === 'list' ? 'compact' : 'list')}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                aria-label={`Switch to ${gridLayout === 'list' ? 'grid' : 'list'} view`}
              >
                {gridLayout === 'list' ? <FaGripHorizontal size={14} /> : <FaList size={14} />}
              </button>
              
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="appearance-none pl-7 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-xs"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <FaSortAmountDown size={10} className="text-gray-500" />
                </div>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyFilterBar; 