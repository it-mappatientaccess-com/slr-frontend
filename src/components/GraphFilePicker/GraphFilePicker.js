import React, {
  useState,
  useCallback,
  useRef,
  useMemo
} from "react";
import Modal from "components/Modal/Modal";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "authConfig";
import axios from "axios";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

/*
  Acceptable file MIME types, 
  per your provided list
*/
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

// Utility: format file size from bytes to KB/MB/GB
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (bytes < kb) {
    return `${bytes} B`;
  } else if (bytes < mb) {
    return `${(bytes / kb).toFixed(2)} KB`;
  } else if (bytes < gb) {
    return `${(bytes / mb).toFixed(2)} MB`;
  } else {
    return `${(bytes / gb).toFixed(2)} GB`;
  }
}

// A small helper to pick icons for items
function getItemIcon(kind, name) {
  // If folder => show a folder icon
  if (kind === "folder") return <i className="fa fa-folder text-yellow-500" />;

  // If it's a file, guess from extension or MIME. 
  // We'll do a quick extension check:
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

// For SharePoint listing levels
const LEVEL_SITES = "sites";
const LEVEL_DRIVES = "drives";
const LEVEL_FOLDER = "folder";

export default function GraphFilePicker({ onFilesSelected }) {
  const { instance } = useMsal();

  // Show/hide modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  // "onedrive" or "sharepoint"
  const [currentDriveType, setCurrentDriveType] = useState(null);

  // For AG Grid
  const [rowData, setRowData] = useState([]);
  const gridApiRef = useRef(null);

  // For loading spinner
  const [loading, setLoading] = useState(false);

  // This stack holds objects describing the current location 
  // (for breadcrumb path + "Back" navigation).
  // Example entries:
  // {
  //   kind: "site" | "drive" | "folder",
  //   name: "My Site" | "Documents" | "Subfolder",
  //   siteId: "...",
  //   driveId: "...",
  //   itemId: "...",  // folder or file ID
  // }
  const [navigationStack, setNavigationStack] = useState([]);

  // Track the current "level" in SharePoint
  // const [spLevel, setSpLevel] = useState(LEVEL_SITES);

  // =================== Access Token ===================
  const getAccessToken = useCallback(async () => {
    const allAccounts = instance.getAllAccounts();
    if (!allAccounts.length) {
      throw new Error("No user accounts found in MSAL. Are you logged in?");
    }
    const resp = await instance.acquireTokenSilent({
      scopes: loginRequest.scopes,
      account: allAccounts[0],
    });
    return resp.accessToken;
  }, [instance]);

  // =================== transformItems ===================
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
            id: item.id,   // e.g. "b!xxxxx"
            name: item.name,
            kind: "drive",
            size: "",
            rawItem: item,
          };
        } else {
          // "fileOrFolder"
          const isFolder = !!item.folder;
          let kind = isFolder ? "folder" : "file";
          let sizeVal = isFolder ? "" : formatFileSize(item.size);

          if (kind === "file") {
            const mime = item.file?.mimeType || "";
            if (!ACCEPTED_FILE_TYPES.has(mime)) {
              return null; // skip unaccepted types
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

  // =================== OneDrive - Root ===================
  const fetchOneDriveRoot = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const endpoint = "https://graph.microsoft.com/v1.0/me/drive/root/children";
      const resp = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRowData(transformItems(resp.data.value, "fileOrFolder"));
    } catch (err) {
      console.error("Error fetching OneDrive root:", err);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, transformItems]);

  // =================== OneDrive - Subfolders ===================
  const fetchOneDriveFolder = useCallback(
    async (folderId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
        const resp = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
      } catch (err) {
        console.error("Error fetching OneDrive folder:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  // =================== SharePoint - List Sites ===================
  // eslint-disable-next-line no-unused-vars
  const [spLevelState, setSpLevelState] = useState(LEVEL_SITES);

  const fetchSharePointSites = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const endpoint = `https://graph.microsoft.com/v1.0/sites?search=`;
      const resp = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRowData(transformItems(resp.data.value, "site"));
      setSpLevelState(LEVEL_SITES);
    } catch (err) {
      console.error("Error fetching SharePoint sites:", err);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, transformItems]);

  // =================== SharePoint - List drives of a site ===================
  const fetchSiteDrives = useCallback(
    async (siteId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
        const resp = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "drive"));
        setSpLevelState(LEVEL_DRIVES);
      } catch (err) {
        console.error("Error listing site drives:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  // =================== SharePoint - Drive root folder ===================
  const fetchDriveRoot = useCallback(
    async (siteId, driveId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`;
        const resp = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
        setSpLevelState(LEVEL_FOLDER);
      } catch (err) {
        console.error("Error opening drive root:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  // =================== SharePoint - Folder items ===================
  const fetchFolderItems = useCallback(
    async (siteId, driveId, folderId) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`;
        const resp = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRowData(transformItems(resp.data.value, "fileOrFolder"));
      } catch (err) {
        console.error("Error fetching folder items:", err);
        setRowData([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, transformItems]
  );

  // =================== Open Modal ===================
  const openModalFor = useCallback(
    (driveType) => {
      setCurrentDriveType(driveType);
      setModalTitle(
        driveType === "onedrive" ? "OneDrive File Picker" : "SharePoint File Picker"
      );
      setShowModal(true);
      setRowData([]);
      setNavigationStack([]);
      if (driveType === "onedrive") {
        // fetch OneDrive root
        fetchOneDriveRoot();
      } else {
        // fetch all sites
        fetchSharePointSites();
      }
    },
    [fetchOneDriveRoot, fetchSharePointSites]
  );

  // =================== Close Modal ===================
  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // =================== AG Grid Columns ===================
  const columnDefs = useMemo(
    () => [
      {
        headerName: "",
        checkboxSelection: true,
        width: 50,
        headerCheckboxSelection: true,
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

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true }), []);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

  // =================== Double-click => Navigate Deeper ===================
  const onRowDoubleClicked = useCallback(
    (params) => {
      const row = params.data;
      if (currentDriveType === "onedrive") {
        // OneDrive
        if (row.kind === "folder") {
          // add stack entry
          setNavigationStack((prev) => [
            ...prev,
            {
              kind: "folder",
              name: row.name,
              itemId: row.id, // folder ID
            },
          ]);
          // fetch subfolder
          fetchOneDriveFolder(row.id);
        }
      } else {
        // SharePoint
        if (row.kind === "site") {
          // navigate to drives
          setNavigationStack((prev) => [
            ...prev,
            {
              kind: "site",
              siteId: row.id,
              name: row.name,
            },
          ]);
          fetchSiteDrives(row.id);
        } else if (row.kind === "drive") {
          // open drive root
          const parentSiteId =
            navigationStack.length > 0
              ? navigationStack[navigationStack.length - 1].siteId
              : row.rawItem.parentReference.siteId; // fallback
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
          // open subfolder
          // find current site, drive from stack
          let currentSite = null;
          let currentDrive = null;
          for (let i = navigationStack.length - 1; i >= 0; i--) {
            if (!currentSite && navigationStack[i].siteId) {
              currentSite = navigationStack[i].siteId;
            }
            if (!currentDrive && navigationStack[i].driveId) {
              currentDrive = navigationStack[i].driveId;
            }
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
          // file => do nothing special
          console.log("Double-clicked a file in SharePoint:", row);
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

  // =================== BACK => Navigate Up ===================
  const goBack = useCallback(() => {
    // If no stack, we are at the top (OneDrive root or site listing).
    if (!navigationStack.length) {
      if (currentDriveType === "onedrive") {
        fetchOneDriveRoot();
      } else {
        fetchSharePointSites();
      }
      return;
    }

    // pop current level
    const newStack = [...navigationStack];
    newStack.pop();
    setNavigationStack(newStack);

    if (currentDriveType === "onedrive") {
      if (!newStack.length) {
        // no stack => fetch OneDrive root
        fetchOneDriveRoot();
        return;
      }
      // open parent's folder
      const parent = newStack[newStack.length - 1];
      if (parent.kind === "folder") {
        fetchOneDriveFolder(parent.itemId);
      } else {
        // no other states exist in OneDrive, so we fallback to root
        fetchOneDriveRoot();
      }
    } else {
      // SharePoint
      if (!newStack.length) {
        // means we were at top drive/folder => list all sites again
        fetchSharePointSites();
        return;
      }

      // Look at new stack top
      const parent = newStack[newStack.length - 1];

      if (parent.kind === "site") {
        // means we show site drives
        fetchSiteDrives(parent.siteId);
      } else if (parent.kind === "drive") {
        // show drive's root
        fetchDriveRoot(parent.siteId, parent.driveId);
      } else if (parent.kind === "folder") {
        // open folder
        fetchFolderItems(parent.siteId, parent.driveId, parent.itemId);
      } else {
        // fallback => show sites
        fetchSharePointSites();
      }
    }
  }, [
    navigationStack,
    currentDriveType,
    fetchOneDriveRoot,
    fetchOneDriveFolder,
    fetchSharePointSites,
    fetchSiteDrives,
    fetchDriveRoot,
    fetchFolderItems,
    setNavigationStack,
  ]);

  // =================== Confirm Selection ===================
  const confirmSelection = useCallback(() => {
    if (!gridApiRef.current) return;
    const api = gridApiRef.current;
    const selectedNodes = api.getSelectedNodes();
    const selectedItems = selectedNodes.map((node) => node.data.rawItem);
    console.log("Selected items:", selectedItems);

    if (onFilesSelected) {
      onFilesSelected(selectedItems);
    }
    closeModal();
  }, [onFilesSelected, closeModal]);

  // =================== Derive a path string ===================
  // e.g.  navigationStack = [
  //   { kind: "site", name: "My Site" },
  //   { kind: "drive", name: "Documents" },
  //   { kind: "folder", name: "Sub" }
  // ]
  // => "/My Site/Documents/Sub"
  const currentPath = useMemo(() => {
    if (!navigationStack.length) return "/";
    return "/" + navigationStack.map((f) => f.name).join("/");
  }, [navigationStack]);

  // =================== Render ===================
  return (
    <div>
      <button
        onClick={() => openModalFor("onedrive")}
        className="bg-lightBlue-500 text-white px-4 py-2 rounded shadow mr-2"
      >
        Select from OneDrive
      </button>
      <button
        onClick={() => openModalFor("sharepoint")}
        className="bg-teal-500 text-white px-4 py-2 rounded shadow"
      >
        Select from SharePoint
      </button>

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

        {loading && <p className="text-blue-500">Loading...</p>}

        {!loading && (
          <div className="ag-theme-alpine" style={{ height: "50vh", width: "50vw" }}>
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
          <button onClick={closeModal} className="bg-gray-300 px-4 py-2 rounded">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
