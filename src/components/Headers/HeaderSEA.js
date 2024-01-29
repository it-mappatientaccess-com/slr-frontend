import React, { useEffect, useState } from "react";
import DynamicCardColumns from "components/DynamicCardColumns/DynamicCardColumns";
import Accordion from "components/Accordion/Accordion";

import { useDispatch, useSelector } from "react-redux";
import { fetchOldSeaQuestions, setSeaQuestions } from "store/qa-actions";
import { fetchPrompts, setSelectedPrompt, deletePrompt } from "store/data-extraction-actions";
import CreatePrompt from "components/Forms/CreatePrompt";

export default function HeaderSea({ isAccordionVisible }) {
  const dispatch = useDispatch();
  const projectName = localStorage.getItem("selectedProject");
  const seaQuestions = useSelector(
    (state) => state.questionAbstractData.seaQuestions
  );
  const prompts = useSelector((state) => state.dataExtraction.prompts);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  // Initialize columnOrder with keys from seaQuestions
  const [columnOrder, setColumnOrder] = useState(Object.keys(seaQuestions));

  useEffect(() => {
    dispatch(fetchOldSeaQuestions(projectName));
  }, [dispatch, projectName]);

  useEffect(() => {
    setColumnOrder(Object.keys(seaQuestions));
  }, [seaQuestions]);

  useEffect(() => {
    dispatch(fetchPrompts());
  }, [dispatch]);

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

  const handleSelectPrompt = (prompt) => {
    dispatch(setSelectedPrompt({ selectedPrompt: prompt["prompt_text"] }));
  };
  const handleEditPrompt = (prompt) => {
    console.log("edit active");
    console.log(prompt)
  };
  const handleDeletePrompt = (prompt) => {
    dispatch(deletePrompt(prompt['prompt_title']))
  }
  const accordionItems = prompts.map((prompt) => ({
    title: prompt["prompt_title"],
    content: !prompt["is_default"] ? prompt["prompt_text"] : null,
    actionButtonText:
      prompt["prompt_text"] === selectedPrompt ? "Active" : "Use Prompt",
    actionButtonState: prompt["prompt_text"] === selectedPrompt,
    onAction: () => handleSelectPrompt(prompt),
    editButtonText: "Edit",
    editButtonState: !prompt["is_default"],
    onEdit: () => handleEditPrompt(prompt),
    deleteButtonText: "Delete",
    deleteButtonState: !prompt["is_default"],
    onDelete: () => handleDeletePrompt(prompt),
  }));
  return (
    <>
      {isAccordionVisible && (
        <div>
          <Accordion
            accordionTitle={"Prompt Templates"}
            accordionSubTitle={
              "Explore default prompts or craft your own for tailored responses."
            }
            items={accordionItems}
          />
          <div className="flex items-center">
            <hr className="flex-grow border-t border-blue-300" />
            <span className="px-3 text-lightblue-500">
              Or create your own prompt for the AI model using the below form
            </span>
            <hr className="flex-grow border-t border-blue-300" />
          </div>
          <CreatePrompt />
        </div>
      )}
      <div className="relative bg-lightBlue-600 pb-16">
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
