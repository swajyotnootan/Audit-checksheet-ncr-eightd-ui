import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  RefreshCw,
  AlertCircle,
  Activity,
  User,
  VideoIcon,
  Phone,
  ArrowLeft,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Signal,
  Circle,
  Users,
  Volume2,
  Mic,
  MessageCircle,
  MoreVertical,
  Clock,
  Pin,
  Mail,
  Settings
} from "lucide-react";
import ThreadCard from "./ThreadCard";
import ThreadComposer from "./ThreadComposer";
import { fetchGroupThreads, createForumPost, sendCallNotification, checkActiveCalls } from "../../components/forum/Api/forumapi";
import { useSFU } from "./useSFU";
import VideoCallModal from "./VideoCallModal";
import AudioCallModal from "./AudioCallModal";
import EmailNotificationModal from '../comform/EmailNotificationModal';
import useSound from 'use-sound';
// Global instance tracker
const activeForumInstances = new Map();
// Optimized user cache
const userCache = new Map();
// Import message send sound (you'll need to add this sound file to your project)
// Place a sound file in your public folder: public/sounds/message-send.mp3
const messageSendSound = '/sounds/message-send.mp3';




export default function ForumThreadView({
  groupId,
  groupName,
  isInDrawer = false,
  setForumDrawerOpen,
  username,
  currentUser,
  allUsers,
  onBack,
  memberEmails = [],
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);
  // Sound effects
  const [playSendSound] = useSound(messageSendSound, { volume: 0.5 });
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inspectionId, setInspectionId] = useState(null);
  // Enhanced connection state tracking
  const [connectionState, setConnectionState] = useState({
    mediasoup: 'disconnected',
    chat: 'disconnected',
    lastAttempt: null,
    retryCount: 0
  });
  // Unified call state
  const [callState, setCallState] = useState('idle');
  const [callerName, setCallerName] = useState('');
  const [callerId, setCallerId] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  // 🔍 Enhanced Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchResultsCount, setSearchResultsCount] = useState(0);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [highlightedMatches, setHighlightedMatches] = useState([]);
  // 👥 Enhanced Group members and individual call state
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);
  const [individualCallState, setIndividualCallState] = useState({
    isIncoming: false,
    isOutgoing: false,
    targetUser: null,
    caller: null,
    callerName: '',
    callId: null,
    callType: 'video'
  });
  // 📱 Enhanced UI states
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(null);
  // Media Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState(() => localStorage.getItem('selectedMic') || '');
  const [selectedCamera, setSelectedCamera] = useState(() => localStorage.getItem('selectedCamera') || '');
  const [selectedSpeaker, setSelectedSpeaker] = useState(() => localStorage.getItem('selectedSpeaker') || '');
  const postsEndRef = useRef(null);
  const pollingRef = useRef(null);
  const lastPostCountRef = useRef(0);
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const mountedRef = useRef(false);
  const connectionRetryRef = useRef(null);
  const initializationRef = useRef(false);
  const userCacheRef = useRef(new Map());
  const typingTimeoutRef = useRef(null);

  // Add this right after the component function declaration
const isAuditForum = useMemo(() => {
  // Check if this is an audit forum group (starts with AUDIT-)
  const isAudit = groupId?.startsWith('AUDIT-') || groupId?.includes('_AUDIT_');
  console.log('🔍 [FORUM] Audit forum detection:', { groupId, isAudit });
  return isAudit;
}, [groupId]);

// Skip SFU for audit forums - create mock object
const mockSFU = {
  localStream: null,
  remoteStreams: {},
  isInCall: false,
  isAdmin: false,
  mediasoupConnected: true, // Set to true to prevent reconnection attempts
  cameraError: null,
  participants: [],
  connectionAttempts: 0,
  joinCall: async () => console.log('📞 [FORUM] Audio/Video disabled for audit forum'),
  endCall: () => console.log('📞 [FORUM] Audio/Video disabled for audit forum'),
  sendMediasoupMessage: () => console.log('📞 [FORUM] Audio/Video disabled for audit forum'),
  manuallyConnect: () => console.log('🔗 [FORUM] Audio/Video disabled for audit forum'),
  manuallyDisconnect: () => console.log('🔗 [FORUM] Audio/Video disabled for audit forum'),
  setOnCallEvent: () => console.log('📞 [FORUM] Audio/Video disabled for audit forum'),
  callType: 'video',
  connectionHealth: { instabilityCount: 0 }
};
  // Email Modal Handlers
  const handleOpenEmailModal = () => {
    setInspectionId(groupId); // Using groupId as inspectionId for context
    setShowEmailModal(true);
  };
  const handleProceedAfterEmail = () => {
    console.log('✅ [FORUM] Email sent successfully, proceeding...');
    setShowEmailModal(false);
    // Add any post-email logic here
  };
  const normalizedMemberSet = useMemo(() => {
    if (!memberEmails || !Array.isArray(memberEmails)) {
      return new Set();
    }
    return new Set(
      memberEmails
        .map((member) => {
          if (!member) return null;
          if (typeof member === "string") return member.trim().toLowerCase();
          if (typeof member === "object") {
            const candidate =
              member.email ||
              member.username ||
              member.userEmail ||
              member.userName ||
              member.value;
            return candidate ? candidate.toString().trim().toLowerCase() : null;
          }
          return null;
        })
        .filter(Boolean)
    );
  }, [memberEmails]);
  const shouldFilterGroupMembers = normalizedMemberSet.size > 0;
  const memberCacheKey = useMemo(() => {
    if (!shouldFilterGroupMembers) return "all";
    return Array.from(normalizedMemberSet).sort().join("|");
  }, [normalizedMemberSet, shouldFilterGroupMembers]);
  const isUserInGroup = useCallback(
    (user) => {
      if (!user) return false;
      if (!shouldFilterGroupMembers) return true;
      const email = user.email?.toLowerCase();
      const usernameLower = user.username?.toLowerCase();
      return (
        (email && normalizedMemberSet.has(email)) ||
        (usernameLower && normalizedMemberSet.has(usernameLower))
      );
    },
    [normalizedMemberSet, shouldFilterGroupMembers]
  );
  // ✅ FIXED: Define getUserFromCache FIRST before any functions that use it


  // ✅ ADD: Group creation/verification function
// ✅ REPLACE ONLY THIS FUNCTION - keep everything else
// IN ForumThreadView.jsx - REPLACE THE ensureGroupExists FUNCTION:

// ✅ UPDATED: Smart group detection for both forum types
// ✅ FIXED: Only for 8D string IDs, skip for numeric IDs
// ✅ FIXED: Only for 8D string IDs, skip for numeric IDs
const ensureGroupExists = async () => {
  if (!mountedRef.current || !groupId) return groupId;

  try {
    console.log('🔄 [FORUM] Checking group type:', { groupId, groupName, username });
    
    // ✅ If it's an audit forum, skip 8D group creation
    if (groupId?.startsWith('AUDIT-') || groupId?.includes('_AUDIT_')) {
      console.log('✅ [FORUM] Audit forum detected - skipping 8D group creation');
      return groupId;
    }
    
    // ✅ If groupId is numeric → Main Forum (already working)
    if (!isNaN(groupId)) {
      console.log('✅ [FORUM] Using existing numeric group ID (Main Forum):', groupId);
      return groupId;
    }

    // Only for 8D string IDs (EVT-17, 8D-123, etc.)
    const userEmail = currentUser?.email || username || 'system@jws.com';
    
    const requestBody = {
      groupId: groupId,
      groupName: groupName || `8D Group ${groupId}`,
      description: `8D Discussion for ${groupId}`,
      createdBy: userEmail,
      members: memberEmails && Array.isArray(memberEmails) ? memberEmails : []
    };

    console.log('📦 [FORUM] Creating/verifying 8D group:', requestBody);

    const response = await fetch('http://localhost:8080/api/forum/8d/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.log('⚠️ [FORUM] 8D group creation failed, but continuing with original ID');
      return groupId;
    }

    const result = await response.json();
    console.log('✅ [FORUM] 8D group ready:', result);
    
    return groupId;
    
  } catch (error) {
    console.error('⚠️ [FORUM] 8D group setup failed, but continuing:', error.message);
    return groupId;
  }
};



  const getUserFromCache = useCallback((userId) => {
    if (!userId) return null;
 
    // Check local cache first
    if (userCacheRef.current.has(userId)) {
      return userCacheRef.current.get(userId);
    }
 
    // Check global cache
    if (userCache.has(userId)) {
      const user = userCache.get(userId);
      userCacheRef.current.set(userId, user);
      return user;
    }
 
    // Find in allUsers - prioritize email lookup (since we're using email now)
    const user = allUsers?.find(u =>
      u.email === userId || u.username === userId || u.id === userId
    );
 
    if (user) {
      userCacheRef.current.set(userId, user);
      userCache.set(userId, user);
    }
 
    return user;
  }, [allUsers]);
  const getDisplayName = useCallback((userId) => {
    if (userId === username) return 'You';
 
    const user = getUserFromCache(userId);
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim() || user.username || user.email;
    }
    return userId;
  }, [getUserFromCache, username]);
  const getProfileImage = useCallback((userId) => {
    if (userId === username) return currentUser?.profileImage || null;
 
    const user = getUserFromCache(userId);
    return user?.profileImage || null;
  }, [getUserFromCache, username, currentUser]);
  // Use real SFU only for non-audit forums, mock for audit forums
const sfuData = isAuditForum ? mockSFU : useSFU(groupId, username);

const {
  localStream,
  remoteStreams,
  isInCall,
  isAdmin,
  mediasoupConnected,
  cameraError,
  participants,
  connectionAttempts,
  joinCall,
  endCall,
  sendMediasoupMessage,
  manuallyConnect,
  manuallyDisconnect,
  setOnCallEvent,
  callType: sfuCallType,
  connectionHealth
} = sfuData;
  // ✅ FIXED: Define handleCallEnded first to avoid reference error
  // ✅ ENHANCED: Call ended handler with complete cleanup
  const handleCallEnded = useCallback(() => {
    if (!mountedRef.current) return;
 
    console.log('📞 [FORUM] Handling call ended with complete cleanup');
    setCallState('idle');
    setCallerName('');
    setCallerId('');
    setIncomingCall(null);
    setCurrentCallType('video');
    setActiveUsers([]);
  }, []);
  // ✅ FIXED: Optimized polling with proper cleanup and caching
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      console.log("🛑 [FORUM] Polling stopped");
    }
    if (mountedRef.current) {
      setIsChatConnected(false);
    }
  }, []);
  // ✅ FIXED: Optimized polling mechanism - NOW getUserFromCache is defined
  const startPolling = useCallback(() => {
    if (!mountedRef.current || !groupId) return;
 
    console.log("🔄 [FORUM] Starting optimized real-time polling...");
    setIsChatConnected(true);
 
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    let lastFetchTime = 0;
    const POLL_INTERVAL = 5000; // Increased to 5 seconds
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const fetchPosts = async () => {
  if (!mountedRef.current || !groupId) return;

  const now = Date.now();
  if (now - lastFetchTime < POLL_INTERVAL) return;
  lastFetchTime = now;

  try {
    const response = await fetchGroupThreads(groupId);

    // ✅ FIX: Handle response format properly
    let newPosts = response;
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      newPosts = response.data || response.posts || [];
    }

    if (!Array.isArray(newPosts)) {
      console.warn('❌ [FORUM] Polling: Expected array but got:', typeof newPosts, newPosts);
      newPosts = [];
    }

    if (newPosts && Array.isArray(newPosts) && mountedRef.current) {
      setPosts(prevPosts => {
        // Only update if posts actually changed
        const prevPostsString = JSON.stringify(prevPosts.map(p => p.id));
        const newPostsString = JSON.stringify(newPosts.map(p => p.id));

        if (prevPostsString === newPostsString && prevPosts.length === newPosts.length) {
          return prevPosts; // No changes, return previous posts
        }

        const enriched = newPosts.map(post => {
          const user = getUserFromCache(post.createdBy);
          const name = user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : user?.firstName || user?.lastName || post.createdBy;

          return {
            ...post,
            createdByProfileImage: user?.profileImage || "",
            createdByName: name,
          };
        });
        const sorted = [...enriched].sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );

        console.log("✅ [FORUM] Posts updated:", sorted.length, "posts");
        return sorted;
      });

      consecutiveErrors = 0; // Reset error counter on success
    }
  } catch (err) {
    console.log("❌ [FORUM] Polling error:", err);
    consecutiveErrors++;

    if (mountedRef.current) {
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error("❌ [FORUM] Too many consecutive errors, stopping polling");
        stopPolling();
        setIsChatConnected(false);
      }
    }
  }
};
    // Initial fetch
    fetchPosts();
 
    // Set up interval
    pollingRef.current = setInterval(fetchPosts, POLL_INTERVAL);
 
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [groupId, getUserFromCache, stopPolling]);
  // ✅ FIXED: Optimized loadPosts function
 const loadPosts = async () => {
  if (!groupId || !mountedRef.current) return;

  try {
    setLoading(true);
    const response = await fetchGroupThreads(groupId);

    if (!mountedRef.current) return;

    console.log('🔍 [FORUM] Backend response:', typeof response, response);

    // ✅ FIX: Handle response format properly
    let postsData = response;
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      // If response has a 'data' property, use that
      postsData = response.data || response.posts || [];
    }

    // ✅ FIX: Ensure it's an array before using .map()
    if (!Array.isArray(postsData)) {
      console.warn('❌ [FORUM] Expected array but got:', typeof postsData, postsData);
      postsData = [];
    }

    // Only update if data actually changed
    const currentPostsString = JSON.stringify(posts.map(p => p.id));
    const newPostsString = JSON.stringify(postsData.map(p => p.id));

    if (currentPostsString !== newPostsString || posts.length !== postsData.length) {
      const enriched = postsData.map(post => {
        const user = getUserFromCache(post.createdBy);
        const name = user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user?.firstName || user?.lastName || post.createdBy;

        return {
          ...post,
          createdByProfileImage: user?.profileImage || "",
          createdByName: name,
        };
      });
      const sorted = [...enriched].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setPosts(sorted);
      lastPostCountRef.current = sorted.length;
    }

    setError(null);
    setUnreadCount(0);
    setLastSeen(new Date().toISOString());

  } catch (err) {
    if (mountedRef.current) {
      setError("Failed to load chat.");
      setIsChatConnected(false);
    }
    console.error("❌ [FORUM] Load posts error:", err);
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
};
  // ✅ OPTIMIZED: Stable component lifecycle management
  useEffect(() => {
    mountedRef.current = true;
    const instanceId = instanceIdRef.current;
 
    console.log('🔍 [FORUM] Component mounted:', {
      instanceId,
      groupId,
      username,
      existingInstances: activeForumInstances.size
    });
    // Prevent duplicate initialization
    if (initializationRef.current) {
      console.log('⏸️ [FORUM] Skipping duplicate initialization');
      return;
    }
    initializationRef.current = true;
    // Track this instance
    activeForumInstances.set(instanceId, {
      groupId,
      username,
      mountedAt: new Date().toISOString()
    });
    return () => {
      console.log('🔍 [FORUM] Component unmounted:', instanceId);
      mountedRef.current = false;
      initializationRef.current = false;
   
      // Cleanup all intervals and timeouts
      stopPolling();
   
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current);
        connectionRetryRef.current = null;
      }
   
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
   
      setIsChatConnected(false);
      activeForumInstances.delete(instanceId);
    };
  }, [groupId, username, stopPolling]);
  // ✅ OPTIMIZED: Enhanced connection state monitoring
  useEffect(() => {
    if (!mountedRef.current) return;
 
    const newState = {
      mediasoup: mediasoupConnected ? 'connected' : 'disconnected',
      chat: isChatConnected ? 'connected' : 'disconnected',
      lastAttempt: new Date().toISOString(),
      retryCount: connectionAttempts
    };
 
    setConnectionState(prev => ({
      ...prev,
      ...newState
    }));
 
    console.log('📊 [FORUM] Connection state:', {
      mediasoupConnected,
      connectionAttempts,
      isInCall,
      participantsCount: participants.length,
      callState,
      instanceId: instanceIdRef.current,
      connectionHealth
    });
  }, [mediasoupConnected, connectionAttempts, isInCall, participants, callState, isChatConnected, connectionHealth]);
  // ✅ OPTIMIZED: Fetch group members with enhanced caching
  // ✅ FIXED: Fetch group members with proper 8D support and current user detection


 // ✅ REPLACE the entire fetchGroupMembers function with this:

const fetchGroupMembers = useCallback(async () => {
  console.log('🔍 [FORUM] fetchGroupMembers START');
  console.log('🔍 [FORUM] memberEmails received:', memberEmails);
  console.log('🔍 [FORUM] allUsers available:', allUsers?.length || 0);
  console.log('🔍 [FORUM] allUsers data:', allUsers?.map(u => ({ email: u.email, role: u.role })));
  console.log('🔍 [FORUM] currentUser:', currentUser?.email);
  
  let members = [];
  
  if (memberEmails && Array.isArray(memberEmails) && memberEmails.length > 0) {
    members = memberEmails.map((email) => {
      if (!email) return null;
      
      console.log(`🔍 [FORUM] Looking for email: ${email}`);
      
      // Try to find user in allUsers
      const existingUser = allUsers?.find(user => 
        user?.email?.toLowerCase() === email.toLowerCase() ||
        user?.username?.toLowerCase() === email.toLowerCase()
      );
      
      if (existingUser) {
        console.log(`✅ [FORUM] Found user in allUsers: ${existingUser.email} (${existingUser.role})`);
        return {
          ...existingUser,
          id: existingUser.id || existingUser.username || existingUser.email,
          email: existingUser.email,
          username: existingUser.username || existingUser.email,
          firstName: existingUser.firstName || email.split('@')[0],
          lastName: existingUser.lastName || "",
          isOnline: true,
          lastSeen: new Date().toISOString(),
          role: existingUser.roleName || existingUser.role || 'member',
          status: 'active',
          profileImage: existingUser.profileImage || null
        };
      }
      
      console.log(`⚠️ [FORUM] User NOT found in allUsers for: ${email}, creating fallback`);
      
      // Create basic user from email
      const name = email.split("@")[0];
      const firstName = name.includes('.') ? name.split('.')[0] : name;
      const lastName = name.includes('.') ? name.split('.')[1] : "";
      
      return {
        id: email,
        email: email,
        username: email,
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        isOnline: false,
        lastSeen: null,
        role: 'member',
        status: 'active',
        profileImage: null
      };
    }).filter(Boolean);
  }
  
  console.log('✅ [FORUM] Final group members:', members.map(m => ({ email: m.email, role: m.role })));
  setGroupMembers(members);
  
}, [groupId, allUsers, memberEmails, username, currentUser]);


  const handleIndividualCall = async (targetUser, callType = 'video') => {
    if (!mountedRef.current) return;
    try {
      console.log('📞 [FORUM] Starting individual call to:', targetUser.username, 'Type:', callType);
   
      // Generate a unique call ID
      const callId = `${groupId}-${username}-${targetUser.username}-${Date.now()}`;
   
      // Set individual call state
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: true,
        targetUser: targetUser,
        caller: username,
        callerName: currentUser?.firstName + ' ' + currentUser?.lastName || username,
        callId: callId,
        callType: callType
      });
   
      // Send call notification via HTTP
      await sendCallNotification(
        groupId,
        'INDIVIDUAL_CALL_STARTED',
        username,
        currentUser?.firstName + ' ' + currentUser?.lastName || username,
        targetUser.username,
        callType
      );
   
      // ALSO send via WebSocket for immediate delivery
      sendMediasoupMessage('INDIVIDUAL_CALL_STARTED', {
        callId: callId,
        targetUser: targetUser.username,
        callType: callType,
        callerName: currentUser?.firstName + ' ' + currentUser?.lastName || username
      });
   
      console.log('✅ [FORUM] Individual call notification sent via both HTTP and WebSocket');
    } catch (error) {
      console.error('❌ [FORUM] Failed to start individual call:', error);
      alert('Failed to start individual call. Please try again.');
      // Reset individual call state on error
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: false,
        targetUser: null,
        caller: null,
        callerName: '',
        callId: null,
        callType: 'video'
      });
    }
  };
  // ✅ ENHANCED: Handle incoming individual call
  const handleIncomingIndividualCall = useCallback((data) => {
    if (!mountedRef.current || individualCallState.isOutgoing) return;
 
    console.log('📞 [FORUM] Incoming individual call:', data);
 
    if (data.targetUser === username && data.action === 'INDIVIDUAL_CALL_STARTED') {
      setIndividualCallState({
        isIncoming: true,
        isOutgoing: false,
        targetUser: null,
        caller: data.caller,
        callerName: data.callerName,
        callId: data.callId,
        callType: data.callType || 'video'
      });
    }
  }, [username, individualCallState.isOutgoing]);
  // ✅ ENHANCED: Accept individual call
  const handleAcceptIndividualCall = async () => {
    if (!mountedRef.current) return;
 
    try {
      console.log('✅ [FORUM] Accepting individual call from:', individualCallState.callerName, 'Type:', individualCallState.callType);
   
      // Send acceptance via WebSocket (faster than HTTP)
      sendMediasoupMessage('INDIVIDUAL_CALL_RESPONSE', {
        callId: individualCallState.callId,
        action: 'accepted',
        targetUser: individualCallState.caller,
        callType: individualCallState.callType // Include callType in response
      });
      // Also send HTTP notification for reliability
      await sendCallNotification(
        groupId,
        'INDIVIDUAL_CALL_ACCEPTED',
        username,
        currentUser?.firstName + ' ' + currentUser?.lastName || username,
        individualCallState.caller,
        individualCallState.callType // Include callType
      );
      // Start the actual call using existing group call infrastructure
      await handleStartCall(false, individualCallState.callType);
      // Reset individual call state
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: false,
        targetUser: null,
        caller: null,
        callerName: '',
        callId: null,
        callType: 'video'
      });
    } catch (error) {
      console.error('❌ [FORUM] Failed to accept individual call:', error);
      alert('Failed to accept individual call. Please try again.');
    }
  };
  // ✅ ENHANCED: Decline individual call
  const handleDeclineIndividualCall = async () => {
    if (!mountedRef.current) return;
 
    try {
      console.log('❌ [FORUM] Declining individual call from:', individualCallState.callerName);
   
      // Send decline via WebSocket
      sendMediasoupMessage('INDIVIDUAL_CALL_RESPONSE', {
        callId: individualCallState.callId,
        action: 'declined',
        targetUser: individualCallState.caller
      });
      // Also send HTTP notification
      await sendCallNotification(
        groupId,
        'INDIVIDUAL_CALL_DECLINED',
        username,
        currentUser?.firstName + ' ' + currentUser?.lastName || username,
        individualCallState.caller
      );
      // Reset individual call state
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: false,
        targetUser: null,
        caller: null,
        callerName: '',
        callId: null,
        callType: 'video'
      });
    } catch (error) {
      console.error('❌ [FORUM] Failed to decline individual call:', error);
    }
  };
  // ✅ ENHANCED: Cancel outgoing individual call
  const handleCancelIndividualCall = async () => {
    if (!mountedRef.current) return;
 
    try {
      console.log('📞 [FORUM] Canceling individual call to:', individualCallState.targetUser?.username);
   
      // Send cancel via WebSocket
      sendMediasoupMessage('INDIVIDUAL_CALL_RESPONSE', {
        callId: individualCallState.callId,
        action: 'canceled',
        targetUser: individualCallState.targetUser?.username
      });
      // Also send HTTP notification
      await sendCallNotification(
        groupId,
        'INDIVIDUAL_CALL_CANCELED',
        username,
        currentUser?.firstName + ' ' + currentUser?.lastName || username,
        individualCallState.targetUser?.username
      );
      // Reset individual call state
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: false,
        targetUser: null,
        caller: null,
        callerName: '',
        callId: null,
        callType: 'video'
      });
    } catch (error) {
      console.error('❌ [FORUM] Failed to cancel individual call:', error);
    }
  };
  // ✅ ENHANCED: Poll for call notifications with caching
  const startCallNotificationPolling = useCallback(() => {
    if (!mountedRef.current || !groupId) return;
 
    let lastPollTime = 0;
    const POLL_INTERVAL = 5000;
 
    const pollCallNotifications = async () => {
      const now = Date.now();
      if (now - lastPollTime < POLL_INTERVAL) return;
      lastPollTime = now;
   
      try {
        const activeCalls = await checkActiveCalls(groupId);
     
        if (activeCalls && Array.isArray(activeCalls)) {
          activeCalls.forEach(call => {
            if (call.targetUser === username && call.action === 'INDIVIDUAL_CALL_STARTED') {
              handleIncomingIndividualCall(call);
            }
          });
        }
      } catch (error) {
        console.error('❌ [FORUM] Call notification polling error:', error);
      }
    };
    const notificationInterval = setInterval(pollCallNotifications, POLL_INTERVAL);
 
    return () => {
      clearInterval(notificationInterval);
    };
  }, [groupId, username, handleIncomingIndividualCall]);
  // ✅ ENHANCED: Stable event callback setup with complete call handling
  useEffect(() => {
    if (!setOnCallEvent || !mountedRef.current) return;
 
    console.log('✅ [FORUM] Setting up enhanced call event callback');
 
    const handleCallEvent = (data) => {
      if (!mountedRef.current) return;
   
      console.log('🎯 [FORUM] Call event received:', data.type, 'from:', data.sender, 'callType:', data.callType);
   
      const { type, sender, groupId: eventGroupId, payload, callType } = data;
   
      // Only process events for our group
      if (eventGroupId && String(eventGroupId) !== String(groupId)) {
        return;
      }
   
      switch (type) {
        case 'CALL_STARTED':
          console.log('📞 [FORUM] INCOMING GROUP CALL from:', sender, 'Type:', payload?.callType);
          if (callState === 'idle' && !isInCall) {
            setCallState('ringing');
            setCallerName(payload?.callerName || sender);
            setCallerId(sender);
            setCurrentCallType(payload?.callType || 'video');
            setIncomingCall({
              caller: sender,
              callerName: payload?.callerName || sender,
              groupId: groupId,
              callType: payload?.callType || 'video'
            });
          }
          break;
       
        case 'USER_JOINED_CALL':
          console.log('👥 [FORUM] User joined call:', sender);
          // Update active users
          setActiveUsers(prev => {
            if (!prev.includes(sender)) {
              return [...prev, sender];
            }
            return prev;
          });
          break;
        case 'USER_LEFT_CALL':
          console.log('👤 [FORUM] User left call:', sender, 'reason:', payload?.reason);
          // Remove from active users
          setActiveUsers(prev => prev.filter(user => user !== sender));
       
          // Show notification
          if (payload?.userName) {
            console.log(`ℹ️ ${payload.userName} left the call`);
          }
          break;
       
        case 'CALL_ENDED':
          console.log('📞 [FORUM] Call ended by:', sender, 'reason:', payload?.reason);
          handleCallEnded();
       
          // Clear active users
          setActiveUsers([]);
       
          // Show call ended message
          if (payload?.reason === 'empty_call') {
            console.log('ℹ️ Call ended because no participants left');
          } else if (sender !== username) {
            console.log(`ℹ️ Call was ended by ${sender}`);
          }
          break;
        case 'NEW_PRODUCER':
          console.log('🎬 [FORUM] New producer from:', sender);
          break;
       
        // Handle individual call incoming via WebSocket
        case 'INDIVIDUAL_CALL_INCOMING':
          console.log('📞 [FORUM] INCOMING INDIVIDUAL CALL from:', data.callerName, 'Type:', data.callType);
          if (!individualCallState.isOutgoing && !isInCall) {
            setIndividualCallState({
              isIncoming: true,
              isOutgoing: false,
              targetUser: null,
              caller: data.caller,
              callerName: data.callerName,
              callId: data.callId,
              callType: data.callType || 'video'
            });
          }
          break;
       
        case 'INDIVIDUAL_CALL_STARTED':
          console.log('📞 [FORUM] Individual call started notification:', data);
          if (data.targetUser === username && !individualCallState.isOutgoing && !isInCall) {
            setIndividualCallState({
              isIncoming: true,
              isOutgoing: false,
              targetUser: null,
              caller: data.caller || sender,
              callerName: data.callerName,
              callId: data.callId,
              callType: data.callType || 'video'
            });
          }
          break;
       
        case 'INDIVIDUAL_CALL_ACCEPTED':
          console.log('✅ [FORUM] Individual call accepted by:', data.sender, 'Type:', data.callType);
          if (individualCallState.isOutgoing) {
            setIndividualCallState(prev => ({
              ...prev,
              isOutgoing: false
            }));
            // Use callType from the acceptance message
            const callTypeToUse = data.callType || individualCallState.callType || 'video';
            console.log('📞 [FORUM] Starting call with type:', callTypeToUse);
            handleStartCall(false, callTypeToUse);
          }
          break;
       
        case 'INDIVIDUAL_CALL_DECLINED':
          console.log('❌ [FORUM] Individual call declined by:', data.sender);
          if (individualCallState.isOutgoing) {
            alert(`${data.sender} declined your ${individualCallState.callType} call`);
            setIndividualCallState({
              isIncoming: false,
              isOutgoing: false,
              targetUser: null,
              caller: null,
              callerName: '',
              callId: null,
              callType: 'video'
            });
          }
          break;
       
        case 'INDIVIDUAL_CALL_CANCELED':
          console.log('📞 [FORUM] Individual call canceled by:', data.caller);
          if (individualCallState.isIncoming) {
            setIndividualCallState({
              isIncoming: false,
              isOutgoing: false,
              targetUser: null,
              caller: null,
              callerName: '',
              callId: null,
              callType: 'video'
            });
          }
          break;
       
        default:
          console.log('📞 [FORUM] Unknown event:', type);
      }
    };
    setOnCallEvent(handleCallEvent);
 
    return () => {
      if (mountedRef.current && setOnCallEvent) {
        console.log('🧹 [FORUM] Cleaning up call callback');
        setOnCallEvent(null);
      }
    };
  }, [setOnCallEvent, groupId, callState, isInCall, individualCallState, username, handleCallEnded]);
  // ✅ ENHANCED: Call state synchronization
  useEffect(() => {
    if (!mountedRef.current) return;
 
    console.log('📞 [FORUM] Call state sync:', {
      isInCall,
      callState,
      participantsCount: participants.length
    });
 
    if (isInCall && callState !== 'connected') {
      setCallState('connected');
      console.log('✅ [FORUM] Call state updated to connected');
    } else if (!isInCall && (callState === 'connected' || callState === 'calling')) {
      console.log('🔄 [FORUM] Resetting call state because we left call');
      handleCallEnded();
    }
  }, [isInCall, callState, participants.length, handleCallEnded]);
  // ✅ FIXED: Stable initialization with proper cleanup
  // ✅ UPDATE: Enhanced initialization with group creation
// ✅ FIXED: Non-blocking initialization
useEffect(() => {
  if (!mountedRef.current || !groupId) return;

  console.log('🚀 [FORUM] Initializing forum...');

  const initializeForum = async () => {
    try {
      setLoading(true);
      
      // ✅ NON-BLOCKING: Try to ensure group exists but don't wait for it
      ensureGroupExists().then(finalGroupId => {
        console.log('✅ [FORUM] Group check completed:', finalGroupId);
      }).catch(err => {
        console.log('⚠️ [FORUM] Group check failed but continuing:', err.message);
      });
      
      // ✅ IMMEDIATELY load posts and start polling
      await loadPosts();
      startPolling();
      
    } catch (error) {
      console.error('❌ [FORUM] Initialization failed:', error);
      // ✅ Don't set error state - keep forum functional
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  initializeForum();
  
  // Cleanup function - keep your existing cleanup
  return () => {
    console.log('🧹 [FORUM] Cleaning up forum instance');
    stopPolling();
 
    if (connectionRetryRef.current) {
      clearTimeout(connectionRetryRef.current);
      connectionRetryRef.current = null;
    }
 
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };
}, [groupId]); // Only depend on groupId
  // ✅ ENHANCED: Initialize group members and call notification polling
  useEffect(() => {
    if (!mountedRef.current) return;
 
    fetchGroupMembers();
    const cleanupPolling = startCallNotificationPolling();
 
    return () => {
      if (cleanupPolling) cleanupPolling();
    };
  }, [fetchGroupMembers, startCallNotificationPolling]);
  // ✅ FIXED: Less aggressive reconnection
  useEffect(() => {
    if (!mountedRef.current) return;
    console.log('📊 [FORUM] Connection state updated:', {
      mediasoupConnected,
      connectionStatus: connectionState.mediasoup,
      connectionAttempts: connectionAttempts,
      isInCall
    });
    // ✅ FIXED: Only auto-reconnect if truly disconnected for a while
    if (!mediasoupConnected &&
        connectionState.mediasoup === 'disconnected' &&
        connectionAttempts === 0 &&
        mountedRef.current) {
   
      console.log('🔄 [FORUM] Auto-initiating reconnection...');
      const reconnectTimer = setTimeout(() => {
        if (mountedRef.current && !mediasoupConnected) {
          manuallyConnect();
        }
      }, 5000); // Increased from 3000ms to 5000ms
      return () => clearTimeout(reconnectTimer);
    }
  }, [mediasoupConnected, connectionState.mediasoup, connectionAttempts, isInCall, manuallyConnect]);
  // ✅ FIXED: Optimized connection initialization
  useEffect(() => {
    if (!mountedRef.current || !groupId) return;
    console.log('🔗 [FORUM] Auto-connecting to Mediasoup...');
 
    // ✅ FIXED: Longer delay before initial connection
    const connectTimer = setTimeout(() => {
      if (mountedRef.current) {
        manuallyConnect();
      }
    }, 3000); // Increased from 1500ms to 3000ms
    return () => {
      clearTimeout(connectTimer);
    };
  }, [groupId, username, manuallyConnect]);
  // Media Devices Enumeration
  useEffect(() => {
    let stream;
    const getDevices = async () => {
      try {
        // Request permission to populate device labels
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
     
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.filter(d => d.kind === 'audioinput');
        const video = devices.filter(d => d.kind === 'videoinput');
        const audioOutput = devices.filter(d => d.kind === 'audiooutput');
     
        setAudioDevices(audio);
        setVideoDevices(video);
        setAudioOutputDevices(audioOutput);
     
        // Set default if not selected
        if (!selectedMic && audio.length > 0) {
          const defaultMic = audio[0].deviceId;
          setSelectedMic(defaultMic);
          localStorage.setItem('selectedMic', defaultMic);
        }
        if (!selectedCamera && video.length > 0) {
          const defaultCamera = video[0].deviceId;
          setSelectedCamera(defaultCamera);
          localStorage.setItem('selectedCamera', defaultCamera);
        }
        if (!selectedSpeaker && audioOutput.length > 0) {
          const defaultSpeaker = audioOutput[0].deviceId;
          setSelectedSpeaker(defaultSpeaker);
          localStorage.setItem('selectedSpeaker', defaultSpeaker);
        }
      } catch (err) {
        console.error('Permission denied for media devices:', err);
        // Fallback: enumerate without labels
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audio = devices.filter(d => d.kind === 'audioinput');
          const video = devices.filter(d => d.kind === 'videoinput');
          const audioOutput = devices.filter(d => d.kind === 'audiooutput');
          setAudioDevices(audio);
          setVideoDevices(video);
          setAudioOutputDevices(audioOutput);
        } catch (fallbackErr) {
          console.error('Failed to enumerate devices:', fallbackErr);
        }
      } finally {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
    if (showSettingsModal) {
      getDevices();
    }
  }, [showSettingsModal, selectedMic, selectedCamera, selectedSpeaker]);
  useEffect(() => {
    if (mountedRef.current) {
      const container = document.querySelector(".chat-messages");
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    }
  }, [posts, isInDrawer]);
  // Debug connection state changes
  useEffect(() => {
    console.log("🔗 [FORUM] Connection state changed:", {
      isChatConnected,
      mediasoupConnected,
      pollingActive: !!pollingRef.current,
      postsCount: posts.length
    });
  }, [isChatConnected, mediasoupConnected, posts.length]);
  const handleNewPost = async (newPostData) => {
  if (!mountedRef.current || !groupId) return;

  const userEmail = currentUser?.email || username;

  
  
console.log('🔍 [FORUM] handleNewPost debug:', {
    userEmail,
    currentUser: currentUser,
    currentUsername: username,
    groupId,
    content: newPostData.content,
    threadCreatedBy: newPostData.createdBy
  });

  try {
    console.log('📝 [FORUM] Creating post with group ID:', groupId);

    // ✅ Use the original groupId (numeric or string)
    const res = await createForumPost(groupId, {
      content: newPostData.content,
      createdBy: userEmail,
      messageType: newPostData.messageType || "TEXT",
      attachments: newPostData.attachments || [],
    });

    // ✅ REST OF YOUR EXISTING CODE - keep everything else the same
    const user = getUserFromCache(userEmail);
    const name = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.firstName || user?.lastName || userEmail;

    if (mountedRef.current) {
      setPosts(prev => [...prev, {
        ...res,
        createdByProfileImage: user?.profileImage || "",
        createdByName: name,
        optimistic: true,
      }]);
    }
    
    // Play send sound when message is successfully sent
    playSendSound();
    console.log("✅ [FORUM] Message sent via HTTP");

  } catch (httpErr) {
    console.error("❌ [FORUM] HTTP send failed:", httpErr);
    // ✅ Silent failure - don't alert user for minor issues
    
    // Optional: Only show alert for critical errors, not for 400/404
    if (httpErr.response?.status >= 500) {
      alert("Failed to send message. Please try again.");
    }
  }
};
  // ✅ ENHANCED: Start call with complete state management
  const handleStartCall = async (asAdmin = true, callType = 'video') => {
    if (!mountedRef.current) return;
 
    try {
      console.log("🎥 [FORUM] Starting call...", { asAdmin, callType });
   
      if (!mediasoupConnected) {
        console.log('🔄 [FORUM] Connecting to Mediasoup first...');
        manuallyConnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
   
      setCallState('calling');
      setCallerName('You');
      setCallerId(username);
      setCurrentCallType(callType);
   
      // Send call notification with call type
      sendMediasoupMessage('CALL_STARTED', {
        callerName: currentUser?.firstName + ' ' + currentUser?.lastName || username,
        callerId: username,
        callType: callType
      });
   
      console.log('📢 [FORUM] Call notification sent for:', callType);
   
      // Join the call with specific type
      await joinCall(asAdmin, callType);
   
      console.log("✅ [FORUM] Call started successfully:", callType);
   
    } catch (error) {
      console.error("❌ [FORUM] Failed to start call:", error);
   
      if (mountedRef.current) {
        handleCallEnded();
      }
   
      alert(`${callType === 'video' ? 'Video' : 'Audio'} call failed: ${error.message || "Please check your media permissions"}`);
      sendMediasoupMessage('CALL_ENDED');
    }
  };
  // ✅ ENHANCED: Accept call
  const handleAcceptCall = async () => {
    if (!mountedRef.current) return;
 
    try {
      console.log('🎥 [FORUM] Accepting call from:', callerName, 'Type:', currentCallType);
   
      setIncomingCall(null);
      setCallState('connecting');
   
      await joinCall(false, currentCallType);
   
      console.log("✅ [FORUM] Joined call successfully:", currentCallType);
   
    } catch (error) {
      console.error("❌ [FORUM] Failed to join call:", error);
   
      let errorMessage = "Failed to join call";
      if (error.name === 'NotReadableError') {
        errorMessage = "Microphone is busy. Please close other applications using your microphone and try again.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone permission denied. Please allow access in your browser settings.";
      }
   
      alert(errorMessage);
      handleCallEnded();
    }
  };
  const handleJoinCall = async () => {
    if (!mountedRef.current) return;
 
    try {
      console.log('🎥 [FORUM] Joining existing call...');
   
      setCallState('connecting');
   
      sendMediasoupMessage('USER_JOINED_CALL', {
        callType: currentCallType
      });
   
      await joinCall(false, currentCallType);
   
      console.log("✅ [FORUM] Joined existing call successfully");
   
    } catch (error) {
      console.error("❌ [FORUM] Failed to join call:", error);
      alert("Failed to join call: " + (error.message || "Please check your media permissions"));
      handleCallEnded();
    }
  };
  const handleDeclineCall = async () => {
    console.log('📞 [FORUM] Declining call from:', callerName);
    handleCallEnded();
  };
  const handleEndCall = async () => {
    console.log('📞 [FORUM] Ending call...');
    sendMediasoupMessage('CALL_ENDED');
    endCall();
    handleCallEnded();
  };
  // ✅ ENHANCED: Manual reconnect
  const handleManualReconnect = async () => {
    if (!mountedRef.current) return;
 
    console.log('🔄 [FORUM] Manual reconnect triggered');
 
    try {
      setConnectionState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
   
      manuallyConnect();
   
      if (!isChatConnected) {
        startPolling();
      }
   
      console.log('✅ [FORUM] Manual reconnect completed');
   
    } catch (error) {
      console.error('❌ [FORUM] Manual reconnect failed:', error);
      alert('Reconnect failed. Please check your internet connection.');
    }
  };
  const handleTypingStart = () => {
    if (mountedRef.current) {
      setIsTyping(true);
    }
  };
  const handleTypingEnd = () => {
    if (mountedRef.current) {
      setIsTyping(false);
    }
  };
  const retrySend = (failedPost) => {
    handleNewPost({
      content: failedPost.content,
      messageType: failedPost.messageType,
      attachments: failedPost.attachments,
    });
  };
  const manualRefresh = () => {
    if (mountedRef.current) {
      loadPosts();
    }
  };
  // 👥 ENHANCED: Toggle members sidebar
  const toggleMembersSidebar = () => {
    setShowMembersSidebar(!showMembersSidebar);
  };
  // 👥 ENHANCED: Toggle participants sidebar
  const toggleParticipantsSidebar = () => {
    setShowParticipantsSidebar(!showParticipantsSidebar);
  };
  // 🔍 ENHANCED: Search function with memoization
  const handleSearch = useCallback((query) => {
    if (!query.trim()) {
      setFilteredPosts([]);
      setSearchResultsCount(0);
      setCurrentResultIndex(-1);
      setHighlightedMatches([]);
      return;
    }
    const matches = [];
    const filtered = posts.map(post => {
      const contentMatches = [];
      const regex = new RegExp(`(${query})`, 'gi');
      const content = post.content || '';
      let match;
      let lastIndex = 0;
      let highlightedContent = '';
      let matchCount = 0;
      while ((match = regex.exec(content)) !== null) {
        highlightedContent += content.substring(lastIndex, match.index);
        highlightedContent += `<mark class="bg-yellow-200">${match[0]}</mark>`;
        lastIndex = regex.lastIndex;
        contentMatches.push({
          postId: post.id,
          index: matchCount,
          type: 'content',
          text: match[0],
          position: match.index
        });
        matchCount++;
      }
      highlightedContent += content.substring(lastIndex);
      const authorMatches = [];
      const author = post.createdByName || '';
      let authorMatch;
      let lastAuthorIndex = 0;
      let highlightedAuthor = '';
      let authorMatchCount = 0;
      while ((authorMatch = regex.exec(author)) !== null) {
        highlightedAuthor += author.substring(lastAuthorIndex, authorMatch.index);
        highlightedAuthor += `<mark class="bg-yellow-200">${authorMatch[0]}</mark>`;
        lastAuthorIndex = regex.lastIndex;
        authorMatches.push({
          postId: post.id,
          index: authorMatchCount,
          type: 'author',
          text: authorMatch[0],
          position: authorMatch.index
        });
        authorMatchCount++;
      }
      highlightedAuthor += author.substring(lastAuthorIndex);
      matches.push(...contentMatches, ...authorMatches);
      return {
        ...post,
        highlightedContent,
        highlightedAuthor
      };
    }).filter(post =>
      (post.highlightedContent !== post.content) ||
      (post.highlightedAuthor !== post.createdByName)
    );
    setFilteredPosts(filtered);
    setSearchResultsCount(matches.length);
    setCurrentResultIndex(-1);
    setHighlightedMatches(matches);
  }, [posts]);
  // 🔍 ENHANCED: Handle search input change with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
 
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
 
    typingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        handleSearch(query);
      }
    }, 300);
  };
  // 🔍 ENHANCED: Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredPosts([]);
    setSearchResultsCount(0);
    setCurrentResultIndex(-1);
    setHighlightedMatches([]);
    setIsSearching(false);
  };
  // 🔍 ENHANCED: Toggle search mode
  const toggleSearch = () => {
    if (isSearching) {
      clearSearch();
    }
    setIsSearching(!isSearching);
  };
  // 🔍 ENHANCED: Navigate search results
  const navigateSearchResults = (direction) => {
    if (highlightedMatches.length === 0) return;
 
    let newIndex = currentResultIndex;
 
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % highlightedMatches.length;
    } else if (direction === 'prev') {
      newIndex = currentResultIndex === 0
        ? highlightedMatches.length - 1
        : currentResultIndex - 1;
    }
 
    setCurrentResultIndex(newIndex);
 
    const match = highlightedMatches[newIndex];
    const postElement = document.getElementById(`post-${match.postId}`);
    if (postElement) {
      postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      postElement.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        postElement.classList.remove('ring-2', 'ring-blue-500');
      }, 1000);
    }
  };
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSearching || !searchQuery) return;
   
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigateSearchResults('next');
      } else if (e.key === 'Enter' && (e.shiftKey && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        navigateSearchResults('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearching, searchQuery, currentResultIndex, highlightedMatches]);
  // ✅ ENHANCED: Status indicator - HIDDEN
  const StatusIndicator = () => (
    <div className="flex items-center gap-4">
      {/* Mediasoup WebSocket Status - HIDDEN */}
      {/* <div className="flex items-center gap-1">
        {mediasoupConnected ? (
          <Signal size={16} className="text-green-500" />
        ) : (
          <Signal size={16} className="text-white-500 opacity-50" />
        )}
         <span className={`text-xs ${mediasoupConnected ? 'text-green-600' : 'text-red-600'}`}>
        </span>
       </div> */}
    </div>
  );
  // 🔍 ENHANCED: Search Bar Component
  const SearchBar = () => (
    <div className="px-3 py-2 border-b bg-white flex items-center gap-2">
      <Search size={16} className="text-gray-500" />
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search messages..."
        className="flex-1 outline-none text-sm"
        autoFocus
      />
      {searchQuery && (
        <div className="text-xs text-gray-500">
          {currentResultIndex + 1} / {searchResultsCount}
        </div>
      )}
      <button
        onClick={() => navigateSearchResults('prev')}
        disabled={searchResultsCount === 0}
        className={`p-1 rounded-full ${searchResultsCount === 0 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
        title="Previous result (Ctrl+Shift+Enter)"
      >
        <ChevronUp size={16} />
      </button>
      <button
        onClick={() => navigateSearchResults('next')}
        disabled={searchResultsCount === 0}
        className={`p-1 rounded-full ${searchResultsCount === 0 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
        title="Next result (Ctrl+Enter)"
      >
        <ChevronDown size={16} />
      </button>
      <button
        onClick={clearSearch}
        className="p-1 hover:bg-gray-100 rounded-full"
      >
        <X size={16} />
      </button>
    </div>
  );
  // 👥 ENHANCED: Group Members Sidebar Component
  const GroupMembersSidebar = useMemo(() => {
    const MemberItem = ({ member }) => (
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          {/* Profile Image */}
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt={member.firstName}
              className="w-10 h-10 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
          )}
       
          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {member.firstName} {member.lastName}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{member.username}</p>
            </div>
          </div>
        </div>
        {/* Call Buttons - HIDDEN */}
        {/* <div className="flex gap-1">
          <button
            onClick={() => handleIndividualCall(member, 'audio')}
            className='text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors'
              title="voice call"
         
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => handleIndividualCall(member, 'video')}
            className='text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors'
            title="video call"
          >
            <VideoIcon size={16} />
          </button>
        </div> */}
      </div>
    );
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Group Members</h3>
            <button
              onClick={toggleMembersSidebar}
              className="p-1 hover:bg-gray-100 rounded-full"
              title="Close"
            >
              <X size={16} />
           
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {groupMembers.length} members
          </p>
        </div>
        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          {groupMembers.map((member) => (
            <MemberItem key={member.username} member={member} />
          ))}
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Group members list
          </div>
        </div>
      </div>
    );
  }, [groupMembers, toggleMembersSidebar]);
  // 👥 ENHANCED: Individual Call Modal - HIDDEN
  const IndividualCallModal = () => {
    // Return null to hide individual call modal
    return null;
  };
  const isCallActive = callState === 'calling' || callState === 'connected';
  const canJoinCall = isCallActive && !isInCall && mediasoupConnected;
  if (!isInDrawer) {
    return (
      <div className="p-6">
        <h1>Group: {groupId}</h1>
        <div className="space-y-4 mt-4">
          {posts.map((post) => (
            <ThreadCard
              key={post.id}
              thread={post}
              currentUsername={username}
              onRetry={retrySend}
            />
          ))}
        </div>
        <ThreadComposer
          groupId={groupId}
          onThreadCreated={handleNewPost}
          onInputStart={handleTypingStart}
          onInputEnd={handleTypingEnd}
          username={currentUser?.email || username}
        />
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Top Bar - Enhanced Group Header */}
        <div className="bg-[#00529B] text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="hover:bg-white/20 p-1 rounded" title="Back">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{(groupName || `Group ${groupId}`).charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <button
                  onClick={toggleMembersSidebar}
                  className={`p-1 text-white rounded-full ${
                    showMembersSidebar ? '' : ''
                  }`}
                  title="Group Members"
                >
                  <span className="font-semibold text-base">{groupName || `Group ${groupId}`}</span>
                  <div className="text-xs text-blue-100 opacity-80">
                    {groupMembers.length} members
                 
                  </div>
                </button>
              </div>
            </div>
          </div>
       
          <div className="flex items-center gap-2">
            {/* Status Indicator - HIDDEN */}
            {/* <StatusIndicator /> */}
         
            {/* 📧 Email Notification Button */}
            <button
              onClick={handleOpenEmailModal}
              className="p-2 text-white rounded-full hover:bg-white/20 transition-colors"
              title="Send Email Notification"
            >
              <Mail size={18} />
            </button>
         
            {/* 👥 Group Members Button */}
            <button
              onClick={toggleMembersSidebar}
              className={`p-2 text-white rounded-full hover:bg-white/20 transition-colors ${
                showMembersSidebar ? 'bg-blue-600' : ''
              }`}
              title="Group Members"
            >
              <Users size={18} />
            </button>
         
            {/* 👥 Participants Button (only show during call) - HIDDEN */}
            {/* {isInCall && (
              <button
                onClick={toggleParticipantsSidebar}
                className="p-2 text-white rounded-full hover:bg-white/20 transition-colors relative"
                title="Call Participants"
              >
                <MessageCircle size={18} />
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {participants.length + 1}
                </span>
              </button>
            )} */}
         
            {/* 🔍 Search Button */}
            <button
              onClick={toggleSearch}
              className={`p-2 text-white rounded-full hover:bg-white/20 transition-colors ${
                isSearching ? 'bg-blue-600' : ''
              }`}
              title="Search Messages"
            >
              <Search size={18} />
            </button>
            {/* ⚙️ Media Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-white rounded-full hover:bg-white/20 transition-colors"
              title="Media Settings"
            >
              <Settings size={18} />
            </button>
         
            {/* Audio Call Button - HIDDEN */}
            {/* {callState === 'idle' && (
              <button
                onClick={() => handleStartCall(true, 'audio')}
                className="p-2 text-white rounded-full hover:bg-white/20 transition-colors"
                title="Start Group Audio Call"
              >
                <Phone size={18} />
              </button>
            )} */}
         
            {/* Video Call Button - HIDDEN */}
            {/* {callState === 'idle' && (
              <button
                onClick={() => handleStartCall(true, 'video')}
                className="p-2 text-white rounded-full hover:bg-white/20 transition-colors"
                title="Start Group Video Call"
              >
                <VideoIcon size={18} />
              </button>
            )} */}
         
            {/* Join Call Button - HIDDEN */}
            {/* {canJoinCall && (
              <button
                onClick={handleJoinCall}
                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center gap-1 text-xs px-3"
                title={`Join ${currentCallType === 'video' ? 'Video' : 'Audio'} Call`}
              >
                {currentCallType === 'video' ? <VideoIcon size={14} /> : <Phone size={14} />}
                Join Call
              </button>
            )} */}
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 🔍 Search Bar - Only show when searching */}
            {isSearching && <SearchBar />}
            {/* Enhanced Status Bar */}
            {/* Enhanced Status Bar */}
{!isSearching && (
  <div className="px-3 py-2 border-b text-xs text-gray-600 flex justify-between items-center bg-gray-50">
    <div className="flex items-center gap-2">
      {currentUser?.profileImage ? (
        <img
          src={currentUser.profileImage}
          alt="You"
          className="w-5 h-5 rounded-full object-cover border border-gray-300"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
          <User size={10} />
        </div>
      )}
      {/* ✅ FIX: Show proper user name instead of "Guest" */}
      <span className="font-medium">
        {currentUser?.firstName && currentUser?.lastName 
          ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
          : currentUser?.firstName || currentUser?.lastName || currentUser?.email || username || "You"
        }
      </span>
      {isTyping && (
        <span className="text-indigo-600 flex items-center gap-1">
          <Activity size={10} className="animate-pulse" /> Typing...
        </span>
      )}
      {unreadCount > 0 && (
        <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
          {unreadCount} new
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      {activeUsers.length > 0 && (
        <span className="text-green-600 flex items-center gap-1">
          {/* <Circle size={8} className="fill-current" />
          {activeUsers.length} in call */}
        </span>
      )}
      <button onClick={manualRefresh} disabled={loading} className="text-gray-500 hover:text-indigo-600 transition-colors p-1 rounded-full" title="Refresh Messages">
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  </div>
)}
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 chat-messages pb-16">
              {loading ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin" />
                  Loading messages...
                </div>
              ) : error ? (
                <div className="text-center py-10 text-red-500 flex flex-col items-center gap-2">
                  <AlertCircle size={20} />
                  {error}
                  <button
                    onClick={handleManualReconnect}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 mt-2"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : isSearching ? (
                filteredPosts.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Search size={32} className="mx-auto mb-2 text-gray-400" />
                    <p>No messages found for "{searchQuery}"</p>
                    <button
                      onClick={clearSearch}
                      className="text-blue-500 text-sm hover:underline mt-2"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <ThreadCard
                      key={post.id}
                      id={`post-${post.id}`}
                      thread={post}
                      currentUsername={username}
                      currentUser={currentUser}
                      onRetry={retrySend}
                    />
                  ))
                )
              ) : posts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <MessageCircle size={32} className="mx-auto mb-2 text-gray-400" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <ThreadCard
                    key={post.id}
                    id={`post-${post.id}`}
                    thread={post}
                    currentUsername={username}
                    currentUser={currentUser}
                    onRetry={retrySend}
                  />
                ))
              )}
              <div ref={postsEndRef} />
            </div>
            {/* Composer - Fixed at bottom */}
            <div className="border-t bg-white p-2 sticky bottom-0">
              <ThreadComposer
                groupId={groupId}
                onThreadCreated={handleNewPost}
                onInputStart={handleTypingStart}
                onInputEnd={handleTypingEnd}
                username={currentUser?.email || username}
              />
            </div>
          </div>
          {/* 👥 Group Members Sidebar */}
          {showMembersSidebar && GroupMembersSidebar}
        </div>
      </div>
      {/* Video/Audio Call Modals - HIDDEN */}
      {/* {(callState === 'ringing' || callState === 'calling' || isInCall) && (
        currentCallType === 'video' ? (
          <VideoCallModal
            callState={callState}
            callerName={callerName}
            isAdmin={isAdmin}
            currentUserId={username}
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            allUsers={allUsers}
            currentUser={currentUser}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onCancel={handleEndCall}
            onEndCall={handleEndCall}
            callType={currentCallType}
          />
        ) : (
          <AudioCallModal
            callState={callState}
            callerName={callerName}
            isAdmin={isAdmin}
            currentUserId={username}
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            allUsers={allUsers}
            currentUser={currentUser}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onCancel={handleEndCall}
            onEndCall={handleEndCall}
          />
        )
      )} */}
      {/* 👥 Individual Call Modal - HIDDEN */}
      <IndividualCallModal />
      {/* 📧 Email Notification Modal */}
      {showEmailModal && (
        <EmailNotificationModal
          isOpen={true}
          onClose={() => setShowEmailModal(false)}
          inspectionId={inspectionId}
          onProceed={handleProceedAfterEmail}
        />
      )}
      {/* ⚙️ Media Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Settings size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-gray-900">Media Settings</h3>
                  <p className="text-sm text-gray-500">Configure your audio and video devices for optimal call quality</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              {/* Camera Section - Full Width */}
              <div className="group">
                <h4 className="font-semibold mb-3 flex items-center gap-3 text-gray-800 text-lg">
                  <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <VideoIcon size={20} className="text-green-600" />
                  </div>
                  Camera
                </h4>
                <div className="relative">
                  <select
                    value={selectedCamera}
                    onChange={(e) => {
                      setSelectedCamera(e.target.value);
                      localStorage.setItem('selectedCamera', e.target.value);
                    }}
                    className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md text-sm leading-relaxed"
                  >
                    {videoDevices.length === 0 ? (
                      <option value="" className="text-gray-500">No camera devices available</option>
                    ) : (
                      videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId} className="py-1 text-sm text-gray-900 max-w-none break-words">
                          {device.label || `Camera ${device.deviceId.slice(-4)}`}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
              {/* Mic and Speaker in same row */}
              <div className="grid grid-cols-2 gap-6">
                {/* Microphone */}
                <div className="group">
                  <h4 className="font-semibold mb-3 flex items-center gap-3 text-gray-800 text-lg">
                    <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                      <Mic size={20} className="text-red-600" />
                    </div>
                    Microphone
                  </h4>
                  <div className="relative">
                    <select
                      value={selectedMic}
                      onChange={(e) => {
                        setSelectedMic(e.target.value);
                        localStorage.setItem('selectedMic', e.target.value);
                      }}
                      className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md text-sm leading-relaxed"
                    >
                      {audioDevices.length === 0 ? (
                        <option value="" className="text-gray-500">No microphone devices available</option>
                      ) : (
                        audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId} className="py-1 text-sm text-gray-900 max-w-none break-words">
                            {device.label || `Microphone ${device.deviceId.slice(-4)}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>
                {/* Speaker */}
                <div className="group">
                  <h4 className="font-semibold mb-3 flex items-center gap-3 text-gray-800 text-lg">
                    <div className="p-2 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                      <Volume2 size={20} className="text-purple-600" />
                    </div>
                    Speaker
                  </h4>
                  <div className="relative">
                    <select
                      value={selectedSpeaker}
                      onChange={(e) => {
                        setSelectedSpeaker(e.target.value);
                        localStorage.setItem('selectedSpeaker', e.target.value);
                      }}
                      className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md text-sm leading-relaxed"
                    >
                      {audioOutputDevices.length === 0 ? (
                        <option value="" className="text-gray-500">No speaker devices available</option>
                      ) : (
                        audioOutputDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId} className="py-1 text-sm text-gray-900 max-w-none break-words">
                            {device.label || `Speaker ${device.deviceId.slice(-4)}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}