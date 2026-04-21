import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import App from "App";
import AuthContext from "context/AuthContext";
import store from "redux/store";

const mockHandleRedirectPromise = jest.fn();
const mockSetActiveAccount = jest.fn();
const mockGetActiveAccount = jest.fn();

jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      handleRedirectPromise: mockHandleRedirectPromise,
      setActiveAccount: mockSetActiveAccount,
      getActiveAccount: mockGetActiveAccount,
    },
  }),
}));

jest.mock("layouts/Dashboard", () => () => <div>Dashboard Layout</div>);
jest.mock("layouts/Auth", () => () => <div>Auth Layout</div>);
jest.mock("react-top-loading-bar", () => () => null);

describe("App auth routing", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("does not recreate an SLR session from a cached Microsoft account on page load", async () => {
    mockHandleRedirectPromise.mockResolvedValue(null);
    mockGetActiveAccount.mockReturnValue({
      username: "tejas@kintiga.com",
    });

    render(
      <Provider store={store}>
        <AuthContext.Provider
          value={{
            isLoggedIn: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            loginMethod: null,
            token: "",
          }}
        >
          <MemoryRouter initialEntries={["/auth/login"]}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(mockHandleRedirectPromise).toHaveBeenCalled();
      expect(screen.getByText("Auth Layout")).toBeInTheDocument();
    });

    expect(screen.queryByText("Dashboard Layout")).not.toBeInTheDocument();
    expect(mockSetActiveAccount).not.toHaveBeenCalled();
  });

  it("only processes the MSAL redirect bootstrap once for a mounted app instance", async () => {
    mockHandleRedirectPromise.mockResolvedValue(null);

    const { rerender } = render(
      <Provider store={store}>
        <AuthContext.Provider
          value={{
            isLoggedIn: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            loginMethod: null,
            token: "",
          }}
        >
          <MemoryRouter initialEntries={["/auth/login"]}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(mockHandleRedirectPromise).toHaveBeenCalledTimes(1);
    });

    rerender(
      <Provider store={store}>
        <AuthContext.Provider
          value={{
            isLoggedIn: true,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            loginMethod: "sso",
            token: "Bearer slr-token",
          }}
        >
          <MemoryRouter initialEntries={["/dashboard/abstract-reviewer"]}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      </Provider>,
    );

    expect(mockHandleRedirectPromise).toHaveBeenCalledTimes(1);
  });
});
