// src/components/steps/D0PlanContain.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Hash,
  Factory,
  Package,
  Barcode,
  AlertCircle,
  CalendarDays,
  User,
  Info,
  X,
  FileText,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Drawer from "../Drawer";
import axios from "axios";
import { createForumGroup } from "../forum/Api/forumapi";
import FinalPreview from "./FinalPreview";
import { useAuth } from "../../components/context/AuthContext";

// Import your centralized API service
import { userAPI } from "../services/api";

const companies = [
  { name: "TTK Prestige", logo: "/logos/ttk-prestige.png" },
  { name: "Boeing", logo: "/logos/boeing.png" },
  { name: "Feather Light Furniture", logo: "/logos/feather-light.png" },
];

// Default departments as fallback
const defaultDepartments = [
  { id: 1, name: "Quality" },
  { id: 2, name: "Production" },
  { id: 3, name: "Engineering" },
  { id: 4, name: "Maintenance" },
  { id: 5, name: "Supply Chain" },
  { id: 6, name: "R&D" },
  { id: 7, name: "Other" },
];

function InputField({ label, name, value, onChange, type = "text", required = false, error }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600 flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Custom Dropdown Component for User Selection - FIXED VERSION
// Fixed UserDropdown Component
function UserDropdown({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select user...",
  loading = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option) => {
    console.log('✅ User selected:', option);
    // Pass the entire option object to parent
    onChange(option);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : (selectedOption?.label || value || "")}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onClick={handleInputClick}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 pr-10 cursor-pointer ${
            required && !value ? "border-orange-500 bg-orange-50" : ""
          }`}
          readOnly={!isOpen}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearchTerm("");
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-2 text-center text-gray-500">
              <Loader2 size={16} className="animate-spin mx-auto" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-gray-500">No users found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                className="p-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.email}</div>
                {option.department && (
                  <div className="text-xs text-gray-400">Dept: {option.department}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
// Team Member Component - COMPLETELY FIXED VERSION
// Fixed TeamMemberField Component
function TeamMemberField({ 
  member, 
  index, 
  onChange, 
  onRemove, 
  error,
  onSearchUser,
  loadingSearch,
  departments = [],
  userOptions = [],
  loadingUsers = false
}) {
  const [searchMode, setSearchMode] = useState("dropdown");
  
  // Fixed: Handle user selection from dropdown
  const handleUserSelect = (selectedUser) => {
    console.log('🔄 handleUserSelect called with:', selectedUser);
    
    if (!selectedUser) {
      console.log('❌ No selected user');
      return;
    }
    
    console.log('✅ Selected user data:', selectedUser);
    
    // Update all fields at once using the selected user data
    const updates = {
      email: selectedUser.email || "",
      firstName: selectedUser.firstName || "",
      lastName: selectedUser.lastName || "",
      department: selectedUser.department || "",
      username: selectedUser.username || ""
    };
    
    console.log('📝 Applying updates:', updates);
    
    // Apply all updates to the parent component
    Object.entries(updates).forEach(([field, value]) => {
      onChange(index, field, value);
    });
    
    console.log('✅ User details populated successfully');
  };

  // Handle manual email input
  const handleEmailChange = (value) => {
    onChange(index, 'email', value);
  };

  // Reset form when switching modes
  const handleModeSwitch = (newMode) => {
    if (newMode !== searchMode) {
      setSearchMode(newMode);
      // Clear fields when switching to manual mode
      if (newMode === "manual") {
        onChange(index, 'firstName', "");
        onChange(index, 'lastName', "");
        onChange(index, 'department', "");
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full transition"
      >
        <X size={16} />
      </button>
      
      {/* Search Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => handleModeSwitch("dropdown")}
          className={`px-3 py-1 text-xs rounded-lg transition ${
            searchMode === "dropdown" 
              ? "bg-indigo-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Select User
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("manual")}
          className={`px-3 py-1 text-xs rounded-lg transition ${
            searchMode === "manual" 
              ? "bg-indigo-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Add Manually
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-600">First Name</label>
          <input
            type="text"
            value={member.firstName || ""}
            onChange={(e) => onChange(index, 'firstName', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="First name"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-600">Last Name</label>
          <input
            type="text"
            value={member.lastName || ""}
            onChange={(e) => onChange(index, 'lastName', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Last name"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-600">Department</label>
          <select
            value={member.department || ""}
            onChange={(e) => onChange(index, 'department', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id || dept} value={dept.name || dept}>
                {dept.name || dept}
              </option>
            ))}
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-600 flex items-center">
            Email / Username
            <span className="text-red-500 ml-1">*</span>
          </label>
          
          {searchMode === "dropdown" ? (
            <div className="space-y-2">
              <UserDropdown
                value={member.email}
                onChange={handleUserSelect}
                options={userOptions}
                placeholder="Select user from dropdown..."
                loading={loadingUsers}
                required={true}
              />
              <p className="text-xs text-gray-500">
                Select a user from the dropdown to auto-fill their details
              </p>
              {member.email && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                  <strong>Selected:</strong> {member.firstName} {member.lastName} ({member.email}) - {member.department}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={member.email || ""}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 ${
                    error ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter email address"
                />
                <button
                  type="button"
                  onClick={() => onSearchUser(member.email, index)}
                  disabled={loadingSearch === index || !member.email?.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingSearch === index ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Search
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Enter email to search for existing user, or fill details manually
              </p>
            </div>
          )}
          
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// Layout Tabs
  const LayoutTabs = ({ activeLayout, setActiveLayout }) => (
    <div className="flex border-b border-gray-200 mb-6">
      <button
        onClick={() => setActiveLayout("basic")}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
          activeLayout === "basic"
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Basic Information
      </button>
      <button
        onClick={() => setActiveLayout("team")}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
          activeLayout === "team"
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Team Members & Files
      </button>
    </div>
  );

  // Basic Information Layout
  const BasicInformationLayout = ({ formData,setFormData, errors, handleChange, departments, companies, isNcrBased8D }) => {
    const effectiveReportedBy = isNcrBased8D ? "self" : formData.reportedBy;

    return (
    <div className="space-y-6">
      {/* Event No */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Event No.
          <Tippy content="Unique identifier for the event">
            <Info className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-pointer" />
          </Tippy>
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="eventNo"
          value={formData.eventNo}
          onChange={handleChange}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500 ${
            errors.eventNo ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.eventNo && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.eventNo}</p>}
      </div>

      {/* Plant / Line */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Plant / Line
          <span className="text-red-500">*</span>
        </label>
        <select
          name="plantLine"
          value={formData.plantLine}
          onChange={handleChange}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500 ${
            errors.plantLine ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select Plant Line</option>
          <option value="Pune Plant – Threading Line 1">Pune Plant – Threading Line 1</option>
          <option value="Pune Plant – Threading Line 2">Pune Plant – Threading Line 2</option>
        </select>
        {errors.plantLine && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.plantLine}</p>}
      </div>

      {/* Part No. / Name */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Part No. / Name
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="partName"
          value={formData.partName}
          onChange={handleChange}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500 ${
            errors.partName ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.partName && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.partName}</p>}
      </div>

      {/* Lot / Serial(s) */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <Barcode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Lot / Serial(s)
        </label>
        <textarea
          name="lotSerial"
          rows="2"
          value={formData.lotSerial}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Defect Code / Type */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          Defect Code / Type
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="defectCode"
          value={formData.defectCode}
          onChange={handleChange}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500 ${
            errors.defectCode ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.defectCode && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.defectCode}</p>}
      </div>

      {/* Date Discovered */}
      <div>
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 text-sm sm:text-base">
          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Date Discovered
          <Tippy content="Automatically set to today's date">
            <Info className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-pointer" />
          </Tippy>
        </label>
        <input
          type="date"
          name="dateDiscovered"
          value={formData.dateDiscovered}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">Defaults to today's date, but you can change it if needed.</p>
      </div>

      {/* Reported By Section */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="flex items-center gap-1 sm:gap-2 font-semibold text-gray-800 mb-3 text-sm sm:text-base">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Reported By
          <span className="text-red-500">*</span>
        </label>
        <select
          name="reportedBy"
          value={effectiveReportedBy}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          disabled={isNcrBased8D}
        >
          {isNcrBased8D ? (
            <option value="self">Self Inspection</option>
          ) : (
            <>
              <option value="">-- Select Source --</option>
              <option value="customer">Customer Complaint</option>
              <option value="self">Self Inspection</option>
            </>
          )}
        </select>
        
        {effectiveReportedBy === "self" && (
          <div className="mt-4 space-y-4">
            <InputField label="Person Name" name="personName" value={formData.personName} onChange={handleChange} />
            <div>
              <label className="text-sm font-medium text-gray-600">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id || dept} value={dept.name || dept}>{dept.name || dept}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {effectiveReportedBy === "customer" && !isNcrBased8D && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-600">Company</label>
              <div className="flex items-center gap-3 p-2 border rounded shadow-sm">
                {formData.companyLogo && (
                  <img
                    src={formData.companyLogo}
                    alt={formData.companyName}
                    className="w-12 h-12 object-contain rounded border"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/48?text=Logo'; }}
                  />
                )}
                <select
                  name="companyName"
                  value={formData.companyName}
                  onChange={(e) => {
                    const selected = companies.find(c => c.name === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      companyName: e.target.value,
                      companyLogo: selected?.logo || "",
                    }));
                  }}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a Company</option>
                  {companies.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <InputField label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
          </div>
        )}
        
        {(effectiveReportedBy === "self" || effectiveReportedBy === "customer") && (
          <div className="space-y-4 mt-4 pt-4 border-t border-slate-300">
            <div>
              <label className="text-sm font-medium text-gray-600">Phone Number</label>
              <PhoneInput
                country={"in"}
                value={formData.phone}
                onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
                inputClass="w-full mt-1 rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <InputField
              label="Primary Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
          </div>
        )}
      </div>
    </div>
  );
  };

  // Team Members & Files Layout
  const TeamMembersLayout = ({
  formData,
  setFormData,
  errors,
  addTeamMember,
  removeTeamMember,
  handleTeamMemberChange,
  searchUserByEmail,
  loadingSearch,
  loadingUsers,
  departments,
  userOptions,
  handleFileUpload,
  removeFile,
}) => (
    <div className="space-y-6">
      {/* Team Members Section */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="text-sm font-medium text-gray-600 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" />
          Team Members
          <button
            type="button"
            onClick={addTeamMember}
            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition flex items-center gap-1"
          >
            <Plus size={12} /> Add Member
          </button>
        </label>
        
        {loadingUsers ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm text-gray-500 mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.teamMembers.map((member, index) => (
              <TeamMemberField
                key={index}
                member={member}
                index={index}
                onChange={handleTeamMemberChange}
                onRemove={removeTeamMember}
                error={errors[`teamMember_${index}_email`]}
                onSearchUser={searchUserByEmail}
                loadingSearch={loadingSearch}
                departments={departments}
                userOptions={userOptions}
                loadingUsers={loadingUsers}
              />
            ))}
            
            {formData.teamMembers.length === 0 && (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No team members added yet</p>
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Click here to add the first team member
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Upload Sections */}
      {/* Pictures */}
      <div>
        <label className="text-sm font-medium text-gray-600 flex items-center">
          Pictures (mandatory)
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileUpload(e, "image")}
          className="mt-1 w-full text-sm"
        />
        {errors.pictures && <p className="mt-1 text-sm text-red-600">{errors.pictures}</p>}
        <div className="flex flex-wrap gap-4 mt-2 max-h-80 overflow-auto p-2 border rounded">
          {formData.pictures.map((pic, idx) => (
            <div key={`pic-${pic.id || pic.name || idx}`} className="relative w-40 border rounded p-2">
              <img
                src={pic.url || 'https://via.placeholder.com/112?text=Img'}
                alt={pic.title || `pic-${idx}`}
                className="w-full h-28 object-cover rounded cursor-pointer"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/112?text=Img'; }}
              />
              <input
                type="text"
                placeholder="Title"
                value={pic.title}
                onChange={(e) => {
                  const newPics = [...formData.pictures];
                  newPics[idx].title = e.target.value;
                  setFormData((prev) => ({ ...prev, pictures: newPics }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Description"
                value={pic.description}
                onChange={(e) => {
                  const newPics = [...formData.pictures];
                  newPics[idx].description = e.target.value;
                  setFormData((prev) => ({ ...prev, pictures: newPics }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeFile(idx, "image")}
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white hover:bg-red-700"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reports */}
      <div>
        <label className="text-sm font-medium text-gray-600">Reports (PDFs)</label>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => handleFileUpload(e, "pdf")}
          className="mt-1 w-full text-sm"
        />
        <div className="flex flex-wrap gap-4 mt-2 max-h-80 overflow-auto p-2 border rounded">
          {formData.reports.map((rep, idx) => (
            <div key={`rep-${rep.id || rep.name || idx}`} className="relative w-40 border rounded p-2 flex flex-col items-center">
              <div className="bg-indigo-100 text-indigo-800 w-full h-28 flex flex-col items-center justify-center rounded cursor-pointer border border-indigo-300 hover:bg-indigo-200">
                <FileText className="w-8 h-8 mb-1" />
                <span className="text-xs text-center px-1 truncate w-full">{rep.title || rep.name || `Report ${idx + 1}`}</span>
              </div>
              <input
                type="text"
                placeholder="Title"
                value={rep.title}
                onChange={(e) => {
                  const newReports = [...formData.reports];
                  newReports[idx].title = e.target.value;
                  setFormData((prev) => ({ ...prev, reports: newReports }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Description"
                value={rep.description}
                onChange={(e) => {
                  const newReports = [...formData.reports];
                  newReports[idx].description = e.target.value;
                  setFormData((prev) => ({ ...prev, reports: newReports }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeFile(idx, "pdf")}
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white hover:bg-red-700"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Videos */}
      <div>
        <label className="text-sm font-medium text-gray-600">Videos</label>
        <input
          type="file"
          multiple
          accept="video/*"
          onChange={(e) => handleFileUpload(e, "video")}
          className="mt-1 w-full text-sm"
        />
        <div className="flex flex-wrap gap-4 mt-2 max-h-80 overflow-auto p-2 border rounded">
          {formData.videos.map((vid, idx) => (
            <div key={`vid-${vid.id || vid.name || idx}`} className="relative w-40 border rounded p-2 flex flex-col items-center">
              <div className="bg-green-100 text-green-800 w-full h-28 flex flex-col items-center justify-center rounded cursor-pointer border border-green-300 hover:bg-green-200">
                <Video className="w-8 h-8 mb-1" />
                <span className="text-xs text-center px-1 truncate w-full">{vid.title || vid.name || `Video ${idx + 1}`}</span>
              </div>
              <input
                type="text"
                placeholder="Title"
                value={vid.title}
                onChange={(e) => {
                  const newVideos = [...formData.videos];
                  newVideos[idx].title = e.target.value;
                  setFormData((prev) => ({ ...prev, videos: newVideos }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Description"
                value={vid.description}
                onChange={(e) => {
                  const newVideos = [...formData.videos];
                  newVideos[idx].description = e.target.value;
                  setFormData((prev) => ({ ...prev, videos: newVideos }));
                }}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeFile(idx, "video")}
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white hover:bg-red-700"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

export default function D0PlanContain({ eventId = null, updateParent, initialIsNcrBased = false }) {
  const { user, isInitiator, isHOD, isAdmin } = useAuth();
  
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateForInput = (value) => {
    if (!value) return getTodayDate();
    if (typeof value === "string") {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return getTodayDate();
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    eventNo: eventId || "",
    plantLine: "",
    partName: "",
    lotSerial: "",
    defectCode: "",
    dateDiscovered: getTodayDate(),
    reportedBy: "",
    personName: "",
    department: "",
    companyName: "",
    companyLogo: "",
    contactPerson: "",
    phone: "",
    email: "",
    teamMembers: [],
    countryCode: "+91",
    pictures: [],
    reports: [],
    videos: [],
    status: "draft",
    currentStep: "d0",
    isNcrBased: initialIsNcrBased,
    sourceType: initialIsNcrBased ? "ncr" : "fresh",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeLayout, setActiveLayout] = useState("basic");
  
  // State for users and departments
  const [allUsers, setAllUsers] = useState([]);
  const [departments, setDepartments] = useState(defaultDepartments);
  const [loadingSearch, setLoadingSearch] = useState(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const isNcrBased8D = Boolean(
    initialIsNcrBased ||
    formData.isNcrBased ||
    formData.sourceType === "ncr" ||
    formData.sourceNcrId ||
    formData.sourceNcrNumber ||
    String(eventId || formData.eventNo || "").startsWith("8D-NCR-")
  );

  const API_BASE_URL = "http://localhost:8080";
  const API_URL_JSON = `${API_BASE_URL}/api/eightd/data`;

  // Prepare user options for dropdown - ENHANCED VERSION
  const userOptions = useMemo(() => {
    if (!allUsers || allUsers.length === 0) {
      console.log('📭 No users available for dropdown');
      return [];
    }
    
    const options = allUsers
      .filter(user => user && (user.email || user.username)) // Filter out invalid users
      .map(user => {
        const label = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email;
        const value = user.email || user.username;
        
        return {
          value: value,
          label: label,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department
        };
      })
      .filter(option => option.value && option.label); // Final filter for valid options
    
    console.log('📋 Prepared user options:', options.length, 'options');
    if (options.length > 0) {
      console.log('Sample options:', options.slice(0, 3));
    }
    
    return options;
  }, [allUsers]);

  // Debug useEffect to check user loading
  useEffect(() => {
    console.log('🔍 DEBUG - User loading state:', {
      allUsersCount: allUsers.length,
      usersLoaded,
      userOptionsCount: userOptions.length,
      loadingUsers,
      departmentsCount: departments.length,
      departmentsLoaded
    });
    
    if (allUsers.length > 0) {
      console.log('👥 Sample users:', allUsers.slice(0, 3));
    }
  }, [allUsers, usersLoaded, userOptions, loadingUsers, departments, departmentsLoaded]);

  // Load all users and extract departments on component mount
  useEffect(() => {
    loadUsersAndDepartments();
  }, []);

  // Fetch all users and extract unique departments from users
  const loadUsersAndDepartments = async () => {
    try {
      setLoadingUsers(true);
      console.log('🔄 Loading users and departments...');
      
      // Load users
      const users = await userAPI.getAllUsers();
      console.log('✅ Users loaded from API:', users?.length || 0, 'users');
      
      if (users && Array.isArray(users)) {
        setAllUsers(users);
        setUsersLoaded(true);

        // Extract unique departments from users
        const uniqueDepartments = extractDepartmentsFromUsers(users);
        setDepartments(uniqueDepartments);
        setDepartmentsLoaded(true);
        console.log('✅ Extracted departments:', uniqueDepartments);
      } else {
        console.warn('⚠️ No users found or invalid response');
        setAllUsers([]);
        setUsersLoaded(true);
        setDepartments(defaultDepartments);
        setDepartmentsLoaded(true);
      }

    } catch (err) {
      console.error("❌ Failed to load users and departments", err);
      setUsersLoaded(true);
      setDepartmentsLoaded(true);
      setDepartments(defaultDepartments);
      console.log('⚠️ Using default departments due to API error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Extract unique departments from users
  const extractDepartmentsFromUsers = (users) => {
    if (!users || users.length === 0) {
      return defaultDepartments;
    }

    const departmentSet = new Set();
    const departmentsList = [];
    
    users.forEach(user => {
      if (user.department && user.department.trim() && !departmentSet.has(user.department)) {
        departmentSet.add(user.department);
        departmentsList.push({
          id: departmentsList.length + 1,
          name: user.department
        });
      }
    });

    if (departmentsList.length === 0) {
      return defaultDepartments;
    }

    if (!departmentSet.has("Other")) {
      departmentsList.push({ id: departmentsList.length + 1, name: "Other" });
    }

    return departmentsList;
  };

// Debug useEffect to track team member changes
useEffect(() => {
  console.log('🔍 DEBUG - Current team members:', formData.teamMembers);
}, [formData.teamMembers]);

  // Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      
      setLoading(true);
      try {
        console.log('🔄 Fetching existing D0 data for event:', eventId);
        const res = await axios.get(`${API_URL_JSON}/${eventId}`);
        
        if (res.data.success && res.data.data) {
          const backendData = res.data.data.content?.d0?.[0];
          if (backendData) {
            console.log('✅ Found existing D0 data:', backendData);

            // Wait for users and departments to be loaded before processing team members
            if (!usersLoaded || !departmentsLoaded) {
              console.log('⏳ Waiting for users and departments to load...');
              await new Promise(resolve => {
                const checkDataLoaded = () => {
                  if (usersLoaded && departmentsLoaded) resolve();
                  else setTimeout(checkDataLoaded, 100);
                };
                checkDataLoaded();
              });
            }

            let teamMembers = [];
            if (backendData.additionalEmails) {
              console.log('🔄 Converting additionalEmails to teamMembers');
              if (Array.isArray(backendData.additionalEmails)) {
                teamMembers = await convertEmailsToTeamMembers(backendData.additionalEmails);
              } else if (typeof backendData.additionalEmails === 'string') {
                const emails = backendData.additionalEmails
                  .split(',')
                  .map(e => e.trim())
                  .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
                teamMembers = await convertEmailsToTeamMembers(emails);
              }
            } else if (backendData.teamMembers && Array.isArray(backendData.teamMembers)) {
              teamMembers = backendData.teamMembers;
            }
            
            console.log('✅ Final team members:', teamMembers);
            
            const loadedIsNcrBased = Boolean(
              backendData.sourceNcrId ||
              backendData.sourceNcrNumber ||
              backendData.isNcrBased ||
              backendData.sourceType === "ncr" ||
              String(eventId || backendData.eventNo || "").startsWith("8D-NCR-")
            );

            setFormData({
              ...backendData,
              dateDiscovered: normalizeDateForInput(backendData.dateDiscovered),
              reportedBy: loadedIsNcrBased
                ? "self"
                : (backendData.reportedBy || ""),
              teamMembers,
              status: res.data.data.status || "draft",
              currentStep: res.data.data.currentStep || "d0",
              pictures: backendData.pictures || [],
              reports: backendData.reports || [],
              videos: backendData.videos || [],
              isNcrBased: loadedIsNcrBased,
              sourceType: loadedIsNcrBased ? "ncr" : (backendData.sourceType || "fresh"),
            });
          }
        }
      } catch (err) {
        console.error("⚠️ Error fetching D0 data:", err);
        alert(`Failed to load D0 data for event ${eventId}.`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, usersLoaded, departmentsLoaded]);

  // Convert email list to team members with user data
  const convertEmailsToTeamMembers = async (emails) => {
    const teamMembers = [];
    
    for (const email of emails) {
      if (email && email.trim()) {
        const userData = findUserByEmailOrUsername(email.trim());
        teamMembers.push({
          firstName: userData?.firstName || "",
          lastName: userData?.lastName || "",
          department: userData?.department || "",
          email: email.trim(),
          username: userData?.username || ""
        });
      }
    }
    
    return teamMembers;
  };

  // Find user by email or username
  const findUserByEmailOrUsername = (searchTerm) => {
    if (!searchTerm || !allUsers.length) return null;
    
    const foundUser = allUsers.find(user => {
      const emailMatch = user.email?.toLowerCase() === searchTerm.toLowerCase();
      const usernameMatch = user.username?.toLowerCase() === searchTerm.toLowerCase();
      return emailMatch || usernameMatch;
    });
    
    console.log('🔍 User search:', { searchTerm, found: !!foundUser, foundUser });
    return foundUser;
  };

  // Team Members Handlers - Fixed version
  const handleTeamMemberChange = (index, field, value) => {
    console.log(`🔄 Updating team member ${index}, field: ${field}, value:`, value);
    
    setFormData(prev => {
      const newTeamMembers = [...prev.teamMembers];
      newTeamMembers[index] = {
        ...newTeamMembers[index],
        [field]: value
      };
      
      console.log('✅ Updated team members:', newTeamMembers);
      return { ...prev, teamMembers: newTeamMembers };
    });
    
    // Clear error for this field
    if (errors[`teamMember_${index}_${field}`]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[`teamMember_${index}_${field}`];
        return updated;
      });
    }
  };

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        { firstName: "", lastName: "", department: "", email: "", username: "" }
      ]
    }));
  };

  const removeTeamMember = (index) => {
    const newTeamMembers = formData.teamMembers.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, teamMembers: newTeamMembers }));
    
    // Clear errors for removed member
    setErrors(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`teamMember_${index}_`)) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  // Search user by email or username
  const searchUserByEmail = async (searchTerm, index) => {
    if (!searchTerm || !searchTerm.trim()) {
      alert("Please enter an email or username to search.");
      return;
    }

    setLoadingSearch(index);
    try {
      const foundUser = findUserByEmailOrUsername(searchTerm.trim());
      
      if (foundUser) {
        const newTeamMembers = [...formData.teamMembers];
        newTeamMembers[index] = {
          ...newTeamMembers[index],
          firstName: foundUser.firstName || "",
          lastName: foundUser.lastName || "",
          department: foundUser.department || "",
          email: foundUser.email || searchTerm.trim(),
          username: foundUser.username || ""
        };
        setFormData(prev => ({ ...prev, teamMembers: newTeamMembers }));
        
        // Clear any previous errors for this member
        setErrors(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            if (key.startsWith(`teamMember_${index}_`)) {
              delete updated[key];
            }
          });
          return updated;
        });
        
        console.log('✅ User found and details populated:', foundUser);
      } else {
        alert(`No user found with email/username: "${searchTerm}". Please enter details manually.`);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      alert("Error searching for user. Please enter details manually.");
    } finally {
      setLoadingSearch(null);
    }
  };

  // Handle change function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "reportedBy" && isNcrBased8D ? "self" : value
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileUpload = (e, type = "image") => {
    const files = Array.from(e.target.files || []);
    const filtered = files.filter((file) => {
      if (type === "image") return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
      if (type === "pdf") return /\.pdf$/i.test(file.name);
      if (type === "video") return /\.(mp4|webm|mov|avi)$/i.test(file.name);
      return false;
    });
    if (filtered.length !== files.length) {
      alert(`Some files were ignored. Only valid ${type} files allowed.`);
    }
    const newFiles = filtered.map((file) => ({
      id: null,
      name: file.name,
      type: file.type,
      size: file.size,
      title: file.name,
      description: "",
      file: file,
      url: URL.createObjectURL(file),
    }));
    const key = type === "image" ? "pictures" : type === "pdf" ? "reports" : "videos";
    setFormData((prev) => ({
      ...prev,
      [key]: [...prev[key], ...newFiles],
    }));
  };

  const removeFile = (index, type = "image") => {
    const key = type === "image" ? "pictures" : type === "pdf" ? "reports" : "videos";
    setFormData((prev) => {
      const updatedFiles = [...prev[key]];
      const removedFile = updatedFiles.splice(index, 1)[0];
      if (removedFile?.url) URL.revokeObjectURL(removedFile.url);
      return { ...prev, [key]: updatedFiles };
    });
  };

  const handleApprove = async () => {
  if (!eventId) return;
  try {
    setLoading(true);
    const res = await axios.post(`${API_BASE_URL}/api/eightd/approve/${eventId}`, {
      userEmail: user.email
    });
    if (res.data.success) {
      // IMPORTANT: Create a new object with updated status
      const updatedFormData = {
        ...formData,
        status: "in progress",
        currentStep: "d1"
      };
      
      // Update local state
      setFormData(updatedFormData);
      
      // CRITICAL: Update parent with the new data
      if (updateParent) {
        console.log("📤 Sending approved status to parent:", updatedFormData.status);
        updateParent([updatedFormData]);
      }
      
      alert("✅ Document approved! Proceeding to D1.");
    }
  } catch (err) {
    alert("Approval failed: " + (err.response?.data?.error || err.message));
  } finally {
    setLoading(false);
  }
};
  const handleReject = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/eightd/reject/${eventId}`, {
        userEmail: user.email
      });
      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          status: "rejected",
          currentStep: "d0"
        }));
        alert("❌ Document rejected. Cannot proceed further.");
        if (updateParent) {
          updateParent([
            {
              ...formData,
              status: "rejected",
              currentStep: "d0"
            }
          ]);
        }
      }
    } catch (err) {
      alert("Rejection failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Update validation for team members
  const validateTeamMembers = () => {
    const newErrors = { ...errors };
    let isValid = true;

    // Clear previous team member errors
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith('teamMember_')) delete newErrors[key];
    });

    formData.teamMembers.forEach((member, idx) => {
      const { email, firstName, lastName } = member;
      
      if (!email || !email.trim()) {
        newErrors[`teamMember_${idx}_email`] = "Email is required for team members";
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors[`teamMember_${idx}_email`] = "Invalid email format";
        isValid = false;
      }
      
      // If email is provided, require first and last name
      if (email && (!firstName.trim() || !lastName.trim())) {
        newErrors[`teamMember_${idx}_email`] = "Please fill in first and last name for this team member";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Update main validation function
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ["eventNo", "plantLine", "partName", "defectCode"];
    
    requiredFields.forEach(field => {
      if (!formData[field]?.toString().trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    
    if (formData.pictures.length === 0) {
      newErrors.pictures = "At least one picture is required.";
    }
    
    // Validate primary email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Invalid email format";
    }
    
    // Validate team members
    const teamMembersValid = validateTeamMembers();
    if (!teamMembersValid) Object.assign(newErrors, errors);
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // handleSubmit function - UPDATED WITH WORKING FORUM CREATION LOGIC
  const handleSubmit = async () => {
    if (!isInitiator && !isAdmin) {
      alert("Only initiators can submit D0 forms.");
      return;
    }
    if (!validateForm()) {
      alert("Please fix the errors before submitting.");
      return;
    }
    
    setSubmitted(true);
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // ✅ FIXED: Extract emails from teamMembers array (new structure)
      const teamEmails = formData.teamMembers
        .map(member => member.email?.trim())
        .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      
      // Check if we're updating an existing event or creating new
      const isUpdating = !!eventId;
      
      // Existing NCR-based D0 records must move into approval pending on submit,
      // the same as a fresh D0 submission.
      const submittedStatus = formData.status === "in progress" ? "in progress" : "approval pending";

      // Create proper payload structure for eightd API
      const jsonPayload = {
        eventNo: formData.eventNo,
        plantLine: formData.plantLine,
        partName: formData.partName,
        lotSerial: formData.lotSerial,
        defectCode: formData.defectCode,
        dateDiscovered: formData.dateDiscovered,
        reportedBy: isNcrBased8D ? "self" : formData.reportedBy,
        personName: formData.personName,
        department: formData.department,
        companyName: formData.companyName,
        companyLogo: formData.companyLogo,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        teamMembers: formData.teamMembers, // ✅ Keep the full team member objects
        additionalEmails: teamEmails, // ✅ Also include just emails for backward compatibility
        countryCode: formData.countryCode,
        status: submittedStatus,
        currentStep: "d0",
        isNcrBased: isNcrBased8D,
        sourceType: isNcrBased8D ? "ncr" : "fresh",
        submittedBy: user.email,
        submittedAt: new Date().toISOString(),
        entry_type: "8D_D0_FORM",
        content: {
          d0: [{
            ...formData,
            reportedBy: isNcrBased8D ? "self" : formData.reportedBy,
            isNcrBased: isNcrBased8D,
            sourceType: isNcrBased8D ? "ncr" : "fresh",
            teamMembers: formData.teamMembers,
            additionalEmails: teamEmails
          }]
        }
      };

      console.log('📤 Sending payload to eightd:', {
        ...jsonPayload,
        teamMembersCount: formData.teamMembers.length,
        teamEmailsCount: teamEmails.length
      });
      
      formDataToSend.append('jsonContent', JSON.stringify(jsonPayload));
      
      // Append files
      const allFiles = [
        ...formData.pictures.filter(pic => pic.file instanceof File),
        ...formData.reports.filter(rep => rep.file instanceof File),
        ...formData.videos.filter(vid => vid.file instanceof File)
      ];
      
      allFiles.forEach((fileObj) => {
        if (fileObj.file instanceof File) {
          formDataToSend.append('files', fileObj.file);
        }
      });

      let res;
      if (isUpdating) {
        console.log('🔄 Updating existing event:', eventId);
        res = await axios.put(`${API_URL_JSON}/${eventId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        console.log('🆕 Creating new event');
        res = await axios.post(API_URL_JSON, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res?.data?.success) {
        const returnedEventNo = res.data.data?.id || eventId;
        alert("✅ D0 form submitted successfully!");

        // ✅ FIXED FORUM CREATION: Use the working logic from previous code
        const primaryEmail = formData.email?.trim();
        
        // Extract emails from teamMembers array (new structure)
        const additionalEmails = formData.teamMembers
          .map(member => member.email?.trim())
          .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        
        // Combine primary email + team member emails
        const allMembers = [...new Set([primaryEmail, ...additionalEmails].filter(Boolean))];
        
        // ✅ FIXED: Apply the working forum creation logic
      // ✅ SIMPLIFIED FORUM CREATION - Backend handles existing groups
if (allMembers.length > 0 && (user?.role === "MASTER" || user?.role === "ADMIN" || user?.role === "INITIATOR")) {
  const creator = user.email;
  
  const eightDGroupData = {
    groupId: formData.eventNo,
    groupName: `8D Event: ${formData.eventNo}`,
    description: `Defect: ${formData.defectCode} | Part: ${formData.partName}`,
    createdBy: creator,
    members: allMembers
  };
  
  try {
    console.log('🎯 Creating/Verifying 8D forum group for event:', formData.eventNo);
    
    // ✅ Direct POST - backend handles creation OR update
    const response = await fetch('http://localhost:8080/api/forum/8d/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eightDGroupData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Forum group response:', result);
      const memberCount = allMembers.length - (primaryEmail ? 1 : 0);
      alert(`✅ Forum ready! ${memberCount} team member(s) added to the discussion.`);
    } else {
      console.log('⚠️ Forum group creation had issues, but continuing...');
    }
  } catch (forumError) {
    console.log('⚠️ Forum group operation note:', forumError.message);
    // Don't show error to user - not critical for D0 submission
  }
} else {
          console.warn('⚠️ No valid team members found for forum group or user not authorized');
          alert('✅ D0 submitted successfully! No valid team members were found for forum creation.');
        }

        // Update local state
        const newStatus = "approval pending";
        setFormData(prev => ({
          ...prev,
          status: newStatus,
          currentStep: "d0"
        }));
        
        if (updateParent) {
          updateParent([
            {
              ...formData,
              id: returnedEventNo,
              status: newStatus,
              currentStep: "d0"
            }
          ]);
        }
      } else {
        throw new Error(res?.data?.error || "Unexpected response from server");
      }
    } catch (err) {
      console.error("❌ D0 Submit Error:", err);
      console.error("Error details:", err.response?.data);
      
      if (err.response?.status === 409) {
        alert("This event number already exists. Please use a different event number.");
      } else if (err.response?.data?.error) {
        alert(`Server Error: ${err.response.data.error}`);
      } else if (err.code === 'ERR_NETWORK') {
        alert("Network Error: Backend server not reachable. Please check your connection.");
      } else {
        alert("Failed to save form. Please check the console for details.");
      }
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };

  

  if (loading && !submitted) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading D0 data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="relative bg-[#2242a1]/80 text-white px-6 py-4 rounded-t-2xl border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-white/90" />
            D0 – Plan & Contain
            {eventId && (
              <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                {eventId}
              </span>
            )}
            {formData.status !== "draft" && (
              <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${
                formData.status === "approval pending" ? "bg-yellow-200 text-yellow-800" :
                formData.status === "in progress" ? "bg-green-200 text-green-800" :
                "bg-red-200 text-red-800"
              }`}>
                {formData.status}
              </span>
            )}
          </h2>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition text-sm"
          >
            <Eye className="w-4 h-4" />
            Preview Full Report
          </button>
        </div>
      </div>

      {/* Layout Tabs */}
      <LayoutTabs activeLayout={activeLayout} setActiveLayout={setActiveLayout} />


      {/* Form Content */}
      <div className="bg-white p-6 rounded-b-2xl shadow-lg border border-gray-100">
        {activeLayout === "basic" ? <BasicInformationLayout
  formData={formData}
  setFormData={setFormData}
  errors={errors}
  handleChange={handleChange}
  departments={departments}
  companies={companies}
  isNcrBased8D={isNcrBased8D}
/>
 : <TeamMembersLayout
  formData={formData}
  setFormData={setFormData} // <-- pass it here
  errors={errors}
  addTeamMember={addTeamMember}
  removeTeamMember={removeTeamMember}
  handleTeamMemberChange={handleTeamMemberChange}
  searchUserByEmail={searchUserByEmail}
  loadingSearch={loadingSearch}
  loadingUsers={loadingUsers}
  departments={departments}
  userOptions={userOptions}
  handleFileUpload={handleFileUpload}
  removeFile={removeFile}
/>
}
        
        {/* Action Buttons */}
<div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
  <div className="flex gap-3">
    {activeLayout === "team" && (
      <button
        onClick={() => setActiveLayout("basic")}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
      >
        <ChevronLeft size={16} />
        Back to Basic Info
      </button>
    )}
  </div>
  
  <div className="flex gap-3">
    {activeLayout === "basic" && (
      <button
        onClick={() => setActiveLayout("team")}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        Continue to Team & Files
        <ChevronRight size={16} />
      </button>
    )}
    
    {/* Submit Button - Only show on team layout or if no team members needed */}
    {(activeLayout === "team" || formData.teamMembers.length === 0) && (
      <>
        {/* Show different buttons based on status and user role */}
        {(() => {
          // Case 1: Form is in draft - Show submit button to initiators
          if (formData.status === "draft" && (isInitiator || isAdmin)) {
            return (
              <button
                onClick={handleSubmit}
                disabled={submitted || loading}
                className={`px-6 py-2 rounded-xl font-medium text-white transition ${
                  submitted || loading
                    ? "bg-green-600 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />}
                {loading ? "Submitting..." : (submitted ? "Submitted ✅" : "Submit for Approval")}
              </button>
            );
          }
          
          // Case 2: Form is pending approval - Show HOD approval buttons
          else if (formData.status === "approval pending" && (isHOD || isAdmin)) {
            return (
              <div className="flex gap-3 mr-4">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-70"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve & Move to D1
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-70"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            );
          }
          
          // Case 3: Form is in progress - Show message (APPROVED - CAN VIEW BUT NOT EDIT)
          else if (formData.status === "in progress") {
            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-300">
                <CheckCircle className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">✓ D0 Approved & Locked</span>
                  <span className="text-xs text-green-700">Status: in progress - You can proceed to next steps</span>
                </div>
              </div>
            );
          }
          
          // Case 4: Form is rejected - Show message
          else if (formData.status === "rejected") {
            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg border border-red-300">
                <XCircle className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">✗ D0 Rejected</span>
                  <span className="text-xs text-red-700">Cannot proceed - Contact HOD for clarification</span>
                </div>
              </div>
            );
          }
          
          // Case 5: Regular user viewing pending approval form
          else if (formData.status === "approval pending" && !isHOD && !isAdmin) {
            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">⏳ Awaiting HOD Approval</span>
                  <span className="text-xs text-yellow-700">Form submitted, waiting for approval to proceed</span>
                </div>
              </div>
            );
          }
          
          // Case 6: Default - no action available
          else {
            return (
              <div className="text-sm text-gray-500 italic px-4 py-2">
                {formData.status === "draft" && !isInitiator && !isAdmin 
                  ? "Only initiators can submit D0 forms" 
                  : `Status: ${formData.status}`}
              </div>
            );
          }
        })()}
      </>
    )}
  </div>
</div>
      </div>

      {/* Drawer Preview */}
      <Drawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || formData.eventNo} />}
      />
    </div>
  );
}
