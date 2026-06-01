import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiCalendar, FiX } from 'react-icons/fi';

const CalendarRangeFilter = ({ fromDate, toDate, onFromDateChange, onToDateChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    onFromDateChange(null);
    onToDateChange(null);
    setIsOpen(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB');
  };

  const hasDates = fromDate || toDate;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${
          isOpen || hasDates
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <FiCalendar className="w-4 h-4" />
        <span>
          {fromDate && toDate
            ? `${formatDate(fromDate)} → ${formatDate(toDate)}`
            : fromDate
            ? `From ${formatDate(fromDate)}`
            : toDate
            ? `Until ${formatDate(toDate)}`
            : 'Select Date Range'}
        </span>
        {hasDates && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 hover:text-red-500"
          >
            <FiX className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
          <div className="flex flex-col items-center">
            <DatePicker
              selectsRange={true}
              startDate={fromDate}
              endDate={toDate}
              onChange={(update) => {
                const [start, end] = update;
                onFromDateChange(start);
                onToDateChange(end);
                if (start && end) {
                  setIsOpen(false);
                }
              }}
              inline
              monthsShown={2}
              dateFormat="dd/MM/yyyy"
              placeholderText="Select date range"
              className="w-full"
            />
            <div className="flex justify-end gap-2 w-full mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarRangeFilter;