import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchLineGroups, createForumGroup, updateForumGroup, deleteForumGroup } from "./Api/forumapi";
import { userAPI } from "../dashboards/admin/userAPI";
import { Users, PlusCircle, RefreshCw, Edit3, Trash2, Search, Filter, Download, Upload, AlertCircle } from "lucide-react";

const emptyForm = {
  groupName: "",
  lineCode: "",
  lineName: "",
  description: "",
  members: [],
};

const normalizeRole = (value = "") => value.trim().toUpperCase();
const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((item, idx) => item === b[idx]);

const LineManagement = ({ currentUser }) => {
  const [lineGroups, setLineGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [backendRoles, setBackendRoles] = useState([]);
  const [formState, setFormState] = useState(emptyForm);
  const [editingGroup, setEditingGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const previousAutoMembersRef = useRef([]);

  const masterEmail = currentUser?.email || currentUser?.username || "";

  const loadLineGroups = async () => {
    try {
      setLoading(true);
      const data = await fetchLineGroups();
      setLineGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load line groups", err);
      setError("Failed to load line groups");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userAPI.getAll();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      setRolesError(null);
      const res = await userAPI.getRoles({ lineOnly: true });
      setBackendRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load roles", err);
      setRolesError("Unable to load roles from server");
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    loadLineGroups();
    loadUsers();
    loadRoles();
  }, []);

  const filteredLineGroups = useMemo(() => {
    return lineGroups.filter(group => {
      const matchesSearch = 
        group.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.lineCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.lineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && group.isActive !== false) ||
        (statusFilter === "inactive" && group.isActive === false);
      
      return matchesSearch && matchesStatus;
    });
  }, [lineGroups, searchTerm, statusFilter]);

  // Check if current role/group name already exists
  const isDuplicateGroup = useMemo(() => {
    if (!formState.groupName || editingGroup) return false;
    
    const normalizedGroupName = normalizeRole(formState.groupName);
    return lineGroups.some(group => 
      normalizeRole(group.groupName) === normalizedGroupName
    );
  }, [formState.groupName, lineGroups, editingGroup]);

  const handleChange = (field, value) => {
    if (field === "lineCode") {
      const normalized = normalizeRole(value || "");
      setFormState((prev) => ({
        ...prev,
        lineCode: normalized,
        groupName: normalized,
        lineName: prev.lineName?.trim() ? prev.lineName : normalized,
      }));
      return;
    }

    if (field === "groupName") {
      setFormState((prev) => ({
        ...prev,
        groupName: normalizeRole(value || ""),
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleSelect = (value) => {
    if (!value) {
      setFormState((prev) => ({
        ...prev,
        lineCode: "",
        groupName: "",
        members: [],
      }));
      previousAutoMembersRef.current = [];
      return;
    }
    handleChange("lineCode", value);
  };

  const handleMemberToggle = (email) => {
    if (autoAssignedSet.has(email) || siteSupervisorSet.has(email)) {
      return;
    }
    setFormState((prev) => {
      const exists = prev.members.includes(email);
      const members = exists
        ? prev.members.filter((m) => m !== email)
        : [...prev.members, email];
      return { ...prev, members };
    });
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormState({
      groupName: group.groupName || "",
      lineCode: group.lineCode || "",
      lineName: group.lineName || "",
      description: group.description || "",
      members: group.members || [],
    });
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormState(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!masterEmail) {
      alert("Missing master user email. Please re-login.");
      return;
    }
    
    if (!formState.groupName.trim() || !formState.lineCode.trim()) {
      alert("Group name and line code are required");
      return;
    }

    // Check for duplicate group name when creating new group
    if (!editingGroup && isDuplicateGroup) {
      alert(`A group with name "${formState.groupName}" already exists. Please choose a different name.`);
      return;
    }

    const payload = {
      groupName: formState.groupName.trim(),
      description: formState.description?.trim() || "",
      members: formState.members,
      groupType: "LINE",
      lineCode: formState.lineCode.trim().toUpperCase(),
      lineName: formState.lineName?.trim() || formState.lineCode.trim().toUpperCase(),
    };

    try {
      setSubmitting(true);
      if (editingGroup) {
        await updateForumGroup(editingGroup.groupId, {
          ...payload,
          updatedBy: masterEmail,
        });
      } else {
        await createForumGroup({
          ...payload,
          createdBy: masterEmail,
        });
      }
      await loadLineGroups();
      resetForm();
    } catch (err) {
      console.error("Failed to save line group", err);
      const message = err.response?.data?.error || "Unable to save line group";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group) => {
    if (!masterEmail) return;
    if (!window.confirm(`Delete group ${group.groupName}?`)) return;
    try {
      await deleteForumGroup(group.groupId, masterEmail);
      if (editingGroup?.groupId === group.groupId) {
        resetForm();
      }
      await loadLineGroups();
    } catch (err) {
      console.error("Failed to delete group", err);
      const message = err.response?.data?.error || "Unable to delete group";
      alert(message);
    }
  };

  const roleMetadata = useMemo(() => {
    const map = new Map();
    backendRoles.forEach((role) => {
      const code = normalizeRole(role?.code || role?.label || role?.lineCode || "");
      if (!code) return;
      map.set(code, {
        code,
        label: role?.label || role?.code || role?.lineCode || code,
        lineCode: role?.lineCode ? normalizeRole(role.lineCode) : null,
        display: role?.lineCode || role?.label || role?.code || code,
      });
    });
    return map;
  }, [backendRoles]);

  // Find all Site-Supervisor users
  const siteSupervisorUsers = useMemo(() => {
    return users
      .filter(user => {
        const userRole = normalizeRole(user.role || user.roleName || "");
        return userRole === "SITE-SUPERVISOR" || 
               userRole.includes("SUPERVISOR") ||
               user.email?.toLowerCase().includes("supervisor");
      })
      .map(user => user.email)
      .filter(Boolean);
  }, [users]);

  const siteSupervisorSet = useMemo(() => 
    new Set(siteSupervisorUsers),
    [siteSupervisorUsers]
  );

  const memberOptions = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    return users
      .map((user) => {
        if (!user || !user.email) return null;
        
        const label = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
        const value = user.email;
        const roleCode = normalizeRole(user.role || user.roleName || "");
        const meta = roleMetadata.get(roleCode);
        const lineRoleCode = meta?.lineCode || (user.roleName ? normalizeRole(user.roleName) : null);
        const displayRole = meta?.display || user.roleName || user.role || "No Role";
        const isSiteSupervisor = siteSupervisorSet.has(user.email);
        
        return {
          label,
          value,
          role: displayRole,
          department: user.department || "No Department",
          roleCode,
          lineRoleCode,
          isSiteSupervisor,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort Site-Supervisors first, then by name
        if (a.isSiteSupervisor && !b.isSiteSupervisor) return -1;
        if (!a.isSiteSupervisor && b.isSiteSupervisor) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [users, roleMetadata, siteSupervisorSet]);

  const roleOptions = useMemo(() => {
    const map = new Map();
    const upsert = (value, label) => {
      const normalized = normalizeRole(value || "");
      if (!normalized || map.has(normalized)) return;
      
      // Check if this role already has a group created
      const hasExistingGroup = lineGroups.some(group => 
        normalizeRole(group.groupName) === normalized
      );
      
      map.set(normalized, {
        value: value?.trim() || normalized,
        label: hasExistingGroup ? `${label} (Already Created)` : label,
        disabled: hasExistingGroup,
        alreadyExists: hasExistingGroup,
      });
    };

    backendRoles.forEach((role) => {
      const optionValue = role?.lineCode || role?.label || role?.code;
      const optionLabel = role?.lineCode || role?.label || role?.code;
      upsert(optionValue, optionLabel);
    });

    lineGroups.forEach((group) => {
      const optionValue = group?.lineCode || group?.groupName || "";
      const optionLabel = group?.lineName || group?.groupName || optionValue;
      upsert(optionValue, optionLabel);
    });

    memberOptions.forEach((member) => {
      if (member.role && member.role !== "No Role") {
        upsert(member.role, member.role);
      }
    });

    return Array.from(map.values());
  }, [backendRoles, lineGroups, memberOptions]);

  const roleKey = useMemo(
    () => normalizeRole(formState.groupName || formState.lineCode || ""),
    [formState.groupName, formState.lineCode]
  );

  const roleSelectOptions = useMemo(() => {
    if (!roleKey) return roleOptions;
    
    const exists = roleOptions.some((option) => option.value === roleKey);
    if (exists) {
      return roleOptions;
    } else {
      // Check if the new role key would be a duplicate
      const isDuplicate = lineGroups.some(group => 
        normalizeRole(group.groupName) === roleKey
      );
      
      return [...roleOptions, { 
        value: roleKey, 
        label: isDuplicate ? `${roleKey} (Already Created)` : roleKey,
        disabled: isDuplicate,
        alreadyExists: isDuplicate,
      }];
    }
  }, [roleOptions, roleKey, lineGroups]);

  const autoAssignedMembers = useMemo(() => {
    if (!roleKey) return [];
    return memberOptions
      .filter((member) => member.lineRoleCode && member.lineRoleCode === roleKey)
      .map((member) => member.value);
  }, [roleKey, memberOptions]);

  const autoAssignedSet = useMemo(
    () => new Set(autoAssignedMembers),
    [autoAssignedMembers]
  );

  // Combine auto-assigned members and site supervisors
  const requiredMembers = useMemo(() => {
    return Array.from(new Set([...autoAssignedMembers, ...siteSupervisorUsers]));
  }, [autoAssignedMembers, siteSupervisorUsers]);

  const requiredMembersSet = useMemo(() => 
    new Set(requiredMembers),
    [requiredMembers]
  );

  useEffect(() => {
    setFormState((prev) => {
      const currentMembers = prev.members || [];
      const previousAutoSet = new Set(previousAutoMembersRef.current);
      const manualMembers = currentMembers.filter(
        (member) => !previousAutoSet.has(member) && !siteSupervisorSet.has(member)
      );
      const combined = Array.from(
        new Set([...requiredMembers, ...manualMembers])
      );
      if (arraysEqual(combined, currentMembers)) {
        return prev;
      }
      return { ...prev, members: combined };
    });
    previousAutoMembersRef.current = requiredMembers;
  }, [requiredMembers, siteSupervisorSet, setFormState]);

  return (
    <div className="min-h-screen bg-gray-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Line Management</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Create and maintain chat groups for every production line. Only Master users can manage these groups.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                <Upload size={16} />
                Import
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                <Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  resetForm();
                  loadLineGroups();
                  loadRoles();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Panel - Groups List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Line Groups</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredLineGroups.length} of {lineGroups.length} groups
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <RefreshCw className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                    <p className="text-sm text-gray-500">Loading groups...</p>
                  </div>
                </div>
              ) : filteredLineGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="text-gray-300 mx-auto mb-3" size={48} />
                  <h4 className="text-lg font-medium text-gray-900 mb-1">No line groups found</h4>
                  <p className="text-sm text-gray-500">
                    {searchTerm || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "Get started by creating your first line group"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-auto">
                  {filteredLineGroups.map((group) => (
                    <div
                      key={group.groupId}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">
                              {group.groupName}
                            </h4>
                            {group.isActive === false ? (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                Inactive
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Line Code:</span>
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {group.lineCode || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Display Name:</span>
                              <span>{group.lineName || "N/A"}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {group.description || "No description provided."}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(group.members || []).slice(0, 4).map((member) => {
                              const isSiteSupervisor = siteSupervisorSet.has(member);
                              return (
                                <span
                                  key={member}
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    isSiteSupervisor
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-blue-50 text-blue-700 border-blue-100"
                                  }`}
                                >
                                  {member}
                                  {isSiteSupervisor && (
                                    <span className="ml-1 text-[10px] uppercase font-bold">★</span>
                                  )}
                                </span>
                              );
                            })}
                            {(group.members || []).length > 4 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                +{(group.members || []).length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleEdit(group)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                            title="Edit group"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(group)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                            title="Delete group"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingGroup ? "Update Line Group" : "Create New Line Group"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Assign a forum group to a production line
                  </p>
                </div>
                {!editingGroup && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <PlusCircle className="text-blue-600" size={20} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role / Group *
                    </label>
                    <select
                      value={roleKey}
                      onChange={(e) => handleRoleSelect(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
                      disabled={rolesLoading && roleOptions.length === 0}
                    >
                      <option value="">Select a role</option>
                      {roleSelectOptions.map((option) => (
                        <option 
                          key={option.value} 
                          value={option.value}
                          disabled={option.disabled}
                          className={option.disabled ? "text-gray-400 bg-gray-100" : ""}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Group names must match an existing role. Selecting a role auto-adds every user with that role.
                      </p>
                      {isDuplicateGroup && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                          <AlertCircle size={12} />
                          <span>A group with this name already exists. Please choose a different role or edit the existing group.</span>
                        </div>
                      )}
                    </div>
                    {rolesError && (
                      <p className="text-xs text-red-600 mt-2">{rolesError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Code
                    </label>
                    <input
                      type="text"
                      value={formState.lineCode}
                      readOnly
                      placeholder="Auto-generated from role"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 cursor-not-allowed text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Display Name
                    </label>
                    <input
                      type="text"
                      value={formState.lineName}
                      onChange={(e) => handleChange("lineName", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                      placeholder="BE-1 | POE Encapsulant"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={formState.groupName}
                      readOnly
                      className={`w-full border rounded-lg px-4 py-3 text-sm cursor-not-allowed ${
                        isDuplicateGroup 
                          ? "border-red-300 bg-red-50 text-red-500" 
                          : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}
                      placeholder="Auto-generated from role"
                    />
                    {isDuplicateGroup && (
                      <p className="text-xs text-red-600 mt-1">
                        This group name already exists. Cannot create duplicate groups.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formState.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors resize-none"
                      placeholder="Who is part of this line? What is it used for?"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Group Members ({formState.members.length})
                    </label>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {autoAssignedMembers.length} auto-assigned
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {siteSupervisorUsers.length} site supervisors
                      </div>
                    </div>
                  </div>
                  
                  {roleKey && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        {autoAssignedMembers.length > 0
                          ? `Automatically selecting ${autoAssignedMembers.length} member${autoAssignedMembers.length === 1 ? "" : "s"} with role "${roleKey}".`
                          : `No users currently mapped to role "${roleKey}".`}
                        {" "}
                        <span className="font-medium">All Site-Supervisors are automatically included in every group and cannot be removed.</span>
                      </p>
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-auto">
                      {memberOptions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Users className="mx-auto mb-2 text-gray-300" size={32} />
                          <p className="text-sm">No users available</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Check if users are loaded properly
                          </p>
                        </div>
                      ) : (
                        memberOptions.map((member) => {
                          const selected = formState.members.includes(member.value);
                          const isAutoMember = autoAssignedSet.has(member.value);
                          const isSiteSupervisor = siteSupervisorSet.has(member.value);
                          const isRequired = isAutoMember || isSiteSupervisor;

                          return (
                            <button
                              type="button"
                              key={member.value}
                              onClick={() => handleMemberToggle(member.value)}
                              disabled={isRequired}
                              title={
                                isSiteSupervisor
                                  ? "Site Supervisor - Required in all groups"
                                  : isAutoMember
                                  ? "Auto-added from matching line role"
                                  : `Click to ${selected ? 'remove' : 'add'} member`
                              }
                              className={`w-full flex justify-between items-center px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                                selected 
                                  ? "bg-blue-50 text-blue-700 border-blue-100" 
                                  : "hover:bg-gray-50 text-gray-700"
                              } ${
                                isSiteSupervisor
                                  ? "bg-purple-50 text-purple-700 border-purple-100 cursor-not-allowed"
                                  : isAutoMember
                                  ? "bg-green-50 text-green-700 border-green-100 cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="text-left flex-1">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {member.label}
                                  {isSiteSupervisor && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] uppercase font-bold border border-purple-200">
                                      Supervisor
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{member.value}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {member.department} • {member.role}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-right">
                                {isSiteSupervisor ? (
                                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] uppercase font-semibold border border-purple-200">
                                    Required
                                  </span>
                                ) : isAutoMember ? (
                                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] uppercase font-semibold border border-green-200">
                                    Auto
                                  </span>
                                ) : selected ? (
                                  <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                                ) : (
                                  <div className="w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {memberOptions.length > 0 && (
                    <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-4">
                      <span>Showing {memberOptions.length} users</span>
                      <span>{autoAssignedMembers.length} auto-assigned to role "{roleKey || 'None'}"</span>
                      <span className="text-purple-600 font-medium">{siteSupervisorUsers.length} site supervisors (required)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  {editingGroup && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || (!editingGroup && isDuplicateGroup)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : editingGroup ? (
                      "Update Group"
                    ) : (
                      "Create Group"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineManagement;