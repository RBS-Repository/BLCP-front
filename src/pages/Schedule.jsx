import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../styles/Schedule.css';
import { db } from '../config/firebase';
import { addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { schedulesCollection, scheduleSettingsCollection } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import DateTimeFormat from '../components/common/DateTimeFormat';

const Schedule = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    businessType: 'startup', // startup, existing, distributor
    consultationType: 'product_development', // product_development, oem, private_label
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTime: '',
    message: '',
    agreeToTerms: false
  });

  const [submitted, setSubmitted] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [scheduleConflict, setScheduleConflict] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [takenTimes, setTakenTimes] = useState([]);
  const [hasPendingAppointment, setHasPendingAppointment] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [takenTimeSlots, setTakenTimeSlots] = useState([]);
  const [confirmedSlots, setConfirmedSlots] = useState([]);
  const [pendingSlots, setPendingSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Replace hardcoded time slots and business types with state
  const [timeSlots, setTimeSlots] = useState([
    '09:00 AM', '10:00 AM', '11:00 AM',
    '02:00 PM', '03:00 PM', '04:00 PM'
  ]);
  
  const [businessTypes, setBusinessTypes] = useState([
    { value: 'startup', label: 'Startup Business' },
    { value: 'existing', label: 'Existing Business' },
    { value: 'distributor', label: 'Distributor' }
  ]);
  
  const [consultationTypes, setConsultationTypes] = useState([
    { value: 'product_development', label: 'Product Development' },
    { value: 'oem', label: 'OEM Manufacturing' },
    { value: 'private_label', label: 'Private Label' }
  ]);
  
  // Fetch schedule settings from Firestore
  useEffect(() => {
    const fetchScheduleSettings = async () => {
      try {
        /**
         * PERFORMANCE OPTIMIZATION
         * 
         * This function has been optimized to improve loading times by:
         * 1. Using localStorage caching with a 1-hour expiration to avoid unnecessary Firebase fetches
         * 2. Fetching all Firebase data in parallel with Promise.all instead of sequential requests
         * 3. Background refreshing of data when using cached values to keep data fresh without delaying UI
         * 4. Proper error handling to ensure UI remains responsive even when errors occur
         */
        setLoading(true);

        // Check localStorage cache first
        const cachedData = localStorage.getItem('scheduleSettings');
        const cacheTimestamp = localStorage.getItem('scheduleSettingsTimestamp');
        const now = Date.now();
        
        // If we have cached data that's less than 1 hour old, use it
        if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 3600000) {
          const parsedData = JSON.parse(cachedData);
          
          if (parsedData.businessTypes?.length > 0) {
            setBusinessTypes(parsedData.businessTypes);
            
            // Update formData if needed
            const validValues = parsedData.businessTypes.map(type => type.value);
            if (!validValues.includes(formData.businessType) && validValues.length > 0) {
              setFormData(prev => ({
                ...prev,
                businessType: validValues[0]
              }));
            }
          }
          
          if (parsedData.timeSlots?.length > 0) {
            setTimeSlots(parsedData.timeSlots);
          }
          
          if (parsedData.consultationTypes?.length > 0) {
            setConsultationTypes(parsedData.consultationTypes);
            
            // Update formData if needed
            const validValues = parsedData.consultationTypes.map(type => type.value);
            if (!validValues.includes(formData.consultationType) && validValues.length > 0) {
              setFormData(prev => ({
                ...prev,
                consultationType: validValues[0]
              }));
            }
          }
          
          setLoading(false);
          
          // Fetch fresh data in the background after using cache
          fetchFreshData(false);
          return;
        }
        
        // No valid cache, fetch fresh data
        fetchFreshData(true);
        
      } catch (error) {
        console.error('Error in fetchScheduleSettings:', error);
        setLoading(false);
      }
    };
    
    // Helper function to fetch fresh data from Firebase
    const fetchFreshData = async (updateLoadingState) => {
      try {
        // Fetch all settings in parallel using Promise.all
        const [businessTypesDoc, timeSlotsDoc, consultationTypesDoc] = await Promise.all([
          getDoc(doc(scheduleSettingsCollection, 'businessTypes')),
          getDoc(doc(scheduleSettingsCollection, 'timeSlots')),
          getDoc(doc(scheduleSettingsCollection, 'consultationTypes'))
        ]);
        
        // Prepare data object for cache
        const settingsData = {};
        
        // Process business types
        if (businessTypesDoc.exists() && businessTypesDoc.data().types.length > 0) {
          const fetchedTypes = businessTypesDoc.data().types;
          setBusinessTypes(fetchedTypes);
          settingsData.businessTypes = fetchedTypes;
          
          // Update formData if needed
          const validValues = fetchedTypes.map(type => type.value);
          if (!validValues.includes(formData.businessType) && validValues.length > 0) {
            setFormData(prev => ({
              ...prev,
              businessType: validValues[0]
            }));
          }
        }
        
        // Process time slots
        if (timeSlotsDoc.exists() && timeSlotsDoc.data().slots.length > 0) {
          const fetchedSlots = timeSlotsDoc.data().slots;
          setTimeSlots(fetchedSlots);
          settingsData.timeSlots = fetchedSlots;
        }
        
        // Process consultation types
        if (consultationTypesDoc.exists() && consultationTypesDoc.data().types.length > 0) {
          const fetchedTypes = consultationTypesDoc.data().types;
          setConsultationTypes(fetchedTypes);
          settingsData.consultationTypes = fetchedTypes;
          
          // Update formData if needed
          const validValues = fetchedTypes.map(type => type.value);
          if (!validValues.includes(formData.consultationType) && validValues.length > 0) {
            setFormData(prev => ({
              ...prev,
              consultationType: validValues[0]
            }));
          }
        }
        
        // Save to localStorage cache
        localStorage.setItem('scheduleSettings', JSON.stringify(settingsData));
        localStorage.setItem('scheduleSettingsTimestamp', Date.now().toString());
        
        // Only update loading state if this was the primary fetch
        if (updateLoadingState) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching fresh data:', error);
        if (updateLoadingState) {
          setLoading(false);
        }
      }
    };
    
    fetchScheduleSettings();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              firstName: userData.firstName || prev.firstName,
              lastName: userData.lastName || prev.lastName,
              email: userData.email || prev.email,
              phone: userData.phone || prev.phone,
              company: userData.company || prev.company
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load user profile');
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    // Only check for pending appointments if user is logged in
    if (user) {
      const q = query(
        collection(db, 'schedules'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const schedules = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || 'pending',
          preferredDate: doc.data().preferredDate?.toDate(),
        }));
        
        const pending = schedules.some(s => s.status === 'pending');
        setHasPendingAppointment(pending);
        
        setExistingSchedules(schedules);
      });

      return () => unsubscribe();
    } else {
      // Reset for guest users
      setHasPendingAppointment(false);
      setExistingSchedules([]);
    }
  }, [user]);

  useEffect(() => {
    if (formData.preferredDate) {
      const bookedTimes = existingSchedules
        .filter(schedule => 
          schedule.preferredDate?.toISOString().split('T')[0] === formData.preferredDate
        )
        .map(schedule => schedule.preferredTime);

      setAvailableTimeSlots(timeSlots.filter(time => !bookedTimes.includes(time)));
    } else {
      setAvailableTimeSlots(timeSlots);
    }
  }, [formData.preferredDate, timeSlots, existingSchedules]);

  useEffect(() => {
    if (!formData.preferredTime && availableTimeSlots.length > 0) {
      setFormData(prev => ({
        ...prev,
        preferredTime: availableTimeSlots[0]
      }));
    }
  }, [availableTimeSlots]);

  useEffect(() => {
    // Only check for pending appointments if user is logged in
    if (!user?.uid) {
      setHasPending(false);
      return;
    }

    const q = query(
      schedulesCollection,
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPending(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!formData.preferredDate) return;

    // Create two separate listeners - simpler and more reliable
    const confirmedQuery = query(
      schedulesCollection,
      where('status', '==', 'confirmed')
    );
    
    const pendingQuery = query(
      schedulesCollection,
      where('status', '==', 'pending')
    );
    
    // First listener for confirmed appointments
    const confirmedUnsubscribe = onSnapshot(confirmedQuery, (snapshot) => {
      const slots = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.preferredDate.toDate().toISOString().split('T')[0],
          time: data.preferredTime,
          status: 'confirmed'
        };
      });
      
      setConfirmedSlots(slots);
      updateTakenSlots(slots, pendingSlots);
    });
    
    // Second listener for pending appointments
    const pendingUnsubscribe = onSnapshot(pendingQuery, (snapshot) => {
      const slots = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.preferredDate.toDate().toISOString().split('T')[0],
          time: data.preferredTime,
          status: 'pending'
        };
      });
      
      setPendingSlots(slots);
      updateTakenSlots(confirmedSlots, slots);
    });

    return () => {
      confirmedUnsubscribe();
      pendingUnsubscribe();
    };
  }, [formData.preferredDate, confirmedSlots, pendingSlots]);

  // Add this helper function at the component level (outside any hooks)
  const updateTakenSlots = (confirmed, pending) => {
    // Start with all confirmed slots
    const combined = [...confirmed];
    
    // Add pending slots that don't conflict with confirmed slots
    pending.forEach(pendingSlot => {
      const hasConflict = confirmed.some(
        slot => slot.date === pendingSlot.date && slot.time === pendingSlot.time
      );
      
      if (!hasConflict) {
        combined.push(pendingSlot);
      }
    });
    
    setTakenTimeSlots(combined);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;
    
    if (name === 'preferredDate' || name === 'preferredTime') {
      const date = name === 'preferredDate' ? value : formData.preferredDate;
      const time = name === 'preferredTime' ? value : formData.preferredTime;
      
      const isConflict = checkScheduleConflict(date, time);
      setScheduleConflict(isConflict);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : newValue
    }));
  };

  const checkScheduleConflict = (date, time) => {
    if (!date || !time) return false;
    
    const selectedDateTime = new Date(`${date}T${time}`);
    return existingSchedules.some(schedule => {
      const scheduleDate = schedule.preferredDate;
      const scheduleTime = schedule.preferredTime;
      if (!scheduleDate || !scheduleTime) return false;
      
      const scheduleDateTime = new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        scheduleDate.getDate(),
        parseInt(scheduleTime.split(':')[0]),
        parseInt(scheduleTime.split(' ')[0].split(':')[1])
      );
      
      return scheduleDateTime.getTime() === selectedDateTime.getTime();
    });
  };

  const isTimeValid = (dateString, timeString) => {
    const now = new Date();
    const [hours, minutes] = convertTimeTo24(timeString);
    const selectedDateTime = new Date(dateString);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return selectedDateTime > now;
  };

  const getMinDate = () => {
    const now = new Date();
    const phDate = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return phDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Check if logged-in user has pending appointments
    if (user && hasPendingAppointment) {
      toast.error('You have a pending appointment. Please wait for confirmation.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.preferredTime) {
      toast.error('Please select a time slot');
      setIsSubmitting(false);
      return;
    }

    if (scheduleConflict) {
      toast.error('Please select an available time slot');
      setIsSubmitting(false);
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      toast.error('Please enter your first and last name');
      setIsSubmitting(false);
      return;
    }

    if (!formData.email) {
      toast.error('Please enter your email address');
      setIsSubmitting(false);
      return;
    }

    const selectedDate = new Date(formData.preferredDate);
    const now = new Date();
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const todayPH = new Date(phNow);
    todayPH.setUTCHours(0, 0, 0, 0);

    const selectedPHDate = new Date(selectedDate);
    selectedPHDate.setUTCHours(0, 0, 0, 0);

    if (selectedPHDate < todayPH) {
      toast.error('Please select today or a future date');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create different schedule data objects based on authentication status
      let scheduleData;
      
      if (user) {
        // For authenticated users
        scheduleData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          businessType: formData.businessType,
          consultationType: formData.consultationType,
          preferredDate: Timestamp.fromDate(selectedDate),
          preferredTime: formData.preferredTime,
          message: formData.message,
          status: "pending",
          createdAt: serverTimestamp(),
          userId: user.uid,
          isGuestBooking: false
        };
      } else {
        // For guest users - ensure strict compliance with security rules
        scheduleData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          businessType: formData.businessType,
          consultationType: formData.consultationType,
          preferredDate: Timestamp.fromDate(selectedDate),
          preferredTime: formData.preferredTime,
          message: formData.message,
          status: "pending",
          createdAt: serverTimestamp(),
          isGuestBooking: true
          // Explicitly NOT including userId for guests
        };
      }

      await addDoc(schedulesCollection, scheduleData);
      
      toast.success('Schedule submitted successfully!');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting schedule:', error);
      
      toast.error(`Failed to submit schedule: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    const dateObj = new Date(dateValue);
    
    const now = new Date();
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const todayPH = new Date(phNow);
    todayPH.setUTCHours(0, 0, 0, 0);

    const selectedPHDate = new Date(dateObj);
    selectedPHDate.setUTCHours(0, 0, 0, 0);

    if (selectedPHDate < todayPH) {
      toast.error('Please select today or a future date');
      return;
    }

    setSelectedDate(dateObj);
    setFormData(prev => ({
      ...prev,
      preferredDate: dateValue,
      preferredTime: ''
    }));
  };

  if (submitted) {
    return (
      <motion.div 
        className="schedule-success"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="success-content">
          <div className="success-icon">✓</div>
          <h2>Consultation Scheduled!</h2>
          <p>Thank you for booking a consultation with us.</p>
          <p>We'll send you a confirmation email shortly with the meeting details.</p>
          <div className="success-actions">
            <Link to="/" className="home-button">
              Return to Home
            </Link>
            <Link to="/products" className="browse-button">
              Browse Products
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="schedule-page">
      {hasPending && (
        <div className="pending-warning bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold">Pending Appointment Exists</h3>
              <p>You have a pending appointment. Please wait for confirmation before scheduling a new one.</p>
            </div>
          </div>
        </div>
      )}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#000000',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#ffffff'
            }
          }
        }}
      />
      <motion.div 
        className="schedule-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="schedule-content">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule a Consultation</h1>
            {!user && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-blue-700">
                    You're scheduling as a guest. For a better experience and to track your appointments,{' '}
                    <Link to="/login" className="font-medium text-blue-700 underline hover:text-blue-600">
                      login
                    </Link>{' '}
                    or{' '}
                    <Link to="/signup" className="font-medium text-blue-700 underline hover:text-blue-600">
                      create an account
                    </Link>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {hasPendingAppointment && (
            <div className="pending-alert">
              ⚠️ You have a pending appointment. Please wait for confirmation before scheduling a new one.
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <form 
              onSubmit={handleSubmit}
              className={`schedule-form ${hasPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <fieldset disabled={hasPending}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="company">Company Name</label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="businessType">Business Type *</label>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="consultationType">Consultation Type *</label>
                    <select
                      id="consultationType"
                      name="consultationType"
                      value={formData.consultationType}
                      onChange={handleInputChange}
                      required
                      disabled={hasPending}
                    >
                      {consultationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="preferredDate">Preferred Date *</label>
                    <input
                      type="date"
                      id="preferredDate"
                      name="preferredDate"
                      value={formData.preferredDate}
                      onChange={handleDateChange}
                      min={getMinDate()}
                      required
                      disabled={hasPending}
                    />
                    {formData.preferredDate && availableTimeSlots.length === 0 && (
                      <p className="text-red-500 text-sm mt-1">
                        No available time slots for this date
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="preferredTime">Preferred Time *</label>
                    <div className="time-slots-grid">
                      <input
                        type="hidden"
                        name="preferredTime"
                        value={formData.preferredTime}
                        required
                        disabled={hasPending}
                      />
                      {timeSlots.map(slot => {
                        const takenSlot = takenTimeSlots.find(conflict => 
                          conflict.date === formData.preferredDate &&
                          conflict.time === slot
                        );
                        
                        const isConfirmed = takenSlot?.status === 'confirmed';
                        const isPending = takenSlot?.status === 'pending';
                        
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`time-slot 
                              ${isConfirmed ? 'taken' : ''} 
                              ${isPending ? 'pending' : ''} 
                              ${formData.preferredTime === slot ? 'selected' : ''}`}
                            onClick={() => (!isConfirmed && !isPending) && setFormData({...formData, preferredTime: slot})}
                            disabled={isConfirmed || isPending || hasPending}
                            title={isConfirmed ? 'This slot is already booked' : 
                                  isPending ? 'This slot has a pending appointment' : ''}
                          >
                            {slot}
                            {isConfirmed && <span className="absolute top-0 right-0 text-red-500">✗</span>}
                            {isPending && <span className="absolute top-0 right-0 text-yellow-500">⌛</span>}
                            {formData.preferredTime === slot && <div className="selection-dot"></div>}
                          </button>
                        );
                      })}
                    </div>
                    {scheduleConflict && (
                      <p className="text-red-500 text-sm mt-1">
                        This time slot is already booked
                      </p>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="message">Additional Information</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Tell us about your project and any specific questions you have..."
                      disabled={hasPending}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        required
                        disabled={hasPending}
                      />
                      I agree to the terms and conditions
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting || hasPending}
                >
                  {isSubmitting ? 'Submitting...' : 'Schedule Consultation'}
                </button>
              </fieldset>
            </form>
          )}
        </div>

        <div className="schedule-sidebar">
          <div className="info-card">
            <h3>What to Expect</h3>
            <ul>
              <li>30-minute video consultation</li>
              <li>Product development discussion</li>
              <li>Pricing and MOQ information</li>
              <li>Timeline and process overview</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Contact Support</h3>
            <p>Need help? Contact our support team:</p>
            <a href="mailto:support@blcp.com" className="support-link">
              support@blcp.com
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Schedule; 