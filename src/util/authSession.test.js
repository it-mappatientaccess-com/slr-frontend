import {
  clearSlrAppSessionStorage,
  redirectToLoginFromExpiry,
  resetAuthRedirectState,
} from "util/authSession";
import { toast } from "react-toastify";

jest.mock("react-toastify", () => ({
  toast: {
    info: jest.fn(),
  },
}));

describe("authSession helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthRedirectState();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("clears only SLR and app session keys", () => {
    localStorage.setItem("token", "Bearer slr-token");
    localStorage.setItem("role", "admin");
    localStorage.setItem("currentProjectId", "project-123");
    localStorage.setItem("hasGraphToken", "true");
    localStorage.setItem("msal.account", "cached-microsoft-session");

    clearSlrAppSessionStorage();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("role")).toBeNull();
    expect(localStorage.getItem("currentProjectId")).toBeNull();
    expect(localStorage.getItem("hasGraphToken")).toBeNull();
    expect(localStorage.getItem("msal.account")).toBe(
      "cached-microsoft-session",
    );
  });

  it("preserves msal cache during expiry redirects", () => {
    jest.spyOn(window, "setTimeout").mockImplementation(() => 0);
    localStorage.setItem("token", "Bearer slr-token");
    localStorage.setItem("selectedProject", "Demo project");
    localStorage.setItem("msal.account", "cached-microsoft-session");

    redirectToLoginFromExpiry();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("selectedProject")).toBeNull();
    expect(localStorage.getItem("msal.account")).toBe(
      "cached-microsoft-session",
    );
    expect(toast.info).toHaveBeenCalledWith(
      "Session expired. Please log in again.",
      expect.objectContaining({
        toastId: "session-expired",
        autoClose: 3000,
      }),
    );
  });
});
