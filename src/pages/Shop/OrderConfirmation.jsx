import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaBox, FaShippingFast, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaFileInvoice, FaTimes } from 'react-icons/fa';
import { MdPayment, MdInfo } from 'react-icons/md';
import '../../styles/OrderConfirmation.css';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(true);

  // Show temporary payment notification when component mounts
  useEffect(() => {
    toast(
      <div className="flex items-center">
        <MdInfo className="text-blue-600 mr-2 text-lg" />
        <span>
          <strong>Note:</strong> Manual payment is a temporary process. Online payment options will be available soon.
        </span>
      </div>,
      {
        duration: 6000,
        style: {
          borderRadius: '10px',
          background: '#EFF6FF',
          color: '#1E40AF',
          border: '1px solid #BFDBFE',
          padding: '16px',
        },
      }
    );
  }, []);

  // Get order details from location state or fetch from API
  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      try {
        if (location.state?.order) {
          setOrder(location.state.order);
          setLoading(false);
          return;
        }

        if (!orderId || !user) {
          setError('Order information not found');
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();
        const response = await api.get(`/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          setOrder(response.data);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
        toast.error('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, user, location.state]);

  if (loading) {
    return (
      <div className="order-confirmation-page">
        <div className="container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-confirmation-page">
        <div className="container">
          <div className="error-container">
            <h2>Order Not Found</h2>
            <p>{error || 'Unable to retrieve order information'}</p>
            <Link to="/products" className="primary-button">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="order-confirmation-page">
      {/* Temporary Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="temporary-payment-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button 
                className="modal-close-button"
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>
              <div className="modal-icon">
                <MdInfo />
              </div>
              <h3>Important Payment Information</h3>
              <p>
                The manual payment process is <strong>temporary</strong>. We're currently working on implementing online payment options to provide you with a more convenient shopping experience.
              </p>
              <p>
                Our team will contact you shortly with payment instructions via email or phone.
              </p>
              <button 
                className="modal-button"
                onClick={() => setShowModal(false)}
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container">
        <motion.div 
          className="confirmation-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h1>Thank You for Your Order!</h1>
          <p className="confirmation-message">
            Your order has been received and is being processed. You will receive an email confirmation shortly.
          </p>
        </motion.div>

        <motion.div 
          className="order-info-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="order-info-header">
            <h2>Order Information</h2>
            <span className="order-status">{order.status}</span>
          </div>
          <div className="order-details-grid">
            <div className="order-detail">
              <span className="detail-label">Order ID:{order._id}</span>
            </div>
            <div className="order-detail">
              <span className="detail-label">Order Date:</span>
              <span className="detail-value">{formatDate(order.createdAt)}</span>
            </div>
            <div className="order-detail">
              <span className="detail-label">Customer Name:</span>
              <span className="detail-value">{order.customerName}</span>
            </div>
            <div className="order-detail">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{order.shipping?.email}</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="payment-info-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="card-header">
            <MdPayment className="card-icon" />
            <h2>Payment Information</h2>
          </div>
          <div className="payment-status">
            <div className="status-badge pending">Payment Pending</div>
          </div>
          <div className="manual-payment-info">
            <h3>Manual Payment Instructions</h3>
            <p>Your order has been received and is pending payment. Our team will contact you shortly with payment instructions via email or phone.</p>
            <div className="temporary-notice">
              <MdInfo className="notice-icon" />
              <p>This manual payment process is temporary. We're working on implementing online payment options for a more convenient experience.</p>
            </div>
            <div className="payment-amount">
              <span>Total Amount Due:</span>
              <span className="amount">₱{order.summary?.total.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          </div>
        </motion.div>

        <div className="two-column-grid">
          <motion.div 
            className="shipping-info-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="card-header">
              <FaShippingFast className="card-icon" />
              <h2>Shipping Information</h2>
            </div>
            <div className="shipping-details">
              <div className="shipping-detail">
                <FaMapMarkerAlt className="detail-icon" />
                <div>
                  <h4>Delivery Address</h4>
                  <p>{order.shipping?.fullAddress}</p>
                </div>
              </div>
              <div className="shipping-detail">
                <FaPhoneAlt className="detail-icon" />
                <div>
                  <h4>Contact Number</h4>
                  <p>{order.shipping?.phone}</p>
                </div>
              </div>
              <div className="shipping-detail">
                <FaEnvelope className="detail-icon" />
                <div>
                  <h4>Email</h4>
                  <p>{order.shipping?.email}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="order-summary-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="card-header">
              <FaFileInvoice className="card-icon" />
              <h2>Order Summary</h2>
            </div>
            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₱{order.summary?.subtotal.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="summary-row">
                <span>Tax (12%)</span>
                <span>₱{order.summary?.tax.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>₱{order.summary?.shipping.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              {order.summary?.rewardDiscount > 0 && (
                <div className="summary-row discount">
                  <span>Reward Discount</span>
                  <span>-₱{order.summary.rewardDiscount.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
              )}
              <div className="summary-total">
                <span>Total</span>
                <span>₱{order.summary?.total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="order-items-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="card-header">
            <FaBox className="card-icon" />
            <h2>Order Items</h2>
            <span className="item-count">{order.items?.length || 0} items</span>
          </div>
          <div className="order-items-list">
            {order.items?.map((item, index) => (
              <div className="order-item" key={index}>
                <img 
                  src={item.image || 'https://via.placeholder.com/100'} 
                  alt={item.name} 
                  className="item-image"
                />
                <div className="item-details">
                  <h4 className="item-name">{item.name}</h4>
                  {item.variationDisplay && (
                    <p className="item-variation">Variation: {item.variationDisplay}</p>
                  )}
                  <div className="item-meta">
                    <span className="item-quantity">Qty: {item.quantity}</span>
                    <span className="item-price">₱{Number(item.price).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                </div>
                <div className="item-subtotal">
                  <span>₱{Number(item.subtotal || (item.price * item.quantity)).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="action-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Link to="/products" className="primary-button">
            Continue Shopping
          </Link>
          {user ? (
            <Link to="/order-history" className="secondary-button">
              View All Orders
            </Link>
          ) : (
            <Link to="/login" className="secondary-button">
              Sign In to View Your Orders
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmation; 