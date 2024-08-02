import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setAbstractText,
  setsubmitQABtn,
  setSubmitClicked,
  setIsQuestionsEmpty,
  resetQAStore,
} from "../../redux/slices/questionAbstractSlice";
import { getSingleQAResult } from '../../redux/thunks/qa-thunks';
import Alert from "components/Alerts/Alert";
import CardTable from "components/Cards/CardTable";

function getWordCount(str) {
  return str.split(" ").filter(function (num) {
    return num !== "";
  }).length;
}

const categoryStyles = {
  studyDesign: "bg-indigo-200 text-indigo-600",
  population: "bg-purple-200 text-purple-600",
  intervention: "bg-pink-200 text-pink-600",
  outcomes: "bg-emerald-200 text-emerald-600",
  exclusionCriteria: "bg-red-200 text-red-600",
  // Define additional categories and their styles here
};

const AbstractEdit = () => {
  const dispatch = useDispatch();
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const abstractText = useSelector(
    (state) => state.questionAbstractData.abstract
  );
  const submitClicked = useSelector(
    (state) => state.questionAbstractData.submitClicked
  );
  const isResultGenerated = useSelector(
    (state) => state.questionAbstractData.isResultGenerated
  );
  const submitBtnState = useSelector(
    (state) => state.questionAbstractData.submitQABtn
  );
  const singleAbstractResult = useSelector(
    (state) => state.questionAbstractData.singleAbstractResult
  );
  const questions = useSelector(
    (state) => state.questionAbstractData.questions
  );

  const [highlightedAbstract, setHighlightedAbstract] = useState("");

  useEffect(() => {
    if (abstractText && singleAbstractResult?.highlighted_keywords) {
      setHighlightedAbstract(
        highlightKeywords(
          abstractText,
          singleAbstractResult.highlighted_keywords
        )
      );
    }
  }, [abstractText, singleAbstractResult]);

  function highlightKeywords(text, highlightedKeywords) {
    let modifiedText = text;
    Object.entries(highlightedKeywords).forEach(([category, keywords]) => {
      const colorClass = categoryStyles[category] || "text-gray-500"; // Default color
      keywords.forEach((keyword) => {
        const badge = `<span class="${colorClass} text-xs font-semibold inline-block py-1 px-2 rounded  uppercase last:mr-0 mr-1">${keyword} <small>(${category})</small></span>`;
        const regex = new RegExp(`\\b${keyword}\\b`, "gi"); // Match whole word, case-insensitive
        modifiedText = modifiedText.replace(regex, badge);
      });
    });
    return modifiedText;
  }

  const onBlurHandler = (event) => {
    setIsFocused(true);
    // save abstract text
    dispatch(setAbstractText({ abstract: event.target.value }));
  };

  useEffect(() => {
    // if check min and check max condition is valid then
    if (
      200 < charCount &&
      charCount < 4000 &&
      50 < wordCount &&
      wordCount < 500
    ) {
      // enable submit btn
      dispatch(setsubmitQABtn({ submitQABtn: true }));
    } else {
      // else disable submit btn
      dispatch(setsubmitQABtn({ submitQABtn: false }));
    }
  }, [dispatch, charCount, wordCount]);

  const onChangeHandler = (event) => {
    const inputStr = event.target.value;
    setWordCount(getWordCount(inputStr));
    setCharCount(inputStr.length);
    dispatch(setAbstractText({ abstract: inputStr }));
  };

  const onSubmitHandler = () => {
    if (Object.values(questions).every((v) => v.length === 0)) {
      dispatch(setIsQuestionsEmpty({ isQuestionsEmpty: true }));
    } else {
      dispatch(setIsQuestionsEmpty({ isQuestionsEmpty: false }));
      dispatch(setSubmitClicked({ submitClicked: true }));
      dispatch(getSingleQAResult({ questions, abstract: abstractText }));
    }
  };

  const onResetHandler = () => {
    dispatch(resetQAStore());
    setWordCount(0);
    setCharCount(0);
    setIsFocused(false);
  };

  const columns = [
    {
      label: "Category",
      accessor: "category",
      className: "text-left flex items-center",
    },
    { label: "Confidence", accessor: "confidence" },
    { label: "Reasoning", accessor: "reasoning" },
  ];

  const data = [
    {
      category: (
        <h6 className="text-xl font-normal leading-normal mt-0 mb-2 text-lightBlue-800">
          {singleAbstractResult["category"]}
        </h6>
      ),
      confidence: (
        <span
          className={`text-xs font-semibold inline-block py-1 px-2 rounded  uppercase last:mr-0 mr-1 ${
            singleAbstractResult["confidence_score"] === "High"
              ? "text-emerald-600 bg-emerald-200"
              : singleAbstractResult["confidence_score"] === "Medium"
              ? "text-lightBlue-600 bg-lightBlue-200"
              : singleAbstractResult["confidence_score"] === "Low"
              ? "text-orange-600 bg-orange-200"
              : ""
          }`}
        >
          {singleAbstractResult["confidence_score"]}
        </span>
      ), // JSX for badge,
      reasoning: singleAbstractResult["reasoning"],
    },
  ];

  return (
    <div className="mb-3 pt-0">
      {highlightedAbstract && isResultGenerated && (
        <div className="mt-4 p-4 border border-gray-200 rounded">
          <div dangerouslySetInnerHTML={{ __html: highlightedAbstract }} />
        </div>
      )}
      {!isResultGenerated && (
        <div>
          <textarea
            id="abstractTextarea"
            rows="10"
            className={`px-2 py-1 placeholder-blueGray-300 text-blueGray-600 relative bg-white rounded text-sm border border-blueGray-300 outline-none focus:outline-none focus:shadow-outline w-full ${
              submitClicked ? "opacity-20" : ""
            }`}
            placeholder="Write or copy and paste your abstract here..."
            value={abstractText}
            onBlur={onBlurHandler}
            onChange={onChangeHandler}
          ></textarea>
          <span>Characters:</span>
          <span className="text-xs font-semibold inline-block py-1 px-2 rounded text-lightBlue-600 bg-lightBlue-200 uppercase last:mr-0 mr-1">
            {charCount}
          </span>
          <span>Words: </span>
          <span className="text-xs font-semibold inline-block py-1 px-2 rounded text-lightBlue-600 bg-lightBlue-200 uppercase last:mr-0 mr-1">
            {wordCount}
          </span>
          {charCount < 200 && wordCount < 50 && isFocused && (
            <span>
              <Alert
                alertClass="bg-orange-500 inline-block float-right"
                alertTitle="Input invalid!"
                alertMessage="You should enter at least 200 Characters or 50 Words."
              />
            </span>
          )}
          {charCount > 16000 && wordCount > 2000 && (
            <Alert
              alertClass="bg-orange-500 inline-block float-right"
              alertTitle="Input invalid!"
              alertMessage="You can enter at max 16000 Characters or 2000 Words."
            />
          )}
          {submitClicked && (
            <div
              role="status"
              className="absolute -translate-x-1/2 -translate-y-1/2 top-2/4 left-1/2"
            >
              <svg
                aria-hidden="true"
                className="w-10 h-10 mr-2 text-gray-200 animate-spin fill-lightBlue-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          )}
        </div>
      )}
      {isResultGenerated && singleAbstractResult && (
        <>
          <CardTable title="" color="light" columns={columns} data={data} />
        </>
      )}
      <div className="text-center mt-8">
        <button
          className={`bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`}
          type="button"
          onClick={onResetHandler}
        >
          <i className="fas fa-rotate"></i> Reset
        </button>
        <button
          className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
            submitBtnState ? "" : "disabled:opacity-75 cursor-not-allowed"
          }`}
          type="button"
          disabled={!submitBtnState}
          onClick={onSubmitHandler}
        >
          <i className="fas fa-paper-plane"></i> Submit
        </button>
      </div>
    </div>
  );
};

export default AbstractEdit;
