import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Sidebar from "components/Sidebar/Sidebar";
import AuthContext from "context/AuthContext";
import store from "redux/store";

jest.mock("components/Dropdowns/NotificationDropdown.js", () => () => null);
jest.mock("components/Dropdowns/UserDropdown.js", () => () => null);

describe("Sidebar logout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logs the user out and navigates to the login page without Microsoft sign-out", async () => {
    const user = userEvent.setup();
    const logoutSpy = jest.fn();

    localStorage.setItem("role", "admin");

    render(
      <Provider store={store}>
        <AuthContext.Provider
          value={{
            isLoggedIn: true,
            login: jest.fn(),
            logout: logoutSpy,
            refreshToken: jest.fn(),
            loginMethod: "sso",
            token: "Bearer slr-token",
          }}
        >
          <MemoryRouter initialEntries={["/dashboard/my-projects"]}>
            <Routes>
              <Route path="/dashboard/*" element={<Sidebar />} />
              <Route path="/auth/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </Provider>,
    );

    await user.click(screen.getByText(/logout/i));

    expect(logoutSpy).toHaveBeenCalled();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
