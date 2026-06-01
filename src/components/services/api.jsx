// api.js - Centralized API service module
import axios from 'axios';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL : '')) || '';

// Create an axios instance with default configurations
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lightweight logging to surface networking issues clearly in console
apiClient.interceptors.request.use((config) => {
  try {
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    // console.debug('[api] request', config.method, fullUrl);
  } catch (_) {}
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response) {
      console.error('[api] response error', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error?.request) {
      console.error('[api] network error/no response', {
        url: error.config?.url,
      });
    } else {
      console.error('[api] setup error', error?.message);
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (username, password) => {
    try {
      // Prefer form-urlencoded as some backends expect it
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);

      try {
        const response = await apiClient.post('http://localhost:8080/api/users/login', form, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
      } catch (err) {
        // Fallback to alternate auth path using JSON body
        const response = await apiClient.post('http://localhost:8080/api/auth/login', { username, password });
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/users/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Inspection Forms API
export const inspectionFormAPI = {
  getAllForms: async () => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/inspection-forms');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormById: async (id) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/inspection-forms/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormsByStatus: async (status) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/inspection-forms/status/${status}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormsBySubmitter: async (submitter) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/inspection-forms/submitter/${submitter}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createForm: async (formData) => {
    try {
      const response = await apiClient.post('http://localhost:8080/api/inspection-forms', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateForm: async (id, formData) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/inspection-forms/${id}`, formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitForm: async (id, submittedBy) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/inspection-forms/${id}/submit`, null, {
        params: { submittedBy },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveForm: async (id, reviewedBy, comments = '') => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/inspection-forms/${id}/approve`, null, {
        params: { reviewedBy, comments },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectForm: async (id, reviewedBy, comments) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/inspection-forms/${id}/reject`, null, {
        params: { reviewedBy, comments },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  downloadPdf: async (id, username) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/inspection-forms/${id}/pdf/${username}`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_form_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  sendEmailWithPdf: async (id, emailData) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/inspection-forms/${id}/email-pdf`, emailData);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
};

// Printing Inspection Forms API
// Printing Inspection API
export const printingInspectionAPI = {
  getAllReports: async () => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/printing-inspection');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getReportById: async (id) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/printing-inspection/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getReportsByStatus: async (status) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/printing-inspection/status`, {
        params: { status }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createReport: async (reportData) => {
    try {
      const response = await apiClient.post('http://localhost:8080/api/printing-inspection', reportData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateReport: async (id, reportData) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/printing-inspection/${id}`, reportData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitReport: async (id, userName) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/printing-inspection/submit/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveReport: async (id, userName, comments = '') => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/printing-inspection/approve/${id}`, null, {
        params: { comments }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectReport: async (id, userName, comments) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/printing-inspection/reject/${id}`, null, {
        params: { comments }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteReport: async (id) => {
    try {
      await apiClient.delete(`http://localhost:8080/api/printing-inspection/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  },

  downloadPdf: async (id, userName) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/printing-inspection/pdf/${id}`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection-report-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  getReportSummary: async () => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/printing-inspection/summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Line Clearance Forms API
export const lineClearanceAPI = {
  getAllForms: async () => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/line-clearance');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormById: async (id) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/line-clearance/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormsByStatus: async (status) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/line-clearance/status/${status}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFormsBySubmitter: async (submitter) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/line-clearance/submitter/${submitter}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createForm: async (formData) => {
    try {
      const response = await apiClient.post('http://localhost:8080/api/line-clearance', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateForm: async (id, formData) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/line-clearance/${id}`, formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitForm: async (id, submittedBy) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/line-clearance/${id}/submit`, null, {
        params: { submittedBy },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveForm: async (id, reviewedBy, comments = '') => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/line-clearance/${id}/approve`, null, {
        params: { reviewedBy, comments },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectForm: async (id, reviewedBy, comments) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/line-clearance/${id}/reject`, null, {
        params: { reviewedBy, comments },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  downloadPdf: async (id, username) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/line-clearance/${id}/pdf/${username}`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `line_clearance_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  sendEmailWithPdf: async (id, emailData) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/line-clearance/${id}/email-pdf`, emailData);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
};

// User Management API
export const userAPI = {
  // Single unified create method
  create: async (userData) => {
    const response = await apiClient.post('http://localhost:8080/api/users', userData);
    return response.data;
  },

  // Single unified update method
  update: async (id, userData) => {
    const response = await apiClient.put(`http://localhost:8080/api/users/${id}`, userData);
    return response.data;
  },

  // Single unified getAll method (returns all users)
  getAll: async () => {
    const response = await apiClient.get('http://localhost:8080/api/users');
    return response.data;
  },

  // Keep as alias for backward compatibility (calls getAll)
  getAllUsers: async () => {
    const response = await apiClient.get('http://localhost:8080/api/users');
    return response.data;
  },

  getHODs: async () => {
    const response = await apiClient.get('http://localhost:8080/api/users/hods');
    return response.data;
  },

  getAllAuditors: async () => {
    const response = await apiClient.get('http://localhost:8080/api/users/all-auditors');
    return response.data;
  },

  getUsersByRole: async (role) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/role/${role}`);
    return response.data;
  },

  // Alias for create (backward compatibility)
  createUser: async (userData) => {
    const response = await apiClient.post('http://localhost:8080/api/users', userData);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/${id}`);
    return response.data;
  },

  getUserByEmail: async (email) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/email/${email}`);
    return response.data;
  },

  getAuditorsForHod: async (hodId) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/hod/${hodId}/auditors`);
    return response.data;
  },

  getAuditeesForHod: async (hodId) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/hod/${hodId}/auditees`);
    return response.data;
  },

  getDefaultsForHod: async (hodId) => {
    const response = await apiClient.get(`http://localhost:8080/api/users/hod/${hodId}/defaults`);
    return response.data;
  },

  updateDefaults: async (hodId, defaults) => {
    const response = await apiClient.put(`http://localhost:8080/api/users/hod/${hodId}/defaults`, defaults);
    return response.data;
  },
};
// --------------------------
// MOC APIs (migrated here)
// --------------------------

export const authApi = {
  login: async (username, password) => (await apiClient.post('http://localhost:8080/api/auth/login', { username, password })).data,
};

export const jsonDataApi = {
  list: async () => {
    const { data } = await apiClient.get('http://localhost:8080/api/public/json-data');
    if (data && typeof data === 'object' && 'success' in data) return data;
    return { success: true, data };
  },
  getById: async (id) => (await apiClient.get(`http://localhost:8080/api/public/json-data/${id}`)).data,
  save: async (payload) => (await apiClient.post('http://localhost:8080/api/public/json-data', payload)).data,
  update: async (id, jsonContent) => (await apiClient.put(`http://localhost:8080/api/public/json-data/${id}`, { jsonContent })).data,
  upsert: async (id, jsonContent) => {
    let body;
    try {
      const parsed = JSON.parse(jsonContent);
      body = { id, ...parsed };
    } catch (e) {
      body = { id, jsonContent };
    }
    return (await apiClient.post('http://localhost:8080/api/public/json-data', body)).data;
  },
  remove: async (id) => (await apiClient.delete(`http://localhost:8080/api/public/json-data/${id}`)).data,
};

export const annexureApi = {
  save: async (type, payload) => (await apiClient.post(`/api/public/annexure/${type}`, payload)).data,
  update: async (type, id, payload) => (await apiClient.post(`/api/public/annexure/${type}/${id}`, payload)).data,
};

export const superAdminApi = {
  createDepartment: async (department) => (await apiClient.post('/api/superadmin/departments', department)).data,
  listDepartments: async () => (await apiClient.get('/api/superadmin/departments')).data,
  updateDepartment: async (id, department) => (await apiClient.put(`/api/superadmin/departments/${id}`, department)).data,
  deleteDepartment: async (id) => (await apiClient.delete(`/api/superadmin/departments/${id}`)).data,
  createRole: async (role) => (await apiClient.post('/api/superadmin/roles', role)).data,
  listRoles: async () => (await apiClient.get('/api/superadmin/roles')).data,
  updateRole: async (id, role) => (await apiClient.put(`/api/superadmin/roles/${id}`, role)).data,
  deleteRole: async (id) => (await apiClient.delete(`/api/superadmin/roles/${id}`)).data,
  createUser: async (user) => (await apiClient.post('/api/superadmin/users', user)).data,
  listUsers: async () => (await apiClient.get('/api/superadmin/users')).data,
  updateUser: async (id, user) => (await apiClient.put(`/api/superadmin/users/${id}`, user)).data,
  deleteUser: async (id) => (await apiClient.delete(`/api/superadmin/users/${id}`)).data,
};

export const adminApi = {
  listDepartments: async () => (await apiClient.get('/api/admin/departments')).data,
  getDepartment: async (id) => (await apiClient.get(`/api/admin/departments/${id}`)).data,
  createRole: async (role) => (await apiClient.post('/api/admin/roles', role)).data,
  listRoles: async () => (await apiClient.get('/api/admin/roles')).data,
  getRole: async (id) => (await apiClient.get(`/api/admin/roles/${id}`)).data,
  updateRole: async (id, role) => (await apiClient.put(`/api/admin/roles/${id}`, role)).data,
  deleteRole: async (id) => (await apiClient.delete(`/api/admin/roles/${id}`)).data,
  createUser: async (user) => (await apiClient.post('/api/admin/users', user)).data,
  listUsers: async () => (await apiClient.get('/api/admin/users')).data,
  getUsersByDepartment: async (departmentId) => (await apiClient.get(`/api/admin/users/department/${departmentId}`)).data,
  getUsersByRole: async (roleId) => (await apiClient.get(`/api/admin/users/role/${roleId}`)).data,
  getUser: async (id) => (await apiClient.get(`/api/admin/users/${id}`)).data,
  updateUser: async (id, user) => (await apiClient.put(`/api/admin/users/${id}`, user)).data,
  deleteUser: async (id) => (await apiClient.delete(`/api/admin/users/${id}`)).data,
};

export const departmentAPI = {
  getActive: async () => (await apiClient.get('/api/superadmin/departments/active')).data,
  getAll: async () => (await apiClient.get('/api/superadmin/departments/active')).data,
  create: async (payload) => (await apiClient.post('/api/superadmin/departments', payload)).data,
  update: async (id, payload) => (await apiClient.put(`/api/superadmin/departments/${id}`, payload)).data,
  delete: async (id) => (await apiClient.delete(`/api/superadmin/departments/${id}`)).data,
};

export const roleAPI = {
  getActive: async () => (await apiClient.get('/api/superadmin/roles/active')).data,
  getAll: async () => (await apiClient.get('/api/superadmin/roles/active')).data,
  create: async (payload) => (await apiClient.post('/api/superadmin/roles', payload)).data,
  update: async (id, payload) => (await apiClient.put(`/api/superadmin/roles/${id}`, payload)).data,
  delete: async (id) => (await apiClient.delete(`/api/superadmin/roles/${id}`)).data,
};

// Avoid name clash with JSW `userAPI` by exporting MOC one as `mocUserAPI`
export const mocUserAPI = {
  getActive: async () => (await apiClient.get('/api/superadmin/users/active')).data,
  getAll: async () => (await apiClient.get('/api/superadmin/users/active')).data,
  create: async (payload) => (await apiClient.post('/api/superadmin/users', payload)).data,
  update: async (id, payload) => (await apiClient.put(`/api/superadmin/users/${id}`, payload)).data,
  delete: async (id) => (await apiClient.delete(`/api/superadmin/users/${id}`)).data,
};

export const publicApi = {
  listActiveDepartments: async () => (await apiClient.get('/api/public/departments')).data,
  listActiveRoles: async () => (await apiClient.get('/api/public/roles')).data,
  listActiveRolesByDepartment: async (departmentId) => (await apiClient.get(`/api/public/roles/department/${departmentId}`)).data,
};

export const fileAPI = {
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/api/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// Export grouped API modules
export default {
  // JSW
  auth: authAPI,
  inspectionForms: inspectionFormAPI,
  printingForms: printingInspectionAPI,
  lineClearance: lineClearanceAPI,
  users: userAPI,
  // MOC
  authApi,
  jsonDataApi,
  annexureApi,
  superAdminApi,
  adminApi,
  departmentAPI,
  roleAPI,
  mocUserAPI,
  publicApi,
  fileAPI,
};

// src/components/services/api.jsx — ADD THIS AT THE BOTTOM

/**
 * Gel Content Reminder Utilities
 * Manages localStorage-based tracking for 24-hour Row 6 reminders
 */

const GEL_REMINDER_KEY = 'gelContentReminders_v1';

// Get all pending reminders from localStorage
export const getGelContentReminders = () => {
  try {
    const raw = localStorage.getItem(GEL_REMINDER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to parse gel content reminders', e);
    return {};
  }
};

// Save updated reminders to localStorage
export const saveGelContentReminders = (reminders) => {
  try {
    localStorage.setItem(GEL_REMINDER_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.error('Failed to save gel content reminders', e);
  }
};

// Add a new reminder when inspection starts
export const addGelContentReminder = (inspectionId, startTime) => {
  const reminders = getGelContentReminders();
  reminders[inspectionId] = {
    inspectionId,
    startTime,
    popupShown: false, // Only shown once
    row6Filled: false,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  saveGelContentReminders(reminders);
};

// Mark popup as shown (so it doesn't reappear)
export const markPopupShown = (inspectionId) => {
  const reminders = getGelContentReminders();
  if (reminders[inspectionId]) {
    reminders[inspectionId].popupShown = true;
    saveGelContentReminders(reminders);
  }
};

// Update inspection state (e.g., after saving Row 6 or submitting)
export const updateGelContentReminder = (inspectionId, { row6Filled, status }) => {
  const reminders = getGelContentReminders();
  if (reminders[inspectionId]) {
    reminders[inspectionId].row6Filled = !!row6Filled;
    reminders[inspectionId].status = status || reminders[inspectionId].status;
    saveGelContentReminders(reminders);
  }
};

// Get list of inspection IDs that are due for popup (24h passed, not shown yet, OPEN, Row6 not filled)
export const getDuePopupReminders = () => {
  const now = Date.now();
  const reminders = getGelContentReminders();
  const due = [];

  for (const id in reminders) {
    const r = reminders[id];
    if (
      !r.popupShown &&
      r.status === 'OPEN' &&
      !r.row6Filled &&
      r.startTime &&
      now - new Date(r.startTime).getTime() >= 3 * 60 * 1000
    ) {
      due.push(id);
    }
  }

  return due;
};

// Get list of inspection IDs that should show in Notification panel (24h passed, OPEN, Row6 not filled)
export const getActiveNotificationReminders = () => {
  const now = Date.now();
  const reminders = getGelContentReminders();
  const active = [];

  for (const id in reminders) {
    const r = reminders[id];
    if (
      r.status === 'OPEN' &&
      !r.row6Filled &&
      r.startTime &&
      now - new Date(r.startTime).getTime() >= 3 * 60 * 1000
    ) {
      active.push({ inspectionId: id, startTime: r.startTime });
    }
  }

  return active;
};

// ======================
// AUDIT API
// ======================
// ======================
// AUDIT API – FIXED scheduleAPI.create to accept shifts
// ======================
export const scheduleAPI = {
  // Single getAll method (remove the duplicate)
  getAll: async () => {
    const response = await apiClient.get('http://localhost:8080/api/schedules/all');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`http://localhost:8080/api/schedules/${id}`);
    return response.data;
  },
  
  // Simple create method
  createSimple: async (scheduleData) => {
    const response = await apiClient.post('http://localhost:8080/api/schedules', scheduleData);
    return response.data;
  },
  
  // Complex create method with shifts, forms, etc.
  create: async (schedule, hodIds, cftIds, shifts, forms, locations) => {
    try {
      console.log('Creating schedule with:', { schedule, hodIds, cftIds, shifts, forms, locations });
      
      const params = new URLSearchParams();
      
      if (hodIds && hodIds.length > 0) {
        hodIds.forEach(id => params.append('hodIds', id.toString()));
      }
      
      if (cftIds && cftIds.length > 0) {
        cftIds.forEach(id => params.append('cftIds', id.toString()));
      }
      
      if (shifts && typeof shifts === 'object') {
        Object.entries(shifts).forEach(([hodId, shift]) => {
          if (shift && shift.trim()) {
            params.append(`shifts[${hodId}]`, shift);
          }
        });
      }
      
      if (forms && typeof forms === 'object') {
        Object.entries(forms).forEach(([hodId, formId]) => {
          if (formId && formId.trim()) {
            params.append(`forms[${hodId}]`, formId);
          }
        });
      }
      
      const scheduleData = {
        scheduleName: schedule.scheduleName || `Schedule ${new Date().toLocaleDateString()}`,
        location: schedule.location || 'Not specified',
        startDate: schedule.startDate,
        endDate: schedule.endDate
      };
      
      console.log('Request URL:', 'http://localhost:8080/api/schedules');
      console.log('Request Params:', params.toString());
      console.log('Request Body:', scheduleData);
      
      const response = await apiClient.post('http://localhost:8080/api/schedules', scheduleData, { params });
      console.log('Schedule created successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Schedule creation error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  submitToDgm: async (id, deputyEmail) => {
    const response = await apiClient.post(`http://localhost:8080/api/schedules/${id}/submit-to-dgm?deputyEmail=${deputyEmail}`);
    return response.data;
  },
  
  approve: async (id, dgmEmail) => {
    const response = await apiClient.post(`http://localhost:8080/api/schedules/${id}/approve?dgmEmail=${dgmEmail}`);
    return response.data;
  },
  
  release: async (id, dgmEmail, externalEmails) => {
    const response = await apiClient.post(`http://localhost:8080/api/schedules/${id}/release?dgmEmail=${dgmEmail}&externalEmails=${externalEmails || ''}`);
    return response.data;
  },
  
  getPendingForDgm: async () => {
    const response = await apiClient.get('http://localhost:8080/api/schedules/pending-dgm');
    return response.data;
  },
  
  getApproved: async () => {
    const response = await apiClient.get('http://localhost:8080/api/schedules/approved');
    return response.data;
  },
};

export const auditAPI = {
  // Get audits for specific auditor
  getForAuditor: async (auditorId) => {
    const response = await apiClient.get(`http://localhost:8080/api/audits/auditor/${auditorId}`);
    return response.data;
  },

  // Get audits for specific auditee
  getForAuditee: async (auditeeId) => {
    const response = await apiClient.get(`http://localhost:8080/api/audits/auditee/${auditeeId}`);
    return response.data;
  },

  // Unified save method (handles both create and update)
  save: async (auditOrId, auditData) => {
    // If first param is object and no second param → create mode
    if (typeof auditOrId === 'object' && !auditData) {
      const response = await apiClient.post('http://localhost:8080/api/audits/save', auditOrId);
      return response.data;
    }
    // If first param is id and second is data → update mode
    if (typeof auditOrId === 'number' || typeof auditOrId === 'string') {
      const response = await apiClient.put(`http://localhost:8080/api/audits/${auditOrId}/save`, auditData);
      return response.data;
    }
    throw new Error('Invalid parameters for auditAPI.save');
  },

  // Unified start method
  start: async (id) => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/start`);
    return response.data;
  },

  // Unified submit method (handles with or without findings)
  submit: async (id, findings = null) => {
    const payload = findings ? findings : {};
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/submit`, payload);
    return response.data;
  },

  approve: async (id, comments = '') => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/approve`, null, {
      params: { comments }
    });
    return response.data;
  },

  reject: async (id, comments) => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/reject`, null, {
      params: { comments }
    });
    return response.data;
  },

  // Unified getAll method
  getAll: async () => {
    const response = await apiClient.get('http://localhost:8080/api/audits/all');
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getForDeputy: async (deputyEmail) => {
    const response = await apiClient.get(`http://localhost:8080/api/audits/deputy/${deputyEmail}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getForHod: async (hodEmail) => {
    const response = await apiClient.get(`http://localhost:8080/api/audits/hod/${hodEmail}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  getCompleted: async () => {
    const response = await apiClient.get('http://localhost:8080/api/audits/completed');
    return response.data;
  },

  close: async (id) => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/close`);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`http://localhost:8080/api/audits/${id}`);
    return response.data;
  },

  reassignAudit: async (auditId, data, hodEmail) => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${auditId}/reassign?hodEmail=${hodEmail}`, data);
    return response.data;
  },

  signOff: async (id, data) => {
    const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/sign-off`, data);
    return response.data;
  },

  downloadPdf: async (id, userName = '') => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/audits/${id}/pdf`, {
        params: userName ? { userName } : {},
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });

      const disposition = response.headers['content-disposition'] || '';
      const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = fileNameMatch?.[1] || `audit_report_${id}.pdf`;
     
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  downloadPdfWithSignatures: async (id, signatureData) => {
    try {
      const response = await apiClient.post(`http://localhost:8080/api/audits/${id}/pdf-with-signatures`, signatureData, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });

      const disposition = response.headers['content-disposition'] || '';
      const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = fileNameMatch?.[1] || `audit_report_${id}.pdf`;
     
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading PDF with signatures:', error);
      throw error;
    }
  },

  fetchSignatureByName: async (firstName, lastName) => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/users/signature', {
        params: { firstName, lastName },
        responseType: 'blob'
      });
     
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.error('Error fetching signature:', error);
      return null;
    }
  },

  fetchUserByName: async (firstName, lastName) => {
    try {
      const response = await apiClient.get('http://localhost:8080/api/users/by-name', {
        params: { firstName, lastName }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  fetchSignatureById: async (userId) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/users/${userId}/signature`, {
        responseType: 'blob'
      });
     
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.error('Error fetching signature by ID:', error);
      return null;
    }
  },
};
 
// ✅ NEW: Export signature helper functions separately for convenience
export const signatureAPI = {
  fetchByName: auditAPI.fetchSignatureByName,
  fetchById: auditAPI.fetchSignatureById,
  fetchUserByName: auditAPI.fetchUserByName,
};
  

export const ncrAPI = {
  getAll: async () => {
    const response = await apiClient.get('http://localhost:8080/api/ncr/all');
    return response.data;
  },
  getByAuditId: async (auditId) => {
    const response = await apiClient.get(`http://localhost:8080/api/ncr/audit/${auditId}`);
    return response.data;
  },
  getByAssignee: async (assigneeId) => {
    const response = await apiClient.get(`http://localhost:8080/api/ncr/auditee/${assigneeId}`);
    return response.data;
  },
  getByAuditor: async (auditorId) => {
    const response = await apiClient.get(`http://localhost:8080/api/ncr/auditor/${auditorId}`);
    return response.data;
  },
  getPendingReview: async () => {
    const response = await apiClient.get('http://localhost:8080/api/ncr/pending-review');
    return response.data;
  },
  getPendingVerification: async () => {
    const response = await apiClient.get('http://localhost:8080/api/ncr/pending-verification');
    return response.data;
  },
  create: async (ncrData) => {
    const response = await apiClient.post('http://localhost:8080/api/ncr/create', ncrData);
    return response.data;
  },
  submitCorrectiveAction: async (id, actionData) => {
    const response = await apiClient.put(`http://localhost:8080/api/ncr/${id}/corrective-action`, actionData);
    return response.data;
  },
  verifyAndClose: async (id, verificationData) => {
    const response = await apiClient.put(`http://localhost:8080/api/ncr/${id}/verify`, verificationData);
    return response.data;
  },
  sendTo8D: async (ncrId, comment, auditManagerId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/ncr/${ncrId}/send-to-8d`,
      { comment, auditManagerId },  // This is correct
      { withCredentials: true }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to send to 8D' 
    };
  }
},
};

// ======================
// NOTIFICATION API
// ======================
export const notificationAPI = {
  // Get all notifications for current user
  getForUser: async (userId) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/notifications/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },
  
  // Get unread count
  getUnreadCount: async (userId) => {
    try {
      const response = await apiClient.get(`http://localhost:8080/api/notifications/user/${userId}/unread-count`);
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },
  
  // Mark single notification as read
  markAsRead: async (notificationId, userId) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/notifications/${notificationId}/read?userId=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  // Mark all notifications as read
  markAllAsRead: async (userId) => {
    try {
      const response = await apiClient.put(`http://localhost:8080/api/notifications/user/${userId}/read-all`);
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },
  
  // Clear all notifications
  clearAll: async (userId) => {
    try {
      const response = await apiClient.delete(`http://localhost:8080/api/notifications/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  },
  // Send notification to specific user
  sendToUser: async (userId, title, message, type, navigateTo, location) => {
    try {
      const response = await apiClient.post('http://localhost:8080/api/notifications/send-to-user', {
        userId,
        title,
        message,
        type,
        navigateTo,
        location
      });
      return response.data;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  },
  
  // Send notification to all users with a role
  sendToRole: async (role, title, message, type, navigateTo, location) => {
    try {
      const response = await apiClient.post('http://localhost:8080/api/notifications/send-to-role', {
        role,
        title,
        message,
        type,
        navigateTo,
        location
      });
      return response.data;
    } catch (error) {
      console.error('Error sending notification to role:', error);
      throw error;
    }
  }

};
