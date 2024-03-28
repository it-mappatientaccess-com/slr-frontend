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
      {isCurrentRowEditing && (
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
      )}
      {!isCurrentRowEditing && (
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
  const [updateResponse, setUpdateResponse] = useState({
    type: "",
    message: "",
  });
  // New state to manage the visibility of the alert
  const [showAlert, setShowAlert] = useState(false);
  const [isEditCanceled, setIsEditCanceled] = useState(false);
  const columnDefs = [
    {
      headerName: "ID",
      valueGetter: "node.rowIndex + 1",
      width: 80,
    },
    {
      field: "name",
      suppressSizeToFit: true,
      flex: 1,
      minWidth: 100,
      filter: true,
      editable: true,
    },
    {
      field: "username",
      flex: 2,
      filter: true,
      editable: true,
    },
    {
      headerName: "Set New Password",
      field: "newPassword",
      editable: true,
      flex: 1,
    },
    {
      headerName: "Action",
      cellRenderer: actionCellRenderer,
      editable: false,
      colId: "action",
      flex: 2,
    },
  ];
  // State to manage modal visibility
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const currentRowChangesRef = useRef({});

  const handleDeleteUser = async (username) => {
    // Function to handle user deletion logic

    // Apply the transaction to remove the data from the grid
    const usersData = rowImmutableStore.find((e) => e.username === username);
    currentParams.api.applyTransaction({
      remove: [usersData],
    });
    setResponse(await dispatch(deleteUserData(username)));
    // Close the modal after deletion
    setShowDeleteModal(false);
  };

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash:true
    }),
    []
  );

  const cellClickedListener = useCallback((params) => {
    // Clear the update response when starting a new edit
    clearUpdateResponse();
    // Handle click event for action cells
    if (
      params.column.colId === "action" &&
      params.event.target.dataset.action
    ) {
      let action = params.event.target.dataset.action;
      if (action === "edit") {
        params.api.startEditingCell({
          rowIndex: params.node.rowIndex,
          // gets the first columnKey
          colKey: params.columnApi.getDisplayedCenterColumns()[0].colId,
        });
      }

      if (action === "delete") {
        console.log("Delete action triggered");
        setUserToDelete(params.node.data.username);
        setShowDeleteModal(true);
        setCurrentParams(params);
      }

      if (action === "update") {
        params.api.stopEditing(false);
      }

      if (action === "cancel") {
        setIsEditCanceled(true);
        params.api.stopEditing(true);
      }
    }
  }, []);

  const onRowEditingStarted = (params) => {
    // setCurrentRowChanges({});
    params.api.refreshCells({
      columns: ["action"],
      rowNodes: [params.node],
      force: true,
    });
  };

  const onRowEditingStopped = useCallback(
    (params) => {
      if (isEditCanceled) {
        setIsEditCanceled(false); // Reset the flag
        return; // Exit early if edit was canceled
      }
      const currentRowChanges = currentRowChangesRef.current;
      const updatedData = { ...params.data, ...currentRowChanges };

      // Dispatch the update with all changes
      dispatch(setUsersData(params.data.username, updatedData))
      .then((response) => {
        console.log(response);
        if (response?.status === 200) {
          setUpdateResponse({
            type: "success",
            message: `User updated successfully: ${response?.data?.data?.username}`,
          });
        } else {
          setUpdateResponse({
            type: "error",
            // Using optional chaining and nullish coalescing
            message: response?.response?.data?.detail ?? "Failed to update user.",
          });
        }
      })
      .catch((error) => {
        console.log(error);
    
        setUpdateResponse({
          type: "error",
          message: "Failed to update user.",
        });
      });

      // Update the grid's row data
      const rowIndex = params.node.rowIndex;
      rowImmutableStore = rowImmutableStore.map((item, index) =>
        index === rowIndex ? updatedData : item
      );

      // Update the row data state to reflect changes
      setRowData(rowImmutableStore);

      // Reset the current row changes
      currentRowChangesRef.current = {};

      params.api.refreshCells({
        columns: ["action"],
        rowNodes: [params.node],
        force: true,
      });
    },
    [dispatch, isEditCanceled]
  );

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
      setShowAlert(true); // Show the alert when there's a response
      const timer = setTimeout(() => {
        setShowAlert(false); // Hide the alert after 3 seconds
      }, 5000);

      // Clean up the timer when the component is unmounted or the response changes
      return () => clearTimeout(timer);
    }
  }, [response]);

  // Function to clear update response message
  const clearUpdateResponse = () => {
    setUpdateResponse({ type: "", message: "" });
  };

  // Clear the update response after a specified duration (e.g., 5000 milliseconds)
  useEffect(() => {
    let timer;
    if (updateResponse.message) {
      timer = setTimeout(clearUpdateResponse, 5000);
    }
    return () => clearTimeout(timer);
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
            alertClass={
              updateResponse.type === "success"
                ? "bg-emerald-500"
                : "bg-red-500"
            }
            alertTitle={
              updateResponse.type === "success" ? "Success:" : "Error:"
            }
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
