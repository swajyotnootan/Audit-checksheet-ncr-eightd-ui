import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, AlertCircle, Users, CheckCircle,
  Save, Download, Loader2, ChevronRight, ChevronLeft,
  User, Building, ClipboardList, PenTool,
  Sparkles, Info
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { getDashboardPath } from '../utils/roleUtils';

// ============================================================================
// COLOR PALETTE & ANIMATIONS (MNC Professional Style)
// ============================================================================
const COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const animationStyles = `
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
.animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
`;

// Styles
const inputStyle = {
  base: "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-sm",
  textarea: "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white resize-none shadow-sm",
  label: "block text-xs font-medium text-slate-700 mb-1",
};

const InputField = ({ label, value, onChange, placeholder, type = 'text', rows, required, disabled }) => (
  <div>
    <label className={inputStyle.label}>
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
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

  // ============================================================================
  // STEP NAVIGATION (Now 2 steps instead of 3)
  // ============================================================================
  const validateStep = () => {
    if (currentStep === 1) {
      // Validate combined step 1 (old steps 1 + 2)
      if (!formData.processDepartment) { setError('Process/Department is required'); return false; }
      if (!formData.clauseNumbers) { setError('Clause numbers are required'); return false; }
      if (!formData.objectiveEvidence) { setError('Objective evidence is required'); return false; }
      if (!formData.statement) { setError('Statement of nonconformity is required'); return false; }
    } else if (currentStep === 2) {
      // Validate step 2 (old step 3)
      if (!formData.auditeeId) { setError('Please select the auditee responsible for this NCR'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) { 
      setError(null); 
      setCurrentStep(currentStep + 1); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  };

  const prevStep = () => { 
    setError(null); 
    setCurrentStep(currentStep - 1); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
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
      const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090/api/ncr/${id}/form7-pdf`, {
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

  // ✅ Success Modal Component
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl animate-scaleIn">
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${COLORS.bg}, #dbeafe)` }}>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white rounded-full shadow-lg">
              <CheckCircle size={32} style={{ color: COLORS.success }} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">NCR Created Successfully!</h2>
            <p className="mt-1 text-sm text-slate-600">
              NCR Number: <span className="font-semibold" style={{ color: COLORS.primary }}>{ncrResult.ncrNumber}</span>
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 text-center border rounded-xl bg-slate-50 border-slate-100">
                <p className="mb-1 text-xs text-slate-500">Department</p>
                <p className="text-sm font-semibold truncate text-slate-800">{formData.processDepartment || '—'}</p>
              </div>
              <div className="p-3 text-center border rounded-xl bg-slate-50 border-slate-100">
                <p className="mb-1 text-xs text-slate-500">Auditee</p>
                <p className="text-sm font-semibold truncate text-slate-800">{formData.auditeeName || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 mb-5 border rounded-xl" style={{ backgroundColor: COLORS.bg, borderColor: COLORS.lighter }}>
              <Info size={16} style={{ color: COLORS.primary }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs" style={{ color: COLORS.dark }}>
                The auditee will review and sign this NCR.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfDownloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF
                </button>
                <button
                  onClick={handleViewNcr}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all border shadow-sm hover:shadow-md bg-white text-slate-700 border-slate-200"
                >
                  <FileText size={16} />
                  View NCR
                </button>
              </div>
              <button
                onClick={handleGoToDashboard}
                className="flex items-center justify-center w-full gap-2 px-5 py-3 font-semibold text-white transition-all shadow-md rounded-xl hover:shadow-lg"
                 style={{
                  background: `linear-gradient(to bottom right, #60a5fa, ${COLORS.secondary})`,
                  border: `1px solid ${COLORS.secondary}4D`,
                  color: 'white'
                }}

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

  // ============================================================================
  // STEP INDICATOR (Now 2 steps)
  // ============================================================================
  const StepIndicator = () => {
    const steps = [
      { number: 1, title: 'Nonconformity Details', subtitle: 'Evidence & Statement', icon: AlertCircle },
      { number: 2, title: 'Acknowledgement', subtitle: 'Signatures', icon: PenTool }
    ];

    return (
      <div className="mb-6 animate-fadeInUp">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isClickable = step.number < currentStep;
            
            return (
              <React.Fragment key={step.number}>
                <button
                  type="button"
                  onClick={() => {
                    if (isClickable) {
                      setError(null);
                      setCurrentStep(step.number);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={!isClickable}
                  className={`flex items-center gap-3 transition-all duration-200 ${
                    isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  }`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 shadow-sm ${
                    isActive || isCompleted ? 'text-white' : 'bg-slate-400 text-black'
                  }`} style={{ backgroundColor: isActive || isCompleted ? COLORS.primary : undefined }}>
                    {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium" style={{ color: isActive ? COLORS.secondary : '#64748b' }}>Step {step.number}</p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-blue-500' : 'bg-slate-500'}`} style={{ backgroundColor: isCompleted ? COLORS.secondary : undefined }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <div className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin" style={{ borderColor: COLORS.lighter, borderTopColor: COLORS.primary }}></div>
          <p className="text-sm font-medium text-slate-500">Loading NCR data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <style>{animationStyles}</style>
      
      <SuccessModal />

       <div className="max-w-4xl px-4 py-8 mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fadeInUp">
          <button
            onClick={() => navigate(dashboardPath)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:shadow-md"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadForm7Pdf}
              disabled={pdfDownloading || (!createdNcr?.id && !searchParams.get('id'))}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:shadow-md disabled:opacity-50"
            >
              {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Form 7 PDF
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <StepIndicator />

        {error && (
          <div className="p-3 mb-4 border rounded-lg bg-rose-50 border-rose-200 text-rose-700 animate-fadeIn">
            <AlertCircle size={16} className="inline mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 border rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 animate-fadeIn">
            <CheckCircle size={16} className="inline mr-2" />
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* ============================================================================
              STEP 1: Nonconformity Details + Evidence & Statement (Combined)
              ============================================================================ */}
          {currentStep === 1 && (
            <div className="bg-white border shadow-sm border-slate-200 rounded-xl animate-fadeInUp">
              <div className="p-4 border-b border-slate-100" style={{ backgroundColor: COLORS.bg }}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: COLORS.lighter }}>
                    <AlertCircle size={18} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Step 1: Nonconformity Details</h2>
                    <p className="text-xs text-slate-500">Enter nonconformity details, evidence, and statement</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {/* Two Column Layout */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <InputField 
                      label="Process / Department" 
                      type="text" 
                      value={formData.processDepartment} 
                      onChange={(v) => setValue('processDepartment', v)} 
                      placeholder="Department - Production..." 
                      required 
                    />
                    <InputField 
                      label="Requirement / Clause numbers" 
                      type="textarea" 
                      rows={3} 
                      value={formData.clauseNumbers} 
                      onChange={(v) => setValue('clauseNumbers', v)} 
                      placeholder="Clause numbers..." 
                      required 
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    <InputField 
                      label="Due date" 
                      type="date" 
                      value={formData.dueDate} 
                      onChange={(v) => setValue('dueDate', v)} 
                      required
                    />
                    <InputField 
                      label="Objective evidence" 
                      type="textarea" 
                      rows={3} 
                      value={formData.objectiveEvidence} 
                      onChange={(v) => setValue('objectiveEvidence', v)} 
                      placeholder="Purchase order number..." 
                      required 
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <InputField 
                    label="Statement of nonconformity" 
                    type="textarea" 
                    rows={4} 
                    value={formData.statement} 
                    onChange={(v) => setValue('statement', v)} 
                    placeholder="Statement of nonconformity..." 
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end p-4 pt-0">
                <button onClick={nextStep} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-md hover:shadow-lg" style={{ backgroundColor: COLORS.primary }}>
                  Next Step <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================================
              STEP 2: Single Card with Header Info + Acknowledgement
              ============================================================================ */}
          {currentStep === 2 && (
            <div className="bg-white border shadow-sm border-slate-200 rounded-xl animate-fadeInUp">
              <div className="p-4 border-b border-slate-100" style={{ backgroundColor: COLORS.bg }}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: COLORS.lighter }}>
                    <Users size={18} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Step 2: Acknowledgement</h2>
                    <p className="text-xs text-slate-500">Company details and signatures</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {/* Header Information Section */}
                <div className="mb-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InputField label="Company Name" value={formData.companyName} onChange={(v) => setValue('companyName', v)} placeholder="Company name" />
                    <InputField label="Audit report number" value={formData.auditReportNumber} onChange={(v) => setValue('auditReportNumber', v)} placeholder="From audit form" disabled />
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-slate-200"></div>

                {/* Auditor and Auditee in Two Columns */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Left Column - Auditor */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <User size={14} style={{ color: COLORS.primary }} />
                      Auditor
                    </p>
                    <InputField 
                      label="Name" 
                      value={formData.auditorName} 
                      onChange={(v) => setValue('auditorName', v)} 
                      placeholder="Auditor name" 
                    />
                    <div>
                      <label className={inputStyle.label}>Signature</label>
                      {formData.auditorSignature ? (
                        <div className="p-3 mt-1 border rounded-lg" style={{ backgroundColor: COLORS.bg, borderColor: COLORS.lighter }}>
                          <img src={formData.auditorSignature} alt="Auditor Signature" className="object-contain h-10" />
                          <p className="mt-1 text-xs font-medium" style={{ color: COLORS.secondary }}>✓ Loaded from profile</p>
                        </div>
                      ) : (
                        <div className="p-3 mt-1 border rounded-lg bg-slate-50 border-slate-200">
                          <p className="text-xs italic text-slate-500">Loading signature...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Auditee */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Users size={14} style={{ color: COLORS.primary }} />
                      Auditee
                    </p>
                   
                    <InputField 
                      label="Name" 
                      value={formData.auditeeName} 
                      onChange={(v) => setValue('auditeeName', v)} 
                      placeholder="Auditee name" 
                    />
                    <div>
                      <label className={inputStyle.label}>Signature</label>
                      <div className="p-3 mt-1 border rounded-lg" style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
                        <p className="flex items-center gap-1 text-xs italic" style={{ color: '#92400e' }}>
                          <Info size={12} />
                          Will sign in Form 8
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-4 pt-0">
                <button onClick={prevStep} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:bg-slate-50">
                  <ChevronLeft size={16} /> Previous
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(dashboardPath)}
                    className="px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !!createdNcr?.id}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-md disabled:opacity-50 hover:shadow-lg"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Create NCR'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}