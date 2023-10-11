import React from "react";

const Alert = (props) => {
  const [showAlert, setShowAlert] = React.useState(true);
  // Use the prop value directly to decide whether to show the close button or not.
  const showCloseButton = props.showCloseButton !== false; // This will make it true by default
  
  return (
    <>
      {showAlert ? (
        <div
          className={`text-white px-4 py-2 border-0 rounded relative mb-2 ${props.alertClass}`}
        >
          {props.alertTitle && <span className="text-xl inline-block mr-5 align-middle">
            <i className="fas fa-bell" /> 
          </span>}
          <span className="inline-block align-middle mr-8">
            <b className="capitalize"> {props.alertTitle}</b> {props.alertMessage}
          </span>
          {showCloseButton && <button  id="closeButton"
            className="absolute bg-transparent text-2xl font-semibold leading-none right-0 top-0 mt-2 mr-4 outline-none focus:outline-none"
            onClick={() => setShowAlert(false)}
          >
            <span>×</span>
          </button>}
        </div>
      ) : null}
    </>
  );
};

export default Alert;
