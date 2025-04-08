import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const FaqManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faqContent, setFaqContent] = useState({
    categories: []
  });
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [error404, setError404] = useState(false);
  
  // Default FAQ content structure
  const defaultFaqContent = {
    categories: [
      {
        title: 'Manufacturing Process',
        questions: [
          {
            q: 'What is your minimum order quantity (MOQ)?',
            a: 'Our standard MOQ varies by product type, typically starting at 500-1000 units per SKU. We can discuss flexible options for startups and small businesses.'
          },
          {
            q: 'How long does the manufacturing process take?',
            a: 'The typical timeline from order confirmation to delivery is 8-12 weeks, depending on the product complexity and quantity. This includes formulation, testing, production, and packaging.'
          }
        ]
      },
      {
        title: 'Product Development',
        questions: [
          {
            q: 'Can you help with custom formulations?',
            a: 'Yes, our R&D team can develop custom formulations based on your requirements, including natural, organic, and innovative ingredients.'
          }
        ]
      }
    ]
  };

  // Fetch existing FAQ content on load
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faq`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch FAQs');
        const data = await response.json();
        setFaqContent(data);
      } catch (err) {
        console.error('Error:', err);
        setError404(true);
        toast.error(err.message || 'Failed to load FAQ content');
        setFaqContent(defaultFaqContent);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, [user]);
  
  // Toggle category collapse
  const toggleCategoryCollapse = (categoryIndex) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex]
    }));
  };

  // Add a new category
  const addCategory = () => {
    setFaqContent({
      ...faqContent,
      categories: [
        ...faqContent.categories,
        {
          title: 'New Category',
          questions: []
        }
      ]
    });
  };

  // Update category data
  const updateCategory = (categoryIndex, field, value) => {
    const updatedCategories = [...faqContent.categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      [field]: value
    };
    
    setFaqContent({
      ...faqContent,
      categories: updatedCategories
    });
  };

  // Remove a category
  const removeCategory = (categoryIndex) => {
    const updatedCategories = [...faqContent.categories];
    updatedCategories.splice(categoryIndex, 1);
    
    setFaqContent({
      ...faqContent,
      categories: updatedCategories
    });
  };

  // Add a new question to a category
  const addQuestion = (categoryIndex) => {
    const updatedCategories = [...faqContent.categories];
    updatedCategories[categoryIndex].questions = [
      ...(updatedCategories[categoryIndex].questions || []),
      {
        q: 'New Question',
        a: 'Answer to the question'
      }
    ];
    
    setFaqContent({
      ...faqContent,
      categories: updatedCategories
    });
  };

  // Update question data
  const updateQuestion = (categoryIndex, questionIndex, field, value) => {
    const updatedCategories = [...faqContent.categories];
    updatedCategories[categoryIndex].questions[questionIndex] = {
      ...updatedCategories[categoryIndex].questions[questionIndex],
      [field]: value
    };
    
    setFaqContent({
      ...faqContent,
      categories: updatedCategories
    });
  };

  // Remove a question
  const removeQuestion = (categoryIndex, questionIndex) => {
    const updatedCategories = [...faqContent.categories];
    updatedCategories[categoryIndex].questions.splice(questionIndex, 1);
    
    setFaqContent({
      ...faqContent,
      categories: updatedCategories
    });
  };

  // Save changes to the database
  const saveChanges = async () => {
    try {
      setSaving(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faq`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(faqContent)
      });
      
      if (!response.ok) throw new Error('Failed to save FAQ content');
      const data = await response.json();
      setFaqContent(data);
      toast.success('FAQ content saved successfully');
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.message || 'Failed to save FAQ content');
    } finally {
      setSaving(false);
    }
  };

  // Add this function to handle initial content creation
  const initializeDefaultContent = async () => {
    try {
      setSaving(true);
      const token = user ? await user.getIdToken() : null;
      
      // First try to create content with PUT request
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faq`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categories: defaultFaqContent.categories
        })
      });
      
      if (!response.ok) throw new Error('Failed to create initial FAQ content');
      const data = await response.json();
      setFaqContent(data);
      toast.success('Default FAQ content created successfully!');
      
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.message || 'Could not create initial FAQ content. Please try again later.');
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
            <h1 className="text-2xl font-bold text-gray-800">FAQ Manager</h1>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          
          {/* Add API error indicator */}
          {error404 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    API endpoint not available. Server may need to be restarted.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={initializeDefaultContent}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none"
                      disabled={saving}
                    >
                      {saving ? 'Creating...' : 'Initialize Default Content'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Categories */}
          <div className="space-y-6">
            {faqContent.categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 p-4 rounded-t-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <h3 className="text-lg font-bold">{category.title || `Category ${categoryIndex + 1}`}</h3>
                    
                    <div className="mt-2 sm:mt-0 flex space-x-3">
                      <button
                        onClick={() => toggleCategoryCollapse(categoryIndex)}
                        className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                      >
                        {collapsedCategories[categoryIndex] ? (
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
                      
                      <button
                        onClick={() => removeCategory(categoryIndex)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Category content */}
                {!collapsedCategories[categoryIndex] && (
                  <div className="p-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={category.title || ''}
                          onChange={(e) => updateCategory(categoryIndex, 'title', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Category title"
                        />
                      </div>
                    </div>
                      
                    {/* Questions Section */}
                    <div className="mt-6 border-t border-gray-200 pt-5">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-base font-medium text-gray-800">
                          Questions & Answers
                        </h4>
                        
                        <button
                          onClick={() => addQuestion(categoryIndex)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Question
                        </button>
                      </div>
                      
                      {(!category.questions || category.questions.length === 0) ? (
                        <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500 text-sm">No questions added yet. Click "Add Question" to create one.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {category.questions.map((question, questionIndex) => (
                            <div key={questionIndex} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="text-sm font-medium text-gray-800">
                                  {question.q || `Question ${questionIndex + 1}`}
                                </h5>
                                
                                <button
                                  onClick={() => removeQuestion(categoryIndex, questionIndex)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Question</label>
                                  <input
                                    type="text"
                                    value={question.q || ''}
                                    onChange={(e) => updateQuestion(categoryIndex, questionIndex, 'q', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Answer</label>
                                  <textarea
                                    value={question.a || ''}
                                    onChange={(e) => updateQuestion(categoryIndex, questionIndex, 'a', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <button
              onClick={addCategory}
              className="w-full px-4 py-3 bg-blue-50 text-blue-600 font-medium border border-blue-100 rounded-lg hover:bg-blue-100"
            >
              + Add New Category
            </button>
          </div>
          
          {/* Preview button */}
          <div className="mt-6 text-right">
            <a 
              href="/faq" 
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

export default FaqManager; 