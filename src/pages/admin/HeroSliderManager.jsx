import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import { 
  FaEdit, 
  FaTrash, 
  FaGripVertical, 
  FaPlus, 
  FaTimesCircle, 
  FaUpload,
  FaImage,
  FaMobileAlt,
  FaDesktop,
  FaLink,
  FaFont,
  FaExclamationTriangle,
  FaSortAmountDown,
  FaCheck
} from 'react-icons/fa';
import {
  fetchHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  updateSlidesOrder,
  uploadImage
} from '../../api/heroSlides';

// Helper function to ensure draggable IDs are always valid static strings
// This function won't change between renders
const createDraggableId = (prefix, id) => {
  // Return a consistent string that doesn't depend on index position
  // but is stable and unique for each slide
  if (typeof id !== 'string') return `${prefix}-${id}`;
  return `${prefix}-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
};

const HeroSliderManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null); // Track which image is uploading
  const [disableCta, setDisableCta] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Force remount of DragDropContext - this helps react-beautiful-dnd refresh properly
  const [contextKey, setContextKey] = useState(Date.now());
  
  // Reference to store permanent IDs for each slide
  const permanentIdsRef = useRef(new Map());
  
  // Form data for new/edit slide
  const [formData, setFormData] = useState({
    image: '',
    mobileImage: '', // Added mobile image field
    title: '',
    subtitle: '',
    cta: 'Learn More',
    link: '/',
    order: 0
  });

  // Fetch slides on component mount
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchSlidesData();
  }, [user, navigate]);

  const fetchSlidesData = async () => {
    try {
      setLoading(true);
      
      // Use API function instead of Firestore
      const slidesData = await fetchHeroSlides();
      
      // Assign permanent IDs if they don't exist yet
      const permanentIds = permanentIdsRef.current;
      
      // Process slides with permanent IDs
      const processedSlides = slidesData.map(slide => {
        const slideId = slide._id.toString();
        
        // If this slide doesn't have a permanent ID yet, assign one
        if (!permanentIds.has(slideId)) {
          permanentIds.set(slideId, `permanent-id-${uuidv4()}`);
        }
        
        // Add the permanent ID to the slide
        return {
          ...slide,
          permanentId: permanentIds.get(slideId)
        };
      });
      
      // Force remount of DragDropContext to refresh internal state
      setContextKey(Date.now());
      
      // Store processed slides
      setSlides(processedSlides);
      
      toast.success('Slides loaded successfully', {
        icon: '🖼️',
        duration: 2000,
      });
    } catch (error) {
      console.error("Error fetching slides:", error);
      toast.error("Failed to load hero slides");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSlide = () => {
    setCurrentSlide(null);
    setFormData({
      image: '',
      mobileImage: '', // Clear mobile image field
      title: '',
      subtitle: '',
      cta: 'Learn More',
      link: '/',
      order: slides.length // Set order to the end of the list
    });
    setDisableCta(false);
    setIsModalOpen(true);
  };

  const handleEditSlide = (slide) => {
    setCurrentSlide(slide);
    setFormData({
      image: slide.image || '',
      mobileImage: slide.mobileImage || '', // Load mobile image if exists
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      cta: slide.cta || '',
      link: slide.link || '/',
      order: slide.order || 0
    });
    setDisableCta(!slide.cta);
    setIsModalOpen(true);
  };

  const handleDeleteSlide = async (slideId) => {
    if (!window.confirm('Are you sure you want to delete this slide?')) return;
    
    try {
      // Use API function instead of Firestore
      await deleteHeroSlide(slideId);
      toast.success('Slide deleted successfully', {
        icon: '🗑️',
        duration: 3000
      });
      
      // Refetch slides after deletion
      fetchSlidesData();
    } catch (error) {
      console.error("Error deleting slide:", error);
      toast.error("Failed to delete slide");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadingType('desktop');
      
      // Use API function for image upload
      const imageUrl = await uploadImage(file);
      
      // Update form data with the new image URL
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }));
      
      toast.success('Desktop image uploaded successfully', {
        icon: '🖥️',
        duration: 3000
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      setUploadingType(null);
    }
  };

  // New handler for mobile image upload
  const handleMobileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadingType('mobile');
      
      // Use API function for image upload
      const imageUrl = await uploadImage(file);
      
      // Update form data with the new mobile image URL
      setFormData(prev => ({
        ...prev,
        mobileImage: imageUrl
      }));
      
      toast.success('Mobile image uploaded successfully', {
        icon: '📱',
        duration: 3000
      });
    } catch (error) {
      console.error("Error uploading mobile image:", error);
      toast.error("Failed to upload mobile image");
    } finally {
      setIsUploading(false);
      setUploadingType(null);
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
      toast.error("Please upload a desktop image for the slide", {
        icon: '⚠️',
        duration: 4000
      });
      return;
    }
    
    try {
      const slideData = {
        image: formData.image,
        mobileImage: formData.mobileImage || '', // Include mobile image
        title: formData.title,
        subtitle: formData.subtitle,
        cta: disableCta ? null : formData.cta,
        link: formData.link,
        order: formData.order
      };
      
      if (currentSlide) {
        // Update existing slide using API
        await updateHeroSlide(currentSlide._id, slideData);
        toast.success('Slide updated successfully', {
          icon: '✅',
          duration: 3000
        });
      } else {
        // Add new slide using API
        await createHeroSlide(slideData);
        toast.success('Slide added successfully', {
          icon: '✅',
          duration: 3000
        });
      }
      
      setIsModalOpen(false);
      fetchSlidesData();
    } catch (error) {
      console.error("Error saving slide:", error);
      toast.error("Failed to save slide");
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
                  Hero Slider Manager
                </h1>
                <p className="text-blue-100 mt-1">Create and manage hero banners for your website</p>
              </div>
              <button
                onClick={handleAddNewSlide}
                className="px-5 py-2.5 bg-white text-blue-700 rounded-full font-medium hover:bg-blue-50 transition-colors shadow-md flex items-center"
              >
                <FaPlus className="mr-2" /> Add New Slide
              </button>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FaSortAmountDown className="mr-2 text-blue-500" /> 
                  <span>Manage Slides</span>
                </h2>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full animate-ping opacity-75"></div>
                      <div className="relative w-16 h-16 border-4 border-b-transparent border-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-500 mt-4 animate-pulse">Loading slides...</p>
                  </div>
                ) : slides.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <FaImage className="text-blue-500 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No slides found</h3>
                    <p className="text-gray-500 mb-6">Create your first slide to start showcasing content on your homepage</p>
                    <button
                      onClick={handleAddNewSlide}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-md flex items-center mx-auto"
                    >
                      <FaPlus className="mr-2" /> Create First Slide
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slides.map((slide, index) => (
                      <div
                        key={slide._id.toString()}
                        className="flex items-center bg-white border rounded-xl p-4 shadow-sm transition-all hover:bg-gray-50"
                      >
                        {/* Order number indicator replacing drag handle */}
                        <div className="p-2 mr-2 bg-gray-100 text-gray-600 rounded-lg">
                          <span className="font-medium">{index + 1}</span>
                        </div>
                        
                        <div className="flex flex-shrink-0 mr-4">
                          <div>
                            <div className="w-24 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                              <img
                                src={slide.image}
                                alt={slide.title || "Desktop preview"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/150x100?text=No+Image';
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
                              <FaDesktop className="mr-1 text-gray-400" size={10} />
                              Desktop
                            </div>
                          </div>
                          
                          {slide.mobileImage && (
                            <div className="ml-2">
                              <div className="w-10 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                                <img
                                  src={slide.mobileImage}
                                  alt={slide.title || "Mobile preview"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/150x100?text=No+Image';
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
                                <FaMobileAlt className="mr-1 text-gray-400" size={8} />
                                Mobile
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Rest of your slide content remains the same */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-md font-medium text-gray-800 truncate">{slide.title || "Untitled Slide"}</h3>
                          <p className="text-sm text-gray-500 truncate">{slide.subtitle || "No subtitle"}</p>
                          
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <div className="flex items-center mr-3">
                              <FaLink className="mr-1" size={10} />
                              <span className="truncate max-w-[150px]">{slide.link || "/"}</span>
                            </div>
                            
                            {slide.cta && (
                              <div className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {slide.cta}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditSlide(slide)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit slide"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteSlide(slide._id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete slide"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message about live changes */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm flex items-start">
              <FaExclamationTriangle className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Changes to slides are applied immediately on the live site. Make sure to preview the homepage after making changes.
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
      
      {/* Modal for Add/Edit Slide */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-semibold text-white flex items-center">
                {currentSlide ? (
                  <>
                    <FaEdit className="mr-2" />
                    Edit Slide
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-2" />
                    Add New Slide
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
            
            {/* Form with visual sections */}
            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* Images Section */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <FaImage className="mr-2 text-blue-500" />
                  Slide Images
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Desktop Image */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Desktop Image <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-gray-500">Recommended: 1920×1080px</span>
                    </div>
                    
                    {formData.image ? (
                      <div className="relative mb-3 group">
                        <img
                          src={formData.image}
                          alt="Desktop preview"
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
                          id="slide-image"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="slide-image"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <div className="w-16 h-16 mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                            <FaUpload className="text-blue-500 w-6 h-6" />
                          </div>
                          <span className="text-gray-700 font-medium mb-1">Click to upload desktop image</span>
                          <span className="text-xs text-gray-500">
                            16:9 ratio recommended (1920×1080px)
                          </span>
                        </label>
                      </div>
                    )}
                    {isUploading && uploadingType === 'desktop' && (
                      <div className="flex items-center justify-center py-2 bg-blue-50 rounded-lg">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-blue-600 mr-2"></div>
                        <span className="text-sm text-blue-700">Uploading desktop image...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile Image */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Mobile Image <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <span className="text-xs text-gray-500">Recommended: 640×960px</span>
                    </div>
                    
                    {formData.mobileImage ? (
                      <div className="relative mb-3 group">
                        <img
                          src={formData.mobileImage}
                          alt="Mobile preview"
                          className="w-full h-64 object-cover rounded-lg border border-gray-300 shadow-sm group-hover:opacity-90 transition-opacity"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, mobileImage: '' }))}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                        >
                          <FaTimesCircle />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <input
                          type="file"
                          id="mobile-slide-image"
                          accept="image/*"
                          onChange={handleMobileImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="mobile-slide-image"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <div className="w-16 h-16 mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                            <FaMobileAlt className="text-blue-500 w-6 h-6" />
                          </div>
                          <span className="text-gray-700 font-medium mb-1">Click to upload mobile image</span>
                          <span className="text-xs text-gray-500">
                            Portrait orientation (640×960px)
                          </span>
                        </label>
                      </div>
                    )}
                    {isUploading && uploadingType === 'mobile' && (
                      <div className="flex items-center justify-center py-2 bg-blue-50 rounded-lg">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-blue-600 mr-2"></div>
                        <span className="text-sm text-blue-700">Uploading mobile image...</span>
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-gray-500 flex items-start">
                      <FaExclamationTriangle className="text-yellow-500 mr-1.5 flex-shrink-0 mt-0.5" size={12} />
                      <span>If no mobile image is provided, the desktop image will be used on mobile devices.</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content Section */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <FaFont className="mr-2 text-blue-500" />
                  Slide Content
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      placeholder="Enter slide title"
                    />
                    <p className="mt-1 text-xs text-gray-500">The main heading displayed on the slide</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <textarea
                      name="subtitle"
                      value={formData.subtitle}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      rows={2}
                      placeholder="Enter slide subtitle or description"
                    ></textarea>
                    <p className="mt-1 text-xs text-gray-500">Additional text displayed below the title</p>
                  </div>
                </div>
              </div>
              
              {/* Call-to-Action Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <FaLink className="mr-2 text-blue-500" />
                    Call-to-Action Button
                  </h3>
                  
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="disable-cta"
                      checked={disableCta}
                      onChange={(e) => setDisableCta(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">No CTA button</span>
                  </label>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${disableCta ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      name="cta"
                      value={formData.cta}
                      onChange={handleInputChange}
                      disabled={disableCta}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      placeholder="e.g., Learn More"
                    />
                    <p className="mt-1 text-xs text-gray-500">Text displayed on the button</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                    <input
                      type="text"
                      name="link"
                      value={formData.link}
                      onChange={handleInputChange}
                      disabled={disableCta}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm"
                      placeholder="e.g., /products"
                    />
                    <p className="mt-1 text-xs text-gray-500">URL where the button will direct users</p>
                  </div>
                </div>
              </div>
              
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
                  ) : currentSlide ? (
                    <>
                      <FaCheck className="mr-1.5" size={14} />
                      Update Slide
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-1.5" size={14} />
                      Add Slide
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
        
        /* Line clamp for text overflow */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default HeroSliderManager; 