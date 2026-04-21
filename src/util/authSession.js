import { toast } from "react-toastify";

const AUTH_STORAGE_KEYS = [
  "token",
  "expirationTime",
  "loginMethod",
  "role",
  "username",
];
const APP_SESSION_STORAGE_KEYS = [
  ...AUTH_STORAGE_KEYS,
  "currentProjectId",
  "selectedProject",
  "questions",
  "currentBatchID",
  "totalFilesInBatch",
  "hasGraphToken",
];
const AUTH_REDIRECT_DELAY_MS = 3200;

let hasTriggeredAuthRedirect = false;

const removeStorageKeys = (keys) => {
  keys.forEach((key) => localStorage.removeItem(key));
};

export const clearSlrSessionStorage = () => {
  removeStorageKeys(AUTH_STORAGE_KEYS);
};

export const clearAuthStorage = clearSlrSessionStorage;

export const clearSlrAppSessionStorage = () => {
  removeStorageKeys(APP_SESSION_STORAGE_KEYS);
};

export const resetAuthRedirectState = () => {
  hasTriggeredAuthRedirect = false;
};

export const redirectToLogin = () => {
  clearSlrAppSessionStorage();
  resetAuthRedirectState();

  if (window.location.pathname !== "/auth/login") {
    window.location.replace("/auth/login");
  }
};

export const redirectToLoginFromExpiry = () => {
  if (hasTriggeredAuthRedirect) {
    return;
  }

  hasTriggeredAuthRedirect = true;
  clearSlrAppSessionStorage();

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
