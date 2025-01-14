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
  generateExtractionResults, // must be updated to handle local + Graph
  fetchProcessedFileNames,
  stopExtraction,
} from "../../redux/thunks/dataExtractionThunks";
import generateUniqueBatchID from "util/generateUUID";
import { Tooltip } from "react-tooltip";
import { notify } from "components/Notify/Notify";
import GraphFilePicker from "components/GraphFilePicker/GraphFilePicker";

// Register FilePond plugins
registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginFileMetadata
);

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const { instance, accounts } = useMsal(); // For acquiring Graph token

  // ======== Local File State (FilePond) ========
  const [files, setFiles] = useState([]);

  // ======== Remote Files from OneDrive/SharePoint ========
  const [graphFiles, setGraphFiles] = useState([]);

  // ======== Tracking UI / Progress ========
  const [progress, setProgress] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [currentBatchID, setCurrentBatchID] = useState(null);

  const isRefreshing = useSelector((state) => state.dataExtraction.isRefreshing);
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

  // ======== Toggle "Include AboutFile" ========
  const toggleIncludeAboutFile = () => {
    dispatch(
      setIncludeAboutFile({
        includeAboutFile: !includeAboutFile,
      })
    );
  };

  // ======== Acquire Graph Token via MSAL ========
  const getGraphToken = useCallback(async () => {
    try {
      if (!accounts || accounts.length === 0) {
        // The user might not have logged in via MSAL
        return "";
      }
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

  // ======== Upload & Process Files (local + Graph) ========
  const onProcessFile = async () => {
    console.log("Local files to be uploaded:", files);
    console.log("Graph files to be uploaded:", graphFiles);

    const newBatchID = generateUniqueBatchID();
    setCurrentBatchID(newBatchID);
    setProcessedFilesCount(0);

    try {
      // Acquire Graph token (may be empty if user not logged in via MSAL)
      const graphToken = await getGraphToken();

      // Transform local 'files' (from FilePond) into { file, filename }
      const localFiles = files.map((fileItem) => ({
        file: fileItem.file,
        filename: fileItem.file.name,
      }));

      // Dispatch your updated thunk
      const response = await dispatch(
        generateExtractionResults({
          localFiles,         // local file objects
          graphFiles,         // array of selected driveItems
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
    } catch (error) {
      notify("An error occurred during file upload.", "error");
      console.error("onProcessFile error:", error);
    }
  };

  // ======== Periodic Polling to Check Processed Files ========
  const exponentialBackoff = (min, max, attempt) => {
    return Math.min(max, Math.pow(2, attempt) * min);
  };

  useEffect(() => {
    let attempt = 1;
    const maxDelay = 120000; // 120 seconds
    const minDelay = 5000;   // 5 seconds

    if (isUploadSuccessful) {
      setShowProgressBar(true);

      const interval = setInterval(async () => {
        // Compare processed count vs local file count
        // If you also want to track remote file count, you might do
        // let totalCount = files.length + graphFiles.length;
        // But for now, we track only the local count (for demonstration)
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

  // ======== Refresh & Stop Handlers ========
  const onRefreshClickHandler = () => {
    dispatch(
      setIsRefreshing({
        isRefreshing: true,
      })
    );
    dispatch(fetchProcessedFileNames());
  };

  const onStopClickedHandler = async () => {
    dispatch(
      setIsStopping({
        isStopping: true,
      })
    );
    const response = await dispatch(stopExtraction(extractionTaskId));
    notify(response?.message, response?.status);
  };

  // ======== Clear Local Files from FilePond ========
  const clearFiles = () => {
    setFiles([]);
  };

  // ======== Show success/error toast if submitted ========
  useEffect(() => {
    if (isSubmitted) {
      notify(message, status ? "success" : "error");
    }
  }, [isSubmitted, status, message]);

  // ======== GraphFilePicker Callback ========
  const handleFilesSelected = (selectedItems) => {
    console.log("User selected these files/folders from Graph:", selectedItems);
    setGraphFiles(selectedItems);
  };

  return (
    <div className="flex flex-wrap mt-4">
      <div className="w-full mb-12 px-4">
        {/* Top Row: Graph Picker */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-4">
          <GraphFilePicker onFilesSelected={handleFilesSelected} />
        </div>

        <div className="relative">
          {/* ========== FilePond for Local Uploads ========== */}
          <FilePond
            files={files}
            onupdatefiles={setFiles}
            allowMultiple={true}
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
            maxFileSize={"25MB"}
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
              {/* ========== Upload Button ========== */}
              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  files.length === 0 && graphFiles.length === 0
                    ? "opacity-40"
                    : ""
                }`}
                type="button"
                onClick={onProcessFile}
                disabled={files.length === 0 && graphFiles.length === 0}
              >
                <i className="fas fa-upload"></i> Upload
              </button>

              {/* ========== Refresh Button ========== */}
              <button
                className={`bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-sm px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  isRefreshing && isSubmitted ? "opacity-50" : ""
                }`}
                type="button"
                onClick={onRefreshClickHandler}
                disabled={isRefreshing}
                data-tooltip-id="action-btn-tooltip"
                data-tooltip-content="Refresh to view the recently processed files in the table."
              >
                <i
                  className={`fas fa-arrow-rotate-right ${
                    isRefreshing ? "fa-spin" : ""
                  }`}
                ></i>{" "}
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>

              {/* ========== Stop Button (Shown if uploading in progress) ========== */}
              {showProgressBar && (
                <button
                  className={`bg-red-500 text-white active:bg-red-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                    isStopping ? "opacity-50" : ""
                  }`}
                  type="button"
                  onClick={onStopClickedHandler}
                  alt="stop model's execution"
                  disabled={isStopping}
                  data-tooltip-id="action-btn-tooltip"
                  data-tooltip-variant="error"
                  data-tooltip-content="Click to halt the processing of files."
                >
                  <i
                    className={`fas fa-stop  ${isStopping ? "fa-flip" : ""}`}
                  ></i>{" "}
                  {isStopping ? "Stopping..." : "Stop"}
                </button>
              )}

              {/* ========== Clear All Button ========== */}
              {(files.length > 0 || graphFiles.length > 0) && (
                <button
                  className="bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setGraphFiles([]);
                  }}
                  data-tooltip-id="action-btn-tooltip"
                  data-tooltip-content="Click to clear all uploaded & selected files."
                >
                  <i className="fas fa-eraser"></i> Clear All
                </button>
              )}
            </div>

            {/* ========== Include AboutFile Checkbox ========== */}
            {(files.length > 0 || graphFiles.length > 0) && (
              <div className="lg:absolute lg:right-0">
                <button
                  className="text-indigo-500 bg-transparent border border-solid border-indigo-500 hover:bg-indigo-500 hover:text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
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

          {/* ========== Progress Bar ========== */}
          {showProgressBar && progress < 100 && (
            <ProgressBar
              taskInProgress={`Progress: ${processedFilesCount}/${files.length}`}
              percentage={progress}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiFileUpload;
