import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setQuestions } from "../../redux/thunks/qa-thunks";
import styles from "./DynamicInput.module.css";

const camelize = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

const DynamicInput = ({ category: rawCategory }) => {
  const dispatch = useDispatch();
  const category = camelize(rawCategory.toLowerCase());
  const textareaRefs = useRef([]);
  const existingQuestions = useSelector(
    (state) => state.questionAbstractData.questions
  );

  const [questionList, setQuestionList] = useState([]);
  const projectId = localStorage.getItem("currentProjectId");
  useEffect(() => {
    const questionsFromLocalStorage =
      JSON.parse(localStorage.getItem("questions")) || {};

    const formattedQuestions = (questionsFromLocalStorage[category] || []).map(
      (entry) => ({ question: entry, error: "" })
    );

    if (formattedQuestions.length === 0) {
      formattedQuestions.push({ question: "", error: "" });
    }

    setQuestionList(formattedQuestions);
  }, [category]);

  const updateRows = useCallback((index) => {
    if (textareaRefs.current[index]) {
      const lines = textareaRefs.current[index].value.split("\n");
      textareaRefs.current[index].rows = lines.length + 1;
    }
  }, []);

  useEffect(() => {
    questionList.forEach((_, index) => updateRows(index));
  }, [questionList, updateRows]);

  const questionAddHandler = useCallback(() => {
    setQuestionList((prevQuestions) => [
      ...prevQuestions,
      { question: "", error: "" },
    ]);
  }, []);
  const saveQuestionsHandler = useCallback(
    (updatedList = questionList) => {
      const updatedQuestions = {
        ...existingQuestions,
        [category]: updatedList.map((item) => item.question),
      };

      dispatch(
        setQuestions({ projectId, category, questions: updatedQuestions })
      );
    },
    [existingQuestions, category, dispatch, projectId, questionList]
  );
  const questionRemoveHandler = useCallback(
    (index) => {
      setQuestionList((prevList) => {
        const newList = [...prevList];
        newList.splice(index, 1);
        saveQuestionsHandler(newList); // Call saveQuestionsHandler with updated list
        return newList;
      });
    },
    [saveQuestionsHandler]
  );

  const questionChangeHandler = useCallback(
    (event, index) => {
      const value = event.target.value;

      setQuestionList((prevList) => {
        const newList = [...prevList];
        newList[index].question = value;
        return newList;
      });
      updateRows(index);
    },
    [updateRows]
  );

  const saveQuestionOnBlurHandler = useCallback(
    (event, index) => {
      let currentQuestion = event.target.value;
      const wordCount = currentQuestion.split(/\s+/).length;
      const charCount = currentQuestion.length;
      let errorMessage = "";

      if (category !== "exclusionCriteria") {
        if (wordCount < 3 || wordCount > 50) {
          errorMessage = "Question should have between 3 and 50 words.";
        } else if (charCount > 300) {
          errorMessage = "Question should not exceed 300 characters.";
        }
      }

      if (category === "exclusionCriteria") {
        if (charCount > 300) {
          errorMessage = "Exclusion keyword should not exceed 300 characters.";
        } else {
          currentQuestion = `${currentQuestion}`;
        }
      }

      setQuestionList((prevList) => {
        const newList = [...prevList];
        if (typeof index === "number" && newList[index]) {
          newList[index].error = errorMessage;
        } else {
          console.warn("Invalid index:", index);
        }
        return newList;
      });

      if (errorMessage) {
        return;
      }

      const updatedQuestions = {
        ...existingQuestions,
        [category]: questionList.map((item) => item.question),
      };

      dispatch(
        setQuestions({ projectId, category, questions: updatedQuestions })
      );
    },
    [existingQuestions, category, dispatch, projectId, questionList]
  );

  return (
    <div className={styles["pt-0 mt-2 flex-col max-h-60 overflow-y-auto"]}>
      {category !== "exclusionCriteria" ? (
        <span>Question(s)</span>
      ) : (
        <span>Exclusion Keyword(s)</span>
      )}
      {questionList.map((singleQuestion, idx) => (
        <React.Fragment key={idx}>
          <div className={styles.questions}>
            <div className="relative flex w-full flex-wrap items-stretch">
              <textarea
                ref={(el) => (textareaRefs.current[idx] = el)}
                rows="1"
                type="text"
                name="question"
                placeholder={
                  category !== "exclusionCriteria"
                    ? "Please enter a question"
                    : "Please enter an exclusion keywords"
                }
                className="pl-2 pr-8 py-1 placeholder-blueGray-300 text-blueGray-600 relativebg-white rounded text-sm border border-blueGray-300 outline-none focus:outline-none focus:shadow-outline w-full resize-none"
                required
                value={singleQuestion.question}
                onChange={(e) => questionChangeHandler(e, idx)}
                onInput={updateRows}
                onBlur={(e) => saveQuestionOnBlurHandler(e, idx)}
              />
              {singleQuestion.error && (
                <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                  <i className="fas fa-triangle-exclamation"></i>
                  {singleQuestion.error}
                </p>
              )}
              {questionList.length > 1 && (
                <span
                  className={
                    "leading-snug font-normal cursor-pointer text-center text-white bg-blueGray-500 hover:bg-red-500 absolute rounded text-base items-center justify-center w-8 right-0 py-1"
                  }
                  onClick={() => questionRemoveHandler(idx)}
                >
                  <i className="fas fa-xmark "></i>
                </span>
              )}
              {questionList.length - 1 === idx && questionList.length < 20 && (
                <button
                  className="text-lightBlue-500 bg-transparent border border-solid border-lightBlue-500 hover:bg-lightBlue-500 hover:text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 mt-3"
                  type="button"
                  onClick={questionAddHandler}
                >
                  <i className="fas fa-plus"></i> Add
                </button>
              )}
            </div>
          </div>
          {idx < questionList.length - 1 && (
            <div className={styles["or-connector"]}>
              <span className={styles["or-text"]}>O R</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default DynamicInput;
