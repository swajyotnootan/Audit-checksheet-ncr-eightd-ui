// src/components/steps/D5CorrectiveActions.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ClipboardCheck,
  Camera,
  FileText,
  Info,
  X,
  PlusCircle,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D5CorrectiveActions({ eventId = null, updateParent }) {
  const API_URL = "https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d5-event-${eventId}` : "d5-new-event";
  const predefinedActions = [
    "Hiring additional staff to reduce workload and improve safety and quality standards.",
    "Introducing read-do and do-confirm pre-surgery checklists to ensure safety protocols are followed.",
    "Imposing stricter penalties to staff committing documentation errors.",
    "Assigning staff to monitor IV line errors and conduct monthly huddles for vigilance."
  ];
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    actions: [],
    customActionInput: "",
  });
  const [files, setFiles] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`${API_URL}/${eventId}`);
        if (res.data.success && res.data.data) {
          const eventData = res.data.data;
          const d5Data = eventData.content?.d5?.[0];
          if (d5Data) {
            const actions = Array.isArray(d5Data.actions) 
              ? d5Data.actions.map(a => typeof a === 'string' ? { action: a } : a)
              : [];
            setFormData({
              eventId: d5Data.eventId || eventId,
              actions,
              customActionInput: "",
            });
            setRecordId(eventId);
          }
        }
      } catch (err) {
        console.error("Error fetching D5 ", err);
      }
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...formData, files }));
  }, [formData, files]);

  useEffect(() => {
    if (updateParent) updateParent([formData]);
  }, [formData]);

  const toggleAction = (actionText) => {
    setFormData(prev => {
      const exists = prev.actions.some(a => a.action === actionText);
      if (exists) {
        return { ...prev, actions: prev.actions.filter(a => a.action !== actionText) };
      } else {
        return { ...prev, actions: [...prev.actions, { action: actionText }] };
      }
    });
  };

  const addCustomAction = () => {
    const actionText = formData.customActionInput?.trim();
    if (!actionText || formData.actions.some(a => a.action === actionText)) return;
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { action: actionText }],
      customActionInput: "",
    }));
  };

  const removeAction = (actionText) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.action !== actionText),
    }));
  };

  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files).map(file => ({
      file,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setFiles(prev => [...prev, ...uploaded]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const payload = { d5: [{ eventId: formData.eventId, actions: formData.actions }] };
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));
      files.forEach(item => {
        if (item.file) formDataToSend.append("files", item.file);
      });
      let res;
      if (recordId) {
        res = await axios.put(`${API_URL}/${recordId}`, formDataToSend);
      } else {
        res = await axios.post(API_URL, formDataToSend);
      }
      if (res.data.success) {
        const savedEventNo = res.data.data.id;
        setRecordId(savedEventNo);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert("✅ D5 Corrective Actions saved successfully!");
      }
    } catch (err) {
      console.error("Error saving D5 form:", err);
      alert("Failed to save D5 form. Check console for details.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D5 – Permanent Corrective Actions
            {eventId && (
              <span className="text-xs sm:text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                {eventId}
              </span>
            )}
          </h2>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1 sm:gap-2 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-white/20 transition text-xs sm:text-sm"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            Preview Full Report
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-b-2xl shadow-lg border border-gray-100 space-y-4 sm:space-y-6">
        {/* Event ID */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">Event ID</label>
          <input
            type="text"
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter Event ID from D0"
          />
        </div>
        {/* Corrective Actions */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Corrective Actions
            <Tippy content="Select predefined actions or add custom ones">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          {/* Predefined Actions */}
          <div className="mt-2 space-y-2">
            {predefinedActions.map((action, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.actions.some(a => a.action === action)}
                  onChange={() => toggleAction(action)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 text-sm sm:text-base">{action}</span>
              </label>
            ))}
          </div>
          {/* Add Custom Action */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={formData.customActionInput || ""}
              onChange={(e) => setFormData({ ...formData, customActionInput: e.target.value })}
              placeholder="Type custom corrective action"
              className="flex-1 rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addCustomAction}
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm"
            >
              <PlusCircle size={16} /> Add
            </button>
          </div>
          {/* Display Added Actions */}
          {formData.actions.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.actions.map((actionObj, idx) => (
                <div
                  key={idx}
                  className="relative bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 shadow-sm"
                >
                  <span className="text-gray-800 text-xs sm:text-sm">{actionObj.action}</span>
                  <button
                    type="button"
                    onClick={() => removeAction(actionObj.action)}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Attach Photos / Reports */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Attach Photos or Reports
          </label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="mt-2 text-xs sm:text-sm"
          />
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative w-20 sm:w-24 h-20 sm:h-24 rounded-lg overflow-hidden shadow border flex items-center justify-center bg-gray-50"
                >
                  {file.type.startsWith("image") ? (
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600 text-[10px] sm:text-xs p-1 text-center">
                      <FileText size={20} sm:w-5 sm:h-5 />
                      {file.name.substring(0, 8)}...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 sm:p-1 shadow hover:bg-red-100"
                  >
                    <X size={12} sm:w-4 sm:h-4 className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base"
        >
          Save D5
        </button>
      </div>

      {/* Drawer Preview */}
      <Drawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventId} />}
      />
    </div>
  );
}