import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  listOfProjects: [],
  selectedProject: "",
  resetStore: false,
  progress: 0,
  error: null // Adding error state
};

const ProjectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setListOfProjects(state, action) {
      state.listOfProjects = action.payload.listOfProjects;
    },
    setSelectedProject(state, action) {
      state.selectedProject = action.payload.selectedProject;
    },
    resetProjectStore(state, action) {
      if (action.payload.resetStore) {
        return initialState;
      } else {
        return state;
      }
    },
    setProgress(state, action) {
      state.progress = action.payload.progress;
    },
    setError(state, action) { // Adding error reducer
      state.error = action.payload.error;
    },
    clearError(state) { // Adding clear error reducer
      state.error = null;
    }
  },
});

export const projectState = (state) => state.project;

export const ProjectActions = ProjectSlice.actions;

export default ProjectSlice.reducer;
