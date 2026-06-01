// src/components/Generate8DPdf.jsx
import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/RenewsysLogo.png";

// User-friendly field definitions — same as FinalPreview.jsx
const stepFields = {
  d0: [
    { key: "eventNo", label: "Event ID" },
    { key: "plantLine", label: "Plant / Line" },
    { key: "partName", label: "Part Name" },
    { key: "lotSerial", label: "Lot / Serial" },
    { key: "defectCode", label: "Defect Code" },
    { key: "dateDiscovered", label: "Date Discovered" },
    { key: "reportedBy", label: "Reported By" },
    { key: "personName", label: "Person Name" },
    { key: "department", label: "Department" },
    { key: "companyName", label: "Company" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Primary Email" },
    { key: "additionalEmails", label: "Team Members" },
  ],
  d1: [
    { key: "teamLeader", label: "Team Leader" },
    { key: "dateFormed", label: "Date Formed" },
    { key: "responsibilities", label: "Team Responsibilities" },
  ],
  d2: [
    { key: "problemStatement", label: "Problem Statement" },
    { key: "what", label: "WHAT" },
    { key: "why", label: "WHY" },
    { key: "where", label: "WHERE" },
    { key: "when", label: "WHEN" },
    { key: "who", label: "WHO" },
    { key: "how", label: "HOW" },
    { key: "howMuch", label: "Impact (HOW MUCH)" },
  ],
  d3: [
    { key: "problemStatement", label: "Problem Statement" },
    { key: "hasContainment", label: "Containment Actions?" },
    { key: "actions", label: "Containment Actions" },
  ],
  d4: [
    { key: "rootCauseSummary", label: "Root Cause Summary" },
    { key: "businessProcessFlaws", label: "Business Process Flaws?" },
    { key: "whyNotDetected", label: "Why Not Detected?" },
  ],
  d5: [
    { key: "actions", label: "Corrective Actions" },
  ],
  d6: [
    { key: "implementationDate", label: "Implementation Date & Time" },
    { key: "communicatedToStakeholders", label: "Communicated to Stakeholders?" },
    { key: "notes", label: "Notes / Comments" },
  ],
  d7: [
    { key: "additionalMeasuresNeeded", label: "Additional Measures Needed?" },
    { key: "lessonsLearned", label: "Lessons Learned" },
    { key: "proceduresUpdated", label: "Procedures Updated?" },
  ],
  d8: [
    { key: "rewardDescription", label: "Reward Description" },
    { key: "additionalRecommendations", label: "Additional Recommendations" },
    { key: "teamLeaderName", label: "Team Leader Name" },
    { key: "signatureDate", label: "Signature Date & Time" },
  ],
};

const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];

// Helper: Format value for PDF
const formatPdfValue = (value) => {
  if (value == null || value === "" || value === "-") return "—";

  // Handle dates and datetimes
  if (typeof value === "string") {
    // ISO datetime: "2025-10-04T10:30:00"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      try {
        return new Date(value).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {}
    }
    // Date only: "2025-10-04"
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      try {
        return new Date(value).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {}
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    
    // Array of strings (e.g., emails)
    if (value.every(item => typeof item === "string")) {
      return value.join(", ");
    }
    
    // Array of action objects (e.g., { action: "..." })
    if (value[0] && typeof value[0] === "object") {
      return value
        .map(item => item.action || item.text || JSON.stringify(item))
        .join("; ");
    }
    
    return value.join(", ");
  }

  // Handle objects (fallback)
  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

// Helper: Format team members for PDF display
const formatTeamMembers = (members) => {
  if (!members || !Array.isArray(members) || members.length === 0) {
    return "—";
  }

  return members.map(member => {
    const name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed Member';
    const department = member.department ? `, ${member.department}` : '';
    const status = member.isExternal ? ' (External)' : ' (Internal)';
    return `${name} <${member.email}>${department}${status}`;
  }).join('\n');
};

// Helper: Load image from URL for PDF
const loadImageForPdf = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    // Add timestamp to prevent caching issues
    const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    
    img.onload = () => {
      // Create canvas to resize image if needed
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set maximum dimensions for thumbnail
      const maxWidth = 200;
      const maxHeight = 200;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({ dataUrl, width, height });
    };
    
    img.onerror = () => {
      console.warn("Failed to load image:", url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = cacheBustUrl;
    
    // Set timeout
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error("Image loading timeout"));
      }
    }, 10000);
  });
};

// Helper: Create thumbnail for non-image files
const createFileThumbnail = (type, fileName, size) => {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 100, 120);
  
  // Border
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 99, 99);
  
  // File icon
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  
  let icon = '📄';
  if (type === 'pdf') {
    icon = '📕';
    ctx.fillStyle = '#dc2626';
  } else if (type === 'video') {
    icon = '🎬';
    ctx.fillStyle = '#3b82f6';
  } else if (type === 'excel') {
    icon = '📊';
    ctx.fillStyle = '#059669';
  } else if (type === 'word') {
    icon = '📝';
    ctx.fillStyle = '#2563eb';
  } else if (type === 'image') {
    icon = '🖼️';
    ctx.fillStyle = '#8b5cf6';
  }
  
  ctx.fillText(icon, 50, 60);
  
  // File name (truncated)
  ctx.fillStyle = '#374151';
  ctx.font = '10px Arial';
  const maxChars = 15;
  const displayName = fileName.length > maxChars 
    ? fileName.substring(0, maxChars - 3) + '...' 
    : fileName;
  
  // Wrap text
  const lines = [];
  let currentLine = '';
  const words = displayName.split(' ');
  
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 90) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Draw lines
  lines.forEach((line, index) => {
    ctx.fillText(line, 50, 85 + (index * 12));
  });
  
  // File size
  if (size) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px Arial';
    const sizeText = formatFileSize(size);
    ctx.fillText(sizeText, 50, 110);
  }
  
  return canvas.toDataURL('image/png');
};

// Helper: Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper: Get file type from mimeType or filename
const getFileType = (attachment) => {
  const { mimeType, name } = attachment;
  
  if (!mimeType && name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) return 'video';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['doc', 'docx'].includes(ext)) return 'word';
  }
  
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  }
  
  return 'document';
};

// Helper: Add step attachments to PDF
const addStepAttachments = async (pdf, stepKey, stepAttachments, currentY, margin, pageWidth, FOOTER_HEIGHT, addSimpleHeader) => {
  if (!stepAttachments || stepAttachments.length === 0) return currentY;
  
  const thumbnailWidth = 80;
  const thumbnailHeight = 100;
  const spacing = 25;
  const thumbnailsPerRow = 3;
  
  // Attachments header for this step
  const headerY = currentY + 15;
  
  pdf.setFontSize(11);
  pdf.setTextColor(79, 70, 229);
  pdf.text(`Attachments for ${stepKey.toUpperCase()}`, margin, headerY);
  
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`(${stepAttachments.length} file${stepAttachments.length > 1 ? 's' : ''})`, margin + 150, headerY);
  
  // Draw separator line
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.line(margin, headerY + 5, pageWidth - margin, headerY + 5);
  
  let currentX = margin;
  currentY = headerY + 20;
  
  // Process each attachment
  for (let i = 0; i < stepAttachments.length; i++) {
    const attachment = stepAttachments[i];
    const fileType = getFileType(attachment);
    
    // Check if we need to move to next row
    if (currentX + thumbnailWidth > pageWidth - margin) {
      currentX = margin;
      currentY += thumbnailHeight + spacing + 15;
    }
    
    // Check if we need a new page
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (currentY + thumbnailHeight + 30 > pageHeight - FOOTER_HEIGHT) {
      pdf.addPage();
      currentY = addSimpleHeader();
      currentY += 20;
      currentX = margin;
    }
    
    // Add thumbnail
    try {
      if (fileType === 'image') {
        // Try to load actual image
        try {
          const imageData = await loadImageForPdf(attachment.url);
          const scale = Math.min(thumbnailWidth / imageData.width, thumbnailHeight / imageData.height) * 0.9;
          const imgWidth = imageData.width * scale;
          const imgHeight = imageData.height * scale;
          const xOffset = currentX + (thumbnailWidth - imgWidth) / 2;
          const yOffset = currentY + 5;
          
          // Add background
          pdf.setFillColor(249, 250, 251);
          pdf.rect(currentX, currentY, thumbnailWidth, thumbnailHeight, 'F');
          
          // Add border
          pdf.setDrawColor(209, 213, 219);
          pdf.setLineWidth(0.5);
          pdf.rect(currentX, currentY, thumbnailWidth, thumbnailHeight);
          
          // Add image
          pdf.addImage(imageData.dataUrl, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          
        } catch (error) {
          // Fallback to icon
          console.warn("Using fallback for image:", attachment.name, error);
          const thumbnailData = createFileThumbnail('image', attachment.name, attachment.size);
          pdf.addImage(thumbnailData, 'PNG', currentX, currentY, thumbnailWidth, thumbnailHeight);
        }
      } else {
        // Create icon-based thumbnail for non-image files
        const thumbnailData = createFileThumbnail(fileType, attachment.name, attachment.size);
        pdf.addImage(thumbnailData, 'PNG', currentX, currentY, thumbnailWidth, thumbnailHeight);
      }
      
      // Add file name below thumbnail (with proper spacing)
      pdf.setFontSize(8);
      pdf.setTextColor(55, 65, 81);
      
      // Truncate and wrap filename
      const maxChars = 20;
      let displayName = attachment.name;
      if (displayName.length > maxChars) {
        displayName = displayName.substring(0, maxChars - 3) + '...';
      }
      
      // Split into two lines if needed
      const lines = [];
      let currentLine = '';
      const words = displayName.split(' ');
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const textWidth = pdf.getTextWidth(testLine);
        if (textWidth > thumbnailWidth - 10) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Draw file name lines with proper spacing
      lines.forEach((line, index) => {
        const textWidth = pdf.getTextWidth(line);
        const xPos = currentX + (thumbnailWidth - textWidth) / 2;
        pdf.text(line, xPos, currentY + thumbnailHeight + 10 + (index * 9));
      });
      
    } catch (error) {
      console.error("Error adding thumbnail:", error);
      // Simple placeholder
      pdf.setFillColor(249, 250, 251);
      pdf.rect(currentX, currentY, thumbnailWidth, thumbnailHeight, 'F');
      pdf.setDrawColor(209, 213, 219);
      pdf.rect(currentX, currentY, thumbnailWidth, thumbnailHeight);
      
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text('❌', currentX + thumbnailWidth/2 - 5, currentY + thumbnailHeight/2);
    }
    
    currentX += thumbnailWidth + spacing;
    
    // Start new row after specified number of thumbnails
    if ((i + 1) % thumbnailsPerRow === 0) {
      currentX = margin;
      currentY += thumbnailHeight + spacing + 15;
    }
  }
  
  // Return final Y position (add extra space after last row)
  if (stepAttachments.length % thumbnailsPerRow !== 0) {
    currentY += thumbnailHeight + spacing + 15;
  } else {
    currentY += 15; // Just some padding
  }
  
  return currentY;
};

export default function Generate8DPdf({ title, formData, attachments = [] }) {
  const [generating, setGenerating] = useState(false);

  const generatePdf = async () => {
    setGenerating(true);
    
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const contentWidth = pageWidth - (2 * margin);

      // Get D0 data for header
      const d0Data = formData?.d0?.[0] || {};
      const companyName = d0Data.companyName || "Renewsys";
      const contactPerson = d0Data.contactPerson || "";
      const companyEmail = d0Data.email || "";
      const companyPhone = d0Data.phone || "";
      const eventNo = d0Data.eventNo || "EVT-001";

      // Generated date for footer
      const generatedDate = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      // Define header heights for proper spacing
      const HEADER_HEIGHT_PAGE1 = 160;
      const HEADER_HEIGHT_OTHER_PAGES = 50;
      const FOOTER_HEIGHT = 60;

      // Function to add FULL header (for first page)
      const addFullHeader = () => {
        const startY = 15;
        
        try {
          pdf.addImage(logo, "JPEG", margin, startY, 120, 60);
        } catch (err) {
          console.warn("Logo not loaded:", err);
        }

        pdf.setFontSize(12);
        pdf.setTextColor(40, 40, 40);
        
        let rightY = startY + 10;
        pdf.text(companyName, pageWidth - margin, rightY, { align: "right" });
        
        if (contactPerson || companyEmail || companyPhone) {
          rightY += 15;
          pdf.setFontSize(9);
          const contactInfo = [];
          if (contactPerson) contactInfo.push(`Contact: ${contactPerson}`);
          if (companyEmail) contactInfo.push(companyEmail);
          if (companyPhone) contactInfo.push(companyPhone);
          pdf.text(contactInfo, pageWidth - margin, rightY, { align: "right" });
        }

        pdf.setFontSize(22);
        pdf.setTextColor(40, 40, 40);
        pdf.text("8D REPORT", pageWidth / 2, startY + 85, { align: "center" });

        pdf.setFontSize(12);
        pdf.text(`Event Number: ${eventNo}`, pageWidth / 2, startY + 105, { align: "center" });
        
        pdf.setLineWidth(1);
        pdf.setDrawColor(0, 0, 0);
        pdf.line(margin, startY + 115, pageWidth - margin, startY + 115);
        
        return startY + HEADER_HEIGHT_PAGE1;
      };

      // Function to add SIMPLE header (for pages 2+)
      const addSimpleHeader = () => {
        const startY = 45;
        
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text("8D REPORT", pageWidth / 2, startY, { align: "center" });
        
        pdf.setFontSize(10);
        pdf.text(`Event: ${eventNo}`, pageWidth / 2, startY + 15, { align: "center" });
        
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(100, 100, 100);
        pdf.line(margin, startY + 25, pageWidth - margin, startY + 25);
        
        return startY + HEADER_HEIGHT_OTHER_PAGES;
      };

      // Track page Y positions
      let currentPage = 1;
      let currentY = 0;

      // Add header to page 1 and get starting Y position
      currentY = addFullHeader();

      // ----------- EVENT INFO -----------
      const owner = d0Data.reportedBy || "N/A";
      const status = formData?.status || "Open";
      const created = d0Data.dateDiscovered
        ? new Date(d0Data.dateDiscovered).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      // Function to check if we need a new page
      const checkForNewPage = (requiredHeight) => {
        const pageHeight = pdf.internal.pageSize.getHeight();
        const availableHeight = pageHeight - currentY - FOOTER_HEIGHT;
        
        if (requiredHeight > availableHeight) {
          pdf.addPage();
          currentPage++;
          currentY = addSimpleHeader();
          return true;
        }
        return false;
      };

      // Event info table
      autoTable(pdf, {
        startY: currentY,
        body: [
          ["Owner", owner, "Status", status],
          ["Severity", "Medium", "Created", created],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5, textColor: [40, 40, 40] },
        headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: "bold" },
        columnStyles: { 
          0: { cellWidth: 100 }, 
          1: { cellWidth: 150 }, 
          2: { cellWidth: 100 }, 
          3: { cellWidth: 150 } 
        },
        didDrawPage: function(data) {
          currentY = data.cursor.y;
          currentPage = data.pageNumber;
        }
      });

      // Update current Y position
      if (pdf.lastAutoTable) {
        currentY = pdf.lastAutoTable.finalY + 20;
      }

      // ----------- Dates Helper -----------
      const d0Planned = new Date(d0Data.plannedCompletion || new Date());
      const d0Actual = new Date(d0Data.actualCompletion || new Date());
      const addDays = (date, days) => {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
      };
      const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return "—";
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      };

      // ----------- STEPS D0–D8 WITH ATTACHMENTS -----------
      for (let idx = 0; idx < steps.length; idx++) {
        const s = steps[idx];
        const stepKey = s.toLowerCase();
        const stepData = formData[stepKey] || [];
        const hasData = stepData.length > 0 && stepData[0] && Object.keys(stepData[0]).length > 0;

        // Get attachments for this specific step
        const stepAttachments = attachments.filter(att => att.formType === stepKey);

        let plannedDate = stepData[0]?.plannedCompletion
          ? new Date(stepData[0].plannedCompletion)
          : idx === 0
          ? d0Planned
          : idx === 1 || idx === 2
          ? addDays(d0Planned, 2)
          : addDays(d0Planned, 3);

        let actualDate = stepData[0]?.actualCompletion
          ? new Date(stepData[0].actualCompletion)
          : idx === 0
          ? d0Actual
          : idx === 1 || idx === 2
          ? addDays(d0Actual, 2)
          : addDays(d0Actual, 3);

        // Check if we need new page for step header
        checkForNewPage(50);

        // Step Header
        autoTable(pdf, {
          startY: currentY,
          head: [[`${s} Step`, "Planned Completion", "Actual Completion"]],
          body: [["", formatDate(plannedDate), formatDate(actualDate)]],
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 5, textColor: [40, 40, 40] },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
          didDrawPage: function(data) {
            currentY = data.cursor.y;
            currentPage = data.pageNumber;
          }
        });

        // Update current Y position
        if (pdf.lastAutoTable) {
          currentY = pdf.lastAutoTable.finalY + 5;
        }

        if (s === "D0" && hasData) {
          const d0 = stepData[0];
          
          // Get team members data
          const teamMembersData = d0.teamMembers || [];
          const additionalEmailsData = d0.additionalEmails || [];
          
          const displayMembers = teamMembersData.length > 0 
            ? teamMembersData 
            : additionalEmailsData.map(email => ({ 
                email, 
                firstName: '', 
                lastName: '', 
                department: '', 
                isExternal: true 
              }));

          // Regular D0 fields
          const regularFields = stepFields.d0.filter(field => field.key !== "additionalEmails");
          let tableBody = [];

          regularFields.forEach(field => {
            const value = d0[field.key];
            tableBody.push([field.label, formatPdfValue(value)]);
          });

          // Add Team Members section
          if (displayMembers.length > 0) {
            tableBody.push(["Team Members", formatTeamMembers(displayMembers)]);
          }

          // Check if we have enough space for D0 table
          checkForNewPage(tableBody.length * 25 + 50);

          autoTable(pdf, {
            startY: currentY,
            head: [["Field", "Value"]],
            body: tableBody,
            styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
            columnStyles: {
              0: { cellWidth: 150, fontStyle: "bold" },
              1: { cellWidth: contentWidth - 150 }
            },
            didDrawPage: function(data) {
              currentY = data.cursor.y;
              currentPage = data.pageNumber;
            }
          });

        } else if (s === "D1" && hasData) {
          const d1 = stepData[0];

          // --- Part 1: Key D1 Fields ---
          const keyFields = [
            { label: "Team Leader", value: d1.teamLeader || "—" },
            { label: "Date Formed", value: formatPdfValue(d1.dateFormed) },
            { label: "Team Responsibilities", value: formatPdfValue(d1.responsibilities) },
          ];

          // Check space for D1 table
          checkForNewPage(keyFields.length * 25 + 50);

          autoTable(pdf, {
            startY: currentY,
            head: [["Field", "Value"]],
            body: keyFields.map(f => [f.label, f.value]),
            styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
            columnStyles: {
              0: { cellWidth: 150, fontStyle: "bold" },
              1: { cellWidth: contentWidth - 150 }
            },
            didDrawPage: function(data) {
              currentY = data.cursor.y;
              currentPage = data.pageNumber;
            }
          });

          // Update Y position
          if (pdf.lastAutoTable) {
            currentY = pdf.lastAutoTable.finalY + 8;
          }

          // --- Part 2: Team Members Table ---
          const allMembers = [];

          if (Array.isArray(d1.suppliers) && d1.suppliers.length > 0) {
            d1.suppliers.forEach(s => allMembers.push({
              type: "Supplier",
              name: s.name || "—",
              role: s.role || "—",
              department: s.department || "—",
              contact: s.contact || "—"
            }));
          }

          if (Array.isArray(d1.customers) && d1.customers.length > 0) {
            d1.customers.forEach(c => allMembers.push({
              type: "Customer",
              name: c.name || "—",
              role: c.role || "—",
              department: c.department || "—",
              contact: c.contact || "—"
            }));
          }

          if (allMembers.length > 0) {
            // Check space for members table
            checkForNewPage(allMembers.length * 20 + 50);

            autoTable(pdf, {
              startY: currentY,
              head: [["Type", "Name", "Role", "Department", "Contact"]],
              body: allMembers.map(m => [m.type, m.name, m.role, m.department, m.contact]),
              styles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 40] },
              headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
              didDrawPage: function(data) {
                currentY = data.cursor.y;
                currentPage = data.pageNumber;
              }
            });
          }

        } else {
          // Generic step handling
          const fields = stepFields[stepKey];
          let tableBody = [];

          if (fields && hasData) {
            const item = stepData[0];
            fields.forEach(field => {
              const value = item[field.key];
              tableBody.push([field.label, formatPdfValue(value)]);
            });
          } else if (hasData) {
            const systemFields = new Set([
              'id', 'eventId', 'createdDate', 'updatedDate', 'companyLogo', 'memberType', 'type', 'actionText', 'rating', 'plannedCompletion', 'actualCompletion'
            ]);
            const item = stepData[0];
            Object.entries(item).forEach(([k, v]) => {
              if (systemFields.has(k)) return;
              tableBody.push([k, formatPdfValue(v)]);
            });
          } else {
            tableBody.push(["No data available", "—"]);
          }

          if (tableBody.length > 0) {
            checkForNewPage(tableBody.length * 25 + 50);
            autoTable(pdf, {
              startY: currentY,
              head: [["Field", "Value"]],
              body: tableBody,
              styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
              headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
              columnStyles: {
                0: { cellWidth: 150, fontStyle: "bold" },
                1: { cellWidth: contentWidth - 150 }
              },
              didDrawPage: function(data) {
                currentY = data.cursor.y;
                currentPage = data.pageNumber;
              }
            });
          }
        }

        // Update Y position for next step
        if (pdf.lastAutoTable) {
          currentY = pdf.lastAutoTable.finalY + 10;
        }

        // ----------- ADD STEP ATTACHMENTS IMMEDIATELY AFTER STEP -----------
        if (stepAttachments.length > 0) {
          // Check if we need a new page for attachments
          const attachmentsHeight = 150 + Math.ceil(stepAttachments.length / 3) * 140;
          checkForNewPage(attachmentsHeight);
          
          // Add attachments for this specific step
          currentY = await addStepAttachments(
            pdf, 
            stepKey, 
            stepAttachments, 
            currentY, 
            margin, 
            pageWidth, 
            FOOTER_HEIGHT, 
            addSimpleHeader
          );
        }
        
        // Add some space between steps
        if (pdf.lastAutoTable) {
          currentY += 20;
        }
      }

      // ----------- ADD FOOTERS TO ALL PAGES -----------
      const pageCount = pdf.internal.getNumberOfPages();
      
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, pageHeight - FOOTER_HEIGHT + 10, pageWidth - margin, pageHeight - FOOTER_HEIGHT + 10);
        
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        
        pdf.text(`Page ${i} of ${pageCount}`, margin, pageHeight - FOOTER_HEIGHT + 25);
        pdf.text(`Generated: ${generatedDate}`, pageWidth / 2, pageHeight - FOOTER_HEIGHT + 25, { align: "center" });
        pdf.text(`© ${new Date().getFullYear()} ${companyName}`, pageWidth - margin, pageHeight - FOOTER_HEIGHT + 25, { align: "right" });
      }

      pdf.save(`${title || "8D_Report"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {generating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF Report
        </>
      )}
    </button>
  );
}