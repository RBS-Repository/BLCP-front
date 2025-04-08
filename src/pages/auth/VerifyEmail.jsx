import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  sendEmailVerification, 
  signInWithEmailAndPassword, 
  reload 
} from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const VerifyEmail = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('checking'); // 'checking', 'waiting', 'verified'
  const email = location.state?.email;
  const password = location.state?.password;
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 8; // Increased max retries to give more time
  const INITIAL_DELAY = 4000; // 3 seconds
  const [isLoading, setIsLoading] = useState(false);

  // Function to check verification status
  const checkVerification = async () => {
    if (!email || !password || retryCount >= MAX_RETRIES) return;
    
    try {
      setStatus('checking');
      // Sign in to check verification status
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await reload(userCredential.user);
      
      if (userCredential.user.emailVerified) {
        setStatus('verified');
        setVerificationSuccess(true);
        
        // Change this line - don't pass the user object directly
        // await login(userCredential.user);
        // Instead, call login with email and password
        await login(email, password);
        
        toast.success('Email verified successfully!');
        return true;
      }
      
      // Sign out if not verified
      await auth.signOut();
      setStatus('waiting');
      return false;
    } catch (error) {
      console.error('Verification check error:', error);
      
      if (error.code === 'auth/too-many-requests') {
        setError('Too many verification attempts. Please wait a few minutes.');
        return false;
      }
      
      setError('Failed to check verification status. Please try again.');
      setStatus('waiting');
      setRetryCount(prev => prev + 1);
      return false;
    }
  };

  // Function to handle resending verification email
  const handleResendEmail = async () => {
    if (!email || !password || isSending) return;

    try {
      setIsSending(true);
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await auth.signOut();
      toast.success('Verification email sent! Please check your inbox.');
      // Reset retry count when resending email
      setRetryCount(0);
    } catch (error) {
      console.error('Resend verification error:', error);
      if (error.code === 'auth/too-many-requests') {
        setError('Please wait a few minutes before requesting another email.');
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // Check verification status periodically
  useEffect(() => {
    if (!email || !password) {
      navigate('/login');
      return;
    }

    let interval;
    const checkStatus = async () => {
      const isVerified = await checkVerification();
      if (!isVerified && retryCount < MAX_RETRIES) {
        // Use exponential backoff with a maximum of 30 seconds
        const delay = Math.min(INITIAL_DELAY * Math.pow(1.5, retryCount), 30000);
        interval = setInterval(checkVerification, delay);
      } else if (retryCount >= MAX_RETRIES) {
        setError('Verification timeout. Please try resending the verification email.');
        setStatus('waiting');
      }
    };

    checkStatus();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [email, password, retryCount]);

  // Prevent navigation if not verified
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!verificationSuccess) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [verificationSuccess]);

  // Handle back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (!verificationSuccess) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        toast.error('Please verify your email before leaving this page.');
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [verificationSuccess]);

  // Add this to debug what's happening
  useEffect(() => {
    if (location.state) {
      console.log("Email type:", typeof location.state.email);
      console.log("Email value:", location.state.email);
    }
  }, [location]);

  // Make sure you're passing email as a string when calling login
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Ensure email and password are strings
      const email = location.state?.email || '';
      const password = location.state?.password || '';
      
      // Check if they are valid
      if (!email || !password) {
        throw new Error('Email or password missing. Please try logging in manually.');
      }
      
      // Log the values right before calling login
      console.log("Attempting login with:", { 
        email: typeof email === 'string' ? email : 'NOT A STRING', 
        passwordProvided: !!password 
      });
      
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center space-y-4">
            {status === 'checking' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <svg
                  className="w-16 h-16 mx-auto text-purple-400 animate-spin"
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
                <p className="text-purple-400 text-lg font-medium mt-4">
                  Checking verification status...
                </p>
              </motion.div>
            )}

            {status === 'verified' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="bg-green-500/10 rounded-full p-4 w-24 h-24 mx-auto mb-4">
                  <svg
                    className="w-16 h-16 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Email Verified Successfully!
                </h2>
                <p className="text-gray-300 mb-6">
                  Your account has been verified and is ready to use.
                </p>
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Go to Home Page
                </motion.button>
              </motion.div>
            )}

            {status === 'waiting' && (
              <div className="space-y-6">
                <svg
                  className="w-16 h-16 mx-auto text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Verify Your Email
                  </h2>
                  <p className="text-gray-300">
                    We've sent a verification link to:
                    <br />
                    <span className="font-medium text-purple-400">{email}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-purple-500/10 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    Please check your email and click the verification link.
                    This page will automatically update when verified.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={isSending || status === 'checking'}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {isSending ? 'Sending...' : 'Resend Verification Email'}
                  </button>

                  <button
                    onClick={() => navigate('/login')}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail; 