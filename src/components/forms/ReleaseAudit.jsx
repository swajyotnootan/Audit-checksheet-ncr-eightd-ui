// src/components/forms/ReleaseAudit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiUsers, FiMail } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditAPI, userAPI } from '../../components/services/api';
import { useToast } from '../ToastContext';

const ReleaseAudit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchAuditAndDepartments();
  }, [id]);

  const fetchAuditAndDepartments = async () => {
    try {
      const auditData = await auditAPI.getById(id);
      setAudit(auditData);
      
      const depts = await userAPI.getHODs();
      setDepartments(depts);
    } catch (error) {
      addToast('Failed to load data', 'error');
      navigate(-1);
    }
  };

  const handleRelease = async () => {
    setLoading(true);
    try {
      await auditAPI.approve(id, 'Released for implementation');
      addToast('Audit released successfully', 'success');
      navigate('/audit-manager');
    } catch (error) {
      addToast('Failed to release audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Release Audit</h1>
          <p className="text-sm text-gray-500">Release final audit report for implementation</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Audit Summary</h2>
        {audit && (
          <div className="space-y-2">
            <p><span className="text-gray-500">Name:</span> {audit.auditName}</p>
            <p><span className="text-gray-500">Score:</span> {audit.score}%</p>
            <p><span className="text-gray-500">Status:</span> {audit.status}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleRelease}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <FiSend className="w-4 h-4" />
          Release Audit
        </button>
      </div>
    </div>
  );
};

export default ReleaseAudit;