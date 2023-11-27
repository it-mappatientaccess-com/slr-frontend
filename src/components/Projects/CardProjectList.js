import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProjectsTable from "./ProjectsTable";
import { fetchProjectsData } from "store/project-actions";
import LoadingBar from "react-top-loading-bar";
import Alert from "components/Alerts/Alert";
const CardProjectList = ({ handleProjectClicked }) => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.project.progress);
  const error = useSelector((state) => state.project.error);
  const [updateResponse, setUpdateResponse] = useState("");
  const createProjectHandler = () => {
    handleProjectClicked(true);
    setTimeout(() => {
      // Scroll to the bottom of the page with smooth behavior
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 100); // Adjust the delay as necessary
  };

  useEffect(() => {
    dispatch(fetchProjectsData());
  }, [dispatch]);

  // Function to clear update response message
  const clearUpdateResponse = () => {
    setUpdateResponse("");
  };

  // Clear the update response after a specified duration (e.g., 5000 milliseconds)
  useEffect(() => {
    let timer;
    if (error) {
      setUpdateResponse(error);
      timer = setTimeout(clearUpdateResponse, 5000);
    }
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <>
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        height={3}
        loaderSpeed={3000}
      />
      <div className="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded-lg bg-blueGray-100 border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">My Projects</h6>
            <button
              className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150"
              type="button"
              onClick={createProjectHandler}
            >
              Create Project
            </button>
          </div>
        </div>
        {updateResponse && (
          <Alert
            alertClass={"bg-red-500"}
            alertTitle={"Error:"}
            alertMessage={updateResponse}
          />
        )}
        {/* Displaying errors */}
        <ProjectsTable />
      </div>
    </>
  );
};

export default CardProjectList;
