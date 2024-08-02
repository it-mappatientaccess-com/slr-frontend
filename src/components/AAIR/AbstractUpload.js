import React, { useState } from "react";

// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";

// Import FilePond styles
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import AbstractResults from "./AbstractResults";
import { useDispatch } from "react-redux";
import { setNumberOfExamples } from "../../redux/slices/questionAbstractSlice"; // Updated import
import {
  setIsProcessing,
  setTaskId,
} from "../../redux/slices/questionAbstractSlice"; // Updated import
import "./AbstractUpload.css";
import "filepond/dist/filepond.min.css";
import { notify } from "components/Notify/Notify";

const AbstractUpload = () => {
  const dispatch = useDispatch();
  // Register the plugins
  registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginFileMetadata
  );
  const [file, setFile] = useState([]);
  const [responseStatus, setResponseStatus] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });
  const [invalidRows, setInvalidRows] = useState([]);
  
  const onUpdateFiles = (fileItems) => {
    // Set current file objects to state
    setFile(fileItems.map((fileItem) => fileItem.file));

    // If the fileItems array is empty, the user has cleared the files
    if (fileItems.length === 0) {
      // Reset the error message and invalid rows
      setResponseStatus({
        submitted: false,
        status: "",
        message: "",
        color: "",
      });
      setInvalidRows([]);
    }
  };

  // This function is updated to handle errors properly
  const handleServerError = (error) => {
    let e = JSON.parse(error);
    setResponseStatus({
      submitted: true,
      status: "Error",
      message: e?.detail || "An error occurred while uploading the file.",
      color: "bg-red-500",
    });
    // show toast
    notify(e?.detail || "An error occurred while uploading the file.", "error");
    setInvalidRows(e.detail?.invalid_rows || []);
  };

  const onUploadComplete = (res) => {
    if (res.status === "error") {
      // Handle the error response
      setResponseStatus({
        submitted: true,
        status: "Error", // Changed to a string "Error" to avoid confusion with the 'status' property of 'res'
        message: res.message,
        color: "bg-red-500",
      });
      // show toast
      notify(res?.message, "error");
      setInvalidRows(res.invalid_rows || []); // Set to an empty array if undefined
    } else if (res.status === "success") {
      // Dispatch actions for success
      dispatch(setTaskId({ taskId: res.task_id }));
      dispatch(setNumberOfExamples(res.num_of_examples));
      dispatch(setIsProcessing({ isProcessing: res.is_processing }));

      // Set success response status
      setResponseStatus({
        submitted: true,
        status: "Success", // Changed to a string "Success" to avoid confusion with the 'status' property of 'res'
        message: res.message,
        color: "bg-emerald-500",
      });
      // show toast
      notify(res?.message, "success");
      // Clear any previous errors
      setInvalidRows([]);

      // Reset message and color after 10 seconds, keep status and submitted
      setTimeout(() => {
        setResponseStatus((prevStatus) => ({
          ...prevStatus,
          message: "",
          color: "",
        }));
      }, 5000);
    }
  };

  return (
    <>
      <FilePond
        files={file}
        onupdatefiles={onUpdateFiles}
        allowMultiple={false}
        server={{
          process: {
            url: process.env.REACT_APP_API_URL + "submit_abstracts",
            headers: {
              Authorization: localStorage.getItem("token"),
            },
            ondata: (formData) => {
              formData.append(
                "questions",
                `${localStorage.getItem("questions")}`
              );
              formData.append(
                "projectName",
                `${localStorage.getItem("selectedProject")}`
              );
              return formData;
            },
            onload: (response) => {
              onUploadComplete(JSON.parse(response));
            },
            onerror: handleServerError,
          },
        }}
        setMetadata
        data-file-metadata-questions="world"
        name="file" /* sets the file input name, it's filepond by default */
        labelIdle='Drag & Drop your .csv or .xlsx file or <span class="filepond--label-action">Click to Browse</span><br/>(MAX FILES: 1, MAX FILESIZE: 5MB)'
        allowFileTypeValidation={true}
        acceptedFileTypes={[
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]}
        allowFileSizeValidation={true}
        maxFileSize={"5MB"}
        credits={false}
      />
      {responseStatus.status === "Error" && invalidRows.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-semibold text-red-600">
            Invalid row ids: {invalidRows.join(", ")}
          </p>
        </div>
      )}
      {responseStatus.status === "Success" && file.length !== 0 && (
        <AbstractResults />
      )}
    </>
  );
};

export default AbstractUpload;
