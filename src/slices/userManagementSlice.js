import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  listOfUsers: [],
  resetStore: false,
  progress: 0,
  error: null,
  updateResponse: null,
};

const UserManagementSlice = createSlice({
  name: "userManagement",
  initialState,
  reducers: {
    setListOfUsers(state, action) {
      state.listOfUsers = action.payload.listOfUsers;
    },
    resetUMStore(state, action) {
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
    },
    setUpdateResponse(state, action) {
      state.updateResponse = action.payload.updateResponse;
    }
  },
});

export const userManagementState = (state) => state.userManagement;

export const UserManagementActions = UserManagementSlice.actions;

export default UserManagementSlice.reducer;
