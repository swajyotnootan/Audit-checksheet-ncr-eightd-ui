import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaHourglassHalf, 
  FaCalendarAlt,
  FaFileAlt,
  FaSearch,
  FaClock,
  FaUser,
  FaIndustry
} from 'react-icons/fa';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';

// Updated API service for coating inspection reports
const API_BASE_URL = 'http://localhost:8080';

const coatingInspectionAPI = {
  // Get comprehensive analytics
  getAnalytics: async (timeframe = 'month', startDate = null, endDate = null) => {
    const params = new URLSearchParams({ timeframe });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },

  // Get specific analytics data
  getStatusCounts: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/status-counts`);
    if (!response.ok) throw new Error('Failed to fetch status counts');
    return response.json();
  },

  getTimeSeriesData: async (timeframe = 'month') => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/time-series?timeframe=${timeframe}`);
    if (!response.ok) throw new Error('Failed to fetch time series data');
    return response.json();
  },

  getFormsByProduct: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/by-product`);
    if (!response.ok) throw new Error('Failed to fetch product data');
    return response.json();
  },

  getFormsByLine: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/by-line`);
    if (!response.ok) throw new Error('Failed to fetch line data');
    return response.json();
  },

  getFormsBySubmitter: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/by-submitter`);
    if (!response.ok) throw new Error('Failed to fetch submitter data');
    return response.json();
  },

  getApprovalTimeAnalysis: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/approval-times`);
    if (!response.ok) throw new Error('Failed to fetch approval time data');
    return response.json();
  },

  getPerformanceMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/performance-metrics`);
    if (!response.ok) throw new Error('Failed to fetch performance metrics');
    return response.json();
  },

  getRecentActivity: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/recent-activity`);
    if (!response.ok) throw new Error('Failed to fetch recent activity');
    return response.json();
  },

  getMonthlyTrends: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/analytics/monthly-trends`);
    if (!response.ok) throw new Error('Failed to fetch monthly trends');
    return response.json();
  },

  // CRUD operations for reports
  getAllReports: async () => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
  },

  getReportById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}`);
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  },

  createReport: async (report) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error('Failed to create report');
    return response.json();
  },

  updateReport: async (id, report) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error('Failed to update report');
    return response.json();
  },

  deleteReport: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete report');
    return response.ok;
  },

  // Status operations
  submitReport: async (id, submittedBy) => {
    const params = new URLSearchParams({ submittedBy });
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/submit?${params}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to submit report');
    return response.json();
  },

  approveReport: async (id, reviewedBy, comments = '') => {
    const params = new URLSearchParams({ reviewedBy });
    if (comments) params.append('comments', comments);
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/approve?${params}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to approve report');
    return response.json();
  },

  rejectReport: async (id, reviewedBy, comments) => {
    const params = new URLSearchParams({ reviewedBy, comments });
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/reject?${params}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reject report');
    return response.json();
  },

  // Filter operations
  getReportsByStatus: async (status) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/status/${status}`);
    if (!response.ok) throw new Error('Failed to fetch reports by status');
    return response.json();
  },

  getReportsBySubmitter: async (submitter) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/submitter/${submitter}`);
    if (!response.ok) throw new Error('Failed to fetch reports by submitter');
    return response.json();
  },

  getReportsByReviewer: async (reviewer) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/reviewer/${reviewer}`);
    if (!response.ok) throw new Error('Failed to fetch reports by reviewer');
    return response.json();
  },

  getReportsByProduct: async (product) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/product/${product}`);
    if (!response.ok) throw new Error('Failed to fetch reports by product');
    return response.json();
  },

  getReportsByVariant: async (variant) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/variant/${variant}`);
    if (!response.ok) throw new Error('Failed to fetch reports by variant');
    return response.json();
  },

  getReportsByLineNo: async (lineNo) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/line/${lineNo}`);
    if (!response.ok) throw new Error('Failed to fetch reports by line number');
    return response.json();
  },

  getReportsByDateRange: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/date-range?${params}`);
    if (!response.ok) throw new Error('Failed to fetch reports by date range');
    return response.json();
  },

  // PDF operations
  generatePdf: async (id, userName = '') => {
    const params = userName ? new URLSearchParams({ userName }) : '';
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/pdf?${params}`);
    if (!response.ok) throw new Error('Failed to generate PDF');
    return response.blob();
  },

  generatePdfWithUser: async (id, userName) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/pdf/${userName}`);
    if (!response.ok) throw new Error('Failed to generate PDF');
    return response.blob();
  },

  // Email operations
  emailPdf: async (id, emailRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/email-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequest),
    });
    if (!response.ok) throw new Error('Failed to send email');
    return response.json();
  },

  emailPdfWithUser: async (id, userName, emailRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/coating-inspection-reports/${id}/email-pdf/${userName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequest),
    });
    if (!response.ok) throw new Error('Failed to send email');
    return response.json();
  },

  // Utility functions
  downloadPdf: async (id, userName = '', filename = null) => {
    try {
      const blob = await coatingInspectionAPI.generatePdf(id, userName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `coating_inspection_report_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  // Error handling utility
  handleApiError: (error) => {
    console.error('API Error:', error);
    
    if (error.message.includes('404')) {
      return 'Resource not found';
    } else if (error.message.includes('403')) {
      return 'Access denied';
    } else if (error.message.includes('500')) {
      return 'Server error occurred';
    } else if (error.message.includes('Failed to fetch')) {
      return 'Network error - please check your connection';
    }
    
    return error.message || 'An unexpected error occurred';
  }
};

const FormsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [analyticsData, setAnalyticsData] = useState({
    formCounts: {
      total: 0,
      approved: 0,
      rejected: 0,
      submitted: 0,
      draft: 0,
      approvedPercentage: 0,
      rejectedPercentage: 0,
      pendingPercentage: 0,
      draftPercentage: 0
    },
    timeSeriesData: [],
    formsByProduct: [],
    formsByLine: [],
    approvalTimeData: [],
    performanceMetrics: {
      approvalRate: 0,
      averageProcessingTimeHours: 0,
      formsThisMonth: 0,
      formsToday: 0
    },
    recentActivity: [],
    lastUpdated: null
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch comprehensive analytics data
      const analytics = await coatingInspectionAPI.getAnalytics(timeframe);
      
      setAnalyticsData({
        formCounts: analytics.formCounts || {},
        timeSeriesData: analytics.timeSeriesData || [],
        formsByProduct: analytics.formsByProduct || [],
        formsByLine: analytics.formsByLine || [],
        approvalTimeData: analytics.approvalTimeData || [],
        performanceMetrics: analytics.performanceMetrics || {},
        recentActivity: analytics.recentActivity || [],
        lastUpdated: analytics.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchAnalyticsData();
  };

  // Color configuration
  const COLORS = {
    approved: '#34D399', // green
    rejected: '#F87171', // red
    pending: '#60A5FA', // blue
    draft: '#D1D5DB',   // gray
    total: '#8B5CF6'     // purple
  };
  
  const PIECHART_COLORS = ['#34D399', '#F87171', '#60A5FA', '#D1D5DB'];

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'SUBMITTED': return 'text-blue-600 bg-blue-100';
      case 'DRAFT': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'APPROVED': return <FaCheckCircle className="text-green-500" />;
      case 'REJECTED': return <FaTimesCircle className="text-red-500" />;
      case 'SUBMITTED': return <FaFileAlt className="text-blue-500" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center  h-64">
        <div className="text-gray-500">Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={refreshData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center">
          <FaChartLine className="mr-2 text-blue-600" />
           FAIR Coating Inspection Reports Analytics
        </h2>
        
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('year')}
          >
            Year
          </button>
          <button 
            onClick={refreshData}
            className="px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Performance Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Approval Rate</p>
              <p className="text-2xl font-bold">{analyticsData.performanceMetrics.approvalRate || 0}%</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaCheckCircle size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Avg Processing Time</p>
              <p className="text-2xl font-bold">{analyticsData.performanceMetrics.averageProcessingTimeHours || 0}h</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaClock size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Forms This Month</p>
              <p className="text-2xl font-bold">{analyticsData.performanceMetrics.formsThisMonth || 0}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaCalendarAlt size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Forms Today</p>
              <p className="text-2xl font-bold">{analyticsData.performanceMetrics.formsToday || 0}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaFileAlt size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Forms Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Total Forms</p>
              <p className="text-2xl font-bold">{analyticsData.formCounts.total}</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaFileAlt size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Approved</p>
              <p className="text-2xl font-bold">{analyticsData.formCounts.approved}</p>
              <p className="text-xs opacity-80">{analyticsData.formCounts.approvedPercentage || 0}%</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaCheckCircle size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Rejected</p>
              <p className="text-2xl font-bold">{analyticsData.formCounts.rejected}</p>
              <p className="text-xs opacity-80">{analyticsData.formCounts.rejectedPercentage || 0}%</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaTimesCircle size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Pending</p>
              <p className="text-2xl font-bold">{analyticsData.formCounts.pending}</p>
              <p className="text-xs opacity-80">{analyticsData.formCounts.pendingPercentage || 0}%</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaHourglassHalf size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-80">Draft</p>
              <p className="text-2xl font-bold">{analyticsData.formCounts.draft}</p>
              <p className="text-xs opacity-80">{analyticsData.formCounts.draftPercentage || 0}%</p>
            </div>
            <div className="p-2 bg-white bg-opacity-30 rounded-md">
              <FaFileAlt size={20} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Form Status Distribution */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Form Status Distribution</h3>
        <div className="flex flex-col md:flex-row items-center justify-around">
          <div className="w-80 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approved', value: analyticsData.formCounts.approved },
                    { name: 'Rejected', value: analyticsData.formCounts.rejected },
                    { name: 'Pending', value: analyticsData.formCounts.pending },
                    { name: 'Draft', value: analyticsData.formCounts.draft }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {[
                    { name: 'Approved', value: analyticsData.formCounts.approved },
                    { name: 'Rejected', value: analyticsData.formCounts.rejected },
                    { name: 'Pending', value: analyticsData.formCounts.pending },
                    { name: 'Draft', value: analyticsData.formCounts.draft }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIECHART_COLORS[index % PIECHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3 mt-4 md:mt-0">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 rounded-sm mr-2"></div>
              <span>Approved: {analyticsData.formCounts.approved} forms ({analyticsData.formCounts.approvedPercentage || 0}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 rounded-sm mr-2"></div>
              <span>Rejected: {analyticsData.formCounts.rejected} forms ({analyticsData.formCounts.rejectedPercentage || 0}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-400 rounded-sm mr-2"></div>
              <span>Pending: {analyticsData.formCounts.pending} forms ({analyticsData.formCounts.pendingPercentage || 0}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-400 rounded-sm mr-2"></div>
              <span>Draft: {analyticsData.formCounts.draft} forms ({analyticsData.formCounts.draftPercentage || 0}%)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Forms Activity Timeline */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Forms Activity Timeline</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={analyticsData.timeSeriesData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="submitted" 
                name="Submitted" 
                stackId="1"
                stroke="#8B5CF6" 
                fill="#8B5CF6"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="approved" 
                name="Approved" 
                stackId="2"
                stroke="#34D399" 
                fill="#34D399"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="rejected" 
                name="Rejected" 
                stackId="3"
                stroke="#F87171" 
                fill="#F87171"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Approval Time Distribution */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Approval Time Distribution</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.approvalTimeData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Forms Approved" 
                fill="#60A5FA" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Two column layout for product and line data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms by Product */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <FaIndustry className="mr-2" />
            Forms by Product
          </h3>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Approved</th>
                  <th className="p-2 text-left">Rate</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.formsByProduct.slice(0, 10).map((product, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2">{product.total}</td>
                    <td className="p-2 text-green-600">{product.approved}</td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="text-xs mr-2">{product.approvalRate || 0}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${product.approvalRate || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Forms by Line */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Forms by Production Line</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.formsByLine.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="count" 
                  name="Form Count" 
                  fill="#8B5CF6" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <FaUser className="mr-2" />
          Recent Activity
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {analyticsData.recentActivity.length > 0 ? 
            analyticsData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.activityType)}
                  <div>
                    <p className="font-medium">
                      Report {activity.documentNo} - {activity.product}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.activityType} by {activity.activityBy}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(activity.activityDate)}
                  </p>
                </div>
              </div>
            )) :
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          }
        </div>
      </div>
      
      <div className="text-sm text-black-500 italic text-right">
        Last updated: {analyticsData.lastUpdated ? formatDateTime(analyticsData.lastUpdated) : 'Never'}
      </div>
    </div>
  );
};

export default FormsAnalytics;