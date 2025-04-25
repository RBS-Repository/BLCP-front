import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Cart.css';
import Swal from 'sweetalert2';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import api from '../../api/client';

const Cart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null);
  const { cartItems: contextCartItems, updateCart } = useCart();
  const navigate = useNavigate();

  // Add state for shipping settings
  const [shippingSettings, setShippingSettings] = useState({
    standardShipping: 150,
    freeShippingThreshold: 10000
  });

  // Add these state variables
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);

  // Add these state variables inside component
  const [rewards, setRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [rewardApplied, setRewardApplied] = useState(false);
  const [rewardDiscount, setRewardDiscount] = useState(0);
  
  // Add state for quick reward modal
  const [showQuickRewardModal, setShowQuickRewardModal] = useState(false);
  const [bestReward, setBestReward] = useState(null);
  
  // Add a check for soon-to-expire rewards
  const [hasExpiringRewards, setHasExpiringRewards] = useState(false);
  
  // Determine the best reward whenever rewards change
  useEffect(() => {
    if (rewards.length > 0 && !rewardApplied) {
      // We should NOT replace the synthetic reward with an individual one
      // Only set bestReward if it doesn't already exist or isn't a synthetic combined one
      if (!bestReward || bestReward._id !== 'total-available') {
        // Find the reward with highest value
        const best = rewards.reduce((best, current) => 
          current.amount > best.amount ? current : best, rewards[0]);
        setBestReward(best);
      }
    }
    // Don't reset bestReward to null here - we might have a synthetic one
  }, [rewards, rewardApplied, bestReward]);
  
  // Check for soon-to-expire rewards (within 7 days)
  useEffect(() => {
    if (bestReward) {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(now.getDate() + 7);
      
      const expiryDate = new Date(bestReward.expiresAt);
      setHasExpiringRewards(expiryDate <= sevenDaysFromNow);
    } else {
      setHasExpiringRewards(false);
    }
  }, [bestReward]);
  
  // Function to handle quick reward application
  const applyBestReward = async () => {
    if (!bestReward || rewardApplied) return;
    
    try {
      setLoading(true);
      await redeemReward(bestReward._id);
      setShowQuickRewardModal(false);
      
      // Show a success message with animation
      Swal.fire({
        title: 'Reward Applied!',
        text: `₱${bestReward.amount.toLocaleString()} has been deducted from your total.`,
        icon: 'success',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Great!',
        showClass: {
          popup: 'animate__animated animate__fadeInUp animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutDown animate__faster'
        }
      });
    } catch (error) {
      toast.error('Failed to apply reward');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to open quick reward modal with debug logging
  const openQuickRewardModal = () => {
    if (bestReward && bestReward._id === 'total-available' && !rewardApplied) {
      setShowQuickRewardModal(true);
    } else if (bestReward && !rewardApplied) {
      setShowQuickRewardModal(true);
    } else if (rewardApplied) {
      toast.success(`Reward of ₱${rewardDiscount.toLocaleString()} already applied!`);
    } else {
      setShowRewardsModal(true);
    }
  };

  // Fetch cart data from backend
  useEffect(() => {
    const fetchCart = async () => {
      try {
        if (!user) return;
         
        const response = await api.get('/cart');
         
        const data = response.data;
        // Handle both response formats: array or object with products property
        const products = Array.isArray(data) ? data : (data?.products || []);
        
        setCartItems(products);
        updateCart(products);
      } catch (err) {
        setError(err.message?.toString() || 'Failed to fetch cart');
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const checkStock = useCallback(async (items) => {
    try {
      const response = await api.post('/products/check-stock', items, {
        headers: {
          'Cache-Control': 'no-cache' // Explicitly disable caching
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    // Check stock when cart loads
    const checkStock = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/products/check-stock`,
          {
            items: cartItems.map(item => ({
              productId: item.product?._id,
              quantity: item.quantity
            }))
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        updateCart(cartItems.map(item => ({
          ...item,
          outOfStock: response.data.some(s => 
            s.productId === item.product?._id && s.available < item.quantity
          )
        })));
      } catch (error) {
        // Error silently - will retry on next check
      }
    };
    
    if (cartItems.length > 0) checkStock();
  }, [cartItems]);

  // Fetch shipping settings from backend
  useEffect(() => {
    const fetchShippingSettings = async () => {
      try {
        if (!user) return;
        
        const token = await user.getIdToken();
        const response = await api.get('/settings/shipping', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data) {
          setShippingSettings(response.data);
        }
      } catch (error) {
        // Error silently - will use default values
      }
    };
    
    fetchShippingSettings();
  }, [user]);

  // Update the useEffect for calculating totals
  useEffect(() => {
    const newSubtotal = cartItems.reduce((total, item) => {
      // Use item.price first (which contains the adjusted price for variations), 
      // then fall back to product.price if needed
      return total + (item.price || item.product?.price || 0) * (item.quantity || 0);
    }, 0);
    
    const newTax = Math.round(newSubtotal * 0.12);
    
    // Apply free shipping if subtotal meets the threshold
    const newShipping = newSubtotal >= shippingSettings.freeShippingThreshold ? 
      0 : shippingSettings.standardShipping;
    
    const newTotal = newSubtotal + newTax + newShipping;
    
    setSubtotal(newSubtotal);
    setTax(newTax);
    setShipping(newShipping);
    setTotal(newTotal);
  }, [cartItems, shippingSettings]);

  // Define a dedicated fetchRewards function for use in other functions
  const fetchRewards = async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      
      // Make the request to the rewards history endpoint
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/rewards/history/${user.uid}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Set rewards exactly as the API returns them
      if (response.data) {
        // CRITICAL: Use the exact value returned from the API for availableRewards
        // This will match what's shown in the Referrals page
        const availableRewardsAmount = response.data.availableRewards || 0;
        
        // Continue to store individual rewards for reference, but don't use their sum
        // for determining the total available amount
        const availableRewards = response.data.rewards.filter(reward => 
          reward.status === 'pending' && new Date(reward.expiresAt) > new Date()
        );
        
        // Transform the rewards to match the expected format
        const formattedRewards = availableRewards.map(reward => ({
          _id: reward._id,
          amount: reward.amount,
          expiresAt: reward.expiresAt,
          referredUser: reward.description ? reward.description.split(' ').pop() : 'Purchase'
        }));
        
        // Calculate sum of individual rewards for debugging
        const individualRewardsSum = formattedRewards.reduce((sum, reward) => sum + reward.amount, 0);
        
        // Store original rewards in state for reference
        setRewards(formattedRewards); 
        
        // IMPORTANT: Always use the total availableRewardsAmount from the API directly
        // This ensures we display the same amount as the Referrals page
        if (availableRewardsAmount > 0) {
          // Find the furthest expiry date from individual rewards
          const latestExpiryDate = formattedRewards.length > 0 
            ? new Date(Math.max(...formattedRewards.map(r => new Date(r.expiresAt).getTime())))
            : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months by default
          
          // Create synthetic reward with the TOTAL available amount
          const syntheticTotalReward = {
            _id: 'total-available', // Special ID to identify this as the synthetic total
            amount: availableRewardsAmount, // Use exact API value here
            individualRewardsSum: individualRewardsSum, // Store for display purposes
            expiresAt: latestExpiryDate,
            referredUser: 'Combined Rewards',
            isSynthetic: true, // Flag to identify this as a synthetic total 
            // Store the individual reward IDs for reference when redeeming
            individualRewards: formattedRewards.map(r => r._id)
          };
          
          // Set this as the best reward - it should not be overridden by individual rewards
          setBestReward(syntheticTotalReward);
        } else {
          setBestReward(null);
        }
      } else {
        console.error('Error in rewards response format:', response.data);
        setRewards([]);
        setBestReward(null);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setRewards([]);
      setBestReward(null);
    }
  };

  // Update the rewards fetching effect to use our dedicated function
  useEffect(() => {
    fetchRewards();
    
    // Check if there's a pending reward that needs to be restored
    // This happens if the user abandoned checkout or there was an error
    restorePendingRewards();
  }, [user]);

  const updateQuantity = async (productId, newQuantity, variationSku = null) => {
    // Don't attempt updates if productId is missing
    if (!productId) {
      toast.error('Cannot update quantity for unavailable product');
      return;
    }
    
    try {
      // Set only the specific item to updating state, not the entire cart
      setUpdatingItem(productId);
      
      // Find the item first to check its current state
      const findItem = (id) => {
        if (variationSku) {
          return item => {
            return item.product?._id === id && item.variationSku === variationSku;
          };
        }
        return item => {
          return item.product?._id === id;
        };
      };
      
      const existingItem = cartItems.find(findItem(productId));
      
      if (!existingItem || !existingItem.product) {
        toast.error('This product is no longer available');
        setUpdatingItem(null);
        return;
      }
      
      // Validate against minimum order
      const minOrder = existingItem.product.minOrder;
      const validatedQuantity = Math.max(newQuantity, minOrder);

      const token = await user.getIdToken();
      const url = `${import.meta.env.VITE_API_BASE_URL}/cart/${productId}`;
      
      // Add variation parameters if needed
      const payload = { quantity: validatedQuantity };
      if (variationSku) {
        payload.variationSku = variationSku;
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update quantity');
      }

      // Preserve product data while updating quantity
      setCartItems(prev => prev.map(item => {
        if (variationSku) {
          return (item.product?._id === productId && item.variationSku === variationSku) 
            ? responseData.products.find(p => p.product._id === productId && p.variationSku === variationSku) 
            : item;
        } 
        return item.product?._id === productId 
          ? responseData.products.find(p => p.product._id === productId) 
          : item;
      }));
      
      // Update global cart context
      updateCart(responseData.products);
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      // Clear the updating state for this item
      setUpdatingItem(null);
    }
  };

  const removeItem = async (productId, variationSku = null) => {
    // Allow removing items even if productId is null, using the fallback or original ID
    if (!productId) {
      // For items with deleted products, we might need to identify them another way
      // Let's attempt to use the item's internal ID or index
      const itemToRemove = cartItems.find(item => 
        (!item.product && item.variationSku === variationSku) ||
        (!item.product && !variationSku)
      );
      
      if (itemToRemove) {
        productId = itemToRemove._id || 'deleted-product';
      } else {
        toast.error('Cannot identify item to remove');
        return;
      }
    }
    
    try {
      // Use updatingItem instead of setLoading for the specific item
      setUpdatingItem(productId);
      
      const token = await user.getIdToken();
      let url = `${import.meta.env.VITE_API_BASE_URL}/cart/${productId}`;
      
      // Add variation SKU as query parameter if provided
      if (variationSku) {
        url += `?variationSku=${variationSku}`;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      const updatedCart = await response.json();
      
      // Update cart items based on variation
      if (variationSku) {
        setCartItems(prev => prev.filter(item => 
          !(item.product?._id === productId && item.variationSku === variationSku)
        ));
        
        // Update global cart context
        updateCart(prev => prev.filter(item => 
          !(item.product?._id === productId && item.variationSku === variationSku)
        ));
      } else {
        setCartItems(prev => prev.filter(item => item.product?._id !== productId));
        
        // Update global cart context
        updateCart(prev => prev.filter(item => item.product?._id !== productId));
      }

      await Swal.fire({
        title: 'Removed from Cart',
        text: 'The item has been removed from your cart.',
        icon: 'success',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#000000',
        iconColor: '#4ade80',
        customClass: {
          popup: 'rounded-lg'
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    } finally {
      // Clear the updating state
      setUpdatingItem(null);
    }
  };

  // Update the handleCheckout function to be more robust about stock checks
  const handleCheckout = async () => {
    try {
      // First check - see if any items are flagged as out of stock
      const outOfStockItems = cartItems.filter(item => item.outOfStock);
      
      if (outOfStockItems.length > 0) {
        // Create a list of out of stock items to show to the user
        const itemsList = outOfStockItems.map(item => 
          `<li class="text-left">${item.product?.name} - Requested: ${item.quantity}, Available: ${item.product?.stock || 0}</li>`
        ).join('');
        
        Swal.fire({
          title: 'Items Out of Stock',
          html: `
            <div class="text-left">
              <p class="mb-2">The following items in your cart are out of stock or have insufficient quantity:</p>
              <ul class="mb-4 text-sm list-disc pl-5">
                ${itemsList}
              </ul>
              <p>Please remove these items or adjust quantities to proceed with checkout.</p>
            </div>
          `,
          icon: 'warning',
          confirmButtonColor: '#363a94',
          confirmButtonText: 'I Understand'
        });
        return;
      }
      
      // Double-check with server for latest stock information
      try {
        const stockCheckResponse = await api.post('/products/check-stock', {
          items: cartItems.map(item => ({
            productId: item.product?._id,
            quantity: item.quantity
          }))
        }, {
          headers: {
            'Cache-Control': 'no-cache' // Force fresh stock check
          }
        });
        
        // Check if any items are now out of stock based on latest data
        const newOutOfStockItems = stockCheckResponse.data.filter(item => 
          item.available < cartItems.find(cartItem => 
            cartItem.product?._id === item.productId
          )?.quantity
        );
        
        if (newOutOfStockItems.length > 0) {
          // Update cart with latest stock information
          updateCart(cartItems.map(item => ({
            ...item,
            outOfStock: newOutOfStockItems.some(s => s.productId === item.product?._id)
          })));
          
          Swal.fire({
            title: 'Stock Changed',
            text: 'Some items in your cart are no longer available in the requested quantity. Please review your cart.',
            icon: 'warning',
            confirmButtonColor: '#363a94',
            confirmButtonText: 'Review Cart'
          });
          return;
        }
      } catch (error) {
        console.error('Final stock check failed:', error);
        // Continue with checkout but log the error
      }

      // Rest of checkout function remains the same
      // Get pending reward data if it exists
      const pendingRewardData = localStorage.getItem('pendingReward');
      const pendingReward = pendingRewardData ? JSON.parse(pendingRewardData) : null;

      // Convert cart data to checkout format with reward info
      const checkoutData = {
        items: cartItems,
        summary: {
          subtotal,
          tax,
          shipping,
          total,
          rewardDiscount: rewardApplied ? rewardDiscount : 0
        }
      };

      // Add reward info if applied
      if (rewardApplied && selectedReward) {
        checkoutData.reward = {
          id: selectedReward._id,
          amount: rewardDiscount,
          isSynthetic: true,
          status: 'pending_confirmation',
          appliedAt: pendingReward ? pendingReward.appliedAt : new Date().toISOString()
        };
      }

      // Store in localStorage for checkout
      localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
      
      // Navigate to checkout
      navigate('/checkout');
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Failed to proceed to checkout. Please try again.');
      
      // If checkout fails, restore any pending rewards
      restorePendingRewards();
    }
  };

  // Add a function to restore pending rewards if checkout fails or is abandoned
  const restorePendingRewards = () => {
    try {
      // Check if there's a pending reward in localStorage
      const pendingRewardData = localStorage.getItem('pendingReward');
      
      if (pendingRewardData) {
        const pendingReward = JSON.parse(pendingRewardData);
        
        // If the pending reward belongs to this user, restore it
        if (pendingReward.userId === user.uid) {
          // Refetch rewards to ensure we have the latest state
          fetchRewards();
          
          // Reset the applied state
          setRewardApplied(false);
          setRewardDiscount(0);
          setSelectedReward(null);
          
          // Remove from localStorage
          localStorage.removeItem('pendingReward');
          
          // Update totals without the reward discount
          calculateTotals(false, 0);
          
          toast.success('Your reward has been restored and is available for use again.');
        }
      }
    } catch (error) {
      console.error('Error restoring pending rewards:', error);
    }
  };
  
  // Update redemption function to handle synthetic total rewards
  const redeemReward = async (rewardId) => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // Always use the total available amount
      const isSyntheticReward = true; // We're always using a synthetic combined reward now
      
      // Instead of immediately redeeming at the backend, we'll mark this as pending
      // and only confirm the redemption after successful checkout
      
      // Store the reward information in component state
      setRewardDiscount(bestReward ? bestReward.amount : 0);
      setRewardApplied(true);
      setSelectedReward(bestReward);
      
      // Update the total with the reward applied
      calculateTotals(true, bestReward ? bestReward.amount : 0);
      
      // Store the reward information in localStorage for checkout
      // This includes keeping track of the reward state for recovery in case checkout fails
      const pendingRewardData = {
        rewardId: rewardId,
        amount: bestReward ? bestReward.amount : 0,
        isSynthetic: isSyntheticReward,
        userId: user.uid,
        appliedAt: new Date().toISOString()
      };
      
      localStorage.setItem('pendingReward', JSON.stringify(pendingRewardData));
      
      // Visually remove the reward from the available rewards list
      // For the combined reward, we clear all rewards
      setRewards([]);
      
      toast.success(`Reward of ₱${bestReward ? bestReward.amount.toLocaleString() : '0'} applied! It will be finalized at checkout.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply reward');
    } finally {
      setLoading(false);
      setShowRewardsModal(false);
    }
  };

  // First, ensure the calculateTotals function properly handles reward discounts
  const calculateTotals = (includeReward = rewardApplied, rewardAmount = rewardDiscount) => {
    const itemsSubtotal = cartItems.reduce((total, item) => 
      total + ((item.price || item.product?.price || 0) * item.quantity), 0);
    
    setSubtotal(itemsSubtotal);
    
    const calculatedTax = Math.round(itemsSubtotal * 0.12);
    setTax(calculatedTax);
    
    // Calculate shipping
    let shippingCost = itemsSubtotal >= shippingSettings.freeShippingThreshold 
      ? 0 
      : shippingSettings.standardShipping;
    setShipping(shippingCost);
    
    // Apply reward discount if active
    const discount = includeReward ? rewardAmount : 0;
    setRewardDiscount(discount);
    
    // Calculate final total
    const finalTotal = Math.max(0, itemsSubtotal + calculatedTax + shippingCost - discount);
    setTotal(finalTotal);
  };

  // Make sure useEffect calls calculateTotals when cartItems or reward status changes
  useEffect(() => {
    calculateTotals(rewardApplied, rewardDiscount);
  }, [cartItems, rewardApplied, rewardDiscount, shippingSettings]);

  // Update to display correct reward amount on the button
  useEffect(() => {
    // Update the button text in the DOM directly for debugging
    const rewardButton = document.querySelector('#reward-button-amount');
    if (rewardButton) {
      if (rewardApplied) {
        // If a reward is applied, show the discount amount
        rewardButton.textContent = `₱${rewardDiscount.toLocaleString()}`;
      } else if (bestReward) {
        // Show the bestReward amount (should be the synthetic total from API)
        rewardButton.textContent = `₱${bestReward.amount.toLocaleString()}`;
        
        // Remove any color classes that might make text invisible against the button
        rewardButton.className = 'font-bold'; // Just make it bold for emphasis
      } else {
        rewardButton.textContent = '₱0';
      }
    }
  }, [rewards, bestReward, rewardApplied, rewardDiscount]);

  // Ensure the RewardsModal is fully implemented for the combined reward approach
  const RewardsModal = () => {
    if (!showRewardsModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowRewardsModal(false)}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4">Available Rewards</h2>
          
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium mb-1">How Rewards Work:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Rewards are automatically generated when referred users make purchases and their orders are marked as "paid"</li>
              <li>You earn 5% of the purchase amount as a reward</li>
              <li>Apply rewards manually by clicking "Redeem" before checkout</li>
              <li><span className="font-medium text-emerald-600">Note:</span> Rewards must be manually applied - they will not be automatically added at checkout</li>
            </ul>
          </div>
          
          {!bestReward ? (
            <p className="text-gray-600 my-4">You don't have any available rewards.</p>
          ) : (
            <>
              <div className="mb-3 font-medium text-sm flex items-center">
                <svg className="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Click "Redeem" to apply your reward:
              </div>
              
              {/* Display combined total reward */}
              <div className="border rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Total Available Reward</p>
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(bestReward.expiresAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Same as shown on Referrals page
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-lg text-emerald-600">₱{bestReward.amount.toLocaleString()}</span>
                    <button
                      onClick={() => redeemReward(bestReward._id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-3 rounded text-sm mt-1"
                    >
                      Redeem All
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Show individual rewards if available */}
              {rewards.length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-sm mb-2">Individual Rewards:</p>
                  <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                    {rewards.map((reward, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm">₱{reward.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          Reward #{index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Show sum of individual rewards */}
                    {bestReward.individualRewardsSum !== undefined && (
                      <div className="flex justify-between text-xs font-medium text-gray-700 mt-2 pt-2 border-t border-gray-200">
                        <span>Sum of Individual Rewards:</span>
                        <span>₱{bestReward.individualRewardsSum.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Add explanation about the difference between totals */}
                  {bestReward.individualRewardsSum !== undefined && bestReward.amount !== bestReward.individualRewardsSum && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 font-medium">About the Different Amounts:</p>
                      <p className="text-xs text-blue-700 mt-1">
                        The difference between the Total Available (₱{bestReward.amount.toLocaleString()}) and 
                        Sum of Individual (₱{bestReward.individualRewardsSum.toLocaleString()}) 
                        is ₱{Math.abs(bestReward.amount - bestReward.individualRewardsSum).toLocaleString()}.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        This may be due to additional bonuses, partially used rewards, or system adjustments.
                        The Total Available amount (from Referrals page) is what you'll receive when redeeming.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3 bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-medium">Important:</span> Rewards must be manually applied before checkout. They will not be automatically added to your order.
                </div>
              </div>
            </>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowRewardsModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add a function to render shipping info
  const renderShippingInfo = () => {
    if (shipping === 0) {
      return (
        <div className="shipping-info free">
          <span>🎉 Free Shipping Applied!</span>
        </div>
      );
    } else if (shippingSettings.freeShippingThreshold > 0) {
      const amountNeeded = shippingSettings.freeShippingThreshold - subtotal;
      if (amountNeeded > 0) {
        return (
          <div className="shipping-info">
            <span>Add ₱{amountNeeded.toLocaleString()} more for free shipping</span>
            <div className="shipping-progress">
              <div 
                className="shipping-progress-bar" 
                style={{ width: `${(subtotal / shippingSettings.freeShippingThreshold) * 100}%` }}
              ></div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Add a function to confirm reward redemption at successful checkout
  const confirmRewardRedemption = async () => {
    try {
      // Check if there's a pending reward that needs to be confirmed
      const pendingRewardData = localStorage.getItem('pendingReward');
      
      if (pendingRewardData && rewardApplied) {
        const pendingReward = JSON.parse(pendingRewardData);
        const token = await user.getIdToken();
        
        // Now actually redeem the reward at the backend
        const response = await api.post(
          '/rewards/redeem', 
          { 
            userId: user.uid,
            amount: pendingReward.amount
          },
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          // Clear the pending reward from localStorage
          localStorage.removeItem('pendingReward');
        } else {
          // Reward will be restored on next page load
        }
      }
    } catch (error) {
      // Reward will be restored on next page load
    }
  };

  // Add this function at the beginning of the component to check if any cart items are out of stock
  const hasOutOfStockItems = () => {
    return cartItems.some(item => 
      item.outOfStock || 
      (item.product?.stock || 0) < item.quantity
    );
  };

  // Add a specific useEffect to detect out-of-stock items and mark them
  useEffect(() => {
    if (cartItems.length > 0) {
      // Check each item's stock and mark as out of stock if needed
      const updatedCart = cartItems.map(item => ({
        ...item,
        outOfStock: (item.product?.stock || 0) < item.quantity
      }));
      
      // Update if there are changes to out-of-stock status
      if (JSON.stringify(updatedCart) !== JSON.stringify(cartItems)) {
        setCartItems(updatedCart);
      }
    }
  }, [cartItems]);

  if (loading) return (
    <div className="cart-page">
      <motion.div
        className="cart-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        
        <div className="cart-content">
          {/* Cart Items Skeleton */}
          <div className="cart-items space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cart-item animate-pulse">
                <div className="item-image bg-gray-200 w-24 h-24 rounded-lg" />
                
                <div className="item-details space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                
                <div className="item-quantity flex gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                  <div className="w-12 h-8 bg-gray-200 rounded" />
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                </div>
                
                <div className="item-total w-20 h-4 bg-gray-200 rounded" />
                <div className="remove-item w-6 h-6 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>

          {/* Order Summary Skeleton */}
          <div className="cart-summary animate-pulse">
            <h2 className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="summary-row">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="summary-row">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="summary-total">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-5 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="checkout-button h-12 bg-gray-200 rounded-lg" />
              <div className="continue-shopping h-4 bg-gray-200 rounded w-1/3 mx-auto" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
  if (error) return <div className="cart-page">Error: {error}</div>;

  return (
    <div className="cart-page">
      <motion.div
        className="cart-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Shopping Cart</h1>
        
        {cartItems && cartItems.length > 0 ? (
          <div className="cart-content">
            <div className="cart-items">
              {cartItems
                .filter(item => item.product)
                .map((item) => (
                  <motion.div
                    key={item._id}
                    className={`cart-item ${item.outOfStock ? 'border-red-300 bg-red-50' : ''}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="item-image">
                      <img 
                        src={item.product?.image || item.image || 'https://via.placeholder.com/100'} 
                        alt={item.product?.name || item.name || 'Product unavailable'} 
                        className={!item.product ? "opacity-50" : ""}
                      />
                      {!item.product && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30">
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            UNAVAILABLE
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="item-details">
                      <h3>
                        {item.product?.name || item.name || 'Product No Longer Available'}
                        {!item.product && (
                          <span className="ml-2 text-xs text-red-600 font-normal">
                            (This product has been removed)
                          </span>
                        )}
                      </h3>
                      {item.outOfStock && (
                        <p className="text-red-500 text-sm font-bold bg-red-50 px-2 py-1 rounded inline-block">
                          Out of stock
                        </p>
                      )}
                      
                      {/* Display variation information if it exists */}
                      {item.variationDisplay && (
                        <div className="mt-1 mb-2">
                          <span className="text-sm bg-indigo-600 text-white px-2 py-1 rounded inline-block">
                            {item.variationDisplay}
                            {!item.variationSku && (
                              <span className="ml-1 bg-amber-400 text-amber-800 text-xs px-1 py-0.5 rounded-full">
                                Partial
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      <p className="item-price">
                        {/* Simplified price display without showing adjustments */}
                        <span className="text-indigo-700 font-semibold">₱{(item.price || item.product?.price || 0).toLocaleString()}</span>
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="min-order text-xs">
                          Min: {item.product?.minOrder || item.minOrder || 1} pcs
                        </p>
                        <p className={`text-xs ${!item.product ? 'text-red-500 font-bold' : item.quantity > (item.product?.stock || 0) ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                          {!item.product ? 'Unavailable' : `Available: ${item.product?.stock || 0}`}
                        </p>
                      </div>
                    </div>
                    <div className="item-quantity flex gap-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          updateQuantity(item.product?._id || item.product, Math.max(1, item.quantity - 1), item.variationSku);
                        }}
                        disabled={item.quantity <= 1 || !item.product || updatingItem === (item.product?._id || item.product)}
                        className={!item.product ? "opacity-50 cursor-not-allowed" : item.outOfStock ? "text-red-500 border-red-300" : ""}
                      >
                        {updatingItem === (item.product?._id || item.product) ? 
                          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></span> : 
                          "-"
                        }
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          if (!item.product) return;
                          const newValue = Math.max(
                            item.product.minOrder || 1,
                            parseInt(e.target.value) || (item.product.minOrder || 1)
                          );
                          updateQuantity(item.product._id, newValue, item.variationSku);
                        }}
                        min={item.product?.minOrder || 1}
                        disabled={!item.product || updatingItem === (item.product?._id || item.product)}
                        className={`${!item.product ? 'bg-gray-100 cursor-not-allowed' : item.quantity < (item.product?.minOrder || 1) ? 'invalid-quantity' : ''} ${item.outOfStock ? 'bg-red-50 border-red-300' : ''} ${updatingItem === (item.product?._id || item.product) ? 'bg-gray-100' : ''}`}
                      />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          updateQuantity(item.product?._id || item.product, item.quantity + 1, item.variationSku);
                        }}
                        disabled={!item.product || item.quantity >= (item.product?.stock || 0) || updatingItem === (item.product?._id || item.product)}
                        className={`quantity-btn ${!item.product ? "opacity-50 cursor-not-allowed" : item.quantity >= (item.product?.stock || 0) ? 'opacity-50 cursor-not-allowed' : ''} ${item.outOfStock ? "text-red-500 border-red-300" : ""}`}
                      >
                        {updatingItem === (item.product?._id || item.product) ? 
                          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></span> : 
                          "+"
                        }
                      </button>
                    </div>
                    <div className="item-total">
                      <p className="text-lg font-semibold text-right">
                        ₱{((item.price || item.product?.price || 0) * (item.quantity || 0)).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="remove-item"
                      onClick={(e) => {
                        e.preventDefault();
                        removeItem(item.product?._id || item.product, item.variationSku);
                      }}
                      disabled={updatingItem === (item.product?._id || item.product)}
                    >
                      {updatingItem === (item.product?._id || item.product) ? 
                        <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></span> : 
                        "×"
                      }
                    </button>
                    
                    {/* Add an out-of-stock badge */}
                    {item.outOfStock && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl-md mobile-out-of-stock-badge">
                        OUT OF STOCK
                      </div>
                    )}
                    
                    {/* Add warning for unavailable products */}
                    {!item.product && (
                      <div className="absolute top-0 right-0 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-bl-md">
                        UNAVAILABLE
                      </div>
                    )}
                    
                    {/* Add warning message below item */}
                    {!item.product ? (
                      <div className="text-red-600 text-xs mt-1 font-medium mobile-out-of-stock-warning">
                        This product is no longer available. Please remove it from your cart.
                      </div>
                    ) : item.outOfStock && (
                      <div className="text-red-600 text-xs mt-1 font-medium mobile-out-of-stock-warning">
                        Only {item.product?.stock || 0} {item.product?.stock === 1 ? 'unit' : 'units'} available. Please reduce quantity or remove item.
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              
              {/* Quick Rewards Button at top */}
              <button 
                type="button"
                onClick={openQuickRewardModal}
                className={`mb-4 w-full py-3 ${
                  rewardApplied 
                    ? 'bg-green-600' 
                    : bestReward
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-gray-400 hover:bg-gray-500'
                } text-white rounded-lg transition flex items-center justify-center relative overflow-hidden`}
              >
                {/* Pulsing animation for non-applied rewards */}
                {!rewardApplied && bestReward && (
                  <span className="absolute inset-0 bg-white opacity-20 animate-pulse rounded-lg"></span>
                )}
                
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {rewardApplied 
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  }
                </svg>
                
                <span className="font-medium text-white">
                  {rewardApplied 
                    ? `Reward Applied: `
                    : bestReward
                      ? `Apply Reward: `
                      : 'No Rewards Available'
                  }
                  <span id="reward-button-amount" className="text-white font-bold ml-1 bg-white/20 px-2 py-0.5 rounded">
                    {rewardApplied 
                      ? `₱${rewardDiscount.toLocaleString()}` 
                      : bestReward
                        ? `₱${bestReward.amount.toLocaleString()}`
                        : ''
                    }
                  </span>
                </span>
                
                {/* Expiring indicator */}
                {hasExpiringRewards && !rewardApplied && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    Expiring soon!
                  </span>
                )}
              </button>
              
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Tax (12%)</span>
                <span>₱{tax.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>₱{shipping.toLocaleString()}</span>
              </div>
              {renderShippingInfo()}
              
              {/* Add rewards discount row when applied */}
              {rewardApplied && (
                <div className="summary-row text-green-600">
                  <span>Rewards Discount</span>
                  <span>-₱{rewardDiscount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="summary-total">
                <span>Total</span>
                <span>₱{total.toLocaleString()}</span>
              </div>
              
              <div className="cart-actions">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0 || hasOutOfStockItems()}
                  className={`checkout-button ${
                    hasOutOfStockItems() 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : cartItems.length === 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-[#363a94] hover:bg-[#2a2d73]'
                  }`}
                >
                  {hasOutOfStockItems() 
                    ? 'Cannot Checkout - Stock Issues' 
                    : cartItems.length === 0 
                      ? 'Your Cart is Empty' 
                      : 'Proceed to Checkout'
                  }
                </button>
              </div>
              <Link to="/products" className="continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <Link to="/products" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        )}
      </motion.div>
      
      {/* Render the RewardsModal here */}
      <RewardsModal />
      
      {/* Render the Quick Reward Modal here */}
      {showQuickRewardModal && bestReward && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowQuickRewardModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="inline-block p-3 bg-emerald-100 rounded-full mb-2">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Apply Reward</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-center text-gray-600 mb-4">
                Would you like to apply your available reward to this order?
              </p>
              <p className="text-center text-amber-600 text-sm font-medium mb-4">
                Note: Rewards must be manually applied before checkout - they will not be automatically added.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-emerald-700">Total Available:</span>
                  <span className="font-bold text-emerald-700 text-xl">₱{bestReward.amount.toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Expires: {new Date(bestReward.expiresAt).toLocaleDateString()}</p>
                  <p>Combined from all your available rewards</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    Same as shown on Referrals page
                  </p>
                </div>
                
                {/* Show individual rewards if there are any */}
                {rewards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200">
                    <p className="font-medium text-sm text-emerald-700 mb-1">Individual Rewards:</p>
                    <div className="max-h-28 overflow-y-auto">
                      {rewards.map((reward, index) => (
                        <div key={index} className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Reward {index + 1}:</span>
                          <span>₱{reward.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add sum of individual rewards for comparison */}
                    {bestReward.individualRewardsSum !== undefined && (
                      <div className="flex justify-between text-xs font-medium text-gray-700 mt-2 pt-1 border-t border-emerald-100">
                        <span>Sum of Individual Rewards:</span>
                        <span>₱{bestReward.individualRewardsSum.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Add explanation if there's a difference */}
                    {bestReward.individualRewardsSum !== undefined && bestReward.amount !== bestReward.individualRewardsSum && (
                      <div className="mt-2 pt-1 border-t border-emerald-100">
                        <p className="text-xs text-blue-700 font-medium">About the Different Amounts:</p>
                        <p className="text-xs text-blue-700 mt-1">
                          The difference between the Total Available (₱{bestReward.amount.toLocaleString()}) and 
                          Sum of Individual (₱{bestReward.individualRewardsSum.toLocaleString()}) 
                          is ₱{Math.abs(bestReward.amount - bestReward.individualRewardsSum).toLocaleString()}.
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          This may be due to additional bonuses, partially used rewards, or system adjustments.
                          The Total Available amount is what you'll receive when redeeming.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show warning if reward expires within 7 days */}
                {(() => {
                  const expiryDate = new Date(bestReward.expiresAt);
                  const now = new Date();
                  const sevenDaysFromNow = new Date();
                  sevenDaysFromNow.setDate(now.getDate() + 7);
                  
                  if (expiryDate <= sevenDaysFromNow) {
                    const daysLeft = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
                    return (
                      <div className="mt-2 flex items-center bg-red-50 text-red-700 p-2 rounded text-sm">
                        <svg className="w-5 h-5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}!</strong> Use it before it's gone.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-700">Current Total:</span>
                  <span className="font-medium">₱{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Reward Discount:</span>
                  <span>-₱{bestReward.amount.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                  <span>New Total:</span>
                  <span>₱{Math.max(0, total - bestReward.amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuickRewardModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={applyBestReward}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Apply Reward
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add a floating warning if cart has out-of-stock items */}
      {hasOutOfStockItems() && (
        <div className="fixed bottom-20 left-0 right-0 mx-auto w-max bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-10 flex items-center mobile-out-of-stock-alert">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Items out of stock</span>
        </div>
      )}
    </div>
  );
};

export default Cart; 