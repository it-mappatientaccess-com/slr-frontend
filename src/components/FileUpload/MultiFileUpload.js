import React, { useEffect, useState } from "react";
// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";
// Import FilePond styles
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import "filepond/dist/filepond.min.css";
import { useDispatch, useSelector } from "react-redux";
import ExtractionFileList from "components/ExtractionResult/ExtractionFileList";
import { dataExtractionActions } from "slices/dataExtractionSlice";
import Alert from "components/Alerts/Alert";
import {
  generateExtractionResults,
  fetchProcessedFileNames,
} from "store/data-extraction-actions";

const MultiFileUpload = () => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });
  const isRefreshing = useSelector(
    (state) => state.dataExtraction.isRefreshing
  );
  const isSubmitted = useSelector((state) => state.dataExtraction.isSubmitted);
  const message = useSelector((state) => state.dataExtraction.message);
  const status = useSelector((state) => state.dataExtraction.status);
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginFileMetadata
  );

  const onProcessFile = async () => {
    setIsLoading(true);
    try {
      await dispatch(generateExtractionResults(files, seaQuestions));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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
    if(isSubmitted) {
      setResponseStatus({
        submitted: true,
        status: status ? "Success" : "Error",
        message: message,
        color: status ? "bg-emerald-500" : "bg-orange-500",
      });
    }
  }, [isSubmitted, status, message])
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
            labelIdle='Drag & Drop your pdf file or <span class="filepond--label-action">Browse</span> <br/> (MAX FILES: 100, MAX FILESIZE: 20MB)'
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
                isLoading ? "opacity-20" : ""
              }`}
              type="button"
              onClick={onProcessFile}
              disabled={isLoading}
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
            >
              <i
                className={`fas fa-arrow-rotate-right ${
                  isRefreshing ? "fa-spin" : ""
                }`}
              ></i>{" "}
              {isRefreshing ? "Refreshing..." : "Refresh"}
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
        </div>
        {responseStatus.submitted && (
        <Alert
          alertClass={responseStatus.color}
          alertTitle={responseStatus.status}
          alertMessage={responseStatus.message}
        />
      )}
        <div className={isLoading ? "opacity-20" : ""}>
          <ExtractionFileList />
        </div>
      </div>
    </div>
  );
};
export default MultiFileUpload;
