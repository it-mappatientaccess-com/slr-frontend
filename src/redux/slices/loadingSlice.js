import { createSlice } from "@reduxjs/toolkit";

const loadingSlice = createSlice({
  name: "loading",
  initialState: {
    progress: 0,
  },
  reducers: {
    setProgress(state, action) {
      state.progress = action.payload;
    },
    resetProgress(state) {
      state.progress = 0;
    },
  },
});

export const { setProgress, resetProgress } = loadingSlice.actions;

export default loadingSlice.reducer;
