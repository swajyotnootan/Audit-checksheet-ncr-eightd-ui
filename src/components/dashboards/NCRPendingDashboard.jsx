import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiEye, 
  FiRefreshCw, FiX, FiFileText, FiUsers, FiCalendar, FiMessageSquare
} from 'react-icons/fi';
import { ncrService } from '../services/ncrService';
import AuditCheckSheetNCRForumModal from '../modals/AuditCheckSheetNCRForumModal';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://internalaudit.hub.swajyot.co.in:8090/api';

// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#000000',       
  textValue: '#1F2937',  
  textMuted: '#6B7280',
  accent: '#00529B',
  accentLight: '#EFF6FF',
  accentBorder: '#DBEAFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
};

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const getStatusLabel = (status) => {
  const labels = {
    AWAITING_AUDITEE: 'Awaiting Auditee',
    OPEN: 'Pending Approval',
    APPROVED: 'Ready for Action',
    IN_PROGRESS: 'Submitted - Pending Verification',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
    SENT_TO_8D: 'Sent to 8D',
    IN_8D_PROCESS: 'In 8D Process',
    READY_FOR_NCR2: 'Ready for NCR2',
    NCR2_IN_PROGRESS: 'NCR2 Verification',
    NCR2_COMPLETED: 'NCR2 Completed',
  };
  return labels[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB');
};

// ─────────────────────────────────────────────────────────────
// Reusable UI Components
// ─────────────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', ...style }}>
    {children}
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    IN_PROGRESS: { label: 'Pending Verification', bg: T.purpleLight, color: '#5B21B6', border: T.purpleBorder },
    CLOSED: { label: 'Closed', bg: T.successLight, color: '#065F46', border: T.successBorder },
    REJECTED: { label: 'Rejected', bg: T.errorLight, color: '#991B1B', border: T.errorBorder },
    READY_FOR_NCR2: { label: 'Ready for NCR2', bg: T.accentLight, color: '#1E40AF', border: T.accentBorder },
    NCR2_IN_PROGRESS: { label: 'NCR2 Pending Verification', bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
    NCR2_COMPLETED: { label: 'NCR2 Completed', bg: T.successLight, color: '#065F46', border: T.successBorder },
  };
  const { label, bg, color, border } = config[status] || { label: status, bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color: color, border: `1px solid ${border}`, fontFamily: FONT_FAMILY }}>
      {label}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, border }) => (
  <Card style={{ padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: color }}>{value}</p>
      </div>
      {Icon && (
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      )}
    </div>
  </Card>
);

const ActionButton = ({ onClick, children, variant = 'primary', icon: Icon, disabled = false, title }) => {
  const isPrimary = variant === 'primary';
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      title={title} 
      style={{
        height: 36, padding: '0 16px', borderRadius: 8, border: `1px solid ${isPrimary ? 'transparent' : T.border}`,
        background: disabled ? '#F1F5F9' : (isPrimary ? T.accent : T.card), 
        color: disabled ? '#94A3B8' : (isPrimary ? '#FFF' : T.textValue),
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: FONT_FAMILY,
        boxShadow: isPrimary && !disabled ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

const SectionCard = ({ title, subtitle, action, children }) => (
  <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>{title}</h3>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
    <div>{children}</div>
  </Card>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F9', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      {Icon && <Icon size={24} color="#94A3B8" />}
    </div>
    <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: T.text }}>{title}</h4>
    {description && <p style={{ margin: 0, fontSize: 14, color: T.textMuted, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>{description}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Verification Row Component
// ─────────────────────────────────────────────────────────────

const VerificationRow = ({ ncr, onVerify, onView, onOpenForum }) => {
  const isNCR2 = ncr.status === 'NCR2_IN_PROGRESS' || ncr.ncr2CorrectiveAction;
  
  return (
    <div 
      style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: 16, padding: '14px 24px', borderBottom: `1px solid ${T.border}`, alignItems: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.textValue, fontFamily: 'monospace' }}>
          {ncr.ncrNumber || `NCR #${ncr.id}`}
        </p>
        {isNCR2 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.purple, marginTop: 2, display: 'inline-block' }}>(NCR2 Mode)</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: T.textMuted }}>
        <FiCalendar size={14} color="#94A3B8" />
        {formatDate(ncr.updatedAt || ncr.ncr2SubmittedAt)}
      </div>
      <div>
        <StatusBadge status={ncr.status} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {(ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS') ? (
          <ActionButton onClick={() => onVerify(ncr)} variant="primary" icon={FiEye} title="View & Verify Corrective Action">
            Verify
          </ActionButton>
        ) : (
          <ActionButton onClick={() => onView(ncr)} variant="secondary" icon={FiEye} title="Preview Corrective Action">
            Preview
          </ActionButton>
        )}
        <button
          onClick={() => onOpenForum(ncr)}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.purpleBorder}`, background: T.purpleLight, color: T.purple, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Open Discussion Forum"
          onMouseEnter={e => { e.currentTarget.style.background = T.purple; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.purpleLight; e.currentTarget.style.color = T.purple; }}
        >
          <FiMessageSquare size={16} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Closed Row Component
// ─────────────────────────────────────────────────────────────

const ClosedRow = ({ ncr, onView, onOpenForum }) => {
  const isNCR2 = ncr.status === 'NCR2_COMPLETED';
  
  return (
    <div 
      style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: 16, padding: '14px 24px', borderBottom: `1px solid ${T.border}`, alignItems: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.textValue, fontFamily: 'monospace' }}>
          {ncr.ncrNumber || `NCR #${ncr.id}`}
        </p>
        {isNCR2 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.purple, marginTop: 2, display: 'inline-block' }}>(NCR2)</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: T.textMuted }}>
        <FiUsers size={14} color="#94A3B8" />
        {ncr.department || '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: T.textMuted }}>
        <FiCalendar size={14} color="#94A3B8" />
        {formatDate(ncr.closedAt || ncr.ncr2ClosedAt)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <ActionButton onClick={() => onView(ncr)} variant="secondary" icon={FiEye} title="View Form 8 Details">
          View
        </ActionButton>
        <button
          onClick={() => onOpenForum(ncr)}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.purpleBorder}`, background: T.purpleLight, color: T.purple, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Open Discussion Forum"
          onMouseEnter={e => { e.currentTarget.style.background = T.purple; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.purpleLight; e.currentTarget.style.color = T.purple; }}
        >
          <FiMessageSquare size={16} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Verify Modal Component
// ─────────────────────────────────────────────────────────────

const Spinner = ({ size = 16, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
  </svg>
);

const VerifyModal = ({ ncr, onClose, onVerify, loading }) => {
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState(null);
  const isNCR2 = ncr?.status === 'NCR2_IN_PROGRESS';

  const handleVerify = (accepted) => {
    if (!accepted && !comment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setDecision(accepted ? 'accept' : 'reject');
    onVerify(accepted, comment);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FONT_FAMILY }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: `1px solid ${T.accentBorder}`, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', background:T.accentLight, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiEye size={22} color={T.purple} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
                {decision === 'accept' ? 'Accepting...' : decision === 'reject' ? 'Rejecting...' : `Verify ${isNCR2 ? 'NCR2' : 'Corrective Action'}`}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>NCR #{ncr?.ncrNumber}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* NCR Summary */}
          <div style={{ padding: 20, background: T.accentLight, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: T.text }}>
              <FiFileText size={16} color={T.accent} /> NCR Summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14, color: T.textValue }}>
              <p style={{ margin: 0 }}><strong style={{ color: T.textMuted, fontWeight: 600 }}>Status:</strong> {getStatusLabel(ncr?.status)}</p>
              <p style={{ margin: 0 }}><strong style={{ color: T.textMuted, fontWeight: 600 }}>Department:</strong> {ncr?.department || '-'}</p>
              <p style={{ margin: 0 }}><strong style={{ color: T.textMuted, fontWeight: 600 }}>Auditee:</strong> {ncr?.auditeeName || '-'}</p>
              <p style={{ margin: 0 }}><strong style={{ color: T.textMuted, fontWeight: 600 }}>Auditor:</strong> {ncr?.auditorName || '-'}</p>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: T.textValue, lineHeight: 1.5 }}>
              <strong style={{ color: T.textMuted, fontWeight: 600 }}>Statement:</strong> {ncr?.statementOfNonconformity?.substring(0, 200)}{ncr?.statementOfNonconformity?.length > 200 ? '...' : ''}
            </p>
          </div>

          {/* Corrective Action Details */}
          <div style={{ padding: 20, background: isNCR2 ? T.accentLight : T.accentLight, border: `1px solid ${isNCR2 ? '#DDD6FE' : T.purpleBorder}`, borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: isNCR2 ? '1E3A8A' : '#6D28D9' }}>
              <FiCheckCircle size={16} /> {isNCR2 ? 'NCR2 Corrective Action Details' : 'Corrective Action Details'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Root Cause', value: isNCR2 ? ncr?.ncr2RootCause : ncr?.rootCause },
                { label: 'Correction', value: isNCR2 ? ncr?.ncr2Correction : ncr?.correction },
                { label: 'Corrective Action', value: isNCR2 ? ncr?.ncr2CorrectiveAction : ncr?.correctiveAction },
                { label: 'Horizontal Deployment', value: isNCR2 ? ncr?.ncr2HorizontalDeployment : ncr?.horizontalDeployment },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.textValue, minHeight: 40 }}>
                    {value || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Not provided</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Comments */}
          {(ncr?.auditeeReviewComment || ncr?.managerReviewComment) && (
            <div style={{ padding: 20, background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 12 }}>
              <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#1E3A8A' }}>
                <FiMessageSquare size={16} /> Previous Comments
              </h4>
              {ncr?.auditeeReviewComment && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditee Review</p>
                  <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.textValue }}>{ncr.auditeeReviewComment}</div>
                </div>
              )}
              {ncr?.managerReviewComment && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager Review</p>
                  <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.textValue }}>{ncr.managerReviewComment}</div>
                </div>
              )}
            </div>
          )}

          {/* Verification Comments */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              Verification Comments {!decision && <span style={{ color: T.error }}>*</span>}
            </label>
            <textarea
              rows={4}
              style={{ width: '100%', padding: 14, fontSize: 15, fontFamily: FONT_FAMILY, borderRadius: 8, border: `1px solid ${T.border}`, background: '#F8FAFC', color: T.textValue, outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision === 'reject' ? "Reason for rejection (required)" : "Add verification notes (optional)"}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: T.warningLight, border: `1px solid ${T.warningBorder}`, borderRadius: 8, fontSize: 13, color: '#92400E', flex: 1 }}>
            <strong>💡 Accept:</strong> {isNCR2 ? 'NCR2 will be marked COMPLETED.' : 'NCR will be marked CLOSED.'} <strong>Reject:</strong> Returns to Auditee for rework.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => handleVerify(false)}
              disabled={loading}
              style={{ height: 42, padding: '0 24px', borderRadius: 8, border: 'none', background: T.error, color: '#FFF', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT_FAMILY, opacity: loading ? 0.7 : 1 }}
            >
              {loading && decision === 'reject' ? <Spinner size={16} /> : <FiX size={16} />} Reject
            </button>
            <button
              onClick={() => handleVerify(true)}
              disabled={loading}
              style={{ height: 42, padding: '0 24px', borderRadius: 8, border: 'none', background: T.accent, color: '#FFF', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT_FAMILY, opacity: loading ? 0.7 : 1 }}
            >
              {loading && decision === 'accept' ? <Spinner size={16} /> : <FiCheckCircle size={16} />} Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRPendingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [closedItems, setClosedItems] = useState([]);
  const [error, setError] = useState(null);
  const [selectedNCR, setSelectedNCR] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`, { withCredentials: true });
      setAllUsersList(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsersList([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [pendingResult, allResult] = await Promise.all([
      ncrService.getPendingVerification(),
      ncrService.getAllNCRs(),
    ]);

    if (!pendingResult.success) {
      setError(pendingResult.error);
      setVerificationQueue([]);
    } else {
      const allNcrs = allResult.success ? allResult.data : pendingResult.data;
      setVerificationQueue(
        allNcrs
          .filter((ncr) => 
            (
              (ncr.rootCause || ncr.correction || ncr.correctiveAction) ||
              (ncr.ncr2RootCause || ncr.ncr2Correction || ncr.ncr2CorrectiveAction)
            ) &&
            ncr.status !== 'CLOSED' &&
            ncr.status !== 'REJECTED' &&
            ncr.status !== 'NCR2_COMPLETED' &&
            (ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS')
          )
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      );
    }

    if (allResult.success) {
      setClosedItems(
        allResult.data.filter(
          (ncr) => 
            (ncr.status === 'CLOSED' || ncr.status === 'NCR2_COMPLETED') && 
            (
              (ncr.rootCause || ncr.correction || ncr.correctiveAction) ||
              (ncr.ncr2RootCause || ncr.ncr2Correction || ncr.ncr2CorrectiveAction)
            )
        )
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    fetchAllUsers();
  }, []);

  const handleVerify = async (accepted, comment) => {
    setVerifyLoading(true);
    
    let result;
    if (selectedNCR?.status === 'NCR2_IN_PROGRESS') {
      result = await ncrService.verifyNCR2(selectedNCR.id, accepted, comment);
    } else {
      result = await ncrService.verifyAndClose(selectedNCR.id, accepted, comment);
    }
    
    if (!result.success) {
      setError(result.error);
    } else {
      setShowVerifyModal(false);
      setSelectedNCR(null);
      await loadData();
    }
    setVerifyLoading(false);
  };

  const openVerifyModal = (ncr) => {
    setSelectedNCR(ncr);
    setShowVerifyModal(true);
  };

  const openNCRForum = (ncr) => {
    const auditManager = allUsersList.find(u => u.role === 'AUDIT_MANAGER');
    const auditor = allUsersList.find(u => u.id === ncr.auditorId);
    const auditee = allUsersList.find(u => u.id === ncr.auditeeId);
    
    setSelectedNCRForForum({
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      auditorId: ncr.auditorId,
      auditorName: ncr.auditorName || auditor?.name,
      auditeeId: ncr.auditeeId,
      auditeeName: ncr.auditeeName || auditee?.name,
      memberEmails: [
        auditor?.email, auditee?.email, user?.email, auditManager?.email
      ].filter(Boolean)
    });
    setShowForumModal(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: FONT_FAMILY }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3" />
            <circle cx="12" cy="12" r="10" stroke={T.purple} strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
          </svg>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>Loading verification queue...</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: T.textMuted }}>Fetching submitted corrective actions</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: FONT_FAMILY }}>
      
      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        
        {/* Header */}
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                onClick={() => navigate('/audit-manager?view=ncr')} 
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
                title="Back to Audit Manager"
              >
                <FiArrowLeft size={18} />
              </button>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: T.purpleLight, border: `1px solid ${T.purpleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiCheckCircle size={24} color={T.accent} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>Corrective Action Verification</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textMuted }}>Form 8 • Review & Close NCRs</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={loadData}
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.color = T.textMuted; }}
                title="Refresh"
              >
                <FiRefreshCw size={18} />
              </button>
            </div>
          </div>
        </Card>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: 16, background: T.errorLight, border: `1px solid ${T.errorBorder}`, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, fontFamily: FONT_FAMILY }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${T.errorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiAlertCircle size={18} color={T.error} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#991B1B' }}>Error</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#991B1B', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>
          <StatCard title="Total Pending" value={verificationQueue.length} icon={FiClock} color="#8B5CF6" bg={T.purpleLight} border={T.purpleBorder} />
          <StatCard title="Ready to Close" value={verificationQueue.filter((ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS').length} icon={FiCheckCircle} color="#3B82F6" bg={T.accentLight} border={T.accentBorder} />
          <StatCard title="NCR2 Pending" value={verificationQueue.filter((ncr) => ncr.status === 'NCR2_IN_PROGRESS').length} icon={FiClock} color="#6D28D9" bg="#F5F3FF" border="#DDD6FE" />
          <StatCard title="Closed NCRs" value={closedItems.length} icon={FiCheckCircle} color="#10B981" bg={T.successLight} border={T.successBorder} />
        </div>

        {/* Verification Queue Section */}
        <SectionCard 
          title="Submitted Corrective Actions" 
          subtitle="Review corrective actions with current status and preview history"
          action={
            verificationQueue.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, background: '#F1F5F9', padding: '4px 12px', borderRadius: 20, border: `1px solid ${T.border}` }}>
                {verificationQueue.filter((ncr) => ncr.status === 'IN_PROGRESS' || ncr.status === 'NCR2_IN_PROGRESS').length} pending
              </span>
            )
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: 16, padding: '12px 24px', background: '#F8FAFC', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>NCR Number</div>
            <div>Submitted On</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Action</div>
          </div>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {verificationQueue.length === 0 ? (
              <EmptyState 
                icon={FiClock}
                title="No corrective action records"
                description="Submitted corrective actions will remain here with their current status."
              />
            ) : (
              verificationQueue.map((ncr) => (
                <VerificationRow 
                  key={ncr.id} 
                  ncr={ncr} 
                  onVerify={openVerifyModal} 
                  onView={(item) => navigate(`/form8-view/${item.id}${item.status === 'NCR2_IN_PROGRESS' ? '?type=ncr2' : ''}`)}
                  onOpenForum={openNCRForum}
                />
              ))
            )}
          </div>
        </SectionCard>

        {/* Closed History Section */}
        <SectionCard 
          title="Closed NCR History" 
          subtitle="Approved corrective actions that have been closed"
          action={
            closedItems.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, background: '#F1F5F9', padding: '4px 12px', borderRadius: 20, border: `1px solid ${T.border}` }}>
                {closedItems.length} closed
              </span>
            )
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: 16, padding: '12px 24px', background: '#F8FAFC', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>NCR Number</div>
            <div>Department</div>
            <div>Closed On</div>
            <div style={{ textAlign: 'right' }}>Action</div>
          </div>
          
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {closedItems.length === 0 ? (
              <EmptyState 
                icon={FiCheckCircle}
                title="No closed NCRs yet"
                description="Verified NCRs will appear here once closed."
              />
            ) : (
              closedItems.map((ncr) => (
                <ClosedRow 
                  key={ncr.id} 
                  ncr={ncr} 
                  onView={(n) => navigate(`/form8-view/${n.id}${n.status === 'NCR2_COMPLETED' ? '?type=ncr2' : ''}`)}
                  onOpenForum={openNCRForum}
                />
              ))
            )}
          </div>
        </SectionCard>
      </main>

      {/* Verify Modal */}
      {showVerifyModal && selectedNCR && (
        <VerifyModal
          ncr={selectedNCR}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedNCR(null);
          }}
          onVerify={handleVerify}
          loading={verifyLoading}
        />
      )}

      {/* Forum Modal */}
      {showForumModal && selectedNCRForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedNCRForForum.id}
          auditNumber={selectedNCRForForum.ncrNumber}
          auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
          auditStatus={selectedNCRForForum.status}
          auditType="NCR Resolution"
          department={selectedNCRForForum.department}
          auditorId={selectedNCRForForum.auditorId}
          auditorName={selectedNCRForForum.auditorName}
          auditeeId={selectedNCRForForum.auditeeId}
          auditeeName={selectedNCRForForum.auditeeName}
          memberEmails={selectedNCRForForum.memberEmails || []}
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedNCRForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}
    </div>
  );
};

export default NCRPendingDashboard;