import React from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { deleteUserData, setUsersData } from "store/user-management-actions";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ModalSmall from "components/Modal/ModalSmall";
import Alert from "components/Alerts/Alert";
let rowImmutableStore;

const actionCellRenderer = (params) => {
  let editingCells = params.api.getEditingCells();
  // checks if the rowIndex matches in at least one of the editing cells
  let isCurrentRowEditing = editingCells.some((cell) => {
    return cell.rowIndex === params.node.rowIndex;
  });
  return (
    <>
      {isCurrentRowEditing ? (
        <div>
          <button
            className="bg-teal-500 text-white active:bg-teal-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            data-action="save"
            onClick={() => params.api.stopEditing(false)}
          >
            Save <i className="fas fa-arrows-rotate"></i>
          </button>
          <button
            className="bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="cancel"
            onClick={() => params.api.stopEditing(true)}
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
            onClick={() => params.api.startEditingCell({
              rowIndex: params.node.rowIndex,
              colKey: params.columnApi.getDisplayedCenterColumns()[0].colId,
            })}
            type="button"
          >
            Edit <i className="fas fa-pen"></i>
          </button>
          <button
            className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="delete"
            onClick={() => {
              params.api.stopEditing(true);
              params.context.handleDeleteUser(params.node.data.username);
            }}
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
  const [updateResponse, setUpdateResponse] = useState({
    type: "",
    message: "",
  });
  const [showAlert, setShowAlert] = useState(false);
  const [isEditCanceled, setIsEditCanceled] = useState(false);
  const columnDefs = useMemo(() => [
    { headerName: "ID", valueGetter: "node.rowIndex + 1", width: 80 },
    { field: "name", suppressSizeToFit: true, flex: 1, minWidth: 100, filter: true, editable: true },
    { field: "username", flex: 2, filter: true, editable: true },
    { headerName: "Set New Password", field: "newPassword", editable: true, flex: 1 },
    { headerName: "Action", cellRenderer: actionCellRenderer, editable: false, colId: "action", flex: 2 },
  ], []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const currentRowChangesRef = useRef({});

  const handleDeleteUser = async (username) => {
    const usersData = rowImmutableStore.find((e) => e.username === username);
    currentParams.api.applyTransaction({ remove: [usersData] });
    setResponse(await dispatch(deleteUserData(username)));
    setShowDeleteModal(false);
  };

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, enableCellChangeFlash: true }), []);

  const onRowEditingStarted = (params) => {
    params.api.refreshCells({ columns: ["action"], rowNodes: [params.node], force: true });
  };

  const onRowEditingStopped = useCallback(async (params) => {
    if (isEditCanceled) {
      setIsEditCanceled(false);
      return;
    }
    const currentRowChanges = currentRowChangesRef.current;
    const updatedData = { ...params.data, ...currentRowChanges };
    try {
      const response = await dispatch(setUsersData(params.data.username, updatedData));
      if (response?.status === 200) {
        setUpdateResponse({ type: "success", message: `User updated successfully: ${response?.data?.data?.username}` });
      } else {
        setUpdateResponse({ type: "error", message: response?.response?.data?.detail ?? "Failed to update user." });
      }
    } catch (error) {
      setUpdateResponse({ type: "error", message: "Failed to update user." });
    }
    rowImmutableStore = rowImmutableStore.map((item, index) => index === params.node.rowIndex ? updatedData : item);
    setRowData(rowImmutableStore);
    currentRowChangesRef.current = {};
    params.api.refreshCells({ columns: ["action"], rowNodes: [params.node], force: true });
  }, [dispatch, isEditCanceled]);

  useEffect(() => {
    setRowData(usersData);
    rowImmutableStore = usersData;
  }, [usersData]);

  const onCellEditRequest = useCallback((event) => {
    currentRowChangesRef.current = { ...currentRowChangesRef.current, [event.colDef.field]: event.newValue };
  }, []);

  useEffect(() => {
    if (response) {
      setShowAlert(true);
      const timer = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [response]);

  const clearUpdateResponse = () => {
    setUpdateResponse({ type: "", message: "" });
  };

  useEffect(() => {
    if (updateResponse.message) {
      const timer = setTimeout(clearUpdateResponse, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateResponse]);

  return (
    <>
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
          context={{ handleDeleteUser }}
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
          content="This will delete the user and all the user specific data. Are you sure you want to delete the user?"
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
