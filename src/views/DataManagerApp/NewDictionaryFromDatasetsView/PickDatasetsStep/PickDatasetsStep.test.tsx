import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PickDatasetsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _dataset(id: string, name: string): Dataset.T {
  return Model.make("Dataset", {
    id: id as Dataset.Id,
    name,
    sourceType: "csv_file",
    workspaceId:
      "00000000-0000-4000-8000-000000000001" as Dataset.T["workspaceId"],
    ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
    ownerProfileId:
      "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
  });
}

const KINGS = _dataset(
  "00000000-0000-4000-8000-00000000000a",
  "Kings line list",
);
const ERIE = _dataset("00000000-0000-4000-8000-00000000000b", "Erie cases");
const COLUMN_COUNTS = new Map([
  [KINGS.id, 6],
  [ERIE.id, 9],
]);

function _renderStep(
  pickedDatasetIds: Dataset.Id[] = [],
  columnCounts: ReadonlyMap<Dataset.Id, number> = COLUMN_COUNTS,
) {
  const dispatch = vi.fn();
  const onRead = vi.fn();
  render(
    <PickDatasetsStep
      datasets={[KINGS, ERIE]}
      columnCounts={columnCounts}
      pickedDatasetIds={pickedDatasetIds}
      isLoading={false}
      isReading={false}
      dispatch={dispatch}
      onRead={onRead}
    />,
  );
  return { dispatch, onRead };
}

describe("PickDatasetsStep", () => {
  it("cannot read until a dataset is picked", () => {
    _renderStep();
    expect(
      screen.getByRole("button", { name: "Read 0 datasets" }),
    ).toBeDisabled();
  });

  it("picks a dataset with its checkbox", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pick Erie cases" }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "toggle_dataset",
      datasetId: ERIE.id,
    });
  });

  it("picks a dataset when anywhere on its row is clicked, once", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByText("Erie cases"));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "toggle_dataset",
      datasetId: ERIE.id,
    });
  });

  it("counts the picked datasets' columns and reads them", () => {
    const { onRead } = _renderStep([KINGS.id, ERIE.id]);
    expect(screen.getByText("2 picked · 15 columns")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Read 2 datasets" }));
    expect(onRead).toHaveBeenCalledOnce();
  });

  it("formats column counts with the locale's separators", () => {
    _renderStep(
      [KINGS.id],
      new Map([
        [KINGS.id, 1234],
        [ERIE.id, 9],
      ]),
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });
});
