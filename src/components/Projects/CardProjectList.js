import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProjectsTable from "./ProjectsTable";
import { fetchProjectsData } from "store/project-actions";
import LoadingBar from "react-top-loading-bar";

const CardProjectList = ({ handleProjectClicked }) => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.project.progress);
  const error = useSelector((state) => state.project.error); // Assuming error state was added to your slice

  const createProjectHandler = () => {
    handleProjectClicked(true);
  };

  useEffect(() => {
    dispatch(fetchProjectsData());
  }, [dispatch]);

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
        {error && <div className="px-6 py-4 text-red-500">{error}</div>} {/* Displaying errors */}
        <ProjectsTable />
      </div>
    </>
  );
};

export default CardProjectList;
