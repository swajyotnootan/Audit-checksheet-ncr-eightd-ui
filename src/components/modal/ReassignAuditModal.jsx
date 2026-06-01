import React, { useState, useEffect } from 'react';
import { userAPI, auditAPI } from '../services/api';
import { X } from 'lucide-react';

export default function ReassignAuditModal({ audit, hodId, onClose, onSaved }) {
  const [auditors, setAuditors] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [selectedAuditorId, setSelectedAuditorId] = useState(audit.auditorId || '');
  const [selectedAuditeeIds, setSelectedAuditeeIds] = useState(
    audit.auditeeIds ? JSON.parse(audit.auditeeIds) : []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [auditorsData, auditeesData] = await Promise.all([
        userAPI.getAuditorsForHod(hodId),
        userAPI.getAuditeesForHod(hodId)
      ]);
      setAuditors(auditorsData);
      setAuditees(auditeesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAuditorId) {
      alert('Please select an auditor');
      return;
    }
    setSaving(true);
    try {
      await auditAPI.reassignAudit(audit.id, {
        auditorId: selectedAuditorId,
        auditeeIds: selectedAuditeeIds,
        reason: 'Manual reassign by HOD'
      }, hodId);
      alert('Reassignment successful');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Reassignment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Reassign Audit #{audit.documentNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block font-medium mb-1">Auditor</label>
              <select
                value={selectedAuditorId}
                onChange={e => setSelectedAuditorId(e.target.value)}
                className="border p-2 w-full rounded"
              >
                <option value="">Select auditor</option>
                {auditors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Auditees</label>
              <div className="border rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                {auditees.map(ae => (
                  <label key={ae.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAuditeeIds.includes(ae.id)}
                      onChange={() => {
                        setSelectedAuditeeIds(prev =>
                          prev.includes(ae.id) ? prev.filter(id => id !== ae.id) : [...prev, ae.id]
                        );
                      }}
                    />
                    {ae.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}