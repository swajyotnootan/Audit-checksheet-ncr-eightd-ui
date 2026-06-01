// src/components/NotificationPanel.jsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, X, Bell, Info, AlertCircle, MapPin, Filter } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = ({ user }) => {
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    setIsOpen, 
    markAsRead, 
    markCurrentAsViewed,
    getNotificationsByLocation,
    getUniqueLocations
  } = useNotifications();
  const navigate = useNavigate();
  const prevIsOpenRef = useRef(isOpen);
  const [locationFilter, setLocationFilter] = useState(null);
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Get user's location from auth
  const userLocation = user?.location || user?.site || null;
  const uniqueLocations = getUniqueLocations();

  // Filter notifications based on selected location
  const filteredNotifications = locationFilter 
    ? getNotificationsByLocation(locationFilter)
    : notifications;

  // Auto-filter to user's location if available
  useEffect(() => {
    if (userLocation && !locationFilter && uniqueLocations.includes(userLocation)) {
      setLocationFilter(userLocation);
    }
  }, [userLocation, uniqueLocations]);

  // Mark notifications as viewed when panel closes
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      markCurrentAsViewed();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, markCurrentAsViewed]);

  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Close panel
    setIsOpen(false);
    
    // Navigate if there's a path
    if (notification.navigateTo) {
      navigate(notification.navigateTo);
    }
  };

  const getIcon = (type, notification) => {
    // Check for workflow-specific icons
    if (notification.title?.includes('Approved')) {
      return <CheckCircle className="text-green-500" size={18} />;
    }
    if (notification.title?.includes('Rejected')) {
      return <XCircle className="text-red-500" size={18} />;
    }
    if (notification.title?.includes('Pending') || notification.title?.includes('Required')) {
      return <AlertCircle className="text-yellow-500" size={18} />;
    }
    
    // Default icons based on type
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'error':
        return <XCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-40"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b z-10">
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Location Filter Button */}
                    {uniqueLocations.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowLocationFilter(!showLocationFilter)}
                          className={`p-2 rounded-lg transition ${
                            locationFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Filter size={18} />
                        </button>
                        
                        {showLocationFilter && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20">
                            <div className="p-2">
                              <button
                                onClick={() => {
                                  setLocationFilter(null);
                                  setShowLocationFilter(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                                  !locationFilter ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                                }`}
                              >
                                All Locations
                              </button>
                              {uniqueLocations.map(loc => (
                                <button
                                  key={loc}
                                  onClick={() => {
                                    setLocationFilter(loc);
                                    setShowLocationFilter(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                                    locationFilter === loc ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {loc}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Active Location Filter Badge */}
                {locationFilter && (
                  <div className="px-4 pb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      <MapPin size={12} />
                      {locationFilter}
                      <button
                        onClick={() => setLocationFilter(null)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No notifications</p>
                    {locationFilter && (
                      <p className="text-xs text-gray-400 mt-1">
                        No notifications for {locationFilter}
                      </p>
                    )}
                    {!locationFilter && (
                      <p className="text-xs text-gray-400 mt-1">
                        You're all caught up!
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          !notification.read 
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type, notification)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            
                            {/* Location Badge */}
                            {(notification.location || notification.site) && (
                              <div className="flex items-center gap-1 mt-2">
                                <MapPin size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {notification.location || notification.site}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-xs text-gray-400">
                                {getTimeAgo(notification.timestamp)}
                              </p>
                              {notification.navigateTo && (
                                <span className="text-xs text-blue-600 hover:text-blue-700">
                                  Click to view →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationPanel;