// components/AuditHistory.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FiSearch, FiEye, FiDownload, FiCalendar, FiUser, 
  FiCheckCircle, FiXCircle, FiClock, FiAlertCircle,
  FiFilter, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiFileText, FiBarChart2
} from 'react-icons/fi';
import { useAuth } from '../components/context/AuthContext';
import { useToast } from '../components/ToastContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090/api';

const AuditHistory = () => {
  const { user } = useAuth();
  const toastContext = useToast();  // ← Get the context first
  const addToast = toastContext?.addToast;  // ← Safe access
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [filteredAudits, setFilteredAudits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [userNames, setUserNames] = useState({});

  // Helper function to show toast safely
  const showToast = (message, type = 'info') => {
    if (addToast) {
      addToast(message, type);
    } else {
      console.log(`[Toast] ${type}: ${message}`);
    }
  };

  // Fetch all audits
  const fetchAudits = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/audits/all`, {
        withCredentials: true
      });
      
      console.log('📋 Audit History Response:', response.data);
      
      let auditsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
      // Fetch user names for auditors and auditees
      for (const audit of auditsData) {
        if (audit.auditorId && !userNames[audit.auditorId]) {
          await fetchUserName(audit.auditorId);
        }
        if (audit.auditeeId && !userNames[audit.auditeeId]) {
          await fetchUserName(audit.auditeeId);
        }
      }
      
      setAudits(auditsData);
      setFilteredAudits(auditsData);
    } catch (error) {
      console.error('Error fetching audits:', error);
      showToast('Failed to load audit history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserName = async (userId) => {
    if (!userId || userNames[userId]) return;
    
    try {
      const response = await axios.get(`${API_BASE}/users/${userId}`, {
        withCredentials: true
      });
      if (response.data) {
        const name = `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim() || 
                     response.data.username || userId;
        setUserNames(prev => ({ ...prev, [userId]: name }));
      }
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      setUserNames(prev => ({ ...prev, [userId]: `User ${userId}` }));
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  useEffect(() => {
    let filtered = [...audits];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(audit => 
        audit.auditName?.toLowerCase().includes(term) ||
        audit.department?.toLowerCase().includes(term) ||
        audit.processName?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(audit => audit.status === statusFilter);
    }
    
    setFilteredAudits(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, audits]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'SCHEDULED': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FiClock className="w-3 h-3" />, label: 'Scheduled' },
      'IN_PROGRESS': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <FiClock className="w-3 h-3" />, label: 'In Progress' },
      'COMPLETED': { bg: 'bg-green-100', text: 'text-green-700', icon: <FiCheckCircle className="w-3 h-3" />, label: 'Completed' },
      'APPROVED': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <FiCheckCircle className="w-3 h-3" />, label: 'Approved' },
      'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', icon: <FiXCircle className="w-3 h-3" />, label: 'Rejected' },
      'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FiXCircle className="w-3 h-3" />, label: 'Cancelled' }
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FiFileText className="w-3 h-3" />, label: status };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getDisplayName = (userId) => {
    if (!userId) return 'N/A';
    return userNames[userId] || `User ${userId}`;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAudits.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAudits.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Calculate statistics
  const totalAudits = audits.length;
  const completedAudits = audits.filter(a => a.status === 'COMPLETED' || a.status === 'APPROVED').length;
  const pendingAudits = audits.filter(a => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS').length;
  const rejectedAudits = audits.filter(a => a.status === 'REJECTED').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiBarChart2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Audit History</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and track all audit activities</p>
            <p className="text-xs text-gray-400 mt-1">
              Logged in as: <span className="font-medium">{user?.name || user?.username}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Audits</p>
              <p className="text-2xl font-bold text-gray-800">{totalAudits}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiFileText className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedAudits}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pendingAudits}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <FiClock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedAudits}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <FiAlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by audit name, department, or process..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <button
              onClick={fetchAudits}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <div className="text-4xl mb-3 opacity-50">📋</div>
          <p className="text-gray-500">No audit records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Audit Name</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Auditor</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Score</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((audit) => {
                  const status = getStatusBadge(audit.status);
                  return (
                    <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-800">{audit.auditName || audit.scheduleName || `Audit ${audit.id}`}</span>
                        {audit.processName && (
                          <p className="text-xs text-gray-400 mt-0.5">{audit.processName}</p>
                        )}
                       </td>
                      <td className="px-5 py-3 text-gray-600">{audit.department || '-'}</td>
                      <td className="px-5 py-3 text-gray-600">{getDisplayName(audit.auditorId)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {formatDate(audit.scheduledDate || audit.createdAt)}
                       </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.bg} ${status.text}`}>
                          {status.icon}
                          {status.label}
                        </span>
                       </td>
                      <td className="px-5 py-3">
                        {audit.score ? (
                          <span className={`font-semibold ${audit.score >= 80 ? 'text-green-600' : audit.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {audit.score}%
                          </span>
                        ) : '-'}
                       </td>
                      <td className="px-5 py-3 text-center">
                        <Link
                          to={`/audit/view/${audit.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-purple-100 hover:text-purple-700 transition-colors"
                        >
                          <FiEye className="w-4 h-4" />
                          View
                        </Link>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            
            if (pageNum > 0 && pageNum <= totalPages) {
              return (
                <button
                  key={i}
                  onClick={() => paginate(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            }
            return null;
          })}
          
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditHistory;