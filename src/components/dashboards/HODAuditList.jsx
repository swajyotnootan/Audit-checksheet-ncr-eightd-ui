import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auditAPI, userAPI } from '../services/api';
import { auditForms, ALL_DEPARTMENTS } from '../../data/auditChecklists';
import ReassignAuditModal from '../../components/modal/ReassignAuditModal';
import { MessageCircle } from 'lucide-react';
import AuditForumModal from '../../components/AuditForumModal';
import {
  ArrowLeft,
  Eye,
  Play,
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  RefreshCw,
  PlusCircle,
  Users
} from 'lucide-react';

const statusClasses = {
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  AUDITEE_SIGNED: "bg-indigo-100 text-indigo-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-green-100 text-green-800"
};

const PAGE_SIZES = [5, 10, 15, 20, 30, 50];

export default function HODAuditList() {
  const { formId } = useParams();
  const { user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [filteredAudits, setFilteredAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditorNames, setAuditorNames] = useState({});
  const [auditeeNames, setAuditeeNames] = useState({});
  const [showForum, setShowForum] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
const [allUsers, setAllUsers] = useState([]);

  const form = auditForms[formId];
  const department = ALL_DEPARTMENTS.find(dept => dept.sheetKey === formId);

  useEffect(() => {
    if (user?.email) loadAudits();
  }, [formId, user]);

  const loadAllUsers = async () => {
  try {
    const users = await userAPI.getAllUsers();
    setAllUsers(users);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
};

useEffect(() => {
  loadAllUsers();
}, []);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await auditAPI.getForHod(user.email);
      
      console.log('=== HODAuditList DEBUG ===');
      console.log('Logged in user email:', user.email);
      console.log('Current formId from URL:', formId);
      console.log('Department sheetKey:', department?.sheetKey);
      console.log('Total audits from API:', data?.length);
      
      if (data && data.length > 0) {
        data.forEach(a => {
          console.log(`Audit ID: ${a.id}, formId: "${a.formId}", status: "${a.status}", assignedTo: "${a.assignedToEmail}"`);
        });
      }
      
      const filtered = Array.isArray(data) ? data.filter(a => a.formId === formId) : [];
      
      console.log('Filtered audits count for this department:', filtered.length);
      console.log('Audits with AUDITEE_SIGNED status:', filtered.filter(a => a.status === 'AUDITEE_SIGNED').length);
      
      setAudits(filtered);

      const auditorIds = [...new Set(filtered.map(a => a.auditorId).filter(id => id))];
      const auditeeIdSets = filtered.map(a => (a.auditeeIds ? JSON.parse(a.auditeeIds) : []));
      const allAuditeeIds = [...new Set(auditeeIdSets.flat())];
      const nameMap = {};
      
      for (const id of [...auditorIds, ...allAuditeeIds]) {
        if (!nameMap[id]) {
          try {
            const u = await userAPI.getUserById(id);
            nameMap[id] = u.name;
          } catch {
            nameMap[id] = `User ${id}`;
          }
        }
      }
      
      const auditorMap = {};
      const auditeeMap = {};
      filtered.forEach(a => {
        if (a.auditorId) auditorMap[a.id] = nameMap[a.auditorId] || 'Unknown';
        if (a.auditeeIds) {
          const ids = JSON.parse(a.auditeeIds);
          auditeeMap[a.id] = ids.map(id => nameMap[id] || `User ${id}`).join(', ');
        }
      });
      setAuditorNames(auditorMap);
      setAuditeeNames(auditeeMap);
    } catch (err) {
      console.error('Error loading audits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...audits];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(audit =>
        audit.documentNumber?.toLowerCase().includes(q) ||
        audit.assignedToEmail?.toLowerCase().includes(q) ||
        audit.shift?.toLowerCase().includes(q) ||
        audit.status?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortOrder === "asc") return String(a.documentNumber).localeCompare(String(b.documentNumber));
      else return String(b.documentNumber).localeCompare(String(a.documentNumber));
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    setFilteredAudits(result.slice(startIndex, startIndex + itemsPerPage));
  }, [audits, searchQuery, sortOrder, currentPage, itemsPerPage]);

  const totalFilteredCount = audits.filter(audit => {
    if (searchQuery.trim() === "") return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      audit.documentNumber?.toLowerCase().includes(q) ||
      audit.assignedToEmail?.toLowerCase().includes(q) ||
      audit.shift?.toLowerCase().includes(q) ||
      audit.status?.toLowerCase().includes(q)
    );
  }).length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);

  const assignedCount = audits.filter(a => a.status === 'ASSIGNED').length;
  const inProgressCount = audits.filter(a => a.status === 'IN_PROGRESS').length;
  const submittedCount = audits.filter(a => a.status === 'SUBMITTED').length;
  const auditeeSignedCount = audits.filter(a => a.status === 'AUDITEE_SIGNED').length;
  const approvedCount = audits.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = audits.filter(a => a.status === 'REJECTED').length;
  const closedCount = audits.filter(a => a.status === 'CLOSED').length;

  const stats = [
    { label: "ASSIGNED", value: assignedCount, icon: Clock, bgColor: "from-yellow-300 to-yellow-200" },
    { label: "IN PROGRESS", value: inProgressCount, icon: Play, bgColor: "from-blue-300 to-blue-200" },
    { label: "SUBMITTED", value: submittedCount, icon: FileText, bgColor: "from-purple-300 to-purple-200" },
    { label: "AUDITEE SIGNED", value: auditeeSignedCount, icon: CheckCircle, bgColor: "from-indigo-300 to-indigo-200" },
    { label: "APPROVED", value: approvedCount, icon: CheckCircle, bgColor: "from-green-300 to-green-200" },
    { label: "REJECTED", value: rejectedCount, icon: XCircle, bgColor: "from-red-300 to-red-200" },
    { label: "CLOSED", value: closedCount, icon: CheckCircle, bgColor: "from-gray-300 to-gray-200" }
  ];

  // Get participant count (HOD + Auditor + Auditees + Deputy + DGM)
const getParticipantCount = (audit) => {
  let count = 1; // HOD is always there
  if (audit.auditorId) count++;
  if (audit.auditeeIds) {
    try {
      const ids = JSON.parse(audit.auditeeIds);
      count += ids.length;
    } catch(e) {}
  }
  
  // Add Deputy (the person who created the schedule)
  count += 1;
  
  // Add DGM users
  const dgmUsers = allUsers.filter(u => u.role === 'DGM_MR' || u.role === 'DGM');
  count += dgmUsers.length;
  
  return count;
};

  if (!form || !department) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Form Not Found</h2>
          <p className="mb-4 text-gray-500">The requested audit form does not exist.</p>
          <Link to="/hod" className="inline-flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="hod-audit-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gray-50"
      >
        <div className="w-full max-w-[1400px] mx-auto mt-5 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/hod"
              className="flex items-center gap-2 px-3 py-2 text-gray-600 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
            <Link
              to={`/audit/${formId}`}
              className="flex items-center gap-2 px-4 py-2 text-white transition rounded-lg shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <PlusCircle size={16} />
              New Audit
            </Link>
          </div>

          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                <department.icon size={24} className="text-gray-700" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{form.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Assigned Audits • IATF 16949:2016</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">{department.code}</span>
              <span className="text-xs text-gray-400">Format: {department.formatNo}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-gradient-to-r ${stat.bgColor} rounded-lg shadow p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white rounded-lg"><stat.icon size={20} className="text-gray-700" /></div>
                  <span className="text-sm font-semibold text-gray-700">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="p-3 mb-6 bg-white rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Audit No., HOD, Shift..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Show:</label>
                <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                  {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Sort:</label>
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Audit No.</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Assigned To (HOD)</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Shift</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Auditor / Auditees</th>
                        <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Participants</th>

                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                    
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">Loading audits...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAudits.length > 0 ? (
                    filteredAudits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{audit.documentNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /> {audit.assignedToEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> {audit.shift || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div><span className="font-medium">Auditor:</span> {auditorNames[audit.id] || (audit.auditorId ? `ID ${audit.auditorId}` : 'Not assigned')}</div>
                          <div className="text-xs"><span className="font-medium">Auditees:</span> {auditeeNames[audit.id] || 'None'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
  <div className="flex items-center gap-2">
    <Users size={14} className="text-gray-400" />
    {getParticipantCount(audit)} members
  </div>
</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-700'}`}>
                            {audit.status || "ASSIGNED"}
                          </span>
                        </td>
                      <td className="px-4 py-3">
  <div className="flex gap-2">
    {audit.status === 'AUDITEE_SIGNED' ? (
  <Link to={`/audit/review/${audit.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white transition bg-yellow-600 rounded-lg hover:bg-yellow-700">
    <Eye size={14} /> Review & Approve
  </Link>
) : audit.status === 'IN_PROGRESS' ? (
  <Link to={`/audit/${formId}?edit=${audit.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white transition bg-blue-600 rounded-lg hover:bg-blue-700">
    <RefreshCw size={14} /> Continue
  </Link>
) : audit.status === 'SUBMITTED' || audit.status === 'APPROVED' || audit.status === 'CLOSED' || audit.status === 'REJECTED' ? (
  <Link to={`/audit/view/${audit.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 transition bg-gray-100 rounded-lg hover:bg-gray-200">
    <Eye size={14} /> View Details
  </Link>
) : null}
 
    {audit.status === 'ASSIGNED' && (
      <button
        onClick={() => { setSelectedAudit(audit); setShowReassignModal(true); }}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white transition bg-orange-500 rounded-lg hover:bg-orange-600"
      >
        Reassign
      </button>
    )}
    <button
  onClick={() => {
    // Build complete participant emails list
    const participantEmails = new Set();
    
    // 1. Add HOD
    if (audit.assignedToEmail) {
      participantEmails.add(audit.assignedToEmail);
    }
    
    // 2. Add Auditor
    if (audit.auditorId) {
      const auditor = allUsers.find(u => u.id === audit.auditorId);
      if (auditor?.email) participantEmails.add(auditor.email);
    }
    
    // 3. Add Auditees
    if (audit.auditeeIds) {
      try {
        const ids = JSON.parse(audit.auditeeIds);
        ids.forEach(id => {
          const auditee = allUsers.find(u => u.id === id);
          if (auditee?.email) participantEmails.add(auditee.email);
        });
      } catch(e) {}
    }
    
    // 4. Add current user (HOD)
    if (user?.email) participantEmails.add(user.email);
    
    // 5. Add Deputy users
    const deputyUsers = allUsers.filter(u => u.role === 'DEPUTY_MANAGER_QS' || u.role === 'DEPUTY');
    deputyUsers.forEach(deputy => {
      if (deputy?.email) participantEmails.add(deputy.email);
    });
    
    // 6. Add DGM users
    const dgmUsers = allUsers.filter(u => u.role === 'DGM_MR' || u.role === 'DGM');
    dgmUsers.forEach(dgm => {
      if (dgm?.email) participantEmails.add(dgm.email);
    });
    
    console.log('HOD FORUM - Participants:', Array.from(participantEmails));
    
    setSelectedAuditForForum({
      ...audit,
      memberEmails: Array.from(participantEmails)
    });
    setShowForum(true);
  }}
  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
  title="Discussion Forum"
>
  <MessageCircle size={14} /> Forum
</button>
  </div>
</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={32} className="text-gray-300" />
                          <p className="text-sm">No audits found for this department</p>
                          <p className="text-xs text-gray-400">Try refreshing or check back later</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredAudits.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm border-t">
                <div className="text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalFilteredCount)} of {totalFilteredCount}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50">Previous</button>
                  <span className="px-2 py-1 text-sm text-white bg-blue-600 rounded">{currentPage}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </div>

          {showReassignModal && selectedAudit && (
            <ReassignAuditModal
              audit={selectedAudit}
              hodId={user.id}
              onClose={() => setShowReassignModal(false)}
              onSaved={() => loadAudits()}
            />
          )}

          {showForum && selectedAuditForForum && (
  <AuditForumModal
    auditId={selectedAuditForForum.id}
    auditNumber={selectedAuditForForum.documentNumber}
    auditTitle={selectedAuditForForum.formName}
    auditStatus={selectedAuditForForum.status}
    auditLocation={selectedAuditForForum.location}
    isOpen={showForum}
    onClose={() => {
      setShowForum(false);
      setSelectedAuditForForum(null);
    }}
    currentUser={user}
    allUsers={allUsers}
    auditorId={selectedAuditForForum.auditorId}
    auditeeIds={selectedAuditForForum.auditeeIds ? JSON.parse(selectedAuditForForum.auditeeIds) : []}
    hodEmail={selectedAuditForForum.hodEmail}
    memberEmails={selectedAuditForForum.memberEmails}
  />
)}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}