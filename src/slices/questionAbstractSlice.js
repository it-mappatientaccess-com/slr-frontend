import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  questions: {
    studyDesign: [""],
    population: [""],
    intervention: [""],
    outcomes: [""],
  },
  abstract: "",
  abstractNER: [],
  singleAbstractResult: "",
  submitQABtn: false,
  submitClicked: false,
  isResultGenerated: false,
  isQuestionsEmpty: false,
  allAbstractResults: [],
  abstractNerMappedText: "",
  resetStore: false,
  numberOfExamples: 0,
  isProcessing: false,
  isRefreshing: false,
  isStopping: false,
  taskId: 0,
  progress: 0,
};
const QuestionAbstractSlice = createSlice({
  name: "QuestionAbstractData",
  initialState,
  reducers: {
    setQuestions(state, action) {
      state.questions = action.payload.questions;
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
    setAllAbstractResults(state, action) {
      state.allAbstractResults = action.payload.allAbstractResults;
      state.numberOfExamples = action.payload.numberOfExamples;
    },
    setAbstractNerMappedText(state, action) {
      state.abstractNerMappedText = action.payload.abstractNerMappedText;
    },
    setNumberOfExamples(state, action) {
      state.numberOfExamples = action.payload.numberOfExamples;
    },
    resetQAStore(state, action) {
      if (action.payload.resetStore) {
        return initialState;
      } else {
        return state;
      }
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
    setProgress(state, actions) {
      state.progress = actions.payload.progress;
    },
  },
});
export const questionsAbstractState = (state) => state.QuestionAbstractData;

export const questionAbstractActions = QuestionAbstractSlice.actions;

export default QuestionAbstractSlice.reducer;
