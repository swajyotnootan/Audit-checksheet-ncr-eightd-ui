// src/Components/forum/GroupManagementModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { X, Trash2, Edit3, Users, Plus } from "lucide-react";

// ====== User Initials + Fallback Photo ======
const UserInitials = ({ user, size = "w-8 h-8" }) => {
  const identifier = user?.username || user?.email || "unknown";
  const name = user?.name || identifier;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", 
    "bg-red-500", "bg-yellow-500", "bg-indigo-500", 
    "bg-pink-500", "bg-teal-500"
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const [imgSrc, setImgSrc] = useState(user?.profileImage || user?.profileIcon || null);

  useEffect(() => {
    setImgSrc(user?.profileImage || user?.profileIcon || null);
  }, [user?.profileImage, user?.profileIcon]);

  return (
    <div className={`${size} rounded-full flex items-center justify-center text-white font-medium ${bgColor} relative overflow-hidden border border-gray-200`}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div className={`w-full h-full flex items-center justify-center ${imgSrc ? 'hidden' : 'flex'}`}>
        {initials}
      </div>
    </div>
  );
};

// ====== Editable Member Manager (for edit mode) ======
const EditableMemberManager = ({ group, selectedUsernames, onSelectionChange, users = [] }) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    department: "",
    role: "",
    function: "",
    operation: "",
  });
  const [selectAll, setSelectAll] = useState(false);

  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (!user.username) return false; // Skip users without username
      const matchesSearch =
        (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(search.toLowerCase());

      const matchesDept = !filters.department || (user.department || "").toLowerCase().includes(filters.department.toLowerCase());
      const matchesRole = !filters.role || (user.role || "").toLowerCase().includes(filters.role.toLowerCase());
      const matchesFunc = !filters.function || (user.function || "").toLowerCase().includes(filters.function.toLowerCase());
      const matchesOp = !filters.operation || (user.operation || "").toLowerCase().includes(filters.operation.toLowerCase());

      return matchesSearch && matchesDept && matchesRole && matchesFunc && matchesOp;
    });
  }, [users, search, filters]);

  // Handle "Select All" - use email instead of username
  useEffect(() => {
    if (selectAll) {
      const allEmails = filteredUsers.map(u => u.email || u.username).filter(Boolean);
      const union = [...new Set([...selectedUsernames, ...allEmails])];
      onSelectionChange(union);
    }
  }, [selectAll, filteredUsers, selectedUsernames, onSelectionChange]);

  const toggleUser = (userEmail) => {
    const newSelection = selectedUsernames.includes(userEmail)
      ? selectedUsernames.filter(u => u !== userEmail)
      : [...selectedUsernames, userEmail];
    onSelectionChange(newSelection);
    if (selectedUsernames.includes(userEmail)) {
      setSelectAll(false);
    }
  };

  // Get unique filter options
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const roles = [...new Set(users.map(u => u.role).filter(Boolean))];
  const functions = [...new Set(users.map(u => u.function).filter(Boolean))];
  const operations = [...new Set(users.map(u => u.operation).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filters.department}
            onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filters.role}
            onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={filters.function}
            onChange={(e) => setFilters(f => ({ ...f, function: e.target.value }))}
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Functions</option>
            {functions.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={filters.operation}
            onChange={(e) => setFilters(f => ({ ...f, operation: e.target.value }))}
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Operations</option>
            {operations.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Select All */}
        <div className="mt-3 flex items-center">
          <input
            type="checkbox"
            id="select-all"
            checked={selectAll}
            onChange={(e) => setSelectAll(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="select-all" className="text-sm text-gray-700 font-medium">
            Select all {filteredUsers.length} filtered users
          </label>
        </div>
      </div>

      {/* User List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="max-h-80 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No users match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                // Use email for selection, fallback to username for backward compatibility
                const userEmail = user.email || user.username;
                const isChecked = selectedUsernames.includes(userEmail);
                return (
                  <div
                    key={user.userId || userEmail}
                    className={`flex items-center p-3 cursor-pointer transition-colors duration-150 ${
                      isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleUser(userEmail)}
                  >
                    <UserInitials user={user} size="w-10 h-10" />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {user.name || user.username}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.department && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {user.department}
                          </span>
                        )}
                        {user.role && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {user.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">{user.email || user.username}</p>
                    </div>
                    {/* Custom Blue Circle Checkbox */}
                    <div className="ml-4 w-5 h-5 flex items-center justify-center">
  <div
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
      isChecked
        ? 'bg-blue-600 border-blue-600'
        : 'border-gray-300 bg-white'
    }`}
  >
    {isChecked && (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M5 13l4 4L19 7"
        />
      </svg>
    )}
  </div>
</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ====== Group Form (for creating/editing group metadata) ======
const GroupForm = ({ onSubmit, onCancel, users = [], initialData = null }) => {
  const [formData, setFormData] = useState({
    groupName: initialData?.groupName || "",
    description: initialData?.description || "",
  });

  // Use email instead of username for members
  const [selectedUsernames, setSelectedUsernames] = useState(
    initialData?.members?.map(m => m.email || m.memberEmail || m.username || m).filter(Boolean) || []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.groupName.trim()) {
      alert("Group name is required");
      return;
    }

    const payload = {
      groupName: formData.groupName,
      description: formData.description,
      members: selectedUsernames,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Group Name */}
        <label className="block text-sm font-medium text-gray-700">
          Group Name *
        </label>
        <input
          type="text"
          value={formData.groupName}
          onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter group name..."
          required
        />
      

      {/* Description */}
      
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="Enter group description..."
        />
      

      {/* Members Section */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Group Members
          </label>
          <span className="text-sm text-gray-500">
            {selectedUsernames.length} members selected
          </span>
        </div>
        <EditableMemberManager
          group={{ members: selectedUsernames }}
          selectedUsernames={selectedUsernames}
          onSelectionChange={setSelectedUsernames}
          users={users}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          {initialData ? "Update Group" : "Create Group"}
        </button>
      </div>
    </form>
  );
};

// ====== Main Modal ======
export default function GroupManagementModal({
  isOpen,
  onClose,
  groups = [],
  users = [],
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedGroup(null);
      setEditingGroup(null);
    }
  }, [isOpen]);

  const handleCreateGroup = async (groupData) => {
    try {
      await onCreateGroup(groupData);
      setShowForm(false);
    } catch (err) {
      console.error("Create group error:", err);
      alert(`Failed to create group: ${err.message}`);
    }
  };

  const handleUpdateGroup = async (updates) => {
    if (!editingGroup) return;
    try {
      await onUpdateGroup(editingGroup.groupId, updates);
      setEditingGroup(null);
      setShowForm(false);
      if (selectedGroup?.groupId === editingGroup.groupId) {
        setSelectedGroup(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error("Update group error:", err);
      alert("Failed to update group");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      await onDeleteGroup(groupId);
      if (selectedGroup?.groupId === groupId) setSelectedGroup(null);
    } catch (err) {
      console.error("Delete group error:", err);
      alert("Failed to delete group");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {showForm
                ? editingGroup
                  ? "Edit Group"
                  : "Create New Group"
                : "Manage Chat Groups"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {showForm
                ? editingGroup
                  ? "Update group details and members"
                  : "Create a new group chat"
                : "View and manage all chat groups"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Group List Sidebar */}
          <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">All Groups</h3>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingGroup(null);
                    setSelectedGroup(null);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus size={16} />
                  <span>Create new Group</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-medium">No groups found</p>
                  <p className="text-xs mt-1">Create your first group to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => (
                    <div
                      key={group.groupId}
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowForm(false);
                        setEditingGroup(null);
                      }}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedGroup?.groupId === group.groupId
                          ? "bg-blue-50 border-blue-200 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {group.groupName}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {group.description || "No description"}
                          </p>
                          <div className="flex items-center mt-2">
                            <Users size={14} className="text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">
                              {group.members?.length || 0} members
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="w-2/3 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {showForm ? (
                <GroupForm
                  users={users}
                  initialData={editingGroup}
                  onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingGroup(null);
                    if (!editingGroup) {
                      setSelectedGroup(null);
                    }
                  }}
                />
              ) : selectedGroup ? (
                <div className="h-full flex flex-col">
                  {/* Group Header */}
                  <div className="pb-6 mb-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedGroup.groupName}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {selectedGroup.description || (
                            <span className="text-gray-400 italic">No description provided</span>
                          )}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingGroup(selectedGroup);
                            setShowForm(true);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                        >
                          <Edit3 size={16} />
                          <span>Edit Group</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Members Section */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Group Members ({selectedGroup.members?.length || 0})
                      </h4>
                    </div>
                    
                    {selectedGroup.members && selectedGroup.members.length > 0 ? (
                      <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
                        {selectedGroup.members.map((member, idx) => {
                          const identifier = typeof member === 'string' 
                            ? member 
                            : member.username || member.memberEmail || member.email;
                          const user = users.find(u => 
                            u.username === identifier || u.email === identifier
                          );
                          return (
                            <div 
                              key={identifier || idx}
                              className="flex items-center p-4 bg-white rounded-lg border border-gray-200"
                            >
                              <UserInitials user={user || { username: identifier }} size="w-12 h-12" />
                              <div className="ml-4 flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">
                                  {user ? user.name || user.username : identifier}
                                </p>
                                {user && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.department && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {user.department}
                                      </span>
                                    )}
                                    {user.role && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {user.role}
                                      </span>
                                    )}
                                    {user.function && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        {user.function}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1 truncate">{identifier}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm font-medium">No members in this group</p>
                        <p className="text-xs mt-1">Edit the group to add members</p>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <div className="mt-8 pt-6 pb-6 border-t border-gray-200">
                    <button
                      onClick={() => handleDeleteGroup(selectedGroup.groupId)}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-800 font-medium text-sm transition-colors duration-200"
                    >
                      <Trash2 size={16} />
                      <span>Delete Group</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Users className="w-24 h-24 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">
                    {groups.length > 0 
                      ? "Select a group to view details" 
                      : "Create your first group to get started"}
                  </p>
                  <p className="text-sm">
                    {groups.length > 0 
                      ? "Choose a group from the sidebar to see members and manage settings"
                      : "Click 'New Group' to create a chat group"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}