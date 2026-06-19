// src/services/auditScheduleApi.js
import axios from 'axios';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090
/api';

export const auditScheduleApi = {
  // ========== USER MANAGEMENT - FIXED ==========
  getUsers: () => axios.get(`${API_BASE}/users`, { withCredentials: true }),
  
  // Get ALL auditors (both AUDITOR and LEAD_AUDITOR) - for team selection
  getAuditors: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'AUDITOR' || u.role === 'LEAD_AUDITOR');
  },
  
  // ✅ Get ONLY AUDITEE role (NOT HOD)
  getAuditees: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'AUDITEE');  // ← ONLY AUDITEE, removed HOD
  },

  // Get LEAD AUDITORS only (for header lead auditor dropdown)
  getLeadAuditors: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'LEAD_AUDITOR');  // ← ONLY LEAD_AUDITOR
  },
  
  // Get REGULAR AUDITORS only (for team auditors dropdown)
  getRegularAuditors: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'AUDITOR');  // ← ONLY AUDITOR (not lead)
  },
  
  // Get all auditors (both LEAD and REGULAR) - for team selection
  getAllAuditors: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'AUDITOR' || u.role === 'LEAD_AUDITOR');
  },
  
  // Get auditees list (only AUDITEE role)
  getAuditeesList: async () => {
    const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
    return response.data.filter(u => u.role === 'AUDITEE');
  },

  // Add these to your existing auditScheduleApi object (around line 150-170)

// ========== FORUM APIs ==========
// Create or get existing forum for audit
createOrGetForum: (auditId, data) => 
  axios.post(`${API_BASE}/forum/audit/${auditId}/init`, data, { withCredentials: true }),

// Add members to forum
addForumMembers: (groupId, memberEmails) => 
  axios.post(`${API_BASE}/forum/groups/${groupId}/members`, { members: memberEmails }, { withCredentials: true }),

// Get forum details
getForumDetails: (groupId) => 
  axios.get(`${API_BASE}/forum/groups/${groupId}`, { withCredentials: true }),

// Update forum settings
updateForumSettings: (groupId, settings) => 
  axios.put(`${API_BASE}/forum/groups/${groupId}/settings`, settings, { withCredentials: true }),

// Remove member from forum
removeForumMember: (groupId, memberEmail) => 
  axios.delete(`${API_BASE}/forum/groups/${groupId}/members/${encodeURIComponent(memberEmail)}`, { withCredentials: true }),

// Get forum messages
getForumMessages: (groupId, page = 1, limit = 50) => 
  axios.get(`${API_BASE}/forum/groups/${groupId}/messages`, { 
    params: { page, limit }, 
    withCredentials: true 
  }),

  // Add this function to the Forum APIs section
getNCRForumDetails: (groupId) => 
  axios.get(`${API_BASE}/forum/groups/${groupId}`, { withCredentials: true }).then(r => r.data),

// Send message to forum
sendForumMessage: (groupId, content, authorEmail, authorName) => 
  axios.post(`${API_BASE}/forum/groups/${groupId}/messages`, {
    content,
    authorEmail,
    authorName
  }, { withCredentials: true }),

  // ========== CONFLICT DETECTION APIs ==========
  checkConflict: (params) => axios.get(`${API_BASE}/audit-schedule/check-conflict`, { 
    params: {
      auditorId: params.auditorId,
      auditeeId: params.auditeeId,
      scheduledDate: params.scheduledDate,
      timeSlot: params.timeSlot,
      planYear: params.planYear,
      excludeScheduleId: params.excludeScheduleId || null
    },
    withCredentials: true 
  }),

  // ========== INDIVIDUAL SCHEDULE APPROVAL METHODS ==========
  // Submit a single schedule for approval (by schedule ID)
  submitScheduleForApproval: (scheduleId, userId) => 
    axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/submit?userId=${userId}`, {}, { withCredentials: true }),

  // Approve a single schedule (by schedule ID)
  approveSchedule: (scheduleId, userId, comments) => 
    axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/approve?userId=${userId}`, { comments }, { withCredentials: true }),

  // Reject a single schedule (by schedule ID)
  rejectSchedule: (scheduleId, userId, reason) => 
    axios.post(`${API_BASE}/audit-schedule/schedule/${scheduleId}/reject?userId=${userId}`, { reason }, { withCredentials: true }),
  
  // ========== DATE-WISE APPROVAL METHODS ==========
  submitDateForApproval: (year, month, date, userId) => 
    axios.post(`${API_BASE}/audit-schedule/date/${year}/${month}/${date}/submit?userId=${userId}`, {}, { withCredentials: true }),

  approveDateSchedule: (year, month, date, userId, comments) => 
    axios.post(`${API_BASE}/audit-schedule/date/${year}/${month}/${date}/approve?userId=${userId}`, { comments }, { withCredentials: true }),

  rejectDateSchedule: (year, month, date, userId, reason) => 
    axios.post(`${API_BASE}/audit-schedule/date/${year}/${month}/${date}/reject?userId=${userId}`, { reason }, { withCredentials: true }),

  // ========== DATE-BASED SCHEDULES ==========
  getDateSchedulesByMonth: (year, month) => 
    axios.get(`${API_BASE}/audit-schedule/date-schedules/${year}/${month}`, { withCredentials: true }),
    
  // Submit detailed schedule for approval
  submitDetailedSchedule: (year, month, userId) => 
    axios.post(`${API_BASE}/audit-schedule/detailed/${year}/${month}/submit?userId=${userId}`, {}, { withCredentials: true }),

  // Save detailed schedule
  saveDetailedSchedule: (data, userId) => {
    console.log('Sending to backend:', data);
    return axios.post(`${API_BASE}/audit-schedule/save-detailed?userId=${userId}`, data, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  updateDetailedSchedule: (id, data, userId) => {
  console.log('Updating detailed schedule:', id, data);
  return axios.put(`${API_BASE}/audit-schedule/detailed/${id}?userId=${userId}`, data, {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
  });
},
  
  getAvailableTimeSlots: (date) => axios.get(`${API_BASE}/audit-schedule/available-time-slots/${date}`, { withCredentials: true }),

  // ========== DETAILED SCHEDULE APIs ==========
  getDetailedSchedules: (year) => axios.get(`${API_BASE}/audit-schedule/detailed/${year}`, { withCredentials: true }),
  getDetailedSchedulesByMonth: (year, month) => axios.get(`${API_BASE}/audit-schedule/detailed/${year}/${month}`, { withCredentials: true }),
   downloadDetailedViewPdf: (year, month, params = {}) =>
    axios.get(`${API_BASE}/audit-detailed-view/${year}/${month}/download`, {
      params,
      responseType: 'blob',
      withCredentials: true
    }),

  // ========== SCHEDULE CRUD ==========
  getByYear: (year) => axios.get(`${API_BASE}/audit-schedule/year/${year}`, { withCredentials: true }),
  getByYearAndMonth: (year, month) => axios.get(`${API_BASE}/audit-schedule/year/${year}/month/${month}`, { withCredentials: true }),
  getByYearMonthAndDepartment: (year, month, department) => 
    axios.get(`${API_BASE}/audit-schedule/year/${year}/month/${month}/department/${department}`, { withCredentials: true }),
  create: (data, userId) => axios.post(`${API_BASE}/audit-schedule/create?userId=${userId}`, data, { withCredentials: true }),
  update: (id, data) => axios.put(`${API_BASE}/audit-schedule/${id}`, data, { withCredentials: true }),
  delete: (id) => axios.delete(`${API_BASE}/audit-schedule/${id}`, { withCredentials: true }),
  updateStatus: (id, status) => axios.put(`${API_BASE}/audit-schedule/${id}/status?status=${status}`, {}, { withCredentials: true }),

  // ========== AVAILABLE DATA APIs ==========
  getAvailableMonths: (year) => axios.get(`${API_BASE}/audit-schedule/available-months/${year}`, { withCredentials: true }),
  getAvailableDepartments: (year, month) => axios.get(`${API_BASE}/audit-schedule/available-departments/${year}/${month}`, { withCredentials: true }),
  getAuditElements: (year, month, department) => 
    axios.get(`${API_BASE}/audit-schedule/audit-elements/${year}/${month}/${department}`, { withCredentials: true }),
  getSummary: (year, month) => axios.get(`${API_BASE}/audit-schedule/summary/${year}/${month}`, { withCredentials: true }),

  // ========== APPROVAL WORKFLOW ==========
  submitForApproval: (year, userId) => axios.post(`${API_BASE}/audit-schedule/${year}/submit?userId=${userId}`, {}, { withCredentials: true }),
  submitMonth: (year, month, userId) => axios.post(`${API_BASE}/audit-schedule/${year}/${month}/submit?userId=${userId}`, {}, { withCredentials: true }),
  approvePlan: (year, userId, comments) => axios.post(`${API_BASE}/audit-schedule/${year}/approve?userId=${userId}`, { comments }, { withCredentials: true }),
  approveMonth: (year, month, userId, comments) => axios.post(`${API_BASE}/audit-schedule/${year}/${month}/approve?userId=${userId}`, { comments }, { withCredentials: true }),
  rejectPlan: (year, userId, reason) => axios.post(`${API_BASE}/audit-schedule/${year}/reject?userId=${userId}`, { reason }, { withCredentials: true }),
  rejectMonth: (year, month, userId, reason) => axios.post(`${API_BASE}/audit-schedule/${year}/${month}/reject?userId=${userId}`, { reason }, { withCredentials: true }),

  // ========== DOCUMENT OPERATIONS ==========
  saveDocument: (data, userId) => axios.post(`${API_BASE}/audit-schedule/save-document?userId=${userId}`, data, { withCredentials: true }),
  saveMonthDocument: (data, userId) => axios.post(`${API_BASE}/audit-schedule/save-month-document?userId=${userId}`, data, { withCredentials: true }),

  // ========== AUDIT RESPONSE APIs (Check Sheet Forms) ==========
  
  // Save audit response (matches @PostMapping("/templates/responses"))
  saveAuditResponse: (responseData) => {
    console.log('Saving audit response to:', `${API_BASE}/templates/responses`);
    return axios.post(`${API_BASE}/templates/responses`, responseData, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  // Update existing audit response (matches @PutMapping("/templates/responses/{responseId}"))
  updateAuditResponse: (responseId, responseData) => {
    console.log('Updating audit response:', responseId);
    const updateData = {
      answers: typeof responseData.answers === 'string' ? responseData.answers : JSON.stringify(responseData.answers)
    };
    return axios.put(`${API_BASE}/templates/responses/${responseId}`, updateData, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  // Submit audit response (matches @PutMapping("/templates/responses/{responseId}/submit"))
  submitAuditResponse: (responseId) => {
    console.log('Submitting audit response:', responseId);
    return axios.put(`${API_BASE}/templates/responses/${responseId}/submit`, {}, { 
      withCredentials: true 
    });
  },
  
  // Get audit response by ID (matches @GetMapping("/templates/responses/{responseId}"))
  getAuditResponse: (responseId) => {
    console.log('Getting audit response:', responseId);
    return axios.get(`${API_BASE}/templates/responses/${responseId}`, { 
      withCredentials: true 
    });
  },
  
  // Get audit responses by check sheet ID (matches @GetMapping("/templates/responses/check-sheet/{checkSheetId}"))
  getAuditResponsesByCheckSheet: (checkSheetId) => {
    console.log('Fetching audit responses by check sheet:', checkSheetId);
    return axios.get(`${API_BASE}/templates/responses/check-sheet/${checkSheetId}`, { 
      withCredentials: true 
    });
  },
  
  // Get audit responses by audit schedule ID (matches @GetMapping("/templates/responses/schedule/{auditScheduleId}"))
  getAuditResponsesBySchedule: (auditScheduleId) => {
    console.log('Fetching audit responses by schedule:', auditScheduleId);
    return axios.get(`${API_BASE}/templates/responses/schedule/${auditScheduleId}`, { 
      withCredentials: true 
    });
  },
  
  // Get all audit responses (if you add this endpoint to your backend)
  getAllAuditResponses: async () => {
    console.log('Fetching all audit responses');
    try {
      const response = await axios.get(`${API_BASE}/templates/responses`, { 
        withCredentials: true 
      });
      return response;
    } catch (error) {
      console.error('Error fetching all responses:', error);
      // Fallback: try to get by check sheet ID 1
      try {
        const fallbackResponse = await axios.get(`${API_BASE}/templates/responses/check-sheet/1`, { 
          withCredentials: true 
        });
        return fallbackResponse;
      } catch (fallbackError) {
        throw error;
      }
    }
  },
  
  // Review audit response (matches @PutMapping("/templates/responses/{responseId}/review"))
  reviewAuditResponse: (responseId, comments, approved) => {
    return axios.put(`${API_BASE}/templates/responses/${responseId}/review`, 
      { comments, approved }, 
      { withCredentials: true }
    );
  }
};