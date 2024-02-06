import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useDispatch, useSelector } from "react-redux";
import { getAllResults, generateAbstractToNERText } from "store/qa-actions";
import Alert from "components/Alerts/Alert";
import { stopModelExecution } from "store/qa-actions";
import ProgressBar from "components/ProgressBar/ProgressBar";
import { questionAbstractActions } from "slices/questionAbstractSlice";
import { Tooltip } from "react-tooltip";
import CardBarChart from "components/Cards/CardBarChart";
const btnCellRenderer = (props) => {
  const onClickHandler = () => {
    props.generateNer(
      props.data.nerAbstract,
      props.data.abstract,
      props.data.result
    );
    props.setCurrentAbstractId(props.data.id);
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
        View PICO <i className="fas fa-circle-nodes"></i>
      </button>
    </>
  );
};

const getParams = () => {
  const projectName = localStorage.getItem("selectedProject");
  return {
    columnKeys: ["ID", "abstract", "result"],
    fileName: `${projectName}_aair_results.csv`,
  };
};

const AbstractResults = () => {
  const dispatch = useDispatch();
  let allAbstractResults = useSelector(
    (state) => state.questionAbstractData.allAbstractResults
  );
  let abstractNerMappedText = useSelector(
    (state) => state.questionAbstractData.abstractNerMappedText
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
  const [singleAbstractResult, setSingleAbstractResult] = useState("");
  const [percentage, setPercentage] = useState(0);
  const projectName = localStorage.getItem("selectedProject");
  const [currentAbstractId, setCurrentAbstractId] = useState();
  const numOfExamples = useSelector(
    (state) => state.questionAbstractData.numberOfExamples
  );
  // Use useRef to create a mutable object that persists across renders
  const timerRef = useRef(null);
  const prevLengthRef = useRef(allAbstractResults.length);
  const noChangeCountRef = useRef(0); // New ref to track the count of no change in length
  // State to store the formatted chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Results Count",
        backgroundColor: "#ed64a6",
        borderColor: "#ed64a6",
        data: [],
        fill: false,
        barThickness: 8,
      },
    ],
  });
  const generateNer = (tokenizedAbstract, abstractText, result) => {
    dispatch(generateAbstractToNERText(tokenizedAbstract, abstractText));
    setSingleAbstractResult(result);
  };

  const calculatePercentage = useCallback(() => {
    if (allAbstractResults.length > 0 && numOfExamples) {
      let percent = (allAbstractResults.length / numOfExamples) * 100;
      setPercentage(Math.round(percent));
    } else {
      setPercentage(0);
    }
  }, [allAbstractResults.length, numOfExamples]);

  const getAllResultsSafely = useCallback(() => {
    if (!isProcessing && !isStopping) {
      clearTimeout(timerRef.current);
      return; // Stop the loop if isStopping is true
    }
    if (allAbstractResults.length < numOfExamples && !isStopping) {
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

  useEffect(() => {
    // Initial fetch
    try {
      dispatch(getAllResults(projectName));
    } catch (error) {
      console.error("Error while fetching results: ", error);
      // Implement additional error handling logic as needed
    }

    // Function to calculate random exponential delay
    const getRandomExponentialDelay = () => {
      const min = Math.log(3000); // 3 seconds
      const max = Math.log(30000); // 30 seconds
      return Math.exp(min + (max - min) * Math.random());
    };

    // Setting up a loop with random but exponential wait times
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

  const countResults = (allAbstractResults) => {
    // Initialize an object to hold the count of each result type
    const resultCount = {
      studyDesign: 0,
      population: 0,
      intervention: 0,
      outcomes: 0,
      include: 0,
      total: 0,
    };

    // Iterate through allAbstractResults array
    allAbstractResults.forEach((item) => {
      if (resultCount.hasOwnProperty(item.result)) {
        // Increment the count of the specific result type
        resultCount[item.result]++;
      } else {
        // If the result type is not recognized, you can either ignore it or handle it differently
        console.log(`Unrecognized result type: ${item.result}`);
      }
      // Increment the total count
      resultCount.total++;
    });
    console.log(resultCount);
    return resultCount;
  };
  useEffect(() => {
    setRowData(allAbstractResults);
    countResults(allAbstractResults);
    // Convert the countResults output to chartData format
    const resultsCount = countResults(allAbstractResults);
    const labels = Object.keys(resultsCount).filter(key => key !== 'total'); // Exclude 'total' from labels
    // const labels = Object.keys(resultsCount); // Include 'total' in labels
    const data = labels.map((label) => resultsCount[label]);

    setChartData({
      labels: labels,
      datasets: [
        {
          label: "Results Count : " + resultsCount.total ,
          backgroundColor: [
            "#F87171",
            "#FB923C",
            "#F472B6",
            "#C084FC",
            "#34D399",
            "#38BDF8",
          ], // Different color for each category
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
          barThickness: 8,
        },
      ],
    });
  }, [allAbstractResults, calculatePercentage]);

  const gridRef = useRef(null);

  const [rowData, setRowData] = useState([]);

  const redrawRows = useCallback(() => {
    var rows = [];
    for (var i = 0; i < 6; i++) {
      var row = gridRef.current.api.getDisplayedRowAtIndex(i);
      rows.push(row);
    }
    gridRef.current.api.redrawRows({ rowNodes: rows });
  }, []);

  const columnDefs = [
    {
      headerName: "ID",
      valueGetter: "node.rowIndex + 1",
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
      field: "result",
      flex: 1,
      filter: true,
      editable: true,
    },
    {
      headerName: "Action",
      cellRenderer: btnCellRenderer,
      cellRendererParams: {
        generateNer,
        setCurrentAbstractId,
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

  const chartOptions = {
    // You can specify any additional options here
  };
  const onPrevClickedHandler = async () => {
    setCurrentAbstractId(currentAbstractId - 1);
    await dispatch(
      generateAbstractToNERText(
        allAbstractResults[currentAbstractId - 1]["nerAbstract"],
        allAbstractResults[currentAbstractId - 1]["abstract"]
      )
    );
    setSingleAbstractResult(
      allAbstractResults[currentAbstractId - 1]["result"]
    );
    redrawRows();
  };

  const onNextClickedHandler = async () => {
    setCurrentAbstractId(currentAbstractId + 1);
    await dispatch(
      generateAbstractToNERText(
        allAbstractResults[currentAbstractId + 1]["nerAbstract"],
        allAbstractResults[currentAbstractId + 1]["abstract"]
      )
    );
    // set single abstract result
    setSingleAbstractResult(
      allAbstractResults[currentAbstractId + 1]["result"]
    );
    redrawRows();
  };

  const onRefreshClickHandler = () => {
    dispatch(
      questionAbstractActions.setIsRefreshing({
        isRefreshing: true,
      })
    );
    dispatch(getAllResults(projectName));
  };

  // set background colour on even rows again, this looks bad, should be using CSS classes
  const getRowStyle = (params) => {
    if (params.node.rowIndex === currentAbstractId) {
      return { backgroundColor: "rgba(186,230,253,var(--tw-bg-opacity))" };
    }
  };
  const onBtnExport = useCallback(() => {
    gridRef.current.api.exportDataAsCsv(getParams());
  }, []);

  const onStopClickedHandler = () => {
    dispatch(
      questionAbstractActions.setIsStopping({
        isStopping: true,
      })
    );
    dispatch(stopModelExecution(taskId));
  };

  return (
    <>
      {abstractNerMappedText && (
        <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg ">
          <div className="flex-auto p-4">
            <p
              className="text-xs overflow-auto h-30v bg-blueGray-100 p-1"
              dangerouslySetInnerHTML={{ __html: abstractNerMappedText }}
            />
            <Alert
              alertClass="bg-emerald-500"
              alertTitle="Result:"
              alertMessage={singleAbstractResult.toUpperCase()}
              showCloseButton={false}
            />
            <div className="mt-4">
              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                  currentAbstractId === 0
                    ? "disabled:opacity-75 cursor-not-allowed"
                    : ""
                }`}
                type="button"
                onClick={onPrevClickedHandler}
                disabled={currentAbstractId === 0}
              >
                <i className="fas fa-arrow-left"></i> Prev
              </button>
              <button
                className={`bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 float-right ${
                  currentAbstractId === rowData.length - 1
                    ? "disabled:opacity-75 cursor-not-allowed"
                    : ""
                }`}
                type="button"
                onClick={onNextClickedHandler}
                disabled={currentAbstractId === rowData.length - 1}
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
              readOnlyEdit={true}
              enableCellChangeFlash={true}
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
            <Tooltip id="action-btn-tooltip" />
            <button
              className={`bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${
                isRefreshing ? "opacity-50" : ""
              }`}
              type="button"
              onClick={onRefreshClickHandler}
              disabled={isRefreshing}
              data-tooltip-id="action-btn-tooltip"
              data-tooltip-content="Refresh to view the recently processed examples in the table."
            >
              <i
                className={`fas fa-arrow-rotate-right ${
                  isRefreshing ? "fa-spin" : ""
                }`}
              ></i>{" "}
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={onBtnExport}
              data-tooltip-id="action-btn-tooltip"
              data-tooltip-content="Click to download the results as a CSV file."
              data-tooltip-variant="info"
            >
              <i className="fas fa-file-export"></i> Export
            </button>
            <button
              className={`bg-red-500 text-white active:bg-red-600 font-bold uppercase text-base px-8 py-3 rounded shadow-md hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150
              ${isStopping ? "opacity-50" : ""}`}
              type="button"
              onClick={onStopClickedHandler}
              alt="stop model's execution"
              disabled={isStopping}
              data-tooltip-id="action-btn-tooltip"
              data-tooltip-variant="error"
              data-tooltip-content="Click to halt the processing of examples."
            >
              <i className={`fas fa-stop  ${isStopping ? "fa-flip" : ""}`}></i>{" "}
              {isStopping ? "Stopping..." : "Stop"}
            </button>
          </div>
          {rowData.length === 0 && isRefreshing && (
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
      </div>
      <div className="w-3/12 m-2 mr-0">
        <CardBarChart
          data={chartData}
          options={chartOptions}
          title="Total Count by Category"
          subtitle="Analysis Overview"
        />
      </div>
      </div>
    </>
  );
};
export default AbstractResults;
