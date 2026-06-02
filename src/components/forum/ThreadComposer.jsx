// src/Components/forum/ThreadComposer.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Send,
  X,
  ImageIcon,
  VideoIcon,
  FileText,
  MapPin,
  Calendar,
  Mic,
  StopCircle,
  AlertCircle,
  Camera,
  Plus,
  Image as ImageIconOutline,
} from "lucide-react";

const ThreadComposer = ({
  groupId,
  onThreadCreated,
  onInputStart,
  onInputEnd,
  username,
}) => {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [micError, setMicError] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [eventForm, setEventForm] = useState({ open: false, title: "", datetime: "" });
  const [error, setError] = useState("");
  const videoChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioTimerRef = useRef(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const voiceChunks = useRef([]);
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, [cameraStream]);

  // Bind camera stream to video element when modal opens
  useEffect(() => {
    if (cameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraModalOpen, cameraStream]);

  // Start camera preview — assign stream AFTER video element is ready
  const openCamera = async () => {
    try {
      // Use browser default camera (prefer front-facing for user-facing apps)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setCameraStream(stream);
      setCameraModalOpen(true);
      setError(""); // Clear any previous error
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Please allow camera access in your browser settings and refresh the page.");
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setCameraStream(null);
    setCameraModalOpen(false);
    setIsRecordingVideo(false);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };

  const takePhoto = () => {
    if (!videoRef.current || !cameraStream) return;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });

      setPreviewMedia({
        type: "image",
        blob,
        base64,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      closeCamera();
    }, "image/jpeg");
  };

  const startVideoRecording = async () => {
    if (!cameraStream) return;

    try {
      // Try to add audio track for video recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      cameraStream.addTrack(audioTrack);
      console.log("Audio track added for video recording");
    } catch (audioErr) {
      console.warn("Audio access denied, recording video without audio", audioErr);
      // Continue without audio
    }

    // Reset and start timer
    setRecordingTime(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const startTime = Date.now();
    recordingTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingTime(elapsed);
      // Auto-stop at 30s
      if (elapsed >= 30) {
        stopVideoRecording();
      }
    }, 1000);

    const recorder = new MediaRecorder(cameraStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };
    recorder.onstop = async () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);

      const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" });

      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });

      setPreviewMedia({
        type: "video",
        blob,
        base64,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      videoChunksRef.current = [];
      setIsRecordingVideo(false);
      closeCamera();
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecordingVideo(true);
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  };

  const handleFileUpload = (files) => {
    const newAttachments = Array.from(files).map((file) => {
      let type = "FILE";
      if (file.type.startsWith("image/")) type = "IMAGE";
      else if (file.type.startsWith("video/")) type = "VIDEO";
      else if (file.type.startsWith("audio/")) type = "AUDIO";
      return {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        attachmentType: type,
        file: file, // <-- This is critical for handleSubmit to work!
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    setShowAttachmentMenu(false);
  };

  const triggerFileInput = (accept) => {
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setContent("📍 Shared location");
          setAttachments((prev) => [
            ...prev,
            {
              fileName: "location.json",
              fileType: "application/json",
              fileSize: 0,
              attachmentType: "LOCATION",
              locationUrl: url,
            },
          ]);
          setShowAttachmentMenu(false);
        },
        () => setError("Location access denied")
      );
    }
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.datetime) return;
    const eventData = {
      title: eventForm.title,
      datetime: eventForm.datetime,
    };
    setContent(`📅 ${eventForm.title} @ ${new Date(eventForm.datetime).toLocaleString()}`);
    setAttachments((prev) => [
      ...prev,
      {
        fileName: "event.json",
        fileType: "application/json",
        fileSize: JSON.stringify(eventData).length,
        attachmentType: "EVENT",
        eventData,
      },
    ]);
    setEventForm({ open: false, title: "", datetime: "" });
  };

  const startVoiceRecording = async () => {
    if (isRecordingVoice) {
      voiceRecorderRef.current?.stop();
      return;
    }

    try {
      const selectedMic = localStorage.getItem('selectedMic');
      const audioConstraints = selectedMic ? { deviceId: { exact: selectedMic } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      voiceStreamRef.current = stream;
      voiceChunks.current = [];
      const recorder = new MediaRecorder(stream);
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceChunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        setAudioRecordingTime(0);

        const blob = new Blob(voiceChunks.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });

        // Convert to Base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(blob);
        });

        setPreviewMedia({
          type: "audio",
          blob,
          base64,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        setIsRecordingVoice(false);
        setMicError(false);

        // Stop the stream
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach((t) => t.stop());
          voiceStreamRef.current = null;
        }
      };

      // Start timer
      setAudioRecordingTime(0);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      const startTime = Date.now();
      audioTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setAudioRecordingTime(elapsed);
        if (elapsed >= 30) {
          voiceRecorderRef.current?.stop();
        }
      }, 1000);

      recorder.start();
      setIsRecordingVoice(true);
      setMicError(false);
    } catch (err) {
      console.error("Mic error:", err);
      setMicError(true);
      setError("Microphone access denied");
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    let messageType = "TEXT";
    if (attachments.length > 0) {
      messageType = attachments[0].attachmentType;
    }

    const attachmentPromises = attachments.map(async (att) => {
      if (att.file) {
        // For file input uploads
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(att.file);
        });
        return {
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          attachmentType: att.attachmentType,
          fileData: base64,
        };
      } else if (att.attachmentType === "LOCATION") {
        return {
          fileName: "location.json",
          fileType: "application/json",
          fileSize: 0,
          attachmentType: "LOCATION",
          fileData: btoa(JSON.stringify({ url: att.locationUrl })),
        };
      } else if (att.attachmentType === "EVENT") {
        return {
          fileName: "event.json",
          fileType: "application/json",
          fileSize: JSON.stringify(att.eventData).length,
          attachmentType: "EVENT",
          fileData: btoa(JSON.stringify(att.eventData)),
        };
      }
      // For camera captures (already have fileData)
      return att;
    });

    const resolvedAttachments = await Promise.all(attachmentPromises);

    // Use username as email (since we're transitioning to email-based system)
    const userEmail = username || "anonymous@jws.com";
    
    const payload = {
      content: content.trim() || " ",
      createdBy: userEmail,
      messageType,
      attachments: resolvedAttachments,
    };

    onThreadCreated(payload);
    setContent("");
    setAttachments([]);
    setError("");
    setShowAttachmentMenu(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (val.trim()) onInputStart?.();
    else onInputEnd?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full relative">
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-sm mb-2 px-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative bg-gray-100 rounded p-2 text-sm">
              {att.attachmentType === "IMAGE" && "📷 Image"}
              {att.attachmentType === "VIDEO" && "🎥 Video"}
              {att.attachmentType === "AUDIO" && "🎤 Voice"}
              {att.attachmentType === "LOCATION" && "📍 Location"}
              {att.attachmentType === "EVENT" && `📅 ${att.eventData?.title || "Event"}`}
              {att.attachmentType === "FILE" && `📄 ${att.fileName}`}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio Recording Indicator */}
      {isRecordingVoice && (
        <div className="flex justify-center items-center gap-3 bg-red-100 border border-red-400 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">Recording Audio...</span>
          </div>
          <div className="text-lg font-mono text-red-600 bg-red-200 px-2 py-1 rounded">
            00:{String(audioRecordingTime % 60).padStart(2, "0")}
          </div>
          <button
            onClick={() => voiceRecorderRef.current?.stop()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1"
          >
            <StopCircle size={16} />
            Stop
          </button>
        </div>
      )}

      {/* Preview Media Modal */}
      {previewMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-md relative max-h-[80vh] overflow-auto">
            
            <h3 className="text-center font-medium mb-3">
              Preview {previewMedia.type.toUpperCase()}
            </h3>
            {previewMedia.type === "image" && (
              <img
                src={URL.createObjectURL(previewMedia.blob)}
                alt="Preview"
                className="w-full mb-4 rounded object-cover"
              />
            )}
            {previewMedia.type === "audio" && (
              <audio controls className="w-full mb-4">
                <source
                  src={URL.createObjectURL(previewMedia.blob)}
                  type={previewMedia.fileType}
                />
                Your browser does not support the audio element.
              </audio>
            )}
            {previewMedia.type === "video" && (
              <video controls className="w-full mb-4 rounded" autoPlay muted>
                <source
                  src={URL.createObjectURL(previewMedia.blob)}
                  type={previewMedia.fileType}
                />
                Your browser does not support the video element.
              </video>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAttachments((prev) => [
                    ...prev,
                    {
                      fileName: previewMedia.fileName,
                      fileType: previewMedia.fileType,
                      fileSize: previewMedia.fileSize,
                      attachmentType: previewMedia.type.toUpperCase(),
                      fileData: previewMedia.base64,
                    },
                  ]);
                  setPreviewMedia(null);
                }}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Confirm
              </button>
              <button
                onClick={() => setPreviewMedia(null)}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-md relative">
            <button
              onClick={closeCamera}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              <X size={14} />
            </button>
            <h3 className="text-center font-medium mb-3">Capture Media</h3>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded border border-gray-300 bg-black"
            />
            <div className="flex justify-center gap-3 mt-4">
              {!isRecordingVideo ? (
                <>
                  <button
                    onClick={takePhoto}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <ImageIconOutline size={16} /> Photo
                  </button>
                  <button
                    onClick={startVideoRecording}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <VideoIcon size={16} /> Video (30s)
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-white text-lg font-mono bg-red-500 px-3 py-1 rounded">
                    {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
                    {String(recordingTime % 60).padStart(2, "0")}
                  </div>
                  <button
                    onClick={stopVideoRecording}
                    className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded"
                  >
                    <StopCircle size={16} /> Stop Recording
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {eventForm.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-medium mb-3">Create Event</h3>
            <form onSubmit={handleEventSubmit}>
              <input
                type="text"
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full p-2 border rounded mb-3 text-sm"
                required
              />
              <input
                type="datetime-local"
                value={eventForm.datetime}
                onChange={(e) => setEventForm({ ...eventForm, datetime: e.target.value })}
                className="w-full p-2 border rounded mb-3 text-sm"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Add Event
                </button>
                <button
                  type="button"
                  onClick={() => setEventForm({ open: false, title: "", datetime: "" })}
                  className="flex-1 bg-gray-300 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Composer */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white border rounded-full p-2">
        <button
          type="button"
          onClick={openCamera}
          className="p-2 text-gray-500 hover:text-green-600"
        >
          <Camera size={20} />
        </button>

        <button
          type="button"
          onClick={startVoiceRecording}
          className={`p-2 rounded-full ${isRecordingVoice ? "bg-red-500 text-white" : "text-gray-500"}`}
          disabled={micError}
        >
          {isRecordingVoice ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="p-2 text-gray-500 hover:text-blue-600"
          >
            <Paperclip size={20} />
          </button>

          {showAttachmentMenu && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border rounded shadow-lg p-2 flex flex-col gap-1 z-10 min-w-[160px]">
              <button
                type="button"
                onClick={() => triggerFileInput("image/*")}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
              >
                <ImageIcon size={16} /> Image
              </button>
              <button
                type="button"
                onClick={() => triggerFileInput("video/*")}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
              >
                <VideoIcon size={16} /> Video
              </button>
              <button
                type="button"
                onClick={() => triggerFileInput(".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx")}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
              >
                <FileText size={16} /> Document
              </button>
              <button
                type="button"
                onClick={handleLocation}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
              >
                <MapPin size={16} /> Location
              </button>
              <button
                type="button"
                onClick={() => setEventForm({ open: true, title: "", datetime: "" })}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
              >
                <Calendar size={16} /> Event
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          multiple
        />

        <textarea
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none resize-none max-h-24 text-sm py-1 px-2"
          rows={1}
        />

        <button
          type="submit"
          disabled={!content.trim() && attachments.length === 0}
          className={`p-2 rounded-full ${
            content.trim() || attachments.length > 0
              ? "bg-green-500 text-white"
              : "text-gray-400 cursor-not-allowed"
          }`}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ThreadComposer;
