// src/form/view/SafetyAuditView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/context/AuthContext';
import { auditScheduleApi } from '../../services/auditScheduleApi';
import { userAPI } from '../../components/services/api';
import { useToast } from '../../components/ToastContext';
import { 
  ArrowLeft, CheckCircle, AlertCircle, User, Calendar, 
  Shield, Printer, ThumbsUp, ThumbsDown, AlertTriangle,
  DoorOpen, Hand, Wrench, Zap, Truck, Package, HardHat, Users,
  Building, MapPin, Clock, FileText, Award
} from 'lucide-react';
import axios from 'axios';

const statusClasses = {
  DRAFT: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-emerald-100 text-emerald-800"
};

// Icon mapping for safety checkpoints
const getIconForCheckpoint = (checkpoint) => {
  if (checkpoint?.toLowerCase().includes('door')) return DoorOpen;
  if (checkpoint?.toLowerCase().includes('hand')) return Hand;
  if (checkpoint?.toLowerCase().includes('spring')) return Wrench;
  if (checkpoint?.toLowerCase().includes('jacket')) return Zap;
  if (checkpoint?.toLowerCase().includes('guard')) return Shield;
  if (checkpoint?.toLowerCase().includes('emergency')) return AlertTriangle;
  if (checkpoint?.toLowerCase().includes('material')) return Truck;
  if (checkpoint?.toLowerCase().includes('trolley')) return Package;
  if (checkpoint?.toLowerCase().includes('tool')) return HardHat;
  return Shield;
};

export default function SafetyAuditView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [auditorName, setAuditorName] = useState('');
  const [auditeeName, setAuditeeName] = useState('');
  const [safetyCheckSheetIds, setSafetyCheckSheetIds] = useState([]);

  useEffect(() => {
    if (id) fetchAuditDetails();
  }, [id]);

  // Fetch all Safety check sheet IDs dynamically
  const fetchSafetyCheckSheetIds = async () => {
    try {
      const response = await axios.get('https://internalaudit.hub.swajyot.co.in:8090/api/templates/type/DAILY_SAFETY', {
        withCredentials: true
      });
      
      const safetySheets = response.data || [];
      const ids = safetySheets.map(sheet => sheet.id);
      console.log('✅ Safety Check Sheet IDs:', ids);
      setSafetyCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error('❌ Error fetching Safety check sheets:', error);
      return [];
    }
  };

  const fetchAuditDetails = async () => {
    setLoading(true);
    try {
      // First, get Safety check sheet IDs
      const safetyIds = await fetchSafetyCheckSheetIds();
      
      // Get the audit response
      const response = await auditScheduleApi.getAuditResponse(parseInt(id));
      const auditData = response.data;
      setAudit(auditData);
      
      // Parse answers
      let parsedAnswers = {};
      try {
        parsedAnswers = typeof auditData.answers === 'string' ? JSON.parse(auditData.answers) : (auditData.answers || {});
      } catch (e) { 
        parsedAnswers = {}; 
      }
      setAnswers(parsedAnswers);
      
      // Get check sheet ID from audit
      const checkSheetId = auditData.checkSheet?.id || auditData.checkSheetId;
      console.log('Check Sheet ID from audit:', checkSheetId);
      
      // Verify it's a Safety check sheet and fetch questions
      if (checkSheetId && safetyIds.includes(checkSheetId)) {
        try {
          const checkSheetRes = await axios.get(`https://internalaudit.hub.swajyot.co.in:8090
/api/templates/${checkSheetId}`);
          const sheet = checkSheetRes.data;
          console.log('Check Sheet Name:', sheet.name);
          
          if (sheet.questions) {
            let parsedQuestions = [];
            try {
              parsedQuestions = typeof sheet.questions === 'string' 
                ? JSON.parse(sheet.questions) 
                : sheet.questions;
              
              console.log('Raw Safety questions count:', parsedQuestions.length);
              
              // Format questions for display
              const formattedQuestions = parsedQuestions.map((q, idx) => ({
                slNo: q.sNo || q.slNo || (idx + 1),
                checkpoint: q.displayLabel,
                method: q.method || 'Visual',
                frequency: q.frequency || 'Daily',
                whatToLookFor: q.documentsVerified || q.whatToLookFor || '',
                fieldKey: q.fieldKey
              }));
              
              console.log('Formatted Safety questions:', formattedQuestions);
              setQuestions(formattedQuestions);
            } catch (e) {
              console.error('Error parsing questions:', e);
              setQuestions([]);
            }
          }
        } catch (error) {
          console.error('Error fetching check sheet:', error);
        }
      }
      
      // Get auditor name
      if (auditData.auditorId) {
        try {
          const auditor = await userAPI.getUserById(auditData.auditorId);
          setAuditorName(auditor?.name || `${auditor?.firstName} ${auditor?.lastName}`);
        } catch (e) {
          setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
        }
      } else {
        setAuditorName(auditData.auditorName || parsedAnswers.auditorName || 'Unknown');
      }
      setAuditeeName(auditData.auditeeName || parsedAnswers.auditeeName || 'Not specified');
      
    } catch (error) {
      console.error('Error fetching audit:', error);
      addToast('Failed to load audit details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-lime-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-lime-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getRatingText = (score) => {
    if (score >= 90) return 'Excellent Safety Standards!';
    if (score >= 75) return 'Good - Minor Improvements Needed';
    if (score >= 60) return 'Satisfactory - Several Improvements Needed';
    return 'Critical - Immediate Action Required';
  };

  const compliance = answers.compliance || {};
  const observations = answers.observations || {};
  const remarks = answers.remarks || {};
  
  const totalQuestions = questions.length;
  const compliantCount = Object.values(compliance).filter(c => c === 'YES').length;
  const nonCompliantCount = Object.values(compliance).filter(c => c === 'NO').length;
  const percentage = totalQuestions > 0 ? Math.round((compliantCount / totalQuestions) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-500">Loading Safety Audit details...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-500">Audit not found</p>
          <button onClick={() => navigate('/auditor/safety')} className="px-4 py-2 mt-4 text-white bg-red-600 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl px-4 py-6 mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/auditor/safety')} className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
            <ArrowLeft size={18} /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
            <Printer size={16} /> Print
          </button>
        </div>

        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-2xl bg-red-50">
            <Shield size={48} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Safety Audit Report</h1>
          <p className="mt-2 text-sm text-gray-500">Daily Workplace Safety Audit</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[audit.status] || 'bg-gray-100 text-gray-800'}`}>
              {audit.status || "DRAFT"}
            </span>
            <span className="text-xs text-gray-400">Audit ID: {audit.id}</span>
          </div>
        </div>

        {/* Audit Information */}
        <div className="p-6 mb-6 bg-white rounded-lg shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Document Number</p>
                <p className="font-medium">{answers.documentNumber || `SAFETY-${audit.id}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium">{answers.location || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium">{answers.department || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Shift</p>
                <p className="font-medium">{audit.shift || answers.shift || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Audit Date</p>
                <p className="font-medium">{answers.date || formatDate(audit.auditDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Auditor</p>
                <p className="font-medium">{auditorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Auditee</p>
                <p className="font-medium">{auditeeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Safety Score</p>
                <p className={`font-bold ${getScoreColor(percentage)}`}>{percentage}% ({compliantCount}/{totalQuestions})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Score Summary */}
        <div className="p-6 mb-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Safety Score Summary</h2>
            </div>
            <div className={`px-4 py-2 rounded-lg ${getScoreBgColor(percentage)}`}>
              <p className={`text-sm font-semibold ${getScoreColor(percentage)}`}>
                {percentage >= 90 ? 'Excellent' : percentage >= 75 ? 'Good' : percentage >= 60 ? 'Needs Improvement' : 'Critical'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
            <div className="p-3 text-center rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Total Checks</p>
              <p className="text-2xl font-bold text-gray-800">{totalQuestions}</p>
            </div>
            <div className="p-3 text-center rounded-lg bg-green-50">
              <p className="text-xs text-gray-500">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{compliantCount}</p>
            </div>
            <div className="p-3 text-center rounded-lg bg-red-50">
              <p className="text-xs text-gray-500">Non-Compliant</p>
              <p className="text-2xl font-bold text-red-600">{nonCompliantCount}</p>
            </div>
            <div className="p-3 text-center rounded-lg bg-blue-50">
              <p className="text-xs text-gray-500">Safety Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</p>
            </div>
          </div>
        </div>

        {/* Safety Rating Message */}
        <div className={`p-4 mb-6 rounded-lg ${getScoreBgColor(percentage)} border border-${percentage >= 90 ? 'green' : percentage >= 75 ? 'lime' : percentage >= 60 ? 'yellow' : 'red'}-300`}>
          <div className="flex items-center gap-2">
            {percentage >= 90 && <Shield size={20} className="text-green-600" />}
            {percentage >= 75 && percentage < 90 && <ThumbsUp size={20} className="text-lime-600" />}
            {percentage >= 60 && percentage < 75 && <AlertCircle size={20} className="text-yellow-600" />}
            {percentage < 60 && <AlertTriangle size={20} className="text-red-600" />}
            <span className={`font-semibold ${getScoreColor(percentage)}`}>
              {getRatingText(percentage)}
            </span>
          </div>
        </div>

        {/* Non-Compliant Items Summary */}
        {nonCompliantCount > 0 && (
          <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
            <h3 className="mb-2 text-sm font-semibold text-red-800">Non-Compliant Items ({nonCompliantCount})</h3>
            <div className="space-y-2">
              {questions.filter(q => compliance[q.slNo] === 'NO').map(q => (
                <div key={q.slNo} className="text-sm">
                  <span className="font-medium">{q.slNo}. {q.checkpoint}</span>
                  <p className="mt-1 ml-4 text-xs text-red-600">{remarks[q.slNo] || 'No remark provided'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions Table - With Frequency Column, No Status Column */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b bg-red-50">
            <h2 className="text-lg font-semibold text-red-800">Safety Checkpoints</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-16 px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">S.No</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Safety Checkpoint</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Method</th>
                    <th className="w-32 px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Frequency</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Observation</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Remark/Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {questions.length > 0 ? questions.map((q) => {
                    const isCompliant = compliance[q.slNo] === 'YES';
                    const isNonCompliant = compliance[q.slNo] === 'NO';
                    const observation = observations[q.slNo];
                    const remark = remarks[q.slNo];
                    const Icon = getIconForCheckpoint(q.checkpoint);
                    
                    // Get status icon for S.No column
                    let statusIcon = null;
                    if (isCompliant) {
                      statusIcon = <CheckCircle size={14} className="text-green-600" />;
                    } else if (isNonCompliant) {
                      statusIcon = <AlertCircle size={14} className="text-red-600" />;
                    }
                    
                    // Row background based on status
                    let rowBgClass = '';
                    if (isCompliant) rowBgClass = 'hover:bg-green-50';
                    else if (isNonCompliant) rowBgClass = 'hover:bg-red-50';
                    else rowBgClass = 'hover:bg-gray-50';
                    
                    return (
                      <tr key={q.slNo} className={rowBgClass}>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          <div className="flex items-center justify-center gap-1">
                            {statusIcon}
                            <span>{q.slNo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-red-500" />
                            <span className="text-sm text-gray-800">{q.checkpoint}</span>
                          </div>
                         </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{q.method}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {q.frequency}
                          </span>
                         </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{observation || '-'} </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{remark || '-'} </td>
                       </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={32} className="text-gray-300" />
                          <p>No safety questions loaded for this audit</p>
                        </div>
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="p-6 mt-6 bg-white rounded-lg shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Signatures</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Auditor Signature</p>
              <p className="mt-2 font-medium">{answers.auditorSignature || audit.auditorName || 'Not signed'}</p>
              {audit.createdAt && <p className="mt-1 text-xs text-gray-400">Signed on: {formatDateTime(audit.createdAt)}</p>}
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Auditee Signature</p>
              <p className="mt-2 font-medium">{answers.auditeeSignature || 'Not signed'}</p>
              {audit.submittedAt && <p className="mt-1 text-xs text-gray-400">Acknowledged on: {formatDateTime(audit.submittedAt)}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 mt-8 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p className="mt-1 text-xs text-gray-400">Daily Workplace Safety Audit | Keep Safety First</p>
        </div>
      </div>
    </div>
  );
}