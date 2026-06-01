import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { auditAPI } from '../services/api';
import { auditForms } from '../../data/auditChecklists';


export default function DeputyAuditList() {
  const { formId } = useParams();
  const location = useLocation();
  const [audits, setAudits] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const form = auditForms[formId];

  // Check if we just created a schedule (state passed from navigation)
  useEffect(() => {
    if (location.state?.newSchedule) {
      setScheduleInfo(location.state.newSchedule);
      // Clear the state to avoid showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    auditAPI.getAll()
      .then(data => {
        const filtered = data.filter(a => a.formId === formId);
        setAudits(filtered);
      })
      .catch(console.error);
  }, [formId]);

  if (!form) return <div className="p-6">Form not found</div>;

  return (
    <div className="p-6">
      <Link to="/deputy" className="text-blue-600 mb-4 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-4">{form.name} – All Audits</h1>

      {/* Show schedule preview if just created */}
      {scheduleInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-green-800">Schedule Created Successfully!</h2>
          <p className="text-sm">Schedule Number: {scheduleInfo.scheduleNumber}</p>
          <p className="text-sm">Date Range: {scheduleInfo.startDate} to {scheduleInfo.endDate}</p>
          <p className="text-sm font-semibold mt-2">HODs & Locations:</p>
          <ul className="list-disc pl-5 text-sm">
            {scheduleInfo.selectedHods?.map(hodId => {
              const hodName = scheduleInfo.hodNames?.[hodId] || `HOD ${hodId}`;
              const hodLocation = scheduleInfo.hodLocations?.[hodId] || 'Location not set';
              return <li key={hodId}>{hodName} – {hodLocation}</li>;
            })}
          </ul>
        </div>
      )}

      {audits.length === 0 && <p>No audits found for this department.</p>}
      <div className="grid grid-cols-1 gap-4">
        {audits.map(a => (
          <div key={a.id} className="border p-4 rounded shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-sm font-bold">{a.documentNumber}</p>
                <p className="text-sm text-gray-600">HOD: {a.assignedToEmail}</p>
                <p className="text-sm">Shift: {a.shift}</p>
                {a.location && <p className="text-sm text-gray-500">Location: {a.location}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${a.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                {a.status}
              </span>
            </div>
            <div className="mt-3">
              <Link to={`/audit/preview/${a.id}`} className="text-blue-600 text-sm">Preview</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}