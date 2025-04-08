import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { toast } from 'react-toastify';
import api from '../api/client';
import { FiEdit2, FiKey, FiUsers, FiTrash2, FiCopy, FiMail, FiShare2, FiCalendar, FiUser, FiLock } from 'react-icons/fi';
import { HiOutlineBadgeCheck } from 'react-icons/hi';
import BackToTop from '../components/common/BackToTop';

const DEFAULT_AVATAR = "https://static.vecteezy.com/system/resources/previews/021/548/095/non_2x/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    createdAt: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const formatMemberDate = (dateValue) => {
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
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          navigate('/login');
          return;
        }

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const firestoreData = userDoc.data();
          setUserData({
            firstName: firestoreData.firstName,
            lastName: firestoreData.lastName,
            email: firestoreData.email,
            createdAt: firestoreData.createdAt,
            profileImage: user.photoURL
          });

          // If referral code exists in Firestore, use it
          if (firestoreData.referralCode) {
            setReferralCode(firestoreData.referralCode);
          } else {
            // Otherwise fetch from MongoDB
            try {
              const response = await api.get(`/users/${user.uid}/referral-code`);
              if (response.data && response.data.referralCode) {
                setReferralCode(response.data.referralCode);
              }
            } catch (apiError) {
              console.error('Failed to fetch referral code:', apiError);
            }
          }
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to fetch user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError('');

      if (!password) {
        throw new Error('Please enter your password to confirm deletion');
      }

      // Reauthenticate
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // First delete Firestore document
      await deleteDoc(doc(db, 'users', user.uid));

      // Then delete auth user
      await deleteUser(user);

      // Logout and redirect
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Delete error:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to delete this account');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Session expired. Please log in again before deleting.');
      } else {
        setError(error.message || 'Failed to delete account');
      }
    } finally {
      setIsDeleting(false);
      setPassword('');
    }
  };

  // Add function to copy referral code to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode)
      .then(() => {
        setCopySuccess('Copied!');
        toast.success('Referral code copied to clipboard!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy referral code');
      });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 md:pt-32 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 animate-pulse">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="rounded-full bg-gray-200 h-32 w-32"></div>
              <div className="flex-1">
                <div className="h-8 bg-gray-200 w-3/4 mb-4 rounded-lg"></div>
                <div className="h-4 bg-gray-200 w-1/2 mb-6 rounded-lg"></div>
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 w-32 rounded-lg"></div>
                  <div className="h-10 bg-gray-200 w-32 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 w-1/3 mb-6 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded-lg"></div>
              <div className="h-24 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the profile tab content
  const renderProfileTab = () => {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <FiUser className="mr-2 text-[#363a94]" />
          Account Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-sm text-gray-500 font-medium">First Name</span>
            <p className="text-gray-800 border-b border-gray-100 pb-2">{userData.firstName}</p>
          </div>
          
          <div className="space-y-1">
            <span className="text-sm text-gray-500 font-medium">Last Name</span>
            <p className="text-gray-800 border-b border-gray-100 pb-2">{userData.lastName}</p>
          </div>
          
          <div className="space-y-1">
            <span className="text-sm text-gray-500 font-medium">Email Address</span>
            <p className="text-gray-800 border-b border-gray-100 pb-2">{userData.email}</p>
          </div>
          
          <div className="space-y-1">
            <span className="text-sm text-gray-500 font-medium">Member Since</span>
            <p className="text-[#363a94] text-sm flex items-center justify-center md:justify-start gap-1 mt-1">
              <FiCalendar className="opacity-70" />
              Member since {formatMemberDate(userData.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex flex-wrap gap-3">
          <Link 
            to="/profile/edit" 
            className="inline-flex items-center px-4 py-2 bg-[#363a94] text-white rounded-lg hover:bg-[#2a2d73] transition-colors"
          >
            <FiEdit2 className="mr-2" />
            Edit Profile
          </Link>
          
          <Link 
            to="/order-history" 
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 8H19M5 12H15M5 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            View Orders
          </Link>
          
          <Link 
            to="/wishlist" 
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.45 13.9L12 21.45L19.55 13.9C21.45 12 21.45 8.95 19.55 7.05C17.65 5.15 14.6 5.15 12.7 7.05L12 7.75L11.3 7.05C9.4 5.15 6.35 5.15 4.45 7.05C2.55 8.95 2.55 12 4.45 13.9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Wishlist
          </Link>
          
          <Link 
            to="/referrals" 
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiUsers className="mr-2" />
            View My Referrals
          </Link>
        </div>
      </div>
    );
  };

  // Render the referrals tab content
  const renderReferralsTab = () => {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FiUsers className="mr-2 text-[#363a94]" />
          Your Referral Program
        </h2>
        
        <div className="bg-gradient-to-r from-[#363a94]/5 to-[#2a2d73]/5 rounded-xl p-6 border border-[#363a94]/10 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-[#363a94]/10 rounded-full flex items-center justify-center">
              <HiOutlineBadgeCheck className="w-8 h-8 text-[#363a94]" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Your Unique Referral Code</h3>
              <p className="text-gray-600 mb-4">Share this code with friends to earn rewards</p>
              
              <div className="flex items-center gap-2">
                <div className="bg-[#363a94]/10 text-[#363a94] py-2 px-4 rounded-lg font-mono font-medium text-lg">
                  {referralCode || 'Loading...'}
                </div>
                
                <button
                  onClick={copyToClipboard}
                  className="bg-[#363a94] text-white p-2 rounded-lg hover:bg-[#2a2d73] transition-colors"
                  title="Copy to clipboard"
                >
                  <FiCopy size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How It Works</h3>
            <p className="text-gray-600">Earn rewards every time someone signs up using your referral code!</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <div className="text-center p-4">
              <div className="bg-[#363a94]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold text-[#363a94]">1</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Share Your Code</h4>
              <p className="text-sm text-gray-600">Invite friends using your unique referral code</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-[#363a94]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold text-[#363a94]">2</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Friend Makes a Purchase</h4>
              <p className="text-sm text-gray-600">Your friend places their first order</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-[#363a94]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-bold text-[#363a94]">3</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">You get percentage rewards</h4>
              <p className="text-sm text-gray-600">You receive Percentage Rewards!</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={() => {
              const text = `Join BLCP with my referral code: ${referralCode}. Get premium Korean beauty products today!`;
              navigator.clipboard.writeText(text);
              toast.success('Referral message copied!');
            }}
            className="flex-1 bg-[#363a94] text-white py-3 px-4 rounded-lg hover:bg-[#2a2d73] transition-colors flex justify-center items-center gap-2"
          >
            <FiCopy className="w-5 h-5" />
            Copy Invite Text
          </button>
          
          <a
            href={`mailto:?subject=Join%20BLCP&body=Use%20my%20referral%20code%20${referralCode}%20to%20join%20BLCP%20and%20get%20premium%20Korean%20beauty%20products!`}
            className="flex-1 bg-white text-[#363a94] border border-[#363a94] py-3 px-4 rounded-lg hover:bg-[#2a2d73] flex justify-center items-center gap-2"
          >
            <FiMail className="w-5 h-5" />
            Share via Email
          </a>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join BLCP',
                  text: `Use my referral code ${referralCode} to join BLCP and get premium Korean beauty products!`,
                  url: window.location.origin,
                })
                .catch(err => console.error('Share failed:', err));
              } else {
                toast.info('Sharing not supported on this browser');
              }
            }}
            className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors flex justify-center items-center gap-2"
          >
            <FiShare2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>
    );
  };

  // Render the security tab content
  const renderSecurityTab = () => {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <FiLock className="mr-2 text-[#363a94]" />
          Security Settings
        </h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">Password</h3>
                <p className="text-gray-600 text-sm">Update your password regularly to keep your account secure</p>
              </div>
              
              <Link 
                to="/change-password" 
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors md:self-start"
              >
                <FiKey className="mr-2" />
                Change Password
              </Link>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-xl p-5 border border-red-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-red-800 mb-1">Delete Account</h3>
                <p className="text-red-700 text-sm">Permanently delete your account and all associated data</p>
              </div>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors md:self-start"
              >
                <FiTrash2 className="mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative mb-20">
      <div className="bg-gray-50 pt-28 md:pt-32 p-4 sm:p-6 lg:p-8 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Profile Header with enhanced design */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            {/* Replace the simple gradient with a more interesting background design */}
            <div className="relative h-32 md:h-48">
              {/* Main background with multiple gradient stops */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#363a94] via-[#4347a6] to-[#2a2d73]"></div>
              
              {/* Add subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              ></div>
              
              {/* Add gradient radial highlight */}
              <div className="absolute right-1/4 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform -translate-y-24"></div>
              
              {/* Add gentle wave shape at bottom */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-12 text-white fill-current">
                  <path fillOpacity="0.15" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
              </div>
              
              {/* Bottom gradient shadow overlay */}
              <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/30 to-transparent"></div>
              
              {/* Add subtle floating particles (decoration) */}
              <div className="absolute top-8 left-1/3 w-3 h-3 rounded-full bg-white opacity-20"></div>
              <div className="absolute top-16 left-1/5 w-2 h-2 rounded-full bg-white opacity-30"></div>
              <div className="absolute top-12 right-1/4 w-4 h-4 rounded-full bg-white opacity-10"></div>
            </div>
            
            <div className="p-6 md:p-8 -mt-16 relative">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Profile Picture */}
                <div className="relative hover:scale-105 transition-transform duration-200">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                    <img
                      src={userData.profileImage || DEFAULT_AVATAR}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                  <Link 
                    to="/profile/edit" 
                    className="absolute bottom-0 right-0 bg-[#363a94] text-white p-2 rounded-full shadow-lg hover:bg-[#2a2d73] transition-colors"
                    title="Edit Profile"
                  >
                    <FiEdit2 size={16} />
                  </Link>
                </div>
                
                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left mt-4 md:mt-16">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                    {userData.firstName} {userData.lastName}
                  </h1>
                  <p className="text-gray-600 flex items-center justify-center md:justify-start gap-1">
                    <FiMail className="opacity-70" />
                    {userData.email}
                  </p>
                  <p className="text-[#363a94] text-sm flex items-center justify-center md:justify-start gap-1 mt-1">
                    <FiCalendar className="opacity-70" />
                    Member since {formatMemberDate(userData.createdAt)}
                  </p>
                </div>
              </div>
              
              {/* Profile Navigation Tabs */}
              <div className="mt-8 border-b border-gray-200">
                <div className="flex overflow-x-auto scrollbar-hide gap-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                      activeTab === 'profile' 
                        ? 'text-[#363a94] border-b-2 border-[#363a94] bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('referrals')}
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                      activeTab === 'referrals' 
                        ? 'text-[#363a94] border-b-2 border-[#363a94] bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Referrals
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                      activeTab === 'security' 
                        ? 'text-[#363a94] border-b-2 border-[#363a94] bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Security
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'referrals' && renderReferralsTab()}
            {activeTab === 'security' && renderSecurityTab()}
          </div>
        </div>
        
        {/* Back to top button */}
        <BackToTop threshold={300} right={4} bottom={4} />
      </div>
      
      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ backdropFilter: 'blur(3px)' }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-600 w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Delete Account</h2>
              <p className="text-gray-600 text-center mb-6">This action cannot be undone. Are you sure you want to permanently delete your account?</p>
              
              <div className="bg-red-50 p-4 rounded-lg mb-6 border border-red-200">
                <p className="text-red-800 font-medium">Warning</p>
                <p className="text-red-700 mt-1 text-sm">All your data including profile information, order history, and account preferences will be permanently deleted.</p>
              </div>
              
              <p className="text-gray-800 mb-2 font-medium">Enter your password to confirm:</p>
              
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
              
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !password}
                  className={`px-4 py-2 ${
                    !password ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  } text-white rounded-lg transition-colors`}
                >
                  {isDeleting ? (
                    <span className="flex items-center">
                      <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 