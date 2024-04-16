import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ExtractionResult.css";
import * as XLSX from "xlsx";
import { Tooltip } from "react-tooltip";
import { useSelector } from "react-redux";

const CustomCellRenderer = (props) => {
  const value = props.value || "";
  const content =
    typeof value === "string"
      ? value.split("\n").map((item, index) => {
          return (
            <div
              key={index}
              style={{ borderBottom: "1px solid #ccc", padding: "5px 0" }}
            >
              {item}
            </div>
          );
        })
      : value; // if value is not a string, just use it as is

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
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash: true,
    }),
    []
  );
  const [showQuestions, setShowQuestions] = useState(true); // By default, questions are shown
  useEffect(() => {
    if (props.result && props.result.length > 0 && props.selectedFileQuestions) {
      let columnDataMap = {};
  
      // Initialize column data map for all keys including 'aboutFile'
      Object.keys(props.selectedFileQuestions).concat('aboutFile').forEach((key) => {
        columnDataMap[key] = [];
      });
  
      // Populate each column with the data
      props.result.forEach((resultItem) => {
        Object.keys(resultItem).forEach((key) => {
          if (key === 'aboutFile') {
            // Directly use the content for 'aboutFile' and treat as descriptive text
            columnDataMap[key].push(resultItem[key]);
          } else {
            const answers = resultItem[key];
            const questions = props.selectedFileQuestions[key];
            if (answers && questions) {
              answers.forEach((answer, index) => {
                const question = questions[index] || "Question not available";
                columnDataMap[key].push(`Q${index + 1}: ${question}`);
                columnDataMap[key].push(answer);  // Display only the answer text
              });
            }
          }
        });
      });
  
      const filteredData = showQuestions ? columnDataMap : Object.keys(columnDataMap).reduce((acc, key) => {
        acc[key] = columnDataMap[key].filter((text, index) => {
          return !(typeof text === 'string' && text.startsWith('Q'));
        });
        return acc;
      }, {});
  
      // Determine the maximum number of entries for consistent row construction
      const maxLength = Math.max(...Object.values(filteredData).map(col => col.length));
      let rowData = [];
  
      for (let i = 0; i < maxLength; i++) {
        let row = {};
        Object.keys(filteredData).forEach(key => {
          row[key] = filteredData[key][i] || "";
        });
        rowData.push(row);
      }
  
      // Setup columns based on keys, ensuring 'aboutFile' is first
      const columnsOrder = ['aboutFile', ...Object.keys(filteredData).filter(k => k !== 'aboutFile')];
      const columns = columnsOrder.map(key => ({
        field: key,
        headerName: key,
        cellStyle: { whiteSpace: "normal" },
        autoHeight: true,
        cellRenderer: "customCellRenderer",
        flex: 1
      }));
  
      setRowData(rowData);
      setColumnDefs(columns);
    }
  }, [props.result, props.selectedFileQuestions, showQuestions]);
  

  const gridOptions = {
    getRowStyle: function (params) {
      // Check each field in the row to see if it contains a question
      for (const key of Object.keys(params.data)) {
        if (
          typeof params.data[key] === "string" &&
          params.data[key].startsWith("Q")
        ) {
          return { backgroundColor: "lightblue" };
        }
      }
    },
  };

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
  const toggleShowQuestions = () => {
    setShowQuestions(!showQuestions);
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
          <span>
            <button
              className={`text-indigo-500 bg-transparent border border-solid border-indigo-500 hover:bg-indigo-500 hover:text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`}
              type="button"
              onClick={toggleShowQuestions}
            >
              <input
                type="checkbox"
                className="form-checkbox text-indigo-600 mr-2"
                checked={showQuestions}
                onChange={toggleShowQuestions}
              />
              {showQuestions ? "Hide Questions" : "Show Questions"}
            </button>
          </span>
          {selectedPrompt === prompts[0].prompt_text && (
            <span className="mx-2">
              <input
                type="checkbox"
                id="includeExtraInfo"
                checked={includeExtraInfo}
                onChange={(e) => setIncludeExtraInfo(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="includeExtraInfo mx-2">Include Details</label>
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
              defaultColDef={defaultColDef}
              animateRows={true}
              readOnlyEdit={true}
              suppressClickEdit={true}
              gridOptions={gridOptions}
              components={{ customCellRenderer: CustomCellRenderer }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ExtractionResult;
