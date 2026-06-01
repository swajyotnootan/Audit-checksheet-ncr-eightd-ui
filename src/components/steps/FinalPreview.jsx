// src/components/steps/FinalPreview.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  FileText,
  ShieldCheck,
  Lightbulb,
  ClipboardCheck,
  CalendarDays,
  UserCheck,
  Camera,
  File,
  X,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Mail,
  Trash2,
  Edit3,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Generate8DPdf from "../Generate8DPdf";
import Generate8DWord from "../Generate8DWord";
import { isInitiator } from "../utils/roleUtils";

// Import the Renewsys logo
import RenewsysLogo from "../../assets/RenewsysLogo.png";

const StepIcons = {
  d0: FileText,
  d1: Users,
  d2: FileText,
  d3: ShieldCheck,
  d4: Lightbulb,
  d5: ClipboardCheck,
  d6: CalendarDays,
  d7: Lightbulb,
  d8: UserCheck,
};

const stepTitles = {
  d0: "D0 – Plan & Contain",
  d1: "D1 – Form the Team",
  d2: "D2 – Describe the Problem",
  d3: "D3 – Interim Containment Actions",
  d4: "D4 – Root Cause Analysis",
  d5: "D5 – Permanent Corrective Actions",
  d6: "D6 – Implement & Validate PCAs",
  d7: "D7 – Prevent Recurrence",
  d8: "D8 – Close & Recognize",
};

// Define ALL fields for each step (in display order)
const stepFields = {
  d0: [
    { key: "eventNo", label: "Event ID" },
    { key: "plantLine", label: "Plant / Line" },
    { key: "partName", label: "Part Name" },
    { key: "lotSerial", label: "Lot / Serial" },
    { key: "defectCode", label: "Defect Code" },
    { key: "dateDiscovered", label: "Date Discovered" },
    { key: "reportedBy", label: "Reported By" },
    { key: "personName", label: "Person Name" },
    { key: "department", label: "Department" },
    { key: "companyName", label: "Company" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Primary Email" },
    { key: "additionalEmails", label: "Team Members" },
  ],
  d1: [
    { key: "eventId", label: "Event ID" },
    { key: "teamLeader", label: "Team Leader" },
    { key: "dateFormed", label: "Date Formed" },
    { key: "responsibilities", label: "Team Responsibilities" },
    { key: "suppliers", label: "Suppliers" },
    { key: "customers", label: "Customers" },
  ],
  d2: [
    { key: "eventId", label: "Event ID" },
    { key: "problemStatement", label: "Problem Statement" },
    { key: "what", label: "WHAT" },
    { key: "why", label: "WHY" },
    { key: "where", label: "WHERE" },
    { key: "when", label: "WHEN" },
    { key: "who", label: "WHO" },
    { key: "how", label: "HOW" },
    { key: "howMuch", label: "Impact (HOW MUCH)" },
  ],
  d3: [
    { key: "eventId", label: "Event ID" },
    { key: "problemStatement", label: "Problem Statement" },
    { key: "hasContainment", label: "Containment Actions?" },
    { key: "actions", label: "Containment Actions" },
  ],
  d4: [
    { key: "eventId", label: "Event ID" },
    { key: "rootCauseSummary", label: "Root Cause Summary" },
    { key: "businessProcessFlaws", label: "Business Process Flaws?" },
    { key: "whyNotDetected", label: "Why Not Detected?" },
  ],
  d5: [
    { key: "eventId", label: "Event ID" },
    { key: "actions", label: "Corrective Actions" },
  ],
  d6: [
    { key: "eventId", label: "Event ID" },
    { key: "implementationDate", label: "Implementation Date & Time" },
    { key: "communicatedToStakeholders", label: "Communicated to Stakeholders?" },
    { key: "notes", label: "Notes / Comments" },
  ],
  d7: [
    { key: "eventId", label: "Event ID" },
    { key: "additionalMeasuresNeeded", label: "Additional Measures Needed?" },
    { key: "lessonsLearned", label: "Lessons Learned" },
    { key: "proceduresUpdated", label: "Procedures Updated?" },
  ],
  d8: [
    { key: "eventId", label: "Event ID" },
    { key: "rewardDescription", label: "Reward Description" },
    { key: "additionalRecommendations", label: "Additional Recommendations" },
    { key: "teamLeaderName", label: "Team Leader Name" },
    { key: "signatureDate", label: "Signature Date & Time" },
  ],
};

const stepsOrder = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"];

export default function FinalPreview({ eventId, isHOD = false }) {
  const [eventData, setEventData] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [tempTeamMembers, setTempTeamMembers] = useState([]);
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [memberError, setMemberError] = useState(null);
  const [memberSuccess, setMemberSuccess] = useState(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (memberError || memberSuccess) {
      const timer = setTimeout(() => {
        setMemberError(null);
        setMemberSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [memberError, memberSuccess]);

  // Fetch event data and files
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const [eventRes, filesRes] = await Promise.all([
          axios.get(`http://localhost:8080/api/eightd/data/${eventId}`),
          axios.get(`http://localhost:8080/api/eightd/data/${eventId}/files`),
        ]);
        if (eventRes.data.success && eventRes.data.data) {
          setEventData(eventRes.data.data);
          // Initialize tempTeamMembers with current data - HANDLE BOTH FORMATS
          const d0Data = eventRes.data.data.content?.d0?.[0] || {};
          
          // Check if we have detailed teamMembers array or just emails
          if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
            // New format: teamMembers array with detailed objects
            setTempTeamMembers([...d0Data.teamMembers]);
          } else if (Array.isArray(d0Data.additionalEmails)) {
            // Legacy format: just email strings
            const legacyMembers = d0Data.additionalEmails.map(email => ({
              email: email,
              firstName: '',
              lastName: '',
              department: '',
              isExternal: true
            }));
            setTempTeamMembers(legacyMembers);
          } else {
            setTempTeamMembers([]);
          }
        }
        if (filesRes.data.success && filesRes.data.data) {
          setFiles(filesRes.data.data);
        }
      } catch (err) {
        console.error("Error fetching final preview ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  // Start editing team members
  const startEditingTeamMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    const d0Data = eventData.content?.d0?.[0] || {};
    
    // Handle both new and legacy formats
    let currentMembers = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map(email => ({
        email: email,
        firstName: '',
        lastName: '',
        department: '',
        isExternal: true
      }));
    }
    
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(true);
  };

  // Save member changes - Updated for full member data
  const saveTeamMembers = async () => {
    setMemberError(null);
    setMemberSuccess(null);
    
    try {
      setUpdatingMembers(true);
      
      // Filter and validate members
      const validMembers = tempTeamMembers
        .filter(member => member.email && member.email.trim())
        .map(member => ({
          ...member,
          email: member.email.trim(),
          firstName: member.firstName?.trim() || '',
          lastName: member.lastName?.trim() || '',
          department: member.department?.trim() || '',
          isExternal: member.isExternal || true
        }));

      // Validate emails
      const invalidEmails = validMembers.filter(member => !isValidEmail(member.email));
      if (invalidEmails.length > 0) {
        const invalidEmailList = invalidEmails.map(m => m.email).join(', ');
        setMemberError(`Invalid email format: ${invalidEmailList}`);
        return;
      }

      // Check for duplicate emails
      const emails = validMembers.map(m => m.email);
      const uniqueEmails = [...new Set(emails)];
      if (uniqueEmails.length !== emails.length) {
        setMemberError('Duplicate email addresses found. Please remove duplicates.');
        return;
      }

      if (validMembers.length === 0) {
        setMemberError('Please add at least one team member with a valid email');
        return;
      }

      // Prepare updated data
      const updatedD0Data = {
        ...eventData.content?.d0?.[0],
        teamMembers: validMembers,
        additionalEmails: validMembers.map(member => member.email) // Keep for backward compatibility
      };

      // Update backend
      const formDataToSend = new FormData();
      const jsonPayload = {
        content: {
          ...eventData.content,
          d0: [updatedD0Data]
        }
      };
      
      formDataToSend.append('jsonContent', JSON.stringify(jsonPayload));

      const res = await axios.put(
        `http://localhost:8080/api/eightd/data/${eventId}`, 
        formDataToSend,
        {
          headers: { 
            'Content-Type': 'multipart/form-data' 
          }
        }
      );
      
      if (res.data.success) {
        // Update local state
        setEventData(prev => ({
          ...prev,
          content: {
            ...prev.content,
            d0: [updatedD0Data]
          }
        }));
        
        setMemberSuccess("✅ Team members updated successfully!");
        setIsEditingMembers(false);
      } else {
        throw new Error(res.data.error || 'Failed to update team members');
      }
    } catch (err) {
      console.error("Failed to update team members:", err);
      setMemberError("❌ Failed to update team members: " + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingMembers(false);
    }
  };

  // Cancel editing
  const cancelEditingMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    // Reset to original data
    const d0Data = eventData.content?.d0?.[0] || {};
    
    // Handle both formats when canceling
    let currentMembers = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map(email => ({
        email: email,
        firstName: '',
        lastName: '',
        department: '',
        isExternal: true
      }));
    }
    
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(false);
  };

  // Add new member field with full structure
  const addNewMemberField = () => {
    setTempTeamMembers(prev => [...prev, {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      isExternal: true,
      username: ''
    }]);
  };

  // Remove member field
  const removeMemberField = (index) => {
    setTempTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Update specific member field
  const updateMemberField = (index, field, value) => {
    const newMembers = [...tempTeamMembers];
    newMembers[index] = {
      ...newMembers[index],
      [field]: value
    };
    setTempTeamMembers(newMembers);
  };

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const getFilesForForm = (formType) => {
    return files.filter(file => file.formType === formType);
  };

  const getEightDFileUrl = (fileId) => `http://localhost:8080/api/eightd/files/${fileId}`;

  const handleFileClick = async (fileId, mimeType, fileName) => {
    try {
      const res = await axios.get(getEightDFileUrl(fileId), {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      setPreviewUrl(url);
      setPreviewFile({ mimeType, fileName });
    } catch (err) {
      console.error("Error fetching file:", err);
      alert("Failed to load file.");
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  // HOD APPROVAL HANDLERS
  const handleApprove = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10) return;
    
    try {
      setApproving(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await axios.post(`http://localhost:8080/api/eightd/approve/${eventId}`, {
        userEmail: user.email,
        comment: approvalComment.trim()
      });
      if (res.data.success) {
        alert("✅ Document approved successfully!");
        setApprovalComment("");
        window.location.reload();
      }
    } catch (err) {
      alert("Approval failed: " + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10) return;
    
    try {
      setRejecting(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await axios.post(`http://localhost:8080/api/eightd/reject/${eventId}`, {
        userEmail: user.email,
        comment: approvalComment.trim()
      });
      if (res.data.success) {
        alert("❌ Document rejected successfully!");
        setApprovalComment("");
        window.location.reload();
      }
    } catch (err) {
      alert("Rejection failed: " + (err.response?.data?.error || err.message));
    } finally {
      setRejecting(false);
    }
  };

  // Format field values beautifully
  const formatValue = (value) => {
    if (value == null || value === "") return "—";
    
    // Handle dates
    if (typeof value === "string" && /\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      
      // Special: Team members (D0 additionalEmails)
      if (value.every(email => typeof email === "string" && email.includes("@"))) {
        return (
          <div className="flex flex-wrap gap-2">
            {value.map((email, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {email}
              </span>
            ))}
          </div>
        );
      }
      
      // Special: Corrective actions (D5/D3 actions)
      if (value[0] && (typeof value[0] === "string" || (value[0].action && typeof value[0].action === "string"))) {
        return (
          <ul className="list-disc pl-5 space-y-1 mt-1">
            {value.map((item, idx) => (
              <li key={idx} className="text-gray-700">
                {typeof item === "string" ? item : item.action}
              </li>
            ))}
          </ul>
        );
      }
      
      // Special: Team members (D1 suppliers/customers)
      if (value[0] && typeof value[0] === "object" && value[0].name) {
        return (
          <div className="space-y-2 mt-1">
            {value.map((member, idx) => (
              <div key={idx} className="text-sm bg-gray-50 p-2 rounded border">
                <div><span className="font-semibold">Name:</span> {member.name}</div>
                <div><span className="font-semibold">Role:</span> {member.role}</div>
                <div><span className="font-semibold">Dept:</span> {member.department}</div>
                <div><span className="font-semibold">Contact:</span> {member.contact}</div>
              </div>
            ))}
          </div>
        );
      }
      
      return value.join(", ");
    }
    
    // Handle objects
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading final preview...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="text-center p-6 text-gray-600">
        No data available for this event.
      </div>
    );
  }

  const isApprovalPending = eventData.status === "approval pending";

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-6xl mx-auto my-6 border border-gray-200">
      {/* Header with Logo and Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-gray-200">
        {/* Logo on the left */}
        <div className="flex items-center mb-4 sm:mb-0">
          <img 
            src={RenewsysLogo} 
            alt="Renewsys Logo" 
            className="h-20 w-auto mr-3"
          />
          <div className="border-l border-gray-300 pl-3">
            {/* <h1 className="text-lg font-semibold text-gray-800">Renewsys</h1> */}
            {/* <p className="text-sm text-gray-600">Quality Management System</p> */}
          </div>
        </div>
        
        {/* Title in the center */}
        <div className="text-center flex-1 mx-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            8D Report - Preview
          </h1>
          <p className="text-gray-600 mt-1">
            Event ID: <span className="font-mono font-semibold">{eventId}</span>
          </p>
        </div>
        
        {/* Empty div for balance */}
        <div className="w-24"></div>
      </div>

      {/* Member Management Messages */}
      {memberError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm flex items-center gap-2">
            <XCircle size={16} />
            {memberError}
          </p>
        </div>
      )}

      {memberSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            {memberSuccess}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {stepsOrder.map((stepKey) => {
          const stepData = eventData.content?.[stepKey]?.[0] || {};
          const stepFiles = getFilesForForm(stepKey);
          const Icon = StepIcons[stepKey];
          
          return (
            <div key={stepKey} className="border-b pb-6 last:border-b-0">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  {stepTitles[stepKey]}
                </h2>
              </div>
              
              {/* Beautiful Field: Value layout */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-lg shadow-sm border">
                {stepFields[stepKey].map((field) => {
                  const value = stepData[field.key];
                  
                  // Special handling for team members with edit option
                  if (field.key === "additionalEmails" && stepKey === "d0") {
                    // Get team members data - handle both formats
                    const teamMembersData = stepData.teamMembers || [];
                    const additionalEmailsData = stepData.additionalEmails || [];
                    
                    // Combine both data sources for display
                    const displayMembers = teamMembersData.length > 0 
                      ? teamMembersData 
                      : additionalEmailsData.map(email => ({ email, isExternal: true }));
                    
                    return (
                      <div key={field.key} className="flex items-start gap-3 py-2 border-b border-gray-200 last:border-b-0 hover:bg-white transition">
                        <span className="font-medium text-gray-800 min-w-[160px] sm:min-w-[180px]">
                          {field.label}:
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          {/* Edit Mode */}
                          {isEditingMembers ? (
                            <div className="space-y-3">
                              {/* Current Members List */}
                              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white space-y-2">
                                {tempTeamMembers.map((member, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-500">First Name</label>
                                        <input
                                          type="text"
                                          value={member.firstName || ''}
                                          onChange={(e) => updateMemberField(idx, 'firstName', e.target.value)}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                          placeholder="First name"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500">Last Name</label>
                                        <input
                                          type="text"
                                          value={member.lastName || ''}
                                          onChange={(e) => updateMemberField(idx, 'lastName', e.target.value)}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                          placeholder="Last name"
                                        />
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="text-xs text-gray-500">Email *</label>
                                        <input
                                          type="email"
                                          value={member.email || ''}
                                          onChange={(e) => updateMemberField(idx, 'email', e.target.value)}
                                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${
                                            member.email && !isValidEmail(member.email) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                          }`}
                                          placeholder="team.member@example.com"
                                          required
                                        />
                                        {member.email && !isValidEmail(member.email) && (
                                          <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                                        )}
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="text-xs text-gray-500">Department</label>
                                        <input
                                          type="text"
                                          value={member.department || ''}
                                          onChange={(e) => updateMemberField(idx, 'department', e.target.value)}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                          placeholder="Department"
                                        />
                                      </div>
                                      <div className="md:col-span-2 flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={member.isExternal || false}
                                          onChange={(e) => updateMemberField(idx, 'isExternal', e.target.checked)}
                                          className="rounded border-gray-300"
                                          id={`external-${idx}`}
                                        />
                                        <label htmlFor={`external-${idx}`} className="text-xs text-gray-600">
                                          External team member (not in system)
                                        </label>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeMemberField(idx)}
                                      className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors duration-200 flex-shrink-0 self-start"
                                      title="Remove member"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                                
                                {tempTeamMembers.length === 0 && (
                                  <div className="text-center text-gray-500 py-4">
                                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                                    No team members added yet. Click "Add Member" below.
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={addNewMemberField}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
                                >
                                  <Plus size={16} /> Add Member
                                </button>
                                <button
                                  type="button"
                                  onClick={saveTeamMembers}
                                  disabled={updatingMembers || tempTeamMembers.some(member => 
                                    !member.email || !isValidEmail(member.email)
                                  )}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {updatingMembers ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Save size={16} />
                                  )}
                                  {updatingMembers ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingMembers}
                                  disabled={updatingMembers}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                                >
                                  <X size={16} /> Cancel
                                </button>
                              </div>
                              
                              {/* Instructions */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                  <strong>Instructions:</strong> 
                                  <br/>• Fill in team member details (email is required)
                                  <br/>• Mark as "External" if the member is not in the system
                                  <br/>• Click "Add Member" to add more team members
                                  <br/>• These details will be saved to the 8D event data
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* View Mode - Display detailed member information */
                            /* View Mode - Display detailed member information */
<div className="flex flex-col gap-3">
  {displayMembers.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {displayMembers.map((member, idx) => (
        <div 
          key={idx} 
          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-800 truncate">
                    {member.firstName || member.lastName 
                      ? `${member.firstName || ''} ${member.lastName || ''}`.trim() 
                      : 'Unnamed Member'
                    }
                  </h4>
                  <Tippy content={member.email} placement="top" delay={[100, 0]}>
                    <p className="text-sm text-gray-600 flex items-center gap-1 truncate cursor-help">
                      <Mail size={12} />
                      {/* <span className="truncate">{member.email}</span> */}
                    </p>
                  </Tippy>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 space-y-1">
                {member.department && (
                  <Tippy content={member.department} placement="top" delay={[100, 0]}>
                    <p className="truncate cursor-help">
                      <span className="font-medium">Department:</span> {member.department}
                    </p>
                  </Tippy>
                )}
                {member.username && (
                  <Tippy content={member.username} placement="top" delay={[100, 0]}>
                    <p className="truncate cursor-help">
                      <span className="font-medium">Username:</span> {member.username}
                    </p>
                  </Tippy>
                )}
                <p>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    member.isExternal 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {member.isExternal ? 'External' : 'System User'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
      <Users size={32} className="mx-auto mb-2 text-gray-400" />
      <p className="text-gray-500">No team members added yet</p>
    </div>
  )}
  
  {/* Edit Button for HOD/Initiator */}
  {(isHOD || isInitiator) && (
    <div className="pt-3 border-t border-gray-200 flex justify-start">
      <button
        onClick={startEditingTeamMembers}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        <Edit3 size={16} /> Manage Team Members
      </button>
    </div>
  )}
</div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  // Regular field rendering for all other fields
                  return (
                    <div key={field.key} className="flex items-start gap-3 py-2 border-b border-gray-200 last:border-b-0 hover:bg-white transition">
                      <span className="font-medium text-gray-800 min-w-[160px] sm:min-w-[180px]">
                        {field.label}:
                      </span>
                      <span className="text-gray-700 flex-1 break-words">
                        {formatValue(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Attachments */}
              {stepFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-1">
                    <Camera className="w-4 h-4" /> Attachments ({stepFiles.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {stepFiles.map((file) => (
                      <div
                        key={file.id}
                        className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition"
                        onClick={() => handleFileClick(file.id, file.mimeType, file.fileName)}
                      >
                        {file.fileType === "IMAGE" ? (
                          <img
                            src={getEightDFileUrl(file.id)}
                            alt={file.fileName}
                            className="w-full h-20 sm:h-24 object-cover"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'/%3E%3Cpath fill='%2394a3b8' d='M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'/%3E%3C/svg%3E";
                            }}
                          />
                        ) : file.mimeType === "application/pdf" ? (
                          <div className="bg-red-100 h-20 sm:h-24 flex items-center justify-center">
                            <File className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                          </div>
                        ) : (
                          <div className="bg-blue-100 h-20 sm:h-24 flex items-center justify-center">
                            <File className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                          </div>
                        )}
                        <div className="p-2 text-[10px] sm:text-xs truncate bg-white">
                          {file.fileName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* HOD APPROVAL SECTION */}
        {isHOD && isApprovalPending && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              HOD Approval Required
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              Please review D0 data above before approving or rejecting this 8D event.
              <br />
              <span className="font-medium">Note: A comment of at least 10 characters is required.</span>
            </p>

            {/* Single Comment Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval/Rejection Comment:
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Enter your comment for approval or rejection (min. 10 characters)..."
                rows="3"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Buttons Side by Side */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={approving || !approvalComment.trim() || approvalComment.trim().length < 10}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <CheckCircle className="w-4 h-4" />
                Approve & Move to D1
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !approvalComment.trim() || approvalComment.trim().length < 10}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}

        

<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
  <Generate8DPdf 
    title={`8D_Report_${eventId}`} 
    formData={eventData.content || {}} 
    attachments={files.map(file => ({
      id: file.id,
      name: file.fileName,
      url: getEightDFileUrl(file.id),
      mimeType: file.mimeType,
      size: file.fileSize || 0,
      type: file.fileType === 'IMAGE' ? 'image' : 'document',
      formType: file.formType
    }))}
  />
  <Generate8DWord 
    title={`8D_Report_${eventId}`} 
    formData={eventData.content || {}} 
    attachments={files.map(file => ({
      id: file.id,
      name: file.fileName,
      url: getEightDFileUrl(file.id),
      mimeType: file.mimeType,
      size: file.fileSize || 0,
      type: file.fileType === 'IMAGE' ? 'image' : 'document',
      formType: file.formType
    }))}
  />
</div>
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewUrl && previewFile && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreview}
            >
              <motion.div
                className="relative bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-gray-800 text-white px-3 sm:px-4 py-2 flex justify-between items-center">
                  <h3 className="font-semibold truncate text-sm sm:text-base">{previewFile.fileName}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = previewUrl;
                        a.download = previewFile.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="text-white hover:text-gray-300"
                      title="Download"
                    >
                      <Download size={16} className="sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={closePreview}
                      className="text-white hover:text-gray-300"
                    >
                      <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>
                <div className="h-[70vh] flex items-center justify-center bg-gray-100">
                  {previewFile.mimeType?.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt={previewFile.fileName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : previewFile.mimeType === "application/pdf" ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title={previewFile.fileName}
                    />
                  ) : previewFile.mimeType?.startsWith("video/") ? (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay={false}
                      className="max-h-full max-w-full"
                      title={previewFile.fileName}
                    />
                  ) : (
                    <div className="text-center p-4">
                      <File className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm sm:text-base">This file type cannot be previewed.</p>
                      <button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = previewUrl;
                          a.download = previewFile.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          closePreview();
                        }}
                        className="mt-2 px-3 py-1 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs sm:text-sm"
                      >
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
