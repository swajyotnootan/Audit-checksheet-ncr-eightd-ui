// src/components/forms/WeekSelectionView.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { 
  FiArrowLeft, FiCalendar, FiGrid, FiList, FiCheckCircle, 
  FiClock, FiAlertCircle, FiFileText, FiUsers, FiUserCheck,
  FiChevronLeft, FiChevronRight, FiPlus, FiEdit2, FiTrash2, FiRefreshCw
} from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';


const WeekSelectionView = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
const navigate = useNavigate();
  const [searchParams] = useSearchParams();
const urlYear = searchParams.get('year');
  
const [selectedYear, setSelectedYear] = useState(
  urlYear ? parseInt(urlYear) : new Date().getFullYear()
);   
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [weeklyData, setWeeklyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('months');
  
const [availableYears, setAvailableYears] = useState([]);
  
  const monthDisplay = {
    "Apr": "April", "May": "May", "Jun": "June", "Jul": "July",
    "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November",
    "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"
  };
  
  const financialMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
  
  // Helper function to get number of weeks in a month (4, 5, or 6)
  const getWeeksForMonth = (year, month) => {
    const monthMap = {
      "Apr": 3, "May": 4, "Jun": 5, "Jul": 6,
      "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10,
      "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2
    };
    
    const monthNum = monthMap[month];
    if (monthNum === undefined) return 4;
    
    const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    const weeks = Math.ceil((daysInMonth + firstDay) / 7);
    
    return weeks; // Returns 4, 5, or 6
  };
  
  // Week calculation
  const getWeekNumber = (dateStr) => {
  if (!dateStr) return 'W-1';
  const date = new Date(dateStr);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const dayOfMonth = date.getDate();
  // Remove the + firstDayOfWeek since Sunday is 0
  let weekNum = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  
  if (weekNum < 1) weekNum = 1;
  if (weekNum > 6) weekNum = 6;
  
  return `W-${weekNum}`;
};
  
  // Get date range for a specific week
  const getWeekDateRange = (year, month, week) => {
  const monthMap = {
    "Apr": 3, "May": 4, "Jun": 5, "Jul": 6,
    "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10,
    "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2
  };
  
  const monthNum = monthMap[month];
  if (monthNum === undefined) {
    return { startDate: `${year}-04-01`, endDate: `${year}-04-07` };
  }
  
  const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
  const firstDayOfMonth = new Date(actualYear, monthNum, 1);
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, no offset needed
  
  let startDay, endDay;
  const monthDays = new Date(actualYear, monthNum + 1, 0).getDate();
  
  switch(week) {
    case 'W-1':
      startDay = 1;
      endDay = 7 - firstDayWeekday;  // Changed: removed startOffset
      break;
    case 'W-2':
      startDay = 8 - firstDayWeekday;  // Changed: removed startOffset
      endDay = 14 - firstDayWeekday;   // Changed: removed startOffset
      break;
    case 'W-3':
      startDay = 15 - firstDayWeekday; // Changed: removed startOffset
      endDay = 21 - firstDayWeekday;   // Changed: removed startOffset
      break;
    case 'W-4':
      startDay = 22 - firstDayWeekday; // Changed: removed startOffset
      endDay = 28 - firstDayWeekday;   // Changed: removed startOffset
      break;
    case 'W-5':
      startDay = 29 - firstDayWeekday; // Changed: removed startOffset
      endDay = 35 - firstDayWeekday;   // Changed: removed startOffset
      break;
    case 'W-6':
      startDay = 36 - firstDayWeekday; // Changed: removed startOffset
      endDay = monthDays;
      break;
    default:
      startDay = 1;
      endDay = 7;
  }
  
  // Clamp values
  startDay = Math.max(1, Math.min(startDay, monthDays));
  endDay = Math.max(startDay, Math.min(endDay, monthDays));
  
  const pad = (n) => String(n).padStart(2, '0');
  const startDateStr = `${actualYear}-${pad(monthNum + 1)}-${pad(startDay)}`;
  const endDateStr = `${actualYear}-${pad(monthNum + 1)}-${pad(endDay)}`;
  
  // Return null if week doesn't exist (startDay > monthDays)
  if (startDay > monthDays) return null;
  
  return { startDate: startDateStr, endDate: endDateStr };
};
  
  // Fetch available months
  const fetchAvailableMonths = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = response.data || [];
      
      const approvedMonths = months.filter(month => 
        month.approvalStatus === 'APPROVED' && month.hasPlannedAudits
      );
      
      setAvailableMonths(approvedMonths);
    } catch (error) {
      console.error('Error fetching available months:', error);
      addToast('Failed to load months', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch weekly data for selected month
  const fetchWeeklyData = async (month) => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getByYearAndMonth(selectedYear, month);
      const schedules = response.data || [];
      const approvedSchedules = schedules.filter(s => s.approvalStatus === 'APPROVED');
      
      const weekData = {};
      weeks.forEach(week => {
        const weekSchedules = approvedSchedules.filter(s => s.week === week);
        weekData[week] = {
          scheduleCount: weekSchedules.length,
          departments: [...new Set(weekSchedules.map(s => s.department))],
          hasSchedules: weekSchedules.length > 0,
          schedules: weekSchedules
        };
      });
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      addToast('Failed to load week data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAvailableMonths();
  }, [selectedYear]);

  useEffect(() => {
    if (urlYear) {
      setSelectedYear(parseInt(urlYear));
    }
  }, [urlYear]);
  
    useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);
  
  useEffect(() => {
    if (selectedMonth) {
      fetchWeeklyData(selectedMonth);
      setViewMode('weeks');
    }
  }, [selectedMonth]);
  
  const handleMonthClick = (month) => {
    setSelectedMonth(month);
  };
  
  const handleBackToMonths = () => {
    setSelectedMonth(null);
    setViewMode('months');
  };
  
  const handleWeekClick = (week, weekData) => {
    if (!weekData.hasSchedules) {
      addToast(`No schedules found for ${week}. Please add schedules in Form 5 first.`, 'warning');
      return;
    }
    
    const dateRange = getWeekDateRange(selectedYear, selectedMonth, week);
    if (!dateRange) {
      addToast(`Week ${week} does not exist in this month`, 'warning');
      return;
    }
    
    navigate('/form5-detailed', {
      state: {
        year: selectedYear,
        month: selectedMonth,
        preSelectedWeek: week,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    });
  };
  
  const getWeekStatusBadge = (weekData) => {
    if (!weekData.hasSchedules) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
          No Schedules
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
        <FiCheckCircle className="w-3 h-3 mr-1" />
        {weekData.scheduleCount} Schedule(s)
      </span>
    );
  };
  
  const getMonthStatusBadge = (month) => {
    if (month.approvalStatus === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
          <FiCheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
        <FiClock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };
  
  if (loading && viewMode === 'months') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <FiCalendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Audit Schedule Calendar</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {viewMode === 'months' ? 'Select a month to view weekly schedules' : `${monthDisplay[selectedMonth]} ${selectedYear} - Weekly Schedule`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} - {year + 1}</option>
                ))}
              </select>
              {viewMode === 'weeks' && (
                <button
                  onClick={handleBackToMonths}
                  className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 flex items-center gap-2 transition-all"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Back to Months
                </button>
              )}
              <button
                onClick={() => {
                  if (viewMode === 'months') {
                    fetchAvailableMonths();
                  } else {
                    fetchWeeklyData(selectedMonth);
                  }
                }}
                className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Month Grid View */}
        {viewMode === 'months' && (
          <>
            {availableMonths.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <FiCalendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No approved months found for {selectedYear}</p>
                <p className="text-sm text-slate-400 mt-2">Please complete Form 5 and get approval first.</p>
                <button
                  onClick={() => navigate('/form5')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                >
                  Go to Form 5
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {financialMonths.map(month => {
                  const monthData = availableMonths.find(m => m.month === month);
                  const isApproved = monthData?.approvalStatus === 'APPROVED';
                  const hasPlannedAudits = monthData?.hasPlannedAudits || false;
                  
                  if (!hasPlannedAudits) return null;
                  
                  return (
                    <div
                      key={month}
                      onClick={() => isApproved && handleMonthClick(month)}
                      className={`bg-white rounded-2xl border-2 p-5 transition-all cursor-pointer
                        ${isApproved 
                          ? 'border-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1' 
                          : 'border-slate-200 opacity-60 cursor-not-allowed'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-slate-800">{monthDisplay[month]}</h3>
                        {getMonthStatusBadge(monthData || { approvalStatus: 'DRAFT' })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <FiCalendar className="w-4 h-4" />
                        <span>{selectedYear}</span>
                      </div>
                      {isApproved && (
                        <div className="mt-3 flex items-center gap-2 text-indigo-600 text-sm">
                          <FiGrid className="w-4 h-4" />
                          <span>Click to view weeks</span>
                          <FiChevronRight className="w-4 h-4 ml-auto" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {/* Week Grid View */}
        {viewMode === 'weeks' && (
          <>
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-indigo-800">{monthDisplay[selectedMonth]} {selectedYear}</h2>
                  <p className="text-sm text-indigo-600 mt-1">Select a week to create daily schedule</p>
                </div>
                <button
                  onClick={() => navigate('/form5')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 text-sm"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit Week Schedule
                </button>
              </div>
            </div>
            
            {/* Dynamic grid for 4, 5, or 6 weeks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              {weeks.map(week => {
                const weekNum = parseInt(week.split('-')[1]);
                const monthWeeksCount = getWeeksForMonth(selectedYear, selectedMonth);
                const dateRange = getWeekDateRange(selectedYear, selectedMonth, week);
                const weekData = weeklyData[week] || { hasSchedules: false, scheduleCount: 0, departments: [] };
                const isScheduled = weekData.hasSchedules;
                
                // Skip weeks that don't exist in this month
                if (weekNum > monthWeeksCount) return null;
                if (!dateRange) return null;
                
                return (
                  <div
                    key={week}
                    onClick={() => handleWeekClick(week, weekData)}
                    className={`bg-white rounded-2xl border-2 p-5 transition-all cursor-pointer
                      ${isScheduled 
                        ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1' 
                        : 'border-slate-200 opacity-60 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold text-slate-800">{week}</h3>
                      {getWeekStatusBadge(weekData)}
                    </div>
                    
                    <div className="text-sm text-slate-500 mb-3">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4" />
                        <span>{dateRange.startDate} to {dateRange.endDate}</span>
                      </div>
                    </div>
                    
                    {isScheduled && weekData.departments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-2">Departments:</p>
                        <div className="flex flex-wrap gap-1">
                          {weekData.departments.slice(0, 3).map(dept => (
                            <span key={dept} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {dept}
                            </span>
                          ))}
                          {weekData.departments.length > 3 && (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                              +{weekData.departments.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {isScheduled && (
                      <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm">
                        <FiCheckCircle className="w-4 h-4" />
                        <span>Create Daily Schedule</span>
                        <FiChevronRight className="w-4 h-4 ml-auto" />
                      </div>
                    )}
                    
                    {!isScheduled && (
                      <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
                        <FiClock className="w-4 h-4" />
                        <span>No schedules yet</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Legend</h4>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div>
                  <span className="text-slate-600">Week has schedules - Click to create daily schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded"></div>
                  <span className="text-slate-600">No schedules - Complete Form 5 first</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeekSelectionView;