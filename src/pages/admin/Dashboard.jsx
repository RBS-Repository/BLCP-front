import { useState, useEffect } from 'react';
import '../../styles/admin/Dashboard.css';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { CalendarIcon, ChartBarIcon, CurrencyDollarIcon, ClockIcon, UserGroupIcon, CheckCircleIcon, BellIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Swal from 'sweetalert2';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'react-hot-toast';

const logoImagePath = '/src/assets/logo.png'; // Path to logo if available

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [salesData, setSalesData] = useState({
    daily: 'P0',
    weekly: 'P0',
    monthly: 'P0',
    pending: 0,
    weeklyOrders: 0,
    monthlyOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topProducts, setTopProducts] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [scheduleStats, setScheduleStats] = useState({
    pending: 0,
    confirmed: 0,
    today: 0,
    upcoming: 0,
  });
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [appointmentDates, setAppointmentDates] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [ws, setWs] = useState(null);
  
  // Add new state for PDF date range selection
  const [showPdfDateModal, setShowPdfDateModal] = useState(false);
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1)); // Default to 1 month ago
  const [endDate, setEndDate] = useState(new Date()); // Default to today

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      try {
        // Check if user is admin
        const token = await user.getIdToken();
        try {
          const response = await axios.get('/api/users/check-admin', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!response.data.isAdmin) {
            navigate('/'); // Redirect non-admin users
          }
        } catch (apiError) {
    
          
          // Fall back to checking claims directly
          try {
            const idTokenResult = await user.getIdTokenResult();
            if (!idTokenResult.claims.admin) {
              navigate('/');
            }
          } catch (claimError) {
    
            // As a fallback, keep them on the page for now
          }
        }
      } catch (error) {

        navigate('/');
      }
    };
    
    checkAdmin();
  }, [user, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        // Fetch all products for low stock monitoring
        const productsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setAllProducts(productsData);
        }

        // Fetch dashboard stats
        const dashboardResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/orders/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (dashboardResponse.data) {
          setRecentOrders(dashboardResponse.data.recentOrders.map(order => ({
            id: order._id,
            customer: order.shipping?.firstName + ' ' + order.shipping?.lastName,
            amount: `P${order.summary?.total.toLocaleString('en-PH')}`,
            status: order.status
          })));
          
          setSalesData({
            daily: `P${dashboardResponse.data.sales.daily.toLocaleString('en-PH')}`,
            weekly: `P${dashboardResponse.data.sales.weekly.toLocaleString('en-PH')}`,
            monthly: `P${dashboardResponse.data.sales.monthly.toLocaleString('en-PH')}`,
            pending: dashboardResponse.data.sales.pending || 0,
            weeklyOrders: dashboardResponse.data.sales.weeklyOrders || 0,
            monthlyOrders: dashboardResponse.data.sales.monthlyOrders || 0
          });
          
          // Set top selling products
          if (dashboardResponse.data.topProducts) {
            setTopProducts(dashboardResponse.data.topProducts);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchDashboardData();
    
    // Add event listener for dashboard refresh
    const handleDashboardRefresh = () => {
      console.log('Dashboard refresh triggered by event');
      fetchDashboardData();
    };
    
    // Listen for the custom refresh event
    window.addEventListener('refresh-dashboard', handleDashboardRefresh);
    
    // Also listen for orders-updated event
    window.addEventListener('orders-updated', handleDashboardRefresh);
    
    // Cleanup the event listener
    return () => {
      window.removeEventListener('refresh-dashboard', handleDashboardRefresh);
      window.removeEventListener('orders-updated', handleDashboardRefresh);
    };
  }, [user]);

  useEffect(() => {
    // Fetch schedule statistics
    const fetchScheduleStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
 
        // Pending schedules - checking for both 'pending' and 'Pending' to cover case sensitivity
        const pendingQuery = query(
          collection(db, 'schedules'),
          where('status', 'in', ['pending', 'Pending'])
        );
        
        // Confirmed schedules
        const confirmedQuery = query(
          collection(db, 'schedules'),
          where('status', 'in', ['confirmed', 'Confirmed'])
        );
        
        // Today's schedules - all statuses
        const todayQuery = query(
          collection(db, 'schedules'),
          where('preferredDate', '>=', today),
          where('preferredDate', '<', tomorrow)
        );
        
        // Upcoming schedules (next 7 days, including today and all statuses)
        const upcomingQuery = query(
          collection(db, 'schedules'),
          where('preferredDate', '>=', today),
          where('preferredDate', '<', nextWeek)
        );
        
        const [pendingSnap, confirmedSnap, todaySnap, upcomingSnap] = await Promise.all([
          getDocs(pendingQuery),
          getDocs(confirmedQuery),
          getDocs(todayQuery),
          getDocs(upcomingQuery)
        ]);
        
    
        
        // Log all pending schedules for debugging
     
        
        setScheduleStats({
          pending: pendingSnap.size,
          confirmed: confirmedSnap.size,
          today: todaySnap.size,
          upcoming: upcomingSnap.size
        });
      } catch (error) {
     
      }
    };
    
    // Fetch recent schedules
    const recentSchedulesQuery = query(
      collection(db, 'schedules'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    
    const unsubscribe = onSnapshot(recentSchedulesQuery, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        preferredDate: doc.data().preferredDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setRecentSchedules(schedules);
    });
    
    // Get total registered customers count
    const fetchCustomersCount = async () => {
      try {
        const customersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(customersQuery);
        setTotalCustomers(snapshot.size);
      } catch (error) {
    
      }
    };
    
    fetchScheduleStats();
    fetchCustomersCount();
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showCalendar) {
      const fetchAppointmentDates = async () => {
        try {
          const appointmentsQuery = query(
            collection(db, 'schedules'),
            where('status', 'in', ['confirmed', 'Confirmed', 'pending', 'Pending'])
          );
          
          const snapshot = await getDocs(appointmentsQuery);
          const dates = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.preferredDate?.toDate) {
              const date = data.preferredDate.toDate();
              return {
                date,
                status: data.status.toLowerCase(),
                time: data.preferredTime
              };
            }
            return null;
          }).filter(Boolean);
          
          setAppointmentDates(dates);
        } catch (error) {
     
        }
      };
      
      fetchAppointmentDates();
    }
  }, [showCalendar]);

  // Navigation handler for order details
  const handleViewOrder = async (orderId) => {
    try {
      const token = await user.getIdToken();
      
      // Fetch the complete order data before navigating
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // If the order data is successfully fetched, navigate with the complete order data
      const orderData = response.data;
      
      navigate(`/admin/orders/${orderId}`, {
        state: { 
          order: orderData
        }
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Could not load order details');
      
      // If there's an error, still navigate but without the order data
      navigate(`/admin/orders/${orderId}`);
    }
  };

  // Function to check if a date has appointments
  const tileClassName = ({ date, view }) => {
    // Make sure we're in the month view
    if (view !== 'month') return null;
    
    // Check if date has any appointments
    const hasAppointment = appointmentDates.some(appointmentDate => 
      appointmentDate.date.getDate() === date.getDate() &&
      appointmentDate.date.getMonth() === date.getMonth() &&
      appointmentDate.date.getFullYear() === date.getFullYear()
    );
    
    // Check if date has confirmed appointments
    const hasConfirmed = appointmentDates.some(appointmentDate => 
      appointmentDate.date.getDate() === date.getDate() &&
      appointmentDate.date.getMonth() === date.getMonth() &&
      appointmentDate.date.getFullYear() === date.getFullYear() &&
      appointmentDate.status.includes('confirmed')
    );
    
    // Check if date has pending appointments
    const hasPending = appointmentDates.some(appointmentDate => 
      appointmentDate.date.getDate() === date.getDate() &&
      appointmentDate.date.getMonth() === date.getMonth() &&
      appointmentDate.date.getFullYear() === date.getFullYear() &&
      appointmentDate.status.includes('pending')
    );
    
    if (hasAppointment) {
      if (hasConfirmed && hasPending) {
        return 'has-appointment has-confirmed has-pending';
      } else if (hasConfirmed) {
        return 'has-appointment has-confirmed';
      } else if (hasPending) {
        return 'has-appointment has-pending';
      }
      return 'has-appointment';
    }
    
    return null;
  };
  
  // Function to show appointment details on date click
  const handleDateClick = (value) => {
    const selectedDate = new Date(value);
    const appointments = appointmentDates.filter(appointment => 
      appointment.date.getDate() === selectedDate.getDate() &&
      appointment.date.getMonth() === selectedDate.getMonth() &&
      appointment.date.getFullYear() === selectedDate.getFullYear()
    );
    
    if (appointments.length > 0) {
      const formattedDate = format(selectedDate, 'MMMM d, yyyy');
      const confirmedCount = appointments.filter(a => a.status.includes('confirmed')).length;
      const pendingCount = appointments.filter(a => a.status.includes('pending')).length;
      
      // Generate appointment list HTML
      const appointmentList = appointments.map(appointment => {
        const statusColor = appointment.status.includes('confirmed') 
          ? 'green' 
          : 'orange';
        
        return `
          <div class="flex justify-between items-center p-2 border-b border-gray-100 last:border-0">
            <span class="font-medium">${appointment.time}</span>
            <span class="px-2 py-1 text-xs rounded-full text-white bg-${statusColor}-500">
              ${appointment.status}
            </span>
          </div>
        `;
      }).join('');
      
      // Show details in a SweetAlert popup
      Swal.fire({
        title: `Appointments for ${formattedDate}`,
        html: `
          <div class="text-left mb-4">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <span class="text-sm text-gray-600">Confirmed</span>
                <p class="text-xl font-bold text-green-600">${confirmedCount}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <span class="text-sm text-gray-600">Pending</span>
                <p class="text-xl font-bold text-yellow-600">${pendingCount}</p>
              </div>
            </div>
            
            <h3 class="font-medium text-gray-700 mb-2">Scheduled Times:</h3>
            <div class="max-h-64 overflow-y-auto">
              ${appointmentList}
            </div>
          </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#4F46E5',
        customClass: {
          container: 'appointments-swal-container',
          popup: 'rounded-lg shadow-xl',
          confirmButton: 'px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors'
        }
      });
    }
  };

  // Add handler to open the PDF date selection modal
  const handleExportPDF = () => {
    setShowPdfDateModal(true);
  };

  // Update the generatePDF function to use the correct API endpoint
  const generatePDF = async (startDate, endDate) => {
    try {
      // Show loading indicator
      Swal.fire({
        title: 'Generating PDF',
        html: 'Please wait while we prepare your sales report...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Format dates for API request
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      // Fetch sales data for the specified date range
      const token = await user.getIdToken();
      
      // Update the endpoint to use the last-30-days endpoint as a fallback
      // since the date-range endpoint doesn't exist
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/orders/sales/last-30-days`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // The existing endpoint doesn't accept date parameters, so we'll filter the results manually
      let salesData = response.data || {
        dailyBreakdown: [],
        totals: {
          totalRevenue: 0,
          totalOrders: 0,
          paymentMethods: {},
          products: []
        }
      };

      // If we have daily breakdown data, filter it by the selected date range
      if (salesData.dailyBreakdown && salesData.dailyBreakdown.length > 0) {
        // Filter the daily breakdown data to only include dates within the selected range
        const startTimestamp = new Date(startDate).setHours(0,0,0,0);
        const endTimestamp = new Date(endDate).setHours(23,59,59,999);
        
        const filteredDailyBreakdown = salesData.dailyBreakdown.filter(day => {
          const dayDate = new Date(day.date).getTime();
          return dayDate >= startTimestamp && dayDate <= endTimestamp;
        });
        
        // Recalculate totals based on filtered data
        let filteredTotals = {
          totalRevenue: 0,
          totalOrders: 0,
          paymentMethods: {},
          products: []
        };
        
        filteredDailyBreakdown.forEach(day => {
          if (day.dailySales) {
            filteredTotals.totalRevenue += (day.dailySales.total || 0);
            filteredTotals.totalOrders += (day.dailySales.count || 0);
          }
        });
        
        // Update salesData with filtered information
        salesData = {
          ...salesData,
          dailyBreakdown: filteredDailyBreakdown,
          totals: {
            ...salesData.totals,
            totalRevenue: filteredTotals.totalRevenue,
            totalOrders: filteredTotals.totalOrders
          }
        };
      }

      // Calculate the number of days in the date range
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Add BLCP logo at the top
      const logo = new Image();
      logo.src = '/src/assets/BLCP (Blue).png';
      
      // Wait for the logo to load before adding it to the PDF
      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve; // Continue even if logo fails to load
      });
      
      // Calculate logo dimensions to maintain aspect ratio
      const logoWidth = 40;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      
      // Add logo centered at the top
      doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 10;

      // Define BLCP brand blue color
      const blcpBlue = [54, 58, 148]; // RGB equivalent of #363a94

      // Add header
      doc.setFontSize(20);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('BLCP Sales Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(108, 117, 125);
      const dateRange = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
      doc.text(`Period: ${dateRange}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Add summary section
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Sales Summary', margin, y);
      y += 10;

      // Create summary table with safe calculations
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', `P${(salesData.totals?.totalRevenue || 0).toLocaleString('en-PH')}`],
        ['Total Orders', (salesData.totals?.totalOrders || 0).toString()],
        ['Average Order Value', `P${((salesData.totals?.totalRevenue || 0) / (salesData.totals?.totalOrders || 1)).toLocaleString('en-PH')}`],
        ['Daily Average Revenue', `P${((salesData.totals?.totalRevenue || 0) / daysDiff).toLocaleString('en-PH')}`]
      ];

      autoTable(doc, {
        startY: y,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add daily breakdown section
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Daily Sales Breakdown', margin, y);
      y += 10;

      // Format daily data for table with safe access - update to use P currency
      const dailyData = (salesData.dailyBreakdown || []).map(day => [
        format(new Date(day.date), 'MMM d, yyyy'),
        (day.dailySales?.count || 0).toString(),
        `P${(day.dailySales?.total || 0).toLocaleString('en-PH')}`,
        day.dailySales?.count > 0 
          ? `P${((day.dailySales.total || 0) / day.dailySales.count).toLocaleString('en-PH')}` 
          : 'P0.00'
      ]);

      // Add daily breakdown table
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Orders', 'Revenue', 'Avg. Order Value']],
        body: dailyData,
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add Customer Overview section
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Customer Overview', margin, y);
      y += 10;

      const customerData = [
        ['Metric', 'Count'],
        ['Total Registered Customers', totalCustomers.toString()],
        ['Active This Period', (salesData.totals?.totalOrders || 0).toString()]
      ];

      autoTable(doc, {
        startY: y,
        head: [customerData[0]],
        body: customerData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add Appointment Summary section
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Appointment Summary', margin, y);
      y += 10;

      const appointmentData = [
        ['Status', 'Count'],
        ['Pending', scheduleStats.pending.toString()],
        ['Confirmed', scheduleStats.confirmed.toString()],
        ['Today', scheduleStats.today.toString()],
        ['Upcoming (7 days)', scheduleStats.upcoming.toString()]
      ];

      autoTable(doc, {
        startY: y,
        head: [appointmentData[0]],
        body: appointmentData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add Recent Appointments section
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Recent Appointment Requests', margin, y);
      y += 10;

      const recentAppointmentsData = recentSchedules.map(schedule => [
        `${schedule.firstName} ${schedule.lastName}`,
        schedule.consultationType?.replace(/_/g, ' ') || 'N/A',
        format(new Date(schedule.preferredDate), 'MMM d, yyyy'),
        schedule.preferredTime,
        schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Customer', 'Type', 'Date', 'Time', 'Status']],
        body: recentAppointmentsData,
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add Recent Orders section
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Recent Orders', margin, y);
      y += 10;

      // Update recent orders to use P currency
      const recentOrdersData = recentOrders.map(order => [
        order.id,
        order.customer,
        order.amount.replace('₱', 'P'),
        order.status.charAt(0).toUpperCase() + order.status.slice(1)
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Order ID', 'Customer', 'Amount', 'Status']],
        body: recentOrdersData,
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add payment methods breakdown - update to use P currency
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Payment Methods', margin, y);
      y += 10;

      const paymentData = Object.entries(salesData.totals.paymentMethods || {}).map(([method, data]) => [
        method.toUpperCase(),
        data.count.toString(),
        `P${data.amount.toLocaleString('en-PH')}`,
        `${((data.amount / (salesData.totals.totalRevenue || 1)) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Method', 'Transactions', 'Amount', 'Share']],
        body: paymentData.length > 0 ? paymentData : [['No payment data available']],
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add top products section - update to use P currency
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.text('Top Selling Products', margin, y);
      y += 10;

      // Sort products by revenue
      const topProducts = [...(salesData.totals.products || [])]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(product => [
          product.name,
          product.quantity.toString(),
          `P${product.revenue.toLocaleString('en-PH')}`,
          `${((product.revenue / (salesData.totals.totalRevenue || 1)) * 100).toFixed(1)}%`
        ]);

      autoTable(doc, {
        startY: y,
        head: [topProducts.length > 0 ? ['Product', 'Units Sold', 'Revenue', 'Share'] : ['No products data available']],
        body: topProducts.length > 0 ? topProducts : [['No product sales in this period']],
        theme: 'grid',
        headStyles: { fillColor: blcpBlue, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        willDrawPage: function(data) {
          // This ensures the table doesn't get too close to the footer
          if (data.cursor.y > 230) {
            doc.addPage();
            data.cursor.y = 20; // Reset Y position on new page
          }
        }
      });

      // Add company information and footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Add company information at the bottom
        doc.setFontSize(8);
        doc.setTextColor(70, 70, 70);
        
        // Company details from Contact.jsx
        const companyInfo = [
          'Beauty Lab Cosmetic Products Corporation',
          '#101, Block 16, Lot 39, Fil-Am Friendship Hwy.',
          'Angeles City, Philippines',
          'Contact: +63 917 117 8146 | Email: blcpcorpph@gmail.com'
        ];
        
        // Calculate positions for centered text - increase bottom margin to prevent overlapping
        const bottomMargin = 290;  // Larger bottom margin
        const lineHeight = 6.5;    // Increased line height for better readability
        
        // Create a light gray background box for the footer
        doc.setFillColor(248, 249, 250); // Light gray background
        doc.rect(
          margin, 
          bottomMargin - (companyInfo.length * lineHeight) - 15, 
          pageWidth - (margin * 2), 
          (companyInfo.length * lineHeight) + 8, 
          'F'
        );
        
        let startY = bottomMargin - (companyInfo.length * lineHeight) - 10; // Position above page numbers
        
        // Add company details
        companyInfo.forEach(line => {
          doc.text(line, pageWidth / 2, startY, { align: 'center' });
          startY += lineHeight;
        });
        
        // Add page numbers with plenty of spacing
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, bottomMargin - 8, { align: 'center' });
        
        // Add generation timestamp
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        doc.text('Generated: ' + timestamp, pageWidth - margin, bottomMargin - 8, { align: 'right' });
      }

      // Save the PDF with date range in the filename
      doc.save(`BLCP_Sales_Report_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.pdf`);

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Report Generated!',
        text: 'Your sales report has been successfully created.',
        confirmButtonColor: '#363a94'
      });

    } catch (error) {
      console.error('PDF Generation Error:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate sales report. Please try again. Error: ' + error.message,
        confirmButtonColor: '#363a94'
      });
    }
  };

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connect = () => {
      const wsUrl = import.meta.env.VITE_API_BASE_URL
        .replace('http', 'ws')  // Convert HTTP to WS or HTTPS to WSS
        .replace('/api', '') + '/ws/orders';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        reconnectAttempts = 0;
        setWs(ws);
      };

      ws.onerror = (event) => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, 1000);
        }
      };

      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, 1000);
        }
      };
    };

    connect();

    return () => {
      ws?.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      
      <div className="flex-1 p-8 ml-16 transition-all duration-300">
        {/* Header */}
        <header className="mb-8 border-b border-gray-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today</p>
          </div>
          
          {/* Export to PDF button */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Export Report</span>
          </button>
        </header>

        {/* Add this alert banner near the top if there are many pending schedules */}
        {scheduleStats.pending > 0 && (
          <div className="mb-6 overflow-hidden bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg shadow-sm">
            <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="flex h-10 w-10 rounded-full bg-yellow-200 items-center justify-center">
                <BellIcon className="h-5 w-5 text-yellow-600" />
              </span>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-yellow-800 text-lg flex items-center">
                    Attention Required 
                    {scheduleStats.pending > 3 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {scheduleStats.pending} Pending
                      </span>
                    )}
                  </h3>
                  <p className="text-yellow-700 mt-1">
                    You have <span className="font-semibold">{scheduleStats.pending}</span> pending appointment{scheduleStats.pending !== 1 ? 's' : ''} that need{scheduleStats.pending === 1 ? 's' : ''} your review.
                </p>
              </div>
            </div>
            <Link 
              to="/admin/schedules" 
                className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium shadow-sm"
            >
              Review Now
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </Link>
            </div>
            {scheduleStats.pending > 3 && (
              <div className="px-4 py-2 bg-yellow-200 text-yellow-800 text-sm font-medium">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  High volume of pending appointments may affect customer satisfaction
                </span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="absolute inset-0 animate-pulse flex items-center justify-center opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading dashboard data...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
          </div>
        ) : (
          <>
        {/* Sales Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-blue-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-10 h-10">
                <CalendarIcon className="h-6 w-6" />
            </div>
              <h3 className="text-sm uppercase font-semibold text-gray-500 tracking-wide">Daily Sales</h3>
          </div>
            <p className="text-3xl font-bold text-gray-800">{salesData.daily}</p>
            <p className="text-xs text-gray-500 mt-2">Today's revenue</p>
            </div>
          <div className="bg-gradient-to-br from-white to-indigo-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full w-10 h-10">
                <ChartBarIcon className="h-6 w-6" />
          </div>
              <h3 className="text-sm uppercase font-semibold text-gray-500 tracking-wide">Weekly Sales</h3>
            </div>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-gray-800">{salesData.weekly}</p>
              <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">
                +{salesData.weeklyOrders} orders
              </span>
          </div>
            <p className="text-xs text-gray-500 mt-2">Last 7 days</p>
            </div>
          <div className="bg-gradient-to-br from-white to-emerald-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full w-10 h-10">
                <CurrencyDollarIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm uppercase font-semibold text-gray-500 tracking-wide">Monthly Sales</h3>
            </div>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-gray-800">{salesData.monthly}</p>
              <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">
                +{salesData.monthlyOrders} orders
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </div>
          <div className="bg-gradient-to-br from-white to-amber-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center bg-amber-100 text-amber-600 rounded-full w-10 h-10">
                <ClockIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm uppercase font-semibold text-gray-500 tracking-wide">Pending Orders</h3>
            </div>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-gray-800">{salesData.pending}</p>
              {salesData.pending > 0 && (
                <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Needs attention
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting processing</p>
          </div>
        </div>

          {/* Recent Orders - Full Width */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Recent Orders
              </h2>
          </div>
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500 font-medium">No recent orders found</p>
                <p className="text-gray-400 text-sm mt-1">New orders will appear here when customers make purchases</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {recentOrders.map((order, index) => (
                        <tr key={order.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{order.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                              order.status.toLowerCase() === 'processing' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              order.status.toLowerCase() === 'shipped' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              order.status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                order.status.toLowerCase() === 'completed' ? 'bg-green-500' :
                                order.status.toLowerCase() === 'processing' ? 'bg-yellow-500' :
                                order.status.toLowerCase() === 'shipped' ? 'bg-blue-500' :
                                order.status.toLowerCase() === 'cancelled' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`}></span>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleViewOrder(order.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Top Selling Products - Full Width */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Top Selling Products</h2>
            </div>
            {topProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No product sales data available</div>
            ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[300px] overflow-y-auto scrollbar-section">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map(product => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.totalQuantity}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₱{product.totalRevenue.toLocaleString('en-PH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            )}
          </div>

          {/* Low Stock Products - Full Width */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Low Stock Products</h2>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                Attention Needed
              </span>
            </div>
            {!allProducts || allProducts.filter(p => p.stock < 10).length === 0 ? (
              <div className="p-6 text-center text-gray-500">No products are low on stock</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[300px] overflow-y-auto scrollbar-section">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allProducts
                      .filter(product => product.stock < 10)
                      .sort((a, b) => a.stock - b.stock) // Sort by lowest stock first
                      .map(product => (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={product.image || 'https://via.placeholder.com/100'}
                                  alt={product.name}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{product.stock}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              product.stock === 0 
                                ? 'bg-red-100 text-red-800' 
                                : product.stock < 5
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.stock === 0 
                                ? 'Out of Stock' 
                                : product.stock < 5 
                                ? 'Critical' 
                                : 'Low Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <Link 
                              to={`/admin/products/edit/${product._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Update Stock
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {/* Add new user activity and schedule cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3 shadow-sm">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wide">Total Customers</h2>
                    <div className="mt-2 flex items-center">
                      <span className="text-3xl font-bold text-gray-800">{totalCustomers}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Registered</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link to="/admin/customers" className="text-sm text-purple-600 hover:text-purple-800 font-semibold inline-flex items-center">
                    View all customers
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Pending Appointments Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300">
              <div className={`h-1 ${scheduleStats.pending > 3 ? 'bg-red-500' : 'bg-amber-500'} w-full`}></div>
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`rounded-full ${scheduleStats.pending > 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} p-3 shadow-sm`}>
                    <ClockIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wide">Pending Appointments</h2>
                      {scheduleStats.pending > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                          Needs Review
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className={`text-3xl font-bold ${scheduleStats.pending > 3 ? 'text-red-600' : 'text-gray-800'}`}>
                        {scheduleStats.pending}
                      </span>
                      {scheduleStats.pending > 3 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium animate-pulse">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link to="/admin/schedules" className={`text-sm ${scheduleStats.pending > 3 ? 'text-red-600 hover:text-red-800' : 'text-amber-600 hover:text-amber-800'} font-semibold inline-flex items-center`}>
                    Review pending appointments
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Today's Appointments Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300">
              <div className="h-1 bg-green-500 w-full"></div>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 text-green-600 p-3 shadow-sm">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wide">Today's Appointments</h2>
                    <div className="mt-2 flex items-center">
                      <span className="text-3xl font-bold text-gray-800">{scheduleStats.today}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {format(new Date(), 'EEE, MMM d')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link to="/admin/schedules" className="text-sm text-green-600 hover:text-green-800 font-semibold inline-flex items-center">
                    View today's schedule
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Confirmed Appointments Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300">
              <div className="h-1 bg-blue-500 w-full"></div>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 text-blue-600 p-3 shadow-sm">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wide">Confirmed Appointments</h2>
                    <div className="mt-2 flex items-center">
                      <span className="text-3xl font-bold text-gray-800">{scheduleStats.confirmed}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        Upcoming
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => setShowCalendar(true)} 
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center"
                  >
                    View calendar
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Appointment Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Recent Appointment Requests</h2>
                <Link to="/admin/schedules" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <div className="max-h-[300px] overflow-y-auto scrollbar-section">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentSchedules.map(schedule => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-800 font-medium">
                                {schedule.firstName?.charAt(0) || '?'}{schedule.lastName?.charAt(0) || ''}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {schedule.firstName} {schedule.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{schedule.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {schedule.consultationType?.replace(/_/g, ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {schedule.preferredDate ? format(schedule.preferredDate, 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{schedule.preferredTime}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            schedule.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {schedule.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recentSchedules.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-500">
                          No recent appointment requests
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
            
            {/* Quick Actions Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link 
                  to="/admin/schedules" 
                  className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="rounded-full bg-blue-100 p-2 mr-3">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Review Appointments</div>
                    <div className="text-xs text-gray-500">Confirm or decline appointment requests</div>
                  </div>
                </Link>
                
                <Link 
                  to="/admin/customers" 
                  className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="rounded-full bg-purple-100 p-2 mr-3">
                    <UserGroupIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Manage Users</div>
                    <div className="text-xs text-gray-500">View and manage customer accounts</div>
                  </div>
                </Link>
                
                <Link 
                  to="/schedule" 
                  className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="rounded-full bg-green-100 p-2 mr-3">
                    <CalendarIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Create Appointment</div>
                    <div className="text-xs text-gray-500">Schedule a new consultation</div>
                  </div>
                </Link>
              </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Date Range Modal for PDF Generation */}
      {showPdfDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                Generate Sales Report
              </h2>
              <button 
                onClick={() => setShowPdfDateModal(false)} 
                className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100 text-sm text-blue-700">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Select a date range to generate a detailed sales report in PDF format.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={endDate}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date()}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => {
                    setStartDate(startOfMonth(new Date()));
                    setEndDate(new Date());
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200 hover:border-gray-300 shadow-sm"
                >
                  This Month
                </button>
                <button 
                  onClick={() => {
                    setStartDate(startOfMonth(subMonths(new Date(), 1)));
                    setEndDate(endOfMonth(subMonths(new Date(), 1)));
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200 hover:border-gray-300 shadow-sm"
                >
                  Last Month
                </button>
                <button 
                  onClick={() => {
                    setStartDate(subMonths(new Date(), 3));
                    setEndDate(new Date());
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200 hover:border-gray-300 shadow-sm"
                >
                  Last 3 Months
                </button>
              </div>
              
              <div className="flex justify-end mt-8 gap-3">
                <button 
                  onClick={() => setShowPdfDateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowPdfDateModal(false);
                    generatePDF(startDate, endDate);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
   
      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl border border-gray-200 transform transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Appointment Calendar
              </h2>
              <button 
                onClick={() => setShowCalendar(false)} 
                className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="calendar-container mb-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <Calendar 
                tileClassName={tileClassName}
                onClickDay={handleDateClick}
                className="border-0 w-full"
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2 shadow-sm"></div>
                  <span className="text-sm text-gray-700">Confirmed Appointments</span>
              </div>
              <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2 shadow-sm"></div>
                  <span className="text-sm text-gray-700">Pending Appointments</span>
              </div>
              <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-2 shadow-sm"></div>
                  <span className="text-sm text-gray-700">Both Types</span>
                </div>
              </div>
            </div>
            
            <div className="text-center border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-4">Click on a date to see appointment details</p>
              <button 
                onClick={() => setShowCalendar(false)}
                className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-md hover:from-gray-700 hover:to-gray-800 transition-colors shadow-sm font-medium"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;