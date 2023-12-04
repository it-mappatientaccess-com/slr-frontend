import axios from "axios";
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  },
});
// Function to get WebSocket URL from environment variables
const getWebSocketURL = () => {
  return process.env.REACT_APP_WS_URL;
};
// Exporting the Axios instance and the WebSocket URL function
export { api, getWebSocketURL };
