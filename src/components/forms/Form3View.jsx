import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { 
  FiSave, FiRefreshCw, FiCheckCircle, FiClock, FiSend, 
  FiCheck, FiX, FiAlertCircle, FiFileText, FiMessageSquare, FiDownload,
  FiStar // Add star icon for demo mode
} from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';


const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const Form3View = () => {
  
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false); // Add demo loading state
  const [planData, setPlanData] = useState([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [searchParams] = useSearchParams();
  const urlYear = searchParams.get('year');
  
  // Use URL year if available, otherwise use current year
  const [selectedYear, setSelectedYear] = useState(
    urlYear ? parseInt(urlYear) : new Date().getFullYear()
  );

  // Update when URL changes
  useEffect(() => {
    if (urlYear) {
      setSelectedYear(parseInt(urlYear));
    }
  }, [urlYear]);


  const [planInfo, setPlanInfo] = useState({
    preparedBy: '',
    approvedBy: '',
    approvedAt: null,
    approvalComments: '',
    rejectedAt: null,
    rejectedBy: '',
    rejectionReason: ''
  });

  const auditElements = [
    { id: 1, name: "System Audit (ISO9001)" },
    { id: 2, name: "System Audit (IATF16949)" },
    { id: 3, name: "5S Audit" },
    { id: 4, name: "Process Audit" },
    { id: 5, name: "Product Audit" }
  ];

  // Financial Year Months (April to March)
  const financialMonths = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
  ];

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, {
        withCredentials: true
      });
      
      console.log('Fetched plan data:', {
        approvalComments: response.data?.approvalComments,
        rejectionReason: response.data?.rejectionReason,
        approvalStatus: response.data?.approvalStatus,
        approvedBy: response.data?.approvedBy,
        rejectedBy: response.data?.rejectedBy,
        fullData: response.data
      });
      
      if (response.data) {
        setPlanData(response.data.planItems || []);
        setPlanStatus(response.data.approvalStatus || 'DRAFT');
        
        // Store rejection reason if exists
        if (response.data.rejectionReason) {
          setRejectionReason(response.data.rejectionReason);
        } else {
          setRejectionReason('');
        }
        
        // Update planInfo with ALL comments from backend
        setPlanInfo({
          preparedBy: response.data.preparedBy || user?.name || user?.username,
          approvedBy: response.data.approvedBy || '',
          approvedAt: response.data.approvedAt || null,
          approvalComments: response.data.approvalComments || '',
          rejectedAt: response.data.rejectedAt || null,
          rejectedBy: response.data.rejectedBy || '',
          rejectionReason: response.data.rejectionReason || ''
        });
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      addToast('Failed to load plan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // In Form3View.jsx, update the useEffect that watches urlYear:

useEffect(() => {
  if (urlYear) {
    const newYear = parseInt(urlYear);
    setSelectedYear(newYear);
    // Also update the URL to reflect the change (optional)
    // navigate(`?year=${newYear}`, { replace: true });
  }
}, [urlYear]); // This will run when URL changes

  // Populate available years on mount
useEffect(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }
  setAvailableYears(years);
}, []);

// Fetch plan data when selectedYear changes
useEffect(() => {
  fetchPlanData();
}, [selectedYear]);
  

  // Add this new function for demo credentials
// Add this new function for demo credentials
const handleDemoPlanned = async () => {
  // Check if user can edit
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  setDemoLoading(true);
  try {
    // Create a deep copy of the current plan data
    let newPlanData = [...planData];
    
    // If plan data is empty, initialize it with audit elements
    if (newPlanData.length === 0) {
      auditElements.forEach(element => {
        const monthsData = financialMonths.map(month => ({
          month: month,
          status: ''
        }));
        newPlanData.push({
          auditElement: element.name,
          months: monthsData
        });
      });
    }
    
    // Mark ONLY IATF16949 and 5S audits as PLANNED for all months
    let totalPlannedCount = 0;
    newPlanData.forEach(element => {
      // Check if this is IATF16949 or 5S Audit
      if (element.auditElement === "System Audit (IATF16949)" || 
          element.auditElement === "5S Audit") {
        element.months.forEach(month => {
          if (month.status !== 'PLANNED') {
            month.status = 'PLANNED';
            totalPlannedCount++;
          }
        });
      }
    });
    
    // Update state
    setPlanData(newPlanData);
    
    // Automatically save after demo planned
    const saveData = {
      planYear: selectedYear,
      planItems: newPlanData
    };
    
    await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, saveData, {
      withCredentials: true
    });
    
    addToast(`✅ Demo mode: ${totalPlannedCount} audits marked as PLANNED for IATF16949 & 5S only!`, 'success');
    
    // Refresh data to ensure sync with backend
    await fetchPlanData();
    
  } catch (error) {
    console.error('Error in demo planned:', error);
    addToast('Failed to mark audits as planned', 'error');
  } finally {
    setDemoLoading(false);
  }
};

// Add another helper function for quick plan (first quarter only for IATF16949 & 5S)
const handleQuickPlanned = async () => {
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  setDemoLoading(true);
  try {
    let newPlanData = [...planData];
    
    if (newPlanData.length === 0) {
      auditElements.forEach(element => {
        const monthsData = financialMonths.map(month => ({
          month: month,
          status: ''
        }));
        newPlanData.push({
          auditElement: element.name,
          months: monthsData
        });
      });
    }
    
    // Mark only first quarter (Apr, May, Jun) as PLANNED for IATF16949 & 5S only
    const firstQuarterMonths = ["Apr", "May", "Jun"];
    let totalPlannedCount = 0;
    
    newPlanData.forEach(element => {
      // Check if this is IATF16949 or 5S Audit
      if (element.auditElement === "System Audit (IATF16949)" || 
          element.auditElement === "5S Audit") {
        element.months.forEach(month => {
          if (firstQuarterMonths.includes(month.month) && month.status !== 'PLANNED') {
            month.status = 'PLANNED';
            totalPlannedCount++;
          }
        });
      }
    });
    
    setPlanData(newPlanData);
    
    const saveData = {
      planYear: selectedYear,
      planItems: newPlanData
    };
    
    await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, saveData, {
      withCredentials: true
    });
    
    addToast(`✅ Quick plan: ${totalPlannedCount} audits marked as PLANNED for Q1 (Apr-Jun) for IATF16949 & 5S only`, 'success');
    await fetchPlanData();
    
  } catch (error) {
    console.error('Error in quick planned:', error);
    addToast('Failed to mark audits as planned', 'error');
  } finally {
    setDemoLoading(false);
  }
};

  const handleSave = async () => {
    if (planStatus === 'APPROVED') {
      addToast('Approved plan cannot be modified', 'warning');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        planYear: selectedYear,
        planItems: planData
      };
      
      await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, saveData, {
        withCredentials: true
      });
      
      addToast('Annual Audit Plan saved successfully!', 'success');
      await fetchPlanData();
    } catch (error) {
      console.error('Error saving plan:', error);
      addToast('Failed to save plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false;
    let plannedCount = 0;
    
    planData.forEach(element => {
      element?.months?.forEach(month => {
        if (month?.status === 'PLANNED') {
          hasPlanned = true;
          plannedCount++;
        }
      });
    });

    if (!hasPlanned) {
      addToast('Please mark at least one month as PLANNED before submitting', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const saveData = {
        planYear: selectedYear,
        planItems: planData
      };
      
      await axios.post(`${API_BASE}/audit-plan/save?userId=${user?.id}`, saveData, {
        withCredentials: true
      });
      
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/submit?userId=${user?.id}`, {}, {
        withCredentials: true
      });
      
      const actionText = planStatus === 'REJECTED' ? 'resubmitted' : 'submitted';
      addToast(`Plan ${actionText} for approval successfully! (${plannedCount} months planned)`, 'success');
      await fetchPlanData();
      
    } catch (error) {
      console.error('Error submitting plan:', error);
      addToast(error.response?.data?.message || 'Failed to submit plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add this function with your other handler functions (around line 200-250)
const handleStatusChange = async (elementIndex, monthName) => {
  // Check if user can edit
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  // Create a new copy of planData
  const newPlanData = [...planData];
  const element = newPlanData[elementIndex];
  
  if (!element) return;
  
  // Find the month in the element's months array
  const monthIndex = element.months.findIndex(m => m.month === monthName);
  
  if (monthIndex === -1) return;
  
  const currentStatus = element.months[monthIndex].status;
  
  // Cycle through statuses: '' -> 'PLANNED' -> 'COMPLETED' -> '' (or however you want)
  let newStatus;
  if (currentStatus === '') {
    newStatus = 'PLANNED';
  } else if (currentStatus === 'PLANNED') {
    newStatus = 'COMPLETED';
  } else {
    newStatus = '';
  }
  
  // Update the status
  element.months[monthIndex].status = newStatus;
  
  // Update state
  setPlanData(newPlanData);
  
  // Optional: Auto-save after change (or you can let user click Save button)
  // You might want to call handleSave() here if you want auto-save
};

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast('Please provide approval comments', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/approve?userId=${user?.id}`, {
        comments: tempApprovalComment
      }, {
        withCredentials: true
      });
      
      setPlanStatus('APPROVED');
      setPlanInfo(prev => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedAt: new Date().toISOString(),
        approvedBy: user?.name || user?.username
      }));
      setShowApproveModal(false);
      setTempApprovalComment('');
      addToast('Plan approved successfully!', 'success');
      await fetchPlanData();
    } catch (error) {
      console.error('Error approving plan:', error);
      addToast('Failed to approve plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/reject?userId=${user?.id}`, {
        reason: tempRejectionReason
      }, {
        withCredentials: true
      });
      
      setPlanStatus('REJECTED');
      setRejectionReason(tempRejectionReason);
      setPlanInfo(prev => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.name || user?.username
      }));
      setShowRejectModal(false);
      setTempRejectionReason('');
      addToast('Plan rejected', 'error');
      await fetchPlanData();
    } catch (error) {
      console.error('Error rejecting plan:', error);
      addToast('Failed to reject plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      addToast('Please provide a reason for changes', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/audit-plan/${selectedYear}/request-changes?userId=${user?.id}`, {
        reason: changeRequestReason
      }, { withCredentials: true });
      
      addToast(`Change request submitted for ${selectedYear}`, 'warning');
      setShowChangeRequestModal(false);
      setChangeRequestReason('');
      await fetchPlanData();
    } catch (error) {
      console.error('Error requesting changes:', error);
      addToast(error.response?.data?.message || 'Failed to submit change request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}/export-pdf`, {
        responseType: 'blob',
        withCredentials: true
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Annual_Audit_Plan_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      addToast(error.response?.data?.message || 'Failed to export PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getPlanStatusBadge = () => {
    switch (planStatus) {
      case 'APPROVED':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-100 rounded-full"><FiClock className="w-3 h-3" /> Pending Approval</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-100 rounded-full"><FiX className="w-3 h-3" /> Rejected</span>;
      case 'CHANGE_REQUESTED':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded-full"><FiMessageSquare className="w-3 h-3" /> Changes Requested</span>;
      default:
        return <span className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded-full"><FiFileText className="w-3 h-3" /> Draft</span>;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">
          <FiCheckCircle className="w-3 h-3" />
          C
        </span>
      );
    }
    if (status === 'PLANNED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-full">
          <FiClock className="w-3 h-3" />
          P
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
        —
      </span>
    );
  };

  let totalPlanned = 0;
  let totalCompleted = 0;
  
  planData.forEach(element => {
    element?.months?.forEach(month => {
      if (month?.status === 'PLANNED') totalPlanned++;
      if (month?.status === 'COMPLETED') totalCompleted++;
    });
  });
  
  const totalAudits = auditElements.length * 12;
  const completionRate = totalAudits > 0 ? ((totalCompleted / totalAudits) * 100).toFixed(1) : 0;

  const canEdit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED'));
  const canSubmit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED') && totalPlanned > 0);
  const canApprove = (isTopManagement && planStatus === 'PENDING_APPROVAL');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Annual Internal Audit Plan</h1>
            <p className="mt-1 text-sm text-gray-500">Form 3 - Annual Audit Planning (Financial Year)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              {getPlanStatusBadge()}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
              disabled={planStatus === 'PENDING_APPROVAL'}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} - {year + 1}</option>
              ))}
            </select>
            <button
              onClick={fetchPlanData}
              className="p-2 text-gray-500 rounded-lg hover:text-purple-600"
              title="Refresh"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Rejection/Change Request Display */}
      {(planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED') && (rejectionReason || planInfo.rejectionReason) && (
        <div className={`mb-4 p-3 rounded-lg border ${
          planStatus === 'REJECTED' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-2">
            <FiAlertCircle className={`w-5 h-5 mt-0.5 ${
              planStatus === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                planStatus === 'REJECTED' ? 'text-red-800' : 'text-orange-800'
              }`}>
                {planStatus === 'REJECTED' ? 'Rejection Reason' : 'Change Request Reason'}
              </p>
              <p className={`text-sm ${
                planStatus === 'REJECTED' ? 'text-red-600' : 'text-orange-600'
              }`}>{rejectionReason || planInfo.rejectionReason}</p>
              <p className={`text-xs mt-1 ${
                planStatus === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
              }`}>
                {planStatus === 'REJECTED' 
                  ? 'Please make necessary corrections and resubmit.' 
                  : 'Please review the requested changes and update the plan.'}
              </p>
              {(planInfo.rejectedBy && planStatus === 'REJECTED') && (
                <p className="mt-2 text-xs text-red-400">
                  Rejected by {planInfo.rejectedBy} on {planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Comments Display */}
      {planStatus === 'APPROVED' && planInfo.approvalComments && (
        <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-start gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Approval Comments</p>
              <p className="text-sm text-green-600">{planInfo.approvalComments}</p>
              {planInfo.approvedBy && (
                <p className="mt-2 text-xs text-green-500">
                  Approved by {planInfo.approvedBy} on {planInfo.approvedAt && new Date(planInfo.approvedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs text-gray-500">Total Audits Planned</p>
          <p className="text-2xl font-bold text-gray-800">{totalPlanned}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs text-blue-600">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{totalPlanned - totalCompleted}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs text-purple-600">Completion Rate</p>
          <p className="text-2xl font-bold text-purple-600">{completionRate}%</p>
        </div>
      </div>

      {/* Demo Mode Banner - Only show for Audit Manager in Draft/Rejected status */}
      {/* Demo Mode Banner - Only show for Audit Manager in Draft/Rejected status */}
{canEdit && (
  <div className="p-4 mb-6 border border-purple-200 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <FiStar className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="font-semibold text-purple-900">Quick Planning Demo</h3>
          <p className="text-sm text-purple-700">Save time with automatic planning options for IATF16949 & 5S audits</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleQuickPlanned}
          disabled={demoLoading}
          className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {demoLoading ? (
            <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          ) : (
            <FiClock className="w-4 h-4" />
          )}
          Quick Plan (Q1 Only - IATF & 5S)
        </button>
        <button
          onClick={handleDemoPlanned}
          disabled={demoLoading}
          className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
        >
          {demoLoading ? (
            <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          ) : (
            <FiStar className="w-4 h-4" />
          )}
          Demo: Plan All Months (IATF & 5S)
        </button>
      </div>
    </div>
  </div>
)}

      {/* Main Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan="2" className="px-3 py-3 font-medium text-left text-gray-600 border-r">S. No.</th>
                <th rowSpan="2" className="px-3 py-3 font-medium text-left text-gray-600 border-r">Audit Elements</th>
                <th colSpan="12" className="px-2 py-2 font-medium text-center text-gray-600 border-r">Financial Year {selectedYear} - {selectedYear + 1}</th>
              </tr>
              <tr className="border-b border-gray-200">
                {financialMonths.map(month => (
                  <th key={month} className="px-2 py-2 text-xs font-medium text-center text-gray-500">{month}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
  {planData.map((element, elementIndex) => {
    // Create a map of month to status for easier lookup
    const monthStatusMap = {};
    element?.months?.forEach(month => {
      monthStatusMap[month.month] = month.status;
    });
    
    return (
      <tr key={elementIndex} className="hover:bg-gray-50">
        <td className="px-3 py-3 text-center text-gray-600">{elementIndex + 1}</td>
        <td className="px-3 py-3 font-medium text-gray-800">{element?.auditElement}</td>
        {financialMonths.map((financialMonth, displayIndex) => {
          // Get status directly from the map using the month name
          const status = monthStatusMap[financialMonth] || '';
          
          return (
            <td key={displayIndex} className="px-2 py-2 text-center">
              {canEdit ? (
                <button
                  onClick={() => handleStatusChange(elementIndex, financialMonth)}
                  className="cursor-pointer hover:scale-110 transition-transform"
                >
                  {getStatusBadge(status)}
                </button>
              ) : (
                getStatusBadge(status)
              )}
             </td>
          );
        })}
       </tr>
    );
  })}
</tbody>
          </table>
        </div>
      </div>

      {/* Legend and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-gray-600">LEGEND:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-500">P - Planned</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-500">C - Completed</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
            <span className="text-gray-500">— - Not Planned</span>
          </span>
        </div>
        
        <div className="flex gap-3">
          {planData.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
              Export PDF
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
              ) : (
                <FiSave className="w-4 h-4" />
              )}
              Save Draft
            </button>
          )}
          
          {canSubmit && (
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              {planStatus === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
            </button>
          )}
          
          {canApprove && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <FiX className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <FiCheck className="w-4 h-4" />
                Approve
              </button>
            </div>
          )}

          {isTopManagement && planStatus === 'APPROVED' && (
            <button
              onClick={() => setShowChangeRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <FiMessageSquare className="w-4 h-4" />
              Request Changes
            </button>
          )}          
        </div>
      </div>

      {/* Comments History Section */}
      {(planInfo.approvalComments || rejectionReason || planInfo.rejectionReason || planInfo.approvedBy || planInfo.rejectedBy) && (
        <div className="p-4 mt-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
            <FiMessageSquare className="w-4 h-4" />
            Plan History & Comments
          </h3>
          <div className="space-y-3">
            {/* Approval Comment */}
            {planInfo.approvalComments && (
              <div className="pl-3 text-sm border-l-2 border-green-400">
                <div className="flex items-center gap-2 mb-1">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-700">Approval Comment</span>
                </div>
                <p className="ml-6 text-gray-600">{planInfo.approvalComments}</p>
                {planInfo.approvedBy && (
                  <p className="mt-1 ml-6 text-xs text-gray-400">
                    By: {planInfo.approvedBy} | Date: {planInfo.approvedAt && new Date(planInfo.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Rejection Comment */}
            {(rejectionReason || planInfo.rejectionReason) && planStatus === 'REJECTED' && (
              <div className="pl-3 text-sm border-l-2 border-red-400">
                <div className="flex items-center gap-2 mb-1">
                  <FiX className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-700">Rejection Reason</span>
                </div>
                <p className="ml-6 text-gray-600">{rejectionReason || planInfo.rejectionReason}</p>
                {planInfo.rejectedBy && (
                  <p className="mt-1 ml-6 text-xs text-gray-400">
                    By: {planInfo.rejectedBy} | Date: {planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Change Request Comment */}
            {(rejectionReason || planInfo.rejectionReason) && planStatus === 'CHANGE_REQUESTED' && (
              <div className="pl-3 text-sm border-l-2 border-orange-400">
                <div className="flex items-center gap-2 mb-1">
                  <FiMessageSquare className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-orange-700">Change Request</span>
                </div>
                <p className="ml-6 text-gray-600">{rejectionReason || planInfo.rejectionReason}</p>
              </div>
            )}
            
            {/* No comments message */}
            {!planInfo.approvalComments && !rejectionReason && !planInfo.rejectionReason && (
              <p className="text-sm italic text-gray-400">No comments available</p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 mt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Prepared By</p>
            <p className="text-sm font-medium text-gray-800">{planInfo.preparedBy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved By</p>
            <p className="text-sm font-medium text-gray-800">
              {planInfo.approvedBy || (planStatus === 'APPROVED' ? 'Pending' : 'Not Approved')}
            </p>
            {planInfo.approvedAt && (
              <p className="text-xs text-gray-400">{new Date(planInfo.approvedAt).toLocaleDateString()}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="text-sm font-medium text-gray-800">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">Approve Plan</h3>
            <p className="mb-4 text-sm text-gray-600">Please provide approval comments:</p>
            <textarea
              value={tempApprovalComment}
              onChange={(e) => setTempApprovalComment(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-500"
              placeholder="Enter approval comments..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setTempApprovalComment('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting || !tempApprovalComment.trim()}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <FiCheck className="w-4 h-4" />
                )}
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">Reject Plan</h3>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejection:</p>
            <textarea
              value={tempRejectionReason}
              onChange={(e) => setTempRejectionReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setTempRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !tempRejectionReason.trim()}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <FiX className="w-4 h-4" />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Request Changes - Annual Plan {selectedYear}
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Please provide details about what changes are needed:
            </p>
            <textarea
              value={changeRequestReason}
              onChange={(e) => setChangeRequestReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Describe the changes required..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowChangeRequestModal(false);
                  setChangeRequestReason('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <FiMessageSquare className="w-4 h-4" />
                )}
                Submit Change Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form3View;
