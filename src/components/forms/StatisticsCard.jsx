// src/components/forms/StatisticsCard.jsx
import React from 'react';
import { FiBarChart2, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const StatisticsCard = ({ monthDisplay, stats, showSummary, setShowSummary }) => {
  return (
    <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <FiBarChart2 className="w-4 h-4" />
          {monthDisplay} - Audit Schedule Summary
        </h3>
        <button onClick={() => setShowSummary(!showSummary)} className="text-purple-600 hover:text-purple-800">
          {showSummary ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {showSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{stats.totalSchedules || 0}</p>
            <p className="text-xs text-gray-500">Total Schedules</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.departmentsCount || 0}</p>
            <p className="text-xs text-gray-500">Departments</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.weeksCovered || 0}</p>
            <p className="text-xs text-gray-500">Weeks Covered</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.scheduled || 0}</p>
            <p className="text-xs text-gray-500">Scheduled</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.completed || 0}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsCard;