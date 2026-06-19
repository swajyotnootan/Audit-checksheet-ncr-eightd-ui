// src/components/forms/ApprovedSchedulesView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';
import { 
  FiCalendar, FiFileText, FiUsers, FiEye, FiCheckCircle,
  FiClock, FiArrowLeft, FiDownload, FiPrinter, FiSearch,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiRefreshCw
} from 'react-icons/fi';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

const ApprovedSchedulesView = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [approvedSchedules, setApprovedSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);
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

  // Fetch approved schedules
  const fetchApprovedSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, {
        withCredentials: true
      });
      const allSchedules = response.data || [];
      
      // Group by month and filter only APPROVED
      const monthMap = new Map();
      
      allSchedules.forEach(schedule => {
        if (schedule.approvalStatus === 'APPROVED') {
          const month = schedule.month;
          if (!monthMap.has(month)) {
            monthMap.set(month, {
              month: month,
              year: selectedYear,
              schedules: [],
              auditObjective: schedule.auditObjective,
              auditScope: schedule.auditScope,
              leadAuditorName: schedule.leadAuditorName,
              preparedBy: schedule.preparedByName,
              approvedBy: schedule.approvedByName,
              approvedAt: schedule.approvedAt,
              auditFrequency: schedule.auditFrequency,
              documentRevision: schedule.documentRevision
            });
          }
          monthMap.get(month).schedules.push(schedule);
        }
      });
      
      const grouped = Array.from(monthMap.values());
      setApprovedSchedules(grouped);
    } catch (error) {
      console.error('Error fetching approved schedules:', error);
      addToast('Failed to load approved schedules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedSchedules();
  }, [selectedYear]);

  // Filter schedules based on search
  const filteredSchedules = approvedSchedules.filter(group => 
    monthDisplay[group.month].toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leadAuditorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.preparedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV export
    const headers = ['Department', 'Month', 'Week', 'Audit Elements', 'Auditor', 'Auditee', 'Scheduled Date', 'Status'];
    const rows = [];
    
    approvedSchedules.forEach(group => {
      group.schedules.forEach(schedule => {
        rows.push([
          schedule.department,
          monthDisplay[group.month],
          schedule.week,
          schedule.auditElements?.map(el => auditElementsMap[el] || el.substring(0, 3)).join(', '),
          schedule.auditorName,
          schedule.auditeeName,
          schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-',
          schedule.status || 'SCHEDULED'
        ]);
      });
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approved_schedules_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported successfully!', 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg">
              <FiCheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Approved Audit Schedules</h1>
              <p className="text-sm text-gray-500">View all approved audit schedules - Form 5</p>
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
            <button
              onClick={fetchApprovedSchedules}
              className="p-2 text-gray-500 hover:text-green-600 rounded-lg transition-colors"
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
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm transition-all flex items-center gap-1 ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:bg-gray-300'}`}
              >
                <FiList className="w-3 h-3" /> List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm transition-all flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:bg-gray-300'}`}
              >
                <FiGrid className="w-3 h-3" /> Grid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by month, lead auditor, prepared by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-green-700">{approvedSchedules.length}</p>
          <p className="text-xs text-gray-500">Months with Approved Schedules</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-blue-700">
            {approvedSchedules.reduce((sum, group) => sum + group.schedules.length, 0)}
          </p>
          <p className="text-xs text-gray-500">Total Approved Schedules</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-purple-700">
            {[...new Set(approvedSchedules.flatMap(group => group.schedules.map(s => s.department)))].length}
          </p>
          <p className="text-xs text-gray-500">Departments Covered</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-amber-700">
            {approvedSchedules.reduce((sum, group) => sum + group.schedules.filter(s => s.status === 'COMPLETED').length, 0)}
          </p>
          <p className="text-xs text-gray-500">Completed Audits</p>
        </div>
      </div>

      {/* No Data Message */}
      {filteredSchedules.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiCheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No approved schedules found for {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-2">Approved schedules will appear here once Top Management approves them.</p>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && filteredSchedules.length > 0 && (
        <div className="space-y-4">
          {filteredSchedules.map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Month Header */}
              <div 
                className="px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200 cursor-pointer hover:from-green-100 hover:to-teal-100 transition-colors"
                onClick={() => setExpandedMonth(expandedMonth === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiCalendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {monthDisplay[group.month]} {group.year}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Lead Auditor: {group.leadAuditorName || 'Not assigned'}</span>
                        <span>Prepared by: {group.preparedBy || 'N/A'}</span>
                        <span>Schedules: {group.schedules.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ Approved</span>
                    {group.approvedAt && (
                      <span className="text-xs text-gray-400">
                        Approved on: {new Date(group.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                    {expandedMonth === idx ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>
              
              {/* Expanded Content - Schedules Table */}
              {expandedMonth === idx && (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-left">Week</th>
                        <th className="px-3 py-2 text-left">Audit Elements</th>
                        <th className="px-3 py-2 text-left">Auditor</th>
                        <th className="px-3 py-2 text-left">Auditee</th>
                        <th className="px-3 py-2 text-left">Scheduled Date</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.schedules.map((schedule, sIdx) => (
                        <tr key={sIdx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{schedule.department}</td>
                          <td className="px-3 py-2">{schedule.week}</td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2">{schedule.auditorName || '-'}</td>
                          <td className="px-3 py-2">{schedule.auditeeName || '-'}</td>
                          <td className="px-3 py-2">{schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2">{getStatusBadge(schedule.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Document Info Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Document Revision: {group.documentRevision || '1.0'}</div>
                      <div>Audit Frequency: {group.auditFrequency || 'Half yearly'}</div>
                    </div>
                    <div className="mt-1">Audit Objective: {group.auditObjective?.substring(0, 100)}...</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && filteredSchedules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{monthDisplay[group.month]} {group.year}</h3>
                    <p className="text-xs text-gray-500 mt-1">{group.schedules.length} schedules</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Lead Auditor:</span>
                    <span className="font-medium">{group.leadAuditorName || 'Not assigned'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Prepared by:</span>
                    <span>{group.preparedBy || 'N/A'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Approved on:</span>
                    <span>{group.approvedAt ? new Date(group.approvedAt).toLocaleDateString() : '-'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Departments:</span>
                    <span>{[...new Set(group.schedules.map(s => s.department))].length}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSchedule(group);
                    setShowDetailModal(true);
                  }}
                  className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FiEye className="w-4 h-4" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">
                  {monthDisplay[selectedSchedule.month]} {selectedSchedule.year} - Audit Schedule
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Lead Auditor: {selectedSchedule.leadAuditorName || 'Not assigned'} | 
                  Prepared by: {selectedSchedule.preparedBy || 'N/A'}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-6">
              {/* Schedules Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border">Department</th>
                      <th className="px-3 py-2 text-left border">Week</th>
                      <th className="px-3 py-2 text-left border">Audit Elements</th>
                      <th className="px-3 py-2 text-left border">Auditor</th>
                      <th className="px-3 py-2 text-left border">Auditee</th>
                      <th className="px-3 py-2 text-left border">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSchedule.schedules.map((schedule, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">{schedule.department}</td>
                        <td className="px-3 py-2 border">{schedule.week}</td>
                        <td className="px-3 py-2 border">
                          <div className="flex flex-wrap gap-1">
                            {schedule.auditElements && typeof schedule.auditElements === 'string' 
                              ? (() => {
                                  try {
                                    const elements = JSON.parse(schedule.auditElements);
                                    return elements.map((el, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        {auditElementsMap[el] || el.substring(0, 3)}
                                      </span>
                                    ));
                                  } catch(e) {
                                    return <span className="text-xs">{schedule.auditElements}</span>;
                                  }
                                })()
                              : schedule.auditElements?.map((el, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    {auditElementsMap[el] || el.substring(0, 3)}
                                  </span>
                                ))
                            }
                          </div>
                        </td>
                        <td className="px-3 py-2 border">{schedule.auditorName || '-'}</td>
                        <td className="px-3 py-2 border">{schedule.auditeeName || '-'}</td>
                        <td className="px-3 py-2 border">{getStatusBadge(schedule.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-1">Legend - Audit Elements codes:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-gray-500">A - System Audit (ISO9001)</span>
                  <span className="text-gray-500">B - System Audit (IATF16949)</span>
                  <span className="text-gray-500">C - 5S Audit</span>
                  <span className="text-gray-500">D - Process Audit</span>
                  <span className="text-gray-500">E - Product Audit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedSchedulesView;