// src/components/dashboards/LeadAuditorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiCheckCircle, FiClock, FiAlertCircle, FiUsers, FiFileText, FiEye, 
  FiRefreshCw, FiCalendar, FiSend, FiCheck, FiX, FiUserCheck,
  FiTrendingUp, FiArrowRight
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

const LeadAuditorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    openNCRs: 0,
    auditsThisMonth: 0,
    completedAudits: 0,
    teamSize: 0
  });
  
  // State for data
  const [pendingAudits, setPendingAudits] = useState([]);
  const [teamAuditors, setTeamAuditors] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  
  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch lead auditor data
  const fetchLeadAuditorData = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      // Fetch all schedules for the year
      const schedulesResponse = await axios.get(`${API_BASE}/audit-schedule/year/${currentYear}`, { withCredentials: true });
      const allSchedules = schedulesResponse.data || [];
      
      // Filter schedules where leadAuditorId matches current user
      const myAudits = allSchedules.filter(s => s.leadAuditorId === user?.id && s.scheduledDate);
      
      // Pending reviews (status COMPLETED but not yet reviewed by lead auditor)
      const pending = myAudits.filter(s => s.status === 'COMPLETED' && s.detailedApprovalStatus !== 'APPROVED');
      
      // Completed audits
      const completed = myAudits.filter(s => s.status === 'COMPLETED' && s.detailedApprovalStatus === 'APPROVED');
      
      // Audits this month
      const currentMonth = new Date().getMonth();
      const thisMonthAudits = myAudits.filter(s => {
        const auditDate = new Date(s.scheduledDate);
        return auditDate.getMonth() === currentMonth;
      });
      
      // Fetch team auditors (auditors reporting to this lead auditor)
      const usersResponse = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      const allUsers = usersResponse.data || [];
      const team = allUsers.filter(u => u.reportingTo?.id === user?.id || u.reportingToId === user?.id);
      
      setPendingAudits(pending);
      setRecentAudits(myAudits.slice(0, 5));
      setTeamAuditors(team);
      
      setStats({
        pendingReviews: pending.length,
        openNCRs: 0, // Placeholder - NCR endpoint not available yet
        auditsThisMonth: thisMonthAudits.length,
        completedAudits: completed.length,
        teamSize: team.length
      });
      
    } catch (error) {
      console.error('Error fetching lead auditor data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeadAuditorData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeadAuditorData();
    addToast('Dashboard refreshed', 'success');
  };

  const handleReviewAudit = (audit) => {
    setSelectedAudit(audit);
    setReviewComment('');
    setReviewApproved(true);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAudit) return;
    
    // If rejecting, require a reason
    if (!reviewApproved && !reviewComment.trim()) {
      addToast('Please provide a reason for rejection', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const endpoint = reviewApproved ? 'approve' : 'reject';
      await axios.post(
        `${API_BASE}/audit-schedule/schedule/${selectedAudit.id}/${endpoint}?userId=${user?.id}`,
        reviewApproved ? { comments: reviewComment } : { reason: reviewComment },
        { withCredentials: true }
      );
      
      addToast(`Audit ${reviewApproved ? 'approved' : 'rejected'} successfully!`, reviewApproved ? 'success' : 'error');
      setShowReviewModal(false);
      setSelectedAudit(null);
      setReviewComment('');
      await fetchLeadAuditorData();
    } catch (error) {
      console.error('Error submitting review:', error);
      addToast(error.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'SCHEDULED': 'bg-blue-100 text-blue-700',
      'IN_PROGRESS': 'bg-amber-100 text-amber-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'APPROVED': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lead Auditor Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name || user?.username}</p>
          <p className="text-sm text-gray-400 mt-0.5">Review audits and manage team</p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingReviews}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <FiClock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Audits This Month</p>
              <p className="text-2xl font-bold text-blue-600">{stats.auditsThisMonth}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FiFileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedAudits}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Team Size</p>
              <p className="text-2xl font-bold text-purple-600">{stats.teamSize}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FiUsers className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reviews Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiClock className="w-4 h-4 text-amber-600" />
            Pending Audit Reviews ({pendingAudits.length})
          </h3>
          <p className="text-xs text-gray-500 mt-1">Audits completed by auditors awaiting your review</p>
        </div>
        <div className="divide-y divide-gray-100">
          {pendingAudits.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FiCheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending audits to review</p>
              <p className="text-xs mt-1">When auditors complete audits, they will appear here</p>
            </div>
          ) : (
            pendingAudits.map((audit) => (
              <div key={audit.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-gray-800">{audit.auditType || 'Audit'} - {audit.department || 'General'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(audit.status)}`}>
                        {audit.status || 'SCHEDULED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500 mt-2">
                      <div className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {audit.scheduledDate}</div>
                      <div className="flex items-center gap-1"><FiUserCheck className="w-3 h-3" /> Auditor: {audit.auditorName || 'N/A'}</div>
                      <div className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> Auditee: {audit.auditeeName || 'N/A'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReviewAudit(audit)}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center gap-1 ml-4"
                  >
                    <FiEye className="w-3 h-3" /> Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Audits & Team Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Audits */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-blue-600" />
              Recent Audits
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAudits.length === 0 ? (
              <div className="p-5 text-center text-gray-400">No recent audits</div>
            ) : (
              recentAudits.map((audit) => (
                <div key={audit.id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{audit.department}</p>
                      <p className="text-xs text-gray-400">{audit.scheduledDate}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(audit.status)}`}>
                      {audit.status || 'SCHEDULED'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Auditors */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-purple-600" />
              My Team ({teamAuditors.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {teamAuditors.length === 0 ? (
              <div className="p-5 text-center text-gray-400">No team members assigned</div>
            ) : (
              teamAuditors.map((auditor) => (
                <div key={auditor.id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{auditor.firstName} {auditor.lastName}</p>
                      <p className="text-xs text-gray-400">{auditor.role}</p>
                    </div>
                    <Link to={`/auditor/${auditor.id}`} className="text-gray-400 hover:text-purple-600">
                      <FiEye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Review Audit</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Audit Details</p>
                <p className="text-sm font-medium">{selectedAudit.department} - {selectedAudit.scheduledDate}</p>
                <p className="text-xs text-gray-500 mt-1">Auditor: {selectedAudit.auditorName}</p>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={reviewApproved}
                    onChange={() => setReviewApproved(true)}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm">Approve</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!reviewApproved}
                    onChange={() => setReviewApproved(false)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm">Reject / Request Changes</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {reviewApproved ? 'Comments (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={reviewApproved ? "Add any comments..." : "Please provide reason for rejection..."}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${reviewApproved ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white disabled:opacity-50`}
              >
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (reviewApproved ? <FiCheck className="w-4 h-4" /> : <FiX className="w-4 h-4" />)}
                {reviewApproved ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadAuditorDashboard;