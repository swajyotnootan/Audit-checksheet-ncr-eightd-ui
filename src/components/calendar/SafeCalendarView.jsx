// src/components/calendar/SafeCalendarView.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarProvider } from '../context/CalendarContext';
import CalendarView from './CalendarView';

const SafeCalendarView = () => {
  const { user } = useAuth();
  
  return (
    <CalendarProvider user={user}>
      <CalendarView />
    </CalendarProvider>
  );
};

export default SafeCalendarView;