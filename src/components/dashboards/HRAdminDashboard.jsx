// src/components/dashboards/HRAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiUserCheck, FiAward, FiTrendingUp, FiCalendar, 
  FiClock, FiSearch, FiEdit2, FiSave, FiX, FiPlus,
  FiCheckCircle, FiAlertCircle, FiFileText, FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../../components/services/api';
import { useToast } from '../ToastContext';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// COLOR PALETTE & ANIMATIONS (Matching Auditee/Master Dashboard)
// ============================================================================
const NAVBAR_COLORS = {
    primary: '#00529B',
    secondary: '#3b82f6',
    dark: '#1e3a8a',
    light: '#60a5fa',
    lighter: '#93c5fd',
    bg: '#eff6ff',
    white: '#ffffff',
};

const animationStyles = `
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
.animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.card-hover { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.card-hover:hover { transform: translateY(-6px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
.stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
`;

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
const StatCard = ({ title, value, icon, delay = 0, color = 'primary' }) => {
    const colorMap = {
        primary: { text: 'text-blue-600', iconBg: 'bg-blue-50' },
        green: { text: 'text-emerald-600', iconBg: 'bg-emerald-50' },
        amber: { text: 'text-amber-600', iconBg: 'bg-amber-50' },
        blue: { text: 'text-blue-600', iconBg: 'bg-blue-50' },
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <div className="p-6 bg-white border shadow-sm stat-card border-slate-200 rounded-2xl animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${c.iconBg}`}>
                    <div className={c.text}>{icon}</div>
                </div>
            </div>
            <p className="mb-1 text-3xl font-bold tracking-tight text-slate-800">{value}</p>
            <p className="text-xs font-medium tracking-wide uppercase text-slate-500">{title}</p>
        </div>
    );
};

const HRAdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [auditors, setAuditors] = useState([]);
  const [filteredAuditors, setFilteredAuditors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAuditor, setEditingAuditor] = useState(null);
  const [showCompetencyForm, setShowCompetencyForm] = useState(false);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalAuditors: 0,
    certified: 0,
    expiringSoon: 0,
    avgExperience: 0
  });

  const processes = [
    "Machining", "Assembly", "Welding", "Painting", "Heat Treatment",
    "Surface Finishing", "Quality Control", "Warehouse", "Maintenance",
    "Procurement", "Sales", "Engineering", "HR", "IT", "Logistics"
  ];

  const coreToolsList = ["APQP", "FMEA", "PPAP", "SPC", "MSA"];
  const problemSolvingToolsList = ["8D", "Why-Why", "Fishbone", "Pareto", "5W1H"];

  const departments = {
    'MR': 'Management Representative',
    'ENGG': 'Engineering',
    'PLANT_MAINTENANCE': 'Plant Maintenance',
    'STORES_DESPATCH': 'Stores & Despatch',
    'PURCHASE': 'Purchase',
    'PPC': 'Production Planning & Control',
    'PRODUCTION': 'Production',
    'HR': 'Human Resources',
    'UNIT_HEAD': 'Unit Head',
    'TOOL_MAINTENANCE': 'Tool Management',
    'QA': 'Quality Assurance',
    'MARKETING': 'Marketing'
  };

  const fetchAuditors = async () => {
    try {
      setLoading(true);
      const allUsers = await userAPI.getAll();
      const auditorList = allUsers.filter(u => 
        u.role === 'AUDITOR' || u.role === 'LEAD_AUDITOR'
      );
      setAuditors(auditorList);
      setFilteredAuditors(auditorList);
      
      const certified = auditorList.filter(a => a.internalAuditorTraining).length;
      const expiringSoon = auditorList.filter(a => {
        if (!a.certificationExpiryDate) return false;
        const expiry = new Date(a.certificationExpiryDate);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return expiry <= threeMonthsFromNow;
      }).length;
      
      const totalExp = auditorList.reduce((sum, a) => sum + (a.totalExperience || 0), 0);
      const avgExp = auditorList.length > 0 ? (totalExp / auditorList.length).toFixed(1) : 0;
      
      setStats({
        totalAuditors: auditorList.length,
        certified,
        expiringSoon,
        avgExperience: avgExp
      });
    } catch (error) {
      console.error('Error fetching auditors:', error);
      addToast('Failed to load auditor data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditors();
  }, []);

  useEffect(() => {
    let filtered = auditors;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = auditors.filter(a => 
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.qualification?.toLowerCase().includes(term)
      );
    }
    setFilteredAuditors(filtered);
  }, [searchTerm, auditors]);

  const handleUpdateCompetency = async (auditorId, competencyData) => {
    try {
      const currentUser = await userAPI.getUserById(auditorId);
      
      const updateData = {
        namePrefix: currentUser.namePrefix || '',
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        userName: currentUser.username || currentUser.userName,
        email: currentUser.email,
        phone: currentUser.phone || '',
        dateOfBirth: currentUser.dateOfBirth || '',
        gender: currentUser.gender || '',
        role: currentUser.role,
        department: currentUser.department,
        status: currentUser.active !== undefined ? currentUser.active : true,
        site: currentUser.site || '',
        location: currentUser.location || '',
        reportingToId: currentUser.reportingTo?.id || null,
        qualification: competencyData.qualification,
        totalExperience: competencyData.totalExperience,
        internalAuditorTraining: competencyData.internalAuditorTraining,
        coreToolsTraining: competencyData.coreToolsTraining,
        customerSpecificApproved: competencyData.customerSpecificApproved,
        problemSolvingTools: competencyData.problemSolvingTools,
        certifiedForProcess: competencyData.certifiedForProcess,
        certifiedForProduct: competencyData.certifiedForProduct || currentUser.certifiedForProduct,
        certificationDate: competencyData.certificationDate,
        certificationExpiryDate: competencyData.certificationExpiryDate
      };
      
      await userAPI.update(auditorId, updateData);
      addToast('Competency updated successfully', 'success');
      setShowCompetencyForm(false);
      setEditingAuditor(null);
      await fetchAuditors();
    } catch (error) {
      console.error('Error updating competency:', error);
      addToast(error.response?.data || 'Failed to update competency', 'error');
    }
  };

  const CompetencyForm = ({ auditor, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      qualification: auditor?.qualification || '',
      totalExperience: auditor?.totalExperience || '',
      internalAuditorTraining: auditor?.internalAuditorTraining || '',
      coreToolsTraining: auditor?.coreToolsTraining || '',
      customerSpecificApproved: auditor?.customerSpecificApproved || false,
      problemSolvingTools: auditor?.problemSolvingTools || '',
      certifiedForProcess: auditor?.certifiedForProcess ? 
        auditor.certifiedForProcess.split(',') : [],
      certifiedForProduct: auditor?.certifiedForProduct || '',
      certificationDate: auditor?.certificationDate?.split('T')[0] || '',
      certificationExpiryDate: auditor?.certificationExpiryDate?.split('T')[0] || ''
    });

    const handleProcessToggle = (process) => {
      setFormData(prev => ({
        ...prev,
        certifiedForProcess: prev.certifiedForProcess.includes(process)
          ? prev.certifiedForProcess.filter(p => p !== process)
          : [...prev.certifiedForProcess, process]
      }));
    };

    const handleCoreToolsToggle = (tool) => {
      const currentTools = formData.coreToolsTraining ? formData.coreToolsTraining.split(',') : [];
      const newTools = currentTools.includes(tool)
        ? currentTools.filter(t => t !== tool)
        : [...currentTools, tool];
      setFormData(prev => ({ ...prev, coreToolsTraining: newTools.join(',') }));
    };

    const handleProblemSolvingToggle = (tool) => {
      const currentTools = formData.problemSolvingTools ? formData.problemSolvingTools.split(',') : [];
      const newTools = currentTools.includes(tool)
        ? currentTools.filter(t => t !== tool)
        : [...currentTools, tool];
      setFormData(prev => ({ ...prev, problemSolvingTools: newTools.join(',') }));
    };

    const handleSubmit = () => {
      const submitData = {
        qualification: formData.qualification,
        totalExperience: parseInt(formData.totalExperience) || 0,
        internalAuditorTraining: formData.internalAuditorTraining,
        coreToolsTraining: formData.coreToolsTraining,
        customerSpecificApproved: formData.customerSpecificApproved,
        problemSolvingTools: formData.problemSolvingTools,
        certifiedForProcess: formData.certifiedForProcess.join(','),
        certifiedForProduct: formData.certifiedForProduct,
        certificationDate: formData.certificationDate,
        certificationExpiryDate: formData.certificationExpiryDate
      };
      onSave(submitData);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto bg-black/50 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Update Competency</h3>
              <p className="text-xs text-slate-500 mt-0.5">For {auditor?.firstName} {auditor?.lastName}</p>
            </div>
            <button onClick={onCancel} className="p-2 transition-colors rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Qualification</label>
                <input type="text" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} placeholder="e.g., B.Tech, M.Tech" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Total Experience (Years)</label>
                <input type="number" value={formData.totalExperience} onChange={(e) => setFormData({...formData, totalExperience: e.target.value})} placeholder="Years of experience" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Internal Auditor Training</label>
              <input type="text" value={formData.internalAuditorTraining} onChange={(e) => setFormData({...formData, internalAuditorTraining: e.target.value})} placeholder="e.g., ISO 9001 & IATF16949" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-600">Core Tools Training</label>
              <div className="flex flex-wrap gap-2">
                {coreToolsList.map(tool => (
                  <button key={tool} type="button" onClick={() => handleCoreToolsToggle(tool)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${formData.coreToolsTraining?.includes(tool) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-600">Problem Solving Tools</label>
              <div className="flex flex-wrap gap-2">
                {problemSolvingToolsList.map(tool => (
                  <button key={tool} type="button" onClick={() => handleProblemSolvingToggle(tool)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${formData.problemSolvingTools?.includes(tool) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-600">Certified to Audit Processes</label>
              <div className="grid grid-cols-2 gap-1 p-2 overflow-y-auto border md:grid-cols-3 max-h-40 border-slate-200 rounded-xl bg-slate-50/50">
                {processes.map(process => (
                  <label key={process} className="flex items-center gap-2 p-2 transition-colors rounded-lg cursor-pointer hover:bg-white">
                    <input type="checkbox" checked={formData.certifiedForProcess.includes(process)} onChange={() => handleProcessToggle(process)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">{process}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Certified for Products (Product IDs)</label>
              <input type="text" value={formData.certifiedForProduct} onChange={(e) => setFormData({...formData, certifiedForProduct: e.target.value})} placeholder="e.g., 24611, 2452, 45216" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
              <p className="mt-1 text-xs text-slate-400">Enter product IDs separated by commas</p>
            </div>

            <div className="flex items-center gap-2 p-3 border bg-slate-50 rounded-xl border-slate-100">
              <input type="checkbox" checked={formData.customerSpecificApproved} onChange={(e) => setFormData({...formData, customerSpecificApproved: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
              <label className="text-sm font-medium text-slate-700">Approved for Customer Specific Requirements</label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Certification Date</label>
                <input type="date" value={formData.certificationDate} onChange={(e) => setFormData({...formData, certificationDate: e.target.value})} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Expiry Date</label>
                <input type="date" value={formData.certificationExpiryDate} onChange={(e) => setFormData({...formData, certificationExpiryDate: e.target.value})} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
              </div>
            </div>
          </div>
          
          <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
            <button onClick={onCancel} className="px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all">Save Competency</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen m-0" style={{ backgroundColor: NAVBAR_COLORS.bg }}>
      <style>{animationStyles}</style>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUp">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 shadow-md rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}>
              <FiAward className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">HR Admin Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage auditor competency and training records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/form1')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-all rounded-xl shadow-sm hover:shadow-md card-hover" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)` }}>
              <FiFileText className="w-4 h-4" /> View Form 1
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-4">
          <StatCard title="Total Auditors" value={stats.totalAuditors} icon={<FiUsers size={20} />} delay={0} color="primary" />
          <StatCard title="Certified" value={stats.certified} icon={<FiUserCheck size={20} />} delay={100} color="green" />
          <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={<FiClock size={20} />} delay={200} color="amber" />
          <StatCard title="Avg Experience" value={`${stats.avgExperience} yrs`} icon={<FiTrendingUp size={20} />} delay={300} color="blue" />
        </div>

        {/* Search Bar */}
        <div className="p-4 mb-8 bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute w-4 h-4 transform -translate-y-1/2 left-4 top-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name, email, or qualification..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm" />
            </div>
            <button onClick={fetchAuditors} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md card-hover">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp">
            <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: NAVBAR_COLORS.lighter, borderTopColor: NAVBAR_COLORS.primary }}></div>
            <p className="text-sm font-medium text-slate-500">Loading auditor data...</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Main Header Row */}
                  <tr className="border-b bg-slate-50 border-slate-200">
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Sr.No.</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Auditor Name</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Dept</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Qualification</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Experience</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">IATF Training</th>
                    <th colSpan="5" className="px-2 py-2 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Core Tools Training</th>
                    <th colSpan="3" className="px-2 py-2 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100">Approved to Audit</th>
                    <th rowSpan="2" className="px-4 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider">Action</th>
                  </tr>
                  {/* Sub Header Row */}
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">APQP</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FMEA</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PPAP</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">SPC</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">MSA</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Process</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Problem Solving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditors.length === 0 ? (
                    <tr>
                      <td colSpan="16" className="py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-slate-100">
                            <FiUsers className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-700">No auditors found</p>
                          <p className="max-w-xs mt-1 text-xs text-slate-500">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditors.map((auditor, index) => (
                      <tr key={auditor.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-center text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{auditor.firstName} {auditor.lastName}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{departments[auditor.department] || auditor.department || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{auditor.qualification || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{auditor.totalExperience || 0} yrs</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {auditor.internalAuditorTraining ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium  text-gray-700 border">{auditor.internalAuditorTraining}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        {/* Core Tools */}
                        {['APQP', 'FMEA', 'PPAP', 'SPC', 'MSA'].map(tool => (
                          <td key={tool} className="px-3 py-3 text-center">
                            {auditor.coreToolsTraining?.includes(tool) ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                                <FiCheckCircle className="w-4 h-4" />
                              </span>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                        ))}
                        {/* Approved to carry out audit of */}
                        <td className="px-3 py-3 text-center">
                          {auditor.certifiedForProcess ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {auditor.certifiedForProcess.split(',').slice(0, 1).map((p, i) => (
                                <span key={i} className="px-1.5 py-0.5  text-gray-700 border rounded text-[10px] font-semibold">{p.trim()}</span>
                              ))}
                              {auditor.certifiedForProcess.split(',').length > 1 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">+{auditor.certifiedForProcess.split(',').length - 1}</span>
                              )}
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {auditor.certifiedForProduct ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {auditor.certifiedForProduct.split(',').slice(0, 1).map((p, i) => (
                                <span key={i} className="px-1.5 py-0.5  text-gray-700 border rounded text-[10px] font-medium">{p.trim()}</span>
                              ))}
                              {auditor.certifiedForProduct.split(',').length > 1 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">+{auditor.certifiedForProduct.split(',').length - 1}</span>
                              )}
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {auditor.problemSolvingTools ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {auditor.problemSolvingTools.split(',').slice(0, 1).map((t, i) => (
                                <span key={i} className="px-1.5 py-0.5 text-gray-700 border rounded text-[10px] font-medium">{t.trim()}</span>
                              ))}
                              {auditor.problemSolvingTools.split(',').length > 1 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">+{auditor.problemSolvingTools.split(',').length - 1}</span>
                              )}
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => { setEditingAuditor(auditor); setShowCompetencyForm(true); }} className="p-2 transition-all rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Edit Competency">
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showCompetencyForm && editingAuditor && (
          <CompetencyForm
            auditor={editingAuditor}
            onSave={(data) => handleUpdateCompetency(editingAuditor.id, data)}
            onCancel={() => { setShowCompetencyForm(false); setEditingAuditor(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default HRAdminDashboard;