import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FaCamera, FaImages, FaRegTrashAlt, FaUpload, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

const CreateProduct = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState({});
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'targetMarketKeyFeatures' || name === 'targetMarket') {
      const lines = value.split('\n');
      setFormData((prev) => ({ ...prev, [name]: lines }));
    } else if (name === 'stock' || name === 'minOrder') {
      const numValue = value === '' ? 0 : parseInt(value, 10);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else if (name === 'price') {
      const numValue = value === '' ? 0 : Number(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Enhanced main image dropzone with callbacks
  const onMainImageDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file size
      if (!validateFileSize(file)) {
        setFileSizeError(`File too large (${formatFileSize(file.size)}). Maximum size is 2MB.`);
        return;
      }
      
      setFileSizeError(''); // Clear any previous error
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      
      // Simulate upload progress
      simulateUploadProgress();
    }
  }, []);
  
  const { getRootProps: getMainImageRootProps, getInputProps: getMainImageInputProps, isDragActive: isMainImageDragActive } = useDropzone({
    onDrop: onMainImageDrop,
    accept: {'image/*': []},
    maxFiles: 1
  });
  
  // Enhanced additional images dropzone
  const onAdditionalImagesDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      // Check each file size
      const oversizedFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        setAdditionalFilesSizeError(`${oversizedFiles.length} file(s) exceed the 2MB limit and were not added.`);
        // Only add files that are within size limit
        const validFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);
        
        if (validFiles.length === 0) return;
        
        setImageFiles(prev => [...prev, ...validFiles]);
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      } else {
        setAdditionalFilesSizeError(''); // Clear any previous error
        setImageFiles(prev => [...prev, ...acceptedFiles]);
        const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      }
      
      // Simulate upload progress
      simulateUploadProgress();
    }
  }, []);
  
  const { getRootProps: getAdditionalImagesRootProps, getInputProps: getAdditionalImagesInputProps, isDragActive: isAdditionalImagesDragActive } = useDropzone({
    onDrop: onAdditionalImagesDrop,
    accept: {'image/*': []},
    maxFiles: 4
  });
  
  // Simulates upload progress animation
  const simulateUploadProgress = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (!validateFileSize(file)) {
        setFileSizeError(`File too large (${formatFileSize(file.size)}). Maximum size is 2MB.`);
        e.target.value = null; // Reset the input
        return;
      }
      
      setFileSizeError(''); // Clear any previous error
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      simulateUploadProgress();
    }
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Check each file size
      const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        setAdditionalFilesSizeError(`${oversizedFiles.length} file(s) exceed the 2MB limit and were not added.`);
        // Only add files that are within size limit
        const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
        
        if (validFiles.length === 0) {
          e.target.value = null; // Reset the input
          return;
        }
        
        setImageFiles(prev => [...prev, ...validFiles]);
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      } else {
        setAdditionalFilesSizeError(''); // Clear any previous error
        setImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      }
      
      simulateUploadProgress();
    }
  };

  const removeImage = (index) => {
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formData.stock < 0) newErrors.stock = 'Stock cannot be negative';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.image) newErrors.image = 'Main product image is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    setLoading(true);
    try {
      let mainImageUrl = '';
      if (formData.image) {
        const cloudData = new FormData();
        cloudData.append('file', formData.image);
        cloudData.append('upload_preset', 'ml_default');
        const cloudinaryResponse = await fetch(
          'https://api.cloudinary.com/v1_1/dsfc6qjqx/image/upload',
          { method: 'POST', body: cloudData }
        );
        const cloudResult = await cloudinaryResponse.json();
        if (!cloudinaryResponse.ok) throw new Error(cloudResult.error?.message || 'Cloudinary upload error');
        mainImageUrl = cloudResult.secure_url;
      }
      
      const additionalImageUrls = [];
      for (const img of imageFiles) {
        if (formData.image === img) continue;
        
        const cloudData = new FormData();
        cloudData.append('file', img);
        cloudData.append('upload_preset', 'ml_default');
        const cloudinaryResponse = await fetch(
          'https://api.cloudinary.com/v1_1/dsfc6qjqx/image/upload',
          { method: 'POST', body: cloudData }
        );
        const cloudResult = await cloudinaryResponse.json();
        if (!cloudinaryResponse.ok) throw new Error(cloudResult.error?.message || 'Cloudinary upload error');
        additionalImageUrls.push(cloudResult.secure_url);
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        stock: Number(formData.stock),
        minOrder: Number(formData.minOrder),
        targetMarketKeyFeatures: Array.isArray(formData.targetMarketKeyFeatures)
          ? formData.targetMarketKeyFeatures
          : formData.targetMarketKeyFeatures.toString().split('\n').filter((line) => line.trim() !== ''),
        targetMarket: Array.isArray(formData.targetMarket)
          ? formData.targetMarket
          : formData.targetMarket.toString().split('\n').filter((line) => line.trim() !== ''),
        status: formData.status,
        image: mainImageUrl,
        images: additionalImageUrls.length > 0 ? additionalImageUrls : []
      };

      if (payload.stock === undefined || payload.stock === null) {
        throw new Error('Stock value is required');
      }

      await user.getIdToken(true);
      const tokenResult = await user.getIdTokenResult();
      if (!tokenResult.claims.admin) throw new Error('User does not have admin privileges');

      const token = await user.getIdToken();
      if (!token) throw new Error('No token available');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create product');

      toast.success('Product created successfully!');
      navigate('/admin/products');
    } catch (error) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const testBackend = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/test`);
      
      const token = await user.getIdToken(true);
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/protected-test`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (error) {
      // Backend test error - silently handle
    }
  };

  useEffect(() => {
    testBackend();
  }, []);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = await user.getIdToken(true);
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/verify-admin`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        // Admin verification failed
      }
    };
    if (user) verifyAdmin();
  }, [user]);

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
        setCategories(data);
      } catch (error) {
        toast.error('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create New Product</h2>
              <p className="text-indigo-100 mt-1">Add a new product to your inventory</p>
            </div>
            <button
              onClick={() => navigate('/admin/products')}
              className="flex items-center px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Products
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Enhanced Product Image Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center">
                  <FaCamera className="w-5 h-5 text-indigo-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Product Image</h3>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Main image dropzone with enhanced styling */}
                <div 
                  {...getMainImageRootProps()} 
                  className={`w-full h-64 border-2 ${isMainImageDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50'} 
                    rounded-lg overflow-hidden hover:border-indigo-400 transition-all duration-200 cursor-pointer
                    ${errors.image ? 'border-red-300 bg-red-50' : ''} ${fileSizeError ? 'border-red-300 bg-red-50' : ''} relative group`}
                >
                  <input {...getMainImageInputProps()} />
                  
                  {isUploading && imagePreview && (
                    <div className="absolute inset-0 bg-gray-800/70 flex flex-col items-center justify-center z-10">
                      <div className="w-16 h-16 mb-2 relative">
                        <svg className="w-full h-full animate-spin text-indigo-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                        </div>
                      </div>
                      <p className="text-white text-sm">Uploading image...</p>
                    </div>
                  )}
                  
                  {imagePreview ? (
                    <div className="relative h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" />
                      {!isUploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagePreview(null);
                              setFormData(prev => ({ ...prev, image: null }));
                              setFileSizeError('');
                            }}
                            className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
                          >
                            <FaRegTrashAlt className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center px-4">
                        <FaUpload className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-gray-500 font-medium">Drag & drop main image here</p>
                        <p className="text-gray-400 text-sm mt-1">or click to browse files</p>
                        {errors.image && <p className="text-red-500 text-sm mt-2">{errors.image}</p>}
                        {fileSizeError && (
                          <div className="mt-2 flex items-center text-red-500 text-sm">
                            <FaExclamationTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{fileSizeError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center my-2">
                  <div className="flex-grow h-px bg-gray-200"></div>
                  <span className="px-3 text-xs text-gray-500 font-medium">OR</span>
                  <div className="flex-grow h-px bg-gray-200"></div>
                </div>
                
                <label 
                  htmlFor="main-image-upload"
                  className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:from-indigo-600 hover:to-indigo-700 transition-colors shadow-sm"
                >
                  <FaCamera className="w-4 h-4 mr-2" />
                  Add Main Product Image
                <input
                    id="main-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                
                <p className="text-xs text-gray-500 flex items-start">
                  <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Upload a high-quality image to attract customers. Max size: 2MB. </span>
                </p>
              </div>
            </div>
            
            {/* Enhanced Additional Images Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center">
                  <FaImages className="w-5 h-5 text-indigo-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Additional Images</h3>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {additionalFilesSizeError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                    <div className="flex items-center text-red-500 text-sm">
                      <FaExclamationTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{additionalFilesSizeError}</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div 
                      key={`image-${index}`}
                      className="relative group aspect-square border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                    >
                      <img 
                        src={preview} 
                        alt={`Product ${index + 1}`} 
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <button
                          type="button"
                        onClick={() => removeImage(index)}
                          className="bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 transform translate-y-1 group-hover:translate-y-0"
                      >
                          <FaRegTrashAlt className="w-4 h-4" />
                      </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Enhanced dropzone for additional images */}
                  <div 
                    {...getAdditionalImagesRootProps()}
                    className={`aspect-square border-2 ${
                      isAdditionalImagesDragActive ? 'border-indigo-400 bg-indigo-50 border-dashed' : 'border-gray-300 border-dashed bg-gray-50'
                    } rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors`}
                  >
                    <input {...getAdditionalImagesInputProps()} />
                    <FaUpload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Images</span>
                    <span className="text-xs text-gray-400 mt-1">{imagePreviews.length}/4</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 flex items-start mt-3">
                  <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Add multiple product images to show different angles and details. Max size: 2MB per image.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Basic Info</h3>
                </div>
              </div>
              
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 gap-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                        className={`w-full h-11 px-4 rounded-lg border ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200`}
                    required
                  />
                      {errors.name && (
                        <div className="mt-1 text-sm text-red-500 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.name}
                        </div>
                      )}
                    </div>
                </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                  </label>
                    <div className="relative">
                  <select
                        name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={`w-full h-11 pl-4 pr-8 rounded-lg appearance-none ${errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200`}
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {errors.category && (
                        <div className="mt-1 text-sm text-red-500 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.category}
                        </div>
                      )}
                    </div>
                </div>
                  
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                        className="w-full h-11 pl-4 pr-8 rounded-lg border border-gray-300 appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Active products will be visible to customers
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Inventory Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Inventory & Pricing</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₱) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">₱</span>
                      </div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                        className={`w-full h-11 pl-8 pr-4 rounded-lg border ${errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200`}
                    required
                  />
                      {errors.price && (
                        <div className="mt-1 text-sm text-red-500 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.price}
                        </div>
                      )}
                    </div>
                </div>
                  
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock <span className="text-red-500">*</span>
                    </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                      className={`w-full h-11 px-4 rounded-lg border ${errors.stock ? 'border-red-300 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200`}
                    required
                  />
                    {errors.stock && (
                      <div className="mt-1 text-sm text-red-500 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.stock}
                      </div>
                    )}
                </div>
                  
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Order
                    </label>
                  <input
                    type="number"
                    name="minOrder"
                    value={formData.minOrder}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                    required
                  />
                    <p className="mt-1 text-xs text-gray-500">
                      Minimum quantity per order
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Product Details</h3>
                </div>
              </div>
              
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                      className={`w-full px-4 py-3 rounded-lg border ${errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 resize-none`}
                    required
                  />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {formData.description.length} characters
                    </div>
                    {errors.description && (
                      <div className="mt-1 text-sm text-red-500 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.description}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Provide a detailed description of your product
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Market <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                    <textarea
                      name="targetMarket"
                      value={Array.isArray(formData.targetMarket) ? formData.targetMarket.join('\n') : formData.targetMarket}
                      onChange={handleInputChange}
                      rows={4}
                      style={{ whiteSpace: 'pre-wrap' }}
                      wrap="soft"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 resize-none"
                      placeholder="One per line"
                      required
                    />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                        {Array.isArray(formData.targetMarket) ? formData.targetMarket.length : 0} items
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 flex items-start">
                      <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                      Enter each target market on a new line
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key Features <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                    <textarea
                      name="targetMarketKeyFeatures"
                      value={
                        Array.isArray(formData.targetMarketKeyFeatures)
                          ? formData.targetMarketKeyFeatures.join('\n')
                          : formData.targetMarketKeyFeatures
                      }
                      onChange={handleInputChange}
                      rows={4}
                      style={{ whiteSpace: 'pre-wrap' }}
                      wrap="soft"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 resize-none"
                      placeholder="One per line"
                      required
                    />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                        {Array.isArray(formData.targetMarketKeyFeatures) ? formData.targetMarketKeyFeatures.length : 0} items
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 flex items-start">
                      <FaInfoCircle className="w-3 h-3 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                      Enter each feature on a new line
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Fixed Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-6 z-10 backdrop-blur-sm bg-white/95">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </div>
            <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
                className={`px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                  <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                    Creating Product...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Product
                  </div>
              )}
            </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateProduct;