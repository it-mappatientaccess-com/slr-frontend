import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useDispatch, useSelector } from "react-redux";
import {
  deletePdfData,
  fetchAllExtractionResults,
  deleteAllSEAResults,
  exportAllResultsDocx,
  fetchExtractionFileResults,
  fetchProcessedFileNames,
} from "../../../redux/thunks/dataExtractionThunks";
import ExtractionResult from "./ExtractionResult";
import { Tooltip } from "react-tooltip";
import ModalSmall from "components/Modal/ModalSmall";

const btnCellRenderer = (props) => {
  const [deleteClicked, setDeleteClicked] = props.useState(false);
  const onViewResultsClickHandler = async () => {
    const response = await props.dispatch(
      fetchExtractionFileResults({
        file_id: props.data["file_id"],
        projectName: localStorage.getItem("selectedProject"),
      }),
    );

    if (response.meta.requestStatus !== "fulfilled") return;

    const topPosition =
      props.gridWrapperRef.current.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: topPosition,
      behavior: "smooth",
    });
  };

  const onDeleteHandler = async () => {
    setDeleteClicked(true);
    try {
      const response = await props.dispatch(deletePdfData(props.data["file_id"]));
      if (response.meta.requestStatus === "fulfilled") {
        props.dispatch(fetchProcessedFileNames());
      }
    } catch (error) {
      // Handle error
    } finally {
      setDeleteClicked(false);
    }
  };

  return (
    <>
      <button
        className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button"
        data-action="update"
        onClick={onViewResultsClickHandler}
      >
        View Results <i className="fas fa-binoculars"></i>
      </button>
      <button
        className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button"
        onClick={onDeleteHandler}
      >
        <i className={`fas fa-trash-can ${deleteClicked ? "fa-flip" : ""}`}></i>
      </button>
    </>
  );
};

const dateKeys = [
  "processed_at",
  "processedAt",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
  "timestamp",
  "processed_on",
  "processedOn",
  "uploaded_at",
  "uploadedAt",
  "upload_time",
  "uploadTime",
];

const getSortTimestamp = (file) => {
  for (const key of dateKeys) {
    const value = file?.[key];
    if (value == null) continue;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
};

const sortProcessedFiles = (files) => {
  const withMeta = files.map((file, index) => {
    const timestamp = getSortTimestamp(file);
    const idNum = Number(file?.file_id);
    return {
      file,
      index,
      timestamp,
      idNum: Number.isFinite(idNum) ? idNum : null,
    };
  });

  return withMeta
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null) {
        return b.timestamp - a.timestamp;
      }
      if (a.timestamp !== null) return -1;
      if (b.timestamp !== null) return 1;
      if (a.idNum !== null && b.idNum !== null) {
        return b.idNum - a.idNum;
      }
      return b.index - a.index;
    })
    .map((entry) => entry.file);
};

const ExtractionFileList = () => {
  const dispatch = useDispatch();
  const processedFiles = useSelector(
    (state) => state.dataExtraction.processedFiles,
  );
  const [rowData, setRowData] = useState([]);
  const prevFileIdsRef = useRef("");
  const gridRef = useRef(null);
  const selectedFileResult = useSelector(
    (state) => state.dataExtraction.extractionResult,
  );
  const selectedFile = useSelector(
    (state) => state.dataExtraction.selectedFile,
  );
  const selectedFileQuestions = useSelector(
    (state) => state.dataExtraction.selectedFileQuestions,
  );
  const gridWrapperRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExportingAllDocx, setIsExportingAllDocx] = useState(false);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "ID",
        valueGetter: "node.rowIndex + 1",
        width: 80,
      },
      {
        field: "file_name",
        headerName: "File Name",
        suppressSizeToFit: true,
        flex: 3,
        filter: true,
        editable: false,
      },
      {
        headerName: "Action",
        cellRenderer: btnCellRenderer,
        cellRendererParams: {
          dispatch,
          useState,
          gridWrapperRef,
        },
        editable: false,
        colId: "view",
        flex: 1,
      },
    ],
    [dispatch],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash: true,
    }),
    [],
  );

  const fetchAllResults = async () => {
    await dispatch(fetchAllExtractionResults());
  };

  const onExportAllDocx = async () => {
    if (isExportingAllDocx) return;

    setIsExportingAllDocx(true);
    try {
      await dispatch(exportAllResultsDocx());
    } finally {
      setIsExportingAllDocx(false);
    }
  };

  useEffect(() => {
    dispatch(fetchProcessedFileNames());
  }, [dispatch]);

  useEffect(() => {
    const currentIds = processedFiles
      .map((f) => f.file_id)
      .sort()
      .join(",");
    if (currentIds === prevFileIdsRef.current) return;
    prevFileIdsRef.current = currentIds;
    setRowData(sortProcessedFiles(processedFiles));
  }, [processedFiles]);

  const handleClearAllResults = async () => {
    const response = await dispatch(deleteAllSEAResults());
    setShowDeleteModal(false);
    if (response.meta.requestStatus === "fulfilled") {
      dispatch(fetchProcessedFileNames());
      setRowData([]);
    }
  };

  return (
    <>
      {/* {processedFiles.length !== 0 && ( */}
      <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg">
        <div className="flex-auto p-4">
          <div
            ref={gridWrapperRef}
            className={`ag-theme-alpine h-screen`}
            style={{ height: 320 }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows={true}
              readOnlyEdit={true}
              suppressClickEdit={true}
              paginationAutoPageSize={true}
              pagination={true}
              suppressScrollOnNewData={true}
            />
          </div>
          <div className="text-center mt-4">
            <Tooltip id="export-all-btn-tooltip" />
            <span className="inline-flex flex-wrap justify-center gap-2">
              <button
                className="text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                style={{ backgroundColor: "#185C37" }}
                type="button"
                onClick={fetchAllResults}
                data-tooltip-id="export-all-btn-tooltip"
                data-tooltip-html="Export results of all processed files in Excel format. <br /> <small>Note: If different prompts were used for various files, the structure of the exported Excel file may vary.</small>"
                data-tooltip-place="bottom"
                data-tooltip-delay-show="2000"
              >
                <i className="fas fa-file-export"></i> Export All to xlsx
              </button>
              <button
                className="text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1A5CBD" }}
                type="button"
                onClick={onExportAllDocx}
                disabled={isExportingAllDocx}
                data-tooltip-id="export-all-btn-tooltip"
                data-tooltip-content="Download results of all processed files in Word format"
                data-tooltip-place="bottom"
                data-tooltip-delay-show="2000"
              >
                <i
                  className={`fas ${
                    isExportingAllDocx ? "fa-spinner fa-spin" : "fa-file-export"
                  }`}
                ></i>{" "}
                Export All to docx
              </button>
            </span>
            {rowData.length > 2 && (
              <button
                className="bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                data-tooltip-id="action-btn-tooltip"
                data-tooltip-content="Click to clear all generated results"
              >
                <i className="fas fa-eraser"></i> Clear All Results
              </button>
            )}
          </div>
        </div>
      </div>
      {/* )} */}

      {selectedFile && (
        <ExtractionResult
          result={selectedFileResult}
          fileName={selectedFile}
          selectedFileQuestions={selectedFileQuestions}
        />
      )}
      {showDeleteModal && (
        <ModalSmall
          title="Confirm Deletion"
          content="This will delete the generated results for all pdf files, are you sure?"
          secondaryButtonText="No, Close"
          primaryButtonText="Yes, Delete"
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onPrimaryClick={() => handleClearAllResults()}
          colorClasses="bg-red-500 text-white active:bg-red-600"
        />
      )}
    </>
  );
};

export default ExtractionFileList;
