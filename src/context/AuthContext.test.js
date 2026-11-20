import "@testing-library/jest-dom";
import React, { useContext } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthContext, { AuthContextProvider } from "context/AuthContext";
import { api } from "util/api";

const mockAcquireTokenSilent = jest.fn();
const mockGetActiveAccount = jest.fn();
const mockGetAllAccounts = jest.fn();
const mockSetActiveAccount = jest.fn();

jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: mockAcquireTokenSilent,
      getActiveAccount: mockGetActiveAccount,
      getAllAccounts: mockGetAllAccounts,
      setActiveAccount: mockSetActiveAccount,
    },
  }),
}));

jest.mock("util/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock("util/refreshToken", () => jest.fn());
jest.mock("react-toastify", () => ({
  toast: {
    info: jest.fn(),
  },
}));

const TestConsumer = () => {
  const ctx = useContext(AuthContext);

  return (
    <div>
      <div data-testid="token">{ctx.token}</div>
      <div data-testid="login-method">{ctx.loginMethod}</div>
      <button type="button" onClick={() => ctx.refreshToken()}>
        Refresh
      </button>
    </div>
  );
};

describe("AuthContextProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("refreshes SSO sessions through the backend exchange instead of storing the Microsoft access token", async () => {
    const user = userEvent.setup();
    const microsoftAccount = { username: "tejas@kintiga.com" };
    // Keep dates relative to now so the stored session is never already expired
    const DAY_MS = 24 * 60 * 60 * 1000;
    const currentExpiry = new Date(Date.now() + DAY_MS).toISOString();
    const refreshedExpiry = new Date(Date.now() + 2 * DAY_MS).toISOString();

    localStorage.setItem("token", "Bearer old-slr-token");
    localStorage.setItem("expirationTime", currentExpiry);
    localStorage.setItem("loginMethod", "sso");

    mockGetActiveAccount.mockReturnValue(microsoftAccount);
    mockGetAllAccounts.mockReturnValue([microsoftAccount]);
    mockAcquireTokenSilent.mockResolvedValue({
      idToken: "microsoft-id-token",
      accessToken: "microsoft-access-token",
    });
    api.post.mockResolvedValue({
      data: {
        access_token: "new-slr-token",
        expiration_time: refreshedExpiry,
        role: "admin",
        username: "tejas@kintiga.com",
      },
    });

    render(
      <AuthContextProvider>
        <TestConsumer />
      </AuthContextProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "sso/login",
        { token: "microsoft-id-token" },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    expect(mockAcquireTokenSilent).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("Bearer new-slr-token");
    expect(localStorage.getItem("token")).not.toBe(
      "Bearer microsoft-access-token",
    );
    expect(localStorage.getItem("expirationTime")).toBe(refreshedExpiry);
    expect(localStorage.getItem("role")).toBe("admin");
    expect(localStorage.getItem("username")).toBe("tejas@kintiga.com");
    expect(screen.getByTestId("token")).toHaveTextContent("Bearer new-slr-token");
    expect(screen.getByTestId("login-method")).toHaveTextContent("sso");
  });
});
