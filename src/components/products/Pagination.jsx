import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Simple icon components
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
  totalItems = 0,
  pageSize = 12,
  siblingCount = 1,
  className = ''
}) => {
  const [pages, setPages] = useState([]);

  // Generate page numbers logic
  useEffect(() => {
    const generatePageNumbers = () => {
      // Maximum number of page buttons to show (excluding prev/next)
      const maxVisibleButtons = siblingCount * 2 + 3; // siblings + current + first + last
      
      if (totalPages <= maxVisibleButtons) {
        // Show all pages if there are fewer than maxVisibleButtons
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      
      // Calculate start and end of sibling range
      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
      
      // Determine whether to show ellipses
      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
      
      // Final page numbers array
      const pageNumbers = [];
      
      // Always show first page
      pageNumbers.push(1);
      
      // Add left ellipsis if needed
      if (shouldShowLeftDots) {
        pageNumbers.push('...');
      } else if (currentPage > 2) {
        // If no left ellipsis but current page is far from start, add page 2
        pageNumbers.push(2);
      }
      
      // Add sibling pages and current page
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i !== 1 && i !== totalPages) {
          // Don't include first and last pages here as they're added separately
          pageNumbers.push(i);
        }
      }
      
      // Add right ellipsis if needed
      if (shouldShowRightDots) {
        pageNumbers.push('...');
      } else if (currentPage < totalPages - 1) {
        // If no right ellipsis but current page is far from end, add second-to-last page
        pageNumbers.push(totalPages - 1);
      }
      
      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
      
      return pageNumbers;
    };
    
    setPages(generatePageNumbers());
  }, [currentPage, totalPages, siblingCount]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
      
      // Scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Calculate showing items text
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 ${className}`}>
      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
        Showing <span className="font-medium">{firstItem}</span> to{' '}
        <span className="font-medium">{lastItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> products
      </div>

      <nav className="flex justify-center space-x-1 relative">
        {/* Previous Page Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-2.5 py-2 rounded-md text-sm font-medium focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:ring-opacity-50 transition-colors ${
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#363a94]'
          }`}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </motion.button>

        {/* Page Numbers */}
        {pages.map((page, index) => (
          <motion.button
            key={index}
            whileHover={page !== '...' ? { scale: 1.05 } : {}}
            whileTap={page !== '...' ? { scale: 0.95 } : {}}
            onClick={() => page !== '...' && goToPage(page)}
            className={`relative inline-flex items-center px-4 py-2 rounded-md text-sm font-medium focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:ring-opacity-50 transition-colors ${
              page === currentPage
                ? 'bg-[#363a94] text-white'
                : page === '...'
                ? 'text-gray-700 cursor-default'
                : 'text-gray-700 hover:bg-gray-100 hover:text-[#363a94]'
            }`}
            disabled={page === '...'}
            aria-label={page === '...' ? 'More pages' : `Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </motion.button>
        ))}

        {/* Next Page Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-2.5 py-2 rounded-md text-sm font-medium focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:ring-opacity-50 transition-colors ${
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#363a94]'
          }`}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </motion.button>
      </nav>
    </div>
  );
};

export default Pagination; 