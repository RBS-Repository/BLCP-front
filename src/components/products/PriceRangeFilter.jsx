import { useState, useEffect, useRef } from 'react';

const PriceRangeFilter = ({ 
  minPrice = 0, 
  maxPrice = 10000, 
  onPriceChange = () => {},
  initialMin = null,
  initialMax = null
}) => {
  const [range, setRange] = useState({
    min: initialMin !== null ? initialMin : minPrice,
    max: initialMax !== null ? initialMax : maxPrice
  });
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const sliderRef = useRef(null);
  const timeoutRef = useRef(null);

  // Reset the price range when min/max props change
  useEffect(() => {
    if (initialMin === null && initialMax === null) {
      setRange({
        min: minPrice,
        max: maxPrice
      });
    }
  }, [minPrice, maxPrice, initialMin, initialMax]);

  // Handle range slider thumb dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!sliderRef.current || (!isDraggingMin && !isDraggingMax)) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const width = rect.width;
      const offsetX = e.clientX - rect.left;
      
      // Calculate the percentage of the slider width
      const percentage = Math.min(Math.max(offsetX / width, 0), 1);
      // Calculate the value based on the percentage
      const value = Math.round(minPrice + percentage * (maxPrice - minPrice));
      
      setRange(prev => {
        if (isDraggingMin) {
          return { ...prev, min: Math.min(value, prev.max) };
        } else if (isDraggingMax) {
          return { ...prev, max: Math.max(value, prev.min) };
        }
        return prev;
      });
    };

    const handleMouseUp = () => {
      if (isDraggingMin || isDraggingMax) {
        // Debounce the change event to avoid too many rerenders
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          onPriceChange(range.min, range.max);
        }, 300);
        
        setIsDraggingMin(false);
        setIsDraggingMax(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingMin, isDraggingMax, minPrice, maxPrice, onPriceChange, range]);

  // Handle manual input changes
  const handleInputChange = (type, value) => {
    const numberValue = parseInt(value) || 0;
    
    // Apply constraints based on type
    let updatedValue;
    if (type === 'min') {
      updatedValue = Math.min(Math.max(numberValue, minPrice), range.max);
      setRange(prev => ({ ...prev, min: updatedValue }));
    } else {
      updatedValue = Math.max(Math.min(numberValue, maxPrice), range.min);
      setRange(prev => ({ ...prev, max: updatedValue }));
    }
    
    // Debounce the change event
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onPriceChange(range.min, range.max);
    }, 500);
  };

  // Calculate the position of the thumbs and the filled track
  const minThumbPosition = ((range.min - minPrice) / (maxPrice - minPrice)) * 100;
  const maxThumbPosition = ((range.max - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="w-full mr-3">
          <label htmlFor="min-price" className="block text-sm text-gray-600 mb-1">Min Price</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₱</span>
            <input
              id="min-price"
              type="number"
              min={minPrice}
              max={range.max}
              value={range.min}
              onChange={(e) => handleInputChange('min', e.target.value)}
              className="pl-7 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
            />
          </div>
        </div>
        <div className="w-full">
          <label htmlFor="max-price" className="block text-sm text-gray-600 mb-1">Max Price</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₱</span>
            <input
              id="max-price"
              type="number"
              min={range.min}
              max={maxPrice}
              value={range.max}
              onChange={(e) => handleInputChange('max', e.target.value)}
              className="pl-7 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="py-4">
        <div 
          ref={sliderRef}
          className="relative h-2 bg-gray-200 rounded-full"
        >
          {/* Filled track */}
          <div 
            className="absolute h-full bg-[#363a94] rounded-full"
            style={{
              left: `${minThumbPosition}%`,
              width: `${maxThumbPosition - minThumbPosition}%`
            }}
          ></div>
          
          {/* Min thumb */}
          <div 
            className="absolute w-5 h-5 bg-white border-2 border-[#363a94] rounded-full top-1/2 -translate-y-1/2 cursor-grab hover:scale-110 transition-transform"
            style={{ left: `${minThumbPosition}%` }}
            onMouseDown={() => setIsDraggingMin(true)}
            onTouchStart={() => setIsDraggingMin(true)}
          ></div>
          
          {/* Max thumb */}
          <div 
            className="absolute w-5 h-5 bg-white border-2 border-[#363a94] rounded-full top-1/2 -translate-y-1/2 cursor-grab hover:scale-110 transition-transform"
            style={{ left: `${maxThumbPosition}%` }}
            onMouseDown={() => setIsDraggingMax(true)}
            onTouchStart={() => setIsDraggingMax(true)}
          ></div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>₱{minPrice.toLocaleString()}</span>
        <span>₱{maxPrice.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default PriceRangeFilter; 