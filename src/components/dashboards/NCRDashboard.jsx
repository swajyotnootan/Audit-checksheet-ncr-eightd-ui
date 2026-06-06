import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  Send,
  MessageCircle,
  Filter,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import ForumThreadView from '../forum/ForumThreadView';
import Drawer from '../Drawer';
import axios from 'axios';

const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const hasNcr2Data = (ncr) => Boolean(
  ncr?.ncr2RootCause ||
  ncr?.ncr2Correction ||
  ncr?.ncr2CorrectiveAction ||
  ['READY_FOR_NCR2', 'NCR2_IN_PROGRESS', 'NCR2_COMPLETED'].includes(ncr?.status)
);

const hasForm8Data = (ncr) => Boolean(
  ncr?.rootCause ||
  ncr?.correction ||
  ncr?.correctiveAction ||
  hasNcr2Data(ncr)
);

const getStatusLabel = (status) => {
  const labels = {
    AWAITING_AUDITEE: 'Awaiting Auditee Review',
    OPEN: 'Pending Manager Approval',
    APPROVED: 'Approved',
    IN_PROGRESS: 'In Progress',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
    SENT_TO_8D: 'Sent to 8D',
    IN_8D_PROCESS: 'In 8D Process',
    READY_FOR_NCR2: 'Ready for NCR2',
    NCR2_IN_PROGRESS: 'NCR2 Verification',
    NCR2_COMPLETED: 'NCR2 Completed',
  };
  return labels[status] || status;
};

const FILTER_TYPES = {
  ALL: 'all',
  REGULAR: 'regular',
  EIGHT_D: '8d'
};

const NCRDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ncrList, setNcrList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.ALL);

  // Send to 8D states
  const [showSendTo8DModal, setShowSendTo8DModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [sendTo8DComment, setSendTo8DComment] = useState('');

  // 8D Forum states
  const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
  const [selected8DNCR, setSelected8DNCR] = useState(null);
  const [eightDTeamMembers, setEightDTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const isAuditManager = user?.role === 'AUDIT_MANAGER';

  const is8DRelated = (ncr) => {
    const eightDStatuses = [
      'SENT_TO_8D',
      'IN_8D_PROCESS',
      'READY_FOR_NCR2',
      'NCR2_IN_PROGRESS',
      'NCR2_COMPLETED'
    ];
    return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const allResult = await ncrService.getAllNCRs();
    if (!allResult.success) {
      setError(allResult.error);
    }
    setNcrList(allResult.success ? allResult.data : []);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsersList([]);
    }
  };

  useEffect(() => {
    loadData();
    fetchAllUsers();
  }, []);

  const openNCRForum = (ncr) => {
    const auditor = allUsersList.find(u => u.id === ncr.auditorId);
    const auditee = allUsersList.find(u => u.id === ncr.auditeeId);
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');

    setSelectedNCRForForum({
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      auditorId: ncr.auditorId,
      auditorName: ncr.auditorName || auditor?.name,
      auditeeId: ncr.auditeeId,
      auditeeName: ncr.auditeeName || auditee?.name,
      memberEmails: [
        auditor?.email, auditee?.email, user?.email, auditManager?.email
      ].filter(Boolean)
    });
    setShowForumModal(true);
  };

  const open8DForum = async (ncr) => {
    setSelected8DNCR(ncr);
    setEightDTeamMembers([]);
    setShow8DForumDrawer(true);
    setLoadingTeamMembers(true);

    try {
      const eightDEventId = `8D-NCR-${ncr.ncrNumber}`;
      const response = await axios.get(
        `https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data/${eightDEventId}`
      );

      if (response.data?.success && response.data.data) {
        const d0Data = response.data.data.content?.d0?.[0] || {};
        const emails = Array.isArray(d0Data.additionalEmails)
          ? d0Data.additionalEmails
          : [];
        setEightDTeamMembers(emails);
      }
    } catch (err) {
      console.error('Failed to fetch 8D team members:', err);
      setEightDTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleSendTo8D = (ncr) => {
    setSelectedNCR(ncr);
    setSendTo8DComment('');
    setShowSendTo8DModal(true);
  };

  const confirmSendTo8D = async () => {
    if (!selectedNCR) return;
    setProcessingAction(true);
    try {
      const result = await ncrService.sendTo8D(selectedNCR.id, sendTo8DComment, user?.id);
      if (result.success) {
        setShowSendTo8DModal(false);
        await loadData();
        addToast(`NCR #${selectedNCR.ncrNumber} sent to 8D team!`, 'success');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error sending to 8D:', error);
      setError('Failed to send NCR to 8D process');
    } finally {
      setProcessingAction(false);
      setSelectedNCR(null);
    }
  };

  const filteredNCRs = useMemo(() => {
    let filtered = ncrList;

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((ncr) =>
        [ncr.ncrNumber, ncr.department, ncr.auditorName, ncr.auditeeName, ncr.statementOfNonconformity]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      );
    }

    if (activeFilter === FILTER_TYPES.REGULAR) {
      filtered = filtered.filter(ncr => !is8DRelated(ncr));
    } else if (activeFilter === FILTER_TYPES.EIGHT_D) {
      filtered = filtered.filter(ncr => is8DRelated(ncr));
    }

    return filtered;
  }, [ncrList, searchTerm, activeFilter]);

  const stats = useMemo(() => ({
    total: ncrList.length,
    regularCount: ncrList.filter(ncr => !is8DRelated(ncr)).length,
    eightDCount: ncrList.filter(ncr => is8DRelated(ncr)).length,
    awaitingAuditee: ncrList.filter((ncr) => ncr.status === 'AWAITING_AUDITEE').length,
    open: ncrList.filter((ncr) => ncr.status === 'OPEN').length,
    approved: ncrList.filter((ncr) => ncr.status === 'APPROVED').length,
    inProgress: ncrList.filter((ncr) => ncr.status === 'IN_PROGRESS').length,
    closed: ncrList.filter((ncr) => ncr.status === 'CLOSED').length,
    rejected: ncrList.filter((ncr) => ncr.status === 'REJECTED').length,
    sentTo8D: ncrList.filter((ncr) => ncr.status === 'SENT_TO_8D' || ncr.requires8D).length,
    readyForNCR2: ncrList.filter((ncr) => ncr.status === 'READY_FOR_NCR2').length,
    ncr2InProgress: ncrList.filter((ncr) => ncr.status === 'NCR2_IN_PROGRESS').length,
    ncr2Completed: ncrList.filter((ncr) => ncr.status === 'NCR2_COMPLETED').length,
  }), [ncrList]);

  const getBadgeClass = (status) => {
    const classes = {
      AWAITING_AUDITEE: 'bg-orange-100 text-orange-700',
      OPEN: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      CLOSED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      SENT_TO_8D: 'bg-purple-100 text-purple-700',
      IN_8D_PROCESS: 'bg-cyan-100 text-cyan-700',
      READY_FOR_NCR2: 'bg-indigo-100 text-indigo-700',
      NCR2_IN_PROGRESS: 'bg-violet-100 text-violet-700',
      NCR2_COMPLETED: 'bg-emerald-100 text-emerald-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading NCR register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <header className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/audit-manager?view=ncr')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to NCR
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Form 7: Nonconformity Reports</h1>
              <p className="text-xs text-gray-500">View all NCRs raised by auditors</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard title="Total NCRs" value={stats.total} icon={<FileText className="w-5 h-5 text-gray-500" />} />
          <StatCard title="Awaiting Auditee" value={stats.awaitingAuditee} icon={<Clock className="w-5 h-5 text-orange-500" />} />
          <StatCard title="Pending Approval" value={stats.open} icon={<Clock className="w-5 h-5 text-yellow-500" />} />
          <StatCard title="Approved" value={stats.approved} icon={<CheckCircle className="w-5 h-5 text-blue-500" />} />
          <StatCard title="In Progress" value={stats.inProgress} icon={<Loader2 className="w-5 h-5 text-purple-500" />} />
          <StatCard title="Closed" value={stats.closed} icon={<CheckCircle className="w-5 h-5 text-green-500" />} />
          <StatCard title="Rejected" value={stats.rejected} icon={<XCircle className="w-5 h-5 text-red-500" />} />
          <StatCard title="In 8D Process" value={stats.eightDCount} icon={<AlertTriangle className="w-5 h-5 text-purple-500" />} />
        </div>

        {/* 8D Status Cards */}
        {activeFilter === FILTER_TYPES.EIGHT_D && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="Sent to 8D" value={stats.sentTo8D} icon={<Send className="w-5 h-5 text-purple-500" />} />
            <StatCard title="Ready for NCR2" value={stats.readyForNCR2} icon={<Clock className="w-5 h-5 text-indigo-500" />} />
            <StatCard title="NCR2 Verification" value={stats.ncr2InProgress} icon={<Loader2 className="w-5 h-5 text-violet-500" />} />
            <StatCard title="NCR2 Completed" value={stats.ncr2Completed} icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} />
          </div>
        )}

        {/* Filter Toggle Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter NCRs:</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter(FILTER_TYPES.ALL)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeFilter === FILTER_TYPES.ALL
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layers size={16} />
                All NCRs
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === FILTER_TYPES.ALL ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter(FILTER_TYPES.REGULAR)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeFilter === FILTER_TYPES.REGULAR
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <FileText size={16} />
                Regular NCRs
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === FILTER_TYPES.REGULAR ? 'bg-blue-500 text-white' : 'bg-blue-200 text-blue-700'
                }`}>
                  {stats.regularCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter(FILTER_TYPES.EIGHT_D)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeFilter === FILTER_TYPES.EIGHT_D
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <AlertTriangle size={16} />
                8D Process NCRs
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === FILTER_TYPES.EIGHT_D ? 'bg-purple-500 text-white' : 'bg-purple-200 text-purple-700'
                }`}>
                  {stats.eightDCount}
                </span>
              </button>
            </div>
          </div>

          {activeFilter !== FILTER_TYPES.ALL && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className={`text-xs ${
                activeFilter === FILTER_TYPES.REGULAR ? 'text-blue-600' : 'text-purple-600'
              }`}>
                {activeFilter === FILTER_TYPES.REGULAR
                  ? '📋 Showing only regular NCRs (not in 8D process)'
                  : '🔍 Showing only NCRs in 8D process (Sent to 8D, In 8D Process, Ready for NCR2, NCR2 Verification, NCR2 Completed)'
                }
              </div>
            </div>
          )}
        </div>

        {/* NCR Table Section */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                {activeFilter === FILTER_TYPES.REGULAR && 'Regular NCRs'}
                {activeFilter === FILTER_TYPES.EIGHT_D && '8D Process NCRs'}
                {activeFilter === FILTER_TYPES.ALL && 'All NCRs'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredNCRs.length} NCR{filteredNCRs.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search NCR, department, auditor..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['NCR No.', 'Department', 'Auditor', 'Auditee', 'Status', 'Audit Score', 'Action'].map((label) => (
                    <th key={label} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNCRs.map((ncr) => (
                  <tr key={ncr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{ncr.ncrNumber || `NCR ${ncr.id}`}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{ncr.department || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{ncr.auditorName || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{ncr.auditeeName || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeClass(ncr.status)}`}>
                          {getStatusLabel(ncr.status)}
                        </span>
                        {is8DRelated(ncr) && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                            🔄 8D Process
                          </span>
                        )}
                        {ncr.auditScore < 70 && ncr.status === 'APPROVED' && !ncr.requires8D && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
                            ⚠️ Needs 8D
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {ncr.auditScore != null ? (
                        <span className={`font-medium ${ncr.auditScore >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                          {ncr.auditScore}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View button */}
                        <button
                        onClick={() => navigate(`/ncr-view/${ncr.id}`, {
                          state: {
                            returnTo: '/ncr-dashboard',
                            tab: 'ncrs'
                          }
                        })}
                        className="inline-flex items-center justify-center w-8 h-8 text-blue-700 transition-all duration-200 border border-blue-200 rounded-md bg-blue-50 hover:bg-blue-100"
                        title="View NCR"
                      >
                        <Eye size={15} />
                      </button>

                        {/* NCR Forum button */}
                        <button
                          onClick={() => openNCRForum(ncr)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                          title="Open NCR Discussion Forum"
                        >
                          <MessageCircle size={12} />
                          Forum
                        </button>

                        {/* 8D Forum button — only for NCRs in 8D process */}
                        {is8DRelated(ncr) && (
                          <button
                            onClick={() => open8DForum(ncr)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                            title="Open 8D Team Discussion"
                          >
                            <MessageCircle size={12} />
                            8D Forum
                          </button>
                        )}

                        {/* Send to 8D button */}
                        {isAuditManager && ncr.status === 'APPROVED' && ncr.auditScore < 70 && !ncr.requires8D && !is8DRelated(ncr) && (
                          <button
                            onClick={() => handleSendTo8D(ncr)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            title="Send to 8D Process"
                          >
                            <Send size={12} />
                            Send to 8D
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNCRs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-gray-500">
                      {activeFilter === FILTER_TYPES.REGULAR && 'No regular NCRs found.'}
                      {activeFilter === FILTER_TYPES.EIGHT_D && 'No NCRs in 8D process found.'}
                      {activeFilter === FILTER_TYPES.ALL && 'No NCRs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Send to 8D Confirmation Modal */}
      {showSendTo8DModal && selectedNCR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Send to 8D Process</h3>
            </div>

            {selectedNCR.auditScore < 70 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ Audit Score: {selectedNCR.auditScore}% (Below 70% threshold)
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This NCR requires 8D investigation.
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-4">
              Are you sure you want to send <strong>NCR #{selectedNCR.ncrNumber}</strong> to the 8D process?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add any comments about why this needs 8D investigation..."
                value={sendTo8DComment}
                onChange={(e) => setSendTo8DComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendTo8DModal(false);
                  setSelectedNCR(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={confirmSendTo8D}
                disabled={processingAction}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {processingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                Send to 8D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NCR Forum Modal */}
      {showForumModal && selectedNCRForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedNCRForForum.id}
          auditNumber={selectedNCRForForum.ncrNumber}
          auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
          auditStatus={selectedNCRForForum.status}
          auditType="NCR Resolution"
          department={selectedNCRForForum.department}
          auditorId={selectedNCRForForum.auditorId}
          auditorName={selectedNCRForForum.auditorName}
          auditeeId={selectedNCRForForum.auditeeId}
          auditeeName={selectedNCRForForum.auditeeName}
          memberEmails={selectedNCRForForum.memberEmails || []}
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedNCRForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}

      {/* 8D Forum Drawer */}
      <Drawer
        isOpen={show8DForumDrawer}
        onClose={() => {
          setShow8DForumDrawer(false);
          setSelected8DNCR(null);
          setEightDTeamMembers([]);
        }}
        title="8D Team Discussion"
        showHeader={false}
        className="w-full sm:w-[50vw]"
      >
        {selected8DNCR && (
          <div className="h-full">
            {loadingTeamMembers ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-500 text-sm">
                  Loading team members...
                </span>
              </div>
            ) : (
              <ForumThreadView
                groupId={`8D-${selected8DNCR.ncrNumber}`}
                groupName={`8D-${selected8DNCR.ncrNumber}`}
                isInDrawer={true}
                setForumDrawerOpen={setShow8DForumDrawer}
                username={user?.email || user?.username}
                currentUser={user}
                allUsers={allUsersList}
                memberEmails={eightDTeamMembers}
                onBack={() => setShow8DForumDrawer(false)}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
    </div>
  </div>
);

export default NCRDashboard;