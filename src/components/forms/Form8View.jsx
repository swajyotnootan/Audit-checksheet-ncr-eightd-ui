import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, FileSpreadsheet, AlertCircle, HelpCircle, CheckCircle,
  Target, Layers, FileText, Save, Download, Loader2, PlayCircle,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { ncrService } from '../services/ncrService';
import { userAPI } from '../services/api'; // ✅ Added for fetching user names
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleUtils';
 
const inputStyle = {
  base: 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white',
  textarea: 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white resize-none',
  label: 'block text-xs font-medium text-gray-700 mb-1',
  card: 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
  cardHeader: 'px-5 py-3 border-b border-gray-200 bg-gray-50/50',
  cardTitle: 'text-sm font-semibold text-gray-800 flex items-center gap-2',
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
 
const InputField = ({ label, value, onChange, placeholder, type = 'text', rows, required, disabled }) => {
  if (type === 'textarea') {
    return (
      <div>
        <label className={inputStyle.label}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          className={inputStyle.textarea}
          rows={rows || 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }
  return (
    <div>
      <label className={inputStyle.label}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        className={inputStyle.base}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};
 
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
    auditees: '',   // ✅ Will be populated from userAPI
    auditors: '',   // ✅ Will be populated from userAPI
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
    }
  };
 
  const prevStep = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };
 
  // ─── Step Indicator ────────────────────────────────────────
  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`} />
        </div>
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-orange-600' : 'bg-gray-200'}`} />
        </div>
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <div className={`w-16 h-1 ${currentStep >= 4 ? 'bg-orange-600' : 'bg-gray-200'}`} />
        </div>
        <div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep >= 4 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            4
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-8 mt-2">
        <span className="text-xs text-gray-500">NCR Info</span>
        <span className="text-xs text-gray-500">Root Cause</span>
        <span className="text-xs text-gray-500">Correction & Actions</span>
        <span className="text-xs text-gray-500">Deployment & Submit</span>
      </div>
    </div>
  );
 
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
    // Try common field patterns returned by the backend
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
 
      // ✅ Resolve auditor name via userAPI, fall back to whatever the NCR already carries
      let resolvedAuditorName = ncr.auditorName || '';
      if (ncr.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(ncr.auditorId);
          resolvedAuditorName = resolveUserName(auditorUser, resolvedAuditorName);
        } catch {
          // silently keep fallback
        }
      }
 
      // ✅ Resolve auditee name via userAPI, fall back to whatever the NCR already carries
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
        // ✅ Populated from API — shown read-only in Step 1
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
      const response = await fetch(`https://internalaudit.hub.swajyot.co.in:8090/api/ncr/${ncrId}/form8-pdf`, {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading NCR data...</p>
        </div>
      </div>
    );
  }
 
  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
 
      {/* ── Top nav bar ── */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(dashboardPath)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Form 8 — Corrective Action</p>
                {formData.ncrNo && <p className="text-xs text-gray-500">NCR #: {formData.ncrNo}</p>}
              </div>
            </div>
            <button
              onClick={downloadForm8Pdf}
              disabled={!ncrId || pdfDownloading}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 flex items-center gap-2 border border-gray-300 disabled:opacity-50"
            >
              {pdfDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Form 8 PDF
            </button>
          </div>
        </div>
      </div>
 
      {/* ── Sub-header ── */}
      <div className="pt-16">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">NC Report — Corrective Action</h1>
                  <p className="text-sm text-gray-500">
                    {formData.ncrNo ? `Filling corrective action for NCR #${formData.ncrNo}` : 'Submit Corrective Action'}
                  </p>
                </div>
              </div>
              <button
                onClick={fillDemoData}
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md"
              >
                <PlayCircle size={18} /> Load Demo Data
              </button>
            </div>
          </div>
        </div>
      </div>
 
      {/* ── Main content ── */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6">
        <StepIndicator />
 
        {/* Alerts */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle size={18} className="inline mr-2" /> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} className="inline mr-2" /> {error}
          </div>
        )}
        {!ncrId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <AlertCircle size={18} className="inline mr-2" /> No NCR selected.
          </div>
        )}
 
        {/* ── Step content ── */}
        <div className="space-y-5">
 
          {/* STEP 1 — NCR Info */}
          {currentStep === 1 && (
            <>
              <FormCard title="Step 1: NCR Information" icon={FileSpreadsheet}>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Read-only fields pre-filled from API */}
                  <InputField
                    label="NCR No."
                    value={formData.ncrNo}
                    onChange={() => {}}
                    disabled
                  />
                  <InputField
                    label="Dept / Area"
                    value={formData.department}
                    onChange={(v) => setValue('department', v)}
                    disabled
                  />
                  {/* ✅ Auditee — auto-fetched, still editable as override */}
                  <InputField
                    label="Auditee(s)"
                    value={formData.auditees}
                    onChange={(v) => setValue('auditees', v)}
                    placeholder="Loading…"
                  />
                  {/* ✅ Auditor — auto-fetched, still editable as override */}
                  <InputField
                    label="Auditor(s)"
                    value={formData.auditors}
                    onChange={(v) => setValue('auditors', v)}
                    placeholder="Loading…"
                  />
                  <InputField
                    label="Audit No."
                    value={formData.auditNo}
                    onChange={(v) => setValue('auditNo', v)}
                  />
                  <InputField
                    label="Audit Date"
                    type="date"
                    value={formData.auditDate}
                    onChange={(v) => setValue('auditDate', v)}
                  />
                </div>
              </FormCard>
 
              <FormCard title="Detail of Observation" icon={AlertCircle}>
                <InputField
                  type="textarea"
                  rows={5}
                  value={formData.detailOfObservation}
                  onChange={(v) => setValue('detailOfObservation', v)}
                  disabled
                />
              </FormCard>
            </>
          )}
 
          {/* STEP 2 — Root Cause */}
          {currentStep === 2 && (
            <FormCard title="Step 2: Root Cause Analysis" icon={HelpCircle}>
              <InputField
                type="textarea"
                rows={6}
                value={formData.rootCause}
                onChange={(v) => setValue('rootCause', v)}
                placeholder="Enter root cause analysis..."
                required
              />
            </FormCard>
          )}
 
          {/* STEP 3 — Correction & Actions */}
          {currentStep === 3 && (
            <>
              <FormCard title="Step 3A: Immediate Correction" icon={CheckCircle}>
                <div className="grid gap-4">
                  <InputField
                    type="textarea"
                    rows={4}
                    value={formData.correction}
                    onChange={(v) => setValue('correction', v)}
                    placeholder="Immediate correction applied..."
                    required
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Responsible"
                      value={formData.correctionResp}
                      onChange={(v) => setValue('correctionResp', v)}
                    />
                    <InputField
                      label="Target Date"
                      type="date"
                      value={formData.correctionTarget}
                      onChange={(v) => setValue('correctionTarget', v)}
                    />
                  </div>
                </div>
              </FormCard>
 
              <FormCard title="Step 3B: Permanent Corrective Actions" icon={Target}>
                <div className="grid gap-4">
                  <InputField
                    type="textarea"
                    rows={5}
                    value={formData.correctiveActions}
                    onChange={(v) => setValue('correctiveActions', v)}
                    placeholder="Long-term corrective actions..."
                    required
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Responsible"
                      value={formData.actionResp}
                      onChange={(v) => setValue('actionResp', v)}
                    />
                    <InputField
                      label="Target Date"
                      type="date"
                      value={formData.actionTarget}
                      onChange={(v) => setValue('actionTarget', v)}
                    />
                  </div>
                </div>
              </FormCard>
            </>
          )}
 
          {/* STEP 4 — Deployment & Submit */}
          {currentStep === 4 && (
            <>
              <FormCard title="Step 4A: Horizontal Deployment" icon={Layers}>
                <div className="grid gap-4">
                  <InputField
                    type="textarea"
                    rows={4}
                    value={formData.horizontalDeployment}
                    onChange={(v) => setValue('horizontalDeployment', v)}
                  />
                  <InputField
                    label="Actual Completion Date"
                    type="date"
                    value={formData.actualDate}
                    onChange={(v) => setValue('actualDate', v)}
                  />
                </div>
              </FormCard>
 
              <FormCard title="Step 4B: Remarks & Submission" icon={FileText}>
                <div className="space-y-4">
                  <InputField
                    type="textarea"
                    rows={3}
                    value={formData.remarks}
                    onChange={(v) => setValue('remarks', v)}
                  />
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-700">
                      Once submitted, this NCR will move to "In Progress" status for audit manager verification.
                    </p>
                  </div>
                </div>
              </FormCard>
            </>
          )}
        </div>

        {isNCR2Mode && formData.rejectionReason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">HOD rejection message from 8D D0</p>
                <p className="mt-1 text-sm whitespace-pre-line">{formData.rejectionReason}</p>
                {formData.managerReviewComment && (
                  <p className="mt-2 text-xs text-red-700 whitespace-pre-line">{formData.managerReviewComment}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="mt-8 flex justify-between gap-3 pt-4 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !ncrId}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Submitting...' : (isNCR2Mode ? 'Submit NCR2 Corrective Action' : 'Submit Corrective Action')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
 
