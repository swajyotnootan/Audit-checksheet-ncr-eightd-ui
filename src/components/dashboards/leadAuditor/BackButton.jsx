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
      className={`flex items-center gap-2 p-2 transition-all duration-200 rounded-lg text-white bg-[#00529B] hover:bg-[#0d4aab] hover:text-white ${className}`}
    >
      <FiArrowLeft size={18} />
    </button>
  );
};

export default BackButton;