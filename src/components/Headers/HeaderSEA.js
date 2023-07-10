import React, { useEffect, useState } from "react";
import DynamicCardColumns from "components/DynamicCardColumns/DynamicCardColumns";
import { useDispatch, useSelector } from "react-redux";
import { fetchOldSeaQuestions, setSeaQuestions } from "store/qa-actions";

export default function HeaderSea() {
  const dispatch = useDispatch();
  const projectName = localStorage.getItem("selectedProject");
  const seaQuestions = useSelector((state) => state.questionAbstractData.seaQuestions);

  // Initialize columns with an empty array
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    dispatch(fetchOldSeaQuestions(projectName));
  }, [dispatch, projectName]);

  useEffect(() => {
    // Set columns state from seaQuestions whenever seaQuestions changes
    setColumns(Object.keys(seaQuestions));
  }, [seaQuestions]);

  const addColumn = () => {
    if (columns.length < 10) {
      const newColumn = `Column${columns.length + 1}`;
      setColumns((prevColumns) => [
        ...prevColumns,
        newColumn,
      ]);
      dispatch(setSeaQuestions(projectName, { ...seaQuestions, [newColumn]: [""] }));
    }
  };

  const removeColumn = () => {
    if (columns.length > 1) {
      const updatedColumns = columns.slice(0, -1);
      const updatedSeaQuestions = { ...seaQuestions };
      delete updatedSeaQuestions[columns[columns.length - 1]];
      console.log(updatedSeaQuestions);
      dispatch(setSeaQuestions(projectName, updatedSeaQuestions));
      setColumns(updatedColumns);
    }
  };
  

  return (
    <>
      <div className="relative bg-lightBlue-600 pb-16">
        <div className="px-4 mx-auto w-full">
          <div className="flex flex-wrap items-center justify-center">
            {columns.map((column, index) => (
              <div key={index} className="w-full lg:w-6/12 xl:w-3/12 px-2 mb-4">
                <DynamicCardColumns category={column} />
              </div>
            ))}
            <div className="flex flex-col items-center justify-center">
              {columns.length < 10 && (
                <button
                  className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={addColumn}
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
              {columns.length > 1 && (
                <button
                  className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={removeColumn}
                >
                  {" "}
                  <i className="fas fa-minus"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
