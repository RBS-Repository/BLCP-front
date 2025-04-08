import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { MdEmail, MdClose } from 'react-icons/md';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../config/firebase';

const EmailVerificationBar = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Temporary test element that always shows
  if (process.env.NODE_ENV === 'development') {
    console.log('Rendering test verification bar');
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0, 
        right: 0,
        backgroundColor: 'red',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        zIndex: 9999
      }}>
        TEST VERIFICATION BAR
      </div>
    );
  }

  // Add debugging logs
  useEffect(() => {
    console.log('EmailVerificationBar rendered');
    console.log('User:', user);
    console.log('Is verified:', user?.emailVerified);
  }, [user]);

  // Reset state when user changes or verification status changes
  useEffect(() => {
    if (user) {
      setDismissed(false);
      setEmailSent(false);
    }
  }, [user, user?.emailVerified]);

  // Only show for logged in but unverified users
  if (!user || (user.emailVerified && process.env.NODE_ENV !== 'development') || dismissed) {
    console.log('EmailVerificationBar hidden', { 
      noUser: !user, 
      isVerified: user?.emailVerified, 
      isDismissed: dismissed 
    });
    return null;
  }

  const handleSendVerification = async () => {
    setSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setEmailSent(true);
      toast.success('Verification email sent! Please check your inbox and spam folders.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-orange-500 text-white py-3 px-4 fixed top-0 left-0 right-0 z-[1000] shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MdEmail className="text-xl flex-shrink-0" />
          <span className="font-medium">
            Please verify your email address to unlock full access to products and pricing.
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {emailSent ? (
            <span className="bg-white text-orange-600 px-3 py-1 rounded-md text-sm font-medium">
              Email sent! Check your inbox
            </span>
          ) : (
            <button
              onClick={handleSendVerification}
              disabled={sending}
              className="bg-white hover:bg-orange-100 text-orange-600 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              {sending ? 'Sending...' : 'Verify Now'}
            </button>
          )}
          
          <button 
            onClick={() => setDismissed(true)}
            className="text-white hover:text-orange-200"
            aria-label="Dismiss"
          >
            <MdClose className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBar; 