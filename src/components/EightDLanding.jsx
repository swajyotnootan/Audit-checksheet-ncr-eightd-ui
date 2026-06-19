// src/components/EightDLanding.jsx
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import EightDStepper from "./EightDStepper";
import D0PlanContain from "./steps/D0PlanContain";
import D1FormTeam from "./steps/D1FormTeam";
import D2FormProblem from "./steps/D2FormProblem";
import D3InterimContainment from "./steps/D3InterimContainment";
import D4RootCause from "./steps/D4RootCause";
import D5CorrectiveActions from "./steps/D5CorrectiveActions";
import D6Implementation from "./steps/D6Implementation";
import D7LessonsLearned from "./steps/D7LessonsLearned";
import D8TeamReward from "./steps/D8TeamReward";
import FinalPreview from "./steps/FinalPreview";

const stepKeys = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"];

function getFirstUnfilledStep(formData) {
  for (let i = 0; i < stepKeys.length; i++) {
    if (!formData[stepKeys[i]] || formData[stepKeys[i]].length === 0) {
      return i;
    }
  }
  return stepKeys.length;
}

export default function EightDLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const stateData = location.state || {};
  const eventId = stateData.eventId || queryParams.get("eventId");
  const startStep = stateData.step || queryParams.get("step");
  const isNcrBased = stateData.isNcrBased ?? queryParams.get("isNcrBased") === "true";
  const type = stateData.type || queryParams.get("type");
  const startedFromNcrFlow = Boolean(
    isNcrBased ||
    type === "ncr" ||
    String(eventId || "").startsWith("8D-")
  );

  const steps = [
    "D0 – Plan & Contain",
    "D1 – Form the Team",
    "D2 – Describe the Problem",
    "D3 – Interim Containment Actions",
    "D4 – Root Cause Analysis",
    "D5 – Permanent Corrective Actions",
    "D6 – Implement & Validate PCAs",
    "D7 – Prevent Recurrence",
    "D8 – Close & Recognize",
    "Final Preview",
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [eventNo, setEventNo] = useState(eventId || null);
  const [approvals, setApprovals] = useState(() => {
    const saved = localStorage.getItem("8d_approvals");
    return saved ? JSON.parse(saved) : { qaApproval: false, plantMdApproval: false };
  });

  useEffect(() => {
    localStorage.setItem("8d_approvals", JSON.stringify(approvals));
  }, [approvals]);


  
  const [documentStatus, setDocumentStatus] = useState("draft");

  const saveStep = async (currentFormData) => {
    try {
      if (!eventNo && currentFormData.d0 && currentFormData.d0.length > 0) {
        const d0Data = currentFormData.d0[0];
        if (!d0Data.eventNo || d0Data.eventNo.trim() === "") {
          alert("❌ Please enter an Event ID in D0 before proceeding.");
          return false;
        }
      }

      const payload = {};
      stepKeys.forEach(key => {
        if (currentFormData[key] && currentFormData[key].length > 0) {
          const formWithId = currentFormData[key].map(form => ({
            ...form,
            ...(key === "d0" 
              ? { eventNo: form.eventNo || eventNo }
              : { eventId: eventNo || (currentFormData.d0?.[0]?.eventNo) }
            )
          }));
          payload[key] = formWithId;
        }
      });

      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));

      let response;
      if (eventNo) {
        response = await axios.put(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data/${eventNo}`, formDataToSend);
      } else {
        response = await axios.post("https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data", formDataToSend);
      }

      if (response?.data?.success) {
        const savedEventNo = response.data.data?.id;
        if (savedEventNo && !eventNo) {
          setEventNo(savedEventNo);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error saving 8D step:", err);
      alert("Failed to save step. Check console for details.");
      return false;
    }
  };

  const nextStep = async () => {
  // Save current step first
  const success = await saveStep(formData);
  if (!success) return;

  // If trying to move from D0 to D1, check approval status
  if (currentStep === 0 && currentStep + 1 === 1) {
    console.log("🚦 Checking if can move from D0 to D1. Status:", documentStatus);
    
    if (documentStatus === "rejected") {
      alert("❌ This document was rejected and cannot be continued.");
      return;
    }
    
    if (documentStatus !== "in progress") {
      alert("⚠️ HOD approval is required before proceeding to D1.");
      return;
    }
  }
  
  // If checks pass, proceed
  setDirection(1);
  setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
};

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

 const goToStep = (index) => {
  console.log("🔄 Navigating to step", index, "Current document status:", documentStatus);
  
  // Always allow going to D0 (index 0)
  if (index === 0) {
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
    return;
  }
  
  // For steps beyond D0, check if D0 is approved
  if (documentStatus !== "in progress") {
    alert("⚠️ You must get HOD approval before accessing steps beyond D0.");
    return;
  }
  
  // If approved, allow navigation
  setDirection(index > currentStep ? 1 : -1);
  setCurrentStep(index);
};

  const handleFinalSubmit = async () => {
    const success = await saveStep(formData);
    if (success) {
      alert("✅ 8D Report submitted successfully!");
      navigate("/");
    }
  };

  const [formData, setFormData] = useState({
    d0: [], d1: [], d2: [], d3: [], d4: [],
    d5: [], d6: [], d7: [], d8: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventNo) return;

      try {
        const response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/eightd/data/${eventNo}`);
        if (response.data?.success && response.data.data?.content) {
          const content = response.data.data.content;
          const loadedData = {};
          stepKeys.forEach(key => {
            loadedData[key] = Array.isArray(content[key]) ? content[key] : [];
          });
          setFormData(loadedData);
          
          setDocumentStatus(response.data.data.status || "draft");
          
          if (startStep) {
            const stepIndex = stepKeys.indexOf(startStep.toLowerCase());
            if (stepIndex >= 0) setCurrentStep(stepIndex);
          } else {
            setCurrentStep(getFirstUnfilledStep(loadedData));
          }
        }
      } catch (err) {
        console.error("Error fetching 8D ", err);
      }
    };
    fetchData();
  }, [eventNo, startStep]);

  // Add this useEffect for debugging
useEffect(() => {
  console.log("🔍 DEBUG - Current status:", {
    documentStatus,
    d0Status: formData.d0[0]?.status,
    currentStep,
    eventNo
  });
}, [documentStatus, formData, currentStep, eventNo]);

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-8xl mx-auto">
        <EightDStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={goToStep}
          stepData={formData}
        >
          {/* Form Content Wrapper - Clean & Responsive */}
          <div className="bg-white shadow-lg rounded-xl p-4 sm:p-5 mt-0 max-w-4xl mx-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                {currentStep === 0 && (
  <D0PlanContain 
    eventId={eventNo} 
    initialIsNcrBased={startedFromNcrFlow}
    updateParent={(rows) => {
      setFormData(prev => ({ ...prev, d0: rows }));
      // CRITICAL: Update documentStatus from D0 with proper logging
      if (rows[0]?.status) {
        console.log("📋 Parent received D0 status update:", rows[0].status);
        setDocumentStatus(rows[0].status);
      }
    }}
  />
)}
                {currentStep === 1 && (
                  <D1FormTeam 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d1: rows }))}
                  />
                )}
                {currentStep === 2 && (
                  <D2FormProblem 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d2: rows }))}
                  />
                )}
                {currentStep === 3 && (
                  <D3InterimContainment 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d3: rows }))}
                  />
                )}
                {currentStep === 4 && (
                  <D4RootCause 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d4: rows }))}
                  />
                )}
                {currentStep === 5 && (
                  <D5CorrectiveActions 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d5: rows }))}
                  />
                )}
                {currentStep === 6 && (
                  <D6Implementation 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d6: rows }))}
                  />
                )}
                {currentStep === 7 && (
                  <D7LessonsLearned 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d7: rows }))}
                  />
                )}
                {currentStep === 8 && (
                  <D8TeamReward 
                    eventId={eventNo} 
                    updateParent={(rows) => setFormData(prev => ({ ...prev, d8: rows }))}
                  />
                )}
                {currentStep === 9 && <FinalPreview eventId={eventNo} />}
              </motion.div>
            </AnimatePresence>

            {/* Clean Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 border-t pt-4 gap-3">
              <button 
                onClick={prevStep} 
                disabled={currentStep === 0} 
                className="px-5 py-2.5 w-full sm:w-auto rounded-lg font-medium bg-gray-100 text-gray-700 disabled:opacity-50 hover:bg-gray-200 transition duration-200 border border-gray-300 text-sm min-w-[120px]"
              >
                ⬅ Back
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="px-5 py-2.5 w-full sm:w-auto rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition duration-200 border border-blue-700 text-sm min-w-[120px]"
                >
                  Save & Next ➡
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  className="px-5 py-2.5 w-full sm:w-auto rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition duration-200 border border-green-700 text-sm min-w-[120px]"
                >
                  ✅ Submit Report
                </button>
              )}
            </div>
          </div>
        </EightDStepper>
      </div>
    </div>
  );
}
