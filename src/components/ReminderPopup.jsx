// src/components/ReminderPopup.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDuePopupReminders, markPopupShown } from './services/api';

const ReminderPopup = () => {
  const [inspectionId, setInspectionId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-check for due reminders on every route change
  useEffect(() => {
    const checkReminders = () => {
      const dueIds = getDuePopupReminders();
      if (dueIds.length > 0) {
        const id = dueIds[0]; // Show first due reminder
        setInspectionId(id);
        markPopupShown(id); // Ensure it only shows once
      }
    };

    checkReminders();
  }, [location.pathname]);

  const handleGoToForm = () => {
    setInspectionId(null);
    navigate('/dashboard/renewsys', { 
      state: { openInspectionId: inspectionId, openStep: 6 } 
    });
  };

  const handleClose = () => {
    setInspectionId(null);
  };

  if (!inspectionId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="text-center py-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              ⏰ Time Completed!
            </h3>
            <p className="text-gray-700 mb-4">
              Your scheduled time has completed. You can fill the 6th form now.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Go to Form
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReminderPopup;