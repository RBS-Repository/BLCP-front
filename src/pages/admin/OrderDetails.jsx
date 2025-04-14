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
  FaUser,
  FaArrowLeft,
  FaChevronDown,
  FaChevronUp
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

  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
  const [collapseOrderItems, setCollapseOrderItems] = useState(false);
  const [collapseRefundHistory, setCollapseRefundHistory] = useState(false);

  const initialOrder = location.state?.order;

  useEffect(() => {
    const fetchOrderData = async () => {
      if (initialOrder) {
        setOrderData(initialOrder);
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
          errorData = await response.json();
        } catch (err) {
          throw new Error(`Failed to update order status (${response.status})`);
        }
        throw new Error(errorData.error || errorData.message || `Server error (${response.status})`);
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);
      toast.success(`Order status updated to ${newStatus}`);
      
      const customerId = orderData.userId || orderData.user?.uid || orderData.user || orderData.customer || 
                        orderData.shipping?.userId || orderData.shipping?.email;

      if (customerId) {
        try {
          const statusMessages = {
            'pending': 'Your order is pending review.',
            'processing': 'We\'re now processing your order.',
            'shipped': 'Great news! Your order has been shipped.',
            'delivered': 'Your order has been delivered.',
            'completed': 'Your order is now complete. Thank you for shopping with us!',
            'cancelled': 'Your order has been cancelled.'
          };
          
          const message = statusMessages[newStatus] || `Your order status was updated to ${newStatus}.`;
          
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
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Status update error:', error);
      setStatusError(error.message);
      toast.error(error.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const updatePaymentStatus = async (newStatus) => {
    if (!orderData?._id) return;

    try {
      setPaymentStatusLoading(true);
      setStatusError(null);
      const token = await user.getIdToken();
      
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

      window.dispatchEvent(
        new CustomEvent('orders-updated', { detail: { updatedOrderId: orderData._id } })
      );
      
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      
      toast.success(`Payment status updated to ${newStatus.toUpperCase()}`);
      
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

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-opacity-75"></div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 ml-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-100 p-6 rounded-xl shadow-sm text-red-700 flex items-center">
              <FaInfoCircle className="text-red-500 mr-3 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-lg mb-1">Order not found</h3>
                <p>We couldn't locate the order you're looking for.</p>
                <button 
                  onClick={() => navigate('/admin/orders')} 
                  className="mt-3 inline-flex items-center text-red-600 font-medium hover:text-red-800 transition-colors"
                >
                  <FaArrowLeft className="mr-2" size={14} />
                Return to orders
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const calculateSummary = () => {
    if (!orderData) return { subtotal: 0, tax: 0, shippingFee: 0, total: 0 };
    
    if (orderData.summary) {
      return {
        subtotal: orderData.summary.subtotal || 0,
        tax: orderData.summary.tax || 0,
        shippingFee: orderData.summary.shipping || 0,
        total: orderData.summary.total || 0
      };
    }
    
    const calculatedSubtotal = (orderData.items || []).reduce((sum, item) => {
      const price = item?.price || 0;
      const quantity = item?.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    const calculatedTax = calculatedSubtotal * 0.12;
    const calculatedShippingFee = 150;
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
      <div className="flex-1 p-6 ml-16 bg-gradient-to-br from-gray-50 to-gray-100 relative">
        <div className="max-w-6xl mx-auto pb-24">
          {/* Back Button */}
          <div className="mb-6">
            <button
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center transition-colors"
            onClick={() => navigate('/admin/orders')}
          >
              <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
                  </button>
              </div>
              
          {/* Enhanced Order Header */}
          <div className="bg-white rounded-xl p-6 mb-6 border border-blue-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center">
              <div>
                  <div className="flex items-center">
                <h2 className="text-3xl font-bold text-gray-900">Order #{orderData._id}</h2>
                  <button 
                      onClick={() => {
                        navigator.clipboard.writeText(orderData._id);
                        toast.success('Order ID copied to clipboard');
                      }}
                      className="ml-2 text-gray-400 hover:text-blue-500 focus:outline-none transition-colors focus:ring-2 focus:ring-blue-400 rounded-full p-1"
                      title="Copy Order ID"
                      aria-label="Copy Order ID"
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
                  orderData.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                  orderData.status === 'delivered' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                  orderData.status === 'shipped' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' :
                  orderData.status === 'processing' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                  orderData.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                  'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}
              >
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
                {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
                </div>
                </div>
            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="text-lg font-semibold text-gray-900 truncate">{orderData._id}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className={`text-lg font-semibold ${
                  orderData.status === 'completed' ? 'text-green-600' :
                  orderData.status === 'delivered' ? 'text-blue-600' :
                  orderData.status === 'shipped' ? 'text-indigo-600' :
                  orderData.status === 'processing' ? 'text-yellow-600' :
                  orderData.status === 'pending' ? 'text-gray-600' :
                  'text-red-600'
                }`}>
                  {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
                        </p>
                      </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <p className="text-lg font-semibold text-gray-900">₱{summary.total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
                      </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="text-lg font-semibold text-gray-900 truncate">{orderData.shipping.firstName} {orderData.shipping.lastName}</p>
              </div>
                    </div>
                      </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - 2/3 width on desktop */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                    <FaBox className="text-blue-600 mr-2" size={20} />
                    <h3 className="text-xl font-semibold text-gray-900">Order Items</h3>
                        </div>
                  <button 
                    className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                    onClick={() => setCollapseOrderItems(!collapseOrderItems)}
                    aria-label={collapseOrderItems ? "Expand order items" : "Collapse order items"}
                  >
                    {collapseOrderItems ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                  </button>
              </div>

                {!collapseOrderItems && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50 rounded-tl-lg">Product</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50">Quantity</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50 rounded-tr-lg">Price</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50 rounded-tr-lg">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderData.items.map((item, index) => {
                        const productInfo = item.product || {};
                        const productName = productInfo.name || item.name || 'Product Name Unavailable';
                        const productImage = productInfo.image || item.image || '/placeholder.png';
                        const price = item.price || 0;
                        const quantity = item.quantity || 0;
                        
                        return (
                      <tr 
                        key={index} 
                              className={`hover:bg-blue-50 transition-colors ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
                      >
                              <td className="py-4 px-4 border-b border-gray-100">
                              <div className="flex items-center">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white shadow-sm mr-4">
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
                                    <span className="text-gray-900 font-medium block mb-1">{productName}</span>
                              {item.variant && (
                                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">{item.variant}</p>
                              )}
                                </div>
                              </div>
                            </td>
                              <td className="text-center py-4 px-4 border-b border-gray-100">
                                <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-3 
                                  bg-blue-100 text-blue-800 rounded-full font-medium">
                                {quantity}
                              </span>
                            </td>
                              <td className="text-right py-4 px-4 text-gray-600 font-medium border-b border-gray-100">
                                ₱{price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="text-right py-4 px-4 text-gray-900 font-semibold border-b border-gray-100">
                                ₱{(price * quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                  <tr className="bg-gray-50 font-medium text-gray-900">
                          <td colSpan="2" className="text-left py-4 px-4 rounded-bl-lg">
                            <span className="text-sm text-gray-500">
                              Total Items: <span className="font-medium text-gray-900">{orderData.items.length}</span>
                            </span>
                          </td>
                          <td className="text-right py-4 px-4 text-sm font-medium text-gray-500">Total:</td>
                          <td className="text-right py-4 px-4 text-lg font-bold text-blue-600 rounded-br-lg">
                            ₱{summary.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                )}
            </div>

              {/* Cost Breakdown card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FaMoneyBillWave className="text-green-500 mr-2" size={18} />
                  Cost Breakdown
                </h3>
                
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">₱{summary.subtotal.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tax (12%)</span>
                      <span className="font-medium text-gray-900">₱{summary.tax.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium text-gray-900">₱{summary.shippingFee.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
                    
              <div className="h-px bg-gray-200 my-2"></div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-blue-600">₱{summary.total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
                    </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start">
                      <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full mr-2">
                        <FaCreditCard className="mr-1" size={10} />
                        {paymentMethodMap[orderData.payment.method] || 'Payment Method'}
                  </div>
                  
                      <div className={`flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                        orderData.payment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          orderData.payment.status === 'paid' 
                            ? 'bg-green-500' 
                            : 'bg-yellow-500'
                        }`}></div>
                        {orderData.payment.status === 'paid' ? 'Paid' : 'Pending Payment'}
                      </div>
                    </div>
                  </div>
              </div>
                      </div>
                      
              {/* Shipping Information card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <FaMapMarkerAlt className="text-red-500 mr-2" size={20} />
                  <h3 className="text-xl font-semibold text-gray-900">Shipping Information</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100 flex items-start">
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-red-500 flex-shrink-0 mr-4 border border-red-100">
                      <FaUser size={18} />
                  </div>
                      <div>
                      <p className="text-sm text-red-600 font-medium mb-1">Recipient</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {orderData.shipping.firstName} {orderData.shipping.lastName}
                      </p>
                    </div>
                  </div>
                  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3">
                          <FaPhone size={14} />
                    </div>
                    <div>
                          <p className="text-xs text-gray-500 mb-1">Contact Phone</p>
                          <p className="font-medium">{orderData.shipping.phone || 'Not provided'}</p>
                    </div>
                    </div>
                  </div>
                  
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3">
                          <FaEnvelope size={14} />
                    </div>
                      <div>
                          <p className="text-xs text-gray-500 mb-1">Email Address</p>
                          <p className="font-medium">{orderData.shipping.email || 'Not provided'}</p>
                  </div>
                </div>
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <p className="text-sm font-medium text-gray-700 mb-3">Complete Address</p>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-start">
                        <FaMapMarkerAlt className="text-red-500 mt-1 mr-3 flex-shrink-0" size={18} />
                        <div>
                          <p className="text-gray-900 font-medium">{orderData.shipping.address}</p>
                          <p className="text-gray-600 mt-1">
                            {orderData.shipping.city}, {orderData.shipping.province}, {orderData.shipping.postalCode}
                          </p>
                        </div>
                    </div>
                  
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                        <p className="text-xs text-gray-500 mb-1">Province</p>
                          <p className="text-sm font-medium">{orderData.shipping.province || 'N/A'}</p>
                  </div>
                
                    <div>
                        <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="text-sm font-medium">{orderData.shipping.city || 'N/A'}</p>
                </div>
                
                <div>
                        <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                          <p className="text-sm font-medium">{orderData.shipping.postalCode || 'N/A'}</p>
                  </div>
                    </div>
                    </div>
                </div>
                  
                  {orderData.trackingNumber && (
                    <div className="mt-4">
                      <div className="flex items-center bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                        <FaTruck className="text-blue-500 mr-3" size={18} />
                        <div>
                          <p className="text-xs text-blue-500 mb-1">Tracking Number</p>
                          <p className="font-medium flex items-center">
                            {orderData.trackingNumber}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(orderData.trackingNumber);
                                toast.success('Tracking number copied to clipboard');
                              }}
                              className="ml-2 text-blue-500 hover:text-blue-700"
                              aria-label="Copy tracking number"
                            >
                              <FaCopy size={14} />
                            </button>
                          </p>
                    </div>
                      </div>
                    </div>
                  )}
                    </div>
                </div>

              {/* Refund History (conditionally rendered) */}
          {orderData.refunds && orderData.refunds.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Refund History</h3>
                    <button 
                      className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                      onClick={() => setCollapseRefundHistory(!collapseRefundHistory)}
                      aria-label={collapseRefundHistory ? "Expand refund history" : "Collapse refund history"}
                    >
                      {collapseRefundHistory ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                    </button>
                  </div>
                  
                  {!collapseRefundHistory && (
                    <div>
                      {/* Placeholder for refund history content */}
                  </div>
                )}
                </div>
              )}
            </div>
            
            {/* Right column - 1/3 width on desktop */}
            <div className="space-y-6">
              {/* Customer Information card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
                  <FaUser className="text-blue-600 mr-2" size={20} />
                  <h3 className="text-xl font-semibold text-gray-900">Customer Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-semibold text-lg mr-4 shadow-sm">
                      {orderData.shipping.firstName?.charAt(0)}{orderData.shipping.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-lg">
                        {orderData.shipping.firstName} {orderData.shipping.lastName}
                      </p>
                      <p className="text-sm text-gray-500">Customer</p>
                    </div>
                  </div>
                  
                  <div className="pl-2 space-y-3 mt-3">
                    <div className="flex items-center text-gray-700 hover:text-blue-600 group transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-500 mr-3 transition-colors">
                        <FaEnvelope size={14} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">Email</p>
                        <p className="font-medium truncate">{orderData.shipping.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-700 hover:text-blue-600 group transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-500 mr-3 transition-colors">
                        <FaPhone size={14} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">Phone</p>
                        <p className="font-medium">{orderData.shipping.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-700 hover:text-blue-600 group transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-500 mr-3 transition-colors">
                        <FaCalendarAlt size={14} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">Order Date</p>
                        <p className="font-medium">{new Date(orderData.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Information card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <FaMoneyBillWave className="text-green-500 mr-2" size={20} />
                  <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Payment Method</p>
                      <div className="flex items-center">
                        {orderData.payment.method === 'gcash' && (
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                            G
                          </div>
                        )}
                        {orderData.payment.method === 'grab_pay' && (
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                            G
                          </div>
                        )}
                        {orderData.payment.method === 'maya' && (
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                            M
                          </div>
                        )}
                        {orderData.payment.method === 'card' && (
                          <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-white mr-3 shadow-sm">
                            <FaCreditCard />
                          </div>
                        )}
                        <div>
                          <p className="text-lg font-semibold text-gray-900">
                            {paymentMethodMap[orderData.payment.method] || 'Not specified'}
                          </p>
                          {orderData.payment.method === 'card' && orderData.payment.cardBrand && (
                            <p className="text-sm text-gray-500">{orderData.payment.cardBrand}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Payment Status</p>
                      <div className="flex items-center">
                        <div className={`h-10 px-4 rounded-lg flex items-center justify-center shadow-sm ${
                          orderData.payment.status === 'paid' 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                            : orderData.payment.status === 'pending'
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            orderData.payment.status === 'paid' 
                              ? 'bg-white' 
                              : orderData.payment.status === 'pending'
                              ? 'bg-white'
                              : 'bg-white'
                          }`}></div>
                          <span className="font-medium">
                            {orderData.payment.status === 'paid' ? 'Paid' : 'Pending Payment'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {orderData.payment.transactionId && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
                      <p className="text-sm text-blue-500 mb-1">Transaction ID</p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-mono text-sm truncate max-w-[80%]">
                          {orderData.payment.transactionId}
                        </p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(orderData.payment.transactionId);
                            toast.success('Transaction ID copied');
                          }}
                          className="text-blue-500 hover:text-blue-700 p-1 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                          aria-label="Copy Transaction ID"
                        >
                          <FaCopy size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start">
                    <FaInfoCircle className="text-gray-400 mt-0.5 mr-2 flex-shrink-0" size={14} />
                    <p className="text-xs text-gray-500">
                      {orderData.payment.status === 'paid' 
                        ? 'Payment was successfully processed and verified.' 
                        : 'Awaiting payment confirmation.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Order Status card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
                  <h3 className="text-xl font-semibold text-gray-900">Order Status</h3>
            </div>

                {statusError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {statusError}
                  </div>
                )}
                
                  {/* Order Status Timeline */}
                <div className="mb-6 relative overflow-hidden pl-5 pr-2" style={{ zIndex: 0 }}>
                  <div className="absolute left-[9px] top-0 bottom-0 w-1 bg-gray-200 z-0"></div>
                
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'pending' || orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          orderData.status === 'pending' || orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}></div>
                  </div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'pending' ? 'text-blue-600' : 'text-gray-900'
                        }`}>Pending</p>
                    <p className="text-sm text-gray-500">Order received and pending processing</p>
                  </div>
                </div>
                
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}></div>
                        </div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'processing' ? 'text-blue-600' : 'text-gray-900'
                        }`}>Processing</p>
                        <p className="text-sm text-gray-500">Order is being prepared for shipping</p>
                  </div>
                </div>
                
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}></div>
                  </div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'shipped' ? 'text-blue-600' : 'text-gray-900'
                        }`}>Shipped</p>
                        <p className="text-sm text-gray-500">Order is on its way to the customer</p>
                  </div>
                </div>
                
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'delivered' || orderData.status === 'completed' || orderData.status === 'cancelled'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          orderData.status === 'delivered' || orderData.status === 'completed' || orderData.status === 'cancelled'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}></div>
                  </div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'delivered' ? 'text-blue-600' : 'text-gray-900'
                        }`}>Delivered</p>
                        <p className="text-sm text-gray-500">Order has been delivered to the customer</p>
                  </div>
                </div>
                
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'cancelled'
                      ? 'bg-red-100 border-red-500 text-red-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          orderData.status === 'cancelled'
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                        }`}></div>
                  </div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'cancelled' ? 'text-red-600' : 'text-gray-900'
                        }`}>Cancelled</p>
                        <p className="text-sm text-gray-500">Order has been cancelled</p>
                      </div>
                    </div>
                
                    <div className="flex items-start group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-transform group-hover:scale-110 ${
                    orderData.status === 'completed'
                      ? 'bg-green-100 border-green-500 text-green-500'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}></div>
                      <div>
                        <p className={`font-medium ${
                          orderData.status === 'completed' ? 'text-blue-600' : 'text-gray-900'
                        }`}>Completed</p>
                        <p className="text-sm text-gray-500">Order has been completed</p>
                      </div>
                    </div>
                          </div>
                        </div>
                      </div>

              {/* Payment Status card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
                  <FaCreditCard className="text-purple-500 mr-2" size={20} />
                  <h3 className="text-xl font-semibold text-gray-900">Payment Status</h3>
                </div>
            
            {statusError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {statusError}
              </div>
            )}
            
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Current Status:</span>
                      <div className={`h-8 px-4 rounded-full flex items-center justify-center ${
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
                        {orderData.payment.status === 'paid' ? 'Paid' : 'Pending Payment'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
              {orderData.payment.status !== 'paid' && (
                <button
                      className="py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
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
                      className="py-2.5 px-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
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

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium block mb-1">Important:</span>
                      Check Paymongo for payment status before marking the order as <strong>Paid</strong>. This action updates sales data and impacts financial reports.
                    </p>
              </div>
                </div>
                </div>
              </div>
            </div>
          </div>

        {/* Sticky Action Bar */}
        <div className="fixed bottom-0 left-16 right-0 bg-white border-t border-gray-200 shadow-lg py-3 px-6 transition-all" index={9999}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Update Order Status:
          </div>
              <div className="flex gap-2" style={{ zIndex: 9999 }}>
                {['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center ${
                      orderData.status === status
                        ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                        : status === 'cancelled'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow focus:ring-2 focus:ring-red-300 focus:ring-opacity-50'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50'
                    }`}
                    onClick={() => updateOrderStatus(status)}
                    disabled={orderData.status === status || statusLoading}
                    style={{ zIndex: 9999 }}
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
                      <>
                        {status === 'pending' && <FaClock className="mr-2" size={14} />}
                        {status === 'processing' && <FaSpinner className="mr-2" size={14} />}
                        {status === 'shipped' && <FaTruck className="mr-2" size={14} />}
                        {status === 'delivered' && <FaBox className="mr-2" size={14} />}
                        {status === 'completed' && <FaCheck className="mr-2" size={14} />}
                        {status === 'cancelled' && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </>
                    )}
                  </button>
                ))}
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;