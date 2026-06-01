import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FormHeader, StatusBanner } from '../CommonCode';
import { QualityInspectionAPI } from './QualityInspectionAPI';
import EmailModal from './QualityInspectionEmailModal';
import QASign from '../../../assets/QASign.png';
import OperatorSign from '../../../assets/OperatorSign.png';
import logo from '../../../assets/RenewsysLogo.png';

import { ArrowLeft, Info } from 'lucide-react';

const QualityInspectionForm = ({ isNew = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(id && !isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  // Define permissions based on user role and form status
  const [permissions, setPermissions] = useState({
    canEditDocumentInfo: false,
    canEditInspectionDetails: false,
    canEditAuditResults: false,
    canEditTestResults: false,
    canSubmit: false,
    canQAReject: false,
    canQASubmit: false,
    canReject: false,
    canApprove: false,
    canSaveDraft: false,
    canDownloadPdf: false,
    canEmailPdf: false
  });

  // Default audit results
  const defaultAuditResults = [
    { category: 'OK', count: 0, defectName: '' },
    { category: 'CRITICAL', count: 0, defectName: '' },
    { category: 'MAJOR-A', count: 0, defectName: '' },
    { category: 'MAJOR-B', count: 0, defectName: '' },
    { category: 'MINOR', count: 0, defectName: '' }
  ];

  // Default test results
  const defaultTestResults = [
    { testName: 'SURFACE pH', specification: 'MIN - 6.0 and MAX - 7.5', result: '', checkedBy: '' },
    { testName: 'SURFACE TENSION', specification: 'MIN - 34 mN/m', result: '', checkedBy: '' },
    { testName: 'PRINTING POSITION', specification: '', result: '', checkedBy: '' },
    { testName: 'POSITIVE MATCH', specification: 'OK / NOT OK', result: '', checkedBy: '' },
    { testName: 'NAIL TEST', specification: 'OK / NOT OK', result: '', checkedBy: '' },
    { testName: 'SCOTCH TAPE TEST', specification: 'OK / NOT OK', result: '', checkedBy: '' },
    { testName: 'MEK TEST', specification: 'OK / NOT OK', result: '', checkedBy: '' },
    { testName: 'COMPATIBILITY TEST', specification: 'OK / NOT OK', result: '', checkedBy: '' },
    { testName: 'CROSS CUT TEST', specification: 'Level 2 - Max', result: '', checkedBy: '' }
  ];

  // State for form data
  const [report, setReport] = useState({
    documentNo: '',
    revision: '00',
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewedOn: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
    page: '1 of 2',
    preparedBy: 'QC',
    approvedBy: 'QA Head',
    issued: 'QA Head',
    title: 'INCOMING QUALITY INSPECTION REPORT',
    scope: 'JSW / DEC / IQC',

    // Status information
    status: 'DRAFT',
    submittedBy: '',
    submittedAt: null,
    reviewedBy: '',
    reviewedAt: null,
    comments: '',

    // Form-specific fields
    iqcDate: new Date().toISOString().split('T')[0],
    shift: 'A',
    productVariantName: '',
    productReceivedFrom: '',
    supplierShift: '',
    productReceivedDate: new Date().toISOString().split('T')[0],
    productReceivedQuantity: '',
    quantityAudited: '',
    batchNumber: '',

    // Audit results
    auditResults: defaultAuditResults,

    // Test results
    testResults: defaultTestResults,

    // Quality decision
    qualityDecision: '',

    // Signature information
    qualityManagerName: '',
    qualityManagerSignature: '',
    operatorName: '',
    operatorSignature: '',
    signatureDate: null
  });

  // Audit history for display
  const [auditHistory, setAuditHistory] = useState([]);

  // Fetch report data if editing an existing report
  useEffect(() => {
    if (id && !isNew) {
      fetchReport();
    } else {
      setPermissionsByRole();
    }
  }, [id, isNew]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await QualityInspectionAPI.getReportById(id);

      // Initialize audit results if not present
      if (!data.auditResults || data.auditResults.length === 0) {
        data.auditResults = defaultAuditResults;
      }

      // Initialize test results if not present
      if (!data.testResults || data.testResults.length === 0) {
        data.testResults = defaultTestResults;
      }

      // Format dates for display
      const formattedData = {
        ...data,
        effectiveDate: data.effectiveDate?.split('T')[0],
        reviewedOn: data.reviewedOn?.split('T')[0],
        iqcDate: data.iqcDate?.split('T')[0],
        productReceivedDate: data.productReceivedDate?.split('T')[0]
      };

      setReport(formattedData);

      // Set permissions based on status and user role
      setPermissionsByStatus(formattedData.status);

      // Build audit history from the data
      buildAuditHistory(formattedData);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to load inspection report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buildAuditHistory = (data) => {
    const history = [];

    // Creation
    history.push({
      action: 'Created',
      date: data.createdAt || new Date().toISOString(),
      user: data.createdBy || 'System',
      details: 'Form created'
    });

    // Submission
    if (data.submittedBy && data.submittedAt) {
      history.push({
        action: 'Submitted',
        date: data.submittedAt,
        user: data.submittedBy,
        details: 'Submitted for approval'
      });
    }

    // Review
    if (data.reviewedBy && data.reviewedAt) {
      const action = data.status === 'APPROVED' ? 'Approved' : 'Rejected';
      history.push({
        action,
        date: data.reviewedAt,
        user: data.reviewedBy,
        details: data.comments || `${action} by reviewer`
      });
    }

    setAuditHistory(history);
  };

  const setPermissionsByRole = () => {
    const userRole = user?.role?.toLowerCase() || '';
    const isOperator = userRole === 'operator';
    const isQA = userRole === 'qa';
    const isAVP = userRole === 'avp';
    const isMaster = userRole === 'master';

    setPermissions({
      canEditDocumentInfo: isOperator || isMaster,
      canEditInspectionDetails: isOperator || isMaster,
      canEditAuditResults: isOperator || isMaster,
      canEditTestResults: isOperator || isMaster,
      canSubmit: isOperator,
      canQAReject: isQA,
      canQASubmit: isQA,
      canReject: isAVP,
      canApprove: isAVP,
      canSaveDraft: isOperator || isMaster,
      canDownloadPdf: isMaster,
      canEmailPdf: isMaster
    });
  };

  const setPermissionsByStatus = (status) => {
    const userRole = user?.role?.toLowerCase() || '';
    const isOperator = userRole === 'operator';
    const isQA = userRole === 'qa';
    const isAVP = userRole === 'avp';
    const isMaster = userRole === 'master';

    switch (status) {
      case 'DRAFT':
        setPermissions({
          canEditDocumentInfo: isOperator || isMaster,
          canEditInspectionDetails: isOperator || isMaster,
          canEditAuditResults: isOperator || isMaster,
          canEditTestResults: isOperator || isMaster,
          canSubmit: isOperator,
          canQAReject: false,
          canQASubmit: false,
          canReject: false,
          canApprove: false,
          canSaveDraft: isOperator || isMaster,
          canDownloadPdf: isMaster,
          canEmailPdf: false
        });
        break;
      case 'SUBMITTED':
        setPermissions({
          canEditDocumentInfo: false,
          canEditInspectionDetails: false,
          canEditAuditResults: false,
          canEditTestResults: isQA || isMaster,
          canSubmit: false,
          canQAReject: isQA,
          canQASubmit: isQA,
          canReject: isAVP,
          canApprove: isAVP,
          canSaveDraft: false,
          canDownloadPdf: isQA || isAVP || isMaster,
          canEmailPdf: false
        });
        break;
      case 'APPROVED':
        setPermissions({
          canEditDocumentInfo: false,
          canEditInspectionDetails: false,
          canEditAuditResults: false,
          canEditTestResults: false,
          canSubmit: false,
          canQAReject: false,
          canQASubmit: false,
          canReject: false,
          canApprove: false,
          canSaveDraft: false,
          canDownloadPdf: true, // Everyone can download approved forms
          canEmailPdf: true // Everyone can email approved forms
        });
        break;
      case 'REJECTED':
        setPermissions({
          canEditDocumentInfo: isOperator || isMaster,
          canEditInspectionDetails: isOperator || isMaster,
          canEditAuditResults: isOperator || isMaster,
          canEditTestResults: isOperator || isMaster,
          canSubmit: isOperator,
          canQAReject: false,
          canQASubmit: false,
          canReject: false,
          canApprove: false,
          canSaveDraft: isOperator || isMaster,
          canDownloadPdf: isMaster,
          canEmailPdf: false
        });
        break;
      default:
        setPermissionsByRole();
        break;
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle document info changes
  const handleDocumentInfoChange = (name, value) => {
    setReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle audit result changes
  const handleAuditResultChange = (index, field, value) => {
    const newAuditResults = [...report.auditResults];
    newAuditResults[index] = {
      ...newAuditResults[index],
      [field]: field === 'count' ? (value === '' ? 0 : parseInt(value, 10)) : value
    };

    setReport(prev => ({
      ...prev,
      auditResults: newAuditResults
    }));
  };

  // Handle test result changes
  const handleTestResultChange = (index, field, value) => {
    const newTestResults = [...report.testResults];
    newTestResults[index] = {
      ...newTestResults[index],
      [field]: value
    };

    setReport(prev => ({
      ...prev,
      testResults: newTestResults
    }));
  };

  // Calculate total audit count
  const getTotalAuditCount = () => {
    return report.auditResults.reduce((total, item) => total + (item.count || 0), 0);
  };

  // Sanitize form data for API submission
  const sanitizeFormData = (data) => {
    // Create a deep copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Format dates properly
    if (sanitized.effectiveDate && !sanitized.effectiveDate.includes('T')) {
      sanitized.effectiveDate += 'T00:00:00';
    }

    if (sanitized.reviewedOn && !sanitized.reviewedOn.includes('T')) {
      sanitized.reviewedOn += 'T00:00:00';
    }

    if (sanitized.iqcDate && !sanitized.iqcDate.includes('T')) {
      sanitized.iqcDate += 'T00:00:00';
    }

    if (sanitized.productReceivedDate && !sanitized.productReceivedDate.includes('T')) {
      sanitized.productReceivedDate += 'T00:00:00';
    }

    return sanitized;
  };

  // Save form data
  const saveForm = async (newStatus) => {
    try {
      setSaving(true);

      const updatedFormData = {
        ...report,
        status: newStatus,
        submittedBy: (newStatus === 'SUBMITTED' && !report.submittedBy) ? user.name : report.submittedBy,
        submittedAt: (newStatus === 'SUBMITTED' && !report.submittedAt) ? new Date().toISOString() : report.submittedAt,
        reviewedBy: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? user.name : report.reviewedBy,
        reviewedAt: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? new Date().toISOString() : report.reviewedAt,
      };

      // If operator is submitting, add their signature
      if (user.role === 'operator' && newStatus === 'SUBMITTED' && !updatedFormData.operatorSignature) {
        updatedFormData.operatorName = user.name;
        updatedFormData.operatorSignature = `signed_by_${user.name.toLowerCase().replace(/\\s/g, '_')}`;
      }

      // If QA is approving/rejecting, add their signature
      if ((user.role === 'qa' || user.role === 'avp') &&
        (newStatus === 'APPROVED' || newStatus === 'REJECTED') &&
        !updatedFormData.qualityManagerSignature) {
        updatedFormData.qualityManagerName = user.name;
        updatedFormData.qualityManagerSignature = `signed_by_${user.name.toLowerCase().replace(/\\s/g, '_')}`;
        updatedFormData.signatureDate = new Date().toISOString();
      }

      // Sanitize form data for API submission
      const sanitizedData = sanitizeFormData(updatedFormData);

      // Update or create the report
      let result;
      if (id && !isNew) {
        result = await QualityInspectionAPI.updateReport(id, sanitizedData);
      } else {
        result = await QualityInspectionAPI.createReport(sanitizedData);
      }

      alert(`Form ${id && !isNew ? 'updated' : 'created'} successfully!`);
      navigate('/forms/quality');
      return result;
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`Failed to ${id && !isNew ? 'update' : 'create'} form. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      await saveForm('DRAFT');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save form as draft. Please try again.');
    }
  };

  // Submit the form for QA approval
  const handleSubmit = async () => {
    // Validate form fields before submission
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await saveForm('SUBMITTED');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report');
    }
  };

  // QA submits the form to AVP
  const handleQASubmit = async () => {
    try {
      // Add QA signature
      const updatedFormData = {
        ...report,
        qualityManagerName: user.name,
        qualityManagerSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        status: 'SUBMITTED'
      };

      setSaving(true);
      const sanitizedData = sanitizeFormData(updatedFormData);
      await QualityInspectionAPI.updateReport(id, sanitizedData);
      alert('Form submitted to AVP for approval!');
      navigate('/forms/quality');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form to AVP. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // QA rejects the form
  const handleQAReject = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const comments = window.prompt('Please provide rejection reason:');
      if (!comments) {
        alert('Rejection reason is required.');
        return;
      }

      const updatedFormData = {
        ...report,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        status: 'REJECTED',
        comments: comments
      };

      const sanitizedData = sanitizeFormData(updatedFormData);
      await QualityInspectionAPI.updateReport(id, sanitizedData);
      alert('Form rejected successfully!');
      navigate('/forms/quality');
    } catch (error) {
      console.error('Error rejecting form:', error);
      alert('Failed to reject form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // AVP approves the form
  const handleApprove = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const updatedFormData = {
        ...report,
        qualityManagerName: user.name,
        qualityManagerSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        signatureDate: new Date().toISOString(),
        status: 'APPROVED'
      };

      const comments = window.prompt('Add any approval comments (optional):');
      if (comments) {
        updatedFormData.comments = comments;
      }

      const sanitizedData = sanitizeFormData(updatedFormData);
      await QualityInspectionAPI.updateReport(id, sanitizedData);
      alert('Form approved successfully!');
      navigate('/forms/quality');
    } catch (error) {
      console.error('Error approving form:', error);
      alert('Failed to approve form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // AVP rejects the form
  const handleReject = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const comments = window.prompt('Please provide rejection reason:');
      if (!comments) {
        alert('Rejection reason is required.');
        return;
      }

      const updatedFormData = {
        ...report,
        qualityManagerName: user.name,
        qualityManagerSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        signatureDate: new Date().toISOString(),
        status: 'REJECTED',
        comments: comments
      };

      const sanitizedData = sanitizeFormData(updatedFormData);
      await QualityInspectionAPI.updateReport(id, sanitizedData);
      alert('Form rejected successfully!');
      navigate('/forms/quality');
    } catch (error) {
      console.error('Error rejecting form:', error);
      alert('Failed to reject form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const userName = user?.name || 'Anonymous';
      await QualityInspectionAPI.downloadReportPdf(id, userName);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  // Handle sending email
  const handleSendEmail = async (emailData) => {
    try {
      const result = await QualityInspectionAPI.sendEmailWithPdf(id, emailData, user.name);
      alert('Email sent successfully!');
      setIsEmailModalOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error.message || 'Please try again'}`);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    // Check required fields
    if (!report.iqcDate ||
      !report.productVariantName ||
      !report.productReceivedFrom ||
      !report.productReceivedDate ||
      !report.productReceivedQuantity ||
      !report.quantityAudited ||
      !report.batchNumber) {
      return false;
    }

    // Ensure at least some audit results are entered
    if (getTotalAuditCount() === 0) {
      return false;
    }

    // Check that a quality decision is made
    if (!report.qualityDecision) {
      return false;
    }

    return true;
  };

  // Navigate back to form list
  const handleBack = () => {
    navigate('/forms/quality');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-lg text-gray-600">Loading inspection form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-gray-100 p-4 mt-16">
      <form className="w-full max-w-4xl bg-white shadow-md pt-2">
        {/* Email Modal */}
        {isEmailModalOpen && (
          <EmailModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            formId={id}
            formName={report.documentNo}
            onSendEmail={handleSendEmail}
          />
        )}

        {/* Audit history modal */}
        {showAuditHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Report Audit History</h2>
                <button
                  onClick={() => setShowAuditHistory(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {auditHistory.map((entry, index) => (
                  <div key={index} className="border-l-4 pl-4 py-2 border-blue-800">
                    <div className="flex justify-between">
                      <span className="font-semibold">{entry.action}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(entry.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">By: {entry.user}</div>
                    {entry.details && (
                      <div className="text-sm mt-1 text-gray-600">{entry.details}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right">
                <button
                  onClick={() => setShowAuditHistory(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <StatusBanner
          status={report.status}
          submittedBy={report.submittedBy}
        />

        {/* Form header */}
        <div className="flex justify-between mb-4 px-4 pt-4">
          <div>
            <button
              onClick={handleBack}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Reports
            </button>
          </div>
          <div>
            <button
              onClick={() => setShowAuditHistory(true)}
              className="inline-flex items-center text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4 mr-1" />
              View History
            </button>
          </div>
        </div>

        <FormHeader
          documentInfo={{
            documentNo: report.documentNo,
            revision: report.revision,
            effectiveDate: report.effectiveDate,
            reviewedOn: report.reviewedOn,
            page: report.page,
            preparedBy: report.preparedBy,
            approvedBy: report.approvedBy,
            issuedBy: report.issued,
            title: report.title
          }}
          scope={report.scope}
          unit="API Speciality Glass Division"
          onDocumentInfoChange={handleDocumentInfoChange}
          readOnly={!permissions.canEditDocumentInfo}
        />

        {/* Form Fields */}
        <div className="border-x border-b border-gray-800">
          <div className="grid grid-cols-3 text-sm">
            <div className="border-r border-gray-800">
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">IQC Date: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="date"
                    name="iqcDate"
                    value={report.iqcDate || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{report.iqcDate}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Name of Product / Variant: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="productVariantName"
                    value={report.productVariantName || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                    placeholder="e.g. 30 ml Flat Shoulder only Frosted"
                  />
                ) : (
                  <span>{report.productVariantName}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Product Received From: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="productReceivedFrom"
                    value={report.productReceivedFrom || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                    placeholder="e.g. Hinshitsu Traders"
                  />
                ) : (
                  <span>{report.productReceivedFrom}</span>
                )}
              </div>
            </div>
            <div className="border-r border-gray-800">
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Shift: </span>
                {permissions.canEditInspectionDetails ? (
                  <select
                    name="shift"
                    value={report.shift || ''}
                    onChange={handleChange}
                    className="px-2 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                ) : (
                  <span>{report.shift}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Supplier Shift: </span>
                {permissions.canEditInspectionDetails ? (
                  <select
                    name="supplierShift"
                    value={report.supplierShift || ''}
                    onChange={handleChange}
                    className="px-2 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  >
                    <option value="">Select</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                ) : (
                  <span>{report.supplierShift}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Product Received Date: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="date"
                    name="productReceivedDate"
                    value={report.productReceivedDate || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{report.productReceivedDate}</span>
                )}
              </div>
            </div>
            <div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Product Received Quantity: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="number"
                    name="productReceivedQuantity"
                    value={report.productReceivedQuantity || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{report.productReceivedQuantity}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Quantity Audited: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="number"
                    name="quantityAudited"
                    value={report.quantityAudited || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{report.quantityAudited}</span>
                )}
              </div>
              <div className="p-2">
                <span className="font-semibold">Batch Number: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="batchNumber"
                    value={report.batchNumber || ''}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{report.batchNumber}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Report Section */}
        <div className="bg-gray-200 font-semibold p-2 border-x border-t border-gray-800">
          Audit Report
        </div>

        {/* Audit Results Table */}
        <div className="relative">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-800 p-2 bg-gray-200 w-1/3">CATEGORY</th>
                <th className="border border-gray-800 p-2 text-center bg-gray-200 w-1/3">Nos</th>
                <th className="border border-gray-800 p-2 bg-gray-200 w-1/3">DEFECT(S) NAME</th>
              </tr>
            </thead>
            <tbody>
              {report.auditResults.map((result, index) => (
                <tr key={index}>
                  <td className="border border-gray-800 p-2">
                    {result.category}
                  </td>
                  <td className="border border-gray-800 p-2 text-center">
                    {permissions.canEditAuditResults ? (
                      <input
                        type="number"
                        value={result.count || ''}
                        onChange={(e) => handleAuditResultChange(index, 'count', e.target.value)}
                        className="w-16 p-1 text-center border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                      />
                    ) : (
                      <span>{result.count}</span>
                    )}
                  </td>
                  <td className="border border-gray-800 p-2">
                    {permissions.canEditAuditResults ? (
                      <input
                        type="text"
                        value={result.defectName || ''}
                        onChange={(e) => handleAuditResultChange(index, 'defectName', e.target.value)}
                        className="w-full p-1 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                        placeholder={index === 0 ? "e.g. Inside dust/neck crack/chip/article" : ""}
                      />
                    ) : (
                      <span>{result.defectName}</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="border border-gray-800 p-2">TOTAL</td>
                <td className="border border-gray-800 p-2 text-center">{getTotalAuditCount()}</td>
                <td className="border border-gray-800 p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Test Results Table */}
        <div className="mt-4">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {report.testResults.map((test, index) => (
                <tr key={index}>
                  <td className="border border-gray-800 p-2 w-1/3">
                    <div className="font-semibold">{test.testName}</div>
                    {test.specification && (
                      <div className="text-xs text-gray-600">(Specification: {test.specification})</div>
                    )}
                  </td>
                  <td className="border border-gray-800 p-2 w-1/3">
                    {permissions.canEditTestResults ? (
                      <input
                        type="text"
                        value={test.result || ''}
                        onChange={(e) => handleTestResultChange(index, 'result', e.target.value)}
                        className="w-full p-1 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                        placeholder={index === 0 ? "e.g. 7.1 pH" : ""}
                      />
                    ) : (
                      <span>{test.result}</span>
                    )}
                  </td>
                  <td className="border border-gray-800 p-2 w-1/3">
                    <div className="font-semibold">Checked by:</div>
                    {permissions.canEditTestResults ? (
                      <input
                        type="text"
                        value={test.checkedBy || ''}
                        onChange={(e) => handleTestResultChange(index, 'checkedBy', e.target.value)}
                        className="w-full p-1 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                        placeholder="Name"
                      />
                    ) : (
                      <span>{test.checkedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quality Decision Section */}
        <div className="mt-4 border border-gray-800">
          <div className="grid grid-cols-3 text-sm">
            <div className="col-span-1 p-2 font-semibold border-r border-gray-800 flex items-center">
              QUALITY DECISION FOR LOT
            </div>
            <div className="col-span-2 p-2">
              {permissions.canEditTestResults ? (
                <select
                  name="qualityDecision"
                  value={report.qualityDecision || ''}
                  onChange={handleChange}
                  className="w-full p-2 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                >
                  <option value="">Select Decision</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="CONDITIONAL_PASS">CONDITIONAL PASS</option>
                </select>
              ) : (
                <div className="p-2 font-semibold">{report.qualityDecision}</div>
              )}
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-x border-b border-gray-800">
          <div className="flex justify-between items-center p-4">
            {/* QA Signature Display */}
            <div className="flex items-center">
              <div className="font-semibold mr-2">QA Manager:</div>
              <div className="w-16">
                {report.qualityManagerSignature ? (
                  <div className="h-12 flex items-center">
                    {/* Attempt to load the image */}
                    <img
                      src={QASign}
                      alt="QA Signature"
                      onError={(e) => {
                        console.error('Failed to load QA signature image');
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback if image fails to load */}
                    <div
                      className="h-12 border border-dashed border-gray-400 hidden items-center justify-center w-full"
                      title={`Signed by: ${report.qualityManagerName}`}
                    >
                      <span className="text-xs text-gray-500">Signed digitally</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-12 border border-dashed border-gray-400 flex items-center justify-center">
                    <span className="text-xs text-gray-500">No signature</span>
                  </div>
                )}
              </div>
            </div>

            {/* Operator Signature Display */}
            <div className="flex items-center">
              <div className="font-semibold mr-2">Operator:</div>
              <div className="w-16">
                {report.submittedBy ? (
                  <div className="h-12 flex items-center">
                    {/* Attempt to load the image */}
                    <img
                      src={OperatorSign}
                      alt="Operator Signature"
                      onError={(e) => {
                        console.error('Failed to load Operator signature image');
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback if image fails to load */}
                    <div
                      className="h-12 border border-dashed border-gray-400 hidden items-center justify-center w-full"
                      title={`Signed by: ${report.submittedBy}`}
                    >
                      <span className="text-xs text-gray-500">Signed digitally</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-12 border border-dashed border-gray-400 flex items-center justify-center">
                    <span className="text-xs text-gray-500">No signature</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {report.signatureDate && (
            <div className="mt-2 border-t border-gray-800 p-4">
              <span className="font-semibold">Signature Date: </span>
              {new Date(report.signatureDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Review Information */}
        {(report.status === 'SUBMITTED' || report.status === 'APPROVED' || report.status === 'REJECTED') && (
          <div className="border-x border-b border-gray-800 p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2">Review Information</h3>

            {report.submittedBy && (
              <div className="text-sm mb-1">
                <span className="font-medium">Submitted by:</span> {report.submittedBy}
                {report.submittedAt && (
                  <span className="ml-1 text-gray-500">
                    on {new Date(report.submittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {report.reviewedBy && (
              <div className="text-sm mb-1">
                <span className="font-medium">Reviewed by:</span> {report.reviewedBy}
                {report.reviewedAt && (
                  <span className="ml-1 text-gray-500">
                    on {new Date(report.reviewedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {report.comments && (
              <div className="mt-2">
                <span className="font-medium text-sm">Comments:</span>
                <div className="p-2 bg-white border border-gray-300 rounded mt-1 text-sm">
                  {report.comments}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 bg-gray-100 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Back to Forms
          </button>

          <div className="space-x-2">
            {/* Operator buttons */}
            {permissions.canSaveDraft && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-yellow-300"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            )}

            {permissions.canSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-800 hover:bg-background text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300"
              >
                {saving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}

            {/* QA buttons */}
            {permissions.canQAReject && (
              <button
                type="button"
                onClick={handleQAReject}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
              >
                {saving ? 'Rejecting...' : 'Reject Form'}
              </button>
            )}

            {permissions.canQASubmit && (
              <button
                type="button"
                onClick={handleQASubmit}
                disabled={saving}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-indigo-300"
              >
                {saving ? 'Submitting...' : 'Submit to AVP'}
              </button>
            )}

            {/* AVP buttons */}
            {permissions.canReject && (
              <button
                type="button"
                onClick={handleReject}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
              >
                {saving ? 'Rejecting...' : 'Reject Form'}
              </button>
            )}

            {permissions.canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-green-300"
              >
                {saving ? 'Approving...' : 'Approve Form'}
              </button>
            )}

            {/* Download PDF button - visible when approved */}
            {permissions.canDownloadPdf && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                Download PDF
              </button>
            )}

            {/* Email PDF button - visible when approved */}
            {permissions.canEmailPdf && (
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                Send Email
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default QualityInspectionForm;