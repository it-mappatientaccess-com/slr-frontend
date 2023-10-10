import React, { useState, useEffect } from "react";
import CreateProject from "components/Forms/CreateProject";
import CardProjectList from "components/Projects/CardProjectList";
import { useSelector } from "react-redux";
import Alert from "components/Alerts/Alert";

const MyProjects = () => {
    const [createProjectClicked, setCreateProjectClicked] = useState(false);
    const errorMessage = useSelector((state) => state.project.error);
    const [isVisible, setIsVisible] = useState(false);  // Alert visibility state

    useEffect(() => {
        if (errorMessage) {
            setIsVisible(true);
            setTimeout(() => {
                setIsVisible(false);
            }, 5000); // Hide alert after 5 seconds
        }
    }, [errorMessage]);

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
                {isVisible && (
                    <Alert
                        alertClass="bg-red-500" // Adjust the color and other properties as needed
                        alertTitle="Error"
                        alertMessage={errorMessage}
                        isVisible={isVisible}
                    />
                )}
            </div>
        </>
    );
};

export default MyProjects;
