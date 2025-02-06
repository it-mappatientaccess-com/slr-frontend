import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "util/api";
import { toast } from "react-toastify";
import { setProgress } from "../slices/loadingSlice";
import {
  setSelectedPrompt,
  setIsRefreshing,
  setIsStopping,
} from "../slices/dataExtractionSlice";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * localFiles: array of { file: File, filename: string } from FilePond or similar
 * graphFiles: array of Graph "driveItem" objects selected from OneDrive/SharePoint
 * graphAccessToken: the user’s delegated Graph token
 * questions, newBatchID, selectedPrompt, includeAboutFile: other existing fields
 */
export const generateExtractionResults = createAsyncThunk(
  "dataExtraction/generateExtractionResults",
  async (
    {
      localFiles,
      graphFiles,
      graphAccessToken,
      questions,
      newBatchID,
      selectedPrompt,
      includeAboutFile,
    },
    { rejectWithValue }
  ) => {
    try {
      // Build FormData
      const formData = new FormData();
      const projectId = localStorage.getItem("currentProjectId");
      if (!projectId) {
        return rejectWithValue("Project ID not found.");
      }
      // Append local files
      // Each entry in localFiles might be { file: File, filename: string }
      localFiles.forEach((fileObj) => {
        formData.append("files", fileObj.file, fileObj.filename);
      });

      // Append the OneDrive/SharePoint references (as JSON)
      formData.append("graph_files", JSON.stringify(graphFiles || []));

      // Append the user’s Graph token
      formData.append("graph_access_token", graphAccessToken || "");

      // Other form fields
      formData.append("questions_dict", JSON.stringify(questions || {}));
      formData.append("batch_id", newBatchID);
      formData.append("prompt_text", selectedPrompt);
      formData.append("include_about_file", includeAboutFile);
      formData.append("project_id", projectId);
      // Send to backend
      const response = await api.post("/multi-file-extraction", formData, {
        headers: {
          Authorization: localStorage.getItem("token"), // Bearer token for your API
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Extraction request submitted successfully!");
      return response.data;
    } catch (error) {
      toast.error("Failed to generate extraction results.");
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk for fetching processed file names
export const fetchProcessedFileNames = createAsyncThunk(
  "dataExtraction/fetchProcessedFileNames",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      const response = await api.get(
        `/get_extraction_file_names/${projectId}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(
        setIsRefreshing({
          isRefreshing: false,
        })
      );
      return response.data;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch processed file names";
      toast.error(errorMsg);
      dispatch(
        setIsRefreshing({
          isRefreshing: false,
        })
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for fetching extraction file results
export const fetchExtractionFileResults = createAsyncThunk(
  "dataExtraction/fetchExtractionFileResults",
  async ({ file_id }, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(70));
      const response = await api.get(
        `/get_extraction_file_results/${file_id}?project_id=${projectId}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      // toast.success("Extraction file results fetched successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch extraction file results";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for fetching prompts
export const fetchPrompts = createAsyncThunk(
  "dataExtraction/fetchPrompts",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(70));
      const response = await api.get(`/prompt/${projectId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));

      const prompts = response.data.prompts;
      const selectedPrompt = response.data.selected_prompt;

      if (!selectedPrompt && prompts.length > 0) {
        dispatch(setSelectedPrompt({ selectedPrompt: prompts[0].prompt_text }));
      } else {
        dispatch(setSelectedPrompt({ selectedPrompt }));
      }

      return prompts;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg =
        error.response?.data?.detail || "Failed to fetch prompts";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for deleting PDF data
export const deletePdfData = createAsyncThunk(
  "dataExtraction/deletePdfData",
  async (fileId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/delete_pdf_data/${fileId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("File deleted successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to delete file");
      return rejectWithValue(error.response?.data || "Failed to delete file");
    }
  }
);

// Helper function to parse markdown-like syntax and apply Excel formatting
const formatCellContent = (text) => {
  const parts = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  // Iterate over the markdown content and apply formatting
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }
    parts.push({ text: match[1], font: { bold: true } });
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
};

// Function to flatten and format the result content
const flattenAndFormatResult = (result) => {
  return result.map((content) => formatCellContent(content)).flat();
};

// Function to download Excel file using ExcelJS
const downloadXLSX = async (data, exportFileName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  const columnsSet = new Set(["file_name"]);
  const rows = [];

  // Iterate over each item in the data array
  data.forEach((item) => {
    const row = { file_name: item.file_name };

    item.results.forEach((result) => {
      const key = Object.keys(result)[0];
      const contentArray = result[key];

      const formattedContent = flattenAndFormatResult(contentArray);
      row[key] = formattedContent;
      columnsSet.add(key);
    });

    rows.push(row);
  });

  // Define the columns for the worksheet
  worksheet.columns = Array.from(columnsSet).map(column => ({
    header: column,
    key: column,
    width: 50, // Adjust the width as necessary
  }));

  // Add the rows to the worksheet with rich text formatting
  rows.forEach((row, rowIndex) => {
    worksheet.addRow(row);

    Object.keys(row).forEach((key, colIndex) => {
      const cell = worksheet.getRow(rowIndex + 2).getCell(colIndex + 1); // Offset for header row
      if (Array.isArray(row[key])) {
        // If rich text formatting is applied
        cell.value = { richText: row[key] };
      } else {
        // Otherwise, just use plain text
        cell.value = row[key];
      }
      cell.alignment = { wrapText: true };
    });
  });

  // Write the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${exportFileName}.xlsx`);
};

// Async thunk for fetching all extraction results
export const fetchAllExtractionResults = createAsyncThunk(
  "dataExtraction/fetchAllExtractionResults",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.get(
        `/get_all_extraction_results/${projectId}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      await downloadXLSX(response.data, projectId);
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to fetch extraction results");
      return rejectWithValue(
        error.response?.data || "Failed to fetch extraction results"
      );
    }
  }
);

// Async thunk for deleting all SEA results
export const deleteAllSEAResults = createAsyncThunk(
  "dataExtraction/deleteAllSEAResults",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.delete(`/delete-all-results/${projectId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(setProgress(100));
      toast.success("All SEA results deleted successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      toast.error("Failed to delete all SEA results");
      return rejectWithValue(
        error.response?.data || "Failed to delete all SEA results"
      );
    }
  }
);

// Async thunk for stopping extraction
// Updated async thunk for stopping extraction
export const stopExtraction = createAsyncThunk(
  "dataExtraction/stopExtraction",
  async ({ taskId, batchId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setProgress(50));
      // Prepare form data to include the batch ID
      const formData = new FormData();
      formData.append("batch_id", batchId);
      const response = await api.post(
        `/stop_extraction/${taskId}`,
        formData,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      if (response.data.status === "success") {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
      dispatch(setIsStopping({ isStopping: false }));
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg =
        error.response?.data?.message || "Failed to stop extraction";
      toast.error(errorMsg);
      dispatch(setIsStopping({ isStopping: false }));
      return rejectWithValue(errorMsg);
    }
  }
);


// Async thunk for deleting a prompt
export const deletePrompt = createAsyncThunk(
  "dataExtraction/deletePrompt",
  async ({ promptTitle }, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.delete(
        `/prompt/${projectId}/${promptTitle}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      toast.success("Prompt deleted successfully");
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg =
        error.response?.data?.detail || "Failed to delete prompt";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Async thunk for setting the selected prompt
export const setSelectedPromptThunk = createAsyncThunk(
  "dataExtraction/setSelectedPrompt",
  async ({ selectedPrompt }, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.put(
        `/selected_prompt/${projectId}`,
        { selectedPrompt },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      dispatch(setProgress(100));
      toast.success("Selected prompt set successfully");
      dispatch(setSelectedPrompt({ selectedPrompt }));
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      const errorMsg =
        error.response?.data?.message || "Failed to set selected prompt";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);
