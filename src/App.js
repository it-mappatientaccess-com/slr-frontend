import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/styles/tailwind.css";
import "react-toastify/dist/ReactToastify.css";
// layouts
import Dashboard from "layouts/Dashboard";
import Auth from "layouts/Auth.js";

// views without layouts
import PrivateRoutes from "util/PrivateRoutes";
import { AuthContextProvider } from "context/AuthContext";

const App = () => {
  return (
    <AuthContextProvider>
      <ToastContainer />
      <Routes>
        {/* add routes with layouts */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Route>
        <Route path="/auth/*" element={<Auth />} />
        {/* add routes without layouts */}
        <Route path="/" exact element={<Navigate to="/auth/login"/>} /> 
        {/* add redirect for first page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContextProvider>
  );
};
export default App;
