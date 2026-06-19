// src/components/steps/D3InterimContainment.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ShieldCheck,
  ClipboardList,
  HelpCircle,
  Star,
  PlusCircle,
  Trash2,
  Edit3,
  Check,
  X,
  ListChecks,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D3InterimContainment({ eventId = null, updateParent }) {
  const API_URL = "https://internalaudit.hub.swajyot.co.in:8090/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d3-event-${eventId}` : "d3-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    problemStatement: "",
    hasContainment: "No",
    actions: [],
  });
  const [newAction, setNewAction] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [hoverValue, setHoverValue] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [reports, setReports] = useState([]);
  const [images, setImages] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`${API_URL}/${eventId}`);
        if (res.data.success && res.data.data) {
          const eventData = res.data.data;
          const d3Data = eventData.content?.d3?.[0];
          if (d3Data) {
            let normalizedActions = [];
            if (Array.isArray(d3Data.actions)) {
              normalizedActions = d3Data.actions.map((item) => {
                if (typeof item === "string") {
                  return { action: item, rating: 5 };
                } else if (item && typeof item === "object") {
                  return {
                    action: item.action || item.actionText || "",
                    rating: typeof item.rating === "number" ? item.rating : 5,
                  };
                }
                return { action: "", rating: 5 };
              });
            }
            setFormData({
              eventId: d3Data.eventId || eventId,
              problemStatement: d3Data.problemStatement || "",
              hasContainment: d3Data.hasContainment || "No",
              actions: normalizedActions,
            });
            setRecordId(eventId);
          }
          if (!d3Data?.problemStatement && eventData.content?.d2?.[0]?.problemStatement) {
            setFormData((prev) => ({
              ...prev,
              problemStatement: eventData.content.d2[0].problemStatement,
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching D3", err);
      }
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    if (!submitted) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, submitted]);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const addAction = () => {
    if (newAction.trim()) {
      setFormData((prev) => ({
        ...prev,
        actions: [...prev.actions, { action: newAction.trim(), rating: 5 }],
      }));
      setNewAction("");
    }
  };

  const deleteAction = (index) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditValue(formData.actions[index].action);
  };

  const saveEdit = (index) => {
    setFormData((prev) => {
      const updated = [...prev.actions];
      updated[index] = { ...updated[index], action: editValue.trim() };
      return { ...prev, actions: updated };
    });
    setEditingIndex(null);
    setEditValue("");
  };

  const updateRating = (index, rating) => {
    setFormData((prev) => {
      const updated = [...prev.actions];
      updated[index] = { ...updated[index], rating };
      return { ...prev, actions: updated };
    });
  };

  const StarRating = ({ value, onChange }) => (
    <div className="flex items-center gap-1 mt-2">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => setHoverValue(i + 1)}
          onMouseLeave={() => setHoverValue(null)}
          className="p-1 transition-transform transform hover:scale-110"
        >
          <Star
            size={20}
            className={
              i + 1 <= (hoverValue ?? value)
                ? "text-yellow-400"
                : "text-gray-300 hover:text-yellow-400"
            }
            fill={i + 1 <= (hoverValue ?? value) ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span className="ml-2 font-semibold text-gray-800 text-sm">{value}/5</span>
    </div>
  );

  const addAttachment = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const newItem = { file, title: "", description: "" };
    if (type === "images") setImages([...images, newItem]);
    else setReports([...reports, newItem]);
  };

  const handleSave = async () => {
    if (formData.hasContainment === "Yes" && reports.length === 0 && images.length === 0) {
      alert("❌ Please attach at least one report or image.");
      return;
    }
    try {
      const payload = { d3: [formData] };
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));
      [...images, ...reports].forEach((item) => {
        if (item.file) formDataToSend.append("files", item.file);
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
        alert("✅ D3 form saved successfully!");
        if (updateParent) updateParent([formData]);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save D3 form.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D3 – Interim Containment Actions
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

      {/* Form Content */}
      <div className="bg-white p-4 sm:p-6 rounded-b-2xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 gap-y-6">
          {/* Left Column */}
          <div className="space-y-4">
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
                placeholder="Enter Event ID from D0"
              />
            </div>
            {/* Problem Statement */}
            <div>
              <label className="flex items-center gap-2 text-gray-800 font-medium text-sm sm:text-base mb-1">
                <Tippy content="Reference the problem statement with 5W2H">
                  <HelpCircle className="text-gray-500 cursor-help w-4 h-4" />
                </Tippy>
                Problem Statement
              </label>
              <textarea
                rows={3}
                value={formData.problemStatement || ""}
                onChange={(e) => handleChange("problemStatement", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {/* Yes/No */}
            <div>
              <label className="flex items-center gap-2 text-gray-800 font-medium text-sm sm:text-base mb-1">
                <ClipboardList className="text-indigo-500 w-4 h-4" /> Are there interim containment actions?
              </label>
              <div className="flex gap-6 mt-1">
                {["Yes", "No"].map((val) => (
                  <label key={val} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="hasContainment"
                      value={val}
                      checked={formData.hasContainment === val}
                      onChange={(e) => handleChange("hasContainment", e.target.value)}
                      className="accent-indigo-500"
                    />
                    <span className="text-gray-700 text-sm sm:text-base">{val}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Actions List */}
            {formData.hasContainment === "Yes" && (
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {formData.actions.map((item, i) => (
                  <div key={i} className="bg-white px-3 sm:px-4 py-3 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold">
                          {i + 1}
                        </span>
                        {editingIndex === i ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 border rounded-lg px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-gray-700 flex items-center gap-2 text-sm">
                            <ListChecks className="inline text-green-600 w-4 h-4" /> {item.action}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {editingIndex === i ? (
                          <>
                            <button onClick={() => saveEdit(i)} className="text-green-600 hover:text-green-800">
                              <Check size={16} />
                            </button>
                            <button onClick={() => setEditingIndex(null)} className="text-red-500 hover:text-red-700">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(i)} className="text-blue-500 hover:text-blue-700">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => deleteAction(i)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingIndex !== i && (
                      <StarRating
                        value={item.rating}
                        onChange={(val) => updateRating(i, val)}
                      />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAction()}
                    placeholder="Enter an action and press Add..."
                    className="flex-1 border rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    type="button"
                    onClick={addAction}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs sm:text-sm"
                  >
                    <PlusCircle size={16} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Attachments */}
          {formData.hasContainment === "Yes" && (
            <div className="space-y-6 max-h-[500px] overflow-y-auto">
              {/* Reports */}
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Reports</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {reports.map((r, idx) => (
                    <div key={idx} className="border rounded-lg p-2 sm:p-3 bg-gray-50 relative">
                      <button
                        onClick={() => setReports(reports.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                      <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 mb-2" />
                      <input
                        type="text"
                        placeholder="Title"
                        value={r.title}
                        onChange={(e) => {
                          const newR = [...reports];
                          newR[idx].title = e.target.value;
                          setReports(newR);
                        }}
                        className="w-full text-xs sm:text-sm font-semibold border rounded px-1 sm:px-2 py-0.5 sm:py-1 mb-1"
                      />
                      <textarea
                        placeholder="Description"
                        value={r.description}
                        onChange={(e) => {
                          const newR = [...reports];
                          newR[idx].description = e.target.value;
                          setReports(newR);
                        }}
                        className="w-full text-xs border rounded px-1 sm:px-2 py-0.5 sm:py-1 resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  onChange={(e) => addAttachment(e, "reports")}
                  className="w-full border rounded-lg px-2 py-1 sm:px-3 sm:py-2 mt-2 text-xs sm:text-sm"
                />
              </div>
              {/* Images */}
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Images</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="border rounded-lg p-2 sm:p-3 bg-white relative">
                      <button
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                      <img
                        src={URL.createObjectURL(img.file)}
                        alt={img.title}
                        className="w-full h-20 sm:h-24 object-cover rounded mb-2 border"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={img.title}
                        onChange={(e) => {
                          const newI = [...images];
                          newI[idx].title = e.target.value;
                          setImages(newI);
                        }}
                        className="w-full text-xs sm:text-sm font-semibold border rounded px-1 sm:px-2 py-0.5 sm:py-1 mb-1"
                      />
                      <textarea
                        placeholder="Description"
                        value={img.description}
                        onChange={(e) => {
                          const newI = [...images];
                          newI[idx].description = e.target.value;
                          setImages(newI);
                        }}
                        className="w-full text-xs border rounded px-1 sm:px-2 py-0.5 sm:py-1 resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => addAttachment(e, "images")}
                  className="w-full border rounded-lg px-2 py-1 sm:px-3 sm:py-2 mt-2 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base"
          >
            Save D3
          </button>
        </div>
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