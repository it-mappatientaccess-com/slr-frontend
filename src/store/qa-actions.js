import { questionAbstractActions } from "../slices/questionAbstractSlice";
import {api} from "util/api";

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
      console.log(response);
      dispatch(
        questionAbstractActions.setSingleAbstractResult({
          singleAbstractResult: response.data,
        })
      );
      dispatch(
        questionAbstractActions.setIsResultGenerated({
          isResultGenerated: true,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        questionAbstractActions.setIsResultGenerated({
          isResultGenerated: false,
        })
      );
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
