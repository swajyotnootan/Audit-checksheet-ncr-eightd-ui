// src/components/services/ncrService.js

import axios from 'axios';

const API_BASE_URL = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const ncrService = {
  createNCR: async (ncrData) => {
    try {
      const response = await apiClient.post('/ncr/create', ncrData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Create NCR error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to create NCR.') };
    }
  },

  getAllNCRs: async () => {
    try {
      const response = await apiClient.get('/ncr/all');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch all NCRs error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch NCRs.') };
    }
  },

  getNCRById: async (ncrId) => {
    try {
      const response = await apiClient.get(`/ncr/${ncrId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch NCR error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch NCR.') };
    }
  },

  // In ncrService.js
// In services/ncrService.js

async sendTo8D(id, comment, userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/ncr/${id}/send-to-8d`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ comment, userId })
        });

        const data = await response.json();

        if (!response.ok) {
            // ✅ Return error structureform7de
            return { success: false, error: data.message || "Server error" };
        }

        return { success: true, data: data };
    } catch (error) {
        console.error("Send to 8D API Error:", error);
        return { success: false, error: error.message };
    }
},

// Add this method to your ncrService object
submitNCR2: async (ncrId, actionData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/ncr/${ncrId}/submit-ncr2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(actionData),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
},

getPendingNCR2: async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/ncr/ncr2-pending`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
},

// ncrService.js - Add this method
verifyNCR2: async (ncrId, accepted, comment) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://qsutrarmsclm.hub.swajyot.co.in:8476/api/ncr/${ncrId}/verify-ncr2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accepted, comment }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
},

  getNCRsByAuditId: async (auditId) => {
    try {
      const response = await apiClient.get(`/ncr/audit/${auditId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch NCRs by audit error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch NCRs.') };
    }
  },

  getNCRsForAuditor: async (auditorId) => {
    try {
      const response = await apiClient.get(`/ncr/auditor/${auditorId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch auditor NCRs error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch NCRs.') };
    }
  },

  getNCRsForAuditee: async (auditeeId) => {
    try {
      const response = await apiClient.get(`/ncr/auditee/${auditeeId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch auditee NCRs error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch NCRs.') };
    }
  },

  getPendingManagerReview: async () => {
    try {
      const response = await apiClient.get('/ncr/pending-review');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch pending manager review NCRs error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch pending review NCRs.') };
    }
  },

  getPendingVerification: async () => {
    try {
      const response = await apiClient.get('/ncr/pending-verification');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fetch pending verification NCRs error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to fetch pending verification NCRs.') };
    }
  },

  reviewNCR: async (ncrId, comment, approved) => {
  try {
    const response = await apiClient.put(`/ncr/${ncrId}/review`, {
      approved: approved,  // This is boolean
      comment: comment      // This is string
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Manager review NCR error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to review NCR.') };
  }
},

  // ✅ NEW: Auditee reviews NCR (Step 2)
  auditeeReviewNCR: async (ncrId, approved, comment, signature) => {
    try {
      const response = await apiClient.put(`/ncr/${ncrId}/auditee-review`, {
        approved: approved,
        comment: comment,
        signature: signature
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Auditee review NCR error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to submit review.') };
    }
  },

  submitCorrectiveAction: async (ncrId, actionData) => {
    try {
      const response = await apiClient.put(`/ncr/${ncrId}/corrective-action`, actionData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Submit corrective action error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to submit corrective action.') };
    }
  },

  verifyAndClose: async (ncrId, accepted, comment) => {
    try {
      const response = await apiClient.put(`/ncr/${ncrId}/verify`, {
        accepted: accepted,
        comment: comment
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Verify NCR error:', error);
      return { success: false, error: getErrorMessage(error, 'Failed to verify NCR.') };
    }
  },
};