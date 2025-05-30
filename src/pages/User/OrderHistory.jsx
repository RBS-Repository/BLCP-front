import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheck, FaSpinner, FaTruck, FaBox, FaShoppingBag, FaCopy } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import '../../styles/OrderHistory.css';

const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

const statusIconVariants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 }
};

const sectionVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const statusColors = {
  pending: 'text-yellow-600',
  processing: 'text-blue-600',
  shipped: 'text-blue-700',
  delivered: 'text-green-600',
  completed: 'text-green-700',
  cancelled: 'text-red-600'
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);

  const fetchOrders = async (forceRetry = false) => {
    try {
      setLoading(true);
      setError(null);
      if (!user) throw new Error('No authenticated user');
      const token = await user.getIdToken();
      const response = await axios.get('/api/orders/user-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.data) throw new Error('No data received from server');
      const sortedOrders = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sortedOrders);
      if (sortedOrders.length > 0) setSelectedOrder(sortedOrders[0]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch orders');
      if (forceRetry && retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchOrders(true), 2000 * retryCount);
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    let reconnectAttempts = 0;
    const maxAttempts = 5;
    
    const connect = () => {
      const ws = new WebSocket(`ws://localhost:5000/ws/orders`);
      
      ws.onopen = () => {
        reconnectAttempts = 0;
        console.log('WebSocket connected for order history');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'order-update') {
          setOrders(prev => [data.data, ...prev]);
        }
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && reconnectAttempts < maxAttempts) {
          const delay = Math.min(1000 * (2 ** reconnectAttempts), 5000);
          setTimeout(connect, delay);
          reconnectAttempts++;
        }
      };

      setWs(ws);
    };

    connect();
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (user) fetchOrders(true);
    else setLoading(false);
  }, [user]);

  const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);

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
      default: return <FaSpinner className="text-gray-500 animate-spin" />;
    }
  };

  const copyOrderId = (orderId) => {
    navigator.clipboard.writeText(orderId);
    toast.success('Order ID copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="order-history-page" >
        <div className="order-history-container mx-auto px-4 py-8 min-h-screen flex items-center justify-center" >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-8 text-gray-800" >Order History</h1>
            <div className="animate-pulse space-y-6 w-full">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-white rounded-lg shadow">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-32 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="order-history-container mx-auto px-4 py-8">
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-red-700 mb-4">Failed to load orders</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchOrders(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={retryCount >= 3}
            >
              {retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
            </button>
            {retryCount >= 3 && (
              <p className="mt-4 text-sm text-gray-600">Showing locally saved orders if available</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="order-history-page">
        <div className="order-history-container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full"
          >
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Order History</h1>
            <div className="flex flex-col items-center">
              <FaShoppingBag className="text-5xl text-gray-300 mb-4" />
              <p className="text-xl mb-8 text-gray-600">You haven't placed any orders yet</p>
              <Link to="/products" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Browse Products
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <div className="order-history-container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-8 text-gray-800 px-4">Order History</h1>

        {/* Mobile Order Filter - Only visible on mobile */}
        <div className="md:hidden mb-4 mobile-filters px-4">
          <div className="filter-buttons">
            {['all', 'pending', 'processing', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 px-4">
          {/* Order List - Responsive adjustments */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Filter - Only visible on desktop */}
              <div className="hidden md:block p-4 bg-gray-100 border-b">
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                  {['all', 'pending', 'processing', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        filter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto orders-list">
                {filteredOrders.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No orders matching the selected filter</div>
                ) : (
                  filteredOrders.map((order) => (
                    <motion.div
                      key={order._id}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      exit="exit"
                      className={`order-item bg-white rounded-lg shadow-sm p-4 md:p-6 mb-3 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedOrder?._id === order._id ? 'border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-gray-800">
                            Order Placed
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 mt-1">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <div className="text-right">
                            <span className={`text-xs md:text-sm font-medium ${statusColors[order.status]}`}>
                              {order.status.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1 justify-end">
                              <p className="text-xs text-gray-500 font-mono mt-1 hidden md:block">
                                {order._id}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1 md:hidden">
                                {order._id.substring(0, 8)}...
                              </p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyOrderId(order._id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Copy Order ID"
                              >
                                <FaCopy className="text-gray-400 w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Order Details - Mobile optimized */}
          <div className="md:col-span-2">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder._id}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="order-details bg-white rounded-lg shadow-lg p-4 md:p-6 space-y-4 md:space-y-6"
              >
                {/* Order Header - Responsive layout */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                        Order ID: 
                        <span className="hidden md:inline">{selectedOrder._id}</span>
                        <span className="md:hidden">{selectedOrder._id.substring(0, 8)}...</span>
                      </h2>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyOrderId(selectedOrder._id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Copy Order ID"
                      >
                        <FaCopy className="text-gray-500" />
                      </button>
                    </div>
                    <p className="text-gray-500 text-sm">Placed on {formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg self-start">
                    {getStatusIcon(selectedOrder.status)}
                    <div className="text-right">
                      <span className="font-semibold capitalize">{selectedOrder.status}</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {formatDate(selectedOrder.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Progress - Mobile friendly */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700">Order Progress</h3>
                  <div className="order-progress-steps">
                    {['Order Placed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
                      <div key={index} className="order-progress-step">
                        <div
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mx-auto ${
                            selectedOrder.status === 'pending' && index === 0
                              ? 'bg-green-500 text-white'
                              : selectedOrder.status === 'processing' && index <= 1
                              ? 'bg-green-500 text-white'
                              : selectedOrder.status === 'shipped' && index <= 2
                              ? 'bg-green-500 text-white'
                              : selectedOrder.status === 'delivered' && index <= 3
                              ? 'bg-green-500 text-white'
                              : selectedOrder.status === 'completed' && index <= 3
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300'
                          }`}
                        >
                          {index === 0 && <FaCheck className="text-xs md:text-sm" />}
                          {index === 1 && <FaSpinner className={`text-xs md:text-sm ${selectedOrder.status === 'processing' ? 'animate-spin' : ''}`} />}
                          {index === 2 && <FaTruck className="text-xs md:text-sm" />}
                          {index === 3 && <FaBox className="text-xs md:text-sm" />}
                        </div>
                        <p className="text-xs mt-2 text-gray-600 text-center">{step}</p>
                        {selectedOrder.status === 'completed' && index === 3 && (
                          <span className="mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full mt-4">
                    <div
                      className={`absolute h-2 bg-green-500 rounded-full ${
                        selectedOrder.status === 'pending'
                          ? 'w-1/4'
                          : selectedOrder.status === 'processing'
                          ? 'w-2/4'
                          : selectedOrder.status === 'shipped'
                          ? 'w-3/4'
                          : selectedOrder.status === 'delivered' || selectedOrder.status === 'completed'
                          ? 'w-full'
                          : 'w-0'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Order Items - Responsive layout */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Order Items</h3>
                  <div className="space-y-3 md:space-y-4">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 md:space-x-4 p-2 border border-gray-100 rounded-lg">
                        <img
                          src={item.image || 'https://via.placeholder.com/80'}
                          alt={item.name}
                          className="w-12 h-12 md:w-16 md:h-16 object-cover rounded"
                          onError={(e) => (e.target.src = 'https://via.placeholder.com/80?text=Product')}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm md:text-base truncate">{item.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs md:text-sm text-gray-500">
                            <p>Qty: {item.quantity}</p>
                            <p>Price: ₱{parseFloat(item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <p className="font-bold text-gray-800 text-sm md:text-base whitespace-nowrap">
                          ₱{parseFloat((item.price || 0) * (item.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Information - Collapsible on mobile */}
                <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 md:mb-4">Shipping Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Name</p>
                      <p className="font-medium text-gray-800 text-sm md:text-base">
                        {selectedOrder.shipping?.firstName} {selectedOrder.shipping?.lastName}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Contact</p>
                      <p className="font-medium text-gray-800 text-sm md:text-base">{selectedOrder.shipping?.phone}</p>
                      <p className="font-medium text-gray-600 text-xs md:text-sm truncate">{selectedOrder.shipping?.email}</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <p className="text-gray-500 text-xs md:text-sm">Complete Address</p>
                      <p className="font-medium text-gray-800 text-sm md:text-base">
                        {selectedOrder.shipping?.address}, 
                        {selectedOrder.shipping?.city}, 
                        {selectedOrder.shipping?.province}, 
                        {selectedOrder.shipping?.postalCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Details - Simplified for mobile */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 md:mb-4">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Payment Method</p>
                      <p className="font-medium text-gray-800 text-sm md:text-base capitalize">{selectedOrder.payment?.method || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Payment Status</p>
                      <p
                        className={`font-medium text-sm md:text-base ${
                          selectedOrder.payment?.status === 'paid'
                            ? 'text-green-600'
                            : selectedOrder.payment?.status === 'pending'
                            ? 'text-yellow-600'
                            : selectedOrder.payment?.status === 'failed'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {selectedOrder.payment?.status?.toUpperCase() || 'Not paid'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Summary - Compact for mobile */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 md:mb-4">Order Summary</h3>
                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₱{(selectedOrder.summary?.subtotal || 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">Tax (12%):</span>
                      <span className="font-medium">₱{(selectedOrder.summary?.tax || 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">₱{(selectedOrder.summary?.shipping || 150).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2"></div>
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>Total:</span>
                      <span>₱{(selectedOrder.summary?.total || 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Select an order to view details</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 md:mt-8 flex flex-col md:flex-row md:justify-end gap-3 md:gap-4 px-4">
          <Link to="/products" className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center">
            Continue Shopping
          </Link>
          <Link to="/" className="px-4 py-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;