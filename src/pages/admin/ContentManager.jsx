import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const ContentManager = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState({
    title: '',
    sections: []
  });
  const [collapsedSections, setCollapsedSections] = useState({});
  
  // Default content that matches the structure in About/index.jsx
  const defaultAboutContent = {
    title: 'About BLCP',
    sections: [
      {
        sectionId: 'hero',
        title: 'Elevate your brand and together, let\'s redefine beauty!',
        content: 'At BLCP, we provide you with greater flexibility to develop beauty products tailored to your brand\'s vision and identity. Stand out in the market by producing a diverse array of unique cosmetics that reflect your brand\'s values.'
      },
      {
        sectionId: 'whatWeDo',
        title: 'What We Do',
        content: 'BLCP bridges the gap between Korean cosmetic manufacturers and Filipino businesses. We\'re your one-stop solution for creating, importing, and rebranding beauty products.',
        items: [
          {
            title: 'OEM Manufacturing',
            description: 'Custom cosmetic manufacturing with Korean quality standards. We handle everything from formulation to packaging, allowing you to focus on your brand and marketing strategy.'
          },
          {
            title: 'Korean Cosmetic Imports',
            description: 'Direct sourcing of premium Korean beauty products. We partner with leading Korean manufacturers to bring innovative formulations and cutting-edge beauty technology to the Philippine market.'
          },
          {
            title: 'Rebranding Solutions',
            description: 'Transform existing products with your unique brand identity. Our rebranding services include custom packaging design, label creation, and marketing strategy consultation.'
          }
        ]
      },
      {
        sectionId: 'companyHistory',
        title: 'Our Company History',
        subtitle: 'A journey of growth and transformation',
        content: 'BLCP began its journey as MK Beauty in May 2023. Through dedication to quality and customer service, we\'ve grown to become a trusted name in the cosmetic manufacturing industry.',
        items: [
          {
            year: '2023',
            title: 'MK Beauty Foundation',
            description: 'Started operations as MK Beauty in May 2023, focusing on bringing Korean cosmetic manufacturing to the Philippines.'
          },
          {
            year: '2024',
            title: 'Evolution to BLCP',
            description: 'Rebranded to Beauty Lab Cosmetic Products Corporation in January 2024, expanding our services and vision.'
          }
        ]
      },
      {
        sectionId: 'manufacturer',
        title: 'Our Korean Manufacturer',
        subtitle: 'World-class facilities and expertise',
        content: 'Our partnership with leading Korean manufacturers gives you access to the latest innovations in K-beauty technology and formulations.',
        items: [
          {
            title: 'Experience',
            description: 'Over 20 years of expertise in cosmetic manufacturing'
          },
          {
            title: 'Quality',
            description: 'CGMP certified facility with stringent quality control'
          },
          {
            title: 'Innovation',
            description: 'State-of-the-art R&D facilities and advanced technology'
          },
          {
            title: 'Compliance',
            description: 'Full regulatory compliance and documentation support'
          }
        ]
      }
    ]
  };

  // Section templates for adding new sections
  const sectionTemplates = [
    {
      name: 'Hero Banner',
      template: {
        sectionId: `hero-${Date.now()}`,
        title: 'Welcome to Our Company',
        content: 'A brief introduction to what your company does and its values.',
      }
    },
    {
      name: 'Services/Features',
      template: {
        sectionId: `services-${Date.now()}`,
        title: 'Our Services',
        content: 'A description of the services or features you offer.',
        items: []
      }
    },
    {
      name: 'Timeline/History',
      template: {
        sectionId: `history-${Date.now()}`,
        title: 'Our Journey',
        subtitle: 'How we evolved over time',
        content: 'The story of our growth and key milestones.',
        items: []
      }
    },
    {
      name: 'Team/Partners',
      template: {
        sectionId: `team-${Date.now()}`,
        title: 'Our Team',
        subtitle: 'The people behind our success',
        content: 'Meet the talented individuals who make our company great.',
        items: []
      }
    }
  ];

  // Fetch existing content on load
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        if (!user) return;
        
        const token = await user.getIdToken();
        
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/content/${pageId || 'about'}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.status === 200) {
            setContent(response.data);
          }
        } catch (error) {
          console.log('Content not found in database, using default structure');
          
          // If it's the about page and no content exists yet, use the default structure
          if (pageId === 'about' || !pageId) {
            setContent(defaultAboutContent);
            
            // Initialize the content in the database with the default structure
            try {
              const initResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/content/init/${pageId || 'about'}`, defaultAboutContent, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              console.log('Initialized default about content in database');
            } catch (initError) {
              // If there's an error (e.g. content already exists), just log it
              console.log('Could not initialize content:', initError.response?.data?.message || initError.message);
            }
          } else {
            // For other pages, start with a basic structure
            setContent({
              title: pageId ? pageId.charAt(0).toUpperCase() + pageId.slice(1) : 'Page Content',
              sections: []
            });
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [pageId, user]);
  
  // Toggle section collapse
  const toggleSectionCollapse = (sectionIndex) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  // Update section data
  const updateSection = (index, key, value) => {
    const updatedSections = [...content.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [key]: value
    };
    setContent({
      ...content,
      sections: updatedSections
    });
  };

  // Update item data
  const updateItem = (sectionIndex, itemIndex, field, value) => {
    const updatedSections = [...content.sections];
    const updatedItems = [...updatedSections[sectionIndex].items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value
    };
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: updatedItems
    };
    setContent({
      ...content,
      sections: updatedSections
    });
  };

  // Add a new function to add items to specific sections
  const addItem = (sectionIndex) => {
    const section = content.sections[sectionIndex];
    
    // Only allow adding items to specific sections
    if (section.sectionId !== 'companyHistory' && section.sectionId !== 'manufacturer' && section.sectionId !== 'whatWeDo') {
      return;
    }
    
    const updatedSections = [...content.sections];
    
    // Create different item templates based on section type
    let newItem = {};
    
    if (section.sectionId === 'companyHistory') {
      // Timeline item for Our Story section
      newItem = {
        year: new Date().getFullYear().toString(),
        title: 'Timeline Milestone',
        description: 'Add details about this milestone in your company history'
      };
    } else if (section.sectionId === 'manufacturer') {
      // Feature item for Our Korean Manufacturer section
      newItem = {
        title: 'Manufacturer Feature',
        description: 'Add details about this manufacturer feature'
      };
    } else if (section.sectionId === 'whatWeDo') {
      // Service item for What We Do section
      newItem = {
        title: 'Service Feature',
        description: 'Add details about this service or feature'
      };
    }
    
    // Add the new item to the section
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [...(updatedSections[sectionIndex].items || []), newItem]
    };
    
    setContent({
      ...content,
      sections: updatedSections
    });
  };

  // Add back the removeItem function
  const removeItem = (sectionIndex, itemIndex) => {
    const section = content.sections[sectionIndex];
    
    // Only allow removing items from specific sections
    if (section.sectionId !== 'companyHistory' && section.sectionId !== 'manufacturer' && section.sectionId !== 'whatWeDo') {
      return;
    }
    
    const updatedSections = [...content.sections];
    updatedSections[sectionIndex].items.splice(itemIndex, 1);
    setContent({
      ...content,
      sections: updatedSections
    });
  };

  // Save changes to the database
  const saveChanges = async () => {
    try {
      setSaving(true);
      
      const token = await user.getIdToken();
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/content/${pageId || 'about'}`, content, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        toast.success('Content updated successfully');
      } else {
        throw new Error('Failed to update content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {pageId ? `Edit ${pageId.charAt(0).toUpperCase() + pageId.slice(1)} Page` : 'Edit About Page'}
            </h1>
            
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button 
                onClick={saveChanges}
                disabled={saving}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          
          {/* Page title card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Pagasde Title</label>
              <input
                type="text"
                value={content.title}
                onChange={(e) => setContent({...content, title: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter page title"
              />
            </div>
          </div>
          
          {/* Page sections */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Page Sections</h2>
            </div>
            
            {/* Existing sections */}
            {content.sections.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-500 mb-4">No sections added yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {content.sections.map((section, sectionIndex) => (
                  <div 
                    key={section.sectionId || sectionIndex} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Section header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <h3 className="text-lg font-medium text-gray-800">
                        {section.title || `Section ${sectionIndex + 1}`}
                      </h3>
                      
                      <div className="mt-2 sm:mt-0 flex space-x-3">
                        <button
                          onClick={() => toggleSectionCollapse(sectionIndex)}
                          className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                        >
                          {collapsedSections[sectionIndex] ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Expand
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Collapse
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Section content */}
                    {!collapsedSections[sectionIndex] && (
                      <div className="p-5">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={section.title || ''}
                              onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="Section title"
                            />
                          </div>
                          
                          <div>
                         
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <textarea
                              value={section.content || ''}
                              onChange={(e) => updateSection(sectionIndex, 'content', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              rows={3}
                              placeholder="Main section content"
                            />
                          </div>
                        </div>
                          
                        {/* Items Section - only show for specific sections */}
                        {(section.sectionId === 'companyHistory' || section.sectionId === 'manufacturer' || section.sectionId === 'whatWeDo') && (
                          <div className="mt-6 border-t border-gray-200 pt-5">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-base font-medium text-gray-800">
                                {section.sectionId === 'companyHistory' ? 'Timeline Items' : 
                                 section.sectionId === 'whatWeDo' ? 'Service Items' : 'Section Items'}
                              </h4>
                              
                              <button
                                onClick={() => addItem(sectionIndex)}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add Item
                              </button>
                            </div>
                            
                            {(!section.items || section.items.length === 0) ? (
                              <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500 text-sm">No items added yet. Click "Add Item" to create one.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {section.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-sm font-medium text-gray-800">
                                        {item.title || `Item ${itemIndex + 1}`}
                                      </h5>
                                      
                                      <button
                                        onClick={() => removeItem(sectionIndex, itemIndex)}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                        <input
                                          type="text"
                                          value={item.title || ''}
                                          onChange={(e) => updateItem(sectionIndex, itemIndex, 'title', e.target.value)}
                                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                        />
                                      </div>
                                      
                                      {section.sectionId === 'companyHistory' && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                                          <input
                                            type="text"
                                            value={item.year || ''}
                                            onChange={(e) => updateItem(sectionIndex, itemIndex, 'year', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                          />
                                        </div>
                                      )}
                                      
                                      <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                          value={item.description || ''}
                                          onChange={(e) => updateItem(sectionIndex, itemIndex, 'description', e.target.value)}
                                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Preview button */}
          <div className="mt-6 text-right">
            <a 
              href="/about" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 inline-flex items-center"
            >
              <span>Preview Page</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManager; 