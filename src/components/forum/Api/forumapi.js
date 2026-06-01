// src/components/forum/Api/forumapi.js
import axios from "axios";

const forumApi = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
});

// ===== SMART API DETECTION =====
const getApiBase = (groupId) => {
  const groupIdStr = String(groupId);
  
  // If it's numeric, use MAIN forum
  if (!isNaN(groupIdStr) && groupIdStr !== '') {
    return '/forum';  // ← This is wrong for 8D events!
  }
  
  // If it contains "EVT-" or is string, use 8D forum
  return '/forum/8d';
};

// ===== SMART API FUNCTIONS =====

// Group creation - MAIN FORUM ONLY (masters create numeric groups)
export const createForumGroup = (groupData) => forumApi.post('/forum/groups', groupData);

// Get threads/posts - SMART DETECTION
export const fetchGroupThreads = (groupId) => {
  const base = getApiBase(groupId);
  // Main forum uses /posts, 8D forum uses /threads
  const endpoint = base === '/forum' ? 'posts' : 'threads';
  return forumApi.get(`${base}/groups/${encodeURIComponent(groupId)}/${endpoint}`).then(r => r.data);
};

// Create post/thread - SMART DETECTION  
export const createForumPost = (groupId, postData) => {
  const base = getApiBase(groupId);
  const endpoint = base === '/forum' ? 'posts' : 'threads';
  return forumApi.post(`${base}/groups/${groupId}/${endpoint}`, postData).then(r => r.data);
};

// Upload attachment - SMART DETECTION
export const uploadForumAttachment = (groupId, file) => {
  const base = getApiBase(groupId);
  const endpoint = base === '/forum' ? 'posts/upload' : 'threads/upload';
  
  const formData = new FormData();
  formData.append('file', file);
  
  return forumApi.post(`${base}/groups/${groupId}/${endpoint}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

// ===== EXISTING MAIN FORUM APIS (UNCHANGED) =====
export const sendCallNotification = async (groupId, action, caller, callerName, targetUser = null) => {
  const response = await fetch('http://localhost:8080/api/forum/call-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, action, caller, callerName, targetUser, timestamp: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error('Failed to send call notification');
  return await response.json();
};

export const checkActiveCalls = async (groupId) => {
  const response = await fetch(`http://localhost:8080/api/forum/active-calls?groupId=${groupId}`);
  if (!response.ok) throw new Error('Failed to check active calls');
  return await response.json();
};

export const deleteForumGroup = (groupId, requestedBy) =>
  forumApi.delete(`/forum/groups/${groupId}`, { params: { requestedBy } }).then(r => r.data);

export const updateForumGroup = (groupId, updates) =>
  forumApi.put(`/forum/groups/${groupId}`, updates).then(r => r.data);

export const fetchAllGroups = () => forumApi.get('/forum/groups/all').then(r => r.data);

export const fetchUserGroups = (email) => forumApi.get('/forum/groups', { params: { email } }).then(r => r.data);

export const downloadForumAttachment = (attachmentId, responseType = 'blob') =>
  forumApi.get(`/forum/attachments/${attachmentId}`, { responseType }).then(r => r.data);

export const fetchLineGroups = () => forumApi.get('/forum/groups/lines').then(r => r.data);

export const fetchLineGroupByCode = (lineCode) =>
  forumApi.get(`/forum/groups/line/${encodeURIComponent(lineCode)}`).then(r => r.data);

// Add these functions to your forumapi.js

// Member Management APIs
export const addGroupMembers = (groupId, newMembers) => {
  return forumApi.post(`/forum/8d/groups/${groupId}/members`, {
    newMembers: newMembers
  }).then(r => r.data);
};

export const removeGroupMembers = (groupId, membersToRemove) => {
  return forumApi.delete(`/forum/8d/groups/${groupId}/members`, {
    data: { membersToRemove: membersToRemove }
  }).then(r => r.data);
};

export const getGroupMembers = (groupId) => {
  return forumApi.get(`/forum/8d/groups/${groupId}/members`).then(r => r.data);
};

export const getGroupMembersWithDetails = (groupId, currentUser) => {
  return forumApi.get(`/forum/8d/groups/${groupId}/members/details`, {
    params: { currentUser }
  }).then(r => r.data);
};

export const checkGroupMembership = (groupId, userEmail) => {
  return forumApi.get(`/forum/8d/groups/${groupId}/members/check`, {
    params: { userEmail }
  }).then(r => r.data);
};

// ===== NCR FORUM SPECIFIC APIS =====
// These provide convenient methods for NCR form-specific forums

/**
 * Create or get forum for an NCR form
 * Each NCR form gets its own forum with groupId: NCR-{formId}
 */
export const createOrGetNCRForum = (formId, forumData) => {
  return forumApi.post(`/forum/ncr/forms/${formId}/forum`, forumData).then(r => r.data);
};

/**
 * Get all threads/discussions for an NCR form
 */
export const getNCRForumThreads = (formId) => {
  return forumApi.get(`/forum/ncr/forms/${formId}/threads`).then(r => r.data);
};

/**
 * Create a new thread/discussion in NCR forum
 */
export const createNCRForumThread = (formId, threadData) => {
  return forumApi.post(`/forum/ncr/forms/${formId}/threads`, threadData).then(r => r.data);
};

/**
 * Upload attachment to NCR forum
 */
export const uploadNCRForumAttachment = (formId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return forumApi.post(`/forum/ncr/forms/${formId}/threads/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

/**
 * Download attachment from NCR forum
 */
export const downloadNCRForumAttachment = (formId, attachmentId) => {
  return forumApi.get(`/forum/ncr/forms/${formId}/attachments/${attachmentId}`, {
    responseType: 'blob'
  }).then(r => r.data);
};

/**
 * Add members to NCR forum
 */
export const addNCRForumMembers = (formId, members) => {
  return forumApi.post(`/forum/ncr/forms/${formId}/members`, {
    members: members
  }).then(r => r.data);
};

/**
 * Get members of NCR forum
 */
export const getNCRForumMembers = (formId) => {
  return forumApi.get(`/forum/ncr/forms/${formId}/members`).then(r => r.data);
};

/**
 * Check if user is member of NCR forum
 */
export const checkNCRForumMembership = (formId, userEmail) => {
  return forumApi.get(`/forum/ncr/forms/${formId}/members/check`, {
    params: { userEmail }
  }).then(r => r.data);
};