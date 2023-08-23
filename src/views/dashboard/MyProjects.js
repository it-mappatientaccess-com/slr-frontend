import CreateProject from "components/Forms/CreateProject";
import CardProjectList from "components/Projects/CardProjectList";
import { useState } from "react";

const MyProjects = () => {
  const [createProjectClicked, setCreateProjectClicked] = useState(false);
  const handleProjectClicked = (flagValue) => {
    setCreateProjectClicked(flagValue);
  };

  return (
    <>
      <div className="flex flex-wrap relative min-h-screen">
        <div className="w-full px-4 mt-4">
          <CardProjectList handleProjectClicked={handleProjectClicked} />
        </div>
        {createProjectClicked && (
          <div className="w-full lg:w-8/12 px-4 mt-4">
            <CreateProject />
          </div>
        )}
      </div>
    </>
  );
};
export default MyProjects;
