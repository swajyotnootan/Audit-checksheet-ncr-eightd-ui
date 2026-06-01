// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { normalizeRole, getRoleDisplayName, isMaster, isAuditManager, isLeadAuditor, isAuditor, isHOD, isAuditee, isHRAdmin, isQMSAdmin, isTopManagement } from '../../components/utils/roleUtils';
import { isInitiator } from '../../components/utils/roleUtils';

// Create the authentication context
const AuthContext = createContext(null);

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.role) {
          userData.role = normalizeRole(userData.role);
        }
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    const cleanedUserData = {
      ...userData,
      name: userData.name ? userData.name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, '') : '',
      role: normalizeRole(userData.role),
      email: userData.email
    };
    setUser(cleanedUserData);
    localStorage.setItem('user', JSON.stringify(cleanedUserData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Role checkers using utility functions
  const isAuthenticated = !!user;
  
  const userIsMaster = user && isMaster(user.role);
  const userIsAuditManager = user && isAuditManager(user.role);
  const userIsLeadAuditor = user && isLeadAuditor(user.role);
  const userIsAuditor = user && isAuditor(user.role);
  const userIsInitiator = user && isInitiator(user.role);
  const userIsHOD = user && isHOD(user.role);
  const userIsAuditee = user && isAuditee(user.role);
  const userIsHRAdmin = user && isHRAdmin(user.role);
  const userIsQMSAdmin = user && isQMSAdmin(user.role);
  const userIsTopManagement = user && isTopManagement(user.role);

  // Combined checkers
  const userIsAuditTeam = user && (userIsAuditManager || userIsLeadAuditor || userIsAuditor);
  const userIsAuditeeRole = user && (userIsHOD || userIsAuditee);
  const userCanRaiseNCR = user && (userIsAuditor || userIsLeadAuditor);
  const userCanCloseNCR = user && (userIsLeadAuditor || userIsAuditManager);
  const userCanApprovePlan = user && (userIsAuditManager || userIsTopManagement || userIsMaster);

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading,
    // Role checkers
    isMaster: userIsMaster,
    isAuditManager: userIsAuditManager,
    isLeadAuditor: userIsLeadAuditor,
    isAuditor: userIsAuditor,
    isHOD: userIsHOD,
    isInitiator: userIsInitiator,
    isAuditee: userIsAuditee,
    isHRAdmin: userIsHRAdmin,
    isQMSAdmin: userIsQMSAdmin,
    isTopManagement: userIsTopManagement,
    // Combined checkers
    isAuditTeam: userIsAuditTeam,
    isAuditeeRole: userIsAuditeeRole,
    canRaiseNCR: userCanRaiseNCR,
    canCloseNCR: userCanCloseNCR,
    canApprovePlan: userCanApprovePlan,
    // Legacy (for backward compatibility)
    isOperator: false,
    isQA: false,
    isAVP: false,
    isManager: userIsMaster,
    isAdmin: userIsMaster,
    isUser: false,
    isPlantHOD: userIsHOD,
    isHeadOperations: false,
    isHeadMechMaintenance: false,
    isDGM: userIsTopManagement,
    isDeputy: userIsLeadAuditor
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;