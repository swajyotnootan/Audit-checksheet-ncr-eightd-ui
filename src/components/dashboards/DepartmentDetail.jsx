// src/components/dashboards/DepartmentDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEye, FiCalendar, FiUser, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { auditAPI, userAPI } from '../../components/services/api';
import { useToast } from '../ToastContext';

const DepartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    fetchDepartmentData();
  }, [id]);

  const fetchDepartmentData = async () => {
    try {
      const hod = await userAPI.getById(id);
      setDepartment(hod);
      
      const allAudits = await auditAPI.getAll();
      const deptAudits = allAudits.filter(a => a.department === hod?.department);
      setAudits(deptAudits);
    } catch (error) {
      addToast('Failed to load department data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'COMPLETED' || status === 'APPROVED') return <FiCheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'IN_PROGRESS') return <FiClock className="w-4 h-4 text-amber-500" />;
    if (status === 'REJECTED') return <FiAlertCircle className="w-4 h-4 text-red-500" />;
    return <FiClock className="w-4 h-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{department?.department || 'Department'}</h1>
          <p className="text-sm text-gray-500">HOD: {department?.name || department?.username}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Audit History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {audits.length === 0 ? (
            <div className="p-5 text-center text-gray-400">No audits found for this department</div>
          ) : (
            audits.map((audit) => (
              <div key={audit.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(audit.status)}
                      <span className="font-medium text-gray-800">{audit.auditName || `Audit ${audit.id}`}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" />{new Date(audit.scheduledDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><FiUser className="w-3 h-3" />Auditor: {audit.auditorName || 'N/A'}</span>
                      {audit.score && <span>Score: {audit.score}%</span>}
                    </div>
                  </div>
                  <Link to={`/audit/view/${audit.id}`} className="p-2 text-gray-500 hover:text-purple-600 rounded-lg">
                    <FiEye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetail;