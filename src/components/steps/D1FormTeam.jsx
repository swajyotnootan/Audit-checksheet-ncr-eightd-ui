// src/components/steps/D1FormTeam.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  CalendarDays,
  UserCircle2,
  Info,
  Eye,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Drawer from "../Drawer";
import FinalPreview from "./FinalPreview";

export default function D1FormTeam({ eventId, updateParent }) {
  const [rows, setRows] = useState([
    {
      eventId: eventId || "",
      teamLeader: "",
      dateFormed: "",
      responsibilities: "",
      suppliers: [{ 
        name: "", 
        role: "", 
        department: "", 
        contact: "",
        countryCode: "in", // Default to India
        dialCode: "+91"    // Default to India
      }],
      customers: [],
      showCustomers: false,
    },
  ]);
  const [recordId, setRecordId] = useState(null);
  const [existingData, setExistingData] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug function to log API response
  const debugApiResponse = (response) => {
    console.log("=== D1 API RESPONSE DEBUG ===");
    console.log("Full response:", response);
    console.log("Response data:", response.data);
    console.log("Response data.data:", response.data?.data);
    console.log("Content:", response.data?.data?.content);
    console.log("D1 content:", response.data?.data?.content?.d1);
    console.log("===========================");
  };

  useEffect(() => {
    const fetchRecord = async () => {
      if (!eventId) return;
      
      setLoading(true);
      try {
        console.log("Fetching D1 data for eventId:", eventId);
        const res = await axios.get(`http://localhost:8080/api/eightd/data/${eventId}`);
        
        // Debug the response
        debugApiResponse(res);
        
        if (res.data?.data) {
          const eventData = res.data.data;
          setRecordId(eventData.id || eventData.eventNo);
          setExistingData(eventData);
          
          let d1Data = null;
          
          // Handle different possible data structures
          if (eventData.content?.d1 && Array.isArray(eventData.content.d1) && eventData.content.d1.length > 0) {
            d1Data = eventData.content.d1[0];
          } else if (eventData.d1 && Array.isArray(eventData.d1) && eventData.d1.length > 0) {
            d1Data = eventData.d1[0];
          } else if (eventData.content && typeof eventData.content === 'object') {
            // If content is directly the d1 data
            d1Data = eventData.content;
          }
          
          console.log("Extracted D1 data:", d1Data);
          
          if (d1Data) {
            // Process suppliers with proper fallbacks
            const processedSuppliers = (d1Data.suppliers || []).map(supplier => {
              // Extract country code and dial code from existing contact data
              let countryCode = "in"; // Default to India
              let dialCode = "+91";   // Default to India
              
              if (supplier.contact) {
                // If we have existing country data, use it
                if (supplier.countryCode && supplier.dialCode) {
                  countryCode = supplier.countryCode;
                  dialCode = supplier.dialCode;
                } else {
                  // Try to extract from phone number format
                  const phoneMatch = supplier.contact.match(/^(\+\d+)/);
                  if (phoneMatch) {
                    dialCode = phoneMatch[1];
                    // Map common dial codes to country codes
                    const dialCodeMap = {
                      "+91": "in",
                      "+1": "us",
                      "+44": "gb",
                      "+49": "de",
                      "+33": "fr",
                      "+81": "jp",
                      "+86": "cn",
                    };
                    countryCode = dialCodeMap[dialCode] || "in";
                  }
                }
              }
              
              return {
                name: supplier.name || "",
                role: supplier.role || "",
                department: supplier.department || "",
                contact: supplier.contact || "",
                countryCode: countryCode,
                dialCode: dialCode
              };
            });
            
            // Ensure at least one supplier exists
            if (processedSuppliers.length === 0) {
              processedSuppliers.push({ 
                name: "", 
                role: "", 
                department: "", 
                contact: "",
                countryCode: "in",
                dialCode: "+91"
              });
            }
            
            // Process customers with proper fallbacks
            const processedCustomers = (d1Data.customers || []).map(customer => {
              // Extract country code and dial code from existing contact data
              let countryCode = "in";
              let dialCode = "+91";
              
              if (customer.contact) {
                if (customer.countryCode && customer.dialCode) {
                  countryCode = customer.countryCode;
                  dialCode = customer.dialCode;
                } else {
                  const phoneMatch = customer.contact.match(/^(\+\d+)/);
                  if (phoneMatch) {
                    dialCode = phoneMatch[1];
                    const dialCodeMap = {
                      "+91": "in",
                      "+1": "us",
                      "+44": "gb",
                      "+49": "de",
                      "+33": "fr",
                      "+81": "jp",
                      "+86": "cn",
                    };
                    countryCode = dialCodeMap[dialCode] || "in";
                  }
                }
              }
              
              return {
                name: customer.name || "",
                role: customer.role || "",
                department: customer.department || "",
                contact: customer.contact || "",
                countryCode: countryCode,
                dialCode: dialCode
              };
            });
            
            const updatedD1Data = {
              eventId: d1Data.eventId || eventId,
              teamLeader: d1Data.teamLeader || "",
              dateFormed: d1Data.dateFormed || "",
              responsibilities: d1Data.responsibilities || "",
              suppliers: processedSuppliers,
              customers: processedCustomers,
              showCustomers: (d1Data.customers && d1Data.customers.length > 0) || false
            };
            
            console.log("Final processed D1 data:", updatedD1Data);
            setRows([updatedD1Data]);
          } else {
            console.log("No D1 data found, using default form");
            // Keep the default form if no data found
          }
        } else {
          console.log("No data found in response");
        }
      } catch (err) {
        console.error("Error fetching existing D1 event:", err);
        alert("Error loading existing D1 data: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [eventId]);

  const updateRows = (newRows) => setRows(newRows);

  const handleChange = (index, e) => {
    const newRows = [...rows];
    newRows[index][e.target.name] = e.target.value;
    updateRows(newRows);
  };

  const handleMemberChange = (rowIndex, type, memberIndex, field, value) => {
    const newRows = [...rows];
    newRows[rowIndex][type][memberIndex][field] = value;
    updateRows(newRows);
  };

  // Handle phone number change using react-phone-input-2
  const handlePhoneChange = (rowIndex, type, memberIndex, value, country) => {
    const newRows = [...rows];
    const member = newRows[rowIndex][type][memberIndex];
    
    // Update contact with full international number
    member.contact = value;
    
    // Update country info
    if (country) {
      member.countryCode = country.countryCode.toLowerCase();
      member.dialCode = country.dialCode;
    }
    
    updateRows(newRows);
  };

  const addMember = (rowIndex, type) => {
    const newRows = [...rows];
    newRows[rowIndex][type].push({ 
      name: "", 
      role: "", 
      department: "", 
      contact: "",
      countryCode: "in",
      dialCode: "+91"
    });
    updateRows(newRows);
  };

  const removeMember = (rowIndex, type, memberIndex) => {
    const newRows = [...rows];
    newRows[rowIndex][type].splice(memberIndex, 1);
    updateRows(newRows);
  };

  const toggleCustomers = (rowIndex, checked) => {
    const newRows = [...rows];
    newRows[rowIndex].showCustomers = checked;
    if (!checked) newRows[rowIndex].customers = [];
    updateRows(newRows);
  };

  // Validate phone numbers before submission
  const validateAllPhoneNumbers = () => {
    const errors = [];
    
    rows.forEach((row, rowIndex) => {
      // Validate supplier phone numbers
      row.suppliers.forEach((supplier, supplierIndex) => {
        if (supplier.contact && supplier.contact.length < 8) { // Basic length check
          errors.push(`Supplier ${supplierIndex + 1} (${supplier.name || 'Unnamed'}): Phone number is too short`);
        }
      });
      
      // Validate customer phone numbers
      if (row.showCustomers) {
        row.customers.forEach((customer, customerIndex) => {
          if (customer.contact && customer.contact.length < 8) {
            errors.push(`Customer ${customerIndex + 1} (${customer.name || 'Unnamed'}): Phone number is too short`);
          }
        });
      }
    });
    
    return errors;
  };

  const handleSubmit = async () => {
    // Validate phone numbers before submission
    const phoneErrors = validateAllPhoneNumbers();
    if (phoneErrors.length > 0) {
      alert(`Please fix the following phone number errors:\n\n${phoneErrors.join('\n')}`);
      return;
    }

    try {
      const payload = { d1: rows };
      const formData = new FormData();
      formData.append('jsonContent', JSON.stringify(payload));
      
      console.log("Submitting D1 data:", payload);
      
      if (recordId) {
        const eventNo = rows[0].eventId || recordId;
        await axios.put(`http://localhost:8080/api/eightd/data/${eventNo}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("D1 form updated successfully!");
      } else {
        const res = await axios.post("http://localhost:8080/api/eightd/data", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.data?.id) {
          setRecordId(res.data.data.id);
          const newRows = [...rows];
          newRows[0].eventId = res.data.data.id;
          setRows(newRows);
        }
        alert("D1 form saved successfully!");
      }
      if (updateParent) updateParent(rows);
    } catch (err) {
      console.error(err);
      alert("Failed to submit D1 form: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg">Loading D1 data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header - Responsive */}
      <div className="relative bg-[#2242a1]/80 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl border-t-4 sm:border-t-[10px] border-[#ee161f]/80 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
            D1 – Form the Team
            {eventId && (
              <span className="text-xs sm:text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                {eventId}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1 sm:gap-2 bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-white/20 transition text-xs sm:text-sm"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            Preview Full Report
          </button>
        </div>
      </div>
      
      {/* Form - Responsive */}
      <div className="bg-white p-4 sm:p-6 rounded-b-2xl shadow-lg border border-gray-100 space-y-4 sm:space-y-6">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-4">
            {/* Event ID */}
            <div>
              <label className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                Event ID
                <Tippy content="Enter the Event Number from D0 Plan">
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </Tippy>
              </label>
              <input
                type="text"
                name="eventId"
                value={row.eventId}
                onChange={(e) => handleChange(rowIndex, e)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* Team Leader */}
            <div>
              <label className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Team Leader
              </label>
              <input
                type="text"
                name="teamLeader"
                value={row.teamLeader}
                onChange={(e) => handleChange(rowIndex, e)}
                placeholder="Enter Team Leader Name"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* Date Formed */}
            <div>
              <label className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Date Formed
              </label>
              <input
                type="date"
                name="dateFormed"
                value={row.dateFormed}
                onChange={(e) => handleChange(rowIndex, e)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* Responsibilities */}
            <div>
              <label className="font-semibold text-gray-800 text-sm sm:text-base">
                Team Responsibilities
              </label>
              <textarea
                name="responsibilities"
                value={row.responsibilities}
                onChange={(e) => handleChange(rowIndex, e)}
                rows="3"
                placeholder="Define team scope and responsibilities..."
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* Suppliers */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Suppliers (Mandatory)
              </h3>
              {row.suppliers.map((member, memberIndex) => (
                <div
                  key={memberIndex}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-center bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  {/* Name */}
                  <div className="lg:col-span-3">
                    <input
                      type="text"
                      name="name"
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => handleMemberChange(rowIndex, "suppliers", memberIndex, "name", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  {/* Role */}
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      name="role"
                      placeholder="Role"
                      value={member.role}
                      onChange={(e) => handleMemberChange(rowIndex, "suppliers", memberIndex, "role", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  {/* Department */}
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      name="department"
                      placeholder="Department"
                      value={member.department}
                      onChange={(e) => handleMemberChange(rowIndex, "suppliers", memberIndex, "department", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  {/* Phone Number using react-phone-input-2 */}
                  <div className="lg:col-span-4">
                    <label className="text-xs text-gray-600 mb-1 block">Phone Number</label>
                    <PhoneInput
                      country={member.countryCode || "in"}
                      value={member.contact}
                      onChange={(value, country) => handlePhoneChange(rowIndex, "suppliers", memberIndex, value, country)}
                      inputClass="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500"
                      buttonClass="border-gray-300"
                      dropdownClass="text-sm"
                    />
                  </div>
                  
                  {/* Remove Button */}
                  {row.suppliers.length > 1 && (
                    <div className="lg:col-span-1 flex ml-16 justify-center">
                      <button
                        type="button"
                        onClick={() => removeMember(rowIndex, "suppliers", memberIndex)}
                        className="text-red-500 hover:text-red-700 mt-6"
                      >
                        <Trash2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addMember(rowIndex, "suppliers")}
                className="mt-2 flex items-center gap-2 text-green-600 hover:text-green-800 font-medium text-xs sm:text-sm"
              >
                <UserPlus size={16} className="sm:w-4 sm:h-4" />
                Add Supplier
              </button>
            </div>
            {/* Customers Checkbox */}
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={row.showCustomers}
                onChange={(e) => toggleCustomers(rowIndex, e.target.checked)}
                id={`customer-checkbox-${rowIndex}`}
                className="w-4 h-4"
              />
              <label htmlFor={`customer-checkbox-${rowIndex}`} className="font-semibold text-gray-800 text-sm sm:text-base">
                Add Customers
              </label>
            </div>
            {/* Customers Fields */}
            {row.showCustomers && (
              <div className="space-y-2 mt-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Customers
                </h3>
                {row.customers.map((member, memberIndex) => (
                  <div
                    key={memberIndex}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-center bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200"
                  >
                    {/* Name */}
                    <div className="lg:col-span-3">
                      <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={member.name}
                        onChange={(e) => handleMemberChange(rowIndex, "customers", memberIndex, "name", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Role */}
                    <div className="lg:col-span-2">
                      <input
                        type="text"
                        name="role"
                        placeholder="Role"
                        value={member.role}
                        onChange={(e) => handleMemberChange(rowIndex, "customers", memberIndex, "role", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Department */}
                    <div className="lg:col-span-2">
                      <input
                        type="text"
                        name="department"
                        placeholder="Department"
                        value={member.department}
                        onChange={(e) => handleMemberChange(rowIndex, "customers", memberIndex, "department", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Phone Number using react-phone-input-2 */}
                    <div className="lg:col-span-4">
                      <label className="text-xs text-gray-600 mb-1 block">Phone Number</label>
                      <PhoneInput
                        country={member.countryCode || "in"}
                        value={member.contact}
                        onChange={(value, country) => handlePhoneChange(rowIndex, "customers", memberIndex, value, country)}
                        inputClass="w-full rounded-lg border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                        buttonClass="border-gray-300"
                        dropdownClass="text-sm"
                      />
                    </div>
                    
                    {/* Remove Button */}
                    {row.customers.length > 0 && (
                      <div className="lg:col-span-1 flex ml-16 justify-center">
                        <button
                          type="button"
                          onClick={() => removeMember(rowIndex, "customers", memberIndex)}
                          className="text-red-500 hover:text-red-700 mt-6"
                        >
                          <Trash2 size={16} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addMember(rowIndex, "customers")}
                  className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm"
                >
                  <UserPlus size={16} className="sm:w-4 sm:h-4" />
                  Add Customer
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-4 px-4 py-2 sm:px-6 sm:py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 text-sm sm:text-base"
          >
            Submit D1
          </button>
        </div>
      </div>

      {/* ✅ DRAWER PREVIEW */}
      <Drawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Full 8D Report Preview"
        children={<FinalPreview eventId={eventId || rows[0].eventId} />}
      />
    </div>
  );
}