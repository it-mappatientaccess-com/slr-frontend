import React from "react";
import PropTypes from "prop-types";
import DynamicInput from "components/DynamicInput/DynamicInput";

const CardCategories = ({ subtitle, title, iconName, iconColor }) => {
  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
      <div className="flex-auto p-4">
        <div className="flex flex-wrap">
          <div className="relative w-full pr-4 max-w-full flex-grow flex-1">
            <h5 className="text-blueGray-400 uppercase font-bold text-xs">
              {subtitle}
            </h5>
            <span className="font-semibold text-xl text-blueGray-700">
              {title}
            </span>
          </div>
          <div className="relative w-auto flex-initial">
            <div
              className={
                "text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-full " +
                iconColor
              }
            >
              <i className={iconName}></i>
            </div>
          </div>
        </div>
        <div>
          <DynamicInput category={title} />
        </div>
      </div>
    </div>
  );
};

CardCategories.defaultProps = {
  subtitle: "subtitle",
  title: "title",
  iconName: "far fa-chart-bar",
  iconColor: "bg-red-500",
};

CardCategories.propTypes = {
  subtitle: PropTypes.string,
  title: PropTypes.string,
  iconName: PropTypes.string,
  // can be any of the background color utilities
  // from tailwindcss
  iconColor: PropTypes.string,
};
export default CardCategories;