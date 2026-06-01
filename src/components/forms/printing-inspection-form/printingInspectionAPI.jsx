import axios from 'axios';

// Base URL for API endpoints
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${API_BASE_URL}/api/printing-inspection`;

// Function to handle API errors
const handleError = (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        throw new Error(error.response.data.message || 'An error occurred');
    } else if (error.request) {
        // The request was made but no response was received
        console.error('Request error:', error.request);
        throw new Error('No response from server. Please check your network connection.');
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        throw new Error('Error setting up request: ' + error.message);
    }
};

// Get all printing inspection reports
const getAllReports = async () => {
    try {
        const response = await axios.get(API_ENDPOINT);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by submitter
const getReportsBySubmitter = async (submitter) => {
    try {
        // Since there's no direct endpoint for filtering by submitter,
        // we'll fetch all and filter client-side
        const allReports = await getAllReports();
        return allReports.filter(report => report.submittedBy === submitter);
    } catch (error) {
        return handleError(error);
    }
};

// Get a specific report by ID
const getReportById = async (id) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get form by id (alias for getReportById for compatibility)
const getFormById = async (id) => {
    return getReportById(id);
};

// Create a new report
const createReport = async (reportData) => {
    try {
        const response = await axios.post(API_ENDPOINT, reportData);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Create a new form (alias for createReport for compatibility)
const createForm = async (formData) => {
    return createReport(formData);
};

// Update an existing report
const updateReport = async (id, reportData) => {
    try {
        const response = await axios.put(`${API_ENDPOINT}/${id}`, reportData);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Update a form (alias for updateReport for compatibility)
const updateForm = async (id, formData) => {
    return updateReport(id, formData);
};

// Submit a report
const submitReport = async (id, submittedBy) => {
    try {
        const response = await axios.put(`${API_ENDPOINT}/submit/${id}`, null, {
            params: { user: submittedBy }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Approve a report
const approveReport = async (id, reviewedBy, comments = '') => {
    try {
        const response = await axios.put(`${API_ENDPOINT}/approve/${id}`, null, {
            params: { 
                user: reviewedBy, 
                comments 
            }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Reject a report
const rejectReport = async (id, reviewedBy, comments) => {
    try {
        const response = await axios.put(`${API_ENDPOINT}/reject/${id}`, null, {
            params: { 
                user: reviewedBy, 
                comments 
            }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Delete a report
const deleteReport = async (id) => {
    try {
        await axios.delete(`${API_ENDPOINT}/${id}`);
        return true;
    } catch (error) {
        return handleError(error);
    }
};

// Download PDF
const downloadPdf = async (id, userName = '') => {
    try {
        let url = `${API_ENDPOINT}/pdf/${id}`;
        
        // If userName is provided, use the endpoint with userName parameter
        if (userName) {
            url = `${API_ENDPOINT}/pdf/${id}/${encodeURIComponent(userName)}`;
        }
        
        const response = await axios.get(url, {
            responseType: 'blob'
        });
        
        // Create a blob link to download
        const url2 = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url2;
        link.setAttribute('download', `printing-inspection-report-${id}.pdf`);
        
        // Append to html link element page
        document.body.appendChild(link);
        
        // Start download
        link.click();
        
        // Clean up and remove the link
        link.parentNode.removeChild(link);
        
        return true;
    } catch (error) {
        return handleError(error);
    }
};

// Send email with PDF
const sendEmailWithPdf = async (id, emailData, userName = '') => {
    try {
        let url = `${API_ENDPOINT}/${id}/email-pdf`;
        
        // If userName is provided, use the endpoint with userName parameter
        if (userName && userName !== 'Anonymous') {
            url = `${API_ENDPOINT}/${id}/email-pdf/${encodeURIComponent(userName)}`;
        }
        
        const payload = {
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body
        };
        
        const response = await axios.post(url, payload);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by status
const getReportsByStatus = async (status) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/status`, {
            params: { status }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by status (alias for forms)
const getFormsByStatus = async (status) => {
    return getReportsByStatus(status);
};

// Get report summary
const getReportSummary = async () => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/summary`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Export all API functions
export const printingInspectionAPI = {
    getAllReports,
    getReportById,
    getFormById,         // Added for compatibility
    createReport,
    createForm,          // Added for compatibility
    updateReport,
    updateForm,          // Added for compatibility
    submitReport,
    approveReport,
    rejectReport,
    deleteReport,
    downloadPdf,
    sendEmailWithPdf,    // Corrected method
    getReportsByStatus,
    getFormsByStatus,    // Added for compatibility
    getReportSummary,
    getReportsBySubmitter // Added for filtering by submitter
};

export default printingInspectionAPI;