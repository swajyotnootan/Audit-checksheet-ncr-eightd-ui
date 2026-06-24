import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, AlertCircle, HelpCircle, CheckCircle,
  Target, Layers, Save, Download, Loader2, ChevronRight, ChevronLeft,
  Info, Sparkles
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
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

const FormCard = ({ title, children, icon: Icon, subtitle }) => (
  <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-xl animate-fadeInUp">
    <div className="p-4 border-b border-slate-100" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: COLORS.lighter }}>
          {Icon && <Icon size={18} style={{ color: COLORS.primary }} />}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

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

export default function Form8View() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const dashboardPath = getDashboardPath(user);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [ncrId, setNcrId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const isNCR2Mode = searchParams.get('type') === 'ncr2';

  const [formData, setFormData] = useState({
    department: '',
    auditees: '',
    auditors: '',
    pageDetails: '',
    ncrNo: '',
    auditNo: '',
    auditDate: '',
    detailOfObservation: '',
    rootCause: '',
    correction: '',
    correctionResp: '',
    correctionTarget: '',
    correctiveActions: '',
    actionResp: '',
    actionTarget: '',
    horizontalDeployment: '',
    actualDate: '',
    remarks: '',
    ncrStatus: '',
    rejectionReason: '',
    managerReviewComment: '',
  });

  const setValue = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  // ─── Step validation ───────────────────────────────────────
  const validateStep = () => {
    if (currentStep === 1) {
      return true;
    } else if (currentStep === 2) {
      if (!formData.rootCause.trim()) {
        setError('Root Cause is required');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.correction.trim()) {
        setError('Correction is required');
        return false;
      }
      if (!formData.correctiveActions.trim()) {
        setError('Corrective Actions are required');
        return false;
      }
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

  // ─── Step Indicator ────────────────────────────────────────
  const StepIndicator = () => {
    const steps = [
      { number: 1, title: 'NCR Info', icon: FileText },
      { number: 2, title: 'Root Cause', icon: HelpCircle },
      { number: 3, title: 'Correction & Actions', icon: Target },
      { number: 4, title: 'Deployment & Submit', icon: Layers }
    ];

    return (
      <div className="mb-6 animate-fadeInUp">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
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
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-medium" style={{ color: isActive ? COLORS.secondary : '#64748b' }}>Step {step.number}</p>
                    <p className="text-xs text-slate-500">{step.title}</p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300`} style={{ backgroundColor: isCompleted ? COLORS.secondary : '#cbd5e1' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── On mount: read NCR id from URL ────────────────────────
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && id !== 'null' && id !== 'undefined') {
      setNcrId(id);
      fetchNCRData(id);
    }
  }, [searchParams]);

  // ─── Helper: resolve a display name from a user object ─────
  const resolveUserName = (userObj, fallback = '') => {
    if (!userObj) return fallback;
    return (
      userObj.name ||
      userObj.fullName ||
      [userObj.firstName, userObj.lastName].filter(Boolean).join(' ') ||
      userObj.username ||
      fallback
    );
  };

  // ─── Fetch NCR data + auditor / auditee names ──────────────
  const fetchNCRData = async (id) => {
    setLoading(true);
    setError(null);

    const result = await ncrService.getNCRById(id);

    if (result.success) {
      const ncr = result.data;

      let resolvedAuditorName = ncr.auditorName || '';
      if (ncr.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(ncr.auditorId);
          resolvedAuditorName = resolveUserName(auditorUser, resolvedAuditorName);
        } catch {
          // silently keep fallback
        }
      }

      let resolvedAuditeeName = ncr.auditeeName || '';
      if (ncr.auditeeId) {
        try {
          const auditeeUser = await userAPI.getUserById(ncr.auditeeId);
          resolvedAuditeeName = resolveUserName(auditeeUser, resolvedAuditeeName);
        } catch {
          // silently keep fallback
        }
      }

      setFormData((prev) => ({
        ...prev,
        ncrNo:               ncr.ncrNumber               || '',
        department:          ncr.department               || '',
        detailOfObservation: ncr.statementOfNonconformity || '',
        rootCause:           isNCR2Mode ? (ncr.ncr2RootCause || '') : (ncr.rootCause || ''),
        correction:          isNCR2Mode ? (ncr.ncr2Correction || '') : (ncr.correction || ''),
        correctiveActions:   isNCR2Mode ? (ncr.ncr2CorrectiveAction || '') : (ncr.correctiveAction || ''),
        horizontalDeployment:isNCR2Mode ? (ncr.ncr2HorizontalDeployment || '') : (ncr.horizontalDeployment || ''),
        auditNo:             ncr.auditReportNumber        || '',
        ncrStatus:           ncr.status                   || '',
        rejectionReason:     ncr.rejectionReason          || '',
        managerReviewComment:ncr.managerReviewComment     || '',
        auditors:            resolvedAuditorName,
        auditees:            resolvedAuditeeName,
      }));
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  // ─── Demo data (only for fields the user can still edit) ───
  const fillDemoData = () => {
    setFormData((prev) => ({
      ...prev,
      pageDetails: '1 of 1',
      auditNo: prev.auditNo || 'AUD-2024-015',
      auditDate: '2024-04-15',
      rootCause: '1. Calibration schedule not properly maintained\n2. Lack of awareness about in-process check requirements\n3. Document control process not followed for work instructions',
      correction: '1. Torque wrench sent for immediate calibration\n2. In-process checks initiated from current shift\n3. Work instruction printed and placed at workstation',
      correctionResp: 'QA Department',
      correctionTarget: '2024-04-18',
      correctiveActions: '1. Implement digital calibration tracking system\n2. Conduct training for all production staff\n3. Update document control procedure',
      actionResp: 'Production Manager & QA Head',
      actionTarget: '2024-05-15',
      horizontalDeployment: 'Check all other assembly lines for similar issues',
      actualDate: '2024-05-10',
      remarks: 'All corrective actions implemented effectively.',
    }));
    setSuccess('✅ Demo data loaded!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // ─── Final validation ──────────────────────────────────────
  const validateForm = () => {
    if (!formData.rootCause.trim())        { setError('Root Cause is required');         return false; }
    if (!formData.correction.trim())       { setError('Correction is required');          return false; }
    if (!formData.correctiveActions.trim()){ setError('Corrective Actions are required'); return false; }
    return true;
  };

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!ncrId) { setError('No NCR selected.'); return; }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const actionData = {
        rootCause: formData.rootCause,
        correction: formData.correction,
        correctiveAction: formData.correctiveActions,
        horizontalDeployment: formData.horizontalDeployment,
        auditeeName: formData.auditees,
        auditeeSignature: '',
    };

    let result;
    if (isNCR2Mode) {
        result = await ncrService.submitNCR2(ncrId, actionData);
    } else {
        result = await ncrService.submitCorrectiveAction(ncrId, actionData);
    }

    if (result.success) {
        const message = isNCR2Mode 
            ? `NCR2 corrective action submitted for NCR #${result.data.ncrNumber}`
            : `Corrective action submitted for NCR #${result.data.ncrNumber}`;
        setSuccess(message);
        setTimeout(() => navigate(`/form8-view/${ncrId}`), 1800);
    } else {
        setError(result.error);
    }

    setSaving(false);
  };

  // ─── PDF download ──────────────────────────────────────────
  const downloadForm8Pdf = async () => {
    if (!ncrId) { setError('No NCR selected.'); return; }
    setPdfDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090
/api/ncr/${ncrId}/form8-pdf`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) throw new Error('Failed to download Form 8 PDF');
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `Form8_CA_${formData.ncrNo || ncrId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(pdfError.message || 'Failed to download Form 8 PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  // ─── Loading screen ────────────────────────────────────────
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

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <style>{animationStyles}</style>

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
              onClick={fillDemoData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-emerald-700 border-emerald-200 hover:shadow-md hover:bg-emerald-50"
            >
              <Sparkles size={16} />
              Load Demo
            </button>
            <button
              onClick={downloadForm8Pdf}
              disabled={!ncrId || pdfDownloading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:shadow-md disabled:opacity-50"
            >
              {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Form 8 PDF
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <StepIndicator />

        {/* Alerts */}
        {success && (
          <div className="p-3 mb-4 border rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 animate-fadeIn">
            <CheckCircle size={16} className="inline mr-2" />
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 mb-4 border rounded-lg bg-rose-50 border-rose-200 text-rose-700 animate-fadeIn">
            <AlertCircle size={16} className="inline mr-2" />
            {error}
          </div>
        )}
        {!ncrId && (
          <div className="p-3 mb-4 border rounded-lg bg-amber-50 border-amber-200 text-amber-700 animate-fadeIn">
            <AlertCircle size={16} className="inline mr-2" />
            No NCR selected.
          </div>
        )}

        {/* Rejection Reason for NCR2 Mode */}
        {isNCR2Mode && formData.rejectionReason && (
          <div className="p-4 mb-4 border rounded-xl bg-rose-50 border-rose-200 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-bold text-rose-800">HOD rejection message from 8D D0</p>
                <p className="mt-1 text-sm whitespace-pre-line text-rose-700">{formData.rejectionReason}</p>
                {formData.managerReviewComment && (
                  <p className="mt-2 text-xs whitespace-pre-line text-rose-600">{formData.managerReviewComment}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* STEP 1 — NCR Info */}
          {currentStep === 1 && (
            <FormCard title="Step 1: NCR Information" subtitle="Review NCR details and observation" icon={FileText}>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="NCR No." value={formData.ncrNo} onChange={() => {}} disabled />
                <InputField label="Dept / Area" value={formData.department} onChange={(v) => setValue('department', v)} disabled />
                <InputField label="Auditee(s)" value={formData.auditees} onChange={(v) => setValue('auditees', v)} placeholder="Loading…" />
                <InputField label="Auditor(s)" value={formData.auditors} onChange={(v) => setValue('auditors', v)} placeholder="Loading…" />
                <InputField label="Audit No." value={formData.auditNo} onChange={(v) => setValue('auditNo', v)} />
                <InputField label="Audit Date" type="date" value={formData.auditDate} onChange={(v) => setValue('auditDate', v)} />
              </div>
              <div className="mt-4">
                <InputField type="textarea" rows={5} label="Detail of Observation" value={formData.detailOfObservation} onChange={(v) => setValue('detailOfObservation', v)} disabled />
              </div>
            </FormCard>
          )}

          {/* STEP 2 — Root Cause */}
          {currentStep === 2 && (
            <FormCard title="Step 2: Root Cause Analysis" subtitle="Identify the root cause of the nonconformity" icon={HelpCircle}>
              <InputField type="textarea" rows={6} label="Root Cause" value={formData.rootCause} onChange={(v) => setValue('rootCause', v)} placeholder="Enter root cause analysis..." required />
            </FormCard>
          )}

          {/* STEP 3 — Correction & Actions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <FormCard title="Step 3A: Immediate Correction" subtitle="Actions taken to contain the issue" icon={CheckCircle}>
                <InputField type="textarea" rows={4} label="Correction" value={formData.correction} onChange={(v) => setValue('correction', v)} placeholder="Immediate correction applied..." required />
                <div className="grid gap-4 mt-4 md:grid-cols-2">
                  <InputField label="Responsible" value={formData.correctionResp} onChange={(v) => setValue('correctionResp', v)} />
                  <InputField label="Target Date" type="date" value={formData.correctionTarget} onChange={(v) => setValue('correctionTarget', v)} />
                </div>
              </FormCard>
              <FormCard title="Step 3B: Permanent Corrective Actions" subtitle="Long-term actions to prevent recurrence" icon={Target}>
                <InputField type="textarea" rows={5} label="Corrective Actions" value={formData.correctiveActions} onChange={(v) => setValue('correctiveActions', v)} placeholder="Long-term corrective actions..." required />
                <div className="grid gap-4 mt-4 md:grid-cols-2">
                  <InputField label="Responsible" value={formData.actionResp} onChange={(v) => setValue('actionResp', v)} />
                  <InputField label="Target Date" type="date" value={formData.actionTarget} onChange={(v) => setValue('actionTarget', v)} />
                </div>
              </FormCard>
            </div>
          )}

          {/* STEP 4 — Deployment & Submit */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <FormCard title="Step 4A: Horizontal Deployment" subtitle="Apply similar fixes to other areas if applicable" icon={Layers}>
                <InputField type="textarea" rows={4} label="Horizontal Deployment" value={formData.horizontalDeployment} onChange={(v) => setValue('horizontalDeployment', v)} />
                <div className="mt-4">
                  <InputField label="Actual Completion Date" type="date" value={formData.actualDate} onChange={(v) => setValue('actualDate', v)} />
                </div>
              </FormCard>
              <FormCard title="Step 4B: Remarks & Submission" subtitle="Final comments before submission" icon={FileText}>
                <InputField type="textarea" rows={3} label="Remarks" value={formData.remarks} onChange={(v) => setValue('remarks', v)} />
                <div className="flex items-start gap-2 p-3 mt-4 border rounded-xl" style={{ backgroundColor: COLORS.bg, borderColor: COLORS.lighter }}>
                  <Info size={16} style={{ color: COLORS.primary }} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs" style={{ color: COLORS.dark }}>
                    Once submitted, this NCR will move to "In Progress" status for audit manager verification.
                  </p>
                </div>
              </FormCard>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 mt-6 border-t border-slate-200">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <ChevronLeft size={16} /> Previous
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 text-sm font-medium transition-all bg-white border rounded-lg shadow-sm text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-md hover:shadow-lg"
                style={{ backgroundColor: COLORS.primary }}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !ncrId}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-md disabled:opacity-50 hover:shadow-lg"
                style={{ backgroundColor: COLORS.primary }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Submitting...' : (isNCR2Mode ? 'Submit NCR2' : 'Submit Corrective Action')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}