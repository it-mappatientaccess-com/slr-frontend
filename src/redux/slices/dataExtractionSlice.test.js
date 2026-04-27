import reducer, {
  upsertCancelledBatchFiles,
} from "./dataExtractionSlice";

const getInitialState = () => reducer(undefined, { type: "init" });

describe("dataExtractionSlice", () => {
  it("does not let same-name cancellation overwrite or hide a completed row", () => {
    const initialState = {
      ...getInitialState(),
      processedFiles: [
        {
          file_id: "file-completed",
          file_name: "paper.pdf",
          batch_id: "batch-1",
          extraction_status: "succeeded",
        },
      ],
      fileStatuses: {
        "file-completed": {
          extraction_status: "succeeded",
        },
      },
    };

    const nextState = reducer(
      initialState,
      upsertCancelledBatchFiles({
        batchId: "batch-1",
        files: [
          {
            file_id: "file-cancelled",
            file_name: "paper.pdf",
            batch_id: "batch-1",
          },
        ],
      }),
    );

    expect(nextState.processedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file_id: "file-completed",
          file_name: "paper.pdf",
          extraction_status: "succeeded",
        }),
        expect.objectContaining({
          file_id: "file-cancelled",
          file_name: "paper.pdf",
          extraction_status: "cancelled",
        }),
      ]),
    );
    expect(nextState.processedFiles).toHaveLength(2);
  });

  it("updates a pending row to cancelled by file_id even when file names repeat", () => {
    const initialState = {
      ...getInitialState(),
      processedFiles: [
        {
          file_id: "file-pending",
          file_name: "paper.pdf",
          batch_id: "batch-1",
          extraction_status: "pending",
        },
        {
          file_id: "file-completed",
          file_name: "paper.pdf",
          batch_id: "batch-1",
          extraction_status: "succeeded",
        },
      ],
    };

    const nextState = reducer(
      initialState,
      upsertCancelledBatchFiles({
        batchId: "batch-1",
        files: [
          {
            file_id: "file-pending",
            file_name: "paper.pdf",
            batch_id: "batch-1",
          },
        ],
      }),
    );

    expect(nextState.processedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file_id: "file-pending",
          extraction_status: "cancelled",
        }),
        expect.objectContaining({
          file_id: "file-completed",
          extraction_status: "succeeded",
        }),
      ]),
    );
  });
});
