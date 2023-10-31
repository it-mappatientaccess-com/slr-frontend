import React, { useState } from "react";
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

import Feedback from "feeder-react-feedback"; // import Feedback component
import "feeder-react-feedback/dist/feeder-react-feedback.css"; // import stylesheet

export default function Dashboard() {
  const [isAccordionVisible, setIsAccordionVisible] = useState(false);

  const toggleAccordionVisibility = () => {
    setIsAccordionVisible((prevState) => !prevState);
  };
  return (
    <>
      <Sidebar />
      <div className="relative md:ml-64 bg-blueGray-100">
        <AdminNavbar
          isAccordionVisible={isAccordionVisible}
          toggleAccordion={toggleAccordionVisibility}
        />

        <div className="mx-auto w-full min-h-screen-85">
          <Outlet />
          <Routes>
            <Route path="my-projects" exact element={<MyProjects />} />
            <Route path="aair" exact element={<AAIR />} />
            <Route
              path="sea"
              exact
              element={<SEA isAccordionVisible={isAccordionVisible} />}
            />
            <Route path="result-history" exact element={<ResultHistory />} />
            <Route path="settings" exact element={<Settings />} />
            <Route path="tables" exact element={<Tables />} />
            <Route
              path="/dashboard/*"
              element={<Navigate to="/dashboard/my-projects" />}
            />
          </Routes>
        </div>
        <FooterAdmin />
      </div>
      <Feedback
        projectId="65403f6e33b84e00028c6640"
        email="true"
        primaryColor="rgb(249,115,22)"
        textColor="#ffffff"
        hoverBorderColor="#000000"
      />
      ;
    </>
  );
}
