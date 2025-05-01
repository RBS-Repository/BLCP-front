import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { uploadImage, uploadMultipleImages, isCloudinaryUrl } from '../../services/cloudinary';

/**
 * IMPORTANT NOTE FOR IMAGE UPLOADS:
 * For optimal performance and user experience, please use:
 * - WebP format images whenever possible (better compression, smaller file size)
 * - Images under 2MB in size
 * - Compress images before uploading to improve page load times
 * - Consider dimensions appropriate for display context to avoid unnecessary file size
 */

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    minOrder: 0,
    targetMarketKeyFeatures: [],
    targetMarket: [],
    image: null,
    images: [],
    status: 'active',
  });

  // Add this function to render category options hierarchically
  const renderCategoryOptions = (allCategories, parentId = null, level = 0) => {
    // Create a Set to keep track of ancestors to prevent circular references
    const ancestorIds = new Set();
    
    // Helper function for recursive rendering with circular reference check
    const renderOptions = (parentId = null, level = 0, visitedIds = new Set()) => {
      return allCategories
        .filter(category => {
          if (!category._id) return false; // Skip invalid categories
          
          // Skip if we've already visited this category (prevents circular references)
          if (visitedIds.has(category._id)) return false;
          
          if (parentId === null) {
            // Root categories have no parent
            return !category.parentCategory;
          } else {
            // For child categories, ensure proper string comparison of IDs
            const catParentId = typeof category.parentCategory === 'object' && category.parentCategory?._id 
              ? category.parentCategory._id.toString() 
              : category.parentCategory ? category.parentCategory.toString() : null;
            
            const compareParentId = parentId ? parentId.toString() : null;
            return catParentId === compareParentId;
          }
        })
        .map(category => {
          // Convert category ID to string for consistent comparison
          const categoryId = category._id ? category._id.toString() : null;
          
          // Find parent category name for display if it's a subcategory
          const parentCategory = level > 0 && category.parentCategory ? 
            allCategories.find(p => p._id === category.parentCategory || 
              (typeof p._id === 'object' && p._id?._id === category.parentCategory)) : null;
          
          const parentName = parentCategory?.name;
          
          // Build clear hierarchy visual with indentation and symbols
          const indent = level > 0 ? '\u00A0\u00A0'.repeat(level) : '';
          const prefix = level > 0 ? `${indent}↳ ` : '';
          
          // Create a new Set with the current path to avoid circular references
          const newVisitedIds = new Set(visitedIds);
          newVisitedIds.add(categoryId);
          
          // Find if this category has direct children (ignoring circular references)
          const hasChildren = allCategories.some(cat => {
            const childParentId = typeof cat.parentCategory === 'object' && cat.parentCategory?._id
              ? cat.parentCategory._id.toString()
              : cat.parentCategory ? cat.parentCategory.toString() : null;
            
            return childParentId === categoryId && 
                  cat._id !== categoryId &&  // Not itself
                  !visitedIds.has(cat._id);  // Not already visited
          });
          
          // Format category label with clear parent information
          let categoryLabel = prefix + category.name;
          
          // For subcategories, add parent information
          if (level > 0) {
            categoryLabel += ` (${parentName ? `child of ${parentName}` : 'subcategory'})`;
          } else if (hasChildren) {
            // For parent categories, indicate they have children
            categoryLabel += ' (parent)';
          }
          
          return [
            <option key={categoryId} value={categoryId} data-level={level} data-has-children={hasChildren}>
              {categoryLabel}
            </option>,
            // If this category has children, render them with increased level
            ...(hasChildren ? renderOptions(categoryId, level + 1, newVisitedIds) : [])
          ];
        })
        .flat();
    };
    
    return renderOptions(parentId, level);
  };

  useEffect(() => {
    if (!id) return;
    
    const loadProduct = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}?showAll=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errData = await response.text();
          throw new Error(errData || 'Failed to load product');
        }
        
        const productData = await response.json();
        
        // Ensure category is properly handled (could be object or string ID)
        const categoryId = productData.category && typeof productData.category === 'object' && productData.category._id
          ? productData.category._id
          : productData.category;
        
        // Map the data to the form structure
        setFormData({
          name: productData.name || '',
          description: productData.description || '',
          price: productData.price || 0,
          category: categoryId || '',
          stock: productData.stock || 0,
          minOrder: productData.minOrder || 1,
          targetMarketKeyFeatures: productData.targetMarketKeyFeatures || [],
          targetMarket: productData.targetMarket || [],
          image: productData.image || '',
          images: productData.images || [],
          status: productData.status || 'active'
        });
        
        // Set main image preview
        if (productData.image) {
          setImagePreview(productData.image);
        }
        
        // Set additional images previews
        if (productData.images && Array.isArray(productData.images)) {
          setImagePreviews(productData.images);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [id, user]);

  useEffect(() => {
    if (user && !user.admin) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/categories`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        
        // Normalize categories to ensure consistent ID format and parent-child relationships
        const normalizedCategories = data.map(category => {
          // Create a clean category object with consistent ID handling
          return {
            ...category,
            // Ensure _id is available as string for consistent comparison
            _id: category._id ? category._id.toString() : null,
            // Normalize parentCategory - convert from object if needed
            parentCategory: category.parentCategory 
              ? (typeof category.parentCategory === 'object' && category.parentCategory._id 
                  ? category.parentCategory._id.toString() 
                  : category.parentCategory.toString())
              : null
          };
        });
        
        setCategories(normalizedCategories);
        
        // Log to help debugging
        console.log(`Loaded ${normalizedCategories.length} categories for product edit form`);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'targetMarketKeyFeatures' || name === 'targetMarket') {
      setFormData(prev => ({ ...prev, [name]: value.split('\n') }));
    } else if (name === 'stock') {
      setFormData(prev => ({ ...prev, [name]: Math.max(0, parseInt(value) || 0) }));
    } else if (name === 'price' || name === 'minOrder') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else if (name === 'status' && value === 'inactive' && formData.status === 'active') {
      // Show warning when changing from active to inactive
      Swal.fire({
        title: 'Set product to inactive?',
        text: 'This will immediately remove the product from all customer carts. Do you want to continue?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, make inactive',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          // User confirmed, update the status
          setFormData(prev => ({ ...prev, [name]: value }));
        }
        // If user cancelled, don't update the status (keep it as active)
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Just set the preview for UI feedback
      setImagePreview(URL.createObjectURL(file));
      
      // Store the file itself in formData
      setFormData(prev => ({ ...prev, image: file }));
      
      // Add to imageFiles to track new files
      setImageFiles(prev => [...prev, file]);
    }
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Add new files to image files array for upload tracking
      setImageFiles(prev => [...prev, ...files]);
      
      // Create local URL previews for display in the UI
      const newPreviews = files.map(file => URL.createObjectURL(file));
      
      // Update the preview images for UI display
      setImagePreviews(prev => [...prev, ...newPreviews]);
      
      // Update form data
      // Note that we're not adding the files to formData.images yet
      // because we need to upload them to Cloudinary first
    }
  };

  const removeImage = (index) => {
    // Remove from preview display
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    
    // If it's a file (not a URL), remove from the files array
    if (typeof imagePreviews[index] !== 'string' || !imagePreviews[index].startsWith('http')) {
      const newFiles = [...imageFiles];
      // Find the corresponding file index
      const fileIndex = imageFiles.findIndex(f => 
        URL.createObjectURL(f) === imagePreviews[index]
      );
      if (fileIndex !== -1) {
        newFiles.splice(fileIndex, 1);
        setImageFiles(newFiles);
      }
    }
    
    // Update the form data to reflect the removal
    // If it's a URL, we need to remove it from formData.images
    const newImageUrls = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      images: newImageUrls
    }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    
    try {
      setLoading(true);
      // Use our centralized Cloudinary service
      const imageUrl = await uploadImage(file);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleImageUpload = async (files) => {
    if (!files || files.length === 0) return [];
    
    try {
      setLoading(true);
      // Use our centralized Cloudinary service
      const imageUrls = await uploadMultipleImages(files);
      return imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload one or more images');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // Force numeric values to be valid numbers
      const stockValue = Math.max(0, parseInt(formData.stock) || 0);
      const priceValue = parseFloat(formData.price) || 0;
      const minOrderValue = parseInt(formData.minOrder) || 1;
      
      // First upload any new images to Cloudinary
      let mainImageUrl = typeof formData.image === 'string' ? formData.image : null;
      
      // Start with existing image URLs that we want to keep
      let additionalImageUrls = Array.isArray(formData.images) 
        ? formData.images.filter(img => typeof img === 'string' && isCloudinaryUrl(img))
        : [];
      
      // Upload main image to Cloudinary if it's a file
      if (formData.image instanceof File) {
        mainImageUrl = await handleImageUpload(formData.image);
      }
      
      // Upload any additional images to Cloudinary
      const newImageFiles = imageFiles.filter(img => formData.image !== img && img instanceof File);
      if (newImageFiles.length > 0) {
        const newUrls = await handleMultipleImageUpload(newImageFiles);
        additionalImageUrls = [...additionalImageUrls, ...newUrls];
      }
      
      // Ensure additionalImageUrls is always an array
      const finalImageUrls = Array.isArray(additionalImageUrls) 
        ? additionalImageUrls 
        : (additionalImageUrls ? [additionalImageUrls] : []);
      
      // Now prepare the product data with all image URLs
      const productData = {
        name: formData.name,
        description: formData.description,
        price: priceValue,
        category: formData.category,
        stock: stockValue,
        minOrder: minOrderValue,
        status: formData.status,
        targetMarketKeyFeatures: formData.targetMarketKeyFeatures,
        targetMarket: formData.targetMarket,
        image: mainImageUrl,
        images: finalImageUrls // Ensure this is an array
      };
      
      // Make JSON request with all data including image URLs
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      // Check response status
      if (!response.ok) {
        throw new Error('Failed to update product');
      }
      
      // Parse response to check if carts were updated
      const responseData = await response.json();
      const cartsUpdated = responseData.cartsUpdated || 0;
      
      // Base success message
      let successMessage = 'Product updated successfully!';
      
      // Add additional message about carts if applicable
      if (cartsUpdated > 0 && productData.status === 'inactive') {
        successMessage += ` The product was also removed from ${cartsUpdated} customer cart${cartsUpdated !== 1 ? 's' : ''} because it was set to inactive.`;
      }
      
      toast.success(successMessage);

      await Swal.fire({
        icon: 'success',
        title: 'Product Updated',
        text: successMessage,
        confirmButtonColor: '#10b981',
        showConfirmButton: false,
        timer: 3000,
      });
      
      navigate('/admin/products');
    } catch (err) {
      console.error("Update error:", err);
      toast.error(`Update failed: ${err.message}`);
      
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        html: `<div style="color: #444;"><p>${err.message}</p></div>`,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Okay',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Any unsaved changes will be lost',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, leave',
      cancelButtonText: 'Stay',
    });
    if (result.isConfirmed) navigate('/admin/products');
  };

  if (loading && !formData.name) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 ">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-indigo-700 to-purple-600 p-4 rounded-t-xl shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight">Edit Product</h2>
            <button
              onClick={handleCancel}
              className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-24">
        {/* Left Column: Image Cards */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Main Product Image</h3>
            <div className="space-y-4">
              <div className="w-full h-64 border-2 border-gray-200 rounded-lg overflow-hidden hover:border-indigo-400 transition-all duration-200">
                {imagePreview ? (
                  <img src={imagePreview} alt="Main Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    Upload main image
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleMainImageChange}
                className="w-full text-sm text-gray-600 file:py-2 file:px-4 file:rounded-full file:bg-indigo-600 file:text-white file:border-0 file:hover:bg-indigo-700 file:transition-all"
              />
            </div>
          </div>
          
          {/* Additional Images */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Images</h3>
            <div className="space-y-4">
              {/* Image Gallery Grid */}
              <div className="grid grid-cols-2 gap-3">
                {imagePreviews.map((preview, index) => (
                  <motion.div 
                    key={`image-${index}`}
                    className="relative group aspect-square border border-gray-200 rounded-lg overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                  >
                    <img src={preview} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
                
                {/* Add Image Button */}
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Add Image</span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleAddImages} 
                    className="hidden" 
                  />
                </label>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Tip: Add multiple product images to show different angles and details
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Form Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Info Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    {renderCategoryOptions(categories)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (₱)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Order</label>
                <input
                  type="number"
                  name="minOrder"
                  value={formData.minOrder}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full mt-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Market</label>
                  <textarea
                    name="targetMarket"
                    value={Array.isArray(formData.targetMarket) ? formData.targetMarket.join('\n') : formData.targetMarket}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                    placeholder="One per line"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate with Enter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Key Features</label>
                  <textarea
                    name="targetMarketKeyFeatures"
                    value={Array.isArray(formData.targetMarketKeyFeatures) ? formData.targetMarketKeyFeatures.join('\n') : formData.targetMarketKeyFeatures}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                    placeholder="One per line"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate with Enter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 py-4 px-6 z-10">
        <div className="max-w-6xl mx-auto flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;