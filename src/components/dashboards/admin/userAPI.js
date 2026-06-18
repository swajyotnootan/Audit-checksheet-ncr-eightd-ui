// userAPI.js
import axios from 'axios';

// Axios instance configuration
const api = axios.create({
  baseURL: 'https://internalaudit.hub.swajyot.co.in:8090/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// User API abstraction using Axios instance
export const userAPI = {
  getAll: () => api.get('/users'),
  
  getRoles: (params = {}) => api.get('/users/roles', { params }),
  
  getUserById: (id) => api.get(`/users/${id}`),
  
  getUsersByRole: (role) => api.get(`/users/role/${role}`),
  
  getActiveUsers: () => api.get('/users/active'),
  
  create: (userData) => {
    console.log('API: Creating user with data:', userData);
    
    // Transform the data to match backend DTO exactly
    const transformedData = {
      namePrefix: userData.namePrefix || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      userName: userData.userName || null, // Backend expects 'userName' but maps to 'username'
      email: userData.email || null,
      phone: userData.phone || null,
      dateOfBirth: userData.dateOfBirth || null,
      gender: userData.gender || null, // Should be uppercase (MALE, FEMALE, OTHER)
      role: userData.role || null,
      password: userData.password || null,
      status: userData.status !== undefined ? userData.status : true, // Maps to 'active' in backend
      signature: userData.signature || null, // Base64 string
      profilePhoto: userData.profilePhoto || null, // Base64 string
      site: userData.site || null,
      location: userData.location || null,
      reportingToId: userData.reportingToId || null   // ID of the HOD this user reports to

    };
    
    console.log('API: Transformed data for backend:', transformedData);
    return api.post('/users', transformedData);
  },
  
  update: (id, userData) => {
    console.log('API: Updating user with data:', userData);
    
    // Transform the data to match backend DTO exactly
    const transformedData = {
      namePrefix: userData.namePrefix || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      userName: userData.userName || null,
      email: userData.email || null,
      phone: userData.phone || null,
      dateOfBirth: userData.dateOfBirth || null,
      gender: userData.gender || null,
      role: userData.role || null,
      status: userData.status !== undefined ? userData.status : null, // Maps to 'active' in backend
      signature: userData.signature || null, // Base64 string
      profilePhoto: userData.profilePhoto || null, // Base64 string
      site: userData.site || null,
      location: userData.location || null,
      reportingToId: userData.reportingToId || null   // ID of the HOD this user reports to
    };
    
    console.log('API: Transformed update data for backend:', transformedData);
    return api.put(`/users/${id}`, transformedData);
  },
  
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  
  deleteUser: (id) => api.delete(`/users/${id}`),
  
  // Authentication
  login: (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    return api.post('/users/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  
  // Signature specific methods
  uploadSignature: (userId, file) => {
    const formData = new FormData();
    formData.append('signature', file);
    return api.post(`/users/${userId}/signature`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  getSignature: (userId) => api.get(`/users/${userId}/signature`, {
    responseType: 'blob'
  }),
  
  deleteSignature: (userId) => api.delete(`/users/${userId}/signature`),
  
  // Profile photo specific methods
  uploadProfilePhoto: (userId, file) => {
    const formData = new FormData();
    formData.append('profilePhoto', file);
    return api.post(`/users/${userId}/profile-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  getProfilePhoto: (userId) => api.get(`/users/${userId}/profile-photo`, {
    responseType: 'blob'
  }),
  
  deleteProfilePhoto: (userId) => api.delete(`/users/${userId}/profile-photo`),
  
  // Helper methods to get URLs for display
  getSignatureUrl: (userId) => `https://internalaudit.hub.swajyot.co.in:8090/api/users/${userId}/signature`,
  
  getProfilePhotoUrl: (userId) => `https://internalaudit.hub.swajyot.co.in:8090/api/users/${userId}/profile-photo`,

  // After the existing methods, add:

getAuditorsForHod: (hodId) => api.get(`/users/hod/${hodId}/auditors`),

getAuditeesForHod: (hodId) => api.get(`/users/hod/${hodId}/auditees`),
  
  // Utility method to validate user data before sending
  validateUserData: (userData, isEdit = false) => {
    const errors = [];
    
    if (!userData.firstName) errors.push('First name is required');
    if (!userData.lastName) errors.push('Last name is required');
    if (!userData.email) errors.push('Email is required');
    if (!userData.role) errors.push('Role is required');
    if (!userData.gender) errors.push('Gender is required');
    if (!userData.dateOfBirth) errors.push('Date of birth is required');
    if (!userData.namePrefix) errors.push('Name prefix is required');
    if (!userData.userName) errors.push('Username is required');
    
    // Password is only required for new users
    if (!isEdit && !userData.password) {
      errors.push('Password is required for new users');
    }
    
    // Email validation
    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Gender validation
    if (userData.gender && !['MALE', 'FEMALE', 'OTHER'].includes(userData.gender.toUpperCase())) {
      errors.push('Gender must be MALE, FEMALE, or OTHER');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Error Data:', error.response.data);
      console.error('Error Status:', error.response.status);
      console.error('Error Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error Message:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);