// src/App.js

import React, { useEffect, useContext, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'assets/styles/tailwind.css';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector, useDispatch } from 'react-redux';
import LoadingBar from 'react-top-loading-bar';
import { setProgress } from './redux/slices/loadingSlice';

import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { api } from 'util/api';
import AuthContext from 'context/AuthContext';

// layouts
import Dashboard from 'layouts/Dashboard';
import Auth from 'layouts/Auth';

// views without layouts
// import Error404 from 'pages/Error404'; // Optional: For handling 404 errors

const App = () => {
  const progress = useSelector((state) => state.loading.progress);
  const dispatch = useDispatch();

  const { instance, accounts } = useMsal();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const msalIsAuthenticated = useIsAuthenticated();
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();

  // Check if user is authenticated via MSAL or AuthContext
  const isAuthenticated = msalIsAuthenticated || ctx.isLoggedIn;

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        console.log('handleRedirectPromise response:', response);

        if (response !== null && response.account !== null) {
          instance.setActiveAccount(response.account);
        }

        if (instance.getActiveAccount() === null && accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
        }

        if (!ctx.isLoggedIn && instance.getActiveAccount() !== null) {
          try {
            const tokenResponse = await instance.acquireTokenSilent({
              ...loginRequest,
              account: instance.getActiveAccount(),
            });
            console.log('acquireTokenSilent response:', tokenResponse);

            const idToken = tokenResponse.idToken;

            if (!idToken) {
              console.error('Failed to retrieve ID token.');
              setIsAuthLoading(false);
              return;
            }

            const res = await api.post(
              'sso/login',
              { token: idToken },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (res.status === 200) {
              const data = res.data;
              localStorage.setItem('role', data.role);
              localStorage.setItem('username', data.username);

              ctx.login(`Bearer ${data.access_token}`, data.expiration_time, 'sso');
              navigate('/dashboard/my-projects', { replace: true });
            }
          } catch (tokenError) {
            console.error('Token acquisition failed:', tokenError);
            // Do not call logoutRedirect here
            // Instead, you may choose to navigate to the login page or show an error
          }
        }
      } catch (error) {
        console.error('handleRedirectPromise error:', error);
        // Do not call logoutRedirect here
        // Instead, you may choose to navigate to the login page or show an error
      } finally {
        setIsAuthLoading(false);
      }
    };

    handleRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, accounts]);

  if (isAuthLoading) {
    // Show a loading indicator while authentication is processing
    return <div>Loading...</div>;
  }
  return (
    <>
      <ToastContainer />
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        onLoaderFinished={() => dispatch(setProgress(0))}
        height={3}
        loaderSpeed={3000}
      />
      <Routes>
        {/* Protected Routes */}
        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? (
              <Dashboard />
            ) : (
              <Navigate to="/auth/login" replace />
            )
          }
        />
        {/* Public Routes */}
        <Route
          path="/auth/*"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard/my-projects" replace />
            ) : (
              <Auth />
            )
          }
        />
        {/* Redirect Root to Dashboard or Login */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard/my-projects" replace />
            ) : (
              <Navigate to="/auth/login" replace />
            )
          }
        />
        {/* Optional: Catch-all Route for 404 */}
        {/* <Route path="*" element={<Error404 />} /> */}
      </Routes>
    </>
  );
};

export default App;
