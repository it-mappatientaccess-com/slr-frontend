import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import { signUpSchema } from "../../schema/schema";
import { useNavigate, useLocation } from "react-router-dom";
import Alert from "components/Alerts/Alert";
import {api} from "util/api";
import { fetchUsersData } from "store/user-management-actions";
import { useDispatch } from "react-redux";
const initialValues = {
  name: "",
  username: "",
  password: "",
  confirm_password: "",
};

const Register = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorStatus, setErrorStatus] = useState({
    status: "",
    message: "",
    color: "",
  });
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const { values, errors, touched, handleBlur, handleChange, handleSubmit } =
    useFormik({
      initialValues,
      validationSchema: signUpSchema,
      onSubmit: (values, action) => {
        // sending post request to register the user
        api
          .post("register", {
            name: values.name,
            username: values.username,
            password: values.password,
          })
          .then((response) => {
            if (response.status === 200) {
              setIsSubmitted(true);
              setErrorStatus({
                status: "Success: ",
                message: response.data.message,
                color: "bg-emerald-500",
              });
              // Check if the current location is /auth/register
              if (location.pathname === "/auth/register") {
                setTimeout(() => {
                  navigate("/auth/login");
                }, 2000);
              } else {
              dispatch(fetchUsersData());
              }
            }
            return response;
          })
          .catch((error) => {
            console.log(error);
            if (error.code) {
              setIsSubmitted(true);
              setErrorStatus({
                status: "Error: ",
                message: error.message,
                color: "bg-orange-500",
              });
            } else if (error.response.status === 422) {
              setIsSubmitted(true);
              setErrorStatus({
                status: "Error: ",
                message: error.response.data.detail,
                color: "bg-orange-500",
              });
            }
          });
        action.resetForm();
      },
    });
  useEffect(() => {
    if (isSubmitted) {
      setShowAlert(true); // Show the alert when the form is submitted
      const timer = setTimeout(() => {
        setShowAlert(false); // Hide the alert after 5 seconds
      }, 5000);

      // Clean up the timer when the component is unmounted or the isSubmitted changes
      return () => clearTimeout(timer);
    }
  }, [isSubmitted]);
  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div
          className={`w-full px-4 ${
            location.pathname === "/auth/register" ? "lg:w-6/12" : "w-full"
          }`}
        >
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
            <div className="rounded-t mb-0 px-6 py-6">
              <div className="text-center mb-3">
                {location.pathname === "/auth/register" ? (
                  <h6 className="text-blueGray-500 text-sm font-bold">
                    Sign up
                  </h6>
                ) : (
                  <h6 className="text-blueGray-500 text-sm font-bold">
                    Create User
                  </h6>
                )}
              </div>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-3 font-bold">
                {location.pathname === "/auth/register" && (
                  <small>Sign up with credentials</small>
                )}
              </div>
              <form onSubmit={handleSubmit}>
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="name"
                  >
                    Name
                  </label>
                  <input
                    type="name"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.name
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Name"
                    name="name"
                    id="name"
                    autoComplete="off"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.name && touched.name && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.username
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Email"
                    name="username"
                    autoComplete="off"
                    id="email"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.username && touched.username && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.username}
                    </p>
                  )}
                </div>

                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.password
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Password"
                    name="password"
                    id="password"
                    autoComplete="off"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.password && touched.password && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.password}
                    </p>
                  )}
                </div>
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="confirm_password"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.confirm_password
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Confirm Password"
                    id="confirm_password"
                    name="confirm_password"
                    autoComplete="off"
                    value={values.confirm_password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.confirm_password && touched.confirm_password && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.confirm_password}
                    </p>
                  )}
                </div>
                {location.pathname === "/auth/register" && (
                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        id="customCheckLogin"
                        type="checkbox"
                        className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                      />
                      <span className="ml-2 text-sm font-semibold text-blueGray-600">
                        I agree with the{" "}
                        <a
                          href="#tejas"
                          className="text-lightBlue-500"
                          onClick={(e) => e.preventDefault()}
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                  </div>
                )}
                {showAlert && isSubmitted && (
                  <Alert
                    alertClass={errorStatus.color}
                    alertTitle={errorStatus.status}
                    alertMessage={errorStatus.message}
                  />
                )}
                <div className="text-center mt-6">
                  <button
                    className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                    type="submit"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Register;
