import React, { useState } from 'react';
import { authAPI } from './services/api';
import logo from '../assets/QsutraQMS.png';
import logo2 from '../assets/Stratum.png';
import { 
  Eye, EyeOff, Lock, User, CheckCircle, Shield, Briefcase, 
  Users, UserCheck, Crown, Building, UserCog, HardHat, 
  FileCheck, ChevronDown, LogIn, ArrowRight, Sparkles,
  Globe
} from 'lucide-react';
import { LOGIN_ROLE_OPTIONS, getRoleDisplayName } from '../components/utils/roleUtils';

// ============================================
// WELCOME POPUP COMPONENT
// ============================================
const WelcomePopup = ({ isOpen, onClose, userData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full ring-4 ring-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Welcome back!</h2>
            <p className="text-sm text-gray-600 font-medium mt-1">
              {userData?.name || userData?.username}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 bg-blue-50 rounded-full">
              <span className="text-xs font-medium text-blue-600">
                {getRoleDisplayName(userData?.role)}
              </span>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Redirecting to dashboard</p>
              <div className="flex justify-center mt-2 space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Continue to Dashboard
              <ArrowRight className="inline-block w-4 h-4 ml-1.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ROLE SELECT DROPDOWN COMPONENT
// ============================================
const RoleSelect = ({ value, onChange, isSubmitting }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const roles = [
    { label: 'Master', username: 'master', password: '1234567', icon: Crown, color: 'purple' },
    { label: 'Audit Manager', username: 'audit.manager', password: '1234567', icon: Briefcase, color: 'blue' },
    { label: 'Lead Auditor', username: 'hr.lead', password: 'user123', icon: UserCheck, color: 'indigo' },
    { label: 'Initiator', username: 'initiator', password: 'init123', icon: FileCheck, color: 'green' },
    { label: 'Auditor', username: 'hr.aud1', password: 'user123', icon: Users, color: 'cyan' },
    { label: 'HOD', username: 'engg.hod', password: 'user123', icon: HardHat, color: 'orange' },
    { label: 'Auditee', username: 'hr.emp1', password: 'user123', icon: User, color: 'gray' },
    { label: 'HR Admin', username: 'hr.admin', password: 'user123', icon: UserCog, color: 'pink' },
    { label: 'Top Management', username: 'top.mgmt', password: 'user123', icon: Building, color: 'amber' },
  ];

  const filteredRoles = roles.filter((role) =>
    role.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRole = roles.find((r) => r.label === value);

  const handleSelect = (role) => {
    onChange(role);
    setIsOpen(false);
    setSearchTerm('');
  };

  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSubmitting}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 hover:bg-white"
      >
        <div className="flex items-center gap-3">
          {selectedRole ? (
            <>
              <div className={`p-1.5 rounded-lg ${colorClasses[selectedRole.color]}`}>
                {React.createElement(selectedRole.icon, { className: 'w-4 h-4' })}
              </div>
              <span className="text-sm font-medium text-gray-700">{selectedRole.label}</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Select your role...</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredRoles.length > 0 ? (
              filteredRoles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole?.label === role.label;
                return (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => handleSelect(role)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${colorClasses[role.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{role.label}</p>
                      <p className="text-xs text-gray-400">@{role.username}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                No roles found
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-400 text-center">
              {filteredRoles.length} roles available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN LOGIN FORM COMPONENT
// ============================================
const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    selectedField: '',
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role) => {
    setFormData({
      selectedField: role.label,
      username: role.username,
      password: role.password
    });
    setError('');
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleLoginSuccess = (userData) => {
    setLoggedInUser(userData);
    setShowWelcomePopup(true);
    setTimeout(() => {
      setShowWelcomePopup(false);
      onLogin(userData);
    }, 3000);
  };

  const handlePopupClose = () => {
    setShowWelcomePopup(false);
    if (loggedInUser) onLogin(loggedInUser);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      
      if (!formData.selectedField) {
        setError('Please select a role');
        setIsSubmitting(false);
        return;
      }
      if (!formData.username) {
        setError('Please enter username');
        setIsSubmitting(false);
        return;
      }
      if (!formData.password) {
        setError('Please enter password');
        setIsSubmitting(false);
        return;
      }
      
      const user = await authAPI.login(formData.username, formData.password);
      
      const selectedRoleOption = LOGIN_ROLE_OPTIONS.find((option) => option.label === formData.selectedField);
      const selectedRole = selectedRoleOption ? selectedRoleOption.role : null;
      const userActualRole = user.role.toUpperCase();
      
      if (selectedRole && selectedRole !== userActualRole) {
        setError(`Role mismatch. Your account is "${userActualRole}" but you selected "${selectedRole}"`);
        setIsSubmitting(false);
        return;
      }
      
      const finalRole = selectedRole || userActualRole;
      
      handleLoginSuccess({
        id: user.id,
        role: finalRole,
        name: user.name,
        email: user.email,
        username: user.username || formData.username,
        department: user.department,
        field: formData.selectedField,
      });
      
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Invalid username or password'
          : 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen overflow-hidden bg-gray-50">
        {/* LEFT PANEL - BRANDING (Reduced Colors) */}
        <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0">
            {/* Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Reduced Orbs - Only 2 instead of 3 */}
            <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-400/15 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-400/15 rounded-full blur-3xl"></div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between w-full p-12 lg:p-16">
            <div>
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                  <Shield className="w-5 h-5 text-white/80" />
                </div>
                <span className="text-white/50 text-xs font-medium tracking-wider uppercase">Secure Enterprise Platform</span>
              </div>
              
              <img src={logo} alt="Qsutra Logo" className="w-[180px] h-auto mb-8" />
              
              <h1 className="text-4xl font-bold text-white leading-tight mb-3">
                Quality Management<br />
                <span className="text-blue-300">System</span>
              </h1>
              
              <p className="text-white/60 text-sm mb-1">Version 2.0.1</p>
              <p className="text-white/30 text-xs mb-8">7th April, 2025</p>
              
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/5">
                  <Sparkles className="w-3 h-3 text-blue-300" />
                  <span className="text-white/50 text-xs">ISO 9001:2015</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/5">
                  <Shield className="w-3 h-3 text-blue-300" />
                  <span className="text-white/50 text-xs">SOC 2 Compliant</span>
                </div>
              </div>
              
              <div className="max-w-md p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <p className="text-white/40 text-xs leading-relaxed">
                  International copyright laws and treaties for Intellectual Property govern and protect this computer program.
                  Unauthorized reproduction, copying or distribution will attract severe civil and criminal prosecution.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span className="text-white/40 text-xs">All systems operational</span>
              </div>
              
              <div className="flex items-center gap-2 text-white/20 text-xs">
                <Globe className="w-3 h-3" />
                <span>Secure Connection</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - LOGIN FORM */}
        <div className="flex items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile Branding */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <img src={logo2} alt="Stratum Logo" className="h-14 w-auto mb-4" />
              <img src={logo} alt="Qsutra Logo" className="h-8 w-auto opacity-60" />
            </div>

            {/* Desktop Branding */}
            <div className="hidden lg:flex items-center justify-center mb-8">
              <img src={logo2} alt="Stratum Logo" className="h-12 w-auto opacity-80" />
            </div>

            {/* Header - Changed to "Internal Audits" */}
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-800">Internal Audits</h2>
              <p className="text-sm text-gray-500 mt-1">Sign in to access your internal audit dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Select Role
                </label>
                <RoleSelect 
                  value={formData.selectedField} 
                  onChange={handleRoleSelect}
                  isSubmitting={isSubmitting}
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter your username"
                    disabled={isSubmitting}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm placeholder:text-gray-400"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm placeholder:text-gray-400"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
                    Remember me
                  </span>
                </label>
                <button 
                  type="button" 
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">
                © 2025 Swajyot Technologies. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Popup */}
      <WelcomePopup
        isOpen={showWelcomePopup}
        onClose={handlePopupClose}
        userData={loggedInUser}
      />
    </>
  );
};

export default LoginForm;