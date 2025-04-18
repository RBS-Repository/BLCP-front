import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import AdminSidebar from '../../components/layout/AdminSidebar';
import Modal from '../../components/ui/Modal';
import { toast } from 'react-hot-toast';
import { 
  FaBox, 
  FaPlus, 
  FaTags, 
  FaShippingFast, 
  FaSearch, 
  FaSort, 
  FaSortUp, 
  FaSortDown, 
  FaEdit, 
  FaTrash 
} from 'react-icons/fa';

const AdminProducts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // New state variables for shipping customizer
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingCost, setShippingCost] = useState(150);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(10000);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  
  // New state variables for category manager
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Add this new state for products using the category
  const [productsUsingCategory, setProductsUsingCategory] = useState([]);
  const [showProductsUsingCategory, setShowProductsUsingCategory] = useState(false);
  const [categoryToView, setCategoryToView] = useState(null);

  // Add to existing state variables near the top
  const [showCategoryWarningModal, setShowCategoryWarningModal] = useState(false);
  const [categoryToDeleteWithProducts, setCategoryToDeleteWithProducts] = useState(null);
  const [reassignCategory, setReassignCategory] = useState('');

  // Add these state variables at the top of the component
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Add these utility functions at the top of your component file
  const getAdminStoredItem = (key, defaultValue = null) => {
    try {
      const storedValue = localStorage.getItem(`admin_${key}`);
      if (storedValue === null) return defaultValue;
      
      // If it's already a string representation of "[object Object]", return default
      if (storedValue === "[object Object]") return defaultValue;
      
      return JSON.parse(storedValue);
    } catch (error) {
      console.error(`Failed to parse stored admin_${key}:`, error);
      // If parsing fails, remove the invalid item
      localStorage.removeItem(`admin_${key}`);
      return defaultValue;
    }
  };

  // Function to safely store items in localStorage for admin pages
  const setAdminStoredItem = (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      // Verify we're not storing "[object Object]" string
      if (jsonValue === '"[object Object]"' || jsonValue === '{}') {
        console.warn(`Attempted to store invalid value for admin_${key}`);
        return;
      }
      localStorage.setItem(`admin_${key}`, jsonValue);
    } catch (error) {
      console.error(`Failed to store admin_${key}:`, error);
    }
  };

  // Admin check effect
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIsAdmin(tokenResult.claims.admin === true);
        } catch (err) {
          console.error('Error fetching admin claims:', err);
        }
      }
      setAdminChecked(true);
    };
    
    checkAdminStatus();
  }, [user]);

  // Fetch products effect
  useEffect(() => {
    if (!isAdmin) return;

    const fetchProducts = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/admin`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to fetch products: ${errorData}`);
        }
        
        const data = await response.json();
        setProducts(data);
        const uniqueCategories = [...new Set(data.map(p => p.category))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isAdmin, user]);

  // Load categories when component mounts
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchCategories = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, [isAdmin, user]);

  // Load shipping settings when component mounts
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchShippingSettings = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/shipping`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setShippingCost(data.standardShipping || 150);
          setFreeShippingThreshold(data.freeShippingThreshold || 10000);
        }
      } catch (error) {
        console.error('Error fetching shipping settings:', error);
      }
    };
    
    fetchShippingSettings();
  }, [isAdmin, user]);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Add sorting function
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortField === 'price') {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
    }
    if (sortField === 'stock') {
      return sortOrder === 'asc' ? a.stock - b.stock : b.stock - a.stock;
    }
    if (sortField === 'createdAt') {
      return sortOrder === 'asc' 
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortField === 'status') {
      return sortOrder === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return sortOrder === 'asc' 
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  // Add sort handler function
  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this! This will also remove the product from all customer carts.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (!result.isConfirmed) {
        return;
      }

      const token = await user.getIdToken();
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Delete failed: ${errorData}`);
      }

      const responseData = await res.json();
      const cartsUpdated = responseData.cartsUpdated || 0;

      await Swal.fire(
        'Deleted!',
        `Product has been deleted successfully. The product was also removed from ${cartsUpdated} customer cart${cartsUpdated !== 1 ? 's' : ''}.`,
        'success'
      );

      setProducts(products.filter((product) => product._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Error deleting product'
      });
    }
  };

  // Handler for shipping cost update
  const handleUpdateShipping = async () => {
    try {
      setIsUpdatingShipping(true);
      
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/shipping`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          standardShipping: shippingCost,
          freeShippingThreshold: freeShippingThreshold
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update shipping settings: ${errorData}`);
      }
      
      toast.success('Shipping settings updated successfully');
      setShowShippingModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update shipping settings');
      console.error('Error updating shipping settings:', error);
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  // Handler for adding a new category
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setIsUpdatingCategories(true);
      
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategory })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to add category: ${errorData}`);
      }
      
      // Clear the input field
      setNewCategory('');
      
      // Fetch the updated list of categories instead of manipulating state
      await fetchCategories();
      
      toast.success('Category added successfully');
    } catch (error) {
      toast.error(error.message);
      console.error('Error adding category:', error);
    } finally {
      setIsUpdatingCategories(false);
    }
  };

  // Handler for deleting a category
  const handleDeleteCategory = async (categoryName) => {
    try {
      setCategoryToDelete(categoryName);
      
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }
      
      // Fetch the updated list of categories instead of manipulating state
      await fetchCategories();
      
      toast.success(`Category "${categoryName}" deleted successfully`);
    } catch (error) {
      toast.error(error.message);
      console.error('Error deleting category:', error);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Add this function to check products using a category before deletion
  const checkProductsUsingCategory = async (category) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${encodeURIComponent(category)}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products using category');
      }
      
      const data = await response.json();
      setProductsUsingCategory(data);
      setCategoryToView(category);
      setShowProductsUsingCategory(true);
    } catch (error) {
      toast.error(error.message);
      console.error('Error checking products using category:', error);
    }
  };

  // Add a method to reassign products before deletion
  const handleReassignAndDelete = async (fromCategory, toCategory) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${encodeURIComponent(fromCategory)}/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newCategory: toCategory })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reassign products');
      }
      
      // Now that products are reassigned, we can delete the category
      await handleDeleteCategory(fromCategory);
      setShowProductsUsingCategory(false);
    } catch (error) {
      toast.error(error.message);
      console.error('Error reassigning products:', error);
    }
  };

  // Add this function to fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  // Add useEffect to fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Replace the direct delete button click with this function
  const confirmDeleteCategory = async (categoryName) => {
    try {
      // First check if the category is in use
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/${encodeURIComponent(categoryName)}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check category usage');
      }
      
      const productsUsingCategory = await response.json();
      
      if (productsUsingCategory.length > 0) {
        // Show warning modal with the list of products
        setProductsUsingCategory(productsUsingCategory);
        setCategoryToDeleteWithProducts(categoryName);
        // Fetch the latest categories from MongoDB before showing the modal
        await fetchCategories();
        setShowCategoryWarningModal(true);
        // Reset reassign category dropdown
        setReassignCategory('');
      } else {
        // If no products are using it, confirm deletion
        Swal.fire({
          title: 'Delete Category',
          text: `Are you sure you want to delete "${categoryName}"?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
          if (result.isConfirmed) {
            handleDeleteCategory(categoryName);
          }
        });
      }
    } catch (error) {
      toast.error(error.message);
      console.error('Error checking category usage:', error);
    }
  };

  // Add this effect to save filter preferences
  useEffect(() => {
    if (!loading) {
      setAdminStoredItem('productFilters', {
        category: selectedCategory,
        status: selectedStatus,
        search: searchQuery,
        sort: {
          field: sortField,
          order: sortOrder
        }
      });
    }
  }, [selectedCategory, selectedStatus, searchQuery, sortField, sortOrder, loading]);

  // Add this effect to load filter preferences
  useEffect(() => {
    const storedFilters = getAdminStoredItem('productFilters', {
      category: 'all',
      status: 'all',
      search: '',
      sort: {
        field: 'name',
        order: 'asc'
      }
    });
    
    if (storedFilters) {
      setSelectedCategory(storedFilters.category || 'all');
      setSelectedStatus(storedFilters.status || 'all');
      setSearchQuery(storedFilters.search || '');
      
      if (storedFilters.sort) {
        setSortField(storedFilters.sort.field || 'name');
        setSortOrder(storedFilters.sort.order || 'asc');
      }
    }
  }, []); // Empty dependency array means this runs once on component mount

  if (!user || !adminChecked) return <div className="text-center text-gray-600">Loading...</div>;
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-6 ml-12 md:mr-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header - Refined with better typography and visual hierarchy */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center">
                <FaBox className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage your product inventory and categories</p>
                </div>
              </div>
              
              {/* Action buttons with improved grouping and gradients */}
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="px-4 py-2.5 flex items-center justify-center bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white transition-all shadow-sm"
                  >
                    <FaTags className="mr-2" />
                    <span>Categories</span>
                  </button>
                  <button
                    onClick={() => setShowShippingModal(true)}
                    className="px-4 py-2.5 flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white transition-all shadow-sm"
                  >
                    <FaShippingFast className="mr-2" />
                    <span>Shipping</span>
                  </button>
                </div>
                <button
                  onClick={() => navigate('/admin/products/new')}
                  className="px-4 py-2.5 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white transition-all shadow-sm"
                >
                  <FaPlus className="mr-2" />
                  <span>Add New Product</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters - Enhanced card design with better visual feedback */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-8 border border-gray-200">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-gray-700 mb-2">Filter Products</h2>
              <div className="h-0.5 w-16 bg-indigo-500 rounded"></div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 transition-all duration-200"
                />
              </div>
              
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-all duration-200"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-all duration-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Active Filters Indicator */}
            {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {selectedCategory !== 'all' && (
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      Category: {selectedCategory}
                    </span>
                  )}
                  {selectedStatus !== 'all' && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      Status: {selectedStatus}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      Search: "{searchQuery}"
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Products List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading products...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-lg shadow-sm p-6 text-center">
              <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Products</h3>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {sortedProducts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Found</h3>
                  <p className="text-gray-500 mb-4">No products match your current filter criteria.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedStatus('all');
                    }}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th 
                          className="group px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            <span>Product Name</span>
                            <div className="ml-2">
                              {sortField === 'name' ? (
                                sortOrder === 'asc' ? 
                                  <FaSortUp className="text-indigo-500" /> : 
                                  <FaSortDown className="text-indigo-500" />
                              ) : (
                                <FaSort className="text-gray-400 group-hover:text-gray-500" />
                              )}
                            </div>
                          </div>
                        </th>
                        <th 
                          className="group px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center">
                            <span>Price</span>
                            <div className="ml-2">
                              {sortField === 'price' ? (
                                sortOrder === 'asc' ? 
                                  <FaSortUp className="text-indigo-500" /> : 
                                  <FaSortDown className="text-indigo-500" />
                              ) : (
                                <FaSort className="text-gray-400 group-hover:text-gray-500" />
                              )}
                            </div>
                          </div>
                        </th>
                        <th 
                          className="group px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center">
                            <span>Status</span>
                            <div className="ml-2">
                              {sortField === 'status' ? (
                                sortOrder === 'asc' ? 
                                  <FaSortUp className="text-indigo-500" /> : 
                                  <FaSortDown className="text-indigo-500" />
                              ) : (
                                <FaSort className="text-gray-400 group-hover:text-gray-500" />
                              )}
                            </div>
                          </div>
                        </th>
                        <th 
                          className="group px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('stock')}
                        >
                          <div className="flex items-center">
                            <span>Stock</span>
                            <div className="ml-2">
                              {sortField === 'stock' ? (
                                sortOrder === 'asc' ? 
                                  <FaSortUp className="text-indigo-500" /> : 
                                  <FaSortDown className="text-indigo-500" />
                              ) : (
                                <FaSort className="text-gray-400 group-hover:text-gray-500" />
                              )}
                            </div>
                          </div>
                        </th>
                        <th 
                          className="group px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center">
                            <span>Date Added</span>
                            <div className="ml-2">
                              {sortField === 'createdAt' ? (
                                sortOrder === 'asc' ? 
                                  <FaSortUp className="text-indigo-500" /> : 
                                  <FaSortDown className="text-indigo-500" />
                              ) : (
                                <FaSort className="text-gray-400 group-hover:text-gray-500" />
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {sortedProducts.map((product, index) => (
                        <tr key={product._id} 
                          className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0 mr-4 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                <img
                                  className="h-full w-full object-cover"
                                  src={product.image || 'https://via.placeholder.com/100'}
                                  alt={product.name}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                                  }}
                                />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {product.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">₱{product.price.toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                product.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                product.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {product.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium flex items-center">
                              {product.stock <= 5 ? (
                                <span className="text-red-600">{product.stock}</span>
                              ) : product.stock <= 10 ? (
                                <span className="text-yellow-600">{product.stock}</span>
                              ) : (
                                <span className="text-gray-700">{product.stock}</span>
                              )}
                              
                              {product.stock <= 10 && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  product.stock <= 5 
                                    ? 'bg-red-100 text-red-700 border border-red-200' 
                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                  {product.stock <= 5 ? 'Critical' : 'Low Stock'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(product.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3">
                              <Link
                                to={`/admin/products/edit/${product._id}`}
                                className="flex items-center text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                              >
                                <FaEdit className="mr-1" />
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="flex items-center text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                              >
                                <FaTrash className="mr-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Shipping Settings Modal */}
      <Modal isOpen={showShippingModal} onClose={() => setShowShippingModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center">
              <FaShippingFast className="w-6 h-6 text-blue-500 mr-3" />
              <h3 className="text-xl font-bold text-gray-800">Shipping Settings</h3>
            </div>
            <button
              onClick={() => setShowShippingModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700">
                Configure global shipping settings for all products. These settings will apply to all orders.
              </p>
            </div>
          </div>
          
          <div className="space-y-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm">
              <label htmlFor="standardShipping" className="block text-sm font-medium text-gray-700 mb-2">
                Standard Shipping Cost (₱)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₱</span>
                </div>
                <input
                  type="number"
                  id="standardShipping"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This is the default shipping fee applied to all orders.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm">
              <label htmlFor="freeShippingThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                Free Shipping Threshold (₱)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₱</span>
                </div>
                <input
                  type="number"
                  id="freeShippingThreshold"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Orders with subtotal above this amount will qualify for free shipping. Set to 0 to disable.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowShippingModal(false)}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateShipping}
              disabled={isUpdatingShipping}
              className={`px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all ${isUpdatingShipping ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isUpdatingShipping ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </div>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Manager Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center">
              <FaTags className="w-6 h-6 text-purple-500 mr-3" />
              <h3 className="text-xl font-bold text-gray-800">Manage Categories</h3>
            </div>
            <button
              onClick={() => setShowCategoryModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-purple-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-purple-700">
                Manage product categories. Categories are used to organize products and improve navigation.
              </p>
            </div>
          </div>
          
          {/* Add new category */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
            <h4 className="text-base font-semibold text-gray-800 mb-3">Add New Category</h4>
            <div className="flex">
              <div className="relative flex-grow">
                <input
                  type="text"
                  id="newCategory"
                  placeholder="Enter category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleAddCategory}
                disabled={isUpdatingCategories || !newCategory.trim()}
                className={`px-4 py-2.5 flex items-center justify-center bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-r-md hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all ${
                  (isUpdatingCategories || !newCategory.trim()) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isUpdatingCategories ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Category names should be clear and descriptive.
            </p>
          </div>
          
          {/* Category list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold text-gray-800">Current Categories</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{categories.length} categories</span>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {categories.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  No categories found. Add your first category above.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {categories.map(category => (
                    <li key={category} className="flex justify-between items-center p-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                        <span className="text-gray-800 font-medium">{category}</span>
                      </div>
                      <button
                        onClick={() => confirmDeleteCategory(category)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors duration-200"
                        disabled={isUpdatingCategories}
                        aria-label={`Delete ${category} category`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500 flex items-start">
              <svg className="w-4 h-4 text-red-400 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Categories in use by products will require reassignment before deletion.</span>
            </p>
          </div>
          
          <div className="flex justify-end pt-5 mt-6 border-t border-gray-200">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Category warning modal */}
      {showCategoryWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-600">
                <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-semibold">
                  Cannot Delete Category
                </h3>
              </div>
              
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                <p className="text-red-700">
                  The category <span className="font-semibold">"{categoryToDeleteWithProducts}"</span> is currently being used by the following products:
                </p>
              </div>
              
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg mb-4 shadow-sm">
                <ul className="divide-y divide-gray-100">
                  {productsUsingCategory.map(product => (
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
                          <div className="text-sm text-gray-500 flex items-center">
                            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1.5"></span>
                            <span>Stock: {product.stock}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-5">
                <h4 className="font-medium text-indigo-700 mb-3">Reassign these products to another category</h4>
                <select
                  value={reassignCategory}
                  onChange={(e) => setReassignCategory(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(cat => cat !== categoryToDeleteWithProducts)
                    .map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCategoryWarningModal(false)}
                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (reassignCategory) {
                      handleReassignAndDelete(categoryToDeleteWithProducts, reassignCategory);
                      setShowCategoryWarningModal(false);
                    } else {
                      toast.error('Please select a category to reassign to');
                    }
                  }}
                  disabled={!reassignCategory}
                  className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${
                    reassignCategory 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Reassign & Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;