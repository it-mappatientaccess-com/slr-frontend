import React, { useEffect } from "react";
import Accordion from "components/Accordion/Accordion";
import CreatePrompt from "components/Forms/CreatePrompt";
import {
  fetchPrompts,
  setSelectedPrompt,
  deletePrompt,
} from "store/data-extraction-actions";
import { useDispatch, useSelector } from "react-redux";

const PromptSelection = () => {
  const dispatch = useDispatch();
  const prompts = useSelector((state) => state.dataExtraction.prompts);
  const selectedPrompt = useSelector(
    (state) => state.dataExtraction.selectedPrompt
  );
  useEffect(() => {
    dispatch(fetchPrompts());
  }, [dispatch]);

  const handleSelectPrompt = (prompt) => {
    dispatch(setSelectedPrompt({ selectedPrompt: prompt["prompt_text"] }));
  };
  const handleEditPrompt = (prompt) => {
    console.log("edit active");
    console.log(prompt);
  };
  const handleDeletePrompt = (prompt) => {
    dispatch(deletePrompt(prompt["prompt_title"]));
  };
  const accordionItems = prompts.map((prompt) => ({
    title: prompt["prompt_title"],
    content: prompt["prompt_text"],
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
    <div>
      <Accordion
        accordionTitle={"Get Started"}
        accordionSubTitle={
          "Explore default answer formats or craft your own for tailored responses."
        }
        items={accordionItems}
      />
      <div className="flex items-center">
        <hr className="flex-grow border-t border-blue-300" />
        <span className="px-3 text-lightblue-500">
          Or write your own instructions in the form below
        </span>
        <hr className="flex-grow border-t border-blue-300" />
      </div>
      <CreatePrompt />
    </div>
  );
};

export default PromptSelection;
