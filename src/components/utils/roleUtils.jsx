// src/components/utils/roleUtils.js

// ========== Core audit roles from backend ==========
export const normalizeRole = (role) => {
  if (!role) return null;
  const upperRole = role.toUpperCase();
  
  switch (upperRole) {
    // Master role
    case 'MASTER':
      return 'MASTER';
    
    // Audit Management Roles
    case 'AUDIT_MANAGER':
      return 'AUDIT_MANAGER';
    case 'LEAD_AUDITOR':
      return 'LEAD_AUDITOR';
    
    // Audit Execution Roles
    case 'AUDITOR':
      return 'AUDITOR';

      case 'INITIATOR':
  return 'INITIATOR';
    
    // Audit Recipient Roles
    case 'HOD':
      return 'HOD';
    case 'AUDITEE':
      return 'AUDITEE';
    
    // Supporting Roles
    case 'HR_ADMIN':
      return 'HR_ADMIN';
    case 'QMS_ADMIN':
      return 'QMS_ADMIN';
    case 'TOP_MANAGEMENT':
      return 'TOP_MANAGEMENT';
    
    // Legacy mapping for backward compatibility
    case 'ADMIN':
    case 'SUPERADMIN':
      return 'MASTER';
    
    default:
      return upperRole;
  }
};

export const getRoleDisplayName = (role) => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'MASTER': return 'Master';
    case 'AUDIT_MANAGER': return 'Audit Manager';
    case 'LEAD_AUDITOR': return 'Lead Auditor';
    case 'AUDITOR': return 'Auditor';
    case 'INITIATOR': return 'Initiator';
    case 'HOD': return 'HOD';
    case 'AUDITEE': return 'Auditee';
    case 'HR_ADMIN': return 'HR Admin';
    case 'QMS_ADMIN': return 'QMS Admin';
    case 'TOP_MANAGEMENT': return 'Top Management';
    default: return role || 'User';
  }
};

// Role checkers
export const isMaster = (role) => normalizeRole(role) === 'MASTER';
export const isAuditManager = (role) => normalizeRole(role) === 'AUDIT_MANAGER';
export const isLeadAuditor = (role) => normalizeRole(role) === 'LEAD_AUDITOR';
export const isAuditor = (role) => normalizeRole(role) === 'AUDITOR';
export const isInitiator = (role) => normalizeRole(role) === 'INITIATOR';
export const isHOD = (role) => normalizeRole(role) === 'HOD';
export const isAuditee = (role) => normalizeRole(role) === 'AUDITEE';
export const isHRAdmin = (role) => normalizeRole(role) === 'HR_ADMIN';
export const isQMSAdmin = (role) => normalizeRole(role) === 'QMS_ADMIN';
export const isTopManagement = (role) => normalizeRole(role) === 'TOP_MANAGEMENT';

// Combined checkers
export const isAuditTeam = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'AUDIT_MANAGER' || normalized === 'LEAD_AUDITOR' || normalized === 'AUDITOR';
};

export const isAuditeeRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'HOD' || normalized === 'AUDITEE';
};

export const canRaiseNCR = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'AUDITOR' || normalized === 'LEAD_AUDITOR';
};

export const canCloseNCR = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'LEAD_AUDITOR' || normalized === 'AUDIT_MANAGER';
};

export const canApprovePlan = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'AUDIT_MANAGER' || normalized === 'TOP_MANAGEMENT' || normalized === 'MASTER';
};

// Dashboard path mapping
// Dashboard path mapping
export const getDashboardPath = (user) => {
  if (!user) return '/';
  const role = typeof user === 'string' ? user : user.role;
  const normalized = normalizeRole(role);
  
  switch (normalized) {
    case 'MASTER': return '/master';
    case 'AUDIT_MANAGER': return '/audit-manager';
    case 'LEAD_AUDITOR': return '/lead-auditor';
    case 'AUDITOR': return '/auditor';
        case 'INITIATOR': return '/initiator';  // ← ADD THIS LINE
    case 'HOD': return '/hod';
    case 'AUDITEE': return '/auditee';
    case 'HR_ADMIN': return '/hr-admin';
    case 'QMS_ADMIN': return '/qms-admin';
    case 'TOP_MANAGEMENT': return '/top-management';
    default: return '/master';
  }
};

// Role list for dropdowns
export const ALL_ROLES = [
  'MASTER',
  'AUDIT_MANAGER',
  'LEAD_AUDITOR',
  'AUDITOR',
  'INITIATOR',
  'HOD',
  'AUDITEE',
  'HR_ADMIN',
  'QMS_ADMIN',
  'TOP_MANAGEMENT'
];

// Login role options (for role selection during login)
export const LOGIN_ROLE_OPTIONS = [
  { value: 'master', label: 'Master', role: 'MASTER' },
  { value: 'audit_manager', label: 'Audit Manager', role: 'AUDIT_MANAGER' },
  { value: 'lead_auditor', label: 'Lead Auditor', role: 'LEAD_AUDITOR' },
  { value: 'auditor', label: 'Auditor', role: 'AUDITOR' },
  { value: 'initiator', label: 'Initiator', role: 'INITIATOR' },
  { value: 'hod', label: 'HOD', role: 'HOD' },
  { value: 'auditee', label: 'Auditee', role: 'AUDITEE' },
  { value: 'hr_admin', label: 'HR Admin', role: 'HR_ADMIN' },
  { value: 'top_management', label: 'Top Management', role: 'TOP_MANAGEMENT' }
];

// Permission hierarchy (higher number = more power)
const hierarchy = {
  'MASTER': 100,
  'TOP_MANAGEMENT': 90,
  'AUDIT_MANAGER': 85,
  'LEAD_AUDITOR': 75,
  'QMS_ADMIN': 70,
  'HR_ADMIN': 60,
  'AUDITOR': 50,
  'HOD': 40,
    'INITIATOR': 35,  // Between HOD(40) and AUDITEE(30)
  'AUDITEE': 30,
};

export const hasPermission = (userRole, requiredRole) => {
  const userLevel = hierarchy[normalizeRole(userRole)] || 0;
  const requiredLevel = hierarchy[normalizeRole(requiredRole)] || 0;
  return userLevel >= requiredLevel;
};

// Legacy exports (keep for compatibility with old components)
export const getAccessibleFormTypes = () => ['quality', 'coating', 'clearance', 'printing', 'maintenance', 'inventory', 'safety', 'training', 'moc'];
export const getOperatorLine = () => null;
export const isUserAssignedToLine = () => false;
export const isOperator = () => false;
export const isQA = () => false;
export const isAVP = () => false;
export const isManager = (role) => isMaster(role);
export const isAdmin = (role) => isMaster(role);
export const isUser = () => false;
export const isPlantHOD = (role) => isHOD(role);
export const isHeadOperations = () => false;
export const isHeadMechMaintenance = () => false;
export const isSiteSupervisor = () => false;
export const isOperatorPOE = () => false;
export const isOperatorEPE = () => false;
export const isOperatorBE = () => false;
