import { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { Switch } from '@headlessui/react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';
import axios from 'axios';
import { format } from 'date-fns';
import { FaSort, FaSortUp, FaSortDown, FaSync, FaSyncAlt, FaSearch, FaFilter, FaUser, FaUserShield, 
  FaCheckCircle, FaTimesCircle, FaShoppingBag, FaCreditCard, FaCalendarAlt, FaEye, FaEdit, 
  FaBan, FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaIdCard, FaClock, FaSignInAlt, FaInfoCircle, FaChartLine, FaChevronLeft, FaPhone, FaMapMarkerAlt, FaHome, FaMapPin, FaMailBulk, FaGlobe, FaCity } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';

// Add these utility functions
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    // Handle various date formats including Firebase timestamps
    let date;
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      // Firebase Timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
      
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₱0.00';
  
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `₱${parseFloat(amount).toFixed(2)}`;
  }
};

// Add this utility function to get the best available user name
const getUserDisplayName = (user) => {
  // Try different combinations of available name fields
  if (user.displayName) {
    return user.displayName;
  } 
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  
  if (user.firstName) {
    return user.firstName;
  }
  
  if (user.lastName) {
    return user.lastName;
  }
  
  if (user.name) {
    return user.name;
  }
  
  // If we have email but no name, show the email username part
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  // Last resort
  return `User ${user.id.substring(0, 6)}`;
};

// Add this function to get user's profile image or fallback to avatar
const getUserProfileImage = (user) => {
  if (user.photoURL) {
    return user.photoURL;
  }
  
  if (user.profileImage) {
    return user.profileImage;
  }
  
  return null; // Will use initials avatar as fallback
};

// Format address fields into readable address
const formatAddress = (user) => {
  if (!user) return 'No address available';
  
  const address = user.address || {};
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  
  if (parts.length === 0) return 'No address available';
  return parts.join(', ');
};

// Add this helper function at the top of your file
const convertLinksToAnchors = (text) => {
  if (!text) return '';
  
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  return text.split('\n').map((line, i) => {
    const parts = line.split(urlRegex);
    
    return (
      <p key={i} className="mb-1">
        {parts.map((part, j) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={j}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </p>
    );
  });
};

// Create a color generator function for customer avatars
const getGradientColors = (userId) => {
  // Generate consistent colors based on user ID
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colors = [
    ['from-blue-400 to-indigo-500', 'bg-blue-400'],
    ['from-purple-400 to-pink-500', 'bg-purple-400'],
    ['from-green-400 to-teal-500', 'bg-green-400'],
    ['from-yellow-400 to-orange-500', 'bg-yellow-400'],
    ['from-pink-400 to-rose-500', 'bg-pink-400'],
    ['from-indigo-400 to-blue-500', 'bg-indigo-400'],
    ['from-teal-400 to-emerald-500', 'bg-teal-400'],
    ['from-amber-400 to-yellow-500', 'bg-amber-400'],
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'customer',
    status: 'active'
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orderData, setOrderData] = useState({});
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [viewAllOrders, setViewAllOrders] = useState(false);
  const [ws, setWs] = useState(null);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [refreshButtonHighlight, setRefreshButtonHighlight] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [allUserOrders, setAllUserOrders] = useState([]);
  // Add a new state variable for the active tab after the other state variables around line 170
  const [activeTab, setActiveTab] = useState('profile');

  // WebSocket connection for real-time order updates
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connect = () => {
      try {
        const wsUrl = import.meta.env.VITE_API_BASE_URL
          ? import.meta.env.VITE_API_BASE_URL.replace('http', 'ws').replace('/api', '') + '/ws/orders'
          : 'ws://localhost:5000/ws/orders';
        
        const websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
          reconnectAttempts = 0;
          setWs(websocket);
        };
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check if we have data about an order update
            if (data && (data.type === 'order-update' || data._id)) {
              const orderData = data.data || data;
              handleRealTimeOrderUpdate(orderData);
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        };
        
        websocket.onclose = (event) => {
          console.log('WebSocket closed with code:', event.code);
          
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * (2 ** reconnectAttempts), 10000);
            console.log(`Reconnecting in ${delay}ms, attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
            setTimeout(connect, delay);
            reconnectAttempts++;
          }
        };
        
        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * (2 ** reconnectAttempts), 10000);
          setTimeout(connect, delay);
          reconnectAttempts++;
        }
      }
    };
    
    connect();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);
  
  // Handle real-time order updates
  const handleRealTimeOrderUpdate = useCallback((newOrder) => {
    if (!newOrder || !newOrder._id) return;
    
    // Try to match this order to a user
    let userId = null;
    let matchConfidence = 0; // 0-10 scale of confidence in the match
    
    // Check various ways to find the user ID
    if (newOrder.userId) {
      userId = newOrder.userId;
      matchConfidence = 10; // Direct ID match is highest confidence
    } else if (newOrder.user?.id) {
      userId = newOrder.user.id;
      matchConfidence = 10;
    } else if (newOrder.user?.uid) {
      userId = newOrder.user.uid;
      matchConfidence = 10;
    } else if (newOrder.shipping?.email) {
      // We need to check if we have a user with this email
      const userEmailLower = newOrder.shipping.email.toLowerCase();
      const matchingCustomer = customers.find(c => c.email && c.email.toLowerCase() === userEmailLower);
      if (matchingCustomer) {
        userId = matchingCustomer.id;
        matchConfidence = 7; // Email match is less certain than ID
      }
    }
    
    // If we have a user match with reasonable confidence
    if (userId && matchConfidence >= 7) {
      console.log(`Matched real-time order update to user ${userId} with confidence ${matchConfidence}`);
      
      // Update orderData state with the new order
      setOrderData(prevOrderData => {
        const updatedOrderData = { ...prevOrderData };
        
        // Initialize this user's data if needed
        if (!updatedOrderData[userId]) {
          updatedOrderData[userId] = { orders: [], totalOrders: 0, totalSpent: 0 };
        }
        
        // Check if we already have this order
        const existingOrderIndex = updatedOrderData[userId].orders.findIndex(o => o._id === newOrder._id);
        
        if (existingOrderIndex >= 0) {
          // Update existing order
          updatedOrderData[userId].orders[existingOrderIndex] = newOrder;
        } else {
          // Add new order
          updatedOrderData[userId].orders.unshift(newOrder);
          updatedOrderData[userId].totalOrders++;
        }
        
        // Recalculate total spent
        updatedOrderData[userId].totalSpent = updatedOrderData[userId].orders.reduce(
          (total, order) => total + parseFloat(order.summary?.total || order.total || 0), 0
        );
        
        return updatedOrderData;
      });
      
      // If this order belongs to the currently selected user, update the selectedUser state
      if (selectedUser && selectedUser.id === userId) {
        updateSelectedUserWithNewOrder(userId, newOrder);
        // Maybe also show a toast to inform the admin
        toast.success('New order received for this customer!');
      }
    } else {
      console.log('Could not confidently match order to any known user');
    }
  }, [customers, selectedUser]);
  
  // Update the currently selected user when a new order comes in
  const updateSelectedUserWithNewOrder = useCallback((userId, newOrder) => {
    if (!selectedUser || selectedUser.id !== userId || !newOrder) return;
    
    setSelectedUser(prevUser => {
      // Check if this order already exists
      const existingOrders = prevUser.recentOrders || [];
      const existingOrderIndex = existingOrders.findIndex(o => o._id === newOrder._id);
      
      let updatedRecentOrders;
      let newTotalOrders = prevUser.totalOrders || 0;
      
      if (existingOrderIndex >= 0) {
        // Update existing order
        updatedRecentOrders = [...existingOrders];
        // Mark the order as updated
        updatedRecentOrders[existingOrderIndex] = {
          ...newOrder,
          _isNew: true, // Flag for UI highlighting
          _updatedAt: new Date().toISOString()
        };
      } else {
        // Add new order at the beginning of the array
        updatedRecentOrders = [
          {
            ...newOrder,
            _isNew: true, // Flag for UI highlighting
            _updatedAt: new Date().toISOString()
          },
          ...existingOrders
        ];
        newTotalOrders++;
      }
      
      // Recalculate total spent
      const newTotalSpent = updatedRecentOrders.reduce(
        (total, order) => total + parseFloat(order.summary?.total || order.total || 0), 0
      );
      
      // Flash the refresh button to indicate new data
      setRefreshButtonHighlight(true);
      setTimeout(() => setRefreshButtonHighlight(false), 3000);
      
      // Play a sound notification
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('Sound notification failed to play:', err));
      } catch (error) {
        console.log('Sound notification error:', error);
      }
      
      // Show toast notification
      toast.success('New order update received!', {
        icon: '🔔',
        duration: 3000,
      });
      
      return {
        ...prevUser,
        totalOrders: newTotalOrders,
        totalSpent: newTotalSpent,
        recentOrders: updatedRecentOrders
      };
    });
  }, [selectedUser]);
  
  // Fetch latest orders for a specific user
  const fetchUserOrders = useCallback(async (userId) => {
    if (!userId || !auth.currentUser) return null;
    
    try {
      setFetchingOrders(true);
      const token = await auth.currentUser.getIdToken();
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      
      // Get orders for this specific user with explicit userId parameter
      const response = await axios.get(`${apiUrl}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          userId: userId
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        toast.error('No order data returned from server');
        return null;
      }
      
      console.log('Fetched order data:', response.data);
      
      // Additional verification to ensure we only get orders for this specific user
      let userOrders = response.data.filter(order => {
        // Check for direct userId match
        if (order.userId === userId) return true;
        
        // Check user object
        if (order.user?.id === userId || order.user?.uid === userId) return true;
        
        // We may want to check by email if we have the user's email
        const selectedCustomer = customers.find(c => c.id === userId);
        if (selectedCustomer?.email && 
            (order.shipping?.email === selectedCustomer.email || 
             order.email === selectedCustomer.email)) {
          return true;
        }
        
        return false;
      });
      
      // Set all user orders for the "View All" functionality
      setAllUserOrders(userOrders);
      
      // Sort orders by date, newest first
      const sortedOrders = userOrders.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      // Calculate order statistics
      const totalSpent = sortedOrders.reduce(
        (total, order) => total + parseFloat(order.summary?.total || order.total || 0), 0
      );
      
      // Update the orderData state with this fresh data
      setOrderData(prev => ({
        ...prev,
        [userId]: {
          orders: sortedOrders,
          totalOrders: sortedOrders.length,
          totalSpent
        }
      }));
      
      return {
        orders: sortedOrders,
        totalOrders: sortedOrders.length,
        totalSpent
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      toast.error('Could not fetch orders for this user');
      return null;
    } finally {
      setFetchingOrders(false);
    }
  }, [customers]);

  // Fetch both Firebase and MongoDB data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch users from Firestore with expanded fields
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const usersData = snapshot.docs.map(doc => {
            const userData = doc.data();
            
            // Create a display name from available fields
            const displayName = getUserDisplayName({
              id: doc.id,
              ...userData
            });
            
            // Get profile image
            const profileImage = getUserProfileImage({
              id: doc.id,
              ...userData
            });
            
            return {
              id: doc.id,
              ...userData,
              displayName, // Set the display name explicitly
              profileImage, // Set profile image
              role: userData.isAdmin ? 'admin' : 'customer',
              status: userData.isActive !== false ? 'active' : 'inactive',
              additionalInfo: userData.additionalInfo || '', // Make sure we get this field
              // Expanded data
              address: userData.address || {},
              phone: userData.phone || '',
              lastLogin: userData.lastLogin || null,
            };
          });
          
          setCustomers(usersData);
          
          // 2. Fetch order data for these users from MongoDB
          await fetchOrdersFromMongoDB(usersData);
          
          setLoading(false);
        }, (error) => {
          toast.error('Failed to load users');
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Fetch orders from MongoDB API
  const fetchOrdersFromMongoDB = async (users) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        return;
      }
      
      // Get all orders directly from the backend API
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      
      const response = await axios.get(`${apiUrl}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.data) {
        return;
      }
      
      // Process orders and group by user - with more flexible matching
      const userOrderMap = {};
      const usersById = {};
      const usersByEmail = {};
      
      // Create lookup maps for users
      users.forEach(user => {
        usersById[user.id] = user;
        if (user.email) usersByEmail[user.email.toLowerCase()] = user;
      });
      
      response.data.forEach(order => {
        // Try various ways to identify the user
        let userId = null;
        let matchedByEmail = false;
        
        // Direct userId field
        if (order.userId) {
          userId = order.userId;
        } 
        // User object with id/uid
        else if (order.user?.id) {
          userId = order.user.id;
        }
        else if (order.user?.uid) {
          userId = order.user.uid;
        }
        // Try matching by email
        else if (order.shipping?.email && usersByEmail[order.shipping.email.toLowerCase()]) {
          userId = usersByEmail[order.shipping.email.toLowerCase()].id;
          matchedByEmail = true;
        }
        else if (order.email && usersByEmail[order.email.toLowerCase()]) {
          userId = usersByEmail[order.email.toLowerCase()].id;
          matchedByEmail = true;
        }
        
        // Special case check for our problematic user
        if (order.shipping?.email === 'mrjekshacks12@gmail.com' || order.email === 'mrjekshacks12@gmail.com') {
          userId = 'aq5Hszd8oxYyw0aACFaIPNK0d8l2';  // Force association with the correct user ID
          matchedByEmail = true;
        }
        
        if (!userId) {
          return;
        }
        
        if (!userOrderMap[userId]) {
          userOrderMap[userId] = {
            totalOrders: 0,
            totalSpent: 0,
            orders: []
          };
        }
        
        userOrderMap[userId].totalOrders++;
        
        // Handle different order structures
        const orderTotal = order.summary?.total || order.total || 0;
        userOrderMap[userId].totalSpent += parseFloat(orderTotal);
        userOrderMap[userId].orders.push(order);
        
        if (userId === 'aq5Hszd8oxYyw0aACFaIPNK0d8l2') {
        }
      });
      
      // Update customers with order data
      setCustomers(prevCustomers => {
        const updatedCustomers = prevCustomers.map(customer => {
          const customerOrders = userOrderMap[customer.id] || {
            totalOrders: 0,
            totalSpent: 0,
            orders: []
          };
          
          return {
            ...customer,
            totalOrders: customerOrders.totalOrders,
            totalSpent: customerOrders.totalSpent,
            recentOrders: customerOrders.orders?.slice(0, 5) || []
          };
        });
        
        return updatedCustomers;
      });
      
    } catch (error) {
    }
  };

  // Temporary function to make current user admin
  const makeCurrentUserAdmin = async () => {
    try {
      if (!auth.currentUser) {
        toast.error('No user is logged in');
        return;
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isAdmin: true
      });
      toast.success('You are now an admin');
    } catch (error) {
      toast.error('Failed to make user admin');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
          const adminStatus = userDoc.data().isAdmin;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            toast.error('You need admin privileges. Click the "Make Admin" button at the top.');
          }
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        isActive: !currentStatus
      });
      
      toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${!currentStatus ? 'enable' : 'disable'} user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: newRole === 'admin'
      });
      toast.success('User role updated');
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />;
  };

  const filteredCustomers = customers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower);
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'name':
        aValue = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        bValue = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        break;
      case 'email':
        aValue = (a.email || '').toLowerCase();
        bValue = (b.email || '').toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      case 'orders':
        aValue = a.totalOrders || 0;
        bValue = b.totalOrders || 0;
        break;
      case 'spent':
        aValue = a.totalSpent || 0;
        bValue = b.totalSpent || 0;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRoleFilter = async (e, userId) => {
    const newRole = e.target.value;
    await updateUserRole(userId, newRole);
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || user.displayName || '',
      email: user.email || '',
      role: user.role || 'customer',
      status: user.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleViewClick = (customer) => {
    setSelectedUser(customer);
    setViewModalOpen(true);
    setViewAllOrders(false); // Reset view all orders flag
    setAllUserOrders([]); // Clear previous orders
    
    // Fetch the customer's orders
    fetchUserOrders(customer.id);
    
    try {
      toast('Loading order history...', { 
        style: { background: '#d1ecf1', color: '#0c5460' }
      });
    } catch (error) {
      console.error('Error displaying toast notification:', error);
    }
  };

  const handleViewAllOrders = (e) => {
    e.preventDefault();
    setViewAllOrders(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setViewModalOpen(false);
    setSelectedUser(null);
    setViewAllOrders(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        name: formData.name,
        isAdmin: formData.role === 'admin',
        isActive: formData.status === 'active'
      });
      toast.success('User updated successfully');
      closeModal();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Add a refresh user orders function
  const handleRefreshOrders = async () => {
    if (!selectedUser || !selectedUser.id) return;
    
    try {
      setFetchingOrders(true);
      const latestUserData = await fetchUserOrders(selectedUser.id);
      
      if (latestUserData) {
        setSelectedUser(prev => ({
          ...prev,
          totalOrders: latestUserData.totalOrders,
          totalSpent: latestUserData.totalSpent,
          recentOrders: latestUserData.orders
        }));
        toast.success('Order data refreshed');
      }
    } catch (error) {
      toast.error('Failed to refresh orders');
    } finally {
      setFetchingOrders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 relative">
              <div className="absolute top-0 left-0 right-0 bottom-0 animate-spin rounded-full border-4 border-blue-100 border-t-4 border-t-blue-500"></div>
              <div className="absolute top-0 left-0 right-0 bottom-0 animate-ping opacity-20 rounded-full border-4 border-blue-500"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading customer data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen mr-32">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Header */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 w-8 h-1 rounded-full mr-3 hidden sm:block"></span>
                Customer Management
              </h1>
              <p className="text-gray-500 mt-1">Manage and monitor customer accounts and orders</p>
            </div>
            
            {!isAdmin && (
              <button
                onClick={makeCurrentUserAdmin}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200 font-medium flex items-center"
              >
                <FaUserShield className="mr-2" />
                Make Admin
              </button>
            )}
          </div>
          
          {/* Enhanced Controls Panel */}
          <div className="bg-white shadow-md rounded-xl overflow-hidden mb-8 border border-gray-100">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Unified Search Bar */}
              <div className="w-full md:w-2/3 relative group">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-all ${isSearchFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                  <FaSearch className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isSearchFocused ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Enhanced Filter Controls */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaUser className="h-4 w-4" />
                  </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                    className="pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-lg appearance-none hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Roles</option>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <FaChevronDown className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaCheckCircle className="h-4 w-4" />
                  </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-lg appearance-none hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <FaChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Customer Table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-white">
                  <th 
                    className="group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer border-r border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      <div className="transform transition-transform duration-200">
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />
                        ) : (
                          <FaSort className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th 
                    className="group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer border-r border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Joined</span>
                      <div className="transform transition-transform duration-200">
                        {sortField === 'createdAt' ? (
                          sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />
                        ) : (
                          <FaSort className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th 
                    className="group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer border-r border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => handleSort('orders')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Orders</span>
                      <div className="transform transition-transform duration-200">
                        {sortField === 'orders' ? (
                          sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />
                        ) : (
                          <FaSort className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th 
                    className="group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer border-r border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => handleSort('spent')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Total Spent</span>
                      <div className="transform transition-transform duration-200">
                        {sortField === 'spent' ? (
                          sortDirection === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />
                        ) : (
                          <FaSort className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedCustomers.map((customer) => {
                  // Get gradient colors for this user's avatar
                  const [gradientClass, bgClass] = getGradientColors(customer.id);
                  
                  return (
                    <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-11 w-11 overflow-hidden rounded-xl shadow-md">
                            {customer.profileImage ? (
                              <img 
                                src={customer.profileImage} 
                                alt={getUserDisplayName(customer)} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className={`flex-shrink-0 h-11 w-11 bg-gradient-to-br ${getGradientColors(customer.id)[0]} rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-all duration-200 hover:scale-105`}>
                                <span className="text-white font-semibold text-lg">
                                  {getUserDisplayName(customer).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {getUserDisplayName(customer)}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <span className="truncate max-w-[180px]">{customer.email}</span>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center mt-0.5">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono tracking-tight">
                                {customer.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">
                          {formatDate(customer.createdAt)}
                        </div>
                        {customer.recentOrders && customer.recentOrders.length > 0 && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <FaCalendarAlt className="mr-1.5 text-gray-400" size={12} />
                            <span>Last: {formatDate(customer.recentOrders[0].createdAt)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`px-3 py-1.5 rounded-lg ${customer.totalOrders ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'} font-medium flex items-center`}>
                            <FaShoppingBag className={`mr-1.5 ${customer.totalOrders ? 'text-blue-500' : 'text-gray-400'}`} size={12} />
                            <span className="text-sm">{customer.totalOrders || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${parseFloat(customer.totalSpent || 0) > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {formatCurrency(customer.totalSpent || 0)}
                        </div>
                        {parseFloat(customer.totalSpent || 0) > 0 && customer.totalOrders > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Avg: {formatCurrency((customer.totalSpent || 0) / customer.totalOrders)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${customer.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'} shadow-sm`}>
                            <Switch
                              checked={customer.status === 'active'}
                              onChange={() => toggleUserStatus(customer.id, customer.status === 'active')}
                                  className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                                />
                              <span
                                className={`${
                                    customer.status === 'active' ? 'translate-x-7' : 'translate-x-1'
                                  } inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out`}
                                />
                              </div>
                            <div className="ml-3 flex flex-col">
                              <span className={`text-sm font-medium ${customer.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`}>
                                {customer.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {customer.status === 'active' ? 'Customer can login' : 'Access restricted'}
                              </span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center"
                            onClick={() => handleViewClick(customer)}
                            disabled={actionLoading}
                          >
                            <FaEye className="mr-1.5" size={14} />
                            <span>View</span>
                          </button>
                          <button 
                            className={`px-3 py-2 rounded-lg hover:shadow-md transition-all duration-200 flex items-center ${
                              customer.status === 'active' 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                            }`}
                            onClick={() => toggleUserStatus(customer.id, customer.status === 'active')}
                            disabled={actionLoading}
                          >
                            {customer.status === 'active' ? (
                              <>
                                <FaBan className="mr-1.5" size={14} />
                                <span>Disable</span>
                              </>
                            ) : (
                              <>
                                <FaCheckCircle className="mr-1.5" size={14} />
                                <span>Enable</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FaEdit className="mr-2" />
                Edit Customer
              </h2>
              <button 
                onClick={closeModal}
                className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full p-1"
                disabled={actionLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                {/* User Details Section */}
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 mr-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                      <span className="text-white text-2xl font-bold">
                        {formData.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Customer Profile</h3>
                    <p className="text-gray-500 text-sm">Update customer information and permissions</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4">
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser className="h-5 w-5 text-gray-400" />
                      </div>
                  <input
                        id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="pl-10 pr-4 py-2.5 block w-full rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 shadow-sm"
                    disabled={actionLoading}
                        placeholder="Enter display name"
                  />
                    </div>
                </div>
                
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MdEmail className="h-5 w-5 text-gray-400" />
                      </div>
                  <input
                        id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                        className="pl-10 pr-4 py-2.5 block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-500 shadow-sm"
                        placeholder="Email address cannot be changed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 flex items-center">
                      <FaInfoCircle className="mr-1.5 text-blue-400" size={12} />
                      Email addresses cannot be modified
                    </p>
                </div>
                
                  <div className="mb-4">
                    <label htmlFor="user-id" className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaIdCard className="h-5 w-5 text-gray-400" />
                      </div>
                  <input
                        id="user-id"
                    type="text"
                    value={selectedUser?.id || ''}
                    disabled
                        className="pl-10 pr-4 py-2.5 block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono text-sm shadow-sm"
                  />
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Account Settings</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        User Role
                      </label>
                      <div className="relative">
                  <select
                          id="role"
                    name="role"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none shadow-sm transition-colors"
                    disabled={actionLoading}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <FaChevronDown size={12} />
                        </div>
                      </div>
                </div>
                
                <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Status
                      </label>
                      <div className="relative">
                  <select
                          id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none shadow-sm transition-colors"
                    disabled={actionLoading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <FaChevronDown size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors flex items-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {viewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8 relative overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FaUser className="mr-2" />
                Customer Details - {getUserDisplayName(selectedUser)}
              </h2>
              <button 
                onClick={closeModal}
                className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Customer summary */}
            <div className="bg-gradient-to-b from-indigo-50 to-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                {selectedUser.profileImage ? (
                  <img 
                    src={selectedUser.profileImage} 
                    alt={getUserDisplayName(selectedUser)} 
                    className="h-14 w-14 rounded-xl object-cover shadow-md mr-4"
                  />
                ) : (
                  <div className={`h-14 w-14 rounded-xl ${getGradientColors(selectedUser.id)[0]} flex items-center justify-center mr-4 shadow-md`}>
                    <span className="text-white text-xl font-bold">
                      {getUserDisplayName(selectedUser).charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{getUserDisplayName(selectedUser)}</h3>
                      <p className="text-gray-500 text-sm mt-0.5">{selectedUser.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedUser.role === 'admin' ? 'Admin' : 'Customer'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px px-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FaUser className="mr-2" />
                    Profile
                  </div>
                </button>
              
                    <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'orders'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FaShoppingBag className="mr-2" />
                    Orders {selectedUser.totalOrders ? `(${selectedUser.totalOrders})` : ''}
                  </div>
                    </button>
                
                      <button
                  onClick={() => setActiveTab('statistics')}
                  className={`py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'statistics'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FaChartLine className="mr-2" />
                    Statistics
                  </div>
                      </button>
              </nav>
            </div>
            
            {/* Tab content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center border-b pb-2">
                        <FaIdCard className="mr-2 text-blue-500" />
                        Basic Information
                      </h4>
                      <div className="space-y-4">
                        {/* Remove profile image div from here */}
                        
                        {/* Full Name */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            <FaUser />
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">Full Name</span>
                            <p className="text-gray-900">
                              {selectedUser.firstName && selectedUser.lastName 
                                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                                : (selectedUser.name || getUserDisplayName(selectedUser))}
                            </p>
                          </div>
                        </div>
                        
                        {/* Email */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            <MdEmail />
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">Email</span>
                            <p className="text-gray-900">{selectedUser.email}</p>
                          </div>
                        </div>
                        
                        {/* Phone Number (if available) */}
                        {selectedUser.phone && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaPhone />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">Phone</span>
                              <p className="text-gray-900">{selectedUser.phone}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* User ID */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            <FaIdCard />
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">User ID</span>
                            <p className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto whitespace-nowrap text-gray-700">{selectedUser.id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Information */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center border-b pb-2">
                        <FaClock className="mr-2 text-blue-500" />
                        Account Information
                      </h4>
                      <div className="space-y-4">
                        {/* Created Date */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            <FaCalendarAlt />
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">Registration Date</span>
                            <p className="text-gray-900">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {/* Last Login */}
                        {selectedUser.lastLogin && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaSignInAlt />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">Last Login</span>
                              <p className="text-gray-900">{formatDate(selectedUser.lastLogin)}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Role */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            <FaUserShield />
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">User Role</span>
                            <p className={`text-gray-900 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {selectedUser.role === 'admin' ? 'Administrator' : 'Customer'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                            {selectedUser.status === 'active' ? <FaCheckCircle /> : <FaTimesCircle />}
                          </div>
                          <div className="ml-2">
                            <span className="text-sm text-gray-500">Account Status</span>
                            <p className={`text-gray-900 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Address Information */}
                  {(selectedUser.address && Object.keys(selectedUser.address).some(key => Boolean(selectedUser.address[key]))) && (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center border-b pb-2">
                        <FaMapMarkerAlt className="mr-2 text-blue-500" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.address.street && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaHome />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">Street</span>
                              <p className="text-gray-900">{selectedUser.address.street}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedUser.address.city && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaCity />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">City</span>
                              <p className="text-gray-900">{selectedUser.address.city}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedUser.address.state && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaMapPin />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">State/Province</span>
                              <p className="text-gray-900">{selectedUser.address.state}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedUser.address.postalCode && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaMailBulk />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">Postal Code</span>
                              <p className="text-gray-900">{selectedUser.address.postalCode}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedUser.address.country && (
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">
                              <FaGlobe />
                            </div>
                            <div className="ml-2">
                              <span className="text-sm text-gray-500">Country</span>
                              <p className="text-gray-900">{selectedUser.address.country}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Information Section */}
                  {selectedUser.additionalInfo && (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center border-b pb-2">
                        <FaInfoCircle className="mr-2 text-blue-500" />
                        Additional Information
                      </h4>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-700 text-sm">
                        {convertLinksToAnchors(selectedUser.additionalInfo)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <FaShoppingBag className="mr-2 text-blue-500" />
                      {viewAllOrders ? "All Orders" : "Recent Orders"}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {!viewAllOrders && selectedUser.recentOrders && selectedUser.recentOrders.length > 0 && (
                        <button
                          onClick={handleViewAllOrders}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                        >
                          <FaEye className="mr-1.5" size={12} />
                          View All
                        </button>
                      )}
                      {viewAllOrders && (
                        <button
                          onClick={() => setViewAllOrders(false)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                        >
                          <FaChevronLeft className="mr-1.5" size={12} />
                          Recent Orders
                        </button>
                      )}
                      <button 
                        onClick={handleRefreshOrders}
                        disabled={fetchingOrders}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          refreshButtonHighlight 
                            ? 'bg-blue-100 text-blue-700 animate-pulse' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } transition-all`}
                      >
                        {fetchingOrders ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <FaSyncAlt className="mr-1.5" size={12} />
                            Refresh Data
                          </>
                        )}
                      </button>
                              </div>
                                  </div>
                  
                  {fetchingOrders ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="rounded-full bg-blue-100 h-10 w-10 flex items-center justify-center mb-2">
                          <FaSync className="text-blue-400 animate-spin" />
                              </div>
                        <div className="text-sm text-blue-500 font-medium">Loading order history...</div>
                            </div>
                    </div>
                  ) : (
                    <>
                      {/* Orders Table */}
                      {(viewAllOrders ? allUserOrders : selectedUser.recentOrders)?.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Order ID
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Items
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(viewAllOrders ? allUserOrders : selectedUser.recentOrders).map((order, index) => (
                                <tr key={order._id || order.id || index} className={`hover:bg-gray-50 transition-colors ${order._isNew ? 'bg-blue-50' : ''}`}>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                      <span className="font-mono text-xs text-gray-600">
                                        {order._id || order.id || `ORD-${Math.floor(Math.random() * 10000)}`}
                                </span>
                                  {order._isNew && (
                                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">New</span>
                                  )}
                              </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{formatDate(order.createdAt)}</div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {formatCurrency(order.summary?.total || order.total || order.totalAmount || 0)}
                            </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                      ${order.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                      ${order.status === 'processing' ? 'bg-blue-100 text-blue-800' : ''}
                                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                      ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                                      ${!['completed', 'processing', 'pending', 'cancelled'].includes(order.status) ? 'bg-gray-100 text-gray-800' : ''}
                                    `}>
                                      {order.status || 'processing'}
                                  </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">
                                      {order.items?.length || order.products?.length || 0} {(order.items?.length || order.products?.length || 0) === 1 ? 'item' : 'items'}
                          </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button 
                                      onClick={() => window.open(`/admin/orders/${order._id || order.id}`, '_blank')}
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                                      View
                      </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
                          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <FaShoppingBag className="h-8 w-8 text-blue-300" />
                  </div>
                          <h3 className="text-gray-500 font-medium mb-1">No order history found</h3>
                          <p className="text-gray-400 text-sm max-w-sm mx-auto">
                            This customer hasn't placed any orders yet. Orders will appear here when they make a purchase.
                          </p>
                    </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Statistics Tab */}
              {activeTab === 'statistics' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center border-b pb-3">
                      <FaChartLine className="mr-2 text-blue-500" />
                      Purchase Statistics
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Total Orders Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-5 relative hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600 rounded-tl-lg rounded-bl-lg"></div>
                        <div className="flex items-center mb-3">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                            <FaShoppingBag size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Total Orders</h4>
                            <p className="text-3xl font-bold text-gray-800">{selectedUser.totalOrders || 0}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">
                          {selectedUser.totalOrders > 0 
                            ? `Last order on ${selectedUser.recentOrders && selectedUser.recentOrders.length > 0 ? formatDate(selectedUser.recentOrders[0].createdAt) : 'N/A'}` 
                            : 'No orders placed yet'}
                        </p>
              </div>

                      {/* Total Spent Card */}
                      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-5 relative hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-tl-lg rounded-bl-lg"></div>
                        <div className="flex items-center mb-3">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mr-4">
                            <FaCreditCard size={20} />
                    </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Total Spent</h4>
                            <p className="text-3xl font-bold text-gray-800">{formatCurrency(selectedUser.totalSpent || 0)}</p>
                </div>
              </div>
                        <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">
                          {parseFloat(selectedUser.totalSpent || 0) > 0 
                            ? `Across ${selectedUser.totalOrders} order${selectedUser.totalOrders !== 1 ? 's' : ''}` 
                            : 'No purchases yet'}
                        </p>
            </div>

                      {/* Average Order Value Card */}
                      <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-5 relative hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600 rounded-tl-lg rounded-bl-lg"></div>
                        <div className="flex items-center mb-3">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4">
                            <FaChartLine size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Average Order</h4>
                            <p className="text-3xl font-bold text-gray-800">
                              {selectedUser.totalOrders > 0 
                                ? formatCurrency((selectedUser.totalSpent || 0) / selectedUser.totalOrders) 
                                : formatCurrency(0)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">
                          {selectedUser.totalOrders >= 2 
                            ? `Based on order history` 
                            : selectedUser.totalOrders === 1 
                              ? 'Based on single order' 
                              : 'No order history yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Activity timeline would go here if needed */}
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-center">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers; 