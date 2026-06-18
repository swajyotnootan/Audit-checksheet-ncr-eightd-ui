// src/components/NotificationControl.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, X } from 'lucide-react';
import axios from 'axios';
import { jsonDataApi } from '../components/services/api.jsx';
import { useAuth } from '../components/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getActiveNotificationReminders } from './services/api'; // ✅ NEW IMPORT

const NotificationControl = ({ user, isOpen, onClose, onCountUpdate }) => {
  const navigate = useNavigate();
  const { isHOD, isInitiator } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevIsOpenRef = useRef(isOpen);

  // ===============================
  // 🧠 Utility Helpers
  // ===============================
  const normalizeStatus = (status) => {
    const map = {
      IN_PROGRESS: 'In Progress',
      'in progress': 'In Progress',
      'approval pending': 'Approval Pending',
      REJECTED: 'Rejected',
      rejected: 'Rejected',
      Reject: 'Rejected',
      REJECT: 'Rejected',
      STATUS_REJECTED: 'Rejected',
      APPROVED: 'Approved',
      approved: 'Approved',
    };
    return map[status] || status || 'Open';
  };

  const isInitiatorOf = (submission) => {
    if (!user) return false;
    const submittedBy = submission.submittedBy || submission.initiatorEmail || '';
    const userEmail = user.email?.toLowerCase() || '';
    const userName = (user.name || '').toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|miss|shri|smt)\s+/i, '');
    return (
      submittedBy.toLowerCase() === userEmail ||
      submittedBy.toLowerCase() === userName ||
      (submission.initiatorEmail && submission.initiatorEmail.toLowerCase() === userEmail)
    );
  };

  // ===============================
  // 🧩 LocalStorage helpers for Initiator
  // ===============================
  const getViewedIds = () => {
    if (!user?.email) return [];
    const key = `viewedNotifications_${user.email}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  };

  const markAsViewed = (ids) => {
    if (!user?.email || !Array.isArray(ids)) return;
    const key = `viewedNotifications_${user.email}`;
    const prev = getViewedIds();
    const unique = Array.from(new Set([...prev, ...ids]));
    localStorage.setItem(key, JSON.stringify(unique));
  };

  // ===============================
  // 🔄 Fetch Notifications
  // ===============================
  useEffect(() => {
    if (!user) {
      onCountUpdate?.(0);
      setNotifications([]);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      let notifs = [];

      try {
        // -------- Fetch D0 Events --------
        const eightDRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090/api/eightd/data?t=${Date.now()}`);
        const eightDEvents = eightDRes.data?.success && Array.isArray(eightDRes.data.data)
          ? eightDRes.data.data
          : [];

        // -------- Fetch Annexure Submissions --------
        const annexRes = await jsonDataApi.list();
        const allSubmissions = annexRes.success && Array.isArray(annexRes.data)
          ? annexRes.data
          : [];

        const annexSubmissions = allSubmissions
          .map((item) => {
            try {
              const json = JSON.parse(item.jsonContent);
              const type = json.annexureType || 'Unknown';
              if (type !== 'Annexure 1') return null;
              const changeTitle =
                json.formData?.changeTitle ||
                json.annexure1Data?.basicInfo?.changeTitle ||
                json.basicInfo?.changeTitle ||
                'N/A';
              return {
                id: item.id,
                changeTitle,
                status: (json.status || 'created').toLowerCase(),
                annexureType: type,
                submittedBy: json.submittedBy || json.submittedByName || json.fullName || json.email || 'Unknown',
                initiatorEmail: json.email || null,
                createdAt: item.createdAt,
              };
            } catch (e) {
              console.error('Failed to parse annexure:', e);
              return null;
            }
          })
          .filter(Boolean);

        // -------- Fetch Renewsys Inspection Submissions --------
        const inspectionSubmissions = allSubmissions
          .map((item) => {
            try {
              const json = JSON.parse(item.jsonContent);
              if (
                json.formName ===
                "InProcess & Final Inspection Report For POE Encapsulant"
              ) {
                return {
                  id: item.id,
                  status: (item.status || 'SUBMITTED').toUpperCase(), // from DB row.status
                  initiatorEmail: json.email || null,
                  submittedBy: json.checkedBy || json.email || 'Unknown',
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                };
              }
              return null;
            } catch (e) {
              console.warn('Failed to parse inspection:', e);
              return null;
            }
          })
          .filter(Boolean);

        // -------- HOD Notifications --------
        if (isHOD) {
          // 8D
          eightDEvents.forEach((ev) => {
            if (normalizeStatus(ev.status) === 'Approval Pending') {
              notifs.push({
                id: `d0-${ev.eventNo}`,
                type: 'd0',
                eventNo: ev.eventNo,
                status: 'pending',
                createdAt: ev.createdAt,
                navigateTo: '/forms/8d',
              });
            }
          });

          // Annexure
          annexSubmissions.forEach((sub) => {
            if (sub.status === 'created') {
              notifs.push({
                id: `annex-${sub.id}`,
                type: 'annexure',
                changeTitle: sub.changeTitle,
                status: 'pending',
                createdAt: sub.createdAt,
                navigateTo: `/moc`,
              });
            }
          });

          // Renewsys Inspection
          inspectionSubmissions.forEach((insp) => {
            if (insp.status === 'SUBMITTED') {
              notifs.push({
                id: `inspection-${insp.id}`,
                type: 'inspection',
                status: 'pending',
                createdAt: insp.createdAt,
                navigateTo: '/dashboard/renewsys',
              });
            }
          });
        }

        // -------- Initiator Notifications --------
        if (isInitiator) {
          const viewedIds = getViewedIds();

          // 8D
          eightDEvents.forEach((ev) => {
            const status = normalizeStatus(ev.status);
            const id = `d0-${ev.eventNo}`;
            if (
              (status === 'In Progress' || status === 'Rejected') &&
              ev.initiatorEmail?.toLowerCase() === user.email?.toLowerCase() &&
              !viewedIds.includes(id)
            ) {
              notifs.push({
                id,
                type: 'd0',
                eventNo: ev.eventNo,
                status: status.toLowerCase(),
                createdAt: ev.updatedAt || ev.createdAt,
                navigateTo: status === 'In Progress' ? `/eightdflow` : null,
              });
            }
          });

          // Annexure
          annexSubmissions.forEach((sub) => {
            const id = `annex-${sub.id}`;
            if (
              isInitiatorOf(sub) &&
              (sub.status === 'approved' || sub.status === 'rejected') &&
              !viewedIds.includes(id)
            ) {
              notifs.push({
                id,
                type: 'annexure',
                changeTitle: sub.changeTitle,
                status: sub.status,
                createdAt: sub.createdAt,
              });
            }
          });

          // Renewsys Inspection
          inspectionSubmissions.forEach((insp) => {
            const id = `inspection-${insp.id}`;
            if (
              isInitiatorOf(insp) &&
              (insp.status === 'APPROVED' || insp.status === 'REJECTED') &&
              !viewedIds.includes(id)
            ) {
              notifs.push({
                id,
                type: 'inspection',
                status: insp.status.toLowerCase(),
                createdAt: insp.updatedAt || insp.createdAt,
              });
            }
          });

          // ✅ NEW: Gel Content Ready Reminders (24h passed, OPEN, Row6 not filled)
          const gelReminders = getActiveNotificationReminders();
          gelReminders.forEach(({ inspectionId, startTime }) => {
            notifs.push({
              id: `gel-reminder-${inspectionId}`,
              type: 'gel-content-ready',
              inspectionId,
              status: 'ready',
              createdAt: startTime,
              message: 'Your scheduled time for Gel Content (Row 6) has completed. You can now fill it.',
            });
          });
        }

        // Sort by newest first
        notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(notifs);
        onCountUpdate?.(notifs.length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        onCountUpdate?.(0);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHOD, isInitiator, isOpen, onCountUpdate]);

  // ===============================
  // 👁️ Mark viewed for Initiator WHEN PANEL CLOSES
  // ===============================
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      if (isInitiator && notifications.length > 0) {
        const ids = notifications.map((n) => n.id);
        markAsViewed(ids);
        onCountUpdate?.(0);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isInitiator, notifications, onCountUpdate]);

  // ===============================
  // 🧭 Handle Click
  // ===============================
  const handleNotificationClick = (notif) => {
    onClose();
    if (notif.navigateTo) {
      navigate(notif.navigateTo);
    } else if (notif.type === 'gel-content-ready') {
      // Navigate to dashboard and open Step 6
      navigate('/dashboard/renewsys', { state: { openInspectionId: notif.inspectionId, openStep: 6 } });
    }
  };

  // ===============================
  // 🧱 UI Helpers
  // ===============================
  const getIcon = (status, type) => {
    if (type === 'gel-content-ready') return <Clock className="text-blue-500" />;
    if (status === 'approved' || status === 'in progress') return <CheckCircle className="text-green-500" />;
    if (status === 'rejected') return <XCircle className="text-red-500" />;
    return <Clock className="text-yellow-500" />;
  };

  const getMessage = (n) => {
    if (n.type === 'd0') {
      if (n.status === 'pending') return 'Pending approval for D0';
      if (n.status === 'in progress') return 'HOD approved your D0 form, you may proceed to next steps';
      if (n.status === 'rejected') return 'HOD rejected your D0 form - please revise and resubmit';
    } else if (n.type === 'annexure') {
      if (n.status === 'pending') return 'Pending approval for Annexure 1';
      if (n.status === 'approved') return 'HOD approved your Annexure 1 submission you may proceed to annexure 2';
      if (n.status === 'rejected') return 'HOD rejected your Annexure 1 submission - please revise and resubmit';
    } else if (n.type === 'inspection') {
      if (n.status === 'pending') return 'Pending approval for Renewsys Inspection Report';
      if (n.status === 'approved') return 'HOD approved your Renewsys Inspection Report';
      if (n.status === 'rejected') return 'HOD rejected your Renewsys Inspection Report - please revise and resubmit';
    } else if (n.type === 'gel-content-ready') {
      return 'Your scheduled time for Gel Content (Row 6) has completed. You can now fill it.';
    }
    return 'Notification';
  };

  // ===============================
  // 🎨 UI Rendering
  // ===============================
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-40"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-full w-full max-w-[40%] bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No notifications</p>
              ) : (
                <div className="space-y-4">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                        n.status === 'pending' ? 'bg-yellow-50' : 'bg-blue-50'
                      } hover:bg-gray-50`}
                    >
                      <div className="mt-0.5">{getIcon(n.status, n.type)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{getMessage(n)}</p>
                        {n.eventNo && <p className="text-xs text-gray-700">Event: {n.eventNo}</p>}
                        {n.changeTitle && <p className="text-xs text-gray-700">Change title : {n.changeTitle}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationControl;