// src/components/forms/ScheduleModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiUserCheck, FiUserPlus, FiInfo, FiAlertCircle, FiSearch, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090
/api';

// Department display name to enum mapping (for API calls)
const departmentDisplayToEnum = {
  "HR": "HR",
  "R&D": "ENGG",
  "Purchase": "PURCHASE",
  "RMS": "STORES_DESPATCH",
  "SQA": "QA",
  "PPC": "PPC",
  "Production": "PRODUCTION",
  "QA/QC": "QA",
  "FGS": "STORES_DESPATCH",
  "Marketing": "MARKETING",
  "IMS (BE)": "MR",
  "Maintenance": "PLANT_MAINTENANCE",
  "Management": "UNIT_HEAD",
  "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE",
  "Stores & Despatch": "STORES_DESPATCH"
};

const ScheduleModal = ({ 
  isOpen, onClose, onSave, formData, setFormData, 
  departments, deptPlanData, weeks, selectedMonth, monthDisplay,
  editingSchedule, saving, selectedYear
}) => {
  
  const weeksList = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
  
  // State for department-specific data
  const [departmentLeadAuditors, setDepartmentLeadAuditors] = useState([]);
  const [departmentTeamAuditors, setDepartmentTeamAuditors] = useState([]);
  const [departmentAuditees, setDepartmentAuditees] = useState([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [auditeeSearchTerm, setAuditeeSearchTerm] = useState('');
  const [coAuditorSearchTerm, setCoAuditorSearchTerm] = useState('');
  
  // Team selection state
  const [selectedLeadAuditor, setSelectedLeadAuditor] = useState('');
  const [selectedTeamAuditors, setSelectedTeamAuditors] = useState([]);
  const [teamAuditorNames, setTeamAuditorNames] = useState([]);
  
  // Co-Auditor state (same as Team Auditors - just for clarity)
  const [selectedCoAuditors, setSelectedCoAuditors] = useState([]);
  const [selectedCoAuditorNames, setSelectedCoAuditorNames] = useState([]);
  
  // Auditee multi-select state
  const [selectedAuditees, setSelectedAuditees] = useState([]);
  const [selectedAuditeeNames, setSelectedAuditeeNames] = useState([]);

  // Fetch department-specific users
  const fetchDepartmentUsers = useCallback(async (department) => {
    if (!department) {
      setDepartmentLeadAuditors([]);
      setDepartmentTeamAuditors([]);
      setDepartmentAuditees([]);
      return;
    }
    
    // Convert display name to enum value for API
    const enumValue = departmentDisplayToEnum[department] || department.toUpperCase().replace(/[&\s\/]+/g, '_');
    console.log(`🔍 Fetching users for: "${department}" → enum: "${enumValue}"`);
    
    setLoadingDepartmentUsers(true);
    try {
      // Fetch Lead Auditors for this department
      const leadRes = await axios.get(
        `${API_BASE}/audit-schedule/lead-auditors/by-department/${encodeURIComponent(enumValue)}`,
        { withCredentials: true }
      );
      setDepartmentLeadAuditors(leadRes.data || []);
      
      // Fetch Regular Auditors for this department (Team Auditors / Co-Auditors)
      const regularRes = await axios.get(
        `${API_BASE}/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`,
        { withCredentials: true }
      );
      setDepartmentTeamAuditors(regularRes.data || []);
      
      // Fetch Auditees for this department (HOD + AUDITEE)
      const auditeesRes = await axios.get(
        `${API_BASE}/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`,
        { withCredentials: true }
      );
      const filteredAuditees = (auditeesRes.data || []).filter(user => user.role !== 'HOD');
      setDepartmentAuditees(filteredAuditees);
 
      
      console.log(`✅ ${department}: ${leadRes.data?.length} Lead, ${regularRes.data?.length} Team, ${auditeesRes.data?.length} Auditees`);
    } catch (error) {
      console.error('Error fetching department users:', error);
    } finally {
      setLoadingDepartmentUsers(false);
    }
  }, []);

  // Fetch department check sheet mapping
  const fetchDepartmentMapping = useCallback(async (department) => {
    if (!department) return;
    
    try {
      const encodedDept = encodeURIComponent(department);
      const response = await axios.get(
        `${API_BASE}/audit-schedule/department-mapping/${encodedDept}`,
        { withCredentials: true }
      );
      setDepartmentInfo(response.data);
    } catch (error) {
      console.error('Error fetching department mapping:', error);
      const localMapping = {
        "HR": ["HR"],
        "R&D": ["R&D"],
        "Purchase": ["Purchase"],
        "RMS": ["RMS"],
        "SQA": ["Quality", "Purchase"],
        "PPC": ["PPC"],
        "Production": ["Production"],
        "QA/QC": ["Quality", "Lab & Calibration"],
        "FGS": ["FGS"],
        "Marketing": ["Sales & Marketing"],
        "IMS (BE)": ["MR", "QMs/IMS/MR office", "Top Management", "Quality"],
        "Maintenance": ["Maintenance"],
        "Management": ["MR", "QMs/IMS/MR office", "Top Management"],
        "Plant Maintenance": ["Maintenance"],
        "Tool Maintenance": ["Maintenance"],
        "Stores & Despatch": ["Store", "RMS", "FGS"]
      };
      setDepartmentInfo({
        department: department,
        iatfProcesses: localMapping[department] || [],
        hasForms: !!localMapping[department]
      });
    }
  }, []);

  // Reset selections
  const resetSelections = () => {
    setSelectedLeadAuditor('');
    setSelectedTeamAuditors([]);
    setTeamAuditorNames([]);
    setSelectedCoAuditors([]);
    setSelectedCoAuditorNames([]);
    setSelectedAuditees([]);
    setSelectedAuditeeNames([]);
    setSearchTerm('');
    setAuditeeSearchTerm('');
    setCoAuditorSearchTerm('');
  };

  // Handle department change
  const handleDepartmentChange = async (dept) => {
    if (!dept) return;
    
    // Get audit elements from Form 4
    const departmentData = deptPlanData[dept];
    let auditElements = [];
    if (departmentData && Array.isArray(departmentData)) {
      const monthData = departmentData.find(m => m.month === selectedMonth);
      auditElements = monthData?.elements || [];
    }
    
    // Fetch department-specific data
    await Promise.all([
      fetchDepartmentUsers(dept),
      fetchDepartmentMapping(dept)
    ]);
    
    // Reset selections
    resetSelections();
    
    // Update form data
    setFormData({
      ...formData,
      department: dept,
      month: selectedMonth,
      auditElements: auditElements,
      week: '',
      status: 'SCHEDULED'
    });
  };

  // Handle lead auditor selection
  const handleLeadAuditorChange = (auditorId) => {
    setSelectedLeadAuditor(auditorId);
  };

  // Handle team auditor toggle (these are co-auditors)
  const handleTeamAuditorToggle = (auditorId, auditorName) => {
    // Update team auditors
    setSelectedTeamAuditors(prev => {
      if (prev.includes(auditorId)) {
        return prev.filter(id => id !== auditorId);
      } else {
        return [...prev, auditorId];
      }
    });
    
    setTeamAuditorNames(prev => {
      if (prev.includes(auditorName)) {
        return prev.filter(name => name !== auditorName);
      } else {
        return [...prev, auditorName];
      }
    });
    
    // Also update co-auditors (same data, different field name for backend)
    setSelectedCoAuditors(prev => {
      if (prev.includes(auditorId)) {
        return prev.filter(id => id !== auditorId);
      } else {
        return [...prev, auditorId];
      }
    });
    
    setSelectedCoAuditorNames(prev => {
      if (prev.includes(auditorName)) {
        return prev.filter(name => name !== auditorName);
      } else {
        return [...prev, auditorName];
      }
    });
  };

  // Handle select all team auditors
  const handleSelectAllTeam = () => {
    const allIds = departmentTeamAuditors.map(a => a.id.toString());
    const allNames = departmentTeamAuditors.map(a => `${a.firstName} ${a.lastName}`);
    setSelectedTeamAuditors(allIds);
    setTeamAuditorNames(allNames);
    setSelectedCoAuditors(allIds);
    setSelectedCoAuditorNames(allNames);
  };

  // Handle clear all team auditors
  const handleClearAllTeam = () => {
    setSelectedTeamAuditors([]);
    setTeamAuditorNames([]);
    setSelectedCoAuditors([]);
    setSelectedCoAuditorNames([]);
  };

  // Handle auditee toggle (multi-select)
  const handleAuditeeToggle = (auditeeId, auditeeName) => {
    setSelectedAuditees(prev => {
      if (prev.includes(auditeeId)) {
        return prev.filter(id => id !== auditeeId);
      } else {
        return [...prev, auditeeId];
      }
    });
    
    setSelectedAuditeeNames(prev => {
      if (prev.includes(auditeeName)) {
        return prev.filter(name => name !== auditeeName);
      } else {
        return [...prev, auditeeName];
      }
    });
  };

  // Handle select all auditees
  const handleSelectAllAuditees = () => {
    const allIds = departmentAuditees.map(a => a.id.toString());
    const allNames = departmentAuditees.map(a => `${a.firstName} ${a.lastName}${a.role === 'HOD' ? ' (HOD)' : ''}`);
    setSelectedAuditees(allIds);
    setSelectedAuditeeNames(allNames);
  };

  // Handle clear all auditees
  const handleClearAllAuditees = () => {
    setSelectedAuditees([]);
    setSelectedAuditeeNames([]);
  };

  // Filter team auditors by search term
  const filteredTeamAuditors = departmentTeamAuditors.filter(auditor =>
    `${auditor.firstName} ${auditor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter auditees by search term
  const filteredAuditees = departmentAuditees.filter(auditee =>
    `${auditee.firstName} ${auditee.lastName}`.toLowerCase().includes(auditeeSearchTerm.toLowerCase())
  );

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.department) {
      alert('Please select a department');
      return;
    }
    if (!formData.week) {
      alert('Please select a week');
      return;
    }
    if (!selectedLeadAuditor) {
      alert('Please select a Lead Auditor');
      return;
    }
    if (selectedAuditees.length === 0) {
      alert('Please select at least one auditee');
      return;
    }
    
    // Get selected lead auditor details
    const leadAuditor = departmentLeadAuditors.find(a => a.id.toString() === selectedLeadAuditor);
    
    // Prepare complete schedule data with correct field names for backend
   // Prepare complete schedule data with correct field names for backend
const completeScheduleData = {
    ...formData,
    // Primary auditor (Lead Auditor)
    auditorId: selectedLeadAuditor,
    leadAuditorId: selectedLeadAuditor,
    leadAuditorName: leadAuditor ? `${leadAuditor.firstName} ${leadAuditor.lastName}` : '',
    
    // ✅ CRITICAL: Send BOTH keys to ensure backend catches it regardless of logic path
    teamAuditorIds: selectedTeamAuditors.map(id => parseInt(id)), 
    teamAuditorNames: teamAuditorNames,
    coAuditorIdList: selectedCoAuditors.map(id => parseInt(id)),      // ← Backend expects this for detailed save
    coAuditorNames: selectedCoAuditorNames,   // ← Backend expects this
    
    // Auditee data
    auditeeId: selectedAuditees.length === 1 ? parseInt(selectedAuditees[0]) : null,
    auditeeIdList: selectedAuditees.map(id => parseInt(id)),          // ← Backend expects this
    auditeeNames: selectedAuditeeNames,       // ← Backend expects this
    
    status: formData.status || 'SCHEDULED'
};
    console.log('📤 Submitting schedule data:', completeScheduleData);
    onSave(completeScheduleData);
  };

  // Populate existing data when editing
  // Populate existing data when editing
useEffect(() => {
    if (editingSchedule && isOpen && formData.department) {
      console.log("📝 Full Editing Schedule Object:", editingSchedule);
      console.log("📝 Raw auditeeIdList:", editingSchedule.auditeeIdList);
      console.log("📝 Raw auditeeIds:", editingSchedule.auditeeIds);
      console.log("📝 Raw auditeeNames:", editingSchedule.auditeeNames);
      console.log("📝 Raw coAuditorIdList:", editingSchedule.coAuditorIdList);
      console.log("📝 Raw teamAuditorIds:", editingSchedule.teamAuditorIds);

      // 1. Set Lead Auditor
      const leadId = editingSchedule.leadAuditorId?.toString() || editingSchedule.auditorId?.toString() || '';
      setSelectedLeadAuditor(leadId);
      console.log("✅ Lead Auditor ID:", leadId);
      
      // 2. Set Team Auditors / Co-Auditors
      let teamIds = editingSchedule.coAuditorIdList || editingSchedule.teamAuditorIds || [];
      let teamNames = editingSchedule.coAuditorNames || editingSchedule.teamAuditorNames || [];
      
      // Handle JSON strings if necessary
      if (typeof teamIds === 'string') {
        try { teamIds = JSON.parse(teamIds); } catch(e) { teamIds = []; }
      }
      if (typeof teamNames === 'string') {
        try { teamNames = JSON.parse(teamNames); } catch(e) { teamNames = []; }
      }
      
      const teamIdsStr = Array.isArray(teamIds) ? teamIds.map(id => id.toString()) : [];
      
      setSelectedTeamAuditors(teamIdsStr);
      setTeamAuditorNames(Array.isArray(teamNames) ? teamNames : []);
      setSelectedCoAuditors(teamIdsStr);
      setSelectedCoAuditorNames(Array.isArray(teamNames) ? teamNames : []);
      console.log("✅ Team Auditors:", teamIdsStr);
      console.log("✅ Team Names:", teamNames);
      
      // 3. Handle Auditees - TRY MULTIPLE SOURCES
      let auditeeIds = [];
      let auditeeNamesList = [];
      
      // Try auditeeIdList first (preferred)
      if (editingSchedule.auditeeIdList && Array.isArray(editingSchedule.auditeeIdList) && editingSchedule.auditeeIdList.length > 0) {
        auditeeIds = editingSchedule.auditeeIdList;
        auditeeNamesList = editingSchedule.auditeeNames || [];
        console.log("✅ Found auditeeIdList:", auditeeIds);
      }
      // Try auditeeIds (alternative field name)
      else if (editingSchedule.auditeeIds && Array.isArray(editingSchedule.auditeeIds) && editingSchedule.auditeeIds.length > 0) {
        auditeeIds = editingSchedule.auditeeIds;
        auditeeNamesList = editingSchedule.auditeeNames || [];
        console.log("✅ Found auditeeIds:", auditeeIds);
      }
      // Try parsing from JSON string
      else if (typeof editingSchedule.auditeeIds === 'string' && editingSchedule.auditeeIds) {
        try { 
          auditeeIds = JSON.parse(editingSchedule.auditeeIds); 
          auditeeNamesList = editingSchedule.auditeeNames ? 
            (typeof editingSchedule.auditeeNames === 'string' ? JSON.parse(editingSchedule.auditeeNames) : editingSchedule.auditeeNames) : [];
          console.log("✅ Parsed auditeeIds from JSON:", auditeeIds);
        } catch(e) { 
          console.error("Error parsing auditeeIds:", e);
          auditeeIds = []; 
        }
      }
      // Fallback to single auditeeId
      else if (editingSchedule.auditeeId) {
        auditeeIds = [editingSchedule.auditeeId];
        auditeeNamesList = editingSchedule.auditeeName ? [editingSchedule.auditeeName] : [];
        console.log("✅ Fallback to single auditeeId:", auditeeIds);
      }
      
      // Ensure IDs are strings for checkbox comparison
      const auditeeIdsStr = Array.isArray(auditeeIds) ? auditeeIds.map(id => id.toString()) : [];
      
      setSelectedAuditees(auditeeIdsStr);
      setSelectedAuditeeNames(Array.isArray(auditeeNamesList) ? auditeeNamesList : []);
      
      console.log("✅ FINAL Selected Auditees IDs:", auditeeIdsStr);
      console.log("✅ FINAL Selected Auditees Names:", auditeeNamesList);
      console.log("✅ Selected Auditees Count:", auditeeIdsStr.length);

      // Fetch department users to ensure dropdowns are populated
      if (formData.department) {
        fetchDepartmentUsers(formData.department);
        fetchDepartmentMapping(formData.department);
      }
    }
  }, [editingSchedule, isOpen, formData.department, fetchDepartmentUsers, fetchDepartmentMapping]);
  useEffect(() => {
    if (isOpen && formData.department && !editingSchedule) {
      fetchDepartmentUsers(formData.department);
      fetchDepartmentMapping(formData.department);
    }
  }, [isOpen, formData.department, editingSchedule, fetchDepartmentUsers, fetchDepartmentMapping]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDepartmentLeadAuditors([]);
      setDepartmentTeamAuditors([]);
      setDepartmentAuditees([]);
      setDepartmentInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isTeamConfigured = selectedLeadAuditor && selectedLeadAuditor !== '';
  const selectedAuditeeCount = selectedAuditees.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold">{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Schedule audit team and week for department</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Department Selection */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Department to Audit *
            </label>
            <select
              value={formData.department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              disabled={!!editingSchedule}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Department Info Card */}
          {departmentInfo && departmentInfo.iatfProcesses?.length > 0 && (
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <FiInfo className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">IATF Process Mapping</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {departmentInfo.iatfProcesses.map((process, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {process}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lead Auditor Selection */}
          {formData.department && (
            <div>
              <label className="flex items-center block gap-1 mb-1 text-sm font-medium text-gray-700">
                <FiUserCheck className="w-4 h-4 text-blue-500" />
                <span className="text-red-500">*</span> Lead Auditor
              </label>
              {loadingDepartmentUsers ? (
                <div className="w-full p-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-purple-600"></div>
                  Loading lead auditors...
                </div>
              ) : departmentLeadAuditors.length === 0 ? (
                <div className="flex items-center w-full gap-2 p-2 text-sm border rounded-lg text-amber-600 border-amber-200 bg-amber-50">
                  <FiAlertCircle className="w-4 h-4" />
                  No lead auditors available for {formData.department} department
                </div>
              ) : (
                <select
                  value={selectedLeadAuditor}
                  onChange={(e) => handleLeadAuditorChange(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Lead Auditor</option>
                  {departmentLeadAuditors.map(auditor => (
                    <option key={auditor.id} value={auditor.id.toString()}>
                      {auditor.firstName} {auditor.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Team Auditors / Co-Auditors Selection - Multi-Select */}
          {formData.department && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <FiUserPlus className="w-4 h-4 text-green-500" />
                  Team Auditors (Co-Auditors)
                  {selectedTeamAuditors.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({selectedTeamAuditors.length} selected)</span>
                  )}
                </label>
                {!loadingDepartmentUsers && departmentTeamAuditors.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTeam}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllTeam}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {loadingDepartmentUsers ? (
                <div className="w-full p-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-purple-600"></div>
                  Loading team auditors...
                </div>
              ) : departmentTeamAuditors.length === 0 ? (
                <div className="w-full p-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  No team auditors available for {formData.department} department
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search team auditors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 pl-8 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <FiSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  </div>

                  <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg max-h-48">
                    {filteredTeamAuditors.length === 0 ? (
                      <p className="py-4 text-sm text-center text-gray-400">No matching auditors found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredTeamAuditors.map(auditor => (
                          <label key={auditor.id} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedTeamAuditors.includes(auditor.id.toString())}
                              onChange={() => handleTeamAuditorToggle(auditor.id.toString(), `${auditor.firstName} ${auditor.lastName}`)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="flex-1 text-sm text-gray-700">
                              {auditor.firstName} {auditor.lastName}
                            </span>
                            <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Auditor</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {teamAuditorNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-500">Selected:</span>
                      {teamAuditorNames.slice(0, 3).map((name, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                          {name}
                        </span>
                      ))}
                      {teamAuditorNames.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{teamAuditorNames.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Week Selection */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Week *</label>
            <select
              value={formData.week}
              onChange={(e) => setFormData({...formData, week: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Week</option>
              {weeksList.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
          </div>

          {/* Audit Elements */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Audit Elements (from Form 4)</label>
            <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 max-h-32">
              {formData.auditElements.length === 0 ? (
                <p className="text-sm text-gray-400">No audit elements selected in Form 4 for this month</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.auditElements.map((el, idx) => (
                    <span key={idx} className="px-2 py-1 text-sm text-blue-700 bg-blue-100 rounded">{el}</span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">These elements come from Form 4 and cannot be changed here.</p>
          </div>

          {/* Auditees Selection - Multi-Select with Search */}
          {formData.department && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <FiUserPlus className="w-4 h-4 text-purple-500" />
                  Auditees *
                  {selectedAuditeeCount > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({selectedAuditeeCount} selected)</span>
                  )}
                </label>
                {!loadingDepartmentUsers && departmentAuditees.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAuditees}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllAuditees}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {loadingDepartmentUsers ? (
                <div className="w-full p-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 rounded-full animate-spin border-t-purple-600"></div>
                  Loading auditees...
                </div>
              ) : departmentAuditees.length === 0 ? (
                <div className="flex items-center w-full gap-2 p-2 text-sm border rounded-lg text-amber-600 border-amber-200 bg-amber-50">
                  <FiAlertCircle className="w-4 h-4" />
                  No auditees available for {formData.department} department
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search auditees..."
                      value={auditeeSearchTerm}
                      onChange={(e) => setAuditeeSearchTerm(e.target.value)}
                      className="w-full p-2 pl-8 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <FiSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  </div>

                  <div className="p-3 overflow-y-auto border border-gray-200 rounded-lg max-h-48">
                    {filteredAuditees.length === 0 ? (
                      <p className="py-4 text-sm text-center text-gray-400">No matching auditees found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAuditees.map(auditee => (
                          <label key={auditee.id} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedAuditees.includes(auditee.id.toString())}
                              onChange={() => handleAuditeeToggle(auditee.id.toString(), `${auditee.firstName} ${auditee.lastName}${auditee.role === 'HOD' ? ' (HOD)' : ''}`)}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="flex-1 text-sm text-gray-700">
                              {auditee.firstName} {auditee.lastName}
                            </span>
                            {auditee.role === 'HOD' && (
                              <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">HOD</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Auditees Badges */}
                  {selectedAuditeeNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-500">Selected:</span>
                      {selectedAuditeeNames.slice(0, 3).map((name, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {name}
                        </span>
                      ))}
                      {selectedAuditeeNames.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{selectedAuditeeNames.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Summary */}
          {isTeamConfigured && selectedAuditeeCount > 0 && (
            <div className="p-3 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Schedule Ready</span>
              </div>
              <div className="text-sm text-green-700">
                <div>Department: {formData.department}</div>
                <div>Week: {formData.week}</div>
                <div>Lead Auditor: {departmentLeadAuditors.find(a => a.id.toString() === selectedLeadAuditor)?.firstName} {departmentLeadAuditors.find(a => a.id.toString() === selectedLeadAuditor)?.lastName}</div>
                {teamAuditorNames.length > 0 && <div>Team Auditors: {teamAuditorNames.length} auditor(s)</div>}
                <div>Auditees: {selectedAuditeeCount} person(s)</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="sticky bottom-0 flex justify-end gap-3 p-4 bg-white border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={saving || !formData.department || !formData.week || !selectedLeadAuditor || selectedAuditeeCount === 0} 
            className="flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div> : <FiSave className="w-4 h-4" />}
            {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;