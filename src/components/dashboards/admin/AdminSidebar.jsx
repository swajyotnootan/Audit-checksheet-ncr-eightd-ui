import React from 'react';
import { Users, List, Image, LayoutDashboard, BarChart3, ShieldCheck, Info } from 'lucide-react';
import { isMaster } from '../../utils/roleUtils';

const NAVBAR_COLORS = {
    primary: '#00529B',
    secondary: '#3b82f6',
    dark: '#1e3a8a',
    light: '#60a5fa',
    lighter: '#93c5fd',
    bg: '#eff6ff',
    white: '#ffffff',
};

const AdminSidebar = ({ user, activeSection, setActiveSection, isCollapsed = false }) => {
    let navItems = [];

    if (isMaster(user?.role)) {
        navItems = [
            { id: 'user-management', label: 'User Management', icon: <Users className="w-5 h-5" /> },
            { id: 'line-management', label: 'Line Management', icon: <List className="w-5 h-5" /> },
            { id: 'logo-mgmt', label: 'Logo Management', icon: <Image className="w-5 h-5" /> },
        ];
    } else {
        navItems = [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: 'forms-analytics', label: 'Forms Analytics', icon: <BarChart3 className="w-5 h-5" /> },
            { id: 'role-management', label: 'Role Management', icon: <ShieldCheck className="w-5 h-5" /> },
            { id: 'list-mgmt', label: 'List Management', icon: <List className="w-5 h-5" /> },
            { id: 'logo-mgmt', label: 'Logo Management', icon: <Image className="w-5 h-5" /> },
            { id: 'about-us', label: 'About Us', icon: <Info className="w-5 h-5" /> },
        ];
    }

    return (
        <aside className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 shadow-md transition-all duration-500 ease-out overflow-hidden flex flex-col ${isCollapsed ? 'w-0 border-r-0' : 'w-64'}`}>
            {/* Header Section */}
            <div className="flex-shrink-0 p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVBAR_COLORS.secondary} 0%, ${NAVBAR_COLORS.primary} 100%)` }}>
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className={`${!isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300`}>
                        <h2 className="text-base font-bold leading-tight text-slate-800">
                            {isMaster(user?.role) ? 'Administrator' : 'Admin'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Dashboard Console</p>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${activeSection === item.id ? 'text-white font-semibold shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                        style={{
                            ...(activeSection === item.id ? { background: `linear-gradient(135deg, ${NAVBAR_COLORS.primary} 0%, ${NAVBAR_COLORS.secondary} 100%)`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' } : {})
                        }}
                    >
                        <div className={`flex-shrink-0 ${activeSection === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>{item.icon}</div>
                        <span className={`whitespace-nowrap ${!isCollapsed ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 text-sm`}>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Footer Help Section */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100">
                <div className="p-4 border rounded-xl" style={{ background: NAVBAR_COLORS.bg, borderColor: NAVBAR_COLORS.lighter }}>
                    <p className="text-xs font-semibold" style={{ color: NAVBAR_COLORS.dark }}>Need Help?</p>
                    <p className="mt-1 text-xs" style={{ color: NAVBAR_COLORS.secondary }}>Contact support team</p>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;