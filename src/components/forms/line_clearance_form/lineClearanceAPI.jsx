import axios from 'axios';

// Base URL for API endpoints
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${API_BASE_URL}/api/line-clearance-reports`;

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

// Get all line clearance reports
const getAllReports = async () => {
    try {
        const response = await axios.get(API_ENDPOINT);
        return response.data;
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

// Create a new report
const createReport = async (reportData) => {
    try {
        const response = await axios.post(API_ENDPOINT, reportData);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
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

// Submit a report
const submitReport = async (id, submittedBy) => {
    try {
        const response = await axios.post(`${API_ENDPOINT}/${id}/submit`, null, {
            params: { submittedBy }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Approve a report
const approveReport = async (id, reviewedBy, comments = '') => {
    try {
        const response = await axios.post(`${API_ENDPOINT}/${id}/approve`, null, {
            params: { reviewedBy, comments }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Reject a report
const rejectReport = async (id, reviewedBy, comments) => {
    try {
        const response = await axios.post(`${API_ENDPOINT}/${id}/reject`, null, {
            params: { reviewedBy, comments }
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
const downloadPdf = async (id, userName) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/${id}/pdf`, {
            params: { userName },
            responseType: 'blob'
        });
        
        // Create a blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `line_clearance_report_${id}.pdf`);
        
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

// Email PDF
const emailPdf = async (id, emailRequest, userName = null) => {
    try {
        let endpoint = `${API_ENDPOINT}/${id}/email-pdf`;
        
        if (userName) {
            endpoint = `${API_ENDPOINT}/${id}/email-pdf/${userName}`;
        }
        
        const response = await axios.post(endpoint, emailRequest);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by status
const getReportsByStatus = async (status) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/status/${status}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by date range
const getReportsByDateRange = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/date-range`, {
            params: { startDate, endDate }
        });
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by production area
const getReportsByProductionArea = async (area) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/production-area/${area}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by submitter
const getReportsBySubmitter = async (submitter) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/submitter/${submitter}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by reviewer
const getReportsByReviewer = async (reviewer) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/reviewer/${reviewer}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by line
const getReportsByLine = async (line) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/line/${line}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Get reports by product name
const getReportsByProductName = async (productName) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/product/${productName}`);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
};

// Export all API functions
export const lineClearanceAPI = {
    getAllReports,
    getReportById,
    createReport,
    updateReport,
    submitReport,
    approveReport,
    rejectReport,
    deleteReport,
    downloadPdf,
    emailPdf,
    getReportsByStatus,
    getReportsByDateRange,
    getReportsByProductionArea,
    getReportsBySubmitter,
    getReportsByReviewer,
    getReportsByLine,
    getReportsByProductName
};

export default lineClearanceAPI;