import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { toast as hotToast } from 'react-hot-toast';
import { EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: location?.state?.email || '',
    password: location?.state?.password || '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-full text-gray-900 text-sm focus:ring-2 focus:ring-[#363a94] focus:border-[#363a94] transition-all duration-200 shadow-sm hover:border-[#363a94]";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2 ml-2";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setError('');
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      // First, authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      // After successful authentication, check if user is active in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().isActive === false) {
        // Log out the user immediately
        await auth.signOut();
        
        // All disabled accounts should show the "pending approval" message
        await Swal.fire({
          icon: 'info',
          title: 'Account Pending Approval',
          html: `
            <div class="text-left">
              <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-blue-800">Account Status: <span class="font-bold">PENDING APPROVAL</span></h3>
                  </div>
                </div>
              </div>
              
              <p class="mb-3">Your account registration is complete but awaiting administrator approval.</p>
              
              <p class="mt-4">For assistance or to inquire about your account status:</p>
              <ul class="list-disc pl-5 mt-2 text-gray-600">
                <li>Email us at <a href="mailto:blcpcorpph@gmail.com" class="text-indigo-600 hover:underline">blcpcorpph@gmail.com</a></li>
                <li>Call our support team at +63 917 117 8146</li>
              </ul>
            </div>
          `,
          confirmButtonText: 'Contact Support',
          confirmButtonColor: '#363a94',
          showCancelButton: true,
          cancelButtonText: 'Close',
          focusCancel: true,
          customClass: {
            container: 'blcp-sweet-alert',
            popup: 'rounded-lg',
            title: 'text-xl font-semibold',
            htmlContainer: 'text-gray-600'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = 'mailto:blcpcorpph@gmail.com?subject=Account%20Approval%20Inquiry&body=Hello%20BLCP%20Support%2C%0A%0AI%20recently%20tried%20to%20log%20in%20to%20my%20account%20and%20received%20a%20message%20that%20my%20account%20is%20pending%20approval.%0A%0AMy%20email%20address%20is%3A%20' + encodeURIComponent(formData.email.trim()) + '%0A%0APlease%20provide%20assistance%20with%20accessing%20my%20account.%0A%0AThank%20you.';
          }
        });
        
        setIsLoading(false);
        return;
      }
      
      // If we get here, the user is active
      await login(formData.email.trim(), formData.password);
      toast.success('Login successful!');
      
      // Redirect to previous page or dashboard
      navigate(location?.state?.from || '/');
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-disabled' || error.message?.includes('disabled') || error.message?.includes('pending')) {
        // Always show the pending approval message for disabled accounts
        await Swal.fire({
          icon: 'info',
          title: 'Account Awaiting Approval',
          html: `
            <div class="text-left">
              <div class="p-4 mb-4 bg-indigo-50 border-l-4 border-indigo-500">
                <p class="text-indigo-700 font-medium">
                  Status: PENDING ADMINISTRATOR APPROVAL
                </p>
              </div>
              
              <p class="mb-3">Your account has been registered successfully but is awaiting administrator approval before you can access the BLCP platform.</p>
              
              <p class="text-sm bg-yellow-50 p-3 rounded">Approval typically takes 1-2 business days. You will receive an email notification once your account is approved.</p>
              
              <hr class="my-4 border-gray-200">
              
              <p class="font-medium text-gray-700">Need assistance?</p>
              <p class="text-gray-600 mt-1">Contact us at <a href="mailto:blcpcorpph@gmail.com" class="text-indigo-600 hover:underline">blcpcorpph@gmail.com</a></p>
            </div>
          `,
          confirmButtonText: 'Contact Support',
          confirmButtonColor: '#363a94',
          showCancelButton: true,
          cancelButtonText: 'OK',
          customClass: {
            container: 'blcp-sweet-alert',
            popup: 'rounded-lg shadow-xl',
            title: 'text-xl font-semibold',
            htmlContainer: 'text-gray-600'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = 'mailto:blcpcorpph@gmail.com?subject=Account%20Approval%20Inquiry&body=Hello%20BLCP%20Support%2C%0A%0AI%20am%20waiting%20for%20my%20account%20to%20be%20approved.%0A%0AMy%20email%20address%20is%3A%20' + encodeURIComponent(formData.email.trim()) + '%0A%0APlease%20let%20me%20know%20when%20I%20can%20access%20my%20account.%0A%0AThank%20you.';
          }
        });
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
      
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setErrors(prev => ({ ...prev, resetEmail: 'Please enter a valid email address' }));
      return;
    }
    
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetEmailSent(true);
      hotToast.success('Password reset email sent. Please check your inbox.');
    } catch (error) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      }
      setErrors(prev => ({ ...prev, resetEmail: errorMessage }));
      hotToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="absolute top-0 left-0 w-full h-32 bg-[#363a94] opacity-90 rounded-b-[30%] transform -skew-y-1"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl z-10 relative overflow-hidden"
      >
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#363a94] opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#363a94] opacity-10 rounded-full transform -translate-x-16 translate-y-16"></div>
        
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-[#363a94] mb-2"
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600"
          >
            Sign in to access wholesale pricing
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

        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-5">
                <label htmlFor="email" className={labelClasses}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="john.doe@example.com"
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.4 }}
            >
              <div className="mb-5">
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
            </motion.div>

            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
            >
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 text-[#363a94] border-gray-300 rounded focus:ring-[#363a94]"
              />
              <label htmlFor="remember" className="ml-2 text-gray-700 text-sm">
                Keep me signed in
              </label>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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
                    Signing In...
                  </div>
                ) : 'Sign In'}
              </Button>
              
              <motion.div 
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-[#363a94] hover:text-[#2a2e75] hover:underline transition-colors"
                >
                  Forgot your password?
                </Link>
              </motion.div>
            </motion.div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#363a94]">
                Reset Password
              </h2>
              <button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setResetEmail('');
                  setErrors({});
                }}
                className="text-gray-400 hover:text-[#363a94]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {resetEmailSent ? (
              <div className="text-center py-8">
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
                  Password reset email sent to {resetEmail}
                </div>
                <p className="text-gray-600 mb-6">
                  Please check your inbox and follow the instructions in the email.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setResetEmail('');
                  }}
                  className="px-4 py-2 bg-[#363a94] hover:bg-[#2a2e75] rounded-lg text-white transition-all"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Enter your email address below and we'll send you a link to reset your password.
                </p>
                
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="mb-5">
                    <label htmlFor="resetEmail" className={labelClasses}>
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="resetEmail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={inputClasses}
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full py-3.5 bg-[#363a94] hover:bg-[#2a2e75] rounded-xl font-semibold text-white transition-all duration-300 shadow-md hover:shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}

        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#363a94] hover:text-[#2a2e75] font-medium transition-colors">
              Sign up now
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;