//src/Components/forum/AudioCallModal.jsx
import React, { useEffect, useState, useRef } from 'react';
import { X, Mic, MicOff, Phone, User, Volume2, Users, Circle } from 'lucide-react';
import ringtone from '../../assets/callertune.mp3';
import callertune from '../../assets/callertune.mp3';

export default function AudioCallModal({
  callState,
  callerName,
  isAdmin,
  currentUserId,
  localStream,
  remoteStreams, // This is the state object from useSFU: { userId1: stream1, userId2: stream2, ... }
  participants,  // This is the array from useSFU: [userId1, userId2, ...]
  allUsers,
  currentUser,
  onAccept,
  onDecline,
  onCancel,
  onClose,
  onEndCall,
}) {
  const [micOn, setMicOn] = useState(true);
  const audioRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);
  const [activeSpeakers, setActiveSpeakers] = useState(new Set());
  const [participantStatus, setParticipantStatus] = useState({});
  // NEW: State for the participants sidebar
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);
  // Audio elements for each participant
  const audioElementsRef = useRef({});
  const audioAnalysersRef = useRef({});

  // ✅ ENHANCED: Complete cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[AUDIO MODAL] Performing complete cleanup');
      // Stop main audio
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
      // Clean up audio analysers
      Object.values(audioAnalysersRef.current).forEach(({ audioContext, analyser, javascriptNode }) => {
        try {
          javascriptNode?.disconnect();
          analyser?.disconnect();
          audioContext?.close();
        } catch (err) {
          console.warn('Error cleaning up audio analyser:', err);
        }
      });
      audioAnalysersRef.current = {};
      // Clear timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, []);

  // ✅ ENHANCED: Participant status tracking with robust matching
  useEffect(() => {
    const newParticipantStatus = {};

    // Local user
    newParticipantStatus[currentUserId] = {
      isSpeaking: activeSpeakers.has(currentUserId),
      micOn: micOn,
      joinedAt: new Date().toISOString(),
      isLocal: true
    };

    // Remote participants - Use a more robust approach
    // Iterate through the keys of remoteStreams and match them against the participants array.
    // This handles potential discrepancies in how userIds are stored vs. listed.
    Object.keys(remoteStreams).forEach(streamKey => {
      // Check if this streamKey corresponds to a known participant
      if (participants.includes(streamKey)) {
        const stream = remoteStreams[streamKey]; // Get the stream using the key from remoteStreams
        const hasAudio = stream?.getAudioTracks().length > 0;
        const audioEnabled = hasAudio ? stream.getAudioTracks()[0].enabled : false;

        newParticipantStatus[streamKey] = {
          isSpeaking: activeSpeakers.has(streamKey),
          micOn: audioEnabled,
          joinedAt: new Date().toISOString(),
          isLocal: false,
          hasAudio
        };

        // Setup audio element and monitoring for this participant if it doesn't exist
        if (hasAudio && !audioElementsRef.current[streamKey]) {
          console.log(`[AUDIO MODAL] Setting up audio for participant: ${streamKey}`);
          setupParticipantAudio(streamKey, stream);
        } else if (!hasAudio && audioElementsRef.current[streamKey]) {
          // Clean up if participant lost audio
          console.log(`[AUDIO MODAL] Cleaning up audio for participant (no audio): ${streamKey}`);
          cleanupParticipantAudio(streamKey);
        }
      } else {
        // If the streamKey is in remoteStreams but NOT in the participants list,
        // it means the participant has left, but their stream wasn't cleaned up yet.
        // We should clean up the audio element for this stale stream.
        console.log(`[AUDIO MODAL] Found stale stream for ${streamKey}, not in participants list. Cleaning up.`);
        cleanupParticipantAudio(streamKey);
      }
    });

    // Clean up participants who left (if they were somehow missed above or if remoteStreams was empty initially)
    // Iterate through existing audio elements
    Object.keys(audioElementsRef.current).forEach(participantId => {
      // If the audio element exists for a participantId that is no longer in the participants list or remoteStreams,
      // clean it up.
      if (!participants.includes(participantId) && participantId !== currentUserId) {
        console.log(`[AUDIO MODAL] Participant ${participantId} left. Cleaning up audio.`);
        cleanupParticipantAudio(participantId);
      }
    });

    setParticipantStatus(newParticipantStatus);
  }, [participants, remoteStreams, activeSpeakers, micOn, currentUserId]); // Ensure effect runs when these states change


  // ✅ ENHANCED: Setup participant audio with volume monitoring
  const setupParticipantAudio = (participantId, stream) => {
    try {
      // Create audio element
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = false; // Ensure it's not muted by default
      audioElementsRef.current[participantId] = audio;

      // Setup audio level monitoring for speaking detection
      if (stream.getAudioTracks().length > 0) {
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
          if (average > 25) {
            setActiveSpeakers(prev => new Set([...prev, participantId]));
          } else {
            setActiveSpeakers(prev => {
              const newSet = new Set(prev);
              newSet.delete(participantId);
              return newSet;
            });
          }
        };

        audioAnalysersRef.current[participantId] = { audioContext, analyser, javascriptNode };
      }
      console.log(`✅ Audio setup completed for ${participantId}`);
    } catch (error) {
      console.error(`❌ Failed to setup audio for ${participantId}:`, error);
    }
  };

  // ✅ ENHANCED: Cleanup participant audio
  const cleanupParticipantAudio = (participantId) => {
    // Clean up audio element
    if (audioElementsRef.current[participantId]) {
      console.log(`🧹 Stopping audio for ${participantId}`);
      audioElementsRef.current[participantId].pause();
      audioElementsRef.current[participantId].srcObject = null; // Disconnect stream
      delete audioElementsRef.current[participantId];
    }
    // Clean up audio analyser
    if (audioAnalysersRef.current[participantId]) {
      const { audioContext, analyser, javascriptNode } = audioAnalysersRef.current[participantId];
      try {
        javascriptNode?.disconnect();
        analyser?.disconnect();
        if (audioContext.state !== 'closed') {
          audioContext.close(); // Close the audio context
        }
      } catch (err) {
        console.warn('Error cleaning up audio analyser:', err);
      }
      delete audioAnalysersRef.current[participantId];
    }
    // Remove from active speakers
    setActiveSpeakers(prev => {
      const newSet = new Set(prev);
      newSet.delete(participantId);
      return newSet;
    });
    console.log(`🧹 Audio cleanup completed for ${participantId}`);
  };

  // Helper to get user display name
  const getUserDisplayName = (userId) => {
    if (userId === currentUserId) return 'You';
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim() || user.username || user.email;
    }
    return userId;
  };

  // Helper to get user profile image
  const getUserProfileImage = (userId) => {
    if (userId === currentUserId) return currentUser?.profileImage || null;
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    return user?.profileImage || null;
  };

  // ✅ ENHANCED: Audio management with proper cleanup
  useEffect(() => {
    if (callState === 'ringing' && !audioRef.current) {
      console.log('🔊 Playing ringtone for incoming audio call');
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

  // ✅ ENHANCED: Caller tune for outgoing call
  useEffect(() => {
    if (callState === 'calling' && participants.length === 0 && !audioRef.current) {
      console.log('🔊 Playing caller tune for outgoing audio call');
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
        if (audioRef.current && callState !== 'connected') {
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

  // ✅ ENHANCED: Toggle microphone with state persistence
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !micOn;
        setMicOn(!micOn);
        console.log('🎤 Microphone:', !micOn ? 'ON' : 'OFF');
      }
    }
  };

  // ✅ ENHANCED: Call handlers with complete cleanup
  const handleAccept = () => {
    console.log('✅ Accepting audio call');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onAccept();
  };

  const handleDecline = () => {
    console.log('❌ Declining audio call');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onDecline();
  };

  const handleEndCall = () => {
    console.log('📞 Ending audio call - performing complete cleanup');
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
    // Clean up audio analysers
    Object.values(audioAnalysersRef.current).forEach(({ audioContext, analyser, javascriptNode }) => {
      try {
        javascriptNode?.disconnect();
        analyser?.disconnect();
        audioContext?.close();
      } catch (err) {
        console.warn('Error cleaning up audio analyser:', err);
      }
    });
    audioAnalysersRef.current = {};
    // Reset states
    setCallDuration(0);
    setActiveSpeakers(new Set());
    onEndCall();
  };

  // Determine participants to show (exclude current user if admin, or show all if not)
  const participantsToShow = isAdmin ? participants.filter(p => p !== currentUserId) : participants;

  // Determine caller for display in calling/ringing state
  const displayCallerName = callerName || (participants.length > 0 ? getUserDisplayName(participants[0]) : 'Unknown');

  // NEW: Participants Sidebar Component
  const ParticipantsSidebar = () => {
    if (!showParticipantsSidebar) return null; // Only render if state is true
    // Function to close the sidebar
    const closeSidebar = () => {
      setShowParticipantsSidebar(false);
    };
    return (
      // Add onClick handler to the outermost container (the overlay)
      // Clicking anywhere on the semi-transparent background area will close the sidebar
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
        onClick={closeSidebar} // This handles clicks on the overlay/background
      >
        {/* Add stopPropagation to the actual sidebar content */}
        {/* So clicking *inside* the sidebar doesn't trigger the overlay click */}
        <div
          className="h-full w-full max-w-md bg-black text-white z-40 overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Prevents clicks inside the sidebar from bubbling up
        >
          {/* Sidebar Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Participants ({participants.length + 1})</h3>
            <button
              onClick={closeSidebar} // Use the same function
              className="text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1" // Added focus styles for accessibility
              aria-label="Close participants sidebar" // Added aria-label for accessibility
            >
              <X size={24} />
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
                  {micOn ? <Mic size={12} /> : <MicOff size={12} />}
                  {activeSpeakers.has(currentUserId) && <Volume2 size={12} className="text-green-400" />}
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
                    {participantStatus[participantId]?.micOn ? <Mic size={12} /> : <MicOff size={12} />}
                    {activeSpeakers.has(participantId) && <Volume2 size={12} className="text-green-400" />}
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

  // ✅ ENHANCED: Debug Panel
  const DebugPanel = () => (
    <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-20">
      <h3 className="font-bold mb-2">🎤 AUDIO CALL DEBUG</h3>
      <div className="space-y-1">
        <div>Call State: {callState}</div>
        <div>Participants Array Length: {participants.length}</div>
        <div>Remote Streams Keys: {Object.keys(remoteStreams).join(', ')}</div>
        <div>Active Speakers: {activeSpeakers.size}</div>
        <div>Duration: {formatTime(callDuration)}</div>
        <div>Local Mic: {micOn ? '✅ ON' : '❌ OFF'}</div>
        <div>Audio Elements: {Object.keys(audioElementsRef.current).length}</div>
        <div>Participant Status Keys: {Object.keys(participantStatus).join(', ')}</div>
      </div>
    </div>
  );

  // ✅ ENHANCED: Participants Panel (Kept for reference, but using sidebar now)
  const ParticipantsPanel = () => (
    <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-20">
      <h3 className="font-bold mb-2">👥 PARTICIPANTS ({participants.length + 1})</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {/* Local user */}
        <div className="flex items-center gap-2 p-2 bg-white bg-opacity-10 rounded">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="font-semibold">You</span>
          <div className="flex gap-1 ml-auto">
            {micOn && <Mic size={12} />}
            {activeSpeakers.has(currentUserId) && <Volume2 size={12} className="text-green-400 animate-pulse" />}
          </div>
        </div>
        {/* Remote participants */}
        {participants.map(participantId => (
          <div key={participantId} className="flex items-center gap-2 p-2 bg-white bg-opacity-10 rounded">
            <div className={`w-3 h-3 rounded-full ${
              participantStatus[participantId]?.leftAt ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
            <span>{getUserDisplayName(participantId)}</span>
            <div className="flex gap-1 ml-auto">
              {participantStatus[participantId]?.micOn && <Mic size={12} />}
              {activeSpeakers.has(participantId) && <Volume2 size={12} className="text-green-400 animate-pulse" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (callState === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="text-green-600 rotate-[135deg]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Incoming Audio Call</h2>
          <p className="text-gray-600 mb-6">from <span className="font-semibold">{displayCallerName}</span></p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleDecline}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Phone size={20} className="rotate-[135deg]" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            >
              <Phone size={20} />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callState === 'calling' && participantsToShow.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Calling...</h2>
          <p className="text-gray-600 mb-6">Calling {displayCallerName}</p>
          {/* Audio Status */}
          <div className={`rounded-lg p-3 mb-6 ${
            localStream?.getAudioTracks().length > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mic size={16} className={localStream?.getAudioTracks().length > 0 ? 'text-green-600' : 'text-red-600'} />
              <span>Microphone: {localStream?.getAudioTracks().length > 0 ? '✅ Ready' : '❌ Not available'}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Phone size={20} className="rotate-[135deg]" />
              Cancel Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected/Active Call View
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 z-50 flex flex-col">
      <DebugPanel />
      {/* Note: The original ParticipantsPanel is removed to avoid conflict with the new sidebar */}
      {/* <ParticipantsPanel /> */}
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-white text-lg font-semibold">
            Audio Call - {participants.length + 1} participants
            {callState === 'calling' && ' (Connecting...)'}
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
            <span className={`w-2 h-2 rounded-full ${micOn ? 'bg-green-500' : 'bg-red-500'}`}></span>
            Mic
          </div>
          <button
            onClick={handleEndCall}
            className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Phone size={16} className="rotate-[135deg]" />
            End Call
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-16 pb-24">
        <div className="text-center">
          {/* Current Speaker Visualization */}
          {activeSpeakers.size > 0 && (
            <div className="mb-8">
              <div className="text-white text-lg font-semibold mb-4">
                🎤 {activeSpeakers.size} participant{activeSpeakers.size > 1 ? 's' : ''} speaking
              </div>
              <div className="flex justify-center gap-2">
                {[...activeSpeakers].map(speakerId => (
                  <div key={speakerId} className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <Volume2 size={12} />
                    {getUserDisplayName(speakerId)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {/* Local User */}
            <div className={`bg-white bg-opacity-20 rounded-2xl p-6 flex flex-col items-center gap-3 backdrop-blur-sm border-2 ${
              activeSpeakers.has(currentUserId) ? 'border-green-400 shadow-lg shadow-green-400/25' : 'border-white border-opacity-30'
            } transition-all duration-300`}>
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt="You"
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <User size={32} className="text-white" />
                </div>
              )}
              <div className="text-center">
                <p className="text-white font-semibold text-lg">You</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {micOn ? (
                    <Mic size={16} className="text-green-400" />
                  ) : (
                    <MicOff size={16} className="text-red-400" />
                  )}
                  {activeSpeakers.has(currentUserId) && (
                    <Volume2 size={16} className="text-green-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {/* Remote Participants */}
            {participants.map((participantId) => {
              const displayName = getUserDisplayName(participantId);
              const profileImage = getUserProfileImage(participantId);
              const isSpeaking = activeSpeakers.has(participantId);
              const hasAudio = participantStatus[participantId]?.hasAudio;
              const micEnabled = participantStatus[participantId]?.micOn;

              return (
                <div key={participantId} className={`bg-white bg-opacity-20 rounded-2xl p-6 flex flex-col items-center gap-3 backdrop-blur-sm border-2 ${
                  isSpeaking ? 'border-green-400 shadow-lg shadow-green-400/25' : 'border-white border-opacity-30'
                } transition-all duration-300`}>
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
                      <User size={32} className="text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">{displayName}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {hasAudio ? (
                        micEnabled ? (
                          <Mic size={16} className="text-green-400" />
                        ) : (
                          <MicOff size={16} className="text-red-400" />
                        )
                      ) : (
                        <Circle size={16} className="text-yellow-400" />
                      )}
                      {isSpeaking && (
                        <Volume2 size={16} className="text-green-400 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call Status */}
          {participants.length === 0 && callState === 'calling' && (
            <div className="mt-8 text-white text-lg">
              Waiting for participants to join...
            </div>
          )}
        </div>
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
      </div>

      {/* NEW: Render the Participants Sidebar */}
      <ParticipantsSidebar />
    </div>
  );
}