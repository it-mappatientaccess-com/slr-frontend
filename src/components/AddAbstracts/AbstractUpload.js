import React, { useState } from "react";

// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";

// Import FilePond styles
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import Alert from "components/Alerts/Alert";
import AbstractResults from "./AbstractResults";
import { useDispatch } from "react-redux";
import { setNumberOfExamples } from "store/qa-actions";
import { questionAbstractActions } from "slices/questionAbstractSlice";
import "./AbstractUpload.css"
import "filepond/dist/filepond.min.css";

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

  const onUploadComplete = (res) => {
    dispatch(
      questionAbstractActions.setTaskId({
        taskId: res.task_id
      })
    );
    dispatch(setNumberOfExamples(res.num_of_examples));
    dispatch(
      questionAbstractActions.setIsProcessing({
        isProcessing: res.is_processing
      })
    );
    setResponseStatus({
      submitted: true,
      status: res.status,
      message: res.message,
      color: res.status === "success" ? "bg-emerald-500" : "bg-orange-500",
    });
    if (res.status === "success") {
      setTimeout(() => {
        setResponseStatus({
          submitted: false,
          status: res.status,
          message: res.message,
          color: res.status === "success" ? "bg-emerald-500" : "bg-orange-500",
        });
      }, 10000);
    }
  };

  return (
    <div>
      <FilePond
        files={file}
        onupdatefiles={setFile}
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
          },
        }}
        setMetadata
        data-file-metadata-questions="world"
        name="file" /* sets the file input name, it's filepond by default */
        labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
        allowFileTypeValidation={true}
        acceptedFileTypes={[
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]}
        allowFileSizeValidation={true}
        maxFileSize={"5MB"}
        credits={false}
      />
      {responseStatus.submitted && (
        <Alert
          alertClass={responseStatus.color}
          alertTitle={responseStatus.status}
          alertMessage={responseStatus.message}
        />
      )}
      {responseStatus.status === "success" && file.length !== 0 && (
        <AbstractResults />
      )}
    </div>
  );
};
export default AbstractUpload;
