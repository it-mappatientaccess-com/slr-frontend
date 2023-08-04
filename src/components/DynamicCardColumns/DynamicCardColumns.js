import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSeaQuestions } from "../../store/qa-actions";

const DynamicCardColumns = (props) => {
  const dispatch = useDispatch();
  const category = props.category;
  const textareaRef = useRef(null);
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(category);

  const existingQuestions = useMemo(() => {
    return seaQuestions[category] || [];
  }, [seaQuestions, category]);

  const [questionList, setQuestionList] = useState(existingQuestions);

  useEffect(() => {
    setQuestionList(existingQuestions);
  }, [existingQuestions]);

  const projectName = localStorage.getItem("selectedProject");

  const questionAddHandler = () => {
    setQuestionList((prevQuestions) => [...prevQuestions, ""]);
  };

  const questionRemoveHandler = (index) => {
    const existingQuestionList = [...questionList];
    existingQuestionList.splice(index, 1);
    setQuestionList(existingQuestionList);
    let updatedQuestions = {
      ...seaQuestions,
      [category]: Object.values(existingQuestionList),
    };
    dispatch(setSeaQuestions(projectName, updatedQuestions));
  };

  const saveColumnNameHandler = () => {
    setIsEditing(false);
    // Notify the parent component about the updated column name
    if (category !== columnName) {
      // Only update if the column name has changed
      props.onUpdateColumnName(category, columnName); // Pass old and new column name
    }
  };

  const saveQuestionsHandler = () => {
    let updatedQuestions = {
      ...seaQuestions,
      [category]: Object.values(questionList),
    };
    dispatch(setSeaQuestions(projectName, updatedQuestions));
  };

  const questionChangeHandler = (event, index) => {
    const { value } = event.target;

    setQuestionList((prevQuestions) => {
      const updatedQuestions = prevQuestions.map((question, i) =>
        i === index ? value : question
      );
      return updatedQuestions;
    });
  };

  const updateRows = () => {
    if (!textareaRef.current) return;
    const lines = textareaRef.current.value.split("\n");
    const rows = lines.length + 1;
    textareaRef.current.rows = rows;
  };

  useEffect(() => {
    updateRows();
  }, [questionList]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
      <div className="flex-auto p-4">
        <div className="flex flex-wrap justify-between items-center w-full">
          <div className="flex items-center flex-grow">
            {isEditing ? (
              <>
                <input
                  type="text"
                  maxLength="20"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  className="border rounded pl-2 flex-grow" // Flex grow to take available space
                />
                <button
                  className="text-teal-500 bg-transparent border border-solid border-teal-500 hover:bg-teal-500 hover:text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={saveColumnNameHandler}
                >
                  <i className="fas fa-save cursor-pointer"></i>
                </button>
              </>
            ) : (
              <span className="font-semibold text-xl text-blueGray-700">
                {category}
              </span>
            )}
          </div>
          {!isEditing && (
            <button
              className="text-blueGray-500 bg-transparent border border-solid border-blueGray-500 hover:bg-blueGray-500 hover:text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              <i className="fas fa-pencil-alt cursor-pointer"></i>
            </button>
          )}
        </div>

        <div>
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
                    value={singleQuestion}
                    onChange={(e) => questionChangeHandler(e, index)}
                    onInput={updateRows}
                    onBlur={saveQuestionsHandler}
                  />
                  {questionList.length > 1 && (
                    <span
                      className={
                        "z-10 leading-snug font-normal cursor-pointer text-center text-white bg-blueGray-500 hover:bg-red-500 absolute rounded text-base items-center justify-center w-8 right-0 py-1"
                      }
                      onClick={() =>
                        questionRemoveHandler(index, singleQuestion)
                      }
                    >
                      <i className="fas fa-times "></i>
                    </span>
                  )}
                  {questionList.length - 1 === index &&
                    questionList.length < 20 && (
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
        </div>
      </div>
    </div>
  );
};

export default DynamicCardColumns;
