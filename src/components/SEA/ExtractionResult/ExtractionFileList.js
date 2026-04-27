import React, { useRef, useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
  deletePdfData,
  fetchAllExtractionResults,
  deleteAllSEAResults,
  exportAllResultsDocx,
  fetchExtractionFileResults,
  fetchProcessedFileNames,
} from "../../../redux/thunks/dataExtractionThunks";
import { clearSelectedExtractionResult } from "../../../redux/slices/dataExtractionSlice";
import ExtractionResult from "./ExtractionResult";
import { Tooltip } from "react-tooltip";
import ModalSmall from "components/Modal/ModalSmall";
import { ERROR_MESSAGES, getErrorMessage } from "util/errorMessages";

const ACTIVE_BATCH_STATUS = "in_progress";
const CANCELLED_BATCH_STATUS = "cancelled";
const PENDING_LIKE_STATUSES = new Set(["pending", "in_progress"]);
const VIEWABLE_STATUSES = new Set(["succeeded", "completed"]);
const NON_RETRYABLE_FAILURE_CODES = new Set([
  "PASSWORD_PROTECTED",
  "CORRUPTED_FILE",
  "UNSUPPORTED_FILE_TYPE",
]);

const normalizeExtractionStatus = (status) =>
  status === "completed" ? "succeeded" : status;

const isViewableExtractionStatus = (status) =>
  VIEWABLE_STATUSES.has(normalizeExtractionStatus(status));

const getFailureDisplayDetails = ({
  status,
  failureCode,
  failureReason,
}) => {
  const normalizedStatus = normalizeExtractionStatus(status);

  if (normalizedStatus !== "failed" && normalizedStatus !== "cancelled") {
    return null;
  }

  const trimmedFailureReason = failureReason?.trim();
  const hasKnownFailureCode = failureCode && ERROR_MESSAGES[failureCode];
  const mappedMessage =
    normalizedStatus === "failed" && hasKnownFailureCode
      ? getErrorMessage(failureCode)
      : "";
  const message =
    mappedMessage ||
    trimmedFailureReason ||
    (normalizedStatus === "cancelled"
      ? "Processing was cancelled before this file completed."
      : getErrorMessage(failureCode));
  const secondaryReason =
    trimmedFailureReason && trimmedFailureReason !== message
      ? trimmedFailureReason
      : "";
  const retryHint =
    normalizedStatus === "cancelled"
      ? "Run extraction again to process this file."
      : NON_RETRYABLE_FAILURE_CODES.has(failureCode)
        ? "Fix the file issue before retrying."
        : "You can retry after checking this file.";

  return {
    message,
    secondaryReason,
    retryHint,
  };
};

const btnCellRenderer = (props) => {
  const [deleteClicked, setDeleteClicked] = props.useState(false);
  const canViewResults = isViewableExtractionStatus(
    props.data?.extraction_status,
  );
  const onViewResultsClickHandler = async () => {
    if (!canViewResults) return;

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
      const response = await props.dispatch(
        deletePdfData(props.data["file_id"]),
      );
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
        className={`bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
          canViewResults ? "" : "opacity-40 cursor-not-allowed"
        }`}
        type="button"
        data-action="update"
        onClick={onViewResultsClickHandler}
        disabled={!canViewResults}
        title={
          canViewResults
            ? "View extraction results"
            : "Results are available only for completed files"
        }
      >
        View <i className="fas fa-binoculars"></i>
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

const escapeTooltipHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getStatusBadgeConfig = (status) => {
  switch (normalizeExtractionStatus(status)) {
    case "succeeded":
      return {
        label: "Completed",
        className: "bg-emerald-100 text-emerald-700",
        iconClass: "fas fa-check-circle",
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-red-100 text-red-700",
        iconClass: "fas fa-circle-xmark",
      };
    case "in_progress":
      return {
        label: "Processing",
        className: "bg-blueGray-100 text-blueGray-700",
        iconClass: "fas fa-spinner fa-spin",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-amber-100 text-amber-700",
        iconClass: "fas fa-ban",
      };
    default:
      return {
        label: "Pending",
        className: "bg-blueGray-100 text-blueGray-700",
        iconClass: "fas fa-clock",
      };
  }
};

const getResolvedExtractionStatus = ({
  file,
  fileStatus,
  currentBatchID,
  batchStatus,
}) => {
  const explicitStatus = fileStatus?.extraction_status || file?.extraction_status;
  const isCurrentBatchFile =
    Boolean(currentBatchID) &&
    Boolean(file?.batch_id) &&
    file.batch_id === currentBatchID;

  if (
    batchStatus === CANCELLED_BATCH_STATUS &&
    isCurrentBatchFile &&
    PENDING_LIKE_STATUSES.has(explicitStatus)
  ) {
    return "cancelled";
  }

  if (explicitStatus) return explicitStatus;

  if (fileStatus?.failure_code || fileStatus?.failure_reason) {
    return "failed";
  }

  if (!currentBatchID) {
    return "succeeded";
  }

  if (!isCurrentBatchFile) {
    return "succeeded";
  }

  return batchStatus === ACTIVE_BATCH_STATUS ? "pending" : "succeeded";
};

const statusCellRenderer = (params) => {
  const status = params.data?.extraction_status || "pending";
  const { label, className, iconClass } = getStatusBadgeConfig(status);
  const failureCode = params.data?.failure_code;
  const failureReason = params.data?.failure_reason;
  const tooltipId = `file-status-${params.data?.file_id}`;
  const failureDetails = getFailureDisplayDetails({
    status,
    failureCode,
    failureReason,
  });

  let tooltipHtml = "";
  if (failureDetails) {
    tooltipHtml = `<div class="max-w-xs text-left">
      <div class="font-semibold">${escapeTooltipHtml(
        failureDetails.message,
      )}</div>
      ${
        failureDetails.secondaryReason
          ? `<div class="mt-1 text-xs opacity-90">${escapeTooltipHtml(
              failureDetails.secondaryReason,
            )}</div>`
          : ""
      }
      <div class="mt-1 text-xs opacity-90">${escapeTooltipHtml(
        failureDetails.retryHint,
      )}</div>
    </div>`;
  }

  return (
    <>
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-none ${className}`}
        {...(tooltipHtml
          ? {
              "data-tooltip-id": tooltipId,
              "data-tooltip-html": tooltipHtml,
            }
          : {})}
      >
        <i className={`${iconClass} mr-1.5 text-[11px]`}></i>
        &nbsp;{label}
      </span>
      {tooltipHtml && (
        <Tooltip id={tooltipId} place="top" className="z-50 max-w-xs" />
      )}
    </>
  );
};

const reasonCellRenderer = (params) => {
  const failureDetails = getFailureDisplayDetails({
    status: params.data?.extraction_status,
    failureCode: params.data?.failure_code,
    failureReason: params.data?.failure_reason,
  });

  if (!failureDetails) {
    return <span className="text-blueGray-400">-</span>;
  }

  const tooltipId = `file-reason-${params.data?.file_id}`;
  const tooltipHtml = `<div class="max-w-sm text-left">
    <div class="font-semibold">${escapeTooltipHtml(
      failureDetails.message,
    )}</div>
    ${
      failureDetails.secondaryReason
        ? `<div class="mt-1 text-xs opacity-90">${escapeTooltipHtml(
            failureDetails.secondaryReason,
          )}</div>`
        : ""
    }
    <div class="mt-1 text-xs opacity-90">${escapeTooltipHtml(
      failureDetails.retryHint,
    )}</div>
  </div>`;

  return (
    <>
      <span
        className="inline-block max-w-xs truncate text-xs text-blueGray-600"
        data-tooltip-id={tooltipId}
        data-tooltip-html={tooltipHtml}
      >
        {failureDetails.message}
      </span>
      <Tooltip id={tooltipId} place="top" className="z-50 max-w-sm" />
    </>
  );
};

const ExtractionFileList = () => {
  const dispatch = useDispatch();
  const processedFiles = useSelector(
    (state) => state.dataExtraction.processedFiles,
  );
  const currentBatchID = useSelector(
    (state) => state.dataExtraction.currentBatchID,
  );
  const batchStatus = useSelector((state) => state.dataExtraction.batchStatus);
  const fileStatuses = useSelector(
    (state) => state.dataExtraction.fileStatuses,
    shallowEqual,
  );
  const gridRef = useRef(null);
  const getRowId = useMemo(() => (params) => params.data.file_id, []);
  const selectedFileResult = useSelector(
    (state) => state.dataExtraction.extractionResult,
  );
  const selectedFile = useSelector(
    (state) => state.dataExtraction.selectedFile,
  );
  const selectedFileId = useSelector(
    (state) => state.dataExtraction.selectedFileId,
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
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        width: 80,
        sortable: false,
        filter: false,
        suppressMenu: true,
      },
      {
        field: "file_name",
        headerName: "File Name",
        suppressSizeToFit: true,
        flex: 2.5,
        filter: true,
        editable: false,
      },
      {
        field: "extraction_status",
        headerName: "Status",
        flex: 0.8,
        filter: true,
        editable: false,
        cellRenderer: statusCellRenderer,
      },
      {
        field: "failure_reason",
        headerName: "Reason",
        flex: 1.2,
        filter: false,
        editable: false,
        cellRenderer: reasonCellRenderer,
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
        pinned: "right",
        lockPinned: true,
        minWidth: 180,
        width: 180,
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

  const rowData = useMemo(
    () =>
      sortProcessedFiles(processedFiles).map((file) => ({
        ...file,
        ...(fileStatuses[file.file_id] || {}),
        extraction_status: getResolvedExtractionStatus({
          file,
          fileStatus: fileStatuses[file.file_id],
          currentBatchID,
          batchStatus,
        }),
        failure_code:
          fileStatuses[file.file_id]?.failure_code ?? file.failure_code ?? null,
        failure_reason:
          fileStatuses[file.file_id]?.failure_reason ??
          file.failure_reason ??
          null,
      })),
    [batchStatus, currentBatchID, fileStatuses, processedFiles],
  );

  useEffect(() => {
    if (!selectedFileId) return;

    const selectedRow = rowData.find(
      (file) => String(file.file_id) === String(selectedFileId),
    );
    if (
      !selectedRow ||
      !isViewableExtractionStatus(selectedRow.extraction_status)
    ) {
      dispatch(clearSelectedExtractionResult());
    }
  }, [dispatch, rowData, selectedFileId]);

  const handleClearAllResults = async () => {
    const response = await dispatch(deleteAllSEAResults());
    setShowDeleteModal(false);
    if (response.meta.requestStatus === "fulfilled") {
      dispatch(fetchProcessedFileNames());
    }
  };

  return (
    <>
      {/* {processedFiles.length !== 0 && ( */}
      <div
        id="sea-step-4-results"
        className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg"
      >
        <div className="flex-auto p-4">
          <div
            ref={gridWrapperRef}
            className={`ag-theme-alpine h-screen`}
            style={{ height: 320 }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              getRowId={getRowId}
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
                className="text-white font-bold text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
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
                className="text-white font-bold text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="bg-red-500 text-white font-bold text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
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
