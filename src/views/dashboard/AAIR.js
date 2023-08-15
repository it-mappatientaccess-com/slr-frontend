import React from "react";
import AbstractTabs from "components/AAIR/AbstractTabs";
import HeaderStats from "components/Headers/HeaderAAIR.js";
import { useSelector } from "react-redux";
import LoadingBar from "react-top-loading-bar";
import { setProgress } from "store/qa-actions";

export default function AAIR() {
  let progress = useSelector((state) => state.questionAbstractData.progress);

  return (
    <>
      {/* Header */}
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
        height={3}
        loaderSpeed={3000}
      />
      <HeaderStats />
      <div className="flex flex-wrap">
        <div className="w-full mb-12">
          <div className="relative flex flex-col min-w-0 break-words rounded mb-6">
            <div className="flex-auto p-4">
              <AbstractTabs />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
