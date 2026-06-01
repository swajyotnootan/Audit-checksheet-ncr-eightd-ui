// src/components/forms/ScheduleListView.jsx
import React from 'react';
import { FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';

const ScheduleListView = ({ schedules, canEdit, onEdit, onDelete, auditElementsMap, getStatusBadge }) => {
  
  if (schedules.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        <FiCalendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No schedules found for this month</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Week</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Audit Elements</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Auditor</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Auditee</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              {canEdit && <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schedules.map((schedule) => {
              // Parse auditElements if it's a string (from backend)
              let auditElements = schedule.auditElements;
              if (typeof auditElements === 'string') {
                try {
                  auditElements = JSON.parse(auditElements);
                } catch(e) {
                  auditElements = [];
                }
              }
              
              return (
                <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{schedule.department}</td>
                  <td className="px-4 py-3">{schedule.week}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {auditElements?.map((el, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs" title={el}>
                          {auditElementsMap[el] || el.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{schedule.auditorName || '-'}</td>
                  <td className="px-4 py-3">{schedule.auditeeName || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(schedule.status)}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => onEdit(schedule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(schedule.id, schedule.month)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleListView;