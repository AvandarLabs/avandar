import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { UninstallDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/UninstallDatasetDependents";
import {
  DependentsLoadingContext,
  type ReportDependentsLoading,
} from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDependentsLoading/useDependentsLoading";
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

function _renderDependents(report: ReportDependentsLoading = vi.fn()): void {
  render(
    <DependentsLoadingContext.Provider value={report}>
      <UninstallDatasetDependents
        datasetId={"dataset-1" as Dataset.Id}
        installationId={"installation-1" as PluginInstallation.Id}
      />
    </DependentsLoadingContext.Provider>,
  );
}

function _setResult(
  result: Partial<typeof mocks.result> & {
    dependents: typeof mocks.result.dependents;
  },
): void {
  mocks.result = { isLoading: false, hasFailed: false, ...result };
}

describe("UninstallDatasetDependents", () => {
  beforeEach(() => {
    _setResult({ dependents: [] });
  });

  it("renders no list or message when nothing reads the dataset", () => {
    _renderDependents();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a status indicator while the lookups load", () => {
    _setResult({ dependents: [], isLoading: true });

    _renderDependents();

    expect(
      screen.getByRole("status", { name: "Checking what reads this dataset" }),
    ).toBeInTheDocument();
  });

  it("hides the dependents it has found while a lookup is still loading", () => {
    _setResult({ dependents: [LINKED], isLoading: true });

    _renderDependents();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("introduces a single dependent in the singular", () => {
    _setResult({ dependents: [LINKED] });

    _renderDependents();

    expect(
      screen.getByText("This reads it and stops working once it is deleted:"),
    ).toBeInTheDocument();
  });

  it("introduces several dependents in the plural", () => {
    _setResult({ dependents: [LINKED, PLUGIN] });

    _renderDependents();

    expect(
      screen.getByText("These read it and stop working once it is deleted:"),
    ).toBeInTheDocument();
  });

  it("marks a linked dataset with the linked dataset suffix", () => {
    _setResult({ dependents: [LINKED] });

    _renderDependents();

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Districts joined (linked dataset)",
    );
  });

  it("shows a plugin dependent's label without the linked dataset suffix", () => {
    _setResult({ dependents: [PLUGIN] });

    _renderDependents();

    expect(screen.getByRole("listitem").textContent).toBe(
      "Districts in the Mozambique plugin",
    );
  });

  it("lists linked datasets and plugin dependents in the order given", () => {
    _setResult({ dependents: [LINKED, PLUGIN] });

    _renderDependents();

    expect(
      screen.getAllByRole("listitem").map((item) => {
        return item.textContent;
      }),
    ).toEqual([
      "Districts joined (linked dataset)",
      "Districts in the Mozambique plugin",
    ]);
  });

  it("shows no load failure message when every lookup succeeded", () => {
    _setResult({ dependents: [LINKED, PLUGIN] });

    _renderDependents();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the list could not be loaded when a lookup failed", () => {
    _setResult({ dependents: [], hasFailed: true });

    _renderDependents();

    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_FAILURE);
  });

  it("shows no empty list when a lookup failed and nothing was found", () => {
    _setResult({ dependents: [], hasFailed: true });

    _renderDependents();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps the dependents it did find when a lookup failed", () => {
    _setResult({ dependents: [LINKED, PLUGIN], hasFailed: true });

    _renderDependents();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("says the list could not be loaded beside the dependents it did find", () => {
    _setResult({ dependents: [LINKED, PLUGIN], hasFailed: true });

    _renderDependents();

    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_FAILURE);
  });

  it("tells the modal it is loading while the lookups load", () => {
    _setResult({ dependents: [], isLoading: true });
    const report = vi.fn();

    _renderDependents(report);

    expect(report).toHaveBeenLastCalledWith("dataset-1", true);
  });

  it("tells the modal it has loaded once the lookups settle", () => {
    const report = vi.fn();

    _renderDependents(report);

    expect(report).toHaveBeenLastCalledWith("dataset-1", false);
  });

  it("does not keep the modal waiting when a lookup failed", () => {
    _setResult({ dependents: [], hasFailed: true });
    const report = vi.fn();

    _renderDependents(report);

    expect(report).toHaveBeenLastCalledWith("dataset-1", false);
  });
});
