import { createSlice } from "@reduxjs/toolkit";
import {
  generateExtractionResults,
  fetchProcessedFileNames,
  fetchExtractionFileResults,
  fetchPrompts,
  deletePdfData,
  fetchAllExtractionResults,
  deleteAllSEAResults,
} from "../thunks/dataExtractionThunks";

const initialState = {
  files: [],
  extractionResult: [],
  singleExtractionResult: [],
  selectedFile: '',
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
      })
      .addCase(fetchProcessedFileNames.rejected, (state, action) => {
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
        try {
          state.selectedFileQuestions = JSON.parse(action.payload.questions);
        } catch (error) {
          state.selectedFileQuestions = null;
        }
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
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.status = "failed";
        state.message = action.payload;
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
      .addCase(fetchAllExtractionResults.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.extractionResult = action.payload;
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
} = dataExtractionSlice.actions;

export default dataExtractionSlice.reducer;
