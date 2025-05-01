import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FaTags, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaArrowRight, 
  FaExclamationTriangle,
  FaSave,
  FaTimes,
  FaChevronRight,
  FaChevronDown,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

const CategoryManager = ({ isOpen, onClose, user }) => {
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', parentCategory: null, description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [productsInCategory, setProductsInCategory] = useState([]);
  const [reassignCategoryId, setReassignCategoryId] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  
  // Load categories when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);
  
  // Fetch category data from the API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      console.log('Fetching categories...');
      
      // Fetch flat list of categories
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      console.log('Fetched categories (flat):', data);
      
      // Check if parent relationships exist in the data
      const hasParents = data.some(cat => cat.parentCategory);
      console.log(`Categories with parent relationships: ${hasParents ? 'Yes' : 'No'}`);
      
      // Log parent-child relationships for debugging
      data.forEach(cat => {
        if (cat.parentCategory) {
          const parentCat = data.find(p => p._id === cat.parentCategory);
          console.log(`Category "${cat.name}" (${cat._id}) has parent: ${parentCat ? parentCat.name : 'Unknown'} (${cat.parentCategory})`);
        } else {
          console.log(`Category "${cat.name}" (${cat._id}) is a root category (no parent)`);
        }
      });
      
      // Check for possible issues with parentCategory data type
      data.forEach(cat => {
        if (cat.parentCategory) {
          console.log(`Parent category type for "${cat.name}": ${typeof cat.parentCategory}`);
          // If it's an object, it might not be comparing correctly
          if (typeof cat.parentCategory === 'object') {
            console.log(`Warning: Parent category for "${cat.name}" is an object, not a string ID`);
          }
        }
      });
      
      setCategories(data);
      
      // Try to use the API's tree endpoint, but fall back to building our own tree
      console.log('Fetching category tree from API...');
      try {
        const treeResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/tree`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (treeResponse.ok) {
          const treeData = await treeResponse.json();
          console.log('API returned tree data:', treeData);
          
          // Verify if the API's tree structure actually has parent-child relationships
          const hasProperTree = treeData.some(cat => cat.children && cat.children.length > 0);
          console.log(`API tree has proper nested children: ${hasProperTree ? 'Yes' : 'No'}`);
          
          if (hasProperTree) {
            // Use the API-provided tree if it's properly built
            setCategoryTree(treeData);
          } else {
            // The API isn't properly nesting categories, build our own tree
            console.log('API tree is flat, building tree on frontend...');
            const frontendTree = buildCategoryTree(data);
            console.log('Frontend-built tree:', frontendTree);
            setCategoryTree(frontendTree);
          }
        } else {
          throw new Error('Failed to fetch category tree from API');
        }
      } catch (error) {
        console.error('Error with API tree, building tree on frontend:', error);
        // Build the tree on the frontend
        const frontendTree = buildCategoryTree(data);
        console.log('Frontend-built tree:', frontendTree);
        setCategoryTree(frontendTree);
      }
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to build a tree structure from flat categories
  const buildCategoryTree = (flatCategories) => {
    // Create a map for quick lookup
    const categoryMap = {};
    flatCategories.forEach(cat => {
      // Make a copy of the category and initialize children array
      categoryMap[cat._id] = { ...cat, children: [] };
    });
    
    // Build the tree by assigning children to their parents
    const rootCategories = [];
    flatCategories.forEach(cat => {
      const catWithChildren = categoryMap[cat._id];
      
      if (cat.parentCategory) {
        // This is a child category, add it to its parent's children array
        const parentId = typeof cat.parentCategory === 'object' ? 
          cat.parentCategory._id : cat.parentCategory;
          
        if (categoryMap[parentId]) {
          categoryMap[parentId].children.push(catWithChildren);
        } else {
          console.warn(`Parent category ${parentId} not found for ${cat.name}`);
          // If parent not found, treat as root
          rootCategories.push(catWithChildren);
        }
      } else {
        // This is a root category
        rootCategories.push(catWithChildren);
      }
    });
    
    return rootCategories;
  };
  
  // Add a new category
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();
      
      // Explicitly format the parentCategory value correctly for the API
      let parentCategoryId = null;
      if (newCategory.parentCategory && newCategory.parentCategory.trim() !== '') {
        parentCategoryId = newCategory.parentCategory.toString(); // Convert to string
        console.log(`Parent category selected: ${parentCategoryId}`);
        const parentCat = findCategoryById(parentCategoryId);
        if (parentCat) {
          console.log(`Parent category name: ${parentCat.name}`);
        } else {
          console.warn(`Parent category with ID ${parentCategoryId} not found in categories list`);
        }
      }
      
      // Build the payload with the correctly formatted parentCategory
      const payload = {
        name: newCategory.name,
        description: newCategory.description || '',
        parentCategory: parentCategoryId
      };
      
      console.log('Adding category with payload:', payload);
      
      // Stringify the payload explicitly for better control
      const payloadString = JSON.stringify(payload);
      console.log('Stringified payload:', payloadString);
      
      // Make the API call with explicit content type and body formatting
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payloadString
      });
      
      let responseData;
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON if possible
        responseData = JSON.parse(responseText);
        console.log('API response data:', responseData);
      } catch (e) {
        // If not JSON, just log the text
        console.log('API response text (not JSON):', responseText);
      }
      
      if (!response.ok) {
        throw new Error((responseData && responseData.message) || 'Failed to add category');
      }
      
      // If we have a response with the new category data, log it
      if (responseData && responseData._id) {
        console.log(`New category created with ID: ${responseData._id}`);
        
        // Check if the parentCategory was properly set
        if (parentCategoryId) {
          console.log(`Parent category in response: ${responseData.parentCategory}`);
          if (responseData.parentCategory !== parentCategoryId) {
            console.warn(`Warning: Parent category mismatch! Sent: ${parentCategoryId}, Received: ${responseData.parentCategory}`);
          }
        }
        
        // Add the new category to our local state immediately
        // This avoids waiting for the fetchCategories call to complete
        if (parentCategoryId) {
          // For subcategories, update both the flat list and the tree
          setCategories(prev => [...prev, responseData]);
          
          // Update the tree by finding the parent and adding the child
          setCategoryTree(prevTree => {
            // Helper to recursively find and update parent category
            const updateCategoryInTree = (items) => {
              return items.map(item => {
                if (item._id === parentCategoryId) {
                  // Found the parent, add the new category to its children
                  return {
                    ...item,
                    children: [...(item.children || []), {
                      ...responseData,
                      children: []
                    }]
                  };
                } else if (item.children && item.children.length) {
                  // Check children recursively
                  return {
                    ...item,
                    children: updateCategoryInTree(item.children)
                  };
                }
                return item;
              });
            };
            
            return updateCategoryInTree(prevTree);
          });
        } else {
          // For root categories, just add to both flat list and tree root
          setCategories(prev => [...prev, responseData]);
          setCategoryTree(prev => [...prev, { ...responseData, children: [] }]);
        }
      }
      
      // Reset form
      setNewCategory({ name: '', parentCategory: null, description: '' });
      
      // Refresh categories to ensure we have the latest data
      // This is a safety measure in case our immediate state updates weren't accurate
      fetchCategories();
      
      // Auto-expand the parent category to show the new subcategory
      if (parentCategoryId) {
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          newSet.add(parentCategoryId);
          return newSet;
        });
      }
      
      // Show success message
      toast.success(parentCategoryId ? 
        `Subcategory added successfully under ${findCategoryById(parentCategoryId)?.name || 'Unknown'}` : 
        'Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update an existing category
  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();
      
      // Get the original category to check if parentCategory is changing
      const originalCategory = findCategoryById(editingCategory._id);
      
      // Convert IDs to strings for comparison
      const originalParentId = originalCategory && originalCategory.parentCategory ? 
        originalCategory.parentCategory.toString() : null;
      const newParentId = editingCategory.parentCategory ? 
        editingCategory.parentCategory.toString() : null;
      
      const isChangingParent = originalParentId !== newParentId;
      
      console.log(`Updating category ${editingCategory.name} (${editingCategory._id})`);
      console.log(`- Original parent: ${originalParentId}`);
      console.log(`- New parent: ${newParentId}`);
      console.log(`- Is changing parent: ${isChangingParent}`);
      
      const payload = {
        name: editingCategory.name,
        description: editingCategory.description || '',
        // Handle parentCategory properly - explicitly set to null if empty string
        parentCategory: editingCategory.parentCategory || null,
        isActive: editingCategory.isActive
      };
      
      console.log('Updating category with payload:', payload);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${editingCategory._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category');
      }
      
      // Reset editing state
      setEditingCategory(null);
      
      // Refresh categories
      fetchCategories();
      
      // Show appropriate success message based on parent change
      if (isChangingParent) {
        if (editingCategory.parentCategory) {
          const newParentName = findCategoryById(editingCategory.parentCategory)?.name;
          toast.success(`Category moved to be a subcategory of ${newParentName}`);
        } else {
          toast.success('Category moved to be a main category');
        }
      } else {
        toast.success('Category updated successfully');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete a category
  const handleDeleteCategory = async (categoryId) => {
    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();
      
      // First check if category is in use
      const productsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${categoryId}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!productsResponse.ok) {
        throw new Error('Failed to check if category is in use');
      }
      
      const products = await productsResponse.json();
      
      if (products.length > 0) {
        // Category has products
        setProductsInCategory(products);
        setConfirmDelete(categoryId);
        setShowReassignModal(true);
        return;
      }
      
      // No products, proceed with deletion
      await confirmDeleteCategory(categoryId);
      
    } catch (error) {
      console.error('Error checking category usage:', error);
      toast.error(error.message || 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Confirm category deletion after checks
  const confirmDeleteCategory = async (categoryId) => {
    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }
      
      // Refresh categories
      fetchCategories();
      
      toast.success('Category deleted successfully');
      
      // Reset state
      setConfirmDelete(null);
      setShowReassignModal(false);
      setReassignCategoryId('');
      setProductsInCategory([]);
      
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle reassigning products and deleting category
  const handleReassignAndDelete = async () => {
    if (!reassignCategoryId) {
      toast.error('Please select a category to reassign to');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();
      
      // Reassign products
      const reassignResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${confirmDelete}/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newCategoryId: reassignCategoryId })
      });
      
      if (!reassignResponse.ok) {
        const errorData = await reassignResponse.json();
        throw new Error(errorData.message || 'Failed to reassign products');
      }
      
      // Now delete the category
      await confirmDeleteCategory(confirmDelete);
      
      toast.success('Products reassigned and category deleted successfully');
      
    } catch (error) {
      console.error('Error reassigning products:', error);
      toast.error(error.message || 'Failed to reassign products');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle a category's expanded state for the tree view
  const toggleExpandCategory = (categoryId) => {
    setExpandedCategories(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId);
      } else {
        newExpanded.add(categoryId);
      }
      return newExpanded;
    });
  };
  
  // Find category by ID in the flat list
  const findCategoryById = (id) => {
    if (!id) return null;
    
    // Make sure we're using string comparison for IDs
    const stringId = id.toString();
    
    const category = categories.find(cat => {
      // Normalize both IDs to strings before comparing
      const catId = cat._id ? cat._id.toString() : null;
      return catId === stringId;
    });
    
    console.log(`Finding category by ID: ${id} -> ${category ? category.name : 'Not found'}`);
    return category;
  };
  
  // Recursively render the category tree
  const renderCategoryTree = (categoryItems, level = 0) => {
    if (!categoryItems || categoryItems.length === 0) {
      return null;
    }
    
    // Log the structure of categoryItems for debugging
    if (level === 0) {
      console.log('Category tree items to render:', categoryItems);
    }
    
    return (
      <ul className={`${level > 0 ? 'border-l border-gray-200 ml-3' : ''}`}>
        {categoryItems.map(category => {
          const hasChildren = category.children && category.children.length > 0;
          const isExpanded = expandedCategories.has(category._id);
          const isEditing = editingCategory && editingCategory._id === category._id;
          
          // Get parent category for display
          const parentCategory = level > 0 && category.parentCategory ? 
            findCategoryById(category.parentCategory) : null;
          
          // Log information about each category for debugging
          console.log(`Rendering category: ${category.name} (${category._id}), level: ${level}, hasChildren: ${hasChildren}`);
          if (category.parentCategory) {
            console.log(`- Parent category ID: ${category.parentCategory} (${typeof category.parentCategory})`);
          }
          
          return (
            <li key={category._id} className={`my-2 ${level > 0 ? 'pl-4 relative' : ''}`}>
              {level > 0 && (
                <div className="absolute w-3 h-px bg-gray-200" style={{ left: '-3px', top: '14px' }} />
              )}
              <div className={`flex items-center group ${level === 0 ? 'bg-gray-50 p-2 rounded-lg border border-gray-100' : ''}`}>
                {hasChildren ? (
                  <button 
                    onClick={() => toggleExpandCategory(category._id)}
                    className="mr-1 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                  >
                    {isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="ml-5"></span>
                )}
                
                {isEditing ? (
                  <div className="flex-1 bg-gray-50 rounded-md p-2 border border-gray-200">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                        rows="2"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">Parent Category</label>
                      <select
                        value={editingCategory.parentCategory || ''}
                        onChange={(e) => setEditingCategory({...editingCategory, parentCategory: e.target.value || null})}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                      >
                        <option value="">No Parent (Root Category)</option>
                        {categories
                          .filter(cat => cat._id !== editingCategory._id) // Can't be its own parent
                          .map(cat => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))
                        }
                      </select>
                      {editingCategory.parentCategory && (
                        <p className="mt-1 text-xs text-indigo-600">
                          This will be a subcategory of {findCategoryById(editingCategory.parentCategory)?.name || 'Unknown'}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center text-sm"
                      >
                        <FaTimes className="mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateCategory}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center text-sm disabled:opacity-50"
                      >
                        <FaSave className="mr-1" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className={`text-gray-800 font-medium flex-1 hover:text-indigo-600 transition-colors ${hasChildren ? 'font-semibold' : ''}`}>
                      {level > 0 && (
                        <span className="text-gray-400 mr-2 text-xs">
                          {level === 1 ? '↳' : Array(level).fill('·').join(' ') + ' ↳'} 
                        </span>
                      )}
                      <span className={`${level > 0 ? 'text-gray-700' : 'text-gray-900'}`}>
                        {category.name}
                      </span>
                      {level > 0 && (
                        <span className="ml-2 text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full">
                          {parentCategory ? `Sub of ${parentCategory.name}` : 'Sub'}
                        </span>
                      )}
                      {category.description && (
                        <span className="text-xs text-gray-500 ml-2">
                          {category.description}
                        </span>
                      )}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full"
                        title="Edit category"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
                        disabled={isSubmitting}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full disabled:opacity-50"
                        title="Delete category"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {hasChildren && isExpanded && (
                <div className="mt-2">
                  {renderCategoryTree(category.children, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };
  
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto" onClick={onClose}>
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FaTags className="text-indigo-600 text-xl mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Category Management</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Add New Category Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Add New Category</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-md"
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-md"
                      placeholder="Enter category description"
                      rows="2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category (optional)
                    </label>
                    <select
                      value={newCategory.parentCategory || ''}
                      onChange={(e) => {
                        // Explicitly handle the parentCategory value conversion
                        const value = e.target.value;
                        setNewCategory({...newCategory, parentCategory: value || null});
                      }}
                      className={`w-full p-2.5 border rounded-md ${
                        newCategory.parentCategory ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">No Parent (Root Category)</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    
                    {newCategory.parentCategory ? (
                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md">
                        <p className="text-xs text-indigo-700 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          You're adding a subcategory under <strong className="mx-1">
                            {categories.find(cat => cat._id === newCategory.parentCategory)?.name || ''}
                          </strong>
                          <span className="ml-1 text-indigo-500 text-xs">(Parent ID: {newCategory.parentCategory})</span>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Select a parent to create a subcategory, or leave empty for a main category
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={handleAddCategory}
                    disabled={isSubmitting || !newCategory.name.trim()}
                    className={`px-4 py-2.5 rounded-md flex items-center justify-center font-medium text-sm ${
                      isSubmitting || !newCategory.name.trim() 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : newCategory.parentCategory
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-2" />
                        {newCategory.parentCategory ? 'Add Subcategory' : 'Add Category'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Category List */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-800">Category Hierarchy</h3>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {categories.length} categories
                  </span>
                </div>
                
                {loading ? (
                  <div className="py-8 text-center">
                    <svg className="animate-spin mx-auto h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 text-gray-600">Loading categories...</p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="mt-3 text-gray-600">No categories found.</p>
                    <p className="text-sm text-gray-500">Add your first category above.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4">
                      {renderCategoryTree(categoryTree)}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p className="flex items-start">
                    <FaExclamationTriangle className="text-yellow-500 mr-1.5 mt-0.5 flex-shrink-0" />
                    Categories with products require reassignment before deletion
                  </p>
                  <p className="flex items-start">
                    <FaExclamationTriangle className="text-yellow-500 mr-1.5 mt-0.5 flex-shrink-0" />
                    Categories with subcategories cannot be deleted until the subcategories are removed
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reassign Category Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center overflow-x-hidden overflow-y-auto">
          <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="mb-4 flex items-center text-red-600">
              <FaExclamationTriangle className="text-xl mr-2" />
              <h3 className="text-lg font-semibold">Cannot Delete Category</h3>
            </div>
            
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
              <p className="text-red-700">
                This category is currently being used by {productsInCategory.length} product(s). 
                Please reassign these products to another category before deleting.
              </p>
            </div>
            
            <div className="mb-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              <ul className="divide-y divide-gray-100">
                {productsInCategory.map(product => (
                  <li key={product._id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-md bg-gray-100 border border-gray-200 overflow-hidden mr-3 flex-shrink-0">
                        <img 
                          src={product.image || 'https://via.placeholder.com/100?text=No+Image'} 
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{product.name}</div>
                        <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <h4 className="font-medium text-indigo-700 mb-3">Reassign to another category</h4>
              <select
                value={reassignCategoryId}
                onChange={(e) => setReassignCategoryId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">Select a category</option>
                {categories
                  .filter(cat => cat._id !== confirmDelete)
                  .map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))
                }
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setConfirmDelete(null);
                  setReassignCategoryId('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignAndDelete}
                disabled={!reassignCategoryId || isSubmitting}
                className={`px-4 py-2 rounded-md flex items-center ${
                  !reassignCategoryId || isSubmitting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <FaArrowRight className="mr-2" />
                    Reassign & Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryManager; 