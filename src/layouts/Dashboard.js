import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// components

import AdminNavbar from "components/Navbars/AdminNavbar.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import FooterAdmin from "components/Footers/FooterAdmin.js";

// views

import Settings from "views/dashboard/Settings.js";
import Tables from "views/dashboard/Tables.js";
import MyProjects from "views/dashboard/MyProjects";
import AAIR from "views/dashboard/AAIR";
import ResultHistory from "views/dashboard/ResultHistory";
import SEA from "views/dashboard/SEA";

import UserManagement from "views/dashboard/UserManagement";
export default function Dashboard() {
  return (
    <>
      <Sidebar />
      <div className="relative md:ml-64 bg-blueGray-100">
        <AdminNavbar
        />

        <div className="mx-auto w-full min-h-screen-85">
          <Outlet />
          <Routes>
            <Route path="my-projects" exact element={<MyProjects />} />
            <Route path="abstract-reviewer" exact element={<AAIR />} />
            <Route
              path="data-extraction"
              exact
              element={<SEA />}
            />
            <Route path="result-history" exact element={<ResultHistory />} />
            <Route path="settings" exact element={<Settings />} />
            <Route path="tables" exact element={<Tables />} />
            <Route
              path="/dashboard/*"
              element={<Navigate to="/dashboard/my-projects" />}
            />
            <Route path="user-management" exact element={<UserManagement />} />

          </Routes>
        </div>
        <FooterAdmin />
      </div>
    </>
  );
}
