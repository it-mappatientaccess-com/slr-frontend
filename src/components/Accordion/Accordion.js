import React, { useState, useRef, useEffect } from "react";
import EditPrompt from "components/Forms/EditPrompt";

const AccordionItem = ({
  title,
  content,
  actionButtonText,
  actionButtonState,
  onAction,
  editButtonText,
  editButtonState,
  onEdit,
  deleteButtonText,
  deleteButtonState,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const toggleAccordion = () => {
    setIsOpen((prevState) => !prevState);
    setShowEditPrompt(false); // Always hide EditPrompt when toggling accordion
    setShowCancelButton(false); // Always hide Cancel button when toggling accordion
  };
  const handleEditSuccess = () => {
    setShowEditPrompt(false);
    setShowCancelButton(false);
  };
  // Recalculate height whenever showEditPrompt changes
  useEffect(() => {
    if (isOpen) {
      setContentHeight(
        contentRef.current ? contentRef.current.scrollHeight : 0
      );
      contentRef.current.style.maxHeight = `${contentHeight}px`;
    }
  }, [showEditPrompt, contentHeight, isOpen]);

  return (
    <div
      className={`transition hover:bg-indigo-50 ${
        isOpen ? "bg-indigo-50" : ""
      }`}
    >
      <div
        className="accordion-header cursor-pointer transition flex space-x-5 px-4 items-center h-16"
        onClick={toggleAccordion}
      >
        <i className={`fas ${isOpen ? "fa-minus" : "fa-plus"}`}></i>
        <h3>{title}</h3>
        <div className="!ml-auto">
          {isOpen &&
            editButtonText &&
            onEdit &&
            editButtonState &&
            !showCancelButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditPrompt(true);
                  setShowCancelButton(true);
                }}
                className={`bg-amber-500 text-white active:bg-amber-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`}
                type="button"
              >
                <i className="fas fa-pencil"></i> {editButtonText}
              </button>
            )}
          {isOpen && showCancelButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEditPrompt(false);
                setShowCancelButton(false);
              }}
              className={`bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`}
              type="button"
            >
              <i className="fas fa-xmark"></i> Cancel
            </button>
          )}

          {deleteButtonText && onDelete && deleteButtonState && (
            <button
              onClick={onDelete}
              className={
                "bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              }
              type="button"
            >
              <i className="fas fa-trash-can"></i> {deleteButtonText}
            </button>
          )}
          {actionButtonText && onAction && (
            <button
              onClick={onAction}
              className={
                actionButtonState
                  ? `text-lightBlue-500 bg-transparent border border-solid border-lightBlue-500 hover:bg-lightBlue-500 hover:text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`
                  : `bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150`
              }
              type="button"
              disabled={actionButtonState}
            >
              {actionButtonText}
            </button>
          )}
        </div>
      </div>
      <div
        ref={contentRef}
        className="accordion-content pt-0 px-4 overflow-hidden"
        style={{ maxHeight: isOpen ? `${contentHeight + 32}px` : "0px" }}
      >
        {showEditPrompt ? (
          <EditPrompt
            title={title}
            content={content}
            onEditSuccess={handleEditSuccess}
          />
        ) : (
          <div>{content}</div>
        )}
      </div>
    </div>
  );
};

// Main Accordion Component
const Accordion = ({ accordionTitle, accordionSubTitle, items }) => {
  return (
    <div className="w-10/12 mx-auto rounded border">
      <div className="bg-white p-10 shadow-sm">
        <h3 id="accordionTitle" className="text-lg font-medium text-gray-800">
          {accordionTitle}
        </h3>
        <p
          id="accordionSubTitle"
          className="text-sm font-light text-gray-600 my-3"
        >
          {accordionSubTitle}
        </p>
        <div className="h-1 w-full mx-auto border-b my-5"></div>

        {items.map((item, index) => (
          <AccordionItem
            key={index}
            title={item.title}
            content={item.content}
            actionButtonText={item.actionButtonText}
            actionButtonState={item.actionButtonState}
            onAction={item.onAction}
            editButtonText={item.editButtonText} // Pass the edit props if they exist
            editButtonState={item.editButtonState}
            onEdit={item.onEdit}
            deleteButtonText={item.deleteButtonText} // Pass the delete props if they exist
            deleteButtonState={item.editButtonState}
            onDelete={item.onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default Accordion;
