import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { toast } from 'react-hot-toast';
import OrderDetailsModal from '../../components/orders/OrderDetailsModal';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, CalendarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const [initialError, setInitialError] = useState(null);
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      // Log the actual URL being requested for debugging
      const requestUrl = `${import.meta.env.VITE_API_BASE_URL}/orders?${params.toString()}`;
      
      const token = await user.getIdToken();
      const response = await fetch(requestUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid orders data');
      
      // If backend filtering isn't working, implement client-side filtering as fallback
      let filteredOrders = data;
      
      // Apply client-side filtering as a fallback if it seems the API isn't filtering
      if (data.length > 0 && (statusFilter || searchQuery || startDate || endDate)) {
        console.log('Applying client-side filtering as fallback');
        
        filteredOrders = data.filter(order => {
          // Status filter
          if (statusFilter && order.status !== statusFilter) {
            return false;
          }
          
          // Search filter (case insensitive)
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const customerName = (order.customerName || 
              `${order.shipping?.firstName || ''} ${order.shipping?.lastName || ''}`.trim()).toLowerCase();
            const orderId = (order._id || '').toLowerCase();
            const orderNumber = (order.orderNumber || '').toLowerCase();
            const email = (order.shipping?.email || '').toLowerCase();
            
            if (!customerName.includes(query) && 
                !orderId.includes(query) && 
                !orderNumber.includes(query) && 
                !email.includes(query)) {
              return false;
            }
          }
          
          // Date filters
          if (startDate || endDate) {
            const orderDate = new Date(order.createdAt);
            
            if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              if (orderDate < start) return false;
            }
            
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (orderDate > end) return false;
            }
          }
          
          return true;
        });
        
        console.log(`Filtered from ${data.length} to ${filteredOrders.length} orders client-side`);
      }
      
      // Map and set the filtered orders
      setOrders(filteredOrders.map(order => ({
        ...order,
        customerName: order.customerName || 
          `${order.shipping?.firstName || ''} ${order.shipping?.lastName || ''}`.trim() || 
          'Guest Customer'
      })));
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connect = () => {
      const ws = new WebSocket('ws://localhost:5000/ws/orders');
      
      ws.onopen = () => {
        setWs(ws);
      };
      
      ws.onmessage = (event) => {
        // Handle incoming messages
        const data = JSON.parse(event.data);
        if (data.type === 'order-update') {
          setOrders(prev => [data.data, ...prev]);
        }
      };
      
      ws.onclose = (event) => {
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * (2 ** reconnectAttempts), 5000);
          setTimeout(connect, delay);
          reconnectAttempts++;
        }
      };
      
      ws.onerror = (error) => {
      };
    };
    
    connect();
    return () => ws?.close();
  }, []);

  useEffect(() => {
    const handleOrdersUpdate = () => {
      fetchOrders();
    };

    window.addEventListener('orders-updated', handleOrdersUpdate);
    return () => window.removeEventListener('orders-updated', handleOrdersUpdate);
  }, [fetchOrders]);

  useEffect(() => {
    const handleNewOrder = () => {
      fetchOrders();
    };

    window.addEventListener('new-order', handleNewOrder);
    return () => window.removeEventListener('new-order', handleNewOrder);
  }, [fetchOrders]);

  useEffect(() => {
    if (location.state?.error) {
      setInitialError(location.state.error);
      // Clear the state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (err) {
    }
  };

  const handleProcessOrder = (order) => {
    navigate(`/admin/orders/${order._id}`, {
      state: { 
        order: {
          ...order,
          items: order.items.map(item => ({
            ...item,
            product: item.product || {}
          }))
        } 
      }
    });
  };

  const checkOrderExists = async (orderId) => {
    try {
      // Try to get the order directly instead of using a separate check endpoint
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const orders = await response.json();
      // Check if the order exists in the list
      return orders.some(order => order._id === orderId);
    } catch (err) {
      return false;
    }
  };

  const handleDeleteOrder = async (orderId) => {
    console.log('Attempting to delete order with ID:', orderId);
    
    if (orderId.length !== 24) {
      toast.error('Invalid order ID format');
      return;
    }
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const token = await user.getIdToken();
        
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/${orderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
          
          throw new Error(errorData.error || 'Failed to delete order');
        }

        setOrders(prev => prev.filter(order => order._id !== orderId));
        toast.success('Order deleted successfully');
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  // Add this function to test the API directly
  const testOrderAPI = async () => {
    try {
      const token = await user.getIdToken();
      
      // Test GET request first
      const testResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (testResponse.ok) {
      } else {
      }
    } catch (err) {
    }
  };

  // Call this in useEffect
  useEffect(() => {
    testOrderAPI();
  }, [user]);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to generate PDF report
  const generatePDF = async () => {
    // Show loading indicator
    Swal.fire({
      title: 'Generating PDF',
      html: 'Please wait while we prepare your orders report...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20; // Initial y position

      // Add title and date
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text('Orders Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 20;

      // Add active filters information if any
      if (statusFilter || searchQuery || startDate || endDate) {
        doc.setFontSize(12);
        doc.setTextColor(73, 80, 87);
        doc.text('Applied Filters:', margin, y);
        y += 7;

        const filters = [];
        if (statusFilter) filters.push(`Status: ${statusFilter}`);
        if (searchQuery) filters.push(`Search: "${searchQuery}"`);
        if (startDate) filters.push(`From: ${startDate}`);
        if (endDate) filters.push(`To: ${endDate}`);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        filters.forEach(filter => {
          doc.text(`• ${filter}`, margin + 5, y);
          y += 6;
        });
        y += 5;
      }

      // Create orders table
      const tableData = orders.map(order => [
        order._id?.substring(0, 8) || 'N/A',
        order.customerName || 'Guest',
        format(new Date(order.createdAt), 'MMM d, yyyy'),
        `₱${order.summary?.total?.toLocaleString('en-PH') || '0'}`,
        order.status.charAt(0).toUpperCase() + order.status.slice(1),
        order.payment?.status || 'N/A'
      ]);

      // Add table to PDF
      autoTable(doc, {
        startY: y,
        head: [['Order ID', 'Customer', 'Date', 'Total', 'Status', 'Payment']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [63, 81, 181], 
          textColor: 255,
          fontStyle: 'bold' 
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: margin, right: margin },
        styles: { overflow: 'linebreak', cellWidth: 'auto' },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });

      // Add summary text
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      doc.setTextColor(73, 80, 87);
      doc.text(`Total Orders: ${orders.length}`, margin, finalY);

      // Count orders by status
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Add status summary
      let statusY = finalY + 7;
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} orders`, margin + 10, statusY);
        statusY += 6;
      });

      // Add page footer with pagination
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        doc.text('BLCP Orders Report', margin, 290);
        doc.text(`${format(new Date(), 'yyyy-MM-dd')}`, pageWidth - margin, 290, { align: 'right' });
      }

      // Save PDF
      doc.save(`BLCP_Orders_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Your orders report has been successfully created.',
        confirmButtonColor: '#4F46E5'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate PDF report. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  };

  return (
    <div className="flex min-h-screen mr-32">
      <AdminSidebar />
      
      <div className="flex-1 p-6 ml-16 transition-all duration-300">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
            
            {/* Add Export to PDF button */}
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export to PDF
            </button>
          </div>
        </header>

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order number, customer name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <button type="submit" className="sr-only">Search</button>
              </form>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700"
            >
              <FunnelIcon className="h-5 w-5" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg"
            >
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Filters with Calendar Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <div className="relative">
                    <DatePicker
                      selected={startDate ? new Date(startDate) : null}
                      onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      placeholderText="Select start date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      dateFormat="MMMM d, yyyy"
                      isClearable
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <div className="relative">
                    <DatePicker
                      selected={endDate ? new Date(endDate) : null}
                      onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      placeholderText="Select end date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      dateFormat="MMMM d, yyyy"
                      isClearable
                      minDate={startDate ? new Date(startDate) : null}
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
                <button
                  onClick={fetchOrders}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Active Filters Tags */}
        {(statusFilter || searchQuery || startDate || endDate) && (
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500">Active filters:</span>
            
            {statusFilter && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Status: {statusFilter}
                <button 
                  onClick={() => setStatusFilter('')}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {searchQuery && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Search: "{searchQuery}"
                <button 
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {startDate && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                From: {startDate}
                <button 
                  onClick={() => setStartDate('')}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {endDate && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                To: {endDate}
                <button 
                  onClick={() => setEndDate('')}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            <button 
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800 ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Manual Refresh Button */}
        <div className="flex justify-end gap-4 mb-6">
          <button 
            onClick={fetchOrders}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Refresh Orders
          </button>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No orders found matching your filters</p>
              {(statusFilter || searchQuery || startDate || endDate) && (
                <button 
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order._id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.shipping?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₱{order.summary?.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.payment?.status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.payment?.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment?.status.charAt(0).toUpperCase() + order.payment?.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          if (order._id) {
                            setSelectedOrder(order);
                            setShowViewModal(true);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleProcessOrder(order)}
                        className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Process
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order._id)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedOrder && (
        <Modal 
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="xlarge"
        >
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <OrderDetailsModal order={selectedOrder} />
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {initialError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <h3 className="font-bold">⚠️ Order Submission Failed</h3>
          <p>{initialError.message}</p>
          {initialError.validationError && (
            <div className="mt-2">
              {Object.values(initialError.validationError).map((err, index) => (
                <p key={index} className="text-sm">{err.message}</p>
              ))}
            </div>
          )}
          <div className="mt-2 text-sm">
            <p>Customer: {initialError.orderData.customerName}</p>
            <p>Total: ₱{initialError.orderData.total.toLocaleString()}</p>
            <p>Items: {initialError.orderData.items.length} products</p>
          </div>
          <button 
            onClick={() => setInitialError(null)} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders;