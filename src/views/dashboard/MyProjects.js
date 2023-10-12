import React, { useState } from "react";
import CreateProject from "components/Forms/CreateProject";
import CardProjectList from "components/Projects/CardProjectList";
import { useSelector } from "react-redux";
// import Alert from "components/Alerts/Alert";

const MyProjects = () => {
    const [createProjectClicked, setCreateProjectClicked] = useState(false);
    const errorMessage = useSelector((state) => state.project.error);

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
                {/* {errorMessage && (
                    <Alert
                        alertClass="bg-red-500" // Adjust the color and other properties as needed
                        alertTitle="Error"
                        alertMessage={errorMessage}
                    />
                )} */}
            </div>
        </>
    );
};

export default MyProjects;
