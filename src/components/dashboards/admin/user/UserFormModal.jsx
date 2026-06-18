// src/components/admin/user/UserFormModal.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBirthdayCake,
  FaSignature,
  FaUserCircle,
  FaUpload,
  FaCheck,
  FaCamera,
  FaGraduationCap,
  FaBriefcase,
  FaTools,
  FaCertificate
} from 'react-icons/fa';

// Roles from your backend
const roles = [
  'MASTER',
  'AUDIT_MANAGER',
  'LEAD_AUDITOR',
  'AUDITOR',
  'HOD',
  'AUDITEE',
  'HR_ADMIN',
  'QMS_ADMIN',
  'TOP_MANAGEMENT',
  'INITIATOR'
];

// Processes for competency
const processes = [
  "Machining", "Assembly", "Welding", "Painting", "Heat Treatment",
  "Surface Finishing", "Quality Control", "Warehouse", "Maintenance",
  "Procurement", "Sales", "Engineering", "HR", "IT", "Logistics"
];

// Core tools
const coreToolsList = ["APQP", "FMEA", "PPAP", "SPC", "MSA"];

// Problem solving tools
const problemSolvingToolsList = ["8D", "Why-Why", "Fishbone", "Pareto", "5W1H"];

const namePrefixes = ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Dr.', 'Prof.'];

const UserFormModal = ({ onClose, onSubmit, defaultValues = null, isEdit = false }) => {
  const safeDefaultValues = defaultValues || {};

  const { register, handleSubmit, reset, setValue, watch, getValues, formState: { errors } } = useForm({
    defaultValues: {
      // Basic Info
      namePrefix: safeDefaultValues.namePrefix || '',
      firstName: safeDefaultValues.firstName || '',
      lastName: safeDefaultValues.lastName || '',
      userName: safeDefaultValues.username || safeDefaultValues.userName || '',
      email: safeDefaultValues.email || '',
      phone: safeDefaultValues.phone || '',
      role: safeDefaultValues.role || '',
      status: safeDefaultValues.active !== undefined ? safeDefaultValues.active : true,
      dateOfBirth: safeDefaultValues.dateOfBirth ? new Date(safeDefaultValues.dateOfBirth).toISOString().split('T')[0] : '',
      gender: safeDefaultValues.gender ? safeDefaultValues.gender.toLowerCase() : '',
      password: '',
      site: safeDefaultValues.site || '',
      location: safeDefaultValues.location || '',
      reportingToId: safeDefaultValues.reportingTo?.id || '',

      certifiedForProduct: safeDefaultValues.certifiedForProduct || '',
department: safeDefaultValues.department || '',
      // Competency Fields
      qualification: safeDefaultValues.qualification || '',
    totalExperience: safeDefaultValues.totalExperience || '',
    internalAuditorTraining: safeDefaultValues.internalAuditorTraining || '',
    coreToolsTraining: safeDefaultValues.coreToolsTraining || '',
    customerSpecificApproved: safeDefaultValues.customerSpecificApproved || false,
    problemSolvingTools: safeDefaultValues.problemSolvingTools || '',
    certifiedForProcess: safeDefaultValues.certifiedForProcess ? 
      (Array.isArray(safeDefaultValues.certifiedForProcess) ? 
        safeDefaultValues.certifiedForProcess : 
        safeDefaultValues.certifiedForProcess.split(',')) : [],
    certificationDate: safeDefaultValues.certificationDate ? 
      (safeDefaultValues.certificationDate.split('T')[0] || safeDefaultValues.certificationDate) : '',
    certificationExpiryDate: safeDefaultValues.certificationExpiryDate ? 
      (safeDefaultValues.certificationExpiryDate.split('T')[0] || safeDefaultValues.certificationExpiryDate) : '',
  }
});

  const [signaturePreview, setSignaturePreview] = useState(
    safeDefaultValues.signaturePath
      ? `https://qsutrarmsclm.hub.swajyot.co.in:8476/api/users/${safeDefaultValues.id}/signature`
      : safeDefaultValues.signature || null
  );

  const [profilePhotoPreview, setProfilePhotoPreview] = useState(
    safeDefaultValues.profilePhotoPath
      ? `https://qsutrarmsclm.hub.swajyot.co.in:8476/api/users/${safeDefaultValues.id}/profile-photo`
      : safeDefaultValues.profilePhoto || null
  );

  const [dragOverSignature, setDragOverSignature] = useState(false);
  const [dragOverPhoto, setDragOverPhoto] = useState(false);
  const [phoneValue, setPhoneValue] = useState(safeDefaultValues.phone || '');
  const [age, setAge] = useState('');

  const watchedDateOfBirth = watch('dateOfBirth');

  useEffect(() => {
    if (watchedDateOfBirth) {
      const today = new Date();
      const birthDate = new Date(watchedDateOfBirth);
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge > 0 ? calculatedAge : '');
    } else {
      setAge('');
    }
  }, [watchedDateOfBirth]);

  useEffect(() => {
    if (safeDefaultValues.phone) {
      setPhoneValue(safeDefaultValues.phone);
      setValue('phone', safeDefaultValues.phone);
    }
  }, [safeDefaultValues.phone, setValue]);

  useEffect(() => {
    setValue('signature', signaturePreview || '');
  }, [signaturePreview, setValue]);

  useEffect(() => {
    setValue('profilePhoto', profilePhotoPreview || '');
  }, [profilePhotoPreview, setValue]);

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setSignaturePreview(result);
        setValue('signature', result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setProfilePhotoPreview(result);
        setValue('profilePhoto', result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === 'signature') setDragOverSignature(true);
    else setDragOverPhoto(true);
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    if (type === 'signature') setDragOverSignature(false);
    else setDragOverPhoto(false);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === 'signature') setDragOverSignature(false);
    else setDragOverPhoto(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        if (type === 'signature') {
          setSignaturePreview(result);
          setValue('signature', result);
        } else {
          setProfilePhotoPreview(result);
          setValue('profilePhoto', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessToggle = (process) => {
    const currentProcesses = getValues('certifiedForProcess') || [];
    const newProcesses = currentProcesses.includes(process)
      ? currentProcesses.filter(p => p !== process)
      : [...currentProcesses, process];
    setValue('certifiedForProcess', newProcesses);
  };

  const handleCoreToolsToggle = (tool) => {
    const currentTools = getValues('coreToolsTraining') ? getValues('coreToolsTraining').split(',') : [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    setValue('coreToolsTraining', newTools.join(','));
  };

  const handleProblemSolvingToggle = (tool) => {
    const currentTools = getValues('problemSolvingTools') ? getValues('problemSolvingTools').split(',') : [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    setValue('problemSolvingTools', newTools.join(','));
  };

  const handleCancel = () => {
    reset();
    setSignaturePreview(null);
    setProfilePhotoPreview(null);
    setPhoneValue('');
    setAge('');
    onClose();
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'MASTER': 'Master',
      'AUDIT_MANAGER': 'Audit Manager',
      'LEAD_AUDITOR': 'Lead Auditor',
      'AUDITOR': 'Auditor',
      'HOD': 'HOD',
      'AUDITEE': 'Auditee',
      'HR_ADMIN': 'HR Admin',
      'QMS_ADMIN': 'QMS Admin',
      'TOP_MANAGEMENT': 'Top Management',
      'INITIATOR':'Initiator'
    };
    return roleMap[role] || role;
  };

  const onFormSubmit = (data) => {
    const currentFormData = getValues();
    
    const formattedData = {
      // Basic Info
      namePrefix: currentFormData.namePrefix || null,
      firstName: currentFormData.firstName,
      lastName: currentFormData.lastName,
      userName: currentFormData.userName,
      email: currentFormData.email,
      phone: phoneValue,
      dateOfBirth: currentFormData.dateOfBirth || null,
      gender: currentFormData.gender ? currentFormData.gender.toUpperCase() : null,
      role: currentFormData.role,
      status: currentFormData.status === true || currentFormData.status === 'true',
      site: currentFormData.site || null,
      location: currentFormData.location || null,
      reportingToId: currentFormData.reportingToId ? parseInt(currentFormData.reportingToId) : null,

      department: currentFormData.department || null,
certifiedForProduct: currentFormData.certifiedForProduct || null,
      // Competency Fields
      qualification: currentFormData.qualification || null,
      totalExperience: currentFormData.totalExperience ? parseInt(currentFormData.totalExperience) : null,
      internalAuditorTraining: currentFormData.internalAuditorTraining || null,
      coreToolsTraining: currentFormData.coreToolsTraining || null,
      customerSpecificApproved: currentFormData.customerSpecificApproved || false,
      problemSolvingTools: currentFormData.problemSolvingTools || null,
      certifiedForProcess: currentFormData.certifiedForProcess ? currentFormData.certifiedForProcess.join(',') : null,
      certificationDate: currentFormData.certificationDate || null,
      certificationExpiryDate: currentFormData.certificationExpiryDate || null,
      // Signature & Photo
      signature: signaturePreview || null,
      profilePhoto: profilePhotoPreview || null,
    };

    if (!isEdit && currentFormData.password) {
      formattedData.password = currentFormData.password;
    }

    // ✅ ADD THIS DEBUG LOG
  console.log('🔵 UserFormModal - Sending competency data:', {
    qualification: formattedData.qualification,
    totalExperience: formattedData.totalExperience,
    internalAuditorTraining: formattedData.internalAuditorTraining,
    coreToolsTraining: formattedData.coreToolsTraining,
    customerSpecificApproved: formattedData.customerSpecificApproved,
    problemSolvingTools: formattedData.problemSolvingTools,
    certifiedForProcess: formattedData.certifiedForProcess,
    certificationDate: formattedData.certificationDate,
    certificationExpiryDate: formattedData.certificationExpiryDate,
  });

    onSubmit(formattedData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaUserCircle className="mr-3 text-blue-900" />
              {isEdit ? 'Edit User' : 'Create User'}
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              &times;
            </button>
            
          </div>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-900" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                    <select {...register("namePrefix", { required: "Name prefix is required" })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select</option>
                      {namePrefixes.map(prefix => <option key={prefix} value={prefix}>{prefix}</option>)}
                    </select>
                    {errors.namePrefix && <p className="text-red-500 text-xs">{errors.namePrefix.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input {...register("firstName", { required: "First Name is required" })} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter first name" />
                    {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input {...register("lastName", { required: "Last Name is required" })} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter last name" />
                    {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
                  <input {...register("userName", { required: "User Name is required" })} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter user name" />
                  {errors.userName && <p className="text-red-500 text-xs">{errors.userName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaBirthdayCake className="mr-1 text-pink-500" /> Date of Birth
                    </label>
                    <input {...register("dateOfBirth", { required: "Date of birth is required" })} type="date" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input type="text" value={age ? `${age} years` : ''} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-100" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaPhone className="mr-1 text-green-500" /> Phone Number
                  </label>
                  <PhoneInput country={'in'} value={phoneValue} onChange={(phone) => { setPhoneValue(phone); setValue('phone', phone); }} inputClass="!w-full !px-3 !py-2 !border !rounded-lg" />
                  <input {...register("phone")} type="hidden" value={phoneValue} />
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FaEnvelope className="mr-2 text-blue-600" />
                Account Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input {...register("email", { required: "Email is required", pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" } })} type="email" className="w-full px-3 py-2 border rounded-lg" />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select {...register("gender", { required: "Gender is required" })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select {...register("role", { required: "Role is required" })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Role</option>
                    {roles.map(role => <option key={role} value={role}>{getRoleDisplayName(role)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site / Location</label>
                  <input {...register("site")} placeholder="e.g., Bangalore" className="w-full px-3 py-2 border rounded-lg mb-2" />
                  <input {...register("location")} placeholder="e.g., Plant A" className="w-full px-3 py-2 border rounded-lg" />
                </div>

                {!isEdit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input {...register("password", { required: !isEdit, minLength: { value: 6, message: "Password must be at least 6 characters" } })} type="password" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register("status")} className="w-full px-3 py-2 border rounded-lg">
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
  <select {...register("department")} className="w-full px-3 py-2 border rounded-lg">
    <option value="">Select Department</option>
    <option value="MR">Management Representative</option>
    <option value="ENGG">Engineering</option>
    <option value="PLANT_MAINTENANCE">Plant Maintenance</option>
    <option value="STORES_DESPATCH">Stores & Despatch</option>
    <option value="PURCHASE">Purchase</option>
    <option value="PPC">Production Planning & Control</option>
    <option value="PRODUCTION">Production</option>
    <option value="HR">Human Resources</option>
    <option value="UNIT_HEAD">Unit Head</option>
    <option value="TOOL_MAINTENANCE">Tool Management</option>
    <option value="QA">Quality Assurance</option>
    <option value="MARKETING">Marketing</option>
  </select>
</div>
              </div>
            </div>
          </div>

          {/* Competency Section (For AUDITOR and LEAD_AUDITOR roles) */}
<div className="bg-gray-50 rounded-lg p-4">
  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
    <FaGraduationCap className="mr-2 text-purple-600" />
    Auditor Competency
  </h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
      <input {...register("qualification")} placeholder="e.g., B.Tech, M.Tech" className="w-full p-2 border rounded-lg" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Total Experience (Years)</label>
      <input {...register("totalExperience")} type="number" placeholder="Years" className="w-full p-2 border rounded-lg" />
    </div>
  </div>

  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Auditor Training</label>
    <input {...register("internalAuditorTraining")} placeholder="e.g., ISO 9001 & IATF16949" className="w-full p-2 border rounded-lg" />
  </div>

  {/* Core Tools - Fixed Checkboxes */}
  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-2">Core Tools Training</label>
    <div className="flex flex-wrap gap-2">
      {coreToolsList.map(tool => (
        <label key={tool} className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            value={tool}
            checked={(watch('coreToolsTraining') || '').split(',').includes(tool)}
            onChange={(e) => {
              const currentValue = watch('coreToolsTraining') || '';
              let newValue;
              if (e.target.checked) {
                newValue = currentValue ? `${currentValue},${tool}` : tool;
              } else {
                newValue = currentValue.split(',').filter(t => t !== tool).join(',');
              }
              setValue('coreToolsTraining', newValue);
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm">{tool}</span>
        </label>
      ))}
    </div>
  </div>

  {/* Problem Solving Tools - Fixed Checkboxes */}
  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-2">Problem Solving Tools</label>
    <div className="flex flex-wrap gap-2">
      {problemSolvingToolsList.map(tool => (
        <label key={tool} className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            value={tool}
            checked={(watch('problemSolvingTools') || '').split(',').includes(tool)}
            onChange={(e) => {
              const currentValue = watch('problemSolvingTools') || '';
              let newValue;
              if (e.target.checked) {
                newValue = currentValue ? `${currentValue},${tool}` : tool;
              } else {
                newValue = currentValue.split(',').filter(t => t !== tool).join(',');
              }
              setValue('problemSolvingTools', newValue);
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm">{tool}</span>
        </label>
      ))}
    </div>
  </div>

  {/* Certified Processes - Fixed Checkboxes */}
  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-2">Certified to Audit Processes</label>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
      {processes.map(process => (
        <label key={process} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            value={process}
            checked={(watch('certifiedForProcess') || []).includes(process)}
            onChange={(e) => {
              const currentValue = watch('certifiedForProcess') || [];
              let newValue;
              if (e.target.checked) {
                newValue = [...currentValue, process];
              } else {
                newValue = currentValue.filter(p => p !== process);
              }
              setValue('certifiedForProcess', newValue);
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm">{process}</span>
        </label>
      ))}
    </div>
  </div>

  <div className="mt-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">Certified for Products (Product IDs)</label>
  <input
    {...register("certifiedForProduct")}
    type="text"
    placeholder="e.g., 24611, 2452, 45216"
    className="w-full p-2 border rounded-lg"
  />
  <p className="text-xs text-gray-400 mt-1">Enter product IDs separated by commas</p>
</div>

  {/* Customer Specific Approved - Fixed Checkbox */}
  <div className="mt-3 flex items-center gap-2">
    <input
      {...register("customerSpecificApproved")}
      type="checkbox"
      className="w-4 h-4 text-blue-600 rounded"
    />
    <label className="text-sm">Approved for Customer Specific Requirements</label>
  </div>

  {/* Certification Dates */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Certification Date</label>
      <input {...register("certificationDate")} type="date" className="w-full p-2 border rounded-lg" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
      <input {...register("certificationExpiryDate")} type="date" className="w-full p-2 border rounded-lg" />
    </div>
  </div>
</div>

          {/* Signature & Profile Photo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FaCamera className="mr-2 text-blue-900" /> Profile Photo
              </h3>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${dragOverPhoto ? 'border-blue-800 bg-blue-50' : 'border-gray-300'}`} onDragOver={(e) => handleDragOver(e, 'photo')} onDragLeave={(e) => handleDragLeave(e, 'photo')} onDrop={(e) => handleDrop(e, 'photo')}>
                {profilePhotoPreview ? (
                  <div className="space-y-3">
                    <img src={profilePhotoPreview} alt="Profile" className="mx-auto w-24 h-24 object-cover rounded-full border-2" />
                    <button type="button" onClick={() => { setProfilePhotoPreview(null); setValue('profilePhoto', ''); }} className="text-red-500 text-sm">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FaCamera className="mx-auto text-3xl text-gray-400" />
                    <label className="inline-block px-4 py-2 bg-blue-900 text-white rounded-lg cursor-pointer">Choose Photo<input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" /></label>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FaSignature className="mr-2 text-purple-600" /> Digital Signature
              </h3>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${dragOverSignature ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`} onDragOver={(e) => handleDragOver(e, 'signature')} onDragLeave={(e) => handleDragLeave(e, 'signature')} onDrop={(e) => handleDrop(e, 'signature')}>
                {signaturePreview ? (
                  <div className="space-y-3">
                    <img src={signaturePreview} alt="Signature" className="mx-auto max-h-24 border rounded" />
                    <button type="button" onClick={() => { setSignaturePreview(null); setValue('signature', ''); }} className="text-red-500 text-sm">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FaUpload className="mx-auto text-3xl text-gray-400" />
                    <label className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg cursor-pointer">Choose Signature<input type="file" accept="image/*" onChange={handleSignatureChange} className="hidden" /></label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCancel} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
              <FaCheck /> {isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;