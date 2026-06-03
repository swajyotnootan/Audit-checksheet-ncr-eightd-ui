
​// src/components/forms/Form4View.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { 
  FiSave, FiRefreshCw, FiCheckCircle, FiClock, 
  FiFileText, FiCheck, FiChevronDown, FiChevronUp,
  FiCalendar, FiFilter, FiAlertCircle, FiRepeat,
  FiEdit2, FiSend, FiX, FiInfo, FiCheckSquare,
  FiPlus, FiMinus, FiTrash2, FiMessageSquare, FiStar
} from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';


const API_BASE = 'http://localhost:8080/api';

const Form4View = () => {
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false); // Add demo loading state
  const [planData, setPlanData] = useState([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [auditFrequency, setAuditFrequency] = useState('Half yearly');
  const [documentRevision, setDocumentRevision] = useState('1.0');
  const [revisionDate, setRevisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [revisionDetails, setRevisionDetails] = useState('First Approved copy (IATF16949)');
  const [auditElementsFromForm3, setAuditElementsFromForm3] = useState({});
  const [expandedDept, setExpandedDept] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMonthForElements, setSelectedMonthForElements] = useState(null);
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
    preparedByPosition: 'Audit Manager',
    approvedByPosition: 'Top Management',
    approvalComments: '',
    rejectedBy: '',
    rejectedAt: null,
    rejectionReason: ''
  });

  // 13 Departments
  const departments = [
    "HR", "R&D", "Purchase", "RMS", "SQA", "PPC", 
    "Production", "QA/QC", "FGS", "Marketing", "IMS (BE)", 
    "Maintenance", "Management"
  ];

  // Months (Financial Year)
  const months = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep", 
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
  ];

  // Month display mapping
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  // Quarter mapping
  const getQuarter = (month) => {
    const quarters = {
      "Apr": "Q1", "May": "Q1", "Jun": "Q1",
      "Jul": "Q2", "Aug": "Q2", "Sep": "Q2",
      "Oct": "Q3", "Nov": "Q3", "Dec": "Q3",
      "Jan": "Q4", "Feb": "Q4", "Mar": "Q4"
    };
    return quarters[month];
  };

  // Helper function to get audit elements for a specific month
// Update the getAuditElementsForMonth function (around line 100-120)
const getAuditElementsForMonth = (month) => {
  // Based on Form3 data, return appropriate audit elements
  // Prioritize IATF16949 and 5S for demo purposes
  const elementMapping = {
    "Apr": ["5S Audit", "System Audit (ISO9001)"],
    "May": ["System Audit (IATF16949)", "Process Audit"],
    "Jun": ["System Audit (IATF16949)", "5S Audit", "Product Audit"],
    "Jul": ["5S Audit", "System Audit (IATF16949)"],
    "Aug": ["Process Audit", "Product Audit"],
    "Sep": ["System Audit (ISO9001)", "5S Audit"],
    "Oct": ["System Audit (IATF16949)", "Process Audit"],
    "Nov": ["Product Audit", "System Audit (ISO9001)"],
    "Dec": ["5S Audit", "System Audit (IATF16949)"],
    "Jan": ["Process Audit", "Product Audit"],
    "Feb": ["System Audit (ISO9001)", "5S Audit"],
    "Mar": ["System Audit (IATF16949)", "Process Audit", "Product Audit"]
  };
  return elementMapping[month] || [];
};

 // Add this helper function at the top with other helper functions
const isRelevantForDemo = (auditElement) => {
  // Only IATF16949 and 5S audits are relevant for demo
  return auditElement.includes("IATF16949") || auditElement.includes("5S Audit");
};

// Replace the handleDemoPlanned function
const handleDemoPlanned = async () => {
  // Check if user can edit
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  setDemoLoading(true);
  try {
    // Create a deep copy of the current plan data
    const newPlanData = [...planData];
    
    // For each department, mark only months with relevant audit elements (IATF & 5S)
    let totalPlannedCount = 0;
    let totalElementsAdded = 0;
    
    newPlanData.forEach((dept, deptIndex) => {
      dept.months.forEach((month, monthIndex) => {
        // Get audit elements for this month from Form3
        const availableElements = getAuditElementsForMonth(month.month);
        
        // Filter to only IATF16949 and 5S audits
        const relevantElements = availableElements.filter(el => isRelevantForDemo(el));
        
        if (relevantElements.length > 0 && month.status !== 'PLANNED') {
          // Set status to PLANNED
          month.status = 'PLANNED';
          totalPlannedCount++;
          
          // Add only relevant audit elements if not already present
          const currentElements = month.selectedElements || [];
          const newElements = relevantElements.filter(el => !currentElements.includes(el));
          
          if (newElements.length > 0) {
            month.selectedElements = [...currentElements, ...newElements];
            totalElementsAdded += newElements.length;
          }
        }
      });
    });
    
    // Update state
    setPlanData(newPlanData);
    
    // Automatically save after demo planned
    const saveData = {
      planYear: selectedYear,
      planItems: newPlanData,
      approvalStatus: 'DRAFT',
      auditFrequency: auditFrequency,
      documentRevision: documentRevision,
      revisionDate: revisionDate,
      revisionDetails: revisionDetails,
      preparedBy: planInfo.preparedBy
    };
    
    await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, saveData, {
      withCredentials: true
    });
    
    addToast(`✅ Demo mode: ${totalPlannedCount} months marked as PLANNED with ${totalElementsAdded} IATF16949 & 5S audit elements added!`, 'success');
    
    // Refresh data to ensure sync with backend
    await fetchPlanData();
    
  } catch (error) {
    console.error('Error in demo planned:', error);
    addToast('Failed to mark audits as planned', 'error');
  } finally {
    setDemoLoading(false);
  }
};

// Replace the handleQuickPlanned function
// Replace the handleQuickPlanned function
const handleQuickPlanned = async () => {
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  setDemoLoading(true);
  try {
    const newPlanData = [...planData];
    
    // Mark only first quarter (Apr, May, Jun) as PLANNED for IATF & 5S audits
    const firstQuarterMonths = ["Apr", "May", "Jun"];
    let totalPlannedCount = 0;
    let totalElementsAdded = 0;
    let monthsWithIssues = [];
    
    newPlanData.forEach((dept, deptIndex) => {
      dept.months.forEach((month, monthIndex) => {
        if (firstQuarterMonths.includes(month.month)) {
          const availableElements = getAuditElementsForMonth(month.month);
          const relevantElements = availableElements.filter(el => isRelevantForDemo(el));
          
          // If no relevant elements found for this month, try to assign default IATF/5S
          let elementsToAdd = [...relevantElements];
          
          if (elementsToAdd.length === 0) {
            // Assign default IATF16949 or 5S based on month
            if (month.month === "Apr") {
              elementsToAdd = ["5S Audit"];
            } else if (month.month === "May") {
              elementsToAdd = ["System Audit (IATF16949)"];
            } else if (month.month === "Jun") {
              elementsToAdd = ["System Audit (IATF16949)", "5S Audit"];
            }
          }
          
          if (elementsToAdd.length > 0) {
            if (month.status !== 'PLANNED') {
              month.status = 'PLANNED';
              totalPlannedCount++;
            }
            
            const currentElements = month.selectedElements || [];
            const newElements = elementsToAdd.filter(el => !currentElements.includes(el));
            
            if (newElements.length > 0) {
              month.selectedElements = [...currentElements, ...newElements];
              totalElementsAdded += newElements.length;
            }
          } else {
            monthsWithIssues.push(month.month);
          }
        }
      });
    });
    
    setPlanData(newPlanData);
    
    const saveData = {
      planYear: selectedYear,
      planItems: newPlanData,
      approvalStatus: 'DRAFT',
      auditFrequency: auditFrequency,
      documentRevision: documentRevision,
      revisionDate: revisionDate,
      revisionDetails: revisionDetails,
      preparedBy: planInfo.preparedBy
    };
    
    await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, saveData, {
      withCredentials: true
    });
    
    let message = `✅ Quick plan: ${totalPlannedCount} months marked as PLANNED for Q1 (Apr-Jun) with ${totalElementsAdded} IATF16949 & 5S elements added`;
    if (monthsWithIssues.length > 0) {
      message += `. Note: ${monthsWithIssues.join(', ')} had no default audit types assigned.`;
    }
    addToast(message, 'success');
    await fetchPlanData();
    
  } catch (error) {
    console.error('Error in quick planned:', error);
    addToast('Failed to mark audits as planned', 'error');
  } finally {
    setDemoLoading(false);
  }
};

// Replace the handlePlanCurrentQuarter function
const handlePlanCurrentQuarter = async () => {
  if (!canEdit) {
    addToast('You cannot modify this plan in its current status', 'warning');
    return;
  }

  setDemoLoading(true);
  try {
    const newPlanData = [...planData];
    
    // Determine current quarter based on current date
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
    let currentQuarterMonths = [];
    
    // Map current month to its quarter
    if (["Apr", "May", "Jun"].includes(currentMonth)) {
      currentQuarterMonths = ["Apr", "May", "Jun"];
    } else if (["Jul", "Aug", "Sep"].includes(currentMonth)) {
      currentQuarterMonths = ["Jul", "Aug", "Sep"];
    } else if (["Oct", "Nov", "Dec"].includes(currentMonth)) {
      currentQuarterMonths = ["Oct", "Nov", "Dec"];
    } else {
      currentQuarterMonths = ["Jan", "Feb", "Mar"];
    }
    
    let totalPlannedCount = 0;
    let totalElementsAdded = 0;
    
    newPlanData.forEach((dept, deptIndex) => {
      dept.months.forEach((month, monthIndex) => {
        if (currentQuarterMonths.includes(month.month)) {
          const availableElements = getAuditElementsForMonth(month.month);
          const relevantElements = availableElements.filter(el => isRelevantForDemo(el));
          
          if (relevantElements.length > 0 && month.status !== 'PLANNED') {
            month.status = 'PLANNED';
            totalPlannedCount++;
            
            const currentElements = month.selectedElements || [];
            const newElements = relevantElements.filter(el => !currentElements.includes(el));
            
            if (newElements.length > 0) {
              month.selectedElements = [...currentElements, ...newElements];
              totalElementsAdded += newElements.length;
            }
          }
        }
      });
    });
    
    setPlanData(newPlanData);
    
    const saveData = {
      planYear: selectedYear,
      planItems: newPlanData,
      approvalStatus: 'DRAFT',
      auditFrequency: auditFrequency,
      documentRevision: documentRevision,
      revisionDate: revisionDate,
      revisionDetails: revisionDetails,
      preparedBy: planInfo.preparedBy
    };
    
    await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, saveData, {
      withCredentials: true
    });
    
    addToast(`✅ Current quarter plan: ${totalPlannedCount} months marked as PLANNED for ${currentQuarterMonths.join(', ')} with ${totalElementsAdded} IATF16949 & 5S elements added`, 'success');
    await fetchPlanData();
    
  } catch (error) {
    console.error('Error in current quarter plan:', error);
    addToast('Failed to mark audits as planned', 'error');
  } finally {
    setDemoLoading(false);
  }
};

  // Fetch Form 3 data
  const fetchForm3Data = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-plan/${selectedYear}`, {
        withCredentials: true
      });
      
      const elementsByMonth = {};
      months.forEach(month => { elementsByMonth[month] = []; });
      
      if (response.data && response.data.planItems) {
        response.data.planItems.forEach(element => {
          if (element && element.months) {
            element.months.forEach(monthData => {
              if (monthData && monthData.status === 'PLANNED' && monthData.month) {
                if (!elementsByMonth[monthData.month]) {
                  elementsByMonth[monthData.month] = [];
                }
                if (!elementsByMonth[monthData.month].includes(element.auditElement)) {
                  elementsByMonth[monthData.month].push(element.auditElement);
                }
              }
            });
          }
        });
      }
      
      setAuditElementsFromForm3(elementsByMonth);
    } catch (error) {
      console.error('Error fetching Form 3 data:', error);
      const emptyElements = {};
      months.forEach(month => { emptyElements[month] = []; });
      setAuditElementsFromForm3(emptyElements);
    }
  };

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}`, {
        withCredentials: true
      });
      
      if (response.data && response.data.planItems && response.data.planItems.length > 0) {
        setPlanData(response.data.planItems);
        setPlanStatus(response.data.approvalStatus || 'DRAFT');
        setPlanInfo({
          preparedBy: response.data.preparedBy || user?.name || user?.username,
          approvedBy: response.data.approvedBy || '',
          approvedAt: response.data.approvedAt || null,
          preparedByPosition: 'Audit Manager',
          approvedByPosition: 'Top Management',
          approvalComments: response.data.approvalComments || '',
          rejectedBy: response.data.rejectedBy || '',
          rejectedAt: response.data.rejectedAt || null,
          rejectionReason: response.data.rejectionReason || ''
        });
        if (response.data.rejectionReason) {
          setRejectionReason(response.data.rejectionReason);
        }
        setAuditFrequency(response.data.auditFrequency || 'Half yearly');
        setDocumentRevision(response.data.documentRevision || '1.0');
        setRevisionDate(response.data.revisionDate || new Date().toISOString().split('T')[0]);
        setRevisionDetails(response.data.revisionDetails || 'First Approved copy (IATF16949)');
      } else {
        const emptyPlanData = departments.map(dept => ({
          department: dept,
          months: months.map(month => ({
            month: month,
            status: '',
            selectedElements: []
          }))
        }));
        setPlanData(emptyPlanData);
        setPlanStatus('DRAFT');
        setPlanInfo({
          preparedBy: user?.name || user?.username,
          approvedBy: '',
          approvedAt: null,
          preparedByPosition: 'Audit Manager',
          approvedByPosition: 'Top Management',
          approvalComments: '',
          rejectedBy: '',
          rejectedAt: null,
          rejectionReason: ''
        });
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      addToast('Failed to load department plan data', 'error');
      const emptyPlanData = departments.map(dept => ({
        department: dept,
        months: months.map(month => ({
          month: month,
          status: '',
          selectedElements: []
        }))
      }));
      setPlanData(emptyPlanData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlYear) {
      const newYear = parseInt(urlYear);
      setSelectedYear(newYear);
    }
  }, [urlYear]);
  
  // Populate available years on mount
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);
  
  useEffect(() => {
    const loadData = async () => {
      await fetchForm3Data();
      await fetchPlanData();
    };
    loadData();
  }, [selectedYear]);

  const handleElementToggle = (deptIndex, month, element) => {
    if (planStatus !== 'DRAFT' && planStatus !== 'REJECTED' && planStatus !== 'CHANGE_REQUESTED') {
      addToast('Only draft or rejected plans can be modified', 'warning');
      return;
    }

    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const currentSelected = newPlanData[deptIndex].months[monthIndex].selectedElements || [];
      
      if (currentSelected.includes(element)) {
        newPlanData[deptIndex].months[monthIndex].selectedElements = currentSelected.filter(e => e !== element);
      } else {
        newPlanData[deptIndex].months[monthIndex].selectedElements = [...currentSelected, element];
      }
      
      if (newPlanData[deptIndex].months[monthIndex].selectedElements.length > 0 && 
          newPlanData[deptIndex].months[monthIndex].status === '') {
        newPlanData[deptIndex].months[monthIndex].status = 'PLANNED';
      } else if (newPlanData[deptIndex].months[monthIndex].selectedElements.length === 0) {
        newPlanData[deptIndex].months[monthIndex].status = '';
      }
      
      setPlanData(newPlanData);
    }
  };

  const handleAddElementsToMonth = (deptIndex, month, selectedElements) => {
    if (planStatus !== 'DRAFT' && planStatus !== 'REJECTED' && planStatus !== 'CHANGE_REQUESTED') {
      addToast('Only draft or rejected plans can be modified', 'warning');
      return;
    }

    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const currentSelected = newPlanData[deptIndex].months[monthIndex].selectedElements || [];
      const updatedSelected = [...new Set([...currentSelected, ...selectedElements])];
      newPlanData[deptIndex].months[monthIndex].selectedElements = updatedSelected;
      
      if (updatedSelected.length > 0 && newPlanData[deptIndex].months[monthIndex].status === '') {
        newPlanData[deptIndex].months[monthIndex].status = 'PLANNED';
      }
      
      setPlanData(newPlanData);
      setSelectedMonthForElements(null);
      addToast(`Added ${selectedElements.length} element(s) to ${monthDisplay[month]}`, 'success');
    }
  };

  const handleMonthStatusChange = (deptIndex, month) => {
    if (planStatus !== 'DRAFT' && planStatus !== 'REJECTED' && planStatus !== 'CHANGE_REQUESTED') {
      addToast('Only draft or rejected plans can be modified', 'warning');
      return;
    }

    const newPlanData = [...planData];
    const monthIndex = newPlanData[deptIndex].months.findIndex(m => m.month === month);
    if (monthIndex !== -1) {
      const currentStatus = newPlanData[deptIndex].months[monthIndex].status || '';
      const hasElements = newPlanData[deptIndex].months[monthIndex].selectedElements?.length > 0;
      
      if (!hasElements && currentStatus === '') {
        addToast('Please select audit elements first', 'warning');
        return;
      }
      
      let newStatus;
      if (currentStatus === '') {
        newStatus = 'PLANNED';
      } else if (currentStatus === 'PLANNED') {
        newStatus = 'COMPLETED';
      } else if (currentStatus === 'COMPLETED') {
        newStatus = 'RESCHEDULED';
      } else {
        newStatus = '';
      }
      
      newPlanData[deptIndex].months[monthIndex].status = newStatus;
      setPlanData(newPlanData);
    }
  };

  const handleSave = async () => {
    if (planStatus !== 'DRAFT' && planStatus !== 'REJECTED' && planStatus !== 'CHANGE_REQUESTED') {
      addToast('Only draft, rejected, or change requested plans can be saved', 'warning');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: 'DRAFT',
        auditFrequency: auditFrequency,
        documentRevision: documentRevision,
        revisionDate: revisionDate,
        revisionDetails: revisionDetails,
        preparedBy: planInfo.preparedBy
      };
      
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, saveData, {
        withCredentials: true
      });
      
      addToast('Department audit plan saved as DRAFT!', 'success');
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
    planData.forEach(dept => {
      dept.months.forEach(month => {
        if (month.status === 'PLANNED') hasPlanned = true;
      });
    });

    if (!hasPlanned) {
      addToast('Please mark at least one department-month as PLANNED before submitting', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const saveData = {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: 'PENDING_APPROVAL',
        auditFrequency: auditFrequency,
        documentRevision: documentRevision,
        revisionDate: revisionDate,
        revisionDetails: revisionDetails,
        preparedBy: planInfo.preparedBy
      };
      
      await axios.post(`${API_BASE}/department-plan/save?userId=${user?.id}`, saveData, {
        withCredentials: true
      });
      
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/submit?userId=${user?.id}`, {}, {
        withCredentials: true
      });
      
      addToast('Plan submitted for approval successfully!', 'success');
      await fetchPlanData();
    } catch (error) {
      console.error('Error submitting plan:', error);
      addToast('Failed to submit plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast('Please provide approval comments', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/approve?userId=${user?.id}`, {
        comments: tempApprovalComment
      }, {
        withCredentials: true
      });
      
      setPlanStatus('APPROVED');
      setPlanInfo(prev => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedBy: user?.name || user?.username,
        approvedAt: new Date().toISOString()
      }));
      setShowApproveModal(false);
      setTempApprovalComment('');
      addToast('Plan approved successfully!', 'success');
      fetchPlanData();
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
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/reject?userId=${user?.id}`, {
        reason: tempRejectionReason
      }, {
        withCredentials: true
      });
      
      setPlanStatus('REJECTED');
      setRejectionReason(tempRejectionReason);
      setPlanInfo(prev => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedBy: user?.name || user?.username,
        rejectedAt: new Date().toISOString()
      }));
      setShowRejectModal(false);
      setTempRejectionReason('');
      addToast('Plan rejected', 'error');
      fetchPlanData();
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
      await axios.post(`${API_BASE}/department-plan/${selectedYear}/request-changes?userId=${user?.id}`, {
        reason: changeRequestReason
      }, { withCredentials: true });
      
      addToast(`Change request submitted for Department Plan ${selectedYear}`, 'warning');
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

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/department-plan/${selectedYear}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Form4_Internal_Quality_Audit_Plan_${selectedYear}_${selectedYear + 1}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      addToast('Failed to download PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMonthStatusBadge = (status, hasElements) => {
    if (status === 'COMPLETED') {
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 border-2 border-green-500 rounded-full">
            <FiCheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <span className="mt-1 text-xs font-medium text-green-600">C</span>
        </div>
      );
    }
    if (status === 'PLANNED') {
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 border-2 border-blue-500 rounded-full">
            <FiClock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="mt-1 text-xs font-medium text-blue-600">P</span>
        </div>
      );
    }
    if (status === 'RESCHEDULED') {
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 border-2 border-orange-500 rounded-full">
            <FiRepeat className="w-4 h-4 text-orange-600" />
          </div>
          <span className="mt-1 text-xs font-medium text-orange-600">R</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed ${hasElements ? 'border-yellow-400' : 'border-gray-300'}`}>
          <span className="text-xs text-gray-400">—</span>
        </div>
        <span className="mt-1 text-xs text-gray-400">—</span>
      </div>
    );
  };

  const getPlanStatusBadge = () => {
    switch (planStatus) {
      case 'APPROVED':
        return <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">✓ Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">⏳ Pending Approval</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">✗ Rejected</span>;
      case 'CHANGE_REQUESTED':
        return <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
          <FiMessageSquare className="w-3 h-3" /> Changes Requested
        </span>;
      default:
        return <span className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">📝 Draft</span>;
    }
  };

  const getAvailableElementsForMonth = (month) => {
    return auditElementsFromForm3[month] || getAuditElementsForMonth(month);
  };

  let totalPlanned = 0;
  let totalCompleted = 0;
  let totalRescheduled = 0;
  let totalDepartmentsWithPlan = 0;
  
  if (planData && planData.length > 0) {
    planData.forEach(dept => {
      let deptHasPlan = false;
      if (dept && dept.months) {
        dept.months.forEach(month => {
          if (month.status === 'PLANNED') {
            totalPlanned++;
            deptHasPlan = true;
          }
          if (month.status === 'COMPLETED') {
            totalCompleted++;
            deptHasPlan = true;
          }
          if (month.status === 'RESCHEDULED') {
            totalRescheduled++;
            deptHasPlan = true;
          }
        });
      }
      if (deptHasPlan) totalDepartmentsWithPlan++;
    });
  }
  
  const totalAudits = departments.length * 12;
  const completionRate = totalAudits > 0 ? ((totalCompleted / totalAudits) * 100).toFixed(1) : 0;

  const canEdit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED'));
  const canSubmit = (isAuditManager && (planStatus === 'DRAFT' || planStatus === 'REJECTED' || planStatus === 'CHANGE_REQUESTED') && totalPlanned > 0);
  const canApprove = (isTopManagement && planStatus === 'PENDING_APPROVAL');

  const filteredDepartments = planData.filter(dept => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'planned') {
      return dept.months.some(m => m.status === 'PLANNED');
    }
    if (filterStatus === 'completed') {
      return dept.months.some(m => m.status === 'COMPLETED');
    }
    if (filterStatus === 'rescheduled') {
      return dept.months.some(m => m.status === 'RESCHEDULED');
    }
    if (filterStatus === 'pending') {
      return dept.months.some(m => m.status === '');
    }
    return true;
  });

  const ElementSelectionPanel = ({ deptIndex, month, availableElements, selectedElements, onClose }) => {
    const [tempSelected, setTempSelected] = useState([...selectedElements]);
    const availableNotSelected = availableElements.filter(el => !tempSelected.includes(el));
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Select Audit Elements for {monthDisplay[month]}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6">
            {tempSelected.length > 0 && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Selected Elements ({tempSelected.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {tempSelected.map(el => (
                    <span key={el} className="inline-flex items-center gap-1 px-2 py-1 text-sm text-green-700 bg-green-100 rounded-md">
                      {el}
                      <button
                        onClick={() => setTempSelected(tempSelected.filter(e => e !== el))}
                        className="hover:text-green-900"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {availableNotSelected.length > 0 && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Add More Elements
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setTempSelected([...tempSelected, e.target.value]);
                      e.target.value = '';
                    }
                  }}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  value=""
                >
                  <option value="">-- Select an audit element --</option>
                  {availableNotSelected.map(el => (
                    <option key={el} value={el}>{el}</option>
                  ))}
                </select>
              </div>
            )}
            
            {availableElements.length === 0 && (
              <div className="py-4 text-center text-gray-500">
                <FiAlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No audit elements planned for this month in Form 3</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleAddElementsToMonth(deptIndex, month, tempSelected);
                onClose();
              }}
              className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Save Elements
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <FiCalendar className="w-6 h-6 text-purple-600" />
              Annual Internal Quality Audit Plan
            </h1>
            <p className="mt-1 text-sm text-gray-500">Form 4 - Department-wise Audit Planning (Financial Year)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              {getPlanStatusBadge()}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
              disabled={planStatus === 'PENDING_APPROVAL'}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} - {year + 1}</option>
              ))}
            </select>
            <button
              onClick={() => {
                fetchForm3Data();
                fetchPlanData();
              }}
              className="p-2 text-gray-500 transition-colors rounded-lg hover:text-purple-600"
              title="Refresh"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={loading}
              className="p-2 text-green-600 transition-colors rounded-lg hover:text-green-700"
              title="Download PDF"
            >
              <FiFileText className="w-5 h-5" />
            </button>
          </div>
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
          <p className="text-sm text-purple-700">Auto-plan IATF16949 & 5S audits only (others remain unchanged)</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handlePlanCurrentQuarter}
          disabled={demoLoading}
          className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {demoLoading ? (
            <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
          ) : (
            <FiCalendar className="w-4 h-4" />
          )}
          Plan Current Quarter (IATF & 5S)
        </button>
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
          Quick Plan Q1 (IATF & 5S)
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

      {/* ========== COMMENTS DISPLAY SECTION ========== */}
      {/* Approval Comments Display */}
      {planStatus === 'APPROVED' && planInfo.approvalComments && (
        <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-start gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Approval Comments</p>
              <p className="text-sm text-green-600">{planInfo.approvalComments}</p>
              {planInfo.approvedBy && (
                <p className="mt-1 text-xs text-green-500">
                  Approved by: {planInfo.approvedBy} | Date: {planInfo.approvedAt && new Date(planInfo.approvedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Request Comments Display */}
      {planStatus === 'CHANGE_REQUESTED' && planInfo.rejectionReason && (
        <div className="p-3 mb-4 border border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-start gap-2">
            <FiMessageSquare className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800">Change Request Comments</p>
              <p className="text-sm text-orange-600">{planInfo.rejectionReason}</p>
              {planInfo.rejectedBy && (
                <p className="mt-1 text-xs text-orange-500">
                  Requested by: {planInfo.rejectedBy} | Date: {planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}
                </p>
              )}
              <p className="mt-1 text-xs text-orange-500">Please review the requested changes and update the plan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Comments Display */}
      {planStatus === 'REJECTED' && planInfo.rejectionReason && (
        <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start gap-2">
            <FiX className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="text-sm text-red-600">{planInfo.rejectionReason}</p>
              {planInfo.rejectedBy && (
                <p className="mt-1 text-xs text-red-500">
                  Rejected by: {planInfo.rejectedBy} | Date: {planInfo.rejectedAt && new Date(planInfo.rejectedAt).toLocaleString()}
                </p>
              )}
              <p className="mt-1 text-xs text-red-500">Please make necessary corrections and resubmit.</p>
            </div>
          </div>
        </div>
      )}

      {/* Form 3 Summary Card */}
      <div className="p-5 mb-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-blue-800">
          <FiFileText className="w-4 h-4" />
          📋 Form 3 - Planned Audit Types for {selectedYear}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {months.map(month => {
            const elements = getAvailableElementsForMonth(month);
            return (
              <div key={month} className="p-2 border border-blue-100 rounded-lg bg-white/70">
                <div className="text-sm font-semibold text-blue-700">{monthDisplay[month]} <span className="text-xs text-gray-400">({getQuarter(month)})</span></div>
                {elements && elements.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {elements.map(el => (
                      <span key={el} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{el.split('(')[0]}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No audits planned</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-6">
        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xs text-gray-500">Departments</p>
          <p className="text-2xl font-bold text-gray-800">{departments.length}</p>
          <p className="text-xs text-green-600">{totalDepartmentsWithPlan} with active plans</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xs text-gray-500">Planned (P)</p>
          <p className="text-2xl font-bold text-blue-600">{totalPlanned}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xs text-green-600">Completed (C)</p>
          <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xs text-orange-600">Rescheduled (R)</p>
          <p className="text-2xl font-bold text-orange-600">{totalRescheduled}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-xs text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{totalPlanned + totalRescheduled - totalCompleted}</p>
        </div>
        <div className="p-4 border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
          <p className="text-xs text-purple-600">Completion Rate</p>
          <p className="text-2xl font-bold text-purple-700">{completionRate}%</p>
          <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filter by status:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('planned')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterStatus === 'planned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Planned (P)
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Completed (C)
            </button>
            <button
              onClick={() => setFilterStatus('rescheduled')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterStatus === 'rescheduled' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Rescheduled (R)
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Pending
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Showing {filteredDepartments.length} of {departments.length} departments
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th rowSpan="2" className="w-32 px-4 py-3 font-semibold text-left text-gray-700 border-r">Audit Area</th>
                <th colSpan="12" className="px-2 py-2 font-semibold text-center text-gray-700">Months (Financial Year)</th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                {months.map(month => (
                  <th key={month} className="w-24 px-2 py-2 text-xs font-medium text-center text-gray-600">
                    {monthDisplay[month]}
                    <span className="block text-[10px] text-gray-400">{getQuarter(month)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept, idx) => {
                  const originalIndex = planData.findIndex(d => d.department === dept.department);
                  const hasAnySelected = dept.months?.some(m => m.selectedElements && m.selectedElements.length > 0);
                  
                  return (
                    <React.Fragment key={dept.department}>
                      <tr className="transition-colors hover:bg-gray-50">
                        <td className="sticky left-0 px-4 py-3 font-medium text-gray-800 bg-white border-r">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedDept(expandedDept === originalIndex ? null : originalIndex)}
                              className="text-gray-400 transition-colors hover:text-gray-600"
                            >
                              {expandedDept === originalIndex ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                            <span>{dept.department}</span>
                            {hasAnySelected && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">✓</span>
                            )}
                          </div>
                        </td>
                        {dept.months && dept.months.map((month, monthIdx) => {
                          const selectedElementsCount = month.selectedElements?.length || 0;
                          const availableElements = getAvailableElementsForMonth(month.month);
                          const hasElements = selectedElementsCount > 0;
                          
                          return (
                            <td key={monthIdx} className="px-2 py-2 text-center border-r last:border-r-0">
                              <div className="flex flex-col items-center gap-1">
                                {canEdit ? (
                                  <button
                                    onClick={() => handleMonthStatusChange(originalIndex, month.month)}
                                    className="transition-transform cursor-pointer hover:scale-105 focus:outline-none"
                                    title={!hasElements ? "Select audit elements first" : month.status === 'PLANNED' ? "Mark as Completed" : month.status === 'COMPLETED' ? "Mark as Rescheduled" : month.status === 'RESCHEDULED' ? "Reset" : "Mark as Planned"}
                                  >
                                    {getMonthStatusBadge(month.status, hasElements)}
                                  </button>
                                ) : (
                                  getMonthStatusBadge(month.status, hasElements)
                                )}
                                
                                <div className="text-center">
                                  {hasElements ? (
                                    <button
                                      onClick={() => canEdit && setSelectedMonthForElements({ deptIndex: originalIndex, month: month.month })}
                                      className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                                      disabled={!canEdit}
                                    >
                                      <FiCheckSquare className="w-3 h-3" />
                                      {selectedElementsCount} element{selectedElementsCount !== 1 ? 's' : ''}
                                    </button>
                                  ) : (
                                    canEdit && availableElements.length > 0 && (
                                      <button
                                        onClick={() => setSelectedMonthForElements({ deptIndex: originalIndex, month: month.month })}
                                        className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-purple-600"
                                      >
                                        <FiPlus className="w-3 h-3" />
                                        Add Elements
                                      </button>
                                    )
                                  )}
                                  {!hasElements && availableElements.length === 0 && (
                                    <span className="text-xs text-gray-300">No elements</span>
                                  )}
                                </div>
                              </div>
                             </td>
                          );
                        })}
                      </tr>
                      
                      {expandedDept === originalIndex && (
                        <tr className="bg-gray-50">
                          <td colSpan="13" className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                              {dept.months.map((month, monthIdx) => {
                                const selectedElements = month.selectedElements || [];
                                if (selectedElements.length === 0) return null;
                                
                                return (
                                  <div key={monthIdx} className="p-3 bg-white border border-gray-200 rounded-lg">
                                    <div className="mb-2 text-sm font-semibold text-gray-700">
                                      {monthDisplay[month.month]}
                                      <span className="ml-2 text-xs text-gray-400">({getQuarter(month.month)})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedElements.map(el => (
                                        <span key={el} className="px-2 py-1 text-xs text-purple-700 bg-purple-100 rounded-full">
                                          {el}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                           </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-gray-400">
                    <FiFileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No departments match the selected filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Element Selection Modal */}
      {selectedMonthForElements && canEdit && (
        <ElementSelectionPanel
          deptIndex={selectedMonthForElements.deptIndex}
          month={selectedMonthForElements.month}
          availableElements={getAvailableElementsForMonth(selectedMonthForElements.month)}
          selectedElements={planData[selectedMonthForElements.deptIndex]?.months.find(m => m.month === selectedMonthForElements.month)?.selectedElements || []}
          onClose={() => setSelectedMonthForElements(null)}
        />
      )}

      {/* Legend Section */}
      <div className="p-4 mt-6 border border-gray-200 rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Legend - Audit Elements codes</h4>
            <div className="flex flex-wrap gap-3">
              <span className="text-sm text-gray-600">A - System Audit (ISO9001)</span>
              <span className="text-sm text-gray-600">B - System Audit (IATF16949)</span>
              <span className="text-sm text-gray-600">C - 5S Audit</span>
              <span className="text-sm text-gray-600">D - Process Audit</span>
              <span className="text-sm text-gray-600">E - Product Audit</span>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Legend - Time activity codes</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 border-2 border-blue-500 rounded-full">
                  <FiClock className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">P - Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 bg-green-100 border-2 border-green-500 rounded-full">
                  <FiCheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">C - Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 bg-orange-100 border-2 border-orange-500 rounded-full">
                  <FiRepeat className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-sm text-gray-600">R - Rescheduled</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-3 mt-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs leading-relaxed text-gray-600">
            <span className="font-semibold">Audit Criteria:</span> ISO9001:2015 IATF16949 Standard, QMS Manual, QMS Procedures, WI, etc.<br />
            <span className="font-semibold">Audit Scope:</span> Applicable process within department/function and clause No. 4, 5, 6, 7, 8, 9 &amp; 10<br />
            <span className="font-semibold">Audit Method:</span> Interview with Auditee, Observation and verification to check compliance and achievement of planned results.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex gap-3">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Save Draft
                </>
              )}
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

      {/* Document Control Footer */}
      <div className="pt-4 mt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Document Control</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Document Title:</span>
                <span className="text-sm font-medium text-gray-800">Internal Quality audit Schedule sheet</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Document No.:</span>
                <span className="text-sm text-gray-800">IQA/F/04</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Revision:</span>
                <span className="text-sm text-gray-800">{documentRevision}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Revision Date:</span>
                <span className="text-sm text-gray-800">{revisionDate}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Revision Details:</span>
                <span className="text-sm text-gray-800">{revisionDetails}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Audit Frequency:</span>
                <select
                  value={auditFrequency}
                  onChange={(e) => setAuditFrequency(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
                  disabled={!canEdit}
                >
                  <option value="Half yearly">Half yearly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Approval</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Prepared By:</span>
                <div>
                  <span className="text-sm font-medium text-gray-800">{planInfo.preparedBy}</span>
                  <span className="ml-2 text-xs text-gray-400">({planInfo.preparedByPosition})</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Approved By:</span>
                <div>
                  {planStatus === 'APPROVED' ? (
                    <>
                      <span className="text-sm font-medium text-green-700">{planInfo.approvedBy || 'Pending'}</span>
                      <span className="ml-2 text-xs text-gray-400">({planInfo.approvedByPosition})</span>
                      {planInfo.approvedAt && (
                        <span className="ml-2 text-xs text-gray-400">on {new Date(planInfo.approvedAt).toLocaleDateString()}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">Not approved yet</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-500">Date:</span>
                <span className="text-sm text-gray-800">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
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
              Request Changes - Department Plan {selectedYear}
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

export default Form4View;
