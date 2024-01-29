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
import Alert from "components/Alerts/Alert";
import {
  generateExtractionResults,
  fetchProcessedFileNames,
} from "store/data-extraction-actions";
import generateUniqueBatchID from "util/generateUUID";
import { Tooltip } from "react-tooltip";

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [responseStatus, setResponseStatus] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });
  const [progress, setProgress] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);

  const isRefreshing = useSelector(
    (state) => state.dataExtraction.isRefreshing
  );
  const isSubmitted = useSelector((state) => state.dataExtraction.isSubmitted);
  const message = useSelector((state) => state.dataExtraction.message);
  const status = useSelector((state) => state.dataExtraction.status);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  const [currentBatchID, setCurrentBatchID] = useState(null);
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const fetchIntervalRef = useRef(null);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  const alertTimeoutRef = useRef(null);
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
          selectedPrompt
        )
      );
      console.log(response);
      // Check response status and update state
      if (response.status) {
        setIsUploadSuccessful(true);
      } else {
        // Handle non-successful upload
        setResponseStatus({
          submitted: true,
          status: "Error",
          message: "File upload failed.",
          color: "bg-orange-500",
        });
      }
    } catch (error) {
      console.error(error);
      setResponseStatus({
        submitted: true,
        status: "Error",
        message: "An error occurred during file upload.",
        color: "bg-orange-500",
      });
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
      setResponseStatus({
        submitted: true,
        status: status ? "Success" : "Error",
        message: message,
        color: status ? "bg-emerald-500" : "bg-orange-500",
      });

      // Clear any existing timeout to avoid memory leaks
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }

      // Set a new timeout to hide the alert after 1 minute
      alertTimeoutRef.current = setTimeout(() => {
        setResponseStatus({
          submitted: false,
          status: "",
          message: "",
          color: "",
        });
      }, 60000); // 60 seconds = 1 minute
    }

    // Clear timeout when component unmounts or when isSubmitted changes
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [isSubmitted, status, message]);
  // Function to clear all files
  const clearFiles = () => {
    setFiles([]); // This will clear all files from the state
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
            labelIdle='Drag & Drop your pdf file or <span class="filepond--label-action">Browse</span> <br/> (MAX FILES: 100, MAX FILESIZE: 30MB)'
            allowFileTypeValidation={true}
            acceptedFileTypes={["application/pdf"]}
            allowFileSizeValidation={true}
            maxFileSize={"30MB"}
            credits={false}
            instantUpload={false}
          />

          <div className="text-center">
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
            <button
              className="bg-red-500 text-white font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={clearFiles}
              data-tooltip-id="action-btn-tooltip"
              data-tooltip-content="Click to clear all uploaded files from the list.."
            >
              <i className="fas fa-eraser"></i> Clear All
            </button>
          </div>
        </div>
        {showProgressBar && progress < 100 && (
          <ProgressBar
            taskInProgress={`Processing Files: ${processedFilesCount}/${files.length}`}
            percentage={progress}
          />
        )}

        {responseStatus.submitted && (
          <Alert
            alertClass={responseStatus.color}
            alertTitle={responseStatus.status}
            alertMessage={responseStatus.message}
          />
        )}
        <div>
          <ExtractionFileList />
        </div>
      </div>
    </div>
  );
};
export default MultiFileUpload;
