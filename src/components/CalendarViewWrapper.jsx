// src/components/CalendarViewWrapper.jsx
import React from 'react';
import { CalendarProvider } from './context/CalendarContext';
import CalendarView from './calendar/CalendarView';

const CalendarViewWrapper = () => {
  return (
    <CalendarProvider>
      <CalendarView />
    </CalendarProvider>
  );
};

export default CalendarViewWrapper;