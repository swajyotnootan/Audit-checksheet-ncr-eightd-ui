import React from 'react';
import { FiCalendar } from 'react-icons/fi';

const YearFilter = ({ selectedYear, onYearChange, availableYears = [] }) => {
  // Format financial year display (e.g., 2025 → "FY 2025-26")
  const formatFinancialYear = (year) => {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  };

  const defaultYears = React.useMemo(() => {
    if (availableYears.length > 0) return availableYears;
    // Fixed range from 2020 to 2030
    const startYear = 2020;
    const endYear = 2030;
    const years = [];
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    return years.sort((a, b) => b - a);
  }, [availableYears]);

  return (
    <div className="flex items-center gap-2">
      <FiCalendar className="w-4 h-4 text-gray-500" />
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {defaultYears.map(year => (
          <option key={year} value={year}>
            {formatFinancialYear(year)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default YearFilter;