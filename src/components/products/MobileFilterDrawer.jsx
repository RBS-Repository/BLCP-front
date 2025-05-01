import React from 'react';
import { FaTimes, FaSearch, FaChevronRight, FaChevronDown } from 'react-icons/fa';
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

  // State to track expanded categories
  const [expandedCategories, setExpandedCategories] = React.useState(new Set());
  
  // Toggle category expansion
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
  
  // Recursive function to render categories hierarchically
  const renderCategoryHierarchy = (allCategories, parentId = null, level = 0) => {
    // Filter categories based on parent relationship
    const filteredCategories = allCategories.filter(category => {
      if (parentId === null) {
        // Root level categories have no parent or parentCategory is null/undefined
        return !category.parentCategory && category.id !== 'all';
      } else {
        // Child categories have parentCategory matching the parentId
        // Ensure string comparison for IDs
        const catParentId = category.parentCategory ? category.parentCategory.toString() : null;
        const compareParentId = parentId ? parentId.toString() : null;
        return catParentId === compareParentId;
      }
    });
    
    if (filteredCategories.length === 0) return null;
    
    return (
      <div className={level > 0 ? "ml-4 border-l border-gray-200 pl-2" : ""}>
        {filteredCategories.map((category) => {
          // Check if this category has children
          // Ensure string comparison for IDs
          const categoryId = category.id.toString();
          const hasChildren = allCategories.some(cat => {
            const catParentId = cat.parentCategory ? cat.parentCategory.toString() : null;
            return catParentId === categoryId;
          });
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <div key={category.id} className="my-2">
              <div className="flex items-center">
                {hasChildren && (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="mr-1 p-1 text-gray-500 hover:text-gray-700 rounded-full"
                  >
                    {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  </button>
                )}
                <div className="flex items-center flex-1">
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
                    className="ml-2 text-sm text-gray-700 flex items-center"
                  >
                    {category.name}
                    {level > 0 && (
                      <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded-full">
                        Sub
                      </span>
                    )}
                  </label>
                </div>
              </div>
              
              {/* Render children recursively if expanded */}
              {hasChildren && isExpanded && renderCategoryHierarchy(allCategories, category.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

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
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Filters</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 p-2"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Filter content */}
            <div className="flex-1 overflow-y-auto">
              {/* Search */}
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">Search</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaSearch />
                  </div>
                </div>
                
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
              <div className="mb-6 p-4">
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="space-y-2">
                  {/* All products option */}
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      id="mobile-category-all"
                      name="mobile-category"
                      value="all"
                      checked={selectedCategory === 'all'}
                      onChange={() => onSelectCategory('all')}
                      className="h-4 w-4 text-[#363a94] focus:ring-[#363a94]"
                    />
                    <label
                      htmlFor="mobile-category-all"
                      className="ml-2 text-sm font-medium text-gray-900"
                    >
                      All Products
                    </label>
                  </div>
                  
                  {/* Hierarchical categories */}
                  {renderCategoryHierarchy(categories)}
                </div>
              </div>
              
              {/* Sort options */}
              <div className="mb-6 px-4">
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