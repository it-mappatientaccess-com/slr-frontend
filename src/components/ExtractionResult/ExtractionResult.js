import React, { useRef, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ExtractionResult.css";

const CustomCellRenderer = (props) => {
  const value = props.value || ""; 
  // default to an empty string if props.value is undefined
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
      const columnsOrder = [
        "aboutFile",
        "studyDesign",
        "population",
        "intervention",
        "outcomes",
      ]; // add here the order you want
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
    const params = {
      columnKeys: columnDefs.map((colDef) => colDef.field),
      fileName: props.fileName + "_export.csv",
      processCellCallback: (params) => {
        // Check if the cell's value is a string and contains 'Answer:'
        if (
          typeof params.value === "string" &&
          params.value.includes("Answer:")
        ) {
          // Split the string into sections by "Answer:"
          const sections = params.value.split("Answer:");
          // For each section, split at "Direct quote", trim, and remove empty strings
          const answers = sections
            .slice(1)
            .map((section) => {
              return section.split("Direct Quote", 1)[0].trim();
            })
            .filter(Boolean);
          // Join the answers together with "; " and return the result
          return answers.join("\n");
        }
        // If the value isn't a string or doesn't contain 'Answer:', leave it as is
        return params.value;
      },
    };
    gridRef.current.api.exportDataAsCsv(params);
  };

  return (
    <div>
      <h5 className="text-2xl font-normal leading-normal mt-0 mb-2 text-lightBlue-800">
        Filename: {props.fileName}
        <button
          className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 float-right"
          type="button"
          onClick={onBtnExport}
        >
          <i className="fas fa-file-export"></i> Export
        </button>
      </h5>
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
