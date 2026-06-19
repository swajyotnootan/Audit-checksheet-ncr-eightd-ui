import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, AlertCircle, Users, CheckCircle,
  Save, Download, Loader2, PlayCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { getDashboardPath } from '../utils/roleUtils';

// Styles
const inputStyle = {
  base: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white",
  textarea: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white resize-none",
  label: "block text-xs font-medium text-gray-700 mb-1",
  card: "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
  cardHeader: "px-5 py-3 border-b border-gray-200 bg-gray-50/50",
  cardTitle: "text-sm font-semibold text-gray-800 flex items-center gap-2",
};

const FormCard = ({ title, children, icon: Icon }) => (
  <div className={inputStyle.card}>
    <div className={inputStyle.cardHeader}>
      <div className={inputStyle.cardTitle}>
        {Icon && <Icon size={18} className="text-gray-500" />}
        {title}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = 'text', rows, required, disabled }) => (
  <div>
    <label className={inputStyle.label}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea
        className={inputStyle.textarea}
        rows={rows || 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    ) : (
      <input
        type={type}
        className={inputStyle.base}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    )}
  </div>
);

export default function Form7View() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const dashboardPath = getDashboardPath(user);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [auditeeOptions, setAuditeeOptions] = useState([]);
  const [createdNcr, setCreatedNcr] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [sourceAuditReportNumber, setSourceAuditReportNumber] = useState('');

  // ✅ Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ncrResult, setNcrResult] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    auditReportNumber: '',
    ncrNumber: '',
    processDepartment: '',
    clauseNumbers: '',
    objectiveEvidence: '',
    statement: '',
    dueDate: '',
    auditorName: '',
    auditorSignature: '',
    auditeeName: '',
    auditeeSignature: '',
    auditId: null,
    auditorId: null,
    auditeeId: null,
    shift: 'Day',
  });

  const setValue = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  // Fetch signature for a user by ID from backend
  const fetchSignature = async (userId) => {
    if (!userId) return null;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090
/api/users/${userId}/signature`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching signature:', error);
      return null;
    }
  };

  // Load auditor signature on mount
  useEffect(() => {
    const loadAuditorSignature = async () => {
      if (user?.id) {
        const signature = await fetchSignature(user.id);
        if (signature) {
          setFormData(prev => ({
            ...prev,
            auditorSignature: signature,
            auditorName: user.name || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          }));
        }
      }
    };
    loadAuditorSignature();
  }, [user]);

  const handleAuditeeSelect = (selectedAuditee) => {
    if (!selectedAuditee) return;
    const auditeeName = selectedAuditee.name || `${selectedAuditee.firstName || ''} ${selectedAuditee.lastName || ''}`.trim();
    setFormData(prev => ({
      ...prev,
      auditeeId: selectedAuditee.id,
      auditeeName: auditeeName,
      auditeeSignature: '',
    }));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.processDepartment) { setError('Process/Department is required'); return false; }
      if (!formData.clauseNumbers) { setError('Clause numbers are required'); return false; }
    } else if (currentStep === 2) {
      if (!formData.objectiveEvidence) { setError('Objective evidence is required'); return false; }
      if (!formData.statement) { setError('Statement of nonconformity is required'); return false; }
    } else if (currentStep === 3) {
      if (!formData.auditeeId) { setError('Please select the auditee responsible for this NCR'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) { setError(null); setCurrentStep(currentStep + 1); }
  };

  const prevStep = () => { setError(null); setCurrentStep(currentStep - 1); };

  const fillDemoData = () => {
    const defaultAuditee = auditeeOptions.find((option) => option.role === 'AUDITEE' || option.role === 'HOD') || auditeeOptions[0];
    const defaultAuditeeName = defaultAuditee
      ? (defaultAuditee.name || `${defaultAuditee.firstName || ''} ${defaultAuditee.lastName || ''}`.trim())
      : '';

    setFormData({
      companyName: 'ABC Manufacturing Pvt Ltd',
      auditReportNumber: sourceAuditReportNumber,
      ncrNumber: '',
      processDepartment: 'Production Department - Assembly Line A',
      clauseNumbers: 'ISO 9001:2015 Clause 8.5.1 - Control of Production and Service Provision',
      objectiveEvidence: 'During the audit of assembly line A, torque wrench calibration sticker was expired (dated 01/01/2024)',
      statement: 'The organization failed to ensure that production processes are carried out under controlled conditions.',
      dueDate: '2024-06-15',
      auditorName: user?.name || 'Mr. Abhishek Kumar',
      auditorSignature: formData.auditorSignature,
      auditeeName: defaultAuditeeName,
      auditeeSignature: '',
      auditId: 101,
      auditorId: user?.id || 1,
      auditeeId: defaultAuditee?.id || null,
      shift: 'Day',
    });
    
    setSuccess('✅ Demo data loaded! You can edit before saving.');
    setTimeout(() => setSuccess(null), 3000);
  };

  useEffect(() => {
    loadAuditeeOptions();

    const ncrId = searchParams.get('id');
    if (ncrId) {
      fetchNCRData(ncrId);
    } else {
      const prefill = {
        processDepartment: searchParams.get('department') || '',
        clauseNumbers: searchParams.get('clause') || '',
        objectiveEvidence: searchParams.get('evidence') || '',
        statement: searchParams.get('statement') || '',
        dueDate: searchParams.get('dueDate') || '',
        auditId: searchParams.get('auditId') ? Number(searchParams.get('auditId')) : null,
        auditeeId: searchParams.get('auditeeId') ? Number(searchParams.get('auditeeId')) : null,
        auditeeName: searchParams.get('auditeeName') || '',
        shift: searchParams.get('shift') || 'Day',
        auditReportNumber: searchParams.get('auditReportNumber') || '',
      };
      const incomingAuditReportNumber = (searchParams.get('auditReportNumber') || '').trim();
      setSourceAuditReportNumber(incomingAuditReportNumber);
      const hasPrefill = Object.values(prefill).some((value) => value !== '' && value !== null && value !== 'Day');
      if (hasPrefill) {
        setFormData(prev => ({ ...prev, ...prefill }));
      }
    }
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        auditorId: user.id,
        auditorName: user.name || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      }));
    }
  }, [searchParams, user]);

  const loadAuditeeOptions = async () => {
    try {
      const [auditees, hods] = await Promise.all([
        userAPI.getUsersByRole('AUDITEE'),
        userAPI.getUsersByRole('HOD'),
      ]);
      const merged = [...(auditees || []), ...(hods || [])];
      const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      setAuditeeOptions(unique);
    } catch (loadError) {
      console.error('Failed to load auditee options:', loadError);
    }
  };

  const fetchNCRData = async (ncrId) => {
    setLoading(true);
    setError(null);
    const result = await ncrService.getNCRById(ncrId);
    if (result.success) {
      const ncr = result.data;
      setFormData({
        companyName: ncr.companyName || '',
        auditReportNumber: ncr.auditReportNumber || '',
        ncrNumber: ncr.ncrNumber || '',
        processDepartment: ncr.department || '',
        clauseNumbers: ncr.clauseNumber || '',
        objectiveEvidence: ncr.objectiveEvidence || '',
        statement: ncr.statementOfNonconformity || '',
        dueDate: ncr.dueDate || '',
        auditorName: ncr.auditorName || '',
        auditorSignature: ncr.auditorSignature || '',
        auditeeName: ncr.auditeeName || '',
        auditeeSignature: '',
        auditId: ncr.auditId,
        auditorId: ncr.auditorId,
        auditeeId: ncr.auditeeId,
        shift: ncr.shift || 'Day',
      });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const validateForm = () => {
    const isNewNcr = !searchParams.get('id') && !createdNcr?.id;
    if (isNewNcr && !formData.auditId) {
      setError('Create NCR from the submitted audit form. Audit report number is required from the audit form.');
      return false;
    }
    if (isNewNcr && !sourceAuditReportNumber) {
      setError('Audit report number is missing. Go back to the audit form and use Raise NCR.');
      return false;
    }
    if (isNewNcr && formData.auditReportNumber.trim() !== sourceAuditReportNumber.trim()) {
      setError(`Audit report number must match the audit form number: ${sourceAuditReportNumber}`);
      return false;
    }
    if (!formData.processDepartment) { setError('Process/Department is required'); return false; }
    if (!formData.clauseNumbers) { setError('Clause numbers are required'); return false; }
    if (!formData.objectiveEvidence) { setError('Objective evidence is required'); return false; }
    if (!formData.statement) { setError('Statement of nonconformity is required'); return false; }
    if (!formData.auditeeId) { setError('Please select the auditee responsible for this NCR'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const ncrData = {
      department: formData.processDepartment,
      clauseNumber: formData.clauseNumbers,
      objectiveEvidence: formData.objectiveEvidence,
      statementOfNonconformity: formData.statement,
      dueDate: formData.dueDate,
      auditId: formData.auditId,
      auditorId: formData.auditorId,
      auditeeId: formData.auditeeId,
      shift: formData.shift,
      companyName: formData.companyName,
      auditReportNumber: formData.auditReportNumber,
      auditorName: formData.auditorName,
      auditorSignature: formData.auditorSignature,
      auditeeName: formData.auditeeName,
      auditeeSignature: '',
    };

    const result = await ncrService.createNCR(ncrData);
    
    if (result.success) {
      setCreatedNcr(result.data);
      // ✅ Show success modal instead of inline message + broken navigate
      setNcrResult(result.data);
      setShowSuccessModal(true);
    } else {
      setError(result.error);
    }
    
    setSaving(false);
  };

  const downloadForm7Pdf = async () => {
    const id = createdNcr?.id || searchParams.get('id');
    if (!id) { setError('Create the NCR first, then download Form 7 PDF.'); return; }
    setPdfDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/${id}/form7-pdf`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) throw new Error('Failed to download Form 7 PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = `Form7_NCR_${createdNcr?.ncrNumber || formData.ncrNumber || id}.pdf`;
      linkElement.click();
      window.URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(pdfError.message || 'Failed to download Form 7 PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  // ✅ Success Modal Component with reduced opacity for all colors
  const SuccessModal = () => {
    if (!showSuccessModal || !ncrResult) return null;

    const handleGoToDashboard = () => {
      setShowSuccessModal(false);
      navigate(dashboardPath);
    };

    const handleDownloadPdf = async () => {
      await downloadForm7Pdf();
    };

    const handleViewNcr = () => {
      setShowSuccessModal(false);
      navigate(`/ncr-view/${ncrResult.id}`);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
          
          {/* Header with low opacity orange gradient */}
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(234, 128, 8, 0.3), rgba(231, 168, 105, 0.3))' }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} className="text-green-500" style={{ opacity: 0.6 }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'rgba(34, 197, 94, 0.7)' }}>NCR Created Successfully!</h2>
            <p className="mt-1 text-sm" style={{ color: 'rgba(34, 197, 94, 0.7)' }}>
              NCR Number: <span className="font-semibold" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>{ncrResult.ncrNumber}</span>
            </p>
          </div>

          {/* Details */}
          <div className="px-6 py-5">
            {/* Info row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 text-center rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Department</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{formData.processDepartment || '—'}</p>
              </div>
              <div className="p-3 text-center rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Auditee</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{formData.auditeeName || '—'}</p>
              </div>
            </div>

            {/* Note with low opacity blue */}
            <div className="flex items-start gap-2 p-3 mb-5 border border-blue-200 rounded-xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" style={{ opacity: 0.6 }} />
              <p className="text-xs" style={{ color: 'rgba(29, 78, 216, 0.8)' }}>
                The auditee will review and sign this NCR in <strong>Form 8 (Corrective Action Report)</strong>.
              </p>
            </div>

            {/* Action Buttons with low opacity */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfDownloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.7)', hover: { backgroundColor: 'rgba(29, 78, 216, 0.8)' } }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(29, 78, 216, 0.8)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.7)'}
                >
                  {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF
                </button>
                <button
                  onClick={handleViewNcr}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all border"
                  style={{ color: 'rgba(55, 65, 81, 0.8)', backgroundColor: 'rgba(243, 244, 246, 0.8)', borderColor: 'rgba(209, 213, 219, 0.5)' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(229, 231, 235, 0.9)';
                    e.target.style.borderColor = 'rgba(209, 213, 219, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(243, 244, 246, 0.8)';
                    e.target.style.borderColor = 'rgba(209, 213, 219, 0.5)';
                  }}
                >
                  <FileText size={16} />
                  View NCR
                </button>
              </div>
              <button
                onClick={handleGoToDashboard}
                className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white rounded-xl transition-all"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.7)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(185, 28, 28, 0.8)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.7)'}
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-red-600' : 'bg-gray-200'}`} />
        </div>
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-red-600' : 'bg-gray-200'}`} />
        </div>
        <div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-16 mt-2">
        <span className="text-xs text-gray-500">Nonconformity Details</span>
        <span className="text-xs text-gray-500">Evidence & Statement</span>
        <span className="text-xs text-gray-500">Acknowledgement</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading NCR data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Success Modal */}
      <SuccessModal />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(dashboardPath)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Nonconformity Report</p>
                <p className="text-xs text-gray-500">Form 7 - Create NCR</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadForm7Pdf}
                disabled={pdfDownloading || (!createdNcr?.id && !searchParams.get('id'))}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition flex items-center gap-2 border border-gray-300 disabled:opacity-50"
              >
                {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Form 7 PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Name Banner */}
      <div className="pt-20">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Nonconformity Report</h1>
                  <p className="text-sm text-gray-500">
                    {formData.ncrNumber ? `NCR #: ${formData.ncrNumber}` : 'Create New Nonconformity Report'}
                  </p>
                </div>
              </div>
              {sourceAuditReportNumber && (
                <div className="px-4 py-2 bg-red-50 border border-red-100 text-red-700 text-sm font-medium rounded-lg">
                  Audit Report No: {sourceAuditReportNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6">
        <StepIndicator />

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} className="inline mr-2" />
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Step 1: Nonconformity Details */}
          {currentStep === 1 && (
            <FormCard title="Step 1: Nonconformity Details" icon={AlertCircle}>
              <div className="grid gap-4">
                <InputField 
                  label="Process / Department *" 
                  type="textarea" 
                  rows={3} 
                  value={formData.processDepartment} 
                  onChange={(v) => setValue('processDepartment', v)} 
                  placeholder="Department - Production..." 
                  required 
                />
                <InputField 
                  label="Requirement / Clause numbers *" 
                  type="textarea" 
                  rows={3} 
                  value={formData.clauseNumbers} 
                  onChange={(v) => setValue('clauseNumbers', v)} 
                  placeholder="Clause numbers..." 
                  required 
                />
                <InputField 
                  label="Due date" 
                  type="date" 
                  value={formData.dueDate} 
                  onChange={(v) => setValue('dueDate', v)} 
                />
              </div>
            </FormCard>
          )}

          {/* Step 2: Evidence & Statement */}
          {currentStep === 2 && (
            <FormCard title="Step 2: Evidence & Statement" icon={AlertCircle}>
              <div className="grid gap-4">
                <InputField 
                  label="Objective evidence *" 
                  type="textarea" 
                  rows={5} 
                  value={formData.objectiveEvidence} 
                  onChange={(v) => setValue('objectiveEvidence', v)} 
                  placeholder="Purchase order number..." 
                  required 
                />
                <InputField 
                  label="Statement of nonconformity *" 
                  type="textarea" 
                  rows={5} 
                  value={formData.statement} 
                  onChange={(v) => setValue('statement', v)} 
                  placeholder="Statement of nonconformity..." 
                  required 
                />
              </div>
            </FormCard>
          )}

          {/* Step 3: Acknowledgement */}
          {currentStep === 3 && (
            <>
              <FormCard title="Step 3: Header Information" icon={FileText}>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Company Name" value={formData.companyName} onChange={(v) => setValue('companyName', v)} placeholder="Company name" />
                  <InputField label="Audit report number" value={formData.auditReportNumber} onChange={(v) => setValue('auditReportNumber', v)} placeholder="From audit form" disabled />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  This number is locked from the submitted audit form. NCR can be created only for the same audit report number.
                </p>
              </FormCard>

              <FormCard title="Acknowledgement" icon={Users}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Auditor</p>
                    <InputField 
                      label="Name" 
                      value={formData.auditorName} 
                      onChange={(v) => setValue('auditorName', v)} 
                      placeholder="Auditor name" 
                    />
                    <div>
                      <label className={inputStyle.label}>Signature</label>
                      {formData.auditorSignature ? (
                        <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                          <img src={formData.auditorSignature} alt="Auditor Signature" className="h-12 object-contain" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Loading signature...</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Auditee representative acknowledgement</p>
                    <div>
                      <label className={inputStyle.label}>
                        Select Auditee
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        className={inputStyle.base}
                        value={formData.auditeeId || ''}
                        onChange={(e) => {
                          const selected = auditeeOptions.find((option) => String(option.id) === e.target.value);
                          if (selected) handleAuditeeSelect(selected);
                        }}
                      >
                        <option value="">Select auditee</option>
                        {auditeeOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()} ({option.role})
                          </option>
                        ))}
                      </select>
                      {formData.auditeeId && (
                        <p className="mt-2 text-xs text-blue-600">
                          Assigned auditee: {formData.auditeeName} (ID: {formData.auditeeId})
                        </p>
                      )}
                    </div>
                    <InputField 
                      label="Name" 
                      value={formData.auditeeName} 
                      onChange={(v) => setValue('auditeeName', v)} 
                      placeholder="Auditee name" 
                    />
                    <div>
                      <label className={inputStyle.label}>Signature</label>
                      <div className="mt-2 p-2 border rounded-lg bg-yellow-50">
                        <p className="text-sm text-yellow-600 italic">
                          ⚠️ Auditee will sign in Form 8 (Corrective Action Report)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FormCard>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between gap-3 pt-4 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !!createdNcr?.id}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Create NCR'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}