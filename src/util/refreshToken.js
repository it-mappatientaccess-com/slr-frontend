import api from "util/api";

async function refreshToken(token) {
  try {
    const response = await api.post("refresh-token", {token});
    if (response.status === 200) {
      return response.data;
    }
  } catch (error) {
    console.error("Error refreshing token", error);
  }
  return null;
}
export default refreshToken;
