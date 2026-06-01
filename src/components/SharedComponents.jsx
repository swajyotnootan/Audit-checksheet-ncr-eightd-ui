import React, { useState } from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import { Avatar, Typography, Button } from '@mui/material';
import qlogo from '../assets/Qsutra_RMS_White_Logo_Small.png';
import { useNavigate } from 'react-router-dom';

import logoUrl from  '../assets/RenewsysLogo.png';


// Navigation header component shared across all dashboards
export const TopNavBar = ({ user, onLogout }) => {
    const [profilePhotoError, setProfilePhotoError] = useState(false);
    const navigate = useNavigate();
    const getBgColorByRole = (role) => {
        const upperRole = role?.toUpperCase();
        switch (upperRole) {
            case 'SHIFT_INCHARGE':
            case 'QUALITY_ENGINEER':
            case 'QUALITY_HOD':
            case 'MASTER':
            default:
                return 'bg-background';
        }
    };

    const getRoleDisplayName = (role) => {
        const upperRole = role?.toUpperCase();
        switch (upperRole) {
            case 'SHIFT_INCHARGE':
                return 'Shift Incharge';
            case 'QUALITY_ENGINEER':
                return 'Quality Engineer';
            case 'QUALITY_HOD':
                return 'Quality HOD';
            case 'MASTER':
                return 'Administrator';
            default:
                return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';
        }
    };

    // Get user's display name
    const getUserDisplayName = (user) => {
        let name = '';
        if (user?.firstName || user?.lastName) {
            name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        } else {
            name = user?.username || user?.userName || user?.name || 'User';
        }
        // Remove prefix before displaying (e.g., "Mr. John Doe" -> "John Doe")
        return name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '');
    };

    // Get profile photo URL
    const getProfilePhotoUrl = (user) => {
        if (user?.id && user.profilePhotoPath && !profilePhotoError) {
            return `http://localhost:8080/api/users/${user.id}/profile-photo`;
        }
        return null;
    };

    const handleProfilePhotoError = () => {
        setProfilePhotoError(true);
    };

    // Generate initials
    const getInitials = (user) => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        const fallback = user?.username || user?.userName || user?.name || 'User';
        return fallback.slice(0, 2).toUpperCase();
    };

    // Helper to get user ID from localStorage if not in context
    const getUserId = (user) => {
        if (user?.id) return user.id;
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.id;
            }
        } catch (e) {
            // ignore
        }
        return null;
    };

    const userId = getUserId(user);
    const profilePhotoUrl = userId ? `http://localhost:8080/api/users/${userId}/profile-photo` : null;

    const userDisplayName = getUserDisplayName(user);
    const userInitials = getInitials(user);

    return (
        <header className={`shadow fixed top-0 w-full z-50 ${getBgColorByRole(user?.role)}`}>
            <div className="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center bg-background">
                <div className="flex items-center">
                    <img
                        src={qlogo}
                        alt="Qsutra logo"
                        className="w-23 h-8 mr-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white justify-center pt-1 pb-1 px-4 rounded">
                        <img
                            src={logoUrl}
                            alt="API Greenpac Logo"
                            className="h-12 max-w-[160px] object-contain"
                        />
                    </div>

                    {/* User Avatar */}
                    {userId ? (
                        <Avatar
                            alt={userDisplayName}
                            src={profilePhotoUrl}
                            onError={handleProfilePhotoError}
                            sx={{
                                width: 40,
                                height: 40,
                                border: '2px solid white'
                            }}
                        />
                    ) : (
                        <Avatar
                            alt={userDisplayName}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: 'primary.main',
                                color: 'white',
                                border: '2px solid white',
                                fontWeight: 'bold'
                            }}
                        >
                            {userInitials}
                        </Avatar>
                    )}

                    <div className="flex flex-col mr-4 text-white">
                        <Typography variant="body2" className="font-medium text-white">
                            {userDisplayName}
                        </Typography>
                        <Typography variant="caption" className="text-white opacity-90">
                            {getRoleDisplayName(user?.role)}
                        </Typography>
                    </div>

                    {/* Calendar Button */}
                    <button
                        onClick={() => navigate('/calendar')}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-3 rounded mr-2"
                    >
                        <span className="flex items-center gap-1">
                            <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                            </svg>
                            Calendar
                        </span>
                    </button>
                    <Button
                        onClick={onLogout}
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<LogoutIcon />}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
};

// Dashboard Layout wrapper
export const DashboardLayout = ({ user, onLogout, title, subtitle, children }) => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col pt-16 mb-8">
            <TopNavBar user={user} onLogout={onLogout} />
            <main className="flex-grow flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-4xl font-semibold text-gray-900">{title}</h1>
                    <p className="mt-2 text-gray-600">{subtitle}</p>
                    <div className="mt-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

// Reusable status badge component
export const StatusBadge = ({ status }) => {
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'DRAFT':
                return 'bg-gray-100 text-gray-800';
            case 'SUBMITTED':
                return 'bg-blue-100 text-blue-800';
            case 'APPROVED':
                return 'bg-green-100 text-green-800';
            case 'REJECTED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(status)}`}>
            {status}
        </span>
    );
};

// Format date helper
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

// Format timestamp helper for activity feed
export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffHrs < 24) {
        const hours = Math.floor(diffHrs);
        return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else {
        return date.toLocaleDateString();
    }
};