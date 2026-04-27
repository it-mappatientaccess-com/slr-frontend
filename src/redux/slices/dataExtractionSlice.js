import { createSlice } from "@reduxjs/toolkit";
import {
  generateExtractionResults,
  fetchBatchStatus,
  fetchProcessedFileNames,
  fetchExtractionFileResults,
  fetchPrompts,
  deletePdfData,
  fetchAllExtractionResults,
  deleteAllSEAResults,
  deletePrompt,
} from "../thunks/dataExtractionThunks";

const initialState = {
  files: [],
  extractionResult: [],
  singleExtractionResult: [],
  selectedFile: "",
  selectedFileId: null,
  processedFiles: [],
  isRefreshing: false,
  isSubmitted: false,
  message: "",
  status: false,
  taskId: null,
  taskStatus: null,
  prompts: [],
  selectedPrompt: null,
  includeAboutFile: false,
  extractionTaskId: null,
  isStopping: false,
  selectedFileQuestions: null,
  error: null,
  currentBatchID: null,
  totalFilesInBatch: 0,
  processedCount: 0,
  batchStatus: null,
  succeededCount: 0,
  failedCount: 0,
  pendingCount: 0,
  currentStageLabel: "",
  fileStatuses: {},
};

const areShallowEqualObjects = (currentValue = {}, nextValue = {}) => {
  const currentObject = currentValue || {};
  const nextObject = nextValue || {};

  if (currentObject === nextObject) return true;

  const currentKeys = Object.keys(currentObject);
  const nextKeys = Object.keys(nextObject);

  if (currentKeys.length !== nextKeys.length) return false;

  return currentKeys.every((key) => currentObject[key] === nextObject[key]);
};

const buildFileStatus = (existingStatus = {}, source = {}) => ({
  extraction_status:
    source.extraction_status ?? existingStatus.extraction_status ?? null,
  failure_code: source.failure_code ?? existingStatus.failure_code ?? null,
  failure_reason:
    source.failure_reason ?? existingStatus.failure_reason ?? null,
  extraction_engine:
    source.extraction_engine ?? existingStatus.extraction_engine ?? null,
});

const STATUSES_THAT_SHOULD_NOT_BECOME_CANCELLED = new Set([
  "succeeded",
  "completed",
  "failed",
]);
const PRESERVED_TERMINAL_STATUSES = new Set(["failed", "cancelled"]);
const CANCELLED_FILE_REASON =
  "Processing was cancelled before this file completed.";

const getIncomingExplicitFileId = (file = {}) =>
  file.file_id ?? file.fileId ?? file.id ?? null;

const getIncomingFileId = (file = {}, batchId, index) => {
  const fileName =
    file.file_name || file.fileName || file.filename || file.name || "file";
  const explicitFileId = getIncomingExplicitFileId(file);

  return (
    explicitFileId ?? `cancelled:${batchId}:${fileName}:${index}`
  );
};

const getIncomingFileName = (file = {}) =>
  file.file_name || file.fileName || file.filename || file.name || "";

const getFileStatusValue = (file = {}, fileStatuses = {}) =>
  file.extraction_status || fileStatuses[file.file_id]?.extraction_status;

const getBatchFileNameKey = (file = {}) =>
  file.batch_id && file.file_name ? `${file.batch_id}::${file.file_name}` : null;

const mergeProcessedFiles = (existingFiles, incomingFiles = [], batchId) => {
  if (!incomingFiles.length) {
    return existingFiles;
  }

  const processedFileMap = new Map(
    existingFiles.map((file, index) => [file.file_id, { file, index }]),
  );
  const nextFiles = [...existingFiles];
  let hasChanges = false;

  incomingFiles.forEach((file) => {
    if (!file?.file_id) return;

    const existingEntry = processedFileMap.get(file.file_id);
    const existingFile = existingEntry?.file || {};
    const nextFile = {
      ...existingFile,
      ...file,
      batch_id: file.batch_id || existingFile.batch_id || batchId || null,
    };

    if (!existingEntry) {
      nextFiles.push(nextFile);
      hasChanges = true;
      return;
    }

    if (!areShallowEqualObjects(existingEntry.file, nextFile)) {
      nextFiles[existingEntry.index] = nextFile;
      hasChanges = true;
    }
  });

  return hasChanges ? nextFiles : existingFiles;
};

const mergeFetchedProcessedFiles = (
  existingFiles = [],
  incomingFiles = [],
  fileStatuses = {},
) => {
  const incomingFileIds = new Set(
    incomingFiles
      .filter((file) => file?.file_id != null)
      .map((file) => String(file.file_id)),
  );
  const incomingBatchFileNames = new Set(
    incomingFiles.map(getBatchFileNameKey).filter(Boolean),
  );
  const preservedTerminalFiles = existingFiles.filter((file) => {
    const status = getFileStatusValue(file, fileStatuses);
    const batchFileNameKey = getBatchFileNameKey(file);

    return (
      PRESERVED_TERMINAL_STATUSES.has(status) &&
      !incomingFileIds.has(String(file.file_id)) &&
      (!batchFileNameKey || !incomingBatchFileNames.has(batchFileNameKey))
    );
  });

  return [...incomingFiles, ...preservedTerminalFiles];
};

const syncFileStatuses = (state, files = []) => {
  files.forEach((file) => {
    if (!file?.file_id) return;

    const hasStatusData =
      file.extraction_status ||
      file.failure_code ||
      file.failure_reason ||
      file.extraction_engine;

    if (!hasStatusData) return;

    const existingStatus = state.fileStatuses[file.file_id] || {};
    const nextStatus = buildFileStatus(existingStatus, file);

    if (!areShallowEqualObjects(existingStatus, nextStatus)) {
      state.fileStatuses[file.file_id] = nextStatus;
    }
  });
};

const getBatchCountValue = (incomingValue, existingValue = 0) => {
  if (incomingValue == null) return Number(existingValue ?? 0);

  const numericValue = Number(incomingValue);
  return Number.isFinite(numericValue)
    ? numericValue
    : Number(existingValue ?? 0);
};

const applyBatchStatusPayload = (state, payload) => {
  if (!payload) return;

  const incomingTotalFiles =
    payload.total_files == null ? null : Number(payload.total_files);
  const totalFiles =
    Number.isFinite(incomingTotalFiles) && incomingTotalFiles > 0
      ? incomingTotalFiles
      : Number(state.totalFilesInBatch ?? 0);
  const succeededCount = getBatchCountValue(
    payload.succeeded,
    state.succeededCount,
  );
  const failedCount = getBatchCountValue(payload.failed, state.failedCount);
  const processedCount = succeededCount + failedCount;
  const pendingCount = Math.max(totalFiles - processedCount, 0);

  state.currentBatchID = payload.batch_id || state.currentBatchID;
  state.batchStatus = payload.batch_status || state.batchStatus;
  state.totalFilesInBatch = totalFiles;
  state.succeededCount = succeededCount;
  state.failedCount = failedCount;
  state.processedCount = processedCount;
  state.pendingCount = pendingCount;
  state.currentStageLabel =
    state.batchStatus === "in_progress" ? state.currentStageLabel : "";

  if (Array.isArray(payload.files) && payload.files.length > 0) {
    const mergedProcessedFiles = mergeProcessedFiles(
      state.processedFiles,
      payload.files,
      payload.batch_id,
    );
    if (mergedProcessedFiles !== state.processedFiles) {
      state.processedFiles = mergedProcessedFiles;
    }
    syncFileStatuses(state, payload.files);
  }
};

const dataExtractionSlice = createSlice({
  name: "dataExtraction",
  initialState,
  reducers: {
    setSelectedFile(state, action) {
      state.selectedFile = action.payload;
    },
    clearSelectedExtractionResult(state) {
      state.extractionResult = [];
      state.selectedFile = "";
      state.selectedFileId = null;
      state.selectedFileQuestions = null;
    },
    resetDataExtractionStore(state) {
      return initialState;
    },
    setIncludeAboutFile(state, action) {
      state.includeAboutFile = action.payload.includeAboutFile;
    },
    setIsStopping(state, action) {
      state.isStopping = action.payload.isStopping;
    },
    setSelectedPrompt(state, action) {
      state.selectedPrompt = action.payload.selectedPrompt;
    },
    setExtractionTaskId(state, action) {
      state.extractionTaskId = action.payload.extractionTaskId;
    },
    setIsRefreshing(state, action) {
      state.isRefreshing = action.payload.isRefreshing;
    },
    setIsSubmitted(state, action) {
      state.isSubmitted = action.payload.isSubmitted;
    },
    setMessage(state, action) {
      state.message = action.payload.message;
    },
    setStatus(state, action) {
      state.status = action.payload.status;
    },
    handlePromptDeletion(state, action) {
      const { promptTitle } = action.payload;
      state.prompts = state.prompts.filter(
        (prompt) => prompt.prompt_title !== promptTitle,
      );
      if (state.selectedPrompt === promptTitle) {
        state.selectedPrompt =
          state.prompts.length > 0 ? state.prompts[0].prompt_text : null;
      }
    },
    setCurrentBatchID: (state, action) => {
      state.currentBatchID = action.payload;
    },
    setTotalFilesInBatch: (state, action) => {
      state.totalFilesInBatch = action.payload;
    },
    setProcessedCount: (state, action) => {
      state.processedCount = action.payload;
    },
    setProcessedFiles: (state, action) => {
      state.processedFiles = action.payload;
      syncFileStatuses(state, action.payload);
    },
    appendProcessedFile: (state, action) => {
      const processedFile = action.payload;
      const fileIndex = state.processedFiles.findIndex(
        (file) => file.file_id === processedFile.file_id,
      );
      const isNewFile = fileIndex < 0;
      const existingFile =
        fileIndex >= 0 ? state.processedFiles[fileIndex] : null;
      const nextProcessedFile = {
        ...(existingFile || {}),
        ...processedFile,
      };

      if (fileIndex >= 0) {
        if (!areShallowEqualObjects(existingFile, nextProcessedFile)) {
          state.processedFiles[fileIndex] = nextProcessedFile;
        }
      } else {
        state.processedFiles.push(nextProcessedFile);
      }

      dataExtractionSlice.caseReducers.updateFileStatus(state, {
        payload: processedFile,
      });

      if (processedFile.processed_count != null) {
        state.processedCount = Number(processedFile.processed_count);
      } else if (isNewFile) {
        state.processedCount += 1;
      }

      if (processedFile.total_files != null) {
        const incomingTotalFiles = Number(processedFile.total_files);
        if (Number.isFinite(incomingTotalFiles) && incomingTotalFiles > 0) {
          state.totalFilesInBatch = incomingTotalFiles;
        }
      }
    },
    upsertCancelledBatchFiles: (state, action) => {
      const { batchId, files = [] } = action.payload || {};
      if (!batchId || !Array.isArray(files) || files.length === 0) return;

      files.forEach((file, index) => {
        const fileName = getIncomingFileName(file).trim();
        if (!fileName) return;

        const explicitFileId = getIncomingExplicitFileId(file);
        const existingIndex =
          explicitFileId != null
            ? state.processedFiles.findIndex(
                (existingFile) =>
                  String(existingFile.file_id) === String(explicitFileId),
              )
            : state.processedFiles.findIndex(
                (existingFile) =>
                  existingFile.batch_id === batchId &&
                  existingFile.file_name === fileName,
              );

        if (existingIndex >= 0) {
          const existingFile = state.processedFiles[existingIndex];
          const existingStatus =
            existingFile.extraction_status ||
            state.fileStatuses[existingFile.file_id]?.extraction_status;

          if (STATUSES_THAT_SHOULD_NOT_BECOME_CANCELLED.has(existingStatus)) {
            return;
          }

          const nextFile = {
            ...existingFile,
            extraction_status: "cancelled",
            failure_reason:
              existingFile.failure_reason ||
              state.fileStatuses[existingFile.file_id]?.failure_reason ||
              CANCELLED_FILE_REASON,
          };
          state.processedFiles[existingIndex] = nextFile;
          dataExtractionSlice.caseReducers.updateFileStatus(state, {
            payload: nextFile,
          });
          return;
        }

        const fileId = String(getIncomingFileId(file, batchId, index));
        const cancelledFile = {
          ...file,
          file_id: fileId,
          file_name: fileName,
          batch_id: batchId,
          extraction_status: "cancelled",
          failure_reason: file.failure_reason || CANCELLED_FILE_REASON,
        };

        state.processedFiles.push(cancelledFile);
        dataExtractionSlice.caseReducers.updateFileStatus(state, {
          payload: cancelledFile,
        });
      });
    },
    setBatchStatus: (state, action) => {
      state.batchStatus = action.payload;
      if (action.payload !== "in_progress") {
        state.currentStageLabel = "";
      }
    },
    setSucceededCount: (state, action) => {
      state.succeededCount = action.payload;
    },
    setFailedCount: (state, action) => {
      state.failedCount = action.payload;
    },
    setPendingCount: (state, action) => {
      state.pendingCount = action.payload;
    },
    setCurrentStageLabel: (state, action) => {
      state.currentStageLabel = action.payload;
    },
    updateFileStatus: (state, action) => {
      const fileId = action.payload.file_id || action.payload.fileId;
      if (!fileId) return;

      const existingStatus = state.fileStatuses[fileId] || {};
      const nextStatus = buildFileStatus(existingStatus, action.payload);

      if (!areShallowEqualObjects(existingStatus, nextStatus)) {
        state.fileStatuses[fileId] = nextStatus;
      }
    },
    resetBatchData: (state) => {
      state.currentBatchID = null;
      state.totalFilesInBatch = 0;
      state.processedCount = 0;
      state.batchStatus = null;
      state.succeededCount = 0;
      state.failedCount = 0;
      state.pendingCount = 0;
      state.currentStageLabel = "";
      localStorage.removeItem("currentBatchID");
      localStorage.removeItem("totalFilesInBatch");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateExtractionResults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(generateExtractionResults.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload?.message || "";
      })
      .addCase(generateExtractionResults.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
      })
      .addCase(fetchProcessedFileNames.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProcessedFileNames.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.processedFiles = mergeFetchedProcessedFiles(
          state.processedFiles,
          action.payload,
          state.fileStatuses,
        );
        syncFileStatuses(state, state.processedFiles);

        if (
          state.selectedFileId &&
          !state.processedFiles.some(
            (file) => String(file.file_id) === String(state.selectedFileId),
          )
        ) {
          state.extractionResult = [];
          state.selectedFile = "";
          state.selectedFileId = null;
          state.selectedFileQuestions = null;
        }
      })
      .addCase(fetchProcessedFileNames.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
      })
      .addCase(fetchBatchStatus.pending, () => {
        // Background batch-status polling should not toggle the generic loading flag.
      })
      .addCase(fetchBatchStatus.fulfilled, (state, action) => {
        applyBatchStatusPayload(state, action.payload);
      })
      .addCase(fetchBatchStatus.rejected, (state, action) => {
        if (action.meta.arg?.showToast) {
          state.status = "failed";
          state.message = action.payload;
        }
      })
      .addCase(fetchExtractionFileResults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchExtractionFileResults.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.extractionResult = action.payload.results;
        state.selectedFile = action.payload.file_name;
        state.selectedFileId = action.meta.arg.file_id;
        state.selectedFileQuestions = action.payload.questions;
      })
      .addCase(fetchExtractionFileResults.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
      })
      .addCase(fetchPrompts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.prompts = action.payload;
        if (!state.selectedPrompt && state.prompts.length > 0) {
          state.selectedPrompt = state.prompts[0].prompt_text;
        }
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
      })
      .addCase(deletePrompt.fulfilled, (state, action) => {
        dataExtractionSlice.caseReducers.handlePromptDeletion(state, action);
      })
      .addCase(deletePdfData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deletePdfData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.files = state.files.filter(
          (file) => file.id !== action.payload.id,
        );
        const deletedFileId = action.meta.arg;
        state.processedFiles = state.processedFiles.filter(
          (file) => String(file.file_id) !== String(deletedFileId),
        );
        delete state.fileStatuses[deletedFileId];
      })
      .addCase(deletePdfData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchAllExtractionResults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllExtractionResults.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(fetchAllExtractionResults.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteAllSEAResults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteAllSEAResults.fulfilled, (state) => {
        state.status = "succeeded";
        state.processedFiles = [];
        state.fileStatuses = {};
        state.extractionResult = [];
        state.selectedFile = "";
        state.selectedFileId = null;
        state.selectedFileQuestions = null;
      })
      .addCase(deleteAllSEAResults.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedFile,
  clearSelectedExtractionResult,
  resetDataExtractionStore,
  setIncludeAboutFile,
  setIsStopping,
  setSelectedPrompt,
  setExtractionTaskId,
  setIsRefreshing,
  setIsSubmitted,
  setMessage,
  setStatus,
  handlePromptDeletion,
  setCurrentBatchID,
  setTotalFilesInBatch,
  setProcessedCount,
  setProcessedFiles,
  appendProcessedFile,
  upsertCancelledBatchFiles,
  setBatchStatus,
  setSucceededCount,
  setFailedCount,
  setPendingCount,
  setCurrentStageLabel,
  updateFileStatus,
  resetBatchData,
} = dataExtractionSlice.actions;

export default dataExtractionSlice.reducer;
