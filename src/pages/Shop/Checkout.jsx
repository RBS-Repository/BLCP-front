import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/Checkout.css';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import api from '../../api/client';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, clearCart, updateCart } = useCart();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Shipping Information
    shipping: {
      firstName: '',
      lastName: '',
      company: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      phone: '',
      email: '',
    },
    // Billing Information
    billing: {
      sameAsShipping: true,
      firstName: '',
      lastName: '',
      company: '',
      address: '',
      city: '',
      province: '',
      postalCode: ''
    },
    // Payment Method
    payment: {
      method: 'card',
      cardNumber: '',
      cardName: '',
      expiry: '',
      cvv: '',
      paymentIntentId: '',
      sourceId: '',
      status: 'pending'
    }
  });

  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Initialize these variables safely
  const itemCount = cartItems?.length || 0;
  
  // Fix the subtotal calculation to properly access price - MOVED UP before it's used
  const subtotal = cartItems?.reduce((total, item) => {
    const price = item.product?.price || item.price || 0;
    return total + (price * (item.quantity || 1));
  }, 0) || 0;
  
  const tax = subtotal * 0.12; // 12% tax
  const [shipping, setShipping] = useState(subtotal > 0 ? 150 : 0);

  // Get stored checkout data
  const checkoutData = JSON.parse(localStorage.getItem('checkoutData')) || {
    items: cartItems.map(item => ({
      product: item.product || {},
      quantity: item.quantity,
      price: item.price || 0,
      subtotal: (item.price || 0) * (item.quantity || 0)
    })),
    summary: {
      subtotal: subtotal,
      tax: tax,
      total: 0 // Initialize with 0, will be set properly in useEffect
    }
  };

  // Get reward discount from checkout data if available
  const rewardDiscount = checkoutData.summary?.rewardDiscount || 0;
  const pendingReward = JSON.parse(localStorage.getItem('pendingReward')) || null;
  
  // Apply the reward discount to the total calculation
  const [total, setTotal] = useState(subtotal + tax + shipping - rewardDiscount);

  // Load checkout data from localStorage when component mounts
  useEffect(() => {
    const savedCheckoutData = localStorage.getItem('checkoutData');
    if (savedCheckoutData) {
      try {
        const parsedData = JSON.parse(savedCheckoutData);
        
        // Update cart items with saved data if not already populated
        if (cartItems.length === 0 && parsedData.items?.length > 0) {
          updateCart(parsedData.items);
        }
      } catch (error) {
        console.error("Error parsing checkout data:", error);
      }
    }
  }, []);

  // Update the total whenever subtotal, tax, shipping, or rewardDiscount changes
  useEffect(() => {
    // Apply the reward discount to calculate the final total
    const calculatedTotal = Math.max(0, subtotal + tax + shipping - rewardDiscount);
    setTotal(calculatedTotal);
  }, [subtotal, tax, shipping, rewardDiscount]);

  // Add state for PSGC data
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Add useEffect to fetch provinces from PSGC API
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingLocations(true);
      try {
        // PSGC API for provinces
        const response = await fetch('https://psgc.gitlab.io/api/provinces.json');
        const data = await response.json();
        setProvinces(data.map(province => ({
          code: province.code,
          name: province.name
        })));
      } catch (error) {
        console.error('Error fetching provinces:', error);
      } finally {
        setLoadingLocations(false);
      }
    };
    
    fetchProvinces();
  }, []);

  // Add useEffect to fetch cities based on selected province
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.shipping.province) return;
      
      setLoadingLocations(true);
      try {
        // Find province code from name
        const province = provinces.find(p => p.name === formData.shipping.province);
        if (!province) return;
        
        // PSGC API for cities/municipalities in a province
        const response = await fetch(`https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities.json`);
        const data = await response.json();
        setCities(data.map(city => ({
          code: city.code,
          name: city.name,
          province: formData.shipping.province
        })));
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingLocations(false);
      }
    };
    
    if (formData.shipping.province) {
      fetchCities();
    } else {
      setCities([]);
    }
  }, [formData.shipping.province, provinces]);

  useEffect(() => {
    // If no checkoutData exists or it's empty, create it from cartItems
    if (!localStorage.getItem('checkoutData') && cartItems.length > 0) {
      const newCheckoutData = {
        items: cartItems.map(item => ({
          product: item.product || {},
          quantity: item.quantity,
          price: item.product?.price || 0,
          name: item.product?.name || item.name,
          image: item.product?.image || item.image,
          subtotal: (item.product?.price || 0) * (item.quantity || 0)
        })),
        summary: {
          subtotal: subtotal,
          tax: tax,
          shipping: shipping,
          total: total
        },
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('checkoutData', JSON.stringify(newCheckoutData));
    }
  }, [cartItems, subtotal, tax, total]);

  useEffect(() => {
    // Removed console logs for cart items, subtotal, tax, and total
  }, [cartItems, subtotal, tax, total]);

  // Add useEffect to populate user data from authentication
  useEffect(() => {
    if (user) {
      // Get user's data from Firestore if possible
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let firstName = '';
          let lastName = '';
          let email = user.email || '';
          
          // First try to get name from Firestore
          if (userDoc.exists()) {
            const userData = userDoc.data();
            firstName = userData.firstName || '';
            lastName = userData.lastName || '';
          }
          
          // Fall back to display name if Firestore data not available
          if (!firstName && !lastName) {
            const displayName = user.displayName || '';
            if (displayName) {
              const nameParts = displayName.trim().split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
          }
          
          // Update the form data with user information
          setFormData(prev => ({
            ...prev,
            shipping: {
              ...prev.shipping,
              firstName,
              lastName,
              email
            }
          }));
          
          // Also set billing info if same as shipping
          if (formData.billing.sameAsShipping) {
            setFormData(prev => ({
              ...prev,
              billing: {
                ...prev.billing,
                firstName,
                lastName
              }
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Still set email even if we can't get name data
          setFormData(prev => ({
            ...prev,
            shipping: {
              ...prev.shipping,
              email: user.email || ''
            }
          }));
        }
      };
      
      fetchUserData();
    }
  }, [user]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => {
      const updatedSection = { ...prev[section], [field]: value };
      
      // Auto-clear dependent fields
      if (section === 'shipping') {
        if (field === 'province') {
          updatedSection.city = '';
        }
      }
      
      return { ...prev, [section]: updatedSection };
    });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!formData.shipping.firstName.trim() || !formData.shipping.lastName.trim()) {
      toast.error('Please provide your first and last name');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      
      // Format items correctly - include variation information
      const items = cartItems.map(item => {
        const itemData = {
          product: item.product._id,
          name: item.product.name,
          quantity: Number(item.quantity),
          price: Number(item.price || item.product.price),
          image: item.product.image,
          subtotal: Number(item.price || item.product.price) * Number(item.quantity)
        };
        
        // Add variation data if present - support partial selections too
        if (item.variationDisplay) {
          // Always include variation display and options data
          itemData.variationDisplay = item.variationDisplay;
          itemData.variationOptions = item.variationOptions || {};
          
          // Only include SKU if it's a complete variation
          if (item.variationSku) {
            itemData.variationSku = item.variationSku;
          }
        }
        
        return itemData;
      });

      // Create order data
      const orderData = {
        customerName: `${formData.shipping.firstName} ${formData.shipping.lastName}`.trim(),
        user: user.uid,
        items: items,
        summary: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          rewardDiscount: parseFloat(rewardDiscount.toFixed(2)),
          total: parseFloat(total.toFixed(2))
        },
        shipping: {
          ...formData.shipping,
          fullAddress: `${formData.shipping.address}, ${formData.shipping.city}, ${formData.shipping.province} ${formData.shipping.postalCode}`,
          phone: formData.shipping.phone.toString(),
          email: formData.shipping.email.toLowerCase().trim()
        },
        payment: {
          method: 'card', // Using 'card' as the method but will be processed manually
          status: 'pending'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        orderNumber: `ORD-${Date.now()}`,
        paymentStatus: 'pending',
        refundStatus: 'none',
        refunds: [],
        confirmationEmailHistory: [],
        // Add a note about manual payment
        notes: 'This order will be processed with manual payment. Customer will be contacted for payment instructions.'
      };

      // If a reward is being applied, include it in the order
      if (pendingReward) {
        orderData.reward = {
          rewardId: pendingReward.rewardId,
          amount: pendingReward.amount,
          appliedAt: pendingReward.appliedAt
        };
      }

      console.log('Creating order:', orderData);

      // Create order with proper error handling
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (err) {
        console.error('Error parsing response:', err);
        throw new Error('Unable to process order. Please try again.');
      }

      if (!response.ok) {
        console.error('Order creation failed:', responseData);
        
        // Handle specific error cases
        if (responseData.error && responseData.error.includes('validation failed')) {
          throw new Error('Order validation failed. Please check your information and try again.');
        } else if (responseData.error === 'Insufficient stock') {
          throw new Error(`Only ${responseData.available} units available for this product.`);
        } else {
          throw new Error(responseData.error || 'Failed to create order');
        }
      }

      console.log('Order created:', responseData);

      if (!responseData._id) {
        throw new Error('Order creation failed - no order ID received');
      }

          // Clear cart and local storage
          clearCart();
        localStorage.removeItem('cart');
        localStorage.removeItem('checkoutData');
      localStorage.removeItem('pendingReward');
        updateCart([]);
        
      // Show success message
      toast.success('Order placed successfully!');
      
      // Navigate to the order confirmation page with the order data
      navigate(`/order-confirmation/${responseData._id}`, { 
        state: { order: responseData }
      });

      } catch (error) {
      console.error('Order submission error:', error);
      
      // Display user-friendly error message
      let errorMessage = 'Failed to create order. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Handle insufficient stock error
      if (error.response?.data?.error === 'Insufficient stock') {
        updateCart(cartItems.map(item => {
          if (item.product === error.response.data.productId) {
            return { ...item, outOfStock: true };
          }
          return item;
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Add state for shipping settings
  const [shippingSettings, setShippingSettings] = useState({
    standardShipping: 150,
    freeShippingThreshold: 10000
  });
  
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
        console.error('Failed to fetch shipping settings:', error);
      }
    };
    
    fetchShippingSettings();
  }, [user]);
  
  // Update shipping cost calculation based on settings and subtotal
  useEffect(() => {
    // Calculate shipping based on settings
    const newShipping = subtotal >= shippingSettings.freeShippingThreshold ? 
      0 : shippingSettings.standardShipping;
    
    // Only update if there's a change to avoid infinite loop
    if (shipping !== newShipping) {
      setShipping(newShipping);
    }
    
    // Recalculate total WITH reward discount
    const newTotal = subtotal + tax + newShipping - rewardDiscount;
    setTotal(newTotal);
  }, [subtotal, tax, shippingSettings, rewardDiscount]);
  
  // In the order summary section, add shipping info message
  const renderShippingInfoMessage = () => {
    if (shipping === 0) {
      return (
        <div className="text-green-600 text-sm font-medium mt-1">
          Free shipping applied! 🎉
        </div>
      );
    } else if (shippingSettings.freeShippingThreshold > 0) {
      const amountNeeded = shippingSettings.freeShippingThreshold - subtotal;
      if (amountNeeded > 0) {
        return (
          <div className="text-gray-600 text-sm mt-1">
            Add ₱{amountNeeded.toLocaleString()} more to qualify for free shipping!
          </div>
        );
      }
    }
    return null;
  };

  const renderShippingForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2>Shipping Information</h2>
      {user && formData.shipping.email && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <p className="text-sm">Using your registered information. If you want to change your name, you can do so on the Edit Profile page.</p>
        </div>
      )}
      <form onSubmit={handleSubmitOrder} className="checkout-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="shipping.firstName">First Name</label>
            <input
              type="text"
              id="shipping.firstName"
              value={formData.shipping.firstName}
              onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
              required
              readOnly={user && formData.shipping.firstName} 
              className={user && formData.shipping.firstName ? "bg-gray-100 cursor-not-allowed" : ""}
            />
            {user && formData.shipping.firstName && (
              <p className="text-xs text-gray-500 mt-1">Using your registered name</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="shipping.lastName">Last Name</label>
            <input
              type="text"
              id="shipping.lastName"
              value={formData.shipping.lastName}
              onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
              required
              readOnly={user && formData.shipping.lastName}
              className={user && formData.shipping.lastName ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="shipping.company">Company (Optional)</label>
            <input
              type="text"
              id="shipping.company"
              value={formData.shipping.company}
              onChange={(e) => handleInputChange('shipping', 'company', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="shipping.province">Province</label>
            <select
              id="shipping.province"
              value={formData.shipping.province}
              onChange={(e) => handleInputChange('shipping', 'province', e.target.value)}
              required
              disabled={loadingLocations}
            >
              <option value="">{loadingLocations ? 'Loading provinces...' : 'Select Province'}</option>
              {provinces
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(province => (
                  <option key={province.code} value={province.name}>
                    {province.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="shipping.city">City/Municipality</label>
            <select
              id="shipping.city"
              value={formData.shipping.city}
              onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
              required
              disabled={!formData.shipping.province || loadingLocations}
            >
              <option value="">
                {loadingLocations ? 'Loading cities...' : 
                 !formData.shipping.province ? 'Select Province First' : 'Select City'}
              </option>
              {cities
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(city => (
                  <option key={city.code} value={city.name}>
                    {city.name}
                  </option>
                ))}
            </select>
            {!formData.shipping.province && (
              <p className="text-sm text-gray-500 mt-1">Please select a province first</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="shipping.address">Street Address</label>
            <input
              type="text"
              id="shipping.address"
              value={formData.shipping.address}
              onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
              placeholder="House #, Street, Barangay"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="shipping.postalCode">Postal Code</label>
            <input
              type="text"
              id="shipping.postalCode"
              value={formData.shipping.postalCode}
              onChange={(e) => handleInputChange('shipping', 'postalCode', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="shipping.phone">Phone</label>
            <input
              type="tel"
              id="shipping.phone"
              value={formData.shipping.phone}
              onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
              required
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="shipping.email">Email Address</label>
            <input
              type="email"
              id="shipping.email"
              value={formData.shipping.email}
              onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
              required
              readOnly={user && formData.shipping.email}
              className={user && formData.shipping.email ? "bg-gray-100 cursor-not-allowed" : ""}
            />
            {user && formData.shipping.email && (
              <p className="text-xs text-gray-500 mt-1">Using your registered email</p>
            )}
          </div>
        </div>
        <button type="submit" className="next-button">
          Continue to Billing
        </button>
      </form>
    </motion.div>
  );

  const renderBillingForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2>Billing Information</h2>
      <form onSubmit={handleSubmitOrder} className="checkout-form">
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="sameAsShipping"
            checked={formData.billing.sameAsShipping}
            onChange={(e) => handleInputChange('billing', 'sameAsShipping', e.target.checked)}
          />
          <label htmlFor="sameAsShipping">Same as shipping address</label>
        </div>

        {!formData.billing.sameAsShipping && (
          <div className="form-grid">
            {/* Region Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Region</label>
              <select
                value={formData.shipping.province}
                onChange={(e) => handleInputChange('shipping', 'province', e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select Region</option>
                {/* Add region options here */}
              </select>
            </div>

            {/* Province Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Province</label>
              <select
                value={formData.shipping.province}
                onChange={(e) => handleInputChange('shipping', 'province', e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                disabled={loadingLocations}
              >
                <option value="">{loadingLocations ? 'Loading provinces...' : 'Select Province'}</option>
                {provinces
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(province => (
                    <option key={province.code} value={province.name}>
                      {province.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* City/Municipality Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">City/Municipality</label>
              <select
                value={formData.shipping.city}
                onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                disabled={!formData.shipping.province || loadingLocations}
              >
                <option value="">
                  {loadingLocations ? 'Loading cities...' : 
                   !formData.shipping.province ? 'Select Province First' : 'Select City'}
                </option>
                {cities
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(city => (
                    <option key={city.code} value={city.name}>
                      {city.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Street Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <input
                type="text"
                name="street"
                className="w-full p-2 border rounded-md"
                placeholder="House #, Street, Barangay"
                required
              />
            </div>
          </div>
        )}

        <button type="submit" className="next-button">
          Continue to Payment
        </button>
        <button type="button" className="back-button" onClick={() => setStep(1)}>
          Back to Shipping
        </button>
      </form>
    </motion.div>
  );

  const renderPaymentMethod = () => {
    const paymentMethods = [
      { id: 'card', name: 'Manual Payment', logo: 'https://cdn-icons-png.flaticon.com/512/1019/1019607.png' },
    ];

    // Add a dummy onChange handler for the radio button
    const handlePaymentMethodChange = () => {
      // Since we only have one payment method, no need to change anything
      console.log('Payment method selected');
    };

    return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
        className="max-w-3xl mx-auto pt-8"
      >
        {/* Heading */}
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Payment Method</h2>
      
      {/* Manual payment information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-blue-800 mb-3">Manual Payment Process</h3>
        <p className="text-gray-700 mb-3">
          We are currently processing payments manually. After submitting your order, our team will contact you with payment instructions.
        </p>
        <p className="text-gray-700">
          You'll receive payment details via email or phone within 24 hours of placing your order.
        </p>
      </div>

      {/* Form with payment method selection */}
        <form onSubmit={handleSubmitOrder} className="space-y-6">
        <div className="flex items-center p-4 rounded-lg border border-gray-200 bg-white">
            <input
              type="radio"
            id="manual-payment"
              name="payment_method"
            value="card"
            checked={true}
            onChange={handlePaymentMethodChange}
                  className="w-5 h-5 text-blue-500 mr-4 focus:ring-blue-500"
            />
          <label htmlFor="manual-payment" className="flex items-center w-full">
            <img src={paymentMethods[0].logo} alt="Manual Payment Logo" className="w-12 h-12 mr-4" />
            <span className="text-lg font-medium text-gray-700">Manual Payment</span>
                </label>
          </div>
  
          {/* Buttons */}
          <div className="flex justify-between mt-8 gap-4">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors duration-200"
              onClick={() => setStep(2)}
            >
              Back to Billing
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors duration-200"
            >
              Continue to Review
            </button>
          </div>
      </form>
    </motion.div>
  );
  };
  const renderOrderReview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Your Order</h2>

      {/* Order Items */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Order Items</h3>
          <span className="item-count-badge">{cartItems.length} items</span>
          </div>
        <div className="items-container">
          {cartItems.map(item => {
            // Add defensive checks for item structure  
            const price = item.price || item.product?.price || 0;
            const name = item.product?.name || item.name || 'Unknown Product';
            const quantity = item.quantity || 0;
            const subtotal = price * quantity;
            const image = item.product?.image || item.image || 'https://via.placeholder.com/100';
            
            return (
              <div key={item._id || item.product?._id || Math.random()} className="item-card">
                <img 
                  src={image} 
                  alt={name} 
                  className="item-image"
                />
                <div className="item-details">
                  <p className="item-name line-clamp-2 break-words">{name}</p>
                  
                  {/* Display variation information if available */}
                  {item.variationDisplay && (
                    <p className={`text-xs ${item.variationSku ? 'text-indigo-600 bg-indigo-50' : 'text-amber-600 bg-amber-50'} px-2 py-1 rounded inline-block mb-1`}>
                      <span className="font-medium">Variation:</span> {item.variationDisplay}
                      {!item.variationSku && (
                        <span className="ml-1 font-medium">(Partial selection)</span>
                      )}
                    </p>
                  )}
                  
                  <p className="item-qty">Qty: {quantity}</p>
                  <p className="item-price">
                    ₱{subtotal.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Summary */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Shipping Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Shipping Information</h3>
          <div className="space-y-3">
            <p className="text-gray-600">
              <span className="font-medium">Name:</span> {formData.shipping.firstName} {formData.shipping.lastName}
            </p>
            <p className="text-gray-600 break-words">
              <span className="font-medium">Email:</span> {formData.shipping.email}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Phone:</span> {formData.shipping.phone}
            </p>
            <p className="text-gray-600 break-words">
              <span className="font-medium">Address:</span> {formData.shipping.address}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">City:</span> {formData.shipping.city}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Province:</span> {formData.shipping.province}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Postal Code:</span> {formData.shipping.postalCode}
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₱{subtotal.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (12%)</span>
              <span>₱{tax.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <div className="flex flex-col items-end">
                <span>₱{shipping.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
                {renderShippingInfoMessage()}
              </div>
            </div>
            
            {/* Show reward discount if applied */}
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Reward Discount</span>
                <span>-₱{rewardDiscount.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
            )}
            
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between text-lg font-semibold text-gray-800">
              <span>Total</span>
              <span>₱{total.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Payment Method: Manual Payment
                <span className="block mt-1 text-xs">You'll receive payment instructions after placing your order</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between gap-4">
        <button 
          type="button"
          onClick={() => setStep(3)}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button 
          type="button" 
          onClick={handleSubmitOrder}
          disabled={loading}
          className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderOrderConfirmation = () => (
    <motion.div
      className="order-confirmation"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      
    >
      <div className="confirmation-content" >
        <div className="success-icon"  >✓</div>
        <h2>Thank You for Your Order!</h2>
        <p>Order ID: {orderId}</p>
        <p>Customer Name: {formData.shipping.firstName} {formData.shipping.lastName}</p>
        <div className="p-4 my-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          <h3 className="font-bold mb-2">Manual Payment Instructions</h3>
          <p>Your order has been received and is pending payment. Our team will contact you shortly with payment instructions via email or phone.</p>
       
        </div>
        <p>We'll send you an email confirmation shortly.</p>
        <Link to="/products" className="continue-shopping">
          Continue Shopping
        </Link>
      </div>
    </motion.div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderShippingForm();
      case 2:
        return renderBillingForm();
      case 3:
        return renderPaymentMethod();
      case 4:
        return renderOrderReview();
      case 5:
        return renderOrderConfirmation();
      default:
        return null;
    }
  };

  return (
    <div className="checkout-page">
      {step < 5 && (
        <div className="checkout-progress">
          {['Shipping', 'Billing', 'Payment', 'Review'].map((label, index) => (
            <div
              key={label}
              className={`progress-step ${index + 1 === step ? 'active' : ''} ${
                index + 1 < step ? 'completed' : ''
              }`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{label}</div>
            </div>
          ))}
        </div>
      )}
      
      <div className="checkout-container">
        <div className="checkout-content">{renderStepContent()}</div>
        {step < 5 && (
          <div className="order-summary-sidebar">
            <div className="order-summary">
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold">Order Summary</h3>
                <span className="item-count-badge">{cartItems.length} items</span>
              </div>
              
              {cartItems.length > 5 && (
                <p className="text-sm text-gray-500 mb-2">Showing {cartItems.length} items</p>
              )}
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item._id || Math.random()} className="summary-item">
                  <div className="item-info">
                    <img 
                      src={item.product?.image || 'https://via.placeholder.com/100'} 
                      alt={item.product?.name || item.name || 'Product'} 
                    />
                    <div>
                      <p className="item-name line-clamp-2 break-words">{item.product?.name || item.name}</p>
                      <p className="item-qty">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="item-price">
                      ₱{((item.product?.price || 0) * item.quantity).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                  </p>
                </div>
              ))}
              </div>
            </div>
            <div className="order-total">
              <div className="total-row">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="total-row">
                <span>Tax (12%)</span>
                <span>₱{tax.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="total-row">
                <span>Shipping</span>
                <div className="flex flex-col items-end">
                  <span>₱{shipping.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                  {renderShippingInfoMessage()}
                </div>
              </div>
              
              {/* Show reward discount if applied */}
              {rewardDiscount > 0 && (
                <div className="total-row text-emerald-600">
                  <span>Reward Discount</span>
                  <span>-₱{rewardDiscount.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
              )}
              
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between text-lg font-semibold text-gray-800">
                <span>Total</span>
                <span>₱{total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Payment Method: Manual Payment
                  <span className="block mt-1 text-xs">You'll receive payment instructions after placing your order</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;