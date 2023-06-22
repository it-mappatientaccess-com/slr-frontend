import React, { useState } from "react";
import CreatableSelect from "react-select/creatable";

const customStyles = {
  option: (provided) => ({
    ...provided,
    whiteSpace: "normal",
    display: "block",
    wordWrap: "break-word",
  }),
  singleValue: (provided) => ({
    ...provided,
    whiteSpace: "normal",
    display: "block",
    wordWrap: "break-word",
  }),
  menu: (provided) => ({
    ...provided,
    width: "auto",
    minWidth: "100%",
  }),
};

const CustomDropdown = ({ options, defaultValue, onInputChange }) => {
  const [selectedOption, setSelectedOption] = useState(defaultValue);

  const handleInputChange = (inputValue) => {
    setSelectedOption(inputValue);
    onInputChange(inputValue);
  };

  return (
    <CreatableSelect
      options={options}
      value={selectedOption}
      onChange={handleInputChange}
      placeholder="Select or type a new option..."
      formatCreateLabel={(inputValue) => `Create new option: "${inputValue}"`}
      styles={customStyles}
    />
  );
};

export default CustomDropdown;
