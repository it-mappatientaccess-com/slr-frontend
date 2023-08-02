import { questionAbstractActions } from "../slices/questionAbstractSlice";
import api from "util/api";

export const setQuestions = (projectName, questions) => {
  return async (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async (projectName, questions) => {
      return await api
        .post(
          "questions",
          { projectName, questions },
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        )
        .then((response) => {
          return response;
        });
    };
    try {
      await sendData(projectName, questions);
      localStorage.setItem("questions", JSON.stringify(questions));
      dispatch(
        questionAbstractActions.setQuestions({
          questions,
        })
      );
      dispatch(
        questionAbstractActions.setIsQuestionsEmpty({
          isQuestionsEmpty: false,
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const setSeaQuestions = (projectName, questions) => {
  return async (dispatch, getState) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 60,
      })
    );
    const sendData = async (projectName, seaQuestionsDict) => {
      return await api
        .post(
          "seaQuestions",
          { projectName, seaQuestions: seaQuestionsDict },
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        )
        .then((response) => {
          return response;
        });
    };
    try {
      // Dispatch the action to update the seaQuestions state in the Redux store
      dispatch(
        questionAbstractActions.setSEAQuestionsDict({
          seaQuestions: questions,
        })
      );
      // Wait for the seaQuestions state to be updated
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Get the updated seaQuestions state
      const updatedSeaQuestions = getState().questionAbstractData.seaQuestions;
      // Send the updated seaQuestions state to the backend
      await sendData(projectName, updatedSeaQuestions);
      
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};


export const fetchOldQuestions = (projectName) => {
  return async (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async (projectName) => {
      return await api
        .get(`questions?projectName=${projectName}`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData(projectName);
      console.log(response);
      let isEmptyFlag = false;
      for (let category of Object.keys(response.data.questions)) {
        if (response.data.questions[category].length === 0) {
          isEmptyFlag = true;
        }
      }
      if (response.data.length === 0 || isEmptyFlag === true) {
        const questions = {
          studyDesign: [""],
          population: [""],
          intervention: [""],
          outcomes: [""],
        };
        localStorage.setItem("questions", JSON.stringify(questions));
        dispatch(
          questionAbstractActions.setQuestions({
            questions: questions,
          })
        );
      } else {
        localStorage.setItem(
          "questions",
          JSON.stringify(response.data.questions)
        );
        dispatch(
          questionAbstractActions.setQuestions({
            questions: response.data.questions,
          })
        );
      }
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      localStorage.setItem(
        "questions",
        JSON.stringify({
          studyDesign: [""],
          population: [""],
          intervention: [""],
          outcomes: [""],
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
      console.log(error);
    }
  };
};

export const fetchOldSeaQuestions = (projectName) => {
  return async (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async (projectName) => {
      return await api
        .get(`seaQuestions?projectName=${projectName}`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData(projectName);
      let isEmptyFlag = false;
      for (let category of Object.keys(response.data.seaQuestions)) {
        if (response.data.seaQuestions[category].length === 0) {
          isEmptyFlag = true;
        }
      }
      if (response.data.length === 0 || isEmptyFlag === true) {
        const questions = {
          column1: [""],
        };
        dispatch(
          questionAbstractActions.setSEAQuestionsDict({
            seaQuestions: questions,
          })
        );
      } else {
        dispatch(
          questionAbstractActions.setSEAQuestionsDict({
            seaQuestions: response.data.seaQuestions,
          })
        );
      }
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      const questions = {
        column1: [""],
      };
      dispatch(
        questionAbstractActions.setSEAQuestionsDict({
          seaQuestions: questions,
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
      console.log(error);
    }
  };
};


export const setAbstractText = (abstract) => {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setAbstractText({
        abstract,
      })
    );
  };
};

export const setsubmitQABtn = (setsubmitQABtnState) => {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setsubmitQABtn({
        submitQABtn: setsubmitQABtnState,
      })
    );
  };
};

export const setIsQuestionsEmpty = (isQuestionsEmpty) => {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setIsQuestionsEmpty({
        isQuestionsEmpty,
      })
    );
  };
};

export const setSubmitClicked = (submitStatus) => {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setSubmitClicked({
        submitClicked: submitStatus,
      })
    );
    dispatch(
      questionAbstractActions.setIsResultGenerated({
        isResultGenerated: false,
      })
    );
  };
};

function groupConsecutiveIndexes(arr) {
  const result = [];
  let group = [arr[0]];

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      group.push(arr[i]);
    } else {
      result.push(group);
      group = [arr[i]];
    }
  }

  result.push(group);
  return result;
}

function joinStringsByIndexGroups(stringsArr, indexGroups) {
  const result = [];
  let currentIndex = 0;

  for (const group of indexGroups) {
    const groupStrings = group.map((index) => stringsArr[index]);
    const joinedGroup = groupStrings.join(" ");
    result.push(stringsArr.slice(currentIndex, group[0]).concat(joinedGroup));
    // pushing empty string for elements that are being replaced
    for (let i = 1; i < group.length; i++) {
      result.push("");
    }
    currentIndex = group[group.length - 1] + 1;
  }

  if (currentIndex < stringsArr.length) {
    result.push(stringsArr.slice(currentIndex));
  }

  return result.flat();
}

function processArray(input_array) {
  const output_array = [];

  for (let i = 0; i < input_array.length; i++) {
    if (input_array[i].includes("##")) {
      // Concatenate with previous non-'##' element
      let prev_index = i - 1;
      while (prev_index >= 0 && input_array[prev_index] === "") {
        prev_index--;
      }
      if (prev_index >= 0 && !input_array[prev_index].includes("##")) {
        output_array[prev_index] += input_array[i].replace("##", "");
      } else {
        // Choose any previous non-'##' element
        prev_index = i - 1;
        while (prev_index >= 0 && input_array[prev_index].includes("##")) {
          prev_index--;
        }
        if (prev_index >= 0) {
          output_array[prev_index] += input_array[i].replace("##", "");
        }
      }

      // Replace '##' element with empty string
      output_array.push("");
    } else if (input_array[i] === "[UNK]") {
      // Replace '[UNK]' element with empty string
      output_array.push("");
    } else {
      // Store non-'##' and non-'[UNK]' element
      output_array.push(input_array[i]);
    }
  }

  return output_array;
}

const abstractToNERText = (abstractNER, abstract) => {
  let abstractNerMappedText = "";
  let tokenizedInput = [];
  let output = [];
  tokenizedInput = ["", ...abstractNER["tokenized_input"]];
  output = [...abstractNER["output"]];
  const entityClassMapping = {
    "B-PAR": {
      classes:
        "text-xs font-semibold inline-block py-1 px-2 rounded text-amber-600 bg-amber-200 last:mr-0 mr-1",
      text: "POPULATION",
    },
    "B-INT": {
      classes:
        "text-xs font-semibold inline-block py-1 px-2 rounded text-pink-600 bg-pink-200 last:mr-0 mr-1",
      text: "INTERVENTION",
    },
    "B-OUT": {
      classes:
        "text-xs font-semibold inline-block py-1 px-2 rounded text-teal-600 bg-teal-200 last:mr-0 mr-1",
      text: "OUTCOME",
    },
  };
  const indexes = [];
  for (let entry of Object.values(output)) {
    indexes.push(JSON.parse(entry)["index"]);
  }
  const indexGroups = groupConsecutiveIndexes(indexes);
  tokenizedInput = processArray(tokenizedInput);
  const aggregatedTokenizedInput = joinStringsByIndexGroups(
    tokenizedInput,
    indexGroups
  );
  // loop through tokenized input
  for (let i = 0; i < aggregatedTokenizedInput.length; i++) {
    // loop through model output
    for (let j = 0; j < output.length; j++) {
      let token = JSON.parse(output[j]);
      if (i === token["index"] && aggregatedTokenizedInput[i] !== "") {
        aggregatedTokenizedInput[i] = `<span class="${
          entityClassMapping[token["entity"]]["classes"]
        }">${`<span class="text-blueGray-700">${aggregatedTokenizedInput[i]}</span>`}  ${
          entityClassMapping[token["entity"]]["text"]
        }</span>`;
      }
    }
  }

  for (let i = 0; i < aggregatedTokenizedInput.length; i++) {
    abstractNerMappedText = abstractNerMappedText.concat(
      " ",
      aggregatedTokenizedInput[i]
    );
  }
  return abstractNerMappedText;
};

export const generateAbstractToNERText = (abstractNER, abstract) => {
  const abstractNerText = abstractToNERText(abstractNER, abstract);
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setAbstractNerMappedText({
        abstractNerMappedText: abstractNerText,
      })
    );
    return abstractNerText;
  };
};

export const getNERData = (abstract) => {
  return async (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async (abstract) => {
      return await api
        .post(
          "generate_ner",
          {
            abstract,
          },
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        )
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData(abstract);
      dispatch(
        questionAbstractActions.setAbstractNER({
          abstractNER: abstractToNERText(response.data, abstract),
        })
      );
      dispatch(
        questionAbstractActions.setIsResultGenerated({
          isResultGenerated: true,
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const getSingleQAResult = (questions, abstract) => {
  return async (dispatch) => {
    const sendData = async (questions, abstract) => {
      return await api
        .post(
          "generate_decision",
          {
            questions,
            abstract,
          },
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        )
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData(questions, abstract);
      dispatch(
        questionAbstractActions.setSingleAbstractResult({
          singleAbstractResult: response.data,
        })
      );
    } catch (error) {
      console.log(error);
    }
  };
};

export const getAllResults = (projectName) => {
  return async (dispatch) => {
    dispatch(questionAbstractActions.setProgress({ progress: 70 }));

    const sendData = async () => {
      const token = localStorage.getItem("token");
      const response = await api.get(
        `get_all_results?projectName=${projectName}`,
        {
          headers: { Authorization: token },
        }
      );
      return response;
    };

    const resetState = () => {
      dispatch(
        questionAbstractActions.setAllAbstractResults({
          allAbstractResults: [],
          numberOfExamples: 0,
        })
      );
      dispatch(
        questionAbstractActions.setIsProcessing({ isProcessing: false })
      );
      dispatch(
        questionAbstractActions.setIsRefreshing({ isRefreshing: false })
      );
      dispatch(questionAbstractActions.setProgress({ progress: 100 }));
    };

    try {
      const response = await sendData();
      console.log(response.data);

      const { results, number_of_examples, is_processing, task_id } =
        response.data;

      dispatch(
        questionAbstractActions.setAllAbstractResults({
          allAbstractResults: results,
          numberOfExamples: number_of_examples,
        })
      );
      dispatch(
        questionAbstractActions.setIsProcessing({ isProcessing: is_processing })
      );
      dispatch(
        questionAbstractActions.setIsRefreshing({ isRefreshing: false })
      );
      dispatch(questionAbstractActions.setTaskId({ taskId: task_id }));
      dispatch(questionAbstractActions.setProgress({ progress: 100 }));
    } catch (error) {
      console.log(error);
      resetState();
    }
  };
};

export function resetQAStore() {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.resetQAStore({
        resetStore: true,
      })
    );
  };
}

export const stopModelExecution = (taskId) => {
  return async (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress: 50,
      })
    );
    const sendData = async () => {
      return await api
        .post(`stop_model_execution/${taskId}`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const response = await sendData();
      dispatch(
        questionAbstractActions.setIsProcessing({
          isProcessing: response.data["is_processing"],
        })
      );
      dispatch(
        questionAbstractActions.setIsStopping({
          isStopping: false,
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        questionAbstractActions.setIsStopping({
          isStopping: false,
        })
      );
      dispatch(
        questionAbstractActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const setNumberOfExamples = (numberOfExamples) => {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setNumberOfExamples({
        numberOfExamples: numberOfExamples,
      })
    );
  };
};

export function setProgress(progress) {
  return (dispatch) => {
    dispatch(
      questionAbstractActions.setProgress({
        progress,
      })
    );
  };
}
