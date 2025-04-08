import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileSizeError, setFileSizeError] = useState('');
  const [additionalFilesSizeError, setAdditionalFilesSizeError] = useState('');
  
  // Maximum file size in bytes (2MB)
  const MAX_FILE_SIZE = 2 * 1024 * 1024;

  // Function to check file size
  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return false;
    }
    return true;
  };

  // Format file size for display
  const formatFileSize = (size) => {
    if (size < 1024) return size + ' bytes';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else return (size / 1048576).toFixed(1) + ' MB';
  };
  
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: 0,
    minOrder: 1,
    targetMarketKeyFeatures: [],
    targetMarket: [],
    status: 'active',
    image: '',
    images: [],
    tempImagePreview: null,
    tempImagePreviews: []
  });

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setProduct(data);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        toast.error('Failed to fetch product');
        console.error('Error:', error);
      }
    };

    if (user && id) {
      fetchProduct();
    }
  }, [id, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format the product data before sending
      const formattedProduct = {
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        category: product.category,
        stock: parseInt(product.stock, 10) || 0,
        minOrder: parseInt(product.minOrder, 10) || 1,
        targetMarketKeyFeatures: Array.isArray(product.targetMarketKeyFeatures) 
          ? product.targetMarketKeyFeatures 
          : product.targetMarketKeyFeatures?.split('\n').filter(line => line.trim()),
        targetMarket: Array.isArray(product.targetMarket)
          ? product.targetMarket
          : product.targetMarket?.split('\n').filter(line => line.trim()),
        status: product.status || 'active',
        image: product.image || '',
        images: Array.isArray(product.images) ? product.images : []
      };

      // Validate required fields
      const requiredFields = ['name', 'description', 'price', 'category'];
      const missingFields = requiredFields.filter(field => !formattedProduct[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Clean up image data
      if (typeof formattedProduct.image !== 'string') {
        delete formattedProduct.image;
      }

      if (!Array.isArray(formattedProduct.images)) {
        formattedProduct.images = [];
      } else {
        formattedProduct.images = formattedProduct.images.filter(img => typeof img === 'string');
      }

      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedProduct)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product');
      }

      toast.success('Product updated successfully');
      navigate('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (!validateFileSize(file)) {
        setFileSizeError(`File too large (${formatFileSize(file.size)}). Maximum size is 2MB.`);
        e.target.value = null; // Reset the input
        return;
      }
      
      setFileSizeError(''); // Clear any previous error
      
      try {
        setIsSubmitting(true); // Show loading state
        
        // Upload to Cloudinary
        const cloudData = new FormData();
        cloudData.append('file', file);
        cloudData.append('upload_preset', 'ml_default');
        
        const cloudinaryResponse = await fetch(
          'https://api.cloudinary.com/v1_1/dsfc6qjqx/image/upload',
          { 
            method: 'POST', 
            body: cloudData 
          }
        );
        
        if (!cloudinaryResponse.ok) {
          throw new Error('Failed to upload to Cloudinary');
        }

        const cloudResult = await cloudinaryResponse.json();

        // Update the product in your backend
        const token = await user.getIdToken();
        const updateResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...product,
            image: cloudResult.secure_url
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update product');
        }

        // Update local state
        setProduct(prev => ({
          ...prev,
          image: cloudResult.secure_url
        }));

        toast.success('Image updated successfully');
      } catch (error) {
        console.error('Error updating image:', error);
        toast.error(error.message || 'Failed to update image');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleMultipleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Check each file size
      const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        setAdditionalFilesSizeError(`${oversizedFiles.length} file(s) exceed the 2MB limit and were not added.`);
        
        // If all files are oversized, don't proceed
        if (oversizedFiles.length === files.length) {
          e.target.value = null; // Reset the input
          return;
        }
        
        // Filter out oversized files
        const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
        
        try {
          setIsSubmitting(true);

          // Upload valid files to Cloudinary
          const uploadPromises = validFiles.map(file => {
            const cloudData = new FormData();
            cloudData.append('file', file);
            cloudData.append('upload_preset', 'ml_default');
            
            return fetch(
              'https://api.cloudinary.com/v1_1/dsfc6qjqx/image/upload',
              { 
                method: 'POST', 
                body: cloudData 
              }
            ).then(res => res.json());
          });

          const cloudResults = await Promise.all(uploadPromises);
          const newImageUrls = cloudResults.map(result => result.secure_url);

          // Update the product in your backend
          const token = await user.getIdToken();
          const updateResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...product,
              images: [...(product.images || []), ...newImageUrls]
            })
          });

          if (!updateResponse.ok) {
            throw new Error('Failed to update product images');
          }

          // Update local state
          setProduct(prev => ({
            ...prev,
            images: [...(prev.images || []), ...newImageUrls]
          }));

          toast.success(`${validFiles.length} image(s) updated successfully`);
        } catch (error) {
          console.error('Error updating images:', error);
          toast.error(error.message || 'Failed to update images');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // No oversized files, proceed as usual
        setAdditionalFilesSizeError(''); // Clear any previous error
        try {
          setIsSubmitting(true);

          // Upload all files to Cloudinary
          const uploadPromises = files.map(file => {
            const cloudData = new FormData();
            cloudData.append('file', file);
            cloudData.append('upload_preset', 'ml_default');
            
            return fetch(
              'https://api.cloudinary.com/v1_1/dsfc6qjqx/image/upload',
              { 
                method: 'POST', 
                body: cloudData 
              }
            ).then(res => res.json());
          });

          const cloudResults = await Promise.all(uploadPromises);
          const newImageUrls = cloudResults.map(result => result.secure_url);

          // Update the product in your backend
          const token = await user.getIdToken();
          const updateResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...product,
              images: [...(product.images || []), ...newImageUrls]
            })
          });

          if (!updateResponse.ok) {
            throw new Error('Failed to update product images');
          }

          // Update local state
          setProduct(prev => ({
            ...prev,
            images: [...(prev.images || []), ...newImageUrls]
          }));

          toast.success('Images updated successfully');
        } catch (error) {
          console.error('Error updating images:', error);
          toast.error(error.message || 'Failed to update images');
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

        {/* Basic product fields */}
        <div className="space-y-4">
          {/* ... other form fields ... */}
        </div>

        {/* Image upload fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
            {fileSizeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <div className="flex items-center text-red-500 text-sm">
                  <FaExclamationTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{fileSizeError}</span>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-600 file:py-2 file:px-4 
                         file:rounded-full file:border-0 file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {(product.image || product.tempImagePreview) && (
              <div className="mt-2">
                <img
                  src={product.tempImagePreview || product.image}
                  alt="Product preview"
                  className="h-32 w-32 object-cover rounded-lg shadow-sm"
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 flex items-start">
              <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
              <span>Upload a high-quality image to attract customers. Max size: 2MB.</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Images</label>
            {additionalFilesSizeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <div className="flex items-center text-red-500 text-sm">
                  <FaExclamationTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{additionalFilesSizeError}</span>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultipleImageChange}
              className="mt-1 block w-full text-sm text-gray-600 file:py-2 file:px-4 
                         file:rounded-full file:border-0 file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {Array.isArray(product.images) && product.images.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {product.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="h-32 w-32 object-cover rounded-lg shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProduct(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 flex items-start">
              <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
              <span>Add multiple product images to show different angles and details. Max size: 2MB per image.</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Updating...' : 'Update Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct; 