import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";

import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";

type Props = {
  label?: string;
  onChange: (value: QueryDataSource.T | null) => void;
};

function _createDataSource(): Dataset.T {
  return Model.make("Dataset", {
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    id: uuid<Dataset.Id>(),
    name: "Cases",
    sourceType: "csv_file",
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
  });
}

const dataSource = _createDataSource();

vi.mock("@/views/DataExplorerApp/QueryDataSourceSelect", () => {
  return {
    QueryDataSourceSelect: ({ label, onChange }: Props) => {
      return (
        <button
          aria-label={label}
          onClick={() => {
            onChange(dataSource);
          }}
        >
          Select source
        </button>
      );
    },
  };
});

describe("LayerSourcePicker", () => {
  it("does not create a layer until the user chooses a source", async () => {
    const onSourceSelected = vi.fn();
    render(
      <LayerSourcePicker onSourceSelected={onSourceSelected}>
        {(targetProps) => {
          return <button {...targetProps}>Add layer</button>;
        }}
      </LayerSourcePicker>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Data source" }),
      ).toBeInTheDocument();
    });
    expect(onSourceSelected).not.toHaveBeenCalled();
  });

  it("creates a layer only after a source is selected", async () => {
    const onSourceSelected = vi.fn();
    render(
      <LayerSourcePicker onSourceSelected={onSourceSelected}>
        {(targetProps) => {
          return <button {...targetProps}>Add layer</button>;
        }}
      </LayerSourcePicker>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Data source" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Data source"));

    expect(onSourceSelected).toHaveBeenCalledWith(dataSource);
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Data source" }),
      ).not.toBeInTheDocument();
    });
  });

  it("creates nothing when the picker is dismissed", () => {
    const onSourceSelected = vi.fn();
    render(
      <LayerSourcePicker onSourceSelected={onSourceSelected}>
        {(targetProps) => {
          return <button {...targetProps}>Add layer</button>;
        }}
      </LayerSourcePicker>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onSourceSelected).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Data source" }),
    ).not.toBeInTheDocument();
  });
});
