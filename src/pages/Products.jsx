import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Products.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShoppingCart, FaStar, FaHeart, FaLock, FaEnvelope, FaList, FaThLarge, FaFilter, FaSearch, FaSortAmountDown, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  
  // New state variables for enhanced features
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productListRef = useRef(null);
  const [gridLayout, setGridLayout] = useState('standard');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [stickyFilterVisible, setStickyFilterVisible] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const categoryScrollRef = useRef(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  // Function to get filtered products
  const getFilteredProducts = useCallback(() => {
    if (!products || products.length === 0) return [];
    
    return products.filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      // Return without price filter
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);
  
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
  
  // Function to paginate products
  const getPaginatedProducts = useCallback(() => {
    const filteredProducts = getFilteredProducts();
    const sortedProducts = getSortedProducts(filteredProducts);
    
    // Set total for pagination
    const filteredTotal = sortedProducts.length;
    
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
  const { paginatedProducts, filteredTotal, totalPages } = getPaginatedProducts();
  
  // Modify the effect for updating displayedProducts on filter changes
  // Use useMemo to prevent unnecessary recalculation
  const filteredAndSortedProducts = useMemo(() => {
        const filteredProducts = getFilteredProducts();
    return getSortedProducts(filteredProducts);
  }, [getFilteredProducts, getSortedProducts]);

  // Replace the existing useEffect with a more optimized one
  useEffect(() => {
    // Use our memoized products - Load more products initially to ensure we fill the screen
    const initialProductCount = Math.min(pageSize * 2, filteredAndSortedProducts.length);
    const initialProducts = filteredAndSortedProducts.slice(0, initialProductCount);
    setDisplayedProducts(initialProducts);
    setHasMore(initialProducts.length < filteredAndSortedProducts.length);
    
    // Reset the page when filters change
    setPage(1);
    
    // Check if we need to load more after a short delay
    // This helps ensure the grid is filled after initial render
    const timer = setTimeout(() => {
      const productsSection = document.getElementById('products-section');
      if (productsSection) {
        const viewportHeight = window.innerHeight;
        const sectionBottom = productsSection.getBoundingClientRect().bottom;
        
        // If the products section doesn't fill the viewport and we have more to load, load more
        if (sectionBottom < viewportHeight && initialProducts.length < filteredAndSortedProducts.length) {
          const nextPageProducts = filteredAndSortedProducts.slice(
            0, 
            Math.min(initialProductCount + pageSize, filteredAndSortedProducts.length)
          );
          setDisplayedProducts(nextPageProducts);
          setPage(prevPage => prevPage + 1);
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filteredAndSortedProducts, pageSize]);

  // Add dedicated effect for category change - to avoid full reloads
  useEffect(() => {
    // When category changes, show a loading indicator just for the products
    setLoading(true);
    
    // Use a shorter timeout for better UX
    const timer = setTimeout(() => {
        setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedCategory]);
  
  // Add useEffect for scroll position and sticky filter bar
  useEffect(() => {
    const handleScroll = () => {
      const filterSection = document.getElementById('product-filters');
      const header = document.querySelector('header');
      
      if (filterSection && header) {
        const headerHeight = header.offsetHeight;
        const filterSectionRect = filterSection.getBoundingClientRect();
        
        // Show sticky bar when the filter section's bottom edge is at or above the header's bottom edge
        // The header is fixed at the top, so its bottom edge is at headerHeight
        setStickyFilterVisible(filterSectionRect.bottom <= headerHeight);
      }
    };
    
    // Run once on mount to set initial state
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
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
    if (view && ['grid', 'list'].includes(view)) setGridLayout(view);
    
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
        
        const storedViewMode = getStoredItem('viewMode', 'standard');
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
    if (gridLayout !== 'standard') params.set('view', gridLayout);
    
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
        const response = await api.get('/categories');
        
        if (response.data && Array.isArray(response.data)) {
          // Map backend categories to expected format, and keep 'All Products' as first option
          const formattedCategories = [
            { id: 'all', name: 'All Products' },
            ...response.data.map(category => ({
              id: category,
              name: category
            }))
          ];
          setCategories(formattedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []); // Remove dependency on location.key to prevent unnecessary refetching

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
    // Toggle between list and standard grid
    const newLayout = gridLayout === 'list' ? 'standard' : 'list';
    setGridLayout(newLayout);
    setStoredItem('viewMode', newLayout); // For backward compatibility
  };
  
  // Add to recently viewed
  const addToRecentlyViewedHandler = (product) => {
    addToRecentlyViewed(product);
  };

  // Calculate products to display
  const displayProducts = paginatedProducts;

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
    switch (filterKey) {
      case 'category':
        setSelectedCategory('all');
        break;
      case 'search':
        setSearchQuery('');
        break;
      case 'sort':
        setSortBy('featured');
        break;
      default:
        break;
    }
    setCurrentPage(1);
  };

  // Add a function to clear all filters
  const handleClearAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('featured');
    setCurrentPage(1);
  };

  // Function to get active filters for the StickyFilterBar
  const getActiveFilters = () => {
    return {
      category: selectedCategory !== 'all' ? 
        categories.find(c => c.id === selectedCategory)?.name || selectedCategory : 
        undefined,
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

  // Update the loadMoreProducts function to use the memoized data
  const loadMoreProducts = useCallback(() => {
    if (!loading && hasMore) {
      setLoading(true);
      
      // Calculate how many products to show in the next batch
      const nextBatchSize = pageSize; // Use full page size for each load
      const currentDisplayCount = displayedProducts.length;
      const totalAvailable = filteredAndSortedProducts.length;
      
      // Calculate next batch (ensuring we don't exceed array bounds)
      const nextDisplayCount = Math.min(currentDisplayCount + nextBatchSize, totalAvailable);
      
      // Get the next batch of products
      const nextPageProducts = filteredAndSortedProducts.slice(0, nextDisplayCount);
      
      // Use a shorter timeout
      setTimeout(() => {
        setDisplayedProducts(nextPageProducts);
        setPage(prevPage => prevPage + 1);
        
        // Check if we've reached the end
        setHasMore(nextDisplayCount < totalAvailable);
        setLoading(false);
      }, 300);
    }
  }, [filteredAndSortedProducts, hasMore, loading, pageSize, displayedProducts.length]);

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
          {JSON.stringify(generateProductListSchema(displayProducts))}
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
              <li aria-current="page" className="font-medium text-[#363a94]">
                {categories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Hero Section */}
      <motion.section
        className="relative overflow-hidden mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#363a94] to-[#2a2d73] z-0">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grid-pattern)" />
            </svg>
            <defs>
              <pattern id="grid-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
          </div>
          <motion.div 
            className="absolute top-0 left-0 w-full h-full" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 2 }}
          >
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
            <div className="absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-[#ff7bac] opacity-10 blur-3xl"></div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="py-16 md:py-20 flex flex-col md:flex-row items-center">
            <div className="text-center md:text-left md:w-2/3">
              <motion.div 
                className="inline-block px-3 py-1 mb-4 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <span className="inline-block mr-1.5 w-2 h-2 rounded-full bg-green-400"></span>
                {selectedCategory !== 'all' ? `Browsing ${categories.find(cat => cat.id === selectedCategory)?.name || 'Products'}` : 'Premium Korean Skincare'}
              </motion.div>
              
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {selectedCategory !== 'all' 
                  ? `${categories.find(cat => cat.id === selectedCategory)?.name || 'Products'}`
                  : 'Our Products Collection'
                }
              </motion.h1>
              
              <motion.p
                className="text-lg sm:text-xl text-white/90 max-w-2xl md:max-w-xl mx-auto md:mx-0"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {selectedCategory !== 'all'
                  ? `Browse our premium ${(categories.find(cat => cat.id === selectedCategory)?.name || 'products').toLowerCase()} collection designed for salon professionals and beauty enthusiasts.`
                  : 'Discover our range of FDA-approved Korean cosmetic products formulated with cutting-edge technology for professional results.'
                }
              </motion.p>
              
              <motion.div
                className="mt-6 flex flex-wrap justify-center md:justify-start gap-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button 
                  onClick={() => {
                    const productsSection = document.getElementById('products-section');
                    if (productsSection) {
                      productsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-2.5 bg-white text-[#363a94] rounded-lg font-medium hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                  Shop Now
                </button>
                
                {selectedCategory !== 'all' && (
                  <button 
                    onClick={() => setSelectedCategory('all')} 
                    className="px-6 py-2.5 bg-transparent border border-white text-white rounded-lg font-medium hover:bg-white/10 transition-all"
                  >
                    View All Products
                  </button>
                )}
              </motion.div>
            </div>
            
            <motion.div 
              className="hidden md:block md:w-1/3 relative h-60"
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="absolute top-0 right-0 w-full h-full">
                <div className="absolute top-4 right-4 w-24 h-24 rounded-xl bg-purple-400/20 backdrop-blur-sm border border-white/10 shadow-xl transform rotate-12"></div>
                <div className="absolute bottom-8 right-20 w-16 h-16 rounded-lg bg-pink-400/30 backdrop-blur-sm border border-white/10 shadow-xl transform -rotate-6"></div>
                <div className="absolute top-10 right-36 w-20 h-20 rounded-full bg-blue-400/20 backdrop-blur-sm border border-white/10 shadow-xl"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Sticky Filter Bar - visible when filters are scrolled out of view, only on mobile */}
      <AnimatePresence>
        {stickyFilterVisible && (
          <motion.div className="md:hidden">
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
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Left Sidebar - Filter Panel (only visible on desktop) */}
          <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0">
        <motion.div 
              className="sticky top-24 filter-panel backdrop-blur-sm bg-white/90 border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
              <div className="flex flex-col space-y-6 p-5">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                
                {/* Search */}
                <div className="relative filter-control floating-label-group">
              <input
                type="text"
                    id="product-search-sidebar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
          </div>

                {/* Categories - Converted to vertical stack */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium text-gray-800">Categories</h3>
                  <div className="max-h-80 overflow-y-auto pr-2 category-stack">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setCurrentPage(1);
                        }}
                        className={`w-full mb-3 px-4 py-3 rounded-lg transition-all text-sm font-medium flex items-center ${
                          selectedCategory === category.id
                            ? 'bg-[#363a94] text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
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

          {/* Main Content Area - Product Filters (only for mobile) and Products Grid */}
          <div className="flex-1">
            {/* Product Filters for Mobile View */}
            <div id="product-filters" className="md:hidden mb-8">
              <motion.div 
                className="filter-panel backdrop-blur-sm bg-white/90 border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {/* Mobile filters and search bar */}
                <div className="flex flex-col space-y-6 p-5 sm:p-6">
                  {/* Top control row - Enhanced search and filters */}
                  <div className="flex flex-col gap-4">
                    {/* Improved search with prominent design */}
                    <div className="relative filter-control">
                      <div className="flex items-center">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            id="product-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-10 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#363a94] focus:border-transparent transition-all text-gray-700 shadow-sm"
                          />
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                            <FaSearch size={16} />
                          </div>
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery('')}
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
                      <span>Category: {categories.find(cat => cat.id === selectedCategory)?.name}</span>
                      <button 
                        onClick={() => setSelectedCategory('all')}
                        className="ml-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-100 p-1 rounded-full transition-colors"
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

      {/* Products Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        id="products-section"
      >
        {/* Results count & pagination info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center">
                <span className="w-24 h-4 bg-gray-200 animate-pulse rounded"></span>
              </span>
            ) : (
              `Showing ${displayedProducts.length} of ${getFilteredProducts().length} products`
            )}
          </p>
          
          {!loading && hasMore && (
            <p className="text-sm text-gray-600">
              Scroll for more products
            </p>
          )}
        </div>

              {/* Empty state */}
              {!loading && displayedProducts.length === 0 && (
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

              {/* Products grid - Ensure this div doesn't have any height constraints */}
              {displayedProducts.length > 0 && (
                <div className="min-h-[500px]"> {/* Add minimum height to ensure grid has room to expand */}
                  <InfiniteProductGrid
                    products={displayedProducts}
                    gridLayout={gridLayout}
                    loading={loading}
                    hasMore={hasMore}
                    onLoadMore={loadMoreProducts}
                    onQuickView={setQuickViewProduct}
                    isLoggedIn={!!user}
                    isEmailVerified={isEmailVerified}
                    loadingSkeletonCount={4} // Reduce skeleton count
                  />
                </div>
              )}

              {/* Loading indicator */}
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
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
        onClearAll={handleClearAllFilters}
      />

      {/* Add custom scrollbar styling */}
      <style jsx="true">{`
        /* Custom scrollbar for category stack */
        .category-stack::-webkit-scrollbar {
          width: 4px;
        }
        
        .category-stack::-webkit-scrollbar-track {
          background: #f3f4f7;
          border-radius: 10px;
        }
        
        .category-stack::-webkit-scrollbar-thumb {
          background: #363a94;
          border-radius: 10px;
        }
        
        .category-stack::-webkit-scrollbar-thumb:hover {
          background: #2a2d73;
        }
        
        /* For Firefox */
        .category-stack {
          scrollbar-width: thin;
          scrollbar-color: #363a94 #f3f4f7;
        }
      `}</style>
    </div>
  );
};

export default Products; 