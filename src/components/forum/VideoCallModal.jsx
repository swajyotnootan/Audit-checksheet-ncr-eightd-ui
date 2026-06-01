import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, Maximize2, Minimize2, User, Users, Volume2 } from 'lucide-react';
import ringtone from '../../assets/callertune.mp3';
import callertune from '../../assets/callertune.mp3';

export default function VideoCallModal({
  callState,
  callerName,
  isAdmin,
  currentUserId,
  localStream,
  remoteStreams,
  participants,
  allUsers,
  currentUser,
  onAccept,
  onDecline,
  onCancel,
  onEndCall,
  onClose,
  callType = 'video'
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [fullscreenParticipant, setFullscreenParticipant] = useState(null);
  const audioRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);
  const [participantStatus, setParticipantStatus] = useState({});
  // Enhanced state management
  const [streamDebug, setStreamDebug] = useState({
    local: { hasVideo: false, hasAudio: false, videoEnabled: false, audioEnabled: false },
    remotes: {}
  });
  const [cameraStatus, setCameraStatus] = useState({});
  const [micStatus, setMicStatus] = useState({});
  const [videoElementAttached, setVideoElementAttached] = useState({});
  const [activeSpeakers, setActiveSpeakers] = useState(new Set());

  // NEW: State for the participants sidebar
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);

  // Track audio elements for each participant
  const audioElementsRef = useRef({});

  // ✅ ENHANCED: Complete cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [VIDEO MODAL] Performing complete cleanup');
      // Stop all audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Stop all participant audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.srcObject = null;
        }
      });
      audioElementsRef.current = {};

      // Clear timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      // Clear video refs
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      Object.values(remoteVideoRefs.current).forEach(video => {
        if (video) {
          video.srcObject = null;
        }
      });
      remoteVideoRefs.current = {};
    };
  }, []);

  // ✅ ENHANCED: Stream monitoring with real-time status
  useEffect(() => {
    console.log('🎥 VIDEO CALL DEBUG - COMPLETE STATE:', {
      callState,
      callType,
      totalParticipants: participants.length + 1,
      localStream: localStream ? {
        id: localStream.id,
        active: localStream.active,
        videoTracks: localStream.getVideoTracks().map(t => ({
          id: t.id, enabled: t.enabled, readyState: t.readyState, label: t.label
        })),
        audioTracks: localStream.getAudioTracks().map(t => ({
          id: t.id, enabled: t.enabled, readyState: t.readyState, label: t.label
        }))
      } : null,
      remoteStreams: Object.entries(remoteStreams).map(([userId, stream]) => ({
        userId,
        streamId: stream?.id || 'no-id',
        active: stream?.active || false,
        videoTracks: stream?.getVideoTracks().map(t => ({
          id: t.id, enabled: t.enabled, readyState: t.readyState
        })) || [],
        audioTracks: stream?.getAudioTracks().map(t => ({
          id: t.id, enabled: t.enabled, readyState: t.readyState
        })) || []
      })),
      participants
    });
    // Update debug state
    const newLocalStatus = {
      hasVideo: localStream?.getVideoTracks().length > 0,
      hasAudio: localStream?.getAudioTracks().length > 0,
      videoEnabled: localStream?.getVideoTracks()[0]?.enabled || false,
      audioEnabled: localStream?.getAudioTracks()[0]?.enabled || false
    };
    const newRemoteStatus = {};
    const newCameraStatus = {};
    const newMicStatus = {};
    const newParticipantStatus = {};

    // Update local user status
    newCameraStatus[currentUserId] = newLocalStatus.hasVideo && newLocalStatus.videoEnabled && camOn;
    newMicStatus[currentUserId] = newLocalStatus.hasAudio && newLocalStatus.audioEnabled && micOn;
    newParticipantStatus[currentUserId] = {
      isSpeaking: false,
      cameraOn: newCameraStatus[currentUserId],
      micOn: newMicStatus[currentUserId],
      joinedAt: new Date().toISOString()
    };

    // Update remote participants status
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream) {
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        const hasVideo = videoTracks.length > 0;
        const hasAudio = audioTracks.length > 0;
        const videoEnabled = hasVideo && videoTracks[0].enabled && videoTracks[0].readyState === 'live';
        const audioEnabled = hasAudio && audioTracks[0].enabled && audioTracks[0].readyState === 'live';

        newRemoteStatus[userId] = { hasVideo, hasAudio, videoEnabled, audioEnabled };
        newCameraStatus[userId] = videoEnabled;
        newMicStatus[userId] = audioEnabled;

        // Setup audio element for this participant if not exists
        if (hasAudio && !audioElementsRef.current[userId]) {
          const audio = new Audio();
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.muted = false; // Don't mute remote audio
          audioElementsRef.current[userId] = audio;
          // Monitor audio levels for speaking detection
          setupAudioMonitoring(userId, stream);
        }

        newParticipantStatus[userId] = {
          isSpeaking: activeSpeakers.has(userId),
          cameraOn: videoEnabled,
          micOn: audioEnabled,
          joinedAt: new Date().toISOString()
        };
      } else {
        newRemoteStatus[userId] = { hasVideo: false, hasAudio: false, videoEnabled: false, audioEnabled: false };
        newCameraStatus[userId] = false;
        newMicStatus[userId] = false;

        // Clean up audio element
        if (audioElementsRef.current[userId]) {
          audioElementsRef.current[userId].pause();
          audioElementsRef.current[userId].srcObject = null;
          delete audioElementsRef.current[userId];
        }

        newParticipantStatus[userId] = {
          isSpeaking: false,
          cameraOn: false,
          micOn: false,
          leftAt: new Date().toISOString()
        };
      }
    });

    setStreamDebug({
      local: newLocalStatus,
      remotes: newRemoteStatus
    });
    setCameraStatus(prev => ({ ...prev, ...newCameraStatus }));
    setMicStatus(prev => ({ ...prev, ...newMicStatus }));
    setParticipantStatus(newParticipantStatus);
  }, [localStream, remoteStreams, participants, callState, camOn, micOn, currentUserId, activeSpeakers, callType]);

  // ✅ ENHANCED: Audio level monitoring for speaking detection
  const setupAudioMonitoring = (userId, stream) => {
    if (!stream.getAudioTracks().length) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);

    javascriptNode.onaudioprocess = () => {
      const array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      const values = array.reduce((a, b) => a + b, 0);
      const average = values / array.length;

      // If average volume is above threshold, consider user as speaking
      if (average > 30) { // Adjust threshold as needed
        setActiveSpeakers(prev => new Set([...prev, userId]));
      } else {
        setActiveSpeakers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    };

    // Store for cleanup
    audioElementsRef.current[`${userId}_analyser`] = { audioContext, analyser, javascriptNode };
  };

  // ✅ ENHANCED: Local video setup with better error handling
  useEffect(() => {
    const setupLocalVideo = async () => {
      if (localStream && localVideoRef.current) {
        console.log('🎥 Setting up LOCAL video stream:', {
          streamId: localStream.id,
          videoTracks: localStream.getVideoTracks().length,
          audioTracks: localStream.getAudioTracks().length
        });
        try {
          // Clear previous stream
          localVideoRef.current.srcObject = null;
          await new Promise(resolve => setTimeout(resolve, 100));
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.autoplay = true;

          const playVideo = async () => {
            try {
              await localVideoRef.current.play();
              console.log('✅ Local video playing successfully');
            } catch (playErr) {
              console.warn('🎥 Local video play warning:', playErr);
              // Try again with user interaction
              setTimeout(() => {
                localVideoRef.current.play().catch(e =>
                  console.error('🎥 Local video play failed:', e)
                );
              }, 1000);
            }
          };

          if (localVideoRef.current.readyState >= 2) {
            playVideo();
          } else {
            localVideoRef.current.onloadedmetadata = playVideo;
          }
        } catch (err) {
          console.error('🎥 Failed to setup local video:', err);
        }
      } else if (!localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
    setupLocalVideo();
  }, [localStream]);

  // ✅ ENHANCED: Remote video stream handler with complete state management
  useEffect(() => {
    console.log('🎥 REMOTE STREAMS UPDATE:', {
      participantCount: participants.length,
      remoteStreamKeys: Object.keys(remoteStreams),
      streamsDetails: Object.entries(remoteStreams).map(([userId, stream]) => ({
        userId,
        streamExists: !!stream,
        streamActive: stream?.active || false,
        videoTracks: stream?.getVideoTracks().length || 0,
        audioTracks: stream?.getAudioTracks().length || 0,
        videoEnabled: stream?.getVideoTracks()[0]?.enabled || false
      }))
    });

    participants.forEach(participantId => {
      const stream = remoteStreams[participantId];
      let videoElement = remoteVideoRefs.current[participantId];

      if (!videoElement) {
        console.log(`🎥 No video element found for participant: ${participantId}`);
        return;
      }

      if (stream) {
        console.log(`🎥 Processing remote stream for ${participantId}:`, {
          streamId: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });

        // Always set the stream (even if same) to ensure it's connected
        try {
          if (videoElement.srcObject !== stream || !videoElementAttached[participantId]) {
            videoElement.srcObject = null; // Clear first
            setTimeout(() => {
              videoElement.srcObject = stream;
              videoElement.muted = false;
              videoElement.playsInline = true;
              videoElement.autoplay = true;
              console.log(`🎥 Stream assigned to video element for ${participantId}`);

              // Enhanced play with retry logic
              const playRemoteVideo = async (attempt = 0) => {
                try {
                  await videoElement.play();
                  console.log(`✅ Remote video PLAYING for ${participantId}`);
                  setVideoElementAttached(prev => ({ ...prev, [participantId]: true }));
                } catch (playErr) {
                  console.warn(`⚠️ Play attempt ${attempt + 1} failed for ${participantId}:`, playErr.message);
                  if (attempt < 5) {
                    setTimeout(() => playRemoteVideo(attempt + 1), 300 * (attempt + 1));
                  } else {
                    console.error(`❌ All play attempts failed for ${participantId}`);
                    videoElement.muted = true;
                    videoElement.play().catch(() => { });
                  }
                }
              };

              if (videoElement.readyState >= 2) {
                playRemoteVideo();
              } else {
                videoElement.onloadedmetadata = () => playRemoteVideo();
              }
            }, 50);
          } else {
            console.log(`🎥 Stream already attached to video element for ${participantId}`);
          }
        } catch (err) {
          console.error(`❌ Error setting stream for ${participantId}:`, err);
        }
      } else {
        console.log(`🎥 No stream available for ${participantId}`);
        if (videoElement && videoElement.srcObject) {
          videoElement.srcObject = null;
        }
        // Update status when stream is removed
        setCameraStatus(prev => ({ ...prev, [participantId]: false }));
        setMicStatus(prev => ({ ...prev, [participantId]: false }));
        setVideoElementAttached(prev => ({ ...prev, [participantId]: false }));
      }
    });

    // Clean up unused video elements
    Object.keys(remoteVideoRefs.current).forEach(userId => {
      if (!participants.includes(userId) && remoteVideoRefs.current[userId]) {
        console.log(`🧹 Cleaning up video element for removed participant: ${userId}`);
        remoteVideoRefs.current[userId].srcObject = null;
        delete remoteVideoRefs.current[userId];

        // Remove from status tracking
        setCameraStatus(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        setMicStatus(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        setVideoElementAttached(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });
  }, [remoteStreams, participants, videoElementAttached]);

  // ✅ ENHANCED: Video element ref setter
  const setVideoRef = (element, participantId) => {
    if (element && !remoteVideoRefs.current[participantId]) {
      remoteVideoRefs.current[participantId] = element;

      // Set up event listeners
      element.onerror = (err) => {
        console.error(`🎥 Video element error for ${participantId}:`, err);
      };
      element.onstalled = () => {
        console.warn(`🎥 Video stalled for ${participantId}`);
      };
      element.onwaiting = () => {
        console.log(`🎥 Video waiting for ${participantId}`);
      };
      element.onplaying = () => {
        console.log(`✅ Video now playing for ${participantId}`);
        setVideoElementAttached(prev => ({ ...prev, [participantId]: true }));
      };

      // If stream already exists, set it immediately
      const stream = remoteStreams[participantId];
      if (stream && element.srcObject !== stream) {
        console.log(`🎥 Immediate stream assignment for ${participantId}`);
        element.srcObject = stream;
        element.muted = false;
        element.playsInline = true;
        element.autoplay = true;
        element.play().catch(err => {
          console.warn(`🎥 Immediate play failed for ${participantId}:`, err);
        });
      }
    }
  };

  // ✅ ENHANCED: Call timer with proper cleanup
  useEffect(() => {
    if (callState === 'connected' && !callTimerRef.current) {
      startCallTimer();
    } else if ((callState === 'idle' || callState === 'ended') && callTimerRef.current) {
      console.log('⏰ Stopping call timer');
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callState]);

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ ENHANCED: Audio management with proper cleanup
  useEffect(() => {
    if (callState === 'ringing') {
      console.log('🔊 Playing ringtone for incoming call');
      const audio = new Audio(ringtone);
      audio.loop = true;
      audioRef.current = audio;
      const playAudio = async () => {
        try {
          await audio.play();
          console.log('🔊 Ringtone started playing');
        } catch (err) {
          console.log('🔊 Audio play failed:', err);
        }
      };
      playAudio();
      return () => {
        if (audioRef.current) {
          console.log('🔊 Stopping ringtone');
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [callState]);

  useEffect(() => {
    if (callState === 'calling' && participants.length === 0) {
      console.log('🔊 Playing caller tune for outgoing call');
      const audio = new Audio(callertune);
      audio.loop = true;
      audioRef.current = audio;
      const playAudio = async () => {
        try {
          await audio.play();
          console.log('🔊 Caller tune started playing');
        } catch (err) {
          console.log('🔊 Audio play failed:', err);
        }
      };
      playAudio();
      return () => {
        if (audioRef.current) {
          console.log('🔊 Stopping caller tune');
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [callState, participants.length]);

  // ✅ ENHANCED: Stop all audio when call connects or ends
  useEffect(() => {
    if ((callState === 'connected' || callState === 'idle' || callState === 'ended') && audioRef.current) {
      console.log('🔊 Stopping all call tones');
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [callState]);

  // ✅ ENHANCED: Toggle controls with state persistence
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
      console.log('🎤 Microphone:', !micOn ? 'ON' : 'OFF');
      setMicStatus(prev => ({
        ...prev,
        [currentUserId]: !micOn
      }));
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !camOn;
      });
      setCamOn(!camOn);
      console.log('📷 Camera:', !camOn ? 'ON' : 'OFF');
      setCameraStatus(prev => ({
        ...prev,
        [currentUserId]: !camOn && streamDebug.local.hasVideo
      }));
    }
  };

  // ✅ ENHANCED: Call handlers with complete cleanup
  const handleAccept = () => {
    console.log('✅ Accepting call');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onAccept();
  };

  const handleDecline = () => {
    console.log('❌ Declining call');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onDecline();
  };

  // ✅ ENHANCED: Handle call state changes
  useEffect(() => {
    console.log('📞 [VIDEO MODAL] Call state changed:', callState);
    // If call ended, perform complete cleanup
    if (callState === 'idle' || callState === 'ended') {
      console.log('🧹 [VIDEO MODAL] Performing cleanup due to call end');
      // Stop all audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Stop timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      // Clear video streams
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      Object.values(remoteVideoRefs.current).forEach(video => {
        if (video) {
          video.srcObject = null;
        }
      });
      // Reset states
      setCallDuration(0);
      setActiveSpeakers(new Set());
      setFullscreenParticipant(null);
      setMicOn(true);
      setCamOn(true);
    }
  }, [callState]);

  // ✅ ENHANCED: Handle participant changes
  useEffect(() => {
    console.log('👥 [VIDEO MODAL] Participants updated:', participants);
    // If no participants and we're in calling state, show waiting message
    if (callState === 'calling' && participants.length === 0) {
      console.log('⏳ [VIDEO MODAL] Waiting for participants to join...');
    }
    // If call ended and we still have participants, reset
    if ((callState === 'idle' || callState === 'ended') && participants.length > 0) {
      console.log('🔄 [VIDEO MODAL] Resetting participants after call end');
      // This will be handled by the parent component
    }
  }, [participants, callState]);

  // ✅ ENHANCED: Enhanced end call handler
  const handleEndCall = () => {
    console.log('📞 [VIDEO MODAL] User ending call - performing complete cleanup');
    // Stop timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    // Stop all audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop all participant audio
    Object.values(audioElementsRef.current).forEach(audio => {
      if (audio && typeof audio.pause === 'function') {
        audio.pause();
        audio.srcObject = null;
      }
    });
    audioElementsRef.current = {};
    // Clear video streams
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    Object.values(remoteVideoRefs.current).forEach(video => {
      if (video) {
        video.srcObject = null;
      }
    });
    remoteVideoRefs.current = {};
    // Reset states
    setCallDuration(0);
    setActiveSpeakers(new Set());
    setFullscreenParticipant(null);
    setMicOn(true);
    setCamOn(true);
    // Notify parent to end call
    onEndCall();
  };

  const getUserDisplayName = (userId) => {
    if (userId === currentUserId) return 'You';
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    return userId;
  };

  const getUserProfileImage = (userId) => {
    if (userId === currentUserId) return currentUser?.profileImage || null;
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    return user?.profileImage || null;
  };

  // ✅ ENHANCED: Status checks
  const hasVideo = localStream && localStream.getVideoTracks().length > 0;
  const hasAudio = localStream && localStream.getAudioTracks().length > 0;
  const totalParticipants = participants.length + 1;

  const participantHasVideo = (participantId) => {
    return cameraStatus[participantId] || false;
  };

  const participantHasAudio = (participantId) => {
    return micStatus[participantId] || false;
  };

  const participantIsSpeaking = (participantId) => {
    return activeSpeakers.has(participantId);
  };

  const getGridClass = () => {
    const total = totalParticipants;
    if (total <= 2) return "grid-cols-1";
    if (total <= 4) return "grid-cols-2";
    if (total <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  // NEW: Participants Sidebar Component
  const ParticipantsSidebar = () => {
    if (!showParticipantsSidebar) return null; // Only render if state is true

    return (
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-black bg-opacity-90 text-white z-40 transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Participants ({totalParticipants})</h3>
            <button
              onClick={() => setShowParticipantsSidebar(false)} // Close the sidebar
              className="text-white hover:text-gray-300"
            >
              <X onClick={onClose} size={24} />
            </button>
          </div>
          {/* Sidebar Content - Participant List */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Local user */}
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg mb-2">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium">{getUserDisplayName(currentUserId)}</p>
                <div className="flex gap-2 text-xs text-gray-400">
                  {cameraStatus[currentUserId] ? <Video size={12} /> : <VideoOff size={12} />}
                  {micStatus[currentUserId] ? <Mic size={12} /> : <MicOff size={12} />}
                  {participantIsSpeaking(currentUserId) && <Volume2 size={12} className="text-green-400" />}
                </div>
              </div>
              <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">You</span>
            </div>
            {/* Remote participants */}
            {participants.map(participantId => (
              <div key={participantId} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg mb-2">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{getUserDisplayName(participantId)}</p>
                  <div className="flex gap-2 text-xs text-gray-400">
                    {cameraStatus[participantId] ? <Video size={12} /> : <VideoOff size={12} />}
                    {micStatus[participantId] ? <Mic size={12} /> : <MicOff size={12} />}
                    {participantIsSpeaking(participantId) && <Volume2 size={12} className="text-green-400" />}
                  </div>
                </div>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-gray-400 text-center py-8">No other participants joined yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ✅ ENHANCED: Debug Panel with real-time status
  const DebugPanel = () => (
    <div className="absolute top-20 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-20">
      <h3 className="font-bold mb-2">🎥 CALL DEBUG</h3>
      <div className="mb-2">
        <div className="font-semibold">Local ({getUserDisplayName(currentUserId)}):</div>
        <div>Video: {streamDebug.local.hasVideo ? '✅' : '❌'}
          Enabled: {cameraStatus[currentUserId] ? '✅' : '❌'}
          UI: {camOn ? '✅' : '❌'}</div>
        <div>Audio: {streamDebug.local.hasAudio ? '✅' : '❌'}
          Enabled: {micStatus[currentUserId] ? '✅' : '❌'}
          UI: {micOn ? '✅' : '❌'}</div>
      </div>
      {Object.entries(streamDebug.remotes).map(([userId, info]) => (
        <div key={userId} className="mb-1">
          <div className="font-semibold">{getUserDisplayName(userId)}:</div>
          <div>Video: {info.hasVideo ? '✅' : '❌'}
            Enabled: {cameraStatus[userId] ? '✅' : '❌'}</div>
          <div>Audio: {info.hasAudio ? '✅' : '❌'}
            Enabled: {micStatus[userId] ? '✅' : '❌'}
            Speaking: {participantIsSpeaking(userId) ? '🎤' : '🔇'}</div>
        </div>
      ))}
      <div className="mt-2 border-t pt-2">
        <div>Remote Streams: {Object.keys(remoteStreams).length}</div>
        <div>Participants: {participants.length}</div>
        <div>Call State: {callState}</div>
        <div>Call Type: {callType}</div>
        <div>Duration: {formatTime(callDuration)}</div>
        <div>Active Speakers: {activeSpeakers.size}</div>
      </div>
    </div>
  );

  // ✅ FIXED: Only show calling modal when NO participants have joined yet
  if (callState === 'calling' && participants.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {callType === 'video' ? <Video className="text-blue-600" size={32} /> : <Volume2 className="text-blue-600" size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {callType === 'video' ? 'Starting Video Call...' : 'Starting Audio Call...'}
          </h2>
          <p className="text-gray-600 mb-6">Waiting for participants to answer</p>
          {/* Camera Status */}
          <div className={`rounded-lg p-3 mb-4 ${
            (callType === 'video' ? hasVideo : true) && hasAudio ? 'bg-green-50 border border-green-200' :
              hasAudio ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-center gap-4 text-sm">
              {callType === 'video' && <span>Camera: {hasVideo ? '✅' : '❌'}</span>}
              <span>Microphone: {hasAudio ? '✅' : '❌'}</span>
            </div>
            {(!hasAudio || (callType === 'video' && !hasVideo)) && (
              <p className="text-xs mt-1 text-center">
                {!hasAudio && (callType === 'video' && !hasVideo) ? 'Camera and microphone not available' :
                  !hasAudio ? 'Microphone not available' :
                  'Camera not available - audio only'}
              </p>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Phone size={20} className="rotate-135" />
              Cancel Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Incoming call (ringing)
  if (callState === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {callType === 'video' ? <Video className="text-green-600" size={32} /> : <Volume2 className="text-green-600" size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
          </h2>
          <p className="text-gray-600 mb-6">from <span className="font-semibold">{callerName}</span></p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleDecline}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Phone size={20} className="rotate-135" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            >
              {callType === 'video' ? <Video size={20} /> : <Volume2 size={20} />}
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active call (connected) - Fullscreen view
  if (fullscreenParticipant) {
    const isLocal = fullscreenParticipant === currentUserId;
    const displayName = getUserDisplayName(fullscreenParticipant);
    const profileImage = getUserProfileImage(fullscreenParticipant);
    const participantHasVideoStream = participantHasVideo(fullscreenParticipant);
    const participantHasAudioStream = participantHasAudio(fullscreenParticipant);
    const isSpeaking = participantIsSpeaking(fullscreenParticipant);

    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button
            onClick={() => setFullscreenParticipant(null)}
            className="flex items-center gap-2 px-4 py-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
          >
            <Minimize2 size={16} />
            Back to Grid
          </button>
          <h2 className="text-white text-lg font-semibold">
            {displayName}
            {isSpeaking && ' 🎤'}
            {!participantHasVideoStream && ' (Camera Off)'}
            {!participantHasAudioStream && ' (Mic Off)'}
          </h2>
          <div className="flex items-center gap-2 text-white text-sm">
            <span className={`w-2 h-2 rounded-full ${participantHasVideoStream ? 'bg-green-500' : 'bg-red-500'}`}></span>
            Camera
            <span className={`w-2 h-2 rounded-full ${participantHasAudioStream ? 'bg-green-500' : 'bg-red-500'}`}></span>
            Mic
          </div>
        </div>

        {/* Fullscreen Video */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 relative">
          {isLocal ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={el => setVideoRef(el, fullscreenParticipant)}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          {/* Fallback avatar if no video */}
          {!participantHasVideoStream && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <User size={48} className="text-white" />
                </div>
              )}
              <p className="text-white text-lg font-semibold">{displayName}</p>
              <p className="text-gray-300">Camera is off</p>
              {isSpeaking && (
                <div className="flex items-center gap-2 text-green-400">
                  <Volume2 size={20} />
                  <span>Speaking</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button
            onClick={toggleMic}
            className={`p-4 rounded-full ${
              micOn ? 'bg-white text-gray-800' : 'bg-red-500 text-white'
            } transition-all hover:scale-110 shadow-lg`}
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            onClick={handleEndCall}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
          >
            <Phone size={24} className="rotate-135" />
          </button>
          {callType === 'video' && (
            <button
              onClick={toggleCam}
              className={`p-4 rounded-full ${
                camOn ? 'bg-white text-gray-800' : 'bg-red-500 text-white'
              } transition-all hover:scale-110 shadow-lg`}
            >
              {camOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Active call view with complete state management
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Debug Panel - Remove this in production */}
      <DebugPanel />

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-white text-lg font-semibold">
            {callType === 'video' ? 'Video Call' : 'Audio Call'} - {totalParticipants} participants
            {callState === 'calling' && participants.length === 0 && (
              <span className="text-yellow-400 text-sm ml-2">(Waiting for others...)</span>
            )}
          </h2>
          {callDuration > 0 && (
            <span className="text-green-400 text-sm font-medium">
              ⏱️ {formatTime(callDuration)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* NEW: Clickable "X joined" button */}
          <button
            onClick={() => setShowParticipantsSidebar(!showParticipantsSidebar)}
            className="text-white text-sm bg-blue-600 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Users size={14} />
            {participants.length} joined
          </button>
          <div className="flex items-center gap-2 text-white text-sm">
            <span className={`w-2 h-2 rounded-full ${cameraStatus[currentUserId] ? 'bg-green-500' : 'bg-red-500'}`}></span>
            Camera
            <span className={`w-2 h-2 rounded-full ${micStatus[currentUserId] ? 'bg-green-500' : 'bg-red-500'}`}></span>
            Mic
          </div>
          <button
            onClick={handleEndCall}
            className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Phone size={16} className="rotate-135" />
            End Call
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 grid ${getGridClass()} gap-4 p-4 pt-16 pb-24`}>
        {/* Local Video */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden group">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cameraStatus[currentUserId] ? 'bg-green-500' : 'bg-red-500'}`}></span>
            You {!cameraStatus[currentUserId] && '(Camera Off)'}
            {participantIsSpeaking(currentUserId) && <Volume2 size={12} className="text-green-400" />}
          </div>
          <button
            onClick={() => setFullscreenParticipant(currentUserId)}
            className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
          >
            <Maximize2 size={16} />
          </button>
          {/* Fallback avatar if camera off */}
          {!cameraStatus[currentUserId] && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 bg-gray-800">
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt="You"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-2 border-white shadow-lg">
                  <User size={24} className="text-white" />
                </div>
              )}
              <p className="text-white text-sm font-medium">You</p>
              <p className="text-gray-300 text-xs">Camera is off</p>
              {participantIsSpeaking(currentUserId) && (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <Volume2 size={12} />
                  <span>Speaking</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {participants.map((participantId) => {
          const displayName = getUserDisplayName(participantId);
          const profileImage = getUserProfileImage(participantId);
          const hasParticipantVideo = participantHasVideo(participantId);
          const hasParticipantAudio = participantHasAudio(participantId);
          const isSpeaking = participantIsSpeaking(participantId);

          return (
            <div key={participantId} className="relative bg-gray-900 rounded-lg overflow-hidden group">
              <video
                ref={el => setVideoRef(el, participantId)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasParticipantVideo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {displayName} {!hasParticipantVideo && '(Camera Off)'}
                {isSpeaking && <Volume2 size={12} className="text-green-400" />}
              </div>
              <button
                onClick={() => setFullscreenParticipant(participantId)}
                className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
              >
                <Maximize2 size={16} />
              </button>
              {/* Fallback avatar if no video */}
              {!hasParticipantVideo && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 bg-gray-800">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-2 border-white shadow-lg">
                      <User size={24} className="text-white" />
                    </div>
                  )}
                  <p className="text-white text-sm font-medium">{displayName}</p>
                  <p className="text-gray-300 text-xs">Camera is off</p>
                  {isSpeaking && (
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <Volume2 size={12} />
                      <span>Speaking</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full ${
            micOn ? 'bg-white text-gray-800' : 'bg-red-500 text-white'
          } transition-all hover:scale-110 shadow-lg`}
        >
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button
          onClick={handleEndCall}
          className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
        >
          <Phone size={24} className="rotate-[135deg]" />
        </button>
        {callType === 'video' && (
          <button
            onClick={toggleCam}
            className={`p-4 rounded-full ${
              camOn ? 'bg-white text-gray-800' : 'bg-red-500 text-white'
            } transition-all hover:scale-110 shadow-lg`}
          >
            {camOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        )}
      </div>

      {/* NEW: Render the Participants Sidebar */}
      <ParticipantsSidebar />

    </div>
  );
}
