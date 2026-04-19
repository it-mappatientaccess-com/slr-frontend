import "@testing-library/jest-dom";
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";

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
    AgGridReact: React.forwardRef(({ rowData = [] }, ref) => (
      <div data-testid="ag-grid" ref={ref}>
        {rowData.map((row) => (
          <div
            data-testid="ag-row"
            key={row.file_id ?? row.id ?? row.file_name}
          >
            {row.file_name}
          </div>
        ))}
      </div>
    )),
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
});
