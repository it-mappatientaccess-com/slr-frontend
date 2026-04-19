import { generateExtractionResults } from "./dataExtractionThunks";
import { api } from "util/api";
import { toast } from "react-toastify";

jest.mock("util/api", () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

const getThunkArgs = () => ({
  localFiles: [
    {
      file: new File(["content"], "paper.pdf", { type: "application/pdf" }),
      filename: "paper.pdf",
    },
  ],
  graphFiles: [],
  graphAccessToken: "",
  questions: { question_1: ["What is this paper about?"] },
  newBatchID: "batch-request",
  selectedPrompt: "Return concise answers.",
  includeAboutFile: false,
});

describe("generateExtractionResults", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("currentProjectId", "project-123");
    localStorage.setItem("token", "Bearer test-token");
  });

  it("treats a duplicate-only 409 response as a fulfilled outcome", async () => {
    api.post.mockResolvedValue({
      status: 409,
      data: {
        status: false,
        message:
          "All submitted files have already been processed with the same prompt and questions.",
        duplicates: [
          {
            file_name: "paper.pdf",
            file_id: "file-duplicate",
            batch_id: "batch-old",
            reason: "An identical extraction request has already completed.",
          },
        ],
        counts: {
          started: 0,
          rejected_duplicates: 1,
          joined: 0,
        },
      },
    });

    const result = await generateExtractionResults(getThunkArgs())(
      jest.fn(),
      jest.fn(),
      undefined,
    );

    expect(result.type).toBe(
      "dataExtraction/generateExtractionResults/fulfilled",
    );
    expect(result.payload.started_files).toEqual([]);
    expect(result.payload.joined_inflight).toEqual([]);
    expect(result.payload.counts).toEqual({
      started: 0,
      rejected_duplicates: 1,
      joined: 0,
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    const [, , requestConfig] = api.post.mock.calls[0];
    expect(requestConfig.validateStatus(409)).toBe(true);
    expect(requestConfig.validateStatus(500)).toBe(false);
  });

  it("normalizes missing arrays and count fields on handled responses", async () => {
    api.post.mockResolvedValue({
      status: 200,
      data: {
        status: true,
        message: "Please wait while results are being generated.",
        task_id: "task-new",
        batch_id: "batch-new",
      },
    });

    const result = await generateExtractionResults(getThunkArgs())(
      jest.fn(),
      jest.fn(),
      undefined,
    );

    expect(result.type).toBe(
      "dataExtraction/generateExtractionResults/fulfilled",
    );
    expect(result.payload).toEqual(
      expect.objectContaining({
        task_id: "task-new",
        batch_id: "batch-new",
        started_files: [],
        duplicates: [],
        joined_inflight: [],
        counts: {
          started: 0,
          rejected_duplicates: 0,
          joined: 0,
        },
      }),
    );
  });

  it("rejects non-handled errors and preserves the toast error path", async () => {
    api.post.mockRejectedValue({
      response: {
        data: {
          message: "Failed to generate extraction results.",
        },
      },
      message: "Request failed",
    });

    const result = await generateExtractionResults(getThunkArgs())(
      jest.fn(),
      jest.fn(),
      undefined,
    );

    expect(result.type).toBe(
      "dataExtraction/generateExtractionResults/rejected",
    );
    expect(result.payload).toBe("Failed to generate extraction results.");
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to generate extraction results.",
    );
  });
});
