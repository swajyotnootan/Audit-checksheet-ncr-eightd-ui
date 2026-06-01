import React, { useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const RoleManagement = () => {
  // Mock data for roles - would be replaced with API data in a real app
  const [roles] = useState([
    {
      id: 1,
      name: 'Master Admin',
      description: 'Complete system access',
      permissions: 'All permissions',
      userCount: 1
    },
    {
      id: 2,
      name: 'Manager',
      description: 'Department management',
      permissions: 'View, Approve, Report',
      userCount: 5
    },
    {
      id: 3,
      name: 'Operator',
      description: 'Form data entry',
      permissions: 'Create, View',
      userCount: 12
    }
  ]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Role Management</h2>
      
      <div className="flex justify-end mb-6">
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-200">
          <FaPlus className="mr-2" />
          Add New Role
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Role Name</th>
              <th className="border p-3 text-left">Description</th>
              <th className="border p-3 text-left">Permissions</th>
              <th className="border p-3 text-left">Users</th>
              <th className="border p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t hover:bg-gray-50">
                <td className="border p-3 font-medium">{role.name}</td>
                <td className="border p-3">{role.description}</td>
                <td className="border p-3">{role.permissions}</td>
                <td className="border p-3">{role.userCount}</td>
                <td className="border p-3">
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit Role"
                    >
                      <FaEdit />
                    </button>
                    {role.name !== 'Master Admin' && (
                      <button 
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Role"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Role Information</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>Master Admin:</strong> Has complete control over the system including user management, role configuration, and all form operations.
          </li>
          <li>
            <strong>Manager:</strong> Can view all forms, approve or reject submitted forms, and generate reports.
          </li>
          <li>
            <strong>Operator:</strong> Can create new forms and view their own submissions.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RoleManagement;