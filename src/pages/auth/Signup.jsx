import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Modal from '../../components/common/Modal';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';

const generateReferralCode = (firstName, lastName) => {
  // Take first 2 letters of first name + first 2 letters of last name + 4 random chars
  const firstPart = (firstName?.substring(0, 2) || 'XX').toUpperCase();
  const secondPart = (lastName?.substring(0, 2) || 'XX').toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${firstPart}${secondPart}${randomPart}`;
};

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, startRegistrationMode, endRegistrationMode } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    agreeToTerms: false,
    additionalInfo: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  const [referrerName, setReferrerName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Check if referral code was provided in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('ref');
    if (code) {
      setFormData(prev => ({ ...prev, referralCode: code }));
      validateReferralCode(code);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Validate referral code when it changes
    if (name === 'referralCode' && value.length >= 8) {
      validateReferralCode(value);
    }
  };

  const validateReferralCode = async (code) => {
    // If no code is provided, just return without validation
    if (!code || code.trim() === '') {
      setReferralValid(null); // Not valid or invalid, just not provided
      setReferrerName('');
      return;
    }
    
    setIsValidatingReferral(true);
    try {
      const response = await api.get(`/referrals/validate/${code}`);
      console.log('Response received:', response.status);
      if (response.data && response.data.valid) {
        setReferralValid(true);
        setReferrerName(response.data.referrerName || 'a team member');
        // Clear error if exists
        if (errors.referralCode) {
        setErrors(prev => ({ ...prev, referralCode: '' }));
        }
      } else {
        setReferralValid(false);
        setReferrerName('');
        // Don't set an error here, let the form validation handle it when submitting
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValid(false);
      setReferrerName('');
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Additional Info validation
    if (!formData.additionalInfo.trim()) {
      newErrors.additionalInfo = 'Document links/Additional info is required';
      isValid = false;
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service and Privacy Policy';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled';
      case 'auth/weak-password':
        return 'Password is too weak';
      default:
        return 'Failed to create account. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Enable registration mode to allow temporary login for disabled accounts
      startRegistrationMode();
      
      // Create user account with Firebase Auth
      const response = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const user = response.user;
      console.log('Account created, saving user data to Firestore');
      
      // Format the name for display
      const formattedName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Generate a unique referral code for this user
      const uniqueCode = generateReferralCode(formData.firstName, formData.lastName);
      console.log("Generated referral code:", uniqueCode); // For debugging
      
      // Data to store in Firestore
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber || null,
        companyName: formData.companyName || null,
        referralCode: uniqueCode,
        referrerName: referrerName || null,
        isAdmin: false,
        isActive: false, // Set the user as inactive in Firestore
        approvalStatus: 'pending', // Add this explicitly to indicate pending approval
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        additionalInfo: formData.additionalInfo,
      };
      
      // If they signed up with a referral code, add that information
      if (formData.referralCode && referralValid) {
        userData.referredBy = referrerName;
        userData.referredByCode = formData.referralCode;
      }
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);
      
      // If they used a referral code, record it in MongoDB via the API
      if (formData.referralCode && referralValid) {
        try {
          // Get the authentication token
          const token = await user.getIdToken();
          
          // Make sure the API URL is correct
          const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/referrals/record`;
          console.log("Sending referral record to:", apiUrl); // For debugging
          
          // Record the referral in MongoDB
          const recordResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              referralCode: formData.referralCode,
              newUserId: user.uid,
              newUserEmail: formData.email,
              newUserName: formattedName
            })
          });
          
          const recordData = await recordResponse.json();
          console.log("Referral recording response:", recordData); // For debugging
          
          if (!recordResponse.ok) {
            console.error('Failed to record referral in MongoDB:', recordData);
          }
        } catch (referralError) {
          console.error('Error recording referral:', referralError);
        }
      }
      
      // Also create a referral code entry in MongoDB for this user
      try {
        const token = await user.getIdToken();
        const createCodeResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/referrals/create-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: user.uid,
            referralCode: uniqueCode,
            userName: formattedName,
            userEmail: formData.email
          })
        });
        
        if (!createCodeResponse.ok) {
          console.error('Failed to create referral code in MongoDB:', await createCodeResponse.text());
        }
      } catch (codeError) {
        console.error('Error creating referral code:', codeError);
      }
      
      setIsLoading(false);
      console.log('Showing success dialog');
      
      // Show success message - user is still logged in at this point
      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful',
        html: `
          <div class="text-left">
            <div class="flex items-center justify-center mb-4">
              <div class="rounded-full bg-green-100 p-2">
                <svg class="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            
            <h3 class="text-lg font-medium text-gray-900 mb-2">Welcome, ${formData.firstName}!</h3>
            
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700 font-medium">
                    Your account requires administrator approval
                  </p>
                  
                </div>
              </div>
            </div>
            
            <p class="text-sm text-gray-600">You will be signed out now and will receive an email notification once your account is approved.</p>
            
            <div class="mt-4 pt-3 border-t border-gray-200">
              <p class="text-sm">Need help? Contact us:</p>
              <a href="mailto:blcpcorpph@gmail.com" class="text-indigo-600 hover:underline text-sm">blcpcorpph@gmail.com</a>
            </div>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Sign Out & Return to Login',
        confirmButtonColor: '#363a94',
        allowOutsideClick: false,
      });
      
      console.log('Dialog closed, ending registration mode and signing out');
      
      // After dialog is closed:
      // 1. End registration mode first (important order)
      endRegistrationMode();
      
      // 2. Sign out the user
      await auth.signOut();
      
      // 3. Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      setError(getErrorMessage(error));
      setIsLoading(false);
      // Make sure to clean up if there's an error
      endRegistrationMode();
    }
  };

  const handleResendVerification = async () => {
    try {
      console.log('Attempting to resend verification email to:', verificationEmail);
      const response = await api.post('/auth/resend-verification', { 
        email: verificationEmail 
      });
      
      console.log('Resend response:', response.data);
      
      if (response.data.success) {
        setMessage('Verification email has been resent. Please check your inbox.');
      } else {
        throw new Error(response.data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-gray-800/95 backdrop-blur-sm rounded-xl p-8 shadow-xl border border-gray-700"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
            <p className="text-gray-300 mb-6">
              We've sent a verification link to <span className="font-medium">{verificationEmail}</span>
            </p>
            {message && (
              <p className="text-sm text-gray-400 mb-4">{message}</p>
            )}
            <button
              onClick={handleResendVerification}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Resend verification email
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Update the styling for all input fields to be more modern and sleek
  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-full text-gray-900 text-sm focus:ring-2 focus:ring-[#363a94] focus:border-[#363a94] transition-all duration-200 shadow-sm hover:border-[#363a94]";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2 ml-2";

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gradient-to-br from-slate-50 to-gray-100 mt-12 sm:mt-0">
      {/* Adjust decorative elements for better mobile display */}
      <div className="absolute top-0 right-0 w-full h-24 sm:h-32 bg-[#363a94] opacity-90 rounded-bl-[40%] transform skew-y-1 z-0"></div>
      <div className="hidden sm:block absolute right-20 top-40 w-24 h-24 bg-[#363a94] opacity-10 rounded-full"></div>
      <div className="hidden sm:block absolute left-20 bottom-20 w-40 h-40 bg-[#363a94] opacity-5 rounded-full"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl p-6 sm:p-8 shadow-xl z-10 relative overflow-hidden my-8"
      >
        {/* Decorative elements inside the card */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#363a94] opacity-5 rounded-full transform -translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#363a94] opacity-5 rounded-full transform translate-x-24 translate-y-24"></div>
        
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-[#363a94] mb-2"
          >
            Create Your Account
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600"
          >
            Join our wholesale community today
          </motion.p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm"
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className={labelClasses}>
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`${inputClasses} ${errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className={labelClasses}>
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`${inputClasses} ${errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="email" className={labelClasses}>
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${inputClasses} ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="referralCode" className={labelClasses}>
              Referral Code
            </label>
            <input
              type="text"
              id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
              className={inputClasses}
              placeholder="Enter referral code (optional)"
            />
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
            <div>
              <label htmlFor="password" className={labelClasses}>
                Password <span className="text-red-500">*</span>
              </label>
            <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                  className={`${inputClasses} pr-12`}
                  placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#363a94] transition-colors"
              >
                {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                ) : (
                    <EyeIcon className="h-5 w-5" />
                )}
              </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className={labelClasses}>
                Confirm Password <span className="text-red-500">*</span>
              </label>
            <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                  className={`${inputClasses} pr-12`}
                  placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#363a94] transition-colors"
              >
                {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                ) : (
                    <EyeIcon className="h-5 w-5" />
                )}
              </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="additionalInfo" className={labelClasses}>
              Document Links/Additional Info <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 text-sm focus:ring-2 focus:ring-[#363a94] focus:border-[#363a94] transition-all duration-200 shadow-sm hover:border-[#363a94]"
              placeholder="To help us approve your account, please share any relevant business documents or additional information. This will ensure a smooth approval process."
              rows="3"
            ></textarea>
          </div>

          <motion.div 
            className="flex items-center mb-5 p-4 bg-white border border-gray-200 rounded-xl shadow-sm" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <input
              type="checkbox"
              id="terms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 text-[#363a94] focus:ring-[#363a94] border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
              I agree to the{' '}
              <Link to="/terms" className="text-[#363a94] hover:text-[#2a2e75] underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-[#363a94] hover:text-[#2a2e75] underline">
                Privacy Policy
              </Link>
            </label>
          </motion.div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600 mb-5">{errors.agreeToTerms}</p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-2"
          >
            <Button
              type="submit"
              className="w-full py-3.5 bg-[#363a94] hover:bg-[#2a2e75] rounded-xl font-semibold text-white transition-all duration-300 shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </div>
              ) : 'Create Account'}
            </Button>
          </motion.div>
        </form>

        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-[#363a94] hover:text-[#2a2e75] font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup; 