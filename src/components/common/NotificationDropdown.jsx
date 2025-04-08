import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { FaTrash } from 'react-icons/fa';

const NotificationDropdown = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [audio] = useState(typeof Audio !== 'undefined' && new Audio('/notification.mp3'));
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check if device is mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user?.uid || ''),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setNotifications(notificationsData);
      setLoading(false);
      
      // Play sound for new notifications
      const hasNewNotification = notificationsData.some(n => !n.read);
      if (hasNewNotification && audio) {
        audio.play().catch(e => console.log('Audio play prevented:', e));
      }
    }, (err) => {
      console.error("Error fetching notifications:", err);
      setError(`Notification access error: ${err.message}`);
      setLoading(false);
      setNotifications([]); // Set empty array to avoid undefined errors
    });

    return () => unsubscribe();
  }, [user?.uid, audio]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const markAsRead = async (notificationId) => {
    if (!user?.uid) return;
    
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.uid) return;
    
    try {
      console.log('Deleting notification with ID:', notificationId);
      
      // First verify the notification exists and belongs to this user
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationSnap = await getDoc(notificationRef);
      
      if (!notificationSnap.exists()) {
        console.error('Notification does not exist:', notificationId);
        return;
      }
      
      const notificationData = notificationSnap.data();
      if (notificationData.userId !== user.uid) {
        console.error('Cannot delete notification that belongs to another user');
        return;
      }
      
      // Then perform the deletion
      await deleteDoc(notificationRef);
      
      // After deletion, verify it was actually deleted
      const verificationSnap = await getDoc(notificationRef);
      if (verificationSnap.exists()) {
        console.error('Failed to delete notification - still exists after deletion');
      } else {
        console.log('Notification successfully deleted and verified');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid || notifications.length === 0) return;
    
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, { read: true });
      });
      
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user?.uid || notifications.length === 0) return;
    
    try {
      console.log(`Attempting to delete all ${notifications.length} notifications`);
      
      // Create a batch for efficient deletion
      const batch = writeBatch(db);
      const notificationIds = [];
      
      // Add each notification to the batch delete after verifying ownership
      notifications.forEach(notification => {
        if (notification.userId === user.uid) {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.delete(notificationRef);
          notificationIds.push(notification.id);
        } else {
          console.warn('Skipping deletion of notification not owned by user:', notification.id);
        }
      });
      
      // Commit the batch
      await batch.commit();
      console.log(`Batch deletion completed for ${notificationIds.length} notifications`);
      
      // Verify deletions
      setTimeout(async () => {
        try {
          for (const id of notificationIds) {
            const checkRef = doc(db, 'notifications', id);
            const checkSnap = await getDoc(checkRef);
            
            if (checkSnap.exists()) {
              console.error('Notification still exists after deletion:', id);
            }
          }
        } catch (err) {
          console.error('Error verifying deletions:', err);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in batch deletion:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button 
        className="flex items-center text-gray-700 hover:text-blue-600 transition-colors relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`${isMobile ? 'fixed inset-x-0 top-16 mx-2 rounded-lg' : 'absolute right-0 mt-2 w-80'} bg-white rounded-lg shadow-xl z-50 overflow-hidden`}
            style={isMobile ? { maxHeight: 'calc(100vh - 5rem)' } : {}}
          >
            <div className="p-3 md:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-800">Notifications</h3>
                <p className="text-xs md:text-sm text-gray-500">{unreadNotifications} unread</p>
              </div>
              <div className="flex space-x-2">
                {unreadNotifications > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2 hover:bg-blue-50 rounded-md"
                  >
                    Mark all as read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={deleteAllNotifications}
                    className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 hover:bg-red-50 rounded-md"
                  >
                    Delete all
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-6 md:p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 md:p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-600">Could not load notifications</p>
                <button 
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 py-1 px-3 hover:bg-blue-50 rounded-md"
                  onClick={() => setError(null)}
                >
                  Try again
                </button>
              </div>
            ) : notifications.length > 0 ? (
              <div className={`overflow-y-auto ${isMobile ? 'max-h-[calc(100vh-10rem)]' : 'max-h-80'}`}>
                {notifications.map((notification) => (
                  <NavLink
                    key={notification.id}
                    to={`/notifications/${notification.id}`}
                    className={`block border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="p-3 md:p-4 relative">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {notification.type === 'order' ? (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                              {notification.data?.status === 'shipped' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              ) : notification.data?.status === 'delivered' || notification.data?.status === 'completed' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                              )}
                            </div>
                          ) : notification.type === 'schedule-confirmation' ? (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          ) : notification.type === 'schedule-declined' ? (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          ) : notification.type === 'system' ? (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between">
                            <h4 className={`text-sm font-medium ${
                              notification.type === 'schedule-declined' ? 'text-red-600' :
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title || 
                               (notification.type === 'order' ? 'Order Status Update' : 
                                notification.type === 'schedule-confirmation' ? 'Appointment Confirmed' :
                                notification.type === 'schedule-declined' ? 'Appointment Declined' :
                                notification.type === 'appointment' ? 'Appointment Update' :
                                'New Notification')}
                            </h4>
                            <button
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="text-gray-400 hover:text-red-500 ml-2 p-1 rounded-full hover:bg-gray-100"
                              aria-label="Delete notification"
                            >
                              <FaTrash />
                            </button>
                          </div>
                          <p className={`text-xs md:text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                            {notification.message.length > 50 
                              ? `${notification.message.substring(0, 50)}...` 
                              : notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.createdAt ? formatDistanceToNow(notification.createdAt, { addSuffix: true }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                      
                      {notification.media && (
                        <div className="mt-2">
                          {notification.media.type === 'video' ? (
                            <video 
                              controls 
                              className="w-full rounded-lg"
                              preload="none"
                              poster={notification.media.thumbnail || ''}
                            >
                              <source 
                                src={notification.media.url} 
                                type={`video/${notification.media.format || 'mp4'}`} 
                              />
                            </video>
                          ) : notification.media.type === 'image' ? (
                            <img 
                              src={notification.media.url || ''}
                              alt="Notification visual"
                              className="w-full rounded-lg"
                              loading="lazy"
                              onError={(e) => {
                                console.error('Image load error:', notification.media.url);
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </NavLink>
                ))}
              </div>
            ) : (
              <div className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-8 md:w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-3 md:mb-4">No notifications yet</p>
                <p className="text-xs md:text-sm text-gray-500">
                  We'll notify you when something important happens
                </p>
              </div>
            )}
            
            {/* Mobile close button - only visible on mobile */}
            {isMobile && (
              <div className="p-3 border-t border-gray-100 sticky bottom-0 bg-white">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    if (onClose) onClose();
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown; 