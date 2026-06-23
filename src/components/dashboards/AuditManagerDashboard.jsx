// src/components/dashboards/AuditManagerDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiCheckCircle, FiAlertCircle, FiClock, 
  FiBarChart2, FiTrendingUp, FiGrid, FiRefreshCw, 
  FiMessageSquare, FiCheck, FiX, FiUserCheck, 
  FiArrowRight, FiDownload, FiActivity, FiFolder, 
  FiClipboard, FiChevronRight, FiArrowRightCircle, 
  FiArrowDownCircle, FiMessageCircle, FiArrowLeftCircle, 
  FiEye, FiTrendingDown, FiTarget, FiFileText
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import YearFilter from '../../components/common/YearFilter';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ============================================================================
// COLOR PALETTE (Matching Navbar #5c5491 & #7e6a8a)
// ============================================================================
const NAVBAR_COLORS = {
  primary: '#00529B',    // Vibrant professional blue (Main buttons, active states)
  secondary: '#3b82f6',  // Slightly lighter blue (Gradients, secondary accents)
  dark: '#1e3a8a',       // Deep navy blue (Headings, important text)
  light: '#60a5fa',      // Soft blue (Icons, subtle highlights)
  lighter: '#93c5fd',    // Pale blue (Borders, disabled states)
  bg: '#eff6ff',         // Very faint blue (Page background, card backgrounds)
  white: '#ffffff',      // Pure white
  
  // Chart colors - ranging from deep navy to very light blue
  chartColors: [
    '#1e3a8a',  // Deep Navy
    '#1d4ed8',  // Dark Blue
    '#2563eb',  // Primary Blue
    '#3b82f6',  // Standard Blue
    '#60a5fa',  // Light Blue
    '#93c5fd',  // Pale Blue
    '#bfdbfe',  // Very Light Blue
  ]
};


// ============================================================================
// ANIMATION STYLES (Using standard black shadows like .shadow class)
// ============================================================================
const animationStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
  }
  .animate-scaleIn {
    animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
  .animate-slideInLeft {
    animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
  .animate-slideUp {
    animation: slideUp 0.3s ease-out forwards;
  }
  
  /* Standard card hover with black shadow (like .shadow) */
  .card-hover {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card-hover:hover {
    transform: translateY(-6px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
  
  /* Stat card with standard shadow */
  .stat-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
`;

// ============================================================================
// PREMIUM SIDEBAR (Standard black shadows)
// ============================================================================
const Sidebar = ({ activeView, setActiveView, isOpen, pendingCount }) => {
  const menuItems = [
    { id: 'both', label: 'Dashboard Overview', icon: <FiGrid className="w-5 h-5" /> },
    { id: 'schedules', label: 'Schedules Workflow', icon: <FiFolder className="w-5 h-5" /> },
    { id: 'ncr', label: 'NCR Management', icon: <FiClipboard className="w-5 h-5" /> },
    { id: 'requests', label: 'Pending Requests', icon: <FiMessageSquare className="w-5 h-5" />, badge: pendingCount },
  ];

  return (
    <aside 
      className={`
        fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] 
        bg-white border-r border-slate-200
        shadow-md
        transition-all duration-500 ease-out 
        overflow-hidden flex flex-col
        ${isOpen ? 'w-64' : 'w-0 border-r-0'}
      `}
    >
      <div className="flex-shrink-0 p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl"
            style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}
          >
            <FiGrid className="w-5 h-5 text-white" />
          </div>
          <div className={`${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
            <h2 className="text-base font-bold leading-tight text-slate-800">
              Audit Manager
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Management Console
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl 
              transition-all duration-300 group relative
              animate-fadeInUp
              ${activeView === item.id 
                ? 'text-white font-semibold shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}
            `}
            style={{ 
              animationDelay: `${index * 0.1}s`,
              ...(activeView === item.id ? { 
                background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              } : {})
            }}
          >
            <div className={`flex-shrink-0 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {item.icon}
            </div>
            <span className={`whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 text-sm`}>
              {item.label}
            </span>
            {item.badge > 0 && isOpen && (
              <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex-shrink-0 p-4 border-t border-slate-100">
        <div 
          className="p-4 border rounded-xl"
          style={{ 
            background: NAVBAR_COLORS.bg,
            borderColor: NAVBAR_COLORS.lighter
          }}
        >
          <p className="text-xs font-semibold" style={{ color: NAVBAR_COLORS.dark }}>
            Need Help?
          </p>
          <p className="mt-1 text-xs" style={{ color: NAVBAR_COLORS.secondary }}>
            Contact support team
          </p>
        </div>
      </div>
    </aside>
  );
};

// ============================================================================
// KPI CARD (Standard shadow)
// ============================================================================
const KpiCard = ({ title, value, icon, delay = 0 }) => {
  return (
    <div 
      className="p-6 bg-white border shadow-sm stat-card border-slate-200 rounded-2xl animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: NAVBAR_COLORS.bg }}
        >
          <div style={{ color: NAVBAR_COLORS.primary }}>
            {icon}
          </div>
        </div>
      </div>
      <p className="mb-1 text-3xl font-bold tracking-tight text-slate-800">
        {value}
      </p>
      <p className="text-xs font-medium tracking-wide uppercase text-slate-500">
        {title}
      </p>
    </div>
  );
};

// ============================================================================
// BAR CHART (Standard shadow)
// ============================================================================
const BarChart = ({ data, title, subtitle, delay = 0 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);

  return (
    <div 
      className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-6">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">
          {title}
        </h3>
        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 bg-slate-50 rounded-xl">
          No data available
        </div>
      ) : (
        <div className="flex items-end justify-between h-48 gap-3">
          {data.map((item, idx) => {
            const height = (item.value / maxValue) * 100;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 gap-2 group">
                <div className="relative flex items-end w-full h-40">
                  <div 
                    className="relative w-full overflow-hidden transition-all duration-700 ease-out rounded-t-xl hover:opacity-80"
                    style={{ 
                      height: `${height}%`,
                      background: `linear-gradient(to top, ${NAVBAR_COLORS.primary}, ${NAVBAR_COLORS.secondary})`,
                      animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`
                    }}
                  >
                    <div className="absolute inset-0 transition-opacity opacity-0 bg-white/10 group-hover:opacity-100" />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap font-medium shadow-lg">
                      {item.value}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-center text-slate-500">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PIE CHART (Standard shadow)
// ============================================================================
const NCRPieChart = ({ data, title, subtitle, total, delay = 0 }) => {
  const totalValue = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const hasData = data.some(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="p-3 bg-white border shadow-xl rounded-xl border-slate-200">
          <p className="mb-1 text-sm font-semibold text-slate-800">{item.name}</p>
          <p className="text-xs text-slate-500">Count: <span className="font-semibold text-slate-700">{item.value}</span></p>
          {/* <p className="text-xs text-slate-500">Percentage: <span className="font-semibold text-slate-700">{((item.value / totalValue) * 100).toFixed(1)}%</span></p> */}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-6">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">
          {title}
        </h3>
        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
      {!hasData ? (
        <div className="flex items-center justify-center h-64 text-sm text-slate-400 bg-slate-50 rounded-xl">
          No data available
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0 w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                      style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold" style={{ color: NAVBAR_COLORS.primary }}>
                {total || totalValue}
              </span>
              <span className="text-xs font-medium text-slate-500">Total</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {data.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2 transition-colors rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-md shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: NAVBAR_COLORS.primary }}>
                    {item.value}
                  </span>
                 
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// NCR DEPARTMENT ANALYSIS (Standard shadow)
// ============================================================================
const NCRDepartmentAnalysis = ({ data, delay = 0 }) => {
  const hasData = data.length > 0;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div 
      className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-6">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">
          NCR by Department
        </h3>
        <p className="text-xs text-slate-500">
          Distribution across departments
        </p>
      </div>
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 bg-slate-50 rounded-xl">
          No NCR data available
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{item.department}</span>
                <span className="text-xs font-bold" style={{ color: NAVBAR_COLORS.primary }}>{item.count}</span>
              </div>
              <div className="w-full h-2 overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full transition-all duration-700 ease-out rounded-full"
                  style={{ 
                    width: `${(item.count / maxCount) * 100}%`,
                    background: `linear-gradient(to right, ${NAVBAR_COLORS.primary}, ${NAVBAR_COLORS.secondary})`,
                    animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACTIVITY FEED (Standard shadow)
// ============================================================================
const ActivityFeed = ({ activities, delay = 0 }) => {
  return (
    <div 
      className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Recent Activity
          </h3>
          <p className="text-xs text-slate-500">
            Latest updates and actions
          </p>
        </div>
        <div 
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: NAVBAR_COLORS.bg }}
        >
          <FiActivity className="w-4 h-4" style={{ color: NAVBAR_COLORS.primary }} />
        </div>
      </div>
      {activities.length === 0 ? (
        <div className="py-12 text-sm text-center text-slate-400 bg-slate-50 rounded-xl">
          No recent activity
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
            >
              <div 
                className="flex-shrink-0 p-2 rounded-lg"
                style={{ backgroundColor: NAVBAR_COLORS.bg }}
              >
                <div style={{ color: NAVBAR_COLORS.primary }}>
                  {activity.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CLOCKWISE WORKFLOW CARD (Standard shadow)
// ============================================================================
const ClockwiseWorkflowCard = ({ stepNumber, title, description, status, onClick, disabled, direction, delay = 0 }) => {
  const getDirectionIcon = () => {
    switch(direction) {
      case 'right': return <FiArrowRightCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />;
      case 'down': return <FiArrowDownCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />;
      case 'left': return <FiArrowLeftCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />;
      default: return null;
    }
  };

  const getStatusBadge = () => {
    if (status === 'APPROVED') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
          ✓ Approved
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold animate-pulse" style={{ backgroundColor: NAVBAR_COLORS.lighter, color: NAVBAR_COLORS.dark }}>
          ⏳ Pending
        </span>
      );
    }
    if (status === 'LOCKED') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full font-medium text-slate-500 bg-slate-100">
          🔒 Locked
        </span>
      );
    }
    if (status === 'READY') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
          ✓ Ready
        </span>
      );
    }
    return null;
  };

  return (
    <div 
      className="relative h-full group animate-scaleIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div 
        onClick={disabled ? null : onClick}
        className={`
          relative bg-white rounded-2xl border-2 p-6 
          transition-all duration-400 h-full card-hover
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer shadow-sm'}
        `}
        style={!disabled ? { borderColor: NAVBAR_COLORS.lighter } : {}}
      >
        <div 
          className="absolute -top-3.5 -left-3.5 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
          style={{ backgroundColor: NAVBAR_COLORS.primary }}
        >
          {stepNumber}
        </div>
        
        {direction && (
          <div className="absolute z-10 p-2 -translate-y-1/2 bg-white border rounded-full shadow-md -right-5 top-1/2 border-slate-100">
            {getDirectionIcon()}
          </div>
        )}
        
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-800">
              {title}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
          {!disabled && (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: NAVBAR_COLORS.primary }}>
              <span>
                {status === 'APPROVED' ? 'View Details' : 'Start Workflow'}
              </span>
              <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NCR CARD (Standard shadow)
// ============================================================================
const NcrCard = ({ title, description, icon, onClick, badgeText, isLarge, delay = 0 }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        rounded-2xl p-6 cursor-pointer 
        transition-all duration-400 transform hover:scale-[1.02] card-hover
        border animate-fadeInUp
        ${isLarge ? 'p-7' : ''}
      `}
      style={{ 
        backgroundColor: NAVBAR_COLORS.bg,
        borderColor: NAVBAR_COLORS.lighter,
        animationDelay: `${delay}ms`
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="p-3.5 rounded-xl shadow-md text-white"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <FiChevronRight className="w-5 h-5 opacity-60" style={{ color: NAVBAR_COLORS.primary }} />
      </div>
      <div 
        className="mt-5 inline-block px-4 py-1.5 rounded-full bg-white border font-semibold text-sm shadow-sm"
        style={{ borderColor: NAVBAR_COLORS.lighter, color: NAVBAR_COLORS.primary }}
      >
        {badgeText}
      </div>
    </div>
  );
};

// ============================================================================
// REQUEST CARD (Standard shadow)
// ============================================================================
const RequestCard = ({ request, onView, isLarge = false, delay = 0 }) => {
  const typeLabel = request.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension';
  const typeIcon = request.type === 'RESCHEDULE' ? '📅' : '⏰';

  return (
    <div 
      className={`
        bg-white border border-slate-200 rounded-2xl card-hover shadow-sm
        transition-all duration-400 animate-fadeInUp
        ${isLarge ? 'p-6' : 'p-5'}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}
            >
              <span>{typeIcon}</span> {typeLabel}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(request.requestedAt).toLocaleDateString()}
            </span>
            <span 
              className="px-3 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: NAVBAR_COLORS.lighter, color: NAVBAR_COLORS.dark }}
            >
              {request.status || 'PENDING'}
            </span>
          </div>
          <p className="mb-2 font-bold text-slate-800">
            {request.auditType} - {request.department}
          </p>
          <p className="mb-3 text-sm text-slate-500">
            <FiUserCheck className="inline w-3.5 h-3.5 mr-1.5" style={{ color: NAVBAR_COLORS.secondary }} />
            {request.auditorName} → {request.auditeeName}
          </p>
          <div className="p-3 text-xs rounded-lg text-slate-500 bg-slate-50">
            {request.type === 'RESCHEDULE' ? (
              <span>
                Current: <span className="font-semibold">{request.currentDate}</span> → Requested: <span className="font-semibold" style={{ color: NAVBAR_COLORS.primary }}>{request.requestedNewDate}</span>
              </span>
            ) : (
              <span>
                Current end: <span className="font-semibold">{request.currentDate}</span> → Requested end: <span className="font-semibold" style={{ color: NAVBAR_COLORS.primary }}>{request.requestedNewToDate}</span>
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => onView(request)} 
          className="p-2.5 transition-all border rounded-xl ml-4 shadow-sm"
          style={{ 
            color: NAVBAR_COLORS.primary,
            borderColor: NAVBAR_COLORS.lighter,
            backgroundColor: NAVBAR_COLORS.bg
          }}
          title="View Request Details"
        >
          <FiEye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// REQUEST DETAILS MODAL (Standard shadow)
// ============================================================================
const RequestDetailsModal = ({ request, isOpen, onClose, onApprove, onReject, departmentTeamMembers, loadingTeamMembers }) => {
  if (!isOpen || !request) return null;
  
  const typeLabel = request.type === 'RESCHEDULE' ? 'Reschedule Request' : 'Extension Request';
  const typeIcon = request.type === 'RESCHEDULE' ? '📅' : '⏰';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl animate-scaleIn" 
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-6 bg-white border-b border-slate-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: NAVBAR_COLORS.bg }}
            >
              <span className="text-2xl">{typeIcon}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {typeLabel}
              </h3>
              <p className="text-sm text-slate-500">
                Review request details and take action
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 transition-colors rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50">
            <div>
              <p className="mb-1 text-xs text-slate-500">Audit Type</p>
              <p className="font-semibold text-slate-800">{request.auditType}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Department</p>
              <p className="font-semibold text-slate-800">{request.department}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Current Auditor</p>
              <p className="font-semibold text-slate-800">{request.auditorName}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Auditee</p>
              <p className="font-semibold text-slate-800">{request.auditeeName}</p>
            </div>
          </div>

          <div 
            className="p-5 border rounded-2xl"
            style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}
          >
            <p className="mb-3 text-sm font-bold" style={{ color: NAVBAR_COLORS.dark }}>
              📋 Requested Changes
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs text-slate-500">Current Schedule</p>
                <p className="text-sm font-semibold text-slate-700">
                  {request.currentDate}
                  {request.currentStartTime && ` • ${request.currentStartTime}`}
                </p>
              </div>
              <div className="relative">
                <div className="pl-5">
                  <p className="mb-1 text-xs font-semibold" style={{ color: NAVBAR_COLORS.primary }}>
                    Requested
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {request.type === 'RESCHEDULE' 
                      ? `${request.requestedNewDate} • ${request.requestedNewStartTime}` 
                      : `Until ${request.requestedNewToDate}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {request.reason && (
            <div 
              className="p-5 border rounded-2xl"
              style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}
            >
              <p className="mb-2 text-xs font-semibold" style={{ color: NAVBAR_COLORS.dark }}>
                💬 Reason for Request
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {request.reason}
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 p-6 bg-white border-t border-slate-100 rounded-b-3xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 transition-all border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-sm shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => onReject(request)} 
            className="flex items-center gap-2 px-5 py-2.5 text-white transition-all bg-rose-600 rounded-xl hover:bg-rose-700 font-medium text-sm shadow-md"
          >
            <FiX className="w-4 h-4" />
            Reject
          </button>
          <button 
            onClick={() => onApprove(request)} 
            className="flex items-center gap-2 px-5 py-2.5 text-white transition-all rounded-xl font-medium text-sm shadow-md"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <FiCheck className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function AuditManagerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-audit-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-audit-sidebar', handleToggle);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [activeView, setActiveView] = useState('both');
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] = useState('');
  const [availableAuditors, setAvailableAuditors] = useState([]);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState([]); 
  const [form3Status, setForm3Status] = useState({ status: 'NOT_STARTED' });
  const [form4Status, setForm4Status] = useState({ status: 'NOT_STARTED' });
  const [hasApprovedForm5, setHasApprovedForm5] = useState(false);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    const savedYear = localStorage.getItem('auditManagerSelectedYear');
    if (savedYear) return parseInt(savedYear);
    const urlYear = new URLSearchParams(window.location.search).get('year');
    if (urlYear) return parseInt(urlYear);
    return new Date().getFullYear();
  });

  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  const [stats, setStats] = useState({
    totalAudits: 0, 
    completedAudits: 0, 
    pendingSchedules: 0, 
    openNCRs: 0, 
    pendingRequests: 0, 
    pendingCaVerification: 0
  });
  
  const [allNcrs, setAllNcrs] = useState([]);
  
  const [departmentTeamMembers, setDepartmentTeamMembers] = useState({ auditors: [], auditees: [] });
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  const fetchDepartmentTeamMembers = async (departmentName) => {
    if (!departmentName) return;
    const departmentDisplayToEnum = {
      "HR": "HR", "R&D": "ENGG", "Purchase": "PURCHASE", "RMS": "STORES_DESPATCH",
      "SQA": "QA", "PPC": "PPC", "Production": "PRODUCTION", "QA/QC": "QA",
      "FGS": "STORES_DESPATCH", "Marketing": "MARKETING", "IMS (BE)": "MR",
      "Maintenance": "PLANT_MAINTENANCE", "Management": "UNIT_HEAD",
      "Plant Maintenance": "PLANT_MAINTENANCE", "Tool Maintenance": "TOOL_MAINTENANCE",
      "Stores & Despatch": "STORES_DESPATCH"
    };
    const enumValue = departmentDisplayToEnum[departmentName] || 
      departmentName.toUpperCase().replace(/[&\s\/]+/g, '_');
    
    setLoadingTeamMembers(true);
    try {
      const regularAuditorsRes = await axios.get(
        `${API_BASE}/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`, 
        { withCredentials: true }
      );
      const regularAuditors = regularAuditorsRes.data || [];
      
      let leadAuditorInfo = null;
      try {
        const leadAuditorsRes = await axios.get(
          `${API_BASE}/audit-schedule/lead-auditors/by-department/${encodeURIComponent(enumValue)}`, 
          { withCredentials: true }
        );
        leadAuditorInfo = (leadAuditorsRes.data || [])[0] || null;
      } catch (err) {
        console.warn('Could not fetch lead auditor:', err);
      }
      
      const scheduleResponse = await axios.get(
        `${API_BASE}/audit-schedule/year/${selectedYear}/department/${encodeURIComponent(enumValue)}`, 
        { withCredentials: true }
      );
      const deptSchedules = scheduleResponse.data || [];
      const deptSchedule = deptSchedules.find(s => s.approvalStatus === 'APPROVED') || 
        deptSchedules.find(s => s.approvalStatus === 'DRAFT');
      
      let teamAuditorIds = [];
      let teamAuditorNames = [];
      
      if (deptSchedule) {
        teamAuditorIds = deptSchedule.teamAuditorIds || [];
        if (typeof teamAuditorIds === 'string') {
          try { teamAuditorIds = JSON.parse(teamAuditorIds); } catch(e) { teamAuditorIds = []; }
        }
        teamAuditorNames = deptSchedule.teamAuditorNames || [];
        if (typeof teamAuditorNames === 'string') {
          try { teamAuditorNames = JSON.parse(teamAuditorNames); } catch(e) { teamAuditorNames = []; }
        }
      }
      
      setDepartmentTeamMembers({
        auditors: regularAuditors,
        auditees: [],
        leadAuditorId: leadAuditorInfo?.id || null,
        leadAuditorName: leadAuditorInfo ? `${leadAuditorInfo.firstName} ${leadAuditorInfo.lastName}` : null,
        teamAuditorIds,
        teamAuditorNames,
        auditeeIds: [],
        auditeeNames: []
      });
    } catch (error) {
      console.error('Error fetching department team members:', error);
      try {
        const allUsersResponse = await axios.get(`${API_BASE}/users`, { withCredentials: true });
        const allUsers = allUsersResponse.data || [];
        const regularAuditorsOnly = allUsers.filter(u => {
          const role = u.role?.toUpperCase() || '';
          return role === 'AUDITOR' || (role.includes('AUDITOR') && !role.includes('LEAD'));
        });
        setDepartmentTeamMembers({
          auditors: regularAuditorsOnly, auditees: [],
          leadAuditorId: null, leadAuditorName: null,
          teamAuditorIds: [], teamAuditorNames: [],
          auditeeIds: [], auditeeNames: []
        });
      } catch (fallbackError) {
        setDepartmentTeamMembers({
          auditors: [], auditees: [],
          leadAuditorId: null, leadAuditorName: null,
          teamAuditorIds: [], teamAuditorNames: [],
          auditeeIds: [], auditeeNames: []
        });
      }
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchAuditStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/audit-schedule/year/${selectedYear}`, 
        { withCredentials: true }
      );
      const allSchedules = response.data || [];
      setSchedules(allSchedules);
      const totalAudits = allSchedules.length;
      const completedAudits = allSchedules.filter(s => 
        s.status === 'COMPLETED' || s.status === 'CLOSED'
      ).length;
      const pendingSchedules = allSchedules.filter(s => 
        s.approvalStatus === 'PENDING_APPROVAL' || 
        (s.approvalStatus === 'APPROVED' && s.status === 'SCHEDULED')
      ).length;
      setStats(prev => ({ 
        ...prev, 
        totalAudits, 
        completedAudits, 
        pendingSchedules 
      }));
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  const convertToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(minutes);
  };

  const fetchSchedulesForDate = async (date) => {
    try {
      const response = await axios.get(
        `${API_BASE}/audit-schedule/by-date/${date}`, 
        { withCredentials: true }
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching schedules for date:', error);
      return [];
    }
  };

  const checkConflictsForAuditor = async (auditorId, isReassign = false) => {
    if (!selectedRequest || !auditorId) return;
    const auditDate = selectedRequest.currentDate;
    const startTime = selectedRequest.currentStartTime;
    const endTime = selectedRequest.currentEndTime;
    
    if (selectedRequest.type === 'EXTENSION') {
      const fromDate = selectedRequest.currentFromDate || selectedRequest.currentDate;
      const toDate = selectedRequest.requestedNewToDate;
      setCheckingAvailability(true);
      try {
        const conflicts = [];
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const dateList = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          dateList.push(dt.toISOString().split('T')[0]);
        }
        for (const date of dateList) {
          const daySchedules = await fetchSchedulesForDate(date);
          const conflict = daySchedules.find(schedule => {
            if (schedule.auditorId !== parseInt(auditorId)) return false;
            if (schedule.id === selectedRequest.scheduleId) return false;
            const s1Start = convertToMinutes(startTime);
            const s1End = convertToMinutes(endTime);
            const s2Start = convertToMinutes(schedule.startTime);
            const s2End = convertToMinutes(schedule.endTime);
            return (s1Start < s2End && s1End > s2Start);
          });
          if (conflict) conflicts.push({ date, conflict });
        }
        if (conflicts.length > 0) {
          setConflictWarning({
            type: isReassign ? 'reassign' : 'coauditor',
            auditorId,
            auditorName: departmentTeamMembers.auditors.find(a => a.id === auditorId)?.firstName,
            conflicts
          });
        } else {
          setConflictWarning(null);
        }
      } catch (error) {
        console.error('Error checking conflicts:', error);
      } finally {
        setCheckingAvailability(false);
      }
    } else {
      setCheckingAvailability(true);
      try {
        const daySchedules = await fetchSchedulesForDate(auditDate);
        const conflict = daySchedules.find(schedule => {
          if (schedule.auditorId !== parseInt(auditorId)) return false;
          if (schedule.id === selectedRequest.scheduleId) return false;
          const s1Start = convertToMinutes(startTime);
          const s1End = convertToMinutes(endTime);
          const s2Start = convertToMinutes(schedule.startTime);
          const s2End = convertToMinutes(schedule.endTime);
          return (s1Start < s2End && s1End > s2Start);
        });
        if (conflict) {
          setConflictWarning({
            type: isReassign ? 'reassign' : 'coauditor',
            auditorId,
            auditorName: departmentTeamMembers.auditors.find(a => a.id === auditorId)?.firstName,
            conflicts: [{ date: auditDate, conflict }]
          });
        } else {
          setConflictWarning(null);
        }
      } catch (error) {
        console.error('Error checking conflicts:', error);
      } finally {
        setCheckingAvailability(false);
      }
    }
  };

  const fetchAvailableAuditors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/auditors`, { withCredentials: true });
      setAvailableAuditors(response.data || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/pending-requests`, { withCredentials: true });
      const requests = response.data || [];
      setPendingRequests(requests);
      setStats(prev => ({ ...prev, pendingRequests: requests.length }));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchNcrStats = async () => {
    try {
      const allResponse = await axios.get(`${API_BASE}/ncr/all`, { withCredentials: true });
      const allNcrsData = allResponse.data || [];
      setAllNcrs(allNcrsData);
      
      const pendingVerification = allNcrsData.filter(
        (ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS'
      );
      setStats(prev => ({
        ...prev,
        openNCRs: allNcrsData.filter(ncr => 
          ncr.status !== 'CLOSED' && ncr.status !== 'NCR2_COMPLETED'
        ).length,
        pendingCaVerification: pendingVerification.length
      }));
    } catch (error) {
      console.error('Error fetching NCR stats:', error);
    }
  };

  const fetchSchedulesWithStatus = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/audit-schedule/auditor/${user?.id}/schedules-with-status`, 
        { withCredentials: true }
      );
      setSchedules(response.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchForm3Status = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, { withCredentials: true });
      const plan = response.data;
      if (plan && plan.planYear && plan.planYear !== selectedYear) {
        setForm3Status({ status: 'NOT_STARTED', year: selectedYear });
        return;
      }
      setForm3Status({ status: plan?.approvalStatus || 'NOT_STARTED', year: selectedYear });
    } catch (error) {
      setForm3Status({ status: 'NOT_STARTED', year: selectedYear });
    }
  };

  const fetchForm4Status = async () => {
    try {
      const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}`, { withCredentials: true });
      const plan = response.data;
      setForm4Status({ status: plan?.approvalStatus || 'NOT_STARTED', year: selectedYear });
    } catch (error) {
      setForm4Status({ status: 'NOT_STARTED', year: selectedYear });
    }
  };

  const checkForm5Approved = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/available-months/${selectedYear}`, { withCredentials: true });
      const months = response.data || [];
      setHasApprovedForm5(months.some(m => m.approvalStatus === 'APPROVED'));
    } catch (error) {
      setHasApprovedForm5(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchForm3Status(),
      fetchForm4Status(),
      checkForm5Approved(),
      fetchPendingRequests(),
      fetchAvailableAuditors(),
      fetchNcrStats(),
      fetchSchedulesWithStatus(),
      fetchAuditStats()
    ]);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsersList([]);
    }
  };

  const getAvailableYears = () => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.add(i);
    if (form3Status.year) years.add(form3Status.year);
    if (form4Status.year) years.add(form4Status.year);
    return Array.from(years).sort((a, b) => b - a);
  };

  const openAuditForum = (audit) => {
    const memberEmails = [];
    if (user?.email) memberEmails.push(user.email);
    if (audit.auditorEmail) memberEmails.push(audit.auditorEmail);
    else if (audit.auditorName?.includes('@')) memberEmails.push(audit.auditorName);
    else if (audit.auditorId) {
      const auditor = allUsersList.find(u => u.id === audit.auditorId);
      if (auditor?.email) memberEmails.push(auditor.email);
    }
    if (audit.auditeeEmail) memberEmails.push(audit.auditeeEmail);
    else if (audit.auditeeName?.includes('@')) memberEmails.push(audit.auditeeName);
    else if (audit.auditeeId) {
      const auditee = allUsersList.find(u => u.id === audit.auditeeId);
      if (auditee?.email) memberEmails.push(auditee.email);
    }
    if (audit.hodEmail) memberEmails.push(audit.hodEmail);
    if (audit.memberEmails) memberEmails.push(...audit.memberEmails);
    
    setSelectedAuditForForum({
      id: audit.id,
      auditNumber: audit.auditNumber,
      auditType: audit.auditType,
      department: audit.department,
      auditorId: audit.auditorId || user?.id,
      auditorName: audit.auditorName || user?.name,
      auditeeId: audit.auditeeId,
      auditeeName: audit.auditeeName,
      hodEmail: audit.hodEmail,
      hodName: audit.hodName,
      status: audit.status,
      memberEmails: [...new Set(memberEmails)]
    });
    setShowForumModal(true);
  };

  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    localStorage.setItem('auditManagerSelectedYear', selectedYear);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('year') !== String(selectedYear)) {
      urlParams.set('year', selectedYear);
      navigate(`?${urlParams.toString()}`, { replace: true });
    }
  }, [selectedYear, navigate]);

  useEffect(() => {
    setAvailableYears(getAvailableYears());
  }, [form3Status, form4Status]);

  useEffect(() => {
    if (!loading) {
      fetchForm3Status();
      fetchForm4Status();
      checkForm5Approved();
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchAllData();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (viewParam === 'ncr') setActiveView('ncr');
    else if (viewParam === 'schedules') setActiveView('schedules');
    else if (viewParam === 'requests') setActiveView('requests');
    else setActiveView('both');
  }, [viewParam]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    addToast('Dashboard refreshed', 'success');
  };

  const handleViewRequest = (request) => {
    setSelectedRequestForModal(request);
    fetchDepartmentTeamMembers(request.department);
    setShowRequestModal(true);
  };

  const handleApproveReschedule = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const requestBody = {
        comments: approvalComment,
        reassignToAuditorId: showReassignOptions ? (selectedReassignAuditorId || null) : null,
        additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
        keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions
      };
      await axios.post(
        `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/approve-reschedule?userId=${user?.id}`,
        requestBody,
        { withCredentials: true }
      );
      let successMessage = 'Reschedule request approved';
      if (showReassignOptions && selectedReassignAuditorId) successMessage += ' and auditor reassigned';
      if (showAddAnotherAuditor && additionalAuditorIds.length > 0) {
        successMessage += ` with ${additionalAuditorIds.length} additional auditor(s)`;
      }
      addToast(successMessage, 'success');
      resetAndClose();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to approve request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExtension = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const requestBody = {
        comments: approvalComment,
        reassignToAuditorId: showReassignOptions ? (selectedReassignAuditorId || null) : null,
        additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
        keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions
      };
      await axios.post(
        `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/approve-extension?userId=${user?.id}`,
        requestBody,
        { withCredentials: true }
      );
      let successMessage = 'Extension request approved';
      if (showReassignOptions && selectedReassignAuditorId) successMessage += ' and auditor reassigned';
      if (showAddAnotherAuditor && additionalAuditorIds.length > 0) {
        successMessage += ` with ${additionalAuditorIds.length} additional auditor(s)`;
      }
      addToast(successMessage, 'success');
      resetAndClose();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to approve request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = async () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setApprovalComment('');
    setRejectionReason('');
    setSelectedReassignAuditorId('');
    setAdditionalAuditorIds([]);
    setShowReassignOptions(false);
    setShowAddAnotherAuditor(false);
    setSelectedRequest(null);
    await fetchPendingRequests();
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = selectedRequest.type === 'RESCHEDULE'
        ? `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/reject-reschedule`
        : `${API_BASE}/audit-schedule/request/${selectedRequest.requestId}/reject-extension`;
      await axios.post(
        `${endpoint}?userId=${user?.id}`,
        { reason: rejectionReason },
        { withCredentials: true }
      );
      addToast('Request rejected', 'error');
      resetAndClose();
    } catch (error) {
      addToast('Failed to reject request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  const isForm3Approved = () => form3Status.status === 'APPROVED';
  const isForm4Approved = () => form4Status.status === 'APPROVED';
  const isScheduleDashboardAccessible = () => isForm4Approved();
  const isScheduleCalendarAccessible = () => hasApprovedForm5;

  const getCardStatus = (cardName) => {
    if (cardName === 'Annual Audit Plan') {
      return form3Status.status === 'APPROVED' ? 'APPROVED' :
        form3Status.status === 'PENDING_APPROVAL' ? 'PENDING' :
        form3Status.status === 'NOT_STARTED' ? 'NOT_STARTED' : 'LOCKED';
    }
    if (cardName === 'Department Audit Plan') {
      if (!isForm3Approved()) return 'LOCKED';
      return form4Status.status === 'APPROVED' ? 'APPROVED' :
        form4Status.status === 'PENDING_APPROVAL' ? 'PENDING' : 'READY';
    }
    if (cardName === 'Schedule Dashboard') {
      if (!isForm4Approved()) return 'LOCKED';
      return hasApprovedForm5 ? 'APPROVED' : 'READY';
    }
    if (cardName === 'Schedule Calendar') {
      if (!hasApprovedForm5) return 'LOCKED';
      return 'READY';
    }
    return 'NOT_STARTED';
  };

  // ==========================================================================
  // REAL CHART DATA
  // ==========================================================================
  const monthlyTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    
    schedules.forEach(schedule => {
      const dateStr = schedule.auditDate || schedule.scheduledDate || schedule.date;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() === selectedYear) {
          const month = date.getMonth();
          monthCounts[month]++;
        }
      }
    });
    
    return monthNames.map((name, idx) => ({
      label: name,
      value: monthCounts[idx]
    }));
  }, [schedules, selectedYear]);

  const ncrDistributionData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    
    const statusGroups = {
      'Open': 0,
      'In Progress': 0,
      'Pending Verification': 0,
      'Closed': 0,
      'Completed': 0
    };
    
    allNcrs.forEach(ncr => {
      const status = (ncr.status || '').toUpperCase();
      if (status === 'CLOSED') {
        statusGroups['Closed']++;
      } else if (status === 'NCR2_COMPLETED' || status === 'COMPLETED') {
        statusGroups['Completed']++;
      } else if (status === 'IN_PROGRESS' || status === 'NCR2_IN_PROGRESS') {
        statusGroups['Pending Verification']++;
      } else if (status === 'OPEN' || status === 'NEW' || status === 'DRAFT') {
        statusGroups['Open']++;
      } else {
        statusGroups['In Progress']++;
      }
    });
    
    const data = [
      { name: 'Open', value: statusGroups['Open'], color: NAVBAR_COLORS.chartColors[0] },
      { name: 'In Progress', value: statusGroups['In Progress'], color: NAVBAR_COLORS.chartColors[1] },
      { name: 'Pending Verification', value: statusGroups['Pending Verification'], color: NAVBAR_COLORS.chartColors[2] },
      { name: 'Closed', value: statusGroups['Closed'], color: NAVBAR_COLORS.chartColors[3] },
      { name: 'Completed', value: statusGroups['Completed'], color: NAVBAR_COLORS.chartColors[4] }
    ];
    
    return data.filter(item => item.value > 0);
  }, [allNcrs]);

  const ncrByDepartmentData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    
    const deptCounts = {};
    allNcrs.forEach(ncr => {
      const dept = ncr.department || ncr.auditDepartment || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    
    return Object.entries(deptCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allNcrs]);

  const auditStatusChartData = useMemo(() => [
    { label: 'Completed', value: stats.completedAudits },
    { label: 'Scheduled', value: stats.pendingSchedules },
    { label: 'Open NCRs', value: stats.openNCRs },
    { label: 'Pending CA', value: stats.pendingCaVerification }
  ], [stats]);

  const recentActivities = useMemo(() => {
    const activities = [];
    pendingRequests.slice(0, 3).forEach(req => {
      activities.push({
        title: `${req.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request`,
        description: `${req.auditType} - ${req.department}`,
        time: new Date(req.requestedAt).toLocaleDateString(),
        icon: <FiMessageSquare className="w-4 h-4" />,
      });
    });
    if (stats.openNCRs > 0) {
      activities.push({
        title: 'Open NCRs',
        description: `${stats.openNCRs} non-conformance reports require attention`,
        time: 'Active',
        icon: <FiAlertCircle className="w-4 h-4" />,
      });
    }
    if (form3Status.status === 'APPROVED') {
      activities.push({
        title: 'Annual Audit Plan Approved',
        description: `Form 3 for ${selectedYear} has been approved`,
        time: 'Recent',
        icon: <FiCheckCircle className="w-4 h-4" />,
      });
    }
    if (form4Status.status === 'APPROVED') {
      activities.push({
        title: 'Department Plan Approved',
        description: `Form 4 for ${selectedYear} has been approved`,
        time: 'Recent',
        icon: <FiFileText className="w-4 h-4" />,
      });
    }
    return activities.slice(0, 5);
  }, [pendingRequests, stats, form3Status, form4Status, selectedYear]);

  // ==========================================================================
  // LOADING
  // ==========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
        <div className="text-center">
          <div 
            className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin"
            style={{ 
              borderColor: NAVBAR_COLORS.lighter,
              borderTopColor: NAVBAR_COLORS.primary
            }}
          ></div>
          <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={isSidebarOpen} 
        pendingCount={pendingRequests.length} 
      />
      
      <main className={`transition-all duration-500 ease-out ${isSidebarOpen ? 'ml-64' : 'ml-0'} pt-6 `}>
        <div className="px-6 pb-6">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-slate-800">
                Dashboard Overview
              </h1>
              <p className="text-sm text-slate-500">
                Welcome back, <span className="font-semibold text-slate-700">{user?.name || user?.username}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <YearFilter 
                selectedYear={selectedYear} 
                onYearChange={setSelectedYear} 
                availableYears={availableYears} 
              />
              <button 
                onClick={() => {
                  const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
                  const topManagement = allUsersList.find(u => u.role === 'TOP_MANAGEMENT');
                  openAuditForum({
                    id: 'demo',
                    auditNumber: 'AUD-DEMO',
                    auditType: 'Demo Audit',
                    department: 'Quality',
                    auditorId: auditManager?.id,
                    auditorName: auditManager?.name,
                    auditeeId: topManagement?.id,
                    auditeeName: topManagement?.name,
                    hodEmail: topManagement?.email,
                    hodName: topManagement?.name,
                    memberEmails: [auditManager?.email, topManagement?.email].filter(Boolean)
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all hover:shadow-lg"
                style={{ backgroundColor: NAVBAR_COLORS.primary }}
              >
                <FiMessageCircle className="w-4 h-4" />
                Test Forum
              </button>
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ==================================================================
              DASHBOARD OVERVIEW
          ================================================================== */}
          {activeView === 'both' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Audits" value={stats.totalAudits} icon={<FiCalendar className="w-6 h-6" />} delay={0} />
                <KpiCard title="Completed" value={stats.completedAudits} icon={<FiCheckCircle className="w-6 h-6" />} delay={100} />
                <KpiCard title="Open NCRs" value={stats.openNCRs} icon={<FiAlertCircle className="w-6 h-6" />} delay={200} />
                <KpiCard title="Pending Requests" value={stats.pendingRequests} icon={<FiMessageSquare className="w-6 h-6" />} delay={300} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <BarChart 
                    data={monthlyTrendData}
                    title="Monthly Audit Trend"
                    subtitle={`Audits scheduled per month in ${selectedYear}`}
                    delay={400}
                  />
                </div>
                <NCRPieChart 
                  data={ncrDistributionData}
                  title="NCR Distribution"
                  subtitle="Status breakdown from API"
                  total={allNcrs.length}
                  delay={500}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <NCRDepartmentAnalysis 
                    data={ncrByDepartmentData}
                    delay={600}
                  />
                </div>
                <ActivityFeed activities={recentActivities} delay={700} />
              </div>

              <div 
                className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp card-hover"
                style={{ animationDelay: '800ms' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <FiDownload className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
                  <h3 className="text-sm font-bold text-slate-700">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button onClick={() => navigate('/ncr-dashboard')} className="flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-all rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md group">
                    <span className="text-slate-700">View NCR Reports</span>
                    <FiArrowRight className="w-4 h-4 transition-transform text-slate-400 group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => setActiveView('requests')} className="flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-all rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md group">
                    <span className="text-slate-700">Review Requests</span>
                    <FiArrowRight className="w-4 h-4 transition-transform text-slate-400 group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => navigate(`/form5-dashboard?year=${selectedYear}`)} className="flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-all rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md group">
                    <span className="text-slate-700">Schedule Dashboard</span>
                    <FiArrowRight className="w-4 h-4 transition-transform text-slate-400 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              SCHEDULES WORKFLOW
          ================================================================== */}
          {activeView === 'schedules' && (
            <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
              <div className="px-6 py-4 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                <h2 className="text-lg font-bold text-slate-800">Schedules Workflow</h2>
                <p className="mt-1 text-xs text-slate-500">Follow the clockwise workflow to complete setup</p>
              </div>
              <div className="p-6">
                <div className="mx-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gridTemplateRows: 'auto 56px auto', maxWidth: 680, gap: 0 }}>
                  <ClockwiseWorkflowCard stepNumber={1} title="Annual Audit " description="Form 3 - Define yearly audit elements" status={getCardStatus('Annual Audit Plan')} onClick={() => navigate(`/form3?year=${selectedYear}`)} delay={0} />
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-white border rounded-full shadow-md border-slate-100">
                      <FiArrowRightCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />
                    </div>
                  </div>
                  <ClockwiseWorkflowCard stepNumber={2} title="Department Audit " description="Form 4 - Assign audits to departments" status={getCardStatus('Department Audit Plan')} onClick={() => isForm3Approved() && navigate(`/form4?year=${selectedYear}`)} disabled={!isForm3Approved()} delay={100} />
                  <div />
                  <div />
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-white border rounded-full shadow-md border-slate-100">
                      <FiArrowDownCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />
                    </div>
                  </div>
                  <ClockwiseWorkflowCard stepNumber={4} title="Schedule Day" description="Daily schedules with time slots" status={getCardStatus('Schedule Calendar')} onClick={() => isScheduleCalendarAccessible() && navigate(`/schedule-calendar?year=${selectedYear}`)} disabled={!isScheduleCalendarAccessible()} delay={200} />
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-white border rounded-full shadow-md border-slate-100">
                      <FiArrowLeftCircle className="w-5 h-5" style={{ color: NAVBAR_COLORS.secondary }} />
                    </div>
                  </div>
                  <ClockwiseWorkflowCard stepNumber={3} title="Schedule Week" description="Month-wise audit schedule & week plans" status={getCardStatus('Schedule Dashboard')} onClick={() => isScheduleDashboardAccessible() && navigate(`/form5-dashboard?year=${selectedYear}`)} disabled={!isScheduleDashboardAccessible()} delay={300} />
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              NCR MANAGEMENT
          ================================================================== */}
          {activeView === 'ncr' && (
            <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
              <div className="px-6 py-4 border-b border-slate-100" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                <h2 className="text-lg font-bold text-slate-800">NCR Management</h2>
                <p className="mt-1 text-xs text-slate-500">Manage Non-Conformance Reports and corrective actions</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-5 mb-6 md:grid-cols-3">
                  <NcrCard title="CA Verification" description="Verify corrective actions from auditees" icon={<FiCheckCircle className="w-6 h-6" />} onClick={() => navigate('/ncr-pending')} badgeText={`${stats.pendingCaVerification} Pending`} isLarge delay={0} />
                  <NcrCard title="NCR Summary" description="View all Non-Conformance Reports" icon={<FiAlertCircle className="w-6 h-6" />} onClick={() => navigate('/ncr-dashboard')} badgeText={`${stats.openNCRs} Open`} isLarge delay={100} />
                  <NcrCard title="NC Summary" description="All NCRs at a glance" icon={<FiBarChart2 className="w-6 h-6" />} onClick={() => navigate('/form9')} badgeText={`${allNcrs.length} Total`} isLarge delay={200} />
                </div>
                
                <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
                  <NCRPieChart 
                    data={ncrDistributionData}
                    title="NCR Status Distribution"
                    subtitle="Real-time status breakdown"
                    total={allNcrs.length}
                    delay={300}
                  />
                  <NCRDepartmentAnalysis 
                    data={ncrByDepartmentData}
                    delay={400}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              PENDING REQUESTS
          ================================================================== */}
          {activeView === 'requests' && (
            <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl animate-fadeInUp">
              <div className="px-6 py-4 border-b" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                <h2 className="text-lg font-bold text-slate-800">Pending Auditor Requests</h2>
                <p className="mt-1 text-xs text-slate-500">Review and manage all reschedule and extension requests</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
                  <div className="p-4 border shadow-sm rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Requests</p>
                        <p className="text-2xl font-bold text-slate-900">{pendingRequests.length}</p>
                      </div>
                      <div className="p-3 shadow-sm rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.lighter }}>
                        <FiMessageSquare className="w-6 h-6" style={{ color: NAVBAR_COLORS.primary }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border shadow-sm border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Reschedule Requests</p>
                        <p className="text-2xl font-bold text-slate-900">{pendingRequests.filter(r => r.type === 'RESCHEDULE').length}</p>
                      </div>
                      <div className="p-3 shadow-sm rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                        <FiCalendar className="w-6 h-6" style={{ color: NAVBAR_COLORS.primary }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border shadow-sm border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Extension Requests</p>
                        <p className="text-2xl font-bold text-slate-900">{pendingRequests.filter(r => r.type === 'EXTENSION').length}</p>
                      </div>
                      <div className="p-3 shadow-sm rounded-xl" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                        <FiClock className="w-6 h-6" style={{ color: NAVBAR_COLORS.primary }} />
                      </div>
                    </div>
                  </div>
                </div>

                {pendingRequests.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FiMessageSquare className="w-5 h-5" style={{ color: NAVBAR_COLORS.primary }} />
                        <h3 className="text-base font-semibold text-slate-700">All Pending Requests</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
                          {pendingRequests.length} Total
                        </span>
                      </div>
                      <button onClick={handleRefresh} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                        <FiRefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                    <div className="space-y-4">
                      {pendingRequests.map((request, idx) => (
                        <RequestCard key={idx} request={request} onView={handleViewRequest} isLarge delay={idx * 100} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full shadow-sm" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                      <FiMessageSquare className="w-10 h-10" style={{ color: NAVBAR_COLORS.secondary }} />
                    </div>
                    <p className="text-lg font-medium text-slate-500">No pending requests</p>
                    <p className="mt-1 text-sm text-slate-400">All auditor requests have been processed</p>
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 mx-auto mt-4 text-sm transition-colors rounded-lg shadow-sm bg-slate-100 hover:bg-slate-200">
                      <FiRefreshCw className="w-3 h-3" /> Check again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
            APPROVE MODAL
        ==================================================================== */}
        {showApproveModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg p-6 bg-white shadow-2xl rounded-3xl animate-scaleIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Approve {selectedRequest.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request
                </h3>
                <button onClick={() => { setShowApproveModal(false); setShowReassignOptions(false); setShowAddAnotherAuditor(false); setSelectedReassignAuditorId(''); setAdditionalAuditorIds([]); }} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Audit</p>
                  <p className="text-sm font-medium">{selectedRequest.auditType} - {selectedRequest.department}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                  <p className="flex items-center gap-1 text-xs" style={{ color: NAVBAR_COLORS.primary }}>
                    <FiUserCheck className="w-3 h-3" /> Current Auditor
                  </p>
                  <p className="text-sm font-medium text-slate-800">{selectedRequest.auditorName}</p>
                </div>
                {!loadingTeamMembers && departmentTeamMembers.leadAuditorName && (
                  <div className="p-3 mt-2 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                    <p className="text-xs font-medium" style={{ color: NAVBAR_COLORS.dark }}>
                      Assigned Audit Team for {selectedRequest?.department}:
                    </p>
                    <p className="mt-1 text-xs" style={{ color: NAVBAR_COLORS.primary }}>
                      ⭐ Lead: {departmentTeamMembers.leadAuditorName}
                    </p>
                    {departmentTeamMembers.teamAuditorNames?.length > 0 && (
                      <p className="text-xs" style={{ color: NAVBAR_COLORS.primary }}>
                        👥 Team: {departmentTeamMembers.teamAuditorNames.join(', ')}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="pt-3 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showReassignOptions} onChange={(e) => { setShowReassignOptions(e.target.checked); if (!e.target.checked) setSelectedReassignAuditorId(''); }} className="w-4 h-4 rounded" style={{ accentColor: NAVBAR_COLORS.primary }} />
                    <span className="text-sm font-medium text-slate-700">🔄 Reassign to different auditor</span>
                  </label>
                  <p className="mt-1 ml-6 text-xs text-slate-500">Replace the current auditor with a new one</p>
                  
                  {showReassignOptions && (
                    <div className="mt-3 ml-6 space-y-3">
                      <div>
                        <label className="block mb-1 text-sm font-medium text-slate-700">
                          Select Primary Auditor <span className="text-red-500">*</span>
                        </label>
                        {loadingTeamMembers ? (
                          <div className="w-full p-2 text-center rounded-lg text-slate-400 bg-slate-50">
                            <div className="inline-block w-4 h-4 mr-2 border-2 rounded-full border-slate-300 animate-spin" style={{ borderTopColor: NAVBAR_COLORS.primary }}></div>
                            Loading team members...
                          </div>
                        ) : departmentTeamMembers.auditors.length === 0 ? (
                          <div className="w-full p-2 text-sm rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.dark }}>
                            No team members assigned for {selectedRequest?.department} department
                          </div>
                        ) : (
                          <select value={selectedReassignAuditorId} onChange={(e) => setSelectedReassignAuditorId(e.target.value)} className="w-full p-2 border rounded-lg border-slate-200 focus:ring-2" style={{ '--tw-ring-color': NAVBAR_COLORS.primary }}>
                            <option value="">-- Select an auditor --</option>
                            {departmentTeamMembers.auditors.filter(a => {
                              if (selectedRequest?.auditorId && Number(a.id) === Number(selectedRequest.auditorId)) return false;
                              if (selectedRequest?.auditorName) {
                                const currentAuditor = availableAuditors.find(aud => `${aud.firstName} ${aud.lastName}` === selectedRequest.auditorName);
                                if (currentAuditor && Number(a.id) === Number(currentAuditor.id)) return false;
                              }
                              return true;
                            }).map(auditor => {
                              const isTeamMember = departmentTeamMembers.teamAuditorIds?.includes(auditor.id);
                              return (
                                <option key={auditor.id} value={auditor.id}>
                                  {isTeamMember ? '👥 ' : '  '}{auditor.firstName} {auditor.lastName}{isTeamMember ? ' (Team Auditor)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        )}
                        
                        {checkingAvailability && (
                          <div className="flex items-center gap-2 p-2 text-sm rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
                            <div className="w-4 h-4 border-2 rounded-full animate-spin border-t-transparent" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                            Checking auditor availability...
                          </div>
                        )}
                        
                        {conflictWarning && conflictWarning.type === 'reassign' && (
                          <div className="p-2 text-sm text-red-700 rounded-lg bg-red-50">
                            <div className="flex items-start gap-2">
                              <FiAlertCircle className="w-4 h-4 mt-0.5" />
                              <div>
                                <p className="font-medium">⚠️ Time Conflict Detected!</p>
                                <p>Auditor {conflictWarning.auditorName} is already scheduled at this time:</p>
                                <ul className="mt-1 ml-4 list-disc">
                                  {conflictWarning.conflicts.map((c, idx) => (
                                    <li key={idx}>{c.date}: {c.conflict.startTime} - {c.conflict.endTime} ({c.conflict.department || c.conflict.auditType})</li>
                                  ))}
                                </ul>
                                <p className="mt-1 text-xs">Please select a different auditor.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showAddAnotherAuditor} onChange={(e) => { setShowAddAnotherAuditor(e.target.checked); if (!e.target.checked) setAdditionalAuditorIds([]); }} className="w-4 h-4 rounded" style={{ accentColor: NAVBAR_COLORS.secondary }} />
                    <span className="text-sm font-medium text-slate-700">➕ Add another auditor (Co-auditor)</span>
                  </label>
                  <p className="mt-1 ml-6 text-xs text-slate-500">Add additional auditor without removing the primary one</p>
                  
                  {showAddAnotherAuditor && (
                    <div className="mt-3 ml-6 space-y-3">
                      <div>
                        <label className="block mb-1 text-sm font-medium text-slate-700">Select Additional Auditor(s)</label>
                        {loadingTeamMembers ? (
                          <div className="w-full p-2 text-center rounded-lg text-slate-400 bg-slate-50">Loading...</div>
                        ) : (
                          <select value="" onChange={(e) => { const selectedId = parseInt(e.target.value); if (selectedId && !additionalAuditorIds.includes(selectedId)) setAdditionalAuditorIds([...additionalAuditorIds, selectedId]); e.target.value = ""; }} className="w-full p-2 border rounded-lg border-slate-200 focus:ring-2">
                            <option value="">-- Add a co-auditor --</option>
                            {departmentTeamMembers.auditors.filter(a => {
                              let currentAuditorId = null;
                              if (selectedRequest?.auditorId) currentAuditorId = Number(selectedRequest.auditorId);
                              else if (selectedRequest?.auditorName) {
                                const currentAuditor = availableAuditors.find(aud => `${aud.firstName} ${aud.lastName}` === selectedRequest.auditorName);
                                currentAuditorId = currentAuditor?.id;
                              }
                              if (currentAuditorId && Number(a.id) === currentAuditorId) return false;
                              if (showReassignOptions && Number(a.id) === Number(selectedReassignAuditorId)) return false;
                              if (additionalAuditorIds.includes(Number(a.id))) return false;
                              return true;
                            }).map(auditor => (
                              <option key={auditor.id} value={auditor.id}>{auditor.firstName} {auditor.lastName}</option>
                            ))}
                          </select>
                        )}
                        
                        {checkingAvailability && (
                          <div className="flex items-center gap-2 p-2 text-sm rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.primary }}>
                            <div className="w-4 h-4 border-2 rounded-full animate-spin border-t-transparent" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
                            Checking auditor availability...
                          </div>
                        )}
                        
                        {conflictWarning && conflictWarning.type === 'coauditor' && (
                          <div className="p-2 text-sm rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg, color: NAVBAR_COLORS.dark }}>
                            <div className="flex items-start gap-2">
                              <FiAlertCircle className="w-4 h-4 mt-0.5" />
                              <div>
                                <p className="font-medium">⚠️ Potential Time Conflict!</p>
                                <p>Auditor {conflictWarning.auditorName} is already scheduled at this time.</p>
                                <p className="mt-1 text-xs">You can still add them, but they will have overlapping schedules.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {additionalAuditorIds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600">Selected Co-auditors:</p>
                          {additionalAuditorIds.map(id => {
                            const auditor = departmentTeamMembers.auditors.find(a => a.id === id);
                            return auditor ? (
                              <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                <div>
                                  <p className="text-sm font-medium">{auditor.firstName} {auditor.lastName}</p>
                                  {departmentTeamMembers.teamAuditorIds?.includes(id) && (
                                    <p className="text-xs" style={{ color: NAVBAR_COLORS.secondary }}>Co-Auditor</p>
                                  )}
                                </div>
                                <button onClick={() => setAdditionalAuditorIds(additionalAuditorIds.filter(aid => aid !== id))} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="p-3 rounded-lg" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
                  <p className="text-xs font-medium" style={{ color: NAVBAR_COLORS.dark }}>Requested Changes</p>
                  {selectedRequest.type === 'RESCHEDULE' ? (
                    <div className="mt-1 text-sm">
                      <p><span className="text-slate-500">New Date:</span> <strong>{selectedRequest.requestedNewDate}</strong></p>
                      <p><span className="text-slate-500">New Time:</span> {selectedRequest.requestedNewStartTime} - {selectedRequest.requestedNewEndTime}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm"><span className="text-slate-500">New End Date:</span> <strong>{selectedRequest.requestedNewToDate}</strong></p>
                  )}
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">Comments (Optional)</label>
                  <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} rows={2} className="w-full p-2 border rounded-lg border-slate-200 focus:ring-2" placeholder="Add any comments about this approval..." />
                </div>
              </div>
              
              {(showReassignOptions || showAddAnotherAuditor) && (
                <div className="p-3 mt-4 rounded-lg bg-slate-50">
                  <p className="mb-2 text-xs font-medium text-slate-700">Approval Summary:</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {showReassignOptions && selectedReassignAuditorId && (
                      <li>• Current auditor <span className="font-medium" style={{ color: NAVBAR_COLORS.primary }}>({selectedRequest.auditorName})</span> will be <span className="font-medium" style={{ color: NAVBAR_COLORS.primary }}>REPLACED</span></li>
                    )}
                    {!showReassignOptions && showAddAnotherAuditor && (
                      <li>• Current auditor <span className="font-medium" style={{ color: NAVBAR_COLORS.secondary }}>({selectedRequest.auditorName})</span> will be <span className="font-medium" style={{ color: NAVBAR_COLORS.secondary }}>KEPT</span> as primary auditor</li>
                    )}
                    {additionalAuditorIds.length > 0 && (
                      <li>• {additionalAuditorIds.length} co-auditor(s) will be <span className="font-medium" style={{ color: NAVBAR_COLORS.secondary }}>ADDED</span></li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowApproveModal(false); setShowReassignOptions(false); setShowAddAnotherAuditor(false); setSelectedReassignAuditorId(''); setAdditionalAuditorIds([]); }} className="px-4 py-2 transition-colors border rounded-lg shadow-sm border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={selectedRequest.type === 'RESCHEDULE' ? handleApproveReschedule : handleApproveExtension} disabled={submitting || (showReassignOptions && !selectedReassignAuditorId) || (showReassignOptions && conflictWarning?.type === 'reassign')} className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: NAVBAR_COLORS.primary }}>
                  {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiCheck className="w-4 h-4" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            REJECT MODAL
        ==================================================================== */}
        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-3xl animate-scaleIn">
              <h3 className="mb-4 text-lg font-bold text-slate-800">
                Reject {selectedRequest.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request
              </h3>
              <p className="mb-3 text-sm text-slate-600">Please provide a reason for rejection:</p>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} className="w-full p-3 border rounded-lg border-slate-200 focus:ring-2 focus:ring-rose-500" placeholder="Enter rejection reason..." autoFocus />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 transition-colors border rounded-lg shadow-sm border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={handleRejectRequest} disabled={submitting} className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg shadow-md bg-rose-600 hover:bg-rose-700">
                  {submitting ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiX className="w-4 h-4" />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            FORUM MODAL
        ==================================================================== */}
        {showForumModal && selectedAuditForForum && (
          <AuditCheckSheetNCRForumModal
            auditId={selectedAuditForForum.id}
            auditNumber={selectedAuditForForum.auditNumber}
            auditTitle={selectedAuditForForum.auditType}
            auditStatus="IN_PROGRESS"
            auditType={selectedAuditForForum.auditType}
            department={selectedAuditForForum.department}
            auditorId={user?.id}
            auditorName={user?.name}
            auditeeId={selectedAuditForForum.auditeeId}
            auditeeName={selectedAuditForForum.auditeeName}
            hodEmail={selectedAuditForForum.hodEmail}
            hodName={selectedAuditForForum.hodName}
            memberEmails={selectedAuditForForum.memberEmails || []}
            isOpen={showForumModal}
            onClose={() => { setShowForumModal(false); setSelectedAuditForForum(null); }}
            currentUser={user}
            allUsers={allUsersList}
          />
        )}

        {/* ====================================================================
            REQUEST DETAILS MODAL
        ==================================================================== */}
        <RequestDetailsModal
          request={selectedRequestForModal}
          isOpen={showRequestModal}
          onClose={() => { setShowRequestModal(false); setSelectedRequestForModal(null); }}
          onApprove={(req) => { setShowRequestModal(false); setSelectedRequest(req); setShowApproveModal(true); }}
          onReject={(req) => { setShowRequestModal(false); setSelectedRequest(req); setShowRejectModal(true); }}
          departmentTeamMembers={departmentTeamMembers}
          loadingTeamMembers={loadingTeamMembers}
        />
      </main>
    </div>
  );
}