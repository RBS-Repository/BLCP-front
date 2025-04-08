import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { query, collection, orderBy, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, schedulesCollection, scheduleSettingsCollection } from '../../config/firebase';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { 
  FaCalendarAlt, FaSearch, FaSort, FaEye, FaTrashAlt, FaBuilding, FaUser, 
  FaPhoneAlt, FaEnvelope, FaClock, FaInfoCircle, FaCheckCircle, FaTimesCircle, 
  FaBriefcase, FaCheck, FaTimes, FaCog, FaPlus, FaEdit, FaSave, FaTrash, FaTasks
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// Mock data for schedules
const mockSchedules = [
  {
    _id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    company: 'Doe Enterprises',
    businessType: 'startup',
    consultationType: 'product_development',
    preferredDate: '2024-01-15',
    preferredTime: '10:00 AM',
    message: 'Interested in developing a new skincare line.',
    status: 'Confirmed'
  },
  {
    _id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    company: 'Smith & Co.',
    businessType: 'existing',
    consultationType: 'private_label',
    preferredDate: '2024-01-20',
    preferredTime: '02:00 PM',
    message: 'Looking for private label options for our existing products.',
    status: 'Confirmed'
  },
  {
    _id: '3',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@example.com',
    phone: '555-123-4567',
    company: 'Garcia Beauty',
    businessType: 'distributor',
    consultationType: 'oem',
    preferredDate: '2024-01-25',
    preferredTime: '03:00 PM',
    message: 'Need OEM manufacturing for a new product line.',
    status: 'Confirmed'
  }
];

const AdminSchedules = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  
  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('businessTypes');
  const [businessTypes, setBusinessTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [consultationTypes, setConsultationTypes] = useState([]);
  const [newBusinessType, setNewBusinessType] = useState({ value: '', label: '' });
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [newConsultationType, setNewConsultationType] = useState({ value: '', label: '' });
  const [editingBusinessType, setEditingBusinessType] = useState(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [editingConsultationType, setEditingConsultationType] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          schedulesCollection,
          orderBy('status', 'asc'),
          orderBy('createdAt', sortOrder)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const schedules = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              preferredDate: data.preferredDate?.toDate ? data.preferredDate.toDate() : new Date(data.preferredDate)
            };
          }).sort((a, b) => {
            // Fallback sorting if Firestore order isn't respected
            if (sortOrder === 'desc') {
              return b.createdAt - a.createdAt;
            }
            return a.createdAt - b.createdAt;
          });
          
          setSchedules(schedules);
          setFilteredSchedules(schedules);
          setLoading(false);
        });

        // Also fetch business types, time slots, and consultation types
        await fetchBusinessTypes();
        await fetchTimeSlots();
        await fetchConsultationTypes();
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchBusinessTypes = async () => {
    try {
      const businessTypesDoc = await getDoc(doc(scheduleSettingsCollection, 'businessTypes'));
      if (businessTypesDoc.exists()) {
        setBusinessTypes(businessTypesDoc.data().types || []);
      } else {
        // Initialize with default business types if none exist
        const defaultTypes = [
          { value: 'startup', label: 'Startup Business' },
          { value: 'existing', label: 'Existing Business' },
          { value: 'distributor', label: 'Distributor' }
        ];
        await setDoc(doc(scheduleSettingsCollection, 'businessTypes'), { types: defaultTypes });
        setBusinessTypes(defaultTypes);
      }
    } catch (error) {
      console.error('Error fetching business types:', error);
      toast.error('Failed to load business types');
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const timeSlotsDoc = await getDoc(doc(scheduleSettingsCollection, 'timeSlots'));
      if (timeSlotsDoc.exists()) {
        setTimeSlots(timeSlotsDoc.data().slots || []);
      } else {
        // Initialize with default time slots if none exist
        const defaultSlots = [
          '09:00 AM', '10:00 AM', '11:00 AM',
          '02:00 PM', '03:00 PM', '04:00 PM'
        ];
        await setDoc(doc(scheduleSettingsCollection, 'timeSlots'), { slots: defaultSlots });
        setTimeSlots(defaultSlots);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load time slots');
    }
  };

  const fetchConsultationTypes = async () => {
    try {
      const consultationTypesDoc = await getDoc(doc(scheduleSettingsCollection, 'consultationTypes'));
      if (consultationTypesDoc.exists()) {
        setConsultationTypes(consultationTypesDoc.data().types || []);
      } else {
        // Initialize with default consultation types if none exist
        const defaultTypes = [
          { value: 'product_development', label: 'Product Development' },
          { value: 'oem', label: 'OEM Manufacturing' },
          { value: 'private_label', label: 'Private Label' }
        ];
        await setDoc(doc(scheduleSettingsCollection, 'consultationTypes'), { types: defaultTypes });
        setConsultationTypes(defaultTypes);
      }
    } catch (error) {
      console.error('Error fetching consultation types:', error);
      toast.error('Failed to load consultation types');
    }
  };

  useEffect(() => {
    const results = schedules.filter(schedule => {
      const searchLower = searchTerm.toLowerCase();
      return (
        schedule.userId?.toLowerCase().includes(searchLower) ||
        (schedule.userName?.toLowerCase().includes(searchLower)) ||
        schedule.consultationType?.toLowerCase().includes(searchLower) ||
        schedule.preferredTime?.toLowerCase().includes(searchLower) ||
        (schedule.preferredDate?.toDate?.() ?
          format(schedule.preferredDate.toDate(), 'yyyy-MM-dd').toLowerCase().includes(searchLower) :
          schedule.preferredDate?.toString().toLowerCase().includes(searchLower)
        ) ||
        schedule.status?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredSchedules(results);
  }, [searchTerm, schedules]);

  // Add search handler
  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);
    const filtered = schedules.filter(schedule => {
      const searchLower = searchValue.toLowerCase();
      return (
        schedule.name?.toLowerCase().includes(searchLower) ||
        schedule.email?.toLowerCase().includes(searchLower) ||
        schedule.company?.toLowerCase().includes(searchLower) ||
        schedule.consultationType?.toLowerCase().includes(searchLower) ||
        schedule.status?.toLowerCase().includes(searchLower) ||
        schedule.preferredTime?.toLowerCase().includes(searchLower) ||
        schedule.phone?.includes(searchValue) ||
        schedule.userId?.includes(searchValue)
      );
    });
    setFilteredSchedules(filtered);
  };

  // Add this useEffect to handle search
  useEffect(() => {
    handleSearch(searchTerm);
  }, [schedules]); // Update filtered list when schedules change

  const handleViewDetails = (schedule) => {
    // Add your logic for viewing details here
  };

  const handleConfirm = async (id) => {
    try {
      const scheduleDoc = doc(schedulesCollection, id);
      const scheduleData = (await getDoc(scheduleDoc)).data();

      // Update schedule status
      await updateDoc(scheduleDoc, {
        status: 'confirmed',
        confirmedAt: serverTimestamp()
      });

      // Add notification with admin's message
      await addDoc(collection(db, 'notifications'), {
        userId: scheduleData.userId,
        type: 'schedule-confirmation',
        message: message || 'Your consultation has been confirmed',
        read: false,
        createdAt: serverTimestamp(),
        link: `/schedules/${id}`,
        relatedSchedule: id,
        preferredDate: scheduleData.preferredDate,
        preferredTime: scheduleData.preferredTime
      });

      // Clear message after confirmation
      setMessage('');

      Swal.fire({
        title: 'Confirmed!',
        text: 'Schedule has been confirmed',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        customClass: { popup: 'rounded-lg' }
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to confirm schedule',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        customClass: { popup: 'rounded-lg' }
      });
    }
  };

  const handleDecline = async (id) => {
    try {
      const scheduleRef = doc(schedulesCollection, id);
      await updateDoc(scheduleRef, {
        status: 'declined',
        updatedAt: serverTimestamp()
      });

      // Add notification with optional message
      await addDoc(collection(db, 'notifications'), {
        userId: selectedSchedule.userId,
        type: 'schedule-declined',
        message: message || 'Your consultation has been declined',
        read: false,
        createdAt: serverTimestamp(),
        link: `/notifications/${id}`,
        preferredDate: selectedSchedule.preferredDate,
        preferredTime: selectedSchedule.preferredTime
      });

      // Clear message after decline
      setMessage('');

      Swal.fire({
        title: 'Declined!',
        text: 'Schedule has been declined',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'rounded-lg'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to decline schedule',
        icon: 'error',
        confirmButtonColor: '#d33',
        customClass: {
          popup: 'rounded-lg'
        }
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-lg',
        confirmButton: 'bg-red-500 hover:bg-red-600 px-4 py-2 rounded',
        cancelButton: 'bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded ml-2'
      }
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(schedulesCollection, id));
      Swal.fire({
        title: 'Deleted!',
        text: 'Schedule has been deleted.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'rounded-lg'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete schedule',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'rounded-lg'
        }
      });
    }
  };

  // Add sorting controls
  const sortingOptions = [
    { value: 'desc', label: 'Newest First' },
    { value: 'asc', label: 'Oldest First' }
  ];

  // Add this useEffect to fetch user details when modal opens
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (showModal && selectedSchedule?.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', selectedSchedule.userId));
          if (userDoc.exists()) {
            setUserDetails(userDoc.data());
          } else {
            setUserDetails({ notFound: true });
          }
        } catch (error) {
          setUserDetails({ error: true });
        }
      }
    };
    
    fetchUserDetails();
  }, [showModal, selectedSchedule]);

  // Business Types Functions
  const handleAddBusinessType = async () => {
    if (!newBusinessType.value || !newBusinessType.label) {
      toast.error('Both value and label are required');
      return;
    }

    // Check for duplicate values
    if (businessTypes.some(type => type.value === newBusinessType.value)) {
      toast.error('A business type with this value already exists');
      return;
    }

    try {
      const updatedTypes = [...businessTypes, newBusinessType];
      await setDoc(doc(scheduleSettingsCollection, 'businessTypes'), { types: updatedTypes });
      setBusinessTypes(updatedTypes);
      setNewBusinessType({ value: '', label: '' });
      toast.success('Business type added successfully');
    } catch (error) {
      console.error('Error adding business type:', error);
      toast.error('Failed to add business type');
    }
  };
  
  const handleEditBusinessType = (type) => {
    setEditingBusinessType({ ...type, originalValue: type.value });
  };
  
  const handleUpdateBusinessType = async () => {
    if (!editingBusinessType.value || !editingBusinessType.label) {
      toast.error('Both value and label are required');
      return;
    }

    // Check for duplicate values (ignoring the currently edited item)
    if (editingBusinessType.value !== editingBusinessType.originalValue && 
        businessTypes.some(type => type.value === editingBusinessType.value)) {
      toast.error('A business type with this value already exists');
      return;
    }

    try {
      const updatedTypes = businessTypes.map(type => 
        type.value === editingBusinessType.originalValue ? { value: editingBusinessType.value, label: editingBusinessType.label } : type
      );
      await setDoc(doc(scheduleSettingsCollection, 'businessTypes'), { types: updatedTypes });
      setBusinessTypes(updatedTypes);
      setEditingBusinessType(null);
      toast.success('Business type updated successfully');
    } catch (error) {
      console.error('Error updating business type:', error);
      toast.error('Failed to update business type');
    }
  };
  
  const handleDeleteBusinessType = async (value) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This will delete the business type and may affect existing schedules!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updatedTypes = businessTypes.filter(type => type.value !== value);
          await setDoc(doc(scheduleSettingsCollection, 'businessTypes'), { types: updatedTypes });
          setBusinessTypes(updatedTypes);
          toast.success('Business type deleted successfully');
        } catch (error) {
          console.error('Error deleting business type:', error);
          toast.error('Failed to delete business type');
        }
      }
    });
  };
  
  // Time Slots Functions
  const handleAddTimeSlot = async () => {
    if (!newTimeSlot) {
      toast.error('Time slot is required');
      return;
    }

    // Check format - expecting 12-hour format like "10:00 AM"
    const timeFormatRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeFormatRegex.test(newTimeSlot)) {
      toast.error('Time must be in format "HH:MM AM/PM" (e.g., "10:00 AM")');
      return;
    }

    // Check for duplicates
    if (timeSlots.includes(newTimeSlot)) {
      toast.error('This time slot already exists');
      return;
    }

    try {
      // Add new time slot and sort them chronologically
      const updatedSlots = [...timeSlots, newTimeSlot].sort((a, b) => {
        // Convert to 24-hour format for comparison
        const getTimeValue = (timeStr) => {
          const [time, period] = timeStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        return getTimeValue(a) - getTimeValue(b);
      });
      
      await setDoc(doc(scheduleSettingsCollection, 'timeSlots'), { slots: updatedSlots });
      setTimeSlots(updatedSlots);
      setNewTimeSlot('');
      toast.success('Time slot added successfully');
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast.error('Failed to add time slot');
    }
  };
  
  const handleEditTimeSlot = (slot) => {
    setEditingTimeSlot({ value: slot, originalValue: slot });
  };
  
  const handleUpdateTimeSlot = async () => {
    if (!editingTimeSlot.value) {
      toast.error('Time slot is required');
      return;
    }

    // Check format - expecting 12-hour format like "10:00 AM"
    const timeFormatRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeFormatRegex.test(editingTimeSlot.value)) {
      toast.error('Time must be in format "HH:MM AM/PM" (e.g., "10:00 AM")');
      return;
    }

    // Check for duplicates (ignoring the currently edited item)
    if (editingTimeSlot.value !== editingTimeSlot.originalValue && 
        timeSlots.includes(editingTimeSlot.value)) {
      toast.error('This time slot already exists');
      return;
    }

    try {
      const updatedSlots = timeSlots.map(slot => 
        slot === editingTimeSlot.originalValue ? editingTimeSlot.value : slot
      ).sort((a, b) => {
        // Convert to 24-hour format for comparison
        const getTimeValue = (timeStr) => {
          const [time, period] = timeStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        return getTimeValue(a) - getTimeValue(b);
      });
      
      await setDoc(doc(scheduleSettingsCollection, 'timeSlots'), { slots: updatedSlots });
      setTimeSlots(updatedSlots);
      setEditingTimeSlot(null);
      toast.success('Time slot updated successfully');
    } catch (error) {
      console.error('Error updating time slot:', error);
      toast.error('Failed to update time slot');
    }
  };
  
  const handleDeleteTimeSlot = async (slot) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This will delete the time slot and may affect existing schedules!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updatedSlots = timeSlots.filter(t => t !== slot);
          await setDoc(doc(scheduleSettingsCollection, 'timeSlots'), { slots: updatedSlots });
          setTimeSlots(updatedSlots);
          toast.success('Time slot deleted successfully');
        } catch (error) {
          console.error('Error deleting time slot:', error);
          toast.error('Failed to delete time slot');
        }
      }
    });
  };
  
  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      
      // Save business types
      await setDoc(doc(scheduleSettingsCollection, 'businessTypes'), {
        types: businessTypes
      });
      
      // Save time slots
      await setDoc(doc(scheduleSettingsCollection, 'timeSlots'), {
        slots: timeSlots
      });
      
      // Save consultation types
      await setDoc(doc(scheduleSettingsCollection, 'consultationTypes'), {
        types: consultationTypes
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Settings Saved',
        text: 'Schedule settings have been updated successfully'
      });
      
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save settings'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Consultation Types Functions
  const handleAddConsultationType = async () => {
    if (!newConsultationType.value || !newConsultationType.label) {
      toast.error('Both value and label are required');
      return;
    }

    // Check for duplicate values
    if (consultationTypes.some(type => type.value === newConsultationType.value)) {
      toast.error('A consultation type with this value already exists');
      return;
    }

    try {
      const updatedTypes = [...consultationTypes, newConsultationType];
      await setDoc(doc(scheduleSettingsCollection, 'consultationTypes'), { types: updatedTypes });
      setConsultationTypes(updatedTypes);
      setNewConsultationType({ value: '', label: '' });
      toast.success('Consultation type added successfully');
    } catch (error) {
      console.error('Error adding consultation type:', error);
      toast.error('Failed to add consultation type');
    }
  };
  
  const handleEditConsultationType = (type) => {
    setEditingConsultationType({ ...type, originalValue: type.value });
  };
  
  const handleUpdateConsultationType = async () => {
    if (!editingConsultationType.value || !editingConsultationType.label) {
      toast.error('Both value and label are required');
      return;
    }

    // Check for duplicate values (ignoring the currently edited item)
    if (editingConsultationType.value !== editingConsultationType.originalValue && 
        consultationTypes.some(type => type.value === editingConsultationType.value)) {
      toast.error('A consultation type with this value already exists');
      return;
    }

    try {
      const updatedTypes = consultationTypes.map(type => 
        type.value === editingConsultationType.originalValue ? { value: editingConsultationType.value, label: editingConsultationType.label } : type
      );
      await setDoc(doc(scheduleSettingsCollection, 'consultationTypes'), { types: updatedTypes });
      setConsultationTypes(updatedTypes);
      setEditingConsultationType(null);
      toast.success('Consultation type updated successfully');
    } catch (error) {
      console.error('Error updating consultation type:', error);
      toast.error('Failed to update consultation type');
    }
  };
  
  const handleDeleteConsultationType = async (value) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This will delete the consultation type and may affect existing schedules!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updatedTypes = consultationTypes.filter(type => type.value !== value);
          await setDoc(doc(scheduleSettingsCollection, 'consultationTypes'), { types: updatedTypes });
          setConsultationTypes(updatedTypes);
          toast.success('Consultation type deleted successfully');
        } catch (error) {
          console.error('Error deleting consultation type:', error);
          toast.error('Failed to delete consultation type');
        }
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <FaCalendarAlt className="mr-3" />
                  Schedule Management
                </h1>
                <p className="text-purple-100 mt-1">Manage consultation requests and schedule settings</p>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-2 rounded-lg shadow-inner">
                  <p className="text-white text-sm font-medium">
                    <span className="font-bold">{schedules.length}</span> total requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('schedules')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'schedules'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaTasks className="mr-2" />
                Schedules
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaCog className="mr-2" />
                Settings
              </button>
            </nav>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Schedules Tab Content */}
          {activeTab === 'schedules' && (
            <>
              {/* Search and filters */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name, email, company, status..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-[220px]">
                    <FaSort className="text-gray-400" />
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="flex-1 py-3 px-4 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                    >
                      {sortingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <FaInfoCircle className="text-indigo-400" />
                    <span>Sorted by: <span className="font-medium text-gray-700">{sortingOptions.find(option => option.value === sortOrder)?.label}</span></span>
                  </div>
                  {error && (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <FaTimesCircle />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Table with enhanced UI */}
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 flex flex-col items-center justify-center">
                  <div className="relative w-16 h-16">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-16 h-16 border-4 border-b-transparent border-indigo-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-500 mt-4 animate-pulse">Loading consultation requests...</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <table className="w-full divide-y divide-gray-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '22%' }} /> {/* Name */}
                      <col style={{ width: '22%' }} /> {/* Contact */}
                      <col style={{ width: '16%' }} /> {/* Type */}
                      <col style={{ width: '14%' }} /> {/* Status */}
                      <col style={{ width: '16%' }} /> {/* Created */}
                      <col style={{ width: '10%' }} /> {/* Actions */}
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSchedules.map(schedule => (
                        <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mr-3">
                                <FaUser className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {schedule.firstName || 'Unknown'} {schedule.lastName || 'User'}
                                  {(!schedule.firstName || !schedule.lastName) && (
                                    <span className="text-red-500 text-xs ml-2">(name missing)</span>
                                  )}
                                </div>
                                {/* User Type Badge */}
                                {schedule.isGuestBooking ? (
                                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Guest
                                  </span>
                                ) : schedule.userId ? (
                                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Registered
                                  </span>
                                ) : (
                                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Unknown
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <div className="flex flex-col">
                              <div className="flex items-center text-sm text-gray-900 mb-1">
                                <FaEnvelope className="text-gray-400 mr-2" />
                                <span className="truncate max-w-[180px]">{schedule.email}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-900">
                                <FaPhoneAlt className="text-gray-400 mr-2" />
                                <span>{schedule.phone || 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium capitalize text-sm">
                              {schedule.consultationType?.replace(/_/g, ' ') ?? 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                              schedule.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {schedule.status === 'confirmed' && <FaCheckCircle className="mr-1.5" />}
                              {schedule.status === 'pending' && <FaClock className="mr-1.5" />}
                              {schedule.status === 'declined' && <FaTimesCircle className="mr-1.5" />}
                              <span className="capitalize">{schedule.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <div className="flex items-center text-sm text-gray-900">
                              <span>
                                {schedule.createdAt?.toLocaleString('en-PH', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm truncate">
                            <div className="flex space-x-2">
                              <button
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                onClick={() => {
                                  setSelectedSchedule(schedule);
                                  setShowModal(true);
                                }}
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                              <button
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                onClick={() => handleDelete(schedule.id)}
                                title="Delete"
                              >
                                <FaTrashAlt />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Settings Tab Navigation */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveSettingsTab('businessTypes')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                        activeSettingsTab === 'businessTypes'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaBriefcase className="mr-2" />
                      Business Types
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('consultationTypes')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                        activeSettingsTab === 'consultationTypes'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaCalendarAlt className="mr-2" />
                      Consultation Types
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('timeSlots')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                        activeSettingsTab === 'timeSlots'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaClock className="mr-2" />
                      Time Slots
                    </button>
                  </nav>
                </div>
                
                <div className="p-6">
                  {/* Business Types Tab Content */}
                  {activeSettingsTab === 'businessTypes' && (
                    <div className="space-y-6">
                      {/* Add Business Type Form */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Add New Business Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Value (internal ID)
                            </label>
                            <input
                              type="text"
                              value={newBusinessType.value}
                              onChange={(e) => setNewBusinessType({...newBusinessType, value: e.target.value})}
                              placeholder="startup"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Label (display text)
                            </label>
                            <input
                              type="text"
                              value={newBusinessType.label}
                              onChange={(e) => setNewBusinessType({...newBusinessType, label: e.target.value})}
                              placeholder="Startup Business"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <button
                              onClick={handleAddBusinessType}
                              className="w-full p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                              <FaPlus className="mr-2" />
                              Add Business Type
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Business Types List */}
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Value
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Label
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {businessTypes.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                  No business types defined yet
                                </td>
                              </tr>
                            ) : (
                              businessTypes.map((type, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {type.value}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {type.label}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleEditBusinessType(type)}
                                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBusinessType(type.value)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <FaTrash />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Consultation Types Tab Content */}
                  {activeSettingsTab === 'consultationTypes' && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <div className="flex items-center text-indigo-800">
                          <FaInfoCircle className="text-indigo-500 mr-2 flex-shrink-0" />
                          <p className="text-sm">
                            Consultation types define the services you offer for scheduled consultations. Each type needs a unique value (used internally) and a label (displayed to users).
                          </p>
                        </div>
                      </div>
                      
                      {/* Add new consultation type */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Add New Consultation Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="newConsultationTypeValue" className="block text-sm font-medium text-gray-700 mb-1">Value (code)</label>
                            <input
                              type="text"
                              id="newConsultationTypeValue"
                              value={newConsultationType.value}
                              onChange={(e) => setNewConsultationType({...newConsultationType, value: e.target.value})}
                              placeholder="e.g. product_development"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="newConsultationTypeLabel" className="block text-sm font-medium text-gray-700 mb-1">Label (display name)</label>
                            <input
                              type="text"
                              id="newConsultationTypeLabel"
                              value={newConsultationType.label}
                              onChange={(e) => setNewConsultationType({...newConsultationType, label: e.target.value})}
                              placeholder="e.g. Product Development"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="mt-3 text-right">
                          <button
                            onClick={handleAddConsultationType}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center ml-auto"
                          >
                            <FaPlus className="mr-2" />
                            Add Consultation Type
                          </button>
                        </div>
                      </div>
                      
                      {/* List existing consultation types */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Existing Consultation Types</h3>
                        
                        {consultationTypes.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No consultation types defined yet.</p>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {consultationTypes.map((type, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{type.value}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{type.label}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                      <button 
                                        onClick={() => handleEditConsultationType(type)}
                                        className="text-indigo-600 hover:text-indigo-800 mr-3"
                                      >
                                        <FaEdit />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteConsultationType(type.value)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <FaTrash />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      {/* Edit consultation type modal */}
                      {editingConsultationType && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Consultation Type</h3>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                <input
                                  type="text"
                                  value={editingConsultationType.value}
                                  onChange={(e) => setEditingConsultationType({...editingConsultationType, value: e.target.value})}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                <input
                                  type="text"
                                  value={editingConsultationType.label}
                                  onChange={(e) => setEditingConsultationType({...editingConsultationType, label: e.target.value})}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                              <button
                                onClick={() => setEditingConsultationType(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleUpdateConsultationType}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Time Slots Tab Content */}
                  {activeSettingsTab === 'timeSlots' && (
                    <div className="space-y-6">
                      {/* Add Time Slot Form */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Add New Time Slot</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time Slot (format: HH:MM AM/PM)
                            </label>
                            <input
                              type="text"
                              value={newTimeSlot}
                              onChange={(e) => setNewTimeSlot(e.target.value)}
                              placeholder="10:00 AM"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <button
                              onClick={handleAddTimeSlot}
                              className="w-full p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                              <FaPlus className="mr-2" />
                              Add Time Slot
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Time Slots List */}
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {timeSlots.length === 0 ? (
                              <tr>
                                <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                  No time slots defined yet
                                </td>
                              </tr>
                            ) : (
                              timeSlots.map((slot, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                                    <FaClock className="text-indigo-400 mr-2" />
                                    {slot}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleEditTimeSlot(slot)}
                                      className="text-indigo-600 hover:text-indigo-800 mr-4"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTimeSlot(slot)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <FaTrash />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Modal for Schedule Details */}
      {showModal && selectedSchedule && (
        <Modal 
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title=""
          className="bg-white text-gray-900 rounded-xl overflow-hidden"
          size="xlarge"
        >
          <div className="w-full">
            {/* Modal Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 shadow-md">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <FaCalendarAlt className="mr-3" />
                  Consultation Request Details
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-white opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                  selectedSchedule.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  selectedSchedule.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedSchedule.status === 'confirmed' && <FaCheckCircle className="mr-1" />}
                  {selectedSchedule.status === 'pending' && <FaClock className="mr-1" />}
                  {selectedSchedule.status === 'declined' && <FaTimesCircle className="mr-1" />}
                  <span className="capitalize">{selectedSchedule.status}</span>
                </span>
                
                <span className="text-sm text-white">
                  Created: {selectedSchedule.createdAt?.toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* User Information Card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mr-3">
                      <FaUser className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">User Information</h3>
                  </div>
                  
                  {selectedSchedule.isGuestBooking ? (
                    <div>
                      <div className="flex items-center mb-4">
                        <span className="font-medium text-gray-700 min-w-[80px]">Type:</span>
                        <span className="ml-2 px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                          Guest User
                        </span>
                      </div>
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-700 min-w-[80px]">Name:</span>
                        <span className="text-gray-900">{selectedSchedule.firstName} {selectedSchedule.lastName}</span>
                      </div>
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-700 min-w-[80px]">Email:</span>
                        <span className="text-gray-900">{selectedSchedule.email}</span>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                        This user scheduled as a guest without creating an account.
                      </div>
                    </div>
                  ) : selectedSchedule.userId ? (
                    userDetails ? (
                      userDetails.error ? (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                          <FaTimesCircle className="inline mr-2" />
                          Error loading user details
                        </div>
                      ) : userDetails.notFound ? (
                        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                          <FaInfoCircle className="inline mr-2" />
                          User account not found
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center mb-4">
                            <span className="font-medium text-gray-700 min-w-[80px]">Type:</span>
                            <span className="ml-2 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                              Registered User
                            </span>
                          </div>
                          <div className="flex items-center mb-3">
                            <span className="font-medium text-gray-700 min-w-[80px]">Name:</span>
                            <span className="text-gray-900">{userDetails.firstName} {userDetails.lastName}</span>
                          </div>
                          <div className="flex items-center mb-3">
                            <span className="font-medium text-gray-700 min-w-[80px]">Email:</span>
                            <span className="text-gray-900">{userDetails.email}</span>
                          </div>
                          <div className="flex items-center mb-3">
                            <span className="font-medium text-gray-700 min-w-[80px]">User ID:</span> 
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {selectedSchedule.userId}
                            </span>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="flex justify-center p-4">
                        <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center mb-3">
                      <span className="font-medium text-gray-700 min-w-[80px]">Type:</span>
                      <span className="ml-2 px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">
                        Unknown
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Company Information Card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center mr-3">
                      <FaBuilding className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">Company Information</h3>
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <span className="font-medium text-gray-700 min-w-[120px]">Name:</span>
                    <span className="text-gray-900">{selectedSchedule.firstName} {selectedSchedule.lastName}</span>
                  </div>
                  <div className="flex items-center mb-3">
                    <span className="font-medium text-gray-700 min-w-[120px]">Company:</span>
                    <span className="text-gray-900">{selectedSchedule.company || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center mb-3">
                    <span className="font-medium text-gray-700 min-w-[120px]">Business Type:</span>
                    <span className="inline-flex items-center px-2.5 py-1 text-sm rounded-md bg-indigo-50 text-indigo-700 font-medium capitalize">
                      <FaBriefcase className="mr-1.5" />
                      {selectedSchedule.businessType || 'Not specified'}
                    </span>
                  </div>
                </div>
                
                {/* Contact Information Card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3">
                      <FaPhoneAlt className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">Contact Information</h3>
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
                      <FaEnvelope className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email</span>
                      <p className="text-gray-900">{selectedSchedule.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
                      <FaPhoneAlt className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone</span>
                      <p className="text-gray-900">{selectedSchedule.phone}</p>
                    </div>
                  </div>
                </div>
                
                {/* Consultation Details Card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center mr-3">
                      <FaCalendarAlt className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">Consultation Details</h3>
                  </div>
                  
                  <div className="mb-4">
                    <span className="font-medium text-gray-700 block mb-2">Type:</span>
                    <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-indigo-100 text-indigo-700 font-medium capitalize">
                      {selectedSchedule.consultationType?.replace(/_/g, ' ') || 'Not specified'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <span className="font-medium text-gray-700 block mb-2">Requested Date:</span>
                    <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                      <FaCalendarAlt className="text-indigo-500 mr-2" />
                      <span className="text-gray-900">{selectedSchedule.preferredDate?.toLocaleDateString('en-PH', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700 block mb-2">Requested Time:</span>
                    <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                      <FaClock className="text-indigo-500 mr-2" />
                      <span className="text-gray-900">{selectedSchedule.preferredTime}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message Card - Full Width */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center mr-3">
                    <FaInfoCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">Additional Information</h3>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedSchedule.message || 'No additional information provided.'}
                  </p>
                </div>
              </div>
              
              {/* Admin Response */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Your Response</h3>
                <div className="mb-4">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Message
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[120px] resize-y"
                    rows="5"
                    placeholder="Add a message that will be sent to the user..."
                  ></textarea>
                  <p className="text-sm text-gray-500 mt-2">
                    This message will be included in the notification sent to the user.
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
                <button
                  onClick={() => {
                    handleConfirm(selectedSchedule.id);
                    setShowModal(false);
                  }}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm font-medium"
                >
                  <FaCheck className="mr-2" />
                  Confirm Schedule
                </button>
                <button
                  onClick={() => {
                    handleDecline(selectedSchedule.id);
                    setShowModal(false);
                  }}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg hover:from-yellow-600 hover:to-amber-600 transition-all shadow-sm font-medium"
                >
                  <FaTimes className="mr-2" />
                  Decline Request
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedSchedule.id);
                    setShowModal(false);
                  }}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-sm font-medium"
                >
                  <FaTrashAlt className="mr-2" />
                  Delete Request
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Edit Business Type Modal */}
      {editingBusinessType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Business Type</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="text"
                  value={editingBusinessType.value}
                  onChange={(e) => setEditingBusinessType({...editingBusinessType, value: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={editingBusinessType.label}
                  onChange={(e) => setEditingBusinessType({...editingBusinessType, label: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingBusinessType(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBusinessType}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Time Slot Modal */}
      {editingTimeSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Time Slot</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="text"
                value={editingTimeSlot.value}
                onChange={(e) => setEditingTimeSlot({...editingTimeSlot, value: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Format: HH:MM AM/PM (e.g., 09:00 AM)</p>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingTimeSlot(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTimeSlot}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .slide-down {
          animation: slideDown 0.3s ease-out forwards;
        }
        .scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminSchedules; 