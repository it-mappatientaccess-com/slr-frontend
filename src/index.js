// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from 'App';

import { Provider } from 'react-redux';
import store from './redux/store';

import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';

import { AuthContextProvider } from 'context/AuthContext';

// Initialize MSAL instance with configuration
const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <MsalProvider instance={msalInstance}>
    <AuthContextProvider>
      <BrowserRouter>
        {/* Redux Provider */}
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
    </AuthContextProvider>
  </MsalProvider>
);
