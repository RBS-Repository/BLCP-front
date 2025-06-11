import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Products.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShoppingCart, FaStar, FaHeart, FaLock, FaEnvelope, FaList, FaThLarge, FaFilter, FaSearch, FaSortAmountDown, FaTimes, FaChevronLeft, FaChevronRight, FaGripHorizontal } from 'react-icons/fa';
import { MdEmail, MdVerifiedUser } from 'react-icons/md';
import api from '../api/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useWishlist } from '../context/WishlistContext';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../components/products/ProductCard';
import QuickViewModal from '../components/products/QuickViewModal';
import PriceRangeFilter from '../components/products/PriceRangeFilter';
import MobileFilterDrawer from '../components/products/MobileFilterDrawer';
import Pagination from '../components/products/Pagination';
import RecentlyViewed from '../components/products/RecentlyViewed';
import ProductCardSkeleton from '../components/common/ProductCardSkeleton';
import { addToRecentlyViewed, getFilterPreferences, saveFilterPreferences, getViewMode, saveViewMode, getStoredItem, setStoredItem } from '../utils/localStorage';
import StickyFilterBar from '../components/products/StickyFilterBar';
import CategoryCards from '../components/products/CategoryCards';
import GridLayoutControls from '../components/products/GridLayoutControls';
import InfiniteProductGrid from '../components/products/InfiniteProductGrid';
import GalleryCard from '../components/products/GalleryCard';
import { HeroSkeleton } from '../components/common/SkeletonLoader';
import { BeatLoader } from 'react-spinners';
import { BsFacebook } from 'react-icons/bs';
import { FaInstagram } from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa';
import { debounce as lodashDebounce } from 'lodash';

const sortOptions = [
  { id: 'featured', name: 'Featured' },
  { id: 'newest', name: 'Newest' },
  { id: 'price_asc', name: 'Price: Low to High' },
  { id: 'price_desc', name: 'Price: High to Low' },
  { id: 'name_asc', name: 'Name: A to Z' },
  { id: 'name_desc', name: 'Name: Z to A' },
];

// Structured data for products collection
const generateProductListSchema = (products) => {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.image,
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "PHP",
          "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        },
        "category": product.category
      }
    }))
  };
};

// Breadcrumb structured data
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://beautylab.ph"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Products",
      "item": "https://beautylab.ph/products"
    }
  ]
};

// Create a ProductsPageSkeleton component in the file (before the Products component)
const ProductsPageSkeleton = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero section skeleton */}
        <HeroSkeleton />
        
        {/* Categories skeleton */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl"></div>
          ))}
        </div>
        
        {/* Controls skeleton */}
        <div className="mt-8 flex justify-between">
          <div className="w-64 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="flex space-x-2">
            <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        
        {/* Products grid skeleton */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Create memoized ProductCard component for optimized re-renders
const MemoizedProductCard = memo(ProductCard);
const MemoizedGalleryCard = memo(GalleryCard);

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const { user } = useAuth();
  const { wishlistItems, toggleWishlist, isInWishlist } = useWishlist();
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Products' },
  ]);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const isEmailVerified = user ? user.emailVerified : false;
  
  // State variables for pagination and UI
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Increased from 12 to 25 for more products per page
  const [totalProducts, setTotalProducts] = useState(0);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productListRef = useRef(null);
  const [gridLayout, setGridLayout] = useState('compact');
  const [stickyFilterVisible, setStickyFilterVisible] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const categoryScrollRef = useRef(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['all']));
  
  // Debounced search function
  const debouncedSearch = useCallback(
    lodashDebounce((value) => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 400), // 400ms debounce delay
    []
  );

  // Handler for search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value); // Update UI immediately
    debouncedSearch(value); // Debounce the actual search
  };

  // Create page title and description based on selected category
  const getPageTitle = () => {
    if (selectedCategory === 'all') {
      return "Premium Korean Skincare Products | Beauty Lab Cosmetic Products";
    }
    
    const categoryName = categories.find(cat => cat.id === selectedCategory)?.name || 'Products';
    return `${categoryName} - Korean Skincare Products | Beauty Lab`;
  };

  const getPageDescription = () => {
    if (selectedCategory === 'all') {
      return "Shop our complete collection of FDA-approved Korean skincare and beauty products. Premium quality for salon professionals and beauty enthusiasts.";
    }
    
    const categoryName = categories.find(cat => cat.id === selectedCategory)?.name || 'Products';
    return `Browse our ${categoryName.toLowerCase()} collection. FDA-approved Korean skincare solutions formulated with cutting-edge technology for professional results.`;
  };

  // Helper function to check if a product belongs to a category or any of its subcategories
  const isProductInCategoryTree = useCallback((product, categoryId) => {
    // If no category is selected or it's "all", everything matches
    if (categoryId === 'all') return true;

    // Ensure we're working with strings for consistent comparison
    const selectedCategoryId = categoryId.toString();
    
    // Convert product category to string for comparison
    const productCategoryId = product.category 
      ? (typeof product.category === 'object' && product.category._id 
        ? product.category._id.toString() 
        : product.category.toString())
      : null;

    // If product has no category, it can't match
    if (!productCategoryId) return false;

    // Direct match
    if (productCategoryId === selectedCategoryId) return true;

    // Now check if product's category is a child of the selected category
    // Build a list of all subcategories of the selected category
    const subcategories = [];
    const findSubcategories = (parentId) => {
      categories.forEach(cat => {
        if (cat.id !== 'all') {
          const catId = cat.id.toString();
          const catParentId = cat.parentCategory 
            ? cat.parentCategory.toString() 
            : null;
          
          if (catParentId === parentId.toString()) {
            subcategories.push(catId);
            // Recursively find subcategories of this category
            findSubcategories(catId);
          }
        }
      });
    };

    // Start the recursive search from the selected category
    findSubcategories(selectedCategoryId);
    
    // Check if the product's category is in the subcategory list
    return subcategories.includes(productCategoryId);
  }, [categories]);

  // Define findSubcategories function to get all subcategories of a parent category
  const findSubcategories = useCallback((parentId) => {
    const result = [];
    
    // Helper function to recursively find subcategories
    const findChildren = (pid) => {
      categories.forEach(cat => {
        if (cat.id !== 'all') {
          const catId = cat.id.toString();
          const catParentId = cat.parentCategory 
            ? cat.parentCategory.toString() 
            : null;
          
          if (catParentId === pid.toString()) {
            result.push(catId);
            // Recursively find subcategories of this category
            findChildren(catId);
          }
        }
      });
    };
    
    // Start the recursive search
    findChildren(parentId);
    
    return result;
  }, [categories]);

  // Function to get filtered products
  const getFilteredProducts = useCallback(() => {
    if (!products || products.length === 0) return [];
    
    return products.filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter - using the new helper function for hierarchical filtering
      const matchesCategory = isProductInCategoryTree(product, selectedCategory);
      
      // Return without price filter
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory, isProductInCategoryTree]);
  
  // Function to sort filtered products
  const getSortedProducts = useCallback((filteredProducts) => {
    if (!filteredProducts || filteredProducts.length === 0) return [];
    
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'featured':
        default:
          return 0;
      }
    });
  }, [sortBy]);
  
  // Function to paginate products - Updated to use traditional pagination
  const getPaginatedProducts = useCallback(() => {
    const filteredProducts = getFilteredProducts();
    const sortedProducts = getSortedProducts(filteredProducts);
    
    // Set total for pagination
    const filteredTotal = sortedProducts.length;
    setTotalProducts(filteredTotal);
    
    // Check if we need to reset the page (e.g., if filters reduce available pages)
    const totalPages = Math.ceil(filteredTotal / pageSize);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
    
    // Slice the products for current page
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedProducts = sortedProducts.slice(startIndex, startIndex + pageSize);
    
    return {
      paginatedProducts,
      filteredTotal,
      totalPages
    };
  }, [getFilteredProducts, getSortedProducts, currentPage, pageSize]);
  
  // Destructure the paginated data
  const { paginatedProducts, filteredTotal, totalPages } = useMemo(() => 
    getPaginatedProducts(), 
    [getPaginatedProducts]
  );
  
  // Enhance the getCategoryName function to handle all potential category formats
  const getCategoryName = useCallback((categoryId) => {
    if (!categoryId) return 'All Products';
    if (categoryId === 'all') return 'All Products';
    
    // If categoryId is actually a category object, extract the ID or return the name directly
    if (typeof categoryId === 'object') {
      return categoryId.name || 'Unknown Category';
    }
    
    const category = categories.find(cat => {
      // Handle various ID formats
      const catId = typeof cat.id === 'string' ? cat.id : String(cat.id);
      const compareId = typeof categoryId === 'string' ? categoryId : String(categoryId);
      return catId === compareId;
    });
    
    return category?.name || 'Unknown Category';
  }, [categories]);

  // Near the filteredAndSortedProducts computation, enhance the category name handling
  const enhanceProductsWithCategoryNames = useCallback((products) => {
    if (!products || !Array.isArray(products) || !categories || !categories.length) {
      return products;
    }
    
    return products.map(product => {
      // Don't modify if no category
      if (!product.category) {
        return {
          ...product,
          category: 'Uncategorized' // Provide a default string
        };
      }
      
      // Already has proper category object with name
      if (typeof product.category === 'object' && product.category.name) {
        // Ensure the object has a toString method to prevent rendering errors
        if (!product.category.toString || product.category.toString === Object.prototype.toString) {
          return {
            ...product,
            category: {
              ...product.category,
              toString: function() { return this.name; }
            }
          };
        }
        return product;
      }
      
      // Get category ID
      const categoryId = typeof product.category === 'object' && product.category._id 
        ? product.category._id.toString()
        : product.category.toString();
      
      // Find matching category
      const matchingCategory = categories.find(cat => {
        return cat.id === categoryId;
      });
      
      if (matchingCategory) {
        // Create enhanced copy
        return {
          ...product,
          // Preserve original category but add the name and toString method
          category: {
            _id: categoryId,
            name: matchingCategory.name,
            // Include parent info if available
            ...(matchingCategory.parentCategory ? { parentCategory: matchingCategory.parentCategory } : {}),
            // Add toString method to prevent direct object rendering
            toString: function() { return this.name; }
          }
        };
      }
      
      // If no matching category found, use the ID as a string
      return {
        ...product,
        category: categoryId
      };
    });
  }, [categories]);

  // Add function to get random products for hero section
  const getRandomProducts = useCallback((count = 3) => {
    if (!products || products.length === 0) return [];
    
    // Create a copy of the products array to avoid mutating the original
    const productsCopy = [...products];
    
    // Shuffle the array using Fisher-Yates algorithm
    for (let i = productsCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [productsCopy[i], productsCopy[j]] = [productsCopy[j], productsCopy[i]];
    }
    
    // Return the first 'count' products or all if less than count
    return productsCopy.slice(0, Math.min(count, productsCopy.length));
  }, [products]);

  // Store random products in state to keep them consistent during a single page view
  const [heroProducts, setHeroProducts] = useState([]);
  
  // Update hero products when the products array changes
  useEffect(() => {
    if (products.length > 0) {
      setHeroProducts(getRandomProducts(3));
    }
  }, [products, getRandomProducts]);

  // Use the filteredAndSortedProducts in the computed properties
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];
    
    // First enhance with category names
    result = enhanceProductsWithCategoryNames(result);
    
    // Then apply filtering
    if (selectedCategory !== 'all') {
      result = result.filter(product => {
        // Direct match with selected category
        if (typeof product.category === 'string' && product.category === selectedCategory) {
          return true;
        }
        
        // Object with id/._id match
        if (typeof product.category === 'object') {
          const productCategoryId = product.category._id || product.category.id;
          return productCategoryId === selectedCategory;
        }
        
        return false;
      });
      
      // Include subcategories if any
      const subcategoryIds = findSubcategories(selectedCategory);
      if (subcategoryIds.length > 0) {
        const productsInSubcategories = products.filter(product => {
          // Skip products already in result
          if (result.includes(product)) return false;
          
          // Match product category with any subcategory
          if (typeof product.category === 'string') {
            return subcategoryIds.includes(product.category);
          }
          
          if (typeof product.category === 'object') {
            const productCategoryId = product.category._id || product.category.id;
            return subcategoryIds.includes(productCategoryId);
          }
          
          return false;
        });
        
        // Add products from subcategories
        result = [...result, ...productsInSubcategories];
      }
    }
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting - match the values used in getSortedProducts
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      // case 'featured' or default - no sorting needed
    }
    
    return result;
  }, [products, selectedCategory, searchQuery, sortBy, enhanceProductsWithCategoryNames, findSubcategories]);

  // Update this effect to not reference displayedProducts or page
  useEffect(() => {
    // Scroll to top of product section when filters change
    const productSection = document.getElementById('products-section');
    if (productSection) {
      window.scrollTo({
        top: productSection.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  }, [selectedCategory, searchQuery, sortBy, currentPage]);

  // Add dedicated effect for category change - to avoid full reloads
  useEffect(() => {
    // Only show loading state for the product list section, not the whole page
    const productSection = document.getElementById('products-section');
    
    if (productSection) {
      // Add loading class to the product section only
      productSection.classList.add('section-loading');
      
      // Scroll to the top of the products section with a slight offset for header
      window.scrollTo({
        top: productSection.offsetTop - 100,
        behavior: 'smooth'
      });
      
      // Use a shorter timeout for better UX
      const timer = setTimeout(() => {
        productSection.classList.remove('section-loading');
      }, 400);
      
      return () => {
        clearTimeout(timer);
        productSection.classList.remove('section-loading');
      };
    }
  }, [selectedCategory, searchQuery, sortBy]);
  
  // Add useEffect for scroll position and sticky filter bar
  useEffect(() => {
    const handleScroll = () => {
      const filterSection = document.getElementById('product-filters');
      const header = document.querySelector('header');
      
      if (filterSection && header) {
        const headerHeight = header.offsetHeight;
        const filterSectionTop = filterSection.getBoundingClientRect().top;
        
        // Show sticky bar when the filter section is scrolled past the header
        setStickyFilterVisible(filterSectionTop < headerHeight);
      }
    };
    
    // Run once on mount to set initial state
    handleScroll();
    
    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Effect to handle URL parameters and localStorage preferences
  useEffect(() => {
    // Parse URL parameters
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const sort = searchParams.get('sort');
    const view = searchParams.get('view');
    
    // Set state from URL parameters if present
    if (category) setSelectedCategory(category);
    if (search) setSearchQuery(search);
    if (page && !isNaN(parseInt(page))) setCurrentPage(parseInt(page));
    if (sort) setSortBy(sort);
    if (view && ['compact', 'standard', 'gallery', 'list'].includes(view)) setGridLayout(view);
    
    // If no URL parameters, try to get from localStorage
    if (!category && !search && !sort && !view) {
      // Retrieve stored preferences on initial load
      try {
        const storedFilters = getStoredItem('productFilters', { 
          category: 'all', 
          sortBy: 'featured' 
        });
        
        if (storedFilters) {
          setSelectedCategory(storedFilters.category || 'all');
          setSortBy(storedFilters.sortBy || 'featured');
        }
        
        const storedViewMode = getStoredItem('viewMode', 'compact');
        if (storedViewMode) {
          setGridLayout(storedViewMode);
        }
      } catch (error) {
        console.error('Error loading stored preferences:', error);
      }
    }
    
    // eslint-disable-next-line
  }, []);
  
  // Effect to update URL with current filters
  useEffect(() => {
    // Don't update URL during initial load
    if (loading) return;
    
    // Create a new URLSearchParams object
    const params = new URLSearchParams();
    
    // Add parameters only if they're not default values
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchQuery) params.set('search', searchQuery);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (sortBy !== 'featured') params.set('sort', sortBy);
    if (gridLayout !== 'compact') params.set('view', gridLayout);
    
    // Update URL without causing a page reload
    const newUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    navigate(newUrl, { replace: true });
    
    // Save preferences to localStorage
    setStoredItem('productFilters', JSON.stringify({
      category: selectedCategory,
      sortBy,
    }));
    
    setStoredItem('viewMode', gridLayout);
    
    // eslint-disable-next-line
  }, [selectedCategory, searchQuery, currentPage, sortBy, gridLayout, loading]);
  
  // Effect to fetch products and determine min/max price
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        const fetchedProducts = response.data;
        
        // Set products
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line
  }, []);

  // Update the categories fetch to load only once instead of on location.key changes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Just fetch the flat list of categories - we'll build the hierarchy ourselves
        const response = await api.get('/categories');
        
        if (response.data && Array.isArray(response.data)) {
          // Normalize categories to ensure consistent ID format
          const normalizedCategories = response.data.map(category => {
            // Convert _id to string
            const id = category._id ? category._id.toString() : null;
            
            // Handle parentCategory - convert to string ID if it exists
            let parentId = null;
            if (category.parentCategory) {
              // Check if parentCategory is an object with _id or just an ID string
              parentId = typeof category.parentCategory === 'object' && category.parentCategory._id ? 
                category.parentCategory._id.toString() : 
                category.parentCategory.toString();
            }
            
            return {
              id: id,
              name: category.name,
              description: category.description,
              parentCategory: parentId,
              // Add level information which is useful for UI display
              level: category.level || 0
            };
          });
          
          // Add the "All Products" option
          const formattedCategories = [
            { id: 'all', name: 'All Products' },
            ...normalizedCategories
          ];
          
          // Check which categories have parent relationships
          formattedCategories.forEach(cat => {
            if (cat.id !== 'all' && cat.parentCategory) {
              const parentCat = formattedCategories.find(p => p.id === cat.parentCategory);
            }
          });
          
          // Set categories in state for component use
          setCategories(formattedCategories);
          
          // Also store the normalized categories globally for ProductCard components
          if (typeof window !== 'undefined') {
            window.categoriesList = normalizedCategories;
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Check if we should show the verification banner
  useEffect(() => {
    if (user && !user.emailVerified) {
      setShowVerificationBanner(true);
    } else {
      setShowVerificationBanner(false);
    }
  }, [user]);

  // Function to send verification email
  const handleSendVerificationEmail = async () => {
    if (!user) return;
    
    setSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationEmailSent(true);
      toast.success('Verification email sent! Please check your inbox and spam folders.');
    } catch (error) {
      toast.error('Failed to send verification email. Please try again later.');
      console.error('Error sending verification email:', error);
    } finally {
      setSendingVerification(false);
    }
  };

  // Handler for page changes
  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    // Scroll to top of product grid
    window.scrollTo({
      top: document.getElementById('products-section').offsetTop - 100,
      behavior: 'smooth',
    });
  };
  
  // Handle quick view
  const handleQuickView = (product) => {
    setSelectedProduct(product);
    // Add to recently viewed
    addToRecentlyViewed(product);
  };
  
  // Toggle view mode
  const toggleViewMode = () => {
    // Toggle between list and compact grid
    const newLayout = gridLayout === 'list' ? 'compact' : 'list';
    setGridLayout(newLayout);
    setStoredItem('viewMode', newLayout); // For backward compatibility
  };
  
  // Add to recently viewed
  const addToRecentlyViewedHandler = (product) => {
    addToRecentlyViewed(product);
  };

  // Function to handle email verification
  const handleSendVerification = async (e) => {
    if (e) e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to request verification.');
      return;
    }
    
    if (user.emailVerified) {
      toast.info('Your email is already verified.');
      return;
    }
    
    setSendingVerification(true);
    
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(`Failed to send verification email: ${error.message}`);
    } finally {
      setSendingVerification(false);
    }
  };

  // Add a function to clear specific filters
  const handleClearFilter = (filterKey) => {
    // Show loading indicator for the product section only
    const productSection = document.getElementById('products-section');
    if (productSection) {
      productSection.classList.add('section-loading');
      
      // Scroll to the top of the products section
      window.scrollTo({
        top: productSection.offsetTop - 100,
        behavior: 'smooth'
      });
    }
    
    switch (filterKey) {
      case 'category':
        setSelectedCategory('all');
        break;
      case 'search':
        setSearchQuery('');
        setInputValue('');
        break;
      case 'sort':
        setSortBy('featured');
        break;
      default:
        break;
    }
    setCurrentPage(1);
    
    // Remove loading class after products are updated
    setTimeout(() => {
      if (productSection) {
        productSection.classList.remove('section-loading');
      }
    }, 400);
  };

  // Add a function to clear all filters
  const handleClearAllFilters = () => {
    // Show loading indicator for the product section only
    const productSection = document.getElementById('products-section');
    if (productSection) {
      productSection.classList.add('section-loading');
      
      // Scroll to the top of the products section
      window.scrollTo({
        top: productSection.offsetTop - 100,
        behavior: 'smooth'
      });
    }
    
    setSelectedCategory('all');
    setSearchQuery('');
    setInputValue('');
    setSortBy('featured');
    setCurrentPage(1);
    
    // Remove loading class after products are updated
    setTimeout(() => {
      if (productSection) {
        productSection.classList.remove('section-loading');
      }
    }, 400);
  };

  // Function to get active filters for the StickyFilterBar
  const getActiveFilters = () => {
    // Get category name safely
    const categoryName = selectedCategory !== 'all' 
      ? getCategoryName(selectedCategory)
      : undefined;
      
    // Ensure we're returning a string, not an object
    return {
      category: categoryName && typeof categoryName === 'string' 
        ? categoryName 
        : typeof categoryName === 'object' && categoryName.name
          ? categoryName.name
          : undefined,
      search: searchQuery || undefined,
      sort: sortBy !== 'featured' ? sortBy : undefined
    };
  };

  // Add function to handle category scroll
  const handleCategoryScroll = () => {
    if (!categoryScrollRef.current) return;
    
    const container = categoryScrollRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Add effect to monitor scroll position
  useEffect(() => {
    const container = categoryScrollRef.current;
    if (!container) return;
    
    handleCategoryScroll();
    container.addEventListener('scroll', handleCategoryScroll);
    
    return () => {
      container.removeEventListener('scroll', handleCategoryScroll);
    };
  }, [categories]); // Re-run when categories change

  // Add scroll category functions
  const scrollCategoryLeft = () => {
    if (!categoryScrollRef.current) return;
    categoryScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };
  
  const scrollCategoryRight = () => {
    if (!categoryScrollRef.current) return;
    categoryScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };

  // Add helper function to get category details including subcategory count
  const getCategoryDetails = useCallback((categoryId) => {
    if (categoryId === 'all') {
      return { name: 'All Products', hasChildren: false };
    }
    
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return { name: 'Unknown', hasChildren: false };
    
    // Count subcategories (immediate children only)
    const subcategories = categories.filter(cat => 
      cat.id !== 'all' && 
      cat.parentCategory && 
      cat.parentCategory.toString() === category.id.toString()
    );
    
    return {
      name: category.name,
      hasChildren: subcategories.length > 0,
      subcategoryCount: subcategories.length
    };
  }, [categories]);

  // Update the toggleCategory function to not reference page
  const toggleCategory = useCallback((categoryId, e) => {
    // Prevent the click from triggering the category selection
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setExpandedCategories(prev => {
      // Create a new Set from the previous expanded categories
      const newExpanded = new Set(prev);
      
      // Toggle the category - remove if present, add if not
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId);
      } else {
        newExpanded.add(categoryId);
      }
      
      return newExpanded;
    });
  }, []);

  // Update the renderCategoryHierarchy function with improved design
  const renderCategoryHierarchy = (allCategories, parentId = null, level = 0) => {
    // Filter categories based on parent relationship
    const filteredCategories = allCategories.filter(category => {
      if (parentId === null) {
        // Root level categories have no parent or parentCategory is null/undefined
        return !category.parentCategory;
      } else {
        // Child categories have parentCategory matching the parentId
        // Ensure string comparison for IDs
        const catParentId = category.parentCategory ? category.parentCategory.toString() : null;
        const compareParentId = parentId ? parentId.toString() : null;
        return catParentId === compareParentId;
      }
    });
    
    if (filteredCategories.length === 0) return null;
    
    return filteredCategories.map((category) => {
      // Check if this category has children by looking for any category with this as parent
      // Ensure string comparison for IDs
      const categoryId = category.id.toString();
      const hasChildren = allCategories.some(cat => {
        const catParentId = cat.parentCategory ? cat.parentCategory.toString() : null;
        return catParentId === categoryId;
      });
      
      // Check if this category is expanded
      const isExpanded = expandedCategories.has(categoryId);
      
      // Count subcategories for this category (immediate children only)
      const childrenCount = allCategories.filter(cat => {
        const catParentId = cat.parentCategory ? cat.parentCategory.toString() : null;
        return catParentId === categoryId;
      }).length;
      
      return (
        <div key={category.id} className="category-item mb-1.5">
          {/* Category button - better styled for clarity */}
          <div className={`w-full rounded-lg overflow-hidden transition-all duration-200 ${
            selectedCategory === category.id
              ? 'bg-[#363a94] text-white shadow-md ring-2 ring-[#363a94]/20'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
          }`}>
            {/* Separate the category selection from the expand/collapse control */}
            <div className="flex items-center justify-between">
              {/* Category label and selection area */}
              <button
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentPage(1);
                  
                  // Auto-expand the category when selected
                  if (hasChildren && !isExpanded) {
                    toggleCategory(categoryId);
                  }
                }}
                className="flex-grow text-left px-4 py-3 transition-colors"
                style={{ 
                  paddingLeft: level > 0 ? `${(level * 8) + 16}px` : '16px',
                  paddingRight: '8px',
                  maxWidth: 'calc(100% - 40px)' /* Ensure space for dropdown arrow */
                }}
              >
                <div className="flex flex-wrap items-center w-full">
                  <div className="break-words w-full mb-1" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                    {category.name}
                  </div>
                  
                  <div className="flex items-center mt-1">
                    {/* Show count badge if it has children */}
                    {hasChildren && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        selectedCategory === category.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-[#363a94]/10 text-[#363a94]'
                      }`}>
                        {childrenCount} subcategories
                      </span>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Expand/collapse control - more visible and easy to click */}
              {hasChildren && (
                <button
                  onClick={(e) => toggleCategory(categoryId, e)}
                  aria-label={isExpanded ? "Collapse category" : "Expand category"}
                  className={`p-3 flex items-center justify-center transition-colors flex-shrink-0 w-10 ${
                    selectedCategory === category.id 
                      ? 'hover:bg-white/10 text-white'
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className={`transform transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="feather feather-chevron-down"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {/* Subcategories container with animation */}
          {hasChildren && (
            <motion.div
              initial={false}
              animate={{ 
                height: isExpanded ? "auto" : 0,
                opacity: isExpanded ? 1 : 0
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`pt-1 pl-4 ${level > 0 ? 'border-l-2 border-gray-200 ml-6' : 'ml-4'}`}>
                {renderCategoryHierarchy(allCategories, category.id, level + 1)}
              </div>
            </motion.div>
          )}
        </div>
      );
    });
  };

  // Map displayed products to include category as name instead of ID
  const productsWithCategoryNames = useMemo(() => {
    const idPattern = /^[0-9a-fA-F]{24}$/;
    return paginatedProducts.map(product => {
      let categoryName = 'Uncategorized';
      // If product has a category object with a name property, use it
      if (product.category && typeof product.category === 'object' && product.category.name) {
        categoryName = product.category.name;
      }
      // Else if product.category is a string not matching a MongoDB ID, it's already a name
      else if (typeof product.category === 'string' && !idPattern.test(product.category)) {
        categoryName = product.category;
      }
      // Else lookup in the categories array
      else if (typeof product.category === 'string') {
        const cat = categories.find(c => c.id === product.category || c.id === product.category.toString());
        if (cat) {
          categoryName = cat.name;
        }
      }
      return {
        ...product,
        // Override category so the product card displays the name
        category: categoryName
      };
    });
  }, [paginatedProducts, categories]);

  // Helper function to determine grid classes - adding this back
  const getGridClasses = (gridLayout) => {
    switch (gridLayout) {
      case 'compact':
        return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'gallery':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'list':
        return 'grid-cols-1';
      case 'standard':
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (loading) return <ProductsPageSkeleton />;
  
  if (error) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <Helmet>
        <title>Error | Beauty Lab Cosmetic Products</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-red-500 text-xl">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50" itemScope itemType="https://schema.org/CollectionPage">
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta name="keywords" content={`Korean skincare, cosmetics, beauty products, ${selectedCategory !== 'all' ? selectedCategory + ',' : ''} professional skincare, K-beauty`} />
        <link rel="canonical" href={`https://beautylab.ph/products${selectedCategory !== 'all' ? '?category=' + selectedCategory : ''}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://beautylab.ph/products${selectedCategory !== 'all' ? '?category=' + selectedCategory : ''}`} />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
        <meta property="og:image" content="https://beautylab.ph/og-products.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getPageTitle()} />
        <meta name="twitter:description" content={getPageDescription()} />
        <meta name="twitter:image" content="https://beautylab.ph/twitter-products.jpg" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateProductListSchema(paginatedProducts))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      {/* Breadcrumbs for SEO and user navigation */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <Link to="/" className="hover:text-[#363a94]">Home</Link>
          </li>
          <li className="flex items-center">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li aria-current="page" className="font-medium text-[#363a94]">
            Products
          </li>
          {selectedCategory !== 'all' && (
            <>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li aria-current="page" className="font-medium flex items-center text-[#363a94] max-w-[300px]">
                <span className="break-words" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                  {getCategoryName(selectedCategory)}
                </span>
                {getCategoryDetails(selectedCategory).hasChildren && (
                  <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    +{getCategoryDetails(selectedCategory).subcategoryCount || ''}
                  </span>
                )}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Hero Section - Redesigned with modern aesthetics */}
      <motion.section
        className="relative overflow-hidden mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background with improved gradient and visual elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#363a94] via-[#2d327d] to-[#1e2156] z-0">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
              {/* Decorative circles */}
              <motion.div 
                className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, 0]
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              />
              <motion.div 
                className="absolute top-40 -right-40 w-96 h-96 rounded-full bg-indigo-300/5"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 0]
                }}
                transition={{ 
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              />
            </div>
            
            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="grid-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>
            </div>
            
            {/* Subtle light beams */}
            <motion.div 
              className="absolute top-0 left-0 w-full h-full opacity-20" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 2 }}
            >
              <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white opacity-10 blur-3xl"></div>
              <div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] rounded-full bg-[#ff7bac] opacity-10 blur-3xl"></div>
            </motion.div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="py-12 md:py-16 lg:py-20 flex flex-col md:flex-row items-center">
            {/* Left Content Area */}
            <div className="text-center md:text-left md:w-2/3 relative">
              {/* Category Badge */}
              <motion.div 
                className="inline-flex items-center px-4 py-1.5 mb-5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20 shadow-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <span className="inline-block mr-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="font-medium">
                  {selectedCategory !== 'all' ? `Browsing ${getCategoryName(selectedCategory)}` : 'Premium Korean Skincare'}
                </span>
              </motion.div>
              
              {/* Main Heading with Gradient Text */}
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-block">
                  {selectedCategory !== 'all' 
                    ? `${getCategoryName(selectedCategory)}`
                    : 'Our Products'
                  }
                </span>
                <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                  {selectedCategory !== 'all' ? 'Collection' : 'Collection'}
                </span>
              </motion.h1>
              
              {/* Description with improved styling */}
              <motion.p
                className="text-lg sm:text-xl text-white/90 max-w-2xl md:max-w-xl mx-auto md:mx-0 leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {selectedCategory !== 'all'
                  ? `Browse our premium ${getCategoryName(selectedCategory).toLowerCase()} collection designed for salon professionals and beauty enthusiasts.`
                  : 'Discover our range of FDA-approved Korean cosmetic products formulated with cutting-edge technology for professional results.'
                }
              </motion.p>
              
              {/* Action Buttons with improved styling */}
              <motion.div
                className="mt-8 flex flex-wrap justify-center md:justify-start gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {/* Shop Now Button */}
                <motion.button 
                  onClick={() => {
                    const productsSection = document.getElementById('products-section');
                    if (productsSection) {
                      window.scrollTo({
                        top: productsSection.offsetTop - 100,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="px-7 py-3 bg-white text-[#363a94] rounded-lg font-medium hover:bg-opacity-95 transition-all shadow-lg hover:shadow-xl flex items-center group"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Shop Now
                  <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </motion.button>
                
                {/* View All Products Button - Only shown when in a category */}
                {selectedCategory !== 'all' && (
                  <motion.button 
                    onClick={(e) => {
                      e.preventDefault();
                      
                      // Show loading indicator for the product section only
                      const productSection = document.getElementById('products-section');
                      if (productSection) {
                        productSection.classList.add('section-loading');
                      }
                      
                      // Set the selected category to 'all'
                      setSelectedCategory('all');
                      setCurrentPage(1);
                      
                      // Scroll to products section with smooth animation
                      setTimeout(() => {
                        const productsSection = document.getElementById('products-section');
                        if (productsSection) {
                          window.scrollTo({
                            top: productsSection.offsetTop - 100,
                            behavior: "smooth"
                          });
                        }
                        
                        // Remove loading class after products are updated
                        setTimeout(() => {
                          if (productSection) {
                            productSection.classList.remove('section-loading');
                          }
                        }, 400);
                      }, 100);
                    }}
                    className="px-7 py-3 bg-transparent border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-all flex items-center group backdrop-blur-sm"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    View All Products
                    <svg className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                )}
              </motion.div>
              
              {/* Stats counter - Only shown when not in a specific category */}
              {selectedCategory === 'all' && (
                <motion.div 
                  className="mt-10 flex flex-wrap justify-center md:justify-start gap-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-3xl font-bold text-white">{products.length}+</span>
                    <span className="text-sm text-white/70">Products</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-3xl font-bold text-white">{categories.length - 1}+</span>
                    <span className="text-sm text-white/70">Categories</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-3xl font-bold text-white">100%</span>
                    <span className="text-sm text-white/70">Quality</span>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Right Content Area - Floating Product Cards */}
            <motion.div 
              className="hidden md:block md:w-1/3 relative h-72 lg:h-80"
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="absolute inset-0">
                {/* Floating Product Cards */}
                <motion.div 
                  className="absolute top-0 right-12 w-36 h-48 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl overflow-hidden"
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 2, 0]
                  }}
                  transition={{ 
                    duration: 6, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                >
                  {heroProducts.length > 0 && heroProducts[0]?.image && (
                    <img 
                      src={heroProducts[0].image} 
                      alt={heroProducts[0].name || "Featured product"}
                      className="w-full h-full object-cover opacity-90"
                    />
                  )}
                </motion.div>
                
                <motion.div 
                  className="absolute bottom-4 right-4 w-40 h-52 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl overflow-hidden"
                  animate={{ 
                    y: [0, 10, 0],
                    rotate: [0, -3, 0]
                  }}
                  transition={{ 
                    duration: 7, 
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  {heroProducts.length > 1 && heroProducts[1]?.image && (
                    <img 
                      src={heroProducts[1].image} 
                      alt={heroProducts[1].name || "Featured product"}
                      className="w-full h-full object-cover opacity-90"
                    />
                  )}
                </motion.div>
                
                <motion.div 
                  className="absolute top-16 right-48 w-32 h-44 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl overflow-hidden"
                  animate={{ 
                    y: [0, 8, 0],
                    rotate: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 8, 
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                >
                  {heroProducts.length > 2 && heroProducts[2]?.image && (
                    <img 
                      src={heroProducts[2].image} 
                      alt={heroProducts[2].name || "Featured product"}
                      className="w-full h-full object-cover opacity-90"
                    />
                  )}
                </motion.div>
                
                {/* Decorative elements */}
                <motion.div 
                  className="absolute top-40 right-32 w-8 h-8 rounded-full bg-indigo-400/30 backdrop-blur-sm border border-white/10 shadow-xl"
                  animate={{ 
                    y: [0, -15, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                />
                
                <motion.div 
                  className="absolute top-10 right-24 w-6 h-6 rounded-full bg-pink-400/30 backdrop-blur-sm border border-white/10 shadow-xl"
                  animate={{ 
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 5, 
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Wave divider at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-16 text-gray-50">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-current"></path>
          </svg>
        </div>
      </motion.section>

      {/* Sticky Filter Bar - visible when filters are scrolled out of view, only on mobile */}
      <AnimatePresence>
        {stickyFilterVisible && (
          <motion.div 
            className="fixed top-0 left-0 right-0 z-40 md:hidden pt-16"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <StickyFilterBar 
              activeFilters={getActiveFilters()}
              onClearFilter={handleClearFilter}
              onClearAll={handleClearAllFilters}
              gridLayout={gridLayout}
              onLayoutChange={setGridLayout}
              searchQuery={searchQuery}
              onSearchChange={(query) => {
                setSearchQuery(query);
                setCurrentPage(1);
              }}
              sortOptions={sortOptions}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:gap-6">
          {/* Left Sidebar - Filter Panel (only visible on desktop) */}
          <div className="hidden md:block md:w-72 lg:w-80 flex-shrink-0">
        <motion.div 
              className="sticky top-24 filter-panel backdrop-blur-sm bg-white/90 border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
              <div className="flex flex-col space-y-6 p-5">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                
                {/* Search - Updated with debounced search */}
                <div className="relative filter-control floating-label-group">
                  <input
                    type="text"
                    id="product-search-sidebar"
                    value={inputValue}
                    onChange={handleSearchChange}
                    placeholder=" "
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#363a94] focus:border-transparent transition-all text-gray-700 shadow-sm search-input"
                  />
                  <label 
                    htmlFor="product-search-sidebar" 
                    className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-8"
                  >
                    Search products...
                  </label>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {inputValue && (
                    <button 
                      onClick={() => {
                        setInputValue('');
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Categories - Converted to vertical stack with hierarchy */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-gray-800">Categories</h3>
                  <div className="max-h-[400px] overflow-y-auto pr-2 category-stack custom-scrollbar">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        
                        // Show loading indicator for the product section only
                        const productSection = document.getElementById('products-section');
                        if (productSection) {
                          productSection.classList.add('section-loading');
                        }
                        
                        // Set the selected category
                        setSelectedCategory('all');
                        setCurrentPage(1);
                        
                        // Scroll to products section with smooth animation
                        setTimeout(() => {
                          const productsSection = document.getElementById('products-section');
                          if (productsSection) {
                            const headerOffset = 100;
                            const elementPosition = productsSection.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                            
                            window.scrollTo({
                              top: offsetPosition,
                              behavior: "smooth"
                            });
                          }
                          
                          // Remove loading class after products are updated
                          setTimeout(() => {
                            if (productSection) {
                              productSection.classList.remove('section-loading');
                            }
                          }, 400);
                        }, 100);
                      }}
                      className={`category-button-enhanced mb-3 ${selectedCategory === 'all' ? 'active' : ''}`}
                    >
                      All Categories
                    </button>
                    
                    {/* Debug the actual data structure */}
                    {renderCategoryHierarchy(categories.filter(cat => cat.id !== 'all'))}
                  </div>
                </div>
                
                {/* Sort Options */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-gray-800">Sort By</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:border-transparent cursor-pointer text-sm shadow-sm transition-all hover:border-gray-300"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* View Mode */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-gray-800">View Mode</h3>
                  <div className="p-1 bg-gray-100 rounded-lg shadow-inner hover:bg-gray-200/50 transition-colors">
                    <GridLayoutControls 
                      activeLayout={gridLayout} 
                      onLayoutChange={setGridLayout} 
                    />
                  </div>
                </div>
                
                {/* Active Filters */}
                <AnimatePresence>
                  {(searchQuery || selectedCategory !== 'all' || sortBy !== 'featured') && (
                    <motion.div 
                      className="pt-3 border-t border-gray-200"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={handleClearAllFilters}
                        className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-all flex items-center justify-center"
                      >
                        <FaTimes className="mr-2" size={10} />
                        Clear All Filters
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Main Content - Product Filters (only for mobile) and Products Grid */}
          <div className="flex-1">
            {/* Product Filters for Mobile View */}
            <div id="product-filters" className="md:hidden mb-8">
              <motion.div 
                className=""
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {/* Mobile filters and search bar */}
                <div className="flex flex-col space-y-6 p-5 sm:p-6">
                  {/* Top control row - Enhanced search and filters */}
                  <div className="flex flex-col gap-4">
                    {/* Improved search with prominent design - Updated with debounced search */}
                    <div className="relative filter-control">
                      <div className="flex items-center">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            id="product-search"
                            value={inputValue}
                            onChange={handleSearchChange}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-10 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#363a94] focus:border-transparent transition-all text-gray-700 shadow-sm"
                          />
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                            <FaSearch size={16} />
                          </div>
                          {inputValue && (
                            <button 
                              onClick={() => {
                                setInputValue('');
                                setSearchQuery('');
                              }}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
                            >
                              <FaTimes size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls row - Filters and Sort */}
                    <div className="flex items-center justify-between gap-3">
                {/* Filter button for mobile */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors shadow-sm border border-gray-200"
                        onClick={() => setIsMobileFilterOpen(true)}
                aria-label="Show filters"
              >
                <FaFilter size={14} />
                <span className="text-sm font-medium">Filters</span>
                </motion.button>
              
                      {/* Add View Mode button for mobile */}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          // Toggle between list and compact mode
                          const newLayout = gridLayout === 'list' ? 'compact' : 'list';
                          setGridLayout(newLayout);
                          setStoredItem('viewMode', newLayout);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors shadow-sm border border-gray-200"
                        aria-label={`Switch to ${gridLayout === 'list' ? 'grid' : 'list'} view`}
                      >
                        {gridLayout === 'list' ? (
                          <>
                            <FaGripHorizontal size={14} />
                            <span className="text-sm font-medium">Grid (4×)</span>
                          </>
                        ) : (
                          <>
                            <FaList size={14} />
                            <span className="text-sm font-medium">List</span>
                          </>
                        )}
                </motion.button>
              
                      {/* Sort Dropdown with improved styling */}
                      <div className="flex-1 relative filter-control sort-control">
              <select
                        id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                          className="w-full pl-9 pr-8 py-3 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:border-transparent cursor-pointer text-sm shadow-sm transition-all hover:border-gray-300"
              >
                  {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
                      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                        <FaSortAmountDown className="w-4 h-4 text-gray-500" />
                      </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
                    {/* Active filters display */}
              {(searchQuery || selectedCategory !== 'all' || sortBy !== 'featured') && (
                      <div className="flex flex-wrap gap-2 mt-2">
                  {searchQuery && (
                          <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">
                      <span>Search: {searchQuery}</span>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="ml-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-1 rounded-full transition-colors"
                        aria-label="Clear search filter"
                      >
                        <FaTimes size={10} />
                      </button>
                          </div>
                  )}
                  
                  {selectedCategory !== 'all' && (
                          <div className="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm">
                      <div className="flex flex-wrap items-center">
                        <span className="break-words" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                          Category: {getCategoryName(selectedCategory)}
                        </span>
                        {getCategoryDetails(selectedCategory).hasChildren && (
                          <span className="ml-1 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            +{getCategoryDetails(selectedCategory).subcategoryCount || ''}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => setSelectedCategory('all')}
                        className="ml-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-100 p-1 rounded-full transition-colors flex-shrink-0"
                        aria-label="Clear category filter"
                      >
                        <FaTimes size={10} />
                      </button>
                          </div>
                  )}
                  
                  {sortBy !== 'featured' && (
                          <div className="flex items-center bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm">
                      <span>Sort: {sortOptions.find(opt => opt.id === sortBy)?.name}</span>
                      <button 
                        onClick={() => setSortBy('featured')}
                        className="ml-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 p-1 rounded-full transition-colors"
                        aria-label="Clear sort filter"
                      >
                        <FaTimes size={10} />
                      </button>
                          </div>
                  )}
                  
                        <button
                    onClick={handleClearAllFilters}
                          className="text-sm text-[#363a94] hover:bg-[#363a94]/5 hover:underline px-2 py-1 rounded-md transition-all"
                    aria-label="Clear all filters"
                  >
                    Clear all
                  </button>
              </div>
                    )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add a verification banner for logged-in but unverified users */}
      {user && !isEmailVerified && (
        <motion.div 
                className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <MdEmail className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your email is not verified. Verify your email to see product prices and place orders.
              <button
                onClick={handleSendVerification}
                disabled={sendingVerification}
                    className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600 disabled:opacity-50"
                  >
                    {sendingVerification ? 'Sending...' : 'Send verification email'}
              </button>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Products Grid - Enhanced with transitions and loading states */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        id="products-section"
        ref={productListRef}
      >
        {/* Results count & pagination info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center">
                <span className="w-24 h-4 bg-gray-200 animate-pulse rounded"></span>
              </span>
            ) : (
              <>
                {filteredTotal > 0 ? (
                  <>
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredTotal)}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredTotal)}</span> of{' '}
                    <span className="font-medium">{filteredTotal}</span> products
                    {selectedCategory !== 'all' && getCategoryDetails(selectedCategory).hasChildren && (
                      <span className="ml-1 text-xs font-medium text-indigo-600">
                        (includes subcategories)
                      </span>
                    )}
                  </>
                ) : (
                  <span>No products found</span>
                )}
              </>
            )}
          </p>
          
          {!loading && totalPages > 1 && (
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {/* Empty state */}
        {!loading && filteredTotal === 0 && (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6">
            <img 
              src="/images/empty-products.svg" 
              alt="No products found" 
              className="w-48 h-48 mb-4 opacity-80"
            />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-500 max-w-md mb-6">
              We couldn't find any products matching your current filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={handleClearAllFilters}
              className="px-5 py-2.5 bg-[#363a94] hover:bg-[#2a2d73] text-white rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center text-sm font-medium"
            >
              <FaTimes className="mr-2" size={12} />
              Clear All Filters
            </button>
          </div>
        )}

        {/* Products grid - Enhanced with transitions */}
        {filteredTotal > 0 && !loading && (
          <div className="min-h-[500px]"> {/* Add minimum height to ensure grid has room to expand */}
            <div className={`grid ${getGridClasses(gridLayout)} gap-6 md:gap-8`}>
              {productsWithCategoryNames.map((product) => (
                <motion.div 
                  key={`product-${product._id}`} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center"
                >
                  {gridLayout === 'gallery' ? (
                    <MemoizedGalleryCard
                      product={product}
                      onQuickView={() => setQuickViewProduct(product)}
                      addToRecentlyViewed={() => addToRecentlyViewedHandler(product)}
                    />
                  ) : (
                    <MemoizedProductCard
                      product={product}
                      viewMode={gridLayout === 'list' ? 'list' : 'grid'} 
                      onQuickView={() => setQuickViewProduct(product)}
                      addToRecentlyViewed={() => addToRecentlyViewedHandler(product)}
                      gridLayout={gridLayout}
                    />
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center w-full">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredTotal}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>
        )}

        {/* Initial loading indicator */}
        {loading && (
          <div className="py-8 flex justify-center">
            <BeatLoader color="#363a94" size={12} />
          </div>
        )}
      </motion.div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          addToCart={() => {}}
        />
      )}

      {/* Social Links */}
      <motion.div 
        className="mt-12 pt-8 border-t border-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex flex-wrap justify-center gap-4">
            <a href="https://www.facebook.com/profile.php?id=61567515650606" 
               target="_blank" 
               rel="noopener noreferrer"
             className="social-link flex items-center px-4 py-2 rounded-full border border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
            <BsFacebook className="mr-2 text-blue-600" size={16} />
              Facebook
            </a>
          <a href="https://www.instagram.com/appthatdeliversliquor/" 
               target="_blank" 
               rel="noopener noreferrer"
             className="social-link flex items-center px-4 py-2 rounded-full border border-gray-300 hover:bg-pink-50 hover:border-pink-300 transition-colors"
            >
            <FaInstagram className="mr-2 text-pink-600" size={16} />
              Instagram
            </a>
          <a href="https://www.tiktok.com/@appthatdeliversliquor" 
               target="_blank" 
               rel="noopener noreferrer"
             className="social-link flex items-center px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <FaTiktok className="mr-2" size={16} />
              TikTok
            </a>
        </div>
      </motion.div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setCurrentPage(1);
          setIsMobileFilterOpen(false);
        }}
        sortOptions={sortOptions}
        sortBy={sortBy}
        onSortChange={(sort) => {
          setSortBy(sort);
          setIsMobileFilterOpen(false);
        }}
        searchQuery={inputValue}
        onSearchChange={(query) => {
          setInputValue(query);
          debouncedSearch(query);
        }}
        onClearAll={() => {
          setSelectedCategory('all');
          setInputValue('');
          setSearchQuery('');
          setSortBy('featured');
          setCurrentPage(1);
        }}
      />

      {/* Add custom scrollbar styling and transitions for infinite grid */}
      <style jsx="true">{`
        /* Existing styles */
        
        /* Animation styles for newly loaded products */
        .infinite-product-grid > div {
          transition: opacity 0.4s ease-out, transform 0.5s ease-out;
        }
        
        /* Better loading indicators */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        
        /* Sticky filter bar styling */
        .sticky-filter-bar {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          background-color: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(229, 231, 235, 0.8);
        }
        
        /* Custom scrollbar for category list */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c5c7d0;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9fa2b4;
        }
        
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c5c7d0 #f1f1f1;
        }
      `}</style>
    </div>
  );
};

export default Products; 