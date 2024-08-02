import { createSlice } from "@reduxjs/toolkit";
import {
  fetchOldQuestions,
  setQuestions,
  setSeaQuestions,
  fetchOldSeaQuestions,
  getSingleQAResult,
  getAllResults,
  stopModelExecution,
} from "../thunks/qa-thunks";

const initialState = {
  questions: {
    studyDesign: [""],
    population: [""],
    intervention: [""],
    outcomes: [""],
    exclusionCriteria: [""],
  },
  seaQuestions: {},
  abstract: "",
  abstractNER: [],
  singleAbstractResult: {},
  submitQABtn: false,
  submitClicked: false,
  isResultGenerated: false,
  isQuestionsEmpty: false,
  allAbstractResults: [],
  resetStore: false,
  numberOfExamples: 0,
  isProcessing: false,
  isRefreshing: false,
  isStopping: false,
  taskId: 0,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const QuestionAbstractSlice = createSlice({
  name: "QuestionAbstractData",
  initialState,
  reducers: {
    setQuestions(state, action) {
      state.questions = action.payload.questions;
    },
    setSEAQuestionsDict(state, action) {
      state.seaQuestions = action.payload.seaQuestions;
    },
    setAbstractText(state, action) {
      state.abstract = action.payload.abstract;
    },
    setsubmitQABtn(state, action) {
      state.submitQABtn = action.payload.submitQABtn;
    },
    setAbstractNER(state, action) {
      state.abstractNER = action.payload.abstractNER;
    },
    setSingleAbstractResult(state, action) {
      state.singleAbstractResult = action.payload.singleAbstractResult;
    },
    setSubmitClicked(state, action) {
      state.submitClicked = action.payload.submitClicked;
    },
    setIsResultGenerated(state, action) {
      state.isResultGenerated = action.payload.isResultGenerated;
    },
    setIsQuestionsEmpty(state, action) {
      state.isQuestionsEmpty = action.payload.isQuestionsEmpty;
    },
    setNumberOfExamples(state, action) {
      state.numberOfExamples = action.payload.numberOfExamples;
    },
    resetQAStore(state) {
      return initialState;
    },
    setIsProcessing(state, action) {
      state.isProcessing = action.payload.isProcessing;
    },
    setIsRefreshing(state, action) {
      state.isRefreshing = action.payload.isRefreshing;
    },
    setIsStopping(state, action) {
      state.isStopping = action.payload.isStopping;
    },
    setTaskId(state, action) {
      state.taskId = action.payload.taskId;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOldQuestions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOldQuestions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.questions = action.payload.questions;
        state.isQuestionsEmpty = action.payload.isQuestionsEmpty;
      })
      .addCase(fetchOldQuestions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(setQuestions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(setQuestions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.questions = action.payload.questions;
        state.isQuestionsEmpty = action.payload.isQuestionsEmpty;
      })
      .addCase(setQuestions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(setSeaQuestions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(setSeaQuestions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.seaQuestions = action.payload.seaQuestions;
      })
      .addCase(setSeaQuestions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchOldSeaQuestions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOldSeaQuestions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.seaQuestions = action.payload.seaQuestions;
      })
      .addCase(fetchOldSeaQuestions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(getSingleQAResult.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getSingleQAResult.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.singleAbstractResult = action.payload.singleAbstractResult;
        state.isResultGenerated = action.payload.isResultGenerated;
      })
      .addCase(getSingleQAResult.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(getAllResults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getAllResults.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.allAbstractResults = action.payload.allAbstractResults;
        state.numberOfExamples = action.payload.numberOfExamples;
        state.isProcessing = action.payload.isProcessing;
        state.taskId = action.payload.taskId;
      })
      .addCase(getAllResults.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(stopModelExecution.pending, (state) => {
        state.status = "loading";
      })
      .addCase(stopModelExecution.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isProcessing = action.payload.isProcessing;
        state.isStopping = action.payload.isStopping;
      })
      .addCase(stopModelExecution.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const {
  setAbstractText,
  setsubmitQABtn,
  setAbstractNER,
  setSingleAbstractResult,
  setSubmitClicked,
  setIsResultGenerated,
  setIsQuestionsEmpty,
  setNumberOfExamples,
  resetQAStore,
  setIsProcessing,
  setIsRefreshing,
  setIsStopping,
  setTaskId,
  setSEAQuestionsDict,
} = QuestionAbstractSlice.actions;

export default QuestionAbstractSlice.reducer;
