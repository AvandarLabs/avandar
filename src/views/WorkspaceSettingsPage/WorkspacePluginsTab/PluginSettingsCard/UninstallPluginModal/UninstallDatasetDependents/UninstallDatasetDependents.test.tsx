import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { UninstallDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/UninstallDatasetDependents";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

const mocks = vi.hoisted(() => {
  return {
    result: {
      dependents: [] as Array<{
        key: string;
        kind: "linkedDataset" | "dataSlot";
        label: string;
      }>,
      isLoading: false,
      hasFailed: false,
    },
  };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents",
  () => {
    return {
      useDatasetDependents: () => {
        return mocks.result;
      },
    };
  },
);

const LINKED = {
  key: "linked-1",
  kind: "linkedDataset",
  label: "Districts joined",
} as const;

const PLUGIN = {
  key: "binding-1",
  kind: "dataSlot",
  label: "Districts in the Mozambique plugin",
} as const;

const LOAD_FAILURE = "We could not load what reads this dataset.";

function _renderDependents(): void {
  render(
    <UninstallDatasetDependents
      datasetId={"dataset-1" as Dataset.Id}
      installationId={"installation-1" as PluginInstallation.Id}
    />,
  );
}

describe("UninstallDatasetDependents", () => {
  beforeEach(() => {
    mocks.result = { dependents: [], isLoading: false, hasFailed: false };
  });

  it("renders nothing when nothing reads the dataset", () => {
    _renderDependents();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILURE)).not.toBeInTheDocument();
  });

  it("shows a status indicator while the lookups load", () => {
    mocks.result = { dependents: [], isLoading: true, hasFailed: false };

    _renderDependents();

    expect(
      screen.getByRole("status", { name: "Checking what reads this dataset" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("hides the dependents it has found while a lookup is still loading", () => {
    mocks.result = { dependents: [LINKED], isLoading: true, hasFailed: false };

    _renderDependents();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/Districts joined/)).not.toBeInTheDocument();
  });

  it("lists a linked dataset as a linked dataset", () => {
    mocks.result = { dependents: [LINKED], isLoading: false, hasFailed: false };

    _renderDependents();

    expect(
      screen.getByText("These read it and stop working once it is deleted:"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByText("Districts joined (linked dataset)"),
    ).toBeInTheDocument();
  });

  it("lists another plugin's use of the dataset in plain words", () => {
    mocks.result = { dependents: [PLUGIN], isLoading: false, hasFailed: false };

    _renderDependents();

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByText("Districts in the Mozambique plugin"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/data slot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/linked dataset/i)).not.toBeInTheDocument();
  });

  it("lists linked datasets and plugin dependents together in the order given", () => {
    mocks.result = {
      dependents: [LINKED, PLUGIN],
      isLoading: false,
      hasFailed: false,
    };

    _renderDependents();

    expect(
      screen.getAllByRole("listitem").map((item) => {
        return item.textContent;
      }),
    ).toEqual([
      "Districts joined (linked dataset)",
      "Districts in the Mozambique plugin",
    ]);
    expect(screen.queryByText(LOAD_FAILURE)).not.toBeInTheDocument();
  });

  it("says the list could not be loaded instead of showing an empty list", () => {
    mocks.result = { dependents: [], isLoading: false, hasFailed: true };

    _renderDependents();

    expect(screen.getByRole("status")).toHaveTextContent(LOAD_FAILURE);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says the list could not be loaded beside the dependents it did find", () => {
    mocks.result = {
      dependents: [LINKED, PLUGIN],
      isLoading: false,
      hasFailed: true,
    };

    _renderDependents();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent(LOAD_FAILURE);
  });
});
