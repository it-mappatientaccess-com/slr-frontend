// context/AuthContext.js

import React, { useState, useCallback, useEffect } from 'react';
import { useMsal } from '@azure/msal-react'; // Import useMsal
import { loginRequest } from '../authConfig'; // Import loginRequest
import refreshToken from 'util/refreshToken';
let refreshTimer;

const AuthContext = React.createContext({
  token: '',
  isLoggedIn: false,
  loginMethod: null,
  login: (token, expirationTime, method) => {},
  logout: () => {},
  refreshToken: () => {},
});

const calculateRemainingTime = (expirationTime) => {
  const currentTime = new Date().getTime();
  const adjExpirationTime = new Date(expirationTime).getTime();
  const remainingTime = adjExpirationTime - currentTime;

  return remainingTime;
};

const retrieveStoredToken = () => {
  const storedToken = localStorage.getItem('token');
  const storedExpirationTime = localStorage.getItem('expirationTime');
  const storedLoginMethod = localStorage.getItem('loginMethod');
  return {
    token: storedToken,
    expirationTime: storedExpirationTime,
    loginMethod: storedLoginMethod,
  };
};

export const AuthContextProvider = (props) => {
  const { instance } = useMsal(); // Get MSAL instance
  let tokenData = retrieveStoredToken();
  let initialToken = tokenData.token;
  let initialExpirationTime = tokenData.expirationTime;
  let initialLoginMethod = tokenData.loginMethod;

  const [token, setToken] = useState(initialToken);
  const [tokenExpirationTime, setTokenExpirationTime] = useState(
    initialExpirationTime
  );
  const [loginMethod, setLoginMethod] = useState(initialLoginMethod);

  const userIsLoggedIn = !!token;

  const logoutHandler = useCallback(() => {
    setToken(null);
    setTokenExpirationTime(null);
    setLoginMethod(null);
    localStorage.clear();
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
  }, []);

  const loginHandler = (token, expirationTime, method) => {
    console.log('Logging in with token:', token);
    console.log('Token expires at:', expirationTime);
    setToken(token);
    setTokenExpirationTime(expirationTime);
    setLoginMethod(method);
    localStorage.setItem('token', token);
    localStorage.setItem('expirationTime', expirationTime);
    localStorage.setItem('loginMethod', method);
    const remainingTime = calculateRemainingTime(expirationTime);
    if (remainingTime > 300000) {
      refreshTimer = setTimeout(refreshTokenHandler, remainingTime - 300000); // Refresh token 5 minutes before expiration
    } else {
      refreshTokenHandler();
    }
  };

  const hasTokenExpired = (expirationTime) => {
    const currentTime = new Date().getTime();
    const adjExpirationTime = new Date(expirationTime).getTime();
    return currentTime >= adjExpirationTime;
  };

  const refreshTokenHandler = useCallback(async () => {
    if (hasTokenExpired(tokenExpirationTime)) {
      logoutHandler();
      return;
    }

    if (loginMethod === 'sso') {
      // Attempt to acquire new token via MSAL
      try {
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          });

          const newToken = `Bearer ${tokenResponse.accessToken}`;
          const newExpirationTime = tokenResponse.expiresOn.getTime();

          console.log('Refreshing SSO token:', newToken);
          console.log('New token expires at:', new Date(newExpirationTime));
          setToken(newToken);
          setTokenExpirationTime(newExpirationTime);
          localStorage.setItem('token', newToken);
          localStorage.setItem('expirationTime', newExpirationTime.toString());
          const remainingTime = calculateRemainingTime(newExpirationTime);
          if (remainingTime > 300000) {
            refreshTimer = setTimeout(refreshTokenHandler, remainingTime - 300000);
          }
        } else {
          // No accounts available, logout
          logoutHandler();
        }
      } catch (error) {
        console.error('Silent token acquisition failed:', error);
        logoutHandler();
      }
    } else if (loginMethod === 'credentials') {
      // Existing logic for refreshing token via backend
      try {
        const newTokenData = await refreshToken(token);
        if (newTokenData) {
          const newToken = `Bearer ${newTokenData.access_token}`;
          const newExpirationTime = newTokenData.expiration_time;
          console.log('Refreshing token:', newToken);
          console.log('New token expires at:', newExpirationTime);
          setToken(newToken);
          setTokenExpirationTime(newExpirationTime);
          localStorage.setItem('token', newToken);
          localStorage.setItem('expirationTime', newExpirationTime);
          const remainingTime = calculateRemainingTime(newExpirationTime);
          if (remainingTime > 300000) {
            refreshTimer = setTimeout(refreshTokenHandler, remainingTime - 300000);
          }
        } else {
          // Token refresh failed, logout
          logoutHandler();
        }
      } catch (error) {
        console.log('Error refreshing token:', error);
        logoutHandler();
      }
    } else {
      // Unknown login method, logout
      logoutHandler();
    }
  }, [token, tokenExpirationTime, loginMethod, instance, logoutHandler]);

  useEffect(() => {
    if (tokenExpirationTime) {
      const remainingTime = calculateRemainingTime(tokenExpirationTime);
      if (remainingTime > 300000) {
        refreshTimer = setTimeout(refreshTokenHandler, remainingTime - 300000); // Refresh token 5 minutes before expiration
      } else {
        refreshTokenHandler();
      }
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [tokenExpirationTime, refreshTokenHandler]);

  const contextValue = {
    token,
    isLoggedIn: userIsLoggedIn,
    loginMethod,
    login: loginHandler,
    logout: logoutHandler,
    refreshToken: refreshTokenHandler,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
