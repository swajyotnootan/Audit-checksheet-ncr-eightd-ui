// src/components/NotificationBell.jsx
import React from 'react';
import { useNotifications } from '../components/NotificationContext';

export default function NotificationBell() {
  const { NotificationBell: BellComponent } = useNotifications();
  return <BellComponent />;
}