import React, { useState } from "react";
import CreateProject from "components/Forms/CreateProject";
import CardProjectList from "components/Projects/CardProjectList";
// import { useSelector } from "react-redux";
// import Joyride from 'react-joyride';
const MyProjects = () => {
    const [createProjectClicked, setCreateProjectClicked] = useState(false);

    const handleProjectClicked = (flagValue) => {
        setCreateProjectClicked(flagValue);
    };
    // const steps = [
    //     {
    //       target: '.CardProjectList',
    //       content: 'This is your project list.',
    //       placement: 'top'
    //     },
    //     {
    //       target: '.CreateProject',
    //       content: 'This is where you can create a new project.',
    //       placement: 'bottom'
    //     }
    //   ];
    return (
        <>
        {/* <Joyride steps={steps}
                  continuous={true}
                  scrollToFirstStep={true}
                  showProgress={true}
                  showSkipButton={true}
                /> */}
            <div className="flex flex-wrap relative min-h-screen">
                <div className="w-full px-4 mt-4 CardProjectList">
                    <CardProjectList handleProjectClicked={handleProjectClicked} />
                </div>
                {createProjectClicked && (
                    <div className="w-full lg:w-8/12 px-4 mt-4 CreateProject">
                        <CreateProject />
                    </div>
                )}
            </div>
        </>
    );
};

export default MyProjects;
