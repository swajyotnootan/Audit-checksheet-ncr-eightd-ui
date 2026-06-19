// src/components/steps/D6Implementation.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  CalendarDays,
  Info,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D6Implementation({ eventId = null, updateParent }) {
  const API_URL = "https://internalaudit.hub.swajyot.co.in:8090/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d6-event-${eventId}` : "d6-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    implementationDate: "",
    communicatedToStakeholders: "Yes",
    notes: "",
  });
  const [recordId, setRecordId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false); // ✅ Correct name

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`${API_URL}/${eventId}`);
        if (res.data.success && res.data.data) {
          const eventData = res.data.data;
          const d6Data = eventData.content?.d6?.[0];
          if (d6Data) {
            setFormData({
              ...d6Data,
              eventId: d6Data.eventId || eventId,
            });
            setRecordId(eventId);
          }
        }
      } catch (err) {
        console.error("Error fetching D6 ", err);
      }
    };
    fetchData();
  }, [eventId]);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (updateParent) updateParent([formData]);
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.implementationDate) {
      alert("❌ Please select the Implementation Date & Time.");
      return;
    }
    try {
      const payload = { d6: [formData] };
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
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert("✅ D6 Implementation & Communication saved successfully!");
      }
    } catch (err) {
      console.error("Error saving D6 form:", err);
      alert("Failed to save D6 form.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D6 – Implementation & Communication
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
        {/* Implementation Date & Time */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Implementation Date & Time
            <Tippy content="Select the exact date and time when corrective actions were implemented">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <input
            type="datetime-local"
            name="implementationDate"
            value={formData.implementationDate}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Communicated to Stakeholders */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">
            Communicated to all stakeholders?
          </label>
          <div className="mt-2 flex items-center gap-4 sm:gap-6">
            {["Yes", "No"].map((option) => (
              <label key={option} className="flex items-center gap-1 sm:gap-2">
                <input
                  type="radio"
                  name="communicatedToStakeholders"
                  value={option}
                  checked={formData.communicatedToStakeholders === option}
                  onChange={handleChange}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-gray-700 text-sm sm:text-base">{option}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Optional Notes */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Notes / Comments
            <Tippy content="Any additional remarks or observations">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Add any relevant notes..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base"
        >
          Save D6
        </button>
      </div>

      {/* ✅ Drawer Preview - CORRECT STATE NAME */}
      <Drawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventId} />}
      />
    </div>
  );
}