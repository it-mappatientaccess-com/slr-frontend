import React, { useEffect, useState } from "react";
import Accordion from "components/Accordion/Accordion";
import CreatePrompt from "components/Forms/CreatePrompt";
import {
  fetchPrompts,
  deletePrompt,
} from "../../redux/thunks/dataExtractionThunks";
import { setSelectedPrompt } from "../../redux/slices/dataExtractionSlice";
import { useDispatch, useSelector } from "react-redux";

const PromptSelection = () => {
  const dispatch = useDispatch();
  const [openTab, setOpenTab] = useState(1);

  const prompts = useSelector((state) => state.dataExtraction.prompts);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  const status = useSelector((state) => state.dataExtraction.status);

  useEffect(() => {
    dispatch(fetchPrompts());
  }, [dispatch]);

  useEffect(() => {
    if (status === "succeeded" && !selectedPrompt && prompts.length > 0) {
      dispatch(setSelectedPrompt({ selectedPrompt: prompts[0].prompt_text }));
    }
  }, [status, selectedPrompt, prompts, dispatch]);

  const handleSelectPrompt = (prompt) => {
    dispatch(setSelectedPrompt({ selectedPrompt: prompt["prompt_text"] }));
  };

  const handlePromptSubmitSuccess = () => {
    setOpenTab(1); // Switch back to the first tab
  };

  const handleEditPrompt = (prompt) => {
    // Handle edit prompt logic here
  };

  const handleDeletePrompt = (prompt) => {
    dispatch(deletePrompt({ projectName: localStorage.getItem("selectedProject"), promptTitle: prompt["prompt_title"] }));
  };

  const accordionItems = prompts.map((prompt) => {
    const isActive = prompt["prompt_text"] === selectedPrompt;
    return {
      title: prompt["prompt_title"],
      content: prompt["prompt_text"],
      actionButtonText: isActive ? "Active" : "Use Prompt",
      actionButtonState: isActive,
      onAction: () => handleSelectPrompt(prompt),
      editButtonText: "Edit",
      editButtonState: !prompt["is_default"],
      onEdit: () => handleEditPrompt(prompt),
      deleteButtonText: "Delete",
      deleteButtonState: !prompt["is_default"],
      onDelete: () => handleDeletePrompt(prompt),
    };
  });

  return (
    <>
      <div className="flex flex-wrap">
        <div className="w-full">
          <ul
            className="flex mb-0 list-none flex-wrap pt-3 pb-4 flex-row"
            role="tablist"
          >
            <li className="-mb-px mr-2 last:mr-0 flex-auto text-center">
              <a
                className={
                  "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                  (openTab === 1
                    ? "text-white bg-lightBlue-600"
                    : "text-lightBlue-600 bg-white")
                }
                onClick={(e) => {
                  e.preventDefault();
                  setOpenTab(1);
                }}
                data-toggle="tab"
                href="#link2"
                role="tablist"
              >
                <i className="fas fa-book-open text-base mr-1"></i>Explore
                default answer formats
              </a>
            </li>
            <li className="-mb-px mr-2 last:mr-0 flex-auto text-center">
              <a
                className={
                  "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                  (openTab === 2
                    ? "text-white bg-lightBlue-600"
                    : "text-lightBlue-600 bg-white")
                }
                onClick={(e) => {
                  e.preventDefault();
                  setOpenTab(2);
                }}
                data-toggle="tab"
                href="#link1"
                role="tablist"
              >
                <i className="fas fa-pen-to-square text-base mr-1"></i> Write
                your own instructions
              </a>
            </li>
          </ul>
          <div className="relative flex flex-col min-w-0 break-words bg-white w-full shadow-lg rounded">
            <div className="px-4 py-5 flex-auto">
              <div className="tab-content tab-space">
                <div className={openTab === 1 ? "block" : "hidden"} id="link2">
                  <Accordion
                    accordionTitle={"Get Started"}
                    accordionSubTitle={
                      "Explore default answer formats or craft your own for tailored responses."
                    }
                    items={accordionItems}
                  />
                </div>
                <div className={openTab === 2 ? "block" : "hidden"} id="link1">
                  <CreatePrompt
                    onPromptSubmitSuccess={handlePromptSubmitSuccess}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default PromptSelection;
