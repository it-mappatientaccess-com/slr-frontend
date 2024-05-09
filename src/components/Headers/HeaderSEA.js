import React, { useEffect, useState } from "react";
import DynamicCardColumns from "components/DynamicCardColumns/DynamicCardColumns";

import { useDispatch, useSelector } from "react-redux";
import { fetchOldSeaQuestions, setSeaQuestions } from "store/qa-actions";

export default function HeaderSea() {
  const dispatch = useDispatch();
  const projectName = localStorage.getItem("selectedProject");
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );

  // Initialize columnOrder with keys from seaQuestions
  const [columnOrder, setColumnOrder] = useState(Object.keys(seaQuestions));

  useEffect(() => {
    dispatch(fetchOldSeaQuestions(projectName));
  }, [dispatch, projectName]);

  useEffect(() => {
    setColumnOrder(Object.keys(seaQuestions));
  }, [seaQuestions]);

  const addColumn = () => {
    if (columnOrder.length < 10) {
      const newColumn = `Column${columnOrder.length + 1}`;
      setColumnOrder((prevColumnOrder) => [...prevColumnOrder, newColumn]);
      dispatch(
        setSeaQuestions(projectName, { ...seaQuestions, [newColumn]: [""] })
      );
    }
  };

  const removeColumn = () => {
    if (columnOrder.length > 1) {
      const updatedColumnOrder = columnOrder.slice(0, -1);
      const updatedSeaQuestions = { ...seaQuestions };
      delete updatedSeaQuestions[columnOrder[columnOrder.length - 1]];
      dispatch(setSeaQuestions(projectName, updatedSeaQuestions));
      setColumnOrder(updatedColumnOrder);
    }
  };

  const updateColumnNameHandler = (oldColumnName, newColumnName) => {
    // Create a copy of the current seaQuestions and columnOrder
    const updatedColumnOrder = [...columnOrder];

    // Find the index of the column to rename
    const columnIndex = updatedColumnOrder.indexOf(oldColumnName);

    // Update the column name in the columnOrder array
    updatedColumnOrder[columnIndex] = newColumnName;

    // Create a new seaQuestions object with keys ordered according to updatedColumnOrder
    const updatedSeaQuestions = {};
    for (const column of updatedColumnOrder) {
      updatedSeaQuestions[column] =
        column === newColumnName
          ? seaQuestions[oldColumnName]
          : seaQuestions[column];
    }

    // Dispatch the updated questions to the backend
    dispatch(setSeaQuestions(projectName, updatedSeaQuestions));
    // Update the local state
    setColumnOrder(updatedColumnOrder);
  };

  return (
    <>
      <div className="relative bg-lightBlue-600 pt-8 pb-8">
        <div className="px-4 mx-auto w-full">
          <div className="flex flex-wrap items-center justify-center">
            {columnOrder.map((column, index) => (
              <div key={index} className="w-full lg:w-6/12 xl:w-3/12 px-2 mb-4">
                <DynamicCardColumns
                  category={column}
                  onUpdateColumnName={updateColumnNameHandler}
                />
              </div>
            ))}
            <div className="flex flex-col items-center justify-center">
              {columnOrder.length < 10 && (
                <button
                  className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                  type="button"
                  onClick={addColumn}
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
              {columnOrder.length > 1 && (
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
