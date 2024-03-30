import React, { useEffect, useState, useRef } from "react";
// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";
// Import FilePond styles
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import "filepond/dist/filepond.min.css";
import { useDispatch, useSelector } from "react-redux";
import ExtractionFileList from "./ExtractionResult/ExtractionFileList";
import { dataExtractionActions } from "slices/dataExtractionSlice";
import ProgressBar from "components/ProgressBar/ProgressBar";
import {
  generateExtractionResults,
  fetchProcessedFileNames,
  stopExtraction,
} from "store/data-extraction-actions";
import generateUniqueBatchID from "util/generateUUID";
import { Tooltip } from "react-tooltip";
import { notify } from "components/Notify/Notify";

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);

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
  const [currentBatchID, setCurrentBatchID] = useState(null);
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const fetchIntervalRef = useRef(null);
  const [showProgressBar, setShowProgressBar] = useState(false);
  // New state for managing "Include AboutFile" checkbox
  const includeAboutFile = useSelector(
    (state) => state.dataExtraction.includeAboutFile
  );
  const extractionTaskId = useSelector(
    (state) => state.dataExtraction.extractionTaskId
  );
  // Function to toggle the checkbox state
  const toggleIncludeAboutFile = () => {
    dispatch(
      dataExtractionActions.setIncludeAboutFile({
        includeAboutFile: !includeAboutFile,
      })
    );
  };
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginFileMetadata
  );
  const exponentialBackoff = (min, max, attempt) => {
    return Math.min(max, Math.pow(2, attempt) * min);
  };

  // Effect for handling file processing after upload
  useEffect(() => {
    let attempt = 1;
    const maxDelay = 120000; // 120 seconds
    const minDelay = 5000; // 5 seconds

    if (isUploadSuccessful) {
      setShowProgressBar(true);

      const interval = setInterval(async () => {
        if (processedFilesCount < files.length) {
          const response = await dispatch(fetchProcessedFileNames());
          // Handle response and update states
          const currentProcessedFiles = response.filter(
            (fileInfo) => fileInfo.batch_id === currentBatchID
          );
          setProcessedFilesCount(currentProcessedFiles.length);
          setProgress((currentProcessedFiles.length / files.length) * 100);

          if (currentProcessedFiles.length === files.length) {
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

  // Function to handle file upload process
  const onProcessFile = async () => {
    const newBatchID = generateUniqueBatchID();
    setCurrentBatchID(newBatchID);
    setProcessedFilesCount(0);
    try {
      const response = await dispatch(
        generateExtractionResults(
          files,
          seaQuestions,
          newBatchID,
          selectedPrompt,
          includeAboutFile
        )
      );
      // Check response status and update state
      if (response.status) {
        setIsUploadSuccessful(true);
        // set extractionTaskId to response.data.task_id
        dispatch(
          dataExtractionActions.setExtractionTaskId({
            extractionTaskId: response.task_id,
          })
        );
      } else {
        // show toast
        notify("File upload failed.", "error");
      }
    } catch (error) {
      // show toast
      notify("An error occurred during file upload.", "error");
    }
  };

  const onRefreshClickHandler = () => {
    dispatch(
      dataExtractionActions.setIsRefreshing({
        isRefreshing: true,
      })
    );
    dispatch(fetchProcessedFileNames());
  };

  useEffect(() => {
    if (isSubmitted) {
      // show toast
      notify(message, status ? "success" : "error");
    }
  }, [isSubmitted, status, message]);
  // Function to clear all files
  const clearFiles = () => {
    setFiles([]); // This will clear all files from the state
  };

  const onStopClickedHandler = async () => {
    dispatch(
      dataExtractionActions.setIsStopping({
        isStopping: true,
      })
    );
    const response = await dispatch(stopExtraction(extractionTaskId));
    // show toast
    notify(response.data["message"], response.data["status"]);
  };
  return (
    <div className="flex flex-wrap mt-4">
      <div className="w-full mb-12 px-4">
        <div className="relative">
          <FilePond
            files={files}
            onupdatefiles={setFiles}
            allowMultiple={true}
            maxFiles={100}
            name="file"
            labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span> <br/> (MAX FILES: 100, MAX FILESIZE: 25MB) <br/>Allowed file types: PDF, XPS, EPUB, MOBI, FB2, CBZ, SVG, TXT, PPT, DOC, DOCX, XLS, XLSX, CSV'
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
          />
          <p className="mt-2"></p>
          {/* Flex container for all buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-center mt-4 lg:items-end">
            {/* Center-aligned buttons container */}
            <div className="flex flex-col lg:flex-row justify-center flex-grow lg:mb-0 mb-4">
              <Tooltip id="action-btn-tooltip" />

              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  files.length === 0 ? "opacity-40" : ""
                }`}
                type="button"
                onClick={onProcessFile}
                disabled={files.length === 0}
              >
                <i className="fas fa-upload"></i> Upload
              </button>
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
              {showProgressBar && (
                <button
                  className={`bg-red-500 text-white active:bg-red-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150
              ${isStopping ? "opacity-50" : ""}`}
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
              {files.length > 0 && (
                <button
                  className="bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={clearFiles}
                  data-tooltip-id="action-btn-tooltip"
                  data-tooltip-content="Click to clear all uploaded files from the list.."
                >
                  <i className="fas fa-eraser"></i> Clear All
                </button>
              )}
            </div>
            {files.length > 0 && (
              <div className="lg:absolute lg:right-0">
                <button
                  className={`text-indigo-500 bg-transparent border border-solid border-indigo-500 hover:bg-indigo-500 hover:text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`}
                  type="button"
                  onClick={toggleIncludeAboutFile}
                  disabled={files.length === 0}
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
          {showProgressBar && progress < 100 && (
            <ProgressBar
              taskInProgress={`Progress: ${processedFilesCount}/${files.length}`}
              percentage={progress}
            />
          )}
          <div>
            <ExtractionFileList />
          </div>
        </div>
      </div>
    </div>
  );
};
export default MultiFileUpload;
