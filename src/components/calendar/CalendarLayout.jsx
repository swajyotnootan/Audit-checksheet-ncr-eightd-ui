import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getDashboardPath, getRoleDisplayName } from '../utils/roleUtils';
import logo from '../../assets/Qsutra_RMS_White_Logo_Small.png';

import logoUrl from  '../../assets/RenewsysLogo.png';



// Footer component
const Footer = () => {
  return (
    null
  );
};

const CalendarLayout = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show the button if not already on dashboard
  const dashboardPath = getDashboardPath(user);
  const showBackButton = user && location.pathname !== dashboardPath && location.pathname !== '/calendar';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="shadow fixed top-0 w-full bg-background z-50">
        <div className="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">

          {/* Left Side - Qsutra Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex justify-center">
              <img
                alt="qustra logo"
                className="w-23 h-8 mr-10"
                src={logo}
              />
            </Link>
            {/* Back to Dashboard Button */}
           {showBackButton && (
  <button
    onClick={() => navigate(dashboardPath)}
    className="ml-4 border border-white text-white text-sm py-1 px-3 rounded hover:bg-white hover:text-blue-600 flex items-center"
  >
    <ArrowBackIcon fontSize="small" className="mr-1" />
    Back to Dashboard
  </button>


            )}
          </div>

          {/* Right Side - API Logo + User Info + Logout */}
          <div className="flex items-center gap-2">
            {/* API Logo */}
            <div className="flex items-center justify-center bg-background bg-white pt-1 pb-1 px-4 rounded ">
             <img
               src={logoUrl}
               alt="API Greenpac Logo"
               className="h-12 max-w-[160px] object-contain"
             />
           </div>

            {/* Avatar Icon */}
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
              {user?.id ? (
                <img
                  src={`https://internalaudit.hub.swajyot.co.in:8090
/api/users/${user.id}/profile-photo`}
                  alt="User Avatar"
                  className="w-10 h-10 object-cover"
                  onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
              <div className="flex flex-col text-white mr-4 cursor-pointer" onClick={() => setProfileOpen(v => !v)}>
              <p className="text-white font-medium">
                {/* Remove prefix like Mr., Mrs., etc. from user name */}
                {(user?.name || 'Unknown User').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '')}
              </p>
              <span className="text-xs text-white">
                {user?.role === 'SITE_SUPERVISOR' ? 'Site-1 Supervisor' : getRoleDisplayName(user?.role)}
              </span>
            </div>
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded"
            >
              <span className="flex items-center gap-1">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow pt-20">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default CalendarLayout;