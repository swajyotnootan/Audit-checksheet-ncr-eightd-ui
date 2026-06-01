import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';


// Notification Context
const NotificationContext = createContext();

// Notification Provider
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'success', // success, error, warning, info
      title: '',
      message: '',
      duration: 5000, // 5 seconds default
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Predefined notification methods
  const showSuccess = useCallback((message, title = 'Success', duration = 5000) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showError = useCallback((message, title = 'Error', duration = 7000) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showWarning = useCallback((message, title = 'Warning', duration = 6000) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showInfo = useCallback((message, title = 'Info', duration = 5000) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  // Specific MOC notifications
  const showApprovalSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been approved successfully`, 'Approval Complete');
  }, [showSuccess]);

  const showRejectionSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been rejected successfully`, 'Rejection Complete');
  }, [showSuccess]);

  const showMergeSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been merged successfully`, 'Merge Complete');
  }, [showSuccess]);

  const showLoginSuccess = useCallback((userName) => {
    return showSuccess(`Welcome back, ${userName}!`, 'Login Successful');
  }, [showSuccess]);

  const showLogoutSuccess = useCallback(() => {
    return showSuccess('You have been logged out successfully', 'Logout Complete');
  }, [showSuccess]);

  const showSaveSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been saved successfully`, 'Save Complete');
  }, [showSuccess]);

  const showDeleteSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been deleted successfully`, 'Delete Complete');
  }, [showSuccess]);

  const showUpdateSuccess = useCallback((itemName) => {
    return showSuccess(`${itemName} has been updated successfully`, 'Update Complete');
  }, [showSuccess]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApprovalSuccess,
    showRejectionSuccess,
    showMergeSuccess,
    showLoginSuccess,
    showLogoutSuccess,
    showSaveSuccess,
    showDeleteSuccess,
    showUpdateSuccess,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification Container Component
const NotificationContainer = () => {
  const { notifications, removeNotification } = useContext(NotificationContext);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Notification Component
const NotificationItem = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`${getBackgroundColor()} border rounded-xl shadow-lg p-4 relative overflow-hidden`}
    >
      {/* Progress bar */}
      {notification.duration > 0 && (
        <motion.div
          className={`absolute top-0 left-0 h-1 ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            notification.type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: notification.duration / 1000, ease: "linear" }}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className={`font-semibold text-sm ${getTextColor()} mb-1`}>
              {notification.title}
            </h4>
          )}
          <p className={`text-sm ${getTextColor()} leading-relaxed`}>
            {notification.message}
          </p>
        </div>

        <button
          onClick={() => onRemove(notification.id)}
          className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </motion.div>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

