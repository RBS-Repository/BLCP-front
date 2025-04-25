import React from 'react';
import { motion } from 'framer-motion';

const ProductDetailSkeleton = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Skeleton for Breadcrumb */}
      <div className="bg-white border-b border-gray-200 pt-16 mt-1 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center">
            <div className="h-4 bg-gray-200 rounded w-12 animate-shimmer"></div>
            <div className="mx-2 text-gray-200">/</div>
            <div className="h-4 bg-gray-200 rounded w-16 animate-shimmer"></div>
            <div className="mx-2 text-gray-200">/</div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-shimmer"></div>
            <div className="mx-2 text-gray-200">/</div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Images Skeleton */}
          <div className="mb-8 lg:mb-0">
            {/* Main Product Image Skeleton */}
            <div className="bg-white rounded-xl overflow-hidden shadow-md aspect-square mb-4 border border-gray-100 relative">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center animate-shimmer stagger-1">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Thumbnails Skeleton */}
            <div className="grid grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={`thumb-skeleton-${i}`} className={`aspect-square rounded-lg bg-gray-200 animate-shimmer stagger-${(i % 5) + 1}`}></div>
              ))}
            </div>

            {/* Zoom Controls Skeleton */}
            <div className="flex justify-end mt-2">
              <div className="h-8 w-24 bg-gray-200 rounded-full animate-shimmer"></div>
            </div>
          </div>

          {/* Right Column - Details Skeleton */}
          <div className="mt-6 lg:mt-0">
            {/* Product Header Skeleton */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="h-6 w-24 bg-gray-200 rounded-full animate-shimmer"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-shimmer"></div>
              </div>

              {/* Title Skeleton */}
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2 animate-shimmer"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4 animate-shimmer"></div>
              
              {/* Price Skeleton */}
              <div className="mt-6">
                <div className="h-4 bg-gray-200 rounded w-12 mb-2 animate-shimmer"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-shimmer"></div>
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <div className="flex space-x-8">
                  {['Description', 'Features', 'Target Market'].map((tab, i) => (
                    <div key={`tab-skeleton-${i}`} className="h-6 bg-gray-200 rounded w-24 mb-4 animate-shimmer"></div>
                  ))}
                </div>
              </div>

              {/* Tab Content Skeleton */}
              <div className="py-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full animate-shimmer stagger-1"></div>
                <div className="h-4 bg-gray-200 rounded w-full animate-shimmer stagger-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-shimmer stagger-3"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-shimmer stagger-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full animate-shimmer stagger-5"></div>
              </div>
            </div>

            {/* Variations Skeleton */}
            <div className="mt-6 p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-shimmer"></div>
              
              {/* Variation Types */}
              {[...Array(2)].map((_, i) => (
                <div key={`variation-skeleton-${i}`} className="mb-5">
                  <div className={`h-5 bg-gray-200 rounded w-24 mb-3 animate-shimmer stagger-${i + 1}`}></div>
                  <div className="flex flex-wrap gap-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={`option-skeleton-${i}-${j}`} className={`h-10 bg-gray-200 rounded w-20 animate-shimmer stagger-${(j % 5) + 1}`}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity Selector Skeleton */}
            <div className="mt-6">
              <div className="h-5 bg-gray-200 rounded w-20 mb-2 animate-shimmer"></div>
              <div className="flex items-center">
                <div className="h-10 bg-gray-200 rounded-l-md w-10 animate-shimmer"></div>
                <div className="h-10 bg-gray-200 w-16 animate-shimmer"></div>
                <div className="h-10 bg-gray-200 rounded-r-md w-10 animate-shimmer"></div>
                <div className="h-5 bg-gray-200 rounded w-24 ml-3 animate-shimmer"></div>
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="mt-6 space-y-4">
              <div className="h-12 bg-gray-200 rounded-md w-full animate-shimmer"></div>
              <div className="h-12 bg-gray-200 rounded-lg w-12 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Recommendations Skeleton */}
        <div className="mt-16 space-y-16">
          {[...Array(2)].map((_, sectionIndex) => (
            <div key={`recommendation-section-${sectionIndex}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="hidden sm:block w-8 h-1 bg-gray-200 rounded-full mr-3 animate-shimmer"></div>
                  <div className="h-7 bg-gray-200 rounded w-48 animate-shimmer"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-20 animate-shimmer"></div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-x-6 sm:gap-y-10">
                {[...Array(4)].map((_, productIndex) => (
                  <div 
                    key={`product-skeleton-${sectionIndex}-${productIndex}`}
                    className="group relative bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-200 animate-shimmer"></div>
                    <div className="p-3 sm:p-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-shimmer stagger-1"></div>
                      <div className="h-5 bg-gray-200 rounded w-1/2 animate-shimmer stagger-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton; 