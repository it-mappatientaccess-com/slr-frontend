import React, { useRef, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ExtractionResult.css";
import * as XLSX from "xlsx";
import { Tooltip } from "react-tooltip";
import { useSelector } from "react-redux";

const CustomCellRenderer = (props) => {
  const value = props.value || "";
  const content = value.split("\n").map((item, index) => {
    return (
      <div
        key={index}
        style={{ borderBottom: "1px solid #ccc", padding: "5px 0" }}
      >
        {item}
      </div>
    );
  });

  return <div>{content}</div>;
};

const ExtractionResult = (props) => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);
  const [includeExtraInfo, setIncludeExtraInfo] = useState(false);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  const prompts = useSelector((state) => state.dataExtraction.prompts);

  useEffect(() => {
    if (props.result && props.result.length > 0) {
      let flattenedResult = {};
      props.result.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (Array.isArray(item[key])) {
            flattenedResult[key] = item[key].join("\n");
          } else {
            flattenedResult[key] = item[key]; // handle non-array values
          }
        });
      });

      const modifiedData = [flattenedResult]; // put the flattenedResult in an array
      const columnsOrder = Object.keys(flattenedResult).sort((a, b) => {
        if (a === "aboutFile") return -1;
        if (b === "aboutFile") return 1;
        return 0;
      }); // sort keys to ensure 'aboutFile' is first
      const columns = columnsOrder.map((key) => {
        return {
          field: key,
          headerName: key.charAt(0).toUpperCase() + key.slice(1),
          suppressSizeToFit: true,
          flex: 1,
          filter: true,
          editable: false,
          cellRenderer: "customCellRenderer",
          cellStyle: { whiteSpace: "normal" },
          autoHeight: true,
        };
      });
      setRowData(modifiedData);
      setColumnDefs(columns);
    }
  }, [props.result]);

  const onBtnExport = () => {
    const headers = columnDefs.map((colDef) => colDef.headerName); // Get column headers
    const data = rowData.map((row) => {
      return columnDefs.map((colDef) => {
        let cellValue = row[colDef.field];
        if (
          !includeExtraInfo &&
          typeof cellValue === "string" &&
          cellValue.includes("Answer:")
        ) {
          // Only include the "Answer" part if includeExtraInfo is false
          const sections = cellValue.split("Answer:");
          const answers = sections
            .slice(1)
            .map((section) => {
              return section.split("Direct Quote", 1)[0].trim();
            })
            .filter(Boolean);
          cellValue = answers.join("\n\n");
        }
        // If includeExtraInfo is true, it will just use the original cellValue
        return cellValue;
      });
    });

    data.unshift(headers); // Add headers at the beginning of the data array

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    XLSX.writeFile(workbook, `${props.fileName}_export.xlsx`);
  };

  return (
    <div>
      <Tooltip id="export-btn-tooltip" />
      <div className="flex justify-between">
        <div>
          <h5 className="text-2xl font-normal leading-normal mt-0 mb-2 text-lightBlue-800">
            Filename: {props.fileName}
          </h5>
        </div>
        <div>
          {selectedPrompt === prompts[0].prompt_text && (
            <span className="mx-2">
              <input
                type="checkbox"
                id="includeExtraInfo"
                checked={includeExtraInfo}
                onChange={(e) => setIncludeExtraInfo(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="includeExtraInfo mx-2">
                Include Details
              </label>
            </span>
          )}
          <button
            className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            onClick={onBtnExport}
            data-tooltip-id="export-btn-tooltip"
            data-tooltip-content="Download results of the selected file in Excel format."
          >
            <i className="fas fa-file-export"></i> Export
          </button>
        </div>
      </div>

      <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg ">
        <div className="flex-auto p-4">
          <div className={`ag-theme-alpine`} style={{ height: "80vh" }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              animateRows={true}
              readOnlyEdit={true}
              enableCellChangeFlash={true}
              suppressClickEdit={true}
              components={{ customCellRenderer: CustomCellRenderer }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ExtractionResult;
