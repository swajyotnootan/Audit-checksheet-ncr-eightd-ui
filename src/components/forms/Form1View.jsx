// src/components/forms/Form1View.jsx
import React, { useState, useEffect } from 'react';
import { userAPI } from '../../components/services/api';

const Form1View = () => {
  const [auditors, setAuditors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditors();
  }, []);

  const fetchAuditors = async () => {
    try {
      const allUsers = await userAPI.getAll();
      const auditorList = allUsers.filter(u => u.role === 'AUDITOR' || u.role === 'LEAD_AUDITOR');
      setAuditors(auditorList);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-blue-50 ">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">List of Internal Auditors</h1>
        <p className="mt-1 text-sm text-gray-500">Form 1 - Internal Auditor List</p>
      </div>

      <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-left text-gray-600">Sr NO.</th>
                <th className="px-4 py-3 font-medium text-left text-gray-600">Name of the Individuals</th>
                <th className="px-4 py-3 font-medium text-left text-gray-600">System</th>
                <th className="px-4 py-3 font-medium text-left text-gray-600">Process</th>
                <th className="px-4 py-3 font-medium text-left text-gray-600">Product</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">No auditors found</td>
                </tr>
              ) : (
                auditors.map((auditor, index) => (
                  <tr key={auditor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-black ">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-black">
                      {auditor.namePrefix || ''} {auditor.firstName} {auditor.lastName}
                    </td>
                    <td className="px-4 py-3 text-black">{auditor.internalAuditorTraining || '-'}</td>
                    <td className="px-4 py-3 text-black">
                      {auditor.certifiedForProcess ? (
                        <div className="flex flex-wrap gap-1">
                          {auditor.certifiedForProcess.split(',').map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-black rounded text-s">{p.trim()}</span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {auditor.certifiedForProduct ? (
                        <div className="flex flex-wrap gap-1">
                          {auditor.certifiedForProduct.split(',').map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-black rounded text-xs">{p.trim()}</span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Form1View;