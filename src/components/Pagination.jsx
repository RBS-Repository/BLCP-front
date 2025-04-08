import React from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = ''
}) => {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;
  
  // Generate page numbers to display
  const generatePageNumbers = () => {
    // Show all pages if there are few of them
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate sibling ranges
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    
    // Determine if we need ellipses
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
    
    // Build page numbers array
    const pageNumbers = [];
    
    // Always show first page
    pageNumbers.push(1);
    
    // Add dots or second page
    if (shouldShowLeftDots) {
      pageNumbers.push('...');
    } else if (currentPage > 2) {
      pageNumbers.push(2);
    }
    
    // Add middle pages (around current page)
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== totalPages) {
        pageNumbers.push(i);
      }
    }
    
    // Add dots or second-to-last page
    if (shouldShowRightDots) {
      pageNumbers.push('...');
    } else if (currentPage < totalPages - 1) {
      pageNumbers.push(totalPages - 1);
    }
    
    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  const pageNumbers = generatePageNumbers();
  
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };
  
  return (
    <nav className={`flex justify-center mt-8 ${className}`} aria-label="Pagination">
      <ul className="flex items-center -space-x-px">
        {/* Previous Page Button */}
        <li>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-50 hover:text-[#363a94]'
            }`}
            aria-label="Previous page"
          >
            <FaChevronLeft className="h-4 w-4" />
          </motion.button>
        </li>
        
        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                ...
              </span>
            ) : (
              <motion.button
                whileHover={page !== currentPage ? { scale: 1.05 } : {}}
                whileTap={page !== currentPage ? { scale: 0.95 } : {}}
                onClick={() => handlePageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-[#363a94] text-white border-[#363a94]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-[#363a94]'
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </motion.button>
            )}
          </li>
        ))}
        
        {/* Next Page Button */}
        <li>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-50 hover:text-[#363a94]'
            }`}
            aria-label="Next page"
          >
            <FaChevronRight className="h-4 w-4" />
          </motion.button>
        </li>
      </ul>
      
      {/* Page info */}
      <div className="sr-only">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  );
};

export default Pagination; 