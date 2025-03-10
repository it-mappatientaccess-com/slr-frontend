import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { deleteUserData, setUsersData, migrateEmailsData, revertEmailsData, fetchUsersData } from "../../redux/slices/userManagementSlice";
import { useDispatch, useSelector } from "react-redux";
import ModalSmall from "components/Modal/ModalSmall";
import Alert from "components/Alerts/Alert";

let rowImmutableStore;

const actionCellRenderer = (params) => {
  let editingCells = params.api.getEditingCells();
  let isCurrentRowEditing = editingCells.some((cell) => cell.rowIndex === params.node.rowIndex);
  return (
    <>
      {isCurrentRowEditing ? (
        <div>
          <button
            className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            data-action="update"
          >
            Update <i className="fas fa-arrows-rotate"></i>
          </button>
          <button
            className="bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="cancel"
            type="button"
          >
            Cancel <i className="fas fa-xmark"></i>
          </button>
        </div>
      ) : (
        <div>
          <button
            className="bg-amber-500 text-white active:bg-amber-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="edit"
            type="button"
          >
            Edit <i className="fas fa-pen"></i>
          </button>
          <button
            className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="delete"
            type="button"
          >
            Delete <i className="fas fa-trash-can"></i>
          </button>
        </div>
      )}
    </>
  );
};

const UserManagementTable = () => {
  const dispatch = useDispatch();
  const gridRef = useRef(null);
  let usersData = useSelector((state) => state.userManagement.listOfUsers);
  const [rowData, setRowData] = useState([]);
  const [currentParams, setCurrentParams] = useState(null);
  const [response, setResponse] = useState(null);
  const [updateResponse, setUpdateResponseState] = useState({ type: "", message: "" });
  const [showAlert, setShowAlert] = useState(false);
  const [isEditCanceled, setIsEditCanceled] = useState(false);
  
  // New state for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const currentRowChangesRef = useRef({});

  // New handlers for email migration and reversion
  const handleMigrateEmails = async () => {
    const result = await dispatch(migrateEmailsData());
    console.log("Migrate result:", result);
    // Optionally refetch users if email change affects display data
    dispatch(fetchUsersData());
  };

  const handleRevertEmails = async () => {
    const result = await dispatch(revertEmailsData());
    console.log("Revert result:", result);
    dispatch(fetchUsersData());
  };

  const handleDeleteUser = async (username) => {
    const userRow = rowImmutableStore.find((e) => e.username === username);
    currentParams.api.applyTransaction({
      remove: [userRow],
    });
    setResponse(await dispatch(deleteUserData(username)));
    setShowDeleteModal(false);
  };

  const columnDefs = [
    { headerName: "ID", valueGetter: "node.rowIndex + 1", width: 80 },
    { field: "name", suppressSizeToFit: true, flex: 1, minWidth: 100, filter: true, editable: true },
    { field: "username", flex: 2, filter: true, editable: true },
    { headerName: "Set New Password", field: "newPassword", editable: true, flex: 1 },
    { headerName: "Action", cellRenderer: actionCellRenderer, editable: false, colId: "action", flex: 2 },
  ];

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    enableCellChangeFlash: true,
  }), []);

  const cellClickedListener = useCallback((params) => {
    if (params.column.colId === "action" && params.event.target.dataset.action) {
      let action = params.event.target.dataset.action;
      if (action === "edit") {
        params.api.startEditingCell({
          rowIndex: params.node.rowIndex,
          colKey: params.columnApi.getDisplayedCenterColumns()[0].colId,
        });
      } else if (action === "update") {
        setIsEditCanceled(false);
        params.api.stopEditing(false);
      } else if (action === "cancel") {
        setIsEditCanceled(true);
        params.api.stopEditing(true);
      } else if (action === "delete") {
        setUserToDelete(params.node.data.username);
        setShowDeleteModal(true);
        setCurrentParams(params);
      }
    }
  }, []);

  const onRowEditingStarted = (params) => {
    params.api.refreshCells({ columns: ["action"], rowNodes: [params.node], force: true });
  };

  const onRowEditingStopped = useCallback((params) => {
    if (isEditCanceled) {
      setIsEditCanceled(false);
      return;
    }
    const currentRowChanges = currentRowChangesRef.current;
    const updatedData = { ...params.data, ...currentRowChanges };
    dispatch(setUsersData({ username: params.data.username, newDetails: updatedData }))
      .then((response) => {
        if (response?.status === 200) {
          setUpdateResponseState({
            type: "success",
            message: `User updated successfully: ${response?.data?.data?.username}`,
          });
        } else {
          setUpdateResponseState({
            type: "error",
            message: response?.response?.data?.detail ?? "Failed to update user.",
          });
        }
      })
      .catch(() => {
        setUpdateResponseState({ type: "error", message: "Failed to update user." });
      });
    setRowData((prevRowData) =>
      prevRowData.map((item, index) =>
        index === params.node.rowIndex ? updatedData : item
      )
    );
    currentRowChangesRef.current = {};
  }, [dispatch, isEditCanceled]);

  useEffect(() => {
    setRowData(usersData);
    rowImmutableStore = usersData;
  }, [usersData]);

  const onCellEditRequest = useCallback((event) => {
    currentRowChangesRef.current = {
      ...currentRowChangesRef.current,
      [event.colDef.field]: event.newValue,
    };
  }, []);

  useEffect(() => {
    if (response) {
      console.log(response);
      setShowAlert(true);
      const timer = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [response]);

  useEffect(() => {
    let timer;
    if (updateResponse.message) {
      timer = setTimeout(() => setUpdateResponseState({ type: "", message: "" }), 5000);
    }
    return () => clearTimeout(timer);
  }, [updateResponse]);

  return (
    <>
      <div className="mb-4 flex gap-4 mt-4">
        <button
          onClick={handleMigrateEmails}
          className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button"
        >
          Migrate Emails
        </button>
        <button
          onClick={handleRevertEmails}
          className="bg-orange-500 text-white active:bg-orange-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button"
        >
          Revert Emails
        </button>
      </div>

      <div className="ag-theme-alpine" style={{ height: "80vh" }}>
        {showAlert && response && (
          <Alert
            alertClass="bg-emerald-500"
            alertTitle="Result:"
            alertMessage={response.data.detail}
          />
        )}
        {updateResponse.message && (
          <Alert
            alertClass={updateResponse.type === "success" ? "bg-emerald-500" : "bg-red-500"}
            alertTitle={updateResponse.type === "success" ? "Success:" : "Error:"}
            alertMessage={updateResponse.message}
          />
        )}
        <AgGridReact
          ref={gridRef}
          onCellClicked={cellClickedListener}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          readOnlyEdit={true}
          onCellEditRequest={onCellEditRequest}
          undoRedoCellEditing={true}
          paginationAutoPageSize={true}
          pagination={true}
          editType="fullRow"
          suppressClickEdit={true}
          onRowEditingStopped={onRowEditingStopped}
          onRowEditingStarted={onRowEditingStarted}
        />
      </div>

      {showDeleteModal && (
        <ModalSmall
          title="Confirm Deletion"
          content="This will delete the user and all user-specific data. Are you sure you want to delete the user?"
          secondaryButtonText="No, Close"
          primaryButtonText="Yes, Delete"
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onPrimaryClick={() => handleDeleteUser(userToDelete)}
          colorClasses="bg-red-500 text-white active:bg-red-600"
        />
      )}
    </>
  );
};

export default UserManagementTable;
