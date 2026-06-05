// src/components/modals/AuditCheckSheetNCRForumModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  MessageCircle,
  Users,
  AlertCircle,
  Loader,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Flag,
  Plus,
  Lock,
  Unlock,
  Settings,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import ForumThreadView from '../forum/ForumThreadView';
// In AuditCheckSheetNCRForumModal.jsx
import { createForumGroup, createForumPost } from '../forum/Api/forumapi';
import { useToast } from '../ToastContext';
import {
  normalizeRole,
  isMaster,
  isAuditManager,
  isLeadAuditor,
  isAuditor,
  getRoleDisplayName
} from '../utils/roleUtils';
import axios from 'axios';
import { auditScheduleApi } from '../../services/auditScheduleApi';


const API_BASE = 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

// ============================================================
// Helper Functions
// ============================================================

const getNCRForumDetails = async (groupId) => {
  try {
    const response = await auditScheduleApi.getNCRForumDetails(groupId);
    return response;
  } catch (error) {
    console.error('Error fetching forum details:', error);
    return null;
  }
};

const getRolePermissions = (role) => {
  const normalized = normalizeRole(role);
  
  return {
    canModerate: isMaster(normalized) || isAuditManager(normalized) || isLeadAuditor(normalized),
    canAddMembers: isMaster(normalized) || isAuditManager(normalized) || isLeadAuditor(normalized),
    canRemoveMembers: isMaster(normalized) || isAuditManager(normalized),
    canCreateNCR: isAuditor(normalized) || isLeadAuditor(normalized),
    canApproveNCR: isMaster(normalized) || isAuditManager(normalized) || isLeadAuditor(normalized),
    canRejectNCR: isMaster(normalized) || isAuditManager(normalized) || isLeadAuditor(normalized),
  };
};

const getParticipantRolePriority = (role) => {
  const order = {
    'MASTER': 10,
    'AUDIT_MANAGER': 9,
    'LEAD_AUDITOR': 8,
    'TOP_MANAGEMENT': 7,
    'AUDITOR': 6,
    'HOD': 5,
    'AUDITEE': 2
  };
  return order[normalizeRole(role)] || 1;
};

// ============================================================
// Sub-components
// ============================================================

const RoleBadge = ({ role }) => {
  const normalized = normalizeRole(role);
  const config = {
    MASTER: 'bg-purple-100 text-purple-700',
    AUDIT_MANAGER: 'bg-blue-100 text-blue-700',
    LEAD_AUDITOR: 'bg-indigo-100 text-indigo-700',
    AUDITOR: 'bg-cyan-100 text-cyan-700',
    HOD: 'bg-orange-100 text-orange-700',
    AUDITEE: 'bg-green-100 text-green-700',
    TOP_MANAGEMENT: 'bg-amber-100 text-amber-700'
  };
  const colorClass = config[normalized] || 'bg-gray-100 text-gray-600';
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {getRoleDisplayName(role)}
    </span>
  );
};

// const MemberList = ({ members, onAddMember, onRemoveMember, canAdd, canRemove }) => {
//   const [expanded, setExpanded] = useState(false);
//   const displayMembers = expanded ? members : members.slice(0, 5);
  
//   if (members.length === 0) return null;
  
//   return (
//     <div className="border-t border-gray-100 pt-3 mt-3 px-4">
//       <button
//         onClick={() => setExpanded(!expanded)}
//         className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-700"
//       >
//         <div className="flex items-center gap-1">
//           <Users size={12} />
//           <span>Participants ({members.length})</span>
//         </div>
//         {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
//       </button>
      
//       {expanded && (
//         <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
//           {displayMembers.map((member, idx) => (
//             <div key={idx} className="flex items-center justify-between py-1 text-xs">
//               <div className="flex items-center gap-2 min-w-0">
//                 <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
//                   <span className="text-xs font-medium text-gray-600">
//                     {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
//                   </span>
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-gray-700 truncate">{member.name || member.email}</p>
//                   <p className="text-gray-400 text-[10px]">{member.email}</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <RoleBadge role={member.role} />
//                 {canRemove && member.role !== 'MASTER' && (
//                   <button
//                     onClick={() => onRemoveMember(member)}
//                     className="p-1 text-gray-400 hover:text-red-600 rounded"
//                     title="Remove Member"
//                   >
//                     <X size={12} />
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
      
//       {canAdd && (
//         <button
//           onClick={onAddMember}
//           className="mt-2 w-full py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
//         >
//           <UserPlus size={12} />
//           Add Participant
//         </button>
//       )}
//     </div>
//   );
// };

// const AddMemberModal = ({ isOpen, onClose, onAdd, existingMembers, allUsers }) => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedUsers, setSelectedUsers] = useState([]);
//   const [loading, setLoading] = useState(false);
  
//   const availableUsers = allUsers.filter(user => 
//     !existingMembers.some(m => m.email === user.email) &&
//     (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//      user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
//   );
  
//   const handleAdd = async () => {
//     if (selectedUsers.length === 0) return;
//     setLoading(true);
//     try {
//       await onAdd(selectedUsers.map(u => u.email));
//       onClose();
//     } catch (error) {
//       console.error('Error adding members:', error);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   if (!isOpen) return null;
  
//   return (
//     <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
//         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//           <h3 className="font-semibold text-gray-800">Add Participants</h3>
//           <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
//             <X size={20} />
//           </button>
//         </div>
        
//         <div className="p-4">
//           <div className="relative mb-4">
//             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search users..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
          
//           <div className="space-y-1 max-h-64 overflow-y-auto">
//             {availableUsers.length === 0 ? (
//               <p className="text-center text-gray-400 text-sm py-4">No users available to add</p>
//             ) : (
//               availableUsers.map(user => (
//                 <label key={user.id || user.email} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={selectedUsers.some(u => u.email === user.email)}
//                     onChange={(e) => {
//                       if (e.target.checked) {
//                         setSelectedUsers([...selectedUsers, user]);
//                       } else {
//                         setSelectedUsers(selectedUsers.filter(u => u.email !== user.email));
//                       }
//                     }}
//                     className="w-4 h-4 text-blue-600 rounded"
//                   />
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">{user.name || user.email}</p>
//                     <p className="text-xs text-gray-400">{user.email}</p>
//                   </div>
//                   {user.role && <RoleBadge role={user.role} />}
//                 </label>
//               ))
//             )}
//           </div>
//         </div>
        
//         <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
//           <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
//             Cancel
//           </button>
//           <button
//             onClick={handleAdd}
//             disabled={selectedUsers.length === 0 || loading}
//             className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
//           >
//             {loading && <Loader size={14} className="animate-spin" />}
//             Add ({selectedUsers.length})
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// ============================================================
// Main Component
// ============================================================

const AuditCheckSheetNCRForumModal = ({
  auditId,
  auditNumber,
  auditTitle,
  auditStatus,
  auditType,
  department,
  auditorId,
  auditorName,
  auditeeId,
  auditeeName,
  hodEmail,
  hodName,
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  memberEmails = [],  // ✅ ADD THIS LINE
  onNCRCreated,
  onNCRUpdated
}) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forumReady, setForumReady] = useState(false);
  const [forumGroupId, setForumGroupId] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);
  const [error, setError] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  const [forumSettings, setForumSettings] = useState({
    notificationsEnabled: true,
    isLocked: false
  });
  
  const user = currentUser || (() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        return {
          email: u.email || u.username,
          name: u.name || u.username,
          id: u.id,
          role: u.role
        };
      }
    } catch (error) {
      console.warn('Error parsing stored user:', error);
    }
    return { email: 'user@example.com', name: 'Unknown', id: null, role: 'AUDITEE' };
  })();
  
  const userRole = user.role;
  const permissions = getRolePermissions(userRole);
  
  // Get participants list
  const getParticipantsList = useCallback(() => {
    const participants = [];
    const addedEmails = new Set();
    
    const addParticipant = (userId, email, name, role) => {
      if (!email || addedEmails.has(email)) return;
      addedEmails.add(email);
      participants.push({
        id: userId,
        email: email,
        name: name || email.split('@')[0],
        role: role || 'Participant'
      });
    };
    
    // Add HOD
    if (hodEmail) {
      const hod = allUsers.find(u => u.email === hodEmail);
      addParticipant(hod?.id, hodEmail, hod?.name || hodName, 'HOD');
    }
    
    // Add Auditor
    if (auditorId) {
      const auditor = allUsers.find(u => u.id === auditorId);
      if (auditor?.email) {
        addParticipant(auditor.id, auditor.email, auditor.name, 'AUDITOR');
      } else if (auditorName) {
        addParticipant(auditorId, auditorName.includes('@') ? auditorName : null, auditorName, 'AUDITOR');
      }
    }
    
    // Add Auditee
    if (auditeeId) {
      const auditee = allUsers.find(u => u.id === auditeeId);
      if (auditee?.email) {
        addParticipant(auditee.id, auditee.email, auditee.name, 'AUDITEE');
      } else if (auditeeName) {
        addParticipant(auditeeId, auditeeName.includes('@') ? auditeeName : null, auditeeName, 'AUDITEE');
      }
    }
    
    // Add current user if not already added
    if (user?.email && !addedEmails.has(user.email)) {
      addParticipant(user.id, user.email, user.name, user.role);
    }
    
    return participants.sort((a, b) => 
      getParticipantRolePriority(b.role) - getParticipantRolePriority(a.role)
    );
  }, [auditorId, auditorName, auditeeId, auditeeName, hodEmail, hodName, allUsers, user]);
  
  // Get participant emails for forum creation
const getParticipantEmails = useCallback(() => {
  const emails = new Set();
  
  console.log('📧 [FORUM] === START getParticipantEmails ===');
  console.log('📧 [FORUM] Input data:', {
    auditorId,
    auditorName,
    auditeeId,
    auditeeName,
    hodEmail,
    userEmail: user?.email,
    allUsersCount: allUsers.length,
    allUsers: allUsers.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }))
  });
  
  // Add current user (regardless of role)
  if (user?.email) {
    emails.add(user.email);
    console.log('✅ Added current user:', user.email);
  }
  
  // ✅ Add AUDITOR - try multiple lookup methods
  if (auditorId) {
    // Try numeric comparison
    let auditorUser = allUsers.find(u => Number(u.id) === Number(auditorId));
    
    // Try string comparison
    if (!auditorUser) {
      auditorUser = allUsers.find(u => String(u.id) === String(auditorId));
    }
    
    // Try by userId field
    if (!auditorUser) {
      auditorUser = allUsers.find(u => Number(u.userId) === Number(auditorId));
    }
    
    if (auditorUser?.email) {
      emails.add(auditorUser.email);
      console.log('✅ Added Auditor by ID:', auditorUser.email, 'Role:', auditorUser.role);
    } else {
      console.log('⚠️ Auditor not found for ID:', auditorId, 'Type:', typeof auditorId);
    }
  }
  
  // If auditor not found by ID, try by name
  if (auditorName && auditorName !== 'undefined' && !emails.has(auditorName)) {
    const auditorByName = allUsers.find(u => 
      u.name?.toLowerCase().includes(auditorName.toLowerCase()) ||
      u.email?.toLowerCase().includes(auditorName.toLowerCase())
    );
    if (auditorByName?.email) {
      emails.add(auditorByName.email);
      console.log('✅ Added Auditor by name:', auditorByName.email);
    } else if (auditorName.includes('@')) {
      emails.add(auditorName);
      console.log('✅ Added Auditor email from string:', auditorName);
    }
  }
  
  // ✅ Add AUDITEE - try multiple lookup methods
  if (auditeeId) {
    // Try numeric comparison
    let auditeeUser = allUsers.find(u => Number(u.id) === Number(auditeeId));
    
    // Try string comparison
    if (!auditeeUser) {
      auditeeUser = allUsers.find(u => String(u.id) === String(auditeeId));
    }
    
    // Try by userId field
    if (!auditeeUser) {
      auditeeUser = allUsers.find(u => Number(u.userId) === Number(auditeeId));
    }
    
    if (auditeeUser?.email) {
      emails.add(auditeeUser.email);
      console.log('✅ Added Auditee by ID:', auditeeUser.email, 'Role:', auditeeUser.role);
    } else {
      console.log('⚠️ Auditee not found for ID:', auditeeId, 'Type:', typeof auditeeId);
    }
  }
  
  // If auditee not found by ID, try by name
  if (auditeeName && auditeeName !== 'undefined' && !emails.has(auditeeName)) {
    const auditeeByName = allUsers.find(u => 
      u.name?.toLowerCase().includes(auditeeName.toLowerCase()) ||
      u.email?.toLowerCase().includes(auditeeName.toLowerCase())
    );
    if (auditeeByName?.email) {
      emails.add(auditeeByName.email);
      console.log('✅ Added Auditee by name:', auditeeByName.email);
    } else if (auditeeName.includes('@')) {
      emails.add(auditeeName);
      console.log('✅ Added Auditee email from string:', auditeeName);
    }
  }
  
  // Add HOD if available
  if (hodEmail && hodEmail !== 'undefined' && hodEmail !== 'null') {
    emails.add(hodEmail);
    console.log('✅ Added HOD email:', hodEmail);
  }
  
  // Add any additional memberEmails passed from parent
  if (memberEmails && Array.isArray(memberEmails)) {
    memberEmails.forEach(email => {
      if (email && email !== 'undefined' && email !== 'null') {
        emails.add(email);
        console.log('✅ Added from memberEmails:', email);
      }
    });
  }
  
  const result = Array.from(emails);
  console.log('📧 [FORUM] Final participant emails:', result);
  return result;
}, [auditorId, auditorName, auditeeId, auditeeName, hodEmail, hodName, allUsers, user, memberEmails]);

const initializeAuditForum = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    const participants = getParticipantsList();
    setParticipantsList(participants);
    
    // ✅ Use string ID format that works (like "AUDIT-demo" or just "demo")
    const groupId = `AUDIT-${auditId}`;  // This creates "AUDIT-3", "AUDIT-999", etc.
    // OR simply: const groupId = String(auditId) + "-forum";
    
    console.log('🔑 Forum Group ID:', groupId);
    setForumGroupId(groupId);
    
    const participantEmails = getParticipantEmails();
    
    // Try to create the group if it doesn't exist
    try {
      await axios.post(`${API_BASE}/forum/8d/groups`, {
        groupId: groupId,
        groupName: `Audit #${auditNumber} Discussion`,
        description: `Discussion forum for Audit ${auditNumber}`,
        createdBy: user?.email,
        members: participantEmails
      }, { withCredentials: true });
      console.log('✅ 8D group created');
    } catch (groupError) {
      console.log('Group may already exist:', groupError.message);
    }
    
    setForumMembers(participantEmails);
    setForumReady(true);
    
  } catch (error) {
    console.error('Error initializing audit forum:', error);
    setError(error.message);
    setForumReady(true);
  } finally {
    setLoading(false);
  }
}, [auditId, auditNumber, getParticipantsList, getParticipantEmails, user]);
  // Handle adding members
  const handleAddMembers = async (newMemberEmails) => {
    setForumMembers(prev => [...new Set([...prev, ...newMemberEmails])]);
    
    // Refresh participants list
    const updatedParticipants = getParticipantsList();
    setParticipantsList(updatedParticipants);
    
    addToast(`${newMemberEmails.length} participant(s) added`, 'success');
    setShowAddMembers(false);
  };
  
  // Handle removing member
  const handleRemoveMember = async (member) => {
    if (!permissions.canRemoveMembers) return;
    
    if (!window.confirm(`Remove ${member.name || member.email} from the forum?`)) return;
    
    setForumMembers(prev => prev.filter(m => m !== member.email));
    setParticipantsList(prev => prev.filter(p => p.email !== member.email));
    addToast(`${member.name || member.email} removed`, 'info');
  };
  
  // Toggle forum lock
  const toggleForumLock = () => {
    setForumSettings(prev => ({ ...prev, isLocked: !prev.isLocked }));
    addToast(forumSettings.isLocked ? 'Forum unlocked' : 'Forum locked', 'info');
  };


  // Add this debug function right after the component starts
useEffect(() => {
  if (isOpen) {
    console.log('🔍 [MODAL DEBUG] Forum Modal Opened:', {
      auditId,
      auditNumber,
      auditorId,
      auditorName,
      auditeeId,
      auditeeName,
      hodEmail,
      hodName,
      memberEmails,
      userEmail: user?.email,
      allUsersCount: allUsers.length
    });
  }
}, [isOpen]);
  
  // Initialize on mount
  useEffect(() => {
    if (isOpen && auditId) {
      initializeAuditForum();
    }
  }, [isOpen, auditId]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <motion.div 
        className="fixed inset-0 z-[98] bg-black/50" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Drawer - Right Side */}
      <motion.div
        className="fixed top-0 right-0 h-full z-[99] bg-white shadow-2xl w-[90vw] md:w-[60vw] lg:w-[50vw] flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {/* <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-gray-900 truncate">Audit Discussion</h2>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] font-mono text-gray-500">{auditNumber}</p>
                {auditStatus && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    auditStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    auditStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    auditStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {auditStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
        
            {permissions.canAddMembers && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Add Participants"
              >
                <UserPlus size={16} />
              </button>
            )}
            
            
            {permissions.canModerate && (
              <>
                <button
                  onClick={toggleForumLock}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  title={forumSettings.isLocked ? "Unlock Forum" : "Lock Forum"}
                >
                  {forumSettings.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                <button
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  title="Forum Settings"
                >
                  <Settings size={16} />
                </button>
              </>
            )}
            
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div> */}
        
        {/* Participants List */}
        {/* <MemberList
          members={participantsList}
          onAddMember={() => setShowAddMembers(true)}
          onRemoveMember={handleRemoveMember}
          canAdd={permissions.canAddMembers}
          canRemove={permissions.canRemoveMembers}
        /> */}
        
        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader size="32" className="animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading discussions...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-xs">
              <AlertCircle size="32" className="mx-auto text-red-500 mb-3" />
              <p className="text-sm text-gray-800 font-medium mb-1">Failed to load forum</p>
              <p className="text-xs text-gray-500 mb-3">{error}</p>
              <button
                onClick={initializeAuditForum}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* Forum Content */}
        {!loading && !error && forumReady && forumGroupId && (
          <div className="flex-1 overflow-hidden">
            <ForumThreadView
              groupId={forumGroupId}
              groupName={`${auditNumber} - ${auditTitle || 'Discussion'}`}
              isInDrawer={true}
              setForumDrawerOpen={onClose}
              username={user?.email}
              groupDescription={`Discussion forum for Audit ${auditNumber}\n\nAudit Type: ${auditType || 'Internal Audit'}\nDepartment: ${department || 'General'}`}
              currentUser={user}
              allUsers={allUsers}
              onBack={onClose}
              memberEmails={forumMembers}
            />
          </div>
        )}
      </motion.div>
      
      {/* Add Member Modal */}
      {/* <AddMemberModal
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        onAdd={handleAddMembers}
        existingMembers={participantsList}
        allUsers={allUsers}
      /> */}
    </>
  );
};

export default AuditCheckSheetNCRForumModal;