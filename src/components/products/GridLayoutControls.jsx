import React from 'react';
import { motion } from 'framer-motion';
import { FaList, FaTh, FaThLarge, FaImages } from 'react-icons/fa';

// Available layout options
const layouts = [
  { id: 'standard', icon: FaTh, label: 'Standard Grid' },
  { id: 'compact', icon: FaThLarge, label: 'Compact Grid' },
  { id: 'gallery', icon: FaImages, label: 'Gallery View' },
  { id: 'list', icon: FaList, label: 'List View' }
];

const GridLayoutControls = ({ activeLayout = 'standard', onLayoutChange = () => {} }) => {
  return (
    <div className="flex items-center space-x-1 border border-gray-300 rounded-lg overflow-hidden bg-white">
      {layouts.map(layout => {
        const isActive = activeLayout === layout.id;
        const Icon = layout.icon;
        
        return (
          <motion.button
            key={layout.id}
            type="button"
            onClick={() => onLayoutChange(layout.id)}
            whileHover={{ backgroundColor: isActive ? '' : 'rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 transition-colors ${
              isActive 
                ? 'bg-[#363a94] text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={layout.label}
            title={layout.label}
          >
            <Icon size={16} />
          </motion.button>
        );
      })}
    </div>
  );
};

export default GridLayoutControls; 