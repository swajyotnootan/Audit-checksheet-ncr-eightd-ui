// src/components/EightDStepper.jsx
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ArrowRight, ArrowDown, Layout, Grid } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function EightDStepper({ steps, currentStep, onStepClick, stepData, children }) {
  const [orientation, setOrientation] = useState("horizontal");
  const progress = useMotionValue(0);
  const prevStep = useRef(currentStep);

  useEffect(() => {
    progress.set(currentStep);
  }, [currentStep, progress]);

  const isStepCompleted = (index) => {
    if (!stepData) return false;
    
    const stepKey = `d${index}`;
    const stepContent = stepData[stepKey];
    
    if (Array.isArray(stepContent)) {
      return stepContent.length > 0;
    }
    
    return false;
  };

  const getStepStatus = (index) => {
    if (index === currentStep) return "current";
    if (isStepCompleted(index)) return "completed";
    return "pending";
  };

  const getStepIcon = (index) => <span className="text-xs font-medium">{`D${index}`}</span>;

  const getStepColors = (status) => {
    switch (status) {
      case "completed": 
        return { 
          bg: "from-green-500 to-emerald-600", 
          border: "border-green-500", 
          text: "text-white", 
          pulse: "bg-green-400/30",
          glow: "shadow-md shadow-green-500/20"
        };
      case "current": 
        return { 
          bg: "from-blue-500 to-indigo-600", 
          border: "border-blue-500", 
          text: "text-white", 
          pulse: "bg-blue-400/30",
          glow: "shadow-md shadow-blue-500/20"
        };
      default: 
        return { 
          bg: "from-gray-200 to-gray-300", 
          border: "border-gray-300", 
          text: "text-gray-700", 
          pulse: "bg-gray-200/30",
          glow: ""
        };
    }
  };

  const getConnectorColors = (index) => {
    return isStepCompleted(index) ? "from-green-400 to-blue-500" : "from-gray-200 to-gray-300";
  };

  const getAnimateProps = (index) => {
    const direction = prevStep.current < currentStep ? 1 : -1;
    const scale = index === currentStep ? 1.1 : 1;
    return { scale };
  };

  const defaultStepNames = [
    "Plan & Contain",
    "Form Team", 
    "Problem",
    "Interim Contain",
    "Root Cause",
    "Corrective Action",
    "Implement",
    "Prevent",
    "Close & Recognize",
    "Preview"
  ];

  return (
    <div className="w-full relative">
      {/* Toggle Button - Fixed on Right Side like Share Button */}
      <div className="fixed top-24 right-6 z-40">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 flex items-center space-x-1">
          <button
            onClick={() => setOrientation("horizontal")}
            className={`p-2 rounded-md transition-all duration-200 ${
              orientation === "horizontal" 
                ? "bg-blue-500 text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Horizontal Layout"
          >
            <Layout size={18} />
          </button>
          <button
            onClick={() => setOrientation("vertical")}
            className={`p-2 rounded-md transition-all duration-200 ${
              orientation === "vertical" 
                ? "bg-blue-500 text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Vertical Layout"
          >
            <Grid size={18} />
          </button>
        </div>
      </div>

      {/* Main Content - Proper Alignment */}
      <div className={`${orientation === "vertical" ? "flex flex-col lg:flex-row gap-4" : "flex flex-col"}`}>
        
        {/* Stepper */}
        <AnimatePresence mode="wait">
          {orientation === "horizontal" ? (
            <motion.div
              key="horizontal"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <HorizontalStepper 
                steps={steps}
                currentStep={currentStep}
                onStepClick={onStepClick}
                stepData={stepData}
                getStepStatus={getStepStatus}
                getStepColors={getStepColors}
                getStepIcon={getStepIcon}
                getConnectorColors={getConnectorColors}
                getAnimateProps={getAnimateProps}
                defaultStepNames={defaultStepNames}
                isStepCompleted={isStepCompleted}
                prevStep={prevStep}
              />
            </motion.div>
          ) : (
            <motion.div
              key="vertical"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="w-full lg:w-56 flex-shrink-0"
            >
              <VerticalStepper 
                steps={steps}
                currentStep={currentStep}
                onStepClick={onStepClick}
                stepData={stepData}
                getStepStatus={getStepStatus}
                getStepColors={getStepColors}
                getStepIcon={getStepIcon}
                getConnectorColors={getConnectorColors}
                getAnimateProps={getAnimateProps}
                defaultStepNames={defaultStepNames}
                isStepCompleted={isStepCompleted}
                prevStep={prevStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Content - Responsive & Clean */}
        <div className={`${orientation === "vertical" ? "flex-1 min-w-0" : "w-full mt-28"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Centered Horizontal Stepper with Fixed Header
function HorizontalStepper({ 
  steps, currentStep, onStepClick, stepData, getStepStatus, getStepColors, 
  getStepIcon, getConnectorColors, getAnimateProps, defaultStepNames, isStepCompleted, prevStep 
}) {
  return (
    <div className="w-full fixed top-20 left-0 right-0 z-30 ">
      <div className="w-full max-w-4xl mx-auto px-2 py-3">
        <div className="relative p-4 rounded-xl bg-white shadow-lg border border-gray-200">
          {/* Centered Connector */}
          <div className="absolute top-1/3 -translate-y-1/3 left-8 right-8 h-0.5 z-0 flex items-center">
            {steps.slice(0, -1).map((_, index) => (
              <div key={index} className="relative flex-1 h-0.5">
                <div className={`w-full h-0.5 bg-gradient-to-r ${getConnectorColors(index)} rounded-full`} />
                {/* Arrow marks for completed steps */}
                {isStepCompleted(index) && (
                  <motion.div
                    className="absolute right-10 top-1/2 -translate-y-1/2 transform"
                    animate={{ x: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                  >
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Centered Steps */}
          <div className="flex justify-between relative z-10">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const colors = getStepColors(status);
              const stepName = defaultStepNames[index] || `D${index}`;

              return (
                <div key={index} className="flex flex-col items-center flex-1 max-w-[80px] py-1 relative">
                  {/* Stepper Circle */}
                  <div className="relative w-10 h-10 flex items-center justify-center mb-2">
                    <motion.div
                      onClick={() => {
                        prevStep.current = currentStep;
                        onStepClick(index);
                      }}
                      initial={false}
                      animate={getAnimateProps(index)}
                      whileHover={{
                        scale: 1.05,
                        y: -1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`cursor-pointer w-full h-full rounded-full border-2 ${colors.border} ${colors.glow}
                        bg-gradient-to-br ${colors.bg} ${colors.text}
                        shadow-sm flex items-center justify-center transition-all duration-200
                        hover:shadow-md relative z-10`}
                    >
                      {status === "current" && (
                        <motion.div
                          className={`absolute inset-0 rounded-full ${colors.pulse}`}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      )}
                      {getStepIcon(index)}
                    </motion.div>
                  </div>

                  {/* Step Name */}
                  <span
                    className={`text-xs text-center leading-tight px-1 break-words ${
                      status === "current" ? "text-blue-600 font-semibold" : 
                      status === "completed" ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    {stepName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Right-aligned Vertical Stepper with Sidebar Sticky
function VerticalStepper({ 
  steps, currentStep, onStepClick, stepData, getStepStatus, getStepColors, 
  getStepIcon, getConnectorColors, getAnimateProps, defaultStepNames, isStepCompleted, prevStep 
}) {
  return (
    <div className="w-[250px] fixed mt-4 lg:top-20 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="p-4 rounded-xl bg-white shadow-lg border border-gray-200 relative">
        {/* Vertical Connector */}
        <div className="absolute top-8 bottom-6 left-8 w-0.5 z-0 flex flex-col justify-between py-4">
          {steps.slice(0, -1).map((_, index) => (
            <div key={index} className="relative flex-1 w-0.5">
              <div className={`w-0.5 h-full bg-gradient-to-b ${getConnectorColors(index)} rounded-full`} />
              {/* Arrow marks for completed steps */}
              {isStepCompleted(index) && (
                <motion.div
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 transform"
                  animate={{ y: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                >
                  <ArrowDown className="w-4 h-4 text-blue-500" />
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Vertical Steps */}
        <div className="space-y-4 relative z-10">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const colors = getStepColors(status);
            const stepName = defaultStepNames[index] || `D${index}`;

            return (
              <div key={index} className="flex items-center space-x-3 relative">
                {/* Stepper Circle */}
                <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    onClick={() => {
                      prevStep.current = currentStep;
                      onStepClick(index);
                    }}
                    initial={false}
                    animate={getAnimateProps(index)}
                    whileHover={{
                      scale: 1.05,
                      x: 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`cursor-pointer w-full h-full rounded-full border-2 ${colors.border} ${colors.glow}
                      bg-gradient-to-br ${colors.bg} ${colors.text}
                      shadow-sm flex items-center justify-center transition-all duration-200
                      hover:shadow-md relative z-10`}
                  >
                    {status === "current" && (
                      <motion.div
                        className={`absolute inset-0 rounded-full ${colors.pulse}`}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    )}
                    {getStepIcon(index)}
                  </motion.div>
                </div>

                {/* Step Name */}
                <span
                  className={`text-sm flex-1 ${
                    status === "current" ? "text-blue-600 font-semibold" : 
                    status === "completed" ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  {stepName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}