import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "util/api";
import { toast } from "react-toastify";
import { setProgress } from "./loadingSlice";
// Async thunk for fetching users
export const fetchUsersData = createAsyncThunk(
  "userManagement/fetchUsers",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(70));
      const response = await api.get("/users", {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Users fetched successfully");
      return Object.entries(response.data).map((e) => e[1]);
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to fetch users";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for updating user details
export const setUsersData = createAsyncThunk(
  "userManagement/setUsersData",
  async ({ username, newDetails }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(30));
      const response = await api.put(`/users/${username}`, newDetails, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));

      if (response.data.status === 200) {
        toast.success(`User updated successfully: ${response.data.username}`);
        dispatch(fetchUsersData());
        return response.data;
      } else {
        const errorMsg = "Failed to update user.";
        toast.error(errorMsg);
        return rejectWithValue(errorMsg);
      }
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to update user";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for deleting user
export const deleteUserData = createAsyncThunk(
  "userManagement/deleteUser",
  async (username, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/users/${username}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("User deleted successfully");
      dispatch(fetchUsersData());
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to delete user";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// New async thunk for migrating emails
export const migrateEmailsData = createAsyncThunk(
  "userManagement/migrateEmailsData",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(30));
      const response = await api.post("/admin/migrate-all-emails", {}, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Emails migrated successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to migrate emails";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// New async thunk for reverting emails
export const revertEmailsData = createAsyncThunk(
  "userManagement/revertEmailsData",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(30));
      const response = await api.post("/admin/revert-all-emails", {}, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Emails reverted successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to revert emails";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

const userManagementSlice = createSlice({
  name: "userManagement",
  initialState: {
    listOfUsers: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    updateResponse: null,
  },
  reducers: {
    setUpdateResponse(state, action) {
      state.updateResponse = action.payload;
    },
    resetUMStore(state) {
      state.listOfUsers = [];
      state.status = "idle";
      state.error = null;
      state.updateResponse = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUsersData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.listOfUsers = action.payload;
      })
      .addCase(fetchUsersData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(setUsersData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(setUsersData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.updateResponse = { type: "success", message: action.payload.message };
      })
      .addCase(setUsersData.rejected, (state, action) => {
        state.status = "failed";
        state.updateResponse = { type: "error", message: action.payload };
      })
      .addCase(deleteUserData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteUserData.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(deleteUserData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Optionally handle migrateEmailsData and revertEmailsData extra reducers if you need to update state
      .addCase(migrateEmailsData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(migrateEmailsData.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(migrateEmailsData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(revertEmailsData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(revertEmailsData.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(revertEmailsData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setUpdateResponse, resetUMStore } = userManagementSlice.actions;

export default userManagementSlice.reducer;
