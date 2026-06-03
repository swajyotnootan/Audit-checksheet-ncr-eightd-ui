import React, { useState, useMemo, useEffect } from "react";
import {
  User,
  MapPin,
  Calendar,
  Download,
  FileText,
  Check,
  RefreshCw,
  Mic,
  AlertCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { downloadForumAttachment } from "../../components/forum/Api/forumapi";
 
// Base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'https://qsutrarmsclm.hub.swajyot.co.in:8476'
  : 'https://qsutrarmsclm.hub.swajyot.co.in:8476';
 
const formatTime = (dateString) => {
  let date;
  try {
    date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
  } catch (e) {
    console.error("Failed to parse date:", dateString, e);
    date = new Date();
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
 
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};
 
const base64ToBlobUrl = (base64, mimeType) => {
  if (!base64) {
    console.warn("base64ToBlobUrl: No base64 data provided");
    return "";
  }
  try {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const url = URL.createObjectURL(blob);
    return url;
  } catch (e) {
    console.error("Failed to convert Base64 to blob:", e, base64.substring(0, 50));
    return "";
  }
};
 
const DocumentPreview = ({ attachment, onDownload }) => {
  const [showPreview, setShowPreview] = useState(false);
  const isPreviewable = attachment.fileType?.startsWith('application/pdf') || false;
 
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const fileIcons = {
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      txt: '📄',
      xls: '📊',
      xlsx: '📊',
      ppt: '📑',
      pptx: '📑',
    };
    return fileIcons[ext] || '📎';
  };
 
  const handlePreview = () => {
    if (attachment.fileData) {
      const mimeType = attachment.fileType || "application/octet-stream";
      const blobUrl = base64ToBlobUrl(attachment.fileData, mimeType);
      if (blobUrl) {
        window.open(blobUrl, '_blank');
      }
    } else if (attachment.id) {
      // Use API_BASE_URL for attachment preview
      window.open(`${API_BASE_URL}/api/forum/attachments/${attachment.id}`, '_blank');
    }
  };
 
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl">{getFileIcon(attachment.fileName)}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate text-sm">
              {attachment.fileName}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>{formatFileSize(attachment.fileSize)}</span>
              <span>•</span>
              <span>{attachment.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
            </div>
          </div>
        </div>
     
        <div className="flex items-center gap-1">
          {isPreviewable && (
            <button
              onClick={handlePreview}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Preview document"
            >
              <Eye size={16} />
            </button>
          )}
       
          <button
            onClick={() => onDownload(attachment)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
            title="Download document"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
   
      <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
        <Calendar size={10} />
        Sent at {formatTime(new Date().toISOString())}
      </div>
    </div>
  );
};
 
export default function ThreadCard({ thread, currentUsername, currentUser, onRetry }) {
  const [imageModal, setImageModal] = useState({ open: false, url: "" });
  const [avatarError, setAvatarError] = useState(false);
 
  // ✅ ENHANCED DEBUG: Better message ownership detection
  const currentUserEmail = currentUser?.email || currentUsername;
  const isOwnMessage = thread.createdBy === currentUserEmail;
 
  console.log('🔍 [ThreadCard] DEBUG:', {
    threadCreatedBy: thread.createdBy,
    currentUserEmail: currentUserEmail,
    currentUsername: currentUsername,
    isOwnMessage: isOwnMessage,
    thread: thread
  });
 
  const processedAttachments = useMemo(() => {
    if (!thread.attachments?.length) return [];
    return thread.attachments.map((attachment) => {
      const { fileData, fileType, id, attachmentType } = attachment;
      let srcUrl = '';
      if (fileData) {
        if (attachmentType === 'IMAGE') {
          srcUrl = `data:${fileType || 'image/png'};base64,${fileData}`;
        } else {
          srcUrl = base64ToBlobUrl(fileData, fileType || 'application/octet-stream');
        }
      } else if (id) {
        // Use API_BASE_URL for attachment URLs
        srcUrl = `${API_BASE_URL}/api/forum/attachments/${id}`;
      }
      return { ...attachment, srcUrl };
    });
  }, [thread.attachments]);
 
  useEffect(() => {
    return () => {
      processedAttachments.forEach((att) => {
        if (att.srcUrl && att.srcUrl.startsWith('blob:')) {
          URL.revokeObjectURL(att.srcUrl);
        }
      });
    };
  }, [processedAttachments]);
 
  const openImageModal = (url) => setImageModal({ open: true, url });
  const closeImageModal = () => setImageModal({ open: false, url: "" });
 
  const handleFileDownload = async (attachment) => {
    if (attachment.fileData) {
      const mimeType = attachment.fileType || "application/octet-stream";
      const blobUrl = base64ToBlobUrl(attachment.fileData, mimeType);
      if (!blobUrl) return;
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", attachment.fileName || "file");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } else if (attachment.id) {
      try {
        // For download, we still use the API function which might already handle the base URL
        // But if downloadForumAttachment uses relative URLs, we need to modify that function too
        const blob = await downloadForumAttachment(attachment.id, "blob");
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", attachment.fileName || "file");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
        alert("Failed to download file");
      }
    }
  };
 
  const renderAttachment = (attachment, index) => {
    const { attachmentType, fileName, fileSize, fileData, fileType, id, srcUrl } = attachment;
    switch (attachmentType) {
      case "IMAGE":
        return (
          <div key={index} className="mt-2">
            <img
              src={srcUrl}
              alt={fileName}
              className="max-w-xs rounded-lg cursor-pointer border"
              onClick={() => openImageModal(srcUrl)}
            />
          </div>
        );
     
      case "VIDEO":
        return (
          <div key={index} className="mt-2">
            <video
              controls
              className="max-w-xs rounded-lg"
              src={srcUrl}
            />
          </div>
        );
      case "AUDIO":
        return (
          <div key={index} className="mt-2">
            <audio controls src={srcUrl} />
          </div>
        );
      case "LOCATION": {
        let locData = null;
        if (fileData) {
          try {
            locData = JSON.parse(atob(fileData));
          } catch (e) {
            console.warn("Invalid location data", fileData);
          }
        }
        const mapUrl = locData?.url || thread.content || "#";
        return (
          <div key={index} className="mt-2 p-2 bg-blue-50 rounded border">
              <span className="text-sm">Location shared</span>
            <div className="mt-1 text-xs text-blue-700">
              <MapPin size={14} className="inline mr-1" />
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on map
              </a>
            </div>
          </div>
        );
      }
      case "EVENT": {
        let eventData = null;
        if (fileData) {
          try {
            eventData = JSON.parse(atob(fileData));
          } catch (e) {
            console.warn("Invalid event data", fileData);
          }
        }
        const title = eventData?.title || "Event";
        const datetime = eventData?.datetime
          ? new Date(eventData.datetime).toLocaleString()
          : "No date";
        return (
          <div key={index} className="mt-2 p-2 bg-purple-50 rounded border">
            <Calendar size={14} className="inline mr-1" />
            <div className="text-sm">
              <strong>{title}</strong>
              <br />
              <span className="text-xs text-gray-600">{datetime}</span>
            </div>
          </div>
        );
      }
      default:
        return (
          <DocumentPreview
            key={index}
            attachment={attachment}
            onDownload={handleFileDownload}
          />
        );
    }
  };
 
  const getMessageStatus = () => {
    if (thread.failed) {
      return {
        icon: (
          <button
            onClick={() => onRetry && onRetry(thread)}
            className="text-red-500 hover:text-red-700 ml-1"
            title="Retry"
          >
            <RefreshCw size={12} />
          </button>
        ),
        text: "Failed",
      };
    }
    return {
      icon: <Check size={12} className="text-blue-500 ml-1" />,
      text: "Sent",
    };
  };
 
  const status = getMessageStatus();
  const avatarSrc = isOwnMessage ? currentUser?.profileImage : thread.createdByProfileImage;
  const avatarAlt = isOwnMessage ? "You" : "Profile";
 
  return (
    <>
      {imageModal.open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={closeImageModal}
              className="absolute -top-10 right-0 text-white bg-black bg-opacity-50 rounded-full p-1"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img
              src={imageModal.url}
              alt="Full size"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
     
      {/* ✅ FIXED: WhatsApp-style message alignment */}
      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4 px-4`}>
        <div className={`max-w-[70%] flex ${isOwnMessage ? "flex-row-reverse" : "flex-row"} gap-2`}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden relative">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={avatarAlt}
                  className="w-8 h-8 object-cover rounded-full"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <User size={14} className="text-gray-600" />
              )}
            </div>
          </div>
         
          {/* Content */}
          <div className={`rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-green-100 border border-green-200"
              : "bg-white border border-gray-200"
          } break-words shadow-sm`}>
           
            {/* Sender name - only for others' messages */}
            {!isOwnMessage && (
              <div className="text-xs text-gray-500 mb-1 font-medium">
                {thread.createdByName || thread.createdBy}
              </div>
            )}
           
            {/* Attachments */}
            {processedAttachments.map(renderAttachment)}
           
            {/* Text content */}
            {thread.content &&
              !processedAttachments.length &&
              thread.messageType !== "EVENT" && (
                <div
                  className="whitespace-pre-wrap break-words overflow-hidden text-gray-800"
                  style={{
                    wordBreak: 'break-word',
                    wordWrap: 'break-word',
                    hyphens: 'auto',
                    maxWidth: '100%'
                  }}
                >
                  {thread.content}
                </div>
              )}
           
            {/* Timestamp & Status */}
            <div className={`flex items-center mt-1 text-xs ${
              isOwnMessage ? "justify-end text-green-600" : "justify-start text-gray-400"
            }`}>
              {formatTime(thread.createdAt)}
              {isOwnMessage && (
                <span className="ml-1">
                  {status.icon}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
 