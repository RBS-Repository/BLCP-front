import { forwardRef } from 'react';
import PropTypes from 'prop-types';

const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  labelClassName = '',
  ...props
}, ref) => {
  const baseStyles = 'rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';
  
  const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className={`text-sm font-medium ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          ${baseStyles}
          ${errorStyles}
          ${widthStyles}
          ${className}
          ${error ? 'border-red-500' : 'border-gray-600'}
          bg-gray-700 text-white placeholder-gray-500
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  labelClassName: PropTypes.string
};

Input.displayName = 'Input';

export default Input; 