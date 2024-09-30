// redux/thunks/qa-thunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "util/api";

import { toast } from "react-toastify";
import { setProgress } from "../slices/loadingSlice";
import { setSEAQuestionsDict, setIsRefreshing } from "../slices/questionAbstractSlice"; // Import the action

// Thunk to fetch old questions
export const fetchOldQuestions = createAsyncThunk(
  "questionAbstractData/fetchOldQuestions",
  async (project_id, { dispatch, rejectWithValue }) => { // Changed parameter to project_id
    try {
      dispatch(setProgress(70));
      const response = await api.get(`questions?project_id=${project_id}`, { // Updated API call
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));

      let isEmptyFlag = false;
      for (let category of Object.keys(response.data.questions)) {
        if (response.data.questions[category].length === 0) {
          isEmptyFlag = true;
        }
      }
      if (Object.keys(response.data).length === 0 || isEmptyFlag) { // Changed condition to check keys
        const questions = {
          studyDesign: [""],
          population: [""],
          intervention: [""],
          outcomes: [""],
          exclusionCriteria: [""],
        };
        localStorage.setItem("questions", JSON.stringify(questions));
        return { questions, isQuestionsEmpty: true };
      } else {
        localStorage.setItem("questions", JSON.stringify(response.data.questions));
        return { questions: response.data.questions, isQuestionsEmpty: false };
      }
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to fetch old questions");
      return rejectWithValue(error.response?.data || "Failed to fetch old questions");
    }
  }
);

// Thunk to set questions
export const setQuestions = createAsyncThunk(
  "questionAbstractData/setQuestions",
  async ({ projectId, category, questions }, { dispatch, getState, rejectWithValue }) => { // Changed projectName to project_id
    try {
      dispatch(setProgress(70));

      // Get the current state of questions
      const existingQuestions = getState().questionAbstractData.questions;

      // Update only the specified category while preserving other categories
      const updatedQuestions = {
        ...existingQuestions,
        [category]: questions[category]
      };
      const response = await api.post("questions", { project_id: projectId, questions: updatedQuestions }, { // Updated payload
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      console.log(response);
      dispatch(setProgress(100));
      localStorage.setItem("questions", JSON.stringify(updatedQuestions));
      return { questions: updatedQuestions, isQuestionsEmpty: false };
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to set questions");
      return rejectWithValue(error.response?.data || "Failed to set questions");
    }
  }
);

// Thunk to set SEA questions
export const setSeaQuestions = createAsyncThunk(
  "questionAbstractData/setSeaQuestions",
  async ({ project_id, seaQuestions }, { dispatch, getState, rejectWithValue }) => { // Changed projectName to project_id
    try {
      dispatch(setProgress(60));
      dispatch(setSEAQuestionsDict({ seaQuestions }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      const updatedSeaQuestions = getState().questionAbstractData.seaQuestions;
      await api.post("seaQuestions", { project_id, seaQuestions: updatedSeaQuestions }, { // Updated payload
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      return { seaQuestions: updatedSeaQuestions };
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to set SEA questions");
      return rejectWithValue(error.response?.data || "Failed to set SEA questions");
    }
  }
);

// Thunk to fetch old SEA questions
export const fetchOldSeaQuestions = createAsyncThunk(
  "questionAbstractData/fetchOldSeaQuestions",
  async (project_id, { dispatch, rejectWithValue }) => { // Changed parameter to project_id
    try {
      dispatch(setProgress(70));
      const response = await api.get(`seaQuestions?project_id=${project_id}`, { // Updated API call
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));

      let isEmptyFlag = false;
      for (let category of Object.keys(response.data.seaQuestions)) {
        if (response.data.seaQuestions[category].length === 0) {
          isEmptyFlag = true;
        }
      }
      if (Object.keys(response.data).length === 0 || isEmptyFlag) { // Changed condition to check keys
        const questions = { "Question Set 1": [""] };
        return { seaQuestions: questions };
      } else {
        return { seaQuestions: response.data.seaQuestions };
      }
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to fetch old SEA questions");
      return rejectWithValue(error.response?.data || "Failed to fetch old SEA questions");
    }
  }
);

// Thunk to get single QA result
export const getSingleQAResult = createAsyncThunk(
  "questionAbstractData/getSingleQAResult",
  async ({ questions, abstract }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post("generate_decision", { questions, abstract }, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      return {
        singleAbstractResult: response.data,
        isResultGenerated: true,
      };
    } catch (error) {
      toast.error("Failed to generate decision");
      return rejectWithValue(error.response?.data || "Failed to generate decision");
    }
  }
);

// Thunk to get all results
export const getAllResults = createAsyncThunk(
  "questionAbstractData/getAllResults",
  async (project_id, { dispatch, rejectWithValue }) => { // Changed projectName to project_id
    try {
      dispatch(setIsRefreshing({ isRefreshing: true }));
      dispatch(setProgress(70));
      const response = await api.get(`get_all_results?project_id=${project_id}`, { // Updated API call
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      const { results, number_of_examples, is_processing, task_id } = response.data;
      dispatch(setProgress(100));
      dispatch(setIsRefreshing({ isRefreshing: false }));
      return {
        allAbstractResults: results,
        numberOfExamples: number_of_examples,
        isProcessing: is_processing,
        taskId: task_id,
      };
    } catch (error) {
      dispatch(setProgress(100));
      dispatch(setIsRefreshing({ isRefreshing: false }));
      toast.error("Failed to fetch all results");
      return rejectWithValue(error.response?.data || "Failed to fetch all results");
    }
  }
);

// Thunk to stop model execution
export const stopModelExecution = createAsyncThunk(
  "questionAbstractData/stopModelExecution",
  async (taskId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.post(`stop_model_execution/${taskId}`, null, { // Ensure correct payload
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      return {
        isProcessing: response.data["is_processing"],
        isStopping: false,
      };
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to stop model execution");
      return rejectWithValue(error.response?.data || "Failed to stop model execution");
    }
  }
);
