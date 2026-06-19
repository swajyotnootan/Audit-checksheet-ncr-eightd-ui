// src/components/steps/D2FormProblem.jsx
import React, { useState, useEffect } from "react";
import {
  FileText,
  MapPin,
  User,
  Clock,
  DollarSign,
  HelpCircle,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import axios from "axios";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D2FormProblem({ eventId, updateParent }) {
  const API_URL = "https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d2-event-${eventId}` : "d2-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    problemStatement: "",
    what: "",
    why: "",
    where: "",
    otherWhere: "",
    when: "",
    who: "",
    how: "",
    howMuch: "",
  });
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const workAreas = [
    "Assembly Line",
    "Packaging Area",
    "Testing Lab",
    "Warehouse",
    "Quality Control",
    "Maintenance Workshop",
    "Other",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (eventId) {
          const res = await axios.get(`${API_URL}/${eventId}`);
          if (res.data.success && res.data.data) {
            const d2Data = res.data.data.content?.d2?.[0];
            if (d2Data) {
              setFormData({
                ...d2Data,
                eventId: d2Data.eventId || eventId,
              });
              setRecordId(eventId);
            } else {
              const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
              if (saved) setFormData(JSON.parse(saved));
            }
          }
        } else {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) setFormData(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Error fetching D2 data:", err);
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) setFormData(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const finalFormData = {
      ...formData,
      where:
        formData.where === "Other" && formData.otherWhere
          ? formData.otherWhere
          : formData.where,
    };
    try {
      const payload = { d2: [finalFormData] };
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));
      let res;
      if (recordId) {
        res = await axios.put(`${API_URL}/${recordId}`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axios.post(API_URL, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      if (res.data.success) {
        const savedEventNo = res.data.data.id;
        setRecordId(savedEventNo);
        setSubmitted(true);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalFormData));
        alert("✅ D2 problem description saved to backend!");
        if (updateParent) updateParent([finalFormData]);
      }
    } catch (err) {
      console.error("Error saving D2 form:", err);
      alert("Failed to save D2 to backend. Data saved locally.");
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalFormData));
    }
  };

  if (loading) return <p className="text-center mt-6">Loading D2 data...</p>;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4">
      {/* Header - Responsive */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
          D2 – Describe the Problem
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
      
      {/* Form Content - Responsive */}
      <div className="bg-white p-4 sm:p-6 rounded-b-2xl shadow-lg border border-gray-100 space-y-4 sm:space-y-6 mt-4">
        {/* Event ID */}
        <div>
          <label className="block text-gray-800 font-medium text-sm sm:text-base mb-1">
            Event ID
          </label>
          <input
            type="text"
            value={formData.eventId}
            onChange={(e) => handleChange("eventId", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
            placeholder="Enter Event ID (e.g., EVT-2024-001)"
          />
        </div>
        {/* Problem Statement */}
        <div>
          <label className="block text-gray-800 font-medium text-sm sm:text-base mb-1 flex items-center gap-2">
            <Tippy
              content="Enter a short, clear statement that defines the issue (who, what, where, when, how many)."
              placement="top"
              arrow={true}
            >
              <span className="flex items-center gap-1 cursor-help">
                <FileText className="text-indigo-500" />
              </span>
            </Tippy>
            Briefly Describe the Problem
          </label>
          <textarea
            rows={4}
            value={formData.problemStatement}
            onChange={(e) => handleChange("problemStatement", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
            placeholder="e.g. Product X shows cracks after 2 hours of operation..."
          />
        </div>
        {/* 5W2H Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <RichInput
            icon={<HelpCircle className="text-indigo-500" />}
            label={<> <span className="font-bold">WHAT</span> is the problem? </>}
            tooltip="What happened?"
            value={formData.what}
            onChange={(e) => handleChange("what", e.target.value)}
            multiline
          />
          <RichInput
            icon={<CheckCircle className="text-green-500" />}
            label={<> <span className="font-bold">WHY</span> is it a problem? </>}
            tooltip="Why does this matter?"
            value={formData.why}
            onChange={(e) => handleChange("why", e.target.value)}
            multiline
          />
          {/* Location */}
          <div className="space-y-1">
            <label className="block text-gray-800 font-medium text-sm sm:text-base flex items-center gap-2">
              <Tippy content="Location / area" placement="top" arrow={true}>
                <span className="flex items-center gap-1 cursor-help">
                  <MapPin className="text-red-500" />
                </span>
              </Tippy>
              <b> WHERE</b> did it occur?
            </label>
            <select
              value={formData.where}
              onChange={(e) => handleChange("where", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select location...</option>
              {workAreas.map((area, idx) => (
                <option key={idx} value={area}>
                  {area}
                </option>
              ))}
            </select>
            {formData.where === "Other" && (
              <input
                type="text"
                value={formData.otherWhere}
                onChange={(e) => handleChange("otherWhere", e.target.value)}
                placeholder="Enter other location..."
                className="mt-2 w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>
          <RichInput
            icon={<Clock className="text-orange-500" />}
            label={<><span className="font-bold">WHEN</span> did it occur?</>}
            tooltip="Date and time of occurrence"
            type="datetime-local"
            value={formData.when}
            onChange={(e) => handleChange("when", e.target.value)}
          />
          <RichInput
            icon={<User className="text-blue-500" />}
            label={<><span className="font-bold">WHO</span> reported it?</>}
            tooltip="Person or team who reported the issue"
            value={formData.who}
            onChange={(e) => handleChange("who", e.target.value)}
          />
          <RichInput
            icon={<FileText className="text-purple-500" />}
            label={<><span className="font-bold">HOW</span> was it detected?</>}
            tooltip="Detection method"
            value={formData.how}
            onChange={(e) => handleChange("how", e.target.value)}
          />
          <RichInput
            icon={<DollarSign className="text-teal-500" />}
            label={<><span className="font-bold">HOW</span> much impact?</>}
            tooltip="Estimated cost or quantity affected"
            type="text"
            value={formData.howMuch}
            onChange={(e) => handleChange("howMuch", e.target.value)}
          />
        </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={submitted}
          className={`mt-4 px-4 py-2 sm:px-6 sm:py-2 rounded-lg text-white shadow text-sm sm:text-base ${
            submitted
              ? "bg-green-600 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {submitted ? "Saved ✅" : "Save Problem"}
        </button>
      </div>

      {/* ✅ DRAWER PREVIEW */}
      <Drawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventId} />}
      />
    </div>
  );
}

function RichInput({ icon, label, tooltip, value, onChange, type = "text", multiline = false }) {
  return (
    <div className="space-y-1">
      <label className="block text-gray-800 font-medium text-sm sm:text-base flex items-center gap-2">
        <Tippy content={tooltip} placement="top" arrow={true}>
          <span className="flex items-center gap-1 cursor-help">{icon}</span>
        </Tippy>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          rows={4}
          className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
          placeholder="Enter value..."
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
          placeholder="Enter value..."
        />
      )}
    </div>
  );
}