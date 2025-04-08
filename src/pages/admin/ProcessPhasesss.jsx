import { useParams } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';

const OrderDetails = () => {
  const { id } = useParams();
  // Fetch order details based on ID (you'll need to implement this)
  const order = {
    id: '#ORD-001',
    customer: 'Sarah Smith',
    email: 'sarah@example.com',
    phone: '0912-345-6789',
    date: '2024-03-15',
    total: '₱12,500',
    status: 'Completed',
    paymentStatus: 'Paid',
    items: [
      { product: 'Facial Cleanser', quantity: 2, price: '₱2,500' },
      { product: 'Vitamin C Serum', quantity: 1, price: '₱7,500' }
    ],
    shippingAddress: '123 Main St, Manila, Philippines',
    shippingMethod: 'Standard',
    shippingProvider: 'LBC',
    trackingNumber: 'LBC123456789',
    paymentMethod: 'Credit Card',
    subtotal: '₱10,000',
    discount: '₱500',
    tax: '₱1,200',
    shippingFee: '₱800',
    notes: 'Please include a gift receipt'
  };

  return (
    <div className="flex min-h-screen mr-32">
      <AdminSidebar />
      
      <div className="flex-1 p-6 ml-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Order Detasddsdails</h1>
            <p className="text-gray-600">Order ID: {order.id}</p>
          </header>

          {/* Order Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Customer Informadssadation</h3>
                <p className="text-gray-700">{order.customer}</p>
                <p className="text-gray-700">Email: {order.email}</p>
                <p className="text-gray-700">Phone: {order.phone}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Order Information</h3>
                <p className="text-gray-700">Date: {order.date}</p>
                <p className="text-gray-700">Status: 
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </p>
                <p className="text-gray-700">Payment Status: 
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.product}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.price}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">₱{(parseInt(item.price.replace(/[^0-9]/g, '')) * item.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shipping and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Shipping Information</h3>
              <p className="text-gray-700">{order.shippingAddress}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
              <p className="text-gray-700">Method: {order.paymentMethod}</p>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-700">Method: {order.shippingMethod}</p>
                <p className="text-gray-700">Provider: {order.shippingProvider}</p>
              </div>
              <div>
                <p className="text-gray-700">Tracking Number: {order.trackingNumber}</p>
                <p className="text-gray-700">Address: {order.shippingAddress}</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-gray-700">Subtotal</p>
                <p className="text-gray-700">{order.subtotal}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-700">Discount</p>
                <p className="text-red-600">-{order.discount}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-700">Tax</p>
                <p className="text-gray-700">{order.tax}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-700">Shipping Fee</p>
                <p className="text-gray-700">{order.shippingFee}</p>
              </div>
              <div className="flex justify-between border-t pt-2">
                <p className="text-lg font-semibold">Grand Total</p>
                <p className="text-lg font-semibold">{order.total}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Order Notes</h3>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-4 mt-6">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => console.log('Change Order Status')}
            >
              Change Order Status
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => console.log('Update Tracking Number')}
            >
              Update Tracking Number
            </button>
            <button
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
              onClick={() => console.log('Issue Refund')}
            >
              Issue Refund
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              onClick={() => console.log('Resend Order Confirmation Email')}
            >
              Resend Order Confirmation Email
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              onClick={() => console.log('Cancel Order')}
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails; 