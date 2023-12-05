import { dataExtractionActions } from "../slices/dataExtractionSlice";
import {api} from "util/api";
import * as XLSX from "xlsx";

export const generateSingleFileResults = (file, questions, selectedPrompt) => {
  const formData = new FormData();
  formData.append("file", file[0], file[0].name);
  formData.append("questions_dict", JSON.stringify(questions));
  formData.append("project_name", localStorage.getItem("selectedProject"));
  formData.append("prompt_text", selectedPrompt);
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
      dispatch(
        dataExtractionActions.setFilesSubmitted({
          isSubmitted: response.data["success"],
        })
      );
      dispatch(
        dataExtractionActions.setTaskId({ taskId: response.data["task_id"] })
      );
      dispatch(dataExtractionActions.setProgress({ progress: 100 }));
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

export const generateExtractionResults = (files, questions, newBatchID, selectedPrompt) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i].file, files[i].filename);
  }
  formData.append("questions_dict", JSON.stringify(questions));
  formData.append("project_name", localStorage.getItem("selectedProject"));
  formData.append("batch_id", newBatchID);
  formData.append("prompt_text", selectedPrompt);
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
      return response.data;
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
      return error;
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
          processedFiles: response.data,
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
      return response.data;
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
      return Promise.resolve(response); // Resolve the promise with the response
    } catch (error) {
      console.log(error);
      return Promise.reject(error); // Reject the promise with the error
    }
  };
};


function downloadXLSX(data, exportFileName) {
  const workbook = XLSX.utils.book_new();

  const csvData = [];

  data.forEach((item) => {
    const row = {
      file_name: item.file_name,
      aboutFile:
        item.results
          .find((result) => "aboutFile" in result)
          ?.aboutFile.join("\n")
          .replace(/\n/g, " ") || "",
    };

    item.results.forEach((result) => {
      const key = Object.keys(result)[0];

      // Skip aboutFile because it's already handled
      if (key === "aboutFile") return;

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

  // Start columns with file_name and aboutFile
  const columns = ["file_name", "aboutFile"];

  // Then add all unique keys from the data (except file_name and aboutFile)
  data.forEach((item) => {
    item.results.forEach((result) => {
      const key = Object.keys(result)[0];
      if (!columns.includes(key)) {
        columns.push(key);
      }
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(csvData, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
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
      downloadXLSX(response.data, projectName);
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

export const fetchTaskStatus = (taskId) => {
  return async (dispatch) => {
    const sendData = async () => {
      return await api.get(`check-task-status/${taskId}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
    };
    try {
      const response = await sendData();
      const taskStatus = response.data;
      
      // Dispatch the task's current status
      dispatch(dataExtractionActions.setTaskStatus({
        taskStatus: taskStatus.state,
      }));
      if (taskStatus.state === "SUCCESS") {
        console.log(taskStatus);
        dispatch(dataExtractionActions.setSingleExtractionResult({
          singleExtractionResult: taskStatus.result,
        }));
      }

      return taskStatus;  // Return the task status for further handling in the component

    } catch (error) {
      console.log(error);
      throw error;  // Propagate the error to be caught in the useEffect
    }
  };
};

export const fetchPrompts = () => {
  return async (dispatch) => {
    try {
      const response = await api.get(`/prompt/${localStorage.getItem("selectedProject")}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(dataExtractionActions.setPrompts({ prompts: response.data["prompts"] }));
      dispatch(dataExtractionActions.setSelectedPrompt({ selectedPrompt: response.data["selected_prompt"] }));
    } catch (error) {
      console.log(error);
    }
  };
};


export const createPrompt = (promptData) => {
  return async (dispatch) => {
    try {
      await api.post("/prompt", promptData, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(fetchPrompts());  // Refresh the prompts after adding a new one
    } catch (error) {
      console.log(error);
    }
  };
};

export const updatePrompt = (title, updatedPromptData) => {
  return async (dispatch) => {
    try {
      await api.put(`/prompt/${title}`, updatedPromptData, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(fetchPrompts());  // Refresh the prompts after updating
    } catch (error) {
      console.log(error);
    }
  };
};

export const deletePrompt = (title) => {
  let projectName = localStorage.getItem("selectedProject");
  return async (dispatch) => {
    try {
      await api.delete(`/prompt/${projectName}/${title}`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(fetchPrompts());  // Refresh the prompts after deleting
    } catch (error) {
      console.log(error);
    }
  };
};

export const setSelectedPrompt = (selectedPrompt) => {
  let projectName = localStorage.getItem("selectedProject");
  return async (dispatch) => {
    try {
      await api.put(`/selected_prompt/${projectName}`, selectedPrompt, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      dispatch(dataExtractionActions.setSelectedPrompt(selectedPrompt));
    } catch (error) {
      console.log(error);
    }
  };
};
