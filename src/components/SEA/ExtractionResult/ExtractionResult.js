import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ExtractionResult.css";
import { Tooltip } from "react-tooltip";
import { useSelector } from "react-redux";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// For full Markdown support:
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * A custom cell renderer that:
 * 1. Minimizes excessive blank lines.
 * 2. Renders multiline Markdown, supporting GFM, raw HTML, etc.
 */
const CustomCellRenderer = (props) => {
  const value = props.value || "";
  if (typeof value !== "string") {
    return <div>{value}</div>;
  }

  /**
   * 1) Collapse any 3+ consecutive newlines to exactly 2
   * 2) Trim leading/trailing blank lines
   */
  const collapsedValue = value
    // Remove leading blank lines
    .replace(/^\s*\n+/, "")
    // Remove trailing blank lines
    .replace(/\n+\s*$/, "")
    // Collapse 3+ consecutive newlines into exactly 2
    .replace(/\n{3,}/g, "\n\n");

  /**
   * Split into lines by single `\n`, trim the end of each line, 
   * and filter out any completely empty lines.
   */
  const lines = collapsedValue
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "");

  return (
    <div style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
      {lines.map((line, idx) => (
        <ReactMarkdown
          key={idx}
          // GitHub-Flavored Markdown
          remarkPlugins={[remarkGfm]}
          // Allow raw HTML (only if you trust the source!)
          rehypePlugins={[rehypeRaw]}
          // Provide actual text content to <a> for accessibility
          components={{
            a: ({ children, ...rest }) => (
              <a target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
              </a>
            ),
          }}
        >
          {line}
        </ReactMarkdown>
      ))}
    </div>
  );
};

const ExtractionResult = (props) => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);
  const [includeExtraInfo, setIncludeExtraInfo] = useState(false);

  // Toggling questions
  const [showQuestions, setShowQuestions] = useState(true);

  const selectedPrompt = useSelector((state) => state.dataExtraction.selectedPrompt);
  const prompts = useSelector((state) => state.dataExtraction.prompts);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash: true,
    }),
    []
  );

  useEffect(() => {
    if (!Array.isArray(props.result) || !props.result.length) return;

    let parsedQuestions = {};
    try {
      parsedQuestions = JSON.parse(props.selectedFileQuestions);
    } catch (error) {
      console.error("Failed to parse selectedFileQuestions", error);
      return;
    }

    // Prepare an object mapping each column key => array of text lines
    const columnDataMap = {};
    Object.keys(parsedQuestions).forEach((key) => {
      columnDataMap[key] = [];
    });

    // Populate Q/A data for each relevant column
    props.result.forEach((resultItem) => {
      Object.keys(resultItem).forEach((key) => {
        if (parsedQuestions.hasOwnProperty(key)) {
          const answers = resultItem[key];
          const questions = parsedQuestions[key];
          if (answers && questions) {
            answers.forEach((answer, index) => {
              const question = questions[index] || "Question not available";
              // We store question + answer pairs
              columnDataMap[key].push(`Q${index + 1}: ${question}`);
              columnDataMap[key].push(answer);
            });
          }
        }
      });
    });

    // Convert columnDataMap into rowData for AG Grid
    const newRowData = [];
    const maxLength = Math.max(
      ...Object.values(columnDataMap).map((col) => col.length)
    );

    for (let i = 0; i < maxLength; i++) {
      const row = {};
      Object.keys(columnDataMap).forEach((key) => {
        const cellContent = columnDataMap[key][i] || "";
        if (typeof cellContent === "string") {
          // Show questions if toggled on; else hide lines that start with 'Q'
          if (showQuestions || (!showQuestions && !cellContent.startsWith("Q"))) {
            row[key] = cellContent;
          }
        } else {
          // Non-string data, always show if showQuestions is on
          if (showQuestions) {
            row[key] = cellContent;
          }
        }
      });

      // Only add row if it has visible content
      if (Object.keys(row).length > 0) {
        newRowData.push(row);
      }
    }

    // If 'aboutFile' column exists, place it first
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
      cellRenderer: "customCellRenderer", // Our Markdown renderer
      flex: 1,
    }));

    setRowData(newRowData);
    setColumnDefs(columns);
  }, [props.result, props.selectedFileQuestions, showQuestions]);

  // Row styling (lightblue background if a cell starts with "Q")
  const gridOptions = {
    getRowStyle: (params) => {
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

  /**
   * Minimal bold detection for Excel exports. 
   * If you want more comprehensive Markdown->Excel, 
   * you'd need a richer parser.
   */
  const formatCellContent = (text, worksheet, rowNumber, colIndex) => {
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

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

    worksheet.getRow(rowNumber).getCell(colIndex + 1).value = { richText: parts };
  };

  // Export to Excel via ExcelJS
  const onBtnExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    // Add column headers
    const headers = columnDefs.map((colDef) => colDef.headerName);
    worksheet.addRow(headers);

    // Add data
    rowData.forEach((row, rowIndex) => {
      columnDefs.forEach((colDef, colIndex) => {
        const cellValue = row[colDef.field] || "";
        const cell = worksheet.getRow(rowIndex + 2).getCell(colIndex + 1);

        if (typeof cellValue === "string" && cellValue.includes("**")) {
          formatCellContent(cellValue, worksheet, rowIndex + 2, colIndex);
        } else {
          cell.value = cellValue;
        }

        cell.alignment = { wrapText: true };
        worksheet.getColumn(colIndex + 1).width = 30; // Adjust column width
      });
    });

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${props.fileName}_export.xlsx`);
  };

  const toggleShowQuestions = () => setShowQuestions((prev) => !prev);

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
              className="text-indigo-500 bg-transparent border border-solid border-indigo-500 hover:bg-indigo-500 hover:text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
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

          {selectedPrompt === prompts[1]?.prompt_text && (
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

      <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg">
        <div className="flex-auto p-4">
          <div className="ag-theme-alpine" style={{ height: "80vh" }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows={true}
              readOnlyEdit={true}
              suppressClickEdit={true}
              gridOptions={gridOptions}
              components={{
                customCellRenderer: CustomCellRenderer,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractionResult;
