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
  const textareaRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const existingQuestions = useSelector(
    (state) => state.questionAbstractData.questions
  );
  const [questionList, setQuestionList] = useState([{ question: "" }]);
  const [textareaError, setTextareaError] = useState("");
  const projectName = localStorage.getItem("selectedProject");

  useEffect(() => {
    const questionsFromLocalStorage =
      JSON.parse(localStorage.getItem("questions")) || {};
    const formattedQuestions = (questionsFromLocalStorage[category] || []).map(
      (entry) => ({ question: entry })
    );
    setQuestionList(formattedQuestions);
  }, [category]);

  const updateRows = useCallback(() => {
    if (textareaRef.current) {
      const lines = textareaRef.current.value.split("\n");
      textareaRef.current.rows = lines.length + 1;
    }
  }, []);

  useEffect(() => {
    updateRows();
  }, [questionList, updateRows]);

  const questionAddHandler = useCallback(() => {
    setQuestionList((prevQuestions) => [...prevQuestions, { question: "" }]);
  }, []);

  const questionRemoveHandler = useCallback(
    (index, item) => {
      setQuestionList((prevQuestions) => {
        const updatedQuestions = [...prevQuestions];
        updatedQuestions.splice(index, 1);
        return updatedQuestions;
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
      const wordCount = value.split(/\s+/).length;
      const charCount = value.length;

      if (wordCount < 3 || wordCount > 50) {
        setTextareaError("Question should have between 3 and 50 words.");
        return;
      } else if (charCount > 300) {
        setTextareaError("Question should not exceed 300 characters.");
        return;
      } else {
        setTextareaError("");
      }

      setQuestionList((prevList) => {
        const newList = [...prevList];
        newList[index].question = value;
        return newList;
      });

      setCurrentIndex(index);
      updateRows();
    },
    [updateRows]
  );

  const saveQuestionsHandler = useCallback(
    (event) => {
      if (!textareaError) {
        const currentQuestion = event.target.value;
        const updatedExistingQuestions = { ...existingQuestions };
        const updatedCategoryQuestions = updatedExistingQuestions[category]
          ? [...updatedExistingQuestions[category]]
          : [];
        updatedCategoryQuestions[currentIndex] = currentQuestion;
        updatedExistingQuestions[category] = updatedCategoryQuestions;
        dispatch(setQuestions(projectName, updatedExistingQuestions));
      }
    },
    [
      textareaError,
      existingQuestions,
      category,
      currentIndex,
      dispatch,
      projectName,
    ]
  );

  return (
    <div className="pt-0 mt-2 flex-col max-h-60 overflow-y-auto">
      <span>Question(s)</span>
      {questionList.map((singleQuestion, index) => (
        <div key={index} className="questions">
          <div className="relative flex w-full flex-wrap items-stretch mb-3">
            <textarea
              ref={textareaRef}
              rows="1"
              type="text"
              name="question"
              placeholder="Please enter a question"
              className="pl-2 pr-8 py-1 placeholder-blueGray-300 text-blueGray-600 relativebg-white rounded text-sm border border-blueGray-300 outline-none focus:outline-none focus:shadow-outline w-full resize-none"
              required
              value={singleQuestion.question}
              onChange={(e) => questionChangeHandler(e, index)}
              onInput={updateRows}
              onBlur={saveQuestionsHandler}
            />
            {textareaError && (
              <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                <i className="fas fa-triangle-exclamation"></i>
                {textareaError}
              </p>
            )}
            {questionList.length > 1 && (
              <span
                className={
                  "z-10 leading-snug font-normal cursor-pointer text-center text-white bg-blueGray-500 hover:bg-red-500 absolute rounded text-base items-center justify-center w-8 right-0 py-1"
                }
                onClick={() =>
                  questionRemoveHandler(index, singleQuestion.question)
                }
              >
                <i className="fas fa-xmark "></i>
              </span>
            )}
            {questionList.length - 1 === index && questionList.length < 20 && (
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
