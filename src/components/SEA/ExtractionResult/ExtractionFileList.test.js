import "@testing-library/jest-dom";
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ExtractionFileList from "./ExtractionFileList";
import dataExtractionReducer from "../../../redux/slices/dataExtractionSlice";
import { api } from "util/api";

jest.mock("util/api", () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

jest.mock("ag-grid-react", () => {
  const React = require("react");

  return {
    AgGridReact: React.forwardRef(({ rowData = [], columnDefs = [] }, ref) => {
      const renderCell = (row, column, rowIndex) => {
        const node = { rowIndex };
        const value =
          typeof column.valueGetter === "function"
            ? column.valueGetter({ data: row, node })
            : column.field
              ? row[column.field]
              : undefined;
        const cellParams = {
          data: row,
          node,
          value,
          ...(column.cellRendererParams || {}),
        };
        const cellKey = String(column.headerName || column.field || "cell")
          .toLowerCase()
          .replace(/\s+/g, "-");

        if (column.cellRenderer) {
          const Renderer = column.cellRenderer;
          return (
            <div data-testid={`ag-cell-${cellKey}`} key={cellKey}>
              <Renderer {...cellParams} />
            </div>
          );
        }

        return (
          <div data-testid={`ag-cell-${cellKey}`} key={cellKey}>
            {value}
          </div>
        );
      };

      return (
        <div data-testid="ag-grid" ref={ref}>
          {rowData.map((row, rowIndex) => (
            <div
              data-testid="ag-row"
              key={row.file_id ?? row.id ?? row.file_name}
            >
              {columnDefs.map((column) => renderCell(row, column, rowIndex))}
            </div>
          ))}
        </div>
      );
    }),
  };
});

jest.mock("./ExtractionResult", () => () => <div>Extraction Result</div>);
jest.mock("components/Modal/ModalSmall", () => () => null);

const createStore = (preloadedState) =>
  configureStore({
    reducer: {
      dataExtraction: dataExtractionReducer,
    },
    preloadedState,
  });

describe("ExtractionFileList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("currentProjectId", "project-123");
    localStorage.setItem("token", "Bearer test-token");
  });

  it("renders multiple processed files with the same file_name when file_id differs", async () => {
    const processedFiles = [
      {
        file_id: "file-1",
        file_name: "paper.pdf",
        batch_id: "batch-1",
        extraction_status: "succeeded",
        processed_at: "2026-04-17T10:00:00Z",
      },
      {
        file_id: "file-2",
        file_name: "paper.pdf",
        batch_id: "batch-2",
        extraction_status: "succeeded",
        processed_at: "2026-04-17T09:00:00Z",
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith("/get_extraction_file_names/")) {
        return Promise.resolve({ data: processedFiles });
      }

      return Promise.resolve({ data: {} });
    });

    const store = createStore({
      dataExtraction: {
        files: [],
        extractionResult: [],
        singleExtractionResult: [],
        selectedFile: "",
        selectedFileId: null,
        processedFiles,
        isRefreshing: false,
        isSubmitted: false,
        message: "",
        status: false,
        taskId: null,
        taskStatus: null,
        prompts: [],
        selectedPrompt: null,
        includeAboutFile: false,
        extractionTaskId: null,
        isStopping: false,
        selectedFileQuestions: null,
        error: null,
        currentBatchID: null,
        totalFilesInBatch: 0,
        processedCount: 0,
        batchStatus: null,
        succeededCount: 0,
        failedCount: 0,
        pendingCount: 0,
        currentStageLabel: "",
        fileStatuses: {},
      },
    });

    render(
      <Provider store={store}>
        <ExtractionFileList />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("ag-row")).toHaveLength(2);
    });

    expect(screen.getAllByText("paper.pdf")).toHaveLength(2);
  });

  it("renders display-only row IDs in sequence for active batch rows", async () => {
    const processedFiles = [
      {
        file_id: "file-new",
        file_name: "new.pdf",
        batch_id: "batch-active",
        extraction_status: "pending",
      },
      {
        file_id: "file-old-1",
        file_name: "old-one.pdf",
        batch_id: "batch-old",
        extraction_status: "succeeded",
      },
      {
        file_id: "file-old-2",
        file_name: "old-two.pdf",
        batch_id: "batch-old",
        extraction_status: "succeeded",
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith("/get_extraction_file_names/")) {
        return Promise.resolve({ data: processedFiles });
      }

      return Promise.resolve({ data: {} });
    });

    const store = createStore({
      dataExtraction: {
        ...dataExtractionReducer(undefined, { type: "init" }),
        processedFiles,
        currentBatchID: "batch-active",
        batchStatus: "in_progress",
      },
    });

    render(
      <Provider store={store}>
        <ExtractionFileList />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("ag-row")).toHaveLength(3);
    });

    expect(screen.getAllByTestId("ag-cell-id").map((cell) => cell.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("disables View for failed and cancelled files and keeps stale results hidden", async () => {
    const processedFiles = [
      {
        file_id: "file-failed",
        file_name: "failed.pdf",
        batch_id: "batch-1",
        extraction_status: "failed",
        failure_code: "PASSWORD_PROTECTED",
      },
      {
        file_id: "file-cancelled",
        file_name: "cancelled.pdf",
        batch_id: "batch-1",
        extraction_status: "cancelled",
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith("/get_extraction_file_names/")) {
        return Promise.resolve({ data: processedFiles });
      }

      if (url.startsWith("/get_extraction_file_results/")) {
        return Promise.resolve({ data: { results: [], file_name: "failed.pdf" } });
      }

      return Promise.resolve({ data: {} });
    });

    const store = createStore({
      dataExtraction: {
        ...dataExtractionReducer(undefined, { type: "init" }),
        processedFiles,
        extractionResult: [{ Question: ["Answer"] }],
        selectedFile: "failed.pdf",
        selectedFileId: "file-failed",
      },
    });

    render(
      <Provider store={store}>
        <ExtractionFileList />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /view/i })).toHaveLength(2);
    });

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    viewButtons.forEach((button) => expect(button).toBeDisabled());

    await userEvent.click(viewButtons[0]);

    expect(api.get).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/get_extraction_file_results\//),
      expect.anything(),
    );
    await waitFor(() => {
      expect(screen.queryByText("Extraction Result")).not.toBeInTheDocument();
    });
  });

  it("keeps completed current-batch rows viewable when the batch was cancelled", async () => {
    const completedRows = [
      {
        file_id: "file-completed",
        file_name: "completed.pdf",
        batch_id: "batch-cancelled",
      },
    ];
    const processedFiles = [
      ...completedRows,
      {
        file_id: "file-cancelled",
        file_name: "cancelled.pdf",
        batch_id: "batch-cancelled",
        extraction_status: "cancelled",
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith("/get_extraction_file_names/")) {
        return Promise.resolve({ data: completedRows });
      }

      return Promise.resolve({ data: {} });
    });

    const store = createStore({
      dataExtraction: {
        ...dataExtractionReducer(undefined, { type: "init" }),
        processedFiles,
        currentBatchID: "batch-cancelled",
        batchStatus: "cancelled",
      },
    });

    render(
      <Provider store={store}>
        <ExtractionFileList />
      </Provider>,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/get_extraction_file_names/project-123",
        expect.anything(),
      );
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    expect(viewButtons.filter((button) => !button.disabled)).toHaveLength(1);
    expect(viewButtons.filter((button) => button.disabled)).toHaveLength(1);
  });

  it("shows failed file reasons and retry guidance in the grid", async () => {
    const processedFiles = [
      {
        file_id: "file-failed",
        file_name: "failed.pdf",
        extraction_status: "failed",
        failure_code: "PASSWORD_PROTECTED",
        failure_reason: "Encrypted document.",
      },
      {
        file_id: "file-unknown",
        file_name: "unknown.pdf",
        extraction_status: "failed",
        failure_code: "NEW_BACKEND_ERROR",
        failure_reason: "Parser timed out.",
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith("/get_extraction_file_names/")) {
        return Promise.resolve({ data: processedFiles });
      }

      return Promise.resolve({ data: {} });
    });

    const store = createStore({
      dataExtraction: {
        ...dataExtractionReducer(undefined, { type: "init" }),
        processedFiles,
      },
    });

    render(
      <Provider store={store}>
        <ExtractionFileList />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password-protected and cannot be processed/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Parser timed out.")).toBeInTheDocument();
    });
  });
});
