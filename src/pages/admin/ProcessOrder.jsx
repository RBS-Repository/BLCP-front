import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';

const ProcessOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState({
    status: 'Processing',
    trackingNumber: '',
    notificationMessage: '',
    sendEmail: true
  });

  // Mock order data - replace with actual API call
  useEffect(() => {
    const fetchOrder = async () => {
      // Simulated API call
      setTimeout(() => {
        setOrder({
          id: '#ORD-001',
          customer: 'Sarah Smith',
          items: 3,
          total: '₱12,500',
          status: 'Pending',
          paymentStatus: 'Paid'
        });
      }, 500);
    };
    fetchOrder();
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Processing order:', formData);
    navigate(`/admin/orders/${id}`);
  };

  if (!order) return <div className="text-center py-8">Loading order...</div>;

  return (
    <div className="flex min-h-screen mr-32">
      <AdminSidebar />
      
      <div className="flex-1 p-6 ml-16 transition-all duration-300">
        <div className="max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">asdadsProcasdeasdOrder {order.id}</h1>
            <p className="text-gray-600">Customer: {order.customer}</p>
          </header>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              {/* Order Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Tracking Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tracking number"
                />
              </div>

              {/* Customer Notification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Message
                </label>
                <textarea
                  value={formData.notificationMessage}
                  onChange={(e) => setFormData({...formData, notificationMessage: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Add update message for customer..."
                ></textarea>
              </div>

              {/* Email Notification */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendEmail}
                  onChange={(e) => setFormData({...formData, sendEmail: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Send email notification to customer
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Update Order
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProcessOrder; 