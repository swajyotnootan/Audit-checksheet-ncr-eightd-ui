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
        <div className="h-1" style={{ background: 'linear-gradient(to right, #7e6a8a, #5c5491)' }}></div>
        <div className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full ring-4 ring-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Welcome back!</h2>
            <p className="text-sm text-gray-600 font-medium mt-1">
              {userData?.name || userData?.username}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full" style={{ background: '#f3eef8' }}>
              <span className="text-xs font-medium" style={{ color: '#5c5491' }}>
                {getRoleDisplayName(userData?.role)}
              </span>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Redirecting to dashboard</p>
              <div className="flex justify-center mt-2 space-x-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#7e6a8a', animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#7e6a8a', animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#7e6a8a', animationDelay: '300ms' }}></div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #7e6a8a 0%, #5c5491 100%)' }}
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
        className="w-full flex items-center justify-between px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-white"
        style={{ background: '#faf7fd', borderColor: '#e0d5ee' }}
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
        <div className="absolute z-50 w-full mt-2 bg-white border rounded-xl shadow-xl overflow-hidden" style={{ borderColor: '#e0d5ee' }}>
          <div className="p-3 border-b" style={{ borderColor: '#f0eaf5' }}>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                style={{ background: '#faf7fd', borderColor: '#e0d5ee' }}
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
                      isSelected ? 'text-purple-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    style={isSelected ? { background: '#f3eef8' } : {}}
                  >
                    <div className={`p-1.5 rounded-lg ${colorClasses[role.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{role.label}</p>
                      <p className="text-xs text-gray-400">@{role.username}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4" style={{ color: '#5c5491' }} />
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

          <div className="px-3 py-2 border-t rounded-b-xl" style={{ borderColor: '#f0eaf5', background: '#faf7fd' }}>
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

        {/* LEFT PANEL - PREVIOUS PURPLE COLORS */}
        <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden" style={{ background: 'linear-gradient(160deg, #7e6a8a 0%, #5c5491 50%, #3d4080 100%)' }}>
          {/* Decorative Elements */}
          <div className="absolute inset-0">
            {/* Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Orbs - Original Colors */}
            <div
              className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full blur-3xl"
              style={{ background: 'rgba(236,180,210,0.13)' }}
            ></div>
            <div
              className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-3xl"
              style={{ background: 'rgba(130,120,200,0.15)' }}
            ></div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>

          {/* Content - Matching Your Desired Format */}
          <div className="relative z-10 flex flex-col justify-center w-full px-12 py-8">
            <div className="max-w-md">
              {/* Logo - Larger */}
              <img src={logo} alt="Qsutra Logo" className="w-[200px] h-auto mb-6" />

              {/* Title */}
              <h1 className="text-white leading-tight text-[1rem] font-medium">
                Qsutra - Quality Management System
              </h1>

              {/* Version */}
              <h3 className="text-white/70 text-[0.8rem] mt-1">
                Ver 2.0.1 (7th April, 2025)
              </h3>

              <br />

              {/* Legal Text */}
              <p className="text-white/60 text-[0.7rem] leading-relaxed">
                International copyright laws and treaties for Intellectual Property, govern & protect this computer program.
                Any form of unauthorised reproduction, copying or distribution of this program in whole or part,
                will attract severe civil & criminal prosecution for maximum extent implications possible under law.
              </p>

              {/* Secure Access Badge */}
              <div className="flex justify-start mt-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/5">
                  <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-medium text-white/80">Secure Access Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - LOGIN FORM (LARGER TEXT) */}
        <div className="flex items-center justify-center w-full lg:w-1/2 p-8 lg:p-12 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile Branding */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <img src={logo2} alt="Stratum Logo" className="h-14 w-auto mb-3" />
              <img src={logo} alt="Qsutra Logo" className="h-8 w-auto opacity-60" />
            </div>

            {/* Desktop Branding */}
            <div className="hidden lg:flex items-center justify-center mb-8">
              <img src={logo2} alt="Stratum Logo" className="h-14 w-auto opacity-80" />
            </div>

            {/* Header - LARGER TEXT */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold" style={{ color: '#2d2540' }}>Internal Audits</h2>
              <p className="text-base mt-1.5" style={{ color: '#9b8fa8' }}>Sign in to access your internal audit dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#fef2f2', border: '0.5px solid #fecaca' }}>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-5">

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#7a6895' }}>
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
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#7a6895' }}>
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter your username"
                    disabled={isSubmitting}
                    className="w-full pl-12 pr-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 transition-all text-base"
                    style={{ background: '#faf7fd', borderColor: '#e0d5ee', color: '#2d2540' }}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="w-5 h-5" style={{ color: '#c5b8d8' }} />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#7a6895' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="w-full pl-12 pr-14 py-3.5 border rounded-xl focus:outline-none focus:ring-2 transition-all text-base"
                    style={{ background: '#faf7fd', borderColor: '#e0d5ee', color: '#2d2540' }}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="w-5 h-5" style={{ color: '#c5b8d8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 transition-colors"
                    style={{ color: '#c5b8d8' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Options - LARGER TEXT */}
              <div className="flex items-center justify-between text-base">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 border-gray-300 rounded focus:ring-2"
                    style={{ accentColor: '#5c5491' }}
                  />
                  <span className="text-sm" style={{ color: '#9b8fa8' }}>
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#7e6a8a' }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button - LARGER */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 text-base font-medium text-white rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7e6a8a 0%, #5c5491 100%)' }}
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
                    <LogIn className="w-5 h-5" />
                    Sign in
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid #f0eaf5' }}>
              <p className="text-center text-sm" style={{ color: '#c5b8d8' }}>
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