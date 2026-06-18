// components/dashboards/QMSAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FiFileText, FiSend, FiCheckCircle, FiClock, FiAlertCircle, 
  FiEye, FiSearch, FiRefreshCw, FiGrid, FiList, FiUser, 
  FiCalendar, FiTrendingUp, FiX, FiBarChart2, FiActivity,
  FiShield, FiCopy, FiDownload, FiShare2, FiExternalLink
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../ToastContext';  // ← Import your custom hook

const API_BASE = import.meta.env.VITE_API_URL || 'https://internalaudit.hub.swajyot.co.in:8090/api';

const QMSAdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();  // ← Use addToast instead of showToast
  const [loading, setLoading] = useState(true);
  const [releasedTemplates, setReleasedTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  // Fetch released templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/templates/released`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setReleasedTemplates(response.data.data);
        setFilteredTemplates(response.data.data);
        setStatistics({
          total: response.data.data.length,
          active: response.data.data.filter(t => t.isActive !== false).length,
          inactive: response.data.data.filter(t => t.isActive === false).length
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      addToast('Failed to load templates', 'error');  // ← Use addToast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = releasedTemplates;
    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.templateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredTemplates(filtered);
    setCurrentPage(1);
  }, [searchTerm, releasedTemplates]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Link copied to clipboard!', 'success');  // ← Use addToast
  };

  const sendEmailShare = async () => {
    if (!shareEmail) {
      addToast('Please enter an email address', 'error');  // ← Use addToast
      return;
    }
    
    setSendingEmail(true);
    try {
      await axios.post(
        `${API_BASE}/templates/${selectedTemplate.id}/share`,
        {
          email: shareEmail,
          templateName: selectedTemplate.templateName,
          externalLink: selectedTemplate.externalLink
        },
        { withCredentials: true }
      );
      addToast(`Invitation sent to ${shareEmail}`, 'success');  // ← Use addToast
      setShareEmail('');
      setShowShareModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      addToast('Failed to send email', 'error');  // ← Use addToast
    } finally {
      setSendingEmail(false);
    }
  };

  const downloadQRCode = async (template) => {
    try {
      const qrCodeUrl = `${API_BASE}/qrcode?data=${encodeURIComponent(template.externalLink)}`;
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-${template.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('QR Code downloaded!', 'success');  // ← Use addToast
    } catch (error) {
      addToast('Failed to download QR code', 'error');  // ← Use addToast
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const ShareModal = () => {
    if (!selectedTemplate) return null;
    
    const qrCodeUrl = `${API_BASE}/qrcode?data=${encodeURIComponent(selectedTemplate.externalLink)}`;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <FiShare2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Share Template</h3>
            </div>
            <button
              onClick={() => {
                setShowShareModal(false);
                setSelectedTemplate(null);
                setShareEmail('');
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
              <p className="font-semibold text-purple-900">{selectedTemplate.templateName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-purple-200 text-purple-700 rounded-full text-xs font-medium">
                  Released
                </span>
                <span className="text-xs text-purple-600">v{selectedTemplate.version}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External Link</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <FiExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={selectedTemplate.externalLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(selectedTemplate.externalLink)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <FiCopy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Share via Email</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                  <FiSend className="w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <button
                  onClick={sendEmailShare}
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {sendingEmail ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiSend className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-32 h-32 border-2 border-white rounded-xl shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <button
                  onClick={() => downloadQRCode(selectedTemplate)}
                  className="mt-3 px-4 py-2 text-sm bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Download QR Code
                </button>
              </div>
            </div>
            
            <button
              onClick={() => {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(selectedTemplate.externalLink)}`;
                window.open(whatsappUrl, '_blank');
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
            >
              <FiShare2 className="w-4 h-4" />
              Share via WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TemplateCard = ({ template }) => (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-800 text-lg group-hover:text-purple-600 transition-colors">
            {template.templateName}
          </h3>
          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
            <FiTrendingUp className="w-3 h-3" />
            v{template.version}
          </span>
        </div>
        {template.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <FiCalendar className="w-3 h-3" />
            Created: {formatDate(template.createdAt)}
          </span>
        </div>
      </div>
      <div className="border-t border-gray-100 p-4 bg-gray-50 flex gap-2">
        <Link
          to={`/template/view/${template.id}`}
          className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-2 transition-all"
        >
          <FiEye className="w-4 h-4" />
          View
        </Link>
        <button
          onClick={() => {
            setSelectedTemplate(template);
            setShowShareModal(true);
          }}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 text-sm font-medium flex items-center justify-center gap-2 transition-all"
        >
          <FiShare2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );

  const TemplateListItem = ({ template }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 bg-gray-100 rounded-xl">
            <FiFileText className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800">{template.templateName}</h3>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                v{template.version}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{template.description || 'No description'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>Created: {formatDate(template.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/template/view/${template.id}`}
            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FiEye className="w-4 h-4" />
            View
          </Link>
          <button
            onClick={() => {
              setSelectedTemplate(template);
              setShowShareModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FiShare2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );

  const templatesIndexLast = currentPage * itemsPerPage;
  const templatesIndexFirst = templatesIndexLast - itemsPerPage;
  const currentTemplates = filteredTemplates.slice(templatesIndexFirst, templatesIndexLast);
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiShield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">QMS Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage and share released templates
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Logged in as: <span className="font-medium">{user?.name || user?.username}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Templates</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.total}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiFileText className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Released</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.total}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiExternalLink className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & View Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <FiList className="w-5 h-5" />
            </button>
            <button
              onClick={fetchTemplates}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <div className="text-4xl mb-3 opacity-50">📄</div>
          <p className="text-gray-500">No released templates found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTemplates.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {currentTemplates.map(template => (
            <TemplateListItem key={template.id} template={template} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            
            if (pageNum > 0 && pageNum <= totalPages) {
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            }
            return null;
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && <ShareModal />}
    </div>
  );
};

export default QMSAdminDashboard;