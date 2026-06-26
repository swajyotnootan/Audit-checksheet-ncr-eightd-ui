// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X, Bell, Calendar, ClipboardList, UserCheck, Send, ThumbsUp, ThumbsDown, ArrowRight, Clock } from 'lucide-react';
import { notificationAPI } from '../components/services/api';
import { useAuth } from '../components/context/AuthContext';
 
const NotificationContext = createContext();
 
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
 
// Enhanced Notification Sound Manager
class NotificationSound {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.8; // 80% volume for loud notifications
    this.isInitialized = false;
    this.pendingSounds = [];
    this.isPlaying = false;
  }
 
  // Initialize Audio Context
  async init() {
    if (this.isInitialized && this.audioContext?.state === 'running') {
      return;
    }
   
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
     
      // Resume context
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
     
      this.isInitialized = true;
      console.log('✅ Notification sound system initialized');
     
      // Play any pending sounds
      if (this.pendingSounds.length > 0) {
        this.processPendingSounds();
      }
     
      return true;
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
      return false;
    }
  }
 
  async processPendingSounds() {
    while (this.pendingSounds.length > 0) {
      const sound = this.pendingSounds.shift();
      await this.playNotificationSound(sound.type);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
 
  // Force initialize sound on page load
  async forceInit() {
    try {
      // Create a silent audio context to bypass autoplay policies
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
     
      // Create a silent gain node to initialize
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      silentGain.connect(this.audioContext.destination);
     
      const silentOsc = this.audioContext.createOscillator();
      silentOsc.connect(silentGain);
      silentOsc.start();
      silentOsc.stop(0.001);
     
      await this.audioContext.resume();
      this.isInitialized = true;
      console.log('✅ Force initialized notification sound');
      return true;
    } catch (error) {
      console.warn('Force init failed, will init on user interaction:', error);
      return false;
    }
  }
 
  async playBeep() {
    if (!this.isEnabled) return;
   
    try {
      await this.ensureInitialized();
     
      if (!this.audioContext || this.audioContext.state !== 'running') {
        this.queueSound('info');
        return;
      }
     
      const now = this.audioContext.currentTime;
     
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();
     
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
     
      filterNode.type = 'bandpass';
      filterNode.frequency.value = 2000;
      filterNode.Q.value = 5;
     
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.7, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
     
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
     
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode2 = this.audioContext.createGain();
      const filterNode2 = this.audioContext.createBiquadFilter();
     
      oscillator2.connect(filterNode2);
      filterNode2.connect(gainNode2);
      gainNode2.connect(this.audioContext.destination);
     
      filterNode2.type = 'bandpass';
      filterNode2.frequency.value = 2000;
      filterNode2.Q.value = 5;
     
      gainNode2.gain.setValueAtTime(0, now + 0.15);
      gainNode2.gain.linearRampToValueAtTime(this.volume, now + 0.16);
      gainNode2.gain.linearRampToValueAtTime(this.volume * 0.7, now + 0.25);
      gainNode2.gain.linearRampToValueAtTime(0, now + 0.5);
     
      oscillator2.frequency.setValueAtTime(660, now + 0.15);
      oscillator2.start(now + 0.15);
      oscillator2.stop(now + 0.4);
     
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
 
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
 
  queueSound(type) {
    this.pendingSounds.push({ type, timestamp: Date.now() });
    if (!this.isPlaying) {
      this.processPendingSounds();
    }
  }
 
  async playNotificationSound(type = 'info') {
    if (!this.isEnabled) return;
   
    try {
      await this.ensureInitialized();
     
      if (!this.audioContext || this.audioContext.state !== 'running') {
        this.queueSound(type);
        return;
      }
     
      const now = this.audioContext.currentTime;
     
      switch(type) {
        case 'success':
          this.playSuccessSound();
          break;
        case 'error':
          this.playErrorSound();
          break;
        case 'warning':
          this.playWarningSound();
          break;
        default:
          this.playDefaultSound();
      }
     
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
 
  playSuccessSound() {
    if (!this.audioContext) return;
   
    const now = this.audioContext.currentTime;
    const frequencies = [523.25, 659.25, 783.99];
   
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
     
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
     
      const startTime = now + (index * 0.1);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);
     
      oscillator.frequency.value = freq;
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }
 
  playErrorSound() {
    if (!this.audioContext) return;
   
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
   
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
   
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.3);
   
    gainNode.gain.setValueAtTime(this.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
   
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }
 
  playWarningSound() {
    if (!this.audioContext) return;
   
    const now = this.audioContext.currentTime;
    const frequencies = [880, 660];
   
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
     
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
     
      const startTime = now + (index * 0.3);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.25);
     
      oscillator.frequency.value = freq;
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    });
  }
 
  playDefaultSound() {
    if (!this.audioContext) return;
   
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
   
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
   
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
   
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
   
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }
 
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled && !this.isInitialized) {
      this.init();
    }
  }
 
  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
  }
}
 
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
 
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [isSoundReady, setIsSoundReady] = useState(false);
 
  const notificationSound = useRef(null);
  const lastNotificationTime = useRef(0);
  const previousUnreadCount = useRef(0);
  const initAttempted = useRef(false);
 
  const lastNotificationsRef = useRef([]);
  const isMountedRef = useRef(true);
  const isFirstLoadRef = useRef(true);
  // Initialize notification sound system
  const initSoundSystem = useCallback(async () => {
    if (initAttempted.current) return;
    initAttempted.current = true;
   
    try {
      notificationSound.current = new NotificationSound();
      notificationSound.current.setVolume(soundVolume);
      notificationSound.current.setEnabled(soundEnabled);
     
      // Try to initialize immediately
      const initResult = await notificationSound.current.forceInit();
      setIsSoundReady(initResult);
     
      // Also set up user interaction listeners for browsers that require it
      const initOnInteraction = async () => {
        if (notificationSound.current && !notificationSound.current.isInitialized) {
          await notificationSound.current.init();
          setIsSoundReady(true);
          console.log('✅ Sound system initialized via user interaction');
        }
        // Remove listeners after initialization
        document.removeEventListener('click', initOnInteraction);
        document.removeEventListener('keydown', initOnInteraction);
        document.removeEventListener('touchstart', initOnInteraction);
      };
     
      document.addEventListener('click', initOnInteraction);
      document.addEventListener('keydown', initOnInteraction);
      document.addEventListener('touchstart', initOnInteraction);
     
    } catch (error) {
      console.error('Failed to initialize sound system:', error);
    }
  }, [soundVolume, soundEnabled]);
 
  // Initialize sound on component mount
  useEffect(() => {
    initSoundSystem();
  }, [initSoundSystem]);
 
  // Re-initialize when user logs in (important for deputy manager and auditee)
  useEffect(() => {
    if (user?.id) {
      console.log('User logged in:', user.role);
      // Re-initialize sound for the logged-in user
      if (notificationSound.current) {
        notificationSound.current.init();
      } else {
        initSoundSystem();
      }
    }
  }, [user?.id, user?.role, initSoundSystem]);
 
  // Load Notifications from Backend
const loadNotifications = useCallback(async () => {
  if (!user?.id) return;
 
  setLoading(true);
  try {
    const data = await notificationAPI.getForUser(user.id);
   
    // Compare with previous data to prevent unnecessary updates
    const currentDataStr = JSON.stringify(data);
    const lastDataStr = JSON.stringify(lastNotificationsRef.current);
   
    if (currentDataStr !== lastDataStr) {
      console.log('Loaded notifications for user:', user.role, data.length);
     
      setNotifications(data);
      lastNotificationsRef.current = data;
     
      const newUnreadCount = data.filter(n => !n.read).length;
     
      // Check for new unread notifications
      if (newUnreadCount > previousUnreadCount.current && soundEnabled) {
        const newNotifications = data.filter(n => !n.read);
        if (newNotifications.length > 0) {
          const latestNotification = newNotifications[0];
          const notificationType = getNotificationSoundType(latestNotification.title);
         
          if (notificationSound.current && isSoundReady) {
            await notificationSound.current.playNotificationSound(notificationType);
          } else if (notificationSound.current) {
            notificationSound.current.queueSound(notificationType);
          }
        }
      }
     
      setUnreadCount(newUnreadCount);
      previousUnreadCount.current = newUnreadCount;
    }
   
  } catch (error) {
    console.error('Error loading notifications:', error);
  } finally {
    setLoading(false);
  }
}, [user?.id, user?.role]); // ← NOTIFICATIONS REMOVED from deps
 
 
 
useEffect(() => {
  if (user?.id) {
    // Reset on user change
    lastNotificationsRef.current = [];
    previousUnreadCount.current = 0;
    loadNotifications();
   
    // Set up polling for real-time notifications (increased to 15 seconds)
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 15000);
   
    return () => clearInterval(intervalId);
  }
}, [user?.id]); // Keep as is
 
  // Get sound type based on notification title/type
  const getNotificationSoundType = (title) => {
    if (title?.includes('Approved') || title?.includes('Success')) return 'success';
    if (title?.includes('Rejected') || title?.includes('Failed') || title?.includes('Error')) return 'error';
    if (title?.includes('Warning') || title?.includes('Pending') || title?.includes('requires')) return 'warning';
    return 'info';
  };
 
  // Play sound for new notification with throttling
  const playNotificationSoundWithThrottle = useCallback(async (type = 'info') => {
    if (!soundEnabled) return;
   
    const now = Date.now();
    // Throttle sounds to at most one every 500ms
    if (now - lastNotificationTime.current < 500) return;
   
    lastNotificationTime.current = now;
   
    // Ensure sound system is ready
    if (notificationSound.current) {
      if (!notificationSound.current.isInitialized) {
        await notificationSound.current.init();
      }
      await notificationSound.current.playNotificationSound(type);
    }
  }, [soundEnabled]);
 
  // Add Notification (Local fallback)
  const addNotification = (title, message, type = 'info', metadata = {}) => {
    const { navigateTo, location, actionText, ...restMetadata } = metadata;
   
    const newNotification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      navigateTo,
      location,
      actionText: actionText || 'Review & Take Action',
      ...restMetadata,
    };
   
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
   
    // Play sound for new notification
    const soundType = getNotificationSoundType(title);
    playNotificationSoundWithThrottle(soundType);
   
    // Also show browser notification if permitted
    showBrowserNotification(title, message);
   
    showToastNotification(title, message, type);
   
    return newNotification;
  };
 
  // Browser Notification
  const showBrowserNotification = (title, message) => {
    if (!("Notification" in window)) return;
   
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        vibrate: [200, 100, 200],
        silent: false,
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  };
 
  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }
   
    if (Notification.permission === "granted") {
      return true;
    }
   
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
   
    return false;
  }, []);
 
  // Mark as Read and Navigate
  const markAsReadAndNavigate = async (notification, e) => {
    if (e) {
      e.stopPropagation();
    }
   
    if (!notification.read) {
      try {
        await notificationAPI.markAsRead(notification.id, user?.id);
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
   
    setIsOpen(false);
   
    if (notification.navigateTo) {
      setTimeout(() => {
        window.location.href = notification.navigateTo;
      }, 150);
    }
  };
 
  const markAllAsRead = async () => {
    if (!user?.id) return;
   
    try {
      await notificationAPI.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read', 'Success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Failed to mark all as read', 'Error');
    }
  };
 
  const clearAllNotifications = async () => {
    if (!user?.id) return;
   
    try {
      await notificationAPI.clearAll(user.id);
      setNotifications([]);
      setUnreadCount(0);
      showSuccess('All notifications cleared', 'Success');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      showError('Failed to clear notifications', 'Error');
    }
  };
 
  // Toast Functions
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...toast,
    };
    setToasts(prev => [...prev, newToast]);
    if (newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
    return id;
  }, []);
 
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
 
  const showToastNotification = useCallback((title, message, type = 'info', duration = 5000) => {
    return addToast({ type, title, message, duration });
  }, [addToast]);
 
  const showSuccess = useCallback((message, title = 'Success', duration = 5000) => {
    playNotificationSoundWithThrottle('success');
    return addToast({ type: 'success', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);
 
  const showError = useCallback((message, title = 'Error', duration = 7000) => {
    playNotificationSoundWithThrottle('error');
    return addToast({ type: 'error', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);
 
  const showWarning = useCallback((message, title = 'Warning', duration = 6000) => {
    playNotificationSoundWithThrottle('warning');
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);
 
  const showInfo = useCallback((message, title = 'Info', duration = 5000) => {
    playNotificationSoundWithThrottle('info');
    return addToast({ type: 'info', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);
 
  // Sound Control Functions
  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    if (notificationSound.current) {
      notificationSound.current.setEnabled(true);
      notificationSound.current.init();
      // Play test sound
      setTimeout(() => {
        notificationSound.current.playDefaultSound();
      }, 100);
    }
  }, []);
 
  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    if (notificationSound.current) {
      notificationSound.current.setEnabled(false);
    }
  }, []);
 
  const setSoundVolumeLevel = useCallback((volume) => {
    const newVolume = Math.min(1, Math.max(0, volume));
    setSoundVolume(newVolume);
    if (notificationSound.current) {
      notificationSound.current.setVolume(newVolume);
    }
  }, []);
 
  const testSound = useCallback(() => {
    if (soundEnabled && notificationSound.current) {
      notificationSound.current.playNotificationSound('info');
    }
  }, [soundEnabled]);
 
  const addWorkflowNotification = (workflowType, action, data) => {
    console.log('Workflow notification triggered:', { workflowType, action, data });
  };
 
  // Helper function to format date
 // Helper function to format date - FIXED for IST
// Helper function to format date - FIXED for IST
const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  try {
    let dateStr = String(timestamp).trim();
    let date;
    
    // If it's already formatted as DD-MM-YYYY HH:mm:ss
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}/)) {
      // Return as-is - it's already formatted
      return dateStr;
    }
    
    // If it's a Unix timestamp (number)
    if (!isNaN(dateStr) && dateStr.length <= 13) {
      date = new Date(parseInt(dateStr));
    } 
    // Handle ISO format
    else if (dateStr.includes('T')) {
      if (!dateStr.includes('Z') && !dateStr.includes('+')) {
        dateStr = dateStr + 'Z';
      }
      date = new Date(dateStr);
    } 
    // Handle format with space
    else if (dateStr.includes(' ')) {
      // Try parsing as "YYYY-MM-DD HH:mm:ss"
      const parts = dateStr.split(' ');
      if (parts[0].includes('-')) {
        date = new Date(dateStr.replace(' ', 'T') + 'Z');
      } else {
        // Try parsing as "DD-MM-YYYY HH:mm:ss"
        const dateParts = parts[0].split('-');
        if (dateParts.length === 3) {
          date = new Date(
            parseInt(dateParts[2]), // year
            parseInt(dateParts[1]) - 1, // month
            parseInt(dateParts[0]), // day
            parseInt(parts[1]?.split(':')[0] || 0),
            parseInt(parts[1]?.split(':')[1] || 0)
          );
        } else {
          date = new Date(dateStr);
        }
      }
    } 
    else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date:', timestamp);
      return String(timestamp);
    }
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('❌ Date formatting error:', error);
    return String(timestamp);
  }
};
 
  // Determine action text based on notification title
  const getActionText = (title) => {
    if (title?.includes('Approval')) return 'Review & Approve';
    if (title?.includes('Review')) return 'Review & Take Action';
    if (title?.includes('Sign')) return 'Review & Sign';
    if (title?.includes('Assigned')) return 'View Details';
    return 'Take Action';
  };
 
  // Get icon based on notification title/type
  const getNotificationIcon = (title, type) => {
    if (title?.includes('Schedule')) return <Calendar size={20} />;
    if (title?.includes('Audit')) return <ClipboardList size={20} />;
    if (title?.includes('Assigned')) return <UserCheck size={20} />;
    if (title?.includes('Approved')) return <ThumbsUp size={20} />;
    if (title?.includes('Rejected')) return <ThumbsDown size={20} />;
    if (title?.includes('Released')) return <Send size={20} />;
    if (title?.includes('Pending')) return <Clock size={20} />;
   
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <XCircle size={20} />;
      case 'warning': return <AlertCircle size={20} />;
      default: return <Info size={20} />;
    }
  };
 
  // Get status color
  const getStatusColor = (title, type) => {
    if (title?.includes('Approved')) return 'text-green-600';
    if (title?.includes('Rejected')) return 'text-red-600';
    if (title?.includes('Pending') || title?.includes('requires')) return 'text-yellow-600';
    if (title?.includes('Released')) return 'text-purple-600';
    if (title?.includes('Assigned')) return 'text-blue-600';
   
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };
 
  // Get status text
  const getStatusText = (title) => {
    if (title?.includes('Approved')) return 'Approved';
    if (title?.includes('Rejected')) return 'Rejected';
    if (title?.includes('Pending') || title?.includes('requires')) return 'Pending';
    if (title?.includes('Released')) return 'Released';
    if (title?.includes('Assigned')) return 'Assigned';
    return 'Info';
  };
 
  // Sound Control Panel Component
  const SoundControlPanel = () => (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">🔔 Notification Sounds</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Enable Sounds</span>
          <button
            onClick={() => soundEnabled ? disableSound() : enableSound()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
       
        {soundEnabled && (
          <>
            <div>
              <label className="block mb-1 text-sm text-gray-700">
                🔊 Volume: {Math.round(soundVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundVolume}
                onChange={(e) => setSoundVolumeLevel(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>🔇</span>
                <span>🔉</span>
                <span>🔊</span>
              </div>
            </div>
           
            <button
              onClick={testSound}
              className="flex items-center justify-center w-full gap-2 py-2 text-sm text-blue-600 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
            >
              <span>🔊</span> Test Sound
            </button>
          </>
        )}
       
        <button
          onClick={requestNotificationPermission}
          className="w-full py-2 text-sm text-gray-700 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100"
        >
          🔔 Enable Browser Notifications
        </button>
       
        {!isSoundReady && (
          <p className="mt-2 text-xs text-center text-yellow-600">
            ⚡ Click anywhere to enable notification sounds
          </p>
        )}
      </div>
    </div>
  );
 
  // Notification Bell Component
  const NotificationBell = () => (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="relative p-2 text-white transition-all duration-200 rounded-lg hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <Bell size={30} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[12px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
 
  // Notification Panel Component
  const NotificationPanel = () => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
         
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 z-50 flex flex-col w-full h-full max-w-md overflow-hidden shadow-2xl bg-gray-50"
          >
            <div className="sticky top-0 z-10 px-5 py-4 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-2 py-1 text-xs font-medium text-blue-600 transition-colors rounded-md hover:text-blue-700 hover:bg-blue-50"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
 
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                  <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-16">
                  <div className="flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
                    <Bell size={32} className="text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-500">No notifications</p>
                  <p className="mt-1 text-xs text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer ${
                      !notification.read ? 'border-l-4 border-l-yellow-400' : 'border-gray-200'
                    }`}
                    onClick={(e) => markAsReadAndNavigate(notification, e)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${
                            !notification.read ? 'bg-yellow-50' : 'bg-gray-50'
                          }`}>
                            <div className={getStatusColor(notification.title, notification.type)}>
                              {getNotificationIcon(notification.title, notification.type)}
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            !notification.read
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getStatusText(notification.title)}
                            {!notification.read && ' • Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {formatDate(notification.timestamp)}
                        </div>
                      </div>
                     
                      <h3 className="mb-1 text-sm font-semibold text-gray-800">
                        {notification.title}
                      </h3>
                     
                      <p className="mb-3 text-xs leading-relaxed text-gray-600">
                        {notification.message}
                      </p>
                     
                      {notification.location && (
                        <p className="flex items-center gap-1 mb-3 text-xs text-gray-400">
                          📍 {notification.location}
                        </p>
                      )}
                     
                      <button
                        onClick={(e) => markAsReadAndNavigate(notification, e)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          !notification.read
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {getActionText(notification.title)}
                        <ArrowRight size={12} />
                      </button>
                     
                      {!notification.read && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <p className="text-[10px] text-yellow-600 flex items-center gap-1">
                            <Clock size={10} />
                            Pending until action taken
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
 
            {notifications.length > 0 && (
              <div className="sticky bottom-0 px-5 py-3 bg-white border-t border-gray-200 shadow-lg">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
                      clearAllNotifications();
                    }
                  }}
                  className="w-full py-2 text-xs text-center text-gray-500 transition-colors rounded-lg hover:text-gray-700 hover:bg-gray-50"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
 
  // Toast Container
  const ToastContainer = () => (
    <div className="fixed z-50 max-w-sm space-y-2 bottom-4 right-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              toast.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              toast.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
              'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="p-3 pr-8">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {toast.type === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  {toast.title && (
                    <p className={`text-xs font-semibold ${
                      toast.type === 'success' ? 'text-green-800' :
                      toast.type === 'error' ? 'text-red-800' :
                      toast.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                    }`}>
                      {toast.title}
                    </p>
                  )}
                  <p className={`text-xs ${
                    toast.type === 'success' ? 'text-green-700' :
                    toast.type === 'error' ? 'text-red-700' :
                    toast.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    {toast.message}
                  </p>
                </div>
                <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 -mt-0.5 -mr-1 p-1">
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
              <motion.div
                className={`h-full ${
                  toast.type === 'success' ? 'bg-green-500' :
                  toast.type === 'error' ? 'bg-red-500' :
                  toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration || 5000) / 1000, ease: "linear" }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
 
  const value = {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    loading,
    addNotification,
    addWorkflowNotification,
    markAsReadAndNavigate,
    markAllAsRead,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    NotificationBell,
    NotificationPanel,
    ToastContainer,
    soundEnabled,
    soundVolume,
    enableSound,
    disableSound,
    setSoundVolumeLevel,
    testSound,
    SoundControlPanel,
    requestNotificationPermission,
    isSoundReady,
  };
 
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer />
      <NotificationPanel />
    </NotificationContext.Provider>
  );
};
 