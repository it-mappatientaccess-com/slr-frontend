import { useEffect, useState } from "react";
const ProgressBar = (props) => {
  const [taskInProgress, setTaskInProgress] = useState("");
  const [percentage, setPercentage] = useState("0");

  useEffect(() => {
    setTaskInProgress(props.taskInProgress);
    setPercentage(props.percentage);
  }, [props]);

  return (
    <div className="relative pt-1">
      <div className="flex mb-2 items-center justify-between">
        <div>
          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-lightBlue-600 bg-lightBlue-200">
            {taskInProgress}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold inline-block text-lightBlue-600">
            {percentage}%
          </span>
        </div>
      </div>
      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-lightBlue-200 animate-pulse">
        <div
          style={{ width: percentage + "%" }}
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-lightBlue-500"
        ></div>
      </div>
    </div>
  );
};
export default ProgressBar;
