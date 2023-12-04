import {api} from "util/api";

async function refreshToken(token) {
  try {
    const response = await api.post("refresh-token", { token });
    if (response.status === 200) {
      return response.data;
    }
  } catch (error) {
    console.error("Error refreshing token", error);
    // Check if error response is 401 with the specific detail
    if (error.response && error.response.status === 401 && error.response.data.detail === "Invalid authentication credentials") {
      throw error; // throw the error to be caught by the refreshTokenHandler
    }
  }
  return null;
}
export default refreshToken;
