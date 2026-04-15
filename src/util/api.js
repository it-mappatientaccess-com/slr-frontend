import axios from "axios";
import { redirectToLoginFromExpiry } from "util/authSession";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  },
});

const getAuthorizationHeader = (headers) => {
  if (!headers) {
    return null;
  }

  return headers.Authorization || headers.authorization || null;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = `${error?.config?.url || ""}`;
    const authHeader = getAuthorizationHeader(error?.config?.headers);
    const isRefreshTokenRequest = requestUrl.includes("refresh-token");

    if (status === 401 && (authHeader || isRefreshTokenRequest)) {
      redirectToLoginFromExpiry();
    }

    return Promise.reject(error);
  },
);

// Function to get WebSocket URL from environment variables
const getWebSocketURL = () => {
  return process.env.REACT_APP_WS_URL;
};
// Exporting the Axios instance and the WebSocket URL function
export { api, getWebSocketURL };
