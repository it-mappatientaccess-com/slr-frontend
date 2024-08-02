import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useDispatch, useSelector } from "react-redux";
import { getAllResults, stopModelExecution } from "../../redux/thunks/qa-thunks";
import ProgressBar from "components/ProgressBar/ProgressBar";
import {
  setIsRefreshing,
  setIsStopping,
} from "../../redux/slices/questionAbstractSlice";
import CardBarChart from "components/Cards/CardBarChart";
import { notify } from "components/Notify/Notify";
import CardTable from "components/Cards/CardTable";

const categoryStyles = {
  studyDesign: "bg-indigo-200 text-indigo-600",
  population: "bg-purple-200 text-purple-600",
  intervention: "bg-pink-200 text-pink-600",
  outcomes: "bg-emerald-200 text-emerald-600",
  exclusionCriteria: "bg-red-200 text-red-600",
  // Define additional categories and their styles here
};

const btnCellRenderer = (props) => {
  const onClickHandler = () => {
    props.setSelectedAbstract({
      id: props?.data?.id,
      abstract: props?.data?.abstract,
      result: props?.data?.result,
    });
    props.redrawRows();
  };
  return (
    <>
      <button
        className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button"
        data-action="update"
        onClick={onClickHandler}
      >
        View <i className="fas fa-circle-nodes"></i>
      </button>
    </>
  );
};

const getParams = () => {
  const projectName = localStorage.getItem("selectedProject");
  return {
    columnKeys: ["id", "abstract", "result.category"],
    fileName: `${projectName}_abstract_review_results.csv`,
  };
};

const AbstractResults = () => {
  const dispatch = useDispatch();
  let allAbstractResults = useSelector(
    (state) => state.questionAbstractData.allAbstractResults
  );
  const isProcessing = useSelector(
    (state) => state.questionAbstractData.isProcessing
  );
  const isRefreshing = useSelector(
    (state) => state.questionAbstractData.isRefreshing
  );
  const isStopping = useSelector(
    (state) => state.questionAbstractData.isStopping
  );
  const taskId = useSelector((state) => state.questionAbstractData.taskId);
  const numOfExamples = useSelector(
    (state) => state.questionAbstractData.numberOfExamples
  );
  const [selectedAbstract, setSelectedAbstract] = useState({
    id: null,
    abstract: "",
    result: {},
  });
  const [highlightedAbstract, setHighlightedAbstract] = useState("");
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
          {selectedAbstract?.result?.category}
        </h6>
      ),
      confidence: (
        <span
          className={`text-xs font-semibold inline-block py-1 px-2 rounded  uppercase last:mr-0 mr-1 ${
            selectedAbstract?.result["confidence_score"] === "High"
              ? "text-emerald-600 bg-emerald-200"
              : selectedAbstract?.result["confidence_score"] === "Medium"
              ? "text-lightBlue-600 bg-lightBlue-200"
              : selectedAbstract?.result["confidence_score"] === "Low"
              ? "text-orange-600 bg-orange-200"
              : ""
          }`}
        >
          {selectedAbstract?.result["confidence_score"]}
        </span>
      ), // JSX for badge,
      reasoning: selectedAbstract?.result["reasoning"],
    },
  ];
  const [percentage, setPercentage] = useState(0);
  const projectName = localStorage.getItem("selectedProject");
  const timerRef = useRef(null);
  const prevLengthRef = useRef(allAbstractResults.length);
  const noChangeCountRef = useRef(0);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Results Count",
        backgroundColor: "#ed64a6",
        borderColor: "#ed64a6",
        data: [],
        fill: false,
        barThickness: 10,
      },
    ],
  });

  const calculatePercentage = useCallback(() => {
    if (allAbstractResults.length > 0 && numOfExamples) {
      let percent = (allAbstractResults.length / numOfExamples) * 100;
      setPercentage(Math.round(percent));
    } else {
      setPercentage(0);
    }
  }, [allAbstractResults.length, numOfExamples]);

  const getAllResultsSafely = useCallback(() => {
    if (isStopping) {
      clearTimeout(timerRef.current);
      return; // Stop the loop if isStopping is true
    }
    if (allAbstractResults.length < numOfExamples && isProcessing) {
      if (prevLengthRef.current === allAbstractResults.length) {
        noChangeCountRef.current += 1;
        if (noChangeCountRef.current >= 5) {
          clearTimeout(timerRef.current);
          return; // Stop the loop after 5 attempts with no change
        }
      } else {
        noChangeCountRef.current = 0; // Reset the count if there's a change
      }

      prevLengthRef.current = allAbstractResults.length; // Update the previous length

      try {
        dispatch(getAllResults(projectName));
      } catch (error) {
        console.error("Error while fetching results: ", error);
        // Implement additional error handling logic as needed
      }
    } else {
      clearTimeout(timerRef.current);
    }
  }, [
    dispatch,
    allAbstractResults.length,
    numOfExamples,
    isProcessing,
    projectName,
    isStopping,
  ]);

  const countResults = (abstractResults) => {
    const resultCount = abstractResults.reduce((acc, item) => {
      const category = item.result.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    return resultCount;
  };
  
  useEffect(() => {
    if (selectedAbstract?.abstract && selectedAbstract?.result?.highlighted_keywords) {
      setHighlightedAbstract(
        highlightKeywords(
          selectedAbstract?.abstract,
          selectedAbstract?.result?.highlighted_keywords
        )
      );
    }
  }, [selectedAbstract]);

  function highlightKeywords(text, highlightedKeywords) {
    let modifiedText = text;
    Object.entries(highlightedKeywords).forEach(([category, keywords]) => {
      const colorClass = categoryStyles[category] || "text-gray-500"; // Default color
      keywords.forEach((keyword) => {
        const badge = `<span class="${colorClass} text-xs font-semibold inline-block py-1 px-2 rounded  uppercase last:mr-0 mr-1">${keyword} <small>(${category})</small></span>`;
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        modifiedText = modifiedText.replace(regex, badge);
      });
    });
    return modifiedText;
  }
  useEffect(() => {
    try {
      dispatch(getAllResults(projectName));
    } catch (error) {
      console.error("Error while fetching results: ", error);
    }

    const getRandomExponentialDelay = () => {
      const min = Math.log(3000); // 3 seconds
      const max = Math.log(30000); // 30 seconds
      return Math.exp(min + (max - min) * Math.random());
    };
    const setupTimer = () => {
      const delay = getRandomExponentialDelay();
      if (!isStopping) {
        timerRef.current = setTimeout(() => {
          getAllResultsSafely();
          setupTimer();
        }, delay);
      }
    };

    setupTimer();

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [getAllResultsSafely, isStopping, dispatch, projectName]);

  useEffect(() => {
    setRowData(allAbstractResults);
    calculatePercentage();
    const resultsCount = countResults(allAbstractResults);
    const labels = Object.keys(resultsCount).filter((key) => key !== "total");
    const data = labels.map((label) => resultsCount[label]);

    setChartData({
      labels: labels,
      datasets: [
        {
          label: "Results Count",
          backgroundColor: [
            "#F87171",
            "#FB923C",
            "#F472B6",
            "#C084FC",
            "#34D399",
            "#38BDF8",
          ],
          borderColor: [
            "#F87171",
            "#FB923C",
            "#F472B6",
            "#C084FC",
            "#34D399",
            "#38BDF8",
          ],
          data: data,
          fill: false,
          barThickness: 10,
        },
      ],
    });
  }, [allAbstractResults, calculatePercentage]);

  const gridRef = useRef(null);
  const [rowData, setRowData] = useState([]);

  const redrawRows = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.redrawRows();
    }
  }, []);
  
  const columnDefs = [
    {
      headerName: "ID",
      field: "id",
      width: 80,
    },
    {
      field: "abstract",
      suppressSizeToFit: true,
      flex: 5,
      filter: true,
      editable: false,
    },
    {
      field: "result.category",
      headerName: "Category",
      flex: 1,
      filter: true,
      editable: false,
    },
    {
      headerName: "Action",
      cellRenderer: btnCellRenderer,
      cellRendererParams: {
        setSelectedAbstract,
        redrawRows,
      },
      editable: false,
      colId: "view",
      flex: 1,
    },
  ];

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
    }),
    []
  );

  const onPrevNextClickedHandler = useCallback(
    (direction) => {
      const currentIndex = allAbstractResults.findIndex(
        (item) => item.id === selectedAbstract.id
      );
      let newIndex;
      if (direction === "prev") {
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (direction === "next") {
        newIndex = Math.min(currentIndex + 1, allAbstractResults.length - 1);
      }
      setSelectedAbstract(allAbstractResults[newIndex]);
    },
    [allAbstractResults, selectedAbstract]
  );

  const onRefreshClickHandler = async () => {
    dispatch(setIsRefreshing({ isRefreshing: true }));
    try {
      await dispatch(getAllResults(projectName));
    } finally {
      dispatch(setIsRefreshing({ isRefreshing: false }));
    }
  };
  

  const getRowStyle = useCallback(
    (params) => {
      if (params.data.id === selectedAbstract.id) {
        return { backgroundColor: "rgba(186,230,253,var(--tw-bg-opacity))" };
      }
      return null;
    },
    [selectedAbstract.id]
  );

  const onBtnExport = useCallback(() => {
    gridRef.current.api.exportDataAsCsv(getParams());
  }, []);

  const onStopClickedHandler = async () => {
    dispatch(setIsStopping({ isStopping: true }));
    const response = await dispatch(stopModelExecution(taskId));
    if (response.data && response.data.message && response.data.status) {
      notify(response.data.message, response.data.status);
      if (response.data.status === "success") {
        dispatch(setIsStopping({ isStopping: false }));
      }
    }
  };

  useEffect(() => {
    if (selectedAbstract.id != null) {
      redrawRows();
    }
  }, [selectedAbstract, redrawRows]);

  return (
    <>
      {selectedAbstract.abstract && (
        <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg ">
          <div className="flex-auto p-4">
            {highlightedAbstract && (
              <div className="mt-4 p-4 border border-gray-200 rounded">
                <div dangerouslySetInnerHTML={{ __html: highlightedAbstract }} />
              </div>
            )}
            <CardTable title="" color="light" columns={columns} data={data} />
            <div>
              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  selectedAbstract.id === allAbstractResults[0]?.id
                    ? "disabled:opacity-75 cursor-not-allowed"
                    : ""
                }`}
                type="button"
                onClick={() => onPrevNextClickedHandler("prev")}
                disabled={selectedAbstract.id === allAbstractResults[0]?.id}
              >
                <i className="fas fa-arrow-left"></i> Prev
              </button>
              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 float-right ${
                  selectedAbstract.id ===
                  allAbstractResults[allAbstractResults.length - 1]?.id
                    ? "disabled:opacity-75 cursor-not-allowed"
                    : ""
                }`}
                type="button"
                onClick={() => onPrevNextClickedHandler("next")}
                disabled={
                  selectedAbstract.id ===
                  allAbstractResults[allAbstractResults.length - 1]?.id
                }
              >
                <i className="fas fa-arrow-right"></i> Next
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex">
        <div className="relative w-9/12 break-words bg-white rounded mb-4 shadow-lg m-2 ml-0">
          <div className="flex-auto p-4">
            <div
              className={`ag-theme-alpine ${
                rowData.length === 0 && isRefreshing ? "opacity-20" : ""
              }`}
              style={{ height: "60vh" }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows={true}
                paginationAutoPageSize={true}
                pagination={true}
                suppressClickEdit={true}
                getRowStyle={getRowStyle}
              />
            </div>
            {isProcessing && (
              <div className=" mx-auto w-9/12">
                <ProgressBar
                  taskInProgress="Processing Abstracts ..."
                  percentage={percentage}
                />
              </div>
            )}
            <div className="text-center mt-4">
              <button
                className={`bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  isRefreshing ? "opacity-50" : ""
                }`}
                type="button"
                onClick={onRefreshClickHandler}
                disabled={isRefreshing}
              >
                <i
                  className={`fas fa-arrow-rotate-right ${
                    isRefreshing ? "fa-spin" : ""
                  }`}
                ></i>{" "}
                Refresh
              </button>
              <button
                className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={onBtnExport}
              >
                <i className="fas fa-file-export"></i> Export
              </button>
              <button
                className={`bg-red-500 text-white active:bg-red-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150
              ${isStopping ? "opacity-50" : ""}`}
                type="button"
                onClick={onStopClickedHandler}
                disabled={isStopping}
              >
                <i
                  className={`fas fa-stop  ${isStopping ? "fa-flip" : ""}`}
                ></i>{" "}
                {isStopping ? "Stopping" : "Stop"}
              </button>
            </div>
          </div>
        </div>
        <div className="w-3/12 m-2 mr-0">
          <CardBarChart
            data={chartData}
            options={
              {
                /* chartOptions could be set here if any */
              }
            }
            title="Total Count by Category"
            subtitle="Analysis Overview"
          />
        </div>
      </div>
    </>
  );
};

export default AbstractResults;
