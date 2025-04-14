import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaCheck, FaTruck, FaCopy } from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';

const OrderDetailsModal = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let timeoutId;
    
    if (isOpen && orderId && user) {
      // Check for cached order data first
      const cachedOrder = sessionStorage.getItem(`order_${orderId}`);
      const cacheTimestamp = sessionStorage.getItem(`order_${orderId}_timestamp`);
      
      if (cachedOrder && cacheTimestamp) {
        // Use cache if it's less than 10 minutes old
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        if (cacheAge < 600000) { // 10 minutes
          try {
            const parsedOrder = JSON.parse(cachedOrder);
            setOrder(parsedOrder);
            setLoading(false);
            // Fetch fresh data in background after a delay
            setTimeout(() => fetchOrderDetails(false), 2000);
            return;
          } catch (err) {
            console.error('Error parsing cached order:', err);
            // Continue with normal fetch if cache parsing fails
          }
        }
      }
      
      // No valid cache, do a normal fetch
      fetchOrderDetails(true);
      
      // Set a timeout for the entire operation
      timeoutId = setTimeout(() => {
        if (loading) {
          setLoading(false);
          setError("Request timed out. Please try again.");
        }
      }, 15000); // 15 seconds timeout
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen, orderId, user]);

  const fetchOrderDetails = async (updateLoadingState = true) => {
    /**
     * PERFORMANCE OPTIMIZATION
     * 
     * This function has been optimized to improve loading times by:
     * 1. Using sessionStorage caching with a 10-minute expiration for order data
     * 2. Implementing AbortController for more reliable request timeouts
     * 3. Background refreshing of order data when using cached values
     * 4. More specific error handling and retry logic with exponential backoff
     * 5. Separate control flow for primary vs background fetches
     */
    if (updateLoadingState) {
      setLoading(true);
    }
    
    try {
      if (!user) throw new Error('No authenticated user');
      
      console.log('Fetching order details for ID:', orderId);
      const token = await user.getIdToken();
      
      // Create a controller for request cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Try with direct URL
      const url = `${import.meta.env.VITE_API_BASE_URL}/orders/${orderId}`;
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Cache the successful response
      sessionStorage.setItem(`order_${orderId}`, JSON.stringify(response.data));
      sessionStorage.setItem(`order_${orderId}_timestamp`, Date.now().toString());
      
      setOrder(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching order details:', error);
      
      // Only update error state if this is the primary fetch
      if (updateLoadingState) {
        // Special handling for common errors
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
          setError('Request timed out. The server is taking too long to respond.');
        } else if (error.response?.status === 404) {
          setError('Order not found. It may have been deleted or the ID is invalid.');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to view this order.');
        } else {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to load order details';
          setError(errorMessage);
        }
        
        // Show toast only on primary fetch
        toast.error('Could not load order details');
      }
      
      // Only retry if specified and under retry limit
      if (updateLoadingState && retryCount < 2) {
        console.log(`Retrying (${retryCount + 1}/2) in ${1500 * (retryCount + 1)}ms...`);
        setRetryCount(prev => prev + 1);
        
        // Use exponential backoff for retries
        setTimeout(() => fetchOrderDetails(true), 1500 * (retryCount + 1));
      }
    } finally {
      // Only update loading state if this is the primary fetch
      if (updateLoadingState) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaSpinner className="text-yellow-500 animate-spin" />;
      case 'processing': return <FaSpinner className="text-blue-500 animate-spin" />;
      case 'shipped': return <FaTruck className="text-blue-700" />;
      case 'delivered': return <FaCheck className="text-green-500" />;
      case 'completed': return <FaCheck className="text-green-700" />;
      case 'cancelled': return (
        <svg className="text-red-500 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      default: return <FaSpinner className="text-gray-500 animate-spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-blue-700';
      case 'delivered': 
      case 'completed': return 'bg-green-600';
      case 'cancelled': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const copyOrderId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('Order ID copied to clipboard!');
  };

  if (!isOpen) return null;

    return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] overflow-y-auto bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
            onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 shadow-md text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </motion.button>

        {/* Error State */}
        {error && !loading ? (
          <div className="p-8 flex flex-col items-center justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-20 h-20 mb-6 rounded-full bg-red-50 flex items-center justify-center"
            >
              {error.includes('not found') ? (
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </motion.div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
                {error.includes('not found') ? 'Order Not Found' : 'Error Loading Order'}
              </h3>
            
            <p className="text-center max-w-md text-gray-600 mb-6">
                {error}
              {error.includes('not found') && (
                <span className="block mt-2 text-sm text-gray-500">
                  The order may have been deleted or the ID is invalid.
                </span>
              )}
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
                onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                Close
            </motion.button>
            </div>
        ) : loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 mb-6">
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-gray-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
          </div>
            <h3 className="text-lg font-medium text-gray-700">Loading Order Details</h3>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your order information</p>
        </div>
        ) : order ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Order Header - Sticky */}
            <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-8 shadow-md">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold tracking-tight">Order Details</h2>
                    <div className={`px-3 py-1 text-xs font-bold rounded-full ${
                      order.payment?.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                    } text-white`}>
                      {order.payment?.status?.toUpperCase() || 'PENDING'}
      </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-200">Order ID:</span>
                      <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded text-sm truncate max-w-[140px] md:max-w-none">
                        {order._id}
                      </span>
                    <button 
                      onClick={() => copyOrderId(order._id)}
                        className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors"
                      title="Copy Order ID"
                    >
                        <FaCopy className="text-blue-200 hover:text-white text-sm" />
                    </button>
                  </div>
                    
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-blue-200 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-blue-50">
                    Placed on {formatDate(order.createdAt)}
                      </span>
                    </div>
                    
                  {order.orderNumber && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-blue-200 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-sm text-blue-50">
                      Order #: {order.orderNumber}
                        </span>
                      </div>
                  )}
                </div>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg">
                  {getStatusIcon(order.status)}
                  <span className="font-semibold text-white capitalize">{order.status}</span>
                </div>
                </div>
              </div>

            {/* Content Area - Scrollable */}
            <div className="overflow-y-auto p-8 space-y-8">
              {/* Order Progress */}
              <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Progress</h3>
                
                <div className="relative pt-8">
                  {/* Status line */}
                  <div className="absolute top-12 left-0 w-full h-1 bg-gray-200 rounded"></div>
                  
                  {/* Status points */}
                  <div className="relative z-10 flex justify-between">
                    {/* Pending */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 ${
                        ['pending', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status)
                          ? getStatusColor(order.status === 'pending' ? 'pending' : 'completed')
                          : 'bg-gray-300'
                      } text-white`}>
                        {['pending'].includes(order.status) ? (
                          <FaSpinner className="animate-spin text-xs" />
                        ) : ['processing', 'shipped', 'delivered', 'completed'].includes(order.status) ? (
                          <FaCheck className="text-xs" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-white"></span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        ['pending', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status)
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                    Pending
                  </span>
                    </div>
                    
                    {/* Processing */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 ${
                        ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
                          ? getStatusColor(order.status === 'processing' ? 'processing' : 'completed')
                          : 'bg-gray-300'
                      } text-white`}>
                        {['processing'].includes(order.status) ? (
                          <FaSpinner className="animate-spin text-xs" />
                        ) : ['shipped', 'delivered', 'completed'].includes(order.status) ? (
                          <FaCheck className="text-xs" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-white"></span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                    Processing
                  </span>
                    </div>
                    
                    {/* Shipped */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 ${
                        ['shipped', 'delivered', 'completed'].includes(order.status)
                          ? getStatusColor(order.status === 'shipped' ? 'shipped' : 'completed')
                          : 'bg-gray-300'
                      } text-white`}>
                        {['shipped'].includes(order.status) ? (
                          <FaTruck className="text-xs" />
                        ) : ['delivered', 'completed'].includes(order.status) ? (
                          <FaCheck className="text-xs" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-white"></span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        ['shipped', 'delivered', 'completed'].includes(order.status)
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                    Shipped
                  </span>
                    </div>
                    
                    {/* Delivered */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 ${
                        ['delivered', 'completed'].includes(order.status)
                          ? getStatusColor('delivered')
                          : 'bg-gray-300'
                      } text-white`}>
                        {['delivered', 'completed'].includes(order.status) ? (
                          <FaCheck className="text-xs" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-white"></span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        ['delivered', 'completed'].includes(order.status)
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                    Delivered
                  </span>
                </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="absolute top-12 left-0 h-1 rounded-full transition-all duration-500 ease-in-out"
                    style={{
                      width: order.status === 'pending'
                        ? '0%'
                        : order.status === 'processing'
                        ? '33%'
                        : order.status === 'shipped'
                        ? '67%'
                        : order.status === 'delivered' || order.status === 'completed'
                        ? '100%'
                        : '0%',
                      background: getStatusColor(order.status)
                    }}
                  ></div>
                </div>
              </section>

              {/* Two Column Layout for Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column - Order Items */}
                <section className="md:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Order Items
                  </h3>
                  
                  <div className="divide-y divide-gray-100">
                  {order.items?.map((item, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center py-4 first:pt-0 last:pb-0"
                      >
                        <div className="bg-gray-50 rounded-lg p-2 flex-shrink-0">
                      <img
                        src={item.image || 'https://via.placeholder.com/80'}
                        alt={item.name}
                            className="w-16 h-16 object-cover rounded-md"
                        onError={(e) => (e.target.src = 'https://via.placeholder.com/80?text=Product')}
                      />
                        </div>
                        
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 mt-1 text-sm text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              Qty: {item.quantity}
                            </span>
                            <span>
                              Price: ₱{parseFloat(item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                      </div>
                        </div>
                        
                        <div className="ml-4 font-bold text-gray-900">
                        ₱{parseFloat((item.price || 0) * (item.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                      </motion.div>
                  ))}
                </div>
                </section>

                {/* Right Column - Payment & Shipping */}
                <section className="md:col-span-1 space-y-6">
              {/* Shipping Information */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Shipping Information
                    </h3>
                    
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="font-medium text-gray-900">
                    {order.customerName}
                  </p>
                      <p className="text-gray-700 mt-2 text-sm">
                    {order.shipping?.fullAddress || 
                     `${order.shipping?.address}, ${order.shipping?.city}, ${order.shipping?.province} ${order.shipping?.postalCode}`}
                  </p>
                      <div className="mt-3 flex flex-col text-sm text-gray-600">
                        <div className="flex items-center mt-1">
                          <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{order.shipping?.phone}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{order.shipping?.email}</span>
                        </div>
                      </div>
                </div>
              </div>

                  {/* Payment Details & Summary */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Payment Details
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div>
                        <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {order.payment?.method || 'Not specified'}
                        </p>
                  </div>
                  <div>
                        <p className="text-sm text-gray-500 mb-1">Status</p>
                    <p
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.payment?.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                          : order.payment?.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                          : order.payment?.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                          {order.payment?.status?.toUpperCase() || 'NOT PAID'}
                    </p>
                </div>
              </div>

              <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-gray-900">₱{(order.summary?.subtotal || 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tax (12%)</span>
                          <span className="text-gray-900">₱{(order.summary?.tax || 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Shipping</span>
                          <span className="text-gray-900">₱{(order.summary?.shipping || 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                        <div className="border-t border-gray-200 my-2 pt-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-900">Total</span>
                          <span className="text-blue-700">₱{(order.summary?.total || 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                </div>
              </div>
            </div>
                </section>
            </div>
        </div>

            {/* Footer Actions */}
            <div className="mt-auto border-t border-gray-200 px-8 py-5 bg-gray-50">
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
            onClick={onClose}
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            Close
                </motion.button>
        </div>
      </div>
    </div>
        ) : (
          <div className="p-16 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No order data available</h3>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const NotificationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    const fetchNotification = async () => {
      /**
       * PERFORMANCE OPTIMIZATION
       * 
       * This function has been optimized to improve loading times by:
       * 1. Using sessionStorage caching to avoid unnecessary Firebase fetches
       * 2. Implementing a timeout promise to prevent long-running Firebase requests
       * 3. Separating the read status update from the main data fetch flow
       * 4. Proper date handling and conversion for cached data
       * 5. Better error messaging based on the specific error type
       */
      // Check if we have a cached version of this notification
      const cachedNotification = sessionStorage.getItem(`notification_${id}`);
      if (cachedNotification) {
        try {
          const parsedNotification = JSON.parse(cachedNotification);
          // Convert date strings back to Date objects
          const processedNotification = {
            ...parsedNotification,
            createdAt: parsedNotification.createdAt ? new Date(parsedNotification.createdAt) : null,
            readAt: parsedNotification.readAt ? new Date(parsedNotification.readAt) : null,
            preferredDate: parsedNotification.preferredDate ? new Date(parsedNotification.preferredDate) : null
          };
          
          setNotification(processedNotification);
          setLoading(false);
          
          // If notification wasn't marked as read, update it in the background
          if (!parsedNotification.read) {
            updateNotificationReadStatus(parsedNotification.id);
          }
          
          return;
        } catch (err) {
          console.error('Error parsing cached notification:', err);
          // Continue with fetching from Firebase if cache parsing fails
        }
      }
      
      try {
        const notificationRef = doc(db, 'notifications', id);
        
        // Use a timeout promise to handle slow Firebase responses
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        );
        
        // Race the Firebase request against the timeout
        const notificationSnap = await Promise.race([
          getDoc(notificationRef),
          timeoutPromise
        ]);
        
        if (!notificationSnap.exists()) {
          throw new Error('Notification not found');
        }

        const notificationData = notificationSnap.data();
        
        // Prepare notification object
        const processedNotification = {
          id: notificationSnap.id,
          ...notificationData,
          createdAt: notificationData.createdAt?.toDate(),
          readAt: notificationData.readAt?.toDate(),
          preferredDate: notificationData.preferredDate?.toDate()
        };
        
        // Save to session storage for faster future access (without dates converted to strings)
        const cachableNotification = {
          ...processedNotification,
          createdAt: processedNotification.createdAt?.toISOString(),
          readAt: processedNotification.readAt?.toISOString(),
          preferredDate: processedNotification.preferredDate?.toISOString()
        };
        
        sessionStorage.setItem(`notification_${id}`, JSON.stringify(cachableNotification));
        
        // Update state
        setNotification(processedNotification);
        
        // Mark as read if not already (do this after updating state)
        if (!notificationData.read) {
          updateNotificationReadStatus(id);
        }
        
      } catch (err) {
        console.error('Error fetching notification:', err);
        setError(err.message === 'Request timed out' 
          ? 'Loading took too long. Please check your connection and try again.' 
          : 'Failed to load notification');
      } finally {
        setLoading(false);
      }
    };
    
    // Function to update read status without affecting the UI flow
    const updateNotificationReadStatus = async (notificationId) => {
      try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
          read: true,
          readAt: new Date()
        });
        
        // Update the cached version
        const cachedNotification = sessionStorage.getItem(`notification_${id}`);
        if (cachedNotification) {
          const parsedNotification = JSON.parse(cachedNotification);
          const updatedNotification = {
            ...parsedNotification,
            read: true,
            readAt: new Date().toISOString()
          };
          sessionStorage.setItem(`notification_${id}`, JSON.stringify(updatedNotification));
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
        // Don't show error to user as this is a background operation
      }
    };

    if (user?.uid) {
      fetchNotification();
    }
  }, [id, user?.uid]);

  // Get the accent color based on notification type
  const getNotificationAccentColor = () => {
    if (!notification) return 'border-gray-200';
    
    switch (notification.type) {
      case 'order':
        return 'border-blue-500';
      case 'schedule-confirmation':
        return 'border-green-500';
      case 'schedule-declined':
        return 'border-red-500';
      case 'appointment':
        return 'border-purple-500';
      default:
        return 'border-gray-300';
    }
  };

  // Get background color for header based on notification type
  const getHeaderBackground = () => {
    if (!notification) return 'bg-white';
    
    switch (notification.type) {
      case 'order':
        return 'bg-blue-50';
      case 'schedule-confirmation':
        return 'bg-green-50';
      case 'schedule-declined':
        return 'bg-red-50';
      case 'appointment':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Get appropriate title based on notification type
  const getNotificationTitle = () => {
    if (!notification) return 'Notification';
    
    if (notification.type === 'order') {
      return 'Order Status Update';
    } else if (notification.type === 'schedule-confirmation') {
      return 'Appointment Confirmed';
    } else if (notification.type === 'schedule-declined') {
      return 'Appointment Declined';
    } else if (notification.type === 'appointment' || notification.type?.includes('schedule')) {
      return 'Appointment Notification';
    } else {
      return 'Notification';
    }
  };

  // Get time ago for relative timestamps
  const getTimeAgo = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
      return `on ${format(date, 'MMM d, yyyy')}`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading notification...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-l-4 border-red-500 shadow-lg rounded-lg p-6 max-w-md w-full"
        >
          <div className="flex items-center mb-4">
            <svg className="h-8 w-8 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800">Error Loading Notification</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen py-20 bg-gray-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl mx-auto"
        >
          <div className={`bg-white shadow-lg rounded-lg overflow-hidden border-l-4 ${getNotificationAccentColor()}`}>
            <div className={`px-6 py-5 ${getHeaderBackground()} border-b border-gray-200`}>
              <div className="flex items-center mb-2">
                {notification.type === 'order' && (
                  <svg className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
                {(notification.type === 'schedule-confirmation' || notification.type === 'appointment') && (
                  <svg className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {notification.type === 'schedule-declined' && (
                  <svg className="h-6 w-6 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <h3 className="text-xl font-bold text-gray-900">{getNotificationTitle()}</h3>
              </div>
              
              {/* Subtitle with appropriate coloring */}
              {(notification.appointmentTitle || notification.title || 
                (notification.data && (notification.data.appointmentTitle || notification.data.title))) && (
                <p className="text-base font-medium text-gray-800">
                  {notification.appointmentTitle || notification.title || 
                   (notification.data && (notification.data.appointmentTitle || notification.data.title))}
                </p>
              )}
              
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Received {getTimeAgo(notification.createdAt)}</span>
                
                {notification.readAt && (
                  <span className="flex items-center ml-4">
                    <svg className="h-4 w-4 mr-1 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Read {getTimeAgo(notification.readAt)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                {/* Title Section */}
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Title
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {notification.title}
                  </dd>
                </div>

                {/* Status Section - only for order notifications */}
                {notification.type === 'order' && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <svg className="mr-2 h-4 w-4 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Status
                    </dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2 flex items-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        notification.data?.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : notification.data?.status === 'shipped'
                          ? 'bg-[#363a94]/10 text-[#363a94]'
                          : notification.data?.status === 'delivered'
                          ? 'bg-purple-100 text-purple-800'
                          : notification.data?.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : notification.data?.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.data?.status ? notification.data.status.toUpperCase() : 'UPDATED'}
                      </span>
                    </dd>
                  </div>
                )}

                {/* Status Section - for appointment notifications */}
                {(notification.type === 'schedule-confirmation' || notification.type === 'schedule-declined') && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <svg className="mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Status
                    </dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        notification.type === 'schedule-confirmation' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {notification.type === 'schedule-confirmation' 
                          ? 'CONFIRMED' 
                          : 'DECLINED'}
                      </span>
                    </dd>
                  </div>
                )}

                {/* Message Section */}
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <svg className="mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Message
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-80 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed break-words">
                        {notification.message || 'No message was provided.'}
                      </pre>
                    </div>
                  </dd>
                </div>

                {/* Order Details */}
                {notification.type === 'order' && notification.orderId && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <svg className="mr-2 h-4 w-4 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Order Details
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="p-4 rounded-lg border border-[#363a94]/20 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-mono text-sm bg-[#363a94]/10 px-2 py-1 rounded text-[#363a94] flex items-center">
                            <span className="mr-2">Order ID:</span>
                            <span className="font-bold">{notification.orderId}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(notification.orderId);
                                toast.success('Order ID copied!');
                              }}
                              className="ml-2 text-[#363a94] hover:text-[#262875] transition-colors"
                            >
                              <FaCopy size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center mb-4">
                          <div className="flex-grow pr-2">
                            <div className="text-xs text-gray-500 mb-1">Status changed from</div>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              notification.data?.previousStatus === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : notification.data?.previousStatus === 'shipped'
                                ? 'bg-[#363a94]/10 text-[#363a94]'
                                : notification.data?.previousStatus === 'processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {notification.data?.previousStatus ? notification.data.previousStatus.toUpperCase() : 'PREVIOUS'}
                            </span>
                          </div>
                          
                          <svg className="h-5 w-5 text-gray-500 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          
                          <div className="flex-grow pl-2">
                            <div className="text-xs text-gray-500 mb-1">To new status</div>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              notification.data?.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : notification.data?.status === 'shipped'
                                ? 'bg-[#363a94]/10 text-[#363a94]'
                                : notification.data?.status === 'delivered'
                                ? 'bg-purple-100 text-purple-800'
                                : notification.data?.status === 'processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {notification.data?.status ? notification.data.status.toUpperCase() : 'NEW'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                        <button 
                          onClick={() => setIsOrderModalOpen(true)}
                            className="flex items-center text-sm text-[#363a94] hover:text-[#262875] transition-colors"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Full Order: {notification.orderId}
                        </button>
                        </div>
                      </div>
                    </dd>
                  </div>
                )}

                {/* Consultation Details for Appointment Notifications */}
                {(notification.type === 'schedule-confirmation' || 
                  notification.type === 'schedule-declined' || 
                  notification.type === 'appointment' || 
                  (notification.type && notification.type.includes('schedule'))) && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <svg className="mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Consultation Details
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className={`p-4 rounded-lg border ${
                        notification.type === 'schedule-confirmation' 
                          ? 'border-green-100 bg-green-50' 
                          : notification.type === 'schedule-declined'
                          ? 'border-red-100 bg-red-50'
                          : 'border-blue-100 bg-blue-50'
                      }`}>
                        <div className="flex flex-col space-y-4">
                          {/* Status heading */}
                          <div className="flex items-center mb-2">
                            <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">
                              {notification.type === 'schedule-confirmation' ? 'Confirmed Appointment' : 
                              notification.type === 'schedule-declined' ? 'Declined Appointment' : 'Scheduled Appointment'}
                            </span>
                          </div>
                          
                          {/* Date and Time */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Date</div>
                                <span className="font-medium">
                                  {notification.preferredDate ? format(notification.preferredDate, 'MMMM d, yyyy') : 
                                  notification.data?.date ? format(new Date(notification.data.date), 'MMMM d, yyyy') : 'N/A'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Time</div>
                                <span className="font-medium">
                                  {notification.preferredTime || notification.data?.time || notification.time || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Consultation Type */}
                          {(notification.consultationType || notification.data?.consultationType) && (
                            <div className="flex items-center border border-gray-100 bg-white rounded-lg p-3">
                              <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Consultation Type</div>
                                <span className="font-medium capitalize">
                                  {(notification.consultationType || notification.data?.consultationType || 'General')
                                    .replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </dd>
                  </div>
                )}

                {/* Date Received */}
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <svg className="mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Date Received
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                    <span className="font-mono">
                    {notification.createdAt ? format(notification.createdAt, 'MMMM d, yyyy h:mm a') : 'N/A'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">({getTimeAgo(notification.createdAt)})</span>
                  </dd>
                </div>

                {/* Date Read */}
                {notification.readAt && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <svg className="mr-2 h-4 w-4 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Date Read
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                      <span className="font-mono">
                      {format(notification.readAt, 'MMMM d, yyyy h:mm a')}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">({getTimeAgo(notification.readAt)})</span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex items-center justify-center px-6 py-3 bg-[#363a94] text-white rounded-lg shadow-md hover:bg-[#2a2e75] transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Notifications
            </motion.button>
          </div>
        </motion.div>
      </div>

      {notification.type === 'order' && notification.orderId && (
        <OrderDetailsModal 
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          orderId={notification.orderId}
        />
      )}
    </div>
  );
};

export default NotificationDetails; 