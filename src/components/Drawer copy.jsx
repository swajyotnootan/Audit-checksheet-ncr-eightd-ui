// src/components/Drawer.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MaterialReactTable } from "material-react-table";

export default function Drawer({
  isOpen,
  onClose,
  title,
  cardContent = [],
  tableData,
  tableColumns,
  children,
}) {
  const tabs = [];
  if (cardContent.length > 0) tabs.push({ name: "Card View", key: "card" });
  if (tableData && tableColumns) tabs.push({ name: "Table View", key: "table" });
  if (cardContent.length > 0) tabs.push({ name: "Form View", key: "form" });

  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  const memoColumns = useMemo(() => tableColumns || [], [tableColumns]);
  const memoData = useMemo(() => tableData || [], [tableData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative ml-auto h-full w-full sm:w-[600px] md:w-[800px] bg-white shadow-2xl flex flex-col rounded-l-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-indigo-600 text-white shadow">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* Tabs */}
            {tabs.length > 1 && (
              <div className="px-4 py-2 border-b flex space-x-3">
                {tabs.map((tab, idx) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTab === idx
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Card View */}
              {tabs[selectedTab]?.key === "card" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {cardContent.map((data, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedCardIndex(idx)}
                      className="bg-white p-5 rounded-2xl shadow hover:shadow-lg cursor-pointer border border-gray-100 transition"
                    >
                      <h3 className="font-semibold text-lg mb-2 text-indigo-600">
                        {data.eventNo || "Event"}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.plantLine && (
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                            Plant/Line: {data.plantLine}
                          </span>
                        )}
                        {data.partName && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Part: {data.partName}
                          </span>
                        )}
                        {data.defectCode && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Defect: {data.defectCode}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-3">
                        Click to view form →
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {tabs[selectedTab]?.key === "table" && (
                <div className="rounded-xl overflow-hidden shadow-md">
                  <MaterialReactTable
                    columns={memoColumns}
                    data={memoData}
                    enableStickyHeader
                    enableColumnResizing
                    enablePagination
                    muiTableContainerProps={{ sx: { maxHeight: 440 } }}
                    muiTablePaperProps={{
                      elevation: 0,
                      sx: { borderRadius: "12px", border: "1px solid #e5e7eb" },
                    }}
                  />
                </div>
              )}

              {/* Modern Two-Column Form View */}
              {tabs[selectedTab]?.key === "form" && selectedCardIndex !== null && (
                <div className="bg-white p-6 rounded-xl shadow-md grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {cardContent[selectedCardIndex] &&
                    Object.entries(cardContent[selectedCardIndex]).map(
                      ([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <label className="text-gray-600 font-medium mb-1 capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </label>
                          <input
                            type="text"
                            value={value || ""}
                            readOnly
                            className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )
                    )}
                </div>
              )}

              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
