import React, { useState } from 'react';
import { coatingInspectionAPI } from './coatingInspectionAPI';

const CoatingEmailModal = ({ isOpen, onClose, formId, reportNo, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: `FAIR-Coating ${reportNo || 'Report'}`,
    body: `FAIR-Coating Report ${reportNo || ''}.

Best regards,\nCoating QA Team`
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailPattern.test(email);
  };

  const handleSubmit = async () => {
    if (!formId) return alert('Report ID is missing');

    if (!emailData.to) return alert('Recipient email is required');

    const emails = emailData.to.split(',').map(e => e.trim());
    const invalid = emails.filter(e => !validateEmail(e));

    if (invalid.length) return alert(`Invalid emails: ${invalid.join(', ')}`);

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const userName = user?.name || 'Anonymous';

      const response = await coatingInspectionAPI.sendEmailWithPdf(formId, emailData, userName);

      alert('Email sent successfully!');
      onClose();
      onSuccess?.(response);
    } catch (err) {
      console.error('Email error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to send email';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Send Coating Inspection Report PDF</h2>
          <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
          <div className="mb-4">
            <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">Recipient Email*</label>
            <input
              type="text"
              id="to"
              name="to"
              value={emailData.to}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-800 focus:border-blue-800 disabled:bg-gray-100"
              placeholder="recipient@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Multiple recipients can be separated with commas</p>
          </div>

          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-800 focus:border-blue-800 disabled:bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              id="body"
              name="body"
              value={emailData.body}
              onChange={handleChange}
              rows={4}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-800 focus:border-blue-800 disabled:bg-gray-100 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 disabled:opacity-50"
            >Cancel</button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-background focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 flex items-center justify-center min-w-24"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoatingEmailModal;