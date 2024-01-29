import React from "react";

import MultiFileUpload from "components/SEA/MultiFileUpload";
// import SingleFileUpload from "components/SEA/SingleFileUpload";
import { useSelector } from "react-redux";
import LoadingBar from "react-top-loading-bar";
import { setProgress } from "store/data-extraction-actions";
import HeaderSea from "components/Headers/HeaderSEA";

const SEA = ({ isAccordionVisible }) => {
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
      <HeaderSea isAccordionVisible={isAccordionVisible}/>
      <div className="flex flex-wrap">
        <div className="w-full mb-6">
          <div className="relative flex flex-col min-w-0 break-words rounded mb-6 bg-white">
            <div className="flex-auto p-4">
              <div className="flex flex-wrap">
                <div className="w-full">
                <MultiFileUpload />

                  {/* <ul
                    className="flex mb-0 list-none flex-wrap pt-3 pb-4 flex-row"
                    role="tablist"
                  >
                    <li className="-mb-px mr-2 last:mr-0 flex-auto text-center">
                      <a
                        className={
                          "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                          (openTab === 1
                            ? "text-white bg-lightBlue-600"
                            : "text-lightBlue-600 bg-white")
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTab(1);
                        }}
                        data-toggle="tab"
                        href="#link2"
                        role="tablist"
                      >
                        <i className="fas fa-upload text-base mr-1"></i> Multi
                        File Extraction
                      </a>
                    </li>
                    <li className="-mb-px mr-2 last:mr-0 flex-auto text-center">
                      <a
                        className={
                          "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                          (openTab === 2
                            ? "text-white bg-lightBlue-600"
                            : "text-lightBlue-600 bg-white")
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTab(2);
                        }}
                        data-toggle="tab"
                        href="#link1"
                        role="tablist"
                      >
                        <i className="fas fa-pen-to-square text-base mr-1"></i>{" "}
                        Single File Extraction
                      </a>
                    </li>
                  </ul>
                  <div className="relative flex flex-col min-w-0 break-words bg-white w-full shadow-lg rounded">
                    <div className="px-4 py-5 flex-auto">
                      <div className="tab-content tab-space">
                        <div
                          className={openTab === 1 ? "block" : "hidden"}
                          id="link2"
                        >
                          <MultiFileUpload />
                        </div>
                        <div
                          className={openTab === 2 ? "block" : "hidden"}
                          id="link1"
                        >
                          <SingleFileUpload />
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default SEA;
