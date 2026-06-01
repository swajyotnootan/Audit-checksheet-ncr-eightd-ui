import React from 'react';
import {
  FaHome,
  FaUsers,
  FaUserShield,
  FaInfoCircle,
  FaSignOutAlt,
  FaChartBar,
  FaImage,
  FaList
} from 'react-icons/fa';
// import logo from '../../../assets/Qsutra_RMS_White_Logo_Small.png';
import { isMaster } from '../../utils/roleUtils';

const AdminSidebar = ({ user, onLogout, activeSection, setActiveSection, isCollapsed = false }) => {
  // Determine sidebar items based on role
  let navItems = [];

  if (isMaster(user?.role)) {
    navItems = [
      {
        id: 'user-management',
        label: 'User Management',
        icon: <FaUsers size={18} />,
      },
      {
        id: 'line-management',
        label: 'Line Management',
        icon: <FaList size={18} />,
      },
      {
        id: 'logo-mgmt',
        label: 'Logo Management',
        icon: <FaImage size={18} />,
      },
    ];
  } else {
    navItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <FaHome size={18} />,
      },
      {
        id: 'forms-analytics',
        label: 'Forms Analytics',
        icon: <FaChartBar size={18} />,
      },
      {
        id: 'role-management',
        label: 'Role Management',
        icon: <FaUserShield size={18} />,
      },
      {
        id: 'list-mgmt',
        label: 'List Management',
        icon: <FaList size={18} />,
      },
      {
        id: 'logo-mgmt',
        label: 'Logo Management',
        icon: <FaImage size={18} />,
      },
      {
        id: 'about-us',
        label: 'About Us',
        icon: <FaInfoCircle size={18} />,
      },
    ];
  }

  // User display name fallback
  const userDisplayName = user?.name || user?.username || 'User';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col w-full min-h-full text-white transition-all duration-300 shadow-lg bg-gradient-to-b from-purple-800 via-purple-800 to-blue-400">
      <nav className={`flex-1 ${isCollapsed ? 'py-2' : 'p-4'}`}>
        <ul className={`space-y-1 ${isCollapsed ? 'items-center justify-center' : ''}`}>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full flex items-center ${
                  isCollapsed
                    ? 'justify-center p-2 rounded-md'
                    : 'p-3 rounded-md'
                } transition-colors duration-200 ${
                  activeSection === item.id
                    ? 'bg-pink-500 text-white font-medium'
                    : 'text-pink-100 hover:bg-purple-700 hover:text-white'
                }`}
                onClick={() => setActiveSection(item.id)}
                title={item.label} // 👈 Tooltip on hover
              >
                <span>{item.icon}</span>
                {/* ✅ Conditionally show label */}
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ✅ Hide user info section when collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-t border-pink-700/50">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 mr-3 font-bold text-purple-800 bg-white rounded-full">
              {userInitial}
            </div>
            <div>
              <p className="font-medium truncate">{userDisplayName}</p>
              <p className="text-xs text-purple-200">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-white transition-colors duration-200 bg-red-600 rounded-md hover:bg-red-700"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      )}

      {/* ✅ Show only logout button when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-t border-pink-700/50">
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-full p-2 text-white transition-colors duration-200 bg-red-600 rounded-md hover:bg-red-700"
          >
            <FaSignOutAlt size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;