import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaTimesCircle, 
  FaUpload,
  FaImage,
  FaLink,
  FaFont,
  FaExclamationTriangle,
  FaCheck,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import api from '../../api/client';
import { uploadImage } from '../../services/cloudinary';

/**
 * IMPORTANT NOTE FOR IMAGE UPLOADS:
 * For optimal performance and user experience, please use:
 * - WebP format images whenever possible (better compression, smaller file size)
 * - Images under 2MB in size
 * - Compress images before uploading to improve page load times
 * - Consider dimensions appropriate for display context to avoid unnecessary file size
 */

const ProductSpotlightManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Note visibility state
  const [showImageNote, setShowImageNote] = useState(() => {
    // Get saved preference from localStorage or default to true (shown)
    return localStorage.getItem('showImageNote') !== 'false';
  });
  
  // Toggle note visibility
  const toggleImageNote = () => {
    const newValue = !showImageNote;
    setShowImageNote(newValue);
    localStorage.setItem('showImageNote', newValue.toString());
  };
  
  const [loading, setLoading] = useState(true);
  const [spotlightData, setSpotlightData] = useState({
    hero: {
      image: '',
      title: '',
      description: '',
      buttonText: '',
      buttonLink: ''
    },
    products: [],
    promotionBanner: {
      image: '',
      title: '',
      description: '',
      badgeText: '',
      buttonText: '',
      buttonLink: ''
    }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentItemType, setCurrentItemType] = useState(null); // 'hero', 'product', or 'promotion'
  const [isUploading, setIsUploading] = useState(false);
  
  // Form data for editing
  const [formData, setFormData] = useState({
    image: '',
    title: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    badgeText: ''
  });

  // Fetch spotlight data on component mount
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchSpotlightData();
  }, [user, navigate]);

  const fetchSpotlightData = async () => {
    try {
      setLoading(true);
      
      // Use API to fetch spotlight data
      const response = await api.get('/spotlight');
      
      if (response.data) {
        setSpotlightData(response.data);
      }
      
      toast.success('Spotlight data loaded successfully', {
        icon: '🖼️',
        duration: 2000,
      });
    } catch (error) {
      console.error("Error fetching spotlight data:", error);
      toast.error("Failed to load spotlight data");
      
      // Set default data if API fails
      setSpotlightData({
        hero: {
          image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1780&q=80',
          title: 'Discover Your Luminous Glow',
          description: 'Premium skincare formulations designed for visible results and radiant skin',
          buttonText: 'Shop The Collection',
          buttonLink: '/products/category/premium'
        },
        products: [
          {
            id: '1',
            image: '/assets/90_120 CELL REPAIR BOOST.jpg',
            title: 'Cell Repair Boost',
            description: 'Advanced peptide formula for rapid repair',
            badgeText: 'BESTSELLER'
          },
          {
            id: '2',
            image: '/assets/500_500 OXYJET TREATMENT.jpg',
            title: 'OxyJet Pro Treatment',
            description: 'Oxygen-infused professional treatment',
            badgeText: 'NEW'
          },
          {
            id: '3',
            image: '/assets/90_120 PDRN THERAPY (1).jpg',
            title: 'PDRN Therapy Ampoule',
            description: 'Clinical-grade regeneration serum',
            badgeText: 'PREMIUM'
          },
          {
            id: '4',
            image: 'https://images.unsplash.com/photo-1624455806586-81792cf1d559',
            title: 'Hydra-Lift Eye Cream',
            description: 'Intensive lifting and hydrating',
            badgeText: 'SPECIAL'
          }
        ],
        promotionBanner: {
          image: 'https://images.unsplash.com/photo-1571875257727-256c39da42af',
          title: 'Professional Starter Kit',
          description: 'Get started with our complete professional treatment set. Perfect for salons and clinics.',
          badgeText: 'LIMITED TIME OFFER',
          buttonText: 'Shop Now',
          buttonLink: '/products/professional-starter-kit'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditHero = () => {
    setCurrentItem(spotlightData.hero);
    setCurrentItemType('hero');
    setFormData({
      image: spotlightData.hero.image || '',
      title: spotlightData.hero.title || '',
      description: spotlightData.hero.description || '',
      buttonText: spotlightData.hero.buttonText || '',
      buttonLink: spotlightData.hero.buttonLink || '',
      badgeText: ''
    });
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setCurrentItem(product);
    setCurrentItemType('product');
    setFormData({
      image: product.image || '',
      title: product.title || '',
      description: product.description || '',
      badgeText: product.badgeText || '',
      buttonText: '',
      buttonLink: ''
    });
    setIsModalOpen(true);
  };

  const handleEditPromotion = () => {
    setCurrentItem(spotlightData.promotionBanner);
    setCurrentItemType('promotion');
    setFormData({
      image: spotlightData.promotionBanner.image || '',
      title: spotlightData.promotionBanner.title || '',
      description: spotlightData.promotionBanner.description || '',
      badgeText: spotlightData.promotionBanner.badgeText || '',
      buttonText: spotlightData.promotionBanner.buttonText || '',
      buttonLink: spotlightData.promotionBanner.buttonLink || ''
    });
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    setCurrentItem(null);
    setCurrentItemType('product');
    setFormData({
      image: '',
      title: '',
      description: '',
      badgeText: 'NEW',
      buttonText: '',
      buttonLink: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      // Remove product from array
      const updatedProducts = spotlightData.products.filter(product => product.id !== productId);
      
      // Update state
      setSpotlightData({
        ...spotlightData,
        products: updatedProducts
      });
      
      // Save to API
      await api.post('/spotlight', {
        ...spotlightData,
        products: updatedProducts
      });
      
      toast.success('Product deleted successfully', {
        icon: '🗑️',
        duration: 3000
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Use Cloudinary service for image upload (same as HeroSliderManager)
      const imageUrl = await uploadImage(file);
      
      // Update form data with the new image URL
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }));
      
      toast.success('Image uploaded successfully', {
        icon: '🖼️',
        duration: 3000
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image) {
      toast.error("Please upload an image", {
        icon: '⚠️',
        duration: 4000
      });
      return;
    }
    
    try {
      let updatedSpotlightData = { ...spotlightData };
      
      if (currentItemType === 'hero') {
        updatedSpotlightData.hero = {
          image: formData.image,
          title: formData.title,
          description: formData.description,
          buttonText: formData.buttonText,
          buttonLink: formData.buttonLink
        };
      } else if (currentItemType === 'product') {
        if (currentItem) {
          // Update existing product
          const productIndex = updatedSpotlightData.products.findIndex(p => p.id === currentItem.id);
          if (productIndex !== -1) {
            updatedSpotlightData.products[productIndex] = {
              ...currentItem,
              image: formData.image,
              title: formData.title,
              description: formData.description,
              badgeText: formData.badgeText
            };
          }
        } else {
          // Add new product
          updatedSpotlightData.products.push({
            id: Date.now().toString(), // Simple ID generation
            image: formData.image,
            title: formData.title,
            description: formData.description,
            badgeText: formData.badgeText
          });
        }
      } else if (currentItemType === 'promotion') {
        updatedSpotlightData.promotionBanner = {
          image: formData.image,
          title: formData.title,
          description: formData.description,
          badgeText: formData.badgeText,
          buttonText: formData.buttonText,
          buttonLink: formData.buttonLink
        };
      }
      
      // Update state
      setSpotlightData(updatedSpotlightData);
      
      // Save to API
      await api.post('/spotlight', updatedSpotlightData);
      
      toast.success('Spotlight data updated successfully', {
        icon: '✅',
        duration: 3000
      });
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving spotlight data:", error);
      toast.error("Failed to save spotlight data");
    }
  };

  return (
    
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <FaImage className="mr-3" />
                  Product Spotlight Manager
                </h1>
                <p className="text-blue-100 mt-1">Manage the cosmetic product spotlight section on your homepage</p>
              </div>
            </div>
          </div>
        </div>
        <br></br>
        {showImageNote && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 relative">
                <button 
                  onClick={toggleImageNote}
                  className="absolute top-2 right-2 p-1 text-blue-500 hover:text-blue-700 transition-colors"
                  aria-label="Hide image upload note"
                  title="Hide note"
                >
                  <FaEyeSlash size={16} />
                </button>
                <h4 className="font-semibold text-blue-800 flex items-center mb-2">
                  <FaExclamationTriangle className="mr-2" /> Image Upload Guidelines
                </h4>
                <ul className="text-sm text-blue-700 pl-6 list-disc space-y-1">
                  <li>Use WebP format images whenever possible (better compression, smaller file size)</li>
                  <li>Keep images under 2MB in size</li>
                  <li>Compress images before uploading to improve page load times</li>
                  <li>Use dimensions appropriate for display context to avoid unnecessary file size</li>
                </ul>
              </div>
            )}

            {!showImageNote && (
              <div className="flex justify-end mb-4">
                <button 
                  onClick={toggleImageNote}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  aria-label="Show image upload guidelines"
                >
                  <FaEye size={14} className="mr-1" /> Show image guidelines
                </button>
              </div>
            )}
        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Banner Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FaImage className="mr-2 text-blue-500" /> 
                  <span>Hero Banner</span>
                </h2>
                <button
                  onClick={handleEditHero}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                >
                  <FaEdit className="mr-1" /> Edit
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-lg aspect-[21/9]">
                    <img 
                      src={spotlightData.hero.image} 
                      alt={spotlightData.hero.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                      <div className="max-w-xl px-8">
                        <h3 className="text-3xl font-bold text-white mb-2">{spotlightData.hero.title}</h3>
                        <p className="text-white/90 mb-4">{spotlightData.hero.description}</p>
                        <div className="inline-block px-4 py-2 bg-white text-blue-700 rounded-full font-medium">
                          {spotlightData.hero.buttonText}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FaImage className="mr-2 text-blue-500" /> 
                  <span>Product Cards</span>
                </h2>
                <button
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                >
                  <FaPlus className="mr-1" /> Add Product
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {spotlightData.products.map((product) => (
                      <div 
                        key={product.id}
                        className="bg-white rounded-lg overflow-hidden shadow border border-gray-200"
                      >
                        <div className="relative h-48">
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          {product.badgeText && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                              {product.badgeText}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900">{product.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                          
                          <div className="flex justify-end mt-4 space-x-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Promotion Banner Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FaImage className="mr-2 text-blue-500" /> 
                  <span>Promotion Banner</span>
                </h2>
                <button
                  onClick={handleEditPromotion}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                >
                  <FaEdit className="mr-1" /> Edit
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="aspect-square md:aspect-auto md:h-64 relative">
                          <img 
                            src={spotlightData.promotionBanner.image} 
                            alt={spotlightData.promotionBanner.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-6 flex flex-col justify-center text-white">
                          {spotlightData.promotionBanner.badgeText && (
                            <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium mb-2">
                              {spotlightData.promotionBanner.badgeText}
                            </span>
                          )}
                          <h3 className="text-xl font-bold mb-2">{spotlightData.promotionBanner.title}</h3>
                          <p className="text-white/90 mb-4">{spotlightData.promotionBanner.description}</p>
                          <div className="inline-block px-4 py-2 bg-white text-blue-700 rounded-lg font-medium self-start">
                            {spotlightData.promotionBanner.buttonText}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message about live changes */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm flex items-start">
              <FaExclamationTriangle className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Changes to the product spotlight section are applied immediately on the live site. Make sure to preview the homepage after making changes.
              </p>
            </div>
            
            {/* Preview Site Button */}
            <div className="mt-4 text-right">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
              >
                Preview Home Page
                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            </div>

       
          </div>
        </div>
      </div>
      
      {/* Modal for Add/Edit Items */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-semibold text-white flex items-center">
                {currentItemType === 'hero' && (
                  <>
                    <FaEdit className="mr-2" />
                    Edit Hero Banner
                  </>
                )}
                {currentItemType === 'product' && (
                  <>
                    {currentItem ? (
                      <>
                        <FaEdit className="mr-2" />
                        Edit Product
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-2" />
                        Add New Product
                      </>
                    )}
                  </>
                )}
                {currentItemType === 'promotion' && (
                  <>
                    <FaEdit className="mr-2" />
                    Edit Promotion Banner
                  </>
                )}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors focus:outline-none"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Image Section */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <FaImage className="mr-2 text-blue-500" />
                  Image
                </h3>
                
                {formData.image ? (
                  <div className="relative mb-3 group">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg border border-gray-300 shadow-sm group-hover:opacity-90 transition-opacity"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      <FaTimesCircle />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <div className="w-16 h-16 mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUpload className="text-blue-500 w-6 h-6" />
                      </div>
                      <span className="text-gray-700 font-medium mb-1">Click to upload image</span>
                      <span className="text-xs text-gray-500">
                        JPG, PNG, or GIF recommended
                      </span>
                    </label>
                  </div>
                )}
                {isUploading && (
                  <div className="flex items-center justify-center py-2 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Uploading image...</span>
                  </div>
                )}
              </div>
              
              {/* Content Section */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <FaFont className="mr-2 text-blue-500" />
                  Content
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {(currentItemType === 'product' || currentItemType === 'promotion') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                      <input
                        type="text"
                        name="badgeText"
                        value={formData.badgeText}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                        placeholder="E.g., NEW, BESTSELLER, PREMIUM"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      placeholder="Enter title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      rows={3}
                      placeholder="Enter description"
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Button Section - Only for hero and promotion */}
              {(currentItemType === 'hero' || currentItemType === 'promotion') && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <FaLink className="mr-2 text-blue-500" />
                    Button
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        name="buttonText"
                        value={formData.buttonText}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                        placeholder="E.g., Shop Now"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                      <input
                        type="text"
                        name="buttonLink"
                        value={formData.buttonLink}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                        placeholder="E.g., /products/category/premium"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm font-medium flex items-center"
                >
                  <FaTimesCircle className="mr-2" size={14} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm font-medium flex items-center"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-1.5" size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add animation styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProductSpotlightManager; 