import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setQuestions } from "../../store/qa-actions";

const camelize = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

const DynamicInput = (props) => {
  const dispatch = useDispatch();
  const category = camelize(props.category.toLowerCase());
  const textareaRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState();
  const existingQuestions = useSelector((state) => {
    return JSON.parse(JSON.stringify(state.questionAbstractData.questions));
  });
  const [questionList, setQuestionList] = useState([{ question: "" }]);

  useEffect(() => {
    const temp = [];
    const defaultQuestions = JSON.parse(localStorage.getItem("questions"));
    for (let entry of defaultQuestions[category]) {
      temp.push({ question: entry });
    }
    setQuestionList(temp);
    
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    updateRows();
  }, [questionList]);

  const projectName = localStorage.getItem("selectedProject");
  const questionAddHandler = () => {
    setQuestionList([...questionList, { question: "" }]);
  };
  const updateRows = () => {
    if (!textareaRef.current) return;

    const lines = textareaRef.current.value.split('\n');
    const rows = lines.length + 1;

    textareaRef.current.rows = rows;
  };
  const questionRemoveHandler = (index, item) => {
    const existingQuestionList = [...questionList];
    existingQuestionList.splice(index, 1);
    setQuestionList(existingQuestionList);
    // removing element from existing questions from our store
    if (existingQuestions[category].indexOf(item) !== -1) {
      existingQuestions[category].splice(
        existingQuestions[category].indexOf(item),
        1
      );
    }
    dispatch(setQuestions(projectName, existingQuestions));
  };

  const questionChangeHandler = (event, index) => {
    const { name, value } = event.target;
    const existingQuestionList = [...questionList];
    existingQuestionList[index][name] = value;
    setQuestionList(existingQuestionList);
    setCurrentIndex(index);
  };

  const saveQuestionsHandler = (event) => {
    existingQuestions[category][currentIndex] = event.target.value;
    dispatch(setQuestions(projectName, existingQuestions));
  };

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
