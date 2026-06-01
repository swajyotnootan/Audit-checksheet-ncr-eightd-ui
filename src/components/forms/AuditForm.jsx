// src/components/forms/AuditForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiSave, FiSend, FiArrowLeft, FiCheckCircle, FiXCircle,
  FiAlertCircle, FiPlus, FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditAPI, ncrAPI } from '../../components/services/api';
import { useToast } from '../ToastContext';

const AuditForm = () => {
  const { formId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState({
    observations: '',
    nonConformities: [],
    score: 0,
  });
  const [newNCR, setNewNCR] = useState({
    description: '',
    severity: 'MINOR',
    clause: '',
  });

  useEffect(() => {
    fetchAudit();
  }, [formId]);

  const fetchAudit = async () => {
    try {
      const data = await auditAPI.getById(formId);
      setAudit(data);
    } catch (error) {
      console.error('Error fetching audit:', error);
      addToast('Failed to load audit', 'error');
      navigate(-1);
    }
  };

  const handleAddNCR = () => {
    if (!newNCR.description.trim()) {
      addToast('Please enter NCR description', 'error');
      return;
    }
    
    setFindings({
      ...findings,
      nonConformities: [...findings.nonConformities, { ...newNCR, id: Date.now() }]
    });
    setNewNCR({ description: '', severity: 'MINOR', clause: '' });
  };

  const handleRemoveNCR = (id) => {
    setFindings({
      ...findings,
      nonConformities: findings.nonConformities.filter(n => n.id !== id)
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await auditAPI.save(formId, { status: 'IN_PROGRESS', findings });
      addToast('Audit saved successfully', 'success');
    } catch (error) {
      addToast('Failed to save audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Submit audit
      await auditAPI.submit(formId, findings);
      
      // Create NCRs for each non-conformity
      for (const ncr of findings.nonConformities) {
        await ncrAPI.create({
          auditId: formId,
          description: ncr.description,
          severity: ncr.severity,
          clause: ncr.clause,
          assignedTo: audit?.auditeeId,
          raisedBy: user?.id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      
      addToast('Audit submitted successfully', 'success');
      navigate('/auditor');
    } catch (error) {
      addToast('Failed to submit audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!audit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{audit.auditName || `Audit ${audit.id}`}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill audit findings and observations</p>
        </div>
      </div>

      {/* Observations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Observations</h2>
        <textarea
          value={findings.observations}
          onChange={(e) => setFindings({ ...findings, observations: e.target.value })}
          rows={6}
          placeholder="Enter your audit observations, findings, and comments..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Score</h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={findings.score}
            onChange={(e) => setFindings({ ...findings, score: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="w-16 text-center">
            <span className={`text-xl font-bold ${
              findings.score >= 80 ? 'text-green-600' : 
              findings.score >= 60 ? 'text-amber-600' : 'text-red-600'
            }`}>{findings.score}%</span>
          </div>
        </div>
      </div>

      {/* Non-Conformities */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Non-Conformities</h2>
        
        {/* Add NCR Form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={newNCR.description}
                onChange={(e) => setNewNCR({ ...newNCR, description: e.target.value })}
                placeholder="NCR Description"
                className="w-full p-2 border border-gray-200 rounded-lg"
              />
            </div>
            <select
              value={newNCR.severity}
              onChange={(e) => setNewNCR({ ...newNCR, severity: e.target.value })}
              className="p-2 border border-gray-200 rounded-lg"
            >
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
              <option value="OBSERVATION">Observation</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNCR.clause}
              onChange={(e) => setNewNCR({ ...newNCR, clause: e.target.value })}
              placeholder="Clause Number (e.g., ISO 9001:2015 8.2)"
              className="flex-1 p-2 border border-gray-200 rounded-lg"
            />
            <button
              onClick={handleAddNCR}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Add NCR
            </button>
          </div>
        </div>
        
        {/* NCR List */}
        {findings.nonConformities.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No non-conformities added</p>
        ) : (
          <div className="space-y-3">
            {findings.nonConformities.map((ncr) => (
              <div key={ncr.id} className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FiAlertCircle className="w-4 h-4 text-red-500" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ncr.severity === 'MAJOR' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{ncr.severity}</span>
                    {ncr.clause && <span className="text-xs text-gray-500">Clause: {ncr.clause}</span>}
                  </div>
                  <p className="text-sm text-gray-800">{ncr.description}</p>
                </div>
                <button
                  onClick={() => handleRemoveNCR(ncr.id)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          Save Draft
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <FiSend className="w-4 h-4" />
          )}
          Submit Audit
        </button>
      </div>
    </div>
  );
};

export default AuditForm;