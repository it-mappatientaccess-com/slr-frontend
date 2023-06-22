import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import { signInSchema } from "../../schema/schema";
import Alert from "components/Alerts/Alert";
import AuthContext from "store/auth-context";
import { useNavigate } from "react-router";
import { useLocation } from "react-router-dom";
import api from "util/api";

const initialValues = {
  username: "",
  password: "",
};

export default function Login() {
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [loginStatus, setLoginStatus] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });
  const { values, errors, touched, handleBlur, handleChange, handleSubmit } =
    useFormik({
      initialValues,
      validationSchema: signInSchema,
      onSubmit: async (values, action) => {
        await api
          .post(
            "login",
            {
              username: values.username,
              password: values.password,
            },
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          )
          .then((response) => {
            if (response.status === 200) {
              setLoginStatus({
                submitted: true,
                status: "Logging in... ",
                message: response.data.message,
                color: "bg-emerald-500",
              });
              ctx.login(
                `Bearer ${response.data.access_token}`,
                response.data.expiration_time
              );
              navigate("/dashboard/my-projects", { replace: true });
            }
            return response;
          })
          .catch((error) => {
            if (error.response.status === 404) {
              setTimeout(() => {
                setLoginStatus({
                  submitted: true,
                  status: "Error: ",
                  message: error.response.data.detail,
                  color: "bg-orange-500",
                });
              }, 3000);
            }
            action.resetForm();
          });
      },
    });

  useEffect(() => {
    if (ctx.isLoggedIn) {
      const { from } = location.state || {
        from: { pathname: "/dashboard/my-projects" },
      };
      navigate(from, { replace: true });
    }
  }, [ctx.isLoggedIn, location, navigate]);

  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full lg:w-4/12 px-4">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
            <div className="rounded-t mb-0 px-6 py-6">
              <div className="text-center mb-3">
                <h4 className="text-blueGray-500 font-bold">Sign in</h4>
              </div>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <form onSubmit={handleSubmit}>
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="email"
                  >
                    Username or Email
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
                {/* <div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      id="customCheckLogin"
                      type="checkbox"
                      className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                    />
                    <span className="ml-2 text-sm font-semibold text-blueGray-600">
                      Remember me
                    </span>
                  </label>
                </div> */}
                {loginStatus.submitted && (
                  <Alert
                    alertClass={loginStatus.color}
                    alertTitle={loginStatus.status}
                    alertMessage={loginStatus.message}
                  />
                )}
                <div className="text-center mt-6">
                  <button
                    className={`bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150 ${
                      loginStatus.submitted ? "opacity-50" : ""
                    }`}
                    type="submit"
                  >
                    {loginStatus.submitted ? "Signing in..." : "Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="flex flex-wrap mt-6 relative">
            <div className="w-full text-center">
              <Link to="/auth/register" className="text-blueGray-200">
                Create new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
