import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';
import { ALL_DEPARTMENTS } from '../../data/auditChecklists';
import { 
  CheckCircle, Clock, FileText, Calendar, MapPin, Send, 
  TrendingUp, ClipboardList, Eye, ArrowRight, Sparkles, X, Mail
} from 'lucide-react';
import { useNotifications } from '../../components/NotificationContext';
import { useToast } from '../../components/Toast';

export default function DGMDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releaseModal, setReleaseModal] = useState({ isOpen: false, scheduleId: null, formName: '', externalEmails: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allSchedules = await scheduleAPI.getAll();
      setSchedules(Array.isArray(allSchedules) ? allSchedules : []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (scheduleId, e) => {
    e.stopPropagation();
    try {
      await scheduleAPI.approve(scheduleId, user.email);
      addNotification('Schedule Approved', `Schedule ID ${scheduleId} has been approved.`, 'success');
      addToast('Schedule approved successfully', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      addToast('Approval failed', 'error');
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
    try {
      await scheduleAPI.release(releaseModal.scheduleId, user.email, releaseModal.externalEmails);
      addNotification('Schedule Released', `Schedule "${releaseModal.formName}" has been released. Emails sent.`, 'success');
      addToast('Schedule released and emails sent', 'success');
      closeReleaseModal();
      loadData();
    } catch (err) {
      console.error(err);
      addToast('Release failed', 'error');
    }
  };

  const scheduleContainsForm = (schedule, formId) => {
    if (!schedule.formsJson) return false;
    try {
      const formsMap = JSON.parse(schedule.formsJson);
      return Object.values(formsMap).includes(formId);
    } catch (e) {
      return false;
    }
  };

  const getScheduleStats = (formId) => {
    const deptSchedules = schedules.filter(s => scheduleContainsForm(s, formId));
    return {
      total: deptSchedules.length,
      pending: deptSchedules.filter(s => s.status === 'SUBMITTED_TO_DGM').length,
      approved: deptSchedules.filter(s => s.status === 'APPROVED').length,
      released: deptSchedules.filter(s => s.status === 'RELEASED').length,
    };
  };

  const DepartmentCard = ({ department, index, onClick }) => {
    const scheduleStats = getScheduleStats(department.sheetKey);

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ 
          duration: 0.5, 
          delay: index * 0.05,
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="overflow-hidden transition-all duration-500 bg-white border border-gray-100 shadow-md cursor-pointer group rounded-xl hover:shadow-2xl hover:-translate-y-2"
      >
        <motion.div 
          className={`h-2 bg-gradient-to-r ${department.color} transition-all duration-500 group-hover:h-3`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8, delay: index * 0.05 }}
        />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className={`w-12 h-12 rounded-lg ${department.bgColor} flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}
              whileHover={{ rotate: 6, scale: 1.1 }}
            >
              <department.icon size={24} className="text-gray-700" />
            </motion.div>
            <motion.span 
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${department.bgColor} text-gray-700 border`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 + 0.2 }}
            >
              {department.code}
            </motion.span>
          </div>
          <motion.h3 
            className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[56px] group-hover:text-blue-600 transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 + 0.1 }}
          >
            {department.name}
          </motion.h3>
          
          {/* Schedule Stats for DGM */}
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
              <Calendar size={12} /> Schedules
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs text-center">
              <div className="p-1 rounded bg-gray-50">
                <div className="text-xs font-semibold text-yellow-600">{scheduleStats.pending}</div>
                <div className="text-gray-400 text-[10px]">Pending</div>
              </div>
              <div className="p-1 rounded bg-gray-50">
                <div className="text-xs font-semibold text-purple-600">{scheduleStats.approved}</div>
                <div className="text-gray-400 text-[10px]">Approved</div>
              </div>
              <div className="p-1 rounded bg-gray-50">
                <div className="text-xs font-semibold text-green-600">{scheduleStats.released}</div>
                <div className="text-gray-400 text-[10px]">Released</div>
              </div>
            </div>
          </div>

          <motion.div 
            className="flex items-center justify-between pt-2 border-t border-gray-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 + 0.2 }}
          >
            <div className="flex items-center gap-1">
              <motion.span 
                className="text-xs text-gray-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, delay: index * 0.05 + 0.5, repeat: Infinity, repeatDelay: 3 }}
              >
                ✓
              </motion.span>
              <span className="text-xs text-gray-500">IATF 16949</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dgm/department/${department.sheetKey}`);
              }}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 transition-all duration-300 hover:text-gray-800"
            >
              <Eye size={12} /> View Schedules
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  const StatCard = ({ title, value, color, icon: Icon, delay }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (typeof value !== 'number') {
        setCount(value);
        return;
      }
      let start = 0;
      const duration = 1000;
      const step = (value / duration) * 16;
      
      const timer = setInterval(() => {
        start += step;
        if (start >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }, [value]);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="relative overflow-hidden bg-white shadow-md rounded-xl"
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <motion.div className="text-3xl font-bold" style={{ color }}>
                {typeof value === 'number' ? count : value}
              </motion.div>
              <div className="mt-1 text-sm text-gray-500">{title}</div>
            </div>
            <motion.div 
              className="flex items-center justify-center w-10 h-10 rounded-full"
              style={{ backgroundColor: `${color}20` }}
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Icon size={20} style={{ color }} />
            </motion.div>
          </div>
        </div>
        <motion.div 
          className="absolute bottom-0 left-0 h-1"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, delay: delay + 0.3 }}
        />
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingCount = schedules.filter(s => s.status === 'SUBMITTED_TO_DGM').length;
  const approvedCount = schedules.filter(s => s.status === 'APPROVED').length;
  const releasedCount = schedules.filter(s => s.status === 'RELEASED').length;
  const totalSchedules = schedules.length;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Animated Header */}
<motion.div 

  className="flex items-center justify-between mt-6 mb-8"

  initial={{ opacity: 0, y: -30 }}

  animate={{ opacity: 1, y: 0 }}

  transition={{ duration: 0.5 }}
>
<div className="flex items-center gap-4">
<motion.div 

      className="flex items-center justify-center shadow-lg w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl"

      whileHover={{ scale: 1.05, rotate: 5 }}

      transition={{ duration: 0.3 }}
>
<ClipboardList className="text-white w-7 h-7" />
</motion.div>
<div>
<motion.h1 

        className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl"

        initial={{ opacity: 0, x: -20 }}

        animate={{ opacity: 1, x: 0 }}

        transition={{ duration: 0.5, delay: 0.1 }}
>

        DGM Dashboard
</motion.h1>
<motion.p 

        className="mt-1 text-sm text-gray-500"

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ duration: 0.5, delay: 0.2 }}
>

        Welcome back, {user?.name || user?.email}
</motion.p>
</div>
</div>

  {/* Optional: Add a small stats badge here if needed */}
<motion.div 

    className="hidden sm:block"

    initial={{ opacity: 0, x: 20 }}

    animate={{ opacity: 1, x: 0 }}

    transition={{ duration: 0.5, delay: 0.3 }}
>
<div className="px-3 py-1 text-xs font-medium text-purple-600 rounded-full bg-purple-50">

      IATF 16949:2016
</div>
</motion.div>
</motion.div>
 

            {/* Stats Cards */}
            <motion.div className="grid grid-cols-2 gap-5 mb-10 sm:grid-cols-4">
              <StatCard title="Total Schedules" value={totalSchedules} color="#3B82F6" icon={Calendar} delay={0.5} />
              <StatCard title="Pending Approval" value={pendingCount} color="#F59E0B" icon={Clock} delay={0.6} />
              <StatCard title="Approved" value={approvedCount} color="#8B5CF6" icon={CheckCircle} delay={0.7} />
              <StatCard title="Released" value={releasedCount} color="#10B981" icon={Send} delay={0.8} />
            </motion.div>

            {/* Department Cards Grid */}
            <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ALL_DEPARTMENTS.map((department, index) => (
                <DepartmentCard
                  key={department.id}
                  department={department}
                  index={index}
                  onClick={() => navigate(`/dgm/department/${department.sheetKey}`)}
                />
              ))}
            </motion.div>

            {/* Footer */}
            <motion.div className="pt-6 mt-12 text-center border-t border-gray-200">
              <motion.p className="text-sm text-gray-500" whileHover={{ scale: 1.02 }}>
                Internal Quality Audit System | DGM Dashboard
              </motion.p>
              <motion.p className="mt-1 text-xs text-gray-400" whileHover={{ scale: 1.02 }}>
                IATF 16949:2016 Compliant | Format: F10(SOP/MR/02)
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
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
              <button onClick={closeReleaseModal} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleRelease} className="px-4 py-2 text-white transition bg-purple-600 rounded-lg hover:bg-purple-700">
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}