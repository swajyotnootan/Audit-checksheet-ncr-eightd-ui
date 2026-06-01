// // src/components/CalendarModal.jsx - Simplified version
// import React, { useState, useEffect } from 'react';
// import { X } from 'lucide-react';
// import { useAuth } from './context/AuthContext';
// import { CalendarProvider } from './context/CalendarContext';
// import CalendarView from './calendar/CalendarView';

// const CalendarModal = ({ isOpen, onClose }) => {
//   const { user } = useAuth();
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     if (isOpen) {
//       setIsVisible(true);
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = 'auto';
//       const timer = setTimeout(() => setIsVisible(false), 300);
//       return () => clearTimeout(timer);
//     }
//   }, [isOpen]);

//   if (!isVisible && !isOpen) return null;

//   return (
//     <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
//       <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      
//       <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-white rounded-xl shadow-2xl transition-all duration-300 flex flex-col ${
//         isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
//       }`}>
//         {/* Modal Header - Minimal */}
//         <div className="flex justify-between items-center p-4 border-b border-gray-200">
//           <h2 className="text-lg font-semibold text-gray-800">Audit Calendar</h2>
//           <button
//             onClick={onClose}
//             className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Calendar Content */}
//         <div className="flex-1 overflow-auto p-4">
//           <CalendarProvider user={user}>
//             <CalendarView />
//           </CalendarProvider>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CalendarModal;