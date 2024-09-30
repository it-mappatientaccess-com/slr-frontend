import React, { useEffect, useState } from "react";
import DynamicCardColumns from "components/DynamicCardColumns/DynamicCardColumns";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOldSeaQuestions,
  setSeaQuestions,
} from "../../redux/thunks/qa-thunks";

export default function DEQuestions() {
  const dispatch = useDispatch();
  // const projectName = localStorage.getItem("selectedProject");
  const projectId = localStorage.getItem("currentProjectId");
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );

  // Initialize columnOrder with keys from seaQuestions, handle undefined case
  const [columnOrder, setColumnOrder] = useState([]);

  useEffect(() => {
    dispatch(fetchOldSeaQuestions(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    if (seaQuestions) {
      setColumnOrder(Object.keys(seaQuestions));
    }
  }, [seaQuestions]);

  const addColumn = () => {
    if (columnOrder.length < 10) {
      const newColumn = `Question Set ${columnOrder.length + 1}`;
      setColumnOrder((prevColumnOrder) => [...prevColumnOrder, newColumn]);
      dispatch(
        setSeaQuestions({
          project_id: projectId,
          seaQuestions: { ...seaQuestions, [newColumn]: [""] },
        })
      );
    }
  };

  const removeColumn = () => {
    if (columnOrder.length > 1) {
      const updatedColumnOrder = columnOrder.slice(0, -1);
      const updatedSeaQuestions = { ...seaQuestions };
      delete updatedSeaQuestions[columnOrder[columnOrder.length - 1]];
      dispatch(
        setSeaQuestions({ project_id: projectId, seaQuestions: updatedSeaQuestions })
      );
      setColumnOrder(updatedColumnOrder);
    }
  };

  const updateColumnNameHandler = (oldColumnName, newColumnName) => {
    const updatedColumnOrder = [...columnOrder];
    const columnIndex = updatedColumnOrder.indexOf(oldColumnName);
    updatedColumnOrder[columnIndex] = newColumnName;

    const updatedSeaQuestions = {};
    for (const column of updatedColumnOrder) {
      updatedSeaQuestions[column] =
        column === newColumnName
          ? seaQuestions[oldColumnName]
          : seaQuestions[column];
    }

    dispatch(
      setSeaQuestions({ project_id: projectId, seaQuestions: updatedSeaQuestions })
    );
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
