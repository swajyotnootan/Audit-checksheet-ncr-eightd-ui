// src/components/dashboards/DashboardAnalytics.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FiTrendingUp, FiActivity, FiPieChart, FiAward, FiAlertTriangle,
  FiBarChart2, FiThumbsUp, FiBriefcase, FiCalendar, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiFileText, FiUsers,
  FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiStar, FiTarget,
  FiTrendingDown, FiAward as FiTrophy, FiZap, FiShield
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart
} from 'recharts';
import { format, subMonths } from 'date-fns';
 
// Professional color palette with full opacity for charts
const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  rose: '#f43f5e',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
  pink: '#ec4899'
};
 
// Glassmorphic Card Component
const GlassCard = ({ children, className = "" }) => (
  <div className={`backdrop-blur-xl bg-white/20 border border-white/20 rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);
 
// Animated Chart Slide Component - Charts have full opacity
// Fix the ChartSlide component - filter out isVisible from children
const ChartSlide = ({ title, children, icon: Icon, isVisible }) => {
  const [animationState, setAnimationState] = useState('idle');
 
  useEffect(() => {
    if (isVisible && animationState === 'idle') {
      setAnimationState('zooming');
      const zoomTimer = setTimeout(() => setAnimationState('settling'), 300);
      const settleTimer = setTimeout(() => setAnimationState('normal'), 600);
      return () => {
        clearTimeout(zoomTimer);
        clearTimeout(settleTimer);
      };
    } else if (!isVisible && animationState !== 'idle') {
      setAnimationState('idle');
    }
  }, [isVisible, animationState]);
 
  const getAnimationClass = () => {
    switch (animationState) {
      case 'zooming': return 'animate-zoom-in';
      case 'settling': return 'animate-zoom-settle';
      case 'normal': return 'animate-zoom-normal';
      default: return '';
    }
  };
 
  return (
    <GlassCard className={`p-5 transition-all duration-500 hover:shadow-xl hover:bg-white/30 mx-auto w-full max-w-3xl overflow-hidden ${getAnimationClass()}`}>
      <div className="flex items-center gap-2 pb-2 mb-4 border-b border-white/20">
        <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500/60 to-purple-600/60 backdrop-blur-sm">
          <Icon className="w-4 h-4 text-white/90" />
        </div>
        <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="h-[320px] w-full transition-all duration-300">
        {children}
      </div>
    </GlassCard>
  );
};
 
// Carousel Component
const ChartCarousel = ({ slides, autoPlayInterval = 5000, onSlideChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingIndex, setPendingIndex] = useState(null);
 
  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const nextIndex = (currentIndex + 1) % slides.length;
    setPendingIndex(nextIndex);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      if (onSlideChange) onSlideChange(nextIndex);
      setPendingIndex(null);
      setIsTransitioning(false);
    }, 500);
  };
 
  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    setPendingIndex(prevIndex);
    setTimeout(() => {
      setCurrentIndex(prevIndex);
      if (onSlideChange) onSlideChange(prevIndex);
      setPendingIndex(null);
      setIsTransitioning(false);
    }, 500);
  };
 
  const goToSlide = (index) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setPendingIndex(index);
    setTimeout(() => {
      setCurrentIndex(index);
      if (onSlideChange) onSlideChange(index);
      setPendingIndex(null);
      setIsTransitioning(false);
    }, 500);
  };
 
  const toggleAutoPlay = () => setIsAutoPlaying(!isAutoPlaying);
 
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => nextSlide(), autoPlayInterval);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, currentIndex]);
 
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="flex-shrink-0 w-full px-2" style={{ width: '100%' }}>
              {React.cloneElement(slide, { isVisible: index === currentIndex })}
            </div>
          ))}
        </div>
       
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              disabled={isTransitioning}
              className="absolute z-10 p-2 transition-all -translate-y-1/2 rounded-full shadow-lg left-4 top-1/2 bg-white/60 backdrop-blur-sm hover:bg-white/80 disabled:opacity-50"
            >
              <FiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextSlide}
              disabled={isTransitioning}
              className="absolute z-10 p-2 transition-all -translate-y-1/2 rounded-full shadow-lg right-4 top-1/2 bg-white/60 backdrop-blur-sm hover:bg-white/80 disabled:opacity-50"
            >
              <FiChevronRight className="w-5 h-5 text-gray-600" />
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
                  currentIndex === idx
                    ? 'w-8 bg-gradient-to-r from-indigo-500/70 to-purple-500/70'
                    : 'w-2 bg-gray-400/40 hover:bg-gray-500/60'
                }`}
              />
            ))}
          </div>
          <button
            onClick={toggleAutoPlay}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 transition-all rounded-xl bg-white/40 backdrop-blur-sm hover:bg-white/60"
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
 
// Metric Card Component - Reduced opacity
const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, onClick }) => (
  <GlassCard className={`p-4 transition-all duration-300 hover:shadow-xl hover:bg-white/30 hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500/80">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subtitle && <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs ${trend === 'up' ? 'text-emerald-600/80' : trend === 'down' ? 'text-red-600/80' : 'text-gray-500/80'}`}>{trendValue}</span>
          <span className="text-xs text-gray-400/80">{subtitle}</span>
        </div>}
      </div>
      <div className={`p-3 transition-transform rounded-xl bg-gradient-to-br ${color} opacity-80 group-hover:scale-110`}>
        <Icon className="w-5 h-5 text-white/90" />
      </div>
    </div>
    <div className="w-full h-1 mt-3 overflow-hidden rounded-full bg-gray-200/50">
      <div className={`h-full rounded-full bg-gradient-to-r ${color} opacity-70`} style={{ width: typeof value === 'number' ? `${Math.min(value, 100)}%` : '75%' }} />
    </div>
  </GlassCard>
);
 
// Insight Card Component - Reduced opacity
const InsightCard = ({ title, value, icon: Icon, description, color, trend }) => (
  <GlassCard className="p-4 transition-all duration-300 hover:shadow-xl hover:bg-white/30">
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-gradient-to-br ${color} opacity-80`}>
        <Icon className="w-4 h-4 text-white/90" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          {trend && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600/80' : 'text-red-600/80'}`}>
              {trend > 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
        <p className="mt-1 text-xs text-gray-500/80">{description}</p>
      </div>
    </div>
  </GlassCard>
);
 
// Top Performer Card - Reduced opacity
const TopPerformerCard = ({ rank, name, score, department, color }) => (
  <div className="flex items-center gap-3 p-3 transition-all bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/40">
    <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${color} opacity-90 text-white font-bold text-sm`}>
      {rank}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-gray-800">{name}</p>
      <p className="text-xs text-gray-500/80">{department}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-indigo-600/90">{score}%</p>
      <div className="w-16 h-1 mt-1 overflow-hidden rounded-full bg-gray-200/50">
        <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${score}%` }} />
      </div>
    </div>
  </div>
);
 
// Alert Item Component - Reduced opacity
const AlertItem = ({ message, time, icon: Icon, color }) => (
  <div className="flex items-start gap-3 p-3 transition-all border-b border-white/20 last:border-0 hover:bg-white/20">
    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${color} opacity-80`}>
      <Icon className="w-3 h-3 text-white/90" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-700">{message}</p>
      <p className="mt-1 text-xs text-gray-400/80">{time}</p>
    </div>
  </div>
);
 
// Add CSS animation keyframes
const addAnimationStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('dashboard-animations')) {
    const style = document.createElement('style');
    style.id = 'dashboard-animations';
    style.textContent = `
      @keyframes zoomIn {
        0% { opacity: 0; transform: scale(0.7); }
        50% { opacity: 1; transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes zoomSettle {
        0% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      @keyframes zoomNormal {
        0% { transform: scale(0.98); opacity: 0.95; }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-zoom-in { animation: zoomIn 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
      .animate-zoom-settle { animation: zoomSettle 0.3s ease-out forwards; }
      .animate-zoom-normal { animation: zoomNormal 0.2s ease-out forwards; }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
    `;
    document.head.appendChild(style);
  }
};
 
const DashboardAnalytics = ({ stats, allSchedules, allNCRs, allResponses, carouselSpeed, setCarouselSpeed, onRefresh, refreshing, leadAuditorDepartment  }) => {
 
  useEffect(() => {
    addAnimationStyles();
  }, []);
 
 
  // ============================================================
  // 1. APPROVAL TREND OVER TIME (Last 6 Months)
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
     
      months.push({
        month: monthStr,
        approved: approved + responsesApproved,
        rejected: rejected + responsesRejected,
        pending: pending
      });
    }
    return months;
  };
 
  // ============================================================
  // 2. DEPARTMENT PERFORMANCE
  // ============================================================
  const getDepartmentPerformance = () => {
    const deptMap = new Map();
   
    allSchedules.forEach(s => {
      const dept = s.department || 'Unknown';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, completed: 0, approved: 0 });
      }
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
 
  // ============================================================
  // 3. AUDITOR PERFORMANCE RANKING
  // ============================================================
  const getAuditorPerformance = () => {
    const auditorMap = new Map();
   
    allSchedules.forEach(s => {
      const auditorName = s.auditorName || s.leadAuditorName;
      if (!auditorName) return;
     
      if (!auditorMap.has(auditorName)) {
        auditorMap.set(auditorName, {
          total: 0,
          completed: 0,
          approved: 0,
          responsesCount: 0,
          responsesApproved: 0
        });
      }
      const data = auditorMap.get(auditorName);
      data.total++;
      if (s.status === 'COMPLETED') data.completed++;
      if (s.approvalStatus === 'APPROVED') data.approved++;
    });
   
    allResponses.forEach(r => {
      const auditorName = r.auditorName;
      if (!auditorName) return;
     
      if (!auditorMap.has(auditorName)) {
        auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0, responsesCount: 0, responsesApproved: 0 });
      }
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
 
  // ============================================================
  // 4. MONTHLY PERFORMANCE TREND
  // ============================================================
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
     
      months.push({
        month: monthName,
        audits: scheduledCount,
        completedAudits: completedCount,
        ncrs: ncrCount
      });
    }
    return months;
  };
 
  // ============================================================
  // 5. AUDIT STATUS DISTRIBUTION
  // ============================================================
  const getAuditStatusDistribution = () => {
    const statuses = [
      { name: 'Scheduled', value: stats.scheduled || 0, color: COLORS.info },
      { name: 'In Progress', value: stats.inProgress || 0, color: COLORS.warning },
      { name: 'Completed', value: stats.completedSchedules || 0, color: COLORS.teal },
      { name: 'Approved', value: stats.approved || 0, color: COLORS.success },
      { name: 'Rejected', value: stats.rejected || 0, color: COLORS.danger }
    ];
    return statuses.filter(s => s.value > 0);
  };
 
  // ============================================================
  // 6. RESPONSE STATUS DISTRIBUTION
  // ============================================================
  const getResponseStatusDistribution = () => {
    const approved = allResponses.filter(r => r.status === 'APPROVED').length;
    const rejected = allResponses.filter(r => r.status === 'REJECTED').length;
    const submitted = allResponses.filter(r => r.status === 'SUBMITTED').length;
    const draft = allResponses.filter(r => !r.status || r.status === 'DRAFT').length;
   
    return [
      { name: 'Approved', value: approved, color: COLORS.success },
      { name: 'Rejected', value: rejected, color: COLORS.danger },
      { name: 'Submitted', value: submitted, color: COLORS.warning },
      { name: 'Draft', value: draft, color: COLORS.info }
    ].filter(s => s.value > 0);
  };
 
  // ============================================================
  // 7. SCORE DISTRIBUTION
  // ============================================================
  const getScoreDistribution = () => {
    const ranges = [
      { range: '0-20%', min: 0, max: 20, count: 0, color: COLORS.danger },
      { range: '21-40%', min: 21, max: 40, count: 0, color: COLORS.rose },
      { range: '41-60%', min: 41, max: 60, count: 0, color: COLORS.warning },
      { range: '61-80%', min: 61, max: 80, count: 0, color: COLORS.info },
      { range: '81-100%', min: 81, max: 100, count: 0, color: COLORS.success }
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
 
  // ============================================================
  // 8. WEEKLY AUDIT ACTIVITY
  // ============================================================
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
 
  // Calculate additional metrics for bottom section
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
 
 
  // Calculate scheduled audits count from allSchedules prop
const getScheduledAuditsCount = () => {
  // Only count audits that have a scheduled date and are not draft
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
  if (stats.pendingApproval > 0) {
    alerts.push({ message: `${stats.pendingApproval} audit(s) pending approval`, time: 'Urgent', icon: FiClock, color: 'from-amber-500/80 to-amber-600/80' });
  }
  if (overdueAudits > 0) {
    alerts.push({ message: `${overdueAudits} overdue audit(s) need attention`, time: 'Overdue', icon: FiAlertTriangle, color: 'from-red-500/80 to-red-600/80' });
  }
  if (stats.criticalNCRs > 0) {
    alerts.push({ message: `${stats.criticalNCRs} critical NCR(s) require immediate action`, time: 'High Priority', icon: FiAlertCircle, color: 'from-red-600/80 to-red-700/80' });
  }
  if (stats.responsesSubmitted > 0) {
    alerts.push({ message: `${stats.responsesSubmitted} response(s) waiting for review`, time: 'Pending', icon: FiFileText, color: 'from-blue-500/80 to-blue-600/80' });
  }
 
  // Chart slides with FULL OPACITY colors for better visibility
  const chartSlides = [
    <ChartSlide key="trend" title="Approval Trend (Last 6 Months)" icon={FiTrendingUp}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={approvalTrend} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="approved" name="Approved" fill={COLORS.success} radius={[4, 4, 0, 0]} />
          <Bar dataKey="rejected" name="Rejected" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="pending" name="Pending" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="department" title="Department Performance" icon={FiBriefcase}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={departmentPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="completionRate" name="Completion Rate %" fill={COLORS.success} radius={[0, 8, 8, 0]} />
          <Bar dataKey="approvalRate" name="Approval Rate %" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="auditor" title="Auditor Performance Ranking" icon={FiUsers}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={auditorPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="score" name="Performance Score" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          <Bar dataKey="responseApprovalRate" name="Response Approval %" fill={COLORS.success} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="monthly" title="Monthly Performance Trend (Apr-Mar)" icon={FiActivity}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={monthlyPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="audits" name="Scheduled Audits" stroke={COLORS.info} strokeWidth={3} dot={{ fill: COLORS.info, r: 5, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="completedAudits" name="Completed Audits" stroke={COLORS.success} strokeWidth={3} dot={{ fill: COLORS.success, r: 5, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="ncrs" name="NCRs Raised" stroke={COLORS.danger} strokeWidth={3} dot={{ fill: COLORS.danger, r: 5, strokeWidth: 2, stroke: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="status" title="Audit Status Distribution" icon={FiPieChart}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={auditStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {auditStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="responseStatus" title="Check Sheet Response Status" icon={FiFileText}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={responseStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {responseStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="scores" title="Response Score Distribution" icon={FiBarChart2}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={scoreDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
          <Bar dataKey="count" name="Number of Responses" radius={[4, 4, 0, 0]}>
            {scoreDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartSlide>,
 
    <ChartSlide key="weekly" title="Weekly Audit Activity (Last 8 Weeks)" icon={FiActivity}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={weeklyActivity} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.3)" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke={COLORS.danger} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar yAxisId="left" dataKey="audits" name="Audits Scheduled" fill={COLORS.info} radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="completed" name="Audits Completed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="ncrs" name="NCRs Raised" stroke={COLORS.danger} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartSlide>
  ];
 
  return (
    <>
      {/* Key Metrics Cards - Reduced opacity */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Audits"
          value={getScheduledAuditsCount()}
          subtitle="scheduled this year"
          icon={FiCalendar}
          color="from-indigo-500/80 to-indigo-600/80"
        />
        <MetricCard
          title="Total NCRs"
          value={stats.totalNCRs}
          subtitle="non-conformities"
          icon={FiAlertTriangle}
          color="from-red-500/80 to-red-600/80"
        />
        <MetricCard
          title="Response Approval Rate"
          value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`}
          subtitle="approved"
          icon={FiThumbsUp}
          color="from-purple-500/80 to-purple-600/80"
        />
        <MetricCard
          title="Avg Response Score"
          value={`${avgResponseScore}%`}
          subtitle="average score"
          icon={FiBarChart2}
          color="from-amber-500/80 to-amber-600/80"
        />
      </div>
 
      {/* Chart Dashboard */}
      <div className="mb-8">
        <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-transparent bg-gradient-to-r from-indigo-600/90 to-purple-600/90 bg-clip-text">Analytics Dashboard</h2>
            <p className="text-sm text-gray-500/80">Real-time audit performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={carouselSpeed}
              onChange={(e) => setCarouselSpeed(Number(e.target.value))}
              className="px-3 py-2 text-sm text-gray-700 border rounded-lg bg-white/30 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value={3000}>3 sec</option>
              <option value={5000}>5 sec</option>
              <option value={7000}>7 sec</option>
              <option value={10000}>10 sec</option>
            </select>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-5 py-2 text-white transition-all bg-gradient-to-r from-indigo-600/70 to-purple-600/70 rounded-xl hover:shadow-lg hover:from-indigo-600/90 hover:to-purple-600/90 backdrop-blur-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
            <div className="items-center hidden gap-2 text-sm text-gray-500/80 lg:flex">
              <FiActivity className="inline w-4 h-4 mr-1" />
              Last updated: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </div>
          </div>
        </div>
       
        <div className="flex justify-center w-full">
          <ChartCarousel slides={chartSlides} autoPlayInterval={carouselSpeed} />
        </div>
      </div>
 
      {/* BOTTOM SECTION - Reduced opacity */}
      <div className="grid grid-cols-1 gap-6 mt-8 lg:grid-cols-3 animate-slide-up">
        {/* Left Column: Key Insights */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500/60 to-purple-600/60 backdrop-blur-sm">
              <FiTarget className="w-4 h-4 text-white/90" />
            </div>
            <h3 className="font-semibold text-gray-700">Key Insights</h3>
          </div>
          <div className="space-y-4">
            <InsightCard
              title="Month-over-Month Improvement"
              value={`${momImprovement > 0 ? '+' : ''}${momImprovement}%`}
              icon={FiTrendingUp}
              description="Compared to previous month"
              color="from-emerald-500/80 to-emerald-600/80"
              trend={momImprovement}
            />
            <InsightCard
              title="Quality Score"
              value={`${Math.round((stats.responsesApproved / (stats.responsesApproved + stats.responsesRejected || 1)) * 100)}%`}
              icon={FiShield}
              description="Response quality rating"
              color="from-blue-500/80 to-blue-600/80"
              trend={5}
            />
            <InsightCard
              title="Audit Efficiency"
              value={`${stats.totalSchedules ? Math.round((stats.completedSchedules / stats.totalSchedules) * 100) : 0}%`}
              icon={FiZap}
              description="Audit completion efficiency"
              color="from-amber-500/80 to-amber-600/80"
              trend={8}
            />
          </div>
        </GlassCard>
 
        {/* Middle Column: Top Performers */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500/60 to-teal-600/60 backdrop-blur-sm">
              <FiTrophy className="w-4 h-4 text-white/90" />
            </div>
            <h3 className="font-semibold text-gray-700">Top Performers</h3>
          </div>
          <div className="space-y-2">
            {topAuditors.length > 0 ? (
              topAuditors.map((auditor, idx) => (
                <TopPerformerCard
                  key={idx}
                  rank={idx + 1}
                  name={auditor.name}
                  score={auditor.score}
                  department="Auditor"
                  color={idx === 0 ? 'from-amber-500/80 to-amber-600/80' : idx === 1 ? 'from-gray-400/80 to-gray-500/80' : 'from-orange-500/80 to-orange-600/80'}
                />
              ))
            ) : (
              <p className="py-8 text-sm text-center text-gray-500/80">No auditor data available</p>
            )}
          </div>
        </GlassCard>
 
        {/* Right Column: Alerts & Notifications */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/60 to-rose-600/60 backdrop-blur-sm">
              <FiAlertCircle className="w-4 h-4 text-white/90" />
            </div>
            <h3 className="font-semibold text-gray-700">Alerts & Notifications</h3>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500/80 rounded-full ml-auto">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="overflow-y-auto max-h-64 custom-scrollbar">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <AlertItem
                  key={idx}
                  message={alert.message}
                  time={alert.time}
                  icon={alert.icon}
                  color={alert.color}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FiCheckCircle className="w-10 h-10 mb-2 text-emerald-400/80" />
                <p className="text-sm text-gray-500/80">No pending alerts</p>
                <p className="text-xs text-gray-400/80">All systems running smoothly</p>
              </div>
            )}
          </div>
         
          {/* Quick Stats Summary */}
          <div className="pt-4 mt-4 border-t border-white/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500/80">Active Audits</p>
                <p className="text-lg font-bold text-indigo-600/90">{stats.inProgress || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500/80">Open NCRs</p>
                <p className="text-lg font-bold text-red-600/90">{stats.openNCRs || 0}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
 
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </>
  );
};
 
export default DashboardAnalytics;
 