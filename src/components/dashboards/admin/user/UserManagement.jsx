// src/components/admin/user/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaCheck, FaTimes, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';
import UserFormModal from './UserFormModal';
import ConfirmModal from './ConfirmModal';
import { userAPI } from '../../../../components/services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await userAPI.getAll();
      // Handle both array and object responses
      const userList = Array.isArray(res) ? res : (res.data || []);
      setUsers(userList);
      console.log('📋 Users fetched:', userList.length);
    } catch (err) {
      setError('Failed to fetch users. Please try again.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    console.log('🟢 UserManagement - Create received:', {
      qualification: data.qualification,
      totalExperience: data.totalExperience,
      coreToolsTraining: data.coreToolsTraining,
    });
    try {
      setError('');
      console.log('Creating user with data:', data);
      const response = await userAPI.create(data);
      console.log('User created successfully:', response);
      setShowForm(false);
      await fetchUsers();
    } catch (err) {
      setError('Failed to create user. Please check all required fields and try again.');
      console.error('Error creating user:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(`Failed to create user: ${err.response.data.message || err.response.data}`);
      }
    }
  };

  const handleEdit = async (data) => {
    console.log('🟡 UserManagement - Edit received:', {
      qualification: data.qualification,
      totalExperience: data.totalExperience,
      coreToolsTraining: data.coreToolsTraining,
    });
    try {
      setError('');
      // Only strip the prefix if it exists
      if (data.signature && data.signature.startsWith("data:image")) {
        data.signature = data.signature.split(',')[1];
      }
      if (data.profilePhoto && data.profilePhoto.startsWith("data:image")) {
        data.profilePhoto = data.profilePhoto.split(',')[1];
      }

      console.log('Updating user with data:', data);
      const response = await userAPI.update(editUser.id, data);
      console.log('User updated successfully:', response);
      setShowForm(false);
      setEditUser(null);
      await fetchUsers();
    } catch (err) {
      setError('Failed to update user. Please check all required fields and try again.');
      console.error('Error updating user:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(`Failed to update user: ${err.response.data.message || err.response.data}`);
      }
    }
  };

  const handleDelete = (user) => {
    setConfirmData({
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.namePrefix || ''} ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setError('');
          await userAPI.deleteUser(user.id);
          setConfirmData(null);
          await fetchUsers();
        } catch (err) {
          setError('Failed to delete user. Please try again.');
          console.error('Error deleting user:', err);
          setConfirmData(null);
        }
      },
      onCancel: () => setConfirmData(null),
    });
  };

  const handleToggle = (user) => {
    const isActive = user.active === true || user.active === 'true';
    setConfirmData({
      title: isActive ? 'Deactivate User' : 'Activate User',
      message: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} ${user.namePrefix || ''} ${user.firstName} ${user.lastName}?`,
      confirmText: isActive ? 'Deactivate' : 'Activate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setError('');
          await userAPI.toggleActive(user.id);
          setConfirmData(null);
          await fetchUsers();
        } catch (err) {
          setError('Failed to update user status. Please try again.');
          console.error('Error toggling user status:', err);
          setConfirmData(null);
        }
      },
      onCancel: () => setConfirmData(null),
    });
  };

  // ✅ FIXED: Safe filtering with Array.isArray check
  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.namePrefix || ''} ${user.firstName || ''} ${user.lastName || ''}`.trim();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.userName?.toLowerCase().includes(searchLower) ||
      fullName.toLowerCase().includes(searchLower)
    );
  }) : [];

  const getUserStatus = (user) => {
    return user.active === true || user.active === 'true';
  };

  const formatUserName = (user) => {
    const parts = [];
    if (user.firstName) parts.push(user.firstName);
    if (user.lastName) parts.push(user.lastName);
    return parts.join(' ') || 'N/A';
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaUser className="mr-3 text-blue-900" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center transition-colors font-medium"
          disabled={loading}
        >
          <FaPlus className="mr-2" /> Add User
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full sm:w-64 mb-4">
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <FaSearch className="absolute top-2.5 left-3 text-gray-400" />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Username</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Mobile</th>
                 </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getUserStatus(user) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {getUserStatus(user) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              console.log('📝 Editing user:', user);
                              setEditUser(user);
                              setShowForm(true);
                            }}
                            className="text-blue-800 hover:text-blue-800 p-1 rounded transition-colors"
                            title="Edit User"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleToggle(user)}
                            className={`p-1 rounded transition-colors ${
                              getUserStatus(user) ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'
                            }`}
                            title={getUserStatus(user) ? 'Deactivate User' : 'Activate User'}
                          >
                            {getUserStatus(user) ? <FaTimes /> : <FaCheck />}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            title="Delete User"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-left">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            {user.profilePhotoPath ? (
                              <img
                                src={`https://internalaudit.hub.swajyot.co.in:8090/api/users/${user.id}/profile-photo`}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <FaUser className="text-blue-900 text-sm" />
                          </div>
                          <span className="font-medium text-gray-900 max-w-[150px] truncate" title={formatUserName(user)}>
                            {formatUserName(user)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 text-gray-700 text-left">
                        {user.userName || user.username || 'N/A'}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900">
                          {user.role}
                        </span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-left">
                        <div className="flex items-center text-gray-700 max-w-[200px] truncate" title={user.email}>
                          <FaEnvelope className="text-gray-400 mr-2 text-sm shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-left">
                        <div className="flex items-center text-gray-700 max-w-[120px] truncate">
                          <FaPhone className="text-gray-400 mr-2 text-sm" />
                          <span className="truncate" title={user.phone || 'N/A'}>
                            {user.phone || 'N/A'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Results Summary */}
          {filteredUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          )}
        </>
      )}

      {/* User Form Modal */}
      {showForm && (
        <UserFormModal
          key={editUser?.id || 'new'}
          isEdit={!!editUser}
          defaultValues={editUser}
          onClose={() => {
            setShowForm(false);
            setEditUser(null);
            setError('');
          }}
          onSubmit={editUser ? handleEdit : handleCreate}
        />
      )}

      {/* Confirm Modal */}
      {confirmData && <ConfirmModal {...confirmData} />}
    </div>
  );
};

export default UserManagement;