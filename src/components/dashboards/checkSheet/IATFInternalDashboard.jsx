// IATFInternalDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { auditScheduleApi } from '../../../services/auditScheduleApi';
import { useToast } from '../../ToastContext';
import axios from 'axios';
import { 
  ArrowLeft, RefreshCw, PlusCircle, ClipboardList, 
  MapPin, User, Users, Eye, Edit, Clock, 
  CheckCircle, AlertCircle, FileText, Send, Search,
  Building, ChevronLeft, ChevronRight, Menu, X,
  LayoutDashboard, Factory, Package, UsersIcon,
  ShoppingCart, Wrench, FlaskConical, Award, BarChart3,
  TrendingUp, Briefcase, CalendarDays, CheckSquare, Inbox
} from 'lucide-react';

const PAGE_SIZES = [5, 10, 15, 20, 30, 50];

const statusClasses = {
  DRAFT: "bg-gray-100 text-gray-800",
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  AUDITEE_SIGNED: "bg-indigo-100 text-indigo-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-emerald-100 text-emerald-800"
};

// IATF Departments with Lucide Icons
const IATF_DEPARTMENTS = [
  { id: 'Production', name: 'Production', icon: Factory, color: 'blue' },
  { id: 'Store', name: 'Store & Dispatch', icon: Package, color: 'teal' },
  { id: 'HR', name: 'HR & Training', icon: Users, color: 'pink' },
  { id: 'Purchase', name: 'Purchase', icon: ShoppingCart, color: 'orange' },
  { id: 'Maintenance', name: 'Maintenance', icon: Wrench, color: 'gray' },
  { id: 'Lab & Calibration', name: 'Lab & Calibration', icon: FlaskConical, color: 'purple' },
  { id: 'Quality', name: 'Quality Assurance', icon: Award, color: 'green' },
  { id: 'MR', name: 'Management Review', icon: BarChart3, color: 'indigo' },
  { id: 'Top Management', name: 'Top Management', icon: TrendingUp, color: 'slate' },
  { id: 'Sales & Marketing', name: 'Sales & Marketing', icon: Briefcase, color: 'amber' },
  { id: 'R&D', name: 'R&D', icon: Search, color: 'cyan' },
  { id: 'PPC', name: 'PPC', icon: CalendarDays, color: 'lime' },
  { id: 'FGS', name: 'FGS (Finished Goods)', icon: CheckSquare, color: 'emerald' },
  { id: 'RMS', name: 'RMS (Raw Material)', icon: Inbox, color: 'rose' }
];

// ✅ REMOVED hardcoded CHECK_SHEET_ID - we'll fetch dynamically

export default function IATFInternalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [iatfCheckSheetIds, setIatfCheckSheetIds] = useState([]); // Store all IATF check sheet IDs

  // Fetch all IATF check sheet IDs first
  const fetchIATFCheckSheetIds = async () => {
    try {
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090
/api/templates/type/IATF_16949', {
        withCredentials: true
      });
      
      const iatfSheets = response.data || [];
      const ids = iatfSheets.map(sheet => sheet.id);
      console.log('✅ IATF Check Sheet IDs:', ids);
      setIatfCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching IATF check sheets:', error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First, get all IATF check sheet IDs
      const iatfIds = await fetchIATFCheckSheetIds();
      
      if (iatfIds.length === 0) {
        console.warn('No IATF check sheets found');
        setAudits([]);
        setLoading(false);
        return;
      }
      
      // Fetch all audit responses
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090
/api/templates/responses/all', {
        withCredentials: true
      });
      
      let allAudits = response.data || [];
      console.log('Total audits from API:', allAudits.length);
      
      // ✅ Filter by: check sheet is IATF type AND auditor matches current user
      const filteredAudits = allAudits.filter(a => {
        const checkSheetId = a.checkSheet?.id;
        const isIATF = iatfIds.includes(checkSheetId);
        const auditorMatch = a.auditorId === user?.id;
        
        return isIATF && auditorMatch;
      });
      
      console.log('✅ Filtered IATF audits count:', filteredAudits.length);
      
      // Parse answers to extract additional fields
      const parsedAudits = filteredAudits.map(audit => {
        let answers = {};
        try {
          answers = typeof audit.answers === 'string' ? JSON.parse(audit.answers) : (audit.answers || {});
        } catch(e) {
          console.error('Error parsing answers:', e);
          answers = {};
        }
        
        // Calculate score from responses if needed
        let score = answers.score || audit.percentageScore || 0;
        if (!score && answers.responses) {
          const responses = answers.responses;
          const total = Object.keys(responses).length;
          const compliant = Object.values(responses).filter(r => r === 'COMPLIANT').length;
          score = total > 0 ? Math.round((compliant / total) * 100) : 0;
        }
        
        return {
          id: audit.id,
          documentNumber: answers.documentNumber || `IATF-${audit.id}`,
          department: audit.department || answers.department,
          location: answers.location || '-',
          shift: audit.shift || answers.shift || '-',
          auditorName: audit.auditorName || answers.auditorName || user?.name,
          auditorId: audit.auditorId,
          auditeeName: audit.auditeeName || answers.auditeeName || '-',
          hodEmail: answers.hodEmail || '-',
          status: audit.status || 'DRAFT',
          score: score,
          createdAt: audit.createdAt,
          updatedAt: audit.updatedAt,
          submittedAt: audit.submittedAt
        };
      });
      
      console.log('✅ Parsed audits:', parsedAudits.length);
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

  // Get department-specific audit counts
  const getDepartmentCounts = () => {
    const counts = {};
    IATF_DEPARTMENTS.forEach(dept => {
      counts[dept.id] = audits.filter(a => a.department === dept.id).length;
    });
    return counts;
  };

  const departmentCounts = getDepartmentCounts();

  let filteredAudits = [...audits];
  
  if (searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    filteredAudits = filteredAudits.filter(audit => {
      return (
        audit.documentNumber?.toLowerCase().includes(q) ||
        audit.location?.toLowerCase().includes(q) ||
        audit.shift?.toLowerCase().includes(q) ||
        audit.status?.toLowerCase().includes(q) ||
        audit.department?.toLowerCase().includes(q) ||
        audit.auditeeName?.toLowerCase().includes(q)
      );
    });
  }
  
  if (selectedDepartment !== 'all') {
    filteredAudits = filteredAudits.filter(a => a.department === selectedDepartment);
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
    navigate(`/audit/iatf_internal?department=${selectedDepartment === 'all' ? 'Production' : selectedDepartment}`);
  };

  const handleContinueAudit = (auditId) => {
    navigate(`/audit/iatf_internal?edit=${auditId}`);
  };

  const handleViewAudit = (auditId) => {
    navigate(`/audit/iatf-view/${auditId}`);
  };

  // Get department name by id
  const getDepartmentName = (deptId) => {
    const dept = IATF_DEPARTMENTS.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading IATF Internal Audit Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Toggle Button */}
      <div className="fixed z-20 block p-2 bg-white rounded-lg shadow-md lg:hidden top-20 left-4">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div 
          className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg z-10 overflow-y-auto transition-all duration-200 ${
            sidebarOpen ? 'w-72' : 'w-20'
          } ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}
          style={{ marginTop: '64px' }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 mt-8 border-b">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardList size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Departments</p>
                  <p className="text-xs text-gray-500">{IATF_DEPARTMENTS.length} total</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* All Departments Option */}
          <div className="p-2">
            <button
              onClick={() => {
                setSelectedDepartment('all');
                setCurrentPage(1);
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                selectedDepartment === 'all'
                  ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-sm font-medium text-left">All Departments</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{auditStats.total}</span>
                </>
              )}
            </button>
          </div>

          {/* Department List */}
          <div className="p-2 space-y-1">
            {IATF_DEPARTMENTS.map((dept) => {
              const IconComponent = dept.icon;
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDepartment(dept.id);
                    setCurrentPage(1);
                    if (mobileMenuOpen) setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    selectedDepartment === dept.id
                      ? `bg-${dept.color}-50 text-${dept.color}-700 border-l-4 border-${dept.color}-500`
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-${dept.color}-100`}>
                    <IconComponent size={16} className={`text-${dept.color}-600`} />
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium text-left">{dept.name}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                        {departmentCounts[dept.id] || 0}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          {sidebarOpen && (
            <div className="p-4 mt-4 border-t">
              <div className="p-3 rounded-lg bg-purple-50">
                <p className="text-xs text-purple-600">IATF 16949:2016</p>
                <p className="text-xs text-purple-500">Internal Audit System</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div 
          className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}
          style={{ marginTop: '64px' }}
        >
          <div className="w-full max-w-full px-4 py-6 sm:px-6 lg:px-8">
            
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
                  className="flex items-center gap-2 px-4 py-2 text-white transition bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  <PlusCircle size={16} />
                  New Audit
                </button>
              </div>
            </div>

            {/* Header Section */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50">
                  <ClipboardList size={40} className="text-purple-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">IATF Internal Audit</h1>
              <p className="mt-1 text-sm text-gray-500">
                {selectedDepartment === 'all' 
                  ? 'IATF 16949:2016 internal audit checklist for all departments'
                  : `${getDepartmentName(selectedDepartment)} Department - IATF 16949:2016 Audit`}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">14 Departments</span>
                <span className="text-xs text-gray-400">IATF 16949:2016 Compliant</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 lg:grid-cols-7">
              <StatCard title="Total" value={auditStats.total} color="purple" icon={<ClipboardList size={14} />} />
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
                    placeholder="Search by Audit No., Location, Shift, Status, Department..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
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

            {/* Audits Table */}
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Audit No.</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Shift</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Auditee</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedAudits.length > 0 ? (
                      paginatedAudits.map((audit) => {
                        const dept = IATF_DEPARTMENTS.find(d => d.id === audit.department);
                        const DeptIcon = dept?.icon || ClipboardList;
                        return (
                          <tr key={audit.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{audit.documentNumber}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <DeptIcon size={16} className="text-gray-500" />
                                <span className="text-sm text-gray-600">{getDepartmentName(audit.department)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{audit.location}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{audit.shift}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{audit.auditeeName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                                {audit.status || "DRAFT"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {audit.score ? `${Math.round(audit.score)}%` : '-'}
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <ClipboardList size={48} className="text-gray-300" />
                            <p>No IATF internal audits found</p>
                            <button
                              onClick={handleStartNewAudit}
                              className="flex items-center gap-1 mt-2 text-purple-600 hover:text-purple-800"
                            >
                              <PlusCircle size={16} /> Click here to start your first audit
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
                    <span className="px-2 py-1 text-sm text-white bg-purple-600 rounded">{currentPage}</span>
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
                IATF 16949:2016 Internal Audit
              </p>
              <p className="mt-1 text-xs text-gray-400">
                14 department audit checklists based on IATF 16949:2016 requirements
              </p>
            </div>
          </div>
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