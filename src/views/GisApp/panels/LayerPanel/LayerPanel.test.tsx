import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  label?: string;
  onChange: (source: QueryDataSource.T | null) => void;
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
const layer = MapLayer.makeEmpty("First layer");
const VIEW_STATE = {
  status: "ready",
  error: undefined,
  featureCount: 1,
  droppedRowCount: 0,
  drops: [],
  largestDropReason: undefined,
  filterCount: 0,
  onRetry: vi.fn(),
} satisfies MapLayerViewState;

vi.mock("@/views/DataExplorerApp/QueryDataSourceSelect", () => {
  return {
    QueryDataSourceSelect: ({ label, onChange }: Props) => {
      return (
        <button
          type="button"
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

describe("LayerPanel", () => {
  it("adds, selects, hides, and collapses through its real controls", async () => {
    const callbacks = {
      onAddLayerFromSource: vi.fn(),
      onToggleCollapsed: vi.fn(),
      onSelectLayer: vi.fn(),
      onToggleLayerVisible: vi.fn(),
    };
    render(
      <LayerPanel
        rows={[layer]}
        viewStates={new Map([[layer.id, VIEW_STATE]])}
        selectedLayerId={layer.id}
        onStackOrderChange={vi.fn()}
        {...callbacks}
        onRenameLayer={vi.fn()}
        onDuplicateLayer={vi.fn()}
        onZoomToLayer={vi.fn()}
        onDeleteLayer={vi.fn()}
        isCollapsed={false}
      />,
    );

    expect(screen.getByRole("region", { name: "Layers" })).toHaveTextContent(
      "1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add layer" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Data source")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Data source"));
    fireEvent.click(screen.getByRole("button", { name: /^First layer/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide the layer First layer" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse the layers panel" }),
    );

    expect(callbacks.onAddLayerFromSource).toHaveBeenCalledWith(dataSource);
    expect(callbacks.onSelectLayer).toHaveBeenCalledWith(layer.id);
    expect(callbacks.onToggleLayerVisible).toHaveBeenCalledWith(layer.id);
    expect(callbacks.onToggleCollapsed).toHaveBeenCalledOnce();
  });
});
