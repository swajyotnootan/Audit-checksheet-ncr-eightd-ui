// src/components/Generate8DWord.jsx
import React, { useState } from "react";

const Generate8DWord = ({ title, formData, attachments = [] }) => {
  const [generating, setGenerating] = useState(false);

  // Native saveAs function (no library needed)
  const saveAs = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateWord = () => {
    setGenerating(true);
    try {
      // Get D0 data
      const d0Data = formData?.d0?.[0] || {};
      const companyName = d0Data.companyName || "Renewsys";
      const contactPerson = d0Data.contactPerson || "";
      const companyEmail = d0Data.email || "";
      const companyPhone = d0Data.phone || "";
      const eventNo = d0Data.eventNo || "EVT-001";

      // Helper functions
      const formatWordValue = (value) => {
        if (value == null || value === "" || value === "-") return "—";
        if (Array.isArray(value)) {
          if (value.length === 0) return "—";
          if (value.every(item => typeof item === "string")) {
            return value.join(", ");
          }
          if (value[0] && typeof value[0] === "object") {
            return value.map(item => item.action || item.text || JSON.stringify(item)).join("; ");
          }
          return value.join(", ");
        }
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      };

      const formatDate = (dateString) => {
        if (!dateString) return "—";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {
          return "—";
        }
      };

      // Build HTML content
      let htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="UTF-8">
          <title>${title || "8D Report"}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page {
              margin: 2.54cm;
            }
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.15;
            }
            .header-section {
              margin-bottom: 40px;
            }
            .title {
              text-align: center;
              font-size: 24pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              color: #000000;
            }
            .event-id {
              text-align: center;
              font-size: 12pt;
              margin-bottom: 30px;
              color: #000000;
            }
            .company-info {
              text-align: right;
              font-size: 10pt;
              margin-bottom: 20px;
              color: #000000;
            }
            .divider {
              border-bottom: 2px solid #000000;
              margin: 30px 0;
            }
            .event-table {
              width: 100%;
              border-collapse: collapse;
              margin: 25px 0 40px 0;
              border: 1px solid #000000;
            }
            .event-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              padding: 8px 12px;
              border: 1px solid #000000;
              text-align: center;
              width: 20%;
              font-size: 10pt;
            }
            .event-table td {
              padding: 8px 12px;
              border: 1px solid #000000;
              text-align: center;
              font-size: 10pt;
            }
            .step-header {
              background-color: #4f46e5;
              color: white;
              padding: 12px 15px;
              font-weight: bold;
              margin: 40px 0 15px 0;
              font-size: 14pt;
            }
            .step-dates-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0 25px 0;
              border: 1px solid #4f46e5;
            }
            .step-dates-table th {
              background-color: #4f46e5;
              color: white;
              padding: 8px 12px;
              border: 1px solid #4f46e5;
              text-align: center;
              font-weight: bold;
              font-size: 10pt;
            }
            .step-dates-table td {
              padding: 8px 12px;
              border: 1px solid #4f46e5;
              text-align: center;
              font-size: 10pt;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0 30px 0;
            }
            .data-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              padding: 8px 12px;
              border: 1px solid #dee2e6;
              text-align: left;
              width: 30%;
              font-size: 10pt;
              vertical-align: top;
            }
            .data-table td {
              padding: 8px 12px;
              border: 1px solid #dee2e6;
              font-size: 10pt;
              vertical-align: top;
            }
            .team-member {
              margin-bottom: 8px;
              padding: 6px 0;
            }
            .attachments-header {
              color: #4f46e5;
              font-weight: bold;
              margin: 30px 0 10px 0;
              font-size: 12pt;
            }
            .attachments-count {
              color: #6c757d;
              font-style: italic;
              margin-bottom: 15px;
              font-size: 10pt;
            }
            .attachments-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .attachment-item {
              border: 1px solid #dee2e6;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 4px;
            }
            .file-icon {
              font-size: 24px;
              display: block;
              margin-bottom: 8px;
            }
            .file-name {
              font-weight: bold;
              color: #212529;
              font-size: 10pt;
              word-break: break-word;
              margin-bottom: 5px;
            }
            .file-size {
              color: #6c757d;
              font-size: 9pt;
              margin-bottom: 8px;
            }
            .file-link {
              color: #0d6efd;
              text-decoration: none;
              font-size: 9pt;
            }
            .footer {
              border-top: 1px solid #dee2e6;
              padding-top: 15px;
              margin-top: 40px;
              text-align: center;
              color: #6c757d;
              font-size: 9pt;
            }
            .page-break {
              page-break-after: always;
              margin: 40px 0;
            }
          </style>
        </head>
        <body>
      `;

      // HEADER SECTION
      htmlContent += `
        <div class="header-section">
          <div class="title">8D REPORT</div>
          <div class="event-id">Event Number: ${eventNo}</div>
          
          <div class="company-info">
            <div style="font-weight: bold;">${companyName}</div>
            ${contactPerson ? `<div>Contact: ${contactPerson}</div>` : ''}
            ${companyEmail ? `<div>${companyEmail}</div>` : ''}
            ${companyPhone ? `<div>${companyPhone}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <table class="event-table">
            <tr>
              <th>Owner</th>
              <td>${d0Data.reportedBy || "N/A"}</td>
              <th>Status</th>
              <td>${formData?.status || "Open"}</td>
            </tr>
            <tr>
              <th>Severity</th>
              <td>Medium</td>
              <th>Created</th>
              <td>${formatDate(d0Data.dateDiscovered)}</td>
            </tr>
          </table>
        </div>
      `;

      // STEPS D0–D8
      const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];
      
      steps.forEach((s, idx) => {
        const stepKey = s.toLowerCase();
        const stepData = formData[stepKey] || [];
        const hasData = stepData.length > 0 && stepData[0];
        const stepItem = hasData ? stepData[0] : {};
        const stepAttachments = attachments.filter(att => att.formType === stepKey);

        // Step Header
        htmlContent += `
          <div class="step-header">${s} Step</div>
          
          <table class="step-dates-table">
            <tr>
              <th style="width: 33%;"></th>
              <th style="width: 33%;">Planned Completion</th>
              <th style="width: 34%;">Actual Completion</th>
            </tr>
            <tr>
              <td></td>
              <td>${formatDate(stepItem.plannedCompletion)}</td>
              <td>${formatDate(stepItem.actualCompletion)}</td>
            </tr>
          </table>
        `;

        if (hasData) {
          htmlContent += `<table class="data-table">`;
          
          if (s === "D0") {
            // D0 Fields
            const d0Fields = [
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
            ];
            
            d0Fields.forEach(field => {
              htmlContent += `
                <tr>
                  <th>${field.label}</th>
                  <td>${formatWordValue(stepItem[field.key])}</td>
                </tr>
              `;
            });
            
            // Team Members
            const teamMembersData = stepItem.teamMembers || [];
            const additionalEmailsData = stepItem.additionalEmails || [];
            const displayMembers = teamMembersData.length > 0 
              ? teamMembersData 
              : additionalEmailsData.map(email => ({ 
                  email, 
                  firstName: '', 
                  lastName: '', 
                  department: '', 
                  isExternal: true 
                }));
            
            if (displayMembers.length > 0) {
              htmlContent += `
                <tr>
                  <th>Team Members</th>
                  <td>
                    ${displayMembers.map(member => `
                      <div class="team-member">
                        <strong>${member.firstName || ''} ${member.lastName || ''}</strong>
                        &lt;${member.email}&gt;
                        ${member.department ? `, ${member.department}` : ''}
                        <span style="color: ${member.isExternal ? '#dc3545' : '#198754'}; font-size: 9pt;">
                          ${member.isExternal ? ' (External)' : ' (Internal)'}
                        </span>
                      </div>
                    `).join('')}
                  </td>
                </tr>
              `;
            }
          } else {
            // Other Steps
            const stepFieldsConfig = {
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
            
            const fields = stepFieldsConfig[stepKey] || [];
            fields.forEach(field => {
              const value = stepItem[field.key];
              if (value !== undefined && value !== null && value !== "") {
                htmlContent += `
                  <tr>
                    <th>${field.label}</th>
                    <td>${formatWordValue(value)}</td>
                  </tr>
                `;
              }
            });
          }
          
          htmlContent += `</table>`;
        }

        // ATTACHMENTS
        if (stepAttachments.length > 0) {
          htmlContent += `
            <div class="attachments-header">Attachments for ${s}</div>
            <div class="attachments-count">(${stepAttachments.length} file${stepAttachments.length > 1 ? 's' : ''} attached)</div>
            
            <div class="attachments-grid">
          `;
          
          stepAttachments.forEach(attachment => {
            // Determine file type and icon
            const getFileIcon = (mimeType, name) => {
              if (mimeType?.startsWith('image/')) return '🖼️';
              if (mimeType === 'application/pdf') return '📕';
              if (mimeType?.startsWith('video/')) return '🎬';
              if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
              if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
              
              const ext = name?.split('.').pop().toLowerCase();
              if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return '🖼️';
              if (ext === 'pdf') return '📕';
              if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return '🎬';
              if (['xls', 'xlsx'].includes(ext)) return '📊';
              if (['doc', 'docx'].includes(ext)) return '📝';
              
              return '📄';
            };
            
            const fileIcon = getFileIcon(attachment.mimeType, attachment.name);
            const fileSize = attachment.size ? 
              (attachment.size / 1024).toFixed(1) + ' KB' : 
              'Unknown size';
            
            htmlContent += `
              <div class="attachment-item">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-name">${attachment.name}</div>
                <div class="file-size">${fileSize}</div>
                <a href="${attachment.url}" class="file-link">Download</a>
              </div>
            `;
          });
          
          htmlContent += `</div>`;
        }

        // Page break between major steps
        if (idx < steps.length - 1) {
          htmlContent += `<div class="page-break"></div>`;
        }
      });

      // FOOTER
      const generatedDate = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      htmlContent += `
        <div class="footer">
          <div>Generated: ${generatedDate}</div>
          <div>© ${new Date().getFullYear()} ${companyName}</div>
        </div>
      `;

      htmlContent += `
        </body>
        </html>
      `;

      // Create and download the Word document
      const blob = new Blob([htmlContent], { 
        type: 'application/msword' 
      });
      
      saveAs(blob, `${title || "8D_Report"}.doc`);
      
    } catch (error) {
      console.error("Error generating Word document:", error);
      alert("Failed to generate Word document. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generateWord}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-3"
    >
      {generating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Generating Word...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Word (.doc)
        </>
      )}
    </button>
  );
};

export default Generate8DWord;