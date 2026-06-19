// src/steps/useDFormSubmit.jsx
import { useState } from "react";
import axios from "axios";

const API_URL = "https://internalaudit.hub.swajyot.co.in:8090
/api/public/json-data";

export const useDFormSubmit = (step, recordId, setRecordId, currentFormData) => {
  const [submitted, setSubmitted] = useState(false);

  const submitForm = async (formData, onSuccess) => {
    setSubmitted(true);

    try {
      let currentRecord;
      let parsedContent;

      // ➤ CASE 1: No recordId → CREATE NEW RECORD
      if (!recordId) {
        const emptyForm = {
          d0: [], d1: [], d2: [], d3: [], d4: [], d5: [], d6: [], d7: [], d8: [],
        };

        const payload = { jsonContent: JSON.stringify(emptyForm) };
        const createRes = await axios.post(API_URL, payload);
        if (!createRes.data?.success) throw new Error("Create failed");

        currentRecord = {
          id: createRes.data.data.id,
          jsonContent: payload.jsonContent,
        };

        if (setRecordId) setRecordId(currentRecord.id);
        console.log("🆕 New D-Form Record Created:", currentRecord.id);
        
        // Initialize parsedContent for new record
        parsedContent = emptyForm;
      }
      // ➤ CASE 2: Use current form data from props/state (PREFERRED)
      else if (currentFormData) {
        parsedContent = { ...currentFormData };
        
        // Ensure all steps exist
        const steps = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"];
        steps.forEach(s => {
          if (!Array.isArray(parsedContent[s])) {
            parsedContent[s] = [];
          }
        });
        
        currentRecord = { id: recordId, jsonContent: JSON.stringify(parsedContent) };
        console.log("📋 Using current form data from state");
      }
      // ➤ CASE 3: Fallback - fetch from server (with cache busting)
      else {
        const fetchRes = await axios.get(`${API_URL}/${recordId}?t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!fetchRes.data?.success) throw new Error("Fetch failed");
        currentRecord = fetchRes.data.data;
        
        try {
          parsedContent = JSON.parse(currentRecord.jsonContent);
          // Ensure all steps exist
          const steps = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"];
          steps.forEach(s => {
            if (!Array.isArray(parsedContent[s])) {
              parsedContent[s] = [];
            }
          });
        } catch (e) {
          parsedContent = { d0: [], d1: [], d2: [], d3: [], d4: [], d5: [], d6: [], d7: [], d8: [] };
        }
        console.log("🌐 Fetched data from server");
      }

      console.log("📥 Existing data before update:", parsedContent);

      // ➤ ✅ CRITICAL FIX: Handle both empty and populated arrays properly
      if (Array.isArray(parsedContent[step])) {
        if (parsedContent[step].length > 0) {
          // Update existing entry (merge with previous data)
          parsedContent[step][0] = { ...parsedContent[step][0], ...formData };
          console.log(`🔄 Updated existing ${step} data`);
        } else {
          // Array exists but is empty - add new entry
          parsedContent[step].push(formData);
          console.log(`➕ Added new ${step} data to empty array`);
        }
      } else {
        // Array doesn't exist - create it with new entry
        parsedContent[step] = [formData];
        console.log(`🆕 Created new ${step} array with data`);
      }

      console.log(`📤 Submitting ${step}:`, formData);
      console.log("✅ Full record after update:", parsedContent);

      // ➤ UPDATE RECORD
      const updatedPayload = { jsonContent: JSON.stringify(parsedContent) };
      const saveRes = await axios.put(`${API_URL}/${currentRecord.id}`, updatedPayload);
      if (!saveRes.data?.success) throw new Error("Update failed");

      console.log(`✅ ${step.toUpperCase()} saved successfully. Record ID:`, currentRecord.id);
      alert(`${step.toUpperCase()} form saved successfully!`);
      if (onSuccess) onSuccess(formData, currentRecord.id);

    } catch (err) {
      console.error(`❌ Failed to save ${step}:`, err.message);
      alert(`Failed to save ${step}. Check console.`);
    } finally {
      setSubmitted(false);
    }
  };

  return { submitForm, submitted };
};