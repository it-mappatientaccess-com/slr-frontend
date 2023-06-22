import React, { useContext } from "react";
import { Outlet, Navigate } from "react-router-dom";
import AuthContext from "store/auth-context";
import { useLocation } from "react-router-dom";

export default function PrivateRoutes({ component: Component, ...rest }) {
  const location = useLocation();
  const ctx = useContext(AuthContext);
  return ctx.isLoggedIn ? (
    <Outlet />
  ) : (
    <Navigate to="/auth/login" replace state={{ from: location }} />
  );
}
