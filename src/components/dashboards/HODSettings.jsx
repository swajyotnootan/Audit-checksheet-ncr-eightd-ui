import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

export default function HODSettings() {
  const { user } = useAuth();
  const [auditors, setAuditors] = useState([]);
  const [auditees, setAuditees] = useState([]);
  const [defaultAuditorId, setDefaultAuditorId] = useState('');
  const [defaultAuditeeIds, setDefaultAuditeeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [auditorsData, auditeesData, defaultsData] = await Promise.all([
        userAPI.getAuditorsForHod(user.id),
        userAPI.getAuditeesForHod(user.id),
        userAPI.getDefaultsForHod(user.id)
      ]);
      setAuditors(auditorsData);
      setAuditees(auditeesData);
      setDefaultAuditorId(defaultsData.defaultAuditorId || '');
      setDefaultAuditeeIds(defaultsData.defaultAuditeeIds || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateDefaults(user.id, {
        defaultAuditorId: defaultAuditorId || null,
        defaultAuditeeIds
      });
      alert('Default assignments saved successfully');
    } catch (err) {
      console.error(err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Default Audit Assignments</h1>
      <p className="text-gray-500 mb-6">
        New audits will be automatically assigned to these people when a schedule is released.
      </p>

      <div className="mb-6">
        <label className="block font-medium mb-1">Default Auditor</label>
        <select
          value={defaultAuditorId}
          onChange={e => setDefaultAuditorId(e.target.value)}
          className="border p-2 w-full rounded"
        >
          <option value="">-- None --</option>
          {auditors.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-1">Default Auditees (multi-select)</label>
        <div className="border rounded p-2 space-y-1 max-h-48 overflow-y-auto">
          {auditees.map(ae => (
            <label key={ae.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={ae.id}
                checked={defaultAuditeeIds.includes(ae.id)}
                onChange={() => {
                  setDefaultAuditeeIds(prev =>
                    prev.includes(ae.id) ? prev.filter(id => id !== ae.id) : [...prev, ae.id]
                  );
                }}
              />
              {ae.name}
            </label>
          ))}
        </div>
        {auditees.length === 0 && <p className="text-gray-400 text-sm mt-1">No auditees assigned to you yet.</p>}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Defaults'}
      </button>
    </div>
  );
}