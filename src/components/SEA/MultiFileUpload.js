import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "authConfig";

import {
  appendProcessedFile,
  setBatchStatus,
  setCurrentBatchID,
  setCurrentStageLabel,
  setExtractionTaskId,
  setFailedCount,
  setIncludeAboutFile,
  setIsStopping,
  setPendingCount,
  setProcessedCount,
  setSucceededCount,
  setTotalFilesInBatch,
} from "../../redux/slices/dataExtractionSlice";
import {
  fetchBatchStatus,
  fetchProcessedFileNames,
  generateExtractionResults,
  stopExtraction,
} from "../../redux/thunks/dataExtractionThunks";

import ProgressBar from "components/ProgressBar/ProgressBar";
import BatchSummaryBanner from "components/SEA/BatchSummaryBanner";
import generateUniqueBatchID from "util/generateUUID";
import { Tooltip } from "react-tooltip";
import { notify } from "components/Notify/Notify";
import GraphFilePicker from "components/GraphFilePicker/GraphFilePicker";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const TERMINAL_BATCH_STATUSES = new Set([
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
]);

const STAGE_LABELS = {
  extraction_started: "Extracting document...",
  extraction_completed: "Extraction complete.",
  embedding_started: "Creating embeddings...",
  embedding_completed: "Embeddings complete.",
  qa_started: "Analyzing with AI...",
  qa_completed: "Analysis complete.",
};

const getStageLabel = (stage) => STAGE_LABELS[stage] || "Processing files...";

const getResolvedTotalFiles = (incomingTotalFiles, fallbackTotalFiles = 0) => {
  const numericTotalFiles = Number(incomingTotalFiles);
  if (Number.isFinite(numericTotalFiles) && numericTotalFiles > 0) {
    return numericTotalFiles;
  }

  return Number(fallbackTotalFiles ?? 0);
};

const getDisplayedProgress = ({
  batchStatus,
  actualProgress,
  processedCount,
  totalFilesInBatch,
}) => {
  if (TERMINAL_BATCH_STATUSES.has(batchStatus)) {
    return actualProgress;
  }

  if (batchStatus !== "in_progress" || totalFilesInBatch <= 0) {
    return actualProgress;
  }

  if (processedCount === 0) {
    return 12;
  }

  return Math.min(95, Math.max(actualProgress, 12));
};

const getCompletionNotification = ({
  batchStatus,
  totalFilesInBatch,
  succeededCount,
  failedCount,
  processedCount,
}) => {
  if (!TERMINAL_BATCH_STATUSES.has(batchStatus)) return null;

  if (batchStatus === "completed") {
    return {
      type: "success",
      message: `All ${totalFilesInBatch} files processed successfully.`,
    };
  }

  if (batchStatus === "partially_completed") {
    return {
      type: "warning",
      message: `${succeededCount} of ${totalFilesInBatch} files processed successfully. ${failedCount} files failed.`,
    };
  }

  if (batchStatus === "failed") {
    return {
      type: "error",
      message: "All files failed to process. Check individual file errors below.",
    };
  }

  if (batchStatus === "cancelled") {
    return {
      type: "info",
      message: `Extraction was cancelled. ${processedCount} of ${totalFilesInBatch} files were processed.`,
    };
  }

  return null;
};

/** Utility to pick an icon based on file extension */
function getFileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <i className="fa fa-file-pdf text-red-500" />;
    case "doc":
    case "docx":
      return <i className="fa fa-file-word text-lightBlue-600" />;
    case "xls":
    case "xlsx":
      return <i className="fa fa-file-excel text-emerald-600" />;
    case "ppt":
    case "pptx":
      return <i className="fa fa-file-powerpoint text-orange-400" />;
    case "txt":
      return <i className="fa fa-file-lines text-blueGray-400" />;
    default:
      return <i className="fa fa-file text-blueGray-500" />;
  }
}

registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginFileMetadata,
);

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const { instance, accounts } = useMsal();

  const [files, setFiles] = useState([]);
  const [graphFiles, setGraphFiles] = useState([]);

  const {
    batchStatus,
    currentBatchID,
    currentStageLabel,
    extractionTaskId,
    failedCount,
    includeAboutFile,
    isStopping,
    message,
    pendingCount,
    processedCount,
    selectedPrompt,
    status,
    succeededCount,
    totalFilesInBatch,
  } = useSelector((state) => state.dataExtraction);

  const isSubmittedVal = useSelector(
    (state) => state.dataExtraction.isSubmitted,
  );
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions,
  );

  const progress =
    totalFilesInBatch > 0 ? (processedCount / totalFilesInBatch) * 100 : 0;
  const displayProgress = getDisplayedProgress({
    batchStatus,
    actualProgress: progress,
    processedCount,
    totalFilesInBatch,
  });
  const showProgressBar = Boolean(
    currentBatchID && (batchStatus || totalFilesInBatch > 0),
  );
  const isBatchActive = batchStatus === "in_progress";
  const hasSelectedFiles = files.length > 0 || graphFiles.length > 0;

  const totalFilesRef = useRef(totalFilesInBatch);
  const previousBatchStatusRef = useRef(batchStatus);
  const sseRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const stopSseRetriesRef = useRef(false);

  useEffect(() => {
    totalFilesRef.current = totalFilesInBatch;
  }, [totalFilesInBatch]);

  const baseAPIUrl = process.env.REACT_APP_API_URL;
  const normalizedBaseUrl = baseAPIUrl ? baseAPIUrl.replace(/\/$/, "") : "";
  const sseUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/stream-progress` : "";

  const closeSseConnection = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  const reconcileBatchState = useCallback(
    async (batchId = currentBatchID) => {
      if (!batchId) return null;

      return dispatch(fetchBatchStatus({ batchId, showToast: false }));
    },
    [currentBatchID, dispatch],
  );

  const scrollToResults = useCallback(() => {
    const resultsSection = document.getElementById("sea-step-4-results");
    if (!resultsSection) return;

    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const refreshProcessedFiles = useCallback(() => {
    dispatch(fetchProcessedFileNames());
  }, [dispatch]);

  const clearActiveBatchState = useCallback(() => {
    dispatch(setCurrentBatchID(null));
    dispatch(setBatchStatus(null));
    dispatch(setTotalFilesInBatch(0));
    dispatch(setProcessedCount(0));
    dispatch(setSucceededCount(0));
    dispatch(setFailedCount(0));
    dispatch(setPendingCount(0));
    dispatch(setCurrentStageLabel(""));
    dispatch(setExtractionTaskId({ extractionTaskId: null }));
    localStorage.removeItem("currentBatchID");
    localStorage.removeItem("totalFilesInBatch");
  }, [dispatch]);

  /**
   * Acquire Graph Token
   */
  const getGraphToken = useCallback(async () => {
    try {
      if (!accounts || accounts.length === 0) return "";
      const resp = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: accounts[0],
      });
      return resp.accessToken;
    } catch (error) {
      console.warn("Could not acquire Graph token:", error);
      return "";
    }
  }, [instance, accounts]);

  /**
   * Restore any active batch and hydrate the Step 4 table.
   */
  useEffect(() => {
    let isMounted = true;

    const restoreBatchState = async () => {
      dispatch(fetchProcessedFileNames());

      const storedBatchID = localStorage.getItem("currentBatchID");
      const storedTotal = Number.parseInt(
        localStorage.getItem("totalFilesInBatch") || "0",
        10,
      );

      if (!storedBatchID) return;

      dispatch(setCurrentBatchID(storedBatchID));
      if (!Number.isNaN(storedTotal) && storedTotal > 0) {
        dispatch(setTotalFilesInBatch(storedTotal));
      }

      const result = await dispatch(
        fetchBatchStatus({ batchId: storedBatchID, showToast: false }),
      );

      if (!isMounted || !fetchBatchStatus.fulfilled.match(result)) return;

      if (result.payload?.batch_status === "in_progress") {
        dispatch(setCurrentStageLabel("Processing files..."));
      }
    };

    restoreBatchState();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!currentBatchID) {
      localStorage.removeItem("currentBatchID");
      return;
    }

    localStorage.setItem("currentBatchID", currentBatchID);
  }, [currentBatchID]);

  useEffect(() => {
    if (!currentBatchID) {
      localStorage.removeItem("totalFilesInBatch");
      return;
    }

    localStorage.setItem("totalFilesInBatch", String(totalFilesInBatch || 0));
  }, [currentBatchID, totalFilesInBatch]);

  /**
   * SSE subscription for the active batch with reconnection and reconciliation.
   */
  useEffect(() => {
    if (!currentBatchID || batchStatus !== "in_progress" || !sseUrl) {
      if (batchStatus !== "in_progress") {
        closeSseConnection();
        reconnectAttemptsRef.current = 0;
        stopSseRetriesRef.current = false;
      }
      return undefined;
    }

    let isDisposed = false;
    stopSseRetriesRef.current = false;

    const handlePayload = (payload) => {
      if (!payload || payload.batch_id !== currentBatchID) return;

      switch (payload.event) {
        case "batch_started": {
          const totalFiles = getResolvedTotalFiles(
            payload.total_files,
            totalFilesRef.current,
          );
          dispatch(setBatchStatus("in_progress"));
          dispatch(setTotalFilesInBatch(totalFiles));
          dispatch(setPendingCount(totalFiles));
          if (payload.task_id) {
            dispatch(
              setExtractionTaskId({ extractionTaskId: payload.task_id }),
            );
          }
          dispatch(setCurrentStageLabel("Starting extraction..."));
          return;
        }
        case "stage_update":
          dispatch(setCurrentStageLabel(getStageLabel(payload.stage)));
          return;
        case "file_processed":
          dispatch(appendProcessedFile(payload));
          return;
        case "batch_completed": {
          const succeeded = Number(payload.succeeded ?? 0);
          const failed = Number(payload.failed ?? 0);
          const totalFiles = getResolvedTotalFiles(
            payload.total_files,
            totalFilesRef.current || succeeded + failed,
          );

          dispatch(setBatchStatus(payload.batch_status || "completed"));
          dispatch(setSucceededCount(succeeded));
          dispatch(setFailedCount(failed));
          dispatch(setTotalFilesInBatch(totalFiles));
          dispatch(setProcessedCount(succeeded + failed));
          dispatch(setPendingCount(Math.max(totalFiles - succeeded - failed, 0)));
          dispatch(setCurrentStageLabel(""));
          dispatch(fetchBatchStatus({ batchId: currentBatchID, showToast: false }));
          refreshProcessedFiles();
          return;
        }
        default:
          return;
      }
    };

    const parseEventPayload = (event) => {
      if (!event?.data) return;

      try {
        const data = JSON.parse(event.data);
        handlePayload(data);
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    const openSseConnection = async (shouldReconcile = false) => {
      if (isDisposed || stopSseRetriesRef.current) return;

      if (shouldReconcile) {
        const result = await reconcileBatchState(currentBatchID);
        if (isDisposed) return;
        if (
          fetchBatchStatus.fulfilled.match(result) &&
          TERMINAL_BATCH_STATUSES.has(result.payload?.batch_status)
        ) {
          return;
        }
      }

      closeSseConnection();

      const sse = new EventSource(sseUrl);
      sseRef.current = sse;
      sse.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };
      sse.onmessage = parseEventPayload;
      ["batch_started", "stage_update", "file_processed", "batch_completed"].forEach(
        (eventName) => {
          sse.addEventListener(eventName, parseEventPayload);
        },
      );
      sse.onerror = () => {
        closeSseConnection();
        if (isDisposed) return;

        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > 5) {
          stopSseRetriesRef.current = true;
          return;
        }

        const delay = Math.min(
          1000 * 2 ** (reconnectAttemptsRef.current - 1),
          30000,
        );
        reconnectTimeoutRef.current = window.setTimeout(() => {
          openSseConnection(true);
        }, delay);
      };
    };

    openSseConnection();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      closeSseConnection();
    };
  }, [
    batchStatus,
    closeSseConnection,
    currentBatchID,
    dispatch,
    refreshProcessedFiles,
    reconcileBatchState,
    sseUrl,
  ]);

  /**
   * Poll batch-status while a batch is active. This is the guaranteed
   * source of truth even if SSE is unavailable or not visible in devtools.
   */
  useEffect(() => {
    if (!currentBatchID || TERMINAL_BATCH_STATUSES.has(batchStatus)) {
      return undefined;
    }

    let isActive = true;

    const pollBatchStatus = async () => {
      if (!isActive) return;
      await dispatch(fetchBatchStatus({ batchId: currentBatchID, showToast: false }));
    };

    pollBatchStatus();
    const intervalId = window.setInterval(pollBatchStatus, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [batchStatus, currentBatchID, dispatch, refreshProcessedFiles]);

  /**
   * Toggle the "Include AboutFile" checkbox
   */
  const toggleIncludeAboutFile = () => {
    if (isBatchActive) return;
    dispatch(setIncludeAboutFile({ includeAboutFile: !includeAboutFile }));
  };

  /**
   * Clear local FilePond + Graph picks
   */
  const clearFiles = () => {
    if (isBatchActive) return;
    setFiles([]);
    setGraphFiles([]);
  };

  /**
   * Merge newly selected items from GraphFilePicker
   */
  const handleFilesSelected = useCallback((newlySelected) => {
    setGraphFiles((prev) => {
      const merged = [...prev];
      for (const item of newlySelected) {
        const alreadyExists = merged.some((existing) => existing.name === item.name);
        if (!alreadyExists) merged.push(item);
      }
      return merged;
    });
  }, []);

  /**
   * Remove a single file from Graph picks
   */
  const removeSelectedFile = useCallback((fileId) => {
    setGraphFiles((prevFiles) =>
      prevFiles.filter((item) => item.id !== fileId),
    );
  }, []);

  const getRowId = (params) => params.data.id;
  const [graphColumnDefs] = useState(() => [
    {
      headerName: "Selected Files",
      field: "name",
      flex: 5,
      cellRenderer: (params) => {
        const icon = getFileIcon(params.value);
        return (
          <span className="flex items-center">
            <span className="mr-2 flex-shrink-0">{icon}</span>
            <span>{params.value}</span>
          </span>
        );
      },
    },
    {
      headerName: "Actions",
      flex: 1,
      cellRenderer: (params) => (
        <button
          className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
          type="button"
          onClick={() => removeSelectedFile(params.data.id)}
        >
          <i className="fas fa-trash"></i> Remove
        </button>
      ),
    },
  ]);

  /**
   * User clicks "Generate Results"
   */
  const onProcessFile = async () => {
    if (isBatchActive) return;

    const newBatchID = generateUniqueBatchID();
    const totalFiles = files.length + graphFiles.length;

    if (totalFiles === 0) {
      notify("No files selected!", "warning");
      return;
    }

    dispatch(setCurrentBatchID(newBatchID));
    dispatch(setBatchStatus("in_progress"));
    dispatch(setTotalFilesInBatch(totalFiles));
    dispatch(setProcessedCount(0));
    dispatch(setSucceededCount(0));
    dispatch(setFailedCount(0));
    dispatch(setPendingCount(totalFiles));
    dispatch(setCurrentStageLabel("Starting extraction..."));
    dispatch(setExtractionTaskId({ extractionTaskId: null }));

    localStorage.setItem("currentBatchID", newBatchID);
    localStorage.setItem("totalFilesInBatch", totalFiles.toString());

    try {
      const graphToken = await getGraphToken();
      const localFiles = files.map((file) => ({
        file: file.file,
        filename: file.file.name,
      }));

      const response = await dispatch(
        generateExtractionResults({
          localFiles,
          graphFiles,
          graphAccessToken: graphToken,
          questions: seaQuestions,
          newBatchID,
          selectedPrompt,
          includeAboutFile,
        }),
      );

      if (
        response.meta.requestStatus === "fulfilled" &&
        response.payload?.task_id
      ) {
        dispatch(
          setExtractionTaskId({ extractionTaskId: response.payload.task_id }),
        );
        return;
      }

      clearActiveBatchState();
    } catch (error) {
      clearActiveBatchState();
      console.error("onProcessFile error:", error);
    }
  };

  /**
   * User clicks "Stop"
   */
  const onStopClickedHandler = async () => {
    dispatch(setIsStopping({ isStopping: true }));

    const response = await dispatch(
      stopExtraction({ taskId: extractionTaskId, batchId: currentBatchID }),
    );

    const stopSucceeded =
      response.meta.requestStatus === "fulfilled" &&
      response.payload?.status === "success";

    if (!stopSucceeded) {
      return;
    }

    dispatch(setBatchStatus("cancelled"));
    dispatch(setCurrentStageLabel(""));
    const batchStatusResponse = await dispatch(
      fetchBatchStatus({ batchId: currentBatchID, showToast: false }),
    );

    if (
      fetchBatchStatus.fulfilled.match(batchStatusResponse) &&
      batchStatusResponse.payload?.batch_status === "in_progress"
    ) {
      dispatch(setBatchStatus("cancelled"));
    }
  };

  /**
   * Show toast if isSubmittedVal changes
   */
  useEffect(() => {
    if (isSubmittedVal) {
      notify(message, status ? "success" : "error");
    }
  }, [isSubmittedVal, status, message]);

  /**
   * Show terminal-state notifications once per status transition.
   */
  useEffect(() => {
    const previousBatchStatus = previousBatchStatusRef.current;

    if (
      currentBatchID &&
      previousBatchStatus &&
      previousBatchStatus !== batchStatus &&
      TERMINAL_BATCH_STATUSES.has(batchStatus)
    ) {
      const completionNotification = getCompletionNotification({
        batchStatus,
        totalFilesInBatch,
        succeededCount,
        failedCount,
        processedCount,
      });

      if (completionNotification) {
        notify(completionNotification.message, completionNotification.type);
      }
    }

    previousBatchStatusRef.current = batchStatus;
  }, [
    batchStatus,
    currentBatchID,
    failedCount,
    processedCount,
    succeededCount,
    totalFilesInBatch,
  ]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
      <div className="flex flex-wrap mt-4 p-4">
        <div className="w-full mb-12 px-4">
          <div className="mb-4">
            <GraphFilePicker
              onFilesSelected={handleFilesSelected}
              disabled={isBatchActive}
            />

            {graphFiles.length > 0 && (
              <div
                className="ag-theme-alpine mt-4"
                style={{ width: "100%", height: "300px" }}
              >
                <AgGridReact
                  rowData={graphFiles}
                  columnDefs={graphColumnDefs}
                  getRowId={getRowId}
                  animateRows={true}
                  pagination={true}
                  paginationAutoPageSize={true}
                  suppressClickEdit={true}
                />
              </div>
            )}
          </div>

          <div className="flex items-center py-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-3 text-gray-500">OR Upload your own files</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          <div className="relative">
            <FilePond
              files={files}
              onupdatefiles={setFiles}
              allowMultiple
              maxFiles={100}
              name="file"
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span> 
                  <br/> (MAX FILES: 100, MAX FILESIZE: 30MB) 
                  <br/>Allowed file types: PDF, XPS, EPUB, MOBI, FB2, CBZ, SVG, TXT, PPT, DOC, DOCX, XLS, XLSX, CSV'
              allowFileTypeValidation={true}
              acceptedFileTypes={[
                "application/pdf",
                "application/vnd.ms-xpsdocument",
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                "application/x-fictionbook+xml",
                "application/x-cbr",
                "image/svg+xml",
                "text/plain",
                "application/vnd.ms-powerpoint",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/csv",
              ]}
              allowFileSizeValidation={true}
              maxFileSize="30MB"
              credits={false}
              instantUpload={false}
              chunkUploads={true}
              chunkSize={5_000_000}
              maxParallelUploads={10}
            />

            <div className="flex flex-col lg:flex-row justify-between items-center mt-4 lg:items-end">
              <div className="flex flex-col lg:flex-row justify-center flex-grow lg:mb-0 mb-4">
                <Tooltip id="action-btn-tooltip" />

                <button
                  className={`bg-lightBlue-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg mr-1 mb-1 ${
                    !hasSelectedFiles || isBatchActive
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={onProcessFile}
                  disabled={!hasSelectedFiles || isBatchActive}
                >
                  <i className="fas fa-play"></i> Generate Results
                </button>

                {isBatchActive && showProgressBar && (
                  <button
                    className={`bg-red-500 text-white font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg mr-1 mb-1 ${
                      isStopping || !extractionTaskId ? "opacity-50" : ""
                    }`}
                    onClick={onStopClickedHandler}
                    disabled={isStopping || !extractionTaskId}
                    data-tooltip-id="action-btn-tooltip"
                    data-tooltip-content={
                      extractionTaskId
                        ? "Halt processing."
                        : "Stop becomes available once the extraction task starts."
                    }
                  >
                    <i
                      className={`fas fa-stop ${isStopping ? "fa-flip" : ""}`}
                    ></i>{" "}
                    {isStopping ? "Stopping..." : "Stop"}
                  </button>
                )}

                {hasSelectedFiles && (
                  <button
                    className={`bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg mr-1 mb-1 ${
                      isBatchActive ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={clearFiles}
                    disabled={isBatchActive}
                    data-tooltip-id="action-btn-tooltip"
                    data-tooltip-content="Clear all files."
                  >
                    <i className="fas fa-eraser"></i> Clear All
                  </button>
                )}
              </div>

              {hasSelectedFiles && (
                <div className="lg:absolute lg:right-0">
                  <button
                    className={`text-indigo-500 border border-indigo-500 hover:bg-indigo-500 hover:text-white font-bold uppercase text-xs px-4 py-2 rounded ${
                      isBatchActive ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={toggleIncludeAboutFile}
                    disabled={isBatchActive}
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox text-indigo-600 mr-2"
                      checked={includeAboutFile}
                      disabled={isBatchActive}
                      onChange={toggleIncludeAboutFile}
                    />
                    Include AboutFile
                  </button>
                </div>
              )}
            </div>

            {showProgressBar && (
              <div className="mt-6 rounded-xl border border-blueGray-200 bg-blueGray-50 px-4 py-4 shadow-sm">
                <ProgressBar
                  taskInProgress={`Progress: ${processedCount} of ${totalFilesInBatch} files processed`}
                  percentage={displayProgress}
                  status={batchStatus}
                  scrollIntoViewOnMount={batchStatus === "in_progress"}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-blueGray-600 border border-blueGray-200">
                    {processedCount} processed
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-blueGray-600 border border-blueGray-200">
                    {Math.max(pendingCount, 0)} remaining
                  </span>
                  {failedCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-red-700 border border-red-200">
                      {failedCount} failed
                    </span>
                  )}
                </div>
                <div className="mt-3 text-sm text-blueGray-600">
                  {batchStatus === "in_progress"
                    ? currentStageLabel || "Processing files..."
                    : "Final batch status received."}
                </div>
                {TERMINAL_BATCH_STATUSES.has(batchStatus) && (
                  <BatchSummaryBanner
                    status={batchStatus}
                    totalFiles={totalFilesInBatch}
                    succeededCount={succeededCount}
                    failedCount={failedCount}
                    processedCount={processedCount}
                    onViewResults={scrollToResults}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiFileUpload;
