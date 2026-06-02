// src/pages/LandingPage1.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Grid,
  X,
  CalendarDays,
  Trash2,
  Search,
  BarChart3,
  PieChart as PieIcon,
  ListChecks,
  RefreshCw,
  Users,
  AlertCircle,
  Users2,
  Eye,
  CheckCircle,
  TrendingUp,
  Activity,
  Target,
  Clock,
  FileText,
  CheckSquare,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Cell,
} from "recharts";
import FinalPreview from "../components/steps/FinalPreview";
import Drawer from "../components/Drawer";
import ForumThreadView from "../components/forum/ForumThreadView";
import { useAuth } from "../components/context/AuthContext";

const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];

// FIXED: Get the current step (last completed step)
// FIXED: Get the current step (last completed step)
// FIXED: Get the current step based on step IDs
function getCurrentStep(eventData) {
  console.log("🔍 Determining CURRENT step for event:", eventData?.eventNo);
  
  if (!eventData) {
    return "D0";
  }

  console.log("📊 STEP IDS:", {
    d0_id: eventData.d0_id,
    d1_id: eventData.d1_id,
    d2_id: eventData.d2_id,
    d3_id: eventData.d3_id,
    d4_id: eventData.d4_id,
    d5_id: eventData.d5_id,
    d6_id: eventData.d6_id,
    d7_id: eventData.d7_id,
    d8_id: eventData.d8_id
  });

  // Check which steps have been completed (have non-null IDs)
  const completedSteps = [];
  
  if (eventData.d0_id) completedSteps.push("D0");
  if (eventData.d1_id) completedSteps.push("D1");
  if (eventData.d2_id) completedSteps.push("D2");
  if (eventData.d3_id) completedSteps.push("D3");
  if (eventData.d4_id) completedSteps.push("D4");
  if (eventData.d5_id) completedSteps.push("D5");
  if (eventData.d6_id) completedSteps.push("D6");
  if (eventData.d7_id) completedSteps.push("D7");
  if (eventData.d8_id) completedSteps.push("D8");

  console.log("✅ Completed steps:", completedSteps);

  // The current step is the LAST completed step
  if (completedSteps.length > 0) {
    const currentStep = completedSteps[completedSteps.length - 1];
    console.log(`🎯 CURRENT STEP: ${currentStep}`);
    return currentStep;
  }

  // If no steps completed, return D0
  console.log("🎯 CURRENT STEP: D0 (no steps completed)");
  return "D0";
}

// ✅ ADD: Function to get team members for an event
// ✅ ADD: Function to get team members for an event
const getTeamMembersForEvent = async (eventId) => {
  if (!eventId) return [];
  
  try {
    console.log('👥 [LandingPage] Fetching team members for event:', eventId);
    const response = await axios.get(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data/${eventId}`);
    
    if (response.data?.success && response.data.data) {
      const eventData = response.data.data;
      const d0Data = eventData.content?.d0?.[0] || {};
      const teamMembers = Array.isArray(d0Data.additionalEmails) 
        ? d0Data.additionalEmails 
        : [];
      
      console.log('👥 [LandingPage] Found team members:', teamMembers);
      return teamMembers;
    }
    return [];
  } catch (error) {
    console.error('❌ [LandingPage] Failed to fetch team members:', error);
    return [];
  }
};

// FIXED: Get the next step to fill
// FIXED: Get the next step to fill based on step IDs
// FIXED: Get the next step to fill based on step IDs
function getNextStep(eventData) {
  console.log("🔍 Determining NEXT step for event:", eventData?.eventNo);
  
  if (!eventData) {
    console.log("❌ No event data, starting from D0");
    return "D0";
  }

  console.log("📊 STEP IDS for next step:", {
    d0_id: eventData.d0_id,
    d1_id: eventData.d1_id,
    d2_id: eventData.d2_id,
    d3_id: eventData.d3_id,
    d4_id: eventData.d4_id,
    d5_id: eventData.d5_id,
    d6_id: eventData.d6_id,
    d7_id: eventData.d7_id,
    d8_id: eventData.d8_id
  });

  // Find the FIRST step that doesn't have an ID
  for (let i = 0; i < steps.length; i++) {
    const stepIdField = `d${i}_id`;
    const stepCompleted = !!eventData[stepIdField];
    
    console.log(`   Checking ${steps[i]} (${stepIdField}):`, eventData[stepIdField], "completed:", stepCompleted);
    
    if (!stepCompleted) {
      console.log(`🎯 NEXT STEP: ${steps[i]} (${stepIdField} is null/empty)`);
      return steps[i];
    }
  }

  // All steps are complete
  console.log("✅ All steps completed, defaulting to D8");
  return "D8";
}

function getStepSummary(eventData) {
  const summary = {};
  let completedSteps = 0;
  
  // Check step completion based on step IDs
  steps.forEach((step, index) => {
    const stepIdField = `d${index}_id`;
    const isCompleted = !!eventData[stepIdField]; // true if step ID exists
    
    if (isCompleted) completedSteps++;
    
    summary[step] = { 
      filled: isCompleted, 
      complete: isCompleted, 
      summary: isCompleted ? "Completed" : "Not started" 
    };
  });
  
  console.log(`📊 Step summary: ${completedSteps}/${steps.length} steps completed`);
  
  return { summary, completedSteps, totalSteps: steps.length };
}

const statusColors = {
  "Open": "#7aa6eeff", "Closed": "#7973ebff", "Initiated": "#f59e0b",
  "Draft": "#6b7280", "Submitted": "#8b5cf6", "Approval Pending": "#f59e0b",
  "In Progress": "#3b82f6", "Rejected": "#ef4444", "D0 Approved": "#10b981",
};

function isNcrBasedEvent(eventData) {
  const d0Data = Array.isArray(eventData?.content?.d0) ? eventData.content.d0[0] : null;
  return Boolean(
    d0Data?.sourceNcrId ||
    d0Data?.sourceNcrNumber ||
    d0Data?.isNcrBased ||
    d0Data?.sourceType === "ncr" ||
    eventData?.isNcrBased ||
    eventData?.sourceType === "ncr" ||
    String(eventData?.eventNo || "").startsWith("8D-NCR-")
  );
}

function isDraftLikeStatus(status) {
  return ["draft", "open", "initiated"].includes(String(status || "").toLowerCase());
}

function determineFunctionalStatus(eventData) {
  const { completedSteps, totalSteps } = getStepSummary(eventData);
  const currentStatus = eventData.status || "Open";
  const currentStep = getCurrentStep(eventData);
  
  if (completedSteps === totalSteps) return "Closed";
  if (eventData.d0_id && !eventData.d1_id && currentStatus === "Approval Pending") return "Approval Pending";
  if (eventData.d0_id && !eventData.d1_id && currentStatus === "Rejected") return "Rejected";
  if (currentStep === "D0") {
    if (isDraftLikeStatus(currentStatus)) {
      const normalizedStatus = String(currentStatus || "").toLowerCase();
      if (normalizedStatus === "draft") return "Draft";
      if (normalizedStatus === "initiated") return "Initiated";
      return "Open";
    }
    return "D0 Approved";
  }
  if (["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"].includes(currentStep)) return "In Progress";
  if (currentStatus === "Approved" && completedSteps === 0) return "D0 Approved";
  return currentStatus;
}

// Professional KPI Card Component
const KPICard = ({ title, value, icon: Icon, trend, color, subtitle, onClick }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    onClick={onClick}
    className={`bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 cursor-pointer group ${
      onClick ? 'hover:border-blue-300' : ''
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`text-${color}-600`} size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg ${
          trend > 0 ? 'bg-green-50 text-green-700' : trend < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
        }`}>
          <TrendingUp size={14} className={trend > 0 ? '' : trend < 0 ? 'rotate-180' : ''} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      {onClick && <ArrowUpRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />}
    </div>
    <div className="space-y-1">
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      <p className="text-slate-600 font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  </motion.div>
);

// Status Progress Component
const StatusProgress = ({ status, count, total, color, percentage }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3 flex-1">
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-slate-700">{status}</span>
      </div>
      <div className="flex-1 max-w-[200px]">
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
    <div className="text-right min-w-[80px]">
      <span className="text-sm font-bold text-slate-800">{count}</span>
      <span className="text-xs text-slate-400 ml-1">({percentage}%)</span>
    </div>
  </div>
);

// Enhanced Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-200 min-w-[200px] backdrop-blur-sm">
        <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-slate-600">{entry.name}:</span>
            </div>
            <span className="font-bold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function LandingPage1() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInitiator, isHOD, user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeEventId, setActiveEventId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stepSort, setStepSort] = useState("None");
  const [viewLimit, setViewLimit] = useState("All");
  const [loading, setLoading] = useState(false);
  const [forumDrawerOpen, setForumDrawerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showRejectionReason, setShowRejectionReason] = useState(false);
  const [selectedRejectionEvent, setSelectedRejectionEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const queryParams = new URLSearchParams(location.search);
  const selectedEventId = location.state?.selectedEventId || queryParams.get("eventId") || null;

    const [teamMembersMap, setTeamMembersMap] = useState({});
  const dashboardType = location.state?.type || "all";
  const dashboardTitle =
    dashboardType === "fresh"
      ? "Fresh 8D Dashboard"
      : dashboardType === "ncr"
        ? "NCR Based 8D Dashboard"
        : "8D Dashboard";
  const dashboardSubtitle =
    dashboardType === "fresh"
      ? "Showing only freshly created 8D forms"
      : dashboardType === "ncr"
        ? "Showing only NCR-based 8D forms"
        : "Showing all 8D forms";


  const createNew8D = () => {
    navigate("/eightdflow", {
      state: {
        eventId: null,
        step: "D0",
        type: dashboardType,
        isNcrBased: dashboardType === "ncr"
      }
    });
  };

  const fetchFullRecordData = async (eventNo) => {
    try {
      const response = await axios.get(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data/${eventNo}`);
      return response.data?.success ? response.data.data || {} : null;
    } catch (err) {
      console.error("Failed to fetch full record ", eventNo, err);
      return null;
    }
  };

  const continueForm = async (ev) => {
  console.log("🚀 CONTINUE clicked for:", ev.eventNo);
  console.log("📋 Current event data step IDs:", {
    d0_id: ev.d0_id,
    d1_id: ev.d1_id,
    d2_id: ev.d2_id
  });
  
  if (ev.status === "Rejected") {
    alert("❌ This document was rejected and cannot be accessed or edited.");
    return;
  }
  
  if (isHOD && ev.status === "Approval Pending") {
    setActiveEventId(ev.eventNo);
    setShowPreview(true);
    return;
  }
  
  if (!isInitiator && !isAdmin) {
    setActiveEventId(ev.eventNo);
    setShowPreview(true);
    return;
  }
  
  if (ev.status === "Approval Pending") {
    alert("⚠️ HOD approval is required before proceeding to D1.");
    return;
  }
  
  // NCR-based draft events should reopen the prefilled D0 first.
  const shouldStartFromD0 =
    ev.isNcrBased &&
    isDraftLikeStatus(ev.status);

  // Use the event data directly - no need to fetch
  const nextStep = shouldStartFromD0 ? "D0" : getNextStep(ev);
  console.log(`📍 FINAL DECISION: Navigating to ${nextStep}`);
  
  navigate("/eightdflow", { 
    state: { 
      eventId: ev.eventNo, 
      step: nextStep,
      isNcrBased: ev.isNcrBased,
      type: ev.isNcrBased ? "ncr" : "fresh"
    } 
  });
};
  const fetchEvents = async () => {
  setLoading(true);
  try {
    const res = await axios.get("https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data?t=" + Date.now());
    console.log("🚨🚨🚨 RAW API RESPONSE 🚨🚨🚨", JSON.parse(JSON.stringify(res.data)));
    
    if (res.data?.success && Array.isArray(res.data.data)) {
      // Log each event's structure with expanded content
      res.data.data.forEach((item, index) => {
        console.log(`📊 EVENT ${index + 1} FULL DATA:`, JSON.parse(JSON.stringify(item)));
        console.log(`🔍 EVENT ${index + 1} STEP IDS:`, {
          d0_id: item.d0_id,
          d1_id: item.d1_id,
          d2_id: item.d2_id,
          d3_id: item.d3_id,
          d4_id: item.d4_id,
          d5_id: item.d5_id,
          d6_id: item.d6_id,
          d7_id: item.d7_id,
          d8_id: item.d8_id
        });
      });
      
      const parsed = res.data.data.map((item) => {
        const eventNo = item.eventNo;
        let status = item.status || "Open";
        const statusMap = {
          "IN_PROGRESS": "In Progress", "in progress": "In Progress",
          "approval pending": "Approval Pending", "REJECTED": "Rejected",
          "rejected": "Rejected", "Reject": "Rejected", "REJECT": "Rejected",
          "STATUS_REJECTED": "Rejected", "APPROVED": "D0 Approved",
          "approved": "D0 Approved", "D0_APPROVED": "D0 Approved",
          "DRAFT": "Draft", "draft": "Draft",
          "OPEN": "Open", "open": "Open",
          "INITIATED": "Initiated", "initiated": "Initiated",
        };
        status = statusMap[status] || status;
        
        const currentStep = getCurrentStep(item);
        status = determineFunctionalStatus({ ...item, status, currentStep });
        
        const created = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : "N/A";
        
        const stepSummaryData = getStepSummary(item);
        let rejectionReason = item.rejectionComment || (item.content && item.content.rejectionComment) || null;
        let hodRemarks = item.rejectedBy ? `Rejected by: ${item.rejectedBy}` : null;

        // IMPORTANT: Include all step IDs in the parsed event
        return {
          eventNo,
          title: eventNo,
          owner: item.initiatorEmail || user?.name || user?.email || "Unassigned",
          status,
          created,
          currentStep,
          content: item.content || {},
          stepSummary: stepSummaryData.summary,
          completedSteps: stepSummaryData.completedSteps,
          totalSteps: stepSummaryData.totalSteps,
          createdAt: item.createdAt,
          isApprovalPending: status === "Approval Pending",
          rejectionReason,
          hodRemarks,
          rejectedBy: item.rejectedBy,
          rejectedAt: item.rejectedAt,
          isNcrBased: isNcrBasedEvent(item),
          // CRITICAL: Include all step IDs
          d0_id: item.d0_id,
          d1_id: item.d1_id,
          d2_id: item.d2_id,
          d3_id: item.d3_id,
          d4_id: item.d4_id,
          d5_id: item.d5_id,
          d6_id: item.d6_id,
          d7_id: item.d7_id,
          d8_id: item.d8_id
        };
      });
      parsed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEvents(parsed);
    }
  } catch (err) {
    console.error("Error fetching events:", err);
    alert("Failed to fetch events. Check console.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchEvents(); }, []);

  

  useEffect(() => {
    if (!selectedEventId || !isHOD) return;
    setActiveEventId(selectedEventId);
    setShowPreview(true);
  }, [selectedEventId, isHOD]);

  useEffect(() => {
  const fetchAllTeamMembers = async () => {
    if (!events.length) return;
    
    console.log("📢 Fetching team members for", events.length, "events");
    const membersMap = {};
    
    for (const event of events) {
      if (event.eventNo) {
        const members = await getTeamMembersForEvent(event.eventNo);
        membersMap[event.eventNo] = members;
        console.log(`📢 Event ${event.eventNo} has ${members.length} team members:`, members);
      }
    }
    
    setTeamMembersMap(membersMap);
    console.log("📢 Final teamMembersMap:", membersMap);
  };
  
  fetchAllTeamMembers();
}, [events]);

  const showPreviewWithLatestData = (ev) => {
    setActiveEventId(ev.eventNo);
    setShowPreview(true);
  };

  const showRejectionDetails = async (ev) => {
    if (!ev.rejectionReason) {
      try {
        const fullData = await fetchFullRecordData(ev.eventNo);
        if (fullData) {
          const rejectionReason = fullData.rejectionComment || "No specific reason provided";
          const hodRemarks = fullData.rejectedBy ? `Rejected by: ${fullData.rejectedBy}` : null;
          setSelectedRejectionEvent({ ...ev, rejectionReason, hodRemarks });
        } else {
          setSelectedRejectionEvent(ev);
        }
      } catch (error) {
        console.error("Failed to fetch rejection details:", error);
        setSelectedRejectionEvent(ev);
      }
    } else {
      setSelectedRejectionEvent(ev);
    }
    setShowRejectionReason(true);
  };

  const confirmDelete = (ev) => {
    setEventToDelete(ev);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    try {
      await axios.delete(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data/${eventToDelete.eventNo}`);
      fetchEvents();
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete record.");
    }
  };

  const approvalPendingEvents = useMemo(() => {
    return events.filter(event => event.status === "Approval Pending");
  }, [events]);

  const scopedEvents = useMemo(() => {
    if (dashboardType === "fresh") {
      return events.filter((event) => !event.isNcrBased);
    }
    if (dashboardType === "ncr") {
      return events.filter((event) => event.isNcrBased);
    }
    return events;
  }, [dashboardType, events]);

  const scopedApprovalPendingEvents = useMemo(() => {
    return scopedEvents.filter((event) => event.status === "Approval Pending");
  }, [scopedEvents]);

  const filtered = useMemo(() => {
    let list = [...scopedEvents];
    if (statusFilter !== "All") list = list.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      list = list.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.owner.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (stepSort === "StepSort") {
      list.sort((a, b) => steps.indexOf(a.currentStep) - steps.indexOf(b.currentStep));
    } else if (steps.includes(stepSort)) {
      list = list.filter((e) => e.currentStep === stepSort);
    }
    return list;
  }, [scopedEvents, search, statusFilter, stepSort]);

  const limitedFiltered = viewLimit === "All" ? filtered : filtered.slice(0, parseInt(viewLimit));
  const totalEvents = scopedEvents.length;

  // Enhanced analytics data
  const statusCounts = useMemo(() => {
    const counts = {
      "In Progress": 0, "Rejected": 0, "Approval Pending": 0, 
      "D0 Approved": 0, "Closed": 0
    };
    scopedEvents.forEach(event => {
      if (counts.hasOwnProperty(event.status)) counts[event.status]++;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      color: statusColors[label],
      percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
    }));
  }, [scopedEvents, totalEvents]);

  const stepCounts = useMemo(() => {
    return steps.map((s) => ({
      step: s,
      count: scopedEvents.filter((e) => e.currentStep === s).length,
    }));
  }, [scopedEvents]);

  // Calculate metrics
  const completionRate = useMemo(() => {
    if (scopedEvents.length === 0) return 0;
    const totalStepsPossible = scopedEvents.length * steps.length;
    const completedStepsTotal = scopedEvents.reduce((sum, event) => sum + event.completedSteps, 0);
    return Math.round((completedStepsTotal / totalStepsPossible) * 100);
  }, [scopedEvents]);

  // Mock trend data
  const monthlyTrendData = [
    { month: 'Jan', completed: 12, inProgress: 8 },
    { month: 'Feb', completed: 18, inProgress: 10 },
    { month: 'Mar', completed: 15, inProgress: 12 },
    { month: 'Apr', completed: 22, inProgress: 14 },
    { month: 'May', completed: 19, inProgress: 16 },
    { month: 'Jun', completed: 25, inProgress: 18 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Grid size={32} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-3xl text-slate-800 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {dashboardTitle}
              </h1>
              <p className="text-slate-600 flex items-center gap-2 mt-1">
                <CalendarDays size={16} />
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-slate-500 mt-2">{dashboardSubtitle}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-gradient-to-br from-blue-300 to-blue-400 px-4 py-2 mt-4 rounded-2xl shadow-lg text-center min-w-[200px] border border-blue-400/30">
              <div className="text-white/90 text-sm font-medium mb-1">Total 8D</div>
              <div className="text-3xl font-bold text-white">{totalEvents}</div>
              <div className="text-xs text-white/70 font-medium mt-1">+12% from last month</div>
            </div>
            {(isInitiator || isAdmin) && dashboardType !== "ncr" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createNew8D}
                className="px-4 py-2 mt-4 rounded-xl font-semibold bg-gradient-to-r from-blue-300 to-blue-400 text-white hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap border border-blue-400/30"
              >
                <Zap size={20} />
                New 8D Event
              </motion.button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-blue-600 bg-white/80 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-lg border border-slate-200">
              <RefreshCw size={24} className="animate-spin" />
              <span className="font-medium text-lg">Loading dashboard data...</span>
            </div>
          </div>
        )}

        {/* Enhanced HOD Alert */}
        {isHOD && scopedApprovalPendingEvents.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl shadow-xl border border-amber-300/30"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <AlertCircle className="text-white" size={32} />
              </div>
              <div className="text-white">
                <h3 className="font-bold text-xl">
                  {scopedApprovalPendingEvents.length} Event(s) Awaiting Your Approval
                </h3>
                <p className="text-white/90 text-base mt-2">
                  Please review and approve these pending 8D events to keep the workflow moving
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Professional Analytics Dashboard */}
        <div className="mb-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total 8D"
              value={totalEvents}
              icon={FileText}
              trend={12}
              color="blue"
              subtitle="All 8D processes"
            />
            <KPICard
              title="Completion Rate"
              value={completionRate + "%"}
              icon={CheckSquare}
              trend={8}
              color="green"
              subtitle="Overall progress"
            />
            <KPICard
              title="Avg. Time"
              value={"5.2 days"}
              icon={Clock}
              trend={-5}
              color="purple"
              subtitle="Resolution time"
            />
            <KPICard
              title="Efficiency"
              value={"78%"}
              icon={Target}
              trend={15}
              color="orange"
              subtitle="Process efficiency"
            />
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Status Distribution - Horizontal Bar Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Activity size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Status Distribution</h3>
                </div>
                <div className="text-sm text-slate-500">Total: {totalEvents} events</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusCounts}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="label" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    >
                      {statusCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Step Progress Analysis */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <BarChart3 size={20} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Step Progress Analysis</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                  <TrendingUp size={16} />
                  <span>Overall: {completionRate}% Complete</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stepCounts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="stepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="step" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis 
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      fill="url(#stepGradient)"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <ListChecks size={20} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800">Status Breakdown</h3>
              </div>
              <div className="text-sm text-slate-500">{totalEvents} Total 8D</div>
            </div>
            <div className="space-y-1">
              {statusCounts.map((item, index) => (
                <StatusProgress
                  key={item.label}
                  status={item.label}
                  count={item.count}
                  total={totalEvents}
                  color={item.color}
                  percentage={item.percentage}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Event Management Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-800">8D Event Management</h2>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="All">All Status</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Approval Pending">Awaiting Approval</option>
                  <option value="D0 Approved">D0 Approved</option>
                  <option value="Closed">Closed</option>
                </select>
                <select
                  value={stepSort}
                  onChange={(e) => setStepSort(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="None">All Steps</option>
                  <option value="StepSort">Sort by Step</option>
                  {steps.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={viewLimit}
                  onChange={(e) => setViewLimit(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="All">All Events</option>
                  <option value="10">Last 10</option>
                  <option value="20">Last 20</option>
                  <option value="50">Last 50</option>
                </select>
                <div className="flex items-center px-4 py-2.5 border rounded-xl border-slate-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                  <Search size={18} className="text-slate-400 mr-3" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="outline-none bg-transparent text-sm w-40 md:w-64 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Event Cards Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {limitedFiltered.map((ev) => (
                <motion.div
                  key={ev.eventNo}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col border ${
                    ev.status === "Approval Pending" 
                      ? "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white" 
                      : "border-slate-200"
                  }`}
                >
                  {ev.status === "Approval Pending" && (
                    <div className="mb-3 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full text-center shadow">
                      ⚡ Awaiting HOD Approval
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className="px-3 py-1.5 text-xs rounded-full font-bold shadow-sm"
                      style={{
                        backgroundColor: `${statusColors[ev.status] || statusColors["Open"]}15`,
                        color: statusColors[ev.status] || statusColors["Open"],
                        border: `1px solid ${statusColors[ev.status] || statusColors["Open"]}30`
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 truncate mb-1">{ev.title}</div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Users2 size={12} />
                    Owner: {ev.owner}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    Created: {ev.created}
                  </div>
                  <div className="text-xs mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                      Current Step: {ev.currentStep}
                    </span>
                  </div>
                  <div className="mt-3 mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                      <span>Progress</span>
                      <span>
                        {ev.completedSteps}/{ev.totalSteps} steps
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(ev.completedSteps / ev.totalSteps) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full shadow-sm"
                      ></motion.div>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-between items-center">
                    <div className="flex gap-2 flex-wrap">
                      {(ev.status !== "Approval Pending" || isHOD) && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => showPreviewWithLatestData(ev)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all border border-blue-200 shadow-sm"
                        >
                          View Details
                        </motion.button>
                      )}
                      
                      {ev.status === "Rejected" ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => showRejectionDetails(ev)}
                          className="px-2 py-1.5 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1 border border-red-200 shadow-sm"
                        >
                          <Eye size={14} />
                          Reject Info
                        </motion.button>
                      ) : ev.status === "Approval Pending" ? (
                        isHOD ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => continueForm(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                          >
                            Review
                          </motion.button>
                        ) : isInitiator || isAdmin ? (
                          <button
                            disabled
                            className="px-3 py-1.5 text-sm rounded-lg bg-yellow-100 text-yellow-800 cursor-not-allowed border border-yellow-200 shadow-sm"
                          >
                            Awaiting Approval
                          </button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => showPreviewWithLatestData(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                          >
                            View Details
                          </motion.button>
                        )
                      ) : ev.status === "D0 Approved" ? (
                        (isInitiator || isAdmin) ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => continueForm(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition shadow-sm"
                          >
                            Continue
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => showPreviewWithLatestData(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                          >
                            View Details
                          </motion.button>
                        )
                      ) : ev.isNcrBased && isDraftLikeStatus(ev.status) ? (
                        (isInitiator || isAdmin) ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => continueForm(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition shadow-sm"
                          >
                            Start
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => showPreviewWithLatestData(ev)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                          >
                            View Details
                          </motion.button>
                        )
                      ) : (isInitiator || isAdmin) ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => continueForm(ev)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition shadow-sm"
                        >
                          Continue
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => showPreviewWithLatestData(ev)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                        >
                          View Details
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedGroupId(ev.eventNo);
                          setForumDrawerOpen(true);
                        }}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition shadow-sm flex items-center gap-1"
                      >
                        <Users size={14} />
                        Forum
                      </motion.button>
                    </div>
                    {(isInitiator || isAdmin) && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => confirmDelete(ev)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500 border border-slate-200 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {limitedFiltered.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-slate-300 mb-4">
                  <Grid size={64} className="mx-auto" />
                </div>
                <p className="text-slate-500 text-lg mb-2">No 8D events found</p>
                <p className="text-slate-400 text-sm mb-6">Try adjusting your filters or create a new 8D event</p>
                {(isInitiator || isAdmin) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createNew8D}
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                  >
                    Create Your First 8D
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Drawer - 60% on desktop, full on mobile */}
      <Drawer
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview - Latest Data"
        cardContent={[]}
        className="w-full sm:w-[60vw]"
      >
        {activeEventId && (
          <div className="p-2">
            <FinalPreview
              eventId={activeEventId}
              isHOD={isHOD}
            />
          </div>
        )}
      </Drawer>

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {showRejectionReason && selectedRejectionEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Rejection Details
                </h3>
                <button
                  onClick={() => {
                    setShowRejectionReason(false);
                    setSelectedRejectionEvent(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Event Number
                  </label>
                  <div className="text-slate-900 font-mono bg-slate-50 px-3 py-2 rounded-lg">
                    {selectedRejectionEvent.eventNo}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Rejection Reason
                  </label>
                  <div className="text-slate-900 bg-red-50 border border-red-200 px-3 py-2 rounded-lg min-h-[80px]">
                    {selectedRejectionEvent.rejectionReason || "No specific reason provided"}
                  </div>
                </div>
                
                {selectedRejectionEvent.hodRemarks && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      HOD Information
                    </label>
                    <div className="text-slate-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                      {selectedRejectionEvent.hodRemarks}
                      {selectedRejectionEvent.rejectedAt && (
                        <div className="text-sm text-slate-600 mt-1">
                          Rejected on: {new Date(selectedRejectionEvent.rejectedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowRejectionReason(false);
                      setSelectedRejectionEvent(null);
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && eventToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Confirm Deletion
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setEventToDelete(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-slate-700">
                  <p className="mb-3">Are you sure you want to delete this event?</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg mb-3">
                    <div className="font-semibold">Event: {eventToDelete.eventNo}</div>
                    <div className="text-sm text-slate-600">Status: {eventToDelete.status}</div>
                    <div className="text-sm text-slate-600">Current Step: {eventToDelete.currentStep}</div>
                    <div className="text-sm text-slate-600">Owner: {eventToDelete.owner}</div>
                  </div>
                  
                  {/* Show rejection reason if the event was rejected */}
                  {eventToDelete.status === "Rejected" && eventToDelete.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
                      <div className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</div>
                      <div className="text-sm text-red-700">{eventToDelete.rejectionReason}</div>
                      {eventToDelete.hodRemarks && (
                        <>
                          <div className="text-sm font-medium text-red-800 mt-2 mb-1">HOD Information:</div>
                          <div className="text-sm text-red-700">{eventToDelete.hodRemarks}</div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-red-600 font-medium text-sm">
                    ⚠️ This action cannot be undone. All event data and forum discussions will be permanently deleted.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setEventToDelete(null);
                    }}
                    className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Success Popup */}
      <AnimatePresence>
        {showDeleteSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  Deleted Successfully!
                </h3>
                
                <p className="text-slate-600 mb-4">
                  The event has been permanently deleted from the system.
                </p>
                
                <button
                  onClick={() => setShowDeleteSuccess(false)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORUM DRAWER - 50% on desktop, full on mobile, NO HEADER */}
      {/* FORUM DRAWER - 50% on desktop, full on mobile, NO HEADER */}
{/* FORUM DRAWER - 50% on desktop, full on mobile, NO HEADER */}
<Drawer
  isOpen={forumDrawerOpen}
  onClose={() => setForumDrawerOpen(false)}
  title="Discussion Forum"
  className="w-full sm:w-[50vw]"
  showHeader={false}
>
  {selectedGroupId && (
    <div className="h-full">
      <ForumThreadView
        groupId={selectedGroupId}
        isInDrawer={true}
        setForumDrawerOpen={setForumDrawerOpen}
        username={user?.email || user?.username}
        currentUser={user}
        allUsers={[]}
        memberEmails={teamMembersMap[selectedGroupId] || []}
        onBack={() => setForumDrawerOpen(false)}
        groupName={`8D Discussion - ${selectedGroupId}`}
      />
      {/* ✅ ADD: Debug info */}
      <div style={{ display: 'none' }}>
        Debug: {JSON.stringify({
          selectedGroupId,
          teamMembers: teamMembersMap[selectedGroupId],
          user: user?.email
        })}
      </div>
    </div>
  )}
</Drawer>
    </div>
  );
}
