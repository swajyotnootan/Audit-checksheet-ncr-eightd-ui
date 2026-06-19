// PokaYokeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { auditScheduleApi } from '../../../services/auditScheduleApi';
import { useToast } from '../../ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, RefreshCw, PlusCircle, Wrench, ClipboardList, 
  MapPin, User, Users, Eye, Edit, Clock, CheckCircle, 
  AlertCircle, FileText, Send, Search, XCircle
} from 'lucide-react';

const PAGE_SIZES = [5, 10, 15, 20, 30, 50];

const statusClasses = {
  DRAFT: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-emerald-100 text-emerald-800"
};

// StatCard component with fixed colors
const StatCard = ({ title, value, color, icon }) => {
  const getColorClasses = () => {
    switch(color) {
      case 'orange': return 'bg-orange-100 text-orange-600';
      case 'gray': return 'bg-gray-100 text-gray-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'emerald': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };
  
  return (
    <div className="p-3 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${getColorClasses()}`}>
            {icon}
          </div>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
        <span className={`text-xl font-bold text-${color}-600`}>{value}</span>
      </div>
    </div>
  );
};

export default function PokaYokeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [pokaYokeCheckSheetIds, setPokaYokeCheckSheetIds] = useState([]);

  // Fetch all Poka-Yoke check sheet IDs dynamically
  const fetchPokaYokeCheckSheetIds = async () => {
    try {
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090
/api/templates/type/POKA_YOKE', {
        withCredentials: true
      });
      
      const pokaYokeSheets = response.data || [];
      const ids = pokaYokeSheets.map(sheet => sheet.id);
      console.log('✅ Poka-Yoke Check Sheet IDs:', ids);
      setPokaYokeCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching Poka-Yoke check sheets:', error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First, get all Poka-Yoke check sheet IDs
      const pokaYokeIds = await fetchPokaYokeCheckSheetIds();
      
      if (pokaYokeIds.length === 0) {
        console.warn('No Poka-Yoke check sheets found');
        setAudits([]);
        setLoading(false);
        addToast('No Poka-Yoke check sheets found in database', 'warning');
        return;
      }
      
      // Fetch all audit responses
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090
/api/templates/responses/all', {
        withCredentials: true
      });
      
      let allAudits = response.data || [];
      console.log('Total audits from API:', allAudits.length);
      
      // Filter by: check sheet is Poka-Yoke type AND auditor matches current user
      const filteredAudits = allAudits.filter(a => {
        const checkSheetId = a.checkSheet?.id;
        const isPokaYoke = pokaYokeIds.includes(checkSheetId);
        const auditorMatch = a.auditorId === user?.id;
        
        return isPokaYoke && auditorMatch;
      });
      
      console.log('✅ Filtered Poka-Yoke audits count:', filteredAudits.length);
      
      // Parse answers to extract additional fields
      const parsedAudits = filteredAudits.map(audit => {
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
        } catch(e) {
          console.error('Error parsing answers:', e);
          answers = {};
        }
        
        // Calculate device stats from verifications array
        let totalDevices = 0;
        let okDevices = 0;
        
        if (answers.verifications && Array.isArray(answers.verifications)) {
          totalDevices = answers.verifications.length;
          okDevices = answers.verifications.filter(v => v.status === 'OK').length;
        }
        
        // Get machine name or location from verifications
        let machineName = '-';
        let location = '-';
        if (answers.verifications && answers.verifications.length > 0) {
          machineName = answers.verifications[0].machineName || answers.verifications[0].machine_name || '-';
          location = answers.verifications[0].location || '-';
        }
        
        return {
          id: audit.id,
          documentNumber: answers.documentNumber || `PY-${audit.id}`,
          location: answers.location || location,
          machineName: answers.machineName || answers.machine_name || machineName,
          checkedBy: audit.auditorName || answers.checkedBy || answers.auditorName || user?.name,
          checkedById: audit.auditorId,
          status: audit.status || 'DRAFT',
          totalDevices: totalDevices,
          okDevices: okDevices,
          notOkDevices: totalDevices - okDevices,
          createdAt: audit.createdAt,
          updatedAt: audit.updatedAt,
          submittedAt: audit.submittedAt
        };
      });
      
      console.log('✅ Parsed audits:', parsedAudits);
      setAudits(parsedAudits);
      
    } catch (err) {
      console.error('❌ Error loading data:', err);
      addToast('Failed to load audit data: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const getAuditStats = () => {
    const total = audits.length;
    const draft = audits.filter(a => a.status === 'DRAFT').length;
    const inProgress = audits.filter(a => a.status === 'IN_PROGRESS').length;
    const submitted = audits.filter(a => a.status === 'SUBMITTED').length;
    const approved = audits.filter(a => a.status === 'APPROVED').length;
    const rejected = audits.filter(a => a.status === 'REJECTED').length;
    const closed = audits.filter(a => a.status === 'CLOSED').length;
    return { total, draft, inProgress, submitted, approved, rejected, closed };
  };

  let filteredAudits = [...audits];
  if (searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    filteredAudits = filteredAudits.filter(audit => 
      audit.documentNumber?.toLowerCase().includes(q) ||
      audit.location?.toLowerCase().includes(q) ||
      audit.machineName?.toLowerCase().includes(q) ||
      audit.checkedBy?.toLowerCase().includes(q) ||
      audit.status?.toLowerCase().includes(q)
    );
  }
  
  filteredAudits.sort((a, b) => {
    const dateA = a.createdAt || a.updatedAt || '';
    const dateB = b.createdAt || b.updatedAt || '';
    return sortOrder === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });
  
  const totalAuditsCount = filteredAudits.length;
  const auditsStartIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAudits = filteredAudits.slice(auditsStartIndex, auditsStartIndex + itemsPerPage);
  const totalAuditPages = Math.ceil(totalAuditsCount / itemsPerPage);

  const auditStats = getAuditStats();

  const handleStartNewAudit = () => {
    navigate('/audit/pokayoke');
  };
  
  const handleContinueAudit = (auditId) => {
    navigate(`/audit/pokayoke?edit=${auditId}`);
  };
  
  const handleViewAudit = (auditId) => {
    navigate(`/audit/pokayoke-view/${auditId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading Poka-Yoke Verification Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Back Button and New Audit Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/auditor"
            className="flex items-center gap-2 px-3 py-2 text-gray-600 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={handleStartNewAudit}
              className="flex items-center gap-2 px-4 py-2 text-white transition bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <PlusCircle size={16} />
              New Verification
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50">
              <Wrench size={40} className="text-orange-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Poka-Yoke Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Mistake-proofing device verification checklist</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">Device Verification</span>
            <span className="text-xs text-gray-400">Error Proofing | Zero Defects</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard title="Total" value={auditStats.total} color="orange" icon={<ClipboardList size={14} />} />
          <StatCard title="Draft" value={auditStats.draft} color="gray" icon={<FileText size={14} />} />
          <StatCard title="In Progress" value={auditStats.inProgress} color="blue" icon={<Clock size={14} />} />
          <StatCard title="Submitted" value={auditStats.submitted} color="purple" icon={<Send size={14} />} />
          <StatCard title="Approved" value={auditStats.approved} color="green" icon={<CheckCircle size={14} />} />
          <StatCard title="Rejected" value={auditStats.rejected} color="red" icon={<AlertCircle size={14} />} />
          <StatCard title="Closed" value={auditStats.closed} color="emerald" icon={<CheckCircle size={14} />} />
        </div>

        {/* Search and Filter */}
        <div className="p-3 mb-6 bg-white rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Verification No., Location, Machine, Status..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              >
                {PAGE_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Sort:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verifications Table */}
        <div className="overflow-hidden bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Verification No.</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Location/Machine</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Verified By</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Devices OK</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAudits.length > 0 ? (
                  paginatedAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{audit.documentNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {audit.machineName !== '-' ? audit.machineName : audit.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.checkedBy}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                          {audit.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {audit.totalDevices > 0 ? (
                            <>
                              {audit.okDevices === audit.totalDevices ? (
                                <CheckCircle size={16} className="text-green-600" />
                              ) : audit.notOkDevices > 0 ? (
                                <XCircle size={16} className="text-red-600" />
                              ) : (
                                <AlertCircle size={16} className="text-yellow-600" />
                              )}
                              <span className="text-sm text-gray-600">
                                {audit.okDevices}/{audit.totalDevices}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(audit.status === 'IN_PROGRESS' || audit.status === 'DRAFT') && (
                            <button
                              onClick={() => handleContinueAudit(audit.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                              <Edit size={14} /> Continue
                            </button>
                          )}
                          {(audit.status === 'SUBMITTED' || audit.status === 'APPROVED' || audit.status === 'REJECTED' || audit.status === 'CLOSED') && (
                            <button
                              onClick={() => handleViewAudit(audit.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-gray-600 rounded-lg hover:bg-gray-700"
                            >
                              <Eye size={14} /> View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Wrench size={48} className="text-gray-300" />
                        <p>No Poka-Yoke verifications found</p>
                        <button
                          onClick={handleStartNewAudit}
                          className="flex items-center gap-1 mt-2 text-orange-600 hover:text-orange-800"
                        >
                          <PlusCircle size={16} /> Click here to start your first verification
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {paginatedAudits.length > 0 && totalAuditPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm border-t">
              <div className="text-gray-500">
                Showing {auditsStartIndex + 1} - {Math.min(auditsStartIndex + itemsPerPage, totalAuditsCount)} of {totalAuditsCount}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-2 py-1 text-sm text-white bg-orange-600 rounded">{currentPage}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalAuditPages, p + 1))} 
                  disabled={currentPage === totalAuditPages} 
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 mt-8 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Poka-Yoke (Mistake Proofing) Device Verification
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Error Proofing | Zero Defects | Quality Assurance
          </p>
        </div>
      </div>
    </div>
  );
}