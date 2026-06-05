import React from 'react';
import { FiPlus, FiTrash2, FiUsers } from 'react-icons/fi';

const ScheduleMatrixView = ({ 
  departments, deptPlanData, selectedMonth, schedules, weeks, 
  canEdit, onCellClick, onDeleteSchedule, auditElementsMap, getStatusBadge, selectedYear 
}) => {
  
  const getScheduleForCell = (department, week) => {
    return schedules.find(s => s.department === department && s.week === week && s.month === selectedMonth);
  };

  const getAuditElementsForDept = (department) => {
    return deptPlanData[department]?.find(m => m.month === selectedMonth)?.elements || [];
  };

  const displayDepartments = departments.length > 0 ? departments : [];

  // Helper function to check if a week has any working days
  const getWeekWorkingDays = (year, month, week) => {
  const weekNum = parseInt(week.split('-')[1]);
  
  const monthMap = {
    "Apr": 3, "May": 4, "Jun": 5, "Jul": 6,
    "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10,
    "Dec": 11, "Jan": 0, "Feb": 1, "Mar": 2
  };
  
  const monthNum = monthMap[month];
  if (monthNum === undefined) return { hasWorkingDays: true, workingDaysCount: 5, isOnlySunday: false };
  
  const actualYear = (month === "Jan" || month === "Feb" || month === "Mar") ? year + 1 : year;
  const firstDayOfMonth = new Date(actualYear, monthNum, 1);
  // Change: Sunday is now day 0 (was Monday as day 1)
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Change: No offset needed for Sunday-based weeks
  let startDay, endDay;
  const monthDays = new Date(actualYear, monthNum + 1, 0).getDate();
  
  // Change: Adjusted week calculations for Sunday-first weeks
  switch(weekNum) {
    case 1: startDay = 1; endDay = 7 - firstDayWeekday; break;
    case 2: startDay = 8 - firstDayWeekday; endDay = 14 - firstDayWeekday; break;
    case 3: startDay = 15 - firstDayWeekday; endDay = 21 - firstDayWeekday; break;
    case 4: startDay = 22 - firstDayWeekday; endDay = 28 - firstDayWeekday; break;
    case 5: startDay = 29 - firstDayWeekday; endDay = 35 - firstDayWeekday; break;
    case 6: startDay = 36 - firstDayWeekday; endDay = monthDays; break;
    default: return { hasWorkingDays: true, workingDaysCount: 5, isOnlySunday: false };
  }
  
  startDay = Math.max(1, Math.min(startDay, monthDays));
  endDay = Math.max(startDay, Math.min(endDay, monthDays));
  
  let workingDaysCount = 0;
  let isOnlySunday = true;
  
  for (let day = startDay; day <= endDay; day++) {
    const date = new Date(actualYear, monthNum, day);
    const dayOfWeek = date.getDay();
    // Working days: Monday(1) to Friday(5), excluding Sunday(0) and Saturday(6)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysCount++;
      isOnlySunday = false;
    }
  }
  
  return { 
    hasWorkingDays: workingDaysCount > 0, 
    workingDaysCount, 
    isOnlySunday
  };
};

  // Helper to get display text for multiple items
  const getDisplayNames = (names, maxDisplay = 2) => {
    if (!names || names.length === 0) return '-';
    if (names.length === 1) return names[0].split(' ')[0];
    if (names.length <= maxDisplay) {
      return names.map(n => n.split(' ')[0]).join(', ');
    }
    return `${names.slice(0, maxDisplay).map(n => n.split(' ')[0]).join(', ')} +${names.length - maxDisplay}`;
  };

  // Helper to get tooltip text
  const getTooltipText = (names, type) => {
    if (!names || names.length === 0) return `No ${type}`;
    if (names.length === 1) return `${type}: ${names[0]}`;
    return `${type} (${names.length}):\n${names.join('\n')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-44">Area/Department</th>
              {weeks.map(week => {
                const workingInfo = getWeekWorkingDays(selectedYear, selectedMonth, week);
                return (
                  <th key={week} className="px-4 py-3 text-center font-semibold text-gray-700 w-48">
                    {week}
                    {!workingInfo.hasWorkingDays && (
                      <span className="block text-xs text-red-500 font-normal">
                        ⚠️ No working days
                      </span>
                    )}
                    {workingInfo.hasWorkingDays && workingInfo.workingDaysCount <= 2 && (
                      <span className="block text-xs text-orange-500 font-normal">
                        Only {workingInfo.workingDaysCount} day(s)
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayDepartments.length === 0 ? (
              <tr>
                <td colSpan={weeks.length + 1} className="text-center py-12 text-gray-400">
                  No departments available
                </td>
              </tr>
            ) : (
              displayDepartments.map((department) => {
                const auditElements = getAuditElementsForDept(department);
                return (
                  <tr key={department} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 border-r align-top">
                      {department}
                      {auditElements.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                          {auditElements.map(el => (
                            <span key={el} className="inline-block px-1.5 py-0.5 bg-blue-100 rounded text-xs" title={el}>
                              {auditElementsMap[el] || el.substring(0, 1)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {weeks.map((week) => {
                      const schedule = getScheduleForCell(department, week);
                      const workingInfo = getWeekWorkingDays(selectedYear, selectedMonth, week);
                      const canClick = canEdit && workingInfo.hasWorkingDays;
                      
                      // Get co-auditor names (team auditors)
                      const coAuditorNames = schedule?.coAuditorNames || schedule?.teamAuditorNames || [];
                      const auditeeNames = schedule?.auditeeNames || [];
                      const primaryAuditorName = schedule?.auditorName || schedule?.leadAuditorName || '';
                      
                      return (
                        <td 
                          key={week} 
                          className={`px-2 py-2 text-center border-r last:border-r-0 align-top transition-colors
                            ${canClick ? 'cursor-pointer hover:bg-purple-50' : 'cursor-not-allowed opacity-60 bg-gray-50'}
                          `}
                          onClick={() => canClick && onCellClick(department, week, schedule)}
                        >
                          {schedule ? (
                            <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                              {/* Primary Auditor */}
                              <div className="font-semibold text-sm text-blue-700" title={`Lead Auditor: ${primaryAuditorName}`}>
                                {primaryAuditorName?.split(' ')[0] || '-'}
                              </div>
                              
                              {/* Co-Auditors (Team) */}
                              {coAuditorNames.length > 0 && (
                                <div 
                                  className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1 cursor-help"
                                  title={getTooltipText(coAuditorNames, 'Co-Auditors')}
                                >
                                  <FiUsers className="w-3 h-3" />
                                  <span>{getDisplayNames(coAuditorNames, 2)}</span>
                                </div>
                              )}
                              
                              {/* Audit Elements */}
                              <div className="text-xs text-gray-500 font-mono mt-1">
                                {schedule.auditElements?.map(el => auditElementsMap[el] || el.substring(0, 1)).join(', ') || '-'}
                              </div>
                              
                              {/* Auditees */}
                              {auditeeNames.length > 0 && (
                                <div 
                                  className="text-xs text-purple-600 mt-1 cursor-help"
                                  title={getTooltipText(auditeeNames, 'Auditees')}
                                >
                                  👥 {getDisplayNames(auditeeNames, 2)}
                                </div>
                              )}
                              
                              {/* Status Badge */}
                              <div className="text-xs mt-1">{getStatusBadge(schedule.status)}</div>
                              
                              {/* Delete Button */}
                              {canEdit && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteSchedule(schedule.id, schedule.month); }}
                                  className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <FiTrash2 className="w-3 h-3 inline" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-xs py-3">
                              {workingInfo.hasWorkingDays ? (
                                <>
                                  <FiPlus className="w-4 h-4 mx-auto mb-1 opacity-50" />
                                  <span>Click to add</span>
                                </>
                              ) : (
                                <span className="text-red-400 text-xs">No working days</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleMatrixView;