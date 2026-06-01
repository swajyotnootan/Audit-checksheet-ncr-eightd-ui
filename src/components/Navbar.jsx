import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getDashboardPath, getRoleDisplayName } from './utils/roleUtils';
import logo from '../assets/QsutraQMSWhiteLogo.png';
import logoUrl from '../assets/Stratum.png';
import NotificationBell from './NotificationBell';
import { useAuth } from '../components/context/AuthContext'; // ✅ Fixed import path

const Navbar = ({ onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showEightD, setShowEightD] = useState(false);

  
  // ✅ Move useAuth to the top, before using user
  const { user } = useAuth();
  
  // ✅ Now user is defined, we can use it
  const dashboardPath = getDashboardPath(user);
  const showBackButton = user && location.pathname !== dashboardPath;

   // ✅ Check if user is auditor or auditee
  const userRole = user?.role?.toLowerCase?.() || '';
  const isAuditorOrAuditee = userRole === 'auditor' || userRole === 'auditee';
  const calendarButtonText = isAuditorOrAuditee ? 'My Calendar' : 'Calendar';

  // ✅ Check if calendar should be hidden for initiator and HOD
  const shouldHideCalendar = () => {
    const role = user?.role?.toUpperCase?.() || '';
    const isInitiator = role === 'INITIATOR';
    const isHOD = role === 'HOD';
    
    // Hide calendar for Initiator and HOD roles
    if (isInitiator || isHOD) {
      return true;
    }
    
    // Optional: Also hide on specific dashboard pages
    const currentPath = location.pathname;
    const isInitiatorDashboard = currentPath.includes('/initiator-dashboard');
    const isHODDashboard = currentPath.includes('/hod-dashboard');
    
    if (isInitiatorDashboard || isHODDashboard) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="shadow fixed top-0 w-full bg-background z-50">
        <div className="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Left Side - Qsutra Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex justify-center">
              <img alt="qsutra logo" className="w-23 h-8 mr-10" src={logo} />
            </Link>
            {showBackButton && (
              <button
                onClick={() => navigate(dashboardPath)}
                className="ml-4 border border-white text-white text-sm py-1 px-3 rounded hover:bg-white hover:text-blue-600 flex items-center"
              >
                Dashboard
                <ArrowBackIcon fontSize="small" className="ml-1" />
              </button>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 relative">
            {/* API Logo */}
            <div className="flex items-center justify-center bg-white rounded">
              <img src={logoUrl} alt="API Logo" className="h-12 max-w-[160px] rounded object-contain" />
            </div>

            {/* 🔔 Notification Bell – using context */}
            {user && <NotificationBell />}

            {/* Avatar Icon */}
            <div
              className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => setProfileOpen(v => !v)}
              title="Profile"
            >
              {user?.id ? (
                <img
                  src={`http://localhost:8080/api/users/${user.id}/profile-photo`}
                  alt="User Avatar"
                  className="w-10 h-10 object-cover"
                  onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>

            <div className="flex flex-col text-white mr-4 cursor-pointer" onClick={() => setProfileOpen(v => !v)}>
              <p className="text-white font-medium">
                {(user?.name || 'Unknown User').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '')}
              </p>
              <span className="text-xs text-white">
                {user?.role === 'SITE_SUPERVISOR' ? 'Site-1 Supervisor' : getRoleDisplayName(user?.role)}
              </span>
            </div>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-16 bg-white text-gray-800 rounded-md shadow-lg w-72 border border-gray-200 z-[60]">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="text-sm font-semibold truncate">{user?.email || '—'}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Name</span><span className="font-medium ml-3 truncate">{(user?.name || '').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '') || '—'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Username</span><span className="font-medium ml-3 truncate">{user?.username || '—'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Role</span><span className="font-medium ml-3 truncate">{getRoleDisplayName(user?.role) || '—'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Department</span><span className="font-medium ml-3 truncate">{user?.department || '—'}</span></div>
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <button
                    className="flex-1 text-sm py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/moc/profile');
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    className="text-sm py-2 px-3 rounded-md bg-red-600 text-white hover:bg-red-700"
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            {/* Calendar Button - Hidden for Initiator and HOD */}
            {!shouldHideCalendar() && (
              <button
                onClick={() => navigate('/calendar')}
                className="px-3 py-1 mr-2 text-sm text-white bg-green-600 rounded hover:bg-green-700"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                  {calendarButtonText}
                </span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded"
            >
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow pt-16">
        {showEightD ? <LandingPage1 /> : children}
      </div>
      
    </div>
  );
};

export default Navbar;