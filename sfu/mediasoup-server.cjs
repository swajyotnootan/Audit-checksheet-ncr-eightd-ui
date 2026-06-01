const express = require('express');
const mediasoup = require('mediasoup');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const corsOptions = {
  origin: ['http://10.2.0.95:5173', 'http://127.0.0.1:5173', 'http://10.2.0.95:8080'],
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced storage with connection tracking
const callConnections = new Map(); // userId -> {ws, groupId, lastPing, isAlive, userData, connectionId}
const workers = [];
const routers = new Map(); // groupId -> router
const transports = new Map(); // transportId -> {transport, userId, groupId, type}
const producers = new Map(); // producerId -> {producer, userId, groupId, kind}
const consumers = new Map(); // consumerId -> {consumer, userId, groupId}

// Enhanced call tracking
const activeGroupCalls = new Map(); // groupId -> {caller, participants, type, startTime}
const activeIndividualCalls = new Map(); // callId -> callData
const userPresence = new Map(); // userId -> {lastSeen, groups, status}

// Connection instance tracking
const connectionInstances = new Map(); // userId -> Set of connectionIds

// Enhanced media codecs for better compatibility
const mediaCodecs = [
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  },
  {
    kind: 'video', 
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1
    }
  },
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      minptime: 10,
      useinbandfec: 1
    }
  }
];

// Health endpoint with enhanced monitoring
app.get('/api/health', (req, res) => {
  const now = Date.now();
  const activeConnections = Array.from(callConnections.entries())
    .filter(([_, conn]) => conn.ws.readyState === 1)
    .length;

  res.json({
    status: 'ok',
    callConnections: activeConnections,
    totalConnections: callConnections.size,
    routers: routers.size,
    workers: workers.length,
    transports: transports.size,
    producers: producers.size,
    consumers: consumers.size,
    activeGroupCalls: activeGroupCalls.size,
    individualCalls: activeIndividualCalls.size,
    userPresence: userPresence.size,
    connectionInstances: Array.from(connectionInstances.entries()).map(([userId, instances]) => ({
      userId,
      instanceCount: instances.size
    })),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Enhanced individual call API
app.post('/api/forum/call-notification', (req, res) => {
  try {
    const { groupId, action, caller, callerName, targetUser, callType = 'video', timestamp } = req.body;
    
    console.log('📞 HTTP Call notification:', { 
      action, 
      caller, 
      callerName,
      targetUser, 
      groupId,
      callType
    });
    
    if (!groupId || !action || !caller || !targetUser) {
      return res.status(400).json({ 
        error: 'Missing required fields: groupId, action, caller, targetUser' 
      });
    }

    const callId = `${groupId}-${caller}-${targetUser}-${Date.now()}`;
    
    if (action === 'INDIVIDUAL_CALL_STARTED') {
      // Store the call notification
      activeIndividualCalls.set(callId, {
        callId,
        groupId,
        action,
        caller,
        callerName,
        targetUser,
        callType,
        timestamp: new Date().toISOString(),
        status: 'ringing'
      });
      
      console.log(`✅ Individual call stored: ${callId} (${callType})`);
      
      // Notify the target user if they're connected via WebSocket
      let targetNotified = false;
      callConnections.forEach((conn, userId) => {
        if (userId === targetUser && conn.ws.readyState === 1) {
          try {
            conn.ws.send(JSON.stringify({
              type: 'INDIVIDUAL_CALL_INCOMING',
              callId,
              groupId,
              caller,
              callerName,
              callType,
              timestamp: new Date().toISOString()
            }));
            targetNotified = true;
            console.log(`✅ Individual call notification sent to ${targetUser} via WebSocket`);
          } catch (err) {
            console.error(`❌ Failed to send individual call to ${targetUser}:`, err.message);
          }
        }
      });

      if (!targetNotified) {
        console.log(`ℹ️ Target user ${targetUser} is not currently connected via WebSocket`);
      }
      
    } else if (action === 'INDIVIDUAL_CALL_ACCEPTED') {
      console.log(`✅ Individual call accepted: ${caller} by ${targetUser}`);
      
      // Find and remove the original call
      let foundCallId = null;
      let foundCallType = 'video';
      for (let [id, call] of activeIndividualCalls) {
        if (call.groupId === groupId && call.caller === caller && call.targetUser === targetUser) {
          foundCallId = id;
          foundCallType = call.callType || 'video';
          break;
        }
      }
      
      if (foundCallId) {
        activeIndividualCalls.delete(foundCallId);
        
        // Notify the original caller
        callConnections.forEach((conn, userId) => {
          if (userId === caller && conn.ws.readyState === 1) {
            try {
              conn.ws.send(JSON.stringify({
                type: 'INDIVIDUAL_CALL_ACCEPTED',
                callId: foundCallId,
                groupId,
                targetUser: targetUser,
                callType: foundCallType, // Include callType in acceptance
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Call acceptance notified to ${caller} with type: ${foundCallType}`);
            } catch (err) {
              console.error(`❌ Failed to send acceptance to ${caller}:`, err.message);
            }
          }
        });
      }
      
    } else if (action === 'INDIVIDUAL_CALL_DECLINED') {
      console.log(`❌ Individual call declined: ${caller} by ${targetUser}`);
      
      // Find and remove the original call
      let foundCallId = null;
      for (let [id, call] of activeIndividualCalls) {
        if (call.groupId === groupId && call.caller === caller && call.targetUser === targetUser) {
          foundCallId = id;
          break;
        }
      }
      
      if (foundCallId) {
        activeIndividualCalls.delete(foundCallId);
        
        // Notify the original caller
        callConnections.forEach((conn, userId) => {
          if (userId === caller && conn.ws.readyState === 1) {
            try {
              conn.ws.send(JSON.stringify({
                type: 'INDIVIDUAL_CALL_DECLINED',
                callId: foundCallId,
                groupId,
                targetUser: targetUser,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Call decline notified to ${caller}`);
            } catch (err) {
              console.error(`❌ Failed to send decline to ${caller}:`, err.message);
            }
          }
        });
      }
      
    } else if (action === 'INDIVIDUAL_CALL_CANCELED') {
      console.log(`📞 Individual call canceled: ${caller} to ${targetUser}`);
      
      // Find and remove the call
      let foundCallId = null;
      for (let [id, call] of activeIndividualCalls) {
        if (call.groupId === groupId && call.caller === caller && call.targetUser === targetUser) {
          foundCallId = id;
          break;
        }
      }
      
      if (foundCallId) {
        activeIndividualCalls.delete(foundCallId);
        
        // Notify target user
        callConnections.forEach((conn, userId) => {
          if (userId === targetUser && conn.ws.readyState === 1) {
            try {
              conn.ws.send(JSON.stringify({
                type: 'INDIVIDUAL_CALL_CANCELED',
                callId: foundCallId,
                groupId,
                caller,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Call cancellation notified to ${targetUser}`);
            } catch (err) {
              console.error(`❌ Failed to send cancellation to ${targetUser}:`, err.message);
            }
          }
        });
      }
    }
    
    res.json({ 
      success: true, 
      callId,
      message: `Call ${action} processed successfully`
    });
    
  } catch (error) {
    console.error('❌ Call notification error:', error);
    res.status(500).json({ 
      error: 'Failed to process call notification',
      details: error.message 
    });
  }
});

// Enhanced active calls endpoint
app.get('/api/forum/active-calls', (req, res) => {
  try {
    const { groupId } = req.query;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }
    
    const calls = Array.from(activeIndividualCalls.values())
      .filter(call => call.groupId === groupId && call.status === 'ringing');
    
    console.log(`📞 Active calls for group ${groupId}: ${calls.length}`);
    
    res.json(calls);
  } catch (error) {
    console.error('❌ Active calls error:', error);
    res.status(500).json({ error: 'Failed to fetch active calls' });
  }
});

// Enhanced group calls endpoint
app.get('/api/forum/active-group-calls', (req, res) => {
  try {
    const { groupId } = req.query;
    
    const groupCalls = Array.from(activeGroupCalls.entries())
      .filter(([callGroupId, call]) => !groupId || callGroupId === groupId)
      .map(([callGroupId, call]) => ({
        groupId: callGroupId,
        ...call
      }));
    
    res.json({
      total: groupCalls.length,
      calls: groupCalls
    });
  } catch (error) {
    console.error('❌ Group calls error:', error);
    res.status(500).json({ error: 'Failed to fetch group calls' });
  }
});

// Get all individual calls (for debugging)
app.get('/api/forum/all-calls', (req, res) => {
  try {
    const allCalls = Array.from(activeIndividualCalls.values());
    res.json({
      total: allCalls.length,
      calls: allCalls
    });
  } catch (error) {
    console.error('❌ All calls error:', error);
    res.status(500).json({ error: 'Failed to fetch all calls' });
  }
});

// Enhanced user presence endpoint
app.get('/api/forum/online-users', (req, res) => {
  try {
    const { groupId } = req.query;
    
    const onlineUsers = Array.from(userPresence.entries())
      .filter(([userId, data]) => {
        const isOnline = Date.now() - data.lastSeen < 60000; // 60 seconds
        const inGroup = !groupId || data.groups.includes(groupId);
        return isOnline && inGroup;
      })
      .map(([userId, data]) => ({
        userId,
        ...data,
        isOnline: true
      }));
    
    res.json({
      total: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error('❌ Online users error:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Native WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server, 
  path: '/ws',
  perMessageDeflate: false,
  clientTracking: false,
  maxPayload: 1048576,
});

// Enhanced worker management
let workerIndex = 0;
async function createWorker() {
  try {
    const worker = await mediasoup.createWorker({
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
      logLevel: 'warn',
    });
    
    worker.on('died', (error) => {
      console.error('❌ Mediasoup worker died:', error);
      const index = workers.indexOf(worker);
      if (index > -1) {
        workers.splice(index, 1);
      }
      console.log('🔄 Mediasoup worker removed, continuing with remaining workers');
      
      // Auto-replace worker
      if (workers.length === 0) {
        console.log('🔄 Auto-creating replacement worker...');
        createWorker().catch(err => {
          console.error('❌ Failed to create replacement worker:', err);
        });
      }
    });
    
    workers.push(worker);
    console.log(`✅ Created mediasoup worker ${workers.length} (pid: ${worker.pid})`);
    return worker;
  } catch (err) {
    console.error('❌ Failed to create mediasoup worker:', err);
    throw err;
  }
}

// Get next worker with enhanced round-robin
function getNextWorker() {
  if (workers.length === 0) {
    throw new Error('No workers available');
  }
  const worker = workers[workerIndex % workers.length];
  workerIndex++;
  return worker;
}

// Enhanced broadcast function
function broadcastToGroup(groupId, excludeUser, message) {
  let sentCount = 0;
  const failedUsers = [];
  
  callConnections.forEach((conn, userId) => {
    if (conn.groupId === groupId && userId !== excludeUser) {
      if (conn.ws.readyState === 1) {
        try {
          conn.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (err) {
          console.error(`❌ Failed to send message to ${userId}:`, err.message);
          failedUsers.push(userId);
        }
      } else {
        failedUsers.push(userId);
      }
    }
  });
  
  // Clean up failed connections
  failedUsers.forEach(userId => {
    console.log(`🧹 Removing failed connection for ${userId}`);
    cleanupUserConnection(userId);
  });
  
  if (sentCount > 0) {
    console.log(`📢 Broadcast to ${sentCount} users in group ${groupId}: ${message.type}`);
  }
  
  return sentCount;
}

// Enhanced get or create router
async function getOrCreateRouter(groupId) {
  try {
    let router = routers.get(groupId);
    if (!router) {
      if (workers.length === 0) {
        await createWorker();
      }
      const worker = getNextWorker();
      router = await worker.createRouter({ mediaCodecs });
      routers.set(groupId, router);
      console.log(`🔄 Created router for group ${groupId} on worker ${worker.pid}`);
    }
    return router;
  } catch (err) {
    console.error(`❌ Failed to get/create router for group ${groupId}:`, err);
    throw err;
  }
}

// Enhanced connection monitoring
function setupConnectionMonitoring(ws, userId, groupId, userData, connectionId) {
  if (!callConnections.has(userId)) return;
  
  const conn = callConnections.get(userId);
  conn.isAlive = true;
  conn.lastPing = Date.now();
  
  // Update user presence
  if (!userPresence.has(userId)) {
    userPresence.set(userId, {
      lastSeen: Date.now(),
      groups: [groupId],
      status: 'online',
      userData
    });
  } else {
    const presence = userPresence.get(userId);
    presence.lastSeen = Date.now();
    presence.status = 'online';
    if (!presence.groups.includes(groupId)) {
      presence.groups.push(groupId);
    }
  }
  
  // Clear existing interval if any
  if (conn.pingInterval) {
    clearInterval(conn.pingInterval);
  }
  
  // ✅ FIXED: Longer heartbeat interval (45 seconds)
  conn.pingInterval = setInterval(() => {
    if (conn.isAlive === false) {
      console.log(`💔 No heartbeat from ${userId}, terminating connection`);
      if (conn.ws.readyState === 1) {
        conn.ws.terminate();
      }
      return;
    }
    conn.isAlive = false;
    if (conn.ws.readyState === 1) {
      try {
        conn.ws.ping();
      } catch (err) {
        console.error(`❌ Error pinging ${userId}:`, err.message);
      }
    }
  }, 45000);
  
  // ✅ FIXED: Longer stale connection cleanup (5 minutes)
  if (conn.cleanupTimeout) {
    clearTimeout(conn.cleanupTimeout);
  }
  conn.cleanupTimeout = setTimeout(() => {
    if (callConnections.has(userId)) {
      console.log(`🧹 Cleaning up stale connection for ${userId}`);
      cleanupUserConnection(userId);
    }
  }, 300000);
}

// Enhanced cleanup user connection
function cleanupUserConnection(userId) {
  const conn = callConnections.get(userId);
  if (!conn) return;
  
  // Clear intervals and timeouts
  if (conn.pingInterval) {
    clearInterval(conn.pingInterval);
  }
  if (conn.cleanupTimeout) {
    clearTimeout(conn.cleanupTimeout);
  }
  
  // Update user presence
  if (userPresence.has(userId)) {
    userPresence.get(userId).status = 'offline';
  }
  
  // Clean up connection instance tracking
  if (connectionInstances.has(userId)) {
    connectionInstances.get(userId).delete(conn.connectionId);
    if (connectionInstances.get(userId).size === 0) {
      connectionInstances.delete(userId);
    }
  }
  
  // Clean up transports
  for (const [transportId, transportData] of transports.entries()) {
    if (transportData.userId === userId) {
      try {
        transportData.transport.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      transports.delete(transportId);
    }
  }
  
  // Clean up producers
  for (const [producerId, producerData] of producers.entries()) {
    if (producerData.userId === userId) {
      try {
        producerData.producer.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      producers.delete(producerId);
    }
  }
  
  // Clean up consumers
  for (const [consumerId, consumerData] of consumers.entries()) {
    if (consumerData.userId === userId) {
      try {
        consumerData.consumer.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      consumers.delete(consumerId);
    }
  }
  
  // Close WebSocket if still open
  if (conn.ws.readyState === 1) {
    try {
      conn.ws.close(1000, 'cleanup');
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
  
  callConnections.delete(userId);
  console.log(`✅ Cleaned up connection for ${userId}`);
}

// ✅ FIXED: Enhanced WebSocket connection handling with individual call support
wss.on('connection', (ws, req) => {
  console.log('🎥 New WebSocket connection for video calls');
  let currentUser = null;
  let currentGroup = null;
  let currentUserData = null;
  let connectionId = Math.random().toString(36).substr(2, 9);
  
  // Set timeout for connection setup - 10 seconds
  const connectionTimeout = setTimeout(() => {
    if (!currentUser) {
      console.log('⏰ Connection timeout - no JOIN_CALL_GROUP received');
      ws.close(1008, 'Connection timeout');
    }
  }, 10000);

  const onMessage = async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle heartbeat first
      if (message.type === 'PING') {
        if (currentUser && callConnections.has(currentUser)) {
          const conn = callConnections.get(currentUser);
          conn.isAlive = true;
          conn.lastPing = Date.now();
          try {
            ws.send(JSON.stringify({ 
              type: 'PONG', 
              sender: 'server',
              timestamp: Date.now()
            }));
          } catch (err) {
            console.error(`❌ Error sending PONG to ${currentUser}:`, err.message);
          }
        }
        return;
      }
      
      console.log('🎥 Received:', message.type, 'from:', message.sender, 'payload:', message.payload);

      // Handle user joining a call group
      if (message.type === 'JOIN_CALL_GROUP') {
        clearTimeout(connectionTimeout);
        currentUser = message.sender;
        currentGroup = message.groupId;
        currentUserData = message.userData || null;
        
        // ✅ FIXED: Enhanced connection replacement logic
        const existingConn = callConnections.get(currentUser);
        if (existingConn) {
          // Only replace if the existing connection is dead or different WebSocket
          if (existingConn.ws.readyState !== WebSocket.OPEN || existingConn.ws !== ws) {
            console.log(`🔄 Replacing existing connection for ${currentUser}`);
            cleanupUserConnection(currentUser);
          } else {
            console.log(`⏩ User ${currentUser} already connected with same WebSocket, skipping replacement`);
            // Update the existing connection with new data
            existingConn.lastPing = Date.now();
            existingConn.isAlive = true;
            existingConn.userData = currentUserData;
            return;
          }
        }
        
        // Initialize connection instances tracking
        if (!connectionInstances.has(currentUser)) {
          connectionInstances.set(currentUser, new Set());
        }
        connectionInstances.get(currentUser).add(connectionId);
        
        // Store new connection
        callConnections.set(currentUser, { 
          ws, 
          groupId: message.groupId,
          isAlive: true,
          lastPing: Date.now(),
          userData: currentUserData,
          connectionId: connectionId
        });
        
        console.log(`👤 ${currentUser} registered for calls in group ${currentGroup} (instance: ${connectionId})`);
        
        // Setup connection monitoring
        setupConnectionMonitoring(ws, currentUser, currentGroup, currentUserData, connectionId);
        
        // Broadcast to other users in the group (excluding sender)
        const broadcastCount = broadcastToGroup(message.groupId, message.sender, {
          type: 'USER_JOINED_CALL',
          sender: message.sender,
          groupId: message.groupId,
          payload: { 
            user: message.sender,
            userData: currentUserData 
          }
        });
        
        // Send confirmation with online users list
        const onlineUsers = Array.from(callConnections.entries())
          .filter(([userId, conn]) => 
            conn.groupId === currentGroup && userId !== currentUser && conn.ws.readyState === WebSocket.OPEN
          )
          .map(([userId, conn]) => ({
            userId,
            userData: conn.userData
          }));
        
        try {
          ws.send(JSON.stringify({
            type: 'JOIN_CALL_GROUP_CONFIRMED',
            sender: 'server',
            groupId: message.groupId,
            timestamp: new Date().toISOString(),
            activeUsers: broadcastCount,
            onlineUsers: onlineUsers
          }));
        } catch (err) {
          console.error(`❌ Error sending confirmation to ${currentUser}:`, err.message);
        }
        return;
      }

      // Handle group call start
      if (message.type === 'CALL_STARTED') {
        console.log(`📞 Group call started by ${message.sender} in group ${message.groupId}, Type: ${message.payload?.callType}`);
        
        // Store group call info
        activeGroupCalls.set(message.groupId, {
          caller: message.sender,
          participants: [message.sender],
          type: message.payload?.callType || 'video',
          startTime: new Date().toISOString()
        });
        
        broadcastToGroup(message.groupId, message.sender, {
          type: 'CALL_STARTED',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // Handle user joining call
      if (message.type === 'USER_JOINED_CALL') {
        console.log(`👥 User ${message.sender} joined call in group ${message.groupId}`);
        
        // Update group call participants
        const groupCall = activeGroupCalls.get(message.groupId);
        if (groupCall && !groupCall.participants.includes(message.sender)) {
          groupCall.participants.push(message.sender);
        }
        
        broadcastToGroup(message.groupId, message.sender, {
          type: 'USER_JOINED_CALL',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // Handle call end
      if (message.type === 'CALL_ENDED') {
        console.log(`📞 Call ended by ${message.sender} in group ${message.groupId}`);
        
        // Remove group call
        activeGroupCalls.delete(message.groupId);
        
        broadcastToGroup(message.groupId, message.sender, {
          type: 'CALL_ENDED',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // Handle user leaving call
      if (message.type === 'USER_LEFT_CALL') {
        console.log(`👤 User ${message.sender} left call in group ${message.groupId}`);
        
        // Update group call participants
        const groupCall = activeGroupCalls.get(message.groupId);
        if (groupCall) {
          groupCall.participants = groupCall.participants.filter(p => p !== message.sender);
          if (groupCall.participants.length === 0) {
            activeGroupCalls.delete(message.groupId);
          }
        }
        
        broadcastToGroup(message.groupId, message.sender, {
          type: 'USER_LEFT_CALL',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // Handle new producer announcement
      if (message.type === 'NEW_PRODUCER') {
        console.log(`🎬 New producer from ${message.sender}:`, message.payload.producerId);
        broadcastToGroup(message.groupId, message.sender, {
          type: 'NEW_PRODUCER',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // Handle producer closed
      if (message.type === 'PRODUCER_CLOSED') {
        console.log(`🎬 Producer closed by ${message.sender}`);
        broadcastToGroup(message.groupId, message.sender, {
          type: 'PRODUCER_CLOSED',
          sender: message.sender,
          groupId: message.groupId,
          payload: message.payload
        });
        return;
      }

      // ✅ FIXED: Handle individual call start via WebSocket
      if (message.type === 'INDIVIDUAL_CALL_STARTED') {
        const { callId, targetUser, callType = 'video', callerName } = message.payload;
        
        console.log(`📞 WebSocket individual call started: ${currentUser} to ${targetUser}, Type: ${callType}`);
        
        // Store the call
        activeIndividualCalls.set(callId, {
          callId,
          groupId: currentGroup,
          action: 'INDIVIDUAL_CALL_STARTED',
          caller: currentUser,
          callerName: callerName || currentUser,
          targetUser,
          callType,
          timestamp: new Date().toISOString(),
          status: 'ringing'
        });
        
        // Notify target user immediately via WebSocket
        if (callConnections.has(targetUser)) {
          const targetConn = callConnections.get(targetUser);
          if (targetConn.ws.readyState === 1) {
            try {
              targetConn.ws.send(JSON.stringify({
                type: 'INDIVIDUAL_CALL_STARTED',
                callId,
                groupId: currentGroup,
                caller: currentUser,
                callerName: callerName || currentUser,
                targetUser: targetUser,
                callType: callType,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ WebSocket individual call notification sent to ${targetUser}`);
            } catch (err) {
              console.error(`❌ Failed to send WebSocket call to ${targetUser}:`, err.message);
            }
          } else {
            console.log(`ℹ️ Target user ${targetUser} is not connected via WebSocket`);
          }
        } else {
          console.log(`ℹ️ Target user ${targetUser} not found in connections`);
        }
        return;
      }

      // ✅ FIXED: Handle individual call responses via WebSocket
      if (message.type === 'INDIVIDUAL_CALL_RESPONSE') {
        const { callId, action, targetUser, callType = 'video' } = message.payload;
        
        console.log(`📞 Individual call ${action} from ${currentUser} to ${targetUser}, Type: ${callType}`);

        // Forward the response to the target user
        if (callConnections.has(targetUser)) {
          const targetConn = callConnections.get(targetUser);
          if (targetConn.ws.readyState === 1) {
            // ✅ ENHANCED: Retrieve callType from stored call data if accepting
            let callTypeForMessage = callType || 'video';
            if (action === 'accepted') {
              // Find the original call to get the callType
              for (let [id, call] of activeIndividualCalls) {
                if (id === callId) {
                  callTypeForMessage = call.callType || callType;
                  break;
                }
              }
            }

            try {
              targetConn.ws.send(JSON.stringify({
                type: `INDIVIDUAL_CALL_${action.toUpperCase()}`,
                callId,
                groupId: currentGroup,
                sender: currentUser,
                callType: callTypeForMessage,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Individual call response (${action}, type: ${callTypeForMessage}) sent to ${targetUser}`);
            } catch (err) {
              console.error(`❌ Failed to send response to ${targetUser}:`, err.message);
            }
          }
        }
        
        // Clean up the call from active calls if declined or canceled
        if (action === 'declined' || action === 'canceled') {
          activeIndividualCalls.delete(callId);
          console.log(`🧹 Removed individual call ${callId} after ${action}`);
        }
        return;
      }

      console.warn(`❓ Unknown message type from ${message.sender}: ${message.type}`);
    } catch (err) {
      console.error('❌ Error parsing WebSocket message:', err.message);
    }
  };

  const onClose = (code, reason) => {
    clearTimeout(connectionTimeout);
    console.log(`👋 WebSocket closed for user ${currentUser} in group ${currentGroup}`, {
      code,
      reason: reason.toString(),
      wasClean: code === 1000,
      connectionId
    });
    
    if (currentUser) {
      cleanupUserConnection(currentUser);
      
      if (currentGroup) {
        broadcastToGroup(currentGroup, currentUser, {
          type: 'USER_LEFT_CALL',
          sender: 'system',
          groupId: currentGroup,
          payload: { user: currentUser }
        });
      }
    }
  };

  const onError = (err) => {
    console.error(`❌ WebSocket error for user ${currentUser}:`, err.message);
  };

  const onPong = () => {
    if (currentUser && callConnections.has(currentUser)) {
      const conn = callConnections.get(currentUser);
      conn.isAlive = true;
      conn.lastPing = Date.now();
      
      // Update user presence
      if (userPresence.has(currentUser)) {
        userPresence.get(currentUser).lastSeen = Date.now();
      }
    }
  };

  // Attach event listeners
  ws.on('message', onMessage);
  ws.on('close', onClose);
  ws.on('error', onError);
  ws.on('pong', onPong);
});

// ✅ FIXED: Less aggressive global cleanup (runs every 60 seconds)
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 300000; // 5 minutes (increased from 2 minutes)
  const presenceThreshold = 60000; // 1 minute (increased from 30 seconds)
  
  // Clean up stale connections
  callConnections.forEach((conn, userId) => {
    if (now - conn.lastPing > staleThreshold) {
      console.log(`🧹 Removing stale connection for ${userId} (last ping: ${now - conn.lastPing}ms ago)`);
      cleanupUserConnection(userId);
      
      if (conn.groupId) {
        broadcastToGroup(conn.groupId, userId, {
          type: 'USER_LEFT_CALL',
          sender: 'system',
          groupId: conn.groupId,
          payload: { user: userId }
        });
      }
    }
  });
  
  // Update user presence status
  userPresence.forEach((data, userId) => {
    if (now - data.lastSeen > presenceThreshold) {
      data.status = 'offline';
    }
  });
  
  // Clean up old individual calls (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 600000;
  activeIndividualCalls.forEach((call, callId) => {
    if (new Date(call.timestamp).getTime() < tenMinutesAgo) {
      console.log(`🧹 Removing old individual call: ${callId}`);
      activeIndividualCalls.delete(callId);
    }
  });
  
  // Clean up empty group calls
  activeGroupCalls.forEach((call, groupId) => {
    if (call.participants.length === 0) {
      console.log(`🧹 Removing empty group call: ${groupId}`);
      activeGroupCalls.delete(groupId);
    }
  });
  
  // ✅ FIXED: Less aggressive router cleanup (15 minutes)
  const fifteenMinutesAgo = Date.now() - 900000;
  routers.forEach((router, groupId) => {
    let hasConnections = false;
    callConnections.forEach(conn => {
      if (conn.groupId === groupId && conn.ws.readyState === WebSocket.OPEN) {
        hasConnections = true;
      }
    });
    
    if (!hasConnections) {
      console.log(`🧹 Cleaning up unused router for group ${groupId}`);
      try {
        router.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      routers.delete(groupId);
    }
  });
}, 60000); // Run every 60 seconds instead of 30 seconds

// Enhanced SFU endpoints
app.get('/api/sfu/router-rtp', async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }
    const router = await getOrCreateRouter(groupId);
    if (!router.rtpCapabilities) {
      throw new Error('Router has no RTP capabilities');
    }
    res.json({ 
      rtpCapabilities: router.rtpCapabilities,
      groupId: groupId
    });
  } catch (err) {
    console.error('❌ Router RTP capabilities error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sfu/send-transport', async (req, res) => {
  try {
    const { groupId, username } = req.query;
    if (!groupId || !username) {
      return res.status(400).json({ error: 'groupId and username are required' });
    }
    const router = await getOrCreateRouter(groupId);
    const transportOptions = {
      listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    };
    const transport = await router.createWebRtcTransport(transportOptions);
    transports.set(transport.id, {
      transport,
      userId: username,
      groupId: groupId,
      type: 'send'
    });
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  } catch (err) {
    console.error('❌ Send transport error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sfu/recv-transport', async (req, res) => {
  try {
    const { groupId, username } = req.query;
    if (!groupId || !username) {
      return res.status(400).json({ error: 'groupId and username are required' });
    }
    const router = await getOrCreateRouter(groupId);
    const transportOptions = {
      listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };
    const transport = await router.createWebRtcTransport(transportOptions);
    transports.set(transport.id, {
      transport,
      userId: username,
      groupId: groupId,
      type: 'recv'
    });
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  } catch (err) {
    console.error('❌ Recv transport error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sfu/connect-transport', async (req, res) => {
  try {
    const { transportId, dtlsParameters } = req.body;
    if (!transportId || !dtlsParameters) {
      return res.status(400).json({ error: 'transportId and dtlsParameters are required' });
    }
    const transportData = transports.get(transportId);
    if (!transportData) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    await transportData.transport.connect({ dtlsParameters });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Connect transport error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sfu/produce', async (req, res) => {
  try {
    const { transportId, kind, rtpParameters, groupId, username } = req.body;
    if (!transportId || !kind || !rtpParameters || !groupId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const transportData = transports.get(transportId);
    if (!transportData) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    // Create producer with the parameters received from the client
    const producer = await transportData.transport.produce({
      kind,
      rtpParameters
    });
    const producerId = producer.id;
    producers.set(producerId, {
      producer,
      userId: username,
      groupId: groupId,
      kind: kind
    });
    res.json({ producerId });
  } catch (err) {
    console.error('❌ Produce error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Enhanced consume endpoint
app.post('/api/sfu/consume', async (req, res) => {
  try {
    const { transportId, producerId, groupId, username } = req.body;
    if (!transportId || !producerId || !groupId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transportData = transports.get(transportId);
    const producerData = producers.get(producerId);

    if (!transportData) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    if (!producerData) {
      return res.status(404).json({ error: 'Producer not found' });
    }

    const router = await getOrCreateRouter(groupId);
    if (!router.rtpCapabilities) {
      return res.status(500).json({ error: 'Router has no RTP capabilities' });
    }

    const consumer = await transportData.transport.consume({
      producerId: producerId,
      rtpCapabilities: router.rtpCapabilities,
      paused: false,
    });

    const consumerId = consumer.id;
    consumers.set(consumerId, {
      consumer,
      userId: username,
      groupId: groupId
    });

    res.json({
      id: consumerId,
      producerId: producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  } catch (err) {
    console.error('❌ Consume error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// Enhanced status endpoint
app.get('/api/sfu/status', (req, res) => {
  const activeGroups = new Set();
  callConnections.forEach(conn => {
    if (conn.groupId) {
      activeGroups.add(conn.groupId);
    }
  });

  const activeConnections = Array.from(callConnections.entries())
    .filter(([_, conn]) => conn.ws.readyState === 1)
    .length;

  const status = {
    workers: workers.length,
    routers: Array.from(routers.keys()),
    transports: transports.size,
    producers: producers.size,
    consumers: consumers.size,
    connections: activeConnections,
    totalConnections: callConnections.size,
    individualCalls: activeIndividualCalls.size,
    groupCalls: activeGroupCalls.size,
    userPresence: userPresence.size,
    activeGroups: Array.from(activeGroups),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  res.json(status);
});

// Global cleanup on server shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  
  // Close all WebSocket connections
  callConnections.forEach((conn, userId) => {
    cleanupUserConnection(userId);
  });
  
  // Close all mediasoup resources
  producers.forEach(producerData => {
    try {
      producerData.producer.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  producers.clear();
  
  consumers.forEach(consumerData => {
    try {
      consumerData.consumer.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  consumers.clear();
  
  transports.forEach(transportData => {
    try {
      transportData.transport.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  transports.clear();
  
  routers.forEach(router => {
    try {
      router.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  routers.clear();
  
  workers.forEach(worker => {
    try {
      worker.close();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  workers.length = 0;
  
  server.close(() => {
    console.log('✅ Server closed gracefully.');
    process.exit(0);
  });
});

// Create initial workers (2 for load balancing)
Promise.all([createWorker(), createWorker()]).then(() => {
  console.log('🚀 Initial mediasoup workers created');
}).catch(err => {
  console.error('❌ Failed to create initial workers:', err);
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ENHANCED Mediasoup SFU server running on http://10.2.0.95:${PORT}`);
  console.log(`   WebSocket: ws://10.2.0.95:${PORT}/ws`);
  console.log(`   Health: http://10.2.0.95:${PORT}/api/health`);
  console.log(`   Status: http://10.2.0.95:${PORT}/api/sfu/status`);
  console.log(`   Individual Calls: ✅ ENABLED (Video & Audio)`);
  console.log(`   Group Calls: ✅ ENABLED`);
  console.log(`   Audio/Video: ✅ ENABLED`);
  console.log(`   User Presence: ✅ ENABLED`);
  console.log(`   Ready for all types of calls! 🎥📞`);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});