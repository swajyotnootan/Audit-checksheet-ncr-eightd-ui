// src/components/views/ViewDetailedSchedule.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/context/AuthContext';
import { useToast } from '../../components/ToastContext';
import axios from 'axios';
import { 
  FiArrowLeft, FiCalendar, FiClock, FiUsers, FiEye, 
  FiRefreshCw, FiDownload, FiPrinter, FiSearch,
  FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertCircle,
  FiUserCheck, FiUserPlus, FiFileText
} from 'react-icons/fi';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090
/api';

const ViewDetailedSchedule = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [detailedSchedules, setDetailedSchedules] = useState([]);
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [availableYears] = useState([2024, 2025, 2026]);

  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };

  // Fetch available months (only those with detailed schedules)
  const fetchAvailableMonths = async () => {
    try {
      const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, {
        withCredentials: true
      });
      const allSchedules = response.data || [];
      const detailedOnly = allSchedules.filter(s => s.timeSlot);
      const monthsSet = new Set();
      detailedOnly.forEach(s => monthsSet.add(s.month));
      
      const months = Array.from(monthsSet).map(month => ({
        month: month,
        scheduleCount: detailedOnly.filter(s => s.month === month).length
      }));
      setAvailableMonths(months);
      
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0].month);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  // Fetch detailed schedules
  const fetchDetailedSchedules = async () => {
    if (!selectedMonth) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audit-schedule/year/${selectedYear}`, {
        withCredentials: true
      });
      const allSchedules = response.data || [];
      const detailed = allSchedules.filter(s => s.month === selectedMonth && s.timeSlot);
      setDetailedSchedules(detailed);
    } catch (error) {
      console.error('Error fetching detailed schedules:', error);
      addToast('Failed to load detailed schedules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth) {
      fetchDetailedSchedules();
    }
  }, [selectedMonth, selectedYear]);

  const getStatusBadge = (status) => {
    const badges = {
      'COMPLETED': 'bg-green-100 text-green-700',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    const icons = {
      'COMPLETED': <FiCheckCircle className="inline mr-1 w-3 h-3" />,
      'IN_PROGRESS': <FiClock className="inline mr-1 w-3 h-3" />,
      'CANCELLED': <FiAlertCircle className="inline mr-1 w-3 h-3" />
    };
    const displayStatus = status || 'SCHEDULED';
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${badges[displayStatus] || 'bg-yellow-100 text-yellow-700'}`}>
        {icons[displayStatus]} {displayStatus}
      </span>
    );
  };

  const filteredSchedules = detailedSchedules.filter(schedule => {
    if (filterStatus !== 'all' && schedule.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return schedule.department?.toLowerCase().includes(search) ||
             schedule.auditorName?.toLowerCase().includes(search) ||
             schedule.auditeeName?.toLowerCase().includes(search);
    }
    return true;
  });

  const handlePrint = () => window.print();
  
  const handleExport = () => {
    const headers = ['Date', 'Time Slot', 'Department', 'Week', 'Auditor', 'Auditee', 'Status'];
    const rows = filteredSchedules.map(s => [
      s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : '-',
      s.timeSlot || '-',
      s.department,
      s.week,
      s.auditorName,
      s.auditeeName,
      s.status || 'SCHEDULED'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed_schedule_${selectedMonth}_${selectedYear}.csv`;
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
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-purple-600 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
              <FiClock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Detailed Audit Schedule</h1>
              <p className="text-sm text-gray-500">Form 5 - Internal Audite Schedule (Date & Time Wise)</p>
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
                <option value="">No detailed schedules available</option>
              ) : (
                availableMonths.map(month => (
                  <option key={month.month} value={month.month}>
                    {monthDisplay[month.month]} ({month.scheduleCount} schedules)
                  </option>
                ))
              )}
            </select>
            <button onClick={fetchDetailedSchedules} className="p-2 text-gray-500 hover:text-teal-600 rounded-lg">
              <FiRefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleExport} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
              <FiDownload className="w-4 h-4" /> Export
            </button>
            <button onClick={handlePrint} className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2">
              <FiPrinter className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-teal-700">{detailedSchedules.length}</p>
          <p className="text-xs text-gray-500">Total Schedules</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-yellow-700">
            {detailedSchedules.filter(s => s.status === 'SCHEDULED' || !s.status).length}
          </p>
          <p className="text-xs text-gray-500">Scheduled</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-blue-700">
            {detailedSchedules.filter(s => s.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-green-700">
            {detailedSchedules.filter(s => s.status === 'COMPLETED').length}
          </p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setFilterStatus('all')} className={`px-3 py-1 rounded-full text-xs ${filterStatus === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
          <button onClick={() => setFilterStatus('SCHEDULED')} className={`px-3 py-1 rounded-full text-xs ${filterStatus === 'SCHEDULED' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Scheduled</button>
          <button onClick={() => setFilterStatus('IN_PROGRESS')} className={`px-3 py-1 rounded-full text-xs ${filterStatus === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>In Progress</button>
          <button onClick={() => setFilterStatus('COMPLETED')} className={`px-3 py-1 rounded-full text-xs ${filterStatus === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Completed</button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by department, auditor, auditee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* No Data Message */}
      {filteredSchedules.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiClock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No detailed schedules found for {monthDisplay[selectedMonth]} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-2">Please complete Step 1 (Basic Schedule) and get approval first.</p>
        </div>
      )}

      {/* Detailed Schedule Table */}
      {filteredSchedules.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time Slot</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Auditor</th>
                  <th className="px-4 py-3 text-left">Auditee</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSchedules.map((schedule, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-'}
                     </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {schedule.timeSlot || '-'}
                      </span>
                     </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{schedule.department}</td>
                    <td className="px-4 py-3">{schedule.week}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FiUserCheck className="w-3 h-3 text-blue-500" />
                        {schedule.auditorName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FiUserPlus className="w-3 h-3 text-green-500" />
                        {schedule.auditeeName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(schedule.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold">Note:</span> Detailed schedules show specific date and time slots for each audit. 
          These schedules are created after the basic schedule is approved by Top Management.
        </p>
      </div>
    </div>
  );
};

export default ViewDetailedSchedule;