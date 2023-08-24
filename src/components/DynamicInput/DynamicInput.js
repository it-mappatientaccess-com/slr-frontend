import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setQuestions } from "../../store/qa-actions";

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

  // Updated state structure
  const [questionList, setQuestionList] = useState([]);
  const projectName = localStorage.getItem("selectedProject");

  useEffect(() => {
    const questionsFromLocalStorage =
      JSON.parse(localStorage.getItem("questions")) || {};

    const formattedQuestions = (questionsFromLocalStorage[category] || []).map(
      (entry) => ({ question: entry, error: "" })
    );

    if (formattedQuestions.length === 0) {
      // If there are no questions for this category, add a default empty question
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
    // Just call updateRows without arguments, it will loop through the refs internally
    questionList.forEach((_, index) => updateRows(index));
  }, [questionList, updateRows]);

  // Updated to include error property
  const questionAddHandler = useCallback(() => {
    setQuestionList((prevQuestions) => [
      ...prevQuestions,
      { question: "", error: "" },
    ]);
  }, []);

  const questionRemoveHandler = useCallback(
    (index, item) => {
      // Set the error for the specific question being saved
      setQuestionList((prevList) => {
        const newList = [...prevList];
        newList.splice(index, 1);
        return newList;
      });

      const updatedExistingQuestions = { ...existingQuestions };
      if (
        updatedExistingQuestions[category] &&
        updatedExistingQuestions[category].includes(item)
      ) {
        updatedExistingQuestions[category] = updatedExistingQuestions[
          category
        ].filter((question) => question !== item);
      }

      dispatch(setQuestions(projectName, updatedExistingQuestions));
    },
    [existingQuestions, category, dispatch, projectName]
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

  const saveQuestionsHandler = useCallback(
    (event, index) => {
      const currentQuestion = event.target.value;
      const wordCount = currentQuestion.split(/\s+/).length;
      const charCount = currentQuestion.length;
      let errorMessage = "";

      if (wordCount < 3 || wordCount > 50) {
        errorMessage = "Question should have between 3 and 50 words.";
      } else if (charCount > 300) {
        errorMessage = "Question should not exceed 300 characters.";
      }

      // Set the error for the specific question being saved
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
        return; // Prevent saving if there's an error
      }

      const updatedExistingQuestions = { ...existingQuestions };
      if (!updatedExistingQuestions[category]) {
        updatedExistingQuestions[category] = [];
      }

      // Create a deep copy of the category array, modify it, then assign it back
      const categoryQuestionsCopy = [...updatedExistingQuestions[category]];
      categoryQuestionsCopy[index] = currentQuestion;
      updatedExistingQuestions[category] = categoryQuestionsCopy;

      dispatch(setQuestions(projectName, updatedExistingQuestions));
    },
    [existingQuestions, category, dispatch, projectName]
  );

  return (
    <div className="pt-0 mt-2 flex-col max-h-60 overflow-y-auto">
      <span>Question(s)</span>
      {questionList.map((singleQuestion, idx) => (
        <div key={idx} className="questions">
          <div className="relative flex w-full flex-wrap items-stretch mb-3">
            <textarea
              ref={el => textareaRefs.current[idx] = el} 
              rows="1"
              type="text"
              name="question"
              placeholder="Please enter a question"
              className="pl-2 pr-8 py-1 placeholder-blueGray-300 text-blueGray-600 relativebg-white rounded text-sm border border-blueGray-300 outline-none focus:outline-none focus:shadow-outline w-full resize-none"
              required
              value={singleQuestion.question}
              onChange={(e) => questionChangeHandler(e, idx)}
              onInput={updateRows}
              onBlur={(e) => saveQuestionsHandler(e, idx)}
            />
            {/* Updated to display error for each specific question */}
            {singleQuestion.error && (
              <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                <i className="fas fa-triangle-exclamation"></i>
                {singleQuestion.error}
              </p>
            )}
            {questionList.length > 1 && (
              <span
                className={
                  "z-10 leading-snug font-normal cursor-pointer text-center text-white bg-blueGray-500 hover:bg-red-500 absolute rounded text-base items-center justify-center w-8 right-0 py-1"
                }
                onClick={() =>
                  questionRemoveHandler(idx, singleQuestion.question)
                }
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
      ))}
    </div>
  );
};

export default DynamicInput;
