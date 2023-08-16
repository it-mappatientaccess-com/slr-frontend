import React, { useState, useEffect } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import ExtractionResult from "./ExtractionResult/ExtractionResult";
import ProgressBar from "components/ProgressBar/ProgressBar";
import Alert from "components/Alerts/Alert";
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
  const taskStatus = useSelector((state) => state.dataExtraction.taskStatus);
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
              className="absolute -translate-x-1/2 -translate-y-1/2 top-2/4 left-1/2"
            >
              <svg
                aria-hidden="true"
                className="w-10 h-10 mr-2 text-gray-200 animate-spin fill-lightBlue-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          )}
          {taskStatus != null && taskStatus.state === "FAILURE" && (
            <Alert
              alertClass="bg-red-500"
              alertTitle="Error!"
              alertMessage="Task failed. Please try again."
            />
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
