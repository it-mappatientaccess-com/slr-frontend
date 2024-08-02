import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "util/api";
import { toast } from "react-toastify";
import { setProgress } from "../slices/loadingSlice";
import { setSelectedPrompt } from "../slices/dataExtractionSlice";
import * as XLSX from "xlsx"; 

// Async thunk for generating extraction results
export const generateExtractionResults = createAsyncThunk(
  "dataExtraction/generateExtractionResults",
  async ({ files, questions, newBatchID, selectedPrompt, includeAboutFile }, { dispatch, rejectWithValue }) => {
    console.log("Files to be uploaded:", files); // Debug log
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i].file, files[i].filename);
    }
    formData.append("questions_dict", JSON.stringify(questions));
    formData.append("project_name", localStorage.getItem("selectedProject"));
    formData.append("batch_id", newBatchID);
    formData.append("prompt_text", selectedPrompt);
    formData.append("include_about_file", includeAboutFile);

    try {
      dispatch(setProgress(70));
      const response = await api.post("/multi-file-extraction", formData, {
        headers: {
          Authorization: localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      });
      dispatch(setProgress(100));
      toast.success("Extraction results generated successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to generate extraction results";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for fetching processed file names
export const fetchProcessedFileNames = createAsyncThunk(
  "dataExtraction/fetchProcessedFileNames",
  async (_, { dispatch, rejectWithValue }) => {
    const projectName = localStorage.getItem("selectedProject");
    try {
      dispatch(setProgress(70));
      const response = await api.get(`/get_extraction_file_names/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Processed file names fetched successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to fetch processed file names";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for fetching extraction file results
export const fetchExtractionFileResults = createAsyncThunk(
  "dataExtraction/fetchExtractionFileResults",
  async ({ file_id, projectName }, { dispatch, rejectWithValue }) => {
    console.log(file_id, projectName);
    try {
      dispatch(setProgress(70));
      const response = await api.get(
        `/get_extraction_file_results/${file_id}?projectName=${projectName}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      toast.success("Extraction file results fetched successfully");
      console.log(response.data);
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to fetch extraction file results";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for fetching prompts
export const fetchPrompts = createAsyncThunk(
  "dataExtraction/fetchPrompts",
  async (_, { dispatch, rejectWithValue }) => {
    const projectName = localStorage.getItem("selectedProject");
    try {
      dispatch(setProgress(70));
      const response = await api.get(`/prompt/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Prompts fetched successfully");

      const prompts = response.data.prompts;
      const selectedPrompt = response.data.selected_prompt;

      // If selectedPrompt is null or empty string, set the first default prompt as selected
      if (!selectedPrompt && prompts.length > 0) {
        dispatch(setSelectedPrompt({ selectedPrompt: prompts[0].prompt_text }));
      } else {
        dispatch(setSelectedPrompt({ selectedPrompt }));
      }

      return prompts;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.detail || "Failed to fetch prompts";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for deleting PDF data
export const deletePdfData = createAsyncThunk(
  'dataExtraction/deletePdfData',
  async (fileId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/delete_pdf_data/${fileId}`, {
        headers: {
          Authorization: localStorage.getItem('token'),
        },
      });
      dispatch(setProgress(100));
      toast.success('File deleted successfully');
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error('Failed to delete file');
      return rejectWithValue(error.response?.data || 'Failed to delete file');
    }
  }
);
const downloadXLSX = (data, exportFileName) => {
  const workbook = XLSX.utils.book_new();
  const csvData = [];

  data.forEach((item) => {
    const row = {
      file_name: item.file_name,
      aboutFile:
        item.results
          .find((result) => "aboutFile" in result)
          ?.aboutFile.join("\n")
          .replace(/\n/g, " ") || "",
    };

    item.results.forEach((result) => {
      const key = Object.keys(result)[0];

      // Skip aboutFile because it's already handled
      if (key === "aboutFile") return;

      const values = result[key]
        .map((value) => {
          if (typeof value === "string" && value.includes("Answer:")) {
            const sections = value.split("Answer:");
            const answers = sections
              .slice(1)
              .map((section) => section.split("Direct Quote", 1)[0].trim())
              .filter(Boolean);
            return answers.join("\n");
          }
          return value;
        })
        .filter(Boolean) // Remove empty strings
        .join("\n");

      row[key] = values.replace(/\n/g, " ");
    });

    csvData.push(row);
  });

  // Start columns with file_name and aboutFile
  const columns = ["file_name", "aboutFile"];

  // Then add all unique keys from the data (except file_name and aboutFile)
  data.forEach((item) => {
    item.results.forEach((result) => {
      const key = Object.keys(result)[0];
      if (!columns.includes(key)) {
        columns.push(key);
      }
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(csvData, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
};
// Async thunk for fetching all extraction results
export const fetchAllExtractionResults = createAsyncThunk(
  'dataExtraction/fetchAllExtractionResults',
  async (_, { dispatch, rejectWithValue }) => {
    const projectName = localStorage.getItem("selectedProject");
    try {
      dispatch(setProgress(50));
      const response = await api.get(`/get_all_extraction_results/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem('token'),
        },
      });
      dispatch(setProgress(100));
      downloadXLSX(response.data, projectName); 
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error('Failed to fetch extraction results');
      return rejectWithValue(error.response?.data || 'Failed to fetch extraction results');
    }
  }
);

// Async thunk for deleting all SEA results
export const deleteAllSEAResults = createAsyncThunk(
  'dataExtraction/deleteAllSEAResults',
  async (_, { dispatch, rejectWithValue }) => {
    const projectName = localStorage.getItem("selectedProject");
    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/delete-all-results/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem('token'),
        },
      });
      dispatch(setProgress(100));
      toast.success('All SEA results deleted successfully');
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error('Failed to delete all SEA results');
      return rejectWithValue(error.response?.data || 'Failed to delete all SEA results');
    }
  }
);

// Async thunk for stopping extraction
export const stopExtraction = createAsyncThunk(
  "dataExtraction/stopExtraction",
  async (taskId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.post(`/stop_extraction/${taskId}`, {}, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success(response.data.message);
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.message || "Failed to stop extraction";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for deleting a prompt
export const deletePrompt = createAsyncThunk(
  "dataExtraction/deletePrompt",
  async ({ projectName, promptTitle }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/prompt/${projectName}/${promptTitle}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("Prompt deleted successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg = error.response?.data?.detail || "Failed to delete prompt";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);
