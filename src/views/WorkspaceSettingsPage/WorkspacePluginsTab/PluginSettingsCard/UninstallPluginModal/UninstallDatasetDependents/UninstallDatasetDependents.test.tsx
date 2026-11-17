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
    expect(
      screen.queryByText("We could not load what reads this dataset."),
    ).not.toBeInTheDocument();
  });

  it("shows a status indicator while the lookups load", () => {
    mocks.result = { dependents: [], isLoading: true, hasFailed: false };

    _renderDependents();

    expect(
      screen.getByRole("status", {
        name: "Checking what reads this dataset",
      }),
    ).toBeInTheDocument();
  });

  it("labels each dependent with the way it reads the dataset", () => {
    mocks.result = {
      dependents: [
        { key: "a", kind: "linkedDataset", label: "Districts joined" },
        { key: "b", kind: "dataSlot", label: "Mozambique: Districts" },
      ],
      isLoading: false,
      hasFailed: false,
    };

    _renderDependents();

    expect(
      screen.getByText("These read it and stop working once it is deleted:"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Districts joined (linked dataset)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mozambique: Districts (data slot)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("We could not load what reads this dataset."),
    ).not.toBeInTheDocument();
  });

  it("warns instead of showing nothing when a lookup failed", () => {
    mocks.result = { dependents: [], isLoading: false, hasFailed: true };

    _renderDependents();

    expect(screen.getByRole("status")).toHaveTextContent(
      "We could not load what reads this dataset.",
    );
  });

  it("warns beside the linked datasets it did find when a lookup failed", () => {
    mocks.result = {
      dependents: [
        { key: "a", kind: "linkedDataset", label: "Districts joined" },
      ],
      isLoading: false,
      hasFailed: true,
    };

    _renderDependents();

    expect(
      screen.getByText("Districts joined (linked dataset)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We could not load what reads this dataset."),
    ).toBeInTheDocument();
  });
});
