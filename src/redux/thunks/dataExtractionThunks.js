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

const getNormalizedCountValue = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const normalizeExtractionSubmitResponse = (payload = {}) => ({
  ...payload,
  message: payload?.message || "",
  task_id: payload?.task_id ?? null,
  batch_id: payload?.batch_id ?? null,
  started_files: Array.isArray(payload?.started_files) ? payload.started_files : [],
  duplicates: Array.isArray(payload?.duplicates) ? payload.duplicates : [],
  joined_inflight: Array.isArray(payload?.joined_inflight)
    ? payload.joined_inflight
    : [],
  counts: {
    started: getNormalizedCountValue(payload?.counts?.started),
    rejected_duplicates: getNormalizedCountValue(
      payload?.counts?.rejected_duplicates,
    ),
    joined: getNormalizedCountValue(payload?.counts?.joined),
  },
});

const getRequestReference = (requestId) => {
  const normalizedRequestId = requestId != null ? String(requestId).trim() : "";
  return normalizedRequestId ? normalizedRequestId.slice(0, 8) : null;
};

const appendRequestReference = (message, requestId) => {
  const reference = getRequestReference(requestId);
  return reference ? `${message} (Reference: ${reference})` : message;
};

const getErrorRequestId = (error, payloadOverride) => {
  const payload = payloadOverride ?? error.response?.data;
  return (
    payload?.request_id ||
    error.response?.headers?.["x-request-id"] ||
    error.response?.headers?.["X-Request-ID"] ||
    null
  );
};

const getApiErrorDetails = (error, fallbackMessage) => {
  const payload = error.response?.data;
  const requestId = getErrorRequestId(error, payload);
  const baseMessage =
    payload?.message ||
    payload?.detail ||
    error.message ||
    fallbackMessage;

  return {
    requestId,
    baseMessage,
    message: appendRequestReference(baseMessage, requestId),
  };
};

const rejectWithApiError = (
  error,
  fallbackMessage,
  rejectWithValue,
  showToast = true,
) => {
  const { message } = getApiErrorDetails(error, fallbackMessage);
  if (showToast) {
    toast.error(message);
  }

  return rejectWithValue(message);
};

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
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 409,
      });

      return normalizeExtractionSubmitResponse(response.data);
    } catch (error) {
      return rejectWithApiError(
        error,
        "Failed to generate extraction results.",
        rejectWithValue,
      );
    }
  }
);

export const fetchBatchStatus = createAsyncThunk(
  "dataExtraction/fetchBatchStatus",
  async ({ batchId, showToast = false }, { rejectWithValue }) => {
    if (!batchId) {
      return rejectWithValue("Batch ID not found.");
    }

    try {
      const response = await api.get(`/batch-status/${batchId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithApiError(
        error,
        "Failed to fetch batch status",
        rejectWithValue,
        showToast,
      );
    }
  },
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
      dispatch(
        setIsRefreshing({
          isRefreshing: false,
        })
      );
      return rejectWithApiError(
        error,
        "Failed to fetch processed file names",
        rejectWithValue,
      );
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
      return rejectWithApiError(
        error,
        "Failed to fetch extraction file results",
        rejectWithValue,
      );
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
      return rejectWithApiError(
        error,
        "Failed to fetch prompts",
        rejectWithValue,
      );
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
      return rejectWithApiError(
        error,
        "Failed to delete file",
        rejectWithValue,
      );
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

const getSafeExportFileName = (name, fallbackName) => {
  const trimmedName = name?.trim();
  if (!trimmedName) return fallbackName;

  return trimmedName.replace(/[\\/:*?"<>|]/g, "_");
};

const getDownloadFileName = (contentDisposition, fallbackFileName) => {
  if (!contentDisposition) return fallbackFileName;

  const encodedFileNameMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  );
  if (encodedFileNameMatch?.[1]) {
    try {
      return decodeURIComponent(encodedFileNameMatch[1]);
    } catch {
      return encodedFileNameMatch[1];
    }
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return fileNameMatch?.[1] || fallbackFileName;
};

const triggerBlobDownload = (blobData, fileName) => {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

const getBlobErrorDetails = async (error, fallbackMessage) => {
  let errorMsg =
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallbackMessage;
  let requestId = getErrorRequestId(error);

  const errorBlob = error.response?.data;
  if (errorBlob instanceof Blob) {
    try {
      const text = (await errorBlob.text()).trim();
      if (!text) {
        return {
          requestId,
          message: appendRequestReference(errorMsg, requestId),
        };
      }

      try {
        const json = JSON.parse(text);
        errorMsg =
          json.message || json.detail || json.error || json.title || errorMsg;
        requestId = requestId || json.request_id || null;
      } catch {
        if (!text.startsWith("<")) {
          errorMsg = text;
        }
      }
    } catch {
      return {
        requestId,
        message: appendRequestReference(errorMsg, requestId),
      };
    }
  }

  return {
    requestId,
    message: appendRequestReference(errorMsg, requestId),
  };
};

// Async thunk for fetching all extraction results
export const fetchAllExtractionResults = createAsyncThunk(
  "dataExtraction/fetchAllExtractionResults",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    const projectName = localStorage.getItem("selectedProject");
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
      await downloadXLSX(
        response.data,
        getSafeExportFileName(projectName, projectId),
      );
      return response.data;
    } catch (error) {
      dispatch(setProgress(100));
      return rejectWithApiError(
        error,
        "Failed to fetch extraction results",
        rejectWithValue,
      );
    }
  }
);

export const exportFileResultsDocx = createAsyncThunk(
  "dataExtraction/exportFileResultsDocx",
  async ({ fileId }, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.get(
        `/export_extraction_file_results_docx/${fileId}`,
        {
          params: { project_id: projectId },
          headers: {
            Authorization: localStorage.getItem("token"),
          },
          responseType: "blob",
        },
      );
      dispatch(setProgress(100));

      const fileName = getDownloadFileName(
        response.headers["content-disposition"],
        `${fileId}_export.docx`,
      );
      triggerBlobDownload(response.data, fileName);
      return fileName;
    } catch (error) {
      dispatch(setProgress(100));
      const { message } = await getBlobErrorDetails(
        error,
        "Failed to export file results to Word",
      );
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const exportAllResultsDocx = createAsyncThunk(
  "dataExtraction/exportAllResultsDocx",
  async (_, { dispatch, rejectWithValue }) => {
    const projectId = localStorage.getItem("currentProjectId");
    if (!projectId) {
      return rejectWithValue("Project ID not found.");
    }

    try {
      dispatch(setProgress(50));
      const response = await api.get(
        `/export_all_extraction_results_docx/${projectId}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
          responseType: "blob",
        },
      );
      dispatch(setProgress(100));

      const fileName = getDownloadFileName(
        response.headers["content-disposition"],
        `${projectId}_extraction_results.docx`,
      );
      triggerBlobDownload(response.data, fileName);
      return fileName;
    } catch (error) {
      dispatch(setProgress(100));
      const { message } = await getBlobErrorDetails(
        error,
        "Failed to export all results to Word",
      );
      toast.error(message);
      return rejectWithValue(message);
    }
  },
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
      return rejectWithApiError(
        error,
        "Failed to delete all SEA results",
        rejectWithValue,
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
      dispatch(setIsStopping({ isStopping: false }));
      return rejectWithApiError(
        error,
        "Failed to stop extraction",
        rejectWithValue,
      );
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
      return rejectWithApiError(
        error,
        "Failed to delete prompt",
        rejectWithValue,
      );
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
      return rejectWithApiError(
        error,
        "Failed to set selected prompt",
        rejectWithValue,
      );
    }
  }
);
