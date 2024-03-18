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
import { getAllResults, stopModelExecution } from "store/qa-actions";
import Alert from "components/Alerts/Alert";
import ProgressBar from "components/ProgressBar/ProgressBar";
import { questionAbstractActions } from "slices/questionAbstractSlice";
import CardBarChart from "components/Cards/CardBarChart";

const btnCellRenderer = (props) => {
  const onClickHandler = () => {
    props.setSelectedAbstract({
      id: props.data.id,
      abstract: props.data.abstract,
      result: props.data.result,
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
    columnKeys: ["ID", "abstract", "result"],
    fileName: `${projectName}_aair_results.csv`,
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
    result: "",
  });
  const [percentage, setPercentage] = useState(0);
  const projectName = localStorage.getItem("selectedProject");
  // Use useRef to create a mutable object that persists across renders
  const timerRef = useRef(null);
  const prevLengthRef = useRef(allAbstractResults.length);
  const noChangeCountRef = useRef(0); // New ref to track the count of no change in length
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
  const countResults = (abstractResults) => {
    const resultCount = abstractResults.reduce((acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1;
      return acc;
    }, {});
    return resultCount;
  };
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

  useEffect(() => {
    setRowData(allAbstractResults);
    calculatePercentage();
    // Convert the countResults output to chartData format
    const resultsCount = countResults(allAbstractResults);
    const labels = Object.keys(resultsCount).filter((key) => key !== "total"); // Exclude 'total' from labels
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
          barThickness: 10,
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
      field: "result",
      flex: 1,
      filter: true,
      editable: true,
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
        newIndex = Math.max(currentIndex - 1, 0); // Ensure not going below zero
      } else if (direction === "next") {
        newIndex = Math.min(currentIndex + 1, allAbstractResults.length - 1); // Ensure not exceeding array length
      }
      setSelectedAbstract(allAbstractResults[newIndex]); // Update the selected abstract
    },
    [allAbstractResults, selectedAbstract]
  );

  const onRefreshClickHandler = () => {
    dispatch(
      questionAbstractActions.setIsRefreshing({
        isRefreshing: true,
      })
    );
    dispatch(getAllResults(projectName));
  };

  const getRowStyle = useCallback(
    (params) => {
      if (params.data.id === selectedAbstract.id) {
        return { backgroundColor: "rgba(186,230,253,var(--tw-bg-opacity))" };
      }
      return null; // Make sure to return null or undefined when there's no specific style to apply.
    },
    [selectedAbstract.id] // This ensures getRowStyle uses the latest selectedAbstract.id
  );

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
  useEffect(() => {
    if (selectedAbstract.id != null) {
      // Make sure selectedAbstract is set
      redrawRows();
    }
  }, [selectedAbstract, redrawRows]);
  return (
    <>
      {selectedAbstract.abstract && (
        <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-4 shadow-lg ">
          <div className="flex-auto p-4">
            <p
              className="text-sm overflow-auto h-30v bg-blueGray-100 p-1"
              dangerouslySetInnerHTML={{ __html: selectedAbstract.abstract }}
            />
            {selectedAbstract.result && (
              <div className="flex justify-center items-center mt-2">
                <div className="w-2/12">
                  <Alert
                    alertClass={`${
                      selectedAbstract.result === "Include"
                        ? "bg-emerald-500"
                        : "bg-orange-500"
                    }`}
                    alertTitle="Result:"
                    alertMessage={selectedAbstract.result.toUpperCase()}
                    showCloseButton={false}
                  />
                </div>
              </div>
            )}
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
                Stop
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
