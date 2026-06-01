import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authAPI } from './services/api';
import logo from '../assets/QsutraQMS.png';
import logo2 from '../assets/Stratum.png';
import { Eye, EyeOff, Lock, User, CheckCircle, Zap } from 'lucide-react';
import { LOGIN_ROLE_OPTIONS, getRoleDisplayName } from '../components/utils/roleUtils';

const WelcomePopup = ({ isOpen, onClose, userData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-xl">
        <div className="text-center">
          {/* Success Icon */}
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-green-50">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Welcome Message */}
          <h2 className="mb-1 text-xl font-bold text-gray-900">
            Welcome, {userData?.name || userData?.username}!
          </h2>

          <p className="mb-3 text-sm text-gray-600">
            Successfully logged in as <span className="font-semibold text-blue-600">{getRoleDisplayName(userData?.role)}</span>
          </p>

          {/* Dashboard Info */}
          <div className="p-3 mb-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-700">
              You are being redirected to your dashboard...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              System: <span className="font-medium">{userData?.system || 'TRSL'}</span>
            </p>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center mb-4">
            <div className="flex space-x-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginForm = ({ onLogin }) => {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Demo credentials data
  const demoCredentials = [
    { 
      label: 'Master', 
      role: 'master', 
      roleValue: 'master', 
      username: 'master', 
      password: '1234567',
      field: 'MASTER'
    },
    { 
      label: 'Audit Manager', 
      role: 'AUDIT_MANAGER', 
      roleValue: 'audit_manager', 
      username: 'audit.manager', 
      password: '1234567',
      field: 'AUDIT_MANAGER'
    },
    { 
      label: 'Lead Auditor', 
      role: 'LEAD_AUDITOR', 
      roleValue: 'lead_auditor', 
      username: 'hr.lead', 
      password: 'user123',
      field: 'LEAD_AUDITOR'
    },
    { 
      label: 'Initiator', 
      role: 'initiator', 
      roleValue: 'initiator', 
      username: 'initiator', 
      password: 'init123',
      field: 'INITIATOR'
    },
    { 
      label: 'Auditor', 
      role: 'AUDITOR', 
      roleValue: 'auditor', 
      username: 'hr.aud1', 
      password: 'user123',
      field: 'AUDITOR'
    },
    { 
      label: 'HOD', 
      role: 'HOD_MR', 
      roleValue: 'hod_mr', 
      username: 'engg.hod', 
      password: 'user123',
      field: 'HOD_MR'
    },
    { 
      label: 'Auditee', 
      role: 'AUDITEE', 
      roleValue: 'auditee', 
      username: 'hr.emp1', 
      password: 'user123',
      field: 'AUDITEE'
    },
    { 
      label: 'HR Admin', 
      role: 'HR_ADMIN', 
      roleValue: 'hr_admin', 
      username: 'hr.admin', 
      password: 'user123',
      field: 'HR_ADMIN'
    },
    
    { 
      label: 'Top Management', 
      role: 'TOP_MANAGEMENT', 
      roleValue: 'top_management', 
      username: 'top.mgmt', 
      password: 'user123',
      field: 'TOP_MANAGEMENT'
    }
  ];

  const autofillCredentials = (credentials) => {
    setValue('selectedField', credentials.field);
    setValue('username', credentials.username);
    setValue('password', credentials.password);
    // Clear any existing errors when autofilling
    setError('');
  };

const handleLoginSuccess = (userData) => {
  setLoggedInUser(userData);
  setShowWelcomePopup(true);

  // Session check removed - add back if needed later
  console.log('✅ Login successful:', userData.username);

  setTimeout(() => {
    setShowWelcomePopup(false);
    onLogin(userData);
  }, 3000);
};

  const handlePopupClose = () => {
    setShowWelcomePopup(false);
    if (loggedInUser) {
      onLogin(loggedInUser);
    }
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      const user = await authAPI.login(data.username, data.password);
      
      const selectedRoleOption = LOGIN_ROLE_OPTIONS.find(option => option.value === data.selectedField);
      const selectedRole = selectedRoleOption ? selectedRoleOption.role : null;
      const userActualRole = user.role.toUpperCase();
      
      console.log('=== ROLE VALIDATION DEBUG ===');
      console.log('Selected field:', data.selectedField);
      console.log('Selected role option:', selectedRoleOption);
      console.log('Selected role:', selectedRole);
      console.log('User actual role:', userActualRole);
      console.log('Role match:', selectedRole === userActualRole);
      console.log('=== END ROLE VALIDATION DEBUG ===');
      
      if (selectedRole && selectedRole !== userActualRole) {
        setError(`Role mismatch. Your account is registered as "${userActualRole}" but you selected "${selectedRole}". Please select the correct role.`);
        return;
      }
      
      const finalRole = selectedRole || userActualRole;
      
      // Call handleLoginSuccess instead of calling onLogin directly
      handleLoginSuccess({
        id: user.id,
        role: finalRole,
        name: user.name,
        email: user.email,
        username: user.username || data.username,
        department: user.department,
        field: data.selectedField,
      });
      
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.status === 401
          ? 'Invalid username or password.'
          : 'An error occurred during login. Please try again.'
      );
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Left Side — Branding & Security Message - LEFT ALIGNED & NO BORDERS */}
        <div className="relative flex-col justify-center hidden overflow-hidden md:flex md:w-1/2 bg-gradient-to-br from-purple-600 via-violet-500 to-purple-400">
          {/* Abstract Decorative Elements */}
          <div className="absolute w-40 h-40 rounded-full -top-30 -left-35 bg-pink-300/20 blur-3xl"></div>
          <div className="absolute w-56 h-56 rounded-full -bottom-24 -right-24 bg-orange-300/15 blur-3xl"></div>

          <div className="relative z-10 w-full max-w-xl mx-0 my-auto px-16 py-8 mt-[100px]">
            {/* Logo - Left Aligned, No Border */}
              {/* Content */}
          <div className="w-full max-w-md">
            <img src={logo} alt="Qsutra Logo" className="w-[200px] h-auto mb-9 mr-6" />
            <h1 className="text-1xl text-white leading-tight text-[0.8rem]">Qsutra - Quality Management System</h1>
           
            <h3 className="text-white text-[0.7rem]"> Ver 2.0.1 ( 7th April, 2025 )</h3>
            <br/>
           
            <p className="text-white text-[0.6rem] leading-tight mt-6">
              International copyright laws and treaties for Intellectual Property, govern & protect this computer program.
              Any form of unauthorised reproduction, copying or distribution of this program in whole or part,
              will attract severe civil & criminal prosecution for maximum extent implications possible under law.
            </p>
          </div>
 

            {/* Security Badge - Left Aligned, No Border */}
            <div className="flex justify-start mt-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-medium text-white">Secure Access Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side – Login Form */}
        <div className="flex items-center justify-center w-full p-6 overflow-y-auto bg-white md:w-1/2">
          <div className="w-full max-w-md my-auto space-y-5">
            {/* Header with TRSL Logo */}
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r rounded-xl opacity-70 blur-md"></div>
                  <div className="relative border border-gray-200 shadow-sm bg-gradient-to-br from-white to-gray-50 rounded-xl">
                    <img src={logo2} alt="Company Logo" className="w-40 h-auto opacity-90 drop-shadow-lg" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-1">
              <h1 className="text-4xl text-gray-900">Internal Audits</h1>
              <p className="text-gray-500 text-sm leading-relaxed"></p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg shadow-sm animate-pulse">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Role Selection */}
              <div className="relative">
                <label htmlFor="selectedField" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="relative">
                  <select
                    id="selectedField"
                    className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      errors.selectedField ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    disabled={isSubmitting}
                    {...register("selectedField", { required: "Role selection is required" })}
                  >
                    <option value="">Select</option>
                    {LOGIN_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User className="h-5 w-5 text-pink-400" />
                  </div>
                </div>
                {errors.selectedField && <p className="text-red-500 text-xs mt-1">{errors.selectedField.message}</p>}
              </div>

              {/* Username */}
              <div className="relative">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.username ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    {...register("username", { required: "Username is required", minLength: { value: 2, message: "Username must be at least 2 characters" } })}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User className="h-5 w-5 text-pink-400" />
                  </div>
                </div>
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.password ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    {...register("password", { required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } })}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-5 w-5 text-pink-400" />
                  </div>
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-pink-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-600 cursor-pointer">Remember me</label>
                </div>
                <button type="button" className="text-pink-600 hover:text-pink-500 text-sm font-medium" disabled={isSubmitting}>
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-600 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-pink-700 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </div>
                ) : (
                  'LOGIN'
                )}
              </button>
            </form>

            {/* Quick Autofill Buttons */}
            <div className="mt-6">
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-600">Quick Login</p>
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {demoCredentials.slice(0, 6).map((cred) => (
                    <button
                      key={cred.username}
                      type="button"
                      onClick={() => autofillCredentials(cred)}
                      disabled={isSubmitting}
                      className="px-2 py-1.5 text-xs font-medium text-gray-700 transition-all duration-200 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
                    >
                      {cred.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {demoCredentials.slice(6).map((cred) => (
                    <button
                      key={cred.username}
                      type="button"
                      onClick={() => autofillCredentials(cred)}
                      disabled={isSubmitting}
                      className="px-2 py-1.5 text-xs font-medium text-gray-700 transition-all duration-200 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
                    >
                      {cred.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Demo Credentials Section */}
            <div className="mt-4">
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials</p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
                  <div className="space-y-1">
                    <div><span className="font-semibold">Master:</span> master / 1234567</div>
                    <div><span className="font-semibold">Audit Manager:</span> audit.manager / 1234567</div>
                    <div><span className="font-semibold">Lead Auditor:</span> lead.auditor / user123</div>
                    <div><span className="font-semibold">Auditor:</span> abhishek.k / user123</div>
                    <div><span className="font-semibold">HOD (MR):</span> hod.mr / user123</div>
                    <div><span className="font-semibold">Auditee:</span> auditee.mr1 / user123</div>
                    <div><span className="font-semibold">HR Admin:</span> hr.admin / user123</div>
                    <div><span className="font-semibold">Top Management:</span> top.mgmt / user123</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center pt-4">
              <p className="text-xs text-gray-400">© 2025 Swajyot Technologies | All rights reserved</p>
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