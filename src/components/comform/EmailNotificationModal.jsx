// src/components/comform/EmailNotificationModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

import Select from "react-select";
import Creatable from "react-select/creatable";

import { Mail, MessageSquare } from "lucide-react";


const EmailNotificationModal = ({
  isOpen,
  onClose,
  inspectionId,
  mode = "submit", // "submit", "approve", or "reject"
  approvalComment = "",
  onProceed // handles final action (submit/approve/reject)
}) => {
  const [activeTab, setActiveTab] = useState("email");
  const [users, setUsers] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [ccOptions, setCcOptions] = useState([]);
  const [selectedTo, setSelectedTo] = useState(null);
  const [selectedCc, setSelectedCc] = useState([]);
  const [subject, setSubject] = useState("");
  const [plainBody, setPlainBody] = useState(""); // <-- Only one editable field
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderRole, setSenderRole] = useState("");
  const [isSending, setIsSending] = useState(false);

  

  // ✅ Wrap plain text into official company email template
  const wrapInOfficialTemplate = (plainText, name, role, id) => {
    // Convert user's plain text to clean HTML paragraphs
    const userHtml = plainText
      .split('\n\n')
      .filter(line => line.trim() !== '')
      .map(line => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${line.trim().replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #003B82 0%, #0096D6 100%); color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Renewsys Quality Assurance</h2>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Inspection Notification System</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px; line-height: 1.6; color: #333; background: #ffffff;">
          ${userHtml}
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 4px 0; font-weight: 600;">Renewsys India Pvt. Ltd.</p>
          <p style="margin: 4px 0;">📧 quality@renewsys.com | 📞 +91-XXXX-XXXXXX</p>
          <p style="margin: 4px 0;">🌐 www.renewsys.com</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 10px auto; width: 80%;">
          <p style="margin: 8px 0 0; font-style: italic; color: #9ca3af;">
            This is an automated message from the QA Inspection System (ID: ${id}).<br/>
            Please do not reply directly to this email.
          </p>
       
        </div>
      </div>
    `;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/users/active");
        const allUsers = res.data;

        const storedUser = localStorage.getItem("user");
        let currentUser = null;
        if (storedUser) {
          currentUser = JSON.parse(storedUser);
          const name = currentUser.name || currentUser.username || "User";
          const email = currentUser.email || "";
          const role = currentUser.role || "";
          setSenderName(name);
          setSenderEmail(email);
          setSenderRole(role);

          // === DYNAMIC EMAIL TEMPLATE BASED ON MODE (PLAIN TEXT) ===
          let defaultSubject = "";
          let defaultPlainBody = "";

          if (mode === "approve") {
            defaultSubject = `Inspection Report Approved – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Initiator,

Your inspection report (ID: ${inspectionId}) has been approved by the HOD.

Approval Comment:
${approvalComment || "No comment provided."}

Thank you for your diligence and attention to quality.

Best regards,
${name} (${role})
`.trim();
          } else if (mode === "reject") {
            defaultSubject = `Inspection Report Rejected – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Initiator,

Your inspection report (ID: ${inspectionId}) has been rejected by the HOD.

Rejection Reason:
${approvalComment || "No reason provided."}

Please review the feedback, make necessary corrections, and resubmit.

Best regards,
${name} (${role})
`.trim();
          } else {
            defaultSubject = `Inspection Report Submitted – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Team,

The inspection report for the following details has been successfully completed and submitted:

- Inspection ID: ${inspectionId}
- Date: ${new Date().toLocaleDateString()}

Please review the report at your earliest convenience.

Best regards,
${name} (${role})
`.trim();
          }

          setSubject(defaultSubject);
          setPlainBody(defaultPlainBody);
        }

        // Filter To options based on mode & role
        let toOpts = [];
        if (mode === "submit") {
          if (currentUser?.role?.toUpperCase() === "INITIATOR") {
            toOpts = allUsers.filter(u => u.role?.toUpperCase() === "HOD");
          } else if (currentUser?.role?.toUpperCase() === "HOD") {
            toOpts = allUsers.filter(u => u.role?.toUpperCase() === "INITIATOR");
          } else {
            toOpts = allUsers;
          }
        } else if (mode === "approve" || mode === "reject") {
          toOpts = allUsers.filter(u => u.role?.toUpperCase() === "INITIATOR");
        }

        setToOptions(
          toOpts.map(user => ({
            value: user.email,
            label: `${user.username || user.name || "User"} (${user.role}) <${user.email}>`,
            email: user.email
          }))
        );

        // CC: only renewsys emails
        const ccOpts = allUsers.filter(user =>
          user.email && user.email.toLowerCase().includes("renewsys")
        );
        setCcOptions(
          ccOpts.map(user => ({
            value: user.email,
            label: `${user.username || user.name} <${user.email}>`,
            email: user.email
          }))
        );

        setUsers(allUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        alert("Could not load user list.");
      }
    };

    fetchUsers();
  }, [isOpen, inspectionId, mode, approvalComment]);

  const handleSendEmailAndProceed = async () => {
    if (mode !== "submit" && !selectedTo) {
      alert("Please select an initiator to notify.");
      return;
    }

    if (selectedTo) {
      // ✅ Wrap user's plain text in official template
      const htmlBody = wrapInOfficialTemplate(plainBody, senderName, senderRole, inspectionId);

      const payload = {
        from: senderEmail,
        to: [selectedTo.value],
        cc: selectedCc.map(opt => opt.value),
        subject: subject.trim(),
        body: htmlBody.trim(),
        inspectionId
      };

      try {
        setIsSending(true);
        const response = await axios.post("http://localhost:8080/api/email/send", payload);
        if (response.data?.success === true) {
          alert("✅ Email sent successfully!");
        } else {
          alert(`❌ Email failed: ${response.data?.message || "Unknown error"}`);
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || "Network error";
        alert(`❌ Failed to send email: ${errMsg}`);
      }
    }

    // Proceed with main action (submit/approve/reject)
    try {
      if (typeof onProceed === 'function') {
        await onProceed();
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setIsSending(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center p-5 border-b bg-blue-800 text-white sticky top-0 z-10">
  <h2 className="text-xl font-bold">
    {mode === "approve" ? "Approve & Notify" : mode === "reject" ? "Reject & Notify" : "Notify & Submit"}
  </h2>
  <button
    onClick={onClose}
    className="text-white hover:text-gray-200 text-2xl font-bold"
  >
    &times;
  </button>
</div>

        <div className="flex border-b">
          <button
            className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 text-center font-medium text-sm transition-all duration-200 ${
              activeTab === "email"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("email")}
          >
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button
            className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 text-center font-medium text-sm transition-all duration-200 ${
              activeTab === "sms"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("sms")}
          >
            <MessageSquare size={16} />
            <span>SMS</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === "email" ? (
            <div className="space-y-4">
              {/* To */}
             {/* To */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    To *
  </label>
  <div className="max-w-sm">
    <Creatable
  options={toOptions}
  value={selectedTo}
  onChange={setSelectedTo}
  placeholder="Select recipient or enter email..."
  formatCreateLabel={(inputValue) => `Send to: ${inputValue}`}
  isValidNewOption={(inputValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputValue);
  }}
  styles={{
    control: (base) => ({
      ...base,
      fontSize: '0.875rem',
      minHeight: '40px',
    }),
    menu: (base) => ({
      ...base,
      fontSize: '0.875rem',
    }),
  }}
/>
  </div>
</div>

              {/* CC */}
              {/* CC */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    CC
  </label>
  <div className="max-w-sm">
    <Creatable
  isMulti
  options={ccOptions}
  value={selectedCc}
  onChange={setSelectedCc}
  placeholder="Add CC recipients or enter emails..."
  formatCreateLabel={(inputValue) => `Add: ${inputValue}`}
  isValidNewOption={(inputValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputValue);
  }}
  styles={{
    control: (base) => ({
      ...base,
      fontSize: '0.875rem',
      minHeight: '40px',
    }),
    menu: (base) => ({
      ...base,
      fontSize: '0.875rem',
    }),
  }}
/>
  </div>
</div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              {/* Message - SINGLE EDITABLE FIELD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={plainBody}
                  onChange={(e) => setPlainBody(e.target.value)}
                  rows="10"
                  className="w-full p-3 border border-gray-300 rounded font-sans text-sm leading-relaxed whitespace-pre-wrap"
                  placeholder="Type your message here. Line breaks will be preserved."
                  style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-600">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">SMS Notification</h3>
              <p className="text-gray-600 max-w-md">
                SMS service is coming soon.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>

            <button
              onClick={handleSendEmailAndProceed}
              disabled={isSending || (mode !== "submit" && !selectedTo)}
              className={`px-6 py-2 rounded text-white font-semibold ${
                isSending
                  ? "bg-gray-400 cursor-not-allowed"
                  : mode === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : mode === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSending ? "Processing..." : 
                mode === "approve" ? "Send Email & Approve" :
                mode === "reject" ? "Send Email & Reject" :
                "Send Email & Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationModal;