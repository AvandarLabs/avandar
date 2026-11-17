import { beforeEach, describe, expect, it, vi } from "vitest";
import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

const mocks = vi.hoisted(() => {
  return {
    deleteInstallation: vi.fn(),
    getInstallationById: vi.fn(),
    fullDelete: vi.fn(),
    canAccessResource: vi.fn(),
    loggerError: vi.fn(),
    calls: [] as string[],
  };
});

vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        delete: mocks.deleteInstallation,
        getById: mocks.getInstallationById,
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { fullDelete: mocks.fullDelete } };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: mocks.loggerError } };
});
vi.mock("@/clients/UserClient", () => {
  return { UserClient: { canAccessResource: mocks.canAccessResource } };
});

const INSTALLATION_ID = "installation-1" as PluginInstallation.Id;
const PROVINCES_DATASET_ID = "dataset-provinces" as Dataset.Id;
const DISTRICTS_DATASET_ID = "dataset-districts" as Dataset.Id;

function _run(datasetIds: readonly Dataset.Id[]) {
  return uninstallPluginAndDeleteDatasets({
    installationId: INSTALLATION_ID,
    datasetIds,
  });
}

describe("uninstallPluginAndDeleteDatasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls = [];
    mocks.deleteInstallation.mockImplementation(async () => {
      mocks.calls.push("uninstall");
    });
    mocks.getInstallationById.mockResolvedValue(undefined);
    mocks.canAccessResource.mockResolvedValue(true);
    mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
      mocks.calls.push(`delete ${id}`);
    });
  });

  it("uninstalls before it deletes any dataset", async () => {
    const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

    expect(mocks.calls).toEqual([
      "uninstall",
      `delete ${PROVINCES_DATASET_ID}`,
      `delete ${DISTRICTS_DATASET_ID}`,
    ]);
    expect(outcome).toEqual({ failedDatasetIds: [] });
  });

  it("deletes nothing when the uninstall throws", async () => {
    mocks.deleteInstallation.mockRejectedValue(new Error("network down"));

    await expect(_run([PROVINCES_DATASET_ID])).rejects.toThrow("network down");
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("deletes nothing when the install is still there after a delete that did not throw", async () => {
    mocks.getInstallationById.mockResolvedValue({ id: INSTALLATION_ID });

    await expect(_run([PROVINCES_DATASET_ID])).rejects.toThrow(/was not uninstalled/);
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("goes on after a failed delete and returns it", async () => {
    mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
      if (id === PROVINCES_DATASET_ID) {
        throw new Error("storage down");
      }
    });

    const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DISTRICTS_DATASET_ID });
    expect(outcome).toEqual({ failedDatasetIds: [PROVINCES_DATASET_ID] });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });

  it("never calls fullDelete for a dataset the user may no longer delete", async () => {
    mocks.canAccessResource.mockImplementation(
      async ({ resourceId }: { resourceId: string }) => {
        return resourceId !== PROVINCES_DATASET_ID;
      },
    );

    const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

    expect(mocks.fullDelete).not.toHaveBeenCalledWith({
      id: PROVINCES_DATASET_ID,
    });
    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DISTRICTS_DATASET_ID });
    expect(outcome).toEqual({ failedDatasetIds: [PROVINCES_DATASET_ID] });
  });

  it("checks admin access on the dataset itself", async () => {
    await _run([PROVINCES_DATASET_ID]);

    expect(mocks.canAccessResource).toHaveBeenCalledWith({
      resourceType: "dataset",
      resourceId: PROVINCES_DATASET_ID,
      minRole: "admin",
    });
  });

  it("counts an access check that throws as a failure and does not delete", async () => {
    mocks.canAccessResource.mockRejectedValue(new Error("rpc failed"));

    const outcome = await _run([PROVINCES_DATASET_ID]);

    expect(mocks.fullDelete).not.toHaveBeenCalled();
    expect(outcome).toEqual({ failedDatasetIds: [PROVINCES_DATASET_ID] });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });
});
