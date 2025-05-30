import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, NavLink, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/common/Button';
import '../../styles/Header.css';
import { useAuth } from '../../context/AuthContext';
import { getDoc, doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../config/firebase';
import Cart from '../../pages/Shop/Cart';
import { useCart } from '../../context/CartContext';
import NotificationDropdown from '../common/NotificationDropdown';
import { auth } from '../../config/firebase';
import CartDropdown from '../CartDropdown';
import BLCPLogo from '../assets/BLCP (Blue).png';
import { debounce } from 'lodash';
import api from '../../api/client';
import { FaUserCog } from 'react-icons/fa';


const DEFAULT_AVATAR = "https://static.vecteezy.com/system/resources/previews/021/548/095/non_2x/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg";

const Header = () => {
  const location = useLocation();
  
  // Check if current route is admin dashboard - MUST be before any hooks
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Early return for admin routes - before any hooks
  if (isAdminRoute) return null;
  
  // Move ALL hooks to the top before any conditional returns
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [cartData, setCartData] = useState([]);
  const [userData, setUserData] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { cartItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New state variables for sticky header
  const [isScrolled, setIsScrolled] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  // Add new state for search features
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([
    'Korean Skincare', 'Moisturizer', 'Serum', 'Cleanser', 'Sunscreen'
  ]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Add state for tracking which accordions are open
  const [openAccordions, setOpenAccordions] = useState({});
  
  // Add state for collapsed/expanded search
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // New state variables for user rewards and recent order
  const [availableRewards, setAvailableRewards] = useState(0);
  const [recentOrder, setRecentOrder] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  
  // New state for popular articles
  const [popularArticles, setPopularArticles] = useState([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  
  // Fetch popular articles
  useEffect(() => {
    const fetchPopularArticles = async () => {
      try {
        setIsLoadingArticles(true);
        // Fetch articles from the API
        const response = await api.get('/articles', {
          params: { limit: 3, sort: 'popular' } // Fetch top 3 popular articles
        });
        
        // Set articles in state
        setPopularArticles(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching popular articles:', error);
        // Fallback to hardcoded articles if API fails
        setPopularArticles([
          {
            _id: '1',
            title: 'Understanding Korean Skincare Ingredients',
            image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=2070',
            date: 'March 15, 2024'
          },
          {
            _id: '2',
            title: 'The FDA Registration Process Explained',
            image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=2070',
            date: 'March 10, 2024'
          },
          {
            _id: '3',
            title: 'Private Label vs OEM Manufacturing',
            image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=2008',
            date: 'March 5, 2024'
          }
        ]);
      } finally {
        setIsLoadingArticles(false);
      }
    };
    
    // Fetch articles when component mounts
    fetchPopularArticles();
  }, []);
  
  // Function to toggle accordion state
  const toggleAccordion = (index) => {
    setOpenAccordions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Keep all hooks above any conditional logic
  const itemCount = cartItems?.reduce((total, item) => total + item.quantity, 0) || 0;
  
  // Effects - must be before any conditional returns
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [isMenuOpen]);

  // Scroll handler for sticky header effects
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      
      // Determine if we've scrolled down enough to activate the sticky state
      setIsScrolled(currentScrollPos > 10);
      
      // Always keep the header visible but change its appearance based on scroll position
      setVisible(true);
      
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) return;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setUserEmail(data.email || '');
          
          // Fix profile image handling
          setProfileImage(
            data.photoURL || // First check Firebase Auth photoURL
            data.profileImage || // Then check Firestore profileImage
            user.photoURL || // Fallback to auth provider's image
            DEFAULT_AVATAR
          );
          
          // Check admin status from claims
          const idTokenResult = await user.getIdTokenResult();
          setIsAdmin(!!idTokenResult.claims.admin);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), fetchUserData);
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, set up Firestore listener
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, 
          (doc) => {
            // Handle document data
            setUserData(doc.data());
          },
          (error) => {
            console.error("Error fetching user data:", error);
            // Handle error appropriately
          }
        );
        return () => unsubscribeUser();
      } else {
        // No user signed in, clear user data
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = debounce(async (query) => {
    if (!query) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    try {
      const response = await api.get(`/products?search=${encodeURIComponent(query)}`);
      
      // Process results exactly like Products page
      const activeResults = response.data
        .filter(p => p.status === 'active')
        .sort((a, b) => {
          const nameMatchA = a.name.toLowerCase().includes(query.toLowerCase());
          const nameMatchB = b.name.toLowerCase().includes(query.toLowerCase());
          if (nameMatchA && !nameMatchB) return -1;
          if (!nameMatchA && nameMatchB) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      setSearchResults(activeResults);
      setIsSearchOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  }, 500);

  // Menu items definition
  const menuItems = [
    {
      title: 'Home',
      path: '/'
    },
    {
      title: 'Shop',
      path: '/products',
     
    },
    {
      title: 'Services',
      path: '#', // Changed from '/services' to '#' to make it not navigate
      dropdown: [
        {
          title: 'OEM Manufacturing',
          path: '/services/oem'
        },
        {
          title: 'Private Label',
          path: '/services/private-label'
        },
        {
          title: 'FDA Support',
          path: '/services/fda'
        }
      ]
    },
    {
      title: 'Resources',
      path: '/resources',
      dropdown: [
        { title: 'Articles', path: '/articles' },
        { title: 'FAQ', path: '/faq' },
        { title: 'Schedule', path: '/schedule' }
      ]
    },
    {
      title: 'About',
      path: '/about',
   
    },
    {
      title: 'Contact',
      path: '/contact'
    }
  ];

  // Event handlers
  const handleMouseEnter = (index) => {
    setActiveDropdown(index);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  const fetchCartItems = async () => {
    if (!user) return;
    
    try {
      setIsLoadingCart(true);
      const token = await user.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      setCartData(data.products || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    } finally {
      setIsLoadingCart(false);
    }
  };

  // Enhanced search handler
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // If query length is at least 2 characters, perform search
    if (query.length >= 2) {
      handleSearch(query);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  // Function to save search to recent searches
  const saveSearchToRecent = (query) => {
    if (!query) return;
    
    try {
      // Get from localStorage or initialize empty array
      let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      
      // Remove if already exists (to move to top)
      recent = recent.filter(item => item.toLowerCase() !== query.toLowerCase());
      
      // Add to beginning
      recent.unshift(query);
      
      // Keep only last 5 searches
      recent = recent.slice(0, 5);
      
      // Save back to localStorage
      localStorage.setItem('recentSearches', JSON.stringify(recent));
      
      // Update state
      setRecentSearches(recent);
    } catch (error) {
      console.error('Error updating recent searches:', error);
    }
  };

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('recentSearches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDropdownRef.current && 
        !searchDropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target) &&
        !event.target.closest('button[aria-label="Search products"]')
      ) {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
        
        // Collapse search after a small delay
        if (!searchQuery) {
          setTimeout(() => setIsSearchExpanded(false), 200);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // New effect to fetch user rewards and recent order
  useEffect(() => {
    const fetchUserRewardsAndOrder = async () => {
      if (!user) return;
      
      setIsLoadingUserData(true);
      try {
        // Fetch available rewards
        const rewardsResponse = await api.get(`/rewards/history/${user.uid}`);
        if (rewardsResponse.data && typeof rewardsResponse.data.availableRewards === 'number') {
          setAvailableRewards(rewardsResponse.data.availableRewards);
        }
        
        // Fetch recent order
        const token = await user.getIdToken();
        const ordersResponse = await api.get('/orders/user-orders?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ordersResponse.data && ordersResponse.data.length > 0) {
          setRecentOrder(ordersResponse.data[0]);
        }
      } catch (error) {
        console.error('Error fetching user rewards and orders:', error);
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    if (user) {
      fetchUserRewardsAndOrder();
    }
  }, [user]);

  // Function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Function to get status color based on order status
  const getStatusColor = (status) => {
    const statusMap = {
      'pending': 'bg-yellow-500',
      'processing': 'bg-blue-500',
      'shipped': 'bg-indigo-500',
      'delivered': 'bg-green-500',
      'completed': 'bg-green-600',
      'cancelled': 'bg-red-500'
    };
    
    return statusMap[status] || 'bg-gray-500';
  };

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-[55] transition-all duration-300 ${
        isScrolled ? 'bg-white/95 shadow-md backdrop-blur-sm' : 'bg-white'
      }`}
      initial={{ y: 0 }}
      animate={{ 
        y: 0, // Always keep at y:0 (visible)
        height: isScrolled ? '4rem' : '5rem'
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'h-16' : 'h-20'
        }`}>
          {/* Left side: Hamburger and Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <button
              className="inline-flex md:hidden p-1.5 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center">
              <motion.img 
                src={BLCPLogo} 
                alt="BLCP Logo" 
                className="header-logo transition-all duration-300 w-auto object-contain" 
                animate={{ 
                  height: isScrolled ? "auto" : "auto",
                  scale: isScrolled ? 0.9 : 1
                }}
                style={{
                  maxWidth: "100%",
                  objectFit: "contain",
                  aspectRatio: "auto"
                }}
              />
            </Link>
            </div>
            
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item, index) => (
              <div 
                key={item.title} 
                className="relative group"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  } flex items-center`}
                >
                  {item.title}
                  {item.dropdown && (
                    <svg 
                      className={`inline-block w-4 h-4 ml-1 transition-transform duration-200 ${
                        activeDropdown === index ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                  )}
                </Link>

                {/* Mega Menu Dropdown */}
                {item.dropdown && (
                  <motion.div
                    className={`absolute left-0 mt-1 bg-white rounded-lg shadow-xl overflow-hidden z-20 
                      ${item.title === 'Services' || item.title === 'Resources' ? 'w-[600px]' : 'w-48'}
                    `}
                    initial={{ opacity: 0, y: 15, height: 0 }}
                    animate={{ 
                      opacity: activeDropdown === index ? 1 : 0,
                      y: activeDropdown === index ? 0 : 15,
                      height: activeDropdown === index ? 'auto' : 0
                    }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => setActiveDropdown(index)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {/* Standard dropdown for regular items */}
                    {item.title !== 'Services' && item.title !== 'Resources' && (
                      <div className="py-2">
                    {item.dropdown.map((dropItem) => (
                      <Link
                        key={dropItem.path}
                        to={dropItem.path}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {dropItem.title}
                      </Link>
                    ))}
                  </div>
                )}

                    {/* Mega menu for Services */}
                    {item.title === 'Services' && (
                      <div className="p-6">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                            Our Services
                          </h3>
                          <ul className="space-y-2">
                            {item.dropdown.map((dropItem) => (
                              <li key={dropItem.path}>
                                <Link
                                  to={dropItem.path}
                                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 opacity-75"></span>
                                  <span>{dropItem.title}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Mega menu for Resources */}
                    {item.title === 'Resources' && (
                      <div className="grid grid-cols-3 gap-6 p-6">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                            Resources
                          </h3>
                          <ul className="space-y-2">
                            {item.dropdown.map((dropItem) => (
                              <li key={dropItem.path}>
                                <Link
                                  to={dropItem.path}
                                  className="text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                  {dropItem.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                            Popular Articles
                          </h3>
                          <ul className="space-y-2">
                            {isLoadingArticles ? (
                              <li className="flex justify-center py-2">
                                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </li>
                            ) : (
                              popularArticles.map((article) => (
                                <li key={article._id}>
                                  <Link
                                    to={`/articles/${article._id}`}
                                    className="text-gray-700 hover:text-blue-600 transition-colors"
                                  >
                                    {article.title}
                                  </Link>
                                </li>
                              ))
                            )}
                            <li>
                              <Link
                                to="/articles"
                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                              >
                                View all articles
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </Link>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-blue-800 mb-2">Schedule a Consultation</h4>
                            <p className="text-xs text-gray-600 mb-3">
                              Speak with our skincare specialists about your custom formulation needs.
                            </p>
                            <Link
                              to="/schedule"
                              className="inline-block text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Book Now
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Items - COMPLETELY REBUILT */}
          <div className="flex items-center space-x-4">
            {/* Mobile Search Icon - REMOVED */}
            {/* Desktop Search */}
            <div className="hidden md:block relative">
              <motion.div 
                className="flex items-center"
                animate={{ 
                  width: isSearchExpanded ? '350px' : '40px',
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Search icon/button that's always visible */}
                <button 
                  onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                  className={`p-2 rounded-lg ${isSearchExpanded ? 'absolute left-0 top-0 z-10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors'}`}
                  aria-label="Search products"
                >
                  <svg 
                    className="w-5 h-5 transform transition-transform duration-200 hover:scale-110"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M21 21l-5.2-5.2m0 0a7.5 7.5 0 10-10.6-10.6 7.5 7.5 0 0010.6 10.6z"
                      className="transition-colors duration-200 hover:stroke-blue-500"
                    />
                    <circle 
                      cx="10.5" 
                      cy="10.5" 
                      r="7.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      fill="transparent"
                      className="transition-colors duration-200 hover:stroke-blue-500"
                    />
                  </svg>
                </button>
                
                {/* Search input that shows/hides based on expanded state */}
                {isSearchExpanded && (
                  <AnimatePresence>
                    <motion.div 
                      className="flex-grow relative ml-1"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '100%' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    if (searchQuery) setIsSearchOpen(true);
                  }}
                        onBlur={() => {
                          // Only collapse if there's no active search
                          if (!searchQuery && !isSearchOpen) {
                            setTimeout(() => setIsSearchExpanded(false), 200);
                          }
                        }}
                        autoFocus
                      />
                      
                      {/* Search icon inside input */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        
                      </div>
                
                {/* Clear button */}
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#363a94] transition-colors"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>

              {/* Enhanced Search Results Dropdown */}
              <div className="relative">
                <AnimatePresence>
                  {isSearchExpanded && (isSearchOpen || isSearchFocused) && (
                    <motion.div 
                      ref={searchDropdownRef}
                      className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* If no query but search is focused, show recent searches and trending */}
                      {!searchQuery && isSearchFocused && (
                        <div className="divide-y divide-gray-100">
                          {/* Recent searches */}
                          {recentSearches.length > 0 && (
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
                                <button 
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    localStorage.removeItem('recentSearches');
                                    setRecentSearches([]);
                                  }}
                                >
                                  Clear All
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, index) => (
                                  <button
                                    key={index}
                                    className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-700 hover:bg-gray-200 transition-colors"
                                    onClick={() => {
                                      setSearchQuery(search);
                                      handleSearch(search);
                                      setIsSearchOpen(true);
                                    }}
                                  >
                                    {search}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Trending searches */}
                          <div className="p-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Articles</h3>
                            <div className="space-y-3">
                              {isLoadingArticles ? (
                                <div className="flex justify-center py-2">
                                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </div>
                              ) : (
                                popularArticles.map((article) => (
                                  <Link 
                                    key={article._id} 
                                    to={`/articles/${article._id}`}
                                    className="flex items-start space-x-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                    onClick={() => {
                                      setIsSearchOpen(false);
                                      setIsSearchExpanded(false);
                                    }}
                                  >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                      <img 
                                        src={article.image} 
                                        alt={article.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {article.title}
                                      </h4>
                                      <p className="text-xs text-gray-500 mt-1">{article.date}</p>
                                    </div>
                                  </Link>
                                ))
                              )}
                              <Link 
                                to="/articles" 
                                className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium pt-1"
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setIsSearchExpanded(false);
                                }}
                              >
                                View all articles
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Display search results when there's a query */}
                      {searchQuery && (
                        <>
                  {searchResults.length > 0 ? (
                            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                              {searchResults.map((product) => (
                      <div 
                        key={product._id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          navigate(`/products/${product._id}`);
                          setIsSearchOpen(false);
                                    saveSearchToRecent(searchQuery);
                        }}
                      >
                                  <div className="flex items-center gap-3">
                                    {/* Product thumbnail */}
                                    <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                          src={product.image || '/images/placeholder.jpg'} 
                          alt={product.name || "Product"}
                          className="w-full h-full object-cover rounded"
                                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.style.backgroundColor = '#f3f4f6';
                                        }}
                                      />
                            </div>
                                    
                                    {/* Product info */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                                      <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">{product.category}</span>
                                        {user && user.emailVerified ? (
                                        <span className="text-xs font-medium text-blue-600">₱{product.price}</span>
                                        ) : (
                                          <span className="text-xs font-medium text-gray-500 flex items-center">
                                            <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Price hidden
                                          </span>
                                        )}
                            </div>
                          </div>
                        </div>
                      </div>
                              ))}
                              
                              {/* View all results button */}
                              <div className="p-3 border-t">
                                <button
                                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                                    setIsSearchOpen(false);
                                    saveSearchToRecent(searchQuery);
                                  }}
                                >
                                  View all results for "{searchQuery}"
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <svg
                                className="w-12 h-12 text-gray-300 mx-auto mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                              <h3 className="text-gray-500 text-sm font-medium mb-1">No products found</h3>
                              <p className="text-gray-400 text-xs mb-4">
                                Try adjusting your search or browse our categories
                              </p>
                              <div className="flex flex-wrap justify-center gap-2">
                                {trendingSearches.slice(0, 3).map((search, index) => (
                                  <button
                                    key={index}
                                    className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-700 hover:bg-gray-200 transition-colors"
                                    onClick={() => {
                                      setSearchQuery(search);
                                      handleSearch(search);
                                      saveSearchToRecent(search);
                                    }}
                                  >
                                    {search}
                                  </button>
                                ))}
                              </div>
                </div>
              )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* User is logged in - show notification and cart */}
            {user && (
              <>
                {/* Notification Icon */}
                <div className="relative" style={{ marginBottom: '25px' }}>
                  <button 
                    onClick={() => {
                      setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 relative"
                  >
                    {/* SVG removed as requested */}
                
                  </button>
                  <NotificationDropdown 
                    isOpen={isNotificationDropdownOpen} 
                    onClose={() => setIsNotificationDropdownOpen(false)}
                  />
                </div>
                
                {/* Cart Icon */}
                <CartDropdown />
              </>
            )}

            {/* User Profile or Auth Links */}
            <div className="hidden md:block">
              {user ? (
                <div className="relative">
                  <button
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  >
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-white hover:border-blue-500 transition-all"
                      onError={(e) => {
                        e.target.src = DEFAULT_AVATAR; // Fallback if image fails to load
                      }}
                    />
                  </button>
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-lg overflow-hidden z-20 border border-gray-100"
                        >
                          {/* User Identity Section */}
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={profileImage}
                                  alt="Profile"
                                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                  onError={(e) => {
                                    e.target.src = DEFAULT_AVATAR;
                                  }}
                                />
                                {/* Verification Badge */}
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                    </div>
                </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {[firstName, lastName].filter(Boolean).join(' ') || 'Welcome back!'}
                                </h3>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                  </svg>
                                  <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

                          {/* Rewards & Recent Order Section */}
                          <div className="px-4 py-3 bg-white border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs text-gray-500">Available for Redemption</span>
                                {isLoadingUserData ? (
                                  <div className="text-sm font-medium text-gray-400 flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                                    Loading...
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-green-600">{formatCurrency(availableRewards)}</div>
                                )}
                              </div>
                              <div className="h-10 border-r border-gray-200 mx-2"></div>
                              <div className="flex-1">
                                <span className="text-xs text-gray-500">Recent Order</span>
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center">
                                      {isLoadingUserData ? (
                                        <div className="flex items-center">
                                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          <span className="text-sm text-gray-400">Loading...</span>
                                        </div>
                                      ) : (
                                        <>
                                          {recentOrder ? (
                                            <>
                                              <span className={`h-2 w-2 ${getStatusColor(recentOrder.status)} rounded-full mr-1`}></span>
                                              <span className="text-sm font-medium text-gray-800">
                                                {recentOrder.status.charAt(0).toUpperCase() + recentOrder.status.slice(1)}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-sm text-gray-600">No recent orders</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                      <button
                                      className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                      onClick={() => {
                                        setIsProfileDropdownOpen(false);
                                        navigate('/order-history');
                                      }}
                                    >
                                      View All
                      </button>
                  </div>

                                  {/* Order ID and date section removed */}
                          </div>
                              </div>
                          </div>
                        </div>

                          {/* Quick Actions Section */}
                          <div className="p-2">
                            <div className="grid grid-cols-2 gap-2">
                          <Link 
                            to="/profile" 
                                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1 group-hover:bg-blue-200 transition-colors">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Profile</span>
                          </Link>

                          <Link 
                            to="/order-history" 
                                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1 group-hover:bg-blue-200 transition-colors">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Orders</span>
                          </Link>

                          <Link 
                            to="/wishlist" 
                                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1 group-hover:bg-blue-200 transition-colors">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Wishlist</span>
                          </Link>

                            <Link 
                                to="/referrals"
                                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                                onClick={() => setIsProfileDropdownOpen(false)}
                              >
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1 group-hover:bg-blue-200 transition-colors">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Referrals</span>
                          </Link>
                      </div>
                        </div>

                        {/* Account Management Section */}
                        <div className="px-3 pt-2 pb-1">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Account Settings</h4>
                          <div className="space-y-1">
                      <Link 
                              to="/profile/settings"
                              className="flex items-center px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                              <div>
                                <span className="font-medium">Account Settings</span>
                                <p className="text-xs text-gray-500">Manage your profile and security</p>
                              </div>
                      </Link>
                          </div>
                        </div>

                        {/* System Actions Section */}
                        <div className="border-t border-gray-100 px-3 py-2">
                  
                          
                          {isAdmin && (
                            <Link 
                              to="#"
                              className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                setIsMenuOpen(false);
                                // Use window.location for more reliable navigation
                                window.location.href = '/admin/dashboard';
                              }}
                            >
                              <FaUserCog className="w-5 h-5 mr-3 text-blue-600" />
                              Admin Dashboard
                            </Link>
                          )}
                          
                                <button
                          onClick={() => {
                            handleSignOut();
                            setIsProfileDropdownOpen(false);
                          }}
                            className="flex items-center w-full px-2 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1m6 0H9" />
                            </svg>
                            <span className="font-medium">Sign out</span>
                                </button>
                          </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                    </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                          <Link
                            to="/login"
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Sign in
                          </Link>
                          <Link
                            to="/signup"
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                          >
                            Sign up
                          </Link>
                      </div>
                    )}
                  </div>
                  </div>
          </div>
        </div>

            {/* Mobile Menu Enhancement */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="md:hidden fixed top-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 overflow-y-auto max-h-[calc(100vh-4rem)]"
                >
                  {/* Mobile Search Bar */}
                  <div className="sticky top-0 bg-white p-4 border-b border-gray-100 shadow-sm z-10">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                        setIsMenuOpen(false);
                      }} 
                      className="relative"
                    >
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700"
                        aria-label="Search"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </form>
                  </div>

                  <div className="px-4 py-3 space-y-1">
                    {/* User Profile Section - For logged in users */}
                    {user && (
                      <div className="pb-5 mb-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-medium overflow-hidden ring-2 ring-white shadow-md">
                            <img
                              src={profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = DEFAULT_AVATAR;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 truncate">
                              {[firstName, lastName].filter(Boolean).join(' ') || 'Welcome back!'}
                            </h3>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                              </svg>
                              <span className="truncate">{user?.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Profile Quick Actions */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <Link 
                            to="/profile" 
                            className="flex items-center justify-center px-3 py-2 bg-blue-50 rounded-lg text-blue-600 font-medium hover:bg-blue-100 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </Link>
                          <Link 
                            to="/order-history" 
                            className="flex items-center justify-center px-3 py-2 bg-blue-50 rounded-lg text-blue-600 font-medium hover:bg-blue-100 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Orders
                          </Link>
                        </div>
                        
                        {/* Additional Profile Links */}
                        <div className="space-y-1">
                          <Link 
                            to="/profile/settings" 
                            className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Account Settings
                          </Link>
                          <Link 
                            to="/wishlist" 
                            className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            My Wishlist
                          </Link>
                          {isAdmin && (
                            <Link 
                              to="/admin/dashboard" 
                              className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={(e) => {
                                e.preventDefault(); // Prevent default link behavior
                                setIsMenuOpen(false);
                                // Use window.location for more reliable navigation after login
                                window.location.href = '/admin/dashboard';
                              }}
                            >
                              <FaUserCog className="w-5 h-5 mr-3 text-blue-600" />
                              Admin Dashboard
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              handleSignOut();
                              setIsMenuOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1m6 0H9" />
                            </svg>
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Links Section */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <Link 
                        to="/products"
                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span className="text-xs font-medium">Shop</span>
                      </Link>
                      
                      <Link 
                        to="/cart"
                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="relative">
                          <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {itemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                              {itemCount}
                            </span>
                          )}
                      </div>
                        <span className="text-xs font-medium">Cart</span>
                      </Link>

                        <Link
                        to="/contact"
                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">Contact</span>
                      </Link>
                      
                      <Link 
                        to="/schedule"
                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">Schedule</span>
                      </Link>
                    </div>

                    {/* Recently Viewed Section */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Recently Viewed
                      </h3>
                      {/* Recently viewed products would be dynamically loaded here */}
                      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                        {[1, 2, 3, 4].map((item) => (
                          <div key={item} className="flex-shrink-0 w-16">
                            <div className="bg-gray-100 h-16 w-16 rounded-md animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Popular Articles Section - NEW */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        Popular Articles
                      </h3>
                      
                      <div className="space-y-3 px-2">
                        {isLoadingArticles ? (
                          <div className="flex justify-center py-2">
                            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        ) : (
                          popularArticles.map((article) => (
                            <Link 
                              key={article._id} 
                              to={`/articles/${article._id}`}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                <img 
                                  src={article.image} 
                                  alt={article.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {article.title}
                                </h4>
                                <p className="text-xs text-gray-500">{article.date}</p>
                              </div>
                            </Link>
                          ))
                        )}
                        
                        <Link 
                          to="/articles" 
                          className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          View all articles
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Mobile Menu Items with Accordions */}
                    <div className="space-y-1 mt-4">
                      {menuItems.map((item, index) => {
                        const isAccordionOpen = openAccordions[index] || false;
                        
                        return (
                          <div key={item.title} className="border-b border-gray-100 last:border-0 py-1">
                            {item.dropdown ? (
                              <>
                                <button
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${
                                    location.pathname === item.path && item.path !== '#'
                                      ? 'text-blue-600'
                                      : 'text-gray-700'
                                  }`}
                                  onClick={() => toggleAccordion(index)}
                                  aria-expanded={isAccordionOpen}
                                >
                                  <span>{item.title}</span>
                                  <svg
                                    className={`w-4 h-4 transition-transform duration-200 ${
                                      isAccordionOpen ? 'rotate-180' : ''
                                    }`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round"
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M19 9l-7 7-7-7" 
                              />
                            </svg>
                                </button>
                                
                                <AnimatePresence>
                                  {isAccordionOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-gray-50 rounded-md ml-2 my-1 py-2">
                            {item.dropdown.map((dropItem) => (
                              <Link
                                key={dropItem.path}
                                to={dropItem.path}
                                            className="flex items-center px-5 py-2 text-sm text-gray-600 hover:text-blue-600"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                            <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                {dropItem.title}
                              </Link>
                            ))}
                          </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            ) : (
                              <Link
                                to={item.path}
                                className={`block px-3 py-2 rounded-md text-base font-medium ${
                                  location.pathname === item.path
                                    ? 'text-blue-600'
                                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                              >
                                {item.title}
                              </Link>
                        )}
                      </div>
                        );
                      })}
                    </div>

                    {/* Mobile Auth Buttons - Only show when not logged in */}
                    {!user && (
                      <div className="pt-4 pb-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Link
                            to="/login"
                            className="flex-1 px-4 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Sign in
                          </Link>
                          <Link
                            to="/signup"
                            className="flex-1 px-4 py-2 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Sign up
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Persistent contact/help button */}
                  <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 shadow-lg flex justify-center">
                    <a 
                      href="tel:+639123456789" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Need Help? Call Us
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </motion.header>
  );
};

export default Header; 