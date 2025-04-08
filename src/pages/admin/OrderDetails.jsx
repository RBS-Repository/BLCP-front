import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { 
  FaSpinner, 
  FaCheck, 
  FaTruck, 
  FaBox, 
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaCopy,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaInfoCircle,
  FaUser
} from 'react-icons/fa';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const OrderDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const navigate = useNavigate();

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);

  const initialOrder = location.state?.order;

  useEffect(() => {
    const fetchOrderData = async () => {
      if (initialOrder) {
        setOrderData(initialOrder);
        setTrackingNumber(initialOrder.trackingNumber || '');
        setLoading(false);
        return;
      }

      if (!id) {
        navigate('/admin/orders');
        return;
      }

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(`/api/orders/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch order details');

        const data = await response.json();
        setOrderData(data);
        setTrackingNumber(data.trackingNumber || '');
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id, initialOrder, navigate, user]);

  const updateOrderStatus = async (newStatus) => {
    if (!orderData?._id) return;

    try {
      setStatusLoading(true);
      setStatusError(null);
      
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/${orderData._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        let errorData;
        try {
          // Try to parse error response
          errorData = await response.json();
        } catch (err) {
          // If parsing fails, use generic error
          throw new Error(`Failed to update order status (${response.status})`);
        }
        // Use specific error message from server
        throw new Error(errorData.error || errorData.message || `Server error (${response.status})`);
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);
      toast.success(`Order status updated to ${newStatus}`);
      
      // Create a notification in Firestore for the customer
      const customerId = orderData.userId || orderData.user?.uid || orderData.user || orderData.customer || 
                        orderData.shipping?.userId || orderData.shipping?.email;

      if (customerId) {
        try {
          // Format a user-friendly status message
          const statusMessages = {
            'pending': 'Your order is pending review.',
            'processing': 'We\'re now processing your order.',
            'shipped': 'Great news! Your order has been shipped.',
            'delivered': 'Your order has been delivered.',
            'completed': 'Your order is now complete. Thank you for shopping with us!',
            'cancelled': 'Your order has been cancelled.'
          };
          
          const message = statusMessages[newStatus] || `Your order status was updated to ${newStatus}.`;
          
          console.log('Creating notification for user:', customerId);
          
          // Create notification document
          await addDoc(collection(db, 'notifications'), {
            userId: customerId,
            type: 'order',
            title: `Order Status Update: ${newStatus.toUpperCase()}`,
            message: message,
            orderId: orderData._id,
            read: false,
            createdAt: serverTimestamp(),
            data: {
              orderNumber: orderData.orderNumber || orderData._id,
              status: newStatus,
              previousStatus: orderData.status
            }
          });
          
          console.log('Notification successfully sent to customer about order status update');
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          console.error('Notification data:', {
            userId: customerId,
            orderId: orderData._id,
            status: newStatus
          });
        }
      } else {
        console.warn('Could not find user ID for order notification:', orderData);
      }
    } catch (error) {
      console.error('Status update error:', error);
      setStatusError(error.message);
      toast.error(error.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const updateTrackingNumber = async () => {
    if (!orderData?._id) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/orders/${orderData._id}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ trackingNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update tracking number');
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);
      setIsTrackingModalOpen(false);
      toast.success('Tracking number updated successfully');
    } catch (error) {
      console.error('Error updating tracking number:', error);
      toast.error('Failed to update tracking number');
    } finally {
      setActionLoading(false);
    }
  };

  const issueRefund = async () => {
    if (!orderData?._id) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/orders/${orderData._id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: refundAmount, reason: refundReason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to issue refund');
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);
      setIsRefundModalOpen(false);
      toast.success(`Refund of ₱${refundAmount.toLocaleString()} issued successfully`);
    } catch (error) {
      console.error('Error issuing refund:', error);
      toast.error('Failed to issue refund');
    } finally {
      setActionLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!orderData?._id) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/orders/${orderData._id}/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to resend confirmation');
      }

      setIsConfirmationModalOpen(false);
      toast.success('Order confirmation email resent successfully');
    } catch (error) {
      console.error('Error resending confirmation:', error);
      toast.error('Failed to resend confirmation email');
    } finally {
      setActionLoading(false);
    }
  };

  const updatePaymentStatus = async (newStatus) => {
    if (!orderData?._id) return;

    try {
      setPaymentStatusLoading(true);
      setStatusError(null);
      const token = await user.getIdToken();
      
      // Fix: Use the environment variable for the API URL
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      
      const response = await axios.patch(
        `${apiUrl}/orders/${orderData._id}/payment-status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data || !response.data.payment) {
        throw new Error('Invalid response from server');
      }

      setOrderData((prev) => ({
        ...prev,
        payment: { ...prev.payment, status: response.data.payment.status },
        status: response.data.status || prev.status,
      }));

      // Dispatch a custom event to notify other components that orders have been updated
      window.dispatchEvent(
        new CustomEvent('orders-updated', { detail: { updatedOrderId: orderData._id } })
      );
      
      // Force refresh the dashboard data
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      
      toast.success(`Payment status updated to ${newStatus.toUpperCase()}`);
      
      // Add a notice about the sales data being updated
      if (newStatus === 'paid') {
        toast.success('Sales data has been updated', {
          icon: '📊',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Payment status update error:', error);
      setStatusError(error.response?.data?.error || error.message);
      toast.error(error.response?.data?.error || 'Failed to update payment status');
    } finally {
      setPaymentStatusLoading(false);
    }
  };

  const TrackingNumberModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all">
        <div className="flex items-center mb-4">
          <FaTruck className="text-blue-500 mr-2" size={20} />
          <h3 className="text-xl font-semibold text-gray-900">Update Tracking Number</h3>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter tracking number"
          />
          <p className="text-xs text-gray-500">Enter the shipping carrier's tracking number</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => setIsTrackingModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center"
            onClick={updateTrackingNumber}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </span>
            ) : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );

  const RefundModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
          </svg>
          <h3 className="text-xl font-semibold text-gray-900">Issue Refund</h3>
        </div>
        
        <div className="p-3 mb-4 bg-orange-50 border border-orange-100 rounded-md">
          <p className="text-sm text-orange-700">
            Issuing a refund will not automatically update inventory or order status. 
            Make sure to take appropriate actions after processing the refund.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (₱)</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="0.00"
            />
          <div className="flex justify-between mt-2">
            <span 
              className="text-xs text-blue-600 cursor-pointer hover:underline"
              onClick={() => setRefundAmount(summary.total / 4)}
            >
              25% (₱{(summary.total / 4).toFixed(2)})
            </span>
            <span 
              className="text-xs text-blue-600 cursor-pointer hover:underline"
              onClick={() => setRefundAmount(summary.total / 2)}
            >
              50% (₱{(summary.total / 2).toFixed(2)})
            </span>
            <span 
              className="text-xs text-blue-600 cursor-pointer hover:underline"
              onClick={() => setRefundAmount(summary.total)}
            >
              Full (₱{summary.total.toFixed(2)})
            </span>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund</label>
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            rows="3"
            placeholder="Enter reason for refund..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => setIsRefundModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-center"
            onClick={issueRefund}
            disabled={actionLoading || !refundAmount || !refundReason}
          >
            {actionLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : 'Issue Refund'}
          </button>
        </div>
      </div>
    </div>
  );

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all">
        <div className="flex items-center mb-4">
          <FaEnvelope className="text-green-500 mr-2" size={20} />
          <h3 className="text-xl font-semibold text-gray-900">Resend Order Confirmation</h3>
        </div>
        <div className="p-4 mb-4 bg-blue-50 border border-blue-100 rounded-md flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
          <p className="text-sm text-blue-700">
            This will send a new copy of the order confirmation email to <strong>{orderData.shipping?.email}</strong>. The customer will receive all order details again.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => setIsConfirmationModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center justify-center"
            onClick={resendConfirmation}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : 'Resend Email'}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16 bg-gray-100">
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            Order not found.{' '}
            <button onClick={() => navigate('/admin/orders')} className="underline">
                Return to orders
              </button>
          </div>
        </div>
      </div>
    );
  }

  const calculateSummary = () => {
    if (!orderData) return { subtotal: 0, tax: 0, shippingFee: 0, total: 0 };
    
    // Use existing summary if available
    if (orderData.summary) {
      return {
        subtotal: orderData.summary.subtotal || 0,
        tax: orderData.summary.tax || 0,
        shippingFee: orderData.summary.shipping || 0,
        total: orderData.summary.total || 0
      };
    }
    
    // Calculate from items if summary doesn't exist
    const calculatedSubtotal = (orderData.items || []).reduce((sum, item) => {
      const price = item?.price || 0;
      const quantity = item?.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    const calculatedTax = calculatedSubtotal * 0.12;
    const calculatedShippingFee = 150; // Default shipping fee
    const calculatedTotal = calculatedSubtotal + calculatedTax + calculatedShippingFee;
    
    return {
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      shippingFee: calculatedShippingFee,
      total: calculatedTotal
    };
  };

  const summary = calculateSummary();

  const paymentMethodMap = {
    gcash: 'GCash',
    grab_pay: 'GrabPay',
    maya: 'Maya',
    card: 'Credit/Debit Card',
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-16 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <button
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center transition-colors"
            onClick={() => navigate('/admin/orders')}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Orders
                  </button>
              </div>
              
          {/* Order Header - Modernized with gradient background and enhanced status badge */}
          <div className="bg-gradient-to-r from-white to-blue-50 rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center">
              <div>
                  <div className="flex items-center">
                <h2 className="text-3xl font-bold text-gray-900">Order #{orderData._id}</h2>
                  <button 
                      onClick={() => {
                        navigator.clipboard.writeText(orderData._id);
                        toast.success('Order ID copied to clipboard');
                      }}
                      className="ml-2 text-gray-400 hover:text-blue-500 focus:outline-none transition-colors"
                      title="Copy Order ID"
                    >
                      <FaCopy size={18} />
                  </button>
                </div>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <FaCalendarAlt className="mr-2" />
                    <span>{new Date(orderData.createdAt).toLocaleString('en-US', {
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                </div>
              </div>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
                  orderData.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : orderData.status === 'delivered'
                    ? 'bg-blue-100 text-blue-800'
                    : orderData.status === 'shipped'
                    ? 'bg-indigo-100 text-indigo-800'
                    : orderData.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : orderData.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}
                >
                {/* Status icon based on current status */}
                {orderData.status === 'completed' && <FaCheck className="mr-2" />}
                {orderData.status === 'delivered' && <FaCheck className="mr-2" />}
                {orderData.status === 'shipped' && <FaTruck className="mr-2" />}
                {orderData.status === 'processing' && <FaBox className="mr-2" />}
                {orderData.status === 'pending' && <FaClock className="mr-2" />}
                {orderData.status === 'cancelled' && (
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {orderData.status.toUpperCase()}
                </div>
                </div>
              </div>

            {/* Customer and Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <FaUser className="text-blue-500 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
              </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                    {orderData.shipping.firstName?.charAt(0)}{orderData.shipping.lastName?.charAt(0)}
                      </div>
                  <p className="text-gray-900 font-medium text-lg">
                          {orderData.shipping.firstName} {orderData.shipping.lastName}
                        </p>
                      </div>
                <div className="ml-1 space-y-2">
                      <div className="flex items-center text-gray-600">
                        <FaEnvelope className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Email: </span>
                    <span className="ml-1 font-medium">{orderData.shipping.email}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                    <FaPhone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Phone: </span>
                    <span className="ml-1 font-medium">{orderData.shipping.phone}</span>
                      </div>
                    </div>
                  </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <FaInfoCircle className="text-blue-500 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Order Information</h3>
              </div>
                  <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <FaCalendarAlt className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Date: </span>
                  <span className="ml-1 font-medium">{new Date(orderData.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                    </div>
                <div className="flex items-center text-gray-600">
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${
                      orderData.status === 'completed' ? 'bg-green-500' :
                      orderData.status === 'delivered' ? 'bg-blue-500' :
                      orderData.status === 'shipped' ? 'bg-indigo-500' :
                      orderData.status === 'processing' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                      </div>
                  <span>Status: </span>
                  <span className="ml-1 font-medium">{orderData.status.toUpperCase()}</span>
                    </div>
                <div className="flex items-center text-gray-600">
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${
                      orderData.payment.status === 'paid' ? 'bg-green-500' :
                      orderData.payment.status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                      </div>
                  <span>Payment Status: </span>
                  <span className={`ml-1 font-medium ${
                    orderData.payment.status === 'paid' ? 'text-green-600' :
                    orderData.payment.status === 'pending' ? 'text-yellow-600' :
                    'text-gray-900'
                }`}>
                  {orderData.payment.status.toUpperCase()}
                </span>
                    </div>
                    {orderData.trackingNumber && (
                  <div className="flex items-center text-gray-600">
                    <FaTruck className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Tracking #: </span>
                    <span className="ml-1 font-medium text-blue-600">{orderData.trackingNumber}</span>
                  </div>
                )}
              </div>
                    </div>
                      </div>

          {/* Payment Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
            <div className="flex items-center mb-4">
              <FaMoneyBillWave className="text-green-500 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500 mb-2">Payment Method</p>
                        <div className="flex items-center">
                  {orderData.payment.method === 'gcash' && (
                    <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">G</span>
                        </div>
                  )}
                  {orderData.payment.method === 'grab_pay' && (
                    <div className="w-10 h-10 bg-green-100 rounded-md flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">G</span>
                      </div>
                    )}
                  {orderData.payment.method === 'maya' && (
                    <div className="w-10 h-10 bg-purple-100 rounded-md flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-bold">M</span>
                  </div>
                  )}
                  {orderData.payment.method === 'card' && (
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                      <FaCreditCard className="text-gray-600" />
                    </div>
                  )}
                <p className="text-gray-900 font-medium">
                  {paymentMethodMap[orderData.payment.method] || 'Not specified'}
                </p>
                    </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500 mb-2">Payment Status</p>
                <div className="flex items-center">
                  <div className={`h-8 px-3 rounded-full flex items-center justify-center ${
                  orderData.payment.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                          : orderData.payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      orderData.payment.status === 'paid' 
                        ? 'bg-green-500' 
                        : orderData.payment.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}></div>
                  {orderData.payment.status.toUpperCase()}
                      </div>
                    </div>
              </div>
            </div>
            {orderData.payment.transactionId && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                <p className="text-gray-900 font-mono">{orderData.payment.transactionId}</p>
              </div>
            )}
              </div>

              {/* Order Items */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
            <div className="flex items-center mb-4">
              <FaBox className="text-indigo-500 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 rounded-tl-lg">Product</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Quantity</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 rounded-tr-lg">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderData.items.map((item, index) => {
                        // Handle cases where product data might be missing
                        const productInfo = item.product || {};
                        const productName = productInfo.name || item.name || 'Product Name Unavailable';
                        const productImage = productInfo.image || item.image || '/placeholder.png';
                        const price = item.price || 0;
                        const quantity = item.quantity || 0;
                        
                        return (
                      <tr 
                        key={index} 
                        className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
                      >
                            <td className="py-4 px-4">
                              <div className="flex items-center">
                            <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 flex-shrink-0 bg-white shadow-sm mr-4">
                                  <img
                                    src={productImage}
                                    alt={productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/placeholder.png';
                                    }}
                                  />
                                </div>
                                <div>
                              <span className="text-gray-900 font-medium">{productName}</span>
                              {item.variant && (
                                <p className="text-xs text-gray-500 mt-1">{item.variant}</p>
                              )}
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-4 px-4">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 
                            bg-gray-100 text-gray-800 rounded-full font-medium">
                                {quantity}
                              </span>
                            </td>
                        <td className="text-right py-4 px-4 text-gray-600 font-medium">₱{price.toLocaleString()}</td>
                        <td className="text-right py-4 px-4 text-gray-900 font-semibold">
                              ₱{(price * quantity).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                  <tr className="bg-gray-50 font-medium text-gray-900">
                    <td colSpan="3" className="text-right py-3 px-4">Total Items:</td>
                    <td className="text-right py-3 px-4">
                      {orderData.items.reduce((total, item) => total + (item.quantity || 0), 0)} items
                    </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
            </div>

          {/* Cost Breakdown */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Cost Breakdown</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₱{summary.subtotal.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
                    </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tax (12%):</span>
                <span className="font-medium">₱{summary.tax.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">₱{summary.shippingFee.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between font-semibold text-gray-800">
                <span>Total:</span>
                <span>₱{summary.total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
                    </div>
                  </div>
                  
          {/* Shipping Information Panel */}
          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow mb-6 overflow-hidden">
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center">
                <FaMapMarkerAlt className="text-red-500 mr-2" size={18} />
              <h2 className="text-lg font-medium text-gray-800">Shipping Information</h2>
              </div>
                      </div>
                      
            <div className="p-5 space-y-5">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <FaUser className="text-blue-500" size={18} />
                  </div>
                      <div>
                    <p className="text-sm text-blue-600 font-medium mb-1">Recipient</p>
                <p className="text-lg font-semibold">
                  {orderData.shipping?.firstName} {orderData.shipping?.lastName}
                </p>
                      </div>
                    </div>
                  </div>
                  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      <FaPhone className="text-gray-500" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Contact Phone</p>
                      <p className="text-base font-medium">{orderData.shipping?.phone || 'N/A'}</p>
                    </div>
                    </div>
                  </div>
                  
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      <FaEnvelope className="text-gray-500" size={16} />
                    </div>
                      <div>
                      <p className="text-sm text-gray-500 mb-1">Email Address</p>
                      <p className="text-base font-medium">{orderData.shipping?.email || 'N/A'}</p>
                  </div>
                </div>
                    </div>
                  </div>
                  
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <FaMapMarkerAlt className="text-gray-500" size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-2">Complete Address</p>
                    <div className="p-3 bg-white border border-gray-200 rounded-md font-medium">
                      <p className="text-base">
                        {orderData.shipping?.address}
                      </p>
                      <p className="text-base mt-1">
                        {orderData.shipping?.city}, {orderData.shipping?.province}, {orderData.shipping?.postalCode}
                      </p>
                    </div>
                  
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div>
                        <p className="text-xs text-gray-500 mb-1">Province</p>
                        <p className="text-sm font-medium">{orderData.shipping?.province || 'N/A'}</p>
                  </div>
                
                    <div>
                        <p className="text-xs text-gray-500 mb-1">City</p>
                        <p className="text-sm font-medium">{orderData.shipping?.city || 'N/A'}</p>
                </div>
                
                <div>
                        <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                        <p className="text-sm font-medium">{orderData.shipping?.postalCode || 'N/A'}</p>
                  </div>
                    </div>
                    </div>
                </div>
                    </div>
                    </div>
                </div>

          {/* Refund History */}
          {orderData.refunds && orderData.refunds.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Refund History</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.refunds.map((refund, index) => (
                    <tr key={index} className="border-b border-gray-200 last:border-b-0">
                      <td className="py-4 text-gray-600">
                        {new Date(refund.date).toLocaleDateString()}
                      </td>
                      <td className="text-right py-4 text-gray-600">
                        ₱{refund.amount.toLocaleString()}
                      </td>
                      <td className="py-4 text-gray-600">{refund.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  </div>
                )}
              
              {/* Status Update */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Update Order Status</h3>
            </div>

                {statusError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {statusError}
                  </div>
                )}
                
                  {/* Order Status Timeline */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute left-0 top-0 ml-4 h-full w-0.5 bg-gray-200"></div>
                
                <div className="flex items-center mb-8 relative">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    orderData.status === 'pending' || orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <FaCheck size={12} />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Pending</p>
                    <p className="text-sm text-gray-500">Order received and pending processing</p>
                  </div>
                </div>
                
                <div className="flex items-center mb-8 relative">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <FaBox size={12} />
                        </div>
                  <div className="ml-4">
                    <p className="font-medium">Processing</p>
                    <p className="text-sm text-gray-500">Order is being prepared</p>
                  </div>
                </div>
                
                <div className="flex items-center mb-8 relative">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <FaTruck size={12} />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Shipped</p>
                    <p className="text-sm text-gray-500">Order is on its way</p>
                  </div>
                </div>
                
                <div className="flex items-center mb-8 relative">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Delivered</p>
                    <p className="text-sm text-gray-500">Order has been delivered</p>
                  </div>
                </div>
                
                <div className="flex items-center relative">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <FaCheck size={12} />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Completed</p>
                    <p className="text-sm text-gray-500">Order has been completed</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="mb-3 text-sm font-medium text-gray-700">Update order to status:</p>
            <div className="flex flex-wrap gap-2">
              {['pending', 'processing', 'shipped', 'delivered', 'completed'].map((status) => (
                <button
                  key={status}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    orderData.status === status
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow focus:ring-2 focus:ring-blue-300'
                                }`}
                                onClick={() => updateOrderStatus(status)}
                  disabled={orderData.status === status || statusLoading}
                >
                    {statusLoading && orderData.status !== status ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    )}
                </button>
              ))}
                          </div>
                        </div>
                      </div>

          {/* Payment Status */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
            <div className="flex items-center mb-4">
              <FaMoneyBillWave className="text-green-500 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                </div>
            
            {statusError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {statusError}
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Current Status:</span>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                  orderData.payment.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                    : orderData.payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      orderData.payment.status === 'paid' 
                        ? 'bg-green-500' 
                        : orderData.payment.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}></div>
                  {orderData.payment.status.toUpperCase()}
                  </div>
                </div>
                
                <div className="flex gap-3">
              {orderData.payment.status !== 'paid' && (
                <button
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center w-full md:w-auto"
                  onClick={() => updatePaymentStatus('paid')}
                  disabled={paymentStatusLoading}
                >
                      {paymentStatusLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </span>
                      ) : (
                        <>
                          <FaCheck className="mr-2" size={14} />
                          Mark as Paid
                        </>
                      )}
                </button>
              )}
              {orderData.payment.status === 'paid' && (
                <button
                      className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-md hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center w-full md:w-auto"
                  onClick={() => updatePaymentStatus('pending')}
                  disabled={paymentStatusLoading}
                >
                      {paymentStatusLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </span>
                      ) : (
                        <>
                          <FaClock className="mr-2" size={14} />
                          Mark as Pending
                        </>
                      )}
                </button>
                            )}
                </div>
            </div>
          </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
              </div>
                <div>
                  <p className="text-sm text-blue-700">Check Paymongo for payment status before marking the order as <strong>Paid</strong>. This action updates sales data and impacts financial reports and cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6 mb-6">
     
          </div>
        </div>
      </div>

      {/* Modals */}
      {isTrackingModalOpen && <TrackingNumberModal />}
      {isRefundModalOpen && <RefundModal />}
      {isConfirmationModalOpen && <ConfirmationModal />}
    </div>
  );
};

export default OrderDetails;