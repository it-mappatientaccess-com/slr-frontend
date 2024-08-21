import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ExtractionResult.css";
import { Tooltip } from "react-tooltip";
import { useSelector } from "react-redux";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
    if (!Array.isArray(props.result) || !props.result.length) {
      return;
    }

    let parsedQuestions = {};
    try {
      parsedQuestions = JSON.parse(props.selectedFileQuestions);
    } catch (error) {
      console.error("Failed to parse selectedFileQuestions", error);
      return;
    }

    let columnDataMap = {};
    // Initialize column data map for all keys found in selectedFileQuestions
    Object.keys(parsedQuestions).forEach((key) => {
      columnDataMap[key] = [];
    });

    // Populate each column with the data
    props.result.forEach((resultItem) => {
      Object.keys(resultItem).forEach((key) => {
        if (parsedQuestions.hasOwnProperty(key)) {
          const answers = resultItem[key];
          const questions = parsedQuestions[key];
          if (answers && questions) {
            answers.forEach((answer, index) => {
              const question = questions[index] || "Question not available";
              columnDataMap[key].push(`Q${index + 1}: ${question}`);
              columnDataMap[key].push(answer);
            });
          }
        }
      });
    });

    // Filter rowData to handle show/hide questions correctly
    let rowData = [];
    const maxLength = Math.max(
      ...Object.values(columnDataMap).map((col) => col.length)
    );
    for (let i = 0; i < maxLength; i++) {
      let row = {};
      Object.keys(columnDataMap).forEach((key) => {
        let cellContent = columnDataMap[key][i] || "";
        if (typeof cellContent === "string") {
          if (
            showQuestions ||
            (!showQuestions && !cellContent.startsWith("Q"))
          ) {
            row[key] = cellContent;
          }
        } else {
          // Handle non-string cell content
          if (showQuestions) {
            row[key] = cellContent;
          }
        }
      });
      if (Object.keys(row).length > 0) {
        // Ensure row is not empty
        rowData.push(row);
      }
    }

    // Define column definitions, dynamically including 'aboutFile' if it exists
    const columnsOrder = columnDataMap.hasOwnProperty("aboutFile")
      ? [
          "aboutFile",
          ...Object.keys(columnDataMap).filter((key) => key !== "aboutFile"),
        ]
      : [...Object.keys(columnDataMap)];
    const columns = columnsOrder.map((key) => ({
      field: key,
      headerName: key,
      cellStyle: { whiteSpace: "normal" },
      autoHeight: true,
      cellRenderer: "customCellRenderer",
      flex: 1,
    }));

    setRowData(rowData);
    setColumnDefs(columns);
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

  // Helper function to parse markdown-like syntax and apply Excel formatting
  const formatCellContent = (text, worksheet, row, colIndex) => {
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    // Iterate over the markdown content and apply formatting
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index) });
      }
      parts.push({ text: match[1], font: { bold: true } });
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex) });
    }

    // Apply rich text formatting to the appropriate cell
    worksheet.getRow(row).getCell(colIndex + 1).value = { richText: parts };
  };

  // Enhanced Excel export function using ExcelJS
  const onBtnExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    // Add headers
    const headers = columnDefs.map((colDef) => colDef.headerName);
    worksheet.addRow(headers);

    // Add data with formatting
    rowData.forEach((row, rowIndex) => {
      columnDefs.forEach((colDef, colIndex) => {
        const cellValue = row[colDef.field] || "";
        const cell = worksheet.getRow(rowIndex + 2).getCell(colIndex + 1); // Offset by 2 for the header row

        if (typeof cellValue === "string" && cellValue.includes("**")) {
          // Apply rich text formatting for markdown-like syntax
          formatCellContent(cellValue, worksheet, rowIndex + 2, colIndex);
        } else {
          // If no markdown, just add plain text
          cell.value = cellValue;
        }

        // Apply cell styles
        cell.alignment = { wrapText: true };
        worksheet.getColumn(colIndex + 1).width = 30; // Adjust column width
      });
    });

    // Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${props.fileName}_export.xlsx`);
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
          {selectedPrompt === prompts[1].prompt_text && (
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
