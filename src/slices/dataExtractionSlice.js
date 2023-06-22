import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  files: [],
  extractionResult: [],
  singleExtractionResult: [],
  selectedFile: '', 
  resetStore: false,
  processedFiles: [],
  isRefreshing: false,
  isSubmitted: false,
  message: '',
  status: false,
  progress: 0,
};
const DataExtractionSlice = createSlice({
  name: "DataExtraction",
  initialState,
  reducers: {
    setFileData(state, action) {
      state.files = action.payload.files;
    },
    setExtractionResult(state, action) {
      state.extractionResult = action.payload.extractionResult;
    },
    setSingleExtractionResult(state, action) {
      state.singleExtractionResult = action.payload.singleExtractionResult;
    },
    setProcessedFiles(state, action) {
      state.processedFiles = action.payload.processedFiles;
    },
    setIsRefreshing(state, action) {
      state.isRefreshing = action.payload.isRefreshing;
    },
    setFilesSubmitted(state, action) {
      state.isSubmitted = action.payload.isSubmitted;
    },
    setStatus(state, action) {
      state.status = action.payload.status;
      state.message = action.payload.message;
    },
    setSelectedFile(state, action) {
      state.selectedFile = action.payload.selectedFile;
    },
    setProgress(state, actions) {
      state.progress = actions.payload.progress
    },
    // resetProjectStore(state, action) {
    //   if (action.payload.resetStore) {
    //     return initialState;
    //   } else {
    //     return state;
    //   }
    // },
  },
});
export const dataExtractionState = (state) => state.DataExtraction;

export const dataExtractionActions = DataExtractionSlice.actions;

export default DataExtractionSlice.reducer;
