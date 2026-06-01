// src/App.jsx
import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

// ============= PROVIDERS (Must load immediately - keep direct) =============
import { AuthProvider, useAuth } from './components/context/AuthContext';
import { NotificationProvider } from './components/NotificationContext';
import { ToastProvider } from './components/ToastContext';
import { CalendarProvider } from './components/context/CalendarContext';

// ============= COMPONENTS THAT MUST LOAD IMMEDIATELY =============
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import { getDashboardPath } from './components/utils/roleUtils';

// ============= LAZY LOAD NAVBAR (Not needed on login page) =============
const Navbar = lazy(() => import('./components/Navbar'));

// ============= LAZY LOAD ALL DASHBOARDS =============
const MasterDashboard = lazy(() => import('./components/dashboards/MasterDashboard'));
const AuditManagerDashboard = lazy(() => import('./components/dashboards/AuditManagerDashboard'));
const LeadAuditorDashboard = lazy(() => import('./components/dashboards/leadAuditor/LeadAuditorDashboard'));
const AuditorDashboard = lazy(() => import('./components/dashboards/AuditorDashboard'));
const HODDashboard = lazy(() => import('./components/dashboards/HODDashboard'));
const AuditeeDashboard = lazy(() => import('./components/dashboards/AuditeeDashboard'));
const HRAdminDashboard = lazy(() => import('./components/dashboards/HRAdminDashboard'));
const QMSAdminDashboard = lazy(() => import('./components/dashboards/QMSAdminDashboard'));
const TopManagementDashboard = lazy(() => import('./components/dashboards/TopManagementDashboard'));
const InitiatorDashboard = lazy(() => import('./components/dashboards/InitiatorDashboard'));

// ============= LAZY LOAD CHECK SHEET DASHBOARDS =============
const ManufacturingProcessDashboard = lazy(() => import('./components/dashboards/checkSheet/ManufacturingProcessDashboard'));
const IATFInternalDashboard = lazy(() => import('./components/dashboards/checkSheet/IATFInternalDashboard'));
const FiveSDashboard = lazy(() => import('./components/dashboards/checkSheet/FiveSDashboard'));
const SafetyAuditDashboard = lazy(() => import('./components/dashboards/checkSheet/SafetyAuditDashboard'));
const PokaYokeDashboard = lazy(() => import('./components/dashboards/checkSheet/PokaYokeDashboard'));

// ============= LAZY LOAD NCR DASHBOARDS =============
const NCRDashboard = lazy(() => import('./components/dashboards/NCRDashboard'));
const NCRPendingDashboard = lazy(() => import('./components/dashboards/NCRPendingDashboard'));

// ============= LAZY LOAD FORMS =============
const ManufacturingProcessAuditForm = lazy(() => import('./form/ManufacturingProcessAuditForm'));
const IATFInternalAuditForm = lazy(() => import('./form/IATFInternalAuditForm'));
const FiveSAuditForm = lazy(() => import('./form/FiveSAuditForm'));
const PokaYokeAuditForm = lazy(() => import('./form/PokaYokeAuditForm'));
const SafetyAuditForm = lazy(() => import('./form/SafetyAuditForm'));

// ============= LAZY LOAD FORM VIEWS =============
const ManufacturingProcessView = lazy(() => import('./form/view/ManufacturingProcessView'));
const IATFInternalView = lazy(() => import('./form/view/IATFInternalView'));
const FiveSView = lazy(() => import('./form/view/FiveSView'));
const SafetyAuditView = lazy(() => import('./form/view/SafetyAuditView'));
const PokaYokeView = lazy(() => import('./form/view/PokaYokeView'));

// ============= LAZY LOAD COMMON COMPONENTS =============
const AuditHistory = lazy(() => import('./components/AuditHistory'));
const CreateSchedule = lazy(() => import('./components/CreateSchedule'));
const ViewAudit = lazy(() => import('./components/forms/ViewAudit'));
const AuditForm = lazy(() => import('./components/forms/AuditForm'));
const ReviewAudit = lazy(() => import('./components/forms/ReviewAudit'));
const ReleaseAudit = lazy(() => import('./components/forms/ReleaseAudit'));
const DepartmentDetail = lazy(() => import('./components/dashboards/DepartmentDetail'));
const Form1View = lazy(() => import('./components/forms/Form1View'));
const Form3View = lazy(() => import('./components/forms/Form3View'));
const Form4View = lazy(() => import('./components/forms/Form4View'));
const Form5View = lazy(() => import('./components/forms/Form5View'));
const Form7View = lazy(() => import('./components/forms/Form7View'));
const Form8View = lazy(() => import('./components/forms/Form8View'));
const Form9View = lazy(() => import('./components/forms/Form9View'));
const Form7DetailView = lazy(() => import('./components/forms/Form7DetailView'));
const Form8DetailView = lazy(() => import('./components/forms/Form8DetailView'));
const ApprovedSchedulesView = lazy(() => import('./components/forms/ApprovedSchedulesView'));
const ScheduleDetailsView = lazy(() => import('./components/forms/ScheduleDetailsView'));
const Form5DetailedView = lazy(() => import('./components/forms/Form5DetailedView'));
const ViewDetailedSchedule = lazy(() => import('./components/views/ViewDetailedSchedule'));
const WeekSelectionView = lazy(() => import('./components/forms/WeekSelectionView'));
const Form5Dashboard = lazy(() => import('./components/forms/Form5Dashboard'));
const SafeCalendarView = lazy(() => import('./components/calendar/SafeCalendarView'));
const LandingPage1 = lazy(() => import('./pages/LandingPage1'));
const EightDLanding = lazy(() => import('./components/EightDLanding'));

// ============= LOADING COMPONENT =============
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="text-gray-500 mt-3">Loading...</p>
    </div>
  </div>
);

// ============= AUTHENTICATED LAYOUT (Lazy load Navbar) =============
const AuthenticatedLayout = ({ children, user, onLogout }) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Navbar user={user} onLogout={onLogout}>
        <div className="flex flex-col h-screen">
          <main className="flex-1 px-6 pb-12 overflow-y-auto shadow-inner bg-gray-50">
            {children}
          </main>
        </div>
      </Navbar>
    </Suspense>
  );
};

// ============= APP ROUTES =============
const AppRoutes = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && location.pathname === '/') {
      const dashboardPath = getDashboardPath(user);
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, loading, location.pathname, navigate, user]);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<LoginPage />} />

        {/* Calendar */}
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout user={user} onLogout={logout}>
                <SafeCalendarView />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />

        {/* Master Dashboard */}
        <Route 
          path="/master" 
          element={
            <ProtectedRoute allowedRoles={['MASTER']}>
              <MasterDashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          } 
        />

        {/* View Routes */}
        <Route path="/iatf-view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <IATFInternalView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/manufacturing-view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ManufacturingProcessView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/fives-view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <FiveSView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Form Routes */}
        <Route path="/form1" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form1View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form3" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form3View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form4" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form4View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form5" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form5View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* NCR Routes */}
        <Route path="/ncr-dashboard" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <NCRDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/ncr-pending" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <NCRPendingDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/ncr-view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form7DetailView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form7" element={
          <ProtectedRoute allowedRoles={['AUDITOR', 'LEAD_AUDITOR', 'AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form7View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form8" element={
          <ProtectedRoute allowedRoles={['AUDITEE', 'HOD']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form8View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form8-view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form8DetailView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form9" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form9View />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/approved-schedules" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ApprovedSchedulesView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/schedule-details" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ScheduleDetailsView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form5-detailed" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form5DetailedView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/view-detailed-schedule" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER', 'TOP_MANAGEMENT', 'AUDITOR']}>
            <ViewDetailedSchedule />
          </ProtectedRoute>
        } />

        <Route path="/schedule-calendar" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER', 'LEAD_AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <WeekSelectionView />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/form5-dashboard" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <Form5Dashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Audit Manager Dashboard */}
        <Route path="/audit-manager" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <AuditManagerDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Lead Auditor Dashboard */}
        <Route path="/lead-auditor" element={
          <ProtectedRoute allowedRoles={['LEAD_AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <LeadAuditorDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Auditor Dashboard */}
        <Route path="/auditor" element={
          <ProtectedRoute allowedRoles={['AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <AuditorDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Initiator Dashboard */}
        <Route path="/initiator" element={
          <ProtectedRoute allowedRoles={['INITIATOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <InitiatorDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* 8D Dashboard */}
        <Route path="/eightd-dashboard" element={
          <ProtectedRoute allowedRoles={['INITIATOR', 'HOD', 'MASTER', 'AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <LandingPage1 />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/eightdflow" element={
          <ProtectedRoute allowedRoles={['INITIATOR', 'HOD', 'MASTER', 'AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <EightDLanding />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Check Sheet Routes */}
        <Route path="/auditor/manufacturing" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ManufacturingProcessDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/auditor/iatf" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <IATFInternalDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/auditor/fives" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <FiveSDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/auditor/safety" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <SafetyAuditDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/auditor/pokayoke" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <PokaYokeDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Form Routes */}
        <Route path="/audit/manufacturing_process" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ManufacturingProcessAuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/audit/iatf_internal" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <IATFInternalAuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/audit/five_s" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <FiveSAuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/audit/pokayoke" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <PokaYokeAuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/audit/safety" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <SafetyAuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        <Route path="/auditee" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <AuditeeDashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* HOD Dashboard */}
        <Route path="/hod" element={
          <ProtectedRoute allowedRoles={['HOD']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <HODDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* HR Admin Dashboard */}
        <Route path="/hr-admin" element={
          <ProtectedRoute allowedRoles={['HR_ADMIN']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <HRAdminDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* QMS Admin Dashboard */}
        <Route path="/qms-admin" element={
          <ProtectedRoute allowedRoles={['QMS_ADMIN']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <QMSAdminDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Top Management Dashboard */}
        <Route path="/top-management" element={
          <ProtectedRoute allowedRoles={['TOP_MANAGEMENT']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <TopManagementDashboard user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Create Schedule */}
        <Route path="/create-schedule" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER', 'LEAD_AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <CreateSchedule user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Reports */}
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER', 'LEAD_AUDITOR', 'TOP_MANAGEMENT']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <AuditHistory user={user} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* View Audit */}
        <Route path="/audit/view/:id" element={
          <ProtectedRoute>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ViewAudit />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Fill Audit Form */}
        <Route path="/audit/:formId" element={
          <ProtectedRoute allowedRoles={['AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <AuditForm />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Review Audit */}
        <Route path="/audit/review/:id" element={
          <ProtectedRoute allowedRoles={['LEAD_AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ReviewAudit />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Release Audit */}
        <Route path="/audit/release/:id" element={
          <ProtectedRoute allowedRoles={['AUDIT_MANAGER']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <ReleaseAudit />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Department Details */}
        <Route path="/department/:id" element={
          <ProtectedRoute allowedRoles={['HOD', 'AUDIT_MANAGER', 'LEAD_AUDITOR']}>
            <AuthenticatedLayout user={user} onLogout={logout}>
              <DepartmentDetail />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

// ============= LOGIN PAGE =============
const LoginPage = () => {
  const { login } = useAuth();
  return <LoginForm onLogin={login} />;
};

// ============= MAIN APP =============
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <ToastProvider>
            <CalendarProvider>
              <AppRoutes />
            </CalendarProvider>
          </ToastProvider>
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
};

export default App;