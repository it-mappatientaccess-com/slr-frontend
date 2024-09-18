import React from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteProjectData,
  setSelectedProject,
  setProjectsData,
} from "../../redux/slices/projectSlice";
import { useNavigate } from "react-router";
import {
  fetchOldQuestions,
  fetchOldSeaQuestions,
} from "../../redux/thunks/qa-thunks";
import ModalSmall from "components/Modal/ModalSmall";
import ShareProjectModal from "./ShareProjectModal";

let rowImmutableStore;

const actionCellRenderer = (params) => {
  let editingCells = params.api.getEditingCells();
  // checks if the rowIndex matches in at least one of the editing cells
  let isCurrentRowEditing = editingCells.some((cell) => {
    return cell.rowIndex === params.node.rowIndex;
  });
  const currentUser = localStorage.getItem("username");
  const isOwner = params.data.username === currentUser;
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
      {isOwner && !isCurrentRowEditing && (
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
          <button
            className="bg-indigo-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            data-action="share"
            type="button"
            onClick={() => params.onShareProject(params.data)}
          >
            Share <i className="fas fa-share-alt"></i>
          </button>
        </div>
      )}
      {!isOwner && (
        <div>
          <span>Shared Project</span>
        </div>
      )}
    </>
  );
};

const btnCellRenderer = (params) => {
  const onClickHandler = async () => {
    params.dispatchProp(setSelectedProject(params.data.projectName));
    localStorage.setItem("selectedProject", params.data.projectName);
    await params.dispatchProp(fetchOldQuestions(params.data.projectName));
    await params.dispatchProp(fetchOldSeaQuestions(params.data.projectName));
    params.navigateProp("/dashboard/abstract-reviewer");
  };
  return (
    <>
      <div>
        <button
          className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
          type="button"
          data-action="update"
          onClick={onClickHandler}
        >
          View Project <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </>
  );
};

const ProjectsTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const gridRef = useRef(null);

  let projectData = useSelector((state) => state.project.listOfProjects);
  const [rowData, setRowData] = useState([]);
  const [currentParams, setCurrentParams] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [projectToShare, setProjectToShare] = useState(null);

  // Function to handle share project action
  const handleShareProject = (projectData) => {
    setProjectToShare(projectData);
    setShowShareModal(true);
  };

  // Pass handleShareProject to cell renderer params
  const actionCellRendererParams = {
    onShareProject: handleShareProject,
    // Other params if needed
  };

  const columnDefs = [
    // {
    //   headerName: "ID",
    //   valueGetter: "node.rowIndex + 1",
    //   width: 80
    //   // rowDrag: true,
    // },
    {
      field: "projectName",
      suppressSizeToFit: true,
      flex: 1,
      minWidth: 100,
      filter: true,
      editable: false,
    },
    {
      field: "projectDescription",
      flex: 1,
      filter: true,
      editable: true,
    },
    {
      field: "username",
      headerName: "Owner",
      flex: 1,
      filter: true,
      editable: false,
    },
    {
      headerName: "",
      cellRenderer: btnCellRenderer,
      cellRendererParams: {
        dispatchProp: dispatch,
        navigateProp: navigate,
      },
      editable: false,
      colId: "view",
      flex: 1,
    },
    {
      headerName: "Action",
      cellRenderer: actionCellRenderer,
      cellRendererParams: actionCellRendererParams,
      editable: false,
      colId: "action",
      flex: 2,
    },
  ];
  // State to manage modal visibility
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const handleDeleteProject = (projectName) => {
    // Function to handle project deletion logic

    // Apply the transaction to remove the data from the grid
    const projectData = rowImmutableStore.find(
      (e) => e.projectName === projectName
    );
    currentParams.api.applyTransaction({
      remove: [projectData],
    });
    dispatch(deleteProjectData(projectName));

    // Close the modal after deletion
    setShowDeleteModal(false);
  };
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      enableCellChangeFlash: true,
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
        setProjectToDelete(params.node.data.projectName);
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
    setRowData(projectData);
    rowImmutableStore = projectData;
  }, [projectData]);

  const onCellEditRequest = useCallback(
    (event) => {
      const data = event.data;
      const field = event.colDef.field;
      let newItem = { ...data };
      newItem[field] = event.newValue;

      // Dispatch the action with the projectName and newDescription
      dispatch(
        setProjectsData({
          projectName: newItem.projectName,
          newDescription: newItem.projectDescription,
        })
      );

      // Update rowImmutableStore if necessary
      if (event.rowPinned === "top") {
        newItem.status = "Active";
        rowImmutableStore = [newItem, ...rowImmutableStore];
        // update ids in rowImmutableStore
        rowImmutableStore = rowImmutableStore.map((oldItem, index) => {
          const objCopy = { ...oldItem };
          objCopy.id = index + 1;
          return objCopy;
        });
      } else {
        // Update the value in rowImmutableStore
        rowImmutableStore = rowImmutableStore.map((oldItem) =>
          oldItem.projectName === newItem.projectName ? newItem : oldItem
        );
      }
    },
    [dispatch]
  );

  return (
    <>
      <div className="ag-theme-alpine" style={{ height: "50vh" }}>
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
          content="This will delete the project and all the related data. Are you sure you want to delete the project?"
          secondaryButtonText="No, Close"
          primaryButtonText="Yes, Delete"
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onPrimaryClick={() => handleDeleteProject(projectToDelete)}
          colorClasses="bg-red-500 text-white active:bg-red-600"
        />
      )}
      {showShareModal && (
        <ShareProjectModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          project={projectToShare}
        />
      )}
    </>
  );
};

export default ProjectsTable;
