// src/components/CreateSchedule.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiClock, FiMapPin, FiUsers, FiFileText, 
  FiPlus, FiX, FiSave, FiSend, FiChevronRight
} from 'react-icons/fi';
import { useAuth } from './context/AuthContext';
import { scheduleAPI, userAPI } from '../components/services/api';
import { useToast } from './ToastContext';

const CreateSchedule = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [formData, setFormData] = useState({
    scheduleName: '',
    location: '',
    startDate: '',
    endDate: '',
  });

  const fetchDepartments = async () => {
    try {
      const response = await userAPI.getHODs();
      setDepartments(response);
    } catch (error) {
      console.error('Error fetching departments:', error);
      addToast('Failed to load departments', 'error');
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDepartmentToggle = (deptId) => {
    if (selectedDepartments.includes(deptId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    } else {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.scheduleName || !formData.startDate || !formData.endDate) {
      addToast('Please fill all required fields', 'error');
      return;
    }
    
    if (selectedDepartments.length === 0) {
      addToast('Please select at least one department', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const scheduleData = {
        scheduleName: formData.scheduleName,
        location: formData.location || 'Not specified',
        startDate: formData.startDate,
        endDate: formData.endDate,
        departmentIds: selectedDepartments,
        createdBy: user?.id
      };
      
      const response = await scheduleAPI.create(scheduleData);
      addToast('Schedule created successfully!', 'success');
      navigate('/audit-manager');
    } catch (error) {
      console.error('Error creating schedule:', error);
      addToast(error.response?.data?.message || 'Failed to create schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiCalendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create Audit Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">Plan and schedule new internal audits</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiFileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="scheduleName"
                  value={formData.scheduleName}
                  onChange={handleInputChange}
                  placeholder="e.g., Q1 2025 Internal Audit"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Plant A, Corporate Office"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Departments Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedDepartments.includes(dept.id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => handleDepartmentToggle(dept.id)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{dept.name}</p>
                  <p className="text-xs text-gray-400">{dept.location || 'N/A'}</p>
                </div>
                <FiChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  selectedDepartments.includes(dept.id) ? 'text-purple-500' : ''
                }`} />
              </label>
            ))}
          </div>
          {departments.length === 0 && (
            <p className="text-center text-gray-400 py-4">No departments available</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <FiSave className="w-4 h-4" />
            )}
            Create Schedule
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSchedule;