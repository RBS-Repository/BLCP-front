import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Modal from '../../components/common/Modal';
import { collection, query, where, getDocs, orderBy, getDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FaCaretDown, FaCaretRight, FaUser, FaUsers, FaEllipsisV } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

// Status Dropdown Component for better visibility
const StatusDropdown = ({ id, status, options, onSelect, position = 'bottom-right' }) => {
  const isOpen = activeDropdown === id;
  
  const getStatusColor = (statusValue) => {
    switch(statusValue.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'registered':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getPositionStyles = () => {
    switch(position) {
      case 'bottom-left':
        return 'left-0 top-full mt-1';
      case 'top-right':
        return 'right-0 bottom-full mb-1';
      case 'top-left':
        return 'left-0 bottom-full mb-1';
      case 'bottom-right':
      default:
        return 'right-0 top-full mt-1';
    }
  };

  return (
    <div className="relative inline-block text-left group">
      {/* Status indicator with dropdown trigger */}
      <div 
        className={`inline-flex items-center justify-between px-3 py-1 rounded-full border cursor-pointer select-none ${getStatusColor(status)}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown(id);
        }}
      >
        <span className="text-xs font-medium mr-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        <span className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <FaCaretDown size={12} />
        </span>
      </div>
      
      {/* Dropdown indicator tooltip when collapsed */}
      {!isOpen && (
        <div className="absolute opacity-0 transition-opacity duration-200 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none -bottom-8 left-1/2 transform -translate-x-1/2 group-hover:opacity-100 whitespace-nowrap z-10">
          Click to change status
        </div>
      )}
      
      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={`absolute z-20 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 ${getPositionStyles()}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="py-1" role="menu" aria-orientation="vertical">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(id, option.value);
                  }}
                  className={`w-full text-left block px-4 py-2 text-sm hover:bg-gray-100 ${option.value === status ? 'bg-gray-50 font-medium' : ''}`}
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(option.value)}`}></span>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sample status options for the StatusDropdown component
const referralStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'registered', label: 'Registered' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' }
];

/**
 * Usage example for the StatusDropdown component:
 * 
 * <StatusDropdown 
 *   id={referral._id}
 *   status={referral.status}
 *   options={referralStatusOptions}
 *   onSelect={updateReferralStatus}
 *   position="bottom-right" // Optional: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
 * />
 * 
 * The component automatically handles:
 * - Displaying the current status with appropriate styling
 * - Showing a dropdown when clicked
 * - Adding a helpful tooltip when hovering over collapsed state
 * - Calling the provided onSelect handler with id and new status
 */

const ReferralManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalRewards: 0,
    conversionRate: 0
  });
  
  const [settings, setSettings] = useState({
    minimumPurchase: 100,
    maxReferralReward: 200,
    expirationDays: 30,
    creditCalculation: 'percentage',
    maxRewardPercentage: 5,
    referredDiscount: 5,
    currency: '₱'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [newReward, setNewReward] = useState({
    type: 'credit',
    amount: 0,
    description: ''
  });
  
  // Status dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // First, add a new state for the view details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailReferral, setDetailReferral] = useState(null);
  
  // Add a new state for user rewards
  const [userDetailRewards, setUserDetailRewards] = useState([]);
  const [userRewardsLoading, setUserRewardsLoading] = useState(false);
  
  // Add new state variables for the user hierarchy view
  const [allUsers, setAllUsers] = useState([]);
  const [userHierarchy, setUserHierarchy] = useState({});
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [hierarchyStats, setHierarchyStats] = useState({
    totalUsers: 0,
    usersWithReferrals: 0,
    totalReferrals: 0,
    topReferrers: []
  });
  
  // Add new state variables for the user referrals modal
  const [showUserReferralsModal, setShowUserReferralsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Add new state variables for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Add state variables for sorting
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
  // Add new state variable for user available balance
  const [userAvailableBalance, setUserAvailableBalance] = useState(0);
  
  // Fetch referrals and stats
  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        // Fetch all referrals from API
        const response = await axios.get('/api/admin/referrals', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReferrals(response.data.referrals);
        setStats(response.data.stats);
        
        // Fetch settings from MongoDB via admin API
        try {
          const settingsResponse = await axios.get('/api/admin/referrals/settings', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (settingsResponse.data) {
            setSettings({
              minimumPurchase: settingsResponse.data.minimumPurchase || 100,
              maxReferralReward: settingsResponse.data.maxReferralReward || 200,
              expirationDays: settingsResponse.data.expirationDays || 30,
              creditCalculation: settingsResponse.data.creditCalculation || 'percentage',
              maxRewardPercentage: settingsResponse.data.maxRewardPercentage || 5,
              referredDiscount: settingsResponse.data.referredDiscount || 5,
              currency: settingsResponse.data.currency || '₱'
            });
          }
        } catch (settingsError) {
          console.error('Error fetching settings from MongoDB:', settingsError);
          
          // Fallback to Firestore if MongoDB fetch fails
          const settingsDoc = await getDoc(doc(db, 'settings', 'referrals'));
          if (settingsDoc.exists()) {
            const firestoreSettings = settingsDoc.data();
            setSettings({
              minimumPurchase: firestoreSettings.minimumPurchase || 100,
              maxReferralReward: firestoreSettings.maxReferralReward || 200,
              expirationDays: firestoreSettings.expirationDays || 30,
              creditCalculation: firestoreSettings.creditCalculation || 'percentage',
              maxRewardPercentage: firestoreSettings.maxRewardPercentage || 5,
              referredDiscount: firestoreSettings.referredDiscount || 5,
              currency: firestoreSettings.currency || '₱'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchReferralData();
  }, [user]);
  
  // Save referral settings
  const saveSettings = async (e) => {
    // Prevent default form submission behavior
    if (e) e.preventDefault();
    
    try {
      // Basic validation
      if (settings.maxRewardPercentage < 1 || settings.maxRewardPercentage > 50) {
        toast.error('Reward percentage must be between 1% and 50%');
        return;
      }

      if (settings.minimumPurchase < 0) {
        toast.error('Minimum purchase cannot be negative');
        return;
      }

      setIsSaving(true);
      
      // 1. Save to Firestore
      const batch = writeBatch(db);
      const settingsRef = doc(db, 'settings', 'referrals');
      
      batch.set(settingsRef, {
        minimumPurchase: Number(settings.minimumPurchase),
        maxReferralReward: Number(settings.maxReferralReward),
        expirationDays: Number(settings.expirationDays),
        creditCalculation: settings.creditCalculation,
        maxRewardPercentage: Number(settings.maxRewardPercentage),
        referredDiscount: Number(settings.referredDiscount),
        currency: settings.currency || '₱',
        updatedAt: new Date()
      }, { merge: true });

      await batch.commit();
      
      // 2. Save to MongoDB via admin API
      const token = await user.getIdToken();
      
      const response = await axios.put('/api/admin/referrals/settings', {
        minimumPurchase: Number(settings.minimumPurchase),
        maxReferralReward: Number(settings.maxReferralReward),
        expirationDays: Number(settings.expirationDays),
        creditCalculation: settings.creditCalculation,
        maxRewardPercentage: Number(settings.maxRewardPercentage),
        referredDiscount: Number(settings.referredDiscount),
        currency: settings.currency || '₱'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setShowSettingsModal(false);
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings to MongoDB');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add a reward to a specific referral
  const addReward = async () => {
    try {
      if (!selectedReferral) return;
      
      const token = await user.getIdToken();
      
      await axios.post(`/api/admin/referrals/${selectedReferral._id}/rewards`, newReward, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success('Reward added successfully');
      
      // Refresh referrals data
      const response = await axios.get('/api/admin/referrals', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setReferrals(response.data.referrals);
      setShowRewardModal(false);
      setNewReward({
        type: 'credit',
        amount: 0,
        description: ''
      });
    } catch (error) {
      console.error('Error adding reward:', error);
      toast.error('Failed to add reward');
    }
  };
  
  // Change referral status
  const updateReferralStatus = async (referralId, newStatus) => {
    try {
      const token = await user.getIdToken();
      
      await axios.put(`/api/admin/referrals/${referralId}/status`, { status: newStatus }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success(`Referral status updated to ${newStatus}`);
      
      // Update local state to reflect the change
      setReferrals(referrals.map(ref => 
        ref._id === referralId ? { ...ref, status: newStatus } : ref
      ));
      
      // Close dropdown
      setActiveDropdown(null);
    } catch (error) {
      console.error('Error updating referral status:', error);
      toast.error('Failed to update referral status');
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Toggle dropdown state
  const toggleDropdown = (id) => {
    if (activeDropdown === id) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(id);
    }
  };
  
  // Helper function to check if a dropdown is active
  const isDropdownActive = (id) => activeDropdown === id;
  
  // Helper function to get dropdown indicator styling
  const getDropdownIndicatorStyles = (id) => {
    const isActive = isDropdownActive(id);
    return {
      base: `inline-flex items-center justify-center p-1.5 rounded-full transition-all duration-200 ml-1 border`,
      active: isActive 
        ? 'bg-blue-100 text-blue-700 border-blue-200 rotate-180' 
        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600',
      icon: isActive ? 'transform rotate-180' : '',
      tooltip: isActive ? 'hidden' : 'group-hover:opacity-100'
    };
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Update the handleViewDetails function to match Referrals.jsx pattern
  const handleViewDetails = async (referral) => {
    setDetailReferral(referral);
    setShowDetailsModal(true);
    setUserRewardsLoading(true);
    
    try {
      // First check Firestore for rewards
      const rewardsRef = collection(db, 'userRewards');
      const q = query(rewardsRef, 
        where('userId', '==', referral.referredUserId.toString()), // Ensure string match
        orderBy('createdAt', 'desc') // Add sorting like Referrals.jsx
      );
      
      const querySnapshot = await getDocs(q);
      
      let rewards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert timestamps using same method as Referrals.jsx
          expiresAt: data.expiresAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          source: 'firestore'
        };
      });

      // Also fetch rewards from MongoDB
      try {
        const token = await user.getIdToken();
        // Fetch rewards from MongoDB using our API
        const mongoResponse = await axios.get(`/api/admin/users/${referral.referredUserId}/rewards`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (mongoResponse.data && Array.isArray(mongoResponse.data)) {
          const mongoRewards = mongoResponse.data.map(reward => ({
            id: reward._id,
            ...reward,
            // Format dates for consistency
            expiresAt: new Date(reward.expiresAt),
            createdAt: new Date(reward.createdAt),
            redeemedAt: reward.redeemedAt ? new Date(reward.redeemedAt) : null,
            source: 'mongodb',
            used: reward.status === 'redeemed'
          }));
          
          // Combine rewards from both sources
          rewards = [...rewards, ...mongoRewards];
        }
      } catch (mongoError) {
        console.error('Error fetching MongoDB rewards:', mongoError);
        
        // Fallback to direct API endpoint for user rewards if admin endpoint fails
        try {
          const token = await user.getIdToken();
          const directResponse = await axios.get(`/api/rewards/history/${referral.referredUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (directResponse.data && directResponse.data.rewards) {
            const mongoRewards = directResponse.data.rewards.map(reward => ({
              id: reward._id,
              ...reward,
              // Format dates for consistency
              expiresAt: new Date(reward.expiresAt),
              createdAt: new Date(reward.createdAt),
              redeemedAt: reward.redeemedAt ? new Date(reward.redeemedAt) : null,
              source: 'mongodb',
              used: reward.status === 'redeemed'
            }));
            
            // Combine rewards from both sources
            rewards = [...rewards, ...mongoRewards];
          }
        } catch (directError) {
          console.error('Error with direct rewards API:', directError);
        }
      }

      // Sort combined rewards by creation date
      rewards.sort((a, b) => b.createdAt - a.createdAt);
      
      setUserDetailRewards(rewards);
      
      // Fallback to MongoDB rewards if empty and referral has rewards array
      if (rewards.length === 0 && referral.rewards?.length) {
        setUserDetailRewards(referral.rewards.map(r => ({
          ...r,
          id: r._id,
          expiresAt: new Date(r.expiresAt),
          createdAt: new Date(r.createdAt),
          source: 'referral_object'
        })));
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast.error('Failed to load rewards data');
    } finally {
      setUserRewardsLoading(false);
    }
  };
  
  // Update the rewards calculation to support all possible reward types and formats
  const calculateAvailableRewards = (rewards = []) => {
    if (!rewards || rewards.length === 0) {
      return 0;
    }
    
    const now = new Date();
    
    // Filter to only include available/pending rewards
    const availableRewards = rewards.filter(reward => {
      // Skip if reward doesn't exist
      if (!reward) return false;
      
      // Check various properties that might indicate if a reward is used
      let isAvailable = true;
      
      // Check if reward is marked as used/redeemed in any format
      if (reward.used === true || reward.redeemed === true) {
        isAvailable = false;
      }
      
      // Check status field if it exists
      if (reward.status) {
        const status = reward.status.toLowerCase();
        if (status === 'redeemed' || status === 'used' || status === 'expired') {
          isAvailable = false;
        }
      }
      
      // Skip if we've already determined it's not available
      if (!isAvailable) return false;
      
      // Check for expiration with various possible property names
      let isExpired = false;
      
      // Get expiration date from various possible formats
      let expirationDate = null;
      if (reward.expiresAt) {
        expirationDate = typeof reward.expiresAt === 'string' 
          ? new Date(reward.expiresAt) 
          : reward.expiresAt;
      } else if (reward.expireAt) {
        expirationDate = typeof reward.expireAt === 'string'
          ? new Date(reward.expireAt)
          : reward.expireAt;
      } else if (reward.expiration) {
        expirationDate = typeof reward.expiration === 'string'
          ? new Date(reward.expiration)
          : reward.expiration;
      }
      
      // Check if reward is expired
      if (expirationDate && expirationDate instanceof Date && !isNaN(expirationDate.getTime())) {
        isExpired = expirationDate < now;
      }
      
      // Skip if expired
      if (isExpired) return false;
      
      // If we've made it this far, the reward is available
      return true;
    });
    
    // Sum up the available reward amounts
    return availableRewards.reduce((sum, reward) => {
      // Get amount from the reward (handle various formats)
      let amount = 0;
      
      // Try several possible properties for the amount
      if (typeof reward.amount === 'number') {
        amount = reward.amount;
      } else if (typeof reward.amount === 'string') {
        amount = parseFloat(reward.amount) || 0;
      } else if (typeof reward.rewardAmount === 'number') {
        amount = reward.rewardAmount;
      } else if (typeof reward.rewardAmount === 'string') {
        amount = parseFloat(reward.rewardAmount) || 0;
      } else if (typeof reward.value === 'number') {
        amount = reward.value;
      } else if (typeof reward.value === 'string') {
        amount = parseFloat(reward.value) || 0;
      }
      
      // Get reward type from various possible properties
      const rewardType = (reward.type || reward.rewardType || '').toLowerCase();
      
      // Handle different reward types (credit, discount, percentage, points)
      if (
        rewardType.includes('credit') || 
        rewardType === 'store_credit' || 
        rewardType === 'storeCredit' ||
        // Include calculated rewards from our custom calculation
        reward.source === 'calculated'
      ) {
        return sum + amount;
      } else if (rewardType.includes('discount') && rewardType.includes('percent')) {
        // For percentage discounts, we don't add to the sum as they can't be directly used as credit
        return sum;
      } else if (rewardType.includes('discount')) {
        // For fixed amount discounts, add to sum as they can be used like credit
        return sum + amount;
      } else if (rewardType.includes('point')) {
        // For point rewards, don't add to sum as they can't be directly used as credit
        return sum;
      } else {
        // Default behavior for unknown reward types - assume it's a credit
        return sum + amount;
      }
    }, 0);
  };
  
  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    // Validate percentage values
    if (name === 'maxRewardPercentage' || name === 'referredDiscount') {
      if (numValue < 0 || numValue > 100) {
        return; // Don't update if value is invalid
      }
    }
    
    // Validate other numeric values
    if (name === 'minimumPurchase' || name === 'maxReferralReward' || name === 'expirationDays') {
      if (numValue < 0) {
        return; // Don't update if value is negative
      }
    }
    
    setSettings(prev => ({
      ...prev,
      [name]: numValue
    }));
  };
  
  // Update the fetchReferralsFromAPI function to use an existing endpoint
  const fetchReferralsFromAPI = async () => {
    try {
      const token = await user.getIdToken();
      
      // Use the existing /api/admin/referrals endpoint instead of /api/admin/referrals/all
      // This endpoint already works and is used in fetchReferralData
      const response = await axios.get('/api/admin/referrals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // The response structure from this endpoint may be different, 
      // so we need to adapt it to our needs
      if (response.data && response.data.referrals) {
        // Return the data in the format expected by the rest of the code
        return { referrals: response.data.referrals };
      }
      
      return { referrals: [] };
    } catch (error) {
      console.error('Error fetching referrals from API:', error);
      return { referrals: [] };
    }
  };
  
  // Update the user hierarchy fetch function to include API data
  const fetchUserHierarchy = async () => {
    if (!user) return;
    
    try {
      setHierarchyLoading(true);
      
      // First, get all users from Firestore
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        setAllUsers([]);
        setUserHierarchy({});
        setHierarchyStats({
          totalUsers: 0,
          usersWithReferrals: 0,
          totalReferrals: 0,
          topReferrers: []
        });
        setHierarchyLoading(false);
        return;
      }
      
      // Fetch referral data from API (similar to Referrals.jsx)
      const apiReferralsData = await fetchReferralsFromAPI();
      
      // Create a map of referral relationships from API data
      const apiReferralMap = new Map();
      if (apiReferralsData && apiReferralsData.referrals) {
        apiReferralsData.referrals.forEach(referral => {
          // In the admin/referrals endpoint, each referral has referrerId and referredUserId
          // But we need to handle possible variations in the data structure
          const referrerId = referral.referrerId || referral.referrer_id;
          const referredUserId = referral.referredUserId || referral.referred_user_id || referral.userId;
          
          if (referrerId && referredUserId) {
            if (!apiReferralMap.has(referrerId)) {
              apiReferralMap.set(referrerId, []);
            }
            
            // Only add the referredUserId if it's not already in the array
            if (!apiReferralMap.get(referrerId).includes(referredUserId)) {
              apiReferralMap.get(referrerId).push(referredUserId);
            }
          }
        });
      }
      
      const usersData = [];
      usersSnapshot.forEach(doc => {
        if (!doc.exists()) return;
        
        const userData = doc.data();
        usersData.push({
          id: doc.id,
          ...userData,
          // Ensure these fields exist even if they're empty in Firestore
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          referredBy: userData.referredBy || null,
          referralCode: userData.referralCode || '',
          createdAt: userData.createdAt || null
        });
      });
      
      // Sort users by creation date (newest first)
      usersData.sort((a, b) => {
        try {
          const dateA = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) : new Date(0);
          return dateB - dateA;
        } catch (error) {
          console.error('Error sorting users by date:', error);
          return 0;
        }
      });
      
      // Update users even if the hierarchy building fails
      setAllUsers(usersData);
      
      // Build the hierarchy structure based on referredBy field AND API data
      const hierarchy = {};
      
      // Initialize an empty array for each user
      usersData.forEach(userData => {
        hierarchy[userData.id] = [];
      });
      
      // Step 1: Populate from Firestore referredBy field
      usersData.forEach(userData => {
        if (userData.referredBy && hierarchy[userData.referredBy]) {
          // Add this user to their referrer's list
          if (!hierarchy[userData.referredBy].some(user => user.id === userData.id)) {
            hierarchy[userData.referredBy].push(userData);
          }
        }
      });
      
      // Step 2: Supplement with API referral data
      apiReferralMap.forEach((referredUserIds, referrerId) => {
        if (hierarchy[referrerId]) {
          referredUserIds.forEach(referredUserId => {
            const referredUser = usersData.find(u => u.id === referredUserId);
            if (referredUser) {
              if (!hierarchy[referrerId].some(u => u.id === referredUserId)) {
                hierarchy[referrerId].push(referredUser);
              }
            } else {
              // Try to fetch this user directly from Firestore as a fallback
              getDoc(doc(db, 'users', referredUserId))
                .then(docSnap => {
                  if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const user = {
                      id: docSnap.id,
                      ...userData,
                      firstName: userData.firstName || '',
                      lastName: userData.lastName || '',
                      email: userData.email || '',
                      referredBy: userData.referredBy || referrerId, // Set the referrer
                      referralCode: userData.referralCode || '',
                      createdAt: userData.createdAt || null
                    };
                    
                    // Add to allUsers if not already there
                    if (!allUsers.some(u => u.id === user.id)) {
                      setAllUsers(prev => [...prev, user]);
                    }
                    
                    // Add to hierarchy
                    if (!hierarchy[referrerId].some(u => u.id === user.id)) {
                      hierarchy[referrerId].push(user);
                      
                      // Update the state to trigger a re-render
                      setUserHierarchy({...hierarchy});
                    }
                  }
                })
                .catch(err => console.error(`Error fetching user ${referredUserId}:`, err));
            }
          });
        }
      });
      
      // After the API referral mapping, add a direct scan of users for referral relationships
      // Create a new array to track users whose referral data we need to fetch directly
      const usersToCheck = [];

      // Check if any users have the referredBy field set but weren't added to the hierarchy
      usersData.forEach(user => {
        if (user.referredBy && 
            hierarchy[user.referredBy] && 
            !hierarchy[user.referredBy].some(u => u.id === user.id)) {
          hierarchy[user.referredBy].push(user);
        }
        
        // Also collect users that might have referred others but we couldn't get data from the API
        if (user.referralCode) {
          usersToCheck.push(user);
        }
      });
      
      setUserHierarchy(hierarchy);
      
      // Calculate hierarchy statistics
      const usersWithReferrals = Object.keys(hierarchy).filter(id => hierarchy[id].length > 0).length;
      
      // Find top referrers (users with most direct referrals)
      const referralCounts = usersData.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim() || u.email || 'User',
        email: u.email,
        count: (hierarchy[u.id] || []).length
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 referrers
      
      // Calculate maximum referral depth (how many levels deep the referral tree goes)
      const calculateDepth = (userId, currentDepth = 0, visited = new Set()) => {
        if (!userId || visited.has(userId)) return currentDepth; // Prevent circular references
        
        visited.add(userId);
        const referrals = hierarchy[userId] || [];
        
        if (referrals.length === 0) return currentDepth;
        
        const childDepths = referrals.map(r => 
          calculateDepth(r.id, currentDepth + 1, new Set(visited))
        );
        
        if (childDepths.length === 0) return currentDepth;
        return Math.max(...childDepths);
      };
      
      // Find root users (not referred by anyone)
      const rootUsers = usersData.filter(user => !user.referredBy);
      
      // Calculate max depth from any root user
      const depths = rootUsers.map(rootUser => calculateDepth(rootUser.id));
      const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
      
      // Update hierarchy stats
      setHierarchyStats({
        totalUsers: usersData.length,
        usersWithReferrals,
        totalReferrals: usersWithReferrals,
        topReferrers: referralCounts
      });
      
      // Initialize expanded state for root users with a Set
      const initialExpandedSet = new Set();
      // Auto-expand root users to make content immediately visible
      rootUsers.forEach(rootUser => {
        initialExpandedSet.add(rootUser.id);
      });
      
      setExpandedUsers(initialExpandedSet);
      
    } catch (error) {
      console.error('Error fetching user hierarchy:', error);
      toast.error('Failed to load user hierarchy: ' + error.message);
      // Set empty data to avoid UI issues
      setAllUsers([]);
      setUserHierarchy({});
    } finally {
      setHierarchyLoading(false);
    }
  };
  
  // Call the hierarchy fetch function when component mounts
  useEffect(() => {
    if (user) {
      fetchUserHierarchy();
      
      // Auto-refresh every 5 minutes
      const intervalId = setInterval(() => {
        fetchUserHierarchy();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user]);
  
  // Function to toggle expansion of a user in the hierarchy
  const toggleUserExpansion = (userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  // Function to render a user and their referrals recursively
  const renderUserHierarchy = (userId, depth = 0) => {
    if (!userId) {
      console.error('renderUserHierarchy called with no userId');
      return null;
    }
    
    const userData = allUsers.find(u => u.id === userId);
    if (!userData) {
      console.error(`No user data found for ID: ${userId}`);
      return null;
    }
    
    // Get the user's referrals from the hierarchy
    const userReferrals = userHierarchy[userId] || [];
    const hasReferrals = userReferrals.length > 0;
    const isExpanded = expandedUsers.has(userId);
    
    // Create a display name for the user, with fallbacks
    const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown User';
    
    // Generate a unique key for this user element
    const userKey = `user-${userId}-${depth}`;
    
    // Get initials for avatar
    const getInitials = () => {
      if (userData.firstName && userData.lastName) {
        return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
      } else if (userData.firstName) {
        return userData.firstName[0].toUpperCase();
      } else if (userData.email) {
        return userData.email[0].toUpperCase();
      } else {
        return 'U';
      }
    };
    
    // Calculate a unique color for the user based on their ID
    const getAvatarColor = () => {
      const colors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-pink-100 text-pink-800',
        'bg-yellow-100 text-yellow-800',
        'bg-indigo-100 text-indigo-800',
        'bg-red-100 text-red-800',
        'bg-teal-100 text-teal-800'
      ];
      
      // Use the last character of the userId to select a color
      const lastChar = userId.slice(-1);
      const index = lastChar.charCodeAt(0) % colors.length;
      return colors[index];
    };
    
    return (
      <motion.div 
        key={userKey} 
        className="py-2 relative"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: depth * 0.05 }}
      >
        {/* Connection lines for the hierarchy */}
        {depth > 0 && (
          <div className="absolute top-0 left-3 bottom-0 w-px bg-blue-100"></div>
        )}
        
        {/* Horizontal connection line */}
        {depth > 0 && (
          <div className="absolute top-10 left-3 w-4 h-px bg-blue-100"></div>
        )}
        
        <motion.div 
          className={`bg-white rounded-xl border ${hasReferrals ? 'border-blue-100' : 'border-gray-100'} 
                     p-4 hover:shadow-md transition-all duration-300 relative ml-${depth > 0 ? '7' : '0'}`}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-grow" 
                 onClick={() => hasReferrals && toggleUserExpansion(userId)} 
                 style={{ cursor: hasReferrals ? 'pointer' : 'default' }}>
              {/* User avatar with initials */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getAvatarColor()}`}>
                {getInitials()}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{displayName}</span>
                  {userData.referredBy && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Referred
                    </span>
                  )}
                  {hasReferrals && (
                    <span className="text-xs flex items-center text-gray-500">
                    {isExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {userData.email || 'No email available'}
                </div>
                {userData.referralCode && (
                  <div className="text-xs bg-gray-50 px-2 py-1 rounded mt-1 text-gray-600 inline-block">
                    Code: {userData.referralCode}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {userReferrals.slice(0, 3).map((referral, idx) => (
                      <div key={`avatar-${referral.id}-${idx}`} 
                           className={`w-6 h-6 rounded-full border border-white flex items-center justify-center text-xs ${getAvatarColor()}`}
                           title={`${referral.firstName || ''} ${referral.lastName || ''}`.trim() || referral.email || 'User'}>
                        {(referral.firstName?.[0] || referral.email?.[0] || 'U').toUpperCase()}
                      </div>
                    ))}
                    {userReferrals.length > 3 && (
                      <div className="w-6 h-6 rounded-full border border-white bg-gray-100 flex items-center justify-center text-xs text-gray-800">
                        +{userReferrals.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {userReferrals.length} {userReferrals.length === 1 ? 'referral' : 'referrals'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Joined: {userData.createdAt ? 
                    formatDate(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt) : 
                    'Unknown'}
                </p>
              </div>
              
              {/* Add View Referrals button */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent expanding/collapsing
                  handleViewUserReferrals(userData);
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Details
              </motion.button>
            </div>
          </div>
        </motion.div>
        
        {/* Render child referrals if expanded */}
        <AnimatePresence>
        {isExpanded && userReferrals.length > 0 && (
            <motion.div 
              className="mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
            {userReferrals.map(referral => renderUserHierarchy(referral.id, depth + 1))}
            </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Add a function to handle user search
  const handleUserSearch = (e) => {
    setUserSearch(e.target.value);
  };
  
  // Filter users based on search term
  const getFilteredUsers = () => {
    if (!Array.isArray(allUsers) || allUsers.length === 0) {
      return [];
    }
    
    // If no search, return all users instead of just root users
    let filteredUsers = [];
    if (!userSearch || !userSearch.trim()) {
      filteredUsers = [...allUsers]; // Return all users instead of filtering to root users
    } else {
      // If search term present, find matching users regardless of hierarchy
      try {
        const searchTerm = userSearch.toLowerCase().trim();
        filteredUsers = allUsers.filter(userData => {
          if (!userData) return false;
          
          const firstName = (userData.firstName || '').toLowerCase();
          const lastName = (userData.lastName || '').toLowerCase();
          const email = (userData.email || '').toLowerCase();
          const referralCode = (userData.referralCode || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          
          return firstName.includes(searchTerm) ||
                 lastName.includes(searchTerm) ||
                 email.includes(searchTerm) ||
                 referralCode.includes(searchTerm) ||
                 fullName.includes(searchTerm);
        });
      } catch (error) {
        console.error('Error filtering users:', error);
        filteredUsers = allUsers.slice(0, 10); // Return first 10 users as fallback
      }
    }

    // Apply sorting
    return sortUsers(filteredUsers, sortField, sortDirection);
  };
  
  // Function to sort users by a given field and direction
  const sortUsers = (users, field, direction) => {
    return [...users].sort((a, b) => {
      let valueA, valueB;
      
      // Extract the values based on the field
      switch (field) {
        case 'name':
          valueA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          valueB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          break;
        case 'email':
          valueA = (a.email || '').toLowerCase();
          valueB = (b.email || '').toLowerCase();
          break;
        case 'referralCount':
          valueA = userHierarchy[a.id]?.length || 0;
          valueB = userHierarchy[b.id]?.length || 0;
          break;
        case 'createdAt':
        default:
          try {
            valueA = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt).getTime() : 0;
            valueB = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt).getTime() : 0;
          } catch (error) {
            console.error('Error converting date:', error);
            valueA = 0;
            valueB = 0;
          }
          break;
      }
      
      // Compare values based on direction
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };

  // Handle sort change
  const handleSortChange = (field) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
    
    // Reset to first page when sort changes
    setCurrentPage(1);
  };
  
  // Get paginated users based on filtering and current page
  const getPaginatedUsers = () => {
    const filteredUsers = getFilteredUsers();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(getFilteredUsers().length / pageSize);
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Add a function to handle viewing a user's referrals
  const handleViewUserReferrals = (userData) => {
    if (!userData || !userData.id) {
      console.error('Invalid user data provided to handleViewUserReferrals');
      toast.error('Unable to view user details: Invalid user data');
      return;
    }
    
    console.log('Viewing referrals for user:', userData.id, userData);
    setSelectedUser(userData);
    setShowUserReferralsModal(true);
    
    // Fetch user rewards when opening the modal
    fetchUserRewards(userData.id);
  };
  
  // Create a proper solution that calls the same API endpoint as the Referrals page
  const fetchUserAvailableRewards = async (userId) => {
    if (!userId) return 0;
    
      try {
        const token = await user.getIdToken();
        
      // Use the new admin endpoint to get user rewards history
      try {
        const response = await axios.get(`/api/admin/users/${userId}/rewards-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && typeof response.data.availableRewards === 'number') {
          return response.data.availableRewards;
        }
      } catch (apiError) {
        console.error('Error fetching from admin rewards history endpoint:', apiError);
      }
      
      // Calculate from rewards data if we have it
      if (userDetailRewards && userDetailRewards.length > 0) {
        return calculateAvailableRewards(userDetailRewards);
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  // Update fetchUserRewards to prioritize the specific user
  const fetchUserRewards = async (userId) => {
    if (!userId) return;
    
    try {
      setUserRewardsLoading(true);
      
      // Get auth token once for all API calls
            const token = await user.getIdToken();
      
      // Get available rewards using our fixed function
      const availableBalance = await fetchUserAvailableRewards(userId);
      setUserAvailableBalance(availableBalance);
      
      // Use the new admin endpoint to get user rewards history
      try {
        const response = await axios.get(`/api/admin/users/${userId}/rewards-history`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
        if (response.data && response.data.rewards) {
          const formattedRewards = response.data.rewards.map(reward => ({
            ...reward,
            id: reward._id,
            expiresAt: new Date(reward.expiresAt),
            createdAt: new Date(reward.createdAt),
            redeemedAt: reward.redeemedAt ? new Date(reward.redeemedAt) : null,
            source: 'admin_rewards_history'
          }));
          
          setUserDetailRewards(formattedRewards);
          return;
        }
      } catch (apiError) {
        console.error('Error fetching from admin rewards history endpoint:', apiError);
      }
      
      // Fall back to previous methods if the new endpoint fails
      let userRewards = [];
      
      // APPROACH 1: First try to get rewards from MongoDB admin referrals collection
      try {
        // Fetch referrals for this user from admin endpoint
        const referralsResponse = await axios.get(`/api/admin/referrals?userId=${userId}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
        if (referralsResponse.data && referralsResponse.data.referrals && referralsResponse.data.referrals.length > 0) {
          // Extract rewards from each referral
          const extractedRewards = referralsResponse.data.referrals
            .filter(ref => ref.rewards && Array.isArray(ref.rewards) && ref.rewards.length > 0)
            .flatMap(ref => ref.rewards.map(reward => ({
              ...reward,
              id: reward._id || `${ref._id}-reward`,
              referralId: ref._id,
              source: 'admin_referrals'
            })));
          
          userRewards = [...userRewards, ...extractedRewards];
        }
      } catch (error) {
        console.error('Error fetching referrals for user:', error);
      }
      
      // Continue with other fallback approaches as needed
      
      // If we found rewards from any fallback method, set them
      if (userRewards.length > 0) {
        setUserDetailRewards(userRewards);
      } else {
        // If all methods failed, try the available rewards endpoint as a last resort
        try {
          const referralsResponse = await axios.get(`/api/referrals/rewards/available`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (referralsResponse.data && referralsResponse.data.success && 
              referralsResponse.data.rewards && Array.isArray(referralsResponse.data.rewards)) {
            
            // Filter to only get rewards for this specific user if needed
            const availableRewards = referralsResponse.data.rewards.filter(reward => 
              !userId || !reward.referrerId || reward.referrerId === userId
            ).map(reward => ({
              ...reward,
              id: reward._id || reward.id,
              status: 'pending', // These are available/pending rewards
              source: 'referrals_available'
            }));
            
            if (availableRewards.length > 0) {
              setUserDetailRewards(availableRewards);
            } else {
              setUserDetailRewards([]);
            }
          }
        } catch (referralsError) {
          console.error('Error fetching rewards from referrals available endpoint:', referralsError);
          setUserDetailRewards([]);
        }
      }
    } catch (error) {
      setUserDetailRewards([]);
    } finally {
      setUserRewardsLoading(false);
    }
  };
  
  // Add a function to handle the export of rewards to CSV
  const exportRewardsToCSV = (rewards, userName) => {
    // Check if rewards exist
    if (!rewards || rewards.length === 0) {
      toast.error('No rewards data to export');
      return;
    }
    
    try {
      // Define the CSV header row
      const headers = ['ID', 'Amount', 'Type', 'Status', 'Description', 'Created', 'Expires', 'Order ID', 'Order Total', 'Source'];
      
      // Convert rewards to CSV rows
      const csvRows = rewards.map(reward => {
        // Format dates
        const createdDate = reward.createdAt instanceof Date 
          ? reward.createdAt.toLocaleDateString('en-PH') 
          : (reward.createdAt ? new Date(reward.createdAt).toLocaleDateString('en-PH') : 'N/A');
        
        const expiresDate = reward.expiresAt instanceof Date 
          ? reward.expiresAt.toLocaleDateString('en-PH') 
          : (reward.expiresAt ? new Date(reward.expiresAt).toLocaleDateString('en-PH') : 'N/A');
        
        // Format status
        const status = reward.status === 'redeemed' || reward.used ? 'Redeemed' : 
                      (reward.status === 'expired' || (reward.expiresAt && new Date(reward.expiresAt) < new Date()) 
                        ? 'Expired' : 'Available');
        
        // Return the CSV row
        return [
          reward.id || '',
          reward.amount?.toFixed(2) || '0.00',
          reward.type || 'credit',
          status,
          reward.description || 'Referral Reward',
          createdDate,
          expiresDate,
          reward.purchaseId || '',
          reward.orderTotal?.toFixed(2) || '',
          reward.source || 'unknown'
        ].map(value => `"${value}"`).join(',');
      });
      
      // Combine headers and data rows
      const csvContent = [
        headers.join(','),
        ...csvRows
      ].join('\n');
      
      // Create a Blob containing the CSV data
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a download link and trigger a click to download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rewards_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Rewards data exported successfully');
    } catch (error) {
      console.error('Error exporting rewards to CSV:', error);
      toast.error('Failed to export rewards data');
    }
  };
  
  // Modify the refresh mechanism to handle real-time rewards for all users
  useEffect(() => {
    if (selectedUser && selectedUser.id) {
      // Regular refresh for all users
      fetchUserRewards(selectedUser.id);
      
      const intervalId = setInterval(() => {
        console.log('Refreshing user rewards data...');
        fetchUserRewards(selectedUser.id);
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [selectedUser]);
  
  const testAdminRewardsEndpoint = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // First, test the admin connectivity
      const testResponse = await axios.get('/api/admin/users/test', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (testResponse.data && testResponse.data.success) {
        toast.success('Admin API connectivity confirmed');
        
        // Test the rewards history endpoint with a sample user ID
        if (userHierarchy && Object.keys(userHierarchy).length > 0) {
          const firstUserId = Object.keys(userHierarchy)[0];
          const rewardsResponse = await axios.get(`/api/admin/users/${firstUserId}/rewards-history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (rewardsResponse.data) {
            toast.success(`Retrieved rewards data for user: ${rewardsResponse.data.totalCount} rewards found`);
          }
        }
      }
    } catch (error) {
      console.error('Error testing admin API:', error);
      toast.error(`Admin API test failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Referral Management</h1>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Referral Settings
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div 
              className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mt-8 -mr-8 opacity-20"></div>
              
              <div className="flex items-start">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
            </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase font-medium tracking-wide">Minimum Purchase</p>
                  <div className="flex items-baseline mt-1">
                    <h3 className="text-2xl font-bold text-blue-800">
                      {settings.currency}{settings.minimumPurchase.toLocaleString()}
                    </h3>
                    <span className="ml-1 text-xs text-gray-500">min order</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Required for reward eligibility</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full -mt-8 -mr-8 opacity-20"></div>
              
              <div className="flex items-start">
                <div className="p-3 bg-purple-100 rounded-lg text-purple-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
            </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase font-medium tracking-wide">Max Reward</p>
                  <div className="flex items-baseline mt-1">
                    <h3 className="text-2xl font-bold text-purple-800">
                      {settings.currency}{settings.maxReferralReward.toLocaleString()}
                    </h3>
                    <span className="ml-1 text-xs text-gray-500">per referral</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1 font-medium">Maximum reward amount</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl shadow-sm border border-green-100 relative overflow-hidden"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mt-8 -mr-8 opacity-20"></div>
              
              <div className="flex items-start">
                <div className="p-3 bg-green-100 rounded-lg text-green-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase font-medium tracking-wide">Reward Rate</p>
                  <div className="flex items-baseline mt-1">
                    <h3 className="text-2xl font-bold text-green-800">
                {settings.maxRewardPercentage}%
                    </h3>
                    <span className="ml-1 text-xs text-gray-500">of purchase</span>
            </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-green-600 font-medium">Reward calculation rate</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* User Hierarchy section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">User Referral Hierarchy</h3>
              
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {/* Add hierarchy statistics */}
            {!hierarchyLoading && allUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b rounded-t-lg">
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-xl font-semibold text-blue-700">{allUsers.length}</p>
                  </div>
              </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                  <div className="p-3 rounded-lg bg-green-100 text-green-700 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Referrers</p>
                    <div className="flex items-baseline">
                      <p className="text-xl font-semibold text-green-700">{hierarchyStats.usersWithReferrals}</p>
                      <span className="ml-2 text-xs text-gray-500">
                    {hierarchyStats.totalUsers > 0 
                         ? `${((hierarchyStats.usersWithReferrals / hierarchyStats.totalUsers) * 100).toFixed(1)}%`
                         : '0%'}
                      </span>
                    </div>
                  </div>
              </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                  <div className="p-3 rounded-lg bg-yellow-100 text-yellow-700 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Referrals</p>
                    <p className="text-xl font-semibold text-yellow-700">{hierarchyStats.totalReferrals}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-700 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg. Referrals</p>
                    <p className="text-xl font-semibold text-purple-700">
                      {hierarchyStats.usersWithReferrals > 0 
                        ? (hierarchyStats.totalReferrals / hierarchyStats.usersWithReferrals).toFixed(1) 
                        : '0'}
                    </p>
                  </div>
                          </div>
              </div>
            )}
            
            {/* Add search bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                <input
                  type="text"
                  placeholder="Search users by name, email or referral code..."
                  value={userSearch}
                  onChange={handleUserSearch}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-150 hover:shadow-md"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                )}
              </div>
              
                {userSearch && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="absolute right-3 -bottom-3 transform translate-y-full z-10 bg-blue-50 text-blue-800 text-xs px-3 py-1 rounded-full"
                  >
                    Showing results for "{userSearch}"
                  </motion.div>
                )}
              </div>
              
              {/* Add sorting options with improved design */}
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="text-sm text-gray-500 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
                  </svg>
                  Sort by:
                </div>
                {[
                  { id: 'createdAt', label: 'Date Joined', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { id: 'name', label: 'Name', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { id: 'email', label: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                  { id: 'referralCount', label: 'Referral Count', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
                ].map(option => (
                  <motion.button
                    key={option.id}
                    onClick={() => handleSortChange(option.id)}
                    className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${
                      sortField === option.id 
                        ? 'bg-blue-100 text-blue-800 font-medium shadow-sm' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={option.icon}></path>
                    </svg>
                    {option.label}
                    {sortField === option.id && (
                      <motion.span 
                        initial={{ rotate: 0 }}
                        animate={{ rotate: sortDirection === 'asc' ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                        className="ml-1 flex items-center"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                      </motion.span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div className="p-4">
              {hierarchyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found in the system
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Remove the entire debugging info section */}
                  {/* Add debugging info */}
                  {/* <span style={{ display: 'none' }}>
                    {console.log('Current rewards data:', userDetailRewards)}
                    {console.log('Available balance:', calculateAvailableRewards(userDetailRewards))}
                  </span> */}
                  
                  {/* Display filtered users based on search or hierarchy with pagination */}
                  {getPaginatedUsers().map(userData => renderUserHierarchy(userData.id))}
                  
                  {/* Show "no results" message when search returns nothing */}
                  {userSearch && getFilteredUsers().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No users found matching "{userSearch}"
                            </div>
                          )}
                  
                  {/* Pagination controls */}
                  {getFilteredUsers().length > pageSize && (
                    <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-5 sm:px-6 mt-4">
                      <div className="flex-1 flex items-center">
                        <p className="text-sm text-gray-700 mb-4 md:mb-0">
                            Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, getFilteredUsers().length)}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * pageSize, getFilteredUsers().length)}</span> of{' '}
                            <span className="font-medium">{getFilteredUsers().length}</span> users
                          </p>
                        </div>
                      <div className="flex-1 flex justify-center md:justify-end">
                        <nav className="flex items-center" aria-label="Pagination">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            className={`relative flex items-center justify-center px-3 py-2 rounded-l-lg border ${
                              currentPage === 1
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200'
                                : 'bg-white text-blue-600 hover:bg-blue-50 border-blue-100 hover:border-blue-200'
                            } transition-colors duration-200 ease-in-out`}
                          >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                          </motion.button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNumber;
                              if (totalPages <= 5) {
                                pageNumber = i + 1;
                              } else if (currentPage <= 3) {
                                pageNumber = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNumber = totalPages - 4 + i;
                              } else {
                                pageNumber = currentPage - 2 + i;
                              }
                              
                              if (pageNumber > totalPages) return null;
                              
                              return (
                              <motion.button
                                  key={pageNumber}
                                whileHover={currentPage !== pageNumber ? { scale: 1.05 } : {}}
                                whileTap={currentPage !== pageNumber ? { scale: 0.95 } : {}}
                                  onClick={() => handlePageChange(pageNumber)}
                                className={`relative flex items-center justify-center w-10 h-10 border ${
                                    currentPage === pageNumber
                                    ? 'z-10 bg-blue-600 text-white border-blue-600 font-medium shadow-sm'
                                    : 'text-gray-700 bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-200'
                                } mx-1 rounded-md transition-colors duration-200 ease-in-out`}
                                aria-current={currentPage === pageNumber ? 'page' : undefined}
                                >
                                  {pageNumber}
                              </motion.button>
                              );
                            })}
                            
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                            className={`relative flex items-center justify-center px-3 py-2 rounded-r-lg border ${
                              currentPage === totalPages
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200'
                                : 'bg-white text-blue-600 hover:bg-blue-50 border-blue-100 hover:border-blue-200'
                            } transition-colors duration-200 ease-in-out`}
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                              </svg>
                          </motion.button>
                          </nav>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Top Referrers list */}
            {!hierarchyLoading && hierarchyStats.topReferrers.length > 0 && (
              <div className="p-6 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Top Referrers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hierarchyStats.topReferrers.map((referrer, index) => {
                    // Define medal colors based on ranking
                    const medals = [
                      { bg: 'bg-gradient-to-r from-yellow-300 to-yellow-500', text: 'text-yellow-900', ring: 'ring-yellow-400', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                      { bg: 'bg-gradient-to-r from-gray-300 to-gray-400', text: 'text-gray-900', ring: 'ring-gray-400', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { bg: 'bg-gradient-to-r from-amber-500 to-amber-600', text: 'text-amber-900', ring: 'ring-amber-400', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
                    ];
                    
                    const medalStyle = index < 3 ? medals[index] : { 
                      bg: 'bg-gradient-to-r from-blue-200 to-blue-300', 
                      text: 'text-blue-900', 
                      ring: 'ring-blue-300',
                      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    };
                    
                    return (
                      <motion.div 
                        key={referrer.id} 
                        className="border rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow"
                        whileHover={{ y: -5 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className={`${medalStyle.bg} p-4 flex items-center justify-between text-white`}>
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full ${index < 3 ? 'ring-2' : ''} ${medalStyle.ring} flex items-center justify-center text-lg font-bold ${medalStyle.text}`}>
                        {index + 1}
                      </div>
                            <h4 className="ml-3 font-semibold text-white">{referrer.name}</h4>
                      </div>
                          <div className={`px-2 py-1 rounded-full bg-white ${medalStyle.text} text-xs font-medium`}>
                            #{index + 1} Rank
                      </div>
                    </div>
                        
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">{referrer.email}</span>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={medalStyle.icon} />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500">Total Referrals</div>
                              <div className="text-lg font-bold text-blue-600">{referrer.count}</div>
                            </div>
                            
                            <button 
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                              onClick={() => {
                                const userData = allUsers.find(u => u.id === referrer.id);
                                if (userData) {
                                  handleViewUserReferrals(userData);
                                }
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <Modal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        style={{ maxWidth: '90vw', width: '1400px' }}
      >
        <div>
          {/* Settings Form */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Referral Settings</h3>
            
            <form onSubmit={saveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="minimumPurchase" className="block text-sm font-medium text-gray-700">
                    Minimum Purchase Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{settings.currency}</span>
                    </div>
                    <input
                      type="number"
                      name="minimumPurchase"
                      id="minimumPurchase"
                      value={settings.minimumPurchase}
                      onChange={handleSettingChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="maxReferralReward" className="block text-sm font-medium text-gray-700">
                    Maximum Referral Reward
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{settings.currency}</span>
                    </div>
                    <input
                      type="number"
                      name="maxReferralReward"
                      id="maxReferralReward"
                      value={settings.maxReferralReward}
                      onChange={handleSettingChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Set to 0 for no limit</p>
                </div>

                <div>
                  <label htmlFor="maxRewardPercentage" className="block text-sm font-medium text-gray-700">
                    Referrer Reward Percentage
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="maxRewardPercentage"
                      id="maxRewardPercentage"
                      value={settings.maxRewardPercentage}
                      onChange={handleSettingChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="5"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>


                <div>
                  <label htmlFor="expirationDays" className="block text-sm font-medium text-gray-700">
                    Reward Expiration (Days)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="expirationDays"
                      id="expirationDays"
                      value={settings.expirationDays}
                      onChange={handleSettingChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="30"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={testAdminRewardsEndpoint}
                  disabled={isSaving || loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? 'Testing...' : 'Test API Connectivity'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
      
      {/* User Referrals Modal */}
      <Modal 
        isOpen={showUserReferralsModal} 
        onClose={() => setShowUserReferralsModal(false)}
        size="large"
        title={`${selectedUser?.name || 'User'}'s Referral Details`}
      >
        <div className="max-w-3xl mx-auto"> {/* This will constrain the width */}
          {/* Modal content - keep existing content structure */}
          <div className="space-y-4">
          {selectedUser ? (
            <>
                {/* User information panel */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <div className="flex items-center">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                    <FaUser className="h-8 w-8 text-blue-600" />
            </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email || 'User'}
                    </h3>
                    <p className="text-gray-600">{selectedUser.email || 'No email available'}</p>
                    <div className="mt-1 flex items-center">
                      <span className="text-sm text-gray-500 mr-4">
                        Joined: {selectedUser.createdAt ? formatDate(selectedUser.createdAt.toDate ? selectedUser.createdAt.toDate() : selectedUser.createdAt) : 'Unknown'}
                      </span>
                      {selectedUser.referralCode && (
                        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Referral Code: {selectedUser.referralCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Referred Users Section */}
            <div>
                <h4 className="text-lg font-medium mb-3">Users Referred ({userHierarchy[selectedUser.id]?.length || 0})</h4>
                
                {userHierarchy[selectedUser.id]?.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userHierarchy[selectedUser.id].map(referredUser => {
                          const referredUserName = `${referredUser.firstName || ''} ${referredUser.lastName || ''}`.trim() || referredUser.email || 'User';
                          const referralCount = userHierarchy[referredUser.id]?.length || 0;
                          
                          return (
                            <tr key={referredUser.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                    <FaUser className="h-5 w-5 text-blue-500" />
                                  </div>
            <div>
                                    <div className="text-sm font-medium text-gray-900">{referredUserName}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {referredUser.email || 'No email'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {referredUser.createdAt ? formatDate(referredUser.createdAt.toDate ? referredUser.createdAt.toDate() : referredUser.createdAt) : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {referralCount} {referralCount === 1 ? 'user' : 'users'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {referralCount > 0 ? (
                                  <button
                                    onClick={() => handleViewUserReferrals(referredUser)}
                                    className="text-blue-600 hover:text-blue-900 ml-3"
                                  >
                                    View their referrals
                                  </button>
                                ) : (
                                  <span className="text-gray-400 ml-3">No referrals</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <FaUser className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-500">No Referred Users Found</h3>
                    <p className="text-gray-400 mt-1">This user hasn't referred anyone yet.</p>
                  </div>
              )}
            </div>
            
              {/* User Rewards Section */}
              <div className="mt-8">
                <h4 className="text-lg font-medium mb-3">User Rewards</h4>
                
                {/* Available Balance Section */}
                {userDetailRewards.length > 0 && (
                  <div className="mb-4">
                    {/* Debug logging for rewards data */}
                      {/* Remove console logs */}
                      {/* <span style={{ display: 'none' }}>
                      {console.log('Current rewards data:', userDetailRewards)}
                      {console.log('Available balance:', calculateAvailableRewards(userDetailRewards))}
                      </span> */}
                  </div>
                )}
                
                {userRewardsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                ) : userDetailRewards.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Rewards Found</h3>
                      {/* Remove explanatory text in the "No Rewards Found" section */}
                      {/* <p className="text-gray-500 mb-4">This user doesn't appear to have any referral rewards yet.</p> */}
                      {/* <div className="text-sm text-left bg-gray-100 p-4 rounded-lg">
                        <p className="font-medium mb-1 text-gray-700">Possible reasons:</p>
                        <ul className="list-disc pl-5 mb-4 text-gray-600">
                        <li>They haven't referred any other users yet</li>
                        <li>Their referred users haven't made qualifying purchases</li>
                        <li>Rewards data might be stored in a different location</li>
                      </ul>
                        
                        <p className="font-medium mb-1 text-gray-700">Actions you can take:</p>
                        <ul className="list-disc pl-5 text-gray-600">
                        <li>Check the "Add New Reward" button to manually create a reward</li>
                        <li>Verify the user has made referrals in the referrals section</li>
                        <li>Ensure the user's account has been active for a sufficient period</li>
                      </ul>
                      </div> */}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="mb-3 p-3 bg-blue-50 flex justify-between items-center rounded-lg">
                                <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Available for Redemption</span>
                            <span className="text-lg font-semibold text-blue-700">
                              {`${settings.currency}${userAvailableBalance.toFixed(2)}`}
                                </span>
                          </div>
                        </div>
                      </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading user data...</p>
            </div>
          )}
          </div>
        </div>
      </Modal>
      
      {/* User Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)}
        size="xxlarge"
        title="Referral Details"
      >
            <div className="space-y-4">
          {detailReferral ? (
            <>
              {/* Top row with basic info */}
              <div className="grid grid-cols-3 gap-6 mb-4">
                {/* Referral Information */}
                <div className="bg-gray-50 rounded-lg p-4 col-span-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Referral Information</h3>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Referral Date</p>
                      <p className="font-medium">{formatDate(detailReferral.createdAt)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${detailReferral.status === 'registered' ? 'bg-yellow-100 text-yellow-800' : 
                         detailReferral.status === 'active' ? 'bg-green-100 text-green-800' : 
                         'bg-blue-100 text-blue-800'}`}
                      >
                        {detailReferral.status.charAt(0).toUpperCase() + detailReferral.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Referrer Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 col-span-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Referrer</h3>
                  
                  <div className="space-y-2">
                    <p><span className="text-gray-500">Name:</span> {detailReferral.referrerName || 'Unknown'}</p>
                    <p><span className="text-gray-500">ID:</span> {detailReferral.referrerId}</p>
                    <p><span className="text-gray-500">Code Used:</span> {detailReferral.referralCode}</p>
                  </div>
                </div>
                
                {/* Referred User Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 col-span-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Referred User</h3>
                  
                  <div className="space-y-2">
                    <p><span className="text-gray-500">Name:</span> {detailReferral.referredUserName || 'Unknown'}</p>
                    <p><span className="text-gray-500">Email:</span> {detailReferral.referredUserEmail}</p>
                    <p><span className="text-gray-500">ID:</span> {detailReferral.referredUserId}</p>
                    {detailReferral.firstPurchaseAt && (
                      <p><span className="text-gray-500">First Purchase:</span> {formatDate(detailReferral.firstPurchaseAt)}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rewards Information from Firestore and MongoDB - Full width */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    User Rewards
                    <span className="ml-2 text-[#363a94] font-semibold">
                      Available: ₱{calculateAvailableRewards(userDetailRewards).toFixed(2)}
                    </span>
                  </h3>
                  
                  {userDetailRewards.length > 0 && (
                    <button
                      onClick={() => exportRewardsToCSV(userDetailRewards, detailReferral?.referredUserName || 'user')}
                      className="px-3 py-1.5 flex items-center text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                  )}
                </div>
                
                {userRewardsLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                ) : userDetailRewards.length === 0 ? (
                  <p className="text-gray-500 italic">No rewards found for this user</p>
                ) : (
                  <>
                    {/* Add reward stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Total Rewards</p>
                        <p className="text-xl font-semibold text-blue-700">
                          {userDetailRewards.length}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Available</p>
                        <p className="text-xl font-semibold text-green-700">
                          ₱{calculateAvailableRewards(userDetailRewards).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Redeemed</p>
                        <p className="text-xl font-semibold text-purple-700">
                          ₱{userDetailRewards
                            .filter(r => r.used || r.status === 'redeemed')
                            .reduce((sum, r) => sum + (r.amount || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Add source filters */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-sm text-gray-500">Filter by source:</span>
                      {['all', 'mongodb', 'firestore', 'referral_object'].filter(source => 
                        source === 'all' || userDetailRewards.some(r => r.source === source)
                      ).map(source => (
                        <button
                          key={source}
                          onClick={() => {
                            if (source === 'all') {
                              setFilteredRewards(null);
                            } else {
                              setFilteredRewards(source);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded-full ${
                            filteredRewards === source || (source === 'all' && filteredRewards === null)
                              ? 'bg-blue-100 text-blue-800 font-medium'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {source === 'all' ? 'All Sources' : 
                           source === 'mongodb' ? 'MongoDB' : 
                           source === 'firestore' ? 'Firestore' : 
                           source === 'referral_object' ? 'Referral Object' : 
                           source}
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {userDetailRewards
                        .filter(reward => !filteredRewards || reward.source === filteredRewards)
                        .map(reward => (
                        <div key={reward.id} className={`p-4 rounded-lg shadow-sm border ${
                          reward.used || reward.status === 'redeemed' 
                            ? 'border-gray-200 bg-gray-50' 
                            : 'border-green-200 bg-green-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {reward.description || 'Referral Reward'}
                                {reward.source && (
                                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                                    {reward.source}
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1 space-y-1">
                                {reward.expiresAt && (
                                  <span className="block">
                                    Expires: {reward.expiresAt instanceof Date 
                                      ? reward.expiresAt.toLocaleDateString('en-PH', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : 'Invalid Date'}
                                  </span>
                                )}
                                
                                {reward.createdAt && (
                                  <span className="block">
                                    Created: {reward.createdAt instanceof Date 
                                      ? reward.createdAt.toLocaleDateString('en-PH', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : 'Invalid Date'}
                                  </span>
                                )}
                                
                                {reward.purchaseId && (
                                  <span className="block">
                                    Purchase: {reward.purchaseId.substring(0, 8)}...
                                  </span>
                                )}
                                
                                {reward.orderTotal && (
                                  <span className="block">
                                    Order: ₱{reward.orderTotal.toFixed(2)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-semibold ${
                                reward.used || reward.status === 'redeemed' 
                                  ? 'text-gray-400' 
                                  : 'text-[#363a94]'
                              }`}>
                                {reward.type === 'referral' || reward.type === 'signup' || reward.type === 'discount'
                                  ? `${reward.amount}%` 
                                  : `₱${reward.amount?.toFixed(2)}`}
                              </p>
                              <span className={`text-xs ${
                                reward.used || reward.status === 'redeemed' 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {reward.status === 'redeemed' || reward.used 
                                  ? 'Redeemed' 
                                  : reward.status === 'expired' || (reward.expiresAt && new Date(reward.expiresAt) < new Date())
                                    ? 'Expired'
                                    : 'Available'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading referral details...</p>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Add Reward Modal */}
      <Modal 
        isOpen={showRewardModal} 
        onClose={() => setShowRewardModal(false)}
        size="large"
        title="Add Reward"
      >
        <div>
          {selectedReferral ? (
            <>
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Referrer:</span> {selectedReferral.referrerName || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Referred User:</span> {selectedReferral.referredUserEmail}
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reward Type
                  </label>
                  <select
                    value={newReward.type}
                    onChange={(e) => setNewReward({...newReward, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="discount">Discount Percentage</option>
                    <option value="credit">Store Credit</option>
                    <option value="percentCredit">Percentage-Based Credit</option>
                    <option value="points">Loyalty Points</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newReward.type === 'discount' ? 'Discount Percentage (%)' : 
                     newReward.type === 'percentCredit' ? 'Percentage of Purchase (%)' :
                     newReward.type === 'credit' ? `Credit Amount (${settings.currency})` : 
                     'Points Amount'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={newReward.type === 'discount' || newReward.type === 'percentCredit' ? 100 : undefined}
                    value={newReward.amount}
                    onChange={(e) => setNewReward({...newReward, amount: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  {(newReward.type === 'discount' || newReward.type === 'percentCredit') && (
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a value between 0-100%
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newReward.description}
                    onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="E.g., Successful referral reward"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={addReward}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Reward
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Please select a referral first</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReferralManager; 