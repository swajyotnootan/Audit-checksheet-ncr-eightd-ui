import { useState, useRef, useEffect, useCallback } from 'react';

// Global connection tracker
const globalConnectionTracker = new Map();

export const useSFU = (groupId, username) => {
  const mediasoupWsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const lastConnectionTimeRef = useRef(0);
  const connectionDebounceRef = useRef(null);
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const mountedRef = useRef(false);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isInCall, setIsInCall] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediasoupConnected, setMediasoupConnected] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [callType, setCallType] = useState('video'); // 'video' or 'audio'

  // Connection health monitoring
  const [connectionHealth, setConnectionHealth] = useState({
    lastStableTime: null,
    instabilityCount: 0,
    averageUptime: 0
  });

  // WebRTC references
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportsRef = useRef({});
  const producersRef = useRef({});
  const consumersRef = useRef({});
  const existingProducersRef = useRef(new Set());
  
  const onCallEventRef = useRef(null);

  const setOnCallEvent = useCallback((callback) => {
    onCallEventRef.current = callback;
  }, []);

  const forwardCallEvent = useCallback((event) => {
    if (onCallEventRef.current && mountedRef.current) {
      onCallEventRef.current(event);
    }
  }, []);

  // ✅ STABLE: Component lifecycle management
  useEffect(() => {
    mountedRef.current = true;
    console.log('🚀 [CLIENT] useSFU initialized for:', { groupId, username, instanceId: instanceIdRef.current });
    
    return () => {
      mountedRef.current = false;
      console.log('🧹 [CLIENT] useSFU cleanup');
      cleanupWebSocket('component_unmount');
      
      if (isInCall) {
        endCall();
      }
      
      // Remove from global tracker
      const connectionKey = `${groupId}-${username}`;
      globalConnectionTracker.delete(connectionKey);
    };
  }, [groupId, username]);

  // ✅ ENHANCED: Get local stream with audio/video support
  const getLocalStream = async (callType = 'video') => {
    try {
      console.log('🎥 [CLIENT] Requesting media stream for:', callType);
      setCameraError(null);
      
      // Clean up existing stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log stream details
      console.log('🎥 [CLIENT] Local stream obtained:', {
        callType,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTrack: stream.getVideoTracks()[0]?.label,
        audioTrack: stream.getAudioTracks()[0]?.label
      });
      
      setLocalStream(stream);
      return stream;
      
    } catch (err) {
      console.error('❌ [CLIENT] Media access failed:', err);
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied. Please allow access in your browser settings.'
        : `Media access error: ${err.message}`;
      setCameraError(errorMsg);
      throw err;
    }
  };

  // ✅ ENHANCED: Get audio-only stream
  const getAudioStream = async () => {
    try {
      console.log('🎤 [CLIENT] Requesting audio-only stream...');
      setCameraError(null);
      
      // Clean up existing stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('🎤 [CLIENT] Audio stream obtained:', {
        audioTracks: stream.getAudioTracks().length,
        audioTrack: stream.getAudioTracks()[0]?.label
      });
      
      setLocalStream(stream);
      return stream;
      
    } catch (err) {
      console.error('❌ [CLIENT] Audio access failed:', err);
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow access in your browser settings.'
        : `Microphone access error: ${err.message}`;
      setCameraError(errorMsg);
      throw err;
    }
  };

  // ✅ STABLE: Enhanced WebSocket cleanup
  const cleanupWebSocket = useCallback((reason = 'manual_cleanup') => {
    if (!mountedRef.current) return;
    
    console.log('🧹 [CLIENT] Cleaning up WebSocket...', reason);
    isConnectingRef.current = false;
    setConnectionStatus('disconnected');
    
    // Clear all timeouts
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
      connectionDebounceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Close WebSocket
    if (mediasoupWsRef.current) {
      mediasoupWsRef.current.onopen = null;
      mediasoupWsRef.current.onclose = null;
      mediasoupWsRef.current.onerror = null;
      mediasoupWsRef.current.onmessage = null;
      
      if (mediasoupWsRef.current.readyState === WebSocket.OPEN) {
        mediasoupWsRef.current.close(1000, reason);
      } else if (mediasoupWsRef.current.readyState === WebSocket.CONNECTING) {
        // If still connecting, close after short delay
        setTimeout(() => {
          if (mediasoupWsRef.current) {
            mediasoupWsRef.current.close(1000, reason);
          }
        }, 500);
      }
      mediasoupWsRef.current = null;
    }
    
    setMediasoupConnected(false);
  }, []);

  // ✅ FIXED: Enhanced WebSocket connection with connection reuse
  const connectToMediasoup = useCallback(() => {
    if (!mountedRef.current || !groupId || !username) {
      console.log('⏸️ [CLIENT] Skipping - component not ready');
      return;
    }

    const connectionKey = `${groupId}-${username}`;
    
    // ✅ FIXED: Check if we already have a healthy connection
    if (mediasoupWsRef.current) {
      const ws = mediasoupWsRef.current;
      if (ws.readyState === WebSocket.OPEN) {
        console.log('⏩ [CLIENT] Already connected, reusing existing WebSocket');
        return;
      } else if (ws.readyState === WebSocket.CONNECTING) {
        console.log('⏩ [CLIENT] Already connecting, waiting...');
        return;
      }
    }
    
    // ✅ FIXED: Prevent multiple connection attempts
    if (isConnectingRef.current) {
      console.log('⏸️ [CLIENT] Already connecting, skipping duplicate attempt');
      return;
    }

    // ✅ FIXED: More conservative debouncing (5 seconds)
    const now = Date.now();
    if (now - lastConnectionTimeRef.current < 5000) {
      console.log('⏸️ [CLIENT] Debouncing connection - too soon after last attempt');
      return;
    }
    lastConnectionTimeRef.current = now;

    // Clear any pending connection
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
      connectionDebounceRef.current = null;
    }

    connectionDebounceRef.current = setTimeout(() => {
      actualConnect();
    }, 1000); // Increased debounce time
    
    const actualConnect = () => {
      if (isConnectingRef.current) {
        console.log('⏸️ [CLIENT] Already connecting, skipping...');
        return;
      }

      // ✅ FIXED: Final check before creating new connection
      if (mediasoupWsRef.current && mediasoupWsRef.current.readyState === WebSocket.OPEN) {
        console.log('⏩ [CLIENT] Connection already established, skipping');
        isConnectingRef.current = false;
        return;
      }

      isConnectingRef.current = true;
      globalConnectionTracker.set(connectionKey, instanceIdRef.current);
      setConnectionStatus('connecting');
      
      console.log('🔗 [CLIENT] Starting NEW WebSocket connection...');

      // Clean up only if we have a dead connection
      if (mediasoupWsRef.current && mediasoupWsRef.current.readyState !== WebSocket.CONNECTING) {
        cleanupWebSocket('reconnect_cleanup');
      }

      try {
        const ws = new WebSocket(`ws://10.2.0.95:3001/ws`);
        mediasoupWsRef.current = ws;

        // Connection timeout (20 seconds)
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.log('⏰ [CLIENT] WebSocket connection timeout');
            isConnectingRef.current = false;
            globalConnectionTracker.delete(connectionKey);
            setConnectionStatus('timeout');
            ws.close(1000, 'connection_timeout');
          }
        }, 20000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          console.log('✅ [CLIENT] WebSocket connected successfully');
          setMediasoupConnected(true);
          setConnectionStatus('connected');
          connectionAttemptsRef.current = 0;
          
          // Send join message after short delay
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
              const joinMessage = {
                type: 'JOIN_CALL_GROUP',
                sender: username,
                groupId: groupId,
                timestamp: new Date().toISOString(),
                instanceId: instanceIdRef.current
              };
              ws.send(JSON.stringify(joinMessage));
              console.log('📨 [CLIENT] Sent JOIN_CALL_GROUP');
            }
          }, 500); // Increased delay

          // Start heartbeat (every 30 seconds)
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
              try {
                ws.send(JSON.stringify({ 
                  type: 'PING', 
                  sender: username,
                  groupId: groupId,
                  timestamp: Date.now(),
                  instanceId: instanceIdRef.current
                }));
              } catch (err) {
                console.log('❌ [CLIENT] Heartbeat send failed:', err);
              }
            }
          }, 30000); // Increased heartbeat interval
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'PONG') {
              return;
            }
            
            console.log('📨 [CLIENT] Received:', data.type, 'from:', data.sender, 'callType:', data.callType);
            handleMediasoupMessage(data);
          } catch (err) {
            console.error('❌ [CLIENT] Message parse error:', err);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          globalConnectionTracker.delete(connectionKey);
          setConnectionStatus('disconnected');
          
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          
          console.log('🔌 [CLIENT] WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            instanceId: instanceIdRef.current
          });
          
          setMediasoupConnected(false);
          
          // Update connection health
          setConnectionHealth(prev => ({
            ...prev,
            instabilityCount: prev.instabilityCount + 1
          }));
          
          // Auto-reconnect logic (except for manual disconnections)
          if (event.code !== 1000 && 
              !event.reason?.includes('manual') && 
              !event.reason?.includes('cleanup') &&
              !event.reason?.includes('timeout') &&
              mountedRef.current) {
            
            connectionAttemptsRef.current++;
            
            // Smart reconnection based on health
            const baseDelay = Math.min(
              1000 * Math.pow(1.5, connectionAttemptsRef.current - 1), 
              30000
            );
            const healthMultiplier = Math.max(1, connectionHealth.instabilityCount * 0.5);
            const jitter = Math.random() * 1000;
            const delay = Math.min(baseDelay * healthMultiplier + jitter, 45000);
            
            console.log(`🔄 [CLIENT] Reconnecting in ${Math.round(delay)}ms (attempt ${connectionAttemptsRef.current}, instability: ${connectionHealth.instabilityCount})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current && groupId && username && connectionAttemptsRef.current < 10) {
                console.log('🔄 [CLIENT] Executing auto-reconnect...');
                connectToMediasoup();
              } else if (connectionAttemptsRef.current >= 10) {
                console.log('🛑 [CLIENT] Max reconnection attempts reached');
                setConnectionStatus('failed');
              }
            }, delay);
          }
        };

        ws.onerror = (error) => {
          isConnectingRef.current = false;
          globalConnectionTracker.delete(connectionKey);
          setConnectionStatus('error');
          console.error('❌ [CLIENT] WebSocket error:', error);
          setMediasoupConnected(false);
          
          // Update connection health
          setConnectionHealth(prev => ({
            ...prev,
            instabilityCount: prev.instabilityCount + 1
          }));
        };

      } catch (error) {
        isConnectingRef.current = false;
        globalConnectionTracker.delete(connectionKey);
        setConnectionStatus('error');
        console.error('❌ [CLIENT] WebSocket creation failed:', error);
        setMediasoupConnected(false);
      }
    };
  }, [groupId, username, cleanupWebSocket, connectionHealth.instabilityCount]);

  // ✅ ENHANCED: Handle user left call
  const handleUserLeftCall = useCallback((data) => {
    if (!mountedRef.current) return;
    
    const { user, reason } = data.payload;
    console.log(`👤 [CLIENT] User left call: ${user}, reason: ${reason}`);
    
    // Remove from participants
    setParticipants(prev => prev.filter(p => p !== user));
    
    // Remove from remote streams
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[user];
      console.log(`🧹 Removed remote stream for ${user}`);
      return updated;
    });
    
    // Clean up transports for this user
    if (recvTransportsRef.current[user]) {
      recvTransportsRef.current[user].close();
      delete recvTransportsRef.current[user];
      console.log(`🧹 Closed receive transport for ${user}`);
    }
  }, []);

  // ✅ ENHANCED: Handle call ended remotely
  const handleCallEndedRemotely = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('📞 [CLIENT] Call ended remotely by:', data.sender, 'reason:', data.payload?.reason);
    
    // Only reset if we're in a call
    if (isInCall) {
      // Clean up local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      // Clean up WebRTC
      cleanupWebRTC();
      
      // Reset state
      setRemoteStreams({});
      setParticipants([]);
      setIsInCall(false);
      setIsAdmin(false);
      setCallType('video');
      existingProducersRef.current.clear();
      
      console.log('✅ [CLIENT] Call state reset after remote end');
    }
  }, [isInCall, localStream]);

  // ✅ FIXED: Enhanced message handling with individual call support
  const handleMediasoupMessage = (data) => {
    if (!mountedRef.current) return;
    
    const { type, sender, payload, groupId: messageGroupId, callType } = data;

    // Only process events for our group
    if (messageGroupId && String(messageGroupId) !== String(groupId)) {
      console.log('🔕 [CLIENT] Ignoring message for different group:', messageGroupId);
      return;
    }

    console.log(`🎯 [CLIENT] Processing: ${type} from ${sender}, callType: ${callType}`);

    // Forward ALL messages to UI - this is important!
    forwardCallEvent(data);

    // Handle internal state only for specific events
    switch (type) {
      case 'USER_JOINED_CALL':
        if (sender !== username) {
          setParticipants(prev => {
            if (!prev.includes(sender)) {
              console.log(`👥 [CLIENT] Added participant: ${sender}`);
              return [...prev, sender];
            }
            return prev;
          });
        }
        break;

      case 'USER_LEFT_CALL':
        handleUserLeftCall(data);
        break;

      case 'CALL_STARTED':
        if (sender !== username) {
          setParticipants(prev => {
            if (!prev.includes(sender)) {
              console.log(`📞 [CLIENT] Call started by: ${sender}, Type: ${payload?.callType}`);
              return [...prev, sender];
            }
            return prev;
          });
        }
        break;

      case 'CALL_ENDED':
        console.log('📞 [CLIENT] Call ended remotely by:', sender);
        handleCallEndedRemotely(data);
        break;

      case 'NEW_PRODUCER':
        if (sender !== username && !existingProducersRef.current.has(payload.producerId)) {
          console.log(`🎬 [CLIENT] NEW_PRODUCER from ${sender}:`, payload.producerId);
          setTimeout(() => {
            if (mountedRef.current) {
              consumeProducer(sender, payload.producerId, payload.kind);
            }
          }, 1000);
        }
        break;

      // Handle individual call events
      case 'INDIVIDUAL_CALL_STARTED':
        console.log('📞 [CLIENT] Individual call started notification:', data);
        // This will be handled by the UI component via forwardCallEvent
        break;

      case 'INDIVIDUAL_CALL_ACCEPTED':
        console.log('✅ [CLIENT] Individual call accepted:', data);
        // This will be handled by the UI component via forwardCallEvent
        break;

      case 'INDIVIDUAL_CALL_DECLINED':
        console.log('❌ [CLIENT] Individual call declined:', data);
        // This will be handled by the UI component via forwardCallEvent
        break;

      default:
        // Other individual call events are handled by the UI component
        break;
    }
  };

  // ✅ STABLE: Enhanced message sending
  const sendMediasoupMessage = (type, payload = {}) => {
    if (!mediasoupWsRef.current || mediasoupWsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ [CLIENT] WebSocket not connected, cannot send:', type);
      return false;
    }

    try {
      const message = {
        type,
        sender: username,
        groupId: groupId,
        payload,
        timestamp: new Date().toISOString(),
        instanceId: instanceIdRef.current
      };
      
      mediasoupWsRef.current.send(JSON.stringify(message));
      console.log(`📤 [CLIENT] Sent: ${type}`, payload);
      return true;
    } catch (err) {
      console.error('❌ [CLIENT] Send failed:', err);
      return false;
    }
  };

  // ✅ ENHANCED: Complete WebRTC setup with call type support
  const setupWebRTC = async (stream, callType = 'video') => {
    try {
      console.log('🔄 [CLIENT] Starting WebRTC setup for:', callType);

      // Step 1: Get router RTP capabilities
      console.log('📡 [CLIENT] Fetching router RTP capabilities...');
      const routerRtpCapabilities = await fetchRouterRtpCapabilities();
      
      // Step 2: Load mediasoup device
      const { Device } = await import('mediasoup-client');
      const device = new Device();
      
      console.log('🔄 [CLIENT] Loading device with RTP capabilities...');
      await device.load({ routerRtpCapabilities });
      deviceRef.current = device;
      
      console.log('🔍 [CLIENT] Device loaded:', {
        loaded: device.loaded,
        canProduceVideo: device.canProduce('video'),
        canProduceAudio: device.canProduce('audio'),
        rtpCapabilities: device.rtpCapabilities
      });

      // Step 3: Create send transport
      console.log('📡 [CLIENT] Creating send transport...');
      const sendTransportInfo = await createSendTransportInfo();
      const sendTransport = device.createSendTransport(sendTransportInfo);
      sendTransportRef.current = sendTransport;
      
      console.log('✅ [CLIENT] Send transport created:', sendTransportInfo.id);

      // Step 4: Setup send transport event handlers
      console.log('🔄 [CLIENT] Setting up send transport handlers...');
      setupSendTransportHandlers(sendTransport, sendTransportInfo);

      // Step 5: Produce local tracks based on call type
      console.log('🎥 [CLIENT] Producing local tracks for:', callType);
      await produceLocalTracks(stream, sendTransport, callType);

      console.log('✅ [CLIENT] WebRTC setup completed successfully');

    } catch (err) {
      console.error('❌ [CLIENT] WebRTC setup failed:', err);
      throw err;
    }
  };

  // ✅ STABLE: Setup send transport handlers
  const setupSendTransportHandlers = (transport, transportInfo) => {
    console.log('🔄 [CLIENT] Setting up send transport handlers...');

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        console.log(`🔗 [CLIENT] Transport connect event: ${transportInfo.id}`);
        await connectTransport(transportInfo.id, dtlsParameters);
        callback();
        console.log(`✅ [CLIENT] Transport connected: ${transportInfo.id}`);
      } catch (err) {
        console.error(`❌ [CLIENT] Transport connect error:`, err);
        errback(err);
      }
    });

    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        console.log(`🎬 [CLIENT] Transport produce event: ${kind}`);
        const { producerId } = await produce(transportInfo.id, kind, rtpParameters);
        
        // Store producer reference
        producersRef.current[kind] = producerId;
        callback({ id: producerId });
        
        // Notify others about new producer
        console.log(`📢 [CLIENT] Announcing NEW_PRODUCER: ${producerId} (${kind})`);
        sendMediasoupMessage('NEW_PRODUCER', {
          producerId,
          kind
        });
        
        console.log(`✅ [CLIENT] Producer announced: ${producerId}`);
      } catch (err) {
        console.error(`❌ [CLIENT] Produce error:`, err);
        errback(err);
      }
    });

    transport.on('connectionstatechange', (state) => {
      console.log(`🔌 [CLIENT] Send transport state: ${state}`);
      
      if (state === 'connected') {
        console.log('✅ [CLIENT] Send transport fully connected');
      } else if (state === 'failed' || state === 'disconnected') {
        console.error(`❌ [CLIENT] Send transport problem: ${state}`);
      }
    });

    console.log('✅ [CLIENT] Send transport handlers setup completed');
  };

  // ✅ ENHANCED: Produce local tracks with call type support
  const produceLocalTracks = async (stream, transport, callType = 'video') => {
    const videoTrack = callType === 'video' ? stream.getVideoTracks()[0] : null;
    const audioTrack = stream.getAudioTracks()[0];

    console.log('🎥 [CLIENT] Starting local track production...', {
      callType,
      hasVideoTrack: !!videoTrack,
      hasAudioTrack: !!audioTrack,
      videoTrackReady: videoTrack?.readyState,
      audioTrackReady: audioTrack?.readyState
    });

    // Produce video track (only for video calls)
    if (videoTrack && videoTrack.readyState === 'live') {
      try {
        console.log('🎬 [CLIENT] PRODUCING video track...', {
          trackId: videoTrack.id,
          enabled: videoTrack.enabled,
          label: videoTrack.label
        });
        
        const videoProducer = await transport.produce({
          track: videoTrack,
          encodings: [
            { 
              maxBitrate: 1000000
            }
          ]
        });
        
        producersRef.current.video = videoProducer.id;
        console.log('✅ [CLIENT] Video producer created:', videoProducer.id);
        
        videoProducer.on('trackended', () => {
          console.log('❌ [CLIENT] Video track ended');
        });
        
        videoProducer.on('transportclose', () => {
          console.log('❌ [CLIENT] Video producer transport closed');
        });
        
      } catch (videoError) {
        console.error('❌ [CLIENT] Video production failed:', videoError);
        // Try fallback without any encodings
        try {
          console.log('🔄 [CLIENT] Trying fallback video production...');
          const fallbackProducer = await transport.produce({
            track: videoTrack
          });
          producersRef.current.video = fallbackProducer.id;
          console.log('✅ [CLIENT] Fallback video producer created:', fallbackProducer.id);
        } catch (fallbackError) {
          console.error('❌ [CLIENT] Fallback video production also failed:', fallbackError);
        }
      }
    }

    // Produce audio track (for both video and audio calls)
    if (audioTrack && audioTrack.readyState === 'live') {
      try {
        console.log('🎬 [CLIENT] PRODUCING audio track...', {
          trackId: audioTrack.id,
          enabled: audioTrack.enabled,
          label: audioTrack.label
        });
        
        const audioProducer = await transport.produce({ 
          track: audioTrack
        });
        
        producersRef.current.audio = audioProducer.id;
        console.log('✅ [CLIENT] Audio producer created:', audioProducer.id);
        
        audioProducer.on('trackended', () => {
          console.log('❌ [CLIENT] Audio track ended');
        });
        
        audioProducer.on('transportclose', () => {
          console.log('❌ [CLIENT] Audio producer transport closed');
        });
        
      } catch (audioError) {
        console.error('❌ [CLIENT] Audio production failed:', audioError);
      }
    }

    console.log('✅ [CLIENT] Local track production completed');
  };

  // ✅ STABLE: Consume remote producer with enhanced error handling
  const consumeProducer = async (userId, producerId, kind) => {
    if (!mountedRef.current) return;
    
    console.log(`🎬 [CLIENT] consumeProducer called:`, {
      userId,
      producerId, 
      kind,
      hasDevice: !!deviceRef.current,
      alreadyConsumed: existingProducersRef.current.has(producerId)
    });

    // Skip if already consumed
    if (existingProducersRef.current.has(producerId)) {
      console.log(`⏩ [CLIENT] Already consuming producer ${producerId}, skipping`);
      return;
    }

    const device = deviceRef.current;
    if (!device) {
      console.warn('❌ [CLIENT] Cannot consume producer - device not ready');
      return;
    }

    try {
      console.log(`🔄 [CLIENT] Starting to consume ${kind} from ${userId}`);

      // Create receive transport if needed
      if (!recvTransportsRef.current[userId]) {
        console.log(`📡 [CLIENT] Creating receive transport for ${userId}`);
        const recvTransportInfo = await createRecvTransportInfo();
        const recvTransport = device.createRecvTransport(recvTransportInfo);

        // Setup receive transport handlers
        recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            console.log(`🔗 [CLIENT] Connecting receive transport for ${userId}`);
            await connectTransport(recvTransportInfo.id, dtlsParameters);
            callback();
            console.log(`✅ [CLIENT] Receive transport connected for ${userId}`);
          } catch (err) {
            console.error(`❌ [CLIENT] Receive transport connect error for ${userId}:`, err);
            errback(err);
          }
        });

        recvTransport.on('connectionstatechange', (state) => {
          console.log(`🔌 [CLIENT] Recv transport state for ${userId}: ${state}`);
        });

        recvTransportsRef.current[userId] = recvTransport;
        console.log(`✅ [CLIENT] Receive transport created for ${userId}: ${recvTransportInfo.id}`);
      }

      const recvTransport = recvTransportsRef.current[userId];
      console.log(`📡 [CLIENT] Using receive transport: ${recvTransport.id} for ${userId}`);

      // Consume the producer
      console.log(`🎬 [CLIENT] Calling consume API for producer ${producerId}`);
      const { id: consumerId, rtpParameters } = await consume(recvTransport.id, producerId);
      
      console.log(`🔄 [CLIENT] Creating consumer with ID: ${consumerId}`);
      const consumer = await recvTransport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
      });

      consumersRef.current[consumerId] = consumer;
      existingProducersRef.current.add(producerId);

      console.log(`✅ [CLIENT] Consumer created:`, {
        consumerId,
        kind: consumer.kind,
        trackEnabled: consumer.track.enabled,
        trackReadyState: consumer.track.readyState,
        trackId: consumer.track.id
      });

      // Create and set the remote stream
      const remoteStream = new MediaStream();
      remoteStream.addTrack(consumer.track);
      
      console.log(`📹 [CLIENT] Setting remote stream for ${userId}`, {
        streamId: remoteStream.id,
        tracks: remoteStream.getTracks().length,
        trackKind: consumer.track.kind,
        trackLabel: consumer.track.label
      });

      setRemoteStreams(prev => ({
        ...prev,
        [userId]: remoteStream
      }));

      // Enable the track
      consumer.track.enabled = true;
      console.log(`✅ [CLIENT] Consumer track enabled for ${userId}`);

      // Setup consumer event handlers
      consumer.on('trackended', () => {
        console.log(`❌ [CLIENT] Remote track ended for ${userId}`);
        if (mountedRef.current) {
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        }
      });

      consumer.on('transportclose', () => {
        console.log(`❌ [CLIENT] Consumer transport closed for ${userId}`);
      });

      console.log(`🎉 [CLIENT] Successfully consuming ${kind} from ${userId}`);

    } catch (err) {
      console.error(`❌ [CLIENT] Failed to consume producer from ${userId}:`, err);
      console.error('Error details:', err.message);
      
      // Remove from existing producers to allow retry
      existingProducersRef.current.delete(producerId);
    }
  };

  // API functions with enhanced error handling
  const fetchRouterRtpCapabilities = async () => {
    console.log('📡 [CLIENT] Fetching router RTP capabilities...');
    try {
      const res = await fetch(`http://10.2.0.95:3001/api/sfu/router-rtp?groupId=${groupId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      console.log('✅ [CLIENT] Router RTP capabilities received');
      return data.rtpCapabilities;
    } catch (err) {
      console.error('❌ [CLIENT] Failed to fetch router RTP capabilities:', err);
      throw err;
    }
  };

  const createSendTransportInfo = async () => {
    console.log('📡 [CLIENT] Creating send transport...');
    try {
      const res = await fetch(`http://10.2.0.95:3001/api/sfu/send-transport?groupId=${groupId}&username=${username}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      console.log('✅ [CLIENT] Send transport created:', data.id);
      return data;
    } catch (err) {
      console.error('❌ [CLIENT] Failed to create send transport:', err);
      throw err;
    }
  };

  const createRecvTransportInfo = async () => {
    console.log('📡 [CLIENT] Creating receive transport...');
    try {
      const res = await fetch(`http://10.2.0.95:3001/api/sfu/recv-transport?groupId=${groupId}&username=${username}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      console.log('✅ [CLIENT] Receive transport created:', data.id);
      return data;
    } catch (err) {
      console.error('❌ [CLIENT] Failed to create recv transport:', err);
      throw err;
    }
  };

  const connectTransport = async (transportId, dtlsParameters) => {
    console.log(`🔗 [CLIENT] Connecting transport: ${transportId}`);
    try {
      const res = await fetch('http://10.2.0.95:3001/api/sfu/connect-transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportId, dtlsParameters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      console.log(`✅ [CLIENT] Transport connected: ${transportId}`);
    } catch (err) {
      console.error('❌ [CLIENT] Failed to connect transport:', err);
      throw err;
    }
  };

  const produce = async (transportId, kind, rtpParameters) => {
    console.log(`🎬 [CLIENT] Producing ${kind} track...`);
    try {
      const res = await fetch('http://10.2.0.95:3001/api/sfu/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transportId, 
          kind, 
          rtpParameters,
          groupId,
          username 
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      console.log(`✅ [CLIENT] ${kind} producer created:`, data.producerId);
      return data;
    } catch (err) {
      console.error('❌ [CLIENT] Failed to create producer:', err);
      throw err;
    }
  };

  const consume = async (transportId, producerId) => {
    console.log(`🎬 [CLIENT] Consuming producer: ${producerId}`);
    try {
      const res = await fetch('http://10.2.0.95:3001/api/sfu/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transportId, 
          producerId,
          groupId,
          username 
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      console.log(`✅ [CLIENT] Consumer created for producer ${producerId}:`, data.id);
      return data;
    } catch (err) {
      console.error(`❌ [CLIENT] Failed to consume producer ${producerId}:`, err);
      throw err;
    }
  };

  // ✅ ENHANCED: Join call with call type support
  const joinCall = async (asAdmin = false, callType = 'video') => {
    if (isInCall) {
      console.log('ℹ️ [CLIENT] Already in call');
      return;
    }

    try {
      console.log('🎥 [CLIENT] Joining call as:', asAdmin ? 'Admin' : 'Participant', 'Type:', callType);

      // Ensure WebSocket is connected
      if (!mediasoupConnected) {
        console.log('🔄 [CLIENT] WebSocket not connected, attempting connection...');
        manuallyConnect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setIsInCall(true);
      setIsAdmin(asAdmin);
      setCallType(callType);

      // Get local media stream based on call type
      const stream = callType === 'audio' 
        ? await getAudioStream() 
        : await getLocalStream(callType);
      
      // Notify others
      const messageType = asAdmin ? 'CALL_STARTED' : 'USER_JOINED_CALL';
      console.log(`📢 [CLIENT] Notifying with: ${messageType}`);
      
      if (asAdmin) {
        sendMediasoupMessage(messageType, {
          callerName: username,
          callerId: username,
          callType: callType,
          timestamp: new Date().toISOString()
        });
      } else {
        sendMediasoupMessage(messageType, {
          callType: callType
        });
      }

      // Setup WebRTC - THIS IS WHAT ENABLES STREAMING
      await setupWebRTC(stream, callType);

      console.log('✅ [CLIENT] Call joined successfully');

    } catch (err) {
      console.error('❌ [CLIENT] Join call failed:', err);
      if (mountedRef.current) {
        setIsInCall(false);
        setIsAdmin(false);
        setCallType('video');
        
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
      }
      throw err;
    }
  };

  // ✅ ENHANCED: Start individual call with proper callType propagation
  const startIndividualCall = async (targetUser, callType = 'video') => {
    try {
      console.log('📞 [CLIENT] Starting individual call to:', targetUser, 'Type:', callType);
      
      // Ensure WebSocket is connected
      if (!mediasoupConnected) {
        console.log('🔄 [CLIENT] WebSocket not connected, attempting connection...');
        manuallyConnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setCallType(callType);
      
      // Generate a unique call ID
      const callId = `${groupId}-${username}-${targetUser}-${Date.now()}`;
      
      // Send individual call start via WebSocket with callType
      sendMediasoupMessage('INDIVIDUAL_CALL_STARTED', {
        callId: callId,
        targetUser: targetUser,
        callType: callType, // <--- CRITICAL: Include callType
        callerName: username,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [CLIENT] Individual call initiated via WebSocket');

    } catch (err) {
      console.error('❌ [CLIENT] Start individual call failed:', err);
      throw err;
    }
  };

  // ✅ ENHANCED: End call with proper state synchronization
  const endCall = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('📞 [CLIENT] Ending call with complete cleanup');
    
    // Send leave notification first
    sendMediasoupMessage('USER_LEFT_CALL', {
      userName: username,
      reason: 'ended_call'
    });

    // Then send call ended notification
    sendMediasoupMessage('CALL_ENDED');

    // Clean up local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped local track:', track.kind);
      });
      setLocalStream(null);
    }

    // Clean up WebRTC
    cleanupWebRTC();
    
    // Reset state
    setRemoteStreams({});
    setParticipants([]);
    setIsInCall(false);
    setIsAdmin(false);
    setCallType('video');
    setCameraError(null);
    existingProducersRef.current.clear();

    console.log('✅ [CLIENT] Call ended with complete cleanup');
  }, [localStream, username, sendMediasoupMessage, mountedRef]);

  const cleanupWebRTC = () => {
    console.log('🧹 [CLIENT] Cleaning up WebRTC resources...');
    
    // Close send transport
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
      console.log('✅ [CLIENT] Send transport closed');
    }

    // Close all receive transports
    Object.entries(recvTransportsRef.current).forEach(([userId, transport]) => {
      transport.close();
      console.log(`✅ [CLIENT] Receive transport closed for ${userId}`);
    });
    recvTransportsRef.current = {};

    // Clear all references
    deviceRef.current = null;
    producersRef.current = {};
    consumersRef.current = {};

    console.log('✅ [CLIENT] WebRTC cleanup completed');
  };

  // Manual controls
  const manuallyConnect = useCallback(() => {
    console.log('🔗 [CLIENT] Manual connect requested');
    connectionAttemptsRef.current = 0;
    connectToMediasoup();
  }, [connectToMediasoup]);

  const manuallyDisconnect = useCallback(() => {
    console.log('🔌 [CLIENT] Manual disconnect requested');
    cleanupWebSocket('manual_disconnect');
  }, [cleanupWebSocket]);

  // ✅ ADD: Smart reconnection based on health
  useEffect(() => {
    if (!mountedRef.current || connectionHealth.instabilityCount < 3) return;

    console.log('🩺 [CLIENT] High connection instability detected, applying cooldown');
    
    // If we have too many instability events, wait longer before reconnecting
    const cooldownTime = Math.min(connectionHealth.instabilityCount * 5000, 30000);
    
    const cooldownTimer = setTimeout(() => {
      if (mountedRef.current && !mediasoupConnected) {
        console.log(`🔄 [CLIENT] Executing stabilized reconnection after cooldown`);
        manuallyConnect();
      }
    }, cooldownTime);

    return () => clearTimeout(cooldownTimer);
  }, [connectionHealth.instabilityCount, mediasoupConnected, manuallyConnect]);

  // ✅ FIXED: Less aggressive reconnection
  useEffect(() => {
    if (!mountedRef.current) return;

    console.log('📊 [CLIENT] Connection state updated:', {
      mediasoupConnected,
      connectionStatus,
      connectionAttempts: connectionAttemptsRef.current,
      isInCall
    });

    // Update connection health when connected
    if (mediasoupConnected) {
      setConnectionHealth(prev => ({
        lastStableTime: Date.now(),
        instabilityCount: Math.max(0, prev.instabilityCount - 1),
        averageUptime: prev.averageUptime * 0.9 + 0.1 * 100 // smooth average
      }));
    }

    // ✅ FIXED: Only auto-reconnect if truly disconnected for a while
    if (!mediasoupConnected && 
        connectionStatus === 'disconnected' && 
        connectionAttemptsRef.current === 0 &&
        mountedRef.current) {
      
      console.log('🔄 [CLIENT] Auto-initiating reconnection...');
      const reconnectTimer = setTimeout(() => {
        if (mountedRef.current && !mediasoupConnected) {
          manuallyConnect();
        }
      }, 5000); // Increased from 3000ms to 5000ms

      return () => clearTimeout(reconnectTimer);
    }
  }, [mediasoupConnected, connectionStatus, isInCall, manuallyConnect]);

  // ✅ ENHANCED: Auto-connect when component mounts
  useEffect(() => {
    if (!mountedRef.current || !groupId || !username) return;

    console.log('🔗 [CLIENT] Auto-connecting to Mediasoup...');
    
    const connectTimer = setTimeout(() => {
      if (mountedRef.current) {
        manuallyConnect();
      }
    }, 2000);

    return () => {
      clearTimeout(connectTimer);
    };
  }, [groupId, username, manuallyConnect]);

  return {
    // State
    localStream,
    remoteStreams,
    isInCall,
    isAdmin,
    mediasoupConnected,
    cameraError,
    participants,
    connectionAttempts: connectionAttemptsRef.current,
    connectionStatus,
    callType,
    connectionHealth,
    
    // Media stream functions
    getLocalStream,
    getAudioStream,
    
    // Call control
    joinCall,
    startIndividualCall,
    endCall,
    
    // WebSocket control
    sendMediasoupMessage,
    manuallyConnect,
    manuallyDisconnect,
    
    // Event callback system
    setOnCallEvent,
  };
};