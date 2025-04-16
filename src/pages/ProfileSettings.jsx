import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateProfile } from 'firebase/auth';
import { uploadImage } from '../services/cloudinary';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from 'firebase/auth';
import { FiUser, FiLock } from 'react-icons/fi';

const DEFAULT_AVATAR = "https://static.vecteezy.com/system/resources/previews/021/548/095/non_2x/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Check for tab query parameter on initial load and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'password') {
      setActiveTab('password');
    } else {
      setActiveTab('profile');
    }
    
    // Check for success message in location state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search, location.state]);
  
  // Profile editing state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Password changing state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user data including profile image
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email
          });
          setProfileImage(userData.photoURL || user.photoURL);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, navigate]);

  // Profile editing handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: `${profileData.firstName} ${profileData.lastName}`.trim()
      });

      // Update Firestore Document
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        updatedAt: new Date().toISOString()
      });

      await user.reload();
      console.log('Profile updated successfully in both Auth and Firestore');
      setSuccessMessage('Profile updated successfully!');
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');

      // Show loading state
      setIsLoading(true);

      // Upload to Cloudinary using our service
      const imageUrl = await uploadImage(file);

      // Update profile picture URL in Auth
      await updateProfile(user, {
        photoURL: imageUrl
      });

      // Update profile picture URL in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: imageUrl,
        updatedAt: new Date().toISOString()
      });

      setProfileImage(imageUrl);
      // Show success message or toast notification
      console.log('Profile picture updated successfully');

    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload profile picture: ' + error.message);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  };

  // Password changing handlers
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        setIsLoading(false);
        return;
      }

      // Create credentials with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      // Reauthenticate user
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      // Success
      setSuccessMessage('Password changed successfully!');
      
      // Reset form data
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setError('New password should be at least 6 characters');
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profileData.firstName) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 md:pt-32 p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-1/3 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 w-1/4 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          <div className="flex items-start space-x-4 mb-8">
            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="flex flex-col justify-center space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="h-4 w-20 bg-gray-200 mb-2 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            
            <div>
              <div className="h-4 w-20 bg-gray-200 mb-2 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            
            <div>
              <div className="h-4 w-20 bg-gray-200 mb-2 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-28 md:pt-32 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
          <Link 
            to="/profile"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Profile
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => {
              setActiveTab('profile');
              navigate('/profile/settings');
            }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'profile' 
                ? 'text-[#363a94] border-b-2 border-[#363a94] bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiUser className="inline mr-2" /> Edit Profile
          </button>
          <button
            onClick={() => {
              setActiveTab('password');
              navigate('/profile/settings?tab=password');
            }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'password' 
                ? 'text-[#363a94] border-b-2 border-[#363a94] bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiLock className="inline mr-2" /> Change Password
          </button>
        </div>

        {/* Profile Edit Form */}
        {activeTab === 'profile' && (
          <div className="flex flex-col space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-start space-x-4">
              <div 
                className="relative group cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleImageClick}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                  <img
                    src={profileImage || DEFAULT_AVATAR}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm text-gray-500">
                  Click to change profile picture
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  className="w-full bg-gray-50 text-gray-800 rounded-lg p-2.5 border border-gray-200 focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  className="w-full bg-gray-50 text-gray-800 rounded-lg p-2.5 border border-gray-200 focus:ring-2 focus:ring-[#363a94] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full bg-gray-100 text-gray-600 rounded-lg p-2.5 border border-gray-200 cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium ${
                    isLoading 
                      ? 'bg-[#363a94]/70 text-white cursor-not-allowed' 
                      : 'bg-[#363a94] hover:bg-[#2a2d73] text-white transition-colors'
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <Link to="/profile">
                  <button
                    type="button"
                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* Password Change Form */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-1">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full bg-gray-50 text-gray-800 rounded-lg p-2.5 border border-gray-200 focus:ring-2 focus:ring-[#363a94]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full bg-gray-50 text-gray-800 rounded-lg p-2.5 border border-gray-200 focus:ring-2 focus:ring-[#363a94]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full bg-gray-50 text-gray-800 rounded-lg p-2.5 border border-gray-200 focus:ring-2 focus:ring-[#363a94]"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium ${
                  isLoading 
                    ? 'bg-[#363a94]/70 text-white cursor-not-allowed' 
                    : 'bg-[#363a94] hover:bg-[#2a2d73] text-white transition-colors'
                }`}
                disabled={isLoading}
              >
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </button>
              <Link to="/profile">
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings; 