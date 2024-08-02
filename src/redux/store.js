import { configureStore } from '@reduxjs/toolkit';
import questionAbstractReducer from './slices/questionAbstractSlice';
import rowReducer from './slices/rowSlice';
import dataExtractionReducer from './slices/dataExtractionSlice';
import userManagementReducer from './slices/userManagementSlice';
import projectReducer from './slices/projectSlice';
import loadingReducer from './slices/loadingSlice';

const store = configureStore({
  reducer: {
    loading: loadingReducer,
    userManagement: userManagementReducer,
    questionAbstractData: questionAbstractReducer,
    rows: rowReducer,
    project: projectReducer,
    dataExtraction: dataExtractionReducer,
  },
});

export default store;
