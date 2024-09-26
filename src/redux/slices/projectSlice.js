import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "util/api";
import { toast } from "react-toastify";
import { setProgress } from "./loadingSlice";

// Async thunk for fetching projects
export const fetchProjectsData = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(70));
      const response = await api.get("/project", {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Projects fetched successfully");
      return response.data.data; // Ensure this includes 'id' and 'shared_with'
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to fetch projects";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for updating a project
export const setProjectsData = createAsyncThunk(
  "projects/setProjectsData",
  async ({ projectId, projectName, newDescription }, { dispatch, rejectWithValue }) => {
    const data = {
      projectDescription: newDescription,
    };
    try {
      dispatch(setProgress(30));
      await api.put(`/project/${projectId}`, data, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Project updated successfully");
      dispatch(fetchProjectsData());
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to update project";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);


// Async thunk for deleting a project
export const deleteProjectData = createAsyncThunk(
  "projects/deleteProject",
  async (projectId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      await api.delete(`/project/${projectId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Project deleted successfully");
      dispatch(fetchProjectsData());
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to delete project";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Add new thunks for sharing and unsharing projects
export const shareProject = createAsyncThunk(
  "projects/shareProject",
  async ({ projectId, sharedWith }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      await api.post(
        `/project/${projectId}/share`,
        { shared_with: sharedWith },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      toast.success("Project shared successfully");
      dispatch(fetchProjectsData()); // Refresh project list
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.detail || "Failed to share project";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

export const unshareProject = createAsyncThunk(
  "projects/unshareProject",
  async ({ projectId, removeUsers }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      await api.post(
        `/project/${projectId}/unshare`,
        { remove_users: removeUsers },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      toast.success("Users removed from shared project successfully");
      dispatch(fetchProjectsData()); // Refresh project list
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.detail || "Failed to unshare project";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

const projectSlice = createSlice({
  name: "project",
  initialState: {
    listOfProjects: [],
    selectedProject: "",
    currentProjectId: null,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    setSelectedProject(state, action) {
      state.selectedProject = action.payload;
    },
    setCurrentProjectId(state, action) { // New reducer
      state.currentProjectId = action.payload;
    },
    resetProjectStore(state) {
      state.listOfProjects = [];
      state.selectedProject = "";
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectsData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProjectsData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.listOfProjects = action.payload;
      })
      .addCase(fetchProjectsData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(setProjectsData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(setProjectsData.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(setProjectsData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteProjectData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteProjectData.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(deleteProjectData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(shareProject.pending, (state) => {
        state.status = "loading";
      })
      .addCase(shareProject.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(shareProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(unshareProject.pending, (state) => {
        state.status = "loading";
      })
      .addCase(unshareProject.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(unshareProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setSelectedProject, setCurrentProjectId, resetProjectStore } = projectSlice.actions;

export default projectSlice.reducer;
