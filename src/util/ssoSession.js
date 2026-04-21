import { api } from "util/api";

export const exchangeMicrosoftIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Failed to retrieve Microsoft ID token.");
  }

  const response = await api.post(
    "sso/login",
    { token: idToken },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

export const persistSlrSsoSessionMetadata = (sessionData, fallbackUsername) => {
  if (sessionData?.role) {
    localStorage.setItem("role", sessionData.role);
  }

  const resolvedUsername = sessionData?.username || fallbackUsername;
  if (resolvedUsername) {
    localStorage.setItem("username", resolvedUsername);
  }
};
