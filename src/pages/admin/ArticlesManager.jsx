import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FaNewspaper, FaPencilAlt, FaTrash, FaCheck, FaTimes, FaExternalLinkAlt, FaPlus, FaSave, FaEye, FaClock, FaStar } from 'react-icons/fa';

const ArticlesManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'skincare',
    image: '',
    featured: false,
    readTime: '5 min read'
  });
  
  const categories = [
    { id: 'skincare', name: 'Skincare' },
    { id: 'manufacturing', name: 'Manufacturing' },
    { id: 'compliance', name: 'Compliance' },
    { id: 'business', name: 'Business' }
  ];
  
  const quillRef = useRef(null);
  
  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };
  
  // Fetch articles on component mount
  useEffect(() => {
    fetchArticles();
  }, []);
  
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/articles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleContentChange = (value) => {
    setFormData({
      ...formData,
      content: value
    });
  };
  
  const handleEdit = (article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      image: article.image,
      featured: article.featured || false,
      readTime: article.readTime || '5 min read'
    });
    setIsEditing(true);
  };
  
  const handleCreateNew = () => {
    setSelectedArticle(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'skincare',
      image: '',
      featured: false,
      readTime: '5 min read'
    });
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setSelectedArticle(null);
  };
  
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!formData.excerpt.trim()) {
      toast.error('Excerpt is required');
      return false;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return false;
    }
    if (!formData.image.trim()) {
      toast.error('Image URL is required');
      return false;
    }
    return true;
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'skincare',
      image: '',
      featured: false,
      readTime: '5 min read'
    });
  };
  
  const saveArticle = async () => {
    // Validate required fields
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.excerpt.trim()) {
      toast.error('Excerpt is required');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }
    
    try {
      setSaving(true);
      const token = await user.getIdToken();
      
      // Prepare the article data
      const articleData = {
        ...formData,
        // Ensure we're sending all required fields
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content,
        category: formData.category,
        image: formData.image || 'https://via.placeholder.com/800x400?text=Article+Image'
      };
      
      console.log('Saving article with data:', articleData);
      
      let response;
      
      if (isEditing && selectedArticle) {
        // Update existing article
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/articles/${selectedArticle._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(articleData)
        });
        
        toast.success('Article updated successfully');
      } else {
        // Create new article
        const formData = new FormData();
        formData.append('title', articleData.title);
        formData.append('excerpt', articleData.excerpt);
        formData.append('content', articleData.content);
        formData.append('category', articleData.category);
        formData.append('image', articleData.image);
        formData.append('featured', articleData.featured);
        formData.append('readTime', articleData.readTime);
        
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/articles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        toast.success('Article created successfully');
      }
      
      console.log('Response:', response);
      
      // Reset form and refresh articles list
      resetForm();
      fetchArticles();
      setIsEditing(false);
      setSelectedArticle(null);
    } catch (error) {
      console.error('Error saving article:', error);
      
      // Extract more detailed error information
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to save article: ${errorMessage}`);
      
      // Log detailed error information for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
    } finally {
      setSaving(false);
    }
  };
  
  const deleteArticle = async () => {
    try {
      setSaving(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/articles/${selectedArticle._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete article');
      
      toast.success('Article deleted successfully');
      await fetchArticles();
      setIsEditing(false);
      setSelectedArticle(null);
      setShowConfirmDelete(false);
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    } finally {
      setSaving(false);
    }
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Get category color class by ID
  const getCategoryColorClass = (categoryId) => {
    switch(categoryId) {
      case 'skincare':
        return 'bg-pink-100 text-pink-800';
      case 'manufacturing':
        return 'bg-blue-100 text-blue-800';
      case 'compliance':
        return 'bg-purple-100 text-purple-800';
      case 'business':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 p-0 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <FaNewspaper className="mr-3" />
                  Articles Manager
                </h1>
                <p className="text-indigo-100 mt-1">Create and manage blog articles for your store</p>
              </div>
              {!isEditing && (
                <button
                  onClick={handleCreateNew}
                  className="px-5 py-2.5 bg-white text-indigo-700 rounded-full font-medium hover:bg-indigo-50 transition-colors shadow-md flex items-center"
                >
                  <FaPlus className="mr-2" />
                  Create New Article
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-8 py-6">
          {isEditing ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FaPencilAlt className="mr-2 text-indigo-500" />
                  {selectedArticle ? 'Edit Article' : 'Create New Article'}
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Main form area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="Enter a compelling article title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt <span className="text-red-500">*</span></label>
                      <textarea
                        name="excerpt"
                        value={formData.excerpt}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                        rows={3}
                        placeholder="Write a brief summary of the article"
                      ></textarea>
                      <p className="mt-1 text-xs text-gray-500">This appears in article previews. Keep it concise and engaging.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image URL <span className="text-red-500">*</span></label>
                      <div className="flex">
                        <input
                          type="text"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      {formData.image && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                          <img 
                            src={formData.image} 
                            alt="Preview" 
                            className="w-full h-48 object-cover"
                            onError={(e) => {e.target.src = 'https://via.placeholder.com/800x400?text=Invalid+Image+URL'}} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-4 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm appearance-none"
                        >
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Read Time</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="readTime"
                          value={formData.readTime}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                          placeholder="e.g. 5 min read"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <FaClock className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          id="featured"
                          name="featured"
                          checked={formData.featured}
                          onChange={handleInputChange}
                          className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-700">Featured Article</span>
                          <p className="text-xs text-gray-500 mt-0.5">Featured articles appear prominently on the blog page</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Content editor - full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
                  <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                    <ReactQuill
                      ref={quillRef}
                      value={formData.content}
                      onChange={handleContentChange}
                      modules={modules}
                      className="h-80 bg-white"
                      theme="snow"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Use the toolbar to format your content, add links, and insert images.</p>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-8 gap-3">
                  {selectedArticle && (
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="px-5 py-2.5 bg-white border border-red-300 text-red-600 rounded-full font-medium hover:bg-red-50 transition-colors shadow-sm flex items-center"
                      disabled={saving}
                    >
                      <FaTrash className="mr-2" />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={handleCancel}
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center"
                    disabled={saving}
                  >
                    <FaTimes className="mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={saveArticle}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex items-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        Save Article
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-12 border border-gray-200">
                  <div className="relative w-16 h-16">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-16 h-16 border-4 border-b-transparent border-indigo-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-500 mt-4 animate-pulse">Loading articles...</p>
                </div>
              ) : (
                <>
                  {articles.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200">
                      <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                        <FaNewspaper className="text-indigo-500 w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">Share your expertise and engage with customers by creating your first article.</p>
                      <button
                        onClick={handleCreateNew}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md flex items-center mx-auto"
                      >
                        <FaPlus className="mr-2" />
                        Create New Article
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {articles.map(article => (
                        <div key={article._id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                          <div className="flex flex-col md:flex-row">
                            {/* Image container - fixed height on mobile, fixed width on desktop */}
                            <div className="md:w-64 h-48 md:h-auto overflow-hidden bg-gray-100 relative group">
                              <img 
                                src={article.image} 
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {e.target.src = 'https://via.placeholder.com/400x300?text=Article+Image'}}
                              />
                              {article.featured && (
                                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium shadow-sm flex items-center">
                                  <FaStar className="mr-1" size={10} />
                                  Featured
                                </div>
                              )}
                            </div>
                            
                            {/* Content container */}
                            <div className="flex-1 p-6">
                              <div className="flex flex-col h-full justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColorClass(article.category)} capitalize`}>
                                      {getCategoryName(article.category)}
                                    </span>
                                    
                                    <span className="flex items-center text-xs text-gray-500">
                                      <FaClock className="mr-1" size={10} />
                                      {article.readTime}
                                    </span>
                                    
                                    <span className="text-xs text-gray-500">
                                      Updated: {new Date(article.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                  
                                  <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 hover:text-indigo-600 transition-colors">
                                    {article.title}
                                  </h2>
                                  
                                  <p className="text-gray-600 mb-4 line-clamp-2">
                                    {article.excerpt}
                                  </p>
                                </div>
                                
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                  <a
                                    href={`/articles/${article._id}`}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                                  >
                                    <FaEye className="mr-1.5" />
                                    Preview
                                  </a>
                                  
                                  <button
                                    onClick={() => handleEdit(article)}
                                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm flex items-center"
                                  >
                                    <FaPencilAlt className="mr-1.5" />
                                    Edit Article
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Delete Confirmation Modal */}
          {showConfirmDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0 overflow-hidden animate-scale-in">
                <div className="bg-red-50 p-4 border-b border-red-100">
                  <h3 className="text-lg font-semibold text-red-700 flex items-center">
                    <FaTrash className="mr-2" />
                    Confirm Delete
                  </h3>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to delete the article "<span className="font-semibold">{selectedArticle.title}</span>"? This action cannot be undone.
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center"
                    >
                      <FaTimes className="mr-1.5" />
                      Cancel
                    </button>
                    <button
                      onClick={deleteArticle}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm font-medium flex items-center"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FaTrash className="mr-1.5" />
                          Delete Article
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Preview Button */}
          {!isEditing && articles.length > 0 && (
            <div className="mt-6 text-right">
              <a 
                href="/articles" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-full font-medium hover:from-gray-800 hover:to-black transition-all shadow-md inline-flex items-center"
              >
                <span>Preview Articles Page</span>
                <FaExternalLinkAlt className="ml-2" size={12} />
              </a>
            </div>
          )}
        </div>
      </div>
      
      {/* Add animations for the dashboard */}
      <style jsx global>{`
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
        
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

export default ArticlesManager; 