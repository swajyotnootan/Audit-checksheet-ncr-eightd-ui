// src/components/dashboards/DashboardAnalytics.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FiTrendingUp, FiActivity, FiAward, FiAlertTriangle,
  FiBarChart2, FiThumbsUp, FiBriefcase, FiCalendar, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiFileText, FiUsers,
  FiCheckCircle, FiClock, FiAlertCircle, FiTarget,
  FiTrendingDown, FiAward as FiTrophy, FiZap, FiShield
} from 'react-icons/fi';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subMonths } from 'date-fns';

// ============================================================================
// COLOR PALETTE (Strictly Professional Blue Shades - Audit Manager Look)
// ============================================================================
const NAVBAR_COLORS = {
  primary: '#00529B',    // Deep Professional Blue
  secondary: '#3b82f6',  // Standard Blue
  dark: '#1e3a8a',       // Navy Blue
  light: '#60a5fa',      // Soft Blue
  lighter: '#93c5fd',    // Pale Blue
  bg: '#eff6ff',         // Very Faint Blue Background
  white: '#ffffff'
};

// ============================================================================
// SVG GRADIENT DEFINITIONS FOR AREA CHARTS
// ============================================================================
const ChartGradients = () => (
  <defs>
    <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={NAVBAR_COLORS.primary} stopOpacity={0.15} />
      <stop offset="95%" stopColor={NAVBAR_COLORS.primary} stopOpacity={0} />
    </linearGradient>
    <linearGradient id="fillSecondary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={NAVBAR_COLORS.secondary} stopOpacity={0.15} />
      <stop offset="95%" stopColor={NAVBAR_COLORS.secondary} stopOpacity={0} />
    </linearGradient>
    <linearGradient id="fillLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={NAVBAR_COLORS.light} stopOpacity={0.15} />
      <stop offset="95%" stopColor={NAVBAR_COLORS.light} stopOpacity={0} />
    </linearGradient>
  </defs>
);

// ============================================================================
// CLEAN UI COMPONENTS (MNC Professional Look)
// ============================================================================
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const ChartSlide = ({ title, children, icon: Icon }) => {
  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
        <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
        </div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="h-[320px] w-full">
        {children}
      </div>
    </Card>
  );
};

const ChartCarousel = ({ slides, autoPlayInterval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index) => setCurrentIndex(index);
  const toggleAutoPlay = () => setIsAutoPlaying(!isAutoPlaying);

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(nextSlide, autoPlayInterval);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="flex-shrink-0 w-full px-2" style={{ width: '100%' }}>
              {slide}
            </div>
          ))}
        </div>
        
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute z-10 p-2 transition-all -translate-y-1/2 bg-white border rounded-full shadow-md left-4 top-1/2 border-slate-200 hover:bg-slate-50"
            >
              <FiChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute z-10 p-2 transition-all -translate-y-1/2 bg-white border rounded-full shadow-md right-4 top-1/2 border-slate-200 hover:bg-slate-50"
            >
              <FiChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </>
        )}
      </div>
     
      {slides.length > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2 mx-auto">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-8' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                style={currentIndex === idx ? { backgroundColor: NAVBAR_COLORS.primary } : {}}
              />
            ))}
          </div>
          <button
            onClick={toggleAutoPlay}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 transition-all rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
          >
            {isAutoPlaying ? (
              <><FiPause className="w-3.5 h-3.5" /><span className="hidden sm:inline">Pause</span></>
            ) : (
              <><FiPlay className="w-3.5 h-3.5" /><span className="hidden sm:inline">Play</span></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon }) => (
  <Card className="p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <Icon className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
      </div>
    </div>
  </Card>
);

const InsightCard = ({ title, value, icon: Icon, description, trend }) => (
  <Card className="p-4 transition-all duration-300 hover:shadow-md">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <Icon className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
          {trend !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {trend > 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
              {trend !== 0 && `${Math.abs(trend)}%`}
            </span>
          )}
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  </Card>
);

const TopPerformerCard = ({ rank, name, score, department }) => (
  <div className="flex items-center gap-3 p-3 transition-all border bg-slate-50 rounded-xl hover:bg-slate-100 border-slate-100">
    <div 
      className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-full shadow-sm"
      style={{ backgroundColor: NAVBAR_COLORS.primary }}
    >
      {rank}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate text-slate-800">{name}</p>
      <p className="text-xs text-slate-500">{department}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-800">{score}%</p>
      <div className="w-16 h-1.5 mt-1 overflow-hidden rounded-full bg-slate-200">
        <div 
          className="h-full rounded-full" 
          style={{ width: `${score}%`, backgroundColor: NAVBAR_COLORS.secondary }} 
        />
      </div>
    </div>
  </div>
);

const AlertItem = ({ message, time, icon: Icon }) => (
  <div className="flex items-start gap-3 p-3 transition-all border-b rounded-lg border-slate-100 last:border-0 hover:bg-slate-50">
    <div className="p-1.5 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <Icon className="w-3.5 h-3.5" style={{ color: NAVBAR_COLORS.primary }} />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-700">{message}</p>
      <p className="mt-1 text-xs text-slate-400">{time}</p>
    </div>
  </div>
);

// ============================================================================
// MAIN DASHBOARD ANALYTICS COMPONENT
// ============================================================================
const DashboardAnalytics = ({ 
  stats, allSchedules, allNCRs, allResponses, 
  carouselSpeed, setCarouselSpeed, onRefresh, refreshing, leadAuditorDepartment 
}) => {

  // Common Tooltip Style for all charts
  const tooltipStyle = { 
    backgroundColor: '#fff', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
    padding: '8px 12px'
  };

  // ============================================================
  // DATA CALCULATION FUNCTIONS (Preserved exactly as original)
  // ============================================================
  const getApprovalTrend = () => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const monthStr = format(date, 'MMM');
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthSchedules = allSchedules.filter(s => {
        if (!s.scheduledDate) return false;
        const scheduleDate = new Date(s.scheduledDate);
        return scheduleDate.getMonth() === month && scheduleDate.getFullYear() === year;
      });
      const approved = monthSchedules.filter(s => s.approvalStatus === 'APPROVED' || s.status === 'APPROVED').length;
      const rejected = monthSchedules.filter(s => s.approvalStatus === 'REJECTED' || s.status === 'REJECTED').length;
      const pending = monthSchedules.filter(s => s.approvalStatus === 'SUBMITTED' || s.approvalStatus === 'PENDING' || s.status === 'SUBMITTED').length;
      const monthResponses = allResponses.filter(r => {
        if (!r.submittedAt && !r.createdAt) return false;
        const responseDate = r.submittedAt ? new Date(r.submittedAt) : new Date(r.createdAt);
        return responseDate.getMonth() === month && responseDate.getFullYear() === year;
      });
      const responsesApproved = monthResponses.filter(r => r.status === 'APPROVED').length;
      const responsesRejected = monthResponses.filter(r => r.status === 'REJECTED').length;
      months.push({ month: monthStr, approved: approved + responsesApproved, rejected: rejected + responsesRejected, pending: pending });
    }
    return months;
  };

  const getDepartmentPerformance = () => {
    const deptMap = new Map();
    allSchedules.forEach(s => {
      const dept = s.department || 'Unknown';
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, completed: 0, approved: 0 });
      const data = deptMap.get(dept);
      data.total++;
      if (s.status === 'COMPLETED') data.completed++;
      if (s.approvalStatus === 'APPROVED') data.approved++;
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({
        name: name.length > 12 ? name.substring(0, 10) + '...' : name,
        total: data.total,
        completionRate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
        approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const getAuditorPerformance = () => {
    const auditorMap = new Map();
    allSchedules.forEach(s => {
      const auditorName = s.auditorName || s.leadAuditorName;
      if (!auditorName) return;
      if (!auditorMap.has(auditorName)) auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0, responsesCount: 0, responsesApproved: 0 });
      const data = auditorMap.get(auditorName);
      data.total++;
      if (s.status === 'COMPLETED') data.completed++;
      if (s.approvalStatus === 'APPROVED') data.approved++;
    });
    allResponses.forEach(r => {
      const auditorName = r.auditorName;
      if (!auditorName) return;
      if (!auditorMap.has(auditorName)) auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0, responsesCount: 0, responsesApproved: 0 });
      const data = auditorMap.get(auditorName);
      data.responsesCount++;
      if (r.status === 'APPROVED') data.responsesApproved++;
    });
    return Array.from(auditorMap.entries())
      .map(([name, data]) => ({
        name: name.split(' ')[0],
        total: data.total,
        completionRate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
        approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0,
        responseApprovalRate: data.responsesCount ? Math.round((data.responsesApproved / data.responsesCount) * 100) : 0,
        score: Math.round(((data.completed / (data.total || 1)) * 0.5 + (data.approved / (data.total || 1)) * 0.5) * 100)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  };

  const getMonthlyPerformance = () => {
    const months = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    let startYear = currentYear;
    let startMonth = 3;
    if (today.getMonth() < 3) startYear = currentYear - 1;
    for (let i = 0; i < 12; i++) {
      const date = new Date(startYear, startMonth + i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleString('default', { month: 'short' });
      const schedulesInMonth = allSchedules.filter(s => {
        if (!s.scheduledDate) return false;
        const scheduleDate = new Date(s.scheduledDate);
        return scheduleDate.getMonth() === monthIndex && scheduleDate.getFullYear() === year;
      });
      const scheduledCount = schedulesInMonth.length;
      const completedCount = schedulesInMonth.filter(s => s.status === 'COMPLETED').length;
      const ncrCount = allNCRs.filter(n => {
        if (!n.createdAt) return false;
        const ncrDate = new Date(n.createdAt);
        return ncrDate.getMonth() === monthIndex && ncrDate.getFullYear() === year;
      }).length;
      months.push({ month: monthName, audits: scheduledCount, completedAudits: completedCount, ncrs: ncrCount });
    }
    return months;
  };

  const getAuditStatusDistribution = () => {
    return [
      { name: 'Scheduled', value: stats.scheduled || 0 },
      { name: 'In Progress', value: stats.inProgress || 0 },
      { name: 'Completed', value: stats.completedSchedules || 0 },
      { name: 'Approved', value: stats.approved || 0 },
      { name: 'Rejected', value: stats.rejected || 0 }
    ].filter(s => s.value > 0);
  };

  const getResponseStatusDistribution = () => {
    const approved = allResponses.filter(r => r.status === 'APPROVED').length;
    const rejected = allResponses.filter(r => r.status === 'REJECTED').length;
    const submitted = allResponses.filter(r => r.status === 'SUBMITTED').length;
    const draft = allResponses.filter(r => !r.status || r.status === 'DRAFT').length;
    return [
      { name: 'Approved', value: approved },
      { name: 'Rejected', value: rejected },
      { name: 'Submitted', value: submitted },
      { name: 'Draft', value: draft }
    ].filter(s => s.value > 0);
  };

  const getScoreDistribution = () => {
    const ranges = [
      { range: '0-20%', min: 0, max: 20, count: 0 },
      { range: '21-40%', min: 21, max: 40, count: 0 },
      { range: '41-60%', min: 41, max: 60, count: 0 },
      { range: '61-80%', min: 61, max: 80, count: 0 },
      { range: '81-100%', min: 81, max: 100, count: 0 }
    ];
    allResponses.forEach(r => {
      const score = r.percentageScore || 0;
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          range.count++;
          break;
        }
      }
    });
    return ranges;
  };

  const getWeeklyActivity = () => {
    const weeks = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekLabel = `W${Math.floor((weekStart.getDate() / 7) + 1)}`;
      const weekSchedules = allSchedules.filter(s => {
        if (!s.scheduledDate) return false;
        const scheduleDate = new Date(s.scheduledDate);
        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
      });
      weeks.push({
        week: weekLabel,
        audits: weekSchedules.length,
        completed: weekSchedules.filter(s => s.status === 'COMPLETED').length,
        ncrs: allNCRs.filter(n => {
          if (!n.createdAt) return false;
          const ncrDate = new Date(n.createdAt);
          return ncrDate >= weekStart && ncrDate <= weekEnd;
        }).length
      });
    }
    return weeks;
  };

  // Calculate all chart data
  const approvalTrend = getApprovalTrend();
  const departmentPerformance = getDepartmentPerformance();
  const auditorPerformance = getAuditorPerformance();
  const monthlyPerformance = getMonthlyPerformance();
  const auditStatusData = getAuditStatusDistribution();
  const responseStatusData = getResponseStatusDistribution();
  const scoreDistribution = getScoreDistribution();
  const weeklyActivity = getWeeklyActivity();

  const avgResponseScore = allResponses.length
    ? (allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / allResponses.length).toFixed(1)
    : 0;

  const topAuditors = auditorPerformance.slice(0, 3);

  const getMoMImprovement = () => {
    if (monthlyPerformance.length < 2) return 0;
    const lastMonth = monthlyPerformance[monthlyPerformance.length - 1];
    const prevMonth = monthlyPerformance[monthlyPerformance.length - 2];
    if (prevMonth.completedAudits === 0) return 0;
    return Math.round(((lastMonth.completedAudits - prevMonth.completedAudits) / prevMonth.completedAudits) * 100);
  };
  const momImprovement = getMoMImprovement();

  const getScheduledAuditsCount = () => {
    return allSchedules.filter(s => {
      if (!s.scheduledDate) return false;
      const scheduledStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'];
      return scheduledStatuses.includes(s.status);
    }).length;
  };

  const overdueAudits = allSchedules.filter(s => {
    if (!s.scheduledDate) return false;
    return new Date(s.scheduledDate) < new Date() && s.status !== 'COMPLETED' && s.status !== 'REJECTED';
  }).length;

  const alerts = [];
  if (stats.pendingApproval > 0) alerts.push({ message: `${stats.pendingApproval} audit(s) pending approval`, time: 'Urgent', icon: FiClock });
  if (overdueAudits > 0) alerts.push({ message: `${overdueAudits} overdue audit(s) need attention`, time: 'Overdue', icon: FiAlertTriangle });
  if (stats.criticalNCRs > 0) alerts.push({ message: `${stats.criticalNCRs} critical NCR(s) require immediate action`, time: 'High Priority', icon: FiAlertCircle });
  if (stats.responsesSubmitted > 0) alerts.push({ message: `${stats.responsesSubmitted} response(s) waiting for review`, time: 'Pending', icon: FiFileText });

  // ========================================================================
  // CHART SLIDES (STRICTLY LINE & AREA CHARTS)
  // ========================================================================
  const chartSlides = [
    // 1. Approval Trend (Area Chart)
    <ChartSlide key="trend" title="Approval Trend (Last 6 Months)" icon={FiTrendingUp}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={approvalTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
          <Area type="monotone" dataKey="approved" name="Approved" stroke={NAVBAR_COLORS.primary} strokeWidth={3} fill="url(#fillPrimary)" dot={{ r: 4, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" strokeWidth={3} fill="url(#fillSecondary)" dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          <Area type="monotone" dataKey="pending" name="Pending" stroke={NAVBAR_COLORS.light} strokeWidth={3} fill="url(#fillLight)" dot={{ r: 4, fill: NAVBAR_COLORS.light, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 2. Department Performance (Line Chart)
    <ChartSlide key="department" title="Department Performance" icon={FiBriefcase}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={departmentPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
          <Line type="monotone" dataKey="completionRate" name="Completion %" stroke={NAVBAR_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="approvalRate" name="Approval %" stroke={NAVBAR_COLORS.light} strokeWidth={3} dot={{ r: 4, fill: NAVBAR_COLORS.light, strokeWidth: 2, stroke: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 3. Auditor Performance (Line Chart)
    <ChartSlide key="auditor" title="Auditor Performance Ranking" icon={FiUsers}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={auditorPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
          <Line type="monotone" dataKey="score" name="Performance Score" stroke={NAVBAR_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="responseApprovalRate" name="Response Approval %" stroke={NAVBAR_COLORS.secondary} strokeWidth={3} dot={{ r: 4, fill: NAVBAR_COLORS.secondary, strokeWidth: 2, stroke: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 4. Monthly Performance (Area Chart)
    <ChartSlide key="monthly" title="Monthly Performance Trend (Apr-Mar)" icon={FiActivity}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={monthlyPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
          <Area type="monotone" dataKey="audits" name="Scheduled" stroke={NAVBAR_COLORS.light} strokeWidth={3} fill="url(#fillLight)" dot={{ r: 4, fill: NAVBAR_COLORS.light, strokeWidth: 2, stroke: '#fff' }} />
          <Area type="monotone" dataKey="completedAudits" name="Completed" stroke={NAVBAR_COLORS.primary} strokeWidth={3} fill="url(#fillPrimary)" dot={{ r: 4, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} />
          <Area type="monotone" dataKey="ncrs" name="NCRs Raised" stroke="#ef4444" strokeWidth={3} fill="url(#fillSecondary)" dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 5. Audit Status Distribution (Line Chart)
    <ChartSlide key="status" title="Audit Status Distribution" icon={FiAlertCircle}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={auditStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line type="monotone" dataKey="value" name="Count" stroke={NAVBAR_COLORS.primary} strokeWidth={3} dot={{ r: 5, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 6. Response Status Distribution (Line Chart)
    <ChartSlide key="responseStatus" title="Check Sheet Response Status" icon={FiFileText}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={responseStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line type="monotone" dataKey="value" name="Count" stroke={NAVBAR_COLORS.secondary} strokeWidth={3} dot={{ r: 5, fill: NAVBAR_COLORS.secondary, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 7. Score Distribution (Area Chart)
    <ChartSlide key="scores" title="Response Score Distribution" icon={FiBarChart2}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={scoreDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="count" name="Responses" stroke={NAVBAR_COLORS.primary} strokeWidth={3} fill="url(#fillPrimary)" dot={{ r: 5, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartSlide>,

    // 8. Weekly Activity (Area Chart)
    <ChartSlide key="weekly" title="Weekly Audit Activity (Last 8 Weeks)" icon={FiActivity}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={weeklyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
          <Area type="monotone" dataKey="audits" name="Scheduled" stroke={NAVBAR_COLORS.light} strokeWidth={3} fill="url(#fillLight)" dot={{ r: 4, fill: NAVBAR_COLORS.light, strokeWidth: 2, stroke: '#fff' }} />
          <Area type="monotone" dataKey="completed" name="Completed" stroke={NAVBAR_COLORS.primary} strokeWidth={3} fill="url(#fillPrimary)" dot={{ r: 4, fill: NAVBAR_COLORS.primary, strokeWidth: 2, stroke: '#fff' }} />
          <Area type="monotone" dataKey="ncrs" name="NCRs" stroke="#ef4444" strokeWidth={3} fill="url(#fillSecondary)" dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartSlide>
  ];

  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  return (
    <>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Audits" value={getScheduledAuditsCount()} subtitle="scheduled this year" icon={FiCalendar} />
        <MetricCard title="Total NCRs" value={stats.totalNCRs} subtitle="non-conformities" icon={FiAlertTriangle} />
        <MetricCard 
          title="Response Approval" 
          value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`} 
          subtitle="approved" 
          icon={FiThumbsUp} 
        />
        <MetricCard title="Avg Score" value={`${avgResponseScore}%`} subtitle="average score" icon={FiBarChart2} />
      </div>

      {/* Chart Dashboard */}
      <Card className="mb-8">
        <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Analytics Dashboard</h2>
            <p className="text-sm text-slate-500">Real-time audit performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={carouselSpeed}
              onChange={(e) => setCarouselSpeed(Number(e.target.value))}
              className="px-3 py-2 text-sm bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3000}>3 sec</option>
              <option value={5000}>5 sec</option>
              <option value={7000}>7 sec</option>
              <option value={10000}>10 sec</option>
            </select>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-sm hover:shadow-md"
              style={{ backgroundColor: NAVBAR_COLORS.primary }}
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="flex justify-center w-full">
          <ChartCarousel slides={chartSlides} autoPlayInterval={carouselSpeed} />
        </div>
      </Card>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 gap-6 mt-8 lg:grid-cols-3">
        {/* Left Column: Key Insights */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <FiTarget className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
            </div>
            <h3 className="font-semibold text-slate-800">Key Insights</h3>
          </div>
          <div className="space-y-4">
            <InsightCard
              title="Month-over-Month"
              value={`${momImprovement > 0 ? '+' : ''}${momImprovement}%`}
              icon={FiTrendingUp}
              description="Compared to previous month"
              trend={momImprovement}
            />
            <InsightCard
              title="Quality Score"
              value={`${Math.round((stats.responsesApproved / (stats.responsesApproved + stats.responsesRejected || 1)) * 100)}%`}
              icon={FiShield}
              description="Response quality rating"
              trend={5}
            />
            <InsightCard
              title="Audit Efficiency"
              value={`${stats.totalSchedules ? Math.round((stats.completedSchedules / stats.totalSchedules) * 100) : 0}%`}
              icon={FiZap}
              description="Audit completion efficiency"
              trend={8}
            />
          </div>
        </Card>

        {/* Middle Column: Top Performers */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <FiTrophy className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
            </div>
            <h3 className="font-semibold text-slate-800">Top Performers</h3>
          </div>
          <div className="space-y-3">
            {topAuditors.length > 0 ? (
              topAuditors.map((auditor, idx) => (
                <TopPerformerCard
                  key={idx}
                  rank={idx + 1}
                  name={auditor.name}
                  score={auditor.score}
                  department="Auditor"
                />
              ))
            ) : (
              <p className="py-8 text-sm text-center text-slate-400">No auditor data available</p>
            )}
          </div>
        </Card>

        {/* Right Column: Alerts & Notifications */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
              <FiAlertCircle className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
            </div>
            <h3 className="font-semibold text-slate-800">Alerts & Notifications</h3>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full ml-auto" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                {alerts.length}
              </span>
            )}
          </div>
          <div className="overflow-y-auto max-h-64">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <AlertItem
                  key={idx}
                  message={alert.message}
                  time={alert.time}
                  icon={alert.icon}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FiCheckCircle className="w-10 h-10 mb-2 text-emerald-500" />
                <p className="text-sm text-slate-600">No pending alerts</p>
                <p className="text-xs text-slate-400">All systems running smoothly</p>
              </div>
            )}
          </div>
          
          {/* Quick Stats Summary */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 text-center border rounded-lg bg-slate-50 border-slate-100">
                <p className="text-xs text-slate-500">Active Audits</p>
                <p className="text-lg font-bold" style={{ color: NAVBAR_COLORS.primary }}>{stats.inProgress || 0}</p>
              </div>
              <div className="p-3 text-center border rounded-lg bg-slate-50 border-slate-100">
                <p className="text-xs text-slate-500">Open NCRs</p>
                <p className="text-lg font-bold text-slate-700">{stats.openNCRs || 0}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default DashboardAnalytics;