import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import api from '../api/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  FaTimes, FaEye, FaBox, FaCreditCard, FaShippingFast, 
  FaCheck, FaCopy, FaEnvelope, FaWhatsapp, FaUsers, 
  FaCoins, FaHistory, FaUser, FaCalendarAlt, FaQuestionCircle, 
  FaExchangeAlt, FaHandshake, FaPiggyBank 
} from 'react-icons/fa';
import { 
  FiTrendingUp, FiLink, FiCalendar, FiArrowUpRight, 
  FiShield, FiDollarSign, FiClock, FiGift 
} from 'react-icons/fi';
import Modal from '../components/ui/Modal';

const Referrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [referredBy, setReferredBy] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [expandedReferral, setExpandedReferral] = useState(null);
  const [purchaseData, setPurchaseData] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [totalRewards, setTotalRewards] = useState(0);
  const [rewardsSaving, setRewardsSaving] = useState(false);
  const [availableRewards, setAvailableRewards] = useState(0);
  const [rewardsHistory, setRewardsHistory] = useState([]);
  const [settings, setSettings] = useState({
    minimumPurchase: 50,
    maxReferralReward: 200,
    expirationDays: 30,
    creditCalculation: 'percentage',
    maxRewardPercentage: 5,
    referredDiscount: 5,
    currency: '₱'
  });

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // Get user data from Firestore to get referral code
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setError('User profile not found');
          return;
        }

        const userData = userDoc.data();
        setReferralCode(userData.referralCode || '');
        
        // Get who referred this user if available
        if (userData.referredBy) {
          try {
            const referrerDoc = await getDoc(doc(db, 'users', userData.referredBy));
            if (referrerDoc.exists()) {
              const referrerData = referrerDoc.data();
              setReferredBy({
                id: userData.referredBy,
                name: `${referrerData.firstName || ''} ${referrerData.lastName || ''}`.trim() || 'User',
                date: userData.referredByDate || referrerData.createdAt
              });
            }
          } catch (err) {
            console.error('Error fetching referrer:', err);
          }
        }
        
        // Get referrals this user has made (includes data from both Firestore and MongoDB)
        const response = await api.get(`/referrals/by-user/${user.uid}`);
        
        // Merge data from Firestore (response.data.referrals) and MongoDB (response.data.analytics)
        const firestoreReferrals = response.data.referrals || [];
        const mongoDbReferrals = response.data.analytics || [];
        
        // Create a merged array with MongoDB as the primary source and Firestore as supplementary
        const mergedReferrals = mongoDbReferrals.map(mongoRef => {
          // Find matching Firestore record if exists
          const firestoreMatch = firestoreReferrals.find(
            fireRef => fireRef.userId === mongoRef.referredUserId
          );
          
          return {
            referredUserId: mongoRef.referredUserId,
            referredUserEmail: mongoRef.referredUserEmail,
            referredUserName: mongoRef.referredUserName || (firestoreMatch?.name || ''),
            status: mongoRef.status || 'registered',
            createdAt: mongoRef.createdAt,
            // Include any additional Firestore data
            ...firestoreMatch
          };
        });
        
        // Now fetch additional data from Firestore for each referral
        const enhancedReferrals = await Promise.all(mergedReferrals.map(async (referral) => {
          if (referral.referredUserId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', referral.referredUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  ...referral,
                  referredUserName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || referral.referredUserName || 'User',
                  joinedDate: userData.createdAt
                };
              }
            } catch (err) {
              console.error('Error fetching referred user data:', err);
            }
          }
          return referral;
        }));
        
        setReferrals(enhancedReferrals);
        
        // Automatically fetch purchases for all referred users
        enhancedReferrals.forEach(referral => {
          if (referral.referredUserId) {
            fetchReferralPurchases(referral.referredUserId, true);
          }
        });
        
        // Fetch reward history
        fetchRewardHistory();
        
      } catch (err) {
        console.error('Error fetching referral data:', err);
        setError('Failed to load referral data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Try to fetch from MongoDB first
        const response = await api.get('/settings/referrals');
        const settings = response.data;
        
        // Map MongoDB settings to frontend format
        setSettings({
          minimumPurchase: settings.minimumPurchase || 50,
          maxReferralReward: settings.maxReferralReward || 200,
          expirationDays: settings.expirationDays || 30,
          creditCalculation: settings.creditCalculation || 'percentage',
          maxRewardPercentage: settings.maxRewardPercentage || 5,
          referredDiscount: settings.referredDiscount || 5,
          currency: settings.currency || '₱'
        });
      } catch (error) {
        console.error('Error fetching referral settings:', error);
        // Set default settings if fetch fails
        setSettings({
          minimumPurchase: 50,
          maxReferralReward: 200,
          expirationDays: 30,
          creditCalculation: 'percentage',
          maxRewardPercentage: 5,
          referredDiscount: 5,
          currency: '₱'
        });
      }
    };

    fetchSettings();
  }, []);

  // Calculate rewards when purchase data changes
  useEffect(() => {
    const calculateTotalRewards = () => {
      let total = 0;
      
      // Create a set of already saved purchase IDs for faster lookup
      const savedPurchaseIds = new Set(
        rewardsHistory.map(reward => reward.purchaseId)
      );
      
      Object.keys(purchaseData).forEach(referredUserId => {
        const purchases = purchaseData[referredUserId] || [];
        
        purchases.forEach(purchase => {
          // Skip already saved rewards (those that appear in the reward history)
          if (savedPurchaseIds.has(purchase._id)) {
            return;
          }
          
          // Use calculateReferralReward instead of hardcoded 5%
          const rewardAmount = calculateReferralReward(purchase);
          total += rewardAmount;
        });
      });
      
      return total;
    };

    setTotalRewards(calculateTotalRewards());
  }, [purchaseData, rewardsHistory, settings]);

  const fetchRewardHistory = async () => {
      if (!user) return;
    
    try {
      const response = await api.get(`/rewards/history/${user.uid}`);
      if (response.data) {
        setRewardsHistory(response.data.rewards || []);
        setAvailableRewards(response.data.availableRewards || 0);
      }
    } catch (err) {
      console.error('Error fetching reward history:', err);
      toast.error('Failed to load reward history');
    }
  };

  const calculateReferralReward = (purchase) => {
    const orderAmount = Number(purchase.summary?.total || purchase.total || purchase.amount || 0);
    
    // Check if purchase meets minimum amount
    if (orderAmount < settings.minimumPurchase) {
      return 0;
    }
    
    // Calculate percentage-based reward
    let rewardAmount = (orderAmount * settings.maxRewardPercentage) / 100;
    
    // Cap at maximum reward amount if needed
    if (settings.maxReferralReward > 0 && rewardAmount > settings.maxReferralReward) {
      rewardAmount = settings.maxReferralReward;
    }
    
    return rewardAmount;
  };

  const saveRewardsToMongoDB = async () => {
    if (!user) return;
    setRewardsSaving(true);
    
    try {
      const rewardsData = {};
      
      // Format purchase data to calculate rewards for each purchase
      Object.keys(purchaseData).forEach(referredUserId => {
        const purchases = purchaseData[referredUserId] || [];
        
        purchases.forEach(purchase => {
          const rewardAmount = calculateReferralReward(purchase);
          
          if (rewardAmount > 0) {
            rewardsData[purchase._id] = {
              purchaseId: purchase._id,
              referredUserId,
              amount: rewardAmount,
              orderTotal: purchase.summary?.total || purchase.total || purchase.amount || 0,
              createdAt: new Date().toISOString(),
              purchaseDate: purchase.createdAt,
              status: 'pending'
            };
          }
        });
      });
      
      // Save to MongoDB
      const response = await api.post('/rewards/save', {
        userId: user.uid,
        rewards: Object.values(rewardsData)
      });
      
      if (response.data.success) {
        toast.success('Rewards calculated and saved successfully!');
        fetchRewardHistory(); // Refresh reward history
      } else {
        toast.error('Failed to save rewards');
      }
    } catch (err) {
      console.error('Error saving rewards:', err);
      toast.error('Failed to save rewards to database');
    } finally {
      setRewardsSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join BLCP with my referral code!');
    const body = encodeURIComponent(
      `Hi there!\n\nI thought you might be interested in BLCP - they offer premium Korean beauty products. Use my referral code ${referralCode} when signing up!\n\nJoin here: ${window.location.origin}/signup?ref=${referralCode}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Join BLCP with my referral code: ${referralCode}\n${window.location.origin}/signup?ref=${referralCode}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const fetchReferralPurchases = async (referredUserId, backgroundFetch = false) => {
    try {
      // Check if we've already fetched this data
      if (purchaseData[referredUserId]) return;

      // Only update expanded state if not a background fetch
      if (!backgroundFetch) {
        setExpandedReferral(prev => prev === referredUserId ? null : referredUserId);
      }
      
      // Get the user token for authentication
      const token = await user.getIdToken();
      
      // Fix the API URL by removing the /api prefix - the client already adds it
      const response = await api.get(`/orders/user-referred-orders/${referredUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Sort orders by date (newest first)
        const sortedOrders = response.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Update purchase data state
        setPurchaseData(prev => ({
          ...prev,
          [referredUserId]: sortedOrders
        }));
      } else {
        // Set empty array if no orders found
        setPurchaseData(prev => ({
          ...prev,
          [referredUserId]: []
        }));
      }
    } catch (err) {
      console.error('Error fetching purchase data:', err);
      // Show a more helpful error message
      toast.error("Couldn't fetch purchase data. The user may not have any orders yet.");
      setPurchaseData(prev => ({
        ...prev,
        [referredUserId]: [] // Set empty array on error
      }));
    }
  };

  const handlePurchaseToggle = (userId) => {
    if (!purchaseData[userId]) {
      fetchReferralPurchases(userId); // Regular call without background flag
    } else {
      setExpandedReferral(prev => prev === userId ? null : userId);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    let date;
    // Handle Firebase Timestamp objects
    if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle ISO string dates
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // Handle numeric timestamps
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    
    // Verify we have a valid date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'N/A';
    }
    
    // Format the date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
              
              {/* Referral Card Skeleton */}
              <div className="h-40 bg-gray-200 rounded-lg mb-8"></div>
              
              {/* Stats Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
              
              {/* Referral List Skeleton */}
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              
              {/* FAQ Skeleton */}
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-8 sm:p-10">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-900">Your Referrals</h1>
              <p className="mt-2 text-lg text-gray-600">
                Share your referral code with friends and earn rewards!
              </p>
            </div>

            {error && (
              <div className="mt-6 bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Referral Code Section */}
            <div className="mt-8">
              <motion.div 
                className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#363a94] via-[#4c4da3] to-[#5d5fb1] shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Background decorative pattern */}
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                
                <div className="relative p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center">
                        <FiGift className="mr-2" /> 
                        Your Referral Code
                      </h2>
                 
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex items-center">
                      <span className="bg-white/20 backdrop-blur-sm text-sm text-white py-1 px-3 rounded-full flex items-center">
                        <FiTrendingUp className="mr-1" />
                        {referrals.length} {referrals.length === 1 ? 'friend' : 'friends'} referred
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 mb-6">
                    <div className="flex flex-col sm:flex-row items-center">
                      <div className="w-full sm:flex-grow flex items-center justify-center sm:justify-start">
                        <span className="text-2xl md:text-3xl font-mono tracking-widest text-white font-bold">
                    {referralCode || 'No code available'}
                  </span>
                </div>
                
                      <motion.button
                  onClick={handleCopyCode}
                  disabled={!referralCode}
                        className="mt-4 sm:mt-0 flex items-center justify-center bg-white text-[#363a94] py-2 px-4 sm:ml-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                >
                  {copied ? (
                          <>
                            <FaCheck className="mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <FaCopy className="mr-2" />
                            Copy Code
                          </>
                        )}
                      </motion.button>
                    </div>
              </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-white text-sm mb-2 font-medium">Direct link:</p>
                      <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-3 overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hide flex-grow">
                          <code className="font-mono text-xs text-white/90">
                            {`${window.location.origin}/signup?ref=${referralCode}`}
                          </code>
                        </div>
                        <motion.button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
                            toast.success('Link copied to clipboard!');
                          }}
                          className="ml-2 text-white p-1 rounded-md hover:bg-white/20"
                          whileTap={{ scale: 0.9 }}
                          aria-label="Copy link"
                        >
                          <FiLink className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-white text-sm mb-2 font-medium">Share via:</p>
                <div className="flex space-x-2">
                        <motion.button
                    onClick={shareViaEmail}
                          className="flex-1 bg-white/10 backdrop-blur-sm text-white py-2 rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center justify-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FaEnvelope />
                        </motion.button>
                        <motion.button
                    onClick={shareViaWhatsApp}
                          className="flex-1 bg-white/10 backdrop-blur-sm text-white py-2 rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center justify-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                  >
                          <FaWhatsapp />
                        </motion.button>
                </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              </div>

            {/* Referral Stats Dashboard */}
            <div className="mt-8">
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {/* Total Referrals Card */}
                <motion.div 
                  className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Referrals</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-1">{referrals.length}</h3>
                 
                </div>
                    <div className="h-12 w-12 bg-[#363a94]/10 rounded-full flex items-center justify-center">
                      <FaUsers className="h-5 w-5 text-[#363a94]" />
              </div>
            </div>
                </motion.div>
                
                {/* Potential Rewards Card */}
                <motion.div
                  className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Potential Rewards</p>
                      <h3 className="text-3xl font-bold text-[#363a94] mt-1">{formatCurrency(totalRewards)}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        at {settings.maxRewardPercentage}% of referred purchases
                      </p>
                </div>
                    <div className="h-12 w-12 bg-[#363a94]/10 rounded-full flex items-center justify-center">
                      <FiTrendingUp className="h-5 w-5 text-[#363a94]" />
              </div>
            </div>
                </motion.div>
                
                {/* Available Rewards Card */}
                <motion.div
                  className="bg-white rounded-xl shadow-md p-6 border border-gray-100 relative overflow-hidden"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  {/* Circular Progress Indicator */}
                  <div className="absolute -right-6 -top-6 h-32 w-32">
                    <svg viewBox="0 0 120 120" width="120" height="120">
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth="12"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeDasharray={2 * Math.PI * 54}
                        strokeDashoffset={2 * Math.PI * 54 * (1 - (availableRewards / (availableRewards + totalRewards || 1)))}
                        transform="rotate(-90 60 60)"
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                  </svg>
                </div>
                  
                  <div className="flex items-start">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Available for Redemption</p>
                      <h3 className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(availableRewards)}</h3>
                      <div className="mt-3">
                        <Link 
                          to="/cart" 
                          className="inline-flex items-center text-sm text-green-600 font-medium hover:text-green-700"
                        >
                          Use at checkout
                          <FiArrowUpRight className="ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              </div>
              
            {/* Referral Program Settings */}
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <FiShield className="text-[#363a94] mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Referral Program Details</h2>
                  </div>
              
              <motion.div 
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    Earn rewards by referring friends. Here's how it works:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#363a94]/5 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="h-8 w-8 bg-[#363a94] rounded-full flex items-center justify-center text-white font-bold text-sm">
                          1
                  </div>
                        <h3 className="ml-3 font-medium text-gray-900">Invite Friends</h3>
                  </div>
                      <p className="text-sm text-gray-600">
                        Share your unique referral code or link with friends
                      </p>
                </div>
                    
                    <div className="bg-[#363a94]/5 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="h-8 w-8 bg-[#363a94] rounded-full flex items-center justify-center text-white font-bold text-sm">
                          2
                </div>
                        <h3 className="ml-3 font-medium text-gray-900">They Shop</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Your friends make a purchase
                      </p>
              </div>
              
                    <div className="bg-[#363a94]/5 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="h-8 w-8 bg-[#363a94] rounded-full flex items-center justify-center text-white font-bold text-sm">
                          3
                </div>
                        <h3 className="ml-3 font-medium text-gray-900">You Earn</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Get {settings.maxRewardPercentage}% of their purchase amount as rewards
                      </p>
                </div>
              </div>
              
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FaCoins className="text-[#363a94] mr-2" />
                      Current Program Settings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="mr-3 h-10 w-10 bg-[#363a94]/10 rounded-full flex items-center justify-center">
                          <span className="text-[#363a94]">₱</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reward Rate</p>
                          <p className="font-bold text-[#363a94]">{settings.maxRewardPercentage}%</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="mr-3 h-10 w-10 bg-[#363a94]/10 rounded-full flex items-center justify-center">
                          <FaHandshake className="text-[#363a94]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Min Purchase</p>
                          <p className="font-bold text-[#363a94]">{settings.currency}{settings.minimumPurchase}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="mr-3 h-10 w-10 bg-[#363a94]/10 rounded-full flex items-center justify-center">
                          <FaPiggyBank className="text-[#363a94]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Max Reward</p>
                          <p className="font-bold text-[#363a94]">{settings.currency}{settings.maxReferralReward}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center mt-4 bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                      <FiClock className="text-amber-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        Rewards expire after {settings.expirationDays} days if not redeemed
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
              </div>
              
            {/* Reward History Section */}
              {rewardsHistory.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FaHistory className="text-[#363a94] mr-2" />
                    <h2 className="text-lg font-bold text-gray-900">Reward History</h2>
                  </div>
                  <span className="text-sm text-gray-500">
                    Showing {rewardsHistory.length} {rewardsHistory.length === 1 ? 'reward' : 'rewards'}
                  </span>
                </div>
                
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rewardsHistory.map(reward => (
                          <tr 
                            key={reward._id} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              <div className="flex items-center">
                                <FiCalendar className="mr-2 text-gray-400" />
                                {formatDate(reward.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <button
                                onClick={() => {
                                  // Find associated purchase
                                  const purchaseDetails = Object.values(purchaseData)
                                    .flat()
                                    .find(p => p._id === reward.purchaseId);
                                  
                                  if (purchaseDetails) {
                                    viewOrderDetails(purchaseDetails);
                                  }
                                }}
                                className="font-mono text-[#363a94] hover:underline inline-flex items-center"
                              >
                                {reward.purchaseId ? (
                                  <>
                                    #{reward.purchaseId.substring(0, 8)}
                                    <FaEye className="ml-1 h-3 w-3" />
                                  </>
                                ) : (
                                  'N/A'
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                              {formatCurrency(reward.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                reward.status === 'redeemed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : reward.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : reward.status === 'available'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {reward.status === 'redeemed' && <FaCheck className="mr-1 h-3 w-3" />}
                                {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
                </div>
              )}

            {/* People You Referred Section */}
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <FaUsers className="text-[#363a94] mr-2" />
                <h2 className="text-lg font-bold text-gray-900">People You've Referred</h2>
              </div>
              
              {referrals.length === 0 ? (
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FaUsers className="h-10 w-10 text-gray-300" />
                </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Referrals Yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    You haven't referred anyone yet. Share your code to start earning rewards!
                  </p>
                  <motion.button
                    onClick={() => {
                      // Scroll to referral code section
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 bg-[#363a94] text-white rounded-lg font-medium hover:bg-[#2a2d73] transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaUsers className="mr-2" />
                    Start Referring Friends
                  </motion.button>
                </motion.div>
              ) : (
                <div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid gap-4 grid-cols-1"
                  >
                    {referrals.map((referral, index) => (
                      <motion.div
                        key={referral.referredUserId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${
                          expandedReferral === referral.referredUserId ? 'border-[#363a94]' : ''
                        }`}
                      >
                        <div className="p-5">
                          <div className="flex flex-wrap items-center justify-between">
                            <div className="flex items-center mb-2 md:mb-0">
                              <div className="h-10 w-10 bg-[#363a94] rounded-full flex items-center justify-center text-white font-medium">
                                {referral.referredUserName ? referral.referredUserName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">
                              {referral.referredUserName || 'User'}
                                </h3>
                                <div className="flex items-center mt-1 text-sm text-gray-500">
                                  <FiCalendar className="mr-1 h-3 w-3" />
                                  Joined {formatDate(referral.joinedDate || referral.createdAt)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                referral.status === 'purchased' 
                                  ? 'bg-[#363a94]/10 text-[#363a94]' 
                                  : referral.status === 'active' 
                                  ? 'bg-[#363a94]/10 text-[#363a94]'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {referral.status === 'purchased' 
                                  ? 'Made a purchase' 
                                  : referral.status === 'active'
                                  ? 'Active'
                                  : 'Registered'}
                              </span>
                              
                              {purchaseData[referral.referredUserId] && purchaseData[referral.referredUserId].length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                  {purchaseData[referral.referredUserId].length} order{purchaseData[referral.referredUserId].length !== 1 ? 's' : ''}
                                  </span>
                              )}
                              
                              <motion.button
                                onClick={() => handlePurchaseToggle(referral.referredUserId)}
                                className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {expandedReferral === referral.referredUserId ? (
                                  <>Hide details</>
                                ) : (
                                  <>
                                    <FaEye className="mr-1" />
                                    View purchases
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expandable Purchase Details */}
                        <AnimatePresence>
                          {expandedReferral === referral.referredUserId && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-gray-100"
                            >
                              <div className="p-5 bg-gray-50">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                  <FaBox className="mr-2 text-[#363a94]" /> 
                                  Purchase History
                                </h4>
                                  
                                  {!purchaseData[referral.referredUserId] ? (
                                  <div className="flex justify-center items-center py-6">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#363a94]"></div>
                                    </div>
                                  ) : purchaseData[referral.referredUserId].length > 0 ? (
                                  <div className="space-y-4">
                                          {purchaseData[referral.referredUserId].map(purchase => (
                                      <div 
                                        key={purchase._id}
                                        className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden"
                                      >
                                        <div className="p-4">
                                          <div className="flex flex-wrap items-center justify-between mb-2">
                                            <div className="flex items-center mb-2 md:mb-0">
                                              <div className="flex items-center">
                                                <FiCalendar className="text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-500">
                                                  {formatDate(purchase.createdAt)}
                                                </span>
                                              </div>
                                              <span className="mx-2 text-gray-300">|</span>
                                              <div className="flex items-center">
                                                <span className="text-xs text-gray-500 font-mono">
                                                  #{purchase._id.substring(0, 8)}
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                  purchase.status === 'completed' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : purchase.status === 'processing'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : purchase.status === 'shipped'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                                </span>
                                          </div>
                                          
                                          <div className="flex flex-wrap justify-between items-end">
                                            <div>
                                              <div className="text-sm text-gray-500 mb-1">
                                                {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-gray-900">
                                                  {formatCurrency(purchase.summary?.total || 0)}
                                                </span>
                                                <span className="text-sm font-medium text-green-600">
                                                  +{formatCurrency(calculateReferralReward(purchase))} reward
                                                </span>
                                              </div>
                                            </div>
                                            
                                                <button
                                                  onClick={() => viewOrderDetails(purchase)}
                                              className="flex items-center px-3 py-1.5 bg-[#363a94] text-white text-sm rounded-lg hover:bg-[#2a2d73] transition-colors"
                                                >
                                              <FaEye className="mr-1" /> View Details
                                                </button>
                                    </div>
                                    </div>
                                      </div>
                                    ))}
                                    
                                    {purchaseData[referral.referredUserId].length > 0 && (
                                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <h5 className="text-sm font-medium text-gray-900 mb-2">Reward Summary</h5>
                                        <div className="flex flex-wrap justify-between items-center">
                                          <div>
                                            <p className="text-sm text-gray-500">Total Purchase Amount</p>
                                            <p className="text-lg font-medium text-gray-900">
                                                {formatCurrency(purchaseData[referral.referredUserId].reduce((sum, purchase) => {
                                                  const orderAmount = purchase.summary?.total || purchase.total || purchase.amount || 0;
                                                  return sum + orderAmount;
                                                }, 0))}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-gray-500">Total Reward ({settings.maxRewardPercentage}%)</p>
                                            <p className="text-lg font-medium text-green-600">
                                                {formatCurrency(purchaseData[referral.referredUserId].reduce((sum, purchase) => {
                                                  return sum + calculateReferralReward(purchase);
                                                }, 0))}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-white rounded-lg border border-gray-100">
                                    <FaBox className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                                    <p className="text-gray-500">This user hasn't made any orders yet.</p>
                                    <p className="mt-2 text-sm text-gray-400">
                                      You'll see their order history here once they place an order.
                                    </p>
                                </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </div>

            {/* FAQ Section */}
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <FaQuestionCircle className="text-[#363a94] mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
              </div>
              
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {/* FAQ Item 1 */}
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <div className="mr-3 h-8 w-8 bg-[#363a94]/10 rounded-full flex items-center justify-center text-[#363a94]">
                        <FaExchangeAlt />
                      </div>
                      How do referrals work?
                    </h3>
                    <p className="mt-3 text-gray-600">
                    Share your unique referral code with friends and family. When they sign up using your code and make purchases,
                    you'll earn rewards equal to {settings.maxRewardPercentage}% of their purchase amount.
                  </p>
                </div>
                </motion.div>
                
                {/* FAQ Item 2 */}
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <div className="mr-3 h-8 w-8 bg-[#363a94]/10 rounded-full flex items-center justify-center text-[#363a94]">
                        <FaCoins />
                      </div>
                      How do the rewards work?
                    </h3>
                    <p className="mt-3 text-gray-600">
                    For every purchase your referred friends make, you earn {settings.maxRewardPercentage}% of the purchase amount as a reward.
                      When their order is marked as "paid", your reward becomes available for redemption.
                  </p>
                </div>
                </motion.div>
                
                {/* FAQ Item 3 */}
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <div className="mr-3 h-8 w-8 bg-[#363a94]/10 rounded-full flex items-center justify-center text-[#363a94]">
                        <FiDollarSign />
                      </div>
                      How do I redeem my rewards?
                    </h3>
                    <p className="mt-3 text-gray-600">
                      Available rewards are automatically applied as store credit that you can use during checkout.
                      Look for the option to apply your rewards when finalizing your purchase.
                  </p>
                </div>
                </motion.div>
                
                {/* FAQ Item 4 */}
                <motion.div 
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <div className="mr-3 h-8 w-8 bg-[#363a94]/10 rounded-full flex items-center justify-center text-[#363a94]">
                        <FaUsers />
                      </div>
                      How many people can I refer?
                    </h3>
                    <p className="mt-3 text-gray-600">
                    There's no limit to how many people you can refer. The more friends who join and make purchases using your code,
                    the more rewards you can earn!
                  </p>
                </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Order Details Modal */}
      <Modal isOpen={showOrderModal} onClose={closeOrderModal}>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <FaBox className="mr-2 text-[#363a94]" />
                Order Details
              </h3>
              <motion.button 
                onClick={closeOrderModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaTimes className="h-5 w-5" />
              </motion.button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Order ID:</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">{selectedOrder._id}</span>
              </div>
                  <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Date:</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedOrder.createdAt)}</span>
              </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`text-sm font-medium rounded-full px-2 py-0.5 ${
                  selectedOrder.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedOrder.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : selectedOrder.status === 'shipped'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>
                  <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Payment:</span>
                    <span className={`text-sm font-medium rounded-full px-2 py-0.5 ${
                  selectedOrder.payment?.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {(selectedOrder.payment?.status || 'pending').toUpperCase()}
                </span>
              </div>
            </div>
              </div>
            </div>
            
            {/* Order Progress Timeline */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <FaShippingFast className="mr-2 text-[#363a94]" />
                Order Progress
                </h4>
              
                <div className="relative">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        ['processing', 'shipped', 'delivered', 'completed'].includes(selectedOrder.status)
                          ? 'bg-[#363a94] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <FaCheck className="h-4 w-4" />
                      </div>
                    <span className="text-xs mt-2 font-medium text-gray-900">Processing</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        ['shipped', 'delivered', 'completed'].includes(selectedOrder.status)
                          ? 'bg-[#363a94] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <FaShippingFast className="h-4 w-4" />
                      </div>
                    <span className="text-xs mt-2 font-medium text-gray-900">Shipped</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        ['delivered', 'completed'].includes(selectedOrder.status)
                          ? 'bg-[#363a94] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <FaBox className="h-4 w-4" />
                      </div>
                    <span className="text-xs mt-2 font-medium text-gray-900">Delivered</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        selectedOrder.status === 'completed'
                          ? 'bg-[#363a94] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <FaCheck className="h-4 w-4" />
                      </div>
                    <span className="text-xs mt-2 font-medium text-gray-900">Completed</span>
                    </div>
                  </div>
                  
                  {/* Progress line */}
                <div className="absolute top-4 left-4 right-4 h-2 bg-gray-200 -z-10 rounded-full">
                  <div 
                    className={`h-full bg-[#363a94] rounded-full transition-all duration-500 ease-out ${
                      selectedOrder.status === 'processing' 
                        ? 'w-[10%]' 
                        : selectedOrder.status === 'shipped' 
                        ? 'w-[50%]' 
                        : selectedOrder.status === 'delivered' 
                        ? 'w-[85%]' 
                        : selectedOrder.status === 'completed' 
                        ? 'w-full' 
                        : 'w-0'
                    }`}
                  />
                    </div>
                  </div>
                </div>
            
            {/* Order Items */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <FaBox className="mr-2 text-[#363a94]" />
                Items ({selectedOrder.items.length})
              </h4>
              
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 h-14 w-14 bg-white rounded-md overflow-hidden border border-gray-200">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-gray-100">
                              <FaBox className="text-gray-400" />
              </div>
                          )}
            </div>
                        <div className="ml-4 flex-grow">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Payment Summary */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <FaCreditCard className="mr-2 text-[#363a94]" />
                Payment Summary
              </h4>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedOrder.summary?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Shipping:</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedOrder.summary?.shipping || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tax:</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedOrder.summary?.tax || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total:</span>
                    <span className="text-base font-bold text-[#363a94]">
                      {formatCurrency(selectedOrder.summary?.total || 0)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-green-600 font-medium flex justify-end items-center">
                    <FaCoins className="mr-1" />
                    Earned: {formatCurrency(calculateReferralReward(selectedOrder))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </Modal>
    </div>
  );
};

export default Referrals; 