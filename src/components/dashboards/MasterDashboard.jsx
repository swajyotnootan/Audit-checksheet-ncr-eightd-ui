import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionFormAPI } from '../services/api';
import FormDashboard from './FormDashboard';
import AdminSidebar from './admin/AdminSidebar';
import UserManagement from './admin/user/UserManagement';
import { isMaster } from '../utils/roleUtils';
import RoleManagement from './admin/RoleManagement';
import FormsAnalytics from './admin/FormsAnalytics';
import AboutUs from './admin/AboutUs';
import LogoManagement from './admin/LogoManagement';
import ListManagement from './admin/ListManagement';
import LineManagement from '../forum/LineManagement';
import { FaBars } from 'react-icons/fa';
import { Avatar, Typography, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import qlogo from '../../assets/QsutraMXLOGOMainWhite.png'; // Qsutra logo



const MasterDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [pendingForms, setPendingForms] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [metrics, setMetrics] = useState({
    approvedToday: 0,
    avgApprovalTime: 0,
    qualityIssues: 0,
    complianceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const [dynamicLogo, setDynamicLogo] = useState(null);
const [logoLoading, setLogoLoading] = useState(true);

// Fetch dynamic logo from backend
useEffect(() => {
  const fetchDynamicLogo = async () => {
    try {
      const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090
/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        const logoUrl = URL.createObjectURL(blob);
        setDynamicLogo(logoUrl);
      }
      // If not ok, keep dynamicLogo as null → fallback to qlogo
    } catch (err) {
      console.warn('Failed to load dynamic logo, using default:', err);
    } finally {
      setLogoLoading(false);
    }
  };

  fetchDynamicLogo();

  // Cleanup URL object on unmount
  return () => {
    if (dynamicLogo) {
      URL.revokeObjectURL(dynamicLogo);
    }
  };
}, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // If the logged-in user is MASTER, default to the user-management section
  useEffect(() => {
    if (isMaster(user?.role)) {
      setActiveSection('user-management');
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const submittedForms = await inspectionFormAPI.getFormsByStatus('SUBMITTED');
      const allForms = await inspectionFormAPI.getAllForms();

      const sortedForms = [...allForms].sort((a, b) => {
        const dateA = a.reviewedAt || a.submittedAt || new Date(0);
        const dateB = b.reviewedAt || b.submittedAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });

      setPendingForms(submittedForms);
      setRecentActivity(sortedForms.slice(0, 5));
      calculateMetrics(allForms);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (forms) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const approvedToday = forms.filter(form => {
        if (!form.reviewedAt || form.status !== 'APPROVED') return false;
        const reviewDate = new Date(form.reviewedAt);
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate.getTime() === today.getTime();
      }).length;

      const approvedForms = forms.filter(form =>
        form.status === 'APPROVED' && form.submittedAt && form.reviewedAt
      );

      let totalApprovalTime = 0;
      approvedForms.forEach(form => {
        const submittedTime = new Date(form.submittedAt).getTime();
        const reviewedTime = new Date(form.reviewedAt).getTime();
        totalApprovalTime += (reviewedTime - submittedTime) / (1000 * 60 * 60);
      });

      const avgTime = approvedForms.length > 0
        ? (totalApprovalTime / approvedForms.length).toFixed(1)
        : 0;

      const qualityIssues = forms.filter(form => form.status === 'REJECTED').length;

      const decidedForms = forms.filter(form =>
        form.status === 'APPROVED' || form.status === 'REJECTED'
      );

      const complianceRate = decidedForms.length > 0
        ? ((decidedForms.length - qualityIssues) / decidedForms.length * 100).toFixed(1)
        : 100;

      setMetrics({
        approvedToday,
        avgApprovalTime: avgTime,
        qualityIssues,
        complianceRate
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <FormDashboard user={user} onLogout={onLogout} />;
      case 'logo-mgmt':
        return <LogoManagement />;
      case 'user-management':
        // Extra guard: only render UserManagement for MASTER users
        return isMaster(user?.role) ? <UserManagement /> : <FormDashboard user={user} onLogout={onLogout} />;
      case 'list-mgmt':
        return <ListManagement />;
      case 'role-management':
        return <RoleManagement />;
      case 'about-us':
        return <AboutUs />;
      case 'forms-analytics':
        return <FormsAnalytics />;
      case 'line-management':
        return <LineManagement currentUser={user} />;
      default:
        return <FormDashboard user={user} onLogout={onLogout} />;
    }
  };

  // Utilities - FIXED: Use consistent property names
  const userDisplayName = (user?.name || user?.username || 'User')
    .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, ''); // Remove prefixes like App.js

  const profilePhotoUrl = user?.photoUrl || '';
  const userInitials = userDisplayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const getRoleDisplayName = (role) => {
    const upperRole = role?.toUpperCase();
    const roles = {
      SHIFT_INCHARGE: 'Shift Incharge',
      QUALITY_ENGINEER: 'Quality Engineer',
      QUALITY_HOD: 'Quality HOD',
      MASTER: 'Administrator',
      OPERATOR: 'Shift Incharge',
      QA: 'Quality Manager',
      AVP: 'Quality HOD',
      ADMIN: 'Admin',
      MANAGER: 'Manager'
    };
    return roles[upperRole] || (role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User');
  };

  const handleProfilePhotoError = (e) => {
    e.target.onerror = null;
    e.target.src = '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="z-50 text-white shadow-md bg-background">
        <div className="flex items-center justify-between max-w-full px-4 py-4 mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="mr-4 text-white hover:text-gray-200 focus:outline-none"
              title="Toggle Sidebar"
            >
              <FaBars size={20} />
            </button>

            {/* Qsutra Logo */}
            <img
              src={qlogo}
              alt="Qsutra logo"
              className="h-8 mr-10 w-23"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center px-4 pt-1 pb-1 bg-white rounded">
              <img
  src={dynamicLogo || qlogo}
  alt="Company Logo"
 className="h-12 max-w-[160px] object-contain"
/>
            </div>

            {/* Avatar */}
            {profilePhotoUrl ? (
              <Avatar
                alt={userDisplayName}
                src={profilePhotoUrl}
                onError={handleProfilePhotoError}
                sx={{
                  width: 40,
                  height: 40,
                  border: '2px solid white'
                }}
              />
            ) : user?.id ? (
              <Avatar
                alt={userDisplayName}
                src={`/api/users/${user.id}/profile-photo`}
                onError={handleProfilePhotoError}
                sx={{
                  width: 40,
                  height: 40,
                  border: '2px solid white'
                }}
              />
            ) : (
              <Avatar
                alt={userDisplayName}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  color: 'white',
                  border: '2px solid white',
                  fontWeight: 'bold'
                }}
              >
                {userInitials}
              </Avatar>
            )}

            <div className="flex flex-col mr-4 text-white">
              <Typography variant="body2" className="font-medium text-white">
                {userDisplayName}
              </Typography>
              <Typography variant="caption" className="text-white opacity-90">
                {getRoleDisplayName(user?.role)}
              </Typography>
            </div>

            <Button
              onClick={onLogout}
              variant="contained"
              color="error"
              size="small"
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

    
{/* Body: Sidebar + Main */}
<div className="flex flex-1 overflow-hidden">
  {/* Sidebar with smooth transition */}
  <div
    className={`bg-white shadow-md border-r overflow-hidden transition-all duration-500 ease-in-out ${
      sidebarVisible ? 'w-64 opacity-100' : 'w-0 opacity-0'
    }`}
  >
    <AdminSidebar
      user={user}
      onLogout={onLogout}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      isCollapsed={!sidebarVisible}
    />
  </div>

  {/* Main Content */}
  <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
    <DashboardLayout title="Master Dashboard" subtitle="Manage system users and their permissions">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="ml-4 text-gray-500">Loading dashboard data...</p>
        </div>
      ) : (
        renderContent()
      )}
    </DashboardLayout>
  </main>
</div>
    </div>
  );
};

export default MasterDashboard;

// ✅ FIXED: Removed centering — now left-aligned like a proper dashboard
export const DashboardLayout = ({ title, subtitle, children }) => {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-semibold text-left text-gray-900">{title}</h1>
      <p className="mt-2 text-left text-gray-600">{subtitle}</p>
      <div className="w-full mt-6">
        {children}
      </div>
    </div>
  );
};