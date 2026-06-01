// src/components/DashboardCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Eye } from 'lucide-react';

export default function DashboardCard({ department, stats, onView, onAudit, canInitiate }) {
  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-${department.color || 'blue'}-50 rounded-lg`}>
            <FileText className={`w-5 h-5 text-${department.color || 'blue'}-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{department.name}</h3>
            <p className="text-xs text-gray-500">{department.code}</p>
          </div>
        </div>
        {stats?.status && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor[stats.status] || statusColor.default}`}>
            {stats.status}
          </span>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="p-2 bg-gray-50 rounded border">
            <p className="text-lg font-bold text-gray-900">{stats.total ?? 0}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="p-2 bg-green-50 rounded border">
            <p className="text-lg font-bold text-green-700">{stats.completed ?? 0}</p>
            <p className="text-xs text-gray-500">Done</p>
          </div>
          <div className="p-2 bg-yellow-50 rounded border">
            <p className="text-lg font-bold text-yellow-700">{stats.pending ?? 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
        </div>
      )}

      {/* Last Activity */}
      {stats?.lastAudit && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-3 border-b">
          <Clock className="w-3 h-3" />
          <span>Last audit: {stats.lastAudit}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView?.(department.code)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        {canInitiate && (
          <Link
            to={`/audit/${department.code}`}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}