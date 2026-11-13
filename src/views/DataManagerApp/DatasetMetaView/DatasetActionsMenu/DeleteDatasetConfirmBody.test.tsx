import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { DeleteDatasetConfirmBody } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DeleteDatasetConfirmBody";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

describe("DeleteDatasetConfirmBody", () => {
  it("asks about the dataset alone when nothing reads it", () => {
    render(
      <DeleteDatasetConfirmBody
        datasetName="Kings line list"
        linkedDatasets={[]}
      />,
    );

    expect(
      screen.getByText("Are you sure you want to delete Kings line list?"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("names the linked datasets that stop working", () => {
    render(
      <DeleteDatasetConfirmBody
        datasetName="Kings line list"
        linkedDatasets={[
          {
            id: "dataset-labeled" as Dataset.Id,
            name: "Kings line list (labeled)",
            dictionaryIds: new Set(),
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        "This linked dataset reads it and stops working once it is deleted:",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Kings line list (labeled)",
    );
  });
});
