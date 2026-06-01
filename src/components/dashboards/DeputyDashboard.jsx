import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auditAPI, scheduleAPI } from '../services/api';
import { auditForms, ALL_DEPARTMENTS } from '../../data/auditChecklists';
import { 
  CheckCircle, Clock, FileText, PlusCircle, Calendar, MapPin, Send, 
  TrendingUp, ClipboardList, Eye, ArrowRight 
} from 'lucide-react';
import { useNotifications } from '../../components/NotificationContext';
import { useToast } from '../../components/Toast';

export default function DeputyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { addToast } = useToast();
  const [pendingAudits, setPendingAudits] = useState([]);
  const [allAudits, setAllAudits] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pending, all, schedulesData] = await Promise.all([
        auditAPI.getForDeputy(user.email),
        auditAPI.getAll(),
        scheduleAPI.getAll()
      ]);
      setPendingAudits(Array.isArray(pending) ? pending : []);
      setAllAudits(Array.isArray(all) ? all : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToDgm = async (scheduleId, e) => {
    e.stopPropagation();
    try {
      await scheduleAPI.submitToDgm(scheduleId, user.email);
      addNotification('Schedule Submitted', `Schedule ID ${scheduleId} submitted to DGM.`, 'info');
      addToast('Schedule submitted to DGM', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      addToast('Failed to submit schedule', 'error');
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
      draft: deptSchedules.filter(s => s.status === 'DRAFT').length,
      submitted: deptSchedules.filter(s => s.status === 'SUBMITTED_TO_DGM').length,
      approved: deptSchedules.filter(s => s.status === 'APPROVED').length,
      released: deptSchedules.filter(s => s.status === 'RELEASED').length,
    };
  };

const getAuditStats = (formId) => {

  const audits = allAudits.filter(a => a.formId === formId);

  return {

    total: audits.length,

    assigned: audits.filter(a => a.status === 'ASSIGNED').length,

    submitted: audits.filter(a => a.status === 'SUBMITTED').length,

    approved: audits.filter(a => a.status === 'APPROVED').length,

    rejected: audits.filter(a => a.status === 'REJECTED').length,

  };

};
 
  const DepartmentCard = ({ department, index, onClick }) => {
    const scheduleStats = getScheduleStats(department.sheetKey);
    const auditStats = getAuditStats(department.sheetKey);
    const auditCompletion = auditStats.total === 0 ? 0 : Math.round((auditStats.closed / auditStats.total) * 100);

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
          
          {/* Schedule Stats */}
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
              <Calendar size={12} /> Schedules
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs text-center">
              <div className="p-1 rounded bg-gray-50">
                <div className="text-xs font-semibold text-gray-700">{scheduleStats.draft}</div>
                <div className="text-gray-400 text-[10px]">Draft</div>
              </div>
              <div className="p-1 rounded bg-gray-50">
                <div className="text-xs font-semibold text-blue-600">{scheduleStats.submitted}</div>
                <div className="text-gray-400 text-[10px]">Submitted</div>
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

          {/* Audit Stats */}
<div className="mb-3">
<div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
<ClipboardList size={12} /> Audits
</div>
<div className="grid grid-cols-4 gap-1 text-xs text-center">
<div className="p-1 rounded bg-gray-50">
<div className="text-xs font-semibold text-gray-700">{auditStats.assigned}</div>
<div className="text-gray-400 text-[10px]">Assigned</div>
</div>
<div className="p-1 rounded bg-gray-50">
<div className="text-xs font-semibold text-blue-600">{auditStats.submitted}</div>
<div className="text-gray-400 text-[10px]">Submitted</div>
</div>
<div className="p-1 rounded bg-gray-50">
<div className="text-xs font-semibold text-green-600">{auditStats.approved}</div>
<div className="text-gray-400 text-[10px]">Approved</div>
</div>
<div className="p-1 rounded bg-gray-50">
<div className="text-xs font-semibold text-red-600">{auditStats.rejected}</div>
<div className="text-gray-400 text-[10px]">Rejected</div>
</div>
</div>

  {/* Optional: Remove the progress bar or keep it for total completion */}

  {auditStats.total > 0 && (
<div className="mt-2">
<div className="w-full h-1 bg-gray-200 rounded-full">
<div className="h-1 bg-green-500 rounded-full" 

             style={{ width: `${((auditStats.approved + auditStats.rejected) / auditStats.total) * 100}%` }}></div>
</div>
<p className="text-[10px] text-gray-400 mt-0.5 text-right">

        {Math.round(((auditStats.approved + auditStats.rejected) / auditStats.total) * 100)}% complete
</p>
</div>

  )}
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
            <div className="flex gap-3">
              <Link
                to={`/create-schedule?defaultForm=${department.sheetKey}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-all duration-300 hover:text-blue-800"
              >
                <PlusCircle size={12} /> Schedule
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/deputy/department/${department.sheetKey}`);
                }}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 transition-all duration-300 hover:text-gray-800"
              >
                <Eye size={12} /> View
              </button>
            </div>
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
        whileHover={{ 
          y: -5,
          transition: { duration: 0.2 }
        }}
        className="relative overflow-hidden bg-white shadow-md rounded-xl"
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <motion.div 
                className="text-3xl font-bold"
                style={{ color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  );

  const totalSchedules = schedules.length;
  const totalAudits = allAudits.length;
  const pendingReviews = pendingAudits.length;
  const completionRate = totalAudits === 0 ? 0 : Math.round((allAudits.filter(a => a.status === 'CLOSED').length / totalAudits) * 100);

  return (
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
      className="flex items-center justify-center shadow-lg w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl"
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
        Deputy Dashboard
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
    <div className="px-3 py-1 text-xs font-medium text-blue-600 rounded-full bg-blue-50">
      IATF 16949:2016
    </div>
  </motion.div>
</motion.div>

          {/* Animated Stats Cards */}
          <motion.div 
            className="grid grid-cols-2 gap-5 mb-10 sm:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <StatCard 
              title="Total Schedules" 
              value={totalSchedules} 
              color="#3B82F6" 
              icon={Calendar}
              delay={0.5}
            />
            <StatCard 
              title="Total Audits" 
              value={totalAudits} 
              color="#10B981" 
              icon={CheckCircle}
              delay={0.6}
            />
            <StatCard 
              title="Pending Reviews" 
              value={pendingReviews} 
              color="#F59E0B" 
              icon={Clock}
              delay={0.7}
            />
            <StatCard 
              title="Completion Rate" 
              value={completionRate + "%"} 
              color="#8B5CF6" 
              icon={TrendingUp}
              delay={0.8}
            />
          </motion.div>

          {/* Department Cards Grid */}
          <motion.div 
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {ALL_DEPARTMENTS.map((department, index) => (
              <DepartmentCard
                key={department.id}
                department={department}
                index={index}
                onClick={() => navigate(`/deputy/department/${department.sheetKey}`)}
              />
            ))}
          </motion.div>

          {/* Recent Schedules Section */}
          {schedules.length > 0 && (
            <motion.div 
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <h2 className="flex items-center gap-2 mb-4 text-xl font-semibold text-gray-800">
                <Calendar size={20} className="text-blue-600" />
                Recent Schedules
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {schedules.slice(0, 4).map((s, idx) => (
                  <motion.div 
                    key={s.id} 
                    className="p-4 transition bg-white border border-gray-100 shadow-sm cursor-pointer rounded-xl hover:shadow-md"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/schedule/${s.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">{s.scheduleName}</h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {s.location}</span>
                          <span>{s.startDate} – {s.endDate}</span>
                          <span className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded">{s.scheduleNumber}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Status: <span className={`font-medium ${
                            s.status === 'DRAFT' ? 'text-yellow-600' : 
                            s.status === 'SUBMITTED_TO_DGM' ? 'text-blue-600' : 'text-green-600'
                          }`}>{s.status}</span>
                        </p>
                      </div>
                      {s.status === 'DRAFT' && (
                        <button
                          onClick={(e) => handleSubmitToDgm(s.id, e)}
                          className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs transition"
                        >
                          <Send size={12} /> Submit
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Pending Reviews Section */}
          {pendingAudits.length > 0 && (
            <motion.div 
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h2 className="flex items-center gap-2 mb-4 text-xl font-semibold text-gray-800">
                <Clock size={20} className="text-yellow-600" />
                Pending Review ({pendingAudits.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pendingAudits.slice(0, 4).map((a, idx) => (
                  <motion.div 
                    key={a.id} 
                    className="p-4 transition bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{a.documentNumber}</span>
                      <span className="text-xs text-gray-500">{a.formName}</span>
                    </div>
                    <p className="mb-1 text-sm text-gray-600">HOD: {a.assignedToEmail}</p>
                    <p className="mb-3 text-xs text-gray-500">Shift: {a.shift || '—'}</p>
                    <Link
                      to={`/audit/review/${a.id}`}
                      className="inline-flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Review Now <ArrowRight size={12} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Animated Footer */}
          <motion.div 
            className="pt-6 mt-12 text-center border-t border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.p 
              className="text-sm text-gray-500"
              whileHover={{ scale: 1.02 }}
            >
              Internal Quality Audit System | Deputy Dashboard
            </motion.p>
            <motion.p 
              className="mt-1 text-xs text-gray-400"
              whileHover={{ scale: 1.02 }}
            >
              IATF 16949:2016 Compliant | Format: F10(SOP/MR/02)
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}