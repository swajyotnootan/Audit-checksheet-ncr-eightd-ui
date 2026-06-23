import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, 
  FiChevronRight, FiChevronLeft, FiEdit2, FiRefreshCw
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
  "Apr": { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '#10B981' },
  "May": { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '#3B82F6' },
  "Jun": { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', icon: '#8B5CF6' },
  "Jul": { bg: '#FDF2F8', border: '#FBCFE8', text: '#9D174D', icon: '#EC4899' },
  "Aug": { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', icon: '#F97316' },
  "Sep": { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '#F59E0B' },
  "Oct": { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '#EF4444' },
  "Nov": { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: '#22C55E' },
  "Dec": { bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75', icon: '#06B6D4' },
  "Jan": { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985', icon: '#0EA5E9' },
  "Feb": { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', icon: '#6366F1' },
  "Mar": { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8', icon: '#A855F7' }
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
const WeekSelectionView = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  
  const [selectedYear, setSelectedYear] = useState(urlYear ? parseInt(urlYear) : new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [weeklyData, setWeeklyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('months');
  const [availableYears, setAvailableYears] = useState([]);
  
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };
  
  const financialMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
  
  // Helper function to get number of weeks in a month (4, 5, or 6)
  const getWeeksForMonth = (year, month) => {
    const monthMap = { "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2 };
    const monthNum = monthMap[month];
    if (monthNum === undefined) return 4;
    const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  };
  
  // Get date range for a specific week
  const getWeekDateRange = (year, month, week) => {
    const monthMap = { "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2 };
    const monthNum = monthMap[month];
    if (monthNum === undefined) return null;
    
    const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
    const firstDayOfMonth = new Date(actualYear, monthNum, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    let startDay, endDay;
    const monthDays = new Date(actualYear, monthNum + 1, 0).getDate();
    
    switch(week) {
      case 'W-1': startDay = 1; endDay = 7 - firstDayWeekday; break;
      case 'W-2': startDay = 8 - firstDayWeekday; endDay = 14 - firstDayWeekday; break;
      case 'W-3': startDay = 15 - firstDayWeekday; endDay = 21 - firstDayWeekday; break;
      case 'W-4': startDay = 22 - firstDayWeekday; endDay = 28 - firstDayWeekday; break;
      case 'W-5': startDay = 29 - firstDayWeekday; endDay = 35 - firstDayWeekday; break;
      case 'W-6': startDay = 36 - firstDayWeekday; endDay = monthDays; break;
      default: startDay = 1; endDay = 7;
    }
    
    startDay = Math.max(1, Math.min(startDay, monthDays));
    endDay = Math.max(startDay, Math.min(endDay, monthDays));
    
    if (startDay > monthDays) return null;
    
    const pad = (n) => String(n).padStart(2, '0');
    return { 
      startDate: `${actualYear}-${pad(monthNum + 1)}-${pad(startDay)}`, 
      endDate: `${actualYear}-${pad(monthNum + 1)}-${pad(endDay)}` 
    };
  };
  
  const fetchAvailableMonths = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      const approvedMonths = months.filter(month => month.approvalStatus === 'APPROVED' && month.hasPlannedAudits);
      setAvailableMonths(approvedMonths);
    } catch (error) {
      console.error('Error fetching available months:', error);
      addToast('Failed to load months', 'error');
    } finally { setLoading(false); }
  };
  
  const fetchWeeklyData = async (month) => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getByYearAndMonth(selectedYear, month);
      const schedules = response.data || [];
      const approvedSchedules = schedules.filter(s => s.approvalStatus === 'APPROVED');
      
      const weekData = {};
      weeks.forEach(week => {
        const weekSchedules = approvedSchedules.filter(s => s.week === week);
        weekData[week] = {
          scheduleCount: weekSchedules.length,
          departments: [...new Set(weekSchedules.map(s => s.department))],
          hasSchedules: weekSchedules.length > 0,
          schedules: weekSchedules
        };
      });
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      addToast('Failed to load week data', 'error');
    } finally { setLoading(false); }
  };
  
  useEffect(() => { fetchAvailableMonths(); }, [selectedYear]);
  useEffect(() => { if (urlYear) setSelectedYear(parseInt(urlYear)); }, [urlYear]);
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years);
  }, []);
  
  useEffect(() => {
    if (selectedMonth) {
      fetchWeeklyData(selectedMonth);
      setViewMode('weeks');
    }
  }, [selectedMonth]);
  
  const handleMonthClick = (month) => setSelectedMonth(month);
  const handleBackToMonths = () => { setSelectedMonth(null); setViewMode('months'); };
  
  const handleWeekClick = (week, weekData) => {
    if (!weekData.hasSchedules) {
      addToast(`No schedules found for ${week}. Please add schedules in Form 5 first.`, 'warning');
      return;
    }
    const dateRange = getWeekDateRange(selectedYear, selectedMonth, week);
    if (!dateRange) {
      addToast(`Week ${week} does not exist in this month`, 'warning');
      return;
    }
    navigate('/form5-detailed', {
      state: { year: selectedYear, month: selectedMonth, preSelectedWeek: week, startDate: dateRange.startDate, endDate: dateRange.endDate }
    });
  };
  
  if (loading && viewMode === 'months') {
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

  const currentMonthTheme = selectedMonth ? (monthThemeColors[selectedMonth] || { bg: '#F8FAFC', border: '#E2E8F0', text: '#1F2937', icon: '#6B7280' }) : null;

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      
      {/* Header */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <button
              onClick={() => navigate('/audit-manager?view=schedules')}
              style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
              title="Back to Schedules Workflow"
            >
              <FiArrowLeft size={18} />
            </button>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCalendar size={24} color={T.accent} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Audit Schedule Calendar</h1>
                
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>
                {viewMode === 'months' ? 'Select a month to view weekly schedules' : `${monthDisplay[selectedMonth]} ${selectedYear} - Weekly Schedule`}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              disabled
              style={{
                height: 40, padding: '0 32px 0 12px', fontSize: 14, fontWeight: 500, fontFamily: FONT_FAMILY, borderRadius: 8,
                border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textMuted, outline: 'none', cursor: 'not-allowed',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
              }}
            >
              {availableYears.map(year => <option key={year} value={year}>{year} - {year + 1}</option>)}
            </select>
            <button 
              onClick={() => viewMode === 'months' ? fetchAvailableMonths() : fetchWeeklyData(selectedMonth)} 
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

      {/* Month Grid View */}
      {viewMode === 'months' && (
        <>
          {availableMonths.length === 0 ? (
            <Card style={{ padding: 40, textAlign: 'center' }}>
              <FiCalendar size={40} style={{ margin: '0 auto 16px', color: '#CBD5E1' }} />
              <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: T.textValue }}>No approved months found for {selectedYear}</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: T.textMuted }}>Please complete Form 5 and get approval first.</p>
              <ActionButton onClick={() => navigate('/form5')} color="#FFF" bgColor={T.accent} icon={FiCalendar}>Go to Form 5</ActionButton>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {financialMonths.map(month => {
                const monthData = availableMonths.find(m => m.month === month);
                const isApproved = monthData?.approvalStatus === 'APPROVED';
                const hasPlannedAudits = monthData?.hasPlannedAudits || false;
                if (!hasPlannedAudits) return null;
                
                const monthTheme = monthThemeColors[month];
                
                return (
                  <div
                    key={month}
                    onClick={() => isApproved && handleMonthClick(month)}
                    style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden',
                      cursor: isApproved ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                      opacity: isApproved ? 1 : 0.6
                    }}
                    onMouseEnter={e => { 
                      if(isApproved) { 
                        e.currentTarget.style.borderColor = monthTheme.border; 
                        e.currentTarget.style.transform = 'translateY(-2px)'; 
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)'; 
                      } 
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.borderColor = T.border; 
                      e.currentTarget.style.transform = 'translateY(0)'; 
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'; 
                    }}
                  >
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
                      {isApproved ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#166534' }}>
                          <FiCheckCircle size={12} /> Approved
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: T.warningLight, border: `1px solid ${T.warningBorder}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#92400E' }}>
                          <FiClock size={12} /> Pending
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 20 }}>
                      <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: isApproved ? T.textValue : T.textMuted }}>
                          {isApproved ? 'Click to view weeks' : 'Awaiting approval'}
                        </span>
                        {isApproved && <FiChevronRight size={16} color={T.accent} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      
      {/* Week Grid View */}
      {viewMode === 'weeks' && selectedMonth && (
        <>
          {/* Month Header Card */}
          <Card style={{ padding: 24, marginBottom: 24, background: currentMonthTheme.bg, borderColor: currentMonthTheme.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFF', border: `1px solid ${currentMonthTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCalendar size={24} color={currentMonthTheme.icon} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: currentMonthTheme.text }}>{monthDisplay[selectedMonth]} {selectedYear}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Select a week to create or view daily schedules</p>
                </div>
              </div>
              <ActionButton 
                onClick={() => navigate('/form5', { state: { preselectedYear: selectedYear, preselectedMonth: selectedMonth } })} 
                color="#FFF" 
                bgColor={T.accent} 
                icon={FiEdit2}
              >
                Edit Week Schedule
              </ActionButton>
            </div>
          </Card>
          
          {/* Weeks Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {weeks.map(week => {
              const weekNum = parseInt(week.split('-')[1]);
              const monthWeeksCount = getWeeksForMonth(selectedYear, selectedMonth);
              const dateRange = getWeekDateRange(selectedYear, selectedMonth, week);
              const weekData = weeklyData[week] || { hasSchedules: false, scheduleCount: 0, departments: [] };
              const isScheduled = weekData.hasSchedules;
              
              if (weekNum > monthWeeksCount || !dateRange) return null;
              
              return (
                <div
                  key={week}
                  onClick={() => handleWeekClick(week, weekData)}
                  style={{
                    background: T.card, 
                    border: `1px solid ${isScheduled ? T.successBorder : T.border}`, 
                    borderRadius: 12, padding: 20, 
                    cursor: isScheduled ? 'pointer' : 'not-allowed', 
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                    opacity: isScheduled ? 1 : 0.7
                  }}
                  onMouseEnter={e => { 
                    if(isScheduled) { 
                      e.currentTarget.style.transform = 'translateY(-2px)'; 
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)'; 
                    } 
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'; 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: isScheduled ? '#166534' : T.textMuted }}>{week}</h3>
                    {isScheduled ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#166534' }}>
                        <FiCheckCircle size={12} /> {weekData.scheduleCount}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#F1F5F9', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: T.textMuted }}>
                        <FiClock size={12} /> Empty
                      </span>
                    )}
                  </div>
                  
                  <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: `1px solid ${isScheduled ? T.successBorder : T.border}`, marginBottom: 16 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range</p>
                    <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: T.textValue }}>
                      {dateRange.startDate} <span style={{ color: T.textMuted, fontWeight: 400 }}>to</span> {dateRange.endDate}
                    </p>
                  </div>

                  {isScheduled && weekData.departments.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Departments</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {weekData.departments.slice(0, 3).map(dept => (
                          <span key={dept} style={{ padding: '2px 8px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 12, fontSize: 11, fontWeight: 500, color: '#1E40AF' }}>
                            {dept}
                          </span>
                        ))}
                        {weekData.departments.length > 3 && (
                          <span style={{ padding: '2px 8px', background: '#F1F5F9', border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 11, fontWeight: 500, color: T.textMuted }}>
                            +{weekData.departments.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${isScheduled ? T.successBorder : T.border}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isScheduled ? '#166534' : T.textMuted }}>
                      {isScheduled ? 'Create Daily Schedule' : 'No schedules yet'}
                    </span>
                    {isScheduled && <FiChevronRight size={16} color="#166534" />}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <Card style={{ padding: 24, marginTop: 24 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Legend</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 13, color: T.textMuted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.successLight, border: `1px solid ${T.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCheckCircle size={10} color={T.success} />
                </div>
                Week has schedules - Click to create daily schedule
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiClock size={10} color="#64748B" />
                </div>
                No schedules - Complete Form 5 first
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default WeekSelectionView;