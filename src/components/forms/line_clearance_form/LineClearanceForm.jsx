import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { lineClearanceAPI } from './lineClearanceAPI';
import { FormHeader, StatusBanner, FormActionButtons } from '../CommonCode';
import EmailModal from '../../EmailModal';
import QASign from '../../../assets/QASign.png'
import OperatorSign from '../../../assets/OperatorSign.png'
const LineClearanceForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(id ? true : false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);

    const [permissions, setPermissions] = useState({
        canEditDocumentInfo: false,
        canEditDetails: false,
        canEditCheckpoints: false,
        canSubmit: false,
        canQASubmit: false,
        canQAReject: false,
        canApprove: false,
        canReject: false,
        canSaveDraft: false,
        canDownloadPdf: false,
        canEmailPdf: false,
    });

    const defaultCheckpoints = [
        {
            id: 1,
            description: 'Ensure no Rejection / OK bottles of existing Job / Variant kept at Coating Loading / Unloading area.',
            responsibility: 'Quality Engineer',
            remarks: '',
        },
        {
            id: 2,
            description: 'Ensure no Rejection / OK bottles of existing Job / Variant kept at Printing Production area (All M/c at lehr Loading end).',
            responsibility: 'Printing Operator',
            remarks: '',
        },
        {
            id: 3,
            description: 'Ensure no Rejection / OK bottles of existing Job / Variant kept at Lehr end Inspection area and below Lehr Conveyor.',
            responsibility: 'Executive',
            remarks: '',
        },
        {
            id: 4,
            description: 'Ensure no Rejection / OK bottles of existing Job / Variant kept at QC laboratory.',
            responsibility: 'Executive',
            remarks: '',
        },
        {
            id: 5,
            description: 'Ensure all box Labels of existing Job / Variant are withdrawn or Removed.',
            responsibility: 'Executive',
            remarks: '',
        },
        {
            id: 6,
            description: 'Ensure all empty boxes / Trays / Partitions of existing Job / Variant are withdrawn or removed.',
            responsibility: 'Executive',
            remarks: '',
        },
        {
            id: 7,
            description: 'Ensure all Final Pallet cards of existing Job / Variant are withdrawn or removed.',
            responsibility: 'Production Engineer',
            remarks: '',
        },
        {
            id: 8,
            description: 'Ensure all existing Job / Variant are withdrawn or Removed from Offline sorting / Resorting area.',
            responsibility: 'Production Engineer',
            remarks: '',
        }
    ];

    const [formData, setFormData] = useState({
        documentNo: '',
        revision: '00',
        effectiveDate: new Date().toISOString().split('T')[0],
        reviewedOn: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
        page: '1/1',
        preparedBy: '',
        approvedBy: '',
        issued: '',
        reportDate: new Date().toISOString().split('T')[0],
        shift: '',
        line: '',
        productName: '',
        existingVariantDescription: '',
        newVariantDescription: '',
        existingVariantName: '',
        newVariantName: '',
        existingVariantStopTime: '',
        newVariantStartTime: '',
        checkPoints: defaultCheckpoints,
        productionName: '',
        productionSignature: '',
        qualityName: '',
        qualitySignature: '',
        status: 'DRAFT',
        submittedBy: '',
        submittedAt: '',
        reviewedBy: '',
        reviewedAt: '',
        comments: '',
        productionArea: '',
        title: 'LINE CLEARANCE REPORT',
        scope: 'API / DEC / COATING & PRINTING',
        unit: 'API Speciality Glass Division',
    });

    // Utility function to sanitize form data
    const sanitizeFormData = (formData) => {
        // Create a deep copy to avoid modifying the original
        const sanitized = JSON.parse(JSON.stringify(formData));

        // Convert dates to proper format if they're strings
        if (sanitized.reportDate && typeof sanitized.reportDate === 'string') {
            sanitized.reportDate = sanitized.reportDate.includes('T')
                ? sanitized.reportDate
                : sanitized.reportDate + 'T00:00:00';
        }

        if (sanitized.effectiveDate && typeof sanitized.effectiveDate === 'string') {
            sanitized.effectiveDate = sanitized.effectiveDate.includes('T')
                ? sanitized.effectiveDate
                : sanitized.effectiveDate + 'T00:00:00';
        }

        if (sanitized.reviewedOn && typeof sanitized.reviewedOn === 'string') {
            sanitized.reviewedOn = sanitized.reviewedOn.includes('T')
                ? sanitized.reviewedOn
                : sanitized.reviewedOn + 'T00:00:00';
        }

        // Ensure ProductionArea field is included and properly formatted
        if (sanitized.line === 'COATING') {
            sanitized.productionArea = 'COATING';
        } else if (sanitized.line === 'PRINTING') {
            sanitized.productionArea = 'PRINTING';
        } else if (sanitized.line === 'BOTH') {
            sanitized.productionArea = 'BOTH';
        } else {
            // Set default value if line is not selected
            sanitized.productionArea = null; // This will prevent sending an empty string
        }

        // Make sure checkPoints are properly formatted
        if (sanitized.checkPoints) {
            sanitized.checkPoints = sanitized.checkPoints.map(point => ({
                id: point.id,
                description: point.description,
                responsibility: point.responsibility,
                remarks: point.remarks || ''
            }));
        }

        return sanitized;
    };

    // Mapping function to align frontend and backend models
    const mapFormDataToModel = (formData) => {
        // Create a sanitized version of the form data
        const sanitized = sanitizeFormData(formData);

        // Make sure it matches the backend LineClearanceReport model
        return {
            ...sanitized,
            // Make sure these fields are properly set
            unit: sanitized.unit || "API Speciality Glass Division",
            scope: sanitized.scope || "API/ DEC/ COATING & PRINTING",
            title: sanitized.title || "LINE CLEARANCE REPORT",
            // Handle any other specific field mappings here
            responsibleName: sanitized.responsibleName || "",
            responsibleSignature: sanitized.responsibleSignature || "",
        };
    };

    const saveForm = async (newStatus) => {
        try {
            setSaving(true);

            const updatedFormData = {
                ...formData,
                status: newStatus,
                submittedBy: (newStatus === 'SUBMITTED' && !formData.submittedBy) ? user.name : formData.submittedBy,
                submittedAt: (newStatus === 'SUBMITTED' && !formData.submittedAt) ? new Date().toISOString() : formData.submittedAt,
                reviewedBy: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? user.name : formData.reviewedBy,
                reviewedAt: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? new Date().toISOString() : formData.reviewedAt,
                productionSignature: !id && !formData.productionSignature ? `signed_by_${user.name}` : formData.productionSignature,
                qualityName: (newStatus === 'APPROVED' && !formData.qualityName) ? user.name : formData.qualityName,
                qualitySignature: (newStatus === 'APPROVED' && !formData.qualitySignature) ? `signed_by_${user.name}` : formData.qualitySignature
            };

            // Map to backend model and sanitize
            const modelData = mapFormDataToModel(updatedFormData);

            if (id) {
                await lineClearanceAPI.updateReport(id, modelData);
            } else {
                await lineClearanceAPI.createReport(modelData);
            }

            alert('Form saved successfully!');
            navigate('/forms/clearance');
        } catch (error) {
            console.error('Error saving form:', error);
            alert('Failed to save form. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Function to download PDF
    const downloadPdf = async () => {
        try {
            const userName = user?.name || 'Anonymous';
            await lineClearanceAPI.downloadPdf(id, userName);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    // Function to email PDF
    const emailPdfToUser = async (emailData) => {
        try {
            const userName = user?.name || 'Anonymous';
            await lineClearanceAPI.emailPdf(id, emailData, userName);
            alert('Email sent successfully!');
        } catch (error) {
            console.error('Error emailing PDF:', error);
            alert('Failed to send email. Please try again.');
        }
    };

    function formatTimeForDisplay(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    useEffect(() => {
        if (id) {
            const fetchForm = async () => {
                try {
                    setLoading(true);
                    const data = await lineClearanceAPI.getReportById(id);

                    // Process dates for UI display
                    setFormData({
                        ...data,
                        effectiveDate: data.effectiveDate?.split('T')[0],
                        reviewedOn: data.reviewedOn?.split('T')[0],
                        reportDate: data.reportDate?.split('T')[0],
                    });
                } catch (error) {
                    console.error('Error fetching form:', error);
                    setError('Failed to load form. Please try again.');
                } finally {
                    setLoading(false);
                }
            };
            fetchForm();
        }
    }, [id]);

    useEffect(() => {
        if (user && formData) {
            const isOperator = user.role === 'operator';
            const isQA = user.role === 'qa';
            const isAVP = user.role === 'avp';
            const isMaster = user.role === 'master';

            const isDraft = formData.status === 'DRAFT';
            const isSubmitted = formData.status === 'SUBMITTED';
            const isApproved = formData.status === 'APPROVED';

            setPermissions({
                canEditDocumentInfo: (isOperator && isDraft) || isMaster,
                canEditDetails: (isOperator && isDraft) || isMaster,
                canEditCheckpoints: (isOperator && isDraft) || isMaster,
                canSubmit: (isOperator && isDraft),
                canQASubmit: (isQA && isSubmitted),
                canQAReject: (isQA && isSubmitted),
                canApprove: (isAVP && isSubmitted),
                canReject: (isAVP && isSubmitted),
                canSaveDraft: (isOperator && isDraft) || isMaster,
                canDownloadPdf: isApproved || isMaster,
                canEmailPdf: isApproved || (isMaster) || (isAVP && isSubmitted)
            });
        }
    }, [user, formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDocumentInfoChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRemarkChange = (index, value) => {
        const updatedCheckpoints = [...formData.checkPoints];
        updatedCheckpoints[index].remarks = value;
        setFormData(prev => ({ ...prev, checkPoints: updatedCheckpoints }));
    };

    const handleTimeChange = (name, value) => {
        const [time, period] = value.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours, 10);
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        const date = new Date();
        date.setHours(hour, parseInt(minutes), 0, 0);
        setFormData(prev => ({ ...prev, [name]: date.toISOString() }));
    };

    const documentInfo = {
        documentNo: formData.documentNo,
        revision: formData.revision,
        effectiveDate: formData.effectiveDate,
        reviewedOn: formData.reviewedOn,
        page: formData.page,
        preparedBy: formData.preparedBy,
        approvedBy: formData.approvedBy,
        issuedBy: formData.issued,
        title: formData.title,
    };

    if (loading) return <div className="text-center p-6">Loading...</div>;
    if (error) return <div className="text-center p-6 text-red-500">{error}</div>;

    // Custom buttons to add to FormActionButtons
    const customButtons = (
        <>
            {permissions.canEmailPdf && (
                <button
                    type="button"
                    onClick={() => setEmailModalOpen(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                    Email PDF
                </button>
            )}
        </>
    );

    return (
        <div className="flex justify-center bg-gray-100 p-4 mt-16">
            <form className="w-full max-w-4xl bg-white shadow-md p-4">

                {/* Banner */}
                <StatusBanner status={formData.status} submittedBy={formData.submittedBy} />

                {/* Form Header */}
                <FormHeader
                    documentInfo={documentInfo}
                    title="API Greenpac Limited"
                    unit={formData.unit}
                    scope={formData.scope}
                    readOnly={!permissions.canEditDocumentInfo}
                    onDocumentInfoChange={handleDocumentInfoChange}
                />

                {/* Main Form */}

                {/* Date, Shift, Line */}
                <div className="border-x border-b border-gray-800">
                    <div className="grid grid-cols-3 text-sm border-b border-gray-800">
                        {/* Date */}
                        <div className="border-r border-gray-800 p-2">
                            <span className="font-semibold">DATE: </span>
                            {permissions.canEditDetails ? (
                                <input
                                    type="date"
                                    name="reportDate"
                                    value={formData.reportDate}
                                    onChange={handleChange}
                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                                />
                            ) : (
                                <span>{formData.reportDate}</span>
                            )}
                        </div>

                        {/* Shift */}
                        <div className="p-2 border-r border-gray-800">
                            <span className="font-semibold">SHIFT: </span>
                            {permissions.canEditDetails ? (
                                <select
                                    name="shift"
                                    value={formData.shift}
                                    onChange={handleChange}
                                    className="px-2 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                                >
                                    <option value="">Select</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                            ) : (
                                <span>{formData.shift}</span>
                            )}
                        </div>

                        {/* Line */}
                        <div className="p-2">
                            <span className="font-semibold">LINE: </span>
                            {permissions.canEditDetails ? (
                                <select
                                    name="line"
                                    value={formData.line}
                                    onChange={handleChange}
                                    className="px-2 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200"
                                >
                                    <option value="">Select</option>
                                    <option value="COATING">COATING</option>
                                    <option value="PRINTING">PRINTING</option>
                                    <option value="BOTH">BOTH</option>
                                </select>
                            ) : (
                                <span>{formData.line}</span>
                            )}
                        </div>
                    </div>

                    {/* Product Name */}
                    <div className="text-sm border-b border-gray-800 p-2">
                        <span className="font-semibold">NAME OF PRODUCT: </span>
                        {permissions.canEditDetails ? (
                            <input
                                type="text"
                                name="productName"
                                value={formData.productName}
                                onChange={handleChange}
                                className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-64"
                            />
                        ) : (
                            <span>{formData.productName}</span>
                        )}
                    </div>

                    {/* Variant Change Description */}
                    <div className="text-sm border-b border-gray-800 p-2">
                        <span className="font-semibold">VARIANT / PRODUCT CHANGE DESCRIPTION: </span>
                        {permissions.canEditDetails ? (
                            <input
                                type="text"
                                name="existingVariantDescription"
                                value={formData.existingVariantDescription}
                                onChange={handleChange}
                                className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-64"
                            />
                        ) : (
                            <span>{formData.existingVariantDescription}</span>
                        )}
                    </div>

                    {/* Existing Variant Name and New Variant Name */}
                    <div className="grid grid-cols-2 text-sm border-b border-gray-800">
                        <div className="border-r border-gray-800 p-2">
                            <span className="font-semibold">EXISTING VARIANT / PRODUCT: </span>
                            {permissions.canEditDetails ? (
                                <input
                                    type="text"
                                    name="existingVariantName"
                                    value={formData.existingVariantName}
                                    onChange={handleChange}
                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-full"
                                />
                            ) : (
                                <span>{formData.existingVariantName}</span>
                            )}
                        </div>
                        <div className="p-2">
                            <span className="font-semibold">NEW VARIANT / PRODUCT: </span>
                            {permissions.canEditDetails ? (
                                <input
                                    type="text"
                                    name="newVariantName"
                                    value={formData.newVariantName}
                                    onChange={handleChange}
                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-full"
                                />
                            ) : (
                                <span>{formData.newVariantName}</span>
                            )}
                        </div>
                    </div>

                    {/* Existing Stop Time and New Start Time */}
                    <div className="grid grid-cols-2 text-sm border-b border-gray-800">
                        <div className="border-r border-gray-800 p-2">
                            <span className="font-semibold">EXISTING VARIANT / PRODUCT STOP TIME: </span>
                            {permissions.canEditDetails ? (
                                <input
                                    type="time"
                                    value={formData.existingVariantStopTime ? new Date(formData.existingVariantStopTime).toISOString().substring(11, 16) : ''}
                                    onChange={(e) => {
                                        const [hour, minute] = e.target.value.split(':');
                                        const date = new Date();
                                        date.setHours(hour, minute, 0, 0);
                                        handleTimeChange('existingVariantStopTime', formatTimeForDisplay(date.toISOString()));
                                    }}
                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-32"
                                />
                            ) : (
                                <span>{formatTimeForDisplay(formData.existingVariantStopTime)}</span>
                            )}
                        </div>
                        <div className="p-2">
                            <span className="font-semibold">NEW VARIANT / PRODUCT START TIME: </span>
                            {permissions.canEditDetails ? (
                                <input
                                    type="time"
                                    value={formData.newVariantStartTime ? new Date(formData.newVariantStartTime).toISOString().substring(11, 16) : ''}
                                    onChange={(e) => {
                                        const [hour, minute] = e.target.value.split(':');
                                        const date = new Date();
                                        date.setHours(hour, minute, 0, 0);
                                        handleTimeChange('newVariantStartTime', formatTimeForDisplay(date.toISOString()));
                                    }}
                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-32"
                                />
                            ) : (
                                <span>{formatTimeForDisplay(formData.newVariantStartTime)}</span>
                            )}
                        </div>

                    </div>

                    {/* Checkpoints Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="border border-gray-800 p-2 bg-gray-200">Sl. No.</th>
                                    <th className="border border-gray-800 p-2 bg-gray-200">CHECK POINT</th>
                                    <th className="border border-gray-800 p-2 bg-gray-200">RESPONSIBILITY</th>
                                    <th className="border border-gray-800 p-2 bg-gray-200">REMARKS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.checkPoints.map((point, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-800 p-2 text-center">{point.id}</td>
                                        <td className="border border-gray-800 p-2">{point.description}</td>
                                        <td className="border border-gray-800 p-2 text-center">{point.responsibility}</td>
                                        <td className="border border-gray-800 p-2 text-center">
                                            {permissions.canEditCheckpoints ? (
                                                <input
                                                    type="text"
                                                    value={point.remarks}
                                                    onChange={(e) => handleRemarkChange(index, e.target.value)}
                                                    className="px-1 py-0 border-gray-300 focus:border-blue-800 focus:ring focus:ring-blue-200 w-full"
                                                />
                                            ) : (
                                                point.remarks
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Production and Quality Responsible Section */}
                <div className="border-x border-b border-gray-800 text-sm">

                    {/* Signature Section */}
                    <div className="border-x border-b border-gray-800 text-sm mt-4">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-gray-800 w-1/5 text-center py-2">RESPONSIBLE</th>
                                    <th className="border border-gray-800 w-3/5 text-center py-2">NAME</th>
                                    <th className="border border-gray-800 w-1/5 text-center py-2">SIGN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Production Row */}
                                <tr>
                                    <td className="border border-gray-800 text-center font-semibold py-3">PRODUCTION</td>
                                    <td className="border border-gray-800 text-center px-4 py-3">
                                        {permissions.canEditDetails ? (
                                            <input
                                                type="text"
                                                name="productionName"
                                                value={formData.productionName}
                                                onChange={handleChange}
                                                placeholder="Enter name"
                                                className="w-full border-none outline-none text-center text-sm"
                                            />
                                        ) : (
                                            <span>{formData.productionName}</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-800 text-center py-3">
                                        {formData.productionSignature?.startsWith('signed_by_') ? (
                                            <img
                                                src={OperatorSign}
                                                alt="Production Signature"
                                                className="h-10 mx-auto"
                                                onError={(e) => (e.target.style.display = 'none')}
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-500">Signature</span>
                                        )}
                                    </td>
                                </tr>

                                {/* Quality Row */}
                                <tr>
                                    <td className="border border-gray-800 text-center font-semibold py-3">QUALITY</td>
                                    <td className="border border-gray-800 text-center px-4 py-3">
                                        {permissions.canEditDetails ? (
                                            <input
                                                type="text"
                                                name="qualityName"
                                                value={formData.qualityName}
                                                onChange={handleChange}
                                                placeholder="Enter name"
                                                className="w-full border-none outline-none text-center text-sm"
                                            />
                                        ) : (
                                            <span>{formData.qualityName}</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-800 text-center py-3">
                                        {formData.qualitySignature?.startsWith('signed_by_') ? (
                                            <img
                                                src={QASign}
                                                alt="Quality Signature"
                                                className="h-10 mx-auto"
                                                onError={(e) => (e.target.style.display = 'none')}
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-500">Signature</span>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* Review Information (Only when Submitted / Approved / Rejected) */}
                {(formData.status === 'SUBMITTED' || formData.status === 'APPROVED' || formData.status === 'REJECTED') && (
                    <div className="border-x border-b border-gray-800 p-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-700 mb-2">Review Information</h3>

                        {formData.submittedBy && (
                            <div className="text-sm mb-1">
                                <span className="font-medium">Submitted by:</span> {formData.submittedBy}
                                {formData.submittedAt && (
                                    <span className="ml-1 text-gray-500">
                                        on {new Date(formData.submittedAt).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        )}

                        {formData.reviewedBy && (
                            <div className="text-sm mb-1">
                                <span className="font-medium">Reviewed by:</span> {formData.reviewedBy}
                                {formData.reviewedAt && (
                                    <span className="ml-1 text-gray-500">
                                        on {new Date(formData.reviewedAt).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        )}

                        {formData.comments && (
                            <div className="mt-2">
                                <span className="font-medium text-sm">Comments:</span>
                                <div className="p-2 bg-white border border-gray-300 rounded mt-1 text-sm">
                                    {formData.comments}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Form Action Buttons */}
                <FormActionButtons
                    permissions={permissions}
                    onSaveDraft={() => saveForm('DRAFT')}
                    onSubmit={() => saveForm('SUBMITTED')}
                    onQAReject={() => saveForm('REJECTED')}
                    onQASubmit={() => saveForm('SUBMITTED')}
                    onReject={() => saveForm('REJECTED')}
                    onApprove={() => saveForm('APPROVED')}
                    onDownloadPdf={downloadPdf}
                    onBack={() => navigate('/forms/clearance')}
                    saving={saving}
                    customButtons={customButtons}
                />
            </form>

            {/* Email Modal */}
            <EmailModal
                isOpen={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                formId={id}
                onSuccess={() => alert('Email sent successfully!')}
            />
        </div>
    );
};

export default LineClearanceForm;