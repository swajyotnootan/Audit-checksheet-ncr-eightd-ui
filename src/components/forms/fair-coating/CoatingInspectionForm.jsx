import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FormHeader, StatusBanner } from '../CommonCode';
import { coatingInspectionAPI } from './coatingInspectionAPI';
import QASign from '../../../assets/QASign.png';
import OperatorSign from '../../../assets/OperatorSign.png';
import EmailModal from './CoatingEmailModal';

// Import role utilities with correct path
import {
  isOperator,
  isQA,
  isAVP,
  isMaster,
  isManager,
  isAdmin,
  getRoleDisplayName
} from '../../utils/roleUtils';

const CoatingInspectionForm = ({ isNew }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(id && !isNew ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // State for email modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Define permissions based on user role and form status
  const [permissions, setPermissions] = useState({
    canEditDocumentInfo: false,
    canEditInspectionDetails: false,
    canEditCoatingDetails: false,
    canEditCharacteristics: false,
    canSubmit: false,
    canQASubmit: false,
    canQAReject: false,
    canApprove: false,
    canReject: false,
    canSaveDraft: false,
    canDownloadPdf: false,
    canEmailPdf: false
  });

  // Default characteristics
  const defaultCharacteristics = [
    { id: 1, name: 'Reference Sample No', observation: '', comments: '' },
    { id: 2, name: 'Colour Shade', observation: '', comments: '' },
    { id: 3, name: 'Colour Height', observation: '', comments: '' },
    { id: 4, name: 'Any Visual defect', observation: '', comments: '' },
    { id: 5, name: 'MEK Test', observation: '', comments: '' },
    { id: 6, name: 'Cross Cut Test (Tape Test)', observation: '', comments: '' },
    { id: 7, name: 'Coating Thickness', bodyThickness: '', bottomThickness: '', comments: '' },
    { id: 8, name: 'Temperature', observation: '', comments: '' },
    { id: 9, name: 'Viscosity', observation: '', comments: '' },
    // { id: 9, name: 'Batch Composition', observation: '', comments: '' }
  ];

  // Default coating details
  const defaultCoatingDetails = [
    { id: 1, lacquerType: 'Clear Extn', batchNo: '', quantity: '', unit: '', expiryDate: '' },
    // { id: 2, lacquerType: 'Red Dye', batchNo: '', quantity: '', unit: '', expiryDate: '' }
  ]

  // State for form data
  const [formData, setFormData] = useState({
    documentNo: 'JSW-DEC-L4-04',
    issuanceNo: '00',
    reviewedDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
    preparedBy: 'DGM QC',
    approvedBy: ' Quality HOD',
    issued: ' Quality HOD',
    product: '100 mL Bag Pke.',
    sizeNo: '',
    shift: '',
    customShift: '',
    showCustomShift: false,
    variant: '',
    customVariant: '',
    showCustomVariant: false,
    lineNo: '',
    customLineNo: '',
    showCustomLineNo: false,
    customer: '',
    sampleSize: '08 Nos.',
    coatingDetails: defaultCoatingDetails,
    characteristics: defaultCharacteristics,
    qaName: '',
    qaSignature: '',
    operatorName: '',
    operatorSignature: '',
    approvalTime: '',
    avpapprovalTime: '',
    status: 'DRAFT',
    submittedBy: '',
    submittedAt: null,
    reviewedBy: '',
    reviewedAt: null,
    comments: ' ',
    // Specific fields mapped from characteristics for easier backend compatibility
    ReferenceSampleNo: '',
    colorShade: '',
    colorHeight: '',
    visualDefect: '',
    mekTest: '',
    crossCutTest: '',
    coatingThicknessBody: '',
    coatingThicknessBottom: '',
    temperature: '',
    viscosity: '',
    batchComposition: ''
  });

  // Fetch form data if editing an existing form
  useEffect(() => {
    if (id && !isNew) {
      const fetchForm = async () => {
        try {
          setLoading(true);
          const data = await coatingInspectionAPI.getReportById(id);

          // Initialize characteristics if not present
          if (!data.characteristics || data.characteristics.length === 0) {
            data.characteristics = defaultCharacteristics;
          }

          // Initialize coating details if not present
          if (!data.coatingDetails || data.coatingDetails.length === 0) {
            data.coatingDetails = defaultCoatingDetails;
          }

          // Format dates for display
          const formattedData = {
            ...data,
            issuanceNo: data.revision || '',
            issueDate: data.effectiveDate?.split('T')[0] || '',
            reviewedDate: data.reviewedOn?.split('T')[0] || '',
            inspectionDate: data.inspectionDate?.split('T')[0] || ''
          };

          setFormData(formattedData);
        } catch (error) {
          console.error('Error fetching form:', error);
          setError('Failed to load inspection form. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchForm();
    }
  }, [id, isNew]);

  // Update permissions based on user role and form status using new role utilities
  useEffect(() => {
    if (user && formData) {
      const isOp = isOperator(user.role);
      const isQa = isQA(user.role);
      const isAvp = isAVP(user.role);
      const isMstr = isMaster(user.role);
      const isMgr = isManager(user.role);
      const isAdm = isAdmin(user.role);

      const isDraft = formData.status === 'DRAFT';
      const isSubmitted = formData.status === 'SUBMITTED';
      const isApproved = formData.status === 'APPROVED';
      const isRejected = formData.status === 'REJECTED';

      // Enhanced permissions with new roles
      setPermissions({
        canEditDocumentInfo: (isOp && isDraft) || isMstr || isAdm,
        canEditInspectionDetails: (isOp && isDraft) || isMstr || isAdm,
        canEditCoatingDetails: (isOp && isDraft) || isMstr || isAdm,
        canEditCharacteristics: (isQa && isSubmitted) || (isOp && isDraft) || isMstr || isAdm,
        canSubmit: (isOp && isDraft),
        canQASubmit: (isQa && isSubmitted),
        canQAReject: (isQa && isSubmitted),
        canApprove: (isAvp && isSubmitted) || (isMgr && isSubmitted) || isAdm,
        canReject: (isAvp && isSubmitted) || (isMgr && isSubmitted) || isAdm,
        canSaveDraft: (isOp && isDraft) || isMstr || isAdm,
        canDownloadPdf: isApproved || isMstr || isAdm,
        canEmailPdf: isApproved || isMstr || isAdm
      });
    }
  }, [user, formData]);

  // Variant options
  const variantOptions = ['Pink matt', 'Blue matt', 'Green matt', 'Yellow matt'];

  // Shift options
  const shiftOptions = ['A', 'B', 'C'];

  // Line number options
  const lineOptions = ['1', '2', '3', '4', '5'];

  // Lacquer type options
  const lacquerOptions = [
    'Clear Extn',
    'Red Dye',
    'Black Dye',
    'Pink Dye',
    'Violet Dye',
    'Matt Bath',
    'Hardener',
    'add more'
  ];

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle document info changes
  const handleDocumentInfoChange = (name, value) => {
    // Map common component field names to your form field names
    const fieldMap = {
      'revision': 'issuanceNo',
      'effectiveDate': 'issueDate',
      'reviewedOn': 'reviewedDate',
      'issuedBy': 'issued'
    };

    const formField = fieldMap[name] || name;
    setFormData(prev => ({ ...prev, [formField]: value }));
  };

  // Handle email sending
  const handleSendEmail = async (emailData) => {
    if (!id) return;

    try {
      setSendingEmail(true);
      console.log("Starting to send email for form ID:", id);
      console.log("Email data:", emailData);

      // Call the API to send email with attached PDF
      const result = await coatingInspectionAPI.sendEmailWithPdf(id, emailData, user.name);
      console.log("Email API response:", result);

      // Show success message and close modal
      alert('Email sent successfully!');
      setIsEmailModalOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error.message || 'Please try again'}`);
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle coating detail changes
  const handleCoatingDetailChange = (index, field, value) => {
    const updatedDetails = [...formData.coatingDetails];
    updatedDetails[index] = {
      ...updatedDetails[index],
      [field]: value
    };

    // Update batch composition if necessary
    const batchComposition = generateBatchComposition(updatedDetails);

    setFormData(prev => ({
      ...prev,
      coatingDetails: updatedDetails,
      batchComposition: batchComposition
    }));

    // Also update the batch composition in characteristics
    const batchCompositionIndex = formData.characteristics.findIndex(c => c.name === 'Batch Composition');
    if (batchCompositionIndex !== -1) {
      const updatedCharacteristics = [...formData.characteristics];
      updatedCharacteristics[batchCompositionIndex] = {
        ...updatedCharacteristics[batchCompositionIndex],
        observation: batchComposition
      };

      setFormData(prev => ({
        ...prev,
        characteristics: updatedCharacteristics
      }));
    }
  };

  // Generate batch composition text from coating details
  const generateBatchComposition = (details) => {
    return details
      .filter(d => d.lacquerType && d.quantity)
      .map(d => `${d.lacquerType} ${d.quantity}`)
      .join(' ');
  };

  // Handle characteristic changes
  const handleCharChange = (index, field, value) => {
    const updatedChars = [...formData.characteristics];
    updatedChars[index] = {
      ...updatedChars[index],
      [field]: value
    };

    // Update specific form fields based on characteristic
    const newFormData = { ...formData, characteristics: updatedChars };

    // Map characteristic observations to specific fields
    const char = updatedChars[index];
    const name = char.name.toLowerCase().replace(/\s+/g, '');

    if (name === 'referencesampleno') {
      newFormData.ReferenceSampleNo = field === 'observation' ? value : char.observation;
    } else if (name === 'colourshade' || name === 'colorshade') {
      newFormData.colorShade = field === 'observation' ? value : char.observation;
    } else if (name === 'colourheight' || name === 'colorheight') {
      newFormData.colorHeight = field === 'observation' ? value : char.observation;
    } else if (name.includes('visual')) {
      newFormData.visualDefect = field === 'observation' ? value : char.observation;
    } else if (name.includes('mek')) {
      newFormData.mekTest = field === 'observation' ? value : char.observation;
    } else if (name.includes('crosscut') || name.includes('tape')) {
      newFormData.crossCutTest = field === 'observation' ? value : char.observation;
    } else if (name.includes('thickness') && field === 'bodyThickness') {
      newFormData.coatingThicknessBody = value;
    } else if (name.includes('thickness') && field === 'bottomThickness') {
      newFormData.coatingThicknessBottom = value;
    } else if (name.includes('temperature')) {
      newFormData.temperature = field === 'observation' ? value : char.observation;
    } else if (name.includes('viscosity')) {
      newFormData.viscosity = field === 'observation' ? value : char.observation;
    } else if (name.includes('batch')) {
      newFormData.batchComposition = field === 'observation' ? value : char.observation;
    }

    setFormData(newFormData);
  };

  // Sanitize form data for API submission
  const sanitizeFormData = (data) => {
    const sanitized = JSON.parse(JSON.stringify(data));

    // Ensure ISO date format with T00:00:00
    ['issueDate', 'reviewedDate', 'inspectionDate'].forEach((field) => {
      if (sanitized[field] && !sanitized[field].includes('T')) {
        sanitized[field] += 'T00:00:00';
      }
    });

    // Format expiry dates in coatingDetails and ensure unit is set
    if (Array.isArray(sanitized.coatingDetails)) {
      sanitized.coatingDetails = sanitized.coatingDetails.map((detail) => {
        let unit = detail.unit;
        if (!unit || unit === '') {
          unit = detail.lacquerType === "Clear Extn" ? "KG" : "GM";
        }
        return {
          ...detail,
          expiryDate: formatToDDMMYYYY(detail.expiryDate),
          unit,
        };
      });
    }

    // Add mappings for API fields explicitly
    sanitized.revision = sanitized.issuanceNo;
    sanitized.effectiveDate = sanitized.issueDate;
    sanitized.reviewedOn = sanitized.reviewedDate;

    return sanitized;
  };

  // Save form data
  const saveForm = async (newStatus) => {
    try {
      setSaving(true);

      const updatedFormData = {
        ...formData,
        status: newStatus,
        submittedBy: (newStatus === 'SUBMITTED' && !formData.submittedBy) ? user.name : formData.submittedBy,
        submittedAt: (newStatus === 'SUBMITTED' && !formData.submittedAt) ? new Date().toISOString() : formData.submittedAt,
        reviewedBy: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? user.name : formData.reviewedBy,
        reviewedAt: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? new Date().toISOString() : formData.reviewedAt,
      };

      // If operator/shift engineer is submitting, add their signature
      if (isOperator(user.role) && newStatus === 'SUBMITTED' && !updatedFormData.operatorSignature) {
        updatedFormData.operatorName = user.name;
        updatedFormData.operatorSignature = `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`;
      }

      // If QA/Quality Manager or higher is approving/rejecting, add their signature
      if ((isQA(user.role) || isAVP(user.role) || isManager(user.role) || isAdmin(user.role)) &&
        (newStatus === 'APPROVED' || newStatus === 'REJECTED') &&
        !updatedFormData.qaSignature) {
        updatedFormData.qaName = user.name;
        updatedFormData.qaSignature = `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`;
        updatedFormData.approvalTime = new Date().toLocaleTimeString();
      }

      // Sanitize form data for API submission
      const sanitizedData = sanitizeFormData(updatedFormData);

      // Update or create the report
      let result;
      if (id && !isNew) {
        result = await coatingInspectionAPI.updateReport(id, sanitizedData);
      } else {
        result = await coatingInspectionAPI.createReport(sanitizedData);
      }

      alert(`Form ${id && !isNew ? 'updated' : 'created'} successfully!`);
      navigate('/forms/coating');
      return result;
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`Failed to ${id && !isNew ? 'update' : 'create'} form. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Save as draft
  const saveDraft = async () => {
    try {
      await saveForm('DRAFT');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save form as draft. Please try again.');
    }
  };

  // Submit the form for QA approval
  const submitForm = async () => {
    try {
      await saveForm('SUBMITTED');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form for approval. Please try again.');
    }
  };

  // QA submits the form to Quality HOD
  const qaSubmitForm = async () => {
    try {
      // Add QA signature
      const updatedFormData = {
        ...formData,
        qaName: user.name,
        qaSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        reviewedBy: user.name,
        status: 'SUBMITTED'
      };

      setSaving(true);
      const sanitizedData = sanitizeFormData(updatedFormData);
      await coatingInspectionAPI.updateReport(id, sanitizedData);
      alert('Form submitted to Quality HOD for approval!');
      navigate('/forms/coating');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form to Quality HOD. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // QA rejects the form
  const qaRejectForm = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const comments = window.prompt('Please provide rejection reason:');
      if (!comments) {
        alert('Rejection reason is required.');
        return;
      }

      const updatedFormData = {
        ...formData,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        status: 'REJECTED',
        comments: comments
      };

      const sanitizedData = sanitizeFormData(updatedFormData);
      await coatingInspectionAPI.updateReport(id, sanitizedData);
      alert('Form rejected successfully!');
      navigate('/forms/coating');
    } catch (error) {
      console.error('Error rejecting form:', error);
      alert('Failed to reject form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Quality HOD/Manager/Admin approves the form
  const approveForm = async () => {
    if (!id) return;

    try {
      setSaving(true);
      const now = new Date();
      const str = now.toString().split(' GMT')[0];

      const updatedFormData = {
        ...formData,
        avpName: user.name,
        avpSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        avpapprovalTime: str,
        status: 'APPROVED'
      };

      const comments = window.prompt('Add any approval comments (optional):');
      if (comments) {
        updatedFormData.comments = comments;
      }

      const sanitizedData = sanitizeFormData(updatedFormData);
      await coatingInspectionAPI.updateReport(id, sanitizedData);
      alert('Form approved successfully!');
      navigate('/forms/coating');
    } catch (error) {
      console.error('Error approving form:', error);
      alert('Failed to approve form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Quality HOD/Manager/Admin rejects the form
  const rejectForm = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const comments = window.prompt('Please provide rejection reason:');
      if (!comments) {
        alert('Rejection reason is required.');
        return;
      }

      const updatedFormData = {
        ...formData,
        qaName: user.name,
        qaSignature: `signed_by_${user.name.toLowerCase().replace(/\s/g, '_')}`,
        approvalTime: new Date().toLocaleTimeString(),
        status: 'REJECTED',
        comments: comments
      };

      const sanitizedData = sanitizeFormData(updatedFormData);
      await coatingInspectionAPI.updateReport(id, sanitizedData);
      alert('Form rejected successfully!');
      navigate('/forms/coating');
    } catch (error) {
      console.error('Error rejecting form:', error);
      alert('Failed to reject form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const downloadPdf = async () => {
    try {
      const userName = user?.name || 'Anonymous';
      await coatingInspectionAPI.downloadPdf(id, userName);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Handle email success
  const handleEmailSuccess = () => {
    alert('Email sent successfully!');
  };

  // Delete form function
  const deleteForm = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;
    try {
      setSaving(true);
      await coatingInspectionAPI.deleteReport(id);
      alert('Draft deleted successfully!');
      navigate('/forms/coating');
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Failed to delete draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to build signature URL
  const getSignatureUrl = (firstName, lastName) =>
    `https://internalaudit.hub.swajyot.co.in:8090
/api/users/signature?firstName=${encodeURIComponent(firstName || '')}&lastName=${encodeURIComponent(lastName || '')}`;

  // Get appropriate role display for signatures
  const getSubmitterRoleDisplay = () => {
    if (formData.submittedBy && isOperator(user.role)) {
      return 'Shift Engineer';
    }
    return 'Shift Engineer'; // Default for historical data
  };

  const getQARoleDisplay = () => {
    if (formData.qaName) {
      return 'Quality Manager';
    }
    return 'Quality Manager';
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
    <div className="mt-6 flex justify-center bg-gray-100 p-4">
      <form className="w-full max-w-4xl bg-white shadow-md pt-16">
        {/* Email Modal Component */}
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          formId={id}
          onSuccess={handleEmailSuccess}
        />

        {/* Form Status Banner */}
        <StatusBanner
          status={formData.status}
          submittedBy={formData.submittedBy}
        />

        {/* Header */}
        <FormHeader
          documentInfo={{
            documentNo: formData.documentNo,
            revision: formData.issuanceNo,
            effectiveDate: formData.issueDate,
            reviewedOn: formData.reviewedDate,
            preparedBy: formData.preparedBy,
            approvedBy: formData.approvedBy,
            issuedBy: formData.issued,
            title: "First Article Inspection Report - COATING"
          }}
          scope="API / DEC / COATING"
          unit="API Speciality Glass Division"
          onDocumentInfoChange={handleDocumentInfoChange}
          readOnly={!permissions.canEditDocumentInfo}
        />

        <div className="border-x border-b border-gray-800">
          <div className="grid grid-cols-3 text-sm">
            <div className="border-r border-gray-800">
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Date: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="date"
                    name="inspectionDate"
                    value={formData.inspectionDate}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{formData.inspectionDate}</span>
                )}
              </div>
              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Product: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{formData.product}</span>
                )}
              </div>
              <div className="p-2">
                <span className="font-semibold">Size No.: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="sizeNo"
                    value={formData.sizeNo}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{formData.sizeNo}</span>
                )}
              </div>
            </div>
            <div className="border-r border-gray-800">
              <div className="border-b border-gray-800 p-2 flex items-center space-x-2">
                <span className="font-semibold">Shift: </span>
                {permissions.canEditInspectionDetails ? (
                  <>
                    <select
                      name="shift"
                      value={formData.shift}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shift: e.target.value,
                          showCustomShift: e.target.value === 'other',
                          customShift: '',
                        })
                      }
                      className="px-2 py-0 border border-gray-300 rounded focus:border-blue-800 focus:ring focus:ring-blue-200"
                    >
                      <option value="">Select Shift</option>
                      {shiftOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                    {formData.showCustomShift && (
                      <input
                        type="text"
                        placeholder="Enter Shift"
                        value={formData.customShift || ''}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value, customShift: e.target.value })}
                        className="border border-gray-300 rounded focus:border-blue-800 focus:ring focus:ring-blue-200"
                        size={formData.customShift.length > 0 ? formData.customShift.length : 10}
                      />
                    )}
                  </>
                ) : <span>{formData.shift}</span>}
              </div>
              <div className="border-b border-gray-800 p-2 flex items-center space-x-2">
                <span className="font-semibold">Variant: </span>
                {permissions.canEditInspectionDetails ? (
                  <>
                    <select
                      name="variant"
                      value={formData.variant}
                      onChange={(e) => setFormData({
                        ...formData,
                        variant: e.target.value,
                        showCustomVariant: e.target.value === 'other',
                        customVariant: ''
                      })}
                      className="px-2 py-0 border border-gray-300 rounded focus:border-blue-800 focus:ring focus:ring-blue-200"
                    >
                      <option value="">Select Variant</option>
                      {variantOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      <option value="other">Other</option>
                    </select>
                    {formData.showCustomVariant && (
                      <input
                        type="text"
                        placeholder="Enter Variant"
                        value={formData.customVariant || ''}
                        onChange={(e) => setFormData({ ...formData, variant: e.target.value, customVariant: e.target.value })}
                        className="border border-gray-300 rounded focus:border-blue-800 focus:ring focus:ring-blue-200"
                        size={formData.customVariant.length > 0 ? formData.customVariant.length : 10}
                      />
                    )}
                  </>
                ) : <span>{formData.variant}</span>}
              </div>

              <div className="p-2"></div>
            </div>

            <div>
              <div className="border-b border-gray-800 p-2 flex items-center space-x-2">
                <span className="font-semibold">Line No.: </span>
                {permissions.canEditInspectionDetails ? (
                  <>
                    <select
                      name="lineNo"
                      value={formData.lineNo}
                      onChange={(e) => setFormData({
                        ...formData,
                        lineNo: e.target.value,
                        showCustomLineNo: e.target.value === 'other',
                        customLineNo: ''
                      })}
                      className="px-2 py-0 border border-gray-300 rounded focus:border-blue-900 focus:ring focus:ring-blue-200"
                    >
                      <option value="">Line No</option>
                      {lineOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      <option value="other">Other</option>
                    </select>
                    {formData.showCustomLineNo && (
                      <input
                        type="text"
                        placeholder="Enter Line No."
                        value={formData.customLineNo || ''}
                        onChange={(e) => setFormData({ ...formData, lineNo: e.target.value, customLineNo: e.target.value })}
                        className="border border-gray-300 rounded focus:border-blue-800 focus:ring focus:ring-blue-200"
                        size={formData.customLineNo.length > 0 ? formData.customLineNo.length : 10}
                      />
                    )}
                  </>
                ) : <span>{formData.lineNo}</span>}
              </div>

              <div className="border-b border-gray-800 p-2">
                <span className="font-semibold">Customer: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{formData.customer}</span>
                )}
              </div>
              <div className="p-2">
                <span className="font-semibold">Sample Size: </span>
                {permissions.canEditInspectionDetails ? (
                  <input
                    type="text"
                    name="sampleSize"
                    value={formData.sampleSize}
                    onChange={handleChange}
                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                  />
                ) : (
                  <span>{formData.sampleSize}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coating Details Table */}
        <div className="relative">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-800 p-2 w-12 bg-gray-200">S.No.</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Lacquer / Dye</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Batch No.(LOT)</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Qty.</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Unit</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Expiry Date</th>
                {permissions.canEditCoatingDetails && (
                  <th className="border border-gray-800 p-2 w-16 bg-gray-200">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {formData.coatingDetails.map((detail, index) => {
                // Define unit based on the selected lacquer/dye
                let unit = "GM";
                if (detail.lacquerType === "Clear Extn") {
                  unit = "KG";
                }

                // Check if expiry date is older than current date
                const isExpired = detail.expiryDate && new Date(detail.expiryDate) < new Date();
                const rowClassName = isExpired ? "bg-red-100" : "";

                return (
                  <tr key={detail.id} className={rowClassName}>
                    <td className="border border-gray-800 p-2 text-center">{detail.id}</td>
                    <td className="border border-gray-800 p-2">
                      {permissions.canEditCoatingDetails ? (
                        <select
                          value={detail.lacquerType}
                          onChange={(e) => handleCoatingDetailChange(index, 'lacquerType', e.target.value)}
                          className="w-full px-1 py-1 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200"
                        >
                          <option value="">Select Lacquer/Dye</option>
                          {lacquerOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-1 py-1">{detail.lacquerType}</div>
                      )}
                    </td>
                    <td className="border border-gray-800 p-2 text-center">
                      {permissions.canEditCoatingDetails ? (
                        <input
                          type="text"
                          value={detail.batchNo}
                          onChange={(e) => handleCoatingDetailChange(index, 'batchNo', e.target.value)}
                          className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200"
                        />
                      ) : (
                        <div>{detail.batchNo}</div>
                      )}
                    </td>
                    <td className="border border-gray-800 p-2 text-center">
                      {permissions.canEditCoatingDetails ? (
                        <input
                          type="text"
                          value={detail.quantity}
                          onChange={(e) => handleCoatingDetailChange(index, 'quantity', e.target.value)}
                          className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200"
                        />
                      ) : (
                        <div>{detail.quantity}</div>
                      )}
                    </td>

                    <td className="border border-gray-800 p-2 text-center">
                      {permissions.canEditCoatingDetails ? (
                        <input
                          type="text"
                          value={detail.unit || unit}
                          onChange={(e) => handleCoatingDetailChange(index, 'unit', e.target.value)}
                          className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200"
                        />
                      ) : (
                        <div>{detail.unit || unit}</div>
                      )}
                    </td>

                    <td className={`border border-gray-800 p-2 text-center ${isExpired ? 'text-red-700 font-semibold' : ''}`}>
                      {permissions.canEditCoatingDetails ? (
                        <input
                          type="date"
                          value={detail.expiryDate}
                          onChange={(e) => handleCoatingDetailChange(index, 'expiryDate', e.target.value)}
                          className={`w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 ${isExpired ? 'border-red-300 bg-red-50' : ''}`}
                        />
                      ) : (
                        <div className={isExpired ? 'text-red-700 font-semibold' : ''}>
                          {detail.expiryDate}
                          {isExpired && <span className="block text-xs text-red-600">EXPIRED</span>}
                        </div>
                      )}
                    </td>
                    {permissions.canEditCoatingDetails && (
                      <td className="border border-gray-800 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.coatingDetails.length > 1) {
                              const updatedDetails = formData.coatingDetails.filter((_, i) => i !== index);
                              // Re-number the remaining items
                              const renumberedDetails = updatedDetails.map((detail, newIndex) => ({
                                ...detail,
                                id: newIndex + 1
                              }));
                              setFormData({
                                ...formData,
                                coatingDetails: renumberedDetails
                              });
                            } else {
                              alert('At least one coating detail row is required.');
                            }
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
                          title="Delete this row"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add Row button for Coating Details */}
          {permissions.canEditCoatingDetails && (
            <div className="mt-2 flex gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  const newId = formData.coatingDetails.length > 0
                    ? Math.max(...formData.coatingDetails.map(d => d.id)) + 1
                    : 1;

                  const updatedDetails = [
                    ...formData.coatingDetails,
                    { id: newId, lacquerType: '', batchNo: '', quantity: '', unit: '', expiryDate: '' }
                  ];

                  setFormData({
                    ...formData,
                    coatingDetails: updatedDetails
                  });
                }}
                className={`flex items-center font-medium py-1 px-3 rounded focus:outline-none focus:ring-2 ${formData.coatingDetails.some(detail => !detail.expiryDate || new Date(detail.expiryDate) <= new Date())
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-300'
                  }`}
                disabled={formData.coatingDetails.some(detail => !detail.expiryDate || new Date(detail.expiryDate) <= new Date())}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Row
              </button>

              {formData.coatingDetails.some(detail => !detail.expiryDate || new Date(detail.expiryDate) <= new Date()) && (
                <div className="flex items-center text-red-600 text-sm font-medium ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Fill all expiry dates with future values to enable Add Row.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Characteristics Table */}
        <div className="mt-px">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-800 p-2 w-12 bg-gray-200">S.No.</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Characteristic</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Observations</th>
                <th className="border border-gray-800 p-2 bg-gray-200">Comments</th>
              </tr>
            </thead>
            <tbody>
              {formData.characteristics.map((char, index) => {
                if (char.name === 'Coating Thickness') {
                  return (
                    <React.Fragment key={char.id}>
                      <tr>
                        <td className="border border-gray-800 p-2 text-center" rowSpan={2}>{char.id}</td>
                        <td className="border border-gray-800 p-2" rowSpan={2}>{char.name}</td>
                        <td className="border border-gray-800 p-2">
                          <span className="font-semibold mr-2">Body</span>
                          <input
                            type="text"
                            value={char.bodyThickness || ''}
                            onChange={e => handleCharChange(index, 'bodyThickness', e.target.value)}
                            disabled={!permissions.canEditCharacteristics}
                            className="w-2/3 px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                        <td className="border border-gray-800 p-2" rowSpan={2}>
                          <input
                            type="text"
                            value={char.comments || ''}
                            onChange={e => handleCharChange(index, 'comments', e.target.value)}
                            disabled={!permissions.canEditCharacteristics}
                            className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-800 p-2">
                          <span className="font-semibold mr-2">Bottom</span>
                          <input
                            type="text"
                            value={char.bottomThickness || ''}
                            onChange={e => handleCharChange(index, 'bottomThickness', e.target.value)}
                            disabled={!permissions.canEditCharacteristics}
                            className="w-2/3 px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                }
                // Default rendering for other characteristics
                return (
                  <tr key={char.id}>
                    <td className="border border-gray-800 p-2 text-center">{char.id}</td>
                    <td className="border border-gray-800 p-2">
                      <input
                        type="text"
                        value={char.name}
                        onChange={e => handleCharChange(index, 'name', e.target.value)}
                        disabled={!permissions.canEditCharacteristics}
                        className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </td>
                    <td className="border border-gray-800 p-2">
                      <input
                        type="text"
                        value={char.observation || ''}
                        onChange={e => handleCharChange(index, 'observation', e.target.value)}
                        disabled={!permissions.canEditCharacteristics}
                        className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </td>
                    <td className="border border-gray-800 p-2">
                      <input
                        type="text"
                        value={char.comments || ''}
                        onChange={e => handleCharChange(index, 'comments', e.target.value)}
                        disabled={!permissions.canEditCharacteristics}
                        className="w-full px-1 py-0 border-gray-300 focus:border-blue-900 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-x border-b border-gray-800">
          <div className="flex justify-between items-center p-4">
            {/* QA Signature Display */}
            <div className="flex items-center">
              <div className="font-semibold mr-2">{getQARoleDisplay()} : {formData.qaName}   </div>
              <div className="w-32">
                {formData.qaName ? (
                  <div className="h-12 flex items-center">
                    <img
                      src={getSignatureUrl(formData.qaName.split(' ')[0], formData.qaName.split(' ').slice(1).join(' '))}
                      alt="QA Signature"
                      className="h-12"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div
                      className="h-12 border border-dashed border-gray-400 hidden items-center justify-center w-full"
                      title={`Signed by: ${formData.qaName}`}
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
              <div className="font-semibold mr-2">
                {getSubmitterRoleDisplay()} : {formData.submittedBy}
              </div>
              <div className="w-32">
                {formData.submittedBy ? (
                  <div className="h-12 flex items-center">
                    <img
                      src={getSignatureUrl(formData.submittedBy.split(' ')[0], formData.submittedBy.split(' ').slice(1).join(' '))}
                      alt="Operator Signature"
                      className="h-12"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div
                      className="h-12 border border-dashed border-gray-400 hidden items-center justify-center w-full"
                      title={`Signed by: ${formData.operatorName}`}
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
          <div className="mt-2 border-t border-gray-800 p-4">
            <span className="font-semibold">Time (Final Approval) : </span>
            <input
              type="text"
              name="approvalTime"
              value={formData.avpapprovalTime}
              onChange={handleChange}
              disabled={!(permissions.canApprove || permissions.canEditDocumentInfo)}
              className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Review Information */}
        {(formData.status === 'SUBMITTED' || formData.status === 'APPROVED' || formData.status === 'REJECTED') && (
          <div className="border-x border-b border-gray-800 p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2">Review Information</h3>

            {formData.submittedBy && (
              <div className="text-sm mb-1">
                <span className="font-medium">Submitted by : </span>{" "}
                {(formData.submittedBy || 'Unknown User').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '')}{" "}
                {formatISTDateTime(formData.submittedAt)}
              </div>
            )}

            {formData.reviewedBy && (
              <div className="text-sm mb-1">
                <span className="font-medium">Reviewed by :</span>{" "}
                {(formData.reviewedBy || 'Unknown User').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '')}{" "}
                {formatISTDateTime(formData.reviewedAt)}
              </div>
            )}

            {formData.comments && (
              <div className="mt-2">
                <span className="font-medium text-sm">Comments : {(formData.approvedBy || 'unknown user')}</span>
                <div className="p-2 bg-white border border-gray-300 rounded mt-1 text-sm">
                  {formData.comments}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 bg-gray-100 flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/forms/coating')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Back to Forms
          </button>

          <div className="space-x-2">
            {/* Operator buttons */}
            {permissions.canSaveDraft && (
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-yellow-300"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            )}

            {permissions.canSubmit && (
              <button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className="bg-blue-900 hover:bg-background text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300"
              >
                {saving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}

            {/* QA buttons */}
            {permissions.canQAReject && (
              <button
                type="button"
                onClick={qaRejectForm}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
              >
                {saving ? 'Rejecting...' : 'Reject Form'}
              </button>
            )}

            {permissions.canQASubmit && (
              <button
                type="button"
                onClick={qaSubmitForm}
                disabled={saving}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-indigo-300"
              >
                {saving ? 'Submitting...' : 'Submit to Quality HOD'}
              </button>
            )}

            {/* Quality HOD/Manager/Admin buttons */}
            {permissions.canReject && (
              <button
                type="button"
                onClick={rejectForm}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
              >
                {saving ? 'Rejecting...' : 'Reject Form'}
              </button>
            )}

            {permissions.canApprove && (
              <button
                type="button"
                onClick={approveForm}
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
                onClick={downloadPdf}
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

            {/* Delete Draft button */}
            {formData.status === 'DRAFT' && (
              <button
                type="button"
                onClick={deleteForm}
                disabled={saving}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-red-400"
              >
                {saving ? 'Deleting...' : 'Delete Form'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CoatingInspectionForm;

const formatToDDMMYYYY = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

const formatISTDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Pad single digits
  const pad = (n) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};