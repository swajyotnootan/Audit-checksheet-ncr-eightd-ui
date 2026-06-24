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
import Navbar from '../../components/Navbar'; 

// Matching the Auditee Dashboard color palette
const NAVBAR_COLORS = {
    primary: '#00529B',
    secondary: '#3b82f6',
    dark: '#1e3a8a',
    light: '#60a5fa',
    lighter: '#93c5fd',
    bg: '#eff6ff',
    white: '#ffffff',
};

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

  // Listen for sidebar toggle event dispatched by Navbar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarVisible(prev => !prev);
    };
    window.addEventListener('toggle-master-sidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('toggle-master-sidebar', handleToggleSidebar);
    };
  }, []);

  // Fetch dynamic logo from backend
  useEffect(() => {
    const fetchDynamicLogo = async () => {
      try {
        const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090/api/logo');
        if (response.ok) {
          const blob = await response.blob();
          const logoUrl = URL.createObjectURL(blob);
          setDynamicLogo(logoUrl);
        }
      } catch (err) {
        console.warn('Failed to load dynamic logo, using default:', err);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchDynamicLogo();

    return () => {
      if (dynamicLogo) {
        URL.revokeObjectURL(dynamicLogo);
      }
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  return (
    <Navbar onLogout={onLogout} rightLogo={dynamicLogo}>
      {/* Background wrapper matching Auditee dashboard */}
      <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        
        {/* Sidebar is now fixed, so we don't wrap it in a flex container */}
        <AdminSidebar
          user={user}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isCollapsed={!sidebarVisible}
        />

        {/* Main content shifts right (ml-64) when sidebar is open, matching Auditee layout */}
        <main className={`transition-all duration-500 ease-out ${sidebarVisible ? 'ml-64' : 'ml-0'} pt-6`}>
          <div className="px-6 pb-6">
            <DashboardLayout title="Master Dashboard" subtitle="Manage system users and their permissions">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                  <p className="ml-4 text-sm font-medium text-slate-500">Loading dashboard data...</p>
                </div>
              ) : (
                renderContent()
              )}
            </DashboardLayout>
          </div>
        </main>
      </div>
    </Navbar>
  );
};

export default MasterDashboard;

// ✅ Dashboard Layout
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