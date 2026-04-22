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

const waitForDelay = (delayMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

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
      message:
        "All files failed to process. Check individual file errors below.",
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

const OUTCOME_COUNT_CHIPS = [
  {
    key: "started",
    label: "Started",
    iconClassName: "fas fa-play",
    activeClassName: "text-lightBlue-600 bg-lightBlue-200",
  },
  {
    key: "rejected_duplicates",
    label: "Already completed",
    iconClassName: "fas fa-check-circle",
    activeClassName: "text-emerald-600 bg-emerald-200",
  },
  {
    key: "joined",
    label: "Already in progress",
    iconClassName: "fas fa-spinner",
    activeClassName: "text-amber-600 bg-amber-200",
  },
];

const OUTCOME_DETAIL_GROUPS = [
  {
    key: "duplicates",
    title: "Already completed",
    accentClassName: "text-emerald-600",
    chipClassName: "text-emerald-600 bg-emerald-200",
    iconClassName: "fas fa-check-circle",
    getSummaryMessage: (items) => {
      const reason = items.find((item) => item?.reason)?.reason;

      return reason
        ? reason
        : "Identical extraction results already exist for these files.";
    },
  },
  {
    key: "joined_inflight",
    title: "Already in progress",
    accentClassName: "text-amber-600",
    chipClassName: "text-amber-600 bg-amber-200",
    iconClassName: "fas fa-spinner",
    getSummaryMessage: (items) => {
      const reason = items.find((item) => item?.reason)?.reason;

      return reason
        ? reason
        : "Matching extraction requests are already being processed.";
    },
  },
];

const FILE_NAME_PREVIEW_LIMIT = 4;
const LARGE_LIST_THRESHOLD = 12;

const getPreviewFiles = (items = []) =>
  items.reduce((accumulator, item, index) => {
    if (typeof item?.file_name !== "string" || !item.file_name.trim()) {
      return accumulator;
    }

    accumulator.push({
      ...item,
      previewKey: item?.file_id || `${item.file_name}-${index}`,
    });

    return accumulator;
  }, []);

const DetailGroup = ({
  title,
  accentClassName,
  chipClassName,
  iconClassName,
  summary,
  items,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewFiles = getPreviewFiles(items);
  const totalCount = previewFiles.length;

  if (totalCount === 0) return null;

  const collapsedVisibleCount = Math.min(totalCount, FILE_NAME_PREVIEW_LIMIT);
  const visibleFiles = isExpanded
    ? previewFiles
    : previewFiles.slice(0, collapsedVisibleCount);
  const hiddenCount = totalCount - collapsedVisibleCount;
  const canToggle = hiddenCount > 0;
  const isLargeList = totalCount >= LARGE_LIST_THRESHOLD;

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center">
        <p className="mr-2 text-sm font-semibold text-blueGray-700">
          <i className={`${iconClassName} ${accentClassName} mr-2`}></i>
          {title}
        </p>
        <span
          className={`text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-2 last:mr-0 ${accentClassName} bg-white border border-blueGray-200`}
        >
          {totalCount} file{totalCount === 1 ? "" : "s"}
        </span>
        <p className="flex-1 min-w-0 text-xs text-blueGray-500">{summary}</p>
      </div>

      <div
        className={`mt-2 flex flex-wrap ${
          isExpanded && isLargeList
            ? "max-h-40 overflow-y-auto rounded border border-blueGray-200 bg-blueGray-50 p-2"
            : ""
        }`}
      >
        {visibleFiles.map((item) => (
          <span
            key={item.previewKey}
            className={`text-xs font-semibold inline-block py-1 px-2 rounded mr-1 mb-1 last:mr-0 ${chipClassName}`}
            title={item.file_name}
          >
            <span className="inline-block max-w-xs truncate align-bottom">
              {item.file_name}
            </span>
          </span>
        ))}
        {canToggle && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 mb-1 last:mr-0 text-blueGray-600 bg-blueGray-200 hover:bg-blueGray-300"
          >
            <i
              className={`fas ${
                isExpanded ? "fa-chevron-up" : "fa-chevron-down"
              } mr-1`}
            ></i>
            {isExpanded ? "Show less" : `${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
};

const UploadOutcomeSummary = ({ outcome }) => {
  if (!outcome) return null;

  const {
    message,
    counts,
    started_files: startedFiles = [],
    duplicates = [],
    joined_inflight: joinedInFlight = [],
  } = outcome;

  const hasAnyFiles =
    startedFiles.length > 0 ||
    duplicates.length > 0 ||
    joinedInFlight.length > 0;

  if (!message && !hasAnyFiles) return null;

  const startedCount = counts?.started ?? startedFiles.length;
  const duplicateCount = counts?.rejected_duplicates ?? duplicates.length;
  const joinedCount = counts?.joined ?? joinedInFlight.length;
  const hasOnlyNewlyStartedFiles =
    startedCount > 0 && duplicateCount === 0 && joinedCount === 0;

  if (hasOnlyNewlyStartedFiles) return null;

  const countChips = OUTCOME_COUNT_CHIPS.map((chip) => ({
    ...chip,
    value:
      chip.key === "started"
        ? startedCount
        : chip.key === "rejected_duplicates"
          ? duplicateCount
          : joinedCount,
  }));

  const showProgressClarifier =
    startedCount > 0 && (duplicateCount > 0 || joinedCount > 0);

  const detailGroups = OUTCOME_DETAIL_GROUPS.map((group) => ({
    ...group,
    items: outcome[group.key] || [],
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mt-6 rounded border border-blueGray-200 bg-white shadow-sm">
      <div className="flex flex-col px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start mb-2 lg:mb-0 lg:mr-4">
          <i className="fas fa-layer-group text-lightBlue-500 mt-1 mr-3"></i>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center">
              <p className="mr-2 text-xs font-semibold uppercase tracking-wider text-blueGray-500">
                Upload Summary
              </p>
              {showProgressClarifier && (
                <span className="text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 last:mr-0 text-lightBlue-600 bg-lightBlue-200">
                  Newly started files are tracked below
                </span>
              )}
            </div>
            {message && (
              <p className="mt-1 text-sm text-blueGray-600">{message}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center lg:ml-auto lg:shrink-0 lg:justify-end">
          {countChips.map((chip) => {
            const isActive = chip.value > 0;

            return (
              <span
                key={chip.key}
                className={`text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 last:mr-0 ${
                  isActive
                    ? chip.activeClassName
                    : "text-blueGray-500 bg-blueGray-200"
                }`}
              >
                <i className={`${chip.iconClassName} mr-1`}></i>
                <span className="tabular-nums">{chip.value}</span> {chip.label}
              </span>
            );
          })}
        </div>
      </div>

      {detailGroups.length > 0 && (
        <div className="divide-y divide-blueGray-100 border-t border-blueGray-200 bg-blueGray-50">
          {detailGroups.map(
            ({
              key,
              title,
              accentClassName,
              chipClassName,
              iconClassName,
              getSummaryMessage,
              items,
            }) => (
              <DetailGroup
                key={key}
                title={title}
                accentClassName={accentClassName}
                chipClassName={chipClassName}
                iconClassName={iconClassName}
                summary={getSummaryMessage(items)}
                items={items}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadOutcome, setUploadOutcome] = useState(null);

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
  const isInteractionDisabled = isBatchActive || isSubmitting;
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
  const sseUrl = normalizedBaseUrl
    ? `${normalizedBaseUrl}/stream-progress`
    : "";

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

  const reconcileBatchStateUntilTerminal = useCallback(
    async (
      batchId = currentBatchID,
      { maxAttempts = 6, retryDelayMs = 1000 } = {},
    ) => {
      if (!batchId) return null;

      let latestResult = null;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        latestResult = await dispatch(
          fetchBatchStatus({ batchId, showToast: false }),
        );

        if (!fetchBatchStatus.fulfilled.match(latestResult)) {
          return latestResult;
        }

        if (TERMINAL_BATCH_STATUSES.has(latestResult.payload?.batch_status)) {
          return latestResult;
        }

        if (attempt < maxAttempts - 1) {
          await waitForDelay(retryDelayMs);
        }
      }

      return latestResult;
    },
    [currentBatchID, dispatch],
  );

  const refreshProcessedFiles = useCallback(() => {
    return dispatch(fetchProcessedFileNames());
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

  const attachToBatchState = useCallback(
    ({
      batchId,
      taskId,
      totalFiles = 0,
      stageLabel = "Processing files...",
    }) => {
      dispatch(setCurrentBatchID(batchId));
      dispatch(setBatchStatus("in_progress"));
      dispatch(setTotalFilesInBatch(totalFiles));
      dispatch(setProcessedCount(0));
      dispatch(setSucceededCount(0));
      dispatch(setFailedCount(0));
      dispatch(setPendingCount(Math.max(totalFiles, 0)));
      dispatch(setCurrentStageLabel(stageLabel));
      dispatch(setExtractionTaskId({ extractionTaskId: taskId || null }));
    },
    [dispatch],
  );

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
          dispatch(
            setPendingCount(Math.max(totalFiles - succeeded - failed, 0)),
          );
          dispatch(setCurrentStageLabel(""));
          dispatch(
            fetchBatchStatus({ batchId: currentBatchID, showToast: false }),
          );
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
      [
        "batch_started",
        "stage_update",
        "file_processed",
        "batch_completed",
      ].forEach((eventName) => {
        sse.addEventListener(eventName, parseEventPayload);
      });
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
      await dispatch(
        fetchBatchStatus({ batchId: currentBatchID, showToast: false }),
      );
    };

    pollBatchStatus();
    const intervalId = window.setInterval(pollBatchStatus, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [batchStatus, currentBatchID, dispatch]);

  /**
   * Toggle the "Include AboutFile" checkbox
   */
  const toggleIncludeAboutFile = () => {
    if (isInteractionDisabled) return;
    dispatch(setIncludeAboutFile({ includeAboutFile: !includeAboutFile }));
  };

  /**
   * Clear local FilePond + Graph picks
   */
  const clearFiles = () => {
    if (isInteractionDisabled) return;
    setFiles([]);
    setGraphFiles([]);
    setUploadOutcome(null);
  };

  /**
   * Merge newly selected items from GraphFilePicker
   */
  const handleFilesSelected = useCallback((newlySelected) => {
    setGraphFiles((prev) => {
      const merged = [...prev];
      for (const item of newlySelected) {
        const itemIdentifier = item.graphId || item.id;
        const alreadyExists = merged.some(
          (existing) => (existing.graphId || existing.id) === itemIdentifier,
        );
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
    if (isInteractionDisabled) return;

    const newBatchID = generateUniqueBatchID();
    const totalFiles = files.length + graphFiles.length;

    if (totalFiles === 0) {
      notify("No files selected!", "warning");
      return;
    }

    setIsSubmitting(true);
    setUploadOutcome(null);

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

      if (response.meta.requestStatus !== "fulfilled") {
        clearActiveBatchState();
        return;
      }

      const outcome = response.payload;
      const startedCount = outcome?.counts?.started ?? 0;
      const joinedCount = outcome?.counts?.joined ?? 0;
      const responseBatchId = outcome?.batch_id || null;
      const responseTaskId = outcome?.task_id || null;

      setUploadOutcome(outcome);

      if (startedCount > 0 && responseBatchId) {
        attachToBatchState({
          batchId: responseBatchId,
          taskId: responseTaskId,
          totalFiles: startedCount,
          stageLabel: "Starting extraction...",
        });
      } else if (startedCount === 0 && joinedCount > 0 && responseBatchId) {
        attachToBatchState({
          batchId: responseBatchId,
          taskId: responseTaskId,
          totalFiles: 0,
          stageLabel: "Attaching to existing extraction...",
        });
        await dispatch(
          fetchBatchStatus({ batchId: responseBatchId, showToast: false }),
        );
      } else {
        clearActiveBatchState();
      }

      await refreshProcessedFiles();
    } catch (error) {
      clearActiveBatchState();
      console.error("onProcessFile error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * User clicks "Stop"
   */
  const onStopClickedHandler = async () => {
    dispatch(setIsStopping({ isStopping: true }));

    try {
      const response = await dispatch(
        stopExtraction({ taskId: extractionTaskId, batchId: currentBatchID }),
      );

      const stopSucceeded =
        response.meta.requestStatus === "fulfilled" &&
        response.payload?.status === "success";

      if (!stopSucceeded) {
        return;
      }

      dispatch(setCurrentStageLabel("Finalizing cancellation..."));
      stopSseRetriesRef.current = true;

      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      closeSseConnection();

      const batchStatusResponse =
        await reconcileBatchStateUntilTerminal(currentBatchID);
      const finalBatchStatus =
        batchStatusResponse &&
        fetchBatchStatus.fulfilled.match(batchStatusResponse)
          ? batchStatusResponse.payload?.batch_status
          : null;

      if (!TERMINAL_BATCH_STATUSES.has(finalBatchStatus)) {
        dispatch(setBatchStatus("cancelled"));
        dispatch(setCurrentStageLabel(""));
      }
    } finally {
      dispatch(setIsStopping({ isStopping: false }));
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
              disabled={isInteractionDisabled}
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

          <div className="relative">
            <FilePond
              files={files}
              onupdatefiles={setFiles}
              disabled={isInteractionDisabled}
              allowMultiple
              maxFiles={100}
              name="file"
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span> 
                  <br/> (MAX FILES: 100, MAX FILESIZE: 30MB) 
                  <br/>Allowed file types: PDF, XPS, EPUB, MOBI, SVG, TXT, PPT, DOCX, XLSX, CSV'
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
                    !hasSelectedFiles || isInteractionDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={onProcessFile}
                  disabled={!hasSelectedFiles || isInteractionDisabled}
                >
                  <i
                    className={`fas ${isSubmitting ? "fa-spinner fa-spin" : "fa-play"}`}
                  ></i>{" "}
                  {isSubmitting ? "Submitting..." : "Generate Results"}
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
                      isInteractionDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={clearFiles}
                    disabled={isInteractionDisabled}
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
                      isInteractionDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={toggleIncludeAboutFile}
                    disabled={isInteractionDisabled}
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox text-indigo-600 mr-2"
                      checked={includeAboutFile}
                      disabled={isInteractionDisabled}
                      onChange={toggleIncludeAboutFile}
                    />
                    Include AboutFile
                  </button>
                </div>
              )}
            </div>

            <UploadOutcomeSummary outcome={uploadOutcome} />

            {showProgressBar && (
              <div className="mt-6 rounded border border-blueGray-200 bg-blueGray-50 px-4 py-4 shadow-sm">
                <ProgressBar
                  taskInProgress={`Progress: ${processedCount} of ${totalFilesInBatch} files processed`}
                  percentage={displayProgress}
                  status={batchStatus}
                  scrollIntoViewOnMount={batchStatus === "in_progress"}
                />
                <div className="mt-3 flex flex-wrap items-center">
                  <span className="text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 mb-1 last:mr-0 text-blueGray-600 bg-blueGray-200">
                    <i className="fas fa-check mr-1"></i>
                    {processedCount} processed
                  </span>
                  <span className="text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 mb-1 last:mr-0 text-blueGray-600 bg-blueGray-200">
                    <i className="fas fa-hourglass-half mr-1"></i>
                    {Math.max(pendingCount, 0)} remaining
                  </span>
                  {failedCount > 0 && (
                    <span className="text-xs font-semibold inline-block py-1 px-2 rounded uppercase mr-1 mb-1 last:mr-0 text-red-600 bg-red-200">
                      <i className="fas fa-circle-xmark mr-1"></i>
                      {failedCount} failed
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-blueGray-600">
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
