// components/context/CalendarContext.js - Modified to accept user as prop
import { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';

const CalendarContext = createContext(null);

export function CalendarProvider({ children, user }) {  // ✅ Accept user as prop
  const [connectionStatus, setConnectionStatus] = useState('connected');

  const sendEventCreated = (eventData) => {
    console.log('Event created:', eventData);
    window.dispatchEvent(new CustomEvent('event-created', { 
      detail: { ...eventData, user: user?.email } 
    }));
    toast.success('Event created successfully!');
  };
  
  const sendEventUpdated = (eventData) => {
    console.log('Event updated:', eventData);
    window.dispatchEvent(new CustomEvent('event-updated', { 
      detail: { ...eventData, user: user?.email } 
    }));
    toast.success('Event updated successfully!');
  };
  
  const sendEventDeleted = (eventData) => {
    console.log('Event deleted:', eventData);
    window.dispatchEvent(new CustomEvent('event-deleted', { 
      detail: { id: eventData.id, user: user?.email } 
    }));
    toast.success('Event deleted successfully!');
  };
  
  const sendCalendarSync = () => {
    console.log('Calendar sync requested');
    window.dispatchEvent(new CustomEvent('calendar-sync', { 
      detail: { user: user?.email } 
    }));
    toast.success('Calendar synchronized!');
  };

  const value = {
    isConnected: true,
    connectionStatus: 'connected',
    sendEventCreated,
    sendEventUpdated,
    sendEventDeleted,
    sendCalendarSync,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    console.warn('useCalendar called outside CalendarProvider - using mock implementation');
    return {
      isConnected: true,
      connectionStatus: 'connected',
      sendEventCreated: (data) => {
        console.log('Mock sendEventCreated:', data);
        window.dispatchEvent(new CustomEvent('event-created', { detail: data }));
        toast.success('Event created successfully!');
      },
      sendEventUpdated: (data) => {
        console.log('Mock sendEventUpdated:', data);
        window.dispatchEvent(new CustomEvent('event-updated', { detail: data }));
        toast.success('Event updated successfully!');
      },
      sendEventDeleted: (data) => {
        console.log('Mock sendEventDeleted:', data);
        window.dispatchEvent(new CustomEvent('event-deleted', { detail: { id: data.id } }));
        toast.success('Event deleted successfully!');
      },
      sendCalendarSync: () => {
        console.log('Mock sendCalendarSync');
        window.dispatchEvent(new CustomEvent('calendar-sync'));
        toast.success('Calendar synchronized!');
      },
    };
  }
  return context;
}