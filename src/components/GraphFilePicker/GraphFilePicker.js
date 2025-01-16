// src/components/GraphFilePicker/GraphFilePicker.js

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useContext,
} from "react";
import AuthContext from "context/AuthContext";
import Modal from "components/Modal/Modal";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "authConfig";
import axios from "axios";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { toast } from "react-toastify";
import { Tooltip } from "react-tooltip";

// For generating truly random UUID
import { v4 as uuidv4 } from "uuid";

/* Acceptable file MIME types */
const ACCEPTED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-xpsdocument",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "application/x-fictionbook+xml",
  "application/x-cbr",
  "image/svg+xml",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  const kb = 1024,
    mb = kb * 1024,
    gb = mb * 1024;
  if (bytes < kb) return `${bytes} B`;
  if (bytes < mb) return `${(bytes / kb).toFixed(2)} KB`;
  if (bytes < gb) return `${(bytes / mb).toFixed(2)} MB`;
  return `${(bytes / gb).toFixed(2)} GB`;
}

function getItemIcon(kind, name) {
  if (kind === "folder") return <i className="fa fa-folder text-yellow-500" />;
  const ext = name?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <i className="fa fa-file-pdf text-red-500" />;
    case "doc":
    case "docx":
      return <i className="fa fa-file-word text-lightBlue-600" />;
    case "xls":
    case "xlsx":
      return <i className="fa fa-file-excel text-emerald-600" />;
    case "ppt":
    case "pptx":
      return <i className="fa fa-file-powerpoint text-orange-400" />;
    case "txt":
      return <i className="fa fa-file-lines text-blueGray-400" />;
    default:
      return <i className="fa fa-file text-blueGray-500" />;
  }
}

export default function GraphFilePicker({ onFilesSelected }) {
  const ctx = useContext(AuthContext);
  const { instance } = useMsal();

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [currentDriveType, setCurrentDriveType] = useState(null);

  const [rowData, setRowData] = useState([]);
  const gridApiRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [navigationStack, setNavigationStack] = useState([]);
  // Additional state for the login popup flow
  const [loadingGraphLogin, setLoadingGraphLogin] = useState(false);
  /**
   * Step #1: ensureGraphAccess
   * - If loginMethod === "sso", do nothing special (you already have a token or can get one silently).
   * - If loginMethod === "credentials", prompt the user to log in with Microsoft.
   *   - On success, store a flag so next time we know they have a Graph token.
   */
  const ensureGraphAccess = useCallback(async () => {
    try {
      // 1) If we’re in SSO mode, we assume we already have or can get a token silently
      if (ctx.loginMethod === "sso") {
        return true;
      }

      // 2) If we’re in credentials mode, check if user is already logged in with MSAL
      if (ctx.loginMethod === "credentials") {
        setLoadingGraphLogin(true);
        const allAccounts = instance.getAllAccounts();
        // If we have an account, try silent acquisition first
        if (allAccounts.length > 0) {
          try {
            console.log(
              "[ensureGraphAccess] Attempting silent token acquisition..."
            );
            const tokenResponse = await instance.acquireTokenSilent({
              scopes: loginRequest.scopes,
              account: allAccounts[0],
            });
            // If this works, user is good to go
            console.log("Silent token acquisition succeeded:", tokenResponse);
            localStorage.setItem("hasGraphToken", "true");
            setLoadingGraphLogin(false);

            return true;
          } catch (error) {
            setLoadingGraphLogin(false);

            console.warn(
              "Silent token acquisition failed, will try loginPopup():",
              error
            );
          }
        }

        // 3) If no accounts or silent fails, do a popup
        console.log(
          "[ensureGraphAccess] Prompting Microsoft sign-in with popup..."
        );
        const tokenResponse = await instance.loginPopup(loginRequest);
        console.log(
          "User completed Microsoft login. Token response:",
          tokenResponse
        );
        localStorage.setItem("hasGraphToken", "true");
        return true;
      }
      // If we somehow get here, fallback
      return false;
    } catch (error) {
      setLoadingGraphLogin(false);
      console.error("MSAL popup sign-in canceled or error:", error);
      return false;
    }
  }, [ctx.loginMethod, instance]);

  // Acquire Graph token
  const getAccessToken = useCallback(async () => {
    const allAccounts = instance.getAllAccounts();
    if (!allAccounts.length) {
      throw new Error("No user accounts found in MSAL.");
    }
    const resp = await instance.acquireTokenSilent({
      scopes: loginRequest.scopes,
      account: allAccounts[0],
    });
    return resp.accessToken;
  }, [instance]);

  // Convert Graph items -> table rows
  const transformItems = useCallback((items, itemKind) => {
    if (!items) return [];
    return items
      .map((item) => {
        if (itemKind === "site") {
          return {
            id: item.id,
            name: item.displayName || item.name,
            kind: "site",
            size: "",
            rawItem: item,
          };
        } else if (itemKind === "drive") {
          return {
            id: item.id,
            name: item.name,
            kind: "drive",
            size: "",
            rawItem: item,
          };
        } else {
          // file or folder
          const isFolder = !!item.folder;
          const kind = isFolder ? "folder" : "file";
          const sizeVal = isFolder ? "" : formatFileSize(item.size || 0);
          if (kind === "file") {
            const mime = item.file?.mimeType || "";
            if (!ACCEPTED_FILE_TYPES.has(mime)) {
              return null; // skip unaccepted
            }
          }
          return {
            id: item.id,
            name: item.name,
            kind,
            size: sizeVal,
            rawItem: item,
          };
        }
      })
      .filter(Boolean);
  }, []);

  // =========== Graph calls for OneDrive & SharePoint ===========
  const fetchOneDriveRoot = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const resp = await axios.get(
        "https://graph.microsoft.com/v1.0/me/drive/root/children",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRowData(transformItems(resp.data.value, "fileOrFolder"));
    } catch (err) {
      console.error("OneDrive root fetch error:", err);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, transformItems]);

  const fetchOneDriveFolder = useCallback(
    async (folderId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
        const resp = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
      } catch (err) {
        console.error("OneDrive folder fetch error:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  const fetchSharePointSites = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const url = `https://graph.microsoft.com/v1.0/sites?search=`;
      const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRowData(transformItems(resp.data.value, "site"));
    } catch (err) {
      console.error("SharePoint sites fetch error:", err);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, transformItems]);

  const fetchSiteDrives = useCallback(
    async (siteId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
        const resp = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "drive"));
      } catch (err) {
        console.error("Site drives fetch error:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  const fetchDriveRoot = useCallback(
    async (siteId, driveId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`;
        const resp = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
      } catch (err) {
        console.error("Drive root fetch error:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  const fetchFolderItems = useCallback(
    async (siteId, driveId, folderId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`;
        const resp = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
      } catch (err) {
        console.error("Folder items fetch error:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  // =========== Modal logic =============
  const openModalFor = useCallback(
    async (driveType) => {
      // Attempt to ensure Graph access
      const hasAccess = await ensureGraphAccess();
      if (!hasAccess) {
        console.warn(
          "User did not grant Graph access or token acquisition failed."
        );
        toast.error(
          "Microsoft sign-in canceled or failed. Could not load OneDrive/SharePoint."
        );
        return;
      }

      // Success => proceed with opening the modal
      setCurrentDriveType(driveType);
      setModalTitle(
        driveType === "onedrive"
          ? "OneDrive File Picker"
          : "SharePoint File Picker"
      );
      setShowModal(true);
      setRowData([]);
      setNavigationStack([]);

      if (driveType === "onedrive") {
        fetchOneDriveRoot();
      } else {
        fetchSharePointSites();
      }
    },
    [ensureGraphAccess, fetchOneDriveRoot, fetchSharePointSites]
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

  // Double click => navigate deeper
  const onRowDoubleClicked = useCallback(
    (params) => {
      const row = params.data;
      if (currentDriveType === "onedrive") {
        if (row.kind === "folder") {
          setNavigationStack((prev) => [
            ...prev,
            { kind: "folder", itemId: row.id, name: row.name },
          ]);
          fetchOneDriveFolder(row.id);
        }
      } else {
        // sharepoint
        if (row.kind === "site") {
          setNavigationStack((prev) => [
            ...prev,
            { kind: "site", siteId: row.id, name: row.name },
          ]);
          fetchSiteDrives(row.id);
        } else if (row.kind === "drive") {
          const parentSiteId =
            navigationStack.length > 0
              ? navigationStack[navigationStack.length - 1].siteId
              : row.rawItem.parentReference?.siteId;
          setNavigationStack((prev) => [
            ...prev,
            {
              kind: "drive",
              driveId: row.id,
              siteId: parentSiteId,
              name: row.name,
            },
          ]);
          fetchDriveRoot(parentSiteId, row.id);
        } else if (row.kind === "folder") {
          let currentSite = null,
            currentDrive = null;
          for (let i = navigationStack.length - 1; i >= 0; i--) {
            if (!currentSite && navigationStack[i].siteId)
              currentSite = navigationStack[i].siteId;
            if (!currentDrive && navigationStack[i].driveId)
              currentDrive = navigationStack[i].driveId;
            if (currentSite && currentDrive) break;
          }
          setNavigationStack((prev) => [
            ...prev,
            {
              kind: "folder",
              siteId: currentSite,
              driveId: currentDrive,
              itemId: row.id,
              name: row.name,
            },
          ]);
          fetchFolderItems(currentSite, currentDrive, row.id);
        } else {
          console.log("Double-clicked file in SharePoint", row);
        }
      }
    },
    [
      currentDriveType,
      navigationStack,
      fetchOneDriveFolder,
      fetchSiteDrives,
      fetchDriveRoot,
      fetchFolderItems,
    ]
  );

  // goBack => navigate up
  const goBack = useCallback(() => {
    if (!navigationStack.length) {
      if (currentDriveType === "onedrive") fetchOneDriveRoot();
      else fetchSharePointSites();
      return;
    }
    const newStack = [...navigationStack];
    newStack.pop();
    setNavigationStack(newStack);

    if (currentDriveType === "onedrive") {
      if (!newStack.length) {
        fetchOneDriveRoot();
        return;
      }
      const parent = newStack[newStack.length - 1];
      if (parent.kind === "folder") fetchOneDriveFolder(parent.itemId);
      else fetchOneDriveRoot();
    } else {
      // sharepoint
      if (!newStack.length) {
        fetchSharePointSites();
        return;
      }
      const parent = newStack[newStack.length - 1];
      if (parent.kind === "site") fetchSiteDrives(parent.siteId);
      else if (parent.kind === "drive")
        fetchDriveRoot(parent.siteId, parent.driveId);
      else if (parent.kind === "folder")
        fetchFolderItems(parent.siteId, parent.driveId, parent.itemId);
      else fetchSharePointSites();
    }
  }, [
    currentDriveType,
    navigationStack,
    fetchOneDriveRoot,
    fetchSharePointSites,
    fetchOneDriveFolder,
    fetchSiteDrives,
    fetchDriveRoot,
    fetchFolderItems,
  ]);

  // Confirm => pass newly selected items up
  const confirmSelection = useCallback(() => {
    if (!gridApiRef.current) return;
    const api = gridApiRef.current;
    const selectedNodes = api.getSelectedNodes();
    const newlySelectedGraphItems = selectedNodes.map(
      (node) => node.data.rawItem
    );

    // We create a truly unique 'id' for each item
    const finalItems = newlySelectedGraphItems.map((item) => ({
      ...item,
      graphId: item.id, // the original Graph ID
      id: uuidv4(), // guaranteed unique
    }));

    // Deselect in this folder so user doesn't keep re-adding them
    api.deselectAll();

    // Return them to the parent
    onFilesSelected?.(finalItems);
  }, [onFilesSelected]);

  // AG-Grid columns
  const columnDefs = useMemo(
    () => [
      {
        headerName: "",
        width: 50,
        checkboxSelection: (params) => params.data.kind === "file",
      },
      {
        headerName: "Name",
        field: "name",
        flex: 1,
        cellRenderer: (params) => {
          const icon = getItemIcon(params.data.kind, params.data.name);
          return (
            <span className="flex items-center gap-2">
              {icon} &nbsp; &nbsp;{params.value}
            </span>
          );
        },
      },
      { headerName: "Kind", field: "kind", width: 100 },
      { headerName: "Size", field: "size", width: 100 },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, resizable: true }),
    []
  );

  // Current path
  const currentPath = useMemo(() => {
    if (!navigationStack.length) return "/";
    return "/" + navigationStack.map((f) => f.name).join("/");
  }, [navigationStack]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex justify-center gap-4 mb-3">
        {loadingGraphLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Signing in to Microsoft...
            </div>
          </div>
        )}
        <button
          className="text-lightBlue-500 bg-transparent border border-solid border-lightBlue-500 hover:bg-lightBlue-500 hover:text-white active:bg-lightBlue-600 font-bold uppercase text-sm px-6 py-3 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
          type="button"
          onClick={() => openModalFor("onedrive")}
          data-tooltip-id="oneDrive-btn"
          data-tooltip-content="Requires Microsoft sign-in if not already logged in."
        >
          <i className="fas fa-cloud"></i> Select from OneDrive
        </button>
        <Tooltip id="oneDrive-btn" />
        <button
          className="text-teal-500 bg-transparent border border-solid border-teal-500 hover:bg-teal-500 hover:text-white active:bg-teal-600 font-bold uppercase text-sm px-6 py-3 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
          type="button"
          onClick={() => openModalFor("sharepoint")}
          data-tooltip-id="sharePoint-btn"
          data-tooltip-content="Requires Microsoft sign-in if not already logged in."
        >
          <i className="fa-brands fa-microsoft"></i> Select from SharePoint
        </button>
        <Tooltip id="sharePoint-btn" />
      </div>

      <Modal show={showModal} title={modalTitle} onClose={closeModal}>
        <div className="flex items-center justify-between mb-2">
          {navigationStack.length > 0 && (
            <button
              onClick={goBack}
              className="bg-gray-300 px-2 py-1 rounded mr-2"
            >
              ◀ Back
            </button>
          )}
          <p className="text-blue-700 font-medium">{currentPath}</p>
          <div />
        </div>
        {loading ? (
          <div className="text-center text-blue-500 mb-2">
            <i className="fas fa-spinner fa-spin mr-2"></i>Loading files...
          </div>
        ) : (
          <div
            className="ag-theme-alpine"
            style={{ height: "50vh", width: "50vw" }}
          >
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="multiple"
              onGridReady={onGridReady}
              onRowDoubleClicked={onRowDoubleClicked}
              suppressRowClickSelection={true}
            />
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={confirmSelection}
            className="bg-emerald-500 text-white px-4 py-2 rounded mr-2"
          >
            Confirm Selection
          </button>
        </div>
      </Modal>
    </div>
  );
}
