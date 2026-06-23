import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  LogOut,
  User,
  Mail,
  Building,
  ChevronDown,
  LayoutDashboard,
  UserCircle,
  ShieldCheck
} from 'lucide-react';
import { getDashboardPath, getRoleDisplayName } from './utils/roleUtils';
import logo from '../assets/QsutraQMSWhiteLogo.png';
import logoUrl from '../assets/Stratum.png';
import NotificationBell from './NotificationBell';
import { useAuth } from '../components/context/AuthContext';
 
const Navbar = ({ onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showEightD, setShowEightD] = useState(false);
 
  const { user } = useAuth();
 
  const dashboardPath = getDashboardPath(user);
  const showBackButton = user && location.pathname !== dashboardPath;
 
  const userRole = user?.role?.toLowerCase?.() || '';
  const isAuditorOrAuditee = userRole === 'auditor' || userRole === 'auditee';
 
  const shouldHideCalendar = () => {
    const role = user?.role?.toUpperCase?.() || '';
    const isInitiator = role === 'INITIATOR';
    const isHOD = role === 'HOD';
   
    if (isInitiator || isHOD) return true;
   
    const currentPath = location.pathname;
    const isInitiatorDashboard = currentPath.includes('/initiator-dashboard');
    const isHODDashboard = currentPath.includes('/hod-dashboard');
   
    if (isInitiatorDashboard || isHODDashboard) return true;
   
    return false;
  };
 
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="fixed top-0 z-50 w-full shadow bg-background">
        <div className="flex items-center justify-between max-w-full px-3 py-2 mx-auto sm:px-5 lg:px-6">
         
          {/* Left Side - Qsutra Logo */}
          <div className="flex items-center">



            {/* Toggle Button for Audit Manager, Top Management, Lead Auditor & Auditor Dashboards */}
            {(location.pathname.includes('audit-manager') || location.pathname.includes('top-management') || location.pathname.includes('lead-auditor') || location.pathname.includes('auditor')) && (
                <button
                    onClick={() => {
                        if (location.pathname.includes('audit-manager')) {
                            window.dispatchEvent(new CustomEvent('toggle-audit-sidebar'));
                        } else if (location.pathname.includes('top-management')) {
                            window.dispatchEvent(new CustomEvent('toggle-top-management-sidebar'));
                        } else if (location.pathname.includes('lead-auditor')) {
                            window.dispatchEvent(new CustomEvent('toggle-lead-auditor-sidebar'));
                        } else if (location.pathname.includes('auditor')) {
                            window.dispatchEvent(new CustomEvent('toggle-auditor-sidebar'));
                        }
                    }}
                    className="p-2 mr-3 transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                    title="Toggle Sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            )}
                          
            <Link to="/" className="flex justify-center">
              <img alt="qsutra logo" className="h-8 mr-6 w-23" src={logo} />
            </Link>
            {showBackButton && (
              <button
                onClick={() => navigate(dashboardPath)}
                className="ml-3 border border-white/60 text-white text-xs py-1 px-2.5 rounded-lg hover:bg-white/10 hover:border-white flex items-center gap-1.5 transition-all duration-200"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
 
          {/* Right Side */}
          <div className="relative flex items-center gap-2">
            {/* API Logo - WHITE BACKGROUND REMOVED */}
            <div className="flex items-center justify-center px-1 rounded-lg">
              <img
                src={logoUrl}
                alt="Stratum Logo"
                className="h-9 max-w-[130px] rounded object-contain"
                style={{ background: 'transparent' }}
              />
            </div>
 
            {/* Notification Bell */}
            {user && <NotificationBell />}
 
            {/* Calendar Icon */}
{!shouldHideCalendar() && (
  <button
    onClick={() => navigate('/calendar')}
    className="relative p-1.5 rounded-lg hover:bg-white/80 transition-all duration-200"
    title="Calendar"
  >
    <Calendar className="w-6 h-6 transition-colors text-white/80 hover:text-black" />
  </button>
)}
 
            {/* Avatar Icon */}
            <div
              className="flex items-center justify-center w-8 h-8 overflow-hidden transition-all duration-200 border rounded-full cursor-pointer bg-white/10 backdrop-blur-sm border-white/10 hover:border-white/30"
              onClick={() => setProfileOpen(v => !v)}
              title="Profile"
            >
              {user?.id ? (
                <img
                  src={`https://internalaudit.hub.swajyot.co.in:8090/api/users/${user.id}/profile-photo`}
                  alt="User Avatar"
                  className="object-cover w-8 h-8"
                  onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <UserCircle className="w-5 h-5 text-white/80" />
              )}
            </div>
 
            {/* User Info */}
            <div className="flex flex-col mr-2 text-white cursor-pointer" onClick={() => setProfileOpen(v => !v)}>
              <p className="flex items-center gap-1 text-sm font-medium text-white">
                {(user?.name || 'Unknown User').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '')}
                <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </p>
              <span className="text-xs text-white/70 text-[11px]">
                {user?.role === 'SITE_SUPERVISOR' ? 'Site-1 Supervisor' : getRoleDisplayName(user?.role)}
              </span>
            </div>
 
            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-12 bg-white text-gray-800 rounded-xl shadow-xl w-72 border border-gray-100 z-[60] overflow-hidden animate-slide-down">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #7e6a8a 0%, #5c5491 100%)' }}>
                  <p className="text-xs text-white/70">Signed in as</p>
                  <p className="text-sm font-semibold text-white truncate">{user?.email || '—'}</p>
                </div>
               
                {/* User Details */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="w-20 text-gray-500">Name</span>
                    <span className="flex-1 font-medium text-gray-700 truncate">{(user?.name || '').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '') || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="w-20 text-gray-500">Username</span>
                    <span className="flex-1 font-medium text-gray-700 truncate">{user?.username || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span className="w-20 text-gray-500">Role</span>
                    <span className="flex-1 font-medium text-gray-700 truncate">{getRoleDisplayName(user?.role) || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    <span className="w-20 text-gray-500">Department</span>
                    <span className="flex-1 font-medium text-gray-700 truncate">{user?.department || '—'}</span>
                  </div>
                </div>
               
                {/* Actions */}
                <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    className="flex-1 text-xs py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-1.5"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/moc/profile');
                    }}
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    View Profile
                  </button>
                  <button
                    className="text-xs py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-1.5"
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
 
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 py-1 text-xs text-white transition-all duration-200 bg-red-600 rounded hover:bg-red-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>
 
      {/* Adjusted padding-top */}
      <div className="flex-grow pt-12">
        {showEightD ? <LandingPage1 /> : children}
      </div>
     
    </div>
  );
};
 
export default Navbar;
 