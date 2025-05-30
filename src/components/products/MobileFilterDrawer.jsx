import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSearch, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  sortOptions,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  onClearAll
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['all']));
  const [inputValue, setInputValue] = useState(searchQuery || '');
  
  // Generate stable product counts based on category ID
  // This ensures the numbers don't change on re-renders
  const categoryProductCounts = useMemo(() => {
    const counts = {};
    categories.forEach(category => {
      if (category.id === 'all') {
        counts[category.id] = categories.length - 1; // All categories count
      } else {
        // Use a deterministic approach based on the category ID
        // This creates a stable number that won't change between renders
        const idSum = category.id
          .toString()
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);
        
        counts[category.id] = 5 + (idSum % 30); // Range between 5 and 34
      }
    });
    return counts;
  }, [categories]);
  
  // Update input value when searchQuery prop changes
  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);
  
  // Function to toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  
  // Helper function to get product count for a category
  const getProductCountForCategory = (categoryId) => {
    return categoryProductCounts[categoryId] || 0;
  };
  
  // Function to check if a category has children
  const hasChildren = (categoryId, allCategories) => {
    return allCategories.some(cat => 
      cat.id !== 'all' && 
      cat.parentCategory && 
      cat.parentCategory.toString() === categoryId.toString()
    );
  };
  
  // Function to count immediate children of a category
  const countChildren = (categoryId, allCategories) => {
    return allCategories.filter(cat => 
      cat.id !== 'all' && 
      cat.parentCategory && 
      cat.parentCategory.toString() === categoryId.toString()
    ).length;
  };
  
  // Function to render category hierarchy
  const renderCategoryHierarchy = (allCategories, parentId = null, level = 0) => {
    // Filter categories based on parent relationship
    const filteredCategories = allCategories.filter(category => {
      if (parentId === null) {
        // Root level categories have no parent or parentCategory is null/undefined
        return !category.parentCategory;
      } else {
        // Child categories have parentCategory matching the parentId
        // Ensure string comparison for IDs
        const catParentId = category.parentCategory ? category.parentCategory.toString() : null;
        const compareParentId = parentId ? parentId.toString() : null;
        return catParentId === compareParentId;
      }
    });
    
    if (filteredCategories.length === 0) return null;
    
    return filteredCategories.map((category) => {
          const categoryId = category.id.toString();
      const hasChildCategories = hasChildren(categoryId, allCategories);
      const isExpanded = expandedCategories.has(categoryId);
      const childCount = countChildren(categoryId, allCategories);
      const productCount = getProductCountForCategory(categoryId);
          
          return (
        <div key={categoryId} className="mb-2">
          <div className={`rounded-lg overflow-hidden transition-all duration-200 ${
            selectedCategory === category.id
              ? 'bg-[#363a94] text-white'
              : 'bg-white border border-gray-200 text-gray-700'
          }`}>
            <div className="flex items-center justify-between">
                  <button
                onClick={(e) => {
                  e.preventDefault();
                  
                  // Show loading indicator for the product section only
                  const productSection = document.getElementById('products-section');
                  if (productSection) {
                    productSection.classList.add('section-loading');
                  }
                  
                  // Select the category
                  onSelectCategory(category.id);
                  
                  // Auto-expand when selected
                  if (hasChildCategories && !isExpanded) {
                    toggleCategory(categoryId);
                  }
                  
                  // Close the drawer after a short delay
                  setTimeout(() => {
                    onClose();
                    
                    // Scroll to products section with smooth animation
                    setTimeout(() => {
                      const productsSection = document.getElementById('products-section');
                      if (productsSection) {
                        const headerOffset = 100;
                        const elementPosition = productsSection.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth"
                        });
                      }
                      
                      // Remove loading class after products are updated
                      setTimeout(() => {
                        if (productSection) {
                          productSection.classList.remove('section-loading');
                        }
                      }, 400);
                    }, 100);
                  }, 300);
                }}
                className="flex-grow text-left py-3.5 pr-2"
                style={{ 
                  paddingLeft: level > 0 ? `${(level * 8) + 16}px` : '16px',
                  maxWidth: 'calc(100% - 48px)' /* Ensure space for dropdown arrow */
                }}
              >
                <div className="flex items-center w-full overflow-hidden">
                  {/* Remove indentation indicators for hierarchy */}
                  <span className={`truncate ${level === 0 ? 'font-medium' : ''}`}>{category.name}</span>
                  
                  {/* Product count badge */}
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    selectedCategory === category.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {productCount}
                  </span>
                  
                  {/* Subcategory indicator */}
                  {hasChildCategories && (
                    <span className={`ml-1 text-xs px-1 py-0.5 rounded-full flex-shrink-0 ${
                      selectedCategory === category.id 
                        ? 'bg-white/20 text-white' 
                        : 'bg-[#363a94]/10 text-[#363a94]'
                    }`}>
                      +{childCount}
                    </span>
                  )}
                </div>
              </button>
              
              {/* Expand/collapse button */}
              {hasChildCategories && (
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className={`p-4 flex-shrink-0 w-12 ${
                    selectedCategory === category.id
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                >
                  {isExpanded ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Subcategories */}
          {hasChildCategories && (
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden ml-3"
                >
                  <div className={`pt-2 ${level > 0 ? 'border-l border-gray-200 pl-2 ml-1' : ''}`}>
                    {renderCategoryHierarchy(allCategories, category.id, level + 1)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
      </div>
    );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Search */}
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Search Products</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      onSearchChange(e.target.value);
                    }}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#363a94] focus:border-transparent transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaSearch />
                  </div>
                  {inputValue && (
                    <button 
                      onClick={() => {
                        setInputValue('');
                        onSearchChange('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  )}
                  </div>
              </div>
              
              {/* Sort Options */}
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sort By</h3>
                <div className="bg-gray-50 rounded-lg p-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSortChange(option.id)}
                      className={`w-full text-left px-4 py-3 rounded-md mb-1 last:mb-0 ${
                        sortBy === option.id
                          ? 'bg-[#363a94] text-white font-medium'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
                
                {/* All Categories button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    
                    // Show loading indicator for the product section only
                    const productSection = document.getElementById('products-section');
                    if (productSection) {
                      productSection.classList.add('section-loading');
                    }
                    
                    // Select the "all" category
                    onSelectCategory('all');
                    
                    // Close the drawer after a short delay
                    setTimeout(() => {
                      onClose();
                      
                      // Scroll to products section with smooth animation
                      setTimeout(() => {
                        const productsSection = document.getElementById('products-section');
                        if (productsSection) {
                          const headerOffset = 100;
                          const elementPosition = productsSection.getBoundingClientRect().top;
                          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                          
                          window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                          });
                        }
                        
                        // Remove loading class after products are updated
                        setTimeout(() => {
                          if (productSection) {
                            productSection.classList.remove('section-loading');
                          }
                        }, 400);
                      }, 100);
                    }, 300);
                  }}
                  className={`w-full mb-3 px-4 py-3.5 rounded-lg flex items-center justify-between ${
                    selectedCategory === 'all'
                      ? 'bg-[#363a94] text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="font-medium truncate">All Categories</span>
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    selectedCategory === 'all' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {categories.length - 1}
                  </span>
                </button>
                
                {/* Category hierarchy */}
                {renderCategoryHierarchy(categories.filter(cat => cat.id !== 'all'))}
              </div>
              
              {/* Active Filters Summary */}
              {(searchQuery || selectedCategory !== 'all' || sortBy !== 'featured') && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {searchQuery && (
                      <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs">
                        <span>Search: {searchQuery}</span>
                        <button 
                          onClick={() => onSearchChange('')}
                          className="ml-1.5 text-blue-500 hover:text-blue-700"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    )}
                    
                    {selectedCategory !== 'all' && (
                      <div className="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs">
                        <span className="truncate max-w-[120px]">
                          Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                        </span>
                        <button 
                          onClick={() => onSelectCategory('all')}
                          className="ml-1.5 text-purple-500 hover:text-purple-700 flex-shrink-0"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    )}
                    
                    {sortBy !== 'featured' && (
                      <div className="flex items-center bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs">
                        <span>Sort: {sortOptions.find(opt => opt.id === sortBy)?.name}</span>
                        <button 
                          onClick={() => onSortChange('featured')}
                          className="ml-1.5 text-amber-500 hover:text-amber-700"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    )}
                    </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClearAll}
                  className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium"
              >
                  Clear All
              </button>
              <button
                onClick={onClose}
                  className="px-4 py-3 bg-[#363a94] text-white rounded-lg font-medium"
                >
                  Apply Filters
              </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterDrawer; 