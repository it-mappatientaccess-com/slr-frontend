import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "authConfig";

import {
  setIncludeAboutFile,
  setExtractionTaskId,
  setIsStopping,
  setCurrentBatchID,
  setTotalFilesInBatch,
  setProcessedFiles,
  setProcessedCount,
  // Note: we intentionally do NOT reset processed files for new batches
  appendProcessedFile,
} from "../../redux/slices/dataExtractionSlice";

import ProgressBar from "components/ProgressBar/ProgressBar";
import {
  generateExtractionResults,
  fetchProcessedFileNames,
  stopExtraction,
} from "../../redux/thunks/dataExtractionThunks";
import generateUniqueBatchID from "util/generateUUID";
import { Tooltip } from "react-tooltip";
import { notify } from "components/Notify/Notify";
import GraphFilePicker from "components/GraphFilePicker/GraphFilePicker";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

/** Utility to pick an icon based on file extension */
function getFileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <i className="fa fa-file-pdf text-red-500" />;
    case "doc":
    case "docx":
      return <i className="fa fa-file-word text-lightBlue-600" />;
    case "xls":
    case "xlsx":
      return <i className="fa fa-file-excel text-emerald-600" />;
    case "ppt":
    case "pptx":
      return <i className="fa fa-file-powerpoint text-orange-400" />;
    case "txt":
      return <i className="fa fa-file-lines text-blueGray-400" />;
    default:
      return <i className="fa fa-file text-blueGray-500" />;
  }
}

// Register FilePond plugins
registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginFileMetadata
);

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const { instance, accounts } = useMsal();

  // Local states for FilePond and Graph picks
  const [files, setFiles] = useState([]);
  const [graphFiles, setGraphFiles] = useState([]);

  // Destructure only the Redux fields we actually use here
  const {
    currentBatchID,
    totalFilesInBatch,
    processedCount,
    isStopping,
    message,
    status,
    selectedPrompt,
    includeAboutFile,
    extractionTaskId,
  } = useSelector((state) => state.dataExtraction);

  const isSubmittedVal = useSelector(
    (state) => state.dataExtraction.isSubmitted
  );
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );

  // Calculate progress from Redux fields
  const showProgressBar =
    currentBatchID !== null && processedCount < totalFilesInBatch;
  const progress =
    totalFilesInBatch > 0 ? (processedCount / totalFilesInBatch) * 100 : 0;

  // SSE endpoint (base API URL from your .env or fallback)
  const baseAPIUrl = process.env.REACT_APP_API_URL;
  const sseUrl = `${baseAPIUrl}stream-progress`;

  /**
   * Acquire Graph Token
   */
  const getGraphToken = useCallback(async () => {
    try {
      if (!accounts || accounts.length === 0) return "";
      const resp = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: accounts[0],
      });
      return resp.accessToken;
    } catch (error) {
      console.warn("Could not acquire Graph token:", error);
      return "";
    }
  }, [instance, accounts]);

  /**
   * On mount, restore any ongoing batch from localStorage
   * AND always fetch all processed files so the table is never empty.
   */
  useEffect(() => {
    const storedBatchID = localStorage.getItem("currentBatchID");
    const storedTotal = localStorage.getItem("totalFilesInBatch");

    if (storedBatchID) {
      dispatch(setCurrentBatchID(storedBatchID));
      dispatch(setTotalFilesInBatch(parseInt(storedTotal || "0", 10)));

      // Sync up *all* processed files from server
      dispatch(fetchProcessedFileNames()).then((res) => {
        if (res.payload) {
          // Keep them all in Redux for the table
          dispatch(setProcessedFiles(res.payload));

          // Also set the progress count for the *currently stored* batch
          const currentBatchFiles = res.payload.filter(
            (f) => f.batch_id === storedBatchID
          );
          dispatch(setProcessedCount(currentBatchFiles.length));
        }
      });
    } else {
      // Even if there's no stored batch, we still fetch
      // all processed files so the table shows them.
      dispatch(fetchProcessedFileNames()).then((res) => {
        if (res.payload) {
          dispatch(setProcessedFiles(res.payload));
        }
      });
    }
    // eslint-disable-next-line
  }, []);

  /**
   * SSE subscription whenever currentBatchID changes
   */
  useEffect(() => {
    if (!currentBatchID) return;

    console.log("Opening SSE for batch:", currentBatchID);
    const sse = new EventSource(sseUrl);

    sse.onmessage = (event) => {
      if (!event.data) return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === "file_processed" && data.batch_id === currentBatchID) {
          // New processed file => update Redux
          dispatch(appendProcessedFile(data));
        }
      } catch (err) {
        console.error("Error parsing SSE event:", err);
      }
    };

    sse.onerror = (err) => {
      console.error("SSE error:", err);
      // Optionally handle reconnection
    };

    return () => {
      console.log("Closing SSE for batch:", currentBatchID);
      sse.close();
    };
  }, [currentBatchID, sseUrl, dispatch]);

  /**
   * Toggle the "Include AboutFile" checkbox
   */
  const toggleIncludeAboutFile = () => {
    dispatch(setIncludeAboutFile({ includeAboutFile: !includeAboutFile }));
  };

  /**
   * Clear local FilePond + Graph picks
   */
  const clearFiles = () => {
    setFiles([]);
    setGraphFiles([]);
  };

  /**
   * Merge newly selected items from GraphFilePicker
   */
  const handleFilesSelected = useCallback((newlySelected) => {
    setGraphFiles((prev) => {
      const merged = [...prev];
      for (const item of newlySelected) {
        const alreadyExists = merged.some((m) => m.name === item.name);
        if (!alreadyExists) merged.push(item);
      }
      return merged;
    });
  }, []);

  /**
   * Remove a single file from Graph picks
   */
  const removeSelectedFile = useCallback((fileId) => {
    setGraphFiles((prevFiles) => prevFiles.filter((item) => item.id !== fileId));
  }, []);

  // AG-Grid definitions for the Graph picks
  const getRowId = (params) => params.data.id;
  const [graphColumnDefs] = useState(() => [
    {
      headerName: "Selected Files",
      field: "name",
      flex: 5,
      cellRenderer: (params) => {
        const icon = getFileIcon(params.value);
        return (
          <span className="flex items-center gap-2">
            {icon} &nbsp; &nbsp;{params.value}
          </span>
        );
      },
    },
    {
      headerName: "Actions",
      flex: 1,
      cellRenderer: (params) => (
        <button
          className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
          type="button"
          onClick={() => removeSelectedFile(params.data.id)}
        >
          <i className="fas fa-trash"></i> Remove
        </button>
      ),
    },
  ]);

  /**
   * onProcessFile: user clicks "Generate Results"
   *  1) Create new batch
   *  2) Set Redux + localStorage
   *  3) Dispatch generateExtractionResults
   */
  const onProcessFile = async () => {
    try {
      const newBatchID = generateUniqueBatchID();
      const totalFiles = files.length + graphFiles.length;
      if (totalFiles === 0) {
        return notify("No files selected!", "warning");
      }

      // Prepare Redux + localStorage
      dispatch(setCurrentBatchID(newBatchID));
      dispatch(setTotalFilesInBatch(totalFiles));
      // We DO NOT clear out processedFiles from Redux:
      // That way we keep the old files in the table.
      // But for the new batch's progress bar, we reset the processedCount to 0:
      dispatch(setProcessedCount(0));

      localStorage.setItem("currentBatchID", newBatchID);
      localStorage.setItem("totalFilesInBatch", totalFiles.toString());

      // Acquire Graph token
      const graphToken = await getGraphToken();
      const localFiles = files.map((f) => ({
        file: f.file,
        filename: f.file.name,
      }));

      // Start extraction
      const response = await dispatch(
        generateExtractionResults({
          localFiles,
          graphFiles,
          graphAccessToken: graphToken,
          questions: seaQuestions,
          newBatchID,
          selectedPrompt,
          includeAboutFile,
        })
      );

      // If successful, store the backend's extractionTaskId
      if (response.meta.requestStatus === "fulfilled") {
        if (response.payload?.task_id) {
          dispatch(
            setExtractionTaskId({ extractionTaskId: response.payload.task_id })
          );
        }
      } else {
        notify("File upload failed.", "error");
      }
    } catch (err) {
      notify("An error occurred during file upload.", "error");
      console.error("onProcessFile error:", err);
    }
  };

  /**
   * onStopClickedHandler: user clicks "Stop" to halt background processing
   */
  const onStopClickedHandler = async () => {
    dispatch(setIsStopping({ isStopping: true }));
    // Pass both extractionTaskId and currentBatchID
    const response = await dispatch(
      stopExtraction({ taskId: extractionTaskId, batchId: currentBatchID })
    );
    notify(response?.message, response?.status);
  };
  

  /**
   * Show toast if isSubmittedVal changes
   */
  useEffect(() => {
    if (isSubmittedVal) {
      notify(message, status ? "success" : "error");
    }
  }, [isSubmittedVal, status, message]);

  /**
   * If all files are processed (processedCount >= totalFilesInBatch),
   * show a success toast, but DO NOT reset the batch data or remove old files
   */
  useEffect(() => {
    if (processedCount > 0 && processedCount >= totalFilesInBatch && currentBatchID) {
      notify("All files processed successfully!", "success");
      // We do NOT reset the store so the table continues to show everything
      // If you'd like to remove from localStorage to stop SSE reconnection, do it here:
      // localStorage.removeItem("currentBatchID");
      // localStorage.removeItem("totalFilesInBatch");
    }
  }, [processedCount, totalFilesInBatch, currentBatchID]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
      <div className="flex flex-wrap mt-4 p-4">
        <div className="w-full mb-12 px-4">
          {/* GraphFilePicker + Table */}
          <div className="mb-4">
            <GraphFilePicker onFilesSelected={handleFilesSelected} />

            {graphFiles.length > 0 && (
              <div
                className="ag-theme-alpine mt-4"
                style={{ width: "100%", height: "300px" }}
              >
                <AgGridReact
                  rowData={graphFiles}
                  columnDefs={graphColumnDefs}
                  getRowId={getRowId}
                  animateRows={true}
                  pagination={true}
                  paginationAutoPageSize={true}
                  suppressClickEdit={true}
                />
              </div>
            )}
          </div>

          {/* Divider with "OR" text */}
          <div className="flex items-center py-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-3 text-gray-500">
              OR Upload your own files
            </span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          {/* FilePond for local files */}
          <div className="relative">
            <FilePond
              files={files}
              onupdatefiles={setFiles}
              allowMultiple
              maxFiles={100}
              name="file"
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span> 
                  <br/> (MAX FILES: 100, MAX FILESIZE: 30MB) 
                  <br/>Allowed file types: PDF, XPS, EPUB, MOBI, FB2, CBZ, SVG, TXT, PPT, DOC, DOCX, XLS, XLSX, CSV'
              allowFileTypeValidation={true}
              acceptedFileTypes={[
                "application/pdf",
                "application/vnd.ms-xpsdocument",
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                "application/x-fictionbook+xml",
                "application/x-cbr",
                "image/svg+xml",
                "text/plain",
                "application/vnd.ms-powerpoint",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/csv",
              ]}
              allowFileSizeValidation={true}
              maxFileSize="30MB"
              credits={false}
              instantUpload={false}
              chunkUploads={true}
              chunkSize={5_000_000}
              maxParallelUploads={10}
            />

            {/* Action Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-center mt-4 lg:items-end">
              <div className="flex flex-col lg:flex-row justify-center flex-grow lg:mb-0 mb-4">
                <Tooltip id="action-btn-tooltip" />

                {/* Upload / Generate Results */}
                <button
                  className={`bg-lightBlue-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg mr-1 mb-1 
                    ${
                      files.length === 0 && graphFiles.length === 0
                        ? "opacity-40"
                        : ""
                    }`}
                  onClick={onProcessFile}
                  disabled={files.length === 0 && graphFiles.length === 0}
                >
                  <i className="fas fa-play"></i> Generate Results
                </button>

                {/* Stop (if progress bar is showing) */}
                {showProgressBar && (
                  <button
                    className={`bg-red-500 text-white font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg mr-1 mb-1 
                      ${isStopping ? "opacity-50" : ""}`}
                    onClick={onStopClickedHandler}
                    disabled={isStopping}
                    data-tooltip-id="action-btn-tooltip"
                    data-tooltip-content="Halt processing."
                  >
                    <i
                      className={`fas fa-stop ${isStopping ? "fa-flip" : ""}`}
                    ></i>{" "}
                    {isStopping ? "Stopping..." : "Stop"}
                  </button>
                )}

                {/* Clear All */}
                {(files.length > 0 || graphFiles.length > 0) && (
                  <button
                    className="bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg mr-1 mb-1"
                    onClick={clearFiles}
                    data-tooltip-id="action-btn-tooltip"
                    data-tooltip-content="Clear all files."
                  >
                    <i className="fas fa-eraser"></i> Clear All
                  </button>
                )}
              </div>

              {/* Include AboutFile */}
              {(files.length > 0 || graphFiles.length > 0) && (
                <div className="lg:absolute lg:right-0">
                  <button
                    className="text-indigo-500 border border-indigo-500 hover:bg-indigo-500 hover:text-white font-bold uppercase text-xs px-4 py-2 rounded"
                    onClick={toggleIncludeAboutFile}
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox text-indigo-600 mr-2"
                      checked={includeAboutFile}
                      onChange={toggleIncludeAboutFile}
                    />
                    Include AboutFile
                  </button>
                </div>
              )}
            </div>

            {/* ProgressBar (only visible if the batch is in progress) */}
            {showProgressBar && progress < 100 && (
              <ProgressBar
                taskInProgress={`Progress: ${processedCount}/${totalFilesInBatch}`}
                percentage={progress}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiFileUpload;
