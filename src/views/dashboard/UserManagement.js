import UserManagementTable from "components/UMTable/UserManagementTable";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingBar from "react-top-loading-bar";
import { fetchUsersData } from "store/user-management-actions";
import { setProgress } from "store/qa-actions";
import Register from "views/auth/Register";

export default function UserManagement() {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.userManagement.progress);
  const error = useSelector((state) => state.project.error);

  useEffect(() => {
    dispatch(fetchUsersData());
  }, [dispatch]);
  return (
    <>
      {/* Header */}
      <LoadingBar
        color="#18FFFF"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
        height={3}
        loaderSpeed={3000}
      />
      <div className="flex flex-wrap">
        <div className="w-7/12 mb-12">
          <div className="relative flex flex-col min-w-0 break-words rounded mb-6">
            <div className="flex-auto p-4">
              <div className="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded-lg bg-blueGray-100 border-0">
                <div className="rounded-t bg-white mb-0 px-6 py-6">
                  <div className="text-center flex justify-between">
                    <h6 className="text-blueGray-700 text-xl font-bold">
                      User Management Panel
                    </h6>
                  </div>
                </div>
              </div>
              {error && <div className="px-6 py-4 text-red-500">{error}</div>}{" "}
              <UserManagementTable />
            </div>
          </div>
        </div>
        <div className="w-5/12 mb-12">
          <Register />
        </div>
      </div>
    </>
  );
}
