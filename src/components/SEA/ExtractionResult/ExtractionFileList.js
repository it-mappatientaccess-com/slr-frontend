import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useDispatch, useSelector } from "react-redux";
import {
  deletePdfData,
  fetchAllExtractionResults,
  deleteAllSEAResults,
  fetchExtractionFileResults,
  fetchProcessedFileNames,
} from "../../../redux/thunks/dataExtractionThunks";
import ExtractionResult from "./ExtractionResult";
import { Tooltip } from "react-tooltip";
import ModalSmall from "components/Modal/ModalSmall";

const btnCellRenderer = (props) => {
  const [deleteClicked, setDeleteClicked] = props.useState(false);
  const onViewResultsClickHandler = async () => {
    await props.dispatch(
      fetchExtractionFileResults({
        file_id: props.data["file_id"],
        projectName: localStorage.getItem("selectedProject"),
      })
    );

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
      await props.dispatch(deletePdfData(props.data["file_id"]));
      setDeleteClicked(false);
      props.dispatch(fetchProcessedFileNames());
    } catch (error) {
      // Handle error
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

const ExtractionFileList = () => {
  const dispatch = useDispatch();
  const processedFiles = useSelector(
    (state) => state.dataExtraction.processedFiles
  );
  const [rowData, setRowData] = useState([]);
  const gridRef = useRef(null);
  const selectedFileResult = useSelector(
    (state) => state.dataExtraction.extractionResult
  );
  const selectedFile = useSelector(
    (state) => state.dataExtraction.selectedFile
  );
  const selectedFileQuestions = useSelector((state) =>
    state.dataExtraction.selectedFileQuestions
  );
  const gridWrapperRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const columnDefs = [
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
  ];

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash: true,
    }),
    []
  );

  const fetchAllResults = async () => {
    const projectName = localStorage.getItem("selectedProject");
    await dispatch(fetchAllExtractionResults(projectName));
  };

  useEffect(() => {
    dispatch(fetchProcessedFileNames());
  }, [dispatch]);

  useEffect(() => {
    setRowData(processedFiles);
  }, [processedFiles]);

  const handleClearAllResults = async () => {
    const projectName = localStorage.getItem("selectedProject");
    const response = await dispatch(deleteAllSEAResults(projectName));
    setShowDeleteModal(false);
    dispatch(fetchProcessedFileNames());
    if (response.status === 200) {
      setRowData([]);
    }
  };

  return (
    <>
      {processedFiles.length !== 0 && (
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
              />
            </div>
            <div className="text-center mt-4">
              <Tooltip id="export-all-btn-tooltip" />
              <button
                className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={fetchAllResults}
                data-tooltip-id="export-all-btn-tooltip"
                data-tooltip-html="Export results of all processed files in Excel format. <br /> <small> Note: If different prompts were used for various files,</br> the structure of the exported Excel file may vary.</small>"
                data-tooltip-place="bottom"
                data-tooltip-delay-show="2000"
              >
                <i className="fas fa-file-export"></i> Export All
              </button>
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
      )}

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
