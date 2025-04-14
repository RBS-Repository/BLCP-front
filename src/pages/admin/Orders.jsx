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
    // Show loading indicator with progress bar
    Swal.fire({
      title: 'Generating PDF Report',
      html: `
        <div class="space-y-4">
          <div class="flex items-center justify-center">
            <svg class="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p class="text-sm text-gray-600">Please wait while we prepare your orders report...</p>
          <div class="w-full h-2 bg-gray-200 rounded-full">
            <div class="h-full bg-indigo-600 rounded-full animate-pulse" style="width: 75%"></div>
          </div>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false
    });

    try {
      // Create PDF document with enhanced styling
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20; // Initial y position

      // Add title with gradient styling (simulated with multiple lines)
      doc.setFillColor(63, 81, 181); // Indigo/Blue
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BLCP Orders Report', pageWidth / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 25;

      // Add application logo or branding
      // If you have a logo, you could add it here
      // doc.addImage('logo.png', 'PNG', margin, y, 40, 15);
      // y += 20;

      // Add active filters information with enhanced styling
      if (statusFilter || searchQuery || startDate || endDate) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(73, 80, 87);
        doc.setFillColor(240, 242, 245);
        doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
        doc.text('Applied Filters:', margin + 3, y + 2);
        y += 12;

        doc.setFont('helvetica', 'normal');
        const filters = [];
        if (statusFilter) filters.push(`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`);
        if (searchQuery) filters.push(`Search: "${searchQuery}"`);
        if (startDate) filters.push(`From: ${format(new Date(startDate), 'MMM d, yyyy')}`);
        if (endDate) filters.push(`To: ${format(new Date(endDate), 'MMM d, yyyy')}`);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        filters.forEach(filter => {
          doc.circle(margin + 3, y - 1, 1, 'F');
          doc.text(filter, margin + 7, y);
          y += 6;
        });
        y += 7;
      }

      // Calculate totals for the summary
      const totalAmount = orders.reduce((sum, order) => sum + (order.summary?.total || 0), 0);
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Add summary section with colored boxes
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 5, pageWidth - (margin * 2), 40, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(73, 80, 87);
      doc.setFontSize(12);
      doc.text('Summary', margin + 3, y + 2);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Orders: ${orders.length}`, margin + 5, y);
      y += 5;
      doc.text(`Total Revenue: ₱${totalAmount.toLocaleString('en-PH')}`, margin + 5, y);
      y += 5;
      
      // Add status counts with colored indicators
      Object.entries(statusCounts).forEach(([status, count], index) => {
        let statusColor;
        switch(status) {
          case 'completed': statusColor = [34, 197, 94]; break; // green-500
          case 'processing': statusColor = [59, 130, 246]; break; // blue-500
          case 'shipped': statusColor = [168, 85, 247]; break; // purple-500
          case 'delivered': statusColor = [20, 184, 166]; break; // teal-500
          case 'cancelled': statusColor = [239, 68, 68]; break; // red-500
          default: statusColor = [234, 179, 8]; break; // yellow-500
        }
        
        doc.setFillColor(...statusColor);
        doc.circle(margin + 5, y - 1, 1.5, 'F');
        doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} order${count !== 1 ? 's' : ''}`, margin + 10, y);
        y += 5;
      });
      
      y += 15;

      // Create orders table with enhanced styling
      const tableData = orders.map(order => [
        order._id?.substring(0, 8) || 'N/A',
        order.customerName || 'Guest',
        format(new Date(order.createdAt), 'MMM d, yyyy'),
        `₱${order.summary?.total?.toLocaleString('en-PH') || '0'}`,
        order.status.charAt(0).toUpperCase() + order.status.slice(1),
        order.payment?.status?.charAt(0).toUpperCase() + order.payment?.status?.slice(1) || 'N/A'
      ]);

      // Add table to PDF with enhanced styling
      autoTable(doc, {
        startY: y,
        head: [['Order ID', 'Customer', 'Date', 'Total', 'Status', 'Payment']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [63, 81, 181], 
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 25, font: 'helvetica' },
          1: { cellWidth: 35, font: 'helvetica' },
          2: { cellWidth: 25, font: 'helvetica' },
          3: { cellWidth: 25, font: 'helvetica', halign: 'right' },
          4: { cellWidth: 25, font: 'helvetica' },
          5: { cellWidth: 25, font: 'helvetica' }
        },
        margin: { left: margin, right: margin },
        styles: { 
          overflow: 'linebreak', 
          fontSize: 9,
          cellPadding: 4,
          lineColor: [220, 220, 220]
        },
        bodyStyles: {
          lineWidth: 0.1
        }
      });

      // Add page footer with pagination and branding
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer with gradient
        doc.setFillColor(240, 242, 245);
        doc.rect(0, 275, pageWidth, 22, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
        
        // Add brand name on the left
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(63, 81, 181);
        doc.text('BLCP Orders Report', margin, 285);
        
        // Add date on the right
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${format(new Date(), 'yyyy-MM-dd')}`, pageWidth - margin, 285, { align: 'right' });
      }

      // Save PDF with improved naming
      const filename = `BLCP_Orders_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);

      // Show success message with download info
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated Successfully!',
        html: `
          <div class="text-left p-3 bg-gray-50 rounded-lg mt-3 mb-2 text-sm">
            <p>Your orders report has been saved as:</p>
            <p class="font-medium text-blue-600 mt-1">${filename}</p>
          </div>
          <p class="text-sm text-gray-600 mt-3">You can find it in your default downloads folder.</p>
        `,
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Great!'
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      Swal.fire({
        icon: 'error',
        title: 'PDF Generation Failed',
        text: 'There was an error creating your PDF report. Please try again.',
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Try Again'
      });
    }
  };

  return (
    <div className="flex min-h-screen mr-32">
      <AdminSidebar />
      
      <div className="flex-1 p-6 ml-16 transition-all duration-300">
        {/* Enhanced Header Section */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
                Orders
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {orders.length}
                </span>
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded"></div>
            </div>
            
            {/* Export to PDF button with gradient */}
            <motion.button
              onClick={generatePDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export to PDF
            </motion.button>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order number, customer name or email..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-label="Search orders"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <button type="submit" className="sr-only">Search</button>
                </form>
              </div>
              
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700 transition-colors"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                aria-expanded={showFilters}
                aria-label="Toggle filters"
              >
                <FunnelIcon className="h-5 w-5" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
                {(statusFilter || searchQuery || startDate || endDate) && (
                  <span className="ml-1 bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 text-xs">
                    {[
                      statusFilter && 1,
                      searchQuery && 1,
                      startDate && 1,
                      endDate && 1
                    ].filter(Boolean).length}
                  </span>
                )}
              </motion.button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-lg border border-gray-100"
              >
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    aria-label="Filter by order status"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending" className="text-yellow-600">Pending</option>
                    <option value="processing" className="text-blue-600">Processing</option>
                    <option value="shipped" className="text-purple-600">Shipped</option>
                    <option value="delivered" className="text-teal-600">Delivered</option>
                    <option value="completed" className="text-green-600">Completed</option>
                    <option value="cancelled" className="text-red-600">Cancelled</option>
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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        dateFormat="MMMM d, yyyy"
                        isClearable
                        aria-label="Start date filter"
                      />
                      <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <div className="relative">
                      <DatePicker
                        selected={endDate ? new Date(endDate) : null}
                        onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        placeholderText="Select end date"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        dateFormat="MMMM d, yyyy"
                        isClearable
                        minDate={startDate ? new Date(startDate) : null}
                        aria-label="End date filter"
                      />
                      <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <motion.button
                    onClick={clearFilters}
                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    aria-label="Clear all filters"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Clear Filters
                  </motion.button>
                  <motion.button
                    onClick={fetchOrders}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 flex items-center gap-1.5"
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    aria-label="Apply filters and search"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    Apply Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Active Filters Tags */}
          {(statusFilter || searchQuery || startDate || endDate) && (
            <div className="px-5 pb-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500 mr-1">Active filters:</span>
              
              {statusFilter && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <button 
                    onClick={() => setStatusFilter('')}
                    className="ml-1.5 text-indigo-500 hover:text-indigo-700"
                    aria-label={`Remove ${statusFilter} status filter`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              
              {searchQuery && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  Search: "{searchQuery}"
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-1.5 text-blue-500 hover:text-blue-700"
                    aria-label="Remove search query filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              
              {startDate && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  From: {format(new Date(startDate), 'MMM d, yyyy')}
                  <button 
                    onClick={() => setStartDate('')}
                    className="ml-1.5 text-green-500 hover:text-green-700"
                    aria-label="Remove start date filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              
              {endDate && (
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                  To: {format(new Date(endDate), 'MMM d, yyyy')}
                  <button 
                    onClick={() => setEndDate('')}
                    className="ml-1.5 text-purple-500 hover:text-purple-700"
                    aria-label="Remove end date filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              
              <button 
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 ml-2 flex items-center gap-1 hover:underline"
                aria-label="Clear all filters"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <div className="flex justify-end gap-4 mb-6">
          <motion.button 
            onClick={fetchOrders}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:from-blue-600 hover:to-indigo-700 flex items-center gap-2"
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            aria-label="Refresh order list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Orders
          </motion.button>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-100">
          {loading ? (
            <div className="flex flex-col justify-center items-center p-12">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-indigo-100 border-t-indigo-500 animate-spin"></div>
                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-2 border-transparent border-b-blue-500 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
              </div>
              <span className="mt-4 text-gray-600 font-medium">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <svg 
                className="w-16 h-16 mx-auto text-gray-300 mb-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <p className="text-gray-500 mb-4 text-lg">No orders found matching your filters</p>
              {(statusFilter || searchQuery || startDate || endDate) && (
                <motion.button 
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear filters
                </motion.button>
              )}
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 uppercase text-xs">
                    <th scope="col" className="px-6 py-4 text-left font-semibold tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-semibold tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-semibold tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-semibold tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-semibold tracking-wider">
                      Payment Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-semibold tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <motion.tr 
                      key={order._id} 
                      className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800 group flex items-center">
                          <span className="truncate max-w-[140px]" title={order._id}>{order._id}</span>
                          <span className="ml-1 invisible group-hover:visible">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs uppercase">
                            {order.customerName.charAt(0)}
                          </span>
                          <span>{order.customerName}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-9">
                          {order.shipping?.email || 'No email provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-indigo-700">
                          ₱{order.summary?.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-teal-100 text-teal-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            order.status === 'completed' ? 'bg-green-500' :
                            order.status === 'processing' ? 'bg-blue-500' :
                            order.status === 'shipped' ? 'bg-purple-500' :
                            order.status === 'delivered' ? 'bg-teal-500' :
                            order.status === 'cancelled' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`}></span>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center rounded-full text-xs font-medium ${
                          order.payment?.status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment?.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            order.payment?.status === 'paid' ? 'bg-green-500' :
                            order.payment?.status === 'failed' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`}></span>
                          {order.payment?.status.charAt(0).toUpperCase() + order.payment?.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row md:justify-end">
                        <motion.button
                          onClick={() => {
                            if (order._id) {
                              setSelectedOrder(order);
                              setShowViewModal(true);
                            }
                          }}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </motion.button>
                        <motion.button
                          onClick={() => handleProcessOrder(order)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Process
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteOrder(order._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <Modal 
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="xlarge"
        >
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  Order Details <span className="ml-2 text-sm opacity-80">#{selectedOrder._id}</span>
                </h3>
                <span className={`px-3 py-1 inline-flex items-center rounded-full text-xs font-medium bg-opacity-20 bg-white ${
                  selectedOrder.status === 'completed' ? 'text-green-100' :
                  selectedOrder.status === 'processing' ? 'text-blue-100' :
                  selectedOrder.status === 'shipped' ? 'text-purple-100' :
                  selectedOrder.status === 'delivered' ? 'text-teal-100' :
                  selectedOrder.status === 'cancelled' ? 'text-red-100' :
                  'text-yellow-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    selectedOrder.status === 'completed' ? 'bg-green-300' :
                    selectedOrder.status === 'processing' ? 'bg-blue-300' :
                    selectedOrder.status === 'shipped' ? 'bg-purple-300' :
                    selectedOrder.status === 'delivered' ? 'bg-teal-300' :
                    selectedOrder.status === 'cancelled' ? 'bg-red-300' :
                    'bg-yellow-300'
                  }`}></span>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <OrderDetailsModal order={selectedOrder} />
              <div className="mt-6 flex justify-end">
                <motion.button
                  onClick={() => setShowViewModal(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 flex items-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </motion.button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {initialError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-6 rounded-lg shadow-sm" role="alert">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-red-800">Order Submission Failed</h3>
              <p className="text-red-700 mt-1">{initialError.message}</p>
              
              {initialError.validationError && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-1">Validation Errors:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-red-700">
                    {Object.values(initialError.validationError).map((err, index) => (
                      <li key={index}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-3 bg-white bg-opacity-60 p-3 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1">Order Information:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="ml-2 font-medium">{initialError.orderData.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-medium text-indigo-700">₱{initialError.orderData.total.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Items:</span>
                    <span className="ml-2 font-medium">{initialError.orderData.items.length} product{initialError.orderData.items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <motion.button 
                  onClick={() => setInitialError(null)} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;