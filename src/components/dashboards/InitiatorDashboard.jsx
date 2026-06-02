import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, AlertTriangle, FileText, Zap } from 'lucide-react';
import axios from 'axios';

// --- Badges (Kept for consistency if needed elsewhere, though not used in the new empty state) ---
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch(status?.toUpperCase()) {
      case 'COMPLETED':
        return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'Completed', icon: '✅' };
      case 'IN_PROGRESS':
        return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', label: 'In Progress', icon: '🔄' };
      case 'UNDER_REVIEW':
        return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Under Review', icon: '📋' };
      case 'DRAFT':
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: 'Draft', icon: '📝' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: status || 'Draft', icon: '📄' };
    }
  };
  const config = getStatusConfig(status);
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border} flex items-center gap-1`}>
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const getPriorityConfig = (priority) => {
    switch(priority?.toUpperCase()) {
      case 'CRITICAL':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Critical', icon: '🔴' };
      case 'HIGH':
        return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'High', icon: '🟠' };
      case 'MEDIUM':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Medium', icon: '🟡' };
      case 'LOW':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Low', icon: '🟢' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Medium', icon: '🟡' };
    }
  };
  const config = getPriorityConfig(priority);
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border} flex items-center gap-1`}>
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
};

// Existing Report Card Component
const EightDCard = ({ report, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="relative p-6 overflow-hidden transition-all duration-500 ease-out bg-white border border-gray-100 shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl hover:border-blue-300 hover:-translate-y-2 group"
    >
      {/* Premium gradient overlay on hover */}
      <div className="absolute inset-0 transition-all duration-500 pointer-events-none bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/30 group-hover:via-indigo-50/20 group-hover:to-purple-50/30 rounded-3xl"></div>
     
      {/* Animated border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]">
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>

      {/* Header with icon, status, and priority */}
      <div className="relative z-10 flex items-start justify-between mb-6">
        <div className="flex items-center justify-center w-16 h-16 transition-all duration-500 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl group-hover:scale-110 group-hover:rotate-3">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <div className="flex flex-col gap-2">
          <StatusBadge status={report?.status} />
          <PriorityBadge priority={report?.priority} />
        </div>
      </div>

      {/* Category and Department */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-bold tracking-wider text-purple-600 uppercase rounded-full bg-purple-50">
            8D Report
          </span>
          <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {report?.department || 'Quality'}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="relative z-10 mb-3 text-2xl leading-tight text-gray-900 transition-colors group-hover:text-purple-900">
        {report?.title || '8D Quality Report'}
      </h3>

      {/* Description */}
      <p className="relative z-10 mb-6 text-sm leading-relaxed text-gray-600 line-clamp-3">
        {report?.problem || report?.description || 'Create and manage 8D quality reports for continuous improvement and root cause analysis.'}
      </p>

      {/* Meta Information */}
      <div className="relative z-10 flex flex-wrap gap-4 mb-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">ID:</span>
          <span>{report?.eventNo || report?.id || 'N/A'}</span>
        </div>
      </div>

      {/* Footer with action button */}
      <div className="relative z-10 pt-4 mt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
              <span className="text-sm font-bold text-purple-600">Q</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Quality Team</p>
              <p className="text-xs text-gray-500">Initiator</p>
            </div>
          </div>
        </div>
       
        {/* Action button */}
        <div className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium transition-all duration-300 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-400 hover:to-pink-400 text-slate-700 rounded-xl group-hover:shadow-md">
          <span className="text-lg">Continue 8D Process</span>
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};

// Action Card Component (For Fresh & NCR)
const ActionCard = ({ title, description, icon: Icon, colorTheme, onClick }) => {
  const themes = {
    purple: {
      gradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-purple-100 to-pink-100',
      iconColor: 'text-purple-600',
      buttonGradient: 'from-purple-100 to-pink-100',
      buttonHover: 'hover:from-purple-400 hover:to-pink-400',
      borderHover: 'hover:border-purple-300',
      titleHover: 'group-hover:text-purple-900'
    },
    orange: {
      gradient: 'from-orange-50 to-red-50',
      iconBg: 'bg-gradient-to-br from-orange-100 to-red-100',
      iconColor: 'text-orange-600',
      buttonGradient: 'from-orange-100 to-red-100',
      buttonHover: 'hover:from-orange-400 hover:to-red-400',
      borderHover: 'hover:border-orange-300',
      titleHover: 'group-hover:text-orange-900'
    }
  };

  const theme = themes[colorTheme] || themes.purple;

  return (
    <div
      onClick={onClick}
      className={`relative p-8 overflow-hidden transition-all duration-500 ease-out bg-white border border-gray-100 shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl ${theme.borderHover} hover:-translate-y-2 group h-full flex flex-col`}
    >
      <div className={`absolute inset-0 transition-all duration-500 pointer-events-none bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-40 rounded-3xl`}></div>
     
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${colorTheme === 'orange' ? 'from-orange-500 via-red-500 to-pink-500' : 'from-blue-500 via-purple-500 to-pink-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]`}>
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-center w-20 h-20 mb-6 transition-all duration-500 shadow-sm rounded-2xl group-hover:scale-110 group-hover:rotate-3 mx-auto bg-gradient-to-br from-gray-50 to-gray-100">
           <div className={`w-16 h-16 flex items-center justify-center rounded-xl ${theme.iconBg}`}>
             <Icon className={`w-8 h-8 ${theme.iconColor}`} />
           </div>
        </div>

        <div className="text-center mb-8 flex-grow">
          <h3 className={`text-2xl font-bold text-gray-900 mb-3 transition-colors ${theme.titleHover}`}>
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        </div>

        <div className={`flex items-center justify-center w-full gap-2 px-4 py-4 font-medium transition-all duration-300 bg-gradient-to-r ${theme.buttonGradient} ${theme.buttonHover} text-slate-700 rounded-xl group-hover:shadow-md mt-auto`}>
          <span className="text-lg">Start Process</span>
          <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};

const InitiatorDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qsutrarmsclm.hub.swajyot.co.in:8476';

  useEffect(() => {
    fetchReports();
  }, []);

  // FIXED: Use the correct API endpoint - same as LandingPage1
  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/eightd/data?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        const parsedEvents = response.data.data.map((item) => {
          const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];
          let completedCount = 0;
          steps.forEach((step, index) => {
            const stepIdField = `d${index}_id`;
            if (item[stepIdField]) completedCount++;
          });

          let currentStep = "D0";
          for (let i = 0; i < steps.length; i++) {
            const stepIdField = `d${i}_id`;
            if (!item[stepIdField]) {
              currentStep = steps[i];
              break;
            }
          }

          let status = item.status || "Draft";
          const statusMap = {
            "IN_PROGRESS": "In Progress",
            "APPROVAL_PENDING": "Approval Pending",
            "REJECTED": "Rejected",
            "D0_APPROVED": "D0 Approved",
            "CLOSED": "Closed",
            "COMPLETED": "Completed"
          };
          status = statusMap[status] || status;

          return {
            id: item.eventNo,
            eventNo: item.eventNo,
            title: item.eventNo,
            owner: item.initiatorEmail || user?.name || user?.email || "Unassigned",
            status: status,
            created: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            }) : "N/A",
            createdAt: item.createdAt,
            currentStep: currentStep,
            completedSteps: completedCount,
            totalSteps: steps.length,
            priority: item.priority || "MEDIUM",
            initiatorEmail: item.initiatorEmail,
            rejectionReason: item.rejectionComment
          };
        });

        parsedEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReports(parsedEvents);
        
        setStats({
          total: parsedEvents.length,
          inProgress: parsedEvents.filter(e => e.status === "In Progress").length,
          completed: parsedEvents.filter(e => e.status === "Closed" || e.status === "Completed").length
        });
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reports) => {
    setStats({
      total: reports.length,
      inProgress: reports.filter(r => r.status === 'IN_PROGRESS').length,
      completed: reports.filter(r => r.status === 'COMPLETED').length
    });
  };

  const handleCardClick = (report) => {
    navigate('/eightd-dashboard', { 
      state: { 
        selectedEventId: report?.eventNo || report?.id 
      } 
    });
  };

  const handleNewFreshReport = () => {
    navigate('/eightd-dashboard', { 
      state: { 
        createNew: true,
        type: 'fresh'
      } 
    });
  };

  const handleNewNCRReport = () => {
    navigate('/eightd-dashboard', { 
      state: { 
        createNew: true,
        type: 'ncr'
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading 8D Reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            8D Quality Management
          </h1>
          <p className="text-gray-500">Select an option below to start or continue a problem-solving process</p>
        </div>

        {/* Creation Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <ActionCard 
            title="Create Fresh 8D"
            description="Start a new 8D report from scratch for general quality issues, customer complaints, or internal improvements."
            icon={Zap}
            colorTheme="purple"
            onClick={handleNewFreshReport}
          />

          <ActionCard 
            title="NCR Based 8D"
            description="Convert an existing Non-Conformance Report (NCR) into an 8D problem-solving workflow immediately."
            icon={AlertTriangle}
            colorTheme="orange"
            onClick={handleNewNCRReport}
          />
        </div>

        {/* Divider */}
        

        {/* Existing Reports Grid */}
        
      </div>
    </div>
  );
};

export default InitiatorDashboard;