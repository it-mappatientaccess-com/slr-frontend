import "@testing-library/jest-dom";
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MultiFileUpload from "./MultiFileUpload";
import dataExtractionReducer from "../../redux/slices/dataExtractionSlice";
import { api } from "util/api";
import { notify } from "components/Notify/Notify";
import { toast } from "react-toastify";

jest.mock("util/api", () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("components/Notify/Notify", () => ({
  notify: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: jest.fn(),
    },
    accounts: [],
  }),
}));

jest.mock("react-filepond", () => ({
  registerPlugin: jest.fn(),
  FilePond: ({ onupdatefiles, disabled }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onupdatefiles([
            {
              id: "local-1",
              file: new globalThis.File(["alpha"], "new.pdf", {
                type: "application/pdf",
              }),
            },
          ])
        }
      >
        Add local file
      </button>
    </div>
  ),
}));

jest.mock("components/GraphFilePicker/GraphFilePicker", () => () => (
  <div data-testid="graph-picker">Graph Picker</div>
));

jest.mock("components/ProgressBar/ProgressBar", () => (props) => (
  <div data-testid="progress-bar">
    {props.taskInProgress} :: {props.status}
  </div>
));

jest.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

jest.mock("ag-grid-react", () => ({
  AgGridReact: ({ rowData = [] }) => (
    <div data-testid="ag-grid">
      {rowData.map((row) => (
        <div key={row.file_id ?? row.id ?? row.file_name}>
          {row.file_name || row.name}
        </div>
      ))}
    </div>
  ),
}));

const createStore = (preloadedState) =>
  configureStore({
    reducer: {
      dataExtraction: dataExtractionReducer,
      questionAbstractData: (state = { seaQuestions: {} }) => state,
    },
    preloadedState,
  });

const renderComponent = (preloadedState) => {
  const store = createStore(preloadedState);

  return {
    store,
    user: userEvent.setup(),
    ...render(
      <Provider store={store}>
        <MultiFileUpload />
      </Provider>,
    ),
  };
};

const mockGetHandlers = ({
  processedFiles = [],
  batchStatuses = {},
} = {}) => {
  api.get.mockImplementation((url) => {
    if (url.startsWith("/get_extraction_file_names/")) {
      return Promise.resolve({ data: processedFiles });
    }

    if (url.startsWith("/batch-status/")) {
      const batchId = url.split("/").pop();
      return Promise.resolve({
        data:
          batchStatuses[batchId] || {
            batch_id: batchId,
            batch_status: "in_progress",
            total_files: 0,
            succeeded: 0,
            failed: 0,
            files: [],
          },
      });
    }

    return Promise.resolve({ data: {} });
  });
};

describe("MultiFileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("currentProjectId", "project-123");
    localStorage.setItem("token", "Bearer test-token");
    delete process.env.REACT_APP_API_URL;
  });

  it("shows a duplicate-only informational outcome without a generic failure toast", async () => {
    mockGetHandlers();
    api.post.mockResolvedValue({
      status: 409,
      data: {
        status: false,
        message:
          "All submitted files have already been processed with the same prompt and questions.",
        started_files: [],
        duplicates: [
          {
            file_name: "paper.pdf",
            file_id: "file-duplicate",
            batch_id: "batch-old",
            reason: "An identical extraction request has already completed.",
          },
        ],
        joined_inflight: [],
        counts: {
          started: 0,
          rejected_duplicates: 1,
          joined: 0,
        },
      },
    });

    const { user, store } = renderComponent();
    const generateButton = screen.getByRole("button", {
      name: /generate results/i,
    });

    await user.click(screen.getByRole("button", { name: /add local file/i }));

    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Upload Summary")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /already been processed with the same prompt and questions/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Already completed").length).toBeGreaterThan(0);
    expect(screen.getByText("paper.pdf")).toBeInTheDocument();
    expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
    expect(screen.queryByText(/file id:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/batch:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/task:/i)).not.toBeInTheDocument();
    expect(store.getState().dataExtraction.currentBatchID).toBeNull();
    expect(notify).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows started, completed duplicates, and joined in-progress files separately for mixed uploads", async () => {
    mockGetHandlers({
      batchStatuses: {
        "batch-new": {
          batch_id: "batch-new",
          batch_status: "in_progress",
          total_files: 1,
          succeeded: 0,
          failed: 0,
          files: [],
        },
      },
    });
    api.post.mockResolvedValue({
      status: 200,
      data: {
        status: true,
        message: "Please wait while results are being generated.",
        task_id: "task-new",
        batch_id: "batch-new",
        started_files: [
          {
            file_name: "new.pdf",
            file_id: "file-new",
            batch_id: "batch-new",
          },
        ],
        duplicates: [
          {
            file_name: "old.pdf",
            file_id: "file-old",
            batch_id: "batch-old",
            reason: "An identical extraction request has already completed.",
          },
        ],
        joined_inflight: [
          {
            file_name: "running.pdf",
            file_id: "file-running",
            batch_id: "batch-existing",
            task_id: "task-existing",
            reason: "An identical extraction request is already being processed.",
          },
        ],
        counts: {
          started: 1,
          rejected_duplicates: 1,
          joined: 1,
        },
      },
    });

    const { user, store } = renderComponent();
    const generateButton = screen.getByRole("button", {
      name: /generate results/i,
    });

    await user.click(screen.getByRole("button", { name: /add local file/i }));

    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Upload Summary")).toBeInTheDocument();
      expect(screen.getAllByText("Already completed").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Already in progress").length).toBeGreaterThan(0);
    });

    expect(
      screen.getByText(/newly started files are tracked below/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("new.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText(/file id:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/batch:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/task:/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /view results/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent(
      "Progress: 0 of 1 files processed :: in_progress",
    );
    expect(store.getState().dataExtraction.currentBatchID).toBe("batch-new");
    expect(store.getState().dataExtraction.extractionTaskId).toBe("task-new");
  });

  it("attaches to an existing batch when all submitted files join in-flight work", async () => {
    mockGetHandlers({
      batchStatuses: {
        "batch-existing": {
          batch_id: "batch-existing",
          batch_status: "in_progress",
          total_files: 3,
          succeeded: 1,
          failed: 0,
          files: [],
        },
      },
    });
    api.post.mockResolvedValue({
      status: 200,
      data: {
        status: true,
        message: "Matching extraction requests are already in progress.",
        task_id: "task-existing",
        batch_id: "batch-existing",
        started_files: [],
        duplicates: [],
        joined_inflight: [
          {
            file_name: "paper.pdf",
            file_id: "file-joined",
            batch_id: "batch-existing",
            task_id: "task-existing",
            reason: "An identical extraction request is already being processed.",
          },
        ],
        counts: {
          started: 0,
          rejected_duplicates: 0,
          joined: 1,
        },
      },
    });

    const { user, store } = renderComponent();
    const generateButton = screen.getByRole("button", {
      name: /generate results/i,
    });

    await user.click(screen.getByRole("button", { name: /add local file/i }));

    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    await user.click(generateButton);

    await waitFor(() => {
      expect(store.getState().dataExtraction.currentBatchID).toBe(
        "batch-existing",
      );
      expect(store.getState().dataExtraction.extractionTaskId).toBe(
        "task-existing",
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("progress-bar")).toHaveTextContent(
        "Progress: 1 of 3 files processed :: in_progress",
      );
    });

    expect(screen.getByText("Upload Summary")).toBeInTheDocument();
    expect(screen.queryByText(/file id:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/batch:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/task:/i)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/batch-status/batch-existing", {
      headers: {
        Authorization: "Bearer test-token",
      },
    });
  });

  it("renders same-name files separately in the upload outcome summary by file_id", async () => {
    mockGetHandlers();
    api.post.mockResolvedValue({
      status: 409,
      data: {
        status: false,
        message:
          "All submitted files have already been processed with the same prompt and questions.",
        started_files: [],
        duplicates: [
          {
            file_name: "paper.pdf",
            file_id: "file-a",
            batch_id: "batch-old-1",
            reason: "An identical extraction request has already completed.",
          },
          {
            file_name: "paper.pdf",
            file_id: "file-b",
            batch_id: "batch-old-2",
            reason: "An identical extraction request has already completed.",
          },
        ],
        joined_inflight: [],
        counts: {
          started: 0,
          rejected_duplicates: 2,
          joined: 0,
        },
      },
    });

    const { user } = renderComponent();
    const generateButton = screen.getByRole("button", {
      name: /generate results/i,
    });

    await user.click(screen.getByRole("button", { name: /add local file/i }));

    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getAllByText("paper.pdf")).toHaveLength(2);
    });
  });

  it("still shows preview file names when a handled duplicate item is missing file_id", async () => {
    mockGetHandlers();
    api.post.mockResolvedValue({
      status: 409,
      data: {
        status: false,
        message:
          "All submitted files have already been processed with the same prompt and questions.",
        started_files: [],
        duplicates: [
          {
            file_name: "legacy-paper.pdf",
            batch_id: "batch-old",
            reason: "An identical extraction request has already completed.",
          },
        ],
        joined_inflight: [],
        counts: {
          started: 0,
          rejected_duplicates: 1,
          joined: 0,
        },
      },
    });

    const { user } = renderComponent();
    const generateButton = screen.getByRole("button", {
      name: /generate results/i,
    });

    await user.click(screen.getByRole("button", { name: /add local file/i }));

    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("legacy-paper.pdf")).toBeInTheDocument();
    });
  });
});
