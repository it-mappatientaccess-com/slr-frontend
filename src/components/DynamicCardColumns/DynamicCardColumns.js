import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSeaQuestions } from "../../redux/thunks/qa-thunks";

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
  const [validQuestions, setValidQuestions] = useState(() =>
    existingQuestions.map(() => true)
  );
  const [submissionError, setSubmissionError] = useState(false);

  useEffect(() => {
    setQuestionList(existingQuestions);
    setValidQuestions(existingQuestions.map(() => true));
  }, [existingQuestions]);

  const projectId = localStorage.getItem("currentProjectId");
  const isValidQuestion = useCallback((question) => {
    const words = question.trim().split(/\s+/);
    return words.length >= 3 && words.length <= 2000;
  }, []);

  const questionChangeHandler = useCallback(
    (event, index) => {
      const { value } = event.target;
      const isValid = isValidQuestion(value);

      setValidQuestions((prevValid) => {
        const updatedValid = [...prevValid];
        updatedValid[index] = isValid;
        return updatedValid;
      });

      setQuestionList((prevQuestions) => {
        const updatedQuestions = [...prevQuestions];
        updatedQuestions[index] = value;
        return updatedQuestions;
      });
    },
    [isValidQuestion]
  );

  const questionAddHandler = () => {
    setQuestionList((prevQuestions) => [...prevQuestions, ""]);
    setValidQuestions((prevValid) => [...prevValid, true]);
  };

  const questionRemoveHandler = (index) => {
    const updatedQuestions = questionList.filter((_, i) => i !== index);
    setQuestionList(updatedQuestions);
    setValidQuestions((prevValid) => prevValid.filter((_, i) => i !== index));
    saveQuestionsHandler(updatedQuestions); // Save questions after removing
  };

  const saveColumnNameHandler = () => {
    setIsEditing(false);
    if (category !== columnName) {
      props.onUpdateColumnName(category, columnName);
    }
  };

  const saveQuestionsHandler = (updatedQuestions = questionList) => {
    const hasInvalidQuestion = validQuestions.some((isValid) => !isValid);

    if (hasInvalidQuestion) {
      setSubmissionError(true); // Set error state to true
      return;
    }

    setSubmissionError(false); // Reset error state on successful validation
    let updatedSeaQuestions = {
      ...seaQuestions,
      [category]: updatedQuestions,
    };
    dispatch(setSeaQuestions({ projectId, seaQuestions: updatedSeaQuestions }));
  };

  const updateRows = useCallback(() => {
    if (!textareaRef.current) return;
    const lines = textareaRef.current.value.split("\n");
    const rows = lines.length + 1;
    textareaRef.current.rows = rows > 3 ? rows : 3; // Ensure at least 3 rows
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, []);
  

  useEffect(() => {
    updateRows();
  }, [questionList, updateRows]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
      <div className="flex-auto p-4">
        <div className="flex flex-wrap justify-between items-center w-full">
          <div className="flex items-center flex-grow">
            {isEditing ? (
              <>
                <input
                  type="text"
                  maxLength="300"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  className="border rounded pl-2 flex-grow"
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
          {submissionError && (
            <p className="text-red-500 text-xs italic">
              Cannot save: One or more questions are invalid.
            </p>
          )}
          <div className="pt-0 mt-2 flex-col max-h-60 overflow-y-auto">
            <span>Question(s)</span>
            {questionList.map((singleQuestion, index) => (
              <div key={index} className="questions">
                <div className="relative flex w-full flex-wrap items-stretch mb-3">
                  <textarea
                    ref={index === 0 ? textareaRef : null}
                    rows="3"
                    type="text"
                    name="question"
                    placeholder="Please enter a question"
                    className={`pl-2 pr-8 py-1 placeholder-blueGray-300 text-blueGray-600 relative bg-white rounded text-sm border ${
                      validQuestions[index]
                        ? "border-blueGray-300"
                        : "border-red-500"
                    } outline-none focus:outline-none focus:shadow-outline w-full resize-none`}
                    required
                    value={singleQuestion}
                    onChange={(e) => questionChangeHandler(e, index)}
                    onInput={updateRows}
                    onBlur={() => saveQuestionsHandler(questionList)} // Save questions on blur
                  />
                  {!validQuestions[index] && (
                    <p className="text-red-500 text-xs italic">
                      Question must be between 3 to 2000 words.
                    </p>
                  )}
                  {questionList.length > 1 && (
                    <span
                      className="leading-snug font-normal cursor-pointer text-center text-white bg-blueGray-500 hover:bg-red-500 absolute rounded text-base items-center justify-center w-8 right-0 py-1"
                      onClick={() => questionRemoveHandler(index)}
                    >
                      <i className="fas fa-times"></i>
                    </span>
                  )}
                </div>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicCardColumns;
