import axios from 'axios';

// Base URL for API endpoints
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${API_BASE_URL}/api/incoming-quality-reports`;

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

// Get all quality inspection reports
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

// Submit a report for approval
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

// Delete a report (only available for DRAFT or REJECTED reports)
const deleteReport = async (id) => {
  try {
    await axios.delete(`${API_ENDPOINT}/${id}`);
    return true;
  } catch (error) {
    return handleError(error);
  }
};

// Download PDF
const downloadReportPdf = async (id, userName) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/${id}/pdf/${userName}`, {
      responseType: 'blob',
    });

    // Create blob URL and download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Quality_Inspection_Report_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (error) {
    handleError(error); // Optional: log or alert error
  }
};


// Send email with PDF attachment
const sendEmailWithPdf = async (id, emailRequest, userName = null) => {
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

// Get reports by product name
const getReportsByProductName = async (productName) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/product/${productName}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Get reports by supplier
const getReportsBySupplier = async (supplier) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/supplier/${supplier}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Get reports by batch number
const getReportsByBatchNumber = async (batchNumber) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/batch/${batchNumber}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Get reports by quality decision
const getReportsByQualityDecision = async (decision) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/quality-decision/${decision}`);
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

// Export all API functions
export const QualityInspectionAPI = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  submitReport,
  approveReport,
  rejectReport,
  deleteReport,
  downloadReportPdf,
  sendEmailWithPdf,
  getReportsByStatus,
  getReportsByDateRange,
  getReportsByProductName,
  getReportsBySupplier,
  getReportsByBatchNumber,
  getReportsByQualityDecision,
  getReportsBySubmitter,
  getReportsByReviewer
};

export default QualityInspectionAPI;