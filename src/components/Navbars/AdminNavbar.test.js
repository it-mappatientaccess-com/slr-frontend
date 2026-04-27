import "@testing-library/jest-dom";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import AdminNavbar from "./AdminNavbar";

let mockActiveAccount = null;
let mockAccounts = [];

jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      getActiveAccount: () => mockActiveAccount,
    },
    accounts: mockAccounts,
  }),
}));

jest.mock("components/Modal/Modal", () => () => null);
jest.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

const renderNavbar = () =>
  render(
    <MemoryRouter
      initialEntries={["/dashboard/my-projects"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <AdminNavbar />
    </MemoryRouter>,
  );

describe("AdminNavbar", () => {
  beforeEach(() => {
    localStorage.clear();
    mockActiveAccount = null;
    mockAccounts = [];
  });

  it("greets the stored display name when one is available", () => {
    localStorage.setItem("username", "tony.stark@kintiga.com");
    localStorage.setItem("displayName", "Tony Stark");

    renderNavbar();

    expect(screen.getByText(/hello tony stark/i)).toBeInTheDocument();
  });

  it("falls back to the Microsoft account name", () => {
    localStorage.setItem("username", "tony.stark@kintiga.com");
    mockActiveAccount = { name: "Anthony Stark" };

    renderNavbar();

    expect(screen.getByText(/hello anthony stark/i)).toBeInTheDocument();
  });

  it("uses a cleaned email name when no display name exists", () => {
    localStorage.setItem("username", "tony.stark@kintiga.com");

    renderNavbar();

    expect(screen.getByText(/hello tony stark/i)).toBeInTheDocument();
  });

  it("falls back safely when no user identity is available", () => {
    renderNavbar();

    expect(screen.getByText(/hello user/i)).toBeInTheDocument();
  });
});
