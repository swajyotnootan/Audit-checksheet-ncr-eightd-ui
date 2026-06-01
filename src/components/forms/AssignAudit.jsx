import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditAPI, userAPI } from '../services/api';
import { auditForms } from '../../data/auditChecklists';
import { useNotifications } from '../../components/NotificationContext';
import { useToast } from '../../components/Toast';

export default function AssignAudit() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { addToast } = useToast();
  const [hods, setHods] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedHod, setSelectedHod] = useState('');
  const [shift, setShift] = useState('Morning');
  const [externalEmails, setExternalEmails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userAPI.getUsersByRole('HOD').then(setHods).catch(console.error);
  }, []);

  const handleAssign = async () => {
    const form = auditForms[selectedForm];
    if (!form) return alert('Select a form');
    setLoading(true);
    try {
      // Capture the saved audit object
      const saved = await auditAPI.assign(
        selectedHod,
        user.email,
        selectedForm,
        form.name,
        shift,
        externalEmails
      );
      
      // Now 'saved' is defined
      addNotification(
        'Audit Assigned',
        `Assigned ${form.name} to ${selectedHod} (Doc: ${saved.documentNumber}, Shift: ${shift})`,
        'success'
      );
      addToast('Audit assigned and emails sent', 'success');
      
      setSelectedForm('');
      setSelectedHod('');
      setShift('Morning');
      setExternalEmails('');
    } catch (err) {
      console.error(err);
      addToast('Assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Assign New Audit</h1>
      <div className="space-y-4">
        {/* ... form fields ... */}
        <div>
          <label className="block text-sm font-medium mb-1">Audit Form</label>
          <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)} className="border p-2 w-full rounded">
            <option value="">Select Form</option>
            {Object.keys(auditForms).map(key => (
              <option key={key} value={key}>{auditForms[key].name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Assign to HOD</label>
          <select value={selectedHod} onChange={e => setSelectedHod(e.target.value)} className="border p-2 w-full rounded">
            <option value="">Select HOD</option>
            {hods.map(h => (
              <option key={h.email} value={h.email}>{h.name} ({h.department})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Shift</label>
          <select value={shift} onChange={e => setShift(e.target.value)} className="border p-2 w-full rounded">
            <option value="Morning">Morning (6 AM – 2 PM)</option>
            <option value="Evening">Evening (2 PM – 10 PM)</option>
            <option value="Night">Night (10 PM – 6 AM)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">External Emails (comma separated)</label>
          <input
            type="text"
            placeholder="customer@example.com, supplier@example.com"
            value={externalEmails}
            onChange={e => setExternalEmails(e.target.value)}
            className="border p-2 w-full rounded"
          />
          <p className="text-xs text-gray-500 mt-1">These recipients will receive a copy of the assignment email.</p>
        </div>
        <button
          onClick={handleAssign}
          disabled={loading || !selectedForm || !selectedHod}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Assigning...' : 'Assign Audit & Send Email'}
        </button>
      </div>
    </div>
  );
}