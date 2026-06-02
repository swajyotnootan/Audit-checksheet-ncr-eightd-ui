// src/components/Drawer.jsx
import React, { useState, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// ============= LAZY LOAD MATERIAL REACT TABLE =============
const MaterialReactTable = lazy(() => import("material-react-table"));

// ============= LAZY LOAD PDF COMPONENTS =============
const Document = lazy(() => import("react-pdf").then(mod => ({ default: mod.Document })));
const Page = lazy(() => import("react-pdf").then(mod => ({ default: mod.Page })));

// PDF worker setup
const setupPdfWorker = () => {
  import("react-pdf").then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();/* @vite-ignore */
  });
};

// ============= LAZY LOADED TABLE COMPONENT =============
const LazyTable = ({ columns, data }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  React.useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading table...
      </div>
    );
  }
  
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading table...</div>}>
      <MaterialReactTable
        columns={columns}
        data={data}
        enableStickyHeader
        enableColumnResizing
        enablePagination
        muiTableContainerProps={{ sx: { maxHeight: 400 } }}
        muiTablePaperProps={{
          elevation: 0,
          sx: {
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          },
        }}
      />
    </Suspense>
  );
};

// ============= PDF VIEWER COMPONENT =============
const PdfViewer = ({ url }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  React.useEffect(() => {
    setupPdfWorker();
    setIsLoaded(true);
  }, []);
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading PDF viewer...
      </div>
    );
  }
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading PDF document...
      </div>
    }>
      <Document
        file={url}
        loading={<div className="flex items-center justify-center h-64 text-gray-500">Loading PDF...</div>}
        error={<div className="flex items-center justify-center h-64 text-red-500">Failed to load PDF</div>}
      >
        <Page pageNumber={1} width={180} />
      </Document>
    </Suspense>
  );
};

// ============= ATTACHMENT PREVIEW COMPONENT =============
const AttachmentPreview = ({ attachments }) => {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map((att, idx) => {
        const url = typeof att === 'string' ? att : att.url;
        if (!url) return null;

        const isPDF = url.toLowerCase().endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
        const isVideo = /\.(mp4|mov|avi|webm|ogg)$/i.test(url);

        return (
          <div key={idx} className="relative group">
            {isPDF ? (
              <div className="border rounded shadow w-48 h-64 overflow-hidden bg-gray-50">
                <PdfViewer url={url} />
              </div>
            ) : isImage ? (
              <img
                src={url}
                alt={`attachment-${idx}`}
                className="w-24 h-24 object-cover rounded border cursor-pointer"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                loading="lazy"
              />
            ) : isVideo ? (
              <video
                src={url}
                controls
                className="w-24 h-24 object-cover rounded border"
                preload="none"
              />
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm break-all max-w-48"
              >
                {att.name || 'Download File'}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============= MAIN DRAWER COMPONENT =============
export default function Drawer({
  isOpen,
  onClose,
  title,
  cardContent = [],
  tableData,
  tableColumns,
  children,
  showHeader = true,
  className = "",
}) {
  const tabs = [];
  if (cardContent.length) {
    tabs.push({ name: "Card View", key: "card" });
    tabs.push({ name: "Form View", key: "form" });
  }
  if (tableData && tableColumns) {
    tabs.push({ name: "Table View", key: "table" });
  }

  const [selectedTab, setSelectedTab] = useState(tabs[0]?.key || "card");
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  const memoColumns = useMemo(() => tableColumns || [], [tableColumns]);
  const memoData = useMemo(() => tableData || [], [tableData]);
  const selectedRow = tableData?.[selectedCardIndex] || {};

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
          />
          <motion.div
            className={`relative ml-auto h-full bg-white shadow-2xl flex flex-col rounded-l-2xl ${className}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {showHeader && (
              <div className="flex items-center justify-between px-6 py-4 border-b bg-[#2242a1]/80 text-white shadow">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-white/20 transition"
                  aria-label="Close drawer"
                >
                  <X size={22} />
                </button>
              </div>
            )}

            {tabs.length > 1 && (
              <div className="px-4 py-2 border-b flex space-x-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTab === tab.key
                        ? "bg-[#2242a1]/80 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            )}

            <div className={`flex-1 overflow-y-auto ${showHeader ? 'p-5 space-y-6' : 'p-0'}`}>
              {selectedTab === "card" && cardContent.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {cardContent.map((data, idx) => (
                    <div
                      key={data.eventNo || `card-${idx}`}
                      onClick={() => {
                        setSelectedCardIndex(idx);
                        setSelectedTab("form");
                      }}
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
                      <p className="text-gray-500 text-sm mt-3">Click to view form →</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedTab === "table" && tableData && tableColumns && (
                <LazyTable columns={memoColumns} data={memoData} />
              )}

              {selectedTab === "form" && selectedRow && (
                <section className="flex-auto overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
                  <div className="mx-auto max-w-2xl space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Event Details
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(selectedRow).map(([key, value]) => {
                        if (value == null) return null;
                        if (Array.isArray(value) && value.length > 0 && (value[0].url || typeof value[0] === 'string')) {
                          return (
                            <div key={key} className="flex flex-col space-y-1">
                              <label className="text-sm font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <AttachmentPreview attachments={value} />
                            </div>
                          );
                        }
                        if (typeof value === "object" && value !== null && (value.url || value.file)) {
                          return (
                            <div key={key} className="flex flex-col space-y-1">
                              <label className="text-sm font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <AttachmentPreview attachments={[value]} />
                            </div>
                          );
                        }
                        return (
                          <div key={key} className="flex flex-col space-y-1">
                            <label className="text-sm font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={String(value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 sm:text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}