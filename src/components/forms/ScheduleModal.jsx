import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiSave, FiAlertCircle, FiSearch, FiCheckCircle, FiX,
  FiCheck, FiAlertTriangle, FiInfo, FiBriefcase, FiUserCheck,
  FiUsers, FiUser, FiCalendar, FiList, FiClock
} from 'react-icons/fi';
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

const departmentDisplayToEnum = {
  "HR": "HR", "R&D": "ENGG", "Purchase": "PURCHASE",
  "RMS": "STORES_DESPATCH", "SQA": "QA", "PPC": "PPC",
  "Production": "PRODUCTION", "QA/QC": "QA", "FGS": "STORES_DESPATCH",
  "Marketing": "MARKETING", "IMS (BE)": "MR", "Maintenance": "PLANT_MAINTENANCE",
  "Management": "UNIT_HEAD", "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE", "Stores & Despatch": "STORES_DESPATCH"
};

const weeksList = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];

// ══════ LIGHT MNC PALETTE ══════
const T = {
  bg: '#F8FAFC',        // Ultra-light background
  card: '#FFFFFF',      // Pure white
  border: '#E2E8F0',    // Soft light border
  text: '#1F2937',      // Dark gray for input values (NOT pure black)
  textMuted: '#6B7280', // Medium gray for placeholders/hints
  accent: '#3B82F6',    // Lighter, fresher corporate blue
  accentLight: '#EFF6FF', 
  accentBorder: '#DBEAFE',
  tagBg: '#F1F5F9', 
  tagText: '#475569', 
  tagBorder: '#E2E8F0',
  error: '#DC2626', 
  errorLight: '#FEF2F2', 
  errorBorder: '#FECACA',
  success: '#10B981', 
  disabledBg: '#F1F5F9', 
  disabledText: '#94A3B8',
  iconColor: '#475569',
};

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ─── Atoms ─────────────────────────────────────────────────────────────── */

// FIELD NAMES: Pure Black & Bold
const FieldLabel = ({ children, required, icon: Icon }) => (
  <label style={{ 
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, fontWeight: 700, color: '#000000', // PURE BLACK & BOLD
    marginBottom: 8, fontFamily: FONT_FAMILY
  }}>
    {Icon && <Icon size={15} color={T.iconColor} />}
    <span>{children}</span>
    {required && <span style={{ color: T.error, marginLeft: 4, fontSize: 15, fontWeight: 700 }}>*</span>}
  </label>
);

const FieldError = ({ message }) =>
  message ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: T.error, fontSize: 12, fontWeight: 500, fontFamily: FONT_FAMILY }}>
      <FiAlertCircle size={12} /> {message}
    </div>
  ) : null;

const Spinner = ({ size = 16, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
  </svg>
);

const LoadingRow = ({ label }) => (
  <div style={{ padding: '24px 0', textAlign: 'center', color: T.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT_FAMILY }}>
    <Spinner size={14} color={T.textMuted} /> {label || 'Loading...'}
  </div>
);

const EmptyNotice = ({ label }) => (
  <div style={{ padding: '24px 0', textAlign: 'center', color: T.textMuted, fontSize: 13, fontFamily: FONT_FAMILY }}>
    {label || 'No data available'}
  </div>
);

// INPUT VALUES: Dark Gray & Normal Weight (Not black, not bold)
const selectStyle = (error, hasIcon) => ({
  width: '100%', height: 42, 
  padding: hasIcon ? '0 36px 0 38px' : '0 36px 0 12px',
  fontSize: 14, fontWeight: 400, // NORMAL WEIGHT
  fontFamily: FONT_FAMILY, borderRadius: 8,
  border: `1px solid ${error ? T.errorBorder : T.border}`,
  background: error ? T.errorLight : T.card,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  color: T.text, // DARK GRAY, NOT PURE BLACK
  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
  transition: 'border-color 0.2s', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'
});

/* ─── Icon Input Wrapper ────────────────────────────────────────────────── */
const IconInputWrapper = ({ icon: Icon, children, error }) => (
  <div style={{ position: 'relative' }}>
    <div style={{
      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 2
    }}>
      <Icon size={16} color={error ? T.error : T.iconColor} />
    </div>
    {children}
  </div>
);

/* ─── Premium Multi-Select Dropdown ────────────────────────────────────── */
const MultiSelectDropdown = ({
  options, selectedIds, onToggle, onSelectAll, onClearAll,
  placeholder, emptyMsg, error, icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    `${opt.firstName} ${opt.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedNames = options
    .filter(opt => selectedIds.includes(opt.id.toString()))
    .map(opt => `${opt.firstName} ${opt.lastName}`);

  const displayValue = selectedIds.length === 0 
    ? placeholder 
    : selectedIds.length === 1 
      ? selectedNames[0]
      : `${selectedIds.length} selected`;

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', height: 42, 
          padding: '0 36px 0 38px', 
          fontSize: 14, fontWeight: 400, // NORMAL WEIGHT
          fontFamily: FONT_FAMILY, borderRadius: 8,
          border: `1px solid ${error ? T.errorBorder : T.border}`,
          background: error ? T.errorLight : T.card,
          color: selectedIds.length > 0 ? T.text : T.textMuted, // DARK GRAY, NOT PURE BLACK
          outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
          transition: 'border-color 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
          <Icon size={16} color={error ? T.error : T.iconColor} />
        </div>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
          {displayValue}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
          zIndex: 99999, overflow: 'hidden', fontFamily: FONT_FAMILY
        }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center', background: '#FAFAFA' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." autoFocus
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', height: 32, paddingLeft: 30, paddingRight: 10, fontSize: 13,
                  border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFF', color: T.text,
                  outline: 'none', boxSizing: 'border-box', fontFamily: FONT_FAMILY
                }}
              />
            </div>
            <button onClick={(e) => { e.stopPropagation(); onSelectAll(); }} type="button" style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontFamily: FONT_FAMILY, whiteSpace: 'nowrap' }}>
              All
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClearAll(); }} type="button" style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontFamily: FONT_FAMILY, whiteSpace: 'nowrap' }}>
              Clear
            </button>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', padding: 6 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                {emptyMsg}
              </div>
            ) : filteredOptions.map((item) => {
              const id = item.id.toString();
              const checked = selectedIds.includes(id);
              return (
                <div
                  key={id}
                  onClick={(e) => { e.stopPropagation(); onToggle(item); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                    background: checked ? T.accentLight : 'transparent',
                    marginBottom: 2
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = checked ? T.accentLight : 'transparent'; }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? T.accent : '#CBD5E1'}`,
                    background: checked ? T.accent : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', flexShrink: 0
                  }}>
                    {checked && <FiCheck size={10} color="#FFF" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: T.text, fontWeight: checked ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.firstName} {item.lastName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const ScheduleModal = ({
  isOpen, onClose, onSave, formData, setFormData,
  departments, deptPlanData, weeks, selectedMonth, monthDisplay,
  editingSchedule, saving, selectedYear
}) => {
  const [departmentLeadAuditors, setDepartmentLeadAuditors] = useState([]);
  const [departmentTeamAuditors, setDepartmentTeamAuditors] = useState([]);
  const [departmentAuditees, setDepartmentAuditees] = useState([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState(null);

  const [selectedLeadAuditor, setSelectedLeadAuditor] = useState('');
  const [selectedTeamAuditors, setSelectedTeamAuditors] = useState([]);
  const [teamAuditorNames, setTeamAuditorNames] = useState([]);
  const [selectedCoAuditors, setSelectedCoAuditors] = useState([]);
  const [selectedCoAuditorNames, setSelectedCoAuditorNames] = useState([]);

  const [selectedAuditees, setSelectedAuditees] = useState([]);
  const [selectedAuditeeNames, setSelectedAuditeeNames] = useState([]);

  const [errors, setErrors] = useState({});
  const abortRef = useRef(null);

  /* ── API calls & Handlers ─────────────────────────────────────────────── */
  const fetchDepartmentUsers = useCallback(async (department) => {
    if (!department) { setDepartmentLeadAuditors([]); setDepartmentTeamAuditors([]); setDepartmentAuditees([]); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const enumValue = departmentDisplayToEnum[department] || department.toUpperCase().replace(/[&\s/]+/g, '_');
    setLoadingDepartmentUsers(true);
    try {
      const [leadRes, regularRes, auditeesRes] = await Promise.all([
        axios.get(`${API_BASE}/audit-schedule/lead-auditors/by-department/${encodeURIComponent(enumValue)}`, { withCredentials: true }),
        axios.get(`${API_BASE}/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`, { withCredentials: true }),
        axios.get(`${API_BASE}/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`, { withCredentials: true })
      ]);
      setDepartmentLeadAuditors(leadRes.data || []);
      setDepartmentTeamAuditors(regularRes.data || []);
      setDepartmentAuditees((auditeesRes.data || []).filter(u => u.role !== 'HOD'));
    } catch (err) { if (!axios.isCancel(err)) console.error(err); }
    finally { setLoadingDepartmentUsers(false); }
  }, []);

  const fetchDepartmentMapping = useCallback(async (department) => {
    if (!department) return;
    try {
      const res = await axios.get(`${API_BASE}/audit-schedule/department-mapping/${encodeURIComponent(department)}`, { withCredentials: true });
      setDepartmentInfo(res.data);
    } catch {
      const localMapping = {
        "HR": ["HR"], "R&D": ["R&D"], "Purchase": ["Purchase"], "RMS": ["RMS"],
        "SQA": ["Quality", "Purchase"], "PPC": ["PPC"], "Production": ["Production"],
        "QA/QC": ["Quality", "Lab & Calibration"], "FGS": ["FGS"],
        "Marketing": ["Sales & Marketing"],
        "IMS (BE)": ["MR", "QMs/IMS/MR office", "Top Management", "Quality"],
        "Maintenance": ["Maintenance"], "Management": ["MR", "QMs/IMS/MR office", "Top Management"],
        "Plant Maintenance": ["Maintenance"], "Tool Maintenance": ["Maintenance"],
        "Stores & Despatch": ["Store", "RMS", "FGS"]
      };
      setDepartmentInfo({ department, iatfProcesses: localMapping[department] || [], hasForms: !!localMapping[department] });
    }
  }, []);

  const resetSelections = useCallback(() => {
    setSelectedLeadAuditor('');
    setSelectedTeamAuditors([]); setTeamAuditorNames([]);
    setSelectedCoAuditors([]); setSelectedCoAuditorNames([]);
    setSelectedAuditees([]); setSelectedAuditeeNames([]);
    setErrors({});
  }, []);

  const handleDepartmentChange = async (dept) => {
    if (!dept) return;
    const departmentData = deptPlanData[dept];
    let auditElements = [];
    if (departmentData && Array.isArray(departmentData)) {
      const monthData = departmentData.find(m => m.month === selectedMonth);
      auditElements = monthData?.elements || [];
    }
    resetSelections();
    setFormData({ ...formData, department: dept, month: selectedMonth, auditElements, week: '', status: 'SCHEDULED' });
    await Promise.all([fetchDepartmentUsers(dept), fetchDepartmentMapping(dept)]);
  };

  const handleTeamAuditorToggle = (auditor) => {
    const id = auditor.id.toString();
    const name = `${auditor.firstName} ${auditor.lastName}`;
    const inList = selectedTeamAuditors.includes(id);
    const nextIds = inList ? selectedTeamAuditors.filter(x => x !== id) : [...selectedTeamAuditors, id];
    const nextNames = inList ? teamAuditorNames.filter(n => n !== name) : [...teamAuditorNames, name];
    setSelectedTeamAuditors(nextIds); setTeamAuditorNames(nextNames);
    setSelectedCoAuditors(nextIds); setSelectedCoAuditorNames(nextNames);
  };

  const handleSelectAllTeam = () => {
    const ids = departmentTeamAuditors.map(a => a.id.toString());
    const names = departmentTeamAuditors.map(a => `${a.firstName} ${a.lastName}`);
    setSelectedTeamAuditors(ids); setTeamAuditorNames(names);
    setSelectedCoAuditors(ids); setSelectedCoAuditorNames(names);
  };

  const handleClearAllTeam = () => {
    setSelectedTeamAuditors([]); setTeamAuditorNames([]);
    setSelectedCoAuditors([]); setSelectedCoAuditorNames([]);
  };

  const handleAuditeeToggle = (auditee) => {
    const id = auditee.id.toString();
    const name = `${auditee.firstName} ${auditee.lastName}`;
    const inList = selectedAuditees.includes(id);
    setSelectedAuditees(prev => inList ? prev.filter(x => x !== id) : [...prev, id]);
    setSelectedAuditeeNames(prev => inList ? prev.filter(n => n !== name) : [...prev, name]);
    if (errors.auditees) setErrors(e => ({ ...e, auditees: '' }));
  };

  const handleSelectAllAuditees = () => {
    setSelectedAuditees(departmentAuditees.map(a => a.id.toString()));
    setSelectedAuditeeNames(departmentAuditees.map(a => `${a.firstName} ${a.lastName}`));
    setErrors(e => ({ ...e, auditees: '' }));
  };

  const handleClearAllAuditees = () => {
    setSelectedAuditees([]); setSelectedAuditeeNames([]);
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.department) newErrors.department = 'Select a department';
    if (!formData.week) newErrors.week = 'Choose an audit week';
    if (!selectedLeadAuditor) newErrors.lead = 'Assign a lead auditor';
    if (selectedAuditees.length === 0) newErrors.auditees = 'Add at least one auditee';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    const lead = departmentLeadAuditors.find(a => a.id.toString() === selectedLeadAuditor);
    onSave({
      ...formData,
      auditorId: selectedLeadAuditor, leadAuditorId: selectedLeadAuditor,
      leadAuditorName: lead ? `${lead.firstName} ${lead.lastName}` : '',
      teamAuditorIds: selectedTeamAuditors.map(Number), teamAuditorNames,
      coAuditorIdList: selectedCoAuditors.map(Number), coAuditorNames: selectedCoAuditorNames,
      auditeeId: selectedAuditees.length === 1 ? Number(selectedAuditees[0]) : null,
      auditeeIdList: selectedAuditees.map(Number), auditeeNames: selectedAuditeeNames,
      status: formData.status || 'SCHEDULED'
    });
  };

  /* ── Effects ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!editingSchedule || !isOpen || !formData.department) return;
    const leadId = editingSchedule.leadAuditorId?.toString() || editingSchedule.auditorId?.toString() || '';
    setSelectedLeadAuditor(leadId);

    let teamIds = editingSchedule.coAuditorIdList || editingSchedule.teamAuditorIds || [];
    let teamNames = editingSchedule.coAuditorNames || editingSchedule.teamAuditorNames || [];
    if (typeof teamIds === 'string') { try { teamIds = JSON.parse(teamIds); } catch { teamIds = []; } }
    if (typeof teamNames === 'string') { try { teamNames = JSON.parse(teamNames); } catch { teamNames = []; } }
    const teamIdsStr = Array.isArray(teamIds) ? teamIds.map(String) : [];
    setSelectedTeamAuditors(teamIdsStr); setTeamAuditorNames(Array.isArray(teamNames) ? teamNames : []);
    setSelectedCoAuditors(teamIdsStr); setSelectedCoAuditorNames(Array.isArray(teamNames) ? teamNames : []);

    let auditeeIds = [], auditeeNamesList = [];
    if (editingSchedule.auditeeIdList?.length) {
      auditeeIds = editingSchedule.auditeeIdList; auditeeNamesList = editingSchedule.auditeeNames || [];
    } else if (editingSchedule.auditeeIds?.length) {
      auditeeIds = editingSchedule.auditeeIds; auditeeNamesList = editingSchedule.auditeeNames || [];
    } else if (typeof editingSchedule.auditeeIds === 'string' && editingSchedule.auditeeIds) {
      try {
        auditeeIds = JSON.parse(editingSchedule.auditeeIds);
        auditeeNamesList = typeof editingSchedule.auditeeNames === 'string' ? JSON.parse(editingSchedule.auditeeNames) : (editingSchedule.auditeeNames || []);
      } catch { auditeeIds = []; }
    } else if (editingSchedule.auditeeId) {
      auditeeIds = [editingSchedule.auditeeId];
      auditeeNamesList = editingSchedule.auditeeName ? [editingSchedule.auditeeName] : [];
    }
    setSelectedAuditees(Array.isArray(auditeeIds) ? auditeeIds.map(String) : []);
    setSelectedAuditeeNames(Array.isArray(auditeeNamesList) ? auditeeNamesList : []);
    fetchDepartmentUsers(formData.department);
    fetchDepartmentMapping(formData.department);
  }, [editingSchedule, isOpen, formData.department, fetchDepartmentUsers, fetchDepartmentMapping]);

  useEffect(() => {
    if (isOpen && formData.department && !editingSchedule) {
      fetchDepartmentUsers(formData.department);
      fetchDepartmentMapping(formData.department);
    }
  }, [isOpen, formData.department, editingSchedule, fetchDepartmentUsers, fetchDepartmentMapping]);

  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDepartmentLeadAuditors([]); setDepartmentTeamAuditors([]);
      setDepartmentAuditees([]); setDepartmentInfo(null);
    }
  }, [isOpen, resetSelections]);

  if (!isOpen) return null;

  const step1Done = !!formData.department;
  const step2Done = !!selectedLeadAuditor;
  const step3Done = selectedAuditees.length > 0;
  const step4Done = !!formData.week;
  const isReady = step1Done && step2Done && step3Done && step4Done;
  const completedSteps = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div 
      onClick={onClose} 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20, fontFamily: FONT_FAMILY
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          background: T.card, borderRadius: 16, width: '100%', maxWidth: 840,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          border: `1px solid ${T.border}`, overflow: 'hidden'
        }}
      >
        {/* Header with Icon */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 44, height: 44, borderRadius: 12, 
              background: T.accentLight, border: `1px solid ${T.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <FiCalendar size={22} color={T.accent} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#000000', letterSpacing: '-0.01em' }}>
                {editingSchedule ? 'Edit Audit Schedule' : 'New Audit Schedule'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted, fontWeight: 400 }}>
                {editingSchedule ? 'Update the details for this scheduled audit.' : 'Fill in the required fields to schedule a new audit.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: '#F8FAFC', border: `1px solid ${T.border}`, cursor: 'pointer', color: T.textMuted, 
              padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.textMuted; }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Minimalist Progress Bar */}
        <div style={{ height: 3, background: '#F1F5F9', width: '100%' }}>
          <div style={{ 
            height: '100%', background: T.accent, 
            width: `${(completedSteps / 4) * 100}%`, 
            transition: 'width 0.4s ease' 
          }} />
        </div>

        {/* Body (Two Column Grid) - Light Background */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, background: T.bg }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            
            {/* 1. Department (Full Width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldLabel required icon={FiBriefcase}>Department</FieldLabel>
              <IconInputWrapper icon={FiBriefcase} error={errors.department}>
                <select 
                  value={formData.department || ''} 
                  onChange={e => handleDepartmentChange(e.target.value)}
                  disabled={true}
                  style={{...selectStyle(errors.department, true), opacity: editingSchedule ? 0.7 : 1, cursor: editingSchedule ? 'not-allowed' : 'pointer'}}
                >
                  <option value="">Select a department…</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </IconInputWrapper>
              {errors.department && <FieldError message={errors.department} />}
              
              {departmentInfo?.iatfProcesses?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginRight: 4, alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IATF:</span>
                  {departmentInfo.iatfProcesses.map((p, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', background: T.card, border: `1px solid ${T.tagBorder}`,
                      borderRadius: 12, fontSize: 12, fontWeight: 500, color: T.tagText
                    }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Lead Auditor */}
            <div>
              <FieldLabel required icon={FiUserCheck}>Lead Auditor</FieldLabel>
              {!formData.department ? (
                <IconInputWrapper icon={FiUserCheck}>
                  <div style={{ height: 42, padding: '0 12px 0 38px', background: '#F8FAFC', borderRadius: 8, color: T.textMuted, fontSize: 13, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
                    Select a department first
                  </div>
                </IconInputWrapper>
              ) : loadingDepartmentUsers ? (
                <LoadingRow label="Loading..." />
              ) : departmentLeadAuditors.length === 0 ? (
                <EmptyNotice label="None available" />
              ) : (
                <>
                  <IconInputWrapper icon={FiUserCheck} error={errors.lead}>
                    <select 
                      value={selectedLeadAuditor} 
                      onChange={e => { setSelectedLeadAuditor(e.target.value); setErrors(v => ({ ...v, lead: '' })); }}
                      style={selectStyle(errors.lead, true)}
                    >
                      <option value="">Select lead auditor…</option>
                      {departmentLeadAuditors.map(a => (
                        <option key={a.id} value={a.id.toString()}>{a.firstName} {a.lastName}</option>
                      ))}
                    </select>
                  </IconInputWrapper>
                  {errors.lead && <FieldError message={errors.lead} />}
                </>
              )}
            </div>

            {/* 3. Audit Week */}
            <div>
              <FieldLabel required icon={FiCalendar}>Audit Week</FieldLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {weeksList.map(w => {
                  const active = formData.week === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => { setFormData({ ...formData, week: w }); setErrors(e => ({ ...e, week: '' })); }}
                      style={{
                        flex: 1, minWidth: 50, height: 42, borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: `1px solid ${active ? T.accentBorder : T.border}`,
                        background: active ? T.accentLight : T.card,
                        color: active ? T.accent : T.text,
                        cursor: 'pointer', transition: 'all 0.2s', outline: 'none',
                        fontFamily: FONT_FAMILY, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <FiCalendar size={14} color={active ? T.accent : T.textMuted} />
                      {w}
                    </button>
                  );
                })}
              </div>
              {errors.week && <FieldError message={errors.week} />}
            </div>

            {/* 4. Team Auditors (Dropdown with Icon) */}
            <div>
              <FieldLabel icon={FiUsers}>Team Auditors</FieldLabel>
              {!formData.department ? (
                <IconInputWrapper icon={FiUsers}>
                  <div style={{ height: 42, padding: '0 12px 0 38px', background: '#F8FAFC', borderRadius: 8, color: T.textMuted, fontSize: 13, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
                    Select a department first
                  </div>
                </IconInputWrapper>
              ) : loadingDepartmentUsers ? (
                <LoadingRow label="Loading team..." />
              ) : departmentTeamAuditors.length === 0 ? (
                <EmptyNotice label="No team auditors" />
              ) : (
                <MultiSelectDropdown
                  options={departmentTeamAuditors}
                  selectedIds={selectedTeamAuditors}
                  onToggle={handleTeamAuditorToggle}
                  onSelectAll={handleSelectAllTeam}
                  onClearAll={handleClearAllTeam}
                  placeholder="Select team auditors..."
                  emptyMsg="No matching auditors"
                  icon={FiUsers}
                />
              )}
            </div>

            {/* 5. Auditees (Dropdown with Icon) */}
            <div>
              <FieldLabel required icon={FiUser}>Auditees</FieldLabel>
              {!formData.department ? (
                <IconInputWrapper icon={FiUser}>
                  <div style={{ height: 42, padding: '0 12px 0 38px', background: '#F8FAFC', borderRadius: 8, color: T.textMuted, fontSize: 13, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
                    Select a department first
                  </div>
                </IconInputWrapper>
              ) : loadingDepartmentUsers ? (
                <LoadingRow label="Loading auditees..." />
              ) : departmentAuditees.length === 0 ? (
                <EmptyNotice label="No auditees" />
              ) : (
                <>
                  <MultiSelectDropdown
                    options={departmentAuditees}
                    selectedIds={selectedAuditees}
                    onToggle={handleAuditeeToggle}
                    onSelectAll={handleSelectAllAuditees}
                    onClearAll={handleClearAllAuditees}
                    placeholder="Select auditees..."
                    emptyMsg="No matching auditees"
                    error={errors.auditees}
                    icon={FiUser}
                  />
                  {errors.auditees && <FieldError message={errors.auditees} />}
                </>
              )}
            </div>

            {/* 6. Audit Elements */}
            <div>
              <FieldLabel icon={FiList}>Audit Elements</FieldLabel>
              <IconInputWrapper icon={FiList}>
                <div style={{
                  padding: '0 12px 0 38px', background: '#F8FAFC', border: `1px solid ${T.border}`, borderRadius: 8,
                  display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 42, alignItems: 'center',
                  color: T.text, fontSize: 13, fontWeight: 400
                }}>
                  {!formData.auditElements?.length ? (
                    <span style={{ color: T.textMuted, fontWeight: 400 }}>No elements assigned</span>
                  ) : (
                    formData.auditElements.map((el, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', background: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 12, fontSize: 12, fontWeight: 500, color: T.text
                      }}>
                        {el}
                      </span>
                    ))
                  )}
                </div>
              </IconInputWrapper>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiInfo size={12} /> Sourced from Form 4 — read-only
              </p>
            </div>

            {/* 7. Status */}
            <div>
              <FieldLabel icon={FiClock}>Status</FieldLabel>
              <IconInputWrapper icon={FiClock}>
                <select 
                  value={formData.status || 'SCHEDULED'} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={selectStyle(false, true)}
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </IconInputWrapper>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: T.card, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          borderRadius: '0 0 16px 16px' 
        }}>
          <div style={{ fontSize: 13, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
            {isReady ? <FiCheckCircle color={T.success} size={16} /> : <FiAlertTriangle color={T.textMuted} size={16} />}
            {isReady ? 'Ready to save' : 'Complete all required fields'}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={onClose} 
              type="button"
              style={{ 
                height: 40, padding: '0 20px', borderRadius: 8, border: `1px solid ${T.border}`, 
                background: T.card, color: T.text, fontSize: 14, fontWeight: 600, 
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: FONT_FAMILY
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = T.card}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={!isReady || saving}
              type="button"
              style={{ 
                height: 40, padding: '0 24px', borderRadius: 8, border: 'none', 
                background: (!isReady || saving) ? T.disabledBg : T.accent, // Lighter Blue
                color: (!isReady || saving) ? T.disabledText : '#FFFFFF',
                fontSize: 14, fontWeight: 600, 
                cursor: (!isReady || saving) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', 
                boxShadow: (!isReady || saving) ? 'none' : '0 4px 6px -1px rgba(59, 130, 246, 0.2)', // Soft blue shadow
                fontFamily: FONT_FAMILY
              }}
            >
              {saving ? <Spinner size={16} /> : <FiSave size={16} />}
              {saving ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScheduleModal;