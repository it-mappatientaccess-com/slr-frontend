import { toast } from "react-toastify";

const AUTH_STORAGE_KEYS = [
  "token",
  "expirationTime",
  "loginMethod",
  "role",
  "username",
];
const AUTH_REDIRECT_DELAY_MS = 3200;

let hasTriggeredAuthRedirect = false;

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

  Object.keys(localStorage)
    .filter((key) => key.startsWith("msal."))
    .forEach((key) => localStorage.removeItem(key));
};

export const redirectToLoginFromExpiry = () => {
  if (hasTriggeredAuthRedirect) {
    return;
  }

  hasTriggeredAuthRedirect = true;
  clearAuthStorage();

  toast.info("Session expired. Please log in again.", {
    toastId: "session-expired",
    autoClose: 3000,
  });

  if (window.location.pathname !== "/auth/login") {
    window.setTimeout(() => {
      window.location.replace("/auth/login");
    }, AUTH_REDIRECT_DELAY_MS);
  }
};
