// context/AuthContext.js

import React, { useState, useCallback, useEffect } from 'react';
import refreshToken from 'util/refreshToken';
let refreshTimer;

const AuthContext = React.createContext({
  token: '',
  isLoggedIn: false,
  loginMethod: null,
  login: (token, expirationTime) => {},
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
  return { token: storedToken, expirationTime: storedExpirationTime };
};

export const AuthContextProvider = (props) => {
  let tokenData = retrieveStoredToken();
  let initialToken;
  let initialExpirationTime;
  if (tokenData) {
    initialToken = tokenData.token;
    initialExpirationTime = tokenData.expirationTime;
  }
  const [token, setToken] = useState(initialToken);
  const [tokenExpirationTime, setTokenExpirationTime] = useState(
    initialExpirationTime
  );

  const userIsLoggedIn = !!token;
  const [loginMethod, setLoginMethod] = useState(null);
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
          refreshTimer = setTimeout(refreshTokenHandler, remainingTime - 300000); // Refresh token 5 minutes before expiration
        }
      }
    } catch (error) {
      console.log('Error refreshing token:', error);
      if (error.response) {
        // Handle token expiration or invalid refresh token
        logoutHandler();
      } else {
        // Handle other errors (e.g., network issues, server errors)
        // Here you can set a state to show an error notification to the user if needed.
        console.error('Failed to refresh token:', error.message);
      }
    }
  }, [token, tokenExpirationTime, logoutHandler]);

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
