import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { MapFirstRunCard } from "@/views/GisApp/panels/MapFirstRunCard/MapFirstRunCard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  children: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
  }) => React.ReactNode;
  onSourceSelected: (dataSource: QueryDataSource.T) => void;
};

const dataSource = Model.make("Dataset", {
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

vi.mock(
  "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker",
  () => {
    return {
      LayerSourcePicker: ({ children, onSourceSelected }: Props) => {
        return children({
          onClick: () => {
            onSourceSelected(dataSource);
          },
          "aria-expanded": false,
        });
      },
    };
  },
);

describe("MapFirstRunCard", () => {
  it("explains the empty map and forwards a chosen source", () => {
    const onAddLayerFromSource = vi.fn();
    render(<MapFirstRunCard onAddLayerFromSource={onAddLayerFromSource} />);

    expect(screen.getByText("This map has no layers yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add a layer to plot a dataset, a derived dataset, or a profile. You can add as many as you need and reorder them.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add a layer" }));

    expect(onAddLayerFromSource).toHaveBeenCalledWith(dataSource);
  });
});
