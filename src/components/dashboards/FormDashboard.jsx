// / src/pages/FormDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Clock, CheckCircle, User, Briefcase, Star, TrendingUp, Shield } from 'lucide-react';
import { getAccessibleFormTypes, getRoleDisplayName, normalizeRole } from '../utils/roleUtils';
import {
  ClipboardList,
  FileText,
  ArrowRight,
  Factory,
  FlaskConical,
  Box,
  FileCheck
} from 'lucide-react';import Navbar from '../Navbar';
// import AnnexureLanding from "../comform/AnnexureLandingHeat";
// import LandingPage1 from '../../pages/LandingPage1';
// import TTFProductionTable from "../comform/Annexure1";
// import RenewSysDash from '../../pages/RenewSysDash'; // Add this import at the top
 
const formData = [
  {
    id: 1,
    title: 'F A I - COATING',
    description: 'Quality assessment for coating applications and standards',
    icon: '🎨',
    formType: 'coating',
    category: 'Quality',
    status: 'ongoing',
    progress: 75,
    instructor: 'QC Manager',
    department: 'Quality Control',
    roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
    priority: 'high',
    lastUpdated: '2 hours ago'
  },
  // {
  //   id: 2,
  //   title: 'Quality Inspection',
  //   description: 'Create and manage incoming quality inspection reports',
  //   icon: '📋',
  //   formType: 'quality',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 60,
  //   instructor: 'Quality Team',
  //   department: 'Quality Assurance',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '1 hour ago'
  // },
  // {
  //   id: 3,
  //   title: 'Line Clearance',
  //   description: 'Manage and submit production line clearance documentation',
  //   icon: '✓',
  //   formType: 'clearance',
  //   category: 'Production',
  //   status: 'done',
  //   progress: 100,
  //   instructor: 'Production Head',
  //   department: 'Production',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'high',
  //   lastUpdated: '30 minutes ago'
  // },
  // {
  //   id: 4,
  //   title: 'Printing Inspection',
  //   description: 'Document printing quality inspections and standards',
  //   icon: '🖨️',
  //   formType: 'printing',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 45,
  //   instructor: 'Print Supervisor',
  //   department: 'Printing Department',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '3 hours ago'
  // },
  // {
  //   id: 5,
  //   title: 'COATING Hourly In-Process Inspection',
  //   description: 'Document coating process inspections and standards',
  //   icon: '🧴',
  //   formType: 'coating',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 80,
  //   instructor: 'Coating Specialist',
  //   department: 'Coating Department',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'high',
  //   lastUpdated: '45 minutes ago'
  // },
  // {
  //   id: 6,
  //   title: 'Hot Foil Stamping Hourly In-Process Inspection',
  //   description: 'Document hot foil stamping process inspections and standards',
  //   icon: '🔥',
  //   formType: 'hot_foil_stamping',
  //   category: 'Quality',
  //   status: 'done',
  //   progress: 100,
  //   instructor: 'HFS Expert',
  //   department: 'Hot Foil Stamping',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '1 day ago'
  // },
  // {
  //   id: 7,
  //   title: 'HFS In-Process Color Shade Observation',
  //   description: 'Observe and record color shade during HFS process',
  //   icon: '🎨',
  //   formType: 'hfs_color_shade',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 65,
  //   instructor: 'Color Analyst',
  //   department: 'Color Quality',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '1.5 hours ago'
  // },
  // {
  //   id: 8,
  //   title: 'Packware Audit',
  //   description: 'Audit and inspect packaging materials and processes',
  //   icon: '📦',
  //   formType: 'packware_audit',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 30,
  //   instructor: 'Audit Team',
  //   department: 'Quality Audit',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'low',
  //   lastUpdated: '4 hours ago'
  // },
  // {
  //   id: 9,
  //   title: 'Plain Bottle & Jar IQC',
  //   description: 'Incoming quality check for plain bottles and jars',
  //   icon: '🍶',
  //   formType: 'plain_bottle_jar_iqc',
  //   category: 'Quality',
  //   status: 'passed',
  //   progress: 100,
  //   instructor: 'IQC Inspector',
  //   department: 'Incoming Quality Control',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'high',
  //   lastUpdated: '2 days ago'
  // },
  // {
  //   id: 10,
  //   title: 'PRINTING Hourly In-Process Inspection',
  //   description: 'Document printing process inspections and standards',
  //   icon: '🖨️',
  //   formType: 'printing_hourly',
  //   category: 'Quality',
  //   status: 'ongoing',
  //   progress: 55,
  //   instructor: 'Print QC',
  //   department: 'Printing Department',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '2.5 hours ago'
  // },
  // {
  //   id: 11,
  //   title: 'PRINTING In-Process Color Shade Observation',
  //   description: 'Observe and record color shade during printing process',
  //   icon: '🖌️',
  //   formType: 'printing_color_shade',
  //   category: 'Quality',
  //   status: 'done',
  //   progress: 100,
  //   instructor: 'Color Expert',
  //   department: 'Color Quality',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'medium',
  //   lastUpdated: '1 day ago'
  // },
  // {
  //   id: 12,
  //   title: 'Staff Log Book',
  //   description: 'Record staff activities and shift details',
  //   icon: '📒',
  //   formType: 'staff_log_book',
  //   category: 'Log',
  //   status: 'ongoing',
  //   progress: 90,
  //   instructor: 'HR Manager',
  //   department: 'Human Resources',
  //   roles: ['SHIFT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_HOD', 'MASTER', 'MANAGER', 'ADMIN'],
  //   priority: 'low',
  //   lastUpdated: '30 minutes ago'
  // }
];
 
const dashboardCards = [
  {
    id: "special-5",
    title: "   InProcess & FIR",
    // description: "Inprocess & FIR",
    
    icon: ClipboardList,
    color: "from-green-400 to-blue-400",
    // Navigate to the RenewSys dashboard route
    action: (navigate, setSidebarOpen) => {
      navigate('/dashboard/renewsys');
      setSidebarOpen?.(false);
    },
  },
  {
  id: "special-4",
  title: "Finished Goods",
  // description: "Inspect and approve incoming raw materials and components",
  icon: Box, // ✅ Now defined!
  category: "Quality",
  department: "Incoming Quality Control",
  lastUpdated: "2 hours ago",
  action: (navigate, setSidebarOpen) => {
    navigate('/forms/goods-inward');
    setSidebarOpen?.(false);
  },
},
{
  id: "special-6",
  title: "Process Audit",
  // description: "Conduct and manage internal quality system audits",
  icon: FileText,
  category: "Audit",
  department: "Quality Assurance",
  lastUpdated: "1 day ago",
  action: (navigate, setSidebarOpen) => {
    navigate('/forms/internal-audit');
    setSidebarOpen?.(false);
  }
},
  // {
  //   id: "special-1",
  //   title: "TEST & HEAT",
  //   description: "Chemical  Analysis & Monitoring",
  //   icon: FlaskConical,
  //   category: "Laboratory",
  //   // status: "ongoing",
  //   // progress: 85,
  //   instructor: "Lab Technician",
  //   department: "Quality Laboratory",
  //   // priority: "high",
  //   lastUpdated: "1 hour ago",
  //   // Navigate to the landing page instead of opening a modal
  //   action: (navigate, setSidebarOpen) => {
  //     navigate('/forms/just-landing');
  //     setSidebarOpen?.(false);
  //   },
  // },
  // {
  //   id: "special-2",
  //   title: "MOC",
  //   description: " Annexure Forms & Safety Assessment",
  //   icon: Shield,
  //   category: "Safety",
  //   status: "passed",
  //   progress: 100,
  //   instructor: "Safety Officer",
  //   department: "Safety & Compliance",
  //   priority: "high",
  //   lastUpdated: "2 days ago",
  //   action: (navigate, setSidebarOpen, setActiveModal, user) => {
  //     console.log('=== MOC MANAGEMENT CARD CLICKED ===');
  //     console.log('User object:', user);
  //     console.log('User role:', user?.role);
  //     console.log('User department:', user?.department);
  //     console.log('Navigate function:', typeof navigate);
     
  //     // Handle both user object structures (main AuthContext vs MOC AuthContext)
  //     const userRole = typeof user?.role === 'object' ? user?.role?.name : user?.role;
  //     const userDepartment = typeof user?.department === 'object' ? user?.department?.name : user?.department;
  //     const normalizedRole = (userRole || '').toUpperCase().trim();
  //     const normalizedDepartment = (userDepartment || '').toUpperCase().trim();
     
  //     console.log('Normalized role:', normalizedRole);
  //     console.log('Normalized department:', normalizedDepartment);
     
  //     // Simple and clear access control
  //     const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN';
  //     const isInitiator = normalizedRole === 'INITIATOR';
  //     const isHOD = normalizedRole === 'HOD';
  //     const isPlantHOD = normalizedRole === 'PLANT_HOD';
  //     const isHeadOps = normalizedRole === 'HEAD_OPERATIONS';
  //     const isHeadMech = normalizedRole === 'HEAD_MECH_MAINTENANCE';
  //     const isOperationsDept = normalizedDepartment === 'OPERATIONS';
     
  //     console.log('Access checks:');
  //     console.log('- isAdmin:', isAdmin);
  //     console.log('- isInitiator:', isInitiator);
  //     console.log('- isHOD:', isHOD);
  //     console.log('- isPlantHOD:', isPlantHOD);
  //     console.log('- isHeadOps:', isHeadOps);
  //     console.log('- isHeadMech:', isHeadMech);
  //     console.log('- isOperationsDept:', isOperationsDept);
     
  //     // Allow access for specific roles and departments
  //     const hasMOCAccess =
  //       isAdmin ||
  //       isInitiator ||
  //       isHOD ||
  //       isPlantHOD || // Plant HOD can access regardless of department
  //       (isOperationsDept && (isHeadOps || isHeadMech));
     
  //     console.log('Final hasMOCAccess:', hasMOCAccess);
     
  //     if (!hasMOCAccess) {
  //       console.log('❌ ACCESS DENIED');
  //       alert(`You do not have access to MOC Management.\n\nYour details:\n- Role: "${normalizedRole}"\n- Department: "${normalizedDepartment}"\n\nRequired: Admin, Initiator, HOD, Plant HOD, or Operations department with appropriate role.`);
  //       return;
  //     }
     
  //     console.log('✅ ACCESS GRANTED - Navigating to /moc');
  //     try {
  //       navigate('/moc');
  //       setSidebarOpen?.(false);
  //       console.log('Navigation completed successfully');
  //     } catch (error) {
  //       console.error('Navigation error:', error);
  //       alert('Navigation failed. Please try again.');
  //     }
  //     console.log('=== END MOC MANAGEMENT CARD CLICK ===');
  //   },
  // },
 
  {
    id: "special-3",
    title: "8D",
    description: "Case / Issue Management",
    icon: CheckCircle,
     category: "Laboratory",
    status: "ongoing",
    progress: 85,
    color: "from-purple-200 to-pink-300",
    action: (navigate) => navigate('/forms/8d'),
  },
 
 
 
];
 
// Status component — refined with subtle contrast
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch(status) {
      case 'ongoing':
        return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', label: 'Ongoing' };
      case 'done':
        return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'Done' };
      case 'passed':
        return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', label: 'Passed' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: 'Unknown' };
    }
  };
 
  const config = getStatusConfig(status);
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
      {config.label}
    </span>
  );
};
 
// Priority component
const PriorityBadge = ({ priority }) => {
  const getPriorityConfig = (priority) => {
    switch(priority) {
      case 'high':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'High', icon: '🔴' };
      case 'medium':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Medium', icon: '🟡' };
      case 'low':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Low', icon: '🟢' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Normal', icon: '⚪' };
    }
  };
 
  const config = getPriorityConfig(priority);
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border} flex items-center gap-1`}>
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
};
 
// Progress bar — smoother, more elegant
const ProgressBar = ({ progress }) => (
  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
    <div
      className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-1.5 rounded-full transition-all duration-500 ease-out"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);
 
// 🎯 ENHANCED FORM CARD — PREMIUM UI WITH DEPARTMENT & ROLE INFO
const FormCard = ({ form }) => {
  return (
    <div className="relative p-6 overflow-hidden transition-all duration-500 ease-out bg-white border border-gray-100 shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl hover:border-blue-300 hover:-translate-y-2 group">
      {/* Premium gradient overlay on hover */}
      <div className="absolute inset-0 transition-all duration-500 pointer-events-none bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/30 group-hover:via-indigo-50/20 group-hover:to-purple-50/30 rounded-3xl"></div>
     
      {/* Animated border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]">
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>
 
      {/* Header with icon, status, and priority */}
      <div className="relative z-10 flex items-start justify-between mb-6">
        <div className="flex items-center justify-center w-16 h-16 text-3xl transition-all duration-500 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3">
          {form.icon}
        </div>
        <div className="flex flex-col gap-2">
        <StatusBadge status={form.status} />
          <PriorityBadge priority={form.priority} />
        </div>
      </div>
 
      {/* Category and Department */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-bold tracking-wider text-blue-600 uppercase rounded-full bg-blue-50">
          {form.category}
        </span>
          <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {form.department}
          </span>
        </div>
      </div>
 
      {/* Title — enhanced typography */}
      <h3 className="relative z-10 mb-3 text-2xl leading-tight text-gray-900 transition-colors group-hover:text-blue-900">
        {form.title}
      </h3>
 
      {/* Description — improved spacing */}
      <p className="relative z-10 mb-6 text-sm leading-relaxed text-gray-600 line-clamp-3">
        {form.description}
      </p>
 
      {/* Progress section with enhanced styling */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Check In</span>
          <span className="text-xs text-gray-00">{form.progress}%</span>
        </div>
        <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
          <div
            className="h-2 transition-all duration-700 ease-out rounded-full bg-gradient-to-r from-blue-300 to-purple-300 group-hover:from-blue-600 group-hover:to-purple-600"
            style={{ width: `${form.progress}%` }}
          ></div>
        </div>
      </div>
 
      {/* Enhanced footer with more information */}
      <div className="relative z-10 pt-4 mt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{form.instructor}</p>
              <p className="text-xs text-gray-500">Instructor</p>
            </div>
          </div>
         
          <div className="text-right">
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="text-xs font-medium text-gray-700">{form.lastUpdated}</p>
          </div>
        </div>
       
        {/* Action button */}
        <Link
          to={`/forms/${form.formType}`}
className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium transition-all duration-300 bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-400 hover:to-purple-400 text-slate-700 rounded-xl group-hover:shadow-md"
        >
          <span>Continue Process</span>
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
};
 
// 🎯 ENHANCED SPECIAL CARD — PREMIUM UI WITH DEPARTMENT & ROLE INFO
const SpecialCard = ({ card, user, navigate, setActiveModal }) => {
  return (
    <div
      onClick={() => card.action(navigate, null, setActiveModal, user)}
      className="relative p-6 overflow-hidden transition-all duration-500 ease-out bg-white border border-gray-100 shadow-lg cursor-pointer rounded-3xl hover:shadow-2xl hover:border-blue-300 hover:-translate-y-2 group"
    >
      {/* Premium gradient overlay on hover */}
      <div className="absolute inset-0 transition-all duration-500 pointer-events-none bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/30 group-hover:via-indigo-50/20 group-hover:to-purple-50/30 rounded-3xl"></div>
     
      {/* Animated border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]">
        <div className="w-full h-full bg-white rounded-3xl"></div>
      </div>
 
      {/* Header with icon, status, and priority */}
      <div className="relative z-10 flex items-start justify-between mb-6">
        <div className="flex items-center justify-center w-16 h-16 transition-all duration-500 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3">
          <card.icon className="w-8 h-8 text-gray-700" />
        </div>
        <div className="flex flex-col gap-2">
        <StatusBadge status={card.status} />
          <PriorityBadge priority={card.priority} />
        </div>
      </div>
 
      {/* Category and Department */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-bold tracking-wider text-blue-600 uppercase rounded-full bg-blue-50">
          {card.category}
        </span>
          <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {card.department}
          </span>
        </div>
      </div>
 
      {/* Title — enhanced typography */}
      <h3 className="relative z-10 mb-3 text-2xl leading-tight text-gray-900 transition-colors group-hover:text-blue-900">
        {card.title}
      </h3>
 
      {/* Description — improved spacing */}
      <p className="relative z-10 mb-6 text-sm leading-relaxed text-gray-600 line-clamp-3">
        {card.description}
      </p>
 
      {/* Progress section with enhanced styling */}
      <div className="relative z-10 mb-6">
       
       
      </div>
 
      {/* Enhanced footer with more information */}
      <div className="relative z-10 pt-4 mt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
           
           
          </div>
         
         
        </div>
       
        {/* Action button */}
        <div className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium text-white transition-all duration-300 text-bg-black-500 bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-300 hover:to-purple-300 rounded-xl group-hover:shadow-lg">
<p className="text-lg text-black">Check-In</p>
 <ChevronRight className="w-4 h-4 text-black transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};
 
const FormDashboard = ({ user, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredForms, setFilteredForms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeModal, setActiveModal] = useState(null);
  const [userInfo, setUserInfo] = useState(user);
 
  const navigate = useNavigate();
 
  // Update user info if user prop changes
  useEffect(() => {
    setUserInfo(user);
  }, [user]);
 
  const userAccessibleForms = useMemo(() => {
    const userRole = userInfo?.role?.toUpperCase() || '';
    const accessibleTypes = getAccessibleFormTypes(userRole);
    return formData.filter(
      form =>
        form.roles.map(r => r.toUpperCase()).includes(userRole) ||
        accessibleTypes.includes(form.formType)
    );
  }, [userInfo?.role]);
 
  useEffect(() => {
    setFilteredForms(userAccessibleForms);
    setCategories([...new Set(userAccessibleForms.map(f => f.category))]);
  }, [userAccessibleForms]);
 
  useEffect(() => {
    let result = userAccessibleForms;
    if (searchQuery) {
      result = result.filter(
        form =>
          form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          form.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          form.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== 'All') result = result.filter(f => f.category === selectedCategory);
    setFilteredForms(result);
  }, [searchQuery, selectedCategory, userAccessibleForms]);
 
  return (
    <Navbar user={user} onLogout={onLogout}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        {/* Main Content */}
        <div className="max-w-full px-4 pt-8 sm:px-6 md:px-8 lg:px-10 xl:px-12">
       
        {/* User Info Section */}
        <div className="mb-6">
         
        </div>
 
     {/* Enhanced Search Bar */}
<div className="flex justify-center mb-8">
  <div className="relative w-full max-w-2xl">
    {/* Left search icon */}
    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
      <Search className="w-5 h-5 text-gray-400" />
    </div>
 
    {/* Input */}
    <input
      type="text"
      className="block w-full py-4 pl-12 pr-6 text-lg text-gray-900 placeholder-gray-500 transition-all duration-300 bg-white border border-gray-200 shadow-lg rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      placeholder="Search forms, departments, and processes..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
 
    {/* Right pulse indicator */}
    <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
    </div>
  </div>
</div>
 
{/* Enhanced Filters Section */}
<div className="flex flex-wrap justify-center gap-4 mb-10">
  {/* Category Filter */}
  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-2xl">
    <span className="text-sm font-medium text-gray-700">Category:</span>
    <select
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="text-sm text-gray-800 bg-transparent border-0 cursor-pointer focus:ring-0"
    >
      <option value="All">All</option>
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  </div>
 
  {/* Quick Filters */}
  <div className="flex items-center gap-2">
    {['All', 'Ongoing', 'Done', 'Passed'].map((status) => (
      <button
        key={status}
        onClick={() => {
          if (status === 'All') {
            setFilteredForms(userAccessibleForms);
          } else {
            setFilteredForms(
              userAccessibleForms.filter(
                (form) => form.status.toLowerCase() === status.toLowerCase()
              )
            );
          }
        }}
        className="px-4 py-2 text-sm transition-all bg-white border border-gray-200 shadow-sm rounded-xl hover:bg-blue-50 hover:text-blue-700"
      >
        {status}
      </button>
    ))}
  </div>
</div>
 
 
        {/* Forms Grid */}
  <div className="grid grid-cols-1 gap-24 mb-10 mr-10 sm :grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {/* Special Dashboard Cards */}
          {dashboardCards.map((card) => (
            <SpecialCard
              key={card.id}
              card={card}
              user={userInfo}
              navigate={navigate}
              setActiveModal={setActiveModal}
            />
          ))}
 
          {/* Regular Form Cards */}
          {filteredForms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>
 
 
        {/* Enhanced Empty state */}
        {filteredForms.length === 0 && (
          <div className="py-32 text-center">
            <div className="flex items-center justify-center w-40 h-40 mx-auto mb-10 rounded-full shadow-2xl bg-gradient-to-br from-blue-100 to-purple-100">
              <Search className="w-20 h-20 text-blue-500" />
            </div>
            <h3 className="mb-6 text-4xl font-bold text-gray-900">No Quality Forms Found</h3>
            <p className="max-w-2xl mx-auto mb-10 text-xl leading-relaxed text-gray-600">
              We couldn't find any quality management forms matching your current search criteria.
              Try adjusting your search terms or category filters to discover available inspection forms and processes.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-10 py-5 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:shadow-2xl hover:scale-105"
              >
                🔄 Reset All Filters
              </button>
              <button
                onClick={() => setSelectedCategory('Quality')}
                className="px-10 py-5 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl hover:shadow-2xl hover:scale-105"
              >
                🔍 View Quality Forms
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
 
      {/* Modals — unchanged, but now the backdrop feels more natural */}
      {/* {activeModal === "testHeat" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-6xl relative border border-gray-200 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute flex items-center justify-center w-10 h-10 text-gray-600 transition-colors bg-gray-100 rounded-full top-4 right-4 hover:bg-gray-200 hover:text-gray-800"
              onClick={() => setActiveModal(null)}
            >
              ✕
            </button>
            <div className="flex items-center mb-6 space-x-3">
              <FlaskConical className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl text-gray-900">TEST & HEAT Analysis</h2>
            </div>
             <div className="p-4 bg-white shadow-lg rounded-xl">
        <LandingPage1 user={user} onLogout={onLogout} />
      </div>
          </div>
        </div>
      )} */}
 
      {activeModal === "ttfProduction" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-6xl relative border border-gray-200 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute flex items-center justify-center w-10 h-10 text-gray-600 transition-colors bg-gray-100 rounded-full top-4 right-4 hover:bg-gray-200 hover:text-gray-800"
              onClick={() => setActiveModal(null)}
            >
              ✕
            </button>
            <div className="flex items-center mb-6 space-x-3">
              <Factory className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl text-gray-900">T.T.F PRODUCTION</h2>
            </div>
            <TTFProductionTable />
          </div>
        </div>
      )}
    </Navbar>
  );
};
 
export default FormDashboard;