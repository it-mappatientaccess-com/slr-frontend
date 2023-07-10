import { dataExtractionActions } from "../slices/dataExtractionSlice";
import api from "util/api";
import Papa from "papaparse";
import { saveAs } from "file-saver";

export const generateSingleFileResults = (file, questions) => {
  const formData = new FormData();
  formData.append("file", file[0].file, file[0].filename);
  formData.append("questions_dict", JSON.stringify(questions));
  formData.append("project_name", localStorage.getItem("selectedProject"));
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress: 70,
      })
    );
    dispatch(
      dataExtractionActions.setSingleExtractionResult({
        singleExtractionResult: [],
      })
    );
    const sendData = async (formData) => {
      return await api.post("single-pdf-extraction", formData, {
        headers: {
          Authorization: localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      });
    };
    try {
      const response = await sendData(formData);
      console.log(response.data);
      dispatch(
        dataExtractionActions.setFilesSubmitted({
          isSubmitted: response.data["success"],
        })
      );
      dispatch(
        dataExtractionActions.setSingleExtractionResult({
          singleExtractionResult: response.data,
        })
      );
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const generateExtractionResults = (files, questions) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i].file, files[i].filename);
  }
  formData.append("questions_dict", JSON.stringify(questions));
  formData.append("project_name", localStorage.getItem("selectedProject"));
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress: 70,
      })
    );

    const sendData = async (formData) => {
      return await api.post("multiple-pdf-extraction", formData, {
        headers: {
          Authorization: localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      });
    };
    try {
      const response = await sendData(formData);
      console.log(response);
      // localStorage.setItem("totalFileCount", response.data["file_ids"].length);

      dispatch(
        dataExtractionActions.setStatus({
          status: response.data["status"],
          message: response.data["message"],
        })
      );
      dispatch(
        dataExtractionActions.setFilesSubmitted({
          isSubmitted: true,
        })
      );
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
      dispatch(
        dataExtractionActions.setStatus({
          status: error.data["status"],
          message: error.data["message"],
        })
      );
      dispatch(
        dataExtractionActions.setFilesSubmitted({
          isSubmitted: true,
        })
      );
    }
  };
};

export const fetchProcessedFileNames = () => {
  const projectName = localStorage.getItem("selectedProject");
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async () => {
      return await api.get(`get_extraction_file_names/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
    };
    try {
      const response = await sendData();
      dispatch(
        dataExtractionActions.setProcessedFiles({
          processedFiles: response.data["file_names"],
        })
      );
      dispatch(
        dataExtractionActions.setIsRefreshing({
          isRefreshing: false,
        })
      );
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const fetchExtractionFileResults = (file_id, projectName) => {
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async () => {
      return await api.get(
        `get_extraction_file_results/${file_id}?projectName=${projectName}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
    };
    try {
      const response = await sendData();
      console.log(response.data);
      dispatch(
        dataExtractionActions.setExtractionResult({
          extractionResult: response.data.results,
        })
      );
      dispatch(
        dataExtractionActions.setSelectedFile({
          selectedFile: response.data["file_name"],
        })
      );
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export function setProgress(progress) {
  return (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress,
      })
    );
  };
}

export const deletePdfData = (file_id) => {
  return async (dispatch) => {
    const sendData = async () => {
      return await api
        .delete(`delete_pdf_data/${file_id}`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData(file_id);
      console.log(response);
      dispatch(fetchProcessedFileNames());
    } catch (error) {
      console.log(error);
    }
  };
};

function downloadCSV(data, exportFileName) {
  const csvData = [];

  data.forEach((item) => {
    const row = {
      file_name: item.file_name,
    };

    item.results.forEach((result) => {
      const key = Object.keys(result)[0];

      const values = result[key]
        .map((value) => {
          if (typeof value === "string" && value.includes("Answer:")) {
            const sections = value.split("Answer:");
            const answers = sections
              .slice(1)
              .map((section) => section.split("Direct Quote", 1)[0].trim())
              .filter(Boolean);
            return answers.join("\n");
          }
          return value;
        })
        .filter(Boolean) // Remove empty strings
        .join("\n");

      row[key] = values.replace(/\n/g, " ");
    });

    csvData.push(row);
  });

  // Specify the order of the columns
  const columns = [
    "file_name",
    "aboutFile",
    "studyDesign",
    "population",
    "intervention",
    "outcomes",
  ];

  const csv = Papa.unparse(csvData, { columns });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

  saveAs(blob, exportFileName);
}

export const fetchAllExtractionResults = (projectName) => {
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async () => {
      return await api.get(`get_all_extraction_results/${projectName}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
    };
    try {
      const response = await sendData();
      downloadCSV(response.data, projectName);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        dataExtractionActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const resetSingleExtrationResult = () => {
  return async (dispatch) => {
    dispatch(
      dataExtractionActions.setSingleExtractionResult({
        singleExtractionResult: [],
      })
    );
  };
};
