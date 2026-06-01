// FiveSDashboard.jsx - No Sidebar Version
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { auditScheduleApi } from '../../../services/auditScheduleApi';
import { useToast } from '../../ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, RefreshCw, PlusCircle, Sparkles, ClipboardList, 
  Calendar, MapPin, User, Users, Eye, Edit, Clock, 
  CheckCircle, AlertCircle, FileText, MessageCircle, Send, Search,
  Building, LayoutDashboard, Star, TrendingUp, ThumbsUp, Award
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

// 5S Sections
const FIVE_S_SECTIONS = [
  { name: 'Sort (1S)', maxScore: 32, questions: 8, color: 'blue' },
  { name: 'Set in Order (2S)', maxScore: 32, questions: 8, color: 'teal' },
  { name: 'Shine (3S)', maxScore: 36, questions: 9, color: 'green' },
  { name: 'Standardize (4S)', maxScore: 24, questions: 6, color: 'orange' },
  { name: 'Sustain (5S)', maxScore: 20, questions: 5, color: 'purple' }
];

export default function FiveSDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [fiveSCheckSheetIds, setFiveSCheckSheetIds] = useState([]);

  // Fetch all 5S check sheet IDs dynamically
  const fetchFiveSCheckSheetIds = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/templates/type/FIVE_S', {
        withCredentials: true
      });
      
      const fiveSSheets = response.data || [];
      const ids = fiveSSheets.map(sheet => sheet.id);
      console.log('✅ 5S Check Sheet IDs:', ids);
      setFiveSCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching 5S check sheets:', error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First, get all 5S check sheet IDs
      const fiveSIds = await fetchFiveSCheckSheetIds();
      
      if (fiveSIds.length === 0) {
        console.warn('No 5S check sheets found');
        setAudits([]);
        setLoading(false);
        return;
      }
      
      // Fetch all audit responses
      const response = await axios.get('http://localhost:8080/api/templates/responses/all', {
        withCredentials: true
      });
      
      let allAudits = response.data || [];
      console.log('Total audits from API:', allAudits.length);
      
      // Filter by: check sheet is 5S type AND auditor matches current user
      const filteredAudits = allAudits.filter(a => {
        const checkSheetId = a.checkSheet?.id;
        const is5S = fiveSIds.includes(checkSheetId);
        const auditorMatch = a.auditorId === user?.id;
        
        return is5S && auditorMatch;
      });
      
      console.log('✅ Filtered 5S audits count:', filteredAudits.length);
      
      // Parse answers to extract additional fields
      const parsedAudits = filteredAudits.map(audit => {
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
        } catch(e) {
          console.error('Error parsing answers:', e);
          answers = {};
        }
        
        // Calculate score from scores object (5S uses numeric scores 0-4)
        let totalScore = answers.totalScore || 0;
        let percentage = answers.percentage || 0;
        
        if (!totalScore && answers.scores) {
          totalScore = Object.values(answers.scores).reduce((a, b) => a + (b || 0), 0);
          percentage = Math.round((totalScore / 144) * 100);
        }
        
        // Fallback for old data
        if (!totalScore && answers.responses) {
          const responses = answers.responses;
          const total = Object.keys(responses).length;
          const compliant = Object.values(responses).filter(r => r === 'COMPLIANT').length;
          totalScore = compliant;
          percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;
        }
        
        return {
          id: audit.id,
          documentNumber: answers.documentNumber || `5S-${audit.id}`,
          department: answers.department || audit.department || '-',
          supervisor: answers.supervisor || '-',
          completedBy: answers.completedBy || answers.auditorName || audit.auditorName || user?.name,
          area: answers.area || '-',
          shift: audit.shift || answers.shift || '-',
          auditDate: answers.date || audit.auditDate,
          auditorName: audit.auditorName || answers.auditorName || user?.name,
          auditorId: audit.auditorId,
          auditeeName: audit.auditeeName || answers.auditeeName || '-',
          status: audit.status || 'DRAFT',
          totalScore: totalScore,
          percentage: percentage,
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
      audit.department?.toLowerCase().includes(q) ||
      audit.supervisor?.toLowerCase().includes(q) ||
      audit.completedBy?.toLowerCase().includes(q) ||
      audit.area?.toLowerCase().includes(q) ||
      audit.shift?.toLowerCase().includes(q) ||
      audit.auditorName?.toLowerCase().includes(q) ||
      audit.auditeeName?.toLowerCase().includes(q) ||
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
    navigate('/audit/five_s');
  };
  
  const handleContinueAudit = (auditId) => {
    navigate(`/audit/five_s?edit=${auditId}`);
  };
  
  const handleViewAudit = (auditId) => {
    navigate(`/audit/5s-view/${auditId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading 5S Audit Dashboard...</p>
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
              className="flex items-center gap-2 px-4 py-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
            >
              <PlusCircle size={16} />
              New 5S Audit
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50">
              <Sparkles size={40} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">5S Audit</h1>
          <p className="mt-1 text-sm text-gray-500">Sort, Set, Shine, Standardize, Sustain - Workplace Organization Audit</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">5 Sections | 36 Questions</span>
            <span className="text-xs text-gray-400">Max Score: 144</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard title="Total" value={auditStats.total} color="green" icon={<ClipboardList size={14} />} />
          <StatCard title="Draft" value={auditStats.draft} color="gray" icon={<FileText size={14} />} />
          <StatCard title="In Progress" value={auditStats.inProgress} color="blue" icon={<Clock size={14} />} />
          <StatCard title="Submitted" value={auditStats.submitted} color="purple" icon={<Send size={14} />} />
          <StatCard title="Approved" value={auditStats.approved} color="green" icon={<CheckCircle size={14} />} />
          <StatCard title="Rejected" value={auditStats.rejected} color="red" icon={<AlertCircle size={14} />} />
          <StatCard title="Closed" value={auditStats.closed} color="emerald" icon={<CheckCircle size={14} />} />
        </div>

        {/* 5S Sections Info */}
        <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-5">
          {FIVE_S_SECTIONS.map((section, idx) => (
            <div key={idx} className="p-3 text-center bg-white rounded-lg shadow-sm">
              <div className={`text-sm font-medium text-${section.color}-700`}>{section.name}</div>
              <div className="text-xs text-gray-500">{section.questions} questions | Max {section.maxScore}</div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="p-3 mb-6 bg-white rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by Audit No., Department, Supervisor, Completed By, Area, Shift..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Show:</label>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                {PAGE_SIZES.map(size => (<option key={size} value={size}>{size}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Sort:</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audits Table */}
        <div className="overflow-hidden bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Audit No.</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Supervisor</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Completed By</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Area</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Shift</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAudits.length > 0 ? (
                  paginatedAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{audit.documentNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.supervisor}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.completedBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.area}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.shift}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(audit.auditDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                          {audit.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{audit.totalScore}/144</span>
                          <span className={`text-xs ${getScoreColor(audit.percentage)}`}>{audit.percentage}%</span>
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
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles size={48} className="text-gray-300" />
                        <p>No 5S audits found</p>
                        <button
                          onClick={handleStartNewAudit}
                          className="flex items-center gap-1 mt-2 text-green-600 hover:text-green-800"
                        >
                          <PlusCircle size={16} /> Click here to start your first 5S audit
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
                <span className="px-2 py-1 text-sm text-white bg-green-600 rounded">{currentPage}</span>
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
            5S Workplace Organization Audit
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Sort | Set in Order | Shine | Standardize | Sustain
          </p>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, color, icon }) => (
  <div className="p-3 bg-white rounded-lg shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 bg-${color}-100 rounded-lg`}>
          <div className={`text-${color}-600`}>{icon}</div>
        </div>
        <span className="text-xs text-gray-500">{title}</span>
      </div>
      <span className={`text-xl font-bold text-${color}-600`}>{value}</span>
    </div>
  </div>
);