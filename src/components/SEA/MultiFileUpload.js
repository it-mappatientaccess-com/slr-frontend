// src/views/DataExtraction/MultiFileUpload.js

import React, { useEffect, useState, useRef, useCallback } from "react";
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
  setIsRefreshing,
  setIsStopping,
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

registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginFileMetadata
);

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const { instance, accounts } = useMsal();

  // Local files (FilePond)
  const [files, setFiles] = useState([]);

  // Remote picks from Graph
  const [graphFiles, setGraphFiles] = useState([]);

  // Polling, progress, etc.
  const [progress, setProgress] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [currentBatchID, setCurrentBatchID] = useState(null);

  const isRefreshing = useSelector(
    (state) => state.dataExtraction.isRefreshing
  );
  const isSubmitted = useSelector((state) => state.dataExtraction.isSubmitted);
  const isStopping = useSelector((state) => state.dataExtraction.isStopping);
  const message = useSelector((state) => state.dataExtraction.message);
  const status = useSelector((state) => state.dataExtraction.status);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  const includeAboutFile = useSelector(
    (state) => state.dataExtraction.includeAboutFile
  );
  const extractionTaskId = useSelector(
    (state) => state.dataExtraction.extractionTaskId
  );
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );

  const fetchIntervalRef = useRef(null);

  // Acquire Graph Token
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

  // Toggle "Include AboutFile"
  const toggleIncludeAboutFile = () => {
    dispatch(
      setIncludeAboutFile({
        includeAboutFile: !includeAboutFile,
      })
    );
  };

  // Clear all
  const clearFiles = () => {
    setFiles([]);
    setGraphFiles([]);
  };

  // Merge newly selected items from GraphFilePicker
  const handleFilesSelected = useCallback((newlySelected) => {
    console.log("GraphFilePicker returned items:", newlySelected);
    setGraphFiles((prev) => {
      const merged = [...prev];
      for (const item of newlySelected) {
        // skip if same filename already in merged
        const alreadyExists = merged.some((m) => m.name === item.name);
        if (!alreadyExists) merged.push(item);
      }
      console.log("Updated graphFiles:", merged);
      return merged;
    });
  }, []);

  // ======== Remove a single file from graphFiles ========
  const removeSelectedFile = useCallback((fileId) => {
    // Use functional form to avoid stale closures
    setGraphFiles((prevFiles) => {
      const newList = prevFiles.filter((item) => item.id !== fileId);
      console.log("Removing file with ID:", fileId, " => newList:", newList);
      return newList;
    });
  }, []);

  // AG-Grid for the remote picks
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
      cellRenderer: (params) => {
        return (
          <button
            className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            onClick={() => removeSelectedFile(params.data.id)}
          >
            <i className="fas fa-trash"></i> Remove
          </button>
        );
      },
    },
  ]);

  // Main "Upload" => send both local and remote
  const onProcessFile = async () => {
    console.log("Local files:", files);
    console.log("Graph files:", graphFiles);

    const newBatchID = generateUniqueBatchID();
    setCurrentBatchID(newBatchID);
    setProcessedFilesCount(0);

    try {
      const graphToken = await getGraphToken();
      const localFiles = files.map((f) => ({
        file: f.file,
        filename: f.file.name,
      }));

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

      if (response.meta.requestStatus === "fulfilled") {
        setIsUploadSuccessful(true);
        dispatch(
          setExtractionTaskId({
            extractionTaskId: response.payload.task_id,
          })
        );
      } else {
        notify("File upload failed.", "error");
      }
    } catch (err) {
      notify("An error occurred during file upload.", "error");
      console.error("onProcessFile error:", err);
    }
  };

  // Polling for local file progress
  const exponentialBackoff = (min, max, attempt) =>
    Math.min(max, Math.pow(2, attempt) * min);

  useEffect(() => {
    let attempt = 1;
    const maxDelay = 120000;
    const minDelay = 5000;

    if (isUploadSuccessful) {
      setShowProgressBar(true);
      const interval = setInterval(async () => {
        const totalCount = files.length;
        if (processedFilesCount < totalCount) {
          const response = await dispatch(fetchProcessedFileNames());
          const currentProcessedFiles = response.payload.filter(
            (fileInfo) => fileInfo.batch_id === currentBatchID
          );
          setProcessedFilesCount(currentProcessedFiles.length);
          setProgress((currentProcessedFiles.length / totalCount) * 100);

          if (currentProcessedFiles.length === totalCount) {
            clearInterval(interval);
            setIsUploadSuccessful(false);
            setProgress(0);
            setShowProgressBar(false);
          }
          attempt++;
        } else {
          clearInterval(interval);
          setIsUploadSuccessful(false);
        }
      }, exponentialBackoff(minDelay, maxDelay, attempt));

      fetchIntervalRef.current = interval;
      return () => clearInterval(fetchIntervalRef.current);
    } else {
      setShowProgressBar(false);
    }
  }, [
    isUploadSuccessful,
    processedFilesCount,
    files.length,
    dispatch,
    currentBatchID,
  ]);

  // Refresh & Stop
  const onRefreshClickHandler = () => {
    dispatch(setIsRefreshing({ isRefreshing: true }));
    dispatch(fetchProcessedFileNames());
  };

  const onStopClickedHandler = async () => {
    dispatch(setIsStopping({ isStopping: true }));
    const response = await dispatch(stopExtraction(extractionTaskId));
    notify(response?.message, response?.status);
  };

  // Toast if submitted
  const isSubmittedVal = useSelector(
    (state) => state.dataExtraction.isSubmitted
  );
  useEffect(() => {
    if (isSubmittedVal) {
      notify(message, status ? "success" : "error");
    }
  }, [isSubmittedVal, status, message]);

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
          {/* divider with "OR" written in the middle */}
          <div className="flex items-center py-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-3 text-gray-500">OR Upload your own files</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          {/* FilePond for local */}
          <div className="relative">
            <FilePond
              files={files}
              onupdatefiles={setFiles}
              allowMultiple
              maxFiles={100}
              name="file"
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span> 
                       <br/> (MAX FILES: 100, MAX FILESIZE: 25MB) 
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
              maxFileSize={"30MB"}
              credits={false}
              instantUpload={false}
              chunkUploads={true}
              chunkSize={5_000_000}
              maxParallelUploads={10}
            />

            {/* Upload / Refresh / Stop / Clear / AboutFile Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-center mt-4 lg:items-end">
              <div className="flex flex-col lg:flex-row justify-center flex-grow lg:mb-0 mb-4">
                <Tooltip id="action-btn-tooltip" />
                {/* Upload */}
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

                {/* Refresh */}
                <button
                  className={`bg-blueGray-500 text-white font-bold uppercase text-sm px-8 py-3 rounded shadow-md hover:shadow-lg mr-1 mb-1 
                  ${isRefreshing && isSubmitted ? "opacity-50" : ""}`}
                  onClick={onRefreshClickHandler}
                  disabled={isRefreshing}
                  data-tooltip-id="action-btn-tooltip"
                  data-tooltip-content="Refresh to view new processed files."
                >
                  <i
                    className={`fas fa-arrow-rotate-right ${
                      isRefreshing ? "fa-spin" : ""
                    }`}
                  ></i>{" "}
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>

                {/* Stop */}
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

            {/* ProgressBar */}
            {showProgressBar && progress < 100 && (
              <ProgressBar
                taskInProgress={`Progress: ${processedFilesCount}/${files.length}`}
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
