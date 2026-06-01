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

// Add inside component

// Add button in the header section

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
        // Competency fields
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
      setFormData(prev => ({
        ...prev,
        coreToolsTraining: newTools.join(',')
      }));
    };

    const handleProblemSolvingToggle = (tool) => {
      const currentTools = formData.problemSolvingTools ? formData.problemSolvingTools.split(',') : [];
      const newTools = currentTools.includes(tool)
        ? currentTools.filter(t => t !== tool)
        : [...currentTools, tool];
      setFormData(prev => ({
        ...prev,
        problemSolvingTools: newTools.join(',')
      }));
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold">
              Competency for {auditor?.firstName} {auditor?.lastName}
            </h3>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  placeholder="e.g., B.Tech, M.Tech"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Experience (Years)</label>
                <input
                  type="number"
                  value={formData.totalExperience}
                  onChange={(e) => setFormData({...formData, totalExperience: e.target.value})}
                  placeholder="Years of experience"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Auditor Training</label>
              <input
                type="text"
                value={formData.internalAuditorTraining}
                onChange={(e) => setFormData({...formData, internalAuditorTraining: e.target.value})}
                placeholder="e.g., ISO 9001 & IATF16949"
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Core Tools Training</label>
              <div className="flex flex-wrap gap-2">
                {coreToolsList.map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleCoreToolsToggle(tool)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      formData.coreToolsTraining?.includes(tool)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Problem Solving Tools</label>
              <div className="flex flex-wrap gap-2">
                {problemSolvingToolsList.map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleProblemSolvingToggle(tool)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      formData.problemSolvingTools?.includes(tool)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Certified to Audit Processes</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {processes.map(process => (
                  <label key={process} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.certifiedForProcess.includes(process)}
                      onChange={() => handleProcessToggle(process)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{process}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certified for Products (Product IDs)</label>
              <input
                type="text"
                value={formData.certifiedForProduct}
                onChange={(e) => setFormData({...formData, certifiedForProduct: e.target.value})}
                placeholder="e.g., 24611, 2452, 45216"
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">Enter product IDs separated by commas</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.customerSpecificApproved}
                onChange={(e) => setFormData({...formData, customerSpecificApproved: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label className="text-sm font-medium">Approved for Customer Specific Requirements</label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certification Date</label>
                <input
                  type="date"
                  value={formData.certificationDate}
                  onChange={(e) => setFormData({...formData, certificationDate: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.certificationExpiryDate}
                  onChange={(e) => setFormData({...formData, certificationExpiryDate: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Competency
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiAward className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">HR Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage auditor competency and training records</p>
            <p className="text-xs text-gray-400 mt-1">
              Logged in as: <span className="font-medium">{user?.name || user?.username}</span>
            </p>
          </div>
          
<div className="flex items-center gap-3">
  <button
    onClick={() => navigate('/form1')}
    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
  >
    View Form 1
  </button>
  {/* existing refresh button */}
</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Auditors</p><p className="text-2xl font-bold">{stats.totalAuditors}</p></div>
            <div className="p-3 bg-purple-50 rounded-lg"><FiUsers className="w-6 h-6 text-purple-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-green-600">Certified</p><p className="text-2xl font-bold text-green-600">{stats.certified}</p></div>
            <div className="p-3 bg-green-50 rounded-lg"><FiUserCheck className="w-6 h-6 text-green-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-amber-600">Expiring Soon</p><p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p></div>
            <div className="p-3 bg-amber-50 rounded-lg"><FiClock className="w-6 h-6 text-amber-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-blue-600">Avg Experience</p><p className="text-2xl font-bold text-blue-600">{stats.avgExperience} yrs</p></div>
            <div className="p-3 bg-blue-50 rounded-lg"><FiTrendingUp className="w-6 h-6 text-blue-500" /></div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg" />
          </div>
          <button onClick={fetchAuditors} className="p-2 text-gray-500 hover:text-purple-600"><FiRefreshCw className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-purple-600"></div></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                {/* Main Header Row */}
                <tr className="border-b border-gray-200">
                  <th rowSpan="2" className="px-2 py-3 text-center font-medium text-gray-600 border-r">Sr.No.</th>
                  <th rowSpan="2" className="px-3 py-3 text-center font-medium text-gray-600 border-r">Auditor Name</th>
                  <th rowSpan="2" className="px-2 py-3 text-center font-medium text-gray-600 border-r">Dept</th>
                  <th rowSpan="2" className="px-2 py-3 text-center font-medium text-gray-600 border-r">Qualification</th>
                  <th rowSpan="2" className="px-2 py-3 text-center font-medium text-gray-600 border-r">Experience</th>
                  <th rowSpan="2" className="px-3 py-3 text-center font-medium text-gray-600 border-r">IATF Training</th>
                  <th colSpan="5" className="px-2 py-2 text-center font-medium text-gray-600 border-r">Training Core tools</th>
                  <th colSpan="3" className="px-2 py-2 text-center font-medium text-gray-600 border-r">Approved to carry out audit of</th>
                  <th rowSpan="2" className="px-2 py-3 text-center font-medium text-gray-600">Action</th>
                </tr>
                {/* Sub Header Row */}
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-2 text-center font-medium text-gray-500">APQP</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">FMEA</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">PPAP</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">SPC</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">MSA</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Process</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Product</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Problem Solving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAuditors.length === 0 ? (
                  <tr>
                    <td colSpan="16" className="text-center py-8 text-gray-400">No auditors found</td>
                  </tr>
                ) : (
                  filteredAuditors.map((auditor, index) => (
                    <tr key={auditor.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-center text-gray-600">{index + 1}</td>
                      <td className="px-3 py-3 font-medium text-gray-800">{auditor.firstName} {auditor.lastName}</td>
                      <td className="px-2 py-3 text-center text-gray-600">{departments[auditor.department] || auditor.department || '-'}</td>
                      <td className="px-2 py-3 text-center text-gray-600">{auditor.qualification || '-'}</td>
                      <td className="px-2 py-3 text-center text-gray-600">{auditor.totalExperience || 0}</td>
                      <td className="px-3 py-3 text-center">
                        {auditor.internalAuditorTraining ? (
                          <span className="text-green-700 text-xs font-medium">{auditor.internalAuditorTraining}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Core Tools - Yes/No */}
                      <td className="px-2 py-3 text-center">
                        {auditor.coreToolsTraining?.includes('APQP') ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.coreToolsTraining?.includes('FMEA') ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.coreToolsTraining?.includes('PPAP') ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.coreToolsTraining?.includes('SPC') ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.coreToolsTraining?.includes('MSA') ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      {/* Approved to carry out audit of */}
                      <td className="px-2 py-3 text-center">
                        {auditor.certifiedForProcess ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {auditor.certifiedForProcess.split(',').slice(0, 2).map((p, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{p.trim()}</span>
                            ))}
                            {auditor.certifiedForProcess.split(',').length > 2 && (
                              <span className="text-xs text-gray-400">+{auditor.certifiedForProcess.split(',').length - 2}</span>
                            )}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.certifiedForProduct ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {auditor.certifiedForProduct.split(',').slice(0, 2).map((p, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{p.trim()}</span>
                            ))}
                            {auditor.certifiedForProduct.split(',').length > 2 && (
                              <span className="text-xs text-gray-400">+{auditor.certifiedForProduct.split(',').length - 2}</span>
                            )}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {auditor.problemSolvingTools ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {auditor.problemSolvingTools.split(',').slice(0, 2).map((t, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{t.trim()}</span>
                            ))}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => { setEditingAuditor(auditor); setShowCompetencyForm(true); }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Edit Competency"
                        >
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
  );
};

export default HRAdminDashboard;