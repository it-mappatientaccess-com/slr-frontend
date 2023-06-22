import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/styles/tailwind.css";

// layouts
import Dashboard from "layouts/Dashboard";
import Auth from "layouts/Auth.js";

// views without layouts

import Landing from "views/Landing.js";
import Profile from "views/Profile.js";
// import Home from "views/Home.js";
// import Login from "views/auth/Login";
import PrivateRoutes from "util/PrivateRoutes";
// import AuthContext from "store/auth-context";
import { AuthContextProvider } from "store/auth-context";

const App = () => {
  return (
    <AuthContextProvider>
      <Routes>
        {/* add routes with layouts */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Route>
        <Route path="/auth/*" element={<Auth />} />
        {/* add routes without layouts */}
        <Route path="/profile" exact element={<Profile />} />
        <Route path="/" exact element={<Landing />} />
        {/* <Route path="/" exact element={<Home />} /> */}
        {/* <Route path="/" exact element={<Navigate to="/auth/login"/>} />  */}
        {/* add redirect for first page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContextProvider>
  );
};
export default App;
