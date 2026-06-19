// src/components/steps/D7LessonsLearned.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Lightbulb,
  Info,
  FileText,
  Eye,
  X,
  Users,
  ShieldCheck,
  CalendarDays,
  Package,
  Factory,
  AlertCircle,
  MapPin,
  Clock,
  User,
  DollarSign,
  ListChecks,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

// ✅ Enforce correct step order
const STEP_ORDER = ["d0", "d1", "d2", "d3", "d4", "d5", "d6"];

// Map step keys to human-friendly titles and icons
const stepConfig = {
  d0: { title: "D0 – Plan & Contain", icon: FileText },
  d1: { title: "D1 – Form the Team", icon: Users },
  d2: { title: "D2 – Describe the Problem", icon: HelpCircle },
  d3: { title: "D3 – Interim Containment Actions", icon: ShieldCheck },
  d4: { title: "D4 – Root Cause Analysis", icon: Lightbulb },
  d5: { title: "D5 – Permanent Corrective Actions", icon: CheckCircle },
  d6: { title: "D6 – Implementation & Communication", icon: CalendarDays },
};

// Format individual field values
const formatValue = (key, value) => {
  if (value == null || value === "") return "—";
  
  // Handle dates
  if (key.toLowerCase().includes("date") && typeof value === "string") {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    
    // Special handling for D1 team members
    if (key === "suppliers" || key === "customers") {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((member, idx) => (
            <li key={idx} className="text-sm">
              <span className="font-semibold">{member.name}</span> ({member.role}, {member.department}, {member.contact})
            </li>
          ))}
        </ul>
      );
    }
    
    // Special handling for D3/D5 actions
    if (key === "actions") {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((action, idx) => (
            <li key={idx} className="text-sm">
              {typeof action === "string" ? action : action.action || action.actionText}
            </li>
          ))}
        </ul>
      );
    }
    
    // Default array handling
    return value.join(", ");
  }
  
  // Handle objects
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  
  return String(value);
};

// Format D0 specific fields
const formatD0Field = (key, value) => {
  const fieldMap = {
    eventNo: "Event ID",
    plantLine: "Plant / Line",
    partName: "Part Name",
    lotSerial: "Lot / Serial",
    defectCode: "Defect Code",
    dateDiscovered: "Date Discovered",
    reportedBy: "Reported By",
    companyName: "Company",
    contactPerson: "Contact Person",
    email: "Primary Email",
    additionalEmails: "Team Members",
  };
  
  return fieldMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
};

// Format D2 specific fields
const formatD2Field = (key, value) => {
  const fieldMap = {
    problemStatement: "Problem Statement",
    what: "WHAT",
    why: "WHY",
    whereLocation: "WHERE",
    whenTime: "WHEN",
    who: "WHO",
    how: "HOW",
    howMuch: "Impact (HOW MUCH)",
  };
  
  return fieldMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
};

// Render a single step's data
const renderStepData = (stepKey, data) => {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-gray-500 italic">No data available</p>;
  }

  // Special handling for D0
  if (stepKey === "d0") {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (["id", "createdDate", "updatedDate", "teamMembers"].includes(key)) return null;
          return (
            <div key={key} className="flex">
              <span className="font-semibold min-w-[140px] text-gray-700">{formatD0Field(key)}:</span>
              <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Special handling for D2
  if (stepKey === "d2") {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (["id", "eventId", "createdDate", "updatedDate"].includes(key)) return null;
          return (
            <div key={key} className="flex">
              <span className="font-semibold min-w-[140px] text-gray-700">{formatD2Field(key)}:</span>
              <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Special handling for D1
  if (stepKey === "d1") {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (["id", "eventId", "createdDate", "updatedDate", "showCustomers"].includes(key)) return null;
          if (key === "suppliers" || key === "customers") {
            return (
              <div key={key} className="mt-2">
                <div className="font-semibold text-gray-700 mb-1">
                  {key === "suppliers" ? "Suppliers" : "Customers"}:
                </div>
                {formatValue(key, value)}
              </div>
            );
          }
          return (
            <div key={key} className="flex">
              <span className="font-semibold min-w-[140px] text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Special handling for D3
  if (stepKey === "d3") {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (["id", "eventId", "createdDate", "updatedDate"].includes(key)) return null;
          if (key === "actions") {
            return (
              <div key={key} className="mt-2">
                <div className="font-semibold text-gray-700 mb-1">Containment Actions:</div>
                {formatValue(key, value)}
              </div>
            );
          }
          return (
            <div key={key} className="flex">
              <span className="font-semibold min-w-[140px] text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Special handling for D5
  if (stepKey === "d5") {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (["id", "eventId", "createdDate", "updatedDate"].includes(key)) return null;
          if (key === "actions") {
            return (
              <div key={key} className="mt-2">
                <div className="font-semibold text-gray-700 mb-1">Corrective Actions:</div>
                {formatValue(key, value)}
              </div>
            );
          }
          return (
            <div key={key} className="flex">
              <span className="font-semibold min-w-[140px] text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Default handling for D4, D6
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => {
        if (["id", "eventId", "createdDate", "updatedDate"].includes(key)) return null;
        return (
          <div key={key} className="flex">
            <span className="font-semibold min-w-[140px] text-gray-700">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <span className="ml-2 text-gray-800 flex-1">{formatValue(key, value)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function D7LessonsLearned({ eventId = null, updateParent }) {
  const API_URL = "https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data";
  const LOCAL_STORAGE_KEY = eventId ? `d7-event-${eventId}` : "d7-new-event";
  const [formData, setFormData] = useState({
    eventId: eventId || "",
    additionalMeasuresNeeded: "No",
    lessonsLearned: "",
    proceduresUpdated: "Yes",
  });
  const [allReports, setAllReports] = useState({});
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
          setAllReports(eventData.content || {});
          const d7Data = eventData.content?.d7?.[0];
          if (d7Data) {
            setFormData({
              ...d7Data,
              eventId: d7Data.eventId || eventId,
            });
            setRecordId(eventId);
          }
        }
      } catch (err) {
        console.error("Error fetching D7 ", err);
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
    try {
      const payload = { d7: [formData] };
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
        alert("✅ D7 Lessons Learned saved successfully!");
      }
    } catch (err) {
      console.error("Error saving D7 form:", err);
      alert("Failed to save D7 form.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D7 – Lessons Learned & Continuous Improvement
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

      {/* 📑 Previous Reports Viewer - FIXED ORDER */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-inner border border-gray-200 max-h-96 overflow-y-auto">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> Previous Reports (D0–D6)
        </h3>
        
        {STEP_ORDER
          .map(stepKey => {
            const data = allReports[stepKey]?.[0];
            if (!data) return null;

            const { title, icon: Icon } = stepConfig[stepKey] || { 
              title: stepKey.toUpperCase(), 
              icon: FileText 
            };
            
            return (
              <div key={stepKey} className="mb-4 last:mb-0 border-b border-gray-200 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{title}</h4>
                </div>
                <div className="ml-6 text-sm">
                  {renderStepData(stepKey, data)}
                </div>
              </div>
            );
          })}
          
        {STEP_ORDER.filter(stepKey => allReports[stepKey]?.[0]).length === 0 && (
          <p className="text-gray-500 text-sm">No previous reports available</p>
        )}
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
        {/* Additional Measures Needed */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Are additional measures needed to prevent similar problems?
            <Tippy content="Select Yes if further actions are needed, otherwise No">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <div className="mt-2 flex items-center gap-4 sm:gap-6">
            {["Yes", "No"].map((option) => (
              <label key={option} className="flex items-center gap-1 sm:gap-2">
                <input
                  type="radio"
                  name="additionalMeasuresNeeded"
                  value={option}
                  checked={formData.additionalMeasuresNeeded === option}
                  onChange={handleChange}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-gray-700 text-sm sm:text-base">{option}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Lessons Learned */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Lessons Learned
            <Tippy content="Describe insights gained and improvements for future processes">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <textarea
            name="lessonsLearned"
            value={formData.lessonsLearned}
            onChange={handleChange}
            rows="4"
            placeholder="Sometimes simple protocols and SOPs are taken for granted..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Procedures Updated */}
        <div>
          <label className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            Were procedures and work instructions updated?
            <Tippy content="Select Yes if SOPs or procedures were revised">
              <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
            </Tippy>
          </label>
          <div className="mt-2 flex items-center gap-4 sm:gap-6">
            {["Yes", "No"].map((option) => (
              <label key={option} className="flex items-center gap-1 sm:gap-2">
                <input
                  type="radio"
                  name="proceduresUpdated"
                  value={option}
                  checked={formData.proceduresUpdated === option}
                  onChange={handleChange}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-gray-700 text-sm sm:text-base">{option}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm sm:text-base"
        >
          Save D7
        </button>
      </div>

      {/* Drawer Preview */}
      <Drawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventId} />}
      />
    </div>
  );
}