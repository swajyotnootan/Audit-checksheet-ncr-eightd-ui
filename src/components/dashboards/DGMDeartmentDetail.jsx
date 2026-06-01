import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, userAPI } from '../services/api';
import { auditForms, ALL_DEPARTMENTS } from '../../data/auditChecklists';
import { 
  Calendar, ClipboardList, ArrowLeft, MapPin, Send, 
  Eye, Clock, CheckCircle, AlertCircle, FileText,
  RefreshCw, Search, X, Info, Mail,
  Calendar as CalendarIcon, Hash, Tag, Building, Loader
} from 'lucide-react';
import { useNotifications } from '../../components/NotificationContext';
import { useToast } from '../../components/Toast';
// Add these imports at the top
import { MessageCircle, Users } from 'lucide-react';
import AuditForumModal from '../../components/AuditForumModal';



const PAGE_SIZES = [5, 10, 15, 20, 30, 50];

const statusClasses = {
  SUBMITTED_TO_DGM: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-purple-100 text-purple-800",
  RELEASED: "bg-green-100 text-green-800"
};

export default function DGMDepartmentDetail() {
  const { formId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  // Add these state variables with other useState declarations
const [showForum, setShowForum] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState(null);
const [allUsers, setAllUsers] = useState([]);
  const [releaseModal, setReleaseModal] = useState({ isOpen: false, scheduleId: null, formName: '', externalEmails: '' });
  
  // Loading states for actions
  const [approvingId, setApprovingId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  
  const department = auditForms[formId];
  const deptInfo = ALL_DEPARTMENTS.find(dept => dept.sheetKey === formId);

  useEffect(() => {
    loadData();
    loadHODs();
  }, [formId]);

  const loadHODs = async () => {
    try {
      const hodsData = await userAPI.getUsersByRole('HOD');
      setHods(hodsData);
    } catch (err) {
      console.error('Failed to load HODs:', err);
    }
  };


  // Add this function to load all users
const loadAllUsers = async () => {
  try {
    const users = await userAPI.getAllUsers();
    setAllUsers(users);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
};

// Add this useEffect to load users
useEffect(() => {
  loadAllUsers();
}, []);

// Add this function to get participant count for schedule
// Update this function to include HODs + Auditors + Auditees
// Update this function to include Deputy in the count
const getScheduleParticipantCount = (schedule) => {
  let count = 0;
  
  if (schedule.formsJson) {
    try {
      const formsMap = JSON.parse(schedule.formsJson);
      Object.keys(formsMap).forEach(hodId => {
        const hod = hods.find(h => h.id === parseInt(hodId));
        if (hod) {
          count++; // Add HOD
          if (hod.defaultAuditorId) count++; // Add Auditor
          if (hod.defaultAuditeeIds) {
            try {
              const auditeeIds = JSON.parse(hod.defaultAuditeeIds);
              count += auditeeIds.length; // Add Auditees
            } catch(e) {}
          }
        }
      });
    } catch(e) {}
  }
  
  // ✅ Add Deputy users to count
  const deputyUsers = allUsers.filter(u => u.role === 'DEPUTY_MANAGER_QS' || u.role === 'DEPUTY');
  count += deputyUsers.length;
  
  // ✅ Add current DGM user
  if (user?.email) count++;
  
  return count > 0 ? count : 1;
};



  const loadData = async () => {
    setLoading(true);
    try {
      const allSchedules = await scheduleAPI.getAll();
      
      const filteredSchedules = allSchedules.filter(schedule => {
        if (!schedule.formsJson) return false;
        try {
          const formsMap = JSON.parse(schedule.formsJson);
          return Object.values(formsMap).includes(formId);
        } catch (e) {
          return false;
        }
      });
      
      setSchedules(filteredSchedules);
    } catch (err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getHodLocation = (hodEmail) => {
    if (!hodEmail) return 'Not assigned';
    const hod = hods.find(h => h.email === hodEmail);
    return hod?.location || hod?.site || 'Not specified';
  };


  const getScheduleLocation = (schedule) => {
  // Try to get from schedule directly
  if (schedule.location) return schedule.location;
  
  // If not, try to get from HOD email
  if (schedule.submittedToDgmByEmail) {
    const hod = hods.find(h => h.email === schedule.submittedToDgmByEmail);
    if (hod?.location) return hod.location;
    if (hod?.site) return hod.site;
  }
  
  // If still no location, try to get from formsJson
  if (schedule.formsJson) {
    try {
      const formsMap = JSON.parse(schedule.formsJson);
      // Maybe location is stored in formsMap?
      if (formsMap.location) return formsMap.location;
    } catch(e) {}
  }
  
  return 'Location not specified';
};


  const handleApprove = async (scheduleId, e) => {
    e.stopPropagation();
    setApprovingId(scheduleId);
    try {
      await scheduleAPI.approve(scheduleId, user.email);
      addNotification('Schedule Approved', `Schedule has been approved.`, 'success');
      addToast('Schedule approved successfully', 'success');
      await loadData();
    } catch (err) {
      console.error(err);
      addToast('Approval failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const openReleaseModal = (scheduleId, scheduleName, e) => {
    e.stopPropagation();
    setReleaseModal({ isOpen: true, scheduleId, formName: scheduleName, externalEmails: '' });
  };

  const closeReleaseModal = () => {
    setReleaseModal({ isOpen: false, scheduleId: null, formName: '', externalEmails: '' });
  };

  const handleRelease = async () => {
    setReleasingId(releaseModal.scheduleId);
    try {
      // Use Promise with timeout to prevent hanging
      const releasePromise = scheduleAPI.release(releaseModal.scheduleId, user.email, releaseModal.externalEmails);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Release taking too long, but will continue in background')), 5000)
      );
      
      await Promise.race([releasePromise, timeoutPromise]);
      
      addNotification('Schedule Released', `Schedule "${releaseModal.formName}" has been released. Emails will be sent.`, 'success');
      addToast('Schedule released successfully', 'success');
      closeReleaseModal();
      
      // Reload data in background
      setTimeout(() => loadData(), 1000);
    } catch (err) {
      console.error(err);
      // Even if timeout, the release might still be processing
      addToast('Release initiated. Check email logs for status.', 'info');
      closeReleaseModal();
      setTimeout(() => loadData(), 2000);
    } finally {
      setReleasingId(null);
    }
  };

  const handleViewSchedule = (schedule, e) => {
    if (e) e.stopPropagation();
    setSelectedSchedule(schedule);
    setShowScheduleModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getFilteredByStatus = () => {
    if (activeTab === 'pending') {
      return schedules.filter(s => s.status === 'SUBMITTED_TO_DGM');
    } else if (activeTab === 'approved') {
      return schedules.filter(s => s.status === 'APPROVED');
    } else {
      return schedules.filter(s => s.status === 'RELEASED');
    }
  };

  let filteredSchedules = getFilteredByStatus();
  
  if (searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    filteredSchedules = filteredSchedules.filter(schedule => {
      return (
        schedule.scheduleNumber?.toLowerCase().includes(q) ||
        schedule.location?.toLowerCase().includes(q) ||
        schedule.status?.toLowerCase().includes(q)
      );
    });
  }
  
  filteredSchedules.sort((a, b) => {
    if (sortOrder === "asc") {
      return String(a.scheduleNumber).localeCompare(String(b.scheduleNumber));
    } else {
      return String(b.scheduleNumber).localeCompare(String(a.scheduleNumber));
    }
  });
  
  const totalCount = filteredSchedules.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchedules = filteredSchedules.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getScheduleStats = () => {
    const pending = schedules.filter(s => s.status === 'SUBMITTED_TO_DGM').length;
    const approved = schedules.filter(s => s.status === 'APPROVED').length;
    const released = schedules.filter(s => s.status === 'RELEASED').length;
    return { pending, approved, released };
  };

  const scheduleStats = getScheduleStats();

  const getScheduleForms = (schedule) => {
    if (!schedule.formsJson) return [];
    try {
      const formsMap = JSON.parse(schedule.formsJson);
      return Object.entries(formsMap).map(([key, value]) => ({
        key,
        formId: value,
        formName: auditForms[value]?.name || value
      }));
    } catch (e) {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (!department || !deptInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Department Not Found</h2>
          <p className="mb-4 text-gray-500">The requested department does not exist.</p>
          <Link to="/dgm" className="inline-flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key="dgm-department-detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gray-50"
        >
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            <div className="flex items-center justify-between mb-6">
              <Link
                to="/dgm"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </Link>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                  {deptInfo.icon && <deptInfo.icon size={40} className="text-gray-700" />}
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{department.name}</h1>
              <p className="mt-1 text-sm text-gray-500">Schedule Overview</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">{deptInfo.code}</span>
                <span className="text-xs text-gray-400">Format: {deptInfo.formatNo}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 sm:grid-cols-3">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 rounded-lg">
                      <Clock size={14} className="text-yellow-600" />
                    </div>
                    <span className="text-xs text-gray-500">Pending Approval</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{scheduleStats.pending}</span>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <CheckCircle size={14} className="text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-500">Approved</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{scheduleStats.approved}</span>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <Send size={14} className="text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500">Released</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{scheduleStats.released}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => {
                    setActiveTab('pending');
                    setCurrentPage(1);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-t-lg ${
                    activeTab === 'pending'
                      ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock size={16} />
                  Pending Approval ({scheduleStats.pending})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('approved');
                    setCurrentPage(1);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-t-lg ${
                    activeTab === 'approved'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CheckCircle size={16} />
                  Approved ({scheduleStats.approved})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('released');
                    setCurrentPage(1);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-t-lg ${
                    activeTab === 'released'
                      ? 'text-green-600 border-b-2 border-green-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Send size={16} />
                  Released ({scheduleStats.released})
                </button>
              </div>
            </div>

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
                    placeholder={activeTab === 'pending' ? "Search pending schedules..." : activeTab === 'approved' ? "Search approved schedules..." : "Search released schedules..."}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Schedule No.</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Participants</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-500">Loading schedules...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedSchedules.length > 0 ? (
                      paginatedSchedules.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{schedule.scheduleNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" />
                              {getScheduleLocation(schedule)}  {/* ← Replace the existing code with this */}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              {formatDate(schedule.startDate)} – {formatDate(schedule.endDate)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
    <div className="flex items-center gap-2">
      <Users size={14} className="text-gray-400" />
      {getScheduleParticipantCount(schedule)} participants  {/* ✅ FIXED */}
    </div>
  </td>

                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[schedule.status] || 'bg-gray-100 text-gray-700'}`}>
                              {schedule.status === 'SUBMITTED_TO_DGM' ? 'PENDING APPROVAL' : schedule.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {schedule.status === 'SUBMITTED_TO_DGM' && (
                                <button
                                  onClick={(e) => handleApprove(schedule.id, e)}
                                  disabled={approvingId === schedule.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white transition bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {approvingId === schedule.id ? (
                                    <>
                                      <Loader size={14} className="animate-spin" /> Approving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle size={14} /> Approve
                                    </>
                                  )}
                                </button>
                              )}
                              {schedule.status === 'APPROVED' && (
                                <button
                                  onClick={(e) => openReleaseModal(schedule.id, schedule.scheduleName, e)}
                                  disabled={releasingId === schedule.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white transition bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {releasingId === schedule.id ? (
                                    <>
                                      <Loader size={14} className="animate-spin" /> Releasing...
                                    </>
                                  ) : (
                                    <>
                                      <Send size={14} /> Release
                                    </>
                                  )}
                                </button>
                              )}
                              {(schedule.status === 'SUBMITTED_TO_DGM' || schedule.status === 'APPROVED' || schedule.status === 'RELEASED') && (
                                <button
                                  onClick={(e) => handleViewSchedule(schedule, e)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 transition bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                  <Eye size={14} /> View
                                </button>
                              )}

                             
<button
  onClick={() => {
    // Get all participant emails from the schedule
    const participantEmails = new Set();
    
    // 1. Add Deputy (submitter)
    if (schedule.submittedToDgmByEmail) {
      participantEmails.add(schedule.submittedToDgmByEmail);
    }
    
    // 2. Add DGM (current user)
    if (user?.email) {
      participantEmails.add(user.email);
    }
    
    // ✅ 3. Add ALL DGM users (in case there are multiple)
    const allDgmUsers = allUsers.filter(u => u.role === 'DGM_MR' || u.role === 'DGM');
    allDgmUsers.forEach(dgm => {
      if (dgm?.email) participantEmails.add(dgm.email);
    });
    
    // 4. Add all HODs from formsJson with their auditors and auditees
    if (schedule.formsJson) {
      try {
        const formsMap = JSON.parse(schedule.formsJson);
        Object.keys(formsMap).forEach(hodId => {
          const hod = hods.find(h => h.id === parseInt(hodId));
          if (hod?.email) {
            participantEmails.add(hod.email);
            
            // Add Auditor for this HOD
            if (hod.defaultAuditorId) {
              const auditor = allUsers.find(u => u.id === hod.defaultAuditorId);
              if (auditor?.email) participantEmails.add(auditor.email);
            }
            
            // Add Auditees for this HOD
            if (hod.defaultAuditeeIds) {
              try {
                const auditeeIds = JSON.parse(hod.defaultAuditeeIds);
                auditeeIds.forEach(id => {
                  const auditee = allUsers.find(u => u.id === id);
                  if (auditee?.email) participantEmails.add(auditee.email);
                });
              } catch(e) {}
            }
          }
        });
      } catch(e) {}
    }
    
    console.log('Participants for forum (DGM view):', Array.from(participantEmails));
    
    // Create schedule object for forum with memberEmails
    setSelectedAuditForForum({
      id: schedule.id,
      documentNumber: schedule.scheduleNumber,
      formName: department?.name || 'Schedule',
      status: schedule.status,
      location: getScheduleLocation(schedule),
      auditorId: null,
      auditeeIds: [],
      hodEmail: schedule.submittedToDgmByEmail,
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
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle size={32} className="text-gray-300" />
                            <p className="text-sm">
                              {activeTab === 'pending' 
                                ? 'No pending schedules found for this department' 
                                : activeTab === 'approved'
                                ? 'No approved schedules found for this department'
                                : 'No released schedules found for this department'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {paginatedSchedules.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 text-sm border-t">
                  <div className="text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-2 py-1 text-sm text-white bg-blue-600 rounded">{currentPage}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Schedule Details Modal */}
      <AnimatePresence>
        {showScheduleModal && selectedSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Schedule Details</h2>
                    <p className="text-sm text-gray-500">{selectedSchedule.scheduleNumber}</p>
                  </div>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 text-gray-400 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Schedule Number</span>
                    </div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{selectedSchedule.scheduleNumber}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Status</span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[selectedSchedule.status]}`}>
                      {selectedSchedule.status === 'SUBMITTED_TO_DGM' ? 'PENDING APPROVAL' : selectedSchedule.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">Schedule Name</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{selectedSchedule.scheduleName}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Location</span>
                    </div>
                    <p className="text-sm text-gray-900">
                      {selectedSchedule.location || getHodLocation(selectedSchedule.submittedToDgmByEmail) || 'Not specified'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Building size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Department</span>
                    </div>
                    <p className="text-sm text-gray-900">{department.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Start Date</span>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(selectedSchedule.startDate)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">End Date</span>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(selectedSchedule.endDate)}</p>
                  </div>
                </div>

                {selectedSchedule.submittedToDgmByEmail && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Submitted by</span>
                    </div>
                    <p className="text-sm text-gray-900">{selectedSchedule.submittedToDgmByEmail}</p>
                    <p className="text-xs text-gray-400">on {formatDateTime(selectedSchedule.submittedAt)}</p>
                  </div>
                )}

                {selectedSchedule.approvedByEmail && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-xs font-medium text-gray-500">Approved by</span>
                    </div>
                    <p className="text-sm text-gray-900">{selectedSchedule.approvedByEmail}</p>
                    <p className="text-xs text-gray-400">on {formatDateTime(selectedSchedule.approvedAt)}</p>
                  </div>
                )}

                {selectedSchedule.releasedByEmail && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Send size={14} className="text-green-600" />
                      <span className="text-xs font-medium text-gray-500">Released by</span>
                    </div>
                    <p className="text-sm text-gray-900">{selectedSchedule.releasedByEmail}</p>
                    <p className="text-xs text-gray-400">on {formatDateTime(selectedSchedule.releasedAt)}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={16} className="text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Forms Included</h3>
                  </div>
                  <div className="space-y-2">
                    {getScheduleForms(selectedSchedule).map((form, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-blue-500" />
                          <span className="text-sm text-gray-700">{form.formName}</span>
                        </div>
                        <span className="font-mono text-xs text-gray-400">{form.formId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 bg-white border-t">
                <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Close
                </button>
                {selectedSchedule.status === 'SUBMITTED_TO_DGM' && (
                  <button 
                    onClick={(e) => { handleApprove(selectedSchedule.id, e); setShowScheduleModal(false); }} 
                    disabled={approvingId === selectedSchedule.id}
                    className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {approvingId === selectedSchedule.id ? (
                      <><Loader size={14} className="inline mr-1 animate-spin" /> Approving...</>
                    ) : (
                      <><CheckCircle size={14} className="inline mr-1" /> Approve</>
                    )}
                  </button>
                )}
                {selectedSchedule.status === 'APPROVED' && (
                  <button 
                    onClick={(e) => { openReleaseModal(selectedSchedule.id, selectedSchedule.scheduleName, e); setShowScheduleModal(false); }} 
                    className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    <Send size={14} className="inline mr-1" /> Release
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Release Modal */}
      {releaseModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Release Schedule</h3>
              <button onClick={closeReleaseModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <p className="mb-2 text-gray-600">
              Are you sure you want to release <strong>{releaseModal.formName}</strong>?
            </p>
            <div className="mt-4">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                External Emails (comma separated)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={releaseModal.externalEmails}
                  onChange={(e) => setReleaseModal({ ...releaseModal, externalEmails: e.target.value })}
                  placeholder="customer@example.com, supplier@example.com"
                  className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                These recipients will receive a copy of the release email.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeReleaseModal}
                disabled={releasingId === releaseModal.scheduleId}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                disabled={releasingId === releaseModal.scheduleId}
                className="flex items-center gap-2 px-4 py-2 text-white transition bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {releasingId === releaseModal.scheduleId ? (
                  <>
                    <Loader size={16} className="animate-spin" /> Releasing...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Confirm Release
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
    auditeeIds={selectedAuditForForum.auditeeIds}
    hodEmail={selectedAuditForForum.hodEmail}
    memberEmails={selectedAuditForForum.memberEmails}  // ✅ ADD THIS LINE
  />
)}
    </>
  );
}




