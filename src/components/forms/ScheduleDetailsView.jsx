// src/components/forms/ScheduleDetailsView.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { 
  FiCalendar, FiFileText, FiUsers, FiEye, FiCheckCircle,
  FiClock, FiDownload, FiPrinter, FiRefreshCw,
  FiTrendingUp, FiUserCheck, FiUserPlus, FiArrowLeft,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const API_BASE = 'http://localhost:8080/api';

const ScheduleDetailsView = () => {
  const navigate = useNavigate();
  const { year: paramYear, month: paramMonth } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(paramYear ? parseInt(paramYear) : new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(paramMonth || "");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    objective: true,
    scope: true,
    team: true,
    schedule: true,
    document: true
  });
  const [availableYears] = useState([2024, 2025, 2026]);

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  const auditElementsMap = {
    "System Audit (ISO9001)": "A",
    "System Audit (IATF16949)": "B",
    "5S Audit": "C",
    "Process Audit": "D",
    "Product Audit": "E"
  };

  // Fetch available months that have schedules
  const fetchAvailableMonths = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, {
        withCredentials: true
      });
      const allSchedules = response.data || [];
      
      const monthsMap = new Map();
      allSchedules.forEach(schedule => {
        if (!monthsMap.has(schedule.month)) {
          monthsMap.set(schedule.month, {
            month: schedule.month,
            approvalStatus: schedule.approvalStatus || 'DRAFT',
            scheduleCount: 0
          });
        }
        monthsMap.get(schedule.month).scheduleCount++;
      });
      
      const months = Array.from(monthsMap.values());
      setAvailableMonths(months);
      
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0].month);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  // Fetch schedule details for selected month
  const fetchScheduleDetails = async () => {
    if (!selectedMonth) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, {
        withCredentials: true
      });
      const allSchedules = response.data || [];
      const monthSchedules = allSchedules.filter(s => s.month === selectedMonth);
      
      if (monthSchedules.length > 0) {
        const firstSchedule = monthSchedules[0];
        
        let teamAuditorNames = firstSchedule.teamAuditorNames;
        if (typeof teamAuditorNames === 'string') {
          try {
            teamAuditorNames = JSON.parse(teamAuditorNames);
          } catch(e) {
            teamAuditorNames = [];
          }
        }
        
        setScheduleData({
          year: selectedYear,
          month: selectedMonth,
          schedules: monthSchedules,
          auditObjective: firstSchedule.auditObjective,
          auditScope: firstSchedule.auditScope,
          documentRevision: firstSchedule.documentRevision,
          revisionDate: firstSchedule.revisionDate,
          revisionDetails: firstSchedule.revisionDetails,
          auditFrequency: firstSchedule.auditFrequency,
          preparedBy: firstSchedule.preparedByName,
          preparedByPosition: firstSchedule.preparedByPosition,
          approvedBy: firstSchedule.approvedByName,
          approvedByPosition: firstSchedule.approvedByPosition,
          approvedAt: firstSchedule.approvedAt,
          approvalStatus: firstSchedule.approvalStatus,
          leadAuditorName: firstSchedule.leadAuditorName,
          teamAuditorNames: teamAuditorNames,
          auditProgramId: firstSchedule.auditProgramId,
          auditProgramName: firstSchedule.auditProgramName
        });
        setSchedules(monthSchedules);
      } else {
        setScheduleData(null);
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching schedule details:', error);
      addToast('Failed to load schedule details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth) {
      fetchScheduleDetails();
    }
  }, [selectedMonth, selectedYear]);

  const getStatusBadge = (status) => {
    const badges = {
      'COMPLETED': 'bg-green-100 text-green-700',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    const displayStatus = status || 'SCHEDULED';
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${badges[displayStatus] || 'bg-yellow-100 text-yellow-700'}`}>
        {displayStatus}
      </span>
    );
  };

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">✓ Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-medium">⏳ Pending Approval</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700 font-medium">✗ Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 font-medium">📝 Draft</span>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['Department', 'Month', 'Week', 'Audit Elements', 'Auditor', 'Auditee', 'Scheduled Date', 'Status'];
    const rows = schedules.map(schedule => [
      schedule.department,
      monthDisplay[schedule.month],
      schedule.week,
      schedule.auditElements && typeof schedule.auditElements === 'string' 
        ? (() => {
            try {
              const elements = JSON.parse(schedule.auditElements);
              return elements.map(el => auditElementsMap[el] || el.substring(0, 3)).join(', ');
            } catch(e) {
              return schedule.auditElements;
            }
          })()
        : schedule.auditElements?.map(el => auditElementsMap[el] || el.substring(0, 3)).join(', ') || '-',
      schedule.auditorName,
      schedule.auditeeName,
      schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-',
      schedule.status || 'SCHEDULED'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_schedule_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported successfully!', 'success');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading && !selectedMonth) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen print:p-2">
      {/* Header */}
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-purple-600 rounded-lg transition-colors"
              title="Go Back"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FiFileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Internal Quality Audit Schedule</h1>
              <p className="text-sm text-gray-500">Form 5 - IATF16949 Compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} - {year + 1}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium min-w-[180px]"
            >
              {availableMonths.length === 0 ? (
                <option value="">No schedules available</option>
              ) : (
                availableMonths.map(month => {
                  const statusIcon = month.approvalStatus === 'APPROVED' ? '✓' : 
                                    month.approvalStatus === 'PENDING_APPROVAL' ? '⏳' : 
                                    month.approvalStatus === 'REJECTED' ? '✗' : '📝';
                  return (
                    <option key={month.month} value={month.month}>
                      {statusIcon} {monthDisplay[month.month]} ({month.scheduleCount} schedules)
                    </option>
                  );
                })
              )}
            </select>
            <button
              onClick={fetchScheduleDetails}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" /> Export
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
            >
              <FiPrinter className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* No Data Message */}
      {!scheduleData && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiFileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No schedule found for {monthDisplay[selectedMonth]} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-2">Please select a different month or year.</p>
        </div>
      )}

      {/* Schedule Display in EXCEL FORMAT (List View) */}
      {scheduleData && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg print:shadow-none">
          
          {/* ===== HEADER: Company Name & Title ===== */}
          <div className="text-center py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Internal Quality Audit Schedule</h2>
            <p className="text-sm text-gray-500">{monthDisplay[scheduleData.month]} {scheduleData.year}</p>
            <div className="mt-2">{getApprovalStatusBadge(scheduleData.approvalStatus)}</div>
          </div>

          {/* ===== AUDIT OBJECTIVE SECTION ===== */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('objective')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4 text-blue-600" />
                Audit Objective
              </h3>
              {expandedSections.objective ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {expandedSections.objective && (
              <div className="p-4">
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {scheduleData.auditObjective || '* To assess the effectiveness and efficiency of the quality management system.\n* To verify compliance with IATF16949:2016 requirement.\n* To detect a particular problem for improvement.\n* Other.'}
                </p>
              </div>
            )}
          </div>

          {/* ===== AUDIT SCOPE SECTION ===== */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('scope')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiEye className="w-4 h-4 text-green-600" />
                Audit Scope
              </h3>
              {expandedSections.scope ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {expandedSections.scope && (
              <div className="p-4">
                <p className="text-sm text-gray-600">{scheduleData.auditScope || 'All elements of quality system'}</p>
              </div>
            )}
          </div>

          {/* ===== AUDITING TEAM SECTION ===== */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('team')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-purple-600" />
                Auditing Team
              </h3>
              {expandedSections.team ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {expandedSections.team && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <FiUserCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Lead Auditor:</span>
                    <span className="text-sm font-medium text-gray-800">{scheduleData.leadAuditorName || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUserPlus className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">Team Auditors:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {scheduleData.teamAuditorNames && scheduleData.teamAuditorNames.length > 0 
                        ? scheduleData.teamAuditorNames.join(', ') 
                        : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== SCHEDULE LIST TABLE (Main Data) ===== */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('schedule')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-orange-600" />
                Audit Schedule
              </h3>
              {expandedSections.schedule ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {expandedSections.schedule && (
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">S. No.</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Week</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Audit Elements</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Auditor Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Auditee Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Scheduled Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="border border-gray-300 text-center py-8 text-gray-400">
                          No schedules found for this month
                        </td>
                      </tr>
                    ) : (
                      schedules.map((schedule, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                          <td className="border border-gray-300 px-4 py-2 font-medium">{schedule.department}</td>
                          <td className="border border-gray-300 px-4 py-2">{schedule.week}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {schedule.auditElements && typeof schedule.auditElements === 'string' 
                                ? (() => {
                                    try {
                                      const elements = JSON.parse(schedule.auditElements);
                                      return elements.map((el, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs" title={el}>
                                          {auditElementsMap[el] || el.substring(0, 3)}
                                        </span>
                                      ));
                                    } catch(e) {
                                      return <span className="text-xs">{schedule.auditElements}</span>;
                                    }
                                  })()
                                : schedule.auditElements?.map((el, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs" title={el}>
                                      {auditElementsMap[el] || el.substring(0, 3)}
                                    </span>
                                  ))
                              }
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{schedule.auditorName || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2">{schedule.auditeeName || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{getStatusBadge(schedule.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ===== DOCUMENT CONTROL & APPROVAL SECTION ===== */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('document')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-gray-600" />
                Document Control & Approval
              </h3>
              {expandedSections.document ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {expandedSections.document && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Document Control */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Document Control</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex">
                        <span className="w-36 text-gray-500">Document Title:</span>
                        <span className="text-gray-800">Internal Quality audit Schedule sheet</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Document No.:</span>
                        <span className="text-gray-800">IQA/F/05</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Revision:</span>
                        <span className="text-gray-800">{scheduleData.documentRevision || '1.0'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Revision Date:</span>
                        <span className="text-gray-800">{scheduleData.revisionDate || '-'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Revision Details:</span>
                        <span className="text-gray-800">{scheduleData.revisionDetails || '-'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Audit Frequency:</span>
                        <span className="text-gray-800">{scheduleData.auditFrequency || 'Half yearly'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Approval</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex">
                        <span className="w-36 text-gray-500">Prepared By:</span>
                        <div>
                          <span className="text-gray-800">{scheduleData.preparedBy || 'N/A'}</span>
                          <span className="text-xs text-gray-400 ml-2">({scheduleData.preparedByPosition || 'Audit Manager'})</span>
                        </div>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Approved By:</span>
                        <div>
                          {scheduleData.approvalStatus === 'APPROVED' ? (
                            <>
                              <span className="text-gray-800">{scheduleData.approvedBy || 'Pending'}</span>
                              <span className="text-xs text-gray-400 ml-2">({scheduleData.approvedByPosition || 'Top Management'})</span>
                              {scheduleData.approvedAt && (
                                <span className="text-xs text-gray-400 ml-2">on {new Date(scheduleData.approvedAt).toLocaleDateString()}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Not approved yet</span>
                          )}
                        </div>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-500">Date:</span>
                        <span className="text-gray-800">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend - Audit Elements codes</h4>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="text-gray-600">A - System Audit (ISO9001)</span>
                    <span className="text-gray-600">B - System Audit (IATF16949)</span>
                    <span className="text-gray-600">C - 5S Audit</span>
                    <span className="text-gray-600">D - Process Audit</span>
                    <span className="text-gray-600">E - Product Audit</span>
                  </div>
                </div>

                {/* Audit Criteria Note */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-semibold">Audit Criteria:</span> ISO9001:2015 IATF16949 Standard, QMS Manual, QMS Procedures, WI, etc.<br />
                    <span className="font-semibold">Audit Scope:</span> Applicable process within department/function and clause No. 4, 5, 6, 7, 8, 9 &amp; 10<br />
                    <span className="font-semibold">Audit Method:</span> Interview with Auditee, Observation and verification to check compliance and achievement of planned results.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleDetailsView;