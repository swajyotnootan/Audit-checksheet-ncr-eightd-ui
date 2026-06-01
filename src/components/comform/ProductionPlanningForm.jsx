import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logoUrl from '../../assets/RenewsysLogo.png';
import EmailNotificationModal from './EmailNotificationModal';
import calendarAPI from '../../components/services/calendarApi';
import {
  ClipboardList,
  FileText,
  Eye,
  Save,
  ArrowLeft,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  Divide,
  Target,
  Repeat,
  AlertTriangle
} from "lucide-react";

const PRODUCTION_FIELDS = [
  { id: 1, title: "Customer", type: "dropdown", options: ["RenH", "RenB", "RenP"] },
  { id: 2, title: "Production Order", type: "text" },
  { id: 3, title: "Order Date", type: "date" },
  { id: 4, title: "Item Code", type: "text" },
  { id: 5, title: "Planned Qty", type: "number" },
  { id: 6, title: "Product Line", type: "dropdown", options: ["BE1", "BE2", "BE6"] },
  { id: 7, title: "Description", type: "text" },
  { id: 11, title: "Gross Width (mm)", type: "number" },
  { id: 12, title: "Remarks", type: "text" },
];

const fieldRowsData = PRODUCTION_FIELDS.map(item => ({
  sn: String(item.id),
  label: item.title,
  type: item.type,
  options: item.options || []
}));

const smartSplitQuantity = (totalQty, numLines) => {
  const total = parseInt(totalQty) || 0;
  if (total <= 0 || numLines <= 0) return Array(numLines).fill(0);
  const baseQty = Math.floor(total / numLines);
  const remainder = total % numLines;
  const distribution = Array(numLines).fill(baseQty);
  for (let i = 0; i < remainder; i++) {
    distribution[i] += 1;
  }
  return distribution;
};

const getNextAvailableLine = (currentLines) => {
  const availableLines = ["BE1", "BE2", "BE6"];
  const usedLines = currentLines.map(line => line.line);
  const nextLine = availableLines.find(line => !usedLines.includes(line));
  return nextLine || "BE1";
};

export default function ProductionPlanningForm({ onClose, editInspectionId, onSave, prefill }) {
  const [inspectionId, setInspectionId] = useState(editInspectionId || null);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);
  const [viewType, setViewType] = useState("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicLogo, setDynamicLogo] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [existingData, setExistingData] = useState(null);
  const [lineContributions, setLineContributions] = useState([]);
  const [isReassigning, setIsReassigning] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState(new Date().toISOString().slice(0, 16));
  const [eventEnd, setEventEnd] = useState(new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16));
  const [eventLine, setEventLine] = useState('BE1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');
  const [eventError, setEventError] = useState('');

  const [enableSplit, setEnableSplit] = useState(false);
  const [distributionLines, setDistributionLines] = useState([{ line: "BE1", quantity: 0 }]);
  const [totalPlannedQty, setTotalPlannedQty] = useState(0);

  const navigate = useNavigate();
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
    startTime: null,
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const isSupervisor = user?.field === 'site-supervisor';
  const userLine = user?.line;

  // Check if job can be deleted
  // Check if job can be deleted
const canDeleteJob = () => {
  // If no inspection ID, it's a new job (nothing to delete)
  if (!inspectionId) return false;
  
  // If no line contributions yet, job can be deleted
  if (!lineContributions || lineContributions.length === 0) return true;
  
  // Check if any line has actually STARTED work (not just scheduled)
  const hasWorkActuallyStarted = lineContributions.some(contribution => {
    const hasCompletedQty = (contribution.completedQty || 0) > 0;
    const isInProgress = contribution.status === 'RUNNING' || contribution.status === 'PAUSED';
    
    // Only consider work as started if status is RUNNING/PAUSED OR completed quantity > 0
    // UPCOMING/OPEN status with dateStarted but 0 completed quantity can still be deleted
    return hasCompletedQty || isInProgress;
  });
  
  // Job can be deleted if NO work has actually started on any line
  return !hasWorkActuallyStarted;
};

  const isAnyLineInProgress = () => {
    if (!lineContributions || lineContributions.length === 0) return false;
    return lineContributions.some(contribution => 
      contribution.status === 'RUNNING' || contribution.status === 'PAUSED'
    );
  };

  const isInProgress = isAnyLineInProgress();

  useEffect(() => {
    if (!eventTitle && formData.rows["2"]) setEventTitle(formData.rows["2"]);
    if (formData.rows["6"]) setEventLine(formData.rows["6"]);
  }, [formData.rows["2"], formData.rows["6"]]);

  useEffect(() => {
    if (formData.rows["2"]) {
      setEventTitle(formData.rows["2"]);
    }
  }, [formData.rows["2"]]);

  useEffect(() => {
    if (formData.rows["3"]) {
      const orderDate = formData.rows["3"];
      const startDateTime = `${orderDate}T09:00`;
      setEventStart(startDateTime);
      const endDateTime = new Date(new Date(startDateTime).getTime() + 2 * 3600000).toISOString().slice(0, 16);
      setEventEnd(endDateTime);
    }
  }, [formData.rows["3"]]);

  useEffect(() => {
    const plannedQty = parseInt(formData.rows["5"] || "0");
    setTotalPlannedQty(plannedQty);
    if (plannedQty > 0 && !enableSplit) {
      setDistributionLines([{ 
        line: formData.rows["6"] || "BE1", 
        quantity: plannedQty,
        completedQty: 0,
        status: "UPCOMING"
      }]);
    }
  }, [formData.rows["5"], formData.rows["6"], enableSplit]);

  const calculateRemainingQty = () => {
    const assignedQty = distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0);
    return Math.max(0, totalPlannedQty - assignedQty);
  };

  const remainingQty = calculateRemainingQty();

  const validateForm = () => {
    if (!formData.rows["2"]?.trim()) {
      alert("Please enter Production Order");
      return false;
    }
    if (!formData.rows["5"] || parseInt(formData.rows["5"]) <= 0) {
      alert("Please enter a valid Planned Quantity");
      return false;
    }
    // if (!formData.rows["6"]?.trim()) {
    //   alert("Please select a Product Line");
    //   return false;
    // }
    
    if (distributionLines.length === 0) {
      alert("At least one distribution line is required");
      return false;
    }
    
    if (distributionLines.some(dist => (parseInt(dist.quantity) || 0) <= 0)) {
      alert("All distribution lines must have a quantity greater than 0");
      return false;
    }
    
    const assignedQty = distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0);
    if (assignedQty !== totalPlannedQty) {
      alert(`Total assigned quantity (${assignedQty}) must equal planned quantity (${totalPlannedQty})`);
      return false;
    }
    
    return true;
  };

  const validateEventTimes = () => {
    const start = new Date(eventStart);
    const end = new Date(eventEnd);
    
    const timeDiff = end.getTime() - start.getTime();
    
    if (timeDiff <= 0) {
      setEventError("End time must be after start time");
      return false;
    }
    
    setEventError("");
    return true;
  };

  const validateLineAssignment = () => {
    if (!isSupervisor && formData.rows["6"] && userLine) {
      const selectedLine = formData.rows["6"];
      if (selectedLine !== userLine) {
        alert(`❌ You can only assign jobs to your own line (${userLine})`);
        return false;
      }
    }
    return true;
  };

  const applySmartSplit = () => {
    if (totalPlannedQty <= 0) {
      alert("Please enter a valid planned quantity first!");
      return;
    }
    if (distributionLines.length === 0) {
      alert("Please add at least one distribution line!");
      return;
    }
    const numLines = distributionLines.length;
    const smartDistribution = smartSplitQuantity(totalPlannedQty, numLines);
    const updatedLines = distributionLines.map((line, index) => ({
      ...line,
      quantity: smartDistribution[index] || 0
    }));
    setDistributionLines(updatedLines);
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/logo');
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
    if (editInspectionId) {
      loadExistingInspection(editInspectionId);
    }
  }, [editInspectionId]);

  const loadExistingInspection = async (id) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://localhost:8080/api/public/json-data/${id}`);
      if (response.data.success) {
        const existingData = JSON.parse(response.data.data.jsonContent);
        setExistingData(existingData);
        setLineContributions(existingData.lineContributions || []);
        const currentStatus = existingData.rows?.status || existingData.rows?.["9"];
        const plannedQty = parseInt(existingData.rows?.plannedQty || existingData.rows?.["5"] || 0);
        const completedQty = parseInt(existingData.rows?.completedQty || existingData.rows?.["8"] || 0);
        const remainingQty = plannedQty - completedQty;
        setIsReassigning(currentStatus === "COMPLETED" && remainingQty > 0);

        const reverseFieldMapping = {
          "customer": "1", "productionOrder": "2", "orderDate": "3", "itemCode": "4",
          "plannedQty": "5", "productLine": "6", "description": "7",
          "expectedCompletion": "10", "grossWidth": "11", "remarks": "12"
        };

        const numberedRows = { ...initialRows };
        Object.keys(existingData.rows || {}).forEach(fieldName => {
          const rowNumber = reverseFieldMapping[fieldName];
          if (rowNumber && numberedRows.hasOwnProperty(rowNumber)) {
            numberedRows[rowNumber] = existingData.rows[fieldName];
          }
        });

        setFormData(prev => ({
          ...prev,
          rows: numberedRows,
          checkedBy: existingData.checkedBy || prev.checkedBy,
          role: existingData.role || prev.role,
          checkedDate: existingData.checkedDate || prev.checkedDate,
          checkedTime: existingData.checkedTime || prev.checkedTime,
          startTime: existingData.startTime || null,
        }));
        setInspectionId(id);

        if (existingData.lineContributions && existingData.lineContributions.length > 0) {
          const distributions = existingData.lineContributions.map(contribution => ({
            line: contribution.line,
            quantity: contribution.assignedQty || contribution.completedQty || 0,
            completedQty: contribution.completedQty || 0,
            status: contribution.status || "UPCOMING"
          }));
          setDistributionLines(distributions);
          if (distributions.length > 1) setEnableSplit(true);
        }
      }
    } catch (error) {
      console.error("Error loading:", error);
      alert("Failed to load.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDistributionLine = () => {
    if (remainingQty <= 0) {
      alert("No remaining quantity to distribute!");
      return;
    }
    
    const nextLine = getNextAvailableLine(distributionLines);
    setDistributionLines(prev => [...prev, { 
      line: nextLine, 
      quantity: 0, 
      completedQty: 0, 
      status: "UPCOMING" 
    }]);
  };

  const handleRemoveDistributionLine = (index) => {
    if (distributionLines.length <= 1) {
      alert("At least one distribution line is required!");
      return;
    }
    setDistributionLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleDistributionLineChange = (index, field, value) => {
    setDistributionLines(prev => {
      const updated = [...prev];
      
      if (field === 'line') {
        const isLineUsed = prev.some((dist, i) => i !== index && dist.line === value);
        if (isLineUsed) {
          alert(`Line ${value} is already assigned to another distribution!`);
          return prev;
        }
        updated[index] = { ...updated[index], [field]: value };
      } 
      else if (field === 'quantity') {
        const newQty = parseInt(value) || 0;
        const currentAssigned = prev.reduce((sum, dist, i) => 
          i !== index ? sum + (parseInt(dist.quantity) || 0) : sum, 0
        );
        
        if (currentAssigned + newQty > totalPlannedQty) {
          alert(`Total assigned quantity (${currentAssigned + newQty}) cannot exceed planned quantity (${totalPlannedQty})`);
          return prev;
        }
        updated[index] = { ...updated[index], [field]: newQty };
      } 
      else {
        updated[index] = { ...updated[index], [field]: value };
      }
      
      return updated;
    });
  };

  const handleEnableSplit = (enabled) => {
    setEnableSplit(enabled);
    if (!enabled && distributionLines.length > 1) {
      const totalAssigned = distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0);
      setDistributionLines([{ line: formData.rows["6"] || "BE1", quantity: totalAssigned, completedQty: 0, status: "UPCOMING" }]);
    } else if (enabled && totalPlannedQty > 0) {
      const initialDistribution = [
        { line: "BE1", quantity: 0, completedQty: 0, status: "UPCOMING" },
        { line: "BE2", quantity: 0, completedQty: 0, status: "UPCOMING" }
      ];
      setDistributionLines(initialDistribution);
    }
  };

  const handleRowChange = (sn, value) => {
    if (isReassigning && sn !== "6") return;
    
    const alwaysEditableFields = ["5", "6", "11"];
    if (isInProgress && !alwaysEditableFields.includes(sn)) {
      return;
    }
    
    setFormData(prev => ({ ...prev, rows: { ...prev.rows, [sn]: value } }));
    if (sn === "6" && !enableSplit && distributionLines.length === 1) {
      setDistributionLines(prev => [{ ...prev[0], line: value }]);
    }
  };

  const handleCreateNewPlan = async () => {
    const storedUser = localStorage.getItem('user');
    let userObj = storedUser ? JSON.parse(storedUser) : null;
    const now = new Date();
    const fieldMapping = {
      "1": "customer", "2": "productionOrder", "3": "orderDate", "4": "itemCode",
      "5": "plannedQty", "6": "productLine", "7": "description",
      "8": "completedQty", "9": "status", "10": "expectedCompletion",
      "11": "grossWidth", "12": "remarks"
    };

    const namedRows = {};
    Object.keys(formData.rows).forEach(key => {
      const fieldName = fieldMapping[key];
      if (fieldName) namedRows[fieldName] = formData.rows[key];
    });

    namedRows.completedQty = "0";
    namedRows.status = "UPCOMING";

    const initialContributions = distributionLines.map(dist => ({
      line: dist.line,
      operator: "To be assigned",
      completedQty: 0,
      assignedQty: dist.quantity,
      dateStarted: now.toISOString(),
      status: 'UPCOMING'
    }));

    const payload = {
      rows: namedRows,
      checkedBy: userObj?.name || userObj?.username || "",
      role: userObj?.role || "SITE_SUPERVISOR",
      checkedDate: now.toISOString().split('T')[0],
      checkedTime: now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      startTime: now.toISOString(),
      formName: "Production Planning Form",
      status: "OPEN",
      lineContributions: initialContributions,
      distributionLines: distributionLines,
      totalPlannedQty: totalPlannedQty
    };

    try {
      setIsLoading(true);
      const res = await axios.post("http://localhost:8080/api/public/json-data", payload);
      if (res.data.success) {
        const id = res.data.data.id;
        setInspectionId(id);
        setFormData(prev => ({ ...prev, startTime: now.toISOString() }));
        setLineContributions(initialContributions);
        return id;
      }
    } catch (err) {
      console.error("Create error:", err);
      alert("Failed to create production plan.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsLoading(true);
      const assignedQty = distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0);
      if (assignedQty !== totalPlannedQty) {
        alert(`Total assigned quantity (${assignedQty}) must equal planned quantity (${totalPlannedQty})`);
        return;
      }
      if (!inspectionId) {
        const newId = await handleCreateNewPlan();
        if (!newId) return;
      } else {
        const fieldMapping = {
          "1": "customer", "2": "productionOrder", "3": "orderDate", "4": "itemCode",
          "5": "plannedQty", "6": "productLine", "7": "description",
          "8": "completedQty", "9": "status", "10": "expectedCompletion",
          "11": "grossWidth", "12": "remarks"
        };

        const namedRows = {};
        Object.keys(formData.rows).forEach(key => {
          const fieldName = fieldMapping[key];
          if (fieldName) namedRows[fieldName] = formData.rows[key];
        });

        if (isReassigning) {
          namedRows.completedQty = existingData?.rows?.completedQty || existingData?.rows?.["8"] || "0";
          namedRows.status = existingData?.rows?.status || existingData?.rows?.["9"] || "UPCOMING";
        } else {
          if (!namedRows.completedQty) namedRows.completedQty = "0";
          if (!namedRows.status) namedRows.status = "UPCOMING";
        }

        const updatedContributions = distributionLines.map(dist => {
          const existingContribution = lineContributions.find(lc => lc.line === dist.line);
          return {
            line: dist.line,
            operator: existingContribution?.operator || "To be assigned",
            completedQty: existingContribution?.completedQty || 0,
            assignedQty: dist.quantity,
            dateStarted: existingContribution?.dateStarted || new Date().toISOString(),
            status: existingContribution?.status || "UPCOMING"
          };
        });

        const payload = {
          rows: namedRows,
          checkedBy: formData.checkedBy,
          role: formData.role,
          checkedDate: formData.checkedDate,
          checkedTime: formData.checkedTime,
          startTime: formData.startTime,
          formName: "Production Planning Form",
          status: "OPEN",
          lineContributions: updatedContributions,
          distributionLines: distributionLines,
          totalPlannedQty: totalPlannedQty
        };

        await axios.put(`http://localhost:8080/api/public/json-data/${inspectionId}`, payload);
        setLineContributions(updatedContributions);
      }
      alert("✅ All fields and distribution saved!");
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      alert("Save failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Job Handler
  const handleDeleteJob = async () => {
    if (!inspectionId) return;
    
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this job assignment? This action cannot be undone and will remove:\n\n" +
      "• Production plan data\n" +
      "• Calendar events\n" +
      "• All associated records"
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsLoading(true);
      
      // Delete calendar events first
      try {
        console.log("Deleting calendar events for production order:", inspectionId);
        const events = await calendarAPI.getEventsByProductionOrder(inspectionId);
        if (events && events.length > 0) {
          for (const event of events) {
            await calendarAPI.deleteEvent(event.id);
            console.log(`✅ Deleted calendar event: ${event.id}`);
          }
        }
      } catch (calendarError) {
        console.warn("Could not delete calendar events:", calendarError);
        // Continue with deletion even if calendar events deletion fails
      }
      
      // Delete production plan data
      console.log("Deleting production plan:", inspectionId);
      await axios.delete(`http://localhost:8080/api/public/json-data/${inspectionId}`);
      
      alert("✅ Job assignment deleted successfully!");
      
      // Close or navigate away
      if (onClose) {
        onClose();
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      console.error("Delete job error:", error);
      alert(`❌ Failed to delete job: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log("Assign Job button clicked");
    
    try {
      setEventError('');
      
      if (!validateForm()) {
        return;
      }

      if (!validateLineAssignment()) {
        return;
      }

      // if (!validateEventTimes()) {
      //   console.warn("Event time validation warning:", eventError);
      //   const shouldContinue = window.confirm("There are issues with event times. Continue anyway?");
      //   if (!shouldContinue) return;
      // }

      const assignedQty = distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0);
      if (assignedQty !== totalPlannedQty) {
        alert(`Total assigned quantity (${assignedQty}) must equal planned quantity (${totalPlannedQty})`);
        return;
      }

      setIsLoading(true);

      let productionId = inspectionId;
      if (!productionId) {
        console.log("Creating new production plan...");
        productionId = await handleCreateNewPlan();
        if (!productionId) {
          alert("Failed to create production plan");
          return;
        }
        console.log("New production plan created with ID:", productionId);
      } else {
        console.log("Updating existing production plan:", productionId);
        await handleSaveAll();
      }

      console.log('📅 Creating calendar events for distribution lines:', distributionLines);
      
      const createdEvents = [];
      let eventCreationErrors = [];
      
      for (const distribution of distributionLines) {
        const eventPayload = {
          title: eventTitle || formData.rows["2"] || `Production Order #${productionId}`,
          start: eventStart,
          end: eventEnd,
          location: distribution.line,
          category: 'work',
          priority: 'medium',
          isAllDay: false,
          isRecurring: isRecurring,
          recurrencePattern: isRecurring ? recurrencePattern : null,
          attendees: [],
          reminders: [{ type: 'popup', minutes: 15 }],
          assignedLine: distribution.line,
          productionOrderId: productionId.toString(),
          status: 'UPCOMING',
          description: `Production job: ${formData.rows["7"] || 'No description'} | Order: ${formData.rows["2"] || 'N/A'} | Assigned Qty: ${distribution.quantity}`
        };

        console.log(`🔄 Creating calendar event for line ${distribution.line}:`, eventPayload);
        try {
          const event = await calendarAPI.createEvent(eventPayload);
          createdEvents.push(event);
          console.log(`✅ Calendar event created for line ${distribution.line}`);
        } catch (eventError) {
          console.error(`Failed to create event for line ${distribution.line}:`, eventError);
          eventCreationErrors.push(`Line ${distribution.line}: ${eventError.message || 'Unknown error'}`);
        }
      }

      console.log(`✅ Created ${createdEvents.length} calendar events for ${distributionLines.length} lines`);
      
      if (eventCreationErrors.length > 0) {
        console.warn("Some calendar events failed to create:", eventCreationErrors);
      }

      await handleProceedAfterEmail();
      
    } catch (err) {
      console.error("Job assignment error:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setEventError(errorMessage);
      alert(`Job assignment failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (prefill) {
      if (prefill.start) setEventStart(prefill.start);
      if (prefill.end) setEventEnd(prefill.end);
    }
  }, [prefill]);

  const handleProceedAfterEmail = async () => {
    console.log("handleProceedAfterEmail called");
    try {
      setIsLoading(true);
      
      if (inspectionId) {
        try {
          console.log("Updating production plan status for ID:", inspectionId);
          const response = await axios.get(`http://localhost:8080/api/public/json-data/${inspectionId}`);
          if (response.data.success) {
            const existingData = JSON.parse(response.data.data.jsonContent);
            
            const updatedData = {
              ...existingData,
              status: "SUBMITTED",
              rows: {
                ...existingData.rows,
                status: "SUBMITTED"
              }
            };
            
            await axios.put(`http://localhost:8080/api/public/json-data/${inspectionId}`, {
              jsonContent: JSON.stringify(updatedData)
            });
            console.log("✅ Production plan status updated to SUBMITTED");
          }
        } catch (updateError) {
          console.warn('Could not update production plan status:', updateError);
        }
      }

      if (inspectionId) {
        try {
          console.log("Updating calendar event status for production order:", inspectionId);
          const events = await calendarAPI.getEventsByProductionOrder(inspectionId);
          if (events.length > 0) {
            await calendarAPI.updateEventStatus(events[0].id, 'UPCOMING');
            console.log("✅ Calendar event status updated");
          }
        } catch (calendarError) {
          console.warn('Could not update calendar event status:', calendarError);
        }
      }

      alert("✅ Production Plan Assigned with Distribution!");
      
      console.log("Closing page...");
      if (onClose) {
        console.log("Calling onClose");
        onClose();
      } else {
        console.log("Navigating to dashboard");
        navigate('/dashboard');
      }
      
    } catch (err) {
      console.error("Final submission error:", err);
      alert("Submission completed with warnings: " + (err.response?.data?.message || err.message));
      
      if (onClose) {
        onClose();
      } else {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
      setShowEmailModal(false);
    }
  };

  const calculateReassignmentRemainingQty = () => {
    const plannedQty = parseInt(formData.rows["5"] || "0");
    const completedQty = parseInt(existingData?.rows?.completedQty || existingData?.rows?.["8"] || "0");
    return Math.max(0, plannedQty - completedQty);
  };

  const canReassign = () => {
    const currentStatus = existingData?.rows?.status || existingData?.rows?.["9"] || "UPCOMING";
    const remainingQty = calculateReassignmentRemainingQty();
    return currentStatus === "COMPLETED" && remainingQty > 0;
  };

  const canMarkAsFinished = () => {
    const currentStatus = existingData?.rows?.status || existingData?.rows?.["9"] || "UPCOMING";
    const remainingQty = calculateReassignmentRemainingQty();
    return currentStatus === "COMPLETED" && remainingQty === 0;
  };

  const handleReassignLine = async () => {
    // Implementation for reassign line
  };

  const handleMarkAsFinished = async () => {
    // Implementation for mark as finished
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 relative mt-20 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <button
          className="px-4 py-2 text-blue-600 font-semibold flex items-center gap-4"
          onClick={() => {
            if (onClose) onClose();
            else navigate('/dashboard');
          }}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1 className="text-3xl capitalize text-gray-900 text-center">
          {isReassigning ? 'Reassign Work Order' : 'Production Planning Form'}
          {editInspectionId && <span className="text-sm text-gray-600 ml-2">(ID: #{editInspectionId})</span>}
        </h1>
        <div className="w-24"></div>
      </div>

      {isReassigning && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="font-semibold text-blue-800">Reassigning Work Order</h3>
              <p className="text-sm text-blue-700">
                All existing data is preserved. Only change the Product Line to reassign this work.
                {calculateReassignmentRemainingQty() > 0 && (
                  <span className="ml-2"><strong>Remaining:</strong> {calculateReassignmentRemainingQty()} units</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

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
              {isReassigning ? 'Reassign Work Order' : 'Production Planning Details'}
            </h2>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              ...fieldRowsData,
              { sn: "eventTitle", label: "Job Title", type: "text" },
              { sn: "eventStart", label: "Start", type: "datetime-local" },
              { sn: "eventEnd", label: "End", type: "datetime-local" },
              { sn: "isRecurring", label: "Recurring", type: "boolean" }
            ].map((field) => {
              const alwaysEditableFields = ["5", "6", "11", "eventStart", "eventEnd"];
              const isEditable = !isInProgress || alwaysEditableFields.includes(field.sn);
              
              return (
                <div key={field.sn} className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    {field.label}
                  </label>
                  
                  {field.sn === "eventTitle" ? (
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded ${
                        !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter job title"
                      disabled
                    />
                  ) : field.sn === "eventStart" ? (
                    <input
                      type="datetime-local"
                      value={eventStart}
                      onChange={(e) => setEventStart(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded ${
                        !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      disabled={!isEditable}
                    />
                  ) : field.sn === "eventEnd" ? (
                    <input
                      type="datetime-local"
                      value={eventEnd}
                      onChange={(e) => setEventEnd(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded ${
                        !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      disabled={!isEditable}
                    />
                  ) : field.sn === "isRecurring" ? (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="sr-only"
                        disabled={!isEditable}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                        isRecurring ? 'bg-blue-600' : 'bg-gray-300'
                      } ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                          isRecurring ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className={`ml-3 text-sm font-medium flex items-center ${
                        !isEditable ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        <Repeat className="h-4 w-4 mr-1" />
                        Recurring Job
                      </span>
                    </label>
                  ) : (
                    field.sn === "6" && isSupervisor && !isReassigning ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <select
                            value={formData.rows[field.sn] || ""}
                            onChange={(e) => handleRowChange(field.sn, e.target.value)}
                            className={`border border-gray-300 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
                              !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            disabled={!isEditable}
                          >
                            <option value="">Select {field.label}</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          
                          {isEditable && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="enableSplit"
                                checked={enableSplit}
                                onChange={(e) => handleEnableSplit(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="enableSplit" className="text-sm text-gray-700 flex items-center gap-1">
                                <Divide className="h-4 w-4" /> Split to multiple lines
                              </label>
                            </div>
                          )}
                        </div>
                        
                        {enableSplit && isEditable && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3"
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-purple-800 text-sm">
                                Distribution Lines ({distributionLines.length}/3)
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={applySmartSplit}
                                  disabled={totalPlannedQty <= 0 || distributionLines.length === 0}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1"
                                >
                                  <Target className="h-3 w-3" /> Smart Split
                                </button>
                                <button
                                  onClick={handleAddDistributionLine}
                                  disabled={remainingQty <= 0 || distributionLines.length >= 3}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1"
                                  title={distributionLines.length >= 3 ? "All lines added" : "Add another line"}
                                >
                                  <Plus className="h-3 w-3" /> Add Line
                                </button>
                              </div>
                            </div>
                            
                            {distributionLines.map((distribution, index) => {
                              const lineContribution = lineContributions.find(lc => lc.line === distribution.line);
                              const completedQty = lineContribution?.completedQty || 0;
                              
                              return (
                                <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                                  <select
                                    value={distribution.line}
                                    onChange={(e) => handleDistributionLineChange(index, 'line', e.target.value)}
                                    className="border border-gray-300 p-1 rounded text-sm flex-1"
                                  >
                                    <option value="">Select Line</option>
                                    {["BE1", "BE2", "BE6"].map(opt => (
                                      <option 
                                        key={opt} 
                                        value={opt}
                                        disabled={distributionLines.some((dist, i) => i !== index && dist.line === opt)}
                                      >
                                        {opt} {distributionLines.some((dist, i) => i !== index && dist.line === opt) ? '(Already used)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-gray-600 text-center min-w-[50px]">
                                      <div>Done: {completedQty}</div>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      max={totalPlannedQty}
                                      value={distribution.quantity}
                                      onChange={(e) => handleDistributionLineChange(index, 'quantity', e.target.value)}
                                      className="border border-gray-300 p-1 rounded text-sm w-16"
                                      placeholder="Qty"
                                    />
                                  </div>
                                  
                                  {distributionLines.length > 1 && (
                                    <button
                                      onClick={() => handleRemoveDistributionLine(index)}
                                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                      title="Remove this line"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            
                            <div className="text-xs text-purple-700 flex justify-between items-center">
                              <div className="text-center">
                                <div className="text-purple-600 font-medium">Total Planned</div>
                                <div className="text-xl font-bold text-purple-800">{totalPlannedQty}</div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-purple-600 font-medium">Assigned</div>
                                <div className="text-xl font-bold text-purple-800">
                                  {distributionLines.reduce((sum, dist) => sum + (parseInt(dist.quantity) || 0), 0)}
                                </div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-purple-600 font-medium">Remaining</div>
                                <div className="text-xl font-bold text-purple-800">{remainingQty}</div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : field.type === "dropdown" ? (
                      <select
                        value={formData.rows[field.sn] || ""}
                        onChange={(e) => handleRowChange(field.sn, e.target.value)}
                        className={`border border-gray-300 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
                          !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={!isEditable}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "date" ? (
                      <input
                        type="date"
                        value={formData.rows[field.sn] || ""}
                        onChange={(e) => handleRowChange(field.sn, e.target.value)}
                        className={`border border-gray-300 p-3 rounded-lg w-full ${
                          !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={!isEditable}
                      />
                    ) : field.type === "datetime-local" ? (
                      <input
                        type="datetime-local"
                        value={formData.rows[field.sn] || ""}
                        onChange={(e) => handleRowChange(field.sn, e.target.value)}
                        className={`border border-gray-300 p-3 rounded-lg w-full ${
                          !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={!isEditable}
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={formData.rows[field.sn] || ""}
                        onChange={(e) => handleRowChange(field.sn, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className={`border border-gray-300 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
                          !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        min={field.type === "number" ? "0" : undefined}
                        disabled={!isEditable}
                        readOnly={!isEditable}
                      />
                    )
                  )}
                  
                  {field.sn === "isRecurring" && isRecurring && isEditable && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence Pattern</label>
                      <select
                        value={recurrencePattern}
                        onChange={(e) => setRecurrencePattern(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isReassigning && (
            <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Current Progress</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-green-600">Planned:</span> {formData.rows["5"]}</div>
                <div><span className="text-blue-600">Completed:</span> {parseInt(existingData?.rows?.completedQty || existingData?.rows?.["8"] || "0")}</div>
                <div><span className="text-orange-600">Remaining:</span> {calculateReassignmentRemainingQty()}</div>
                <div><span className="text-purple-600">Progress:</span> {formData.rows["5"] ? `${((parseInt(existingData?.rows?.completedQty || existingData?.rows?.["8"] || "0") / parseInt(formData.rows["5"])) * 100).toFixed(1)}%` : "0%"}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            {/* Delete Button - Only show if editing existing job */}
            {inspectionId && (
              <button
                className={`px-4 py-2 rounded flex items-center gap-1 transition ${
                  canDeleteJob() 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
                onClick={handleDeleteJob}
                disabled={!canDeleteJob() || isLoading}
                title={
                  canDeleteJob() 
                    ? "Delete this job assignment" 
                    : "Cannot delete - work has already started"
                }
              >
                <Trash2 size={16} /> Delete Job
              </button>
            )}
            
            <button
              className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-1 hover:bg-green-700 transition disabled:bg-gray-400"
              onClick={handleSaveAll}
              disabled={isLoading}
            >
              <Save size={16} /> Save All
            </button>
            
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Assigning..." : "Assign Job"}
            </button>
          </div>
        </div>
      </motion.div>

      {showEmailModal && (
        <EmailNotificationModal
          isOpen={true}
          onClose={() => setShowEmailModal(false)}
          inspectionId={inspectionId}
          onProceed={handleProceedAfterEmail}
        />
      )}
    </div>
  );
}