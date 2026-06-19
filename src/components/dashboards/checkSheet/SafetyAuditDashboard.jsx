// SafetyAuditDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auditScheduleApi } from '../../../services/auditScheduleApi';
import { userAPI } from '../../services/api';
import { useToast } from '../../ToastContext';
import { 
  ArrowLeft, RefreshCw, PlusCircle, Shield, ClipboardList, 
  MapPin, User, Users, Eye, Edit, Clock, CheckCircle, AlertCircle, FileText, Send, Search,
  Building, LayoutDashboard
} from 'lucide-react';
import axios from 'axios';

const PAGE_SIZES = [5, 10, 15, 20, 30, 50];

const statusClasses = {
  DRAFT: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-emerald-100 text-emerald-800"
};

// Safety Checklist Items (10 Questions)
const SAFETY_QUESTIONS = [
  { id: 1, question: "Door sensors on machines", method: "Visual", frequency: "Daily" },
  { id: 2, question: "Double hand operation", method: "Visual", frequency: "Daily" },
  { id: 3, question: "Double spring (in presses)", method: "Visual", frequency: "Daily" },
  { id: 4, question: "Insulating jacket on barrel", method: "Visual", frequency: "Daily" },
  { id: 5, question: "Machine guards", method: "Visual", frequency: "Daily" },
  { id: 6, question: "Emergency switch", method: "Visual", frequency: "Daily" },
  { id: 7, question: "Safety in material movement", method: "Visual", frequency: "Daily" },
  { id: 8, question: "Bin trolley stacking height defined or no", method: "Visual", frequency: "Daily" },
  { id: 9, question: "Safety in tool room", method: "Visual", frequency: "Daily" },
  { id: 10, question: "Skilled manpower deployed or not", method: "Visual", frequency: "Daily" }
];

// Fixed color classes for StatCard
const getStatCardStyles = (color) => {
  switch(color) {
    case 'red': return { bg: 'bg-red-100', text: 'text-red-600' };
    case 'gray': return { bg: 'bg-gray-100', text: 'text-gray-600' };
    case 'blue': return { bg: 'bg-blue-100', text: 'text-blue-600' };
    case 'purple': return { bg: 'bg-purple-100', text: 'text-purple-600' };
    case 'green': return { bg: 'bg-green-100', text: 'text-green-600' };
    case 'emerald': return { bg: 'bg-emerald-100', text: 'text-emerald-600' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};

export default function SafetyAuditDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [safetyCheckSheetIds, setSafetyCheckSheetIds] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const loadAllUsers = async () => {
    try {
      const users = await userAPI.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Fetch all Safety check sheet IDs dynamically
  const fetchSafetyCheckSheetIds = async () => {
    try {
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/templates/type/DAILY_SAFETY', {
        withCredentials: true
      });
      
      const safetySheets = response.data || [];
      const ids = safetySheets.map(sheet => sheet.id);
      console.log('✅ Safety Check Sheet IDs:', ids);
      setSafetyCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching Safety check sheets:', error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First, get all Safety check sheet IDs
      const safetyIds = await fetchSafetyCheckSheetIds();
      
      if (safetyIds.length === 0) {
        console.warn('No Safety check sheets found');
        setAudits([]);
        setLoading(false);
        return;
      }
      
      // Fetch all audit responses
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/templates/responses/all', {
        withCredentials: true
      });
      
      let allAudits = response.data || [];
      console.log('Total audits from API:', allAudits.length);
      
      // Filter by: check sheet is Safety type AND auditor matches current user
      const filteredAudits = allAudits.filter(a => {
        const checkSheetId = a.checkSheet?.id;
        const isSafety = safetyIds.includes(checkSheetId);
        const auditorMatch = a.auditorId === user?.id;
        
        return isSafety && auditorMatch;
      });
      
      console.log('✅ Filtered Safety audits count:', filteredAudits.length);
      
      // Parse answers to extract additional fields
      const parsedAudits = filteredAudits.map(audit => {
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
        } catch(e) {
          console.error('Error parsing answers:', e);
          answers = {};
        }
        
        // Calculate compliance stats from responses
        const responses = answers.responses || {};
        const totalQuestions = SAFETY_QUESTIONS.length;
        const compliantCount = Object.values(responses).filter(r => r === 'YES' || r === 'COMPLIANT').length;
        const compliancePercentage = totalQuestions > 0 ? Math.round((compliantCount / totalQuestions) * 100) : 0;
        
        return {
          id: audit.id,
          documentNumber: answers.documentNumber || `SAFETY-${audit.id}`,
          location: answers.location || '-',
          department: answers.department || audit.department || '-',
          shift: audit.shift || answers.shift || '-',
          auditDate: answers.date || audit.auditDate,
          auditorName: audit.auditorName || answers.auditorName || user?.name,
          auditorId: audit.auditorId,
          auditeeName: audit.auditeeName || answers.auditeeName || '-',
          hodEmail: answers.hodEmail || '-',
          status: audit.status || 'DRAFT',
          score: answers.score || compliancePercentage,
          compliantCount: compliantCount,
          totalQuestions: totalQuestions,
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
    loadAllUsers();
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const getParticipantCount = (audit) => {
    let count = 1;
    if (audit.auditorId) count++;
    const deputyUsers = allUsers.filter(u => u.role === 'DEPUTY_MANAGER_QS' || u.role === 'DEPUTY');
    count += deputyUsers.length;
    const dgmUsers = allUsers.filter(u => u.role === 'DGM_MR' || u.role === 'DGM');
    count += dgmUsers.length;
    return count;
  };

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
      audit.department?.toLowerCase().includes(q) ||
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
    navigate('/audit/safety');
  };
  
  const handleContinueAudit = (auditId) => {
    navigate(`/audit/safety?edit=${auditId}`);
  };
  
  const handleViewAudit = (auditId) => {
    navigate(`/audit/safety-view/${auditId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading Safety Audit Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/auditor" className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowLeft size={18} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={handleStartNewAudit} className="flex items-center gap-2 px-4 py-2 text-white transition bg-red-600 rounded-lg hover:bg-red-700">
              <PlusCircle size={16} /> New Safety Audit
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50">
              <Shield size={40} className="text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Safety Audit</h1>
          <p className="mt-1 text-sm text-gray-500">Daily workplace safety audit and inspection checklist</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">10 Safety Checks</span>
            <span className="text-xs text-gray-400">Daily Safety Compliance</span>
          </div>
        </div>

        {/* Stats Cards - Fixed with static colors */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard title="Total" value={auditStats.total} color="red" icon={<ClipboardList size={14} />} />
          <StatCard title="Draft" value={auditStats.draft} color="gray" icon={<FileText size={14} />} />
          <StatCard title="In Progress" value={auditStats.inProgress} color="blue" icon={<Clock size={14} />} />
          <StatCard title="Submitted" value={auditStats.submitted} color="purple" icon={<Send size={14} />} />
          <StatCard title="Approved" value={auditStats.approved} color="green" icon={<CheckCircle size={14} />} />
          <StatCard title="Rejected" value={auditStats.rejected} color="red" icon={<AlertCircle size={14} />} />
          <StatCard title="Closed" value={auditStats.closed} color="emerald" icon={<CheckCircle size={14} />} />
        </div>

        {/* Safety Checklist Preview */}
        <div className="p-4 mb-6 bg-white rounded-lg shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Safety Checklist Items (10 Checks)</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY_QUESTIONS.map((q) => (
              <div key={q.id} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center justify-center w-5 h-5 text-xs text-red-600 bg-red-100 rounded-full">{q.id}</div>
                {q.question}
              </div>
            ))}
          </div>
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
                placeholder="Search by Audit No., Location, Department, Auditor, Status..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              >
                {PAGE_SIZES.map(size => (<option key={size} value={size}>{size}</option>))}
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

        {/* Audits Table */}
        <div className="overflow-hidden bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Audit No.</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Shift</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Auditor</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Auditee</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Compliance</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAudits.length > 0 ? (
                  paginatedAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{audit.documentNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.shift}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(audit.auditDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.auditorName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.auditeeName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                          {audit.status || "DRAFT"}
                        </span>
                       </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{audit.compliantCount}/{audit.totalQuestions}</span>
                          <span className={`text-xs ${getScoreColor(audit.score)}`}>{audit.score}%</span>
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
                        <Shield size={48} className="text-gray-300" />
                        <p>No safety audits found</p>
                        <button
                          onClick={handleStartNewAudit}
                          className="flex items-center gap-1 mt-2 text-red-600 hover:text-red-800"
                        >
                          <PlusCircle size={16} /> Click here to start your first safety audit
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
                <span className="px-2 py-1 text-sm text-white bg-red-600 rounded">{currentPage}</span>
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
            Daily Safety Audit & Inspection Checklist
          </p>
          <p className="mt-1 text-xs text-gray-400">
            10 mandatory safety checks based on workplace safety standards
          </p>
        </div>
      </div>
    </div>
  );
}

// StatCard component with fixed styles (no dynamic classes)
const StatCard = ({ title, value, color, icon }) => {
  const styles = {
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' }
  };
  
  const style = styles[color] || styles.gray;
  
  return (
    <div className="p-3 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${style.bg} rounded-lg`}>
            <div className={style.text}>{icon}</div>
          </div>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
        <span className={`text-xl font-bold ${style.text}`}>{value}</span>
      </div>
    </div>
  );
};