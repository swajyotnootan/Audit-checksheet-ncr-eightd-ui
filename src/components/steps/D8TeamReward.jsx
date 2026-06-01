// src/components/steps/D8TeamReward.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  UserCheck,
  Camera,
  Info,
  Eye,
  FileText,
  X
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D8TeamReward({ eventId = null, updateParent }) {
  const API_URL = "http://localhost:8080/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d8-event-${eventId}` : "d8-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    rewardDescription: "",
    additionalRecommendations: "",
    teamLeaderName: "",
    signatureDate: "",
  });
  const [signatureFile, setSignatureFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`${API_URL}/${eventId}`);
        if (res.data.success && res.data.data) {
          const eventData = res.data.data;
          const d8Data = eventData.content?.d8?.[0];
          if (d8Data) {
            setFormData({
              eventId: d8Data.eventId || eventId,
              rewardDescription: d8Data.rewardDescription || "",
              additionalRecommendations: d8Data.additionalRecommendations || "",
              teamLeaderName: d8Data.teamLeaderName || "",
              signatureDate: d8Data.signatureDate || "",
            });
            setRecordId(eventId);
            
            // Load existing files if available in response
            if (eventData.files) {
              // You might need to adjust this based on your backend response structure
              const signatureFiles = eventData.files.filter(f => f.fieldname === 'signature');
              const attachmentFiles = eventData.files.filter(f => f.fieldname === 'attachments');
              
              if (signatureFiles.length > 0) {
                setSignatureFile({
                  name: signatureFiles[0].originalname,
                  url: `http://localhost:8080${signatureFiles[0].path}` // Adjust based on your backend
                });
              }
              
              if (attachmentFiles.length > 0) {
                setAttachments(attachmentFiles.map(file => ({
                  name: file.originalname,
                  type: file.mimetype,
                  url: `http://localhost:8080${file.path}` // Adjust based on your backend
                })));
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching D8 ", err);
      }
    };
    fetchData();
  }, [eventId]);

  // Auto-save to localStorage
  useEffect(() => {
    const saveData = {
      ...formData,
      signatureFile,
      attachments,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveData));
  }, [formData, signatureFile, attachments]);

  useEffect(() => {
    if (updateParent) updateParent([formData]);
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('❌ Please upload an image file for signature');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ Signature file size should be less than 5MB');
        return;
      }
      
      setSignatureFile({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      });
    }
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = files.filter(file => {
      // Check file type
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      // Check file size (max 10MB)
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValidType) {
        alert(`❌ File "${file.name}" is not a supported type. Please upload images or PDFs only.`);
      }
      if (!isValidSize) {
        alert(`❌ File "${file.name}" is too large. Maximum size is 10MB.`);
      }
      
      return isValidType && isValidSize;
    });

    const newAttachments = validFiles.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear file input
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    const attachmentToRemove = attachments[index];
    // Revoke object URL to prevent memory leaks
    if (attachmentToRemove.url && attachmentToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentToRemove.url);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeSignature = () => {
    if (signatureFile?.url && signatureFile.url.startsWith('blob:')) {
      URL.revokeObjectURL(signatureFile.url);
    }
    setSignatureFile(null);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.eventId) {
      alert("❌ Please enter an Event ID");
      return;
    }
    
    if (!formData.signatureDate) {
      alert("❌ Please select a date & time for the signature.");
      return;
    }
    
    if (!signatureFile) {
      alert("❌ Please upload a signature file.");
      return;
    }
    
    try {
      // Create payload with file references
      const payload = { 
        d8: [{
          ...formData,
          hasAttachments: attachments.length > 0,
          attachmentsCount: attachments.length,
          // Include file metadata for preview
          attachments: attachments.map(att => ({
            name: att.name,
            type: att.type,
            size: att.size
          }))
        }] 
      };
      
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));
      
      // Use the original field names that were working
      if (signatureFile?.file) {
        formDataToSend.append("files", signatureFile.file);
      }
      
      // Append all attachments with the same field name "files"
      attachments.forEach(item => {
        if (item.file) {
          formDataToSend.append("files", item.file);
        }
      });
      
      let res;
      if (recordId) {
        res = await axios.put(`${API_URL}/${recordId}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
      } else {
        res = await axios.post(API_URL, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
      }
      
      if (res.data.success) {
        const savedEventNo = res.data.data.id;
        setRecordId(savedEventNo);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert("✅ D8 Team Reward saved successfully!");
      }
    } catch (err) {
      console.error("Error saving D8 form:", err);
      alert("Failed to save D8 form. Check console for details.");
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (signatureFile?.url && signatureFile.url.startsWith('blob:')) {
        URL.revokeObjectURL(signatureFile.url);
      }
      attachments.forEach(attachment => {
        if (attachment.url && attachment.url.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    };
  }, []);

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header - Responsive with Event ID */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D8 – Team Reward & Completion
            {eventId && (
              <span className="text-xs sm:text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                {eventId}
              </span>
            )}
          </h2>
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1 sm:gap-2 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-white/20 transition text-xs sm:text-sm"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            Preview Full Report
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white p-4 sm:p-6 rounded-b-2xl shadow-lg border border-gray-100 space-y-4 sm:space-y-6">
        {/* Event ID */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">Event ID</label>
          <input
            type="text"
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter Event ID from D0"
          />
        </div>
        
        {/* Reward Description */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Reward Description
            <Tippy content="Describe how the team can be rewarded">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <textarea
            name="rewardDescription"
            value={formData.rewardDescription}
            onChange={handleChange}
            rows="3"
            placeholder="Enter reward description..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Additional Recommendations */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">Additional Recommendations</label>
          <textarea
            name="additionalRecommendations"
            value={formData.additionalRecommendations}
            onChange={handleChange}
            rows="3"
            placeholder="Enter any additional recommendations..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Attach Photos / Reports */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Attach Photos / Reports
            <span className="text-xs text-gray-500">(Images & PDFs, max 10MB each)</span>
          </label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleAttachmentUpload}
            className="mt-2 text-xs sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {attachments.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">{attachments.length} file(s) attached</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {attachments.map((file, index) => (
                  <div key={index} className="relative w-24 sm:w-28 h-24 sm:h-28 rounded-lg overflow-hidden shadow border flex items-center justify-center bg-gray-50 group">
                    {file.type.startsWith("image") ? (
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-600 p-2 text-center">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-1 text-indigo-500" />
                        <span className="text-[10px] sm:text-xs break-words">
                          {file.name.length > 12 ? `${file.name.substring(0, 10)}...` : file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Team Leader Name */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">Full Name of 8D Team Leader</label>
          <input
            type="text"
            name="teamLeaderName"
            value={formData.teamLeaderName}
            onChange={handleChange}
            placeholder="Enter team leader name..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Signature */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">
            Signature
            <span className="text-xs text-gray-500 ml-2">(Image files only, max 5MB)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            className="mt-2 text-xs sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {signatureFile && (
            <div className="mt-2 relative inline-block">
              <img
                src={signatureFile.url}
                alt="signature"
                className="border rounded w-48 h-24 object-contain bg-gray-50"
              />
              <button
                type="button"
                onClick={removeSignature}
                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-100"
              >
                <X className="w-3 h-3 text-red-500" />
              </button>
            </div>
          )}
        </div>
        
        {/* Signature Date */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">Date & Time</label>
          <input
            type="datetime-local"
            name="signatureDate"
            value={formData.signatureDate}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base font-medium transition-colors"
        >
          Save D8
        </button>
      </div>

      {/* ✅ Drawer Preview - Full Report */}
      <Drawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventId} />}
      />
    </div>
  );
}