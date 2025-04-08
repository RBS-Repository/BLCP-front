import React from 'react';
import { motion } from 'framer-motion';

const ProductCardSkeleton = ({ viewMode = 'grid' }) => {
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
      >
        {/* Image Placeholder */}
        <div className="h-56 bg-gray-200 animate-pulse"></div>
        
        {/* Content Placeholders */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
          </div>
          
          <div className="h-5 w-3/4 bg-gray-200 animate-pulse rounded mb-2"></div>
          
          <div className="h-4 w-full bg-gray-200 animate-pulse rounded mb-1"></div>
          <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded mb-4"></div>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </motion.div>
    );
  } else {
    // List view skeleton
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row"
      >
        {/* Image Placeholder */}
        <div className="w-full md:w-1/4 h-48 md:h-auto bg-gray-200 animate-pulse"></div>
        
        {/* Content Placeholders */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
            <div className="flex space-x-2">
              <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full"></div>
              <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
          </div>
          
          <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded mb-2"></div>
          
          <div className="h-4 w-full bg-gray-200 animate-pulse rounded mb-1"></div>
          <div className="h-4 w-full bg-gray-200 animate-pulse rounded mb-1"></div>
          <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded mb-4"></div>
          
          <div className="mt-auto flex items-center justify-between">
            <div>
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </motion.div>
    );
  }
};

export default ProductCardSkeleton; 