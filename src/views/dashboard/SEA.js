import React from "react";

import MultiFileUpload from "components/SEA/MultiFileUpload";
// import SingleFileUpload from "components/SEA/SingleFileUpload";
import { useSelector } from "react-redux";
import LoadingBar from "react-top-loading-bar";
import { setProgress } from "store/data-extraction-actions";
import DEQuestions from "components/SEA/DEQuestions";
import VerticalStepper from "components/VerticalStepper/VerticalStepper";
import PromptSelection from "components/SEA/PromptSelection";
import ExtractionFileList from "components/SEA/ExtractionResult/ExtractionFileList";
const SEA = () => {
  // const [openTab, setOpenTab] = React.useState(1);
  let progress = useSelector((state) => state.dataExtraction.progress);

  return (
    <>
      {/* Systematic Extraction Assistant */}
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
        height={3}
        loaderSpeed={3000}
      />
      <div className="flex-auto p-6">
        <VerticalStepper
          steps={[
            {
              title: "Step 1: Organise Your Questions",
              content: "Add and arrange your questions or keywords in up to 10 columns.",
              component: <DEQuestions />,
              iconClass: "fas fa-question",
            },
            {
              title: "Step 2: Select Answer Format",
              content: "Choose a default answer format or create your own.",
              component: <PromptSelection />,
              iconClass: "fas fa-cog",
            },
            {
              title: "Step 3: Upload Documents",
              content: "Upload documents (PDF, Word, text, ePub, CSV) for context.",
              component: <MultiFileUpload />,
              iconClass: "fas fa-upload",
            },
            {
              title: "Step 4: View Results",
              content: "See a list of processed files. Click 'View Result' to see a table with answers. Export options are available.",
              component: <ExtractionFileList />,
              iconClass: "fas fa-table",
            },
          ]}
        />
      </div>
    </>
  );
};
export default SEA;
