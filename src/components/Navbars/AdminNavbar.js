import React, { useState } from "react";
import Modal from "components/Modal/Modal";
import { useLocation } from "react-router";

export default function AdminNavbar({ isAccordionVisible, toggleAccordion }) {
  const location = useLocation();
  const selectedProject = localStorage.getItem("selectedProject");
  const [isModalOpen, setModalOpen] = useState(false);
  const modalContent = `
  <p><strong>Guidelines for Formulating Questions</strong></p>
  <p>To obtain accurate and detailed answers from the Abstract texts or PDF documents, please follow these guidelines when formulating your questions:</p>
  <ul>
      <li><strong>Be Specific:</strong> Clearly define what information you are seeking. Include specific terms, metrics, or details that are relevant to the question.</li>
      <li><strong>Avoid Ambiguity:</strong> Frame your questions in a way that leaves little room for interpretation. Ambiguous questions may lead to incomplete or incorrect answers.</li>
      <li><strong>Consider Context:</strong> If your question relates to a specific section, table, or figure in the document, mention it in your question.</li>
      <li><strong>Use Proper Terminology:</strong> Utilize the terminology and language that is consistent with the subject matter of the document.</li>
      <li><strong>Limit One Query per Question:</strong> Asking multiple questions in one query can lead to confusion. Break down complex queries into individual, focused questions.</li>
      <li><strong>Include Relevant Categories:</strong> If applicable, specify the category or aspect of the study you are inquiring about, such as design, population characteristics, interventions, etc.</li>
      <li><strong>Understanding "OR" Logic:</strong> If you provide multiple questions within the same category, the system uses an "OR" logic. This means that if the answer to any one of the questions is "yes", the overall answer for that category will be considered "yes". Craft your questions accordingly to make use of this logic when necessary.</li>
  </ul>
  <p>By adhering to these guidelines, you will help the system understand your inquiry better, leading to more precise and informative answers.</p>
  
  `;
  return (
    <>
      {/* Navbar */}
      <nav className="relative top-0 left-0 w-full z-10 bg-lightBlue-600 md:flex-row md:flex-nowrap md:justify-start flex items-center p-3">
        <div className="w-full mx-autp items-center flex justify-between md:flex-nowrap flex-wrap p-4">
          <span className="text-white text-sm uppercase hidden lg:inline-block font-semibold">
            {location.pathname === "/dashboard/my-projects"
              ? "dashboard"
              : selectedProject}
          </span>
          <div>
            {location.pathname === "/dashboard/sea" && (
              <button
                className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150"
                type="button"
                onClick={toggleAccordion}
              >
                <i className="fas fa-comment-dots"></i> &nbsp;
                {isAccordionVisible
                  ? "Hide Custom Instructions"
                  : "Show Custom Instructions"}
              </button>
            )}
            {/* User */}
            {location.pathname === "/dashboard/my-projects" ? (
              ""
            ) : (
              <button
                className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                type="button"
                onClick={() => setModalOpen(true)}
              >
                <i className="fas fa-circle-info"></i> HELP
              </button>
            )}
          </div>
          <Modal
            show={isModalOpen}
            title="Important Note:"
            content={modalContent}
            onClose={() => setModalOpen(false)}
          ></Modal>

          {/* <ul className="flex-col md:flex-row list-none items-center hidden md:flex">
            <UserDropdown />
          </ul> */}
        </div>
      </nav>
    </>
  );
}
