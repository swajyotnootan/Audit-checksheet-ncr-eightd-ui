import React from 'react';
import logo1 from '../../assets/RenewsysLogo.png'

export const FormHeader = ({ 
  documentInfo,
  title = "JSW Limited",
  scope = "",
  unit = "",
  logo = logo1,
  onDocumentInfoChange,
  readOnly = false
}) => {
  const handleChange = (e) => {
    if (onDocumentInfoChange && !readOnly) {
      const { name, value } = e.target;
      onDocumentInfoChange(name, value);
    }
  };

  return (
    <div className="border border-gray-800">
      <div className="grid grid-cols-3">
        {/* Left column - Document info */}
        <div className="border-r border-gray-800">
          <table className="text-sm w-full">
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Document No. :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="documentNo"
                    value={documentInfo.documentNo || ''}
                    onChange={handleChange}
                    disabled
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder='Auto generated'
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Revision :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="revision"
                    value={documentInfo.revision || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Effective Date :</td>
                <td className="p-1">
                  <input
                    type="date"
                    name="effectiveDate"
                    value={documentInfo.effectiveDate || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Reviewed on :</td>
                <td className="p-1">
                  <input
                    type="date"
                    name="reviewedOn"
                    value={documentInfo.reviewedOn || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
              {/* <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Page :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="page"
                    value={documentInfo.page || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr> */}
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Prepared By :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="preparedBy"
                    value={documentInfo.preparedBy || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-1 font-semibold border-r border-gray-800">Approved by :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="approvedBy"
                    value={documentInfo.approvedBy || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
              <tr>
                <td className="p-1 font-semibold border-r border-gray-800">Issued by :</td>
                <td className="p-1">
                  <input
                    type="text"
                    name="issuedBy"
                    value={documentInfo.issuedBy || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    className="w-full px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Middle column - Title */}
        <div className="border-r border-gray-800 p-2 flex-1 content-center align-super">
          <div className="text-center">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm mt-1">Unit :- {unit}</p>
            <div className="mt-8">
              <p className="text-sm">
                <span className="font-bold">SCOPE : </span>
                <span className="uppercase">{scope}</span>
              </p>
              <p className="text-sm mt-4">
                <span className="font-bold">TITLE : </span>
                <span >{documentInfo.title || ''}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Logo */}
        <div className="flex justify-center items-center p-4">
          <img
            src={logo}
            alt="API Logo"
            className="w-40 h-auto"
          />
        </div>
      </div>
    </div>
  );
};

// Status banner component for displaying form status
export const StatusBanner = ({ status, submittedBy }) => {
  if (status === 'DRAFT') {
    return (
      <div className="px-4 py-2 text-yellow-900 font-semibold bg-yellow-100 border-l-4 border-yellow-500 flex items-center gap-2 mb-2 rounded">
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01M12 4h.01" />
        </svg>
        <span>Draft: This form is currently in draft state and not yet submitted for approval.</span>
      </div>
    );
  }

  const bgColor =
    status === 'SUBMITTED' ? 'bg-background' :
    status === 'APPROVED' ? 'bg-green-600' :
    'bg-red-600';

  return (
    <div className={`px-4 py-2 text-white font-semibold ${bgColor}`}>
      Form Status: {status}
      {submittedBy && ` - Submitted by ${submittedBy}`}
    </div>
  );
};

// Form action buttons component
export const FormActionButtons = ({ 
  permissions, 
  onSaveDraft, 
  onSubmit, 
  onQAReject, 
  onQASubmit, 
  onReject, 
  onApprove, 
  onDownloadPdf, 
  onBack,
  saving
}) => {
  return (
    <div className="p-4 bg-gray-100 flex justify-between">
      <button
        type="button"
        onClick={onBack}
        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        Back to Forms
      </button>

      <div className="space-x-2">
        {/* Operator buttons */}
        {permissions.canSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-yellow-300"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
        )}

        {permissions.canSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="bg-blue-800 hover:bg-background text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300"
          >
            {saving ? 'Submitting...' : 'Submit for Approval'}
          </button>
        )}

        {/* QA buttons */}
        {permissions.canQAReject && (
          <button
            type="button"
            onClick={onQAReject}
            disabled={saving}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
          >
            {saving ? 'Rejecting...' : 'Reject Form'}
          </button>
        )}

        {permissions.canQASubmit && (
          <button
            type="button"
            onClick={onQASubmit}
            disabled={saving}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-indigo-300"
          >
            {saving ? 'Submitting...' : 'Submit to AVP'}
          </button>
        )}

        {/* AVP buttons */}
        {permissions.canReject && (
          <button
            type="button"
            onClick={onReject}
            disabled={saving}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300"
          >
            {saving ? 'Rejecting...' : 'Reject Form'}
          </button>
        )}

        {permissions.canApprove && (
          <button
            type="button"
            onClick={onApprove}
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-green-300"
          >
            {saving ? 'Approving...' : 'Approve Form'}
          </button>
        )}

        {/* Download PDF button - visible to master and when approved */}
        {permissions.canDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            Download PDF
          </button>
        )}
      </div>
    </div>
  );
};

export default {
  FormHeader,
  StatusBanner,
  FormActionButtons
};