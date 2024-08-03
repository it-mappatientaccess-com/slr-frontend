import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/styles/tailwind.css";
import "react-toastify/dist/ReactToastify.css";
import { useSelector, useDispatch } from "react-redux";
import LoadingBar from "react-top-loading-bar";
import { setProgress } from "./redux/slices/loadingSlice";

// layouts
import Dashboard from "layouts/Dashboard";
import Auth from "layouts/Auth";

// views without layouts
import PrivateRoutes from "util/PrivateRoutes";
import { AuthContextProvider } from "context/AuthContext";

const App = () => {
  const progress = useSelector((state) => state.loading.progress);
  const dispatch = useDispatch();

  return (
    <AuthContextProvider>
      <ToastContainer />
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        onLoaderFinished={() => dispatch(setProgress(0))}
        height={3}
        loaderSpeed={3000}
      />
      <Routes>
        {/* add routes with layouts */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Route>
        <Route path="/auth/*" element={<Auth />} />
        {/* add routes without layouts */}
        <Route path="/" exact element={<Navigate to="/auth/login" />} />
        {/* add redirect for first page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContextProvider>
  );
};

export default App;
