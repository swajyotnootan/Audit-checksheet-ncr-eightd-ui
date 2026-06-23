import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiCalendar, FiCheckCircle, FiClock, FiAlertCircle, 
  FiArrowRight, FiFileText, FiRefreshCw, FiPlus, FiInfo, FiArrowLeft
} from 'react-icons/fi';

// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#000000',       
  textValue: '#1F2937',  
  textMuted: '#6B7280',
  accent: '#00529B',
  accentLight: '#EFF6FF',
  accentBorder: '#DBEAFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
};

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ═════ SUBTLE MONTH COLORS ═════
const monthThemeColors = {
  "Apr": { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '#10B981' }, // Emerald
  "May": { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '#3B82F6' }, // Blue
  "Jun": { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', icon: '#8B5CF6' }, // Purple
  "Jul": { bg: '#FDF2F8', border: '#FBCFE8', text: '#9D174D', icon: '#EC4899' }, // Pink
  "Aug": { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', icon: '#F97316' }, // Orange
  "Sep": { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '#F59E0B' }, // Amber
  "Oct": { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '#EF4444' }, // Red
  "Nov": { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: '#22C55E' }, // Green
  "Dec": { bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75', icon: '#06B6D4' }, // Cyan
  "Jan": { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985', icon: '#0EA5E9' }, // Sky
  "Feb": { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', icon: '#6366F1' }, // Indigo
  "Mar": { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8', icon: '#A855F7' }  // Violet
};

/* ─── Reusable UI Components ────────────────────────────────────────────── */

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const ActionButton = ({ onClick, disabled, loading, color, bgColor, borderColor, icon: Icon, children, style }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      height: 40, padding: '0 20px', borderRadius: 8, border: `1px solid ${borderColor || 'transparent'}`,
      background: (disabled || loading) ? '#F1F5F9' : bgColor, color: (disabled || loading) ? '#94A3B8' : color,
      fontSize: 14, fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: FONT_FAMILY,
      boxShadow: (disabled || loading) ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      ...style
    }}
  >
    {loading ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
      </svg>
    ) : Icon ? <Icon size={16} /> : null}
    {children}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const Form5Dashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  
  const [selectedYear, setSelectedYear] = useState(urlYear ? parseInt(urlYear) : new Date().getFullYear());
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  const [stats, setStats] = useState({
    totalMonths: 0, approvedMonths: 0, pendingMonths: 0,
    draftMonths: 0, rejectedMonths: 0, totalSchedules: 0
  });
  
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };
  
  const financialMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  // Helper to fetch schedule counts for a list of months using the Form5 API
  const fetchScheduleCounts = async (monthsList) => {
    const counts = {};
    await Promise.all(
      monthsList.map(async (m) => {
        try {
          const response = await auditScheduleApi.getByYearAndMonth(selectedYear, m.month);
          const allSchedules = response.data || [];
          // Filter for week schedules (same logic as Form5View)
          const weekSchedules = allSchedules.filter(schedule => !schedule.scheduledDate);
          counts[m.month] = weekSchedules.length;
        } catch (error) {
          console.error(`Error fetching schedules for ${m.month}:`, error);
          counts[m.month] = 0;
        }
      })
    );
    return counts;
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      
      // Fetch schedule counts for months with planned audits
      const validMonths = months.filter(m => m.hasPlannedAudits);
      const scheduleCounts = await fetchScheduleCounts(validMonths);
      
      // Update months with fetched schedule counts
      const updatedMonths = months.map(m => ({
        ...m,
        scheduleCount: scheduleCounts[m.month] || 0
      }));
      
      setAvailableMonths(updatedMonths);
      
      // Calculate stats
      const approved = updatedMonths.filter(m => m.approvalStatus === 'APPROVED' && m.hasPlannedAudits).length;
      const pending = updatedMonths.filter(m => m.approvalStatus === 'PENDING_APPROVAL').length;
      const draft = updatedMonths.filter(m => m.approvalStatus === 'DRAFT').length;
      const rejected = updatedMonths.filter(m => m.approvalStatus === 'REJECTED').length;
      const totalSchedules = updatedMonths.reduce((sum, m) => sum + (m.scheduleCount || 0), 0);
      
      setStats({
        totalMonths: updatedMonths.filter(m => m.hasPlannedAudits).length,
        approvedMonths: approved, pendingMonths: pending,
        draftMonths: draft, rejectedMonths: rejected,
        totalSchedules: totalSchedules
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { fetchData(); }, [selectedYear]);
  useEffect(() => { if (urlYear) setSelectedYear(parseInt(urlYear)); }, [urlYear]);
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years);
  }, []);
  
  const handleMonthClick = (month) => {
    navigate('/form5', { state: { preselectedYear: selectedYear, preselectedMonth: month.month } });
  };
  
  const handleCreateNew = () => {
    navigate('/form5', { state: { preselectedYear: selectedYear, preselectedMonth: null } });
  };
  
  const getStatusBadge = (status) => {
    const styles = {
      'APPROVED': { bg: T.successLight, color: '#065F46', border: T.successBorder, text: 'Approved', icon: FiCheckCircle },
      'PENDING_APPROVAL': { bg: T.warningLight, color: '#92400E', border: T.warningBorder, text: 'Pending', icon: FiClock },
      'REJECTED': { bg: T.errorLight, color: '#991B1B', border: T.errorBorder, text: 'Rejected', icon: FiAlertCircle }
    };
    const s = styles[status] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', text: 'Draft', icon: FiFileText };
    const Icon = s.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: s.color, fontFamily: FONT_FAMILY }}>
        <Icon size={12} /> {s.text}
      </span>
    );
  };

  const getStatusDescription = (status) => {
    switch(status) {
      case 'APPROVED': return 'Ready for daily scheduling';
      case 'PENDING_APPROVAL': return 'Awaiting management approval';
      case 'REJECTED': return 'Needs correction and resubmission';
      default: return 'Draft - Complete and submit';
    }
  };
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="12" cy="12" r="10" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
        </svg>
      </div>
    );
  }
  
  // Filter to only show months that have planned audits from Form 4
  const validMonths = financialMonths.filter(m => {
    const monthData = availableMonths.find(am => am.month === m);
    return monthData?.hasPlannedAudits;
  });

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      
      {/* Header */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            
            {/* Back Button */}
             <button 
              onClick={() => navigate('/audit-manager?view=schedules')} // 👈 Updated to navigate to Schedules Workflow
              style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
              title="Back to Schedules Workflow" // 👈 Updated tooltip text
            >
              <FiArrowLeft size={18} />
            </button>

            {/* Icon & Title */}
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCalendar size={24} color={T.accent} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Internal Quality Audit Schedule</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Form 5 - Month-wise Audit Planning (IATF16949)</p>
            </div>
          </div>
          
          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                height: 40, padding: '0 32px 0 12px', fontSize: 14, fontWeight: 500, fontFamily: FONT_FAMILY, borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.card, color: T.textValue, outline: 'none', cursor: 'pointer',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
              }}
            >
              {availableYears.map(year => <option key={year} value={year}>{year} - {year + 1}</option>)}
            </select>
            <ActionButton onClick={handleCreateNew} color="#FFF" bgColor={T.accent} icon={FiPlus}>Create New Schedule</ActionButton>
            <button 
              onClick={fetchData} 
              style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
              title="Refresh"
            >
              <FiRefreshCw size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Info Banner */}
      <div style={{ padding: 16, background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, fontFamily: FONT_FAMILY }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FiInfo size={18} color={T.accent} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1E3A8A' }}>How to use Form 5</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#1E40AF', opacity: 0.9 }}>
            Select a month below to create week-wise audit schedules. After completing all weeks, submit for approval. Once approved, you can create daily schedules with specific time slots.
          </p>
        </div>
      </div>
      
      {/* Month Grid Cards */}
      {validMonths.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <FiCalendar size={40} style={{ margin: '0 auto 16px', color: '#CBD5E1' }} />
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: T.textValue }}>No months available for {selectedYear}</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: T.textMuted }}>Please complete Form 4 (Department Audit Plan) first.</p>
          <ActionButton onClick={() => navigate('/form4')} color="#FFF" bgColor={T.accent} icon={FiFileText}>Go to Form 4</ActionButton>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {validMonths.map(month => {
            const monthData = availableMonths.find(m => m.month === month);
            const approvalStatus = monthData?.approvalStatus || 'DRAFT';
            const scheduleCount = monthData?.scheduleCount || 0; // Now correctly populated from API
            const monthTheme = monthThemeColors[month] || { bg: '#F8FAFC', border: '#E2E8F0', text: '#1F2937', icon: '#6B7280' };
            
            return (
              <div
                key={month}
                onClick={() => handleMonthClick(monthData)}
                style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, 
                  overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.borderColor = monthTheme.border; 
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.borderColor = T.border; 
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Card Header with Subtle Month Color */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, background: monthTheme.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${monthTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiCalendar size={18} color={monthTheme.icon} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: monthTheme.text }}>{monthDisplay[month]}</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: T.textMuted }}>Financial Year {selectedYear}-{selectedYear + 1}</p>
                    </div>
                  </div>
                  {getStatusBadge(approvalStatus)}
                </div>
                
                {/* Card Body */}
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiFileText size={18} color={T.accent} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedules</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>{scheduleCount}</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.textValue }}>
                      {getStatusDescription(approvalStatus)}
                    </span>
                    <FiArrowRight size={16} color={T.accent} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend */}
      <Card style={{ padding: 24, marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Legend</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 13, color: T.textMuted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.successLight, border: `1px solid ${T.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCheckCircle size={10} color={T.success} />
            </div>
            Approved - Ready for daily scheduling
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.warningLight, border: `1px solid ${T.warningBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiClock size={10} color={T.warning} />
            </div>
            Pending Approval - Waiting for review
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.errorLight, border: `1px solid ${T.errorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiAlertCircle size={10} color={T.error} />
            </div>
            Rejected - Needs correction
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiFileText size={10} color="#475569" />
            </div>
            Draft - In progress, not submitted
          </span>
        </div>
      </Card>
      
    </div>
  );
};

export default Form5Dashboard;