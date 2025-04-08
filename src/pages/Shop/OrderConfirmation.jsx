import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const { user } = useAuth();
  const [processingReward, setProcessingReward] = useState(false);

  useEffect(() => {
    // Handle different payment statuses
    if (status === 'success') {
      // On successful payment, finalize any pending reward redemption
      finalizeRewardRedemption();
    } else if (status === 'cancelled') {
      // On cancelled payment, restore any pending rewards
      restorePendingRewards();
      localStorage.removeItem('cartItems');
    }
  }, [status, user, orderId]);

  // Function to finalize reward redemption
  const finalizeRewardRedemption = async () => {
    if (!user) return;
    
    try {
      setProcessingReward(true);
      
      // Check if there's a pending reward in localStorage
      const pendingRewardData = localStorage.getItem('pendingReward');
      
      if (pendingRewardData) {
        const pendingReward = JSON.parse(pendingRewardData);
        console.log('Finalizing reward redemption for order:', orderId);
        console.log('Pending reward details:', pendingReward);
        
        // Get order ID from URL parameters for additional context
        const orderIdFromUrl = window.location.pathname.split('/').pop();
        console.log('Order ID from URL:', orderIdFromUrl);
        
        const token = await user.getIdToken();
        
        // Actually redeem the reward now that payment is confirmed
        try {
          console.log('Calling API to finalize reward redemption with amount:', pendingReward.amount);
          const response = await api.post(
            '/rewards/redeem', 
            { 
              userId: user.uid,
              amount: pendingReward.amount,
              orderId: orderId // Link the reward redemption to this order
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (response.data.success) {
            console.log('Reward redemption SUCCESS response:', response.data);
            toast.success(`Reward of ₱${pendingReward.amount.toLocaleString()} successfully applied to your order!`);
            
            // Clear the pending reward from localStorage
            localStorage.removeItem('pendingReward');
            
            // Try to update the UI to show the applied reward
            const successMessage = document.querySelector('.text-gray-600');
            if (successMessage) {
              const rewardText = document.createElement('p');
              rewardText.className = 'text-emerald-600 font-medium mt-2';
              rewardText.textContent = `Reward of ₱${pendingReward.amount.toLocaleString()} applied`;
              successMessage.parentNode.insertBefore(rewardText, successMessage.nextSibling);
            }
          } else {
            console.error('Failed to finalize reward redemption:', response.data);
            toast.error('There was an issue applying your reward. Please contact support.');
          }
        } catch (apiError) {
          console.error('API error finalizing reward redemption:', apiError);
          console.error('Full API error details:', apiError.response?.data);
          
          // Check for specific error cases
          if (apiError.response?.data?.error === 'Insufficient rewards balance') {
            console.log('Insufficient rewards balance. Available:', apiError.response.data.available, 'Requested:', apiError.response.data.requested);
            toast.error(`Unable to apply full reward amount. Available: ₱${apiError.response.data.available}, Requested: ₱${apiError.response.data.requested}`);
          } else {
            toast.error('Error applying reward. Our team has been notified.');
          }
          
          // Still remove the pending reward from localStorage to avoid confusion
          localStorage.removeItem('pendingReward');
        }
      } else {
        console.log('No pending reward found in localStorage for order:', orderId);
      }
    } catch (error) {
      console.error('Error in finalizeRewardRedemption:', error);
      toast.error('Failed to apply your reward. Our team has been notified.');
      
      // Still clean up localStorage
      localStorage.removeItem('pendingReward');
    } finally {
      setProcessingReward(false);
    }
  };
  
  // Function to restore pending rewards if payment was cancelled
  const restorePendingRewards = async () => {
    try {
      // Check if there's a pending reward in localStorage
      const pendingRewardData = localStorage.getItem('pendingReward');
      
      if (pendingRewardData) {
        const pendingReward = JSON.parse(pendingRewardData);
        console.log('Found pending reward to restore for cancelled order:', orderId);
        console.log('Reward details:', pendingReward);
        
        // If the pending reward belongs to this user, we just need to remove it from localStorage
        // It was never actually redeemed on the backend, so it's still available
        if (pendingReward.userId === user?.uid) {
          // Remove from localStorage
          localStorage.removeItem('pendingReward');
          
          // Clear any checkout data as well
          localStorage.removeItem('checkoutData');
          
          console.log('Reward restored successfully - removed from pending state');
          toast.success('Your reward has been restored and is available for your next purchase.');
        } else {
          console.warn('Pending reward belongs to a different user:', pendingReward.userId);
        }
      } else {
        console.log('No pending rewards found to restore for order:', orderId);
      }
    } catch (error) {
      console.error('Error restoring pending rewards:', error);
      toast.error('There was an issue restoring your reward. Please contact support.');
    }
  };

  const isCancelled = status === 'cancelled';

  return (
    <motion.div
      className="min-h-screen bg-gray-100 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className={`mb-6 ${isCancelled ? 'text-red-500' : 'text-green-500'}`}>
          {isCancelled ? (
            <FaTimesCircle className="w-20 h-20 mx-auto" />
          ) : (
            <FaCheckCircle className="w-20 h-20 mx-auto" />
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {isCancelled ? 'Payment Cancelled' : 'Payment Successful!'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isCancelled 
            ? `Your order #${orderId} was not completed. No charges were made.`
            : `Thank you for your purchase. Your order #${orderId} has been confirmed.`}
        </p>

        <div className="space-y-4">
          {!isCancelled && (
            <>
              <p className="text-gray-600">
                A confirmation email has been sent to your inbox.
              </p>
              {processingReward && (
                <p className="text-emerald-600 text-sm">
                  Processing your reward...
                </p>
              )}
            </>
          )}
          {isCancelled && (
            <p className="text-gray-600">
              Any rewards you applied have been restored to your account.
            </p>
          )}
          
          <div className="pt-6">
            <Link
              to={isCancelled ? "/cart" : "/products"}
              className={`px-6 py-3 rounded-lg transition-colors ${
                isCancelled 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isCancelled ? 'Back to Cart' : 'Continue Shopping'}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderConfirmation; 