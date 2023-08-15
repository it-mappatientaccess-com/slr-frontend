import React, { useState, useEffect } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import ExtractionResult from "./ExtractionResult/ExtractionResult";
import ProgressBar from "components/ProgressBar/ProgressBar";
import "filepond/dist/filepond.min.css";
import {
  generateSingleFileResults,
  resetSingleExtrationResult,
  fetchTaskStatus,
} from "store/data-extraction-actions";
import { useDispatch, useSelector } from "react-redux";

const SingleFileUpload = () => {
  const [file, setFile] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [isFileAdded, setIsFileAdded] = useState(false);
  const [taskPercentage, setTaskPercentage] = useState(0);
  const [isUploadInitiated, setIsUploadInitiated] = useState(false);

  const dispatch = useDispatch();

  const selectedFileResult = useSelector(
    (state) => state.dataExtraction.singleExtractionResult
  );
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  const taskId = useSelector((state) => state.dataExtraction.taskId);
  registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginFileMetadata
  );

  const onProcessFile = async () => {
    setIsLoading(true);
    setTaskPercentage(10); // Initial progress value
    setIsUploadInitiated(true);
    try {
      await dispatch(generateSingleFileResults(file, seaQuestions));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setIsFileAdded(file.length > 0);
  }, [file]);

  useEffect(() => {
    if (selectedFileResult.length > 0 && file.length !== 0) {
      setIsProcessed(true);
    } else {
      setIsProcessed(false);
    }
  }, [selectedFileResult, file]);

  // Polling logic to check the status of the task and update the progress bar
  useEffect(() => {
    if (!taskId || !isUploadInitiated) return;

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const interval = setInterval(async () => {
      try {
        const taskStatus = await dispatch(fetchTaskStatus(taskId));

        if (taskStatus.state === "PENDING") {
          if (taskPercentage < 90) {
            setTaskPercentage(taskPercentage + 10);
          }
        } else if (taskStatus.state === "SUCCESS") {
          // Update state with the result
          setIsLoading(false);
          setIsProcessed(true);
          clearInterval(interval);
        } else if (taskStatus.state === "FAILURE") {
          console.error("Task failed:", taskStatus.status);
          setIsLoading(false);
          clearInterval(interval);
        }

        consecutiveErrors = 0;
      } catch (error) {
        console.error("Error fetching task status:", error);
        consecutiveErrors++;

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error("Stopping polling due to consecutive errors.");
          clearInterval(interval);
        }
        setIsLoading(false);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [dispatch, taskId, taskPercentage, isUploadInitiated]);

  return (
    <div className="flex flex-wrap mt-4">
      <div className="w-full mb-12 px-4">
        <div className="relative">
          <FilePond
            files={file}
            onupdatefiles={(fileItems) => {
              const updatedFiles = fileItems.map((fileItem) => fileItem.file);
              // If a new file is added or if a file is removed
              if (updatedFiles.length !== file.length) {
                dispatch(resetSingleExtrationResult());
              }
              setFile(updatedFiles);
            }}
            allowMultiple={false}
            name="file"
            labelIdle='Drag & Drop your pdf file or <span class="filepond--label-action">Browse</span> <br/> (MAX FILESIZE: 20MB)'
            allowFileTypeValidation={true}
            acceptedFileTypes={["application/pdf"]}
            allowFileSizeValidation={true}
            maxFileSize={"20MB"}
            credits={false}
            instantUpload={false}
          />
          <div className="text-center">
            <button
              className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                isLoading || !isFileAdded ? "opacity-40" : ""
              }`}
              type="button"
              onClick={onProcessFile}
              disabled={isLoading || !isFileAdded}
            >
              <i className="fas fa-upload"></i> Upload
            </button>
          </div>

          {isLoading && (
            <div
              role="status"
              className="absolute -translate-x-1/2 -translate-y-1/2 top-3/4 left-1/2"
            >
              <svg
                aria-hidden="true"
                className="w-10 h-10 mr-2 text-gray-200 animate-spin fill-lightBlue-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* ... SVG paths ... */}
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          )}
          {isLoading && (
            <ProgressBar
              taskInProgress="Processing File"
              percentage={taskPercentage}
            />
          )}
          <div className={isLoading ? "opacity-20" : ""}>
            {isProcessed && (
              <ExtractionResult
                result={selectedFileResult}
                fileName={file[0]?.name || "Unknown File"}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleFileUpload;
