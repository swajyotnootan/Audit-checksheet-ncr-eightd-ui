import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const BackButton = ({ 
  defaultTab = 'responses', 
  label = 'Back',
  className = ""
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBack = () => {
    // Get return path from state
    const returnPath = location.state?.returnTo;
    const tab = location.state?.tab || defaultTab;
    
    if (returnPath) {
      // Navigate back to the dashboard with tab info
      navigate(returnPath, { 
        state: { activeTab: tab },
        replace: true 
      });
    } else {
      // Fallback to browser history
      navigate(-1);
    }
  };
  
  return (
    <button 
      onClick={handleBack}
      className={`flex items-center gap-2 px-4 py-2 text-gray-600 transition-all duration-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 ${className}`}
    >
      <FiArrowLeft size={18} />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;