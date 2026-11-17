import { beforeEach, describe, expect, it, vi } from "vitest";
import { importPluginContentItem } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

const mocks = vi.hoisted(() => {
  return {
    fetch: vi.fn(),
    startCsvImport: vi.fn(),
    dropLocalDataset: vi.fn(),
    insertCsvFileDataset: vi.fn(),
    fullDelete: vi.fn(),
    startDatasetUpload: vi.fn(),
    insertContentImport: vi.fn(),
  };
});

vi.mock("$/lib/uuid", () => {
  return {
    uuid: () => {
      return "00000000-0000-4000-8000-000000000042";
    },
  };
});
vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: mocks.startCsvImport,
      dropLocalDataset: mocks.dropLocalDataset,
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      insertCsvFileDataset: mocks.insertCsvFileDataset,
      fullDelete: mocks.fullDelete,
    },
  };
});
vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: {
        startDatasetUpload: mocks.startDatasetUpload,
      },
    };
  },
);
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: { insert: mocks.insertContentImport },
    };
  },
);

const DATASET_ID = "00000000-0000-4000-8000-000000000042" as Dataset.Id;
const CSV_TEXT = "province_code,province_name\nMOZ-1,Niassa\n";

const ITEM: PluginContentItem = {
  id: "provinces",
  kind: "dataset",
  title: "%content.provinces.title%",
  description: "%content.provinces.description%",
  file: "content/mz-adm1.csv",
};

const SNIFF = {
  csvSniff: {
    Delimiter: ",",
    Quote: '"',
    Escape: '"',
    NewLineDelimiter: "\n",
    Comment: "",
    SkipRows: 0,
    HasHeader: true,
    Columns: [],
    DateFormat: null,
    TimestampFormat: "%Y-%m-%d %H:%M:%S",
  },
  columns: [
    { column_name: "province_code", column_type: "VARCHAR" },
    { column_name: "province_name", column_type: "VARCHAR" },
  ],
  previewRows: [],
};

async function _importProvinces(): Promise<Dataset.Id> {
  return await importPluginContentItem({
    workspaceId: "workspace-id" as Workspace.Id,
    userId: "user-id" as User.Id,
    pluginId: "avandar.mozambique",
    item: ITEM,
    datasetName: "Mozambique provinces",
    datasetDescription: "Province boundaries. CC BY 3.0 IGO.",
    url: "/assets/mz-adm1.csv",
  });
}

describe("importPluginContentItem", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset();
    });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue(new Response(CSV_TEXT, { status: 200 }));
    mocks.startCsvImport.mockResolvedValue(SNIFF);
    mocks.insertCsvFileDataset.mockResolvedValue({ id: DATASET_ID });
    mocks.startDatasetUpload.mockResolvedValue(undefined);
    mocks.insertContentImport.mockResolvedValue({ id: "import-id" });
    mocks.fullDelete.mockResolvedValue(undefined);
    mocks.dropLocalDataset.mockResolvedValue(undefined);
  });

  it("returns the id of the dataset it created", async () => {
    expect(await _importProvinces()).toBe(DATASET_ID);
  });

  it("parses the downloaded file, named after the item's file", async () => {
    await _importProvinces();

    expect(mocks.fetch).toHaveBeenCalledWith("/assets/mz-adm1.csv");
    const { file, datasetId, parseOptions } =
      mocks.startCsvImport.mock.calls[0]![0];
    expect(file.name).toBe("mz-adm1.csv");
    expect(file.size).toBe(CSV_TEXT.length);
    expect(datasetId).toBe(DATASET_ID);
    expect(parseOptions).toEqual({});
  });

  it("names the import after the dataset, not the bundled file", async () => {
    await _importProvinces();

    expect(mocks.startCsvImport).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Mozambique provinces" }),
    );
  });

  it("saves a CSV dataset named and described by the item, with the sniffed dialect", async () => {
    await _importProvinces();

    expect(mocks.insertCsvFileDataset).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: DATASET_ID,
        workspaceId: "workspace-id",
        datasetName: "Mozambique provinces",
        datasetDescription: "Province boundaries. CC BY 3.0 IGO.",
        isInCloudStorage: true,
        sizeInBytes: CSV_TEXT.length,
        parseOptions: {
          rowsToSkip: 0,
          delimiter: ",",
          quoteChar: '"',
          escapeChar: '"',
          newlineDelimiter: "\n",
          commentChar: "",
          hasHeader: true,
          dateFormat: undefined,
          timestampFormat: "%Y-%m-%d %H:%M:%S",
        },
      }),
    );
  });

  it("saves one column per sniffed column, in file order", async () => {
    await _importProvinces();

    const { columns } = mocks.insertCsvFileDataset.mock.calls[0]![0];
    expect(columns).toMatchObject([
      { name: "province_code", data_type: "varchar", column_idx: 0 },
      { name: "province_name", data_type: "varchar", column_idx: 1 },
    ]);
  });

  it("records the import only after the dataset's upload finishes", async () => {
    await _importProvinces();

    expect(mocks.insertContentImport).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace-id",
        pluginId: "avandar.mozambique",
        contentId: "provinces",
        datasetId: DATASET_ID,
      }),
    });
    const [uploadOrder] = mocks.startDatasetUpload.mock.invocationCallOrder;
    const [recordOrder] = mocks.insertContentImport.mock.invocationCallOrder;
    expect(uploadOrder).toBeLessThan(recordOrder!);
  });

  it("uploads the dataset as a CSV dataset of the workspace", async () => {
    await _importProvinces();

    expect(mocks.startDatasetUpload).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      datasetId: DATASET_ID,
      sourceType: "csv_file",
    });
  });

  it("deletes the new dataset and rethrows when the upload fails", async () => {
    mocks.startDatasetUpload.mockRejectedValue(new Error("upload failed"));

    await expect(_importProvinces()).rejects.toThrow("upload failed");

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DATASET_ID });
    expect(mocks.dropLocalDataset).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
    });
    expect(mocks.insertContentImport).not.toHaveBeenCalled();
  });

  it("deletes the new dataset and rethrows when recording the import fails", async () => {
    mocks.insertContentImport.mockRejectedValue(new Error("duplicate key"));

    await expect(_importProvinces()).rejects.toThrow("duplicate key");

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DATASET_ID });
  });

  it("rethrows the import's own error when deleting the dataset also fails", async () => {
    mocks.startDatasetUpload.mockRejectedValue(new Error("upload failed"));
    mocks.fullDelete.mockRejectedValue(new Error("delete failed"));

    await expect(_importProvinces()).rejects.toThrow("upload failed");
  });

  it("creates nothing and names the file when the download fails", async () => {
    mocks.fetch.mockResolvedValue(new Response("", { status: 404 }));

    await expect(_importProvinces()).rejects.toThrow(
      "Could not download content/mz-adm1.csv (HTTP 404).",
    );

    expect(mocks.startCsvImport).not.toHaveBeenCalled();
    expect(mocks.insertCsvFileDataset).not.toHaveBeenCalled();
  });

  it("creates nothing when the host answers a missing file with an HTML page", async () => {
    mocks.fetch.mockResolvedValue(
      new Response("<!doctype html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    await expect(_importProvinces()).rejects.toThrow(
      "Could not download content/mz-adm1.csv (HTTP 200).",
    );

    expect(mocks.startCsvImport).not.toHaveBeenCalled();
    expect(mocks.insertCsvFileDataset).not.toHaveBeenCalled();
  });
});
