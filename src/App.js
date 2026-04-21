// src/App.js

import React, { useEffect, useContext, useRef, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'assets/styles/tailwind.css';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector, useDispatch } from 'react-redux';
import LoadingBar from 'react-top-loading-bar';
import { setProgress } from './redux/slices/loadingSlice';

import { useMsal } from '@azure/msal-react';
import AuthContext from 'context/AuthContext';
import { exchangeMicrosoftIdToken, persistSlrSsoSessionMetadata } from 'util/ssoSession';

// layouts
import Dashboard from 'layouts/Dashboard';
import Auth from 'layouts/Auth';

// views without layouts
// import Error404 from 'pages/Error404'; // Optional: For handling 404 errors

const App = () => {
  const progress = useSelector((state) => state.loading.progress);
  const dispatch = useDispatch();

  const { instance } = useMsal();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();
  const hasHandledRedirectRef = useRef(false);

  // Only a valid SLR session unlocks protected routes.
  const isAuthenticated = ctx.isLoggedIn;

  useEffect(() => {
    if (hasHandledRedirectRef.current) {
      return undefined;
    }

    hasHandledRedirectRef.current = true;

    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        console.log('handleRedirectPromise response:', response);

        if (response?.account) {
          instance.setActiveAccount(response.account);
          try {
            const data = await exchangeMicrosoftIdToken(response.idToken);

            persistSlrSsoSessionMetadata(data, response.account.username);
            ctx.login(`Bearer ${data.access_token}`, data.expiration_time, 'sso');
            navigate('/dashboard/my-projects', { replace: true });
          } catch (tokenError) {
            console.error('SSO session exchange failed:', tokenError);
            navigate('/auth/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('handleRedirectPromise error:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    handleRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance]);

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
