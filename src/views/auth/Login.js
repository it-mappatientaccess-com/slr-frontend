// views/auth/Login.js

import React, { useContext, useState, useEffect } from 'react';
import { useFormik } from 'formik';
import { signInSchema } from '../../schema/schema';
import Alert from 'components/Alerts/Alert';
import AuthContext from 'context/AuthContext';
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';
import { api } from 'util/api';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';

const initialValues = {
  username: "",
  password: "",
};

export default function Login() {
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { instance } = useMsal();

  const [loginStatus, setLoginStatus] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });

  const handleInputChange = (event) => {
    setLoginStatus({
      submitted: false,
      status: "",
      message: "",
      color: "",
    });
    handleChange(event);
  };

  const { values, errors, touched, handleBlur, handleChange, handleSubmit } =
    useFormik({
      initialValues,
      validationSchema: signInSchema,
      onSubmit: async (values, action) => {
        setLoginStatus({
          submitted: true,
        });

        await api
          .post(
            'login',
            {
              username: values.username,
              password: values.password,
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          )
          .then((response) => {
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('username', values.username);

            if (response.status === 200) {
              setLoginStatus({
                submitted: false,
                status: 'Logged in successfully!',
                message: response.data.message,
                color: 'bg-emerald-500',
              });
              ctx.login(
                `Bearer ${response.data.access_token}`,
                response.data.expiration_time,
                'credentials'
              );
              navigate('/dashboard/my-projects', { replace: true });
            }
          })
          .catch((error) => {
            let errorMessage = 'An error occurred. Please try again.';

            if (error.response) {
              switch (error.response.status) {
                case 400:
                  errorMessage =
                    'There seems to be an issue with your request.';
                  break;
                case 401:
                  errorMessage = 'Incorrect username or password.';
                  break;
                case 500:
                  errorMessage = 'Server error. Please try again later.';
                  break;
                default:
                  errorMessage = 'An unexpected error occurred.';
                  break;
              }
            }
            setLoginStatus({
              submitted: false,
              status: 'Error!',
              message: errorMessage,
              color: 'bg-red-500',
            });
          });
      },
    });

  // Handle SSO Login using loginRedirect
  const handleSSOLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  useEffect(() => {
    if (ctx.isLoggedIn) {
      const { from } = location.state || {
        from: { pathname: '/dashboard/my-projects' },
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
              <div className="flex flex-wrap justify-center m-4">
                <div className="w-6/12 sm:w-6/12 px-4">
                  <img
                    src={require('assets/img/Kintiga-Logo-Wide-Colour-RGB.png')}
                    alt="..."
                    className="max-w-full h-auto align-middle border-none"
                  />
                </div>
              </div>
              <div className="text-center mb-3">
                <h4 className="text-blueGray-500 font-bold">Sign in</h4>
              </div>
              <hr className="mt-3 border-b-1 border-blueGray-300" />
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                  />
                  {errors.password && touched.password && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.password}
                    </p>
                  )}
                </div>

                {loginStatus.status && (
                  <Alert
                    alertClass={loginStatus.color}
                    alertTitle={loginStatus.status}
                    alertMessage={loginStatus.message}
                  />
                )}

                <div className="text-center mt-6">
                  <button
                    className={`bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150 ${
                      loginStatus.submitted ? 'opacity-50' : ''
                    }`}
                    type="submit"
                    disabled={loginStatus.submitted}
                  >
                    {loginStatus.submitted ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* SSO Login Button */}
                  <button
                    className="text-blueGray-500 bg-white border border-solid border-blueGray-500 hover:bg-blueGray-500 hover:text-white active:bg-blueGray-600 font-bold uppercase text-sm px-6 py-3 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 w-full"
                    type="button"
                    onClick={handleSSOLogin}
                  >
                    <i className="fa-brands fa-microsoft"></i> Sign in with Microsoft 
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
