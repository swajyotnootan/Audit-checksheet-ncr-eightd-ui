// src/components/AuditForumModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Send,
  MessageCircle,
  Users,
  Clock,
  FileText,
  AlertCircle,
  Loader,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Mail,
  MapPin
} from 'lucide-react';
import ForumThreadView from '../components/forum/ForumThreadView';
import {
  createOrGetNCRForum,
  addNCRForumMembers
} from '../components/forum/Api/forumapi';

const AuditForumModal = ({ 
  auditId, 
  auditNumber, 
  auditTitle,
  auditStatus,
  auditLocation,
  isOpen, 
  onClose, 
  currentUser, 
  allUsers = [],
  auditorId,
  auditorName,
  auditeeIds = [],
  auditeeNames = [],
  hodEmail,
  hodName,
  scheduleInfo,
  memberEmails = [],  // ✅ ADD THIS
}) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [forumReady, setForumReady] = useState(false);
  const [forumGroupId, setForumGroupId] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);
  const [error, setError] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);

  const getUser = () => {
    if (currentUser?.email) return currentUser;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return {
          email: user.email || user.username,
          name: user.name || user.username,
          id: user.id,
          role: user.role
        };
      }
    } catch (error) {
      console.warn('Error parsing stored user:', error);
    }
    return { email: 'user@example.com', name: 'Unknown', id: null, role: 'USER' };
  };

  const user = getUser();

  // Get all participants with their details
  const getParticipantsList = () => {
    const participants = [];
    const addedEmails = new Set();

    // Helper to add participant
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
        addParticipant(auditor.id, auditor.email, auditor.name, 'Auditor');
      } else if (auditorName) {
        addParticipant(auditorId, auditorName.includes('@') ? auditorName : null, auditorName, 'Auditor');
      }
    }

    // Add Auditees
    if (auditeeIds && auditeeIds.length > 0) {
      auditeeIds.forEach(id => {
        const auditee = allUsers.find(u => u.id === id);
        if (auditee?.email) {
          addParticipant(auditee.id, auditee.email, auditee.name, 'Auditee');
        }
      });
    }

    // Add current user if not already added
    if (user?.email && !addedEmails.has(user.email)) {
      addParticipant(user.id, user.email, user.name, user.role || 'Current User');
    }

    return participants;
  };

  // Get participant emails for forum creation
  const getParticipantEmails = () => {
    const emails = new Set();
    
    // Add HOD
    if (hodEmail) emails.add(hodEmail);
    
    // Add Auditor
    if (auditorId) {
      const auditor = allUsers.find(u => u.id === auditorId);
      if (auditor?.email) emails.add(auditor.email);
    }
    
    // Add Auditees
    if (auditeeIds && auditeeIds.length > 0) {
      auditeeIds.forEach(id => {
        const auditee = allUsers.find(u => u.id === id);
        if (auditee?.email) emails.add(auditee.email);
      });
    }
    
    // Add current user
    if (user?.email) emails.add(user.email);
    
    return Array.from(emails);
  };

  useEffect(() => {
    if (isOpen && auditId) {
      initializeAuditForum();
    }
  }, [isOpen, auditId]);

  const initializeAuditForum = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build participants list
      const participants = getParticipantsList();
      setParticipantsList(participants);
      
      // Create group ID in AUDIT- format
      const groupId = `AUDIT-${auditId}`;
      setForumGroupId(groupId);

      const participantEmails = getParticipantEmails();
      console.log('Initializing forum for audit:', auditId);
      console.log('Audit Number:', auditNumber);
      console.log('Participants found:', participants);
      console.log('Participant emails:', participantEmails);

      if (user?.email && user.email !== 'user@example.com' && participantEmails.length > 0) {
        try {
          const forumResponse = await createOrGetNCRForum(auditId, {
            groupName: `Audit #${auditNumber} Discussion`,
            description: `Discussion forum for Audit ${auditNumber}\n\nAudit Title: ${auditTitle || 'Quality Audit'}\nStatus: ${auditStatus || 'In Progress'}\nLocation: ${auditLocation || 'Not specified'}\n\nParticipants:\n${participants.map(p => `- ${p.name} (${p.role})`).join('\n')}`,
            createdBy: user.email,
            members: participantEmails
          });

          console.log('Forum API response:', forumResponse);

          if (forumResponse && forumResponse.members) {
            setForumMembers(forumResponse.members);
          }
        } catch (apiError) {
          console.warn('Forum API call failed:', apiError.message);
          setForumMembers(participantEmails);
        }
      } else {
        setForumMembers(participantEmails);
      }

      setForumReady(true);
    } catch (error) {
      console.error('Error initializing audit forum:', error);
      setError(error.message);
      setForumReady(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async (newMemberEmails) => {
    try {
      await addNCRForumMembers(forumGroupId, newMemberEmails);
      setForumMembers(prev => [...new Set([...prev, ...newMemberEmails])]);
      setShowAddMembers(false);
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

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
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Discussion</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-mono text-gray-500">{auditNumber}</p>
                {auditStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
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
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading forum discussions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <p className="text-gray-800 font-semibold mb-2">Failed to load forum</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setForumReady(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        )}

        {/* Forum Content */}
        {!loading && !error && forumReady && forumGroupId && (
          <div className="flex-1 overflow-hidden">
            <ForumThreadView
              groupId={forumGroupId}
              groupName={`Audit #${auditNumber} Discussion`}
              isInDrawer={true}
              setForumDrawerOpen={onClose}
              username={currentUser?.email || user.email}
              groupDescription={`Discussion forum for Audit ${auditNumber}\n\nParticipants: ${participantsList.map(p => p.name).join(', ')}`}
              currentUser={currentUser || user}
              allUsers={allUsers}
              onBack={onClose}
              memberEmails={memberEmails.length > 0 ? memberEmails : forumMembers}  
            />
          </div>
        )}
      </motion.div>
    </>
  );
};

export default AuditForumModal;