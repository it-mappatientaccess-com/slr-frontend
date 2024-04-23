import React from 'react';
import PropTypes from 'prop-types';

// components
// import TableDropdown from 'components/Dropdowns/TableDropdown.js';

const CardTable = ({ color, title, columns, data }) => {
  // Render cell content, allowing both text and JSX components
  const renderCellContent = (content) => {
    if (React.isValidElement(content)) {
      return content; // If content is a React component, render it directly
    }
    return content; // Otherwise, treat it as text
  };

  return (
    <div
      className={`relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded ${
        color === "light" ? "bg-white" : "bg-lightBlue-900 text-white"
      }`}
    >
      {title && <div className="rounded-t mb-0 px-4 py-3 border-0">
        <div className="flex flex-wrap items-center">
          <div className="relative w-full px-4 max-w-full flex-grow flex-1">
            <h3 className={`font-semibold text-lg ${color === "light" ? "text-blueGray-700" : "text-white"}`}>
              {title}
            </h3>
          </div>
        </div>
      </div>}
      <div className="block w-full overflow-x-auto">
        {/* Dynamic table */}
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} className={`px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-normal font-semibold text-left ${color === "light" ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100" : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700"}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-normal p-4 ${col.className}`}>
                    {renderCellContent(row[col.accessor])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

CardTable.defaultProps = {
  color: 'light',
};

CardTable.propTypes = {
  color: PropTypes.oneOf(['light', 'dark']),
  title: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    accessor: PropTypes.string.isRequired,
    className: PropTypes.string
  })).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default CardTable;
