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
  deletePrompt
} from "../thunks/dataExtractionThunks";

const initialState = {
  files: [],
  extractionResult: [],
  singleExtractionResult: [],
  selectedFile: '',
  selectedFileId: null,
  processedFiles: [],
  isRefreshing: false,
  isSubmitted: false,
  message: '',
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

const mergeProcessedFiles = (existingFiles, incomingFiles = [], batchId) => {
  const processedFileMap = new Map(
    existingFiles.map((file) => [file.file_id, file]),
  );

  incomingFiles.forEach((file) => {
    if (!file?.file_id) return;

    const existingFile = processedFileMap.get(file.file_id) || {};
    processedFileMap.set(file.file_id, {
      ...existingFile,
      ...file,
      batch_id: file.batch_id || existingFile.batch_id || batchId || null,
    });
  });

  return Array.from(processedFileMap.values());
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

    state.fileStatuses[file.file_id] = {
      ...(state.fileStatuses[file.file_id] || {}),
      extraction_status:
        file.extraction_status ||
        state.fileStatuses[file.file_id]?.extraction_status ||
        null,
      failure_code:
        file.failure_code ??
        state.fileStatuses[file.file_id]?.failure_code ??
        null,
      failure_reason:
        file.failure_reason ??
        state.fileStatuses[file.file_id]?.failure_reason ??
        null,
      extraction_engine:
        file.extraction_engine ??
        state.fileStatuses[file.file_id]?.extraction_engine ??
        null,
    };
  });
};

const getBatchCountValue = (incomingValue, existingValue = 0) => {
  if (incomingValue == null) return Number(existingValue ?? 0);

  const numericValue = Number(incomingValue);
  return Number.isFinite(numericValue) ? numericValue : Number(existingValue ?? 0);
};

const applyBatchStatusPayload = (state, payload) => {
  if (!payload) return;

  const incomingTotalFiles = payload.total_files == null
    ? null
    : Number(payload.total_files);
  const totalFiles =
    Number.isFinite(incomingTotalFiles) && incomingTotalFiles > 0
      ? incomingTotalFiles
      : Number(state.totalFilesInBatch ?? 0);
  const succeededCount = getBatchCountValue(
    payload.succeeded,
    state.succeededCount,
  );
  const failedCount = getBatchCountValue(payload.failed, state.failedCount);
  const inProgressCount = getBatchCountValue(payload.in_progress, 0);
  const processedCount = succeededCount + failedCount;
  const pendingCount = Math.max(
    totalFiles - processedCount - Math.max(inProgressCount, 0),
    0,
  );

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
    state.processedFiles = mergeProcessedFiles(
      state.processedFiles,
      payload.files,
      payload.batch_id,
    );
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
      state.prompts = state.prompts.filter(prompt => prompt.prompt_title !== promptTitle);
      if (state.selectedPrompt === promptTitle) {
        state.selectedPrompt = state.prompts.length > 0 ? state.prompts[0].prompt_text : null;
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

      if (fileIndex >= 0) {
        state.processedFiles[fileIndex] = {
          ...state.processedFiles[fileIndex],
          ...processedFile,
        };
      } else {
        state.processedFiles.push(processedFile);
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

      state.fileStatuses[fileId] = {
        ...(state.fileStatuses[fileId] || {}),
        extraction_status:
          action.payload.extraction_status ??
          state.fileStatuses[fileId]?.extraction_status ??
          null,
        failure_code:
          action.payload.failure_code ??
          state.fileStatuses[fileId]?.failure_code ??
          null,
        failure_reason:
          action.payload.failure_reason ??
          state.fileStatuses[fileId]?.failure_reason ??
          null,
        extraction_engine:
          action.payload.extraction_engine ??
          state.fileStatuses[fileId]?.extraction_engine ??
          null,
      };
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
        state.extractionResult = action.payload;
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
        state.processedFiles = action.payload;
        syncFileStatuses(state, action.payload);

        if (
          state.selectedFileId &&
          !action.payload.some((file) => file.file_id === state.selectedFileId)
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
      .addCase(fetchBatchStatus.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchBatchStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        applyBatchStatusPayload(state, action.payload);
      })
      .addCase(fetchBatchStatus.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
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
        state.status = 'loading';
      })
      .addCase(deletePdfData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.files = state.files.filter(file => file.id !== action.payload.id);
      })
      .addCase(deletePdfData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchAllExtractionResults.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllExtractionResults.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(fetchAllExtractionResults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteAllSEAResults.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteAllSEAResults.fulfilled, (state) => {
        state.status = 'succeeded';
        state.extractionResult = [];
        state.selectedFile = "";
        state.selectedFileId = null;
        state.selectedFileQuestions = null;
      })
      .addCase(deleteAllSEAResults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedFile,
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
  setBatchStatus,
  setSucceededCount,
  setFailedCount,
  setPendingCount,
  setCurrentStageLabel,
  updateFileStatus,
  resetBatchData
} = dataExtractionSlice.actions;

export default dataExtractionSlice.reducer;
