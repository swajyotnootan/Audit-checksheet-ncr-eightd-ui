import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logoUrl from '../../assets/RenewsysLogo.png';
import { calendarAPI } from '../services/calendarApi'
import {
  ClipboardList,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Play
} from "lucide-react";

const PRODUCTION_FIELDS = [
  { id: 1, title: "Customer", type: "dropdown", options: ["RenH", "RenB", "RenP"] },
  { id: 2, title: "Production Order", type: "text" },
  { id: 3, title: "Order Date", type: "date" },
  { id: 4, title: "Item Code", type: "text" },
  { id: 5, title: "Description", type: "text" },
  { id: 6, title: "Product Line", type: "dropdown", options: ["BE1", "BE2", "BE6"] },
{ id: 7, title: "Planned Qty", type: "number" },
  { id: 8, title: "Completed Qty", type: "number" },
  { id: 9, title: "Status", type: "dropdown", options: ["UPCOMING", "RUNNING", "COMPLETED", "FINISHED"] },
  { id: 10, title: "Expected Completion Time", type: "datetime-local" },
  { id: 11, title: "Gross Width (mm)", type: "number" },
  { id: 12, title: "Remarks", type: "text" },
];

const fieldRowsData = PRODUCTION_FIELDS.map(item => ({
  sn: String(item.id),
  label: item.title,
  type: item.type,
  options: item.options || []
}));

// Status display mapping function
const getDisplayStatus = (status) => {
  const statusMap = {
    'UPCOMING': 'Open',
    'RUNNING': 'In Progress',
    'COMPLETED': 'Closed',
    'FINISHED': 'Closed',
    'PAUSED': 'Paused'
  };
  return statusMap[status] || status;
};

export default function EditFormOperator({ onClose, orderId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicLogo, setDynamicLogo] = useState(null);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const completedQtyRef = useRef(null);
  
  // Operator-specific state
  const [operatorAssignedQty, setOperatorAssignedQty] = useState(0);
  const [operatorCompletedQty, setOperatorCompletedQty] = useState(0);
  const [operatorRemainingQty, setOperatorRemainingQty] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("UPCOMING");
  const [lineContributions, setLineContributions] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [showStartJobButton, setShowStartJobButton] = useState(false);

  const initialRows = fieldRowsData.reduce((acc, row) => {
    acc[row.sn] = "";
    return acc;
  }, {});

  const [formData, setFormData] = useState({
    rows: initialRows,
    checkedBy: "",
    role: "",
    checkedDate: new Date().toISOString().split('T')[0],
    checkedTime: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    formName: "Production Planning Form"
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const userLine = user?.field?.toUpperCase() || "";
  const isSupervisor = user?.field === 'site-supervisor';

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch('https://internalaudit.hub.swajyot.co.in:8090/api/logo');
        if (response.ok) {
          const blob = await response.blob();
          setDynamicLogo(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.warn('Failed to load dynamic logo:', err);
      }
    };
    fetchLogo();
    return () => {
      if (dynamicLogo) URL.revokeObjectURL(dynamicLogo);
    };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setFormData(prev => ({
          ...prev,
          checkedBy: user.name || user.username || "",
          role: user.role || ""
        }));
      } catch (error) {
        console.warn("Invalid user data");
      }
    }
    
    if (orderId) {
      loadExistingInspection(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId && completedQtyRef.current) {
      completedQtyRef.current.focus();
    }
  }, [orderId]);

  const loadExistingInspection = async (id) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/public/json-data/${id}`);
      if (response.data.success) {
        const existingData = JSON.parse(response.data.data.jsonContent);
        setOrderData(existingData);
        
        console.log("📥 Raw existing data:", existingData);
        
        // Extract data from nested JSON structure
        const rowsData = existingData.rows || {};
        const lineContributions = existingData.lineContributions || [];
        
        // Field mapping for nested structure
        const reverseFieldMapping = {
          "customer": "1",
          "productionOrder": "2", 
          "orderDate": "3",
          "itemCode": "4",
          "plannedQty": "7",
          "productLine": "6",
          "description": "5",
          "completedQty": "8",
          "status": "9",
          "expectedCompletion": "10",
          "grossWidth": "11", 
          "remarks": "12"
        };

        const numberedRows = {};
        Object.keys(rowsData).forEach(fieldName => {
          const rowNumber = reverseFieldMapping[fieldName];
          if (rowNumber) {
            numberedRows[rowNumber] = rowsData[fieldName];
          }
        });

        // Find operator's specific contribution from lineContributions
        const operatorContribution = lineContributions.find(cont => cont.line === userLine);
        
        // Calculate operator-specific quantities from lineContributions
        let opAssignedQty = 0;
        let opCompletedQty = 0;
        let operatorStatus = "UPCOMING";
        
        if (operatorContribution) {
          // Use line contribution data
          opAssignedQty = parseInt(operatorContribution.assignedQty) || 0;
          opCompletedQty = parseInt(operatorContribution.completedQty) || 0;
          operatorStatus = operatorContribution.status || "UPCOMING";
        } else {
          // If no line contribution found, show 0 assigned (operator not assigned to this work)
          opAssignedQty = 0;
          opCompletedQty = 0;
          operatorStatus = "UPCOMING";
        }
        
        const opRemainingQty = Math.max(0, opAssignedQty - opCompletedQty);

        console.log("🎯 Operator-specific data:", {
          userLine,
          operatorContribution,
          opAssignedQty,
          opCompletedQty,
          opRemainingQty,
          operatorStatus
        });

        // Set operator-specific state
        setOperatorAssignedQty(opAssignedQty);
        setOperatorCompletedQty(opCompletedQty);
        setOperatorRemainingQty(opRemainingQty);
        setCurrentStatus(operatorStatus);
        setLineContributions(lineContributions);
        
        // Check if we need to show "Start Job" button
        const needsStartJob = operatorStatus === 'UPCOMING' && !isSupervisor && opAssignedQty > 0;
        setShowStartJobButton(needsStartJob);

        setFormData(prev => ({
          ...prev,
          rows: numberedRows,
          checkedBy: existingData.checkedBy || prev.checkedBy,
          role: existingData.role || prev.role,
          checkedDate: existingData.checkedDate || prev.checkedDate,
          checkedTime: existingData.checkedTime || prev.checkedTime,
          formName: existingData.formName || "Production Planning Form"
        }));
      }
    } catch (error) {
      console.error("Error loading:", error);
      alert("Failed to load order data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartJob = async () => {
    try {
      setIsLoading(true);
      
      // Update production order status to RUNNING
      const updatedJsonContent = {
        ...orderData,
        rows: {
          ...orderData.rows,
          status: "RUNNING"
        },
        lineContributions: (orderData.lineContributions || []).map(contribution => {
          if (contribution.line === userLine) {
            return {
              ...contribution,
              status: 'RUNNING',
              dateStarted: new Date().toISOString(),
              operator: formData.checkedBy // Assign operator name
            };
          }
          return contribution;
        })
      };

      await axios.put(`https://internalaudit.hub.swajyot.co.in:8090
/api/public/json-data/${orderId}`, {
        jsonContent: JSON.stringify(updatedJsonContent)
      });

      // Update calendar event status to RUNNING
      try {
        const events = await calendarAPI.getEventsByProductionOrder(orderId);
        if (events.length > 0) {
          await calendarAPI.updateEventStatus(events[0].id, 'RUNNING');
        }
      } catch (calendarError) {
        console.warn('Could not update calendar event status:', calendarError);
      }

      // Update local state
      setCurrentStatus("RUNNING");
      setShowStartJobButton(false);
      
      // Update line contributions
      const updatedContributions = (orderData.lineContributions || []).map(contribution => {
        if (contribution.line === userLine) {
          return {
            ...contribution,
            status: 'RUNNING',
            dateStarted: new Date().toISOString(),
            operator: formData.checkedBy
          };
        }
        return contribution;
      });
      setLineContributions(updatedContributions);

      alert("✅ Job started successfully! You can now update your progress.");
      
    } catch (error) {
      console.error("Error starting job:", error);
      alert("❌ Failed to start job");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowChange = (sn, value) => {
    setFormData(prev => ({
      ...prev,
      rows: { ...prev.rows, [sn]: value }
    }));
    if (errors[sn]) {
      setErrors(prev => ({ ...prev, [sn]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const additionalQty = formData.rows["8"];
    const remarks = formData.rows["12"];

    // Prevent editing if work is completed
    if (currentStatus === 'COMPLETED' && !isSupervisor) {
      newErrors["general"] = "This work is already completed and cannot be edited.";
    }

    if (!additionalQty || additionalQty === "") {
      newErrors["8"] = "Quantity is required.";
    } else {
      const qty = Number(additionalQty);
      if (isNaN(qty) || qty <= 0) {
        newErrors["8"] = "Quantity must be a positive number.";
      } else if (qty > operatorRemainingQty) {
        newErrors["8"] = `Quantity (${qty}) cannot exceed your remaining quantity (${operatorRemainingQty}).`;
      }
    }

    if (remarks && remarks.length > 200) {
      newErrors["12"] = "Remarks must be 200 characters or fewer.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProgress = async () => {
    if (!orderId) return alert("No order selected.");
    if (!validateForm()) return;
    
    // Prevent operators from editing completed work
    if (currentStatus === 'COMPLETED' && !isSupervisor) {
      alert("❌ This work is already completed and cannot be edited.");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const additionalQty = parseInt(formData.rows["8"] || 0);
      
      if (isNaN(additionalQty) || additionalQty <= 0) {
        alert("Please enter a valid quantity to add");
        return;
      }

      if (additionalQty > operatorRemainingQty) {
        alert(`Additional quantity (${additionalQty}) cannot exceed your remaining quantity (${operatorRemainingQty})`);
        return;
      }

      const newOperatorCompleted = operatorCompletedQty + additionalQty;
      const totalOrderCompleted = parseInt(orderData?.rows?.completedQty || 0) + additionalQty;

      // Field mapping for payload
      const fieldMapping = {
        "1": "customer",
        "2": "productionOrder", 
        "3": "orderDate",
        "4": "itemCode",
        "5": "description",
        "6": "productLine",
        "7": "plannedQty",
        "8": "completedQty",
        "9": "status",
        "10": "expectedCompletion",
        "11": "grossWidth",
        "12": "remarks"
      };

      const namedRows = {};
      Object.keys(formData.rows).forEach(key => {
        const fieldName = fieldMapping[key];
        if (fieldName) {
          namedRows[fieldName] = formData.rows[key];
        }
      });

      // Update total completed quantity for the entire order
      namedRows.completedQty = totalOrderCompleted.toString();
      
      // Enhanced status management
      let newStatus = currentStatus;
      if (currentStatus === "UPCOMING") {
        newStatus = "RUNNING";
      }
      
      namedRows.status = newStatus;

      // Enhanced line contributions tracking for split distribution
      const updatedContributions = [...(orderData.lineContributions || [])];
      const currentContributionIndex = updatedContributions.findIndex(
        cont => cont.line === userLine
      );

      if (currentContributionIndex >= 0) {
        // Update existing contribution
        updatedContributions[currentContributionIndex] = {
          ...updatedContributions[currentContributionIndex],
          completedQty: newOperatorCompleted,
          status: newStatus,
          operator: formData.checkedBy,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Add new contribution entry (should not happen if properly assigned)
        updatedContributions.push({
          line: userLine,
          operator: formData.checkedBy,
          completedQty: newOperatorCompleted,
          assignedQty: operatorAssignedQty,
          dateStarted: new Date().toISOString(),
          status: newStatus,
          lastUpdated: new Date().toISOString()
        });
      }

      const updatedJsonContent = {
        ...orderData,
        rows: namedRows,
        checkedBy: formData.checkedBy,
        role: formData.role,
        checkedDate: formData.checkedDate,
        checkedTime: formData.checkedTime,
        lineContributions: updatedContributions
      };

      await axios.put(`https://internalaudit.hub.swajyot.co.in:8090
/api/public/json-data/${orderId}`, {
        jsonContent: JSON.stringify(updatedJsonContent)
      });

      // Update calendar event status if status changed
      if (currentStatus !== newStatus) {
        try {
          const events = await calendarAPI.getEventsByProductionOrder(orderId);
          if (events.length > 0) {
            await calendarAPI.updateEventStatus(events[0].id, newStatus);
          }
        } catch (calendarError) {
          console.warn('Could not update calendar event status:', calendarError);
        }
      }

      // Update operator-specific quantities
      setOperatorCompletedQty(newOperatorCompleted);
      setOperatorRemainingQty(Math.max(0, operatorAssignedQty - newOperatorCompleted));
      setCurrentStatus(newStatus);
      setLineContributions(updatedContributions);
      
      setFormData(prev => ({
        ...prev,
        rows: {
          ...prev.rows,
          "8": "",
          "9": newStatus
        }
      }));

      alert(`✅ Added ${additionalQty} units! Your total completed: ${newOperatorCompleted}/${operatorAssignedQty}`);
      
    } catch (err) {
      console.error("Save error:", err);
      alert("Save failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!orderId) return alert("No order selected.");
    
    const confirmComplete = window.confirm(
      "Are you sure you want to mark YOUR WORK as COMPLETED?\n\n" +
      `You have completed ${operatorCompletedQty}/${operatorAssignedQty} units.\n` +
      "This will only complete your assigned portion. Other lines can continue their work."
    );
    
    if (!confirmComplete) return;
    
    try {
      setIsLoading(true);

      const additionalQty = parseInt(formData.rows["8"] || 0);
      const newOperatorCompleted = operatorCompletedQty + additionalQty;
      const totalOrderCompleted = parseInt(orderData?.rows?.completedQty || 0) + additionalQty;

      const fieldMapping = {
        "1": "customer",
        "2": "productionOrder",
        "3": "orderDate",
        "4": "itemCode",
        "5": "description",
        "6": "productLine", 
        "7": "plannedQty",
        "8": "completedQty",
        "9": "status",
        "10": "expectedCompletion",
        "11": "grossWidth",
        "12": "remarks"
      };

      const namedRows = {};
      Object.keys(formData.rows).forEach(key => {
        const fieldName = fieldMapping[key];
        if (fieldName) {
          namedRows[fieldName] = formData.rows[key];
        }
      });

      // Update total completed quantity
      namedRows.completedQty = totalOrderCompleted.toString();
      
      // Don't change main order status - only line status
      namedRows.status = orderData?.rows?.status || "RUNNING";

      // Update only the current operator's line contribution
      const updatedContributions = (orderData.lineContributions || []).map(contribution => {
        if (contribution.line === userLine) {
          return {
            ...contribution,
            completedQty: newOperatorCompleted,
            status: 'COMPLETED', // Mark only THIS line as completed
            operator: formData.checkedBy,
            dateCompleted: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
        }
        return contribution;
      });

      // Calculate if all lines are completed for main order status
      const allLinesCompleted = updatedContributions.every(cont => 
        cont.status === 'COMPLETED'
      );
      
      const mainOrderStatus = allLinesCompleted ? 'COMPLETED' : (orderData?.rows?.status || "RUNNING");

      const updatedJsonContent = {
        ...orderData,
        rows: {
          ...namedRows,
          status: mainOrderStatus
        },
        checkedBy: formData.checkedBy,
        role: formData.role,
        checkedDate: formData.checkedDate,
        checkedTime: formData.checkedTime,
        lineContributions: updatedContributions
      };

      await axios.put(`https://internalaudit.hub.swajyot.co.in:8090
/api/public/json-data/${orderId}`, {
        jsonContent: JSON.stringify(updatedJsonContent)
      });

      // Update operator-specific quantities
      setOperatorCompletedQty(newOperatorCompleted);
      setOperatorRemainingQty(0);
      setCurrentStatus("COMPLETED");
      setLineContributions(updatedContributions);

      alert(`✅ Your work marked as COMPLETED! You finished ${newOperatorCompleted}/${operatorAssignedQty} units.`);
      
      if (onClose) onClose();
      
    } catch (err) {
      console.error("Complete error:", err);
      alert("Completion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if operator can edit this work
  const canEditWork = () => {
    if (isSupervisor) return true;
    return currentStatus !== 'COMPLETED' && currentStatus !== 'FINISHED';
  };

  // Get dynamic heading based on status
  const getHeading = () => {
    if (isSupervisor) return 'Edit Production Plan';
    
    switch (currentStatus) {
      case 'UPCOMING':
        return 'Start Production Work';
      case 'RUNNING':
        return 'Update Production Progress';
      case 'COMPLETED':
        return 'Work Completed - View Only';
      case 'FINISHED':
        return 'Work Finished - View Only';
      default:
        return 'Update Production Progress';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 relative mt-20 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order data...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "—") return "—";
    return dateStr.split('T')[0]?.split('-').reverse().join('/') || dateStr;
  };

  // Calculate progress percentage
  const operatorProgress = operatorAssignedQty > 0 ? (operatorCompletedQty / operatorAssignedQty) * 100 : 0;
  const totalOrderQty = parseInt(orderData?.rows?.plannedQty || 0);

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <button
          className="px-4 py-2 text-blue-600 font-semibold flex items-center gap-2 hover:text-blue-800 transition-colors"
          onClick={() => {
            if (onClose) onClose();
            else navigate('/dashboard');
          }}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1 className="text-3xl capitalize text-gray-900 text-center">
          {getHeading()}
        </h1>
        <div className="w-24"></div>
      </div>

      {/* Operator Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Order ID:</strong> {orderId}
          </div>
          <div>
            <strong>Your Line:</strong> {userLine}
          </div>
          <div>
            <strong>Your Status:</strong> 
            <span className={`ml-2 px-2 py-1 rounded ${
              currentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              currentStatus === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
              currentStatus === 'UPCOMING' ? 'bg-gray-100 text-gray-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {getDisplayStatus(currentStatus)}
            </span>
          </div>
          <div>
            <strong>AssignedBY:</strong> {formData.checkedBy}
          </div>
        </div>
        
        {/* Operator-Specific Progress - Now showing assigned quantity from lineContributions */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Your Assigned:</strong> {operatorAssignedQty.toLocaleString()} units
          </div>
          <div>
            <strong>You Completed:</strong> {operatorCompletedQty.toLocaleString()} units
          </div>
          <div>
            <strong>Your Remaining:</strong> {operatorRemainingQty.toLocaleString()} units
          </div>
          <div>
            <strong>Your Progress:</strong> {operatorProgress.toFixed(1)}%
          </div>
        </div>

        {/* Show message if operator has no assigned work */}
        {operatorAssignedQty === 0 && !isSupervisor && (
          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                No work assigned to your line ({userLine}) for this order.
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {operatorAssignedQty > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Your Personal Progress</span>
              <span>{operatorProgress.toFixed(1)}% ({operatorCompletedQty}/{operatorAssignedQty})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(operatorProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Warning for completed work */}
        {currentStatus === 'COMPLETED' && !isSupervisor && (
          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                This work is completed and cannot be edited.
              </span>
            </div>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
      >
        <div className="w-full bg-white rounded-full-3xl shadow-lg">
          <div className="h-3 bg-[linear-gradient(90deg,#4BB662,#F7931E,#4BB662_100%)]"></div>
          <div className="bg-[linear-gradient(#0096D6,#003B82_0%,#0096D6_40%,#0096D6_100%)] text-center py-5 flex justify-center items-center gap-4 border-b border-gray-300 rounded-t-2xl relative">
            <img
              src={dynamicLogo || logoUrl}
              alt="Company Logo"
              className="absolute left-6 top-1/2 transform -translate-y-1/2 h-16 w-auto"
              onError={(e) => (e.target.src = logoUrl)}
            />
            <ClipboardList size={28} className="text-white" />
            <h2 className="text-2xl md:text-3xl font-semibold capitalize text-white">
              {getHeading()}
            </h2>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details (View Only)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-400 rounded-lg">
                <thead>
                  <tr className="bg-gray-100">
                    {fieldRowsData.map((field) => (
                      <th
                        key={field.sn}
                        className="border border-gray-300 px-3 py-2 font-medium text-gray-700"
                      >
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fieldRowsData.map((field) => {
  let displayValue = formData.rows[field.sn] || "—";
  if (field.sn === "3" || field.sn === "10") {
    displayValue = formatDate(formData.rows[field.sn]);
  }
  if (field.sn === "6") {
    // Show operator's specific line instead of the general product line
    displayValue = userLine || "—";
  }
  if (field.sn === "7") {
    // Show "Assigned Qty" for the operator's specific line
    displayValue = operatorAssignedQty.toLocaleString();
  }
  if (field.sn === "8") {
    displayValue = operatorCompletedQty.toLocaleString() || "0";
  }
  if (field.sn === "9") {
    displayValue = getDisplayStatus(orderData?.rows?.status || "UPCOMING");
  }
  return (
    <td
      key={field.sn}
      className="border border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium"
    >
      {displayValue}
    </td>
  );
})}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Operator Progress Update Form */}
          {!isSupervisor && operatorAssignedQty > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {currentStatus === 'UPCOMING' ? 'Ready to Start Work' : 'Update Your Progress'}
              </h3>
              
              {/* Start Job Button */}
              {showStartJobButton && (
                <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">Ready to start your assigned work?</h4>
                      <p className="text-sm text-green-700">
                        You have been assigned {operatorAssignedQty.toLocaleString()} units. Click Start Job to begin.
                      </p>
                    </div>
                    <button
                      onClick={handleStartJob}
                      disabled={isLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start Job
                    </button>
                  </div>
                </div>
              )}

              {/* Error message for completed work */}
              {errors.general && (
                <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-red-800">{errors.general}</span>
                  </div>
                </div>
              )}

              {/* Progress Update Form */}
              {currentStatus === 'RUNNING' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-gray-700 font-medium">
                      Quantity Completed This Session <span className="text-red-500">*</span>
                    </label>
                    <input
  ref={completedQtyRef}
  type="number"
  defaultValue="" // This sets initial value but allows changes
  onChange={(e) => handleRowChange("8", e.target.value)}
  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
    errors["8"] ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-yellow-400"
  } ${!canEditWork() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
  placeholder="Enter quantity completed in this work session"
  min="1"
  max={operatorRemainingQty}
  disabled={!canEditWork() || isLoading}
/>
                    {errors["8"] && <p className="text-red-500 text-sm">{errors["8"]}</p>}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>Your Assignment:</strong> {operatorAssignedQty.toLocaleString()} units</p>
                      <p className="text-blue-600"><strong>You Completed:</strong> {operatorCompletedQty.toLocaleString()} units</p>
                      <p className="text-green-600"><strong>You Can Add:</strong> {operatorRemainingQty.toLocaleString()} units</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-gray-700 font-medium">
                      Remarks (max 200 characters)
                    </label>
                    <textarea
                      value={formData.rows["12"] || ""}
                      onChange={(e) => handleRowChange("12", e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors["12"] ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-yellow-400"
                      } ${!canEditWork() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter remarks about your progress..."
                      rows="1"
                      maxLength={200}
                      disabled={!canEditWork() || isLoading}
                    />
                    {errors["12"] && <p className="text-red-500 text-sm">{errors["12"]}</p>}
                    <p className="text-xs text-gray-500 text-right">
                      {formData.rows["12"]?.length || 0}/200 characters
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Summary */}
          <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">
              {isSupervisor ? 'Order Progress Summary' : 'Your Progress Summary'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-600">{isSupervisor ? 'Total Planned:' : 'Your Target:'}</span> 
                {isSupervisor ? totalOrderQty.toLocaleString() : operatorAssignedQty.toLocaleString()} units
              </div>
              <div>
                <span className="text-blue-600">{isSupervisor ? 'Total Completed:' : 'You Completed:'}</span> 
                {isSupervisor ? (orderData?.rows?.completedQty || 0) : operatorCompletedQty.toLocaleString()} units
              </div>
              <div>
                <span className="text-orange-600">{isSupervisor ? 'Total Remaining:' : 'Your Remaining:'}</span> 
                {isSupervisor ? 
                  Math.max(0, totalOrderQty - (orderData?.rows?.completedQty || 0)).toLocaleString() : 
                  operatorRemainingQty.toLocaleString()
                } units
              </div>
              <div>
                <span className="text-purple-600">Progress:</span> 
                {isSupervisor ? 
                  `${totalOrderQty ? (((orderData?.rows?.completedQty || 0) / totalOrderQty) * 100).toFixed(1) : 0}%` : 
                  `${operatorProgress.toFixed(1)}%`
                }
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            {!isSupervisor && operatorAssignedQty > 0 && canEditWork() && currentStatus === 'RUNNING' && (
              <>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-1 hover:bg-green-700 transition disabled:bg-gray-400"
                  onClick={handleSaveProgress}
                  disabled={isLoading}
                >
                  <Save size={16} /> Save Progress
                </button>
                <button
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  onClick={handleCompleteWork}
                  disabled={isLoading}
                >
                  <CheckCircle size={16} />
                  Mark as Completed
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}