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
            Update{" "}
            <i className="fas fa-arrows-rotate"></i>
          </button>
          <button
            className="bg-blueGray-500 text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="cancel"
            type="button"
          >
            Cancel{" "}
            <i className="fas fa-xmark"></i>
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
            Edit{" "}
            <i className="fas fa-pen"></i>
          </button>
          <button
            className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="delete"
            type="button"
          >
            Delete{" "}
            <i className="fas fa-trash-can"></i>
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

  // New state to manage the visibility of the alert
  const [showAlert, setShowAlert] = useState(false);
  const columnDefs = [
    {
      headerName: "ID",
      valueGetter: "node.rowIndex + 1",
      width: 80,
      // rowDrag: true,
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
    }),
    []
  );

  const cellClickedListener = useCallback((params) => {
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
        params.api.stopEditing(true);
      }
    }
  }, []);

  const onRowEditingStarted = (params) => {
    params.api.refreshCells({
      columns: ["action"],
      rowNodes: [params.node],
      force: true,
    });
  };

  const onRowEditingStopped = (params) => {
    params.api.refreshCells({
      columns: ["action"],
      rowNodes: [params.node],
      force: true,
    });
  };

  useEffect(() => {
    setRowData(usersData);
    rowImmutableStore = usersData;
  }, [usersData]);

  const onCellEditRequest = useCallback(
    (event) => {
      const data = event.data;
      const rowIndex = event.rowIndex;
      const field = event.colDef.field;
      let newItem = { ...data };
      newItem[field] = event.newValue;
      dispatch(setUsersData(data.username, newItem));

      if (event.rowPinned === "top") {
        newItem.id = rowIndex;
        newItem.status = "Active";
        rowImmutableStore = [newItem, ...rowImmutableStore];
        // update ids in rowImmutableStore
        rowImmutableStore = rowImmutableStore.map((oldItem, index) => {
          const objCopy = { ...oldItem };
          objCopy.id = index + 1;
          return objCopy;
        });
      } else {
        // here we need to update the value userStatusData in the store
        if (rowIndex != null && field != null) {
          rowImmutableStore = rowImmutableStore.map((oldItem, index) =>
            index === rowIndex ? newItem : oldItem
          );
        }
      }
    },
    [dispatch]
  );
  useEffect(() => {
    if (response) {
      setShowAlert(true); // Show the alert when there's a response
      const timer = setTimeout(() => {
        setShowAlert(false); // Hide the alert after 3 seconds
      }, 3000);

      // Clean up the timer when the component is unmounted or the response changes
      return () => clearTimeout(timer);
    }
  }, [response]);
  return (
    <>
      <div className="ag-theme-alpine" style={{ height: "50vh" }}>
      {showAlert && response && (
          <Alert
            alertClass="bg-emerald-500"
            alertTitle="Result:"
            alertMessage={response.data.detail}
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
          enableCellChangeFlash={true}
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
