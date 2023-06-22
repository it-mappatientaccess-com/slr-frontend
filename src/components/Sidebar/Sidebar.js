/*eslint-disable*/
import React, { Fragment, useContext } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router";
import NotificationDropdown from "components/Dropdowns/NotificationDropdown.js";
import UserDropdown from "components/Dropdowns/UserDropdown.js";
import AuthContext from "store/auth-context";
import { useDispatch } from "react-redux";
import { resetQAStore } from "store/qa-actions";
import { resetProjectStore } from "store/project-actions";

export default function Sidebar() {
  const ctx = useContext(AuthContext);
  const dispatch = useDispatch();
  const [collapseShow, setCollapseShow] = React.useState("hidden");
  const location = useLocation();

  const logoutHandler = () => {
    dispatch(resetProjectStore());
    dispatch(resetQAStore());
    ctx.logout();
  };
  return (
    <>
      <nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6">
        <div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto">
          {/* Toggler */}
          <button
            className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
            type="button"
            onClick={() => setCollapseShow("bg-white m-2 py-3 px-6")}
          >
            <i className="fas fa-bars"></i>
          </button>
          {/* Brand */}
          <Link
            className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
            to="/"
          >
            SLR Tool
          </Link>
          {/* User */}
          <ul className="md:hidden items-center flex flex-wrap list-none">
            <li className="inline-block relative">
              <NotificationDropdown />
            </li>
            <li className="inline-block relative">
              <UserDropdown />
            </li>
          </ul>
          {/* Collapse */}
          <div
            className={
              "md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " +
              collapseShow
            }
          >
            {/* Collapse header */}
            <div className="md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-blueGray-200">
              <div className="flex flex-wrap">
                <div className="w-6/12">
                  <Link
                    className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
                    to="/"
                  >
                    SLR APP
                  </Link>
                </div>
                <div className="w-6/12 flex justify-end">
                  <button
                    type="button"
                    className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                    onClick={() => setCollapseShow("hidden")}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            {/* Form */}
            <form className="mt-6 mb-4 md:hidden">
              <div className="mb-3 pt-0">
                <input
                  type="text"
                  placeholder="Search"
                  className="border-0 px-3 py-2 h-12 border border-solid  border-blueGray-500 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-base leading-snug shadow-none outline-none focus:outline-none w-full font-normal"
                />
              </div>
            </form>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />
            {/* Heading */}
            <h6 className="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
              Dashboard Pages
            </h6>
            {/* Navigation */}

            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              <li className="items-center">
                <Link
                  className={
                    "text-xs uppercase py-3 font-bold block " +
                    (location.pathname === "/dashboard/my-projects"
                      ? "text-lightBlue-500 hover:text-lightBlue-600"
                      : "text-blueGray-700 hover:text-blueGray-500")
                  }
                  to="/dashboard/my-projects"
                >
                  <i
                    className={
                      "fas fa-list mr-2 text-sm " +
                      (location.pathname === "/dashboard/my-projects"
                        ? "opacity-75"
                        : "text-blueGray-300")
                    }
                  ></i>{" "}
                  My Projects
                </Link>
              </li>
              {location.pathname !== "/dashboard/my-projects" && (
                <Fragment>
                  <li className="items-center">
                    <Link
                      className={
                        "text-xs uppercase py-3 font-bold block " +
                        (location.pathname === "/dashboard/aair"
                          ? "text-lightBlue-500 hover:text-lightBlue-600"
                          : "text-blueGray-700 hover:text-blueGray-500")
                      }
                      to="/dashboard/aair"
                    >
                      <i
                        className={
                          "fas fa-spell-check mr-2 text-sm " +
                          (location.pathname === "/dashboard/aair"
                            ? "opacity-75"
                            : "text-blueGray-300")
                        }
                      ></i>
                      Abstract AI Reviewer
                    </Link>
                  </li>
                  <li className="items-center">
                    <Link
                      className={
                        "text-xs uppercase py-3 font-bold block " +
                        (location.pathname === "/dashboard/result-history"
                          ? "text-lightBlue-500 hover:text-lightBlue-600"
                          : "text-blueGray-700 hover:text-blueGray-500")
                      }
                      to="/dashboard/result-history"
                    >
                      <i
                        className={
                          "fas fa-table mr-2 text-sm " +
                          (location.pathname === "/dashboard/result-history"
                            ? "opacity-75"
                            : "text-blueGray-300")
                        }
                      ></i>
                      Result History
                    </Link>
                  </li>
                  <li className="items-center">
                    <Link
                      className={
                        "text-xs uppercase py-3 font-bold block " +
                        (location.pathname === "/dashboard/sea"
                          ? "text-lightBlue-500 hover:text-lightBlue-600"
                          : "text-blueGray-700 hover:text-blueGray-500")
                      }
                      to="/dashboard/sea"
                    >
                      <i
                        className={
                          "fas fa-magnet mr-2 text-sm " +
                          (location.pathname === "/dashboard/sea"
                            ? "opacity-75"
                            : "text-blueGray-300")
                        }
                      ></i>
                      Systematic Extraction Assistant
                    </Link>
                  </li>
                </Fragment>
              )}
              {/* Divider */}
              <hr className="my-4 md:min-w-full" />
              <li className="items-center">
                <span
                  className={
                    "text-xs uppercase py-3 font-bold block text-blueGray-700 hover:text-blueGray-500 cursor-pointer"
                  }
                  onClick={logoutHandler}
                >
                  <i
                    className={
                      "fas fa-right-from-bracket mr-2 text-sm text-blueGray-300"
                    }
                  ></i>
                  Logout
                </span>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
