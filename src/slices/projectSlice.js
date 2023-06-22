import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  listOfProjects: [],
  selectedProject: "",
  resetStore: false,
  progress: 0
};
const ProjectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setListOfProjects(state, actions) {
      state.listOfProjects = actions.payload.listOfProjects;
    },
    setSelectedProject(state, actions) {
      state.selectedProject = actions.payload.selectedProject;
    },
    resetProjectStore(state, actions) {
      if (actions.payload.resetStore) {
        return initialState;
      } else {
        return state;
      }
    },
    setProgress(state, actions) {
      state.progress = actions.payload.progress
    }
  },
});
export const projectState = (state) => state.project;

export const ProjectActions = ProjectSlice.actions;

export default ProjectSlice.reducer;
