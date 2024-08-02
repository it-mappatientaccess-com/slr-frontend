import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  rowData: [],
  latestId: 0,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const rowSlice = createSlice({
  name: "rows",
  initialState,
  reducers: {
    updateRow: (state, action) => {
      const newRow = action.payload;
      const index = state.rowData.findIndex(
        (element) => element.id === newRow.id
      );
      if (index !== -1) {
        state.rowData[index] = newRow;
      }
    },
    addRows: (state, action) => {
      const newRows = action.payload;
      state.rowData = [...newRows, ...state.rowData];
      if (newRows.length > 0) {
        state.latestId = newRows[newRows.length - 1].id;
      }
    },
    removeRows: (state, action) => {
      const idsToRemove = action.payload;
      state.rowData = state.rowData.filter(
        (row) => !idsToRemove.includes(row.id)
      );
    },
  },
});

export const { addRows, removeRows, updateRow } = rowSlice.actions;

export const selectRows = (state) => state.rows.rowData;

export const selectId = (state) => state.rows.latestId;

export default rowSlice.reducer;
