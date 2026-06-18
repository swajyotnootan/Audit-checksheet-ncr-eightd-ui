// src/components/steps/D4RootCause.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Camera,
  CheckCircle,
  Info,
  X,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D4RootCause({ eventId = null, updateParent }) {
  const API_URL = "https://qsutrarmsclm.hub.swajyot.co.in:8476/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d4-event-${eventId}` : "d4-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    rootCauseSummary: "",
    businessProcessFlaws: "Yes",
    whyNotDetected: "",
  });
  const [photos, setPhotos] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`${API_URL}/${eventId}`);
        if (res.data.success && res.data.data) {
          const eventData = res.data.data;
          const d4Data = eventData.content?.d4?.[0];
          if (d4Data) {
            setFormData({
              ...d4Data,
              eventId: d4Data.eventId || eventId,
            });
            setRecordId(eventId);
          }
        }
      } catch (err) {
        console.error("Error fetching D4 ", err);
      }
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    if (!submitted) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...formData, photos }));
    }
  }, [formData, photos, submitted]);

  useEffect(() => {
    if (updateParent) updateParent([formData]);
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((file) => ({
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    setPhotos(updatedPhotos);
  };

  const handleSave = async () => {
    try {
      const payload = { d4: [formData] };
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));
      photos.forEach((photo) => {
        if (photo.file) formDataToSend.append("files", photo.file);
      });
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
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert("✅ D4 Root Cause saved successfully!");
      }
    } catch (err) {
      console.error("Error saving D4 form:", err);
      alert("Failed to save D4 form.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D4 – Root Cause Analysis
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

      {/* Form Fields */}
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
        {/* Root Cause Summary */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Root Cause Summary
            <Tippy content="Identify the main reason the problem occurred">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <textarea
            name="rootCauseSummary"
            value={formData.rootCauseSummary}
            onChange={handleChange}
            rows="3"
            placeholder="Describe the root cause..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Attach Photos */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Attach Photos
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="mt-2 text-xs sm:text-sm"
          />
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative w-20 sm:w-24 h-20 sm:h-24 rounded-lg overflow-hidden shadow border"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 sm:p-1 shadow hover:bg-red-100"
                  >
                    <X size={12} sm:w-4 sm:h-4 className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Business Process Flaws */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Does the Root Cause reveal flaws in business processes?
          </label>
          <div className="mt-2 flex items-center gap-4 sm:gap-6">
            {["Yes", "No"].map((option) => (
              <label key={option} className="flex items-center gap-1 sm:gap-2">
                <input
                  type="radio"
                  name="businessProcessFlaws"
                  value={option}
                  checked={formData.businessProcessFlaws === option}
                  onChange={handleChange}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-gray-700 text-sm sm:text-base">{option}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Why not detected */}
        <div>
          <label className="font-semibold text-gray-800 text-sm sm:text-base">
            Reason problem was not detected/resolved
          </label>
          <textarea
            name="whyNotDetected"
            value={formData.whyNotDetected}
            onChange={handleChange}
            rows="3"
            placeholder="Explain why the issue was not detected..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base"
        >
          Save D4
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