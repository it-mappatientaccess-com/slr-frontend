export const msalConfig = {
  auth: {
    clientId: '4d8bdf85-6c8e-4a8e-a0b8-84d6a7e51d61', // Replace with your Azure AD Application (client) ID
    authority: 'https://login.microsoftonline.com/f5e5e503-2b6c-44da-bdfa-8d5b6564bb4b', // Replace with your tenant ID
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set to true if you are having issues on IE11 or Edge
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'Files.ReadWrite.All', 'Sites.Read.All', 'AllSites.Read', 'Files.ReadWrite', 'Sites.ReadWrite.All'],
};
