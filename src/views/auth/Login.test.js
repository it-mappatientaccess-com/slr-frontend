import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "views/auth/Login";
import AuthContext from "context/AuthContext";
import { api } from "util/api";
import { loginRequest } from "../../authConfig";

const mockLoginRedirect = jest.fn();

jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      loginRedirect: mockLoginRedirect,
    },
  }),
}));

jest.mock("util/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

const renderLogin = (contextValue = {}) =>
  render(
    <AuthContext.Provider
      value={{
        isLoggedIn: false,
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        loginMethod: null,
        token: "",
        ...contextValue,
      }}
    >
      <MemoryRouter initialEntries={["/auth/login"]}>
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/dashboard/my-projects" element={<div>Projects Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("submits credentials, stores session metadata, and navigates to projects", async () => {
    const user = userEvent.setup();
    const loginSpy = jest.fn();

    api.post.mockResolvedValue({
      status: 200,
      data: {
        access_token: "slr-token",
        expiration_time: "2026-06-02T00:00:00.000Z",
        role: "admin",
        message: "Logged in",
      },
    });

    renderLogin({ login: loginSpy });

    await user.type(screen.getByLabelText(/username or email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "login",
        {
          username: "user@example.com",
          password: "Password1!",
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      expect(loginSpy).toHaveBeenCalledWith(
        "Bearer slr-token",
        "2026-06-02T00:00:00.000Z",
        "credentials",
      );
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });

    expect(localStorage.getItem("role")).toBe("admin");
    expect(localStorage.getItem("username")).toBe("user@example.com");
  });

  it("starts the Microsoft login redirect when the SSO button is clicked", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.click(
      screen.getByRole("button", { name: /sign in with microsoft/i }),
    );

    expect(mockLoginRedirect).toHaveBeenCalledWith(loginRequest);
  });
});
