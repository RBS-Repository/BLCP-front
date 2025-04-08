import React from 'react';

// Skeleton component for various UI elements
const SkeletonLoader = ({ type = 'text', width, height, className = '', count = 1 }) => {
  const baseClass = "animate-pulse bg-gray-200 rounded";
  
  // Configure dimensions and styling based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'text':
        return 'h-4 my-2';
      case 'title':
        return 'h-8 my-3';
      case 'subtitle':
        return 'h-6 my-2';
      case 'button':
        return 'h-10 rounded-md';
      case 'circle':
        return 'rounded-full';
      case 'image':
        return 'rounded-md';
      case 'avatar':
        return 'rounded-full h-12 w-12';
      case 'card':
        return 'rounded-lg shadow-sm h-48';
      case 'product':
        return 'rounded-lg h-64';
      default:
        return '';
    }
  };
  
  // Generate multiple skeleton elements if count > 1
  const renderSkeletons = () => {
    return Array(count).fill().map((_, index) => (
      <div
        key={index} 
        className={`${baseClass} ${getTypeStyles()} ${className}`}
        style={{ 
          width: width || (type === 'text' ? `${75 + Math.random() * 25}%` : '100%'),
          height: height || ''
        }}
      ></div>
    ));
  };
  
  return <>{renderSkeletons()}</>;
};

// Product card skeleton with support for grid and list views
export const ProductCardSkeleton = ({ viewMode = 'grid' }) => {
  // Grid view skeleton
  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
        <SkeletonLoader type="image" height="200px" />
        <div className="p-4">
          <div className="flex justify-between mb-2">
            <SkeletonLoader type="text" width="25%" />
            <SkeletonLoader type="text" width="25%" />
          </div>
          <SkeletonLoader type="subtitle" width="80%" />
          <SkeletonLoader type="text" width="100%" />
          <SkeletonLoader type="text" width="60%" />
          <div className="flex justify-between items-center mt-5">
            <SkeletonLoader type="subtitle" width="30%" />
            <SkeletonLoader type="button" width="30%" height="32px" />
          </div>
        </div>
      </div>
    );
  }
  
  // List view skeleton
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row">
        {/* Image placeholder */}
        <div className="md:w-1/4 lg:w-1/5">
          <SkeletonLoader type="image" height="240px" className="h-full" />
        </div>
        
        {/* Content placeholders */}
        <div className="flex-1 p-6 md:p-8">
          {/* Title and actions placeholder */}
          <div className="flex justify-between mb-4">
            <div className="w-3/4">
              <SkeletonLoader type="subtitle" width="80%" />
              <div className="flex items-center mt-2">
                <SkeletonLoader type="text" width="120px" />
              </div>
            </div>
            <div className="flex space-x-2">
              <SkeletonLoader type="circle" width="36px" height="36px" />
              <SkeletonLoader type="circle" width="36px" height="36px" />
            </div>
          </div>
          
          {/* Description placeholder */}
          <SkeletonLoader type="text" width="100%" />
          <SkeletonLoader type="text" width="90%" />
          
          {/* Features placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 mb-6">
            <SkeletonLoader type="text" width="80%" />
            <SkeletonLoader type="text" width="80%" />
            <SkeletonLoader type="text" width="80%" />
            <SkeletonLoader type="text" width="80%" />
          </div>
          
          {/* Price and CTA placeholders */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap md:flex-nowrap justify-between mt-4">
            <SkeletonLoader type="subtitle" width="40%" />
            <div className="flex space-x-3 mt-2 md:mt-0">
              <SkeletonLoader type="button" width="100px" height="40px" />
              <SkeletonLoader type="button" width="120px" height="40px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Testimonial skeleton
export const TestimonialSkeleton = () => {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm">
      <div className="flex items-center mb-4">
        <SkeletonLoader type="avatar" className="mr-3" />
        <div>
          <SkeletonLoader type="subtitle" width="120px" />
          <SkeletonLoader type="text" width="80px" />
        </div>
      </div>
      <SkeletonLoader type="text" count={3} />
    </div>
  );
};

// Feature box skeleton
export const FeatureBoxSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-center mb-4">
        <SkeletonLoader type="circle" width="64px" height="64px" />
      </div>
      <SkeletonLoader type="title" width="70%" className="mx-auto" />
      <SkeletonLoader type="text" count={2} className="mx-auto" />
    </div>
  );
};

// Hero section skeleton
export const HeroSkeleton = () => {
  return (
    <div className="relative h-80 sm:h-96 md:h-[500px] w-full bg-gray-200 animate-pulse rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 max-w-4xl">
        <SkeletonLoader type="title" width="60%" />
        <SkeletonLoader type="subtitle" width="80%" />
        <SkeletonLoader type="text" width="40%" />
        <div className="flex space-x-4 mt-6">
          <SkeletonLoader type="button" width="120px" />
          <SkeletonLoader type="button" width="140px" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader; 