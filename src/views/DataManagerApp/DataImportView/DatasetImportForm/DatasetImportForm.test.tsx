import { fireEvent, render, screen } from "@testing-library/react";
import { uuid } from "$/lib/uuid";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { DatasetImportForm } from "./DatasetImportForm";
import type {
  CsvDataSourceMetadata,
  DataSourceMetadata,
} from "./DatasetImportForm";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";

const CSV_DATASET_ID = "11111111-1111-1111-1111-111111111111" as Dataset.Id;
const XLSX_DATASET_ID = "22222222-2222-2222-2222-222222222222" as Dataset.Id;

const { saveDatasetMock } = vi.hoisted(() => {
  return {
    saveDatasetMock: vi.fn(),
  };
});

vi.mock("./useSaveDataset/useSaveDataset", async () => {
  return {
    ParseCsvOptions: {},
    ParseXlsxOptions: {},
    ParseGoogleSheetsOptions: {},
    useSaveDataset: () => {
      return [saveDatasetMock, false] as const;
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: (): string[] => {
          return ["datasets"];
        },
      },
    },
  };
});

vi.mock("@/lib/ui/viz/DataGrid", async () => {
  const { createElement } = await import("react");
  return {
    DataGrid: function DataGridMock() {
      return createElement("div", { "data-testid": "data-grid-mock" });
    },
  };
});

function _columnSchema(
  column_name: string,
  column_type: DuckDbColumnSchema["column_type"],
): DuckDbColumnSchema {
  return {
    column_name,
    column_type,
    default: null,
    extra: null,
    key: null,
    null: "YES",
  };
}

function _csvDataSourceMetadata(): CsvDataSourceMetadata {
  const columns = [_columnSchema("city", "VARCHAR")];
  return {
    sourceType: "csv_file",
    onlineStorageAllowed: true,
    sizeInBytes: 10,
    datasetLoadResult: {
      id: uuid(),
      type: "csv",
      tableName: "dataset_1",
      csvName: "dataset_1",
      numRows: 3,
      columns,
      numRejectedRows: 0,
      errors: {
        rejectedRows: [],
        rejectedScans: [],
      },
      csvSniff: {
        Delimiter: ",",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "city", type: "VARCHAR" }],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "dataset_1",
      },
      datasetId: CSV_DATASET_ID,
    },
    parseOptions: {
      type: "csv_file",
      numRowsToSkip: 0,
      delimiter: ",",
    },
  };
}

function _xlsxDataSourceMetadata(sheetNames: string[]): DataSourceMetadata {
  const columns = [_columnSchema("city", "VARCHAR")];
  return {
    sourceType: "xlsx_file",
    onlineStorageAllowed: true,
    sizeInBytes: 10,
    datasetLoadResult: {
      id: uuid(),
      type: "xlsx",
      tableName: "dataset_2",
      xlsxName: "dataset_2",
      numRows: 3,
      columns,
      sheet: sheetNames[0],
      datasetId: XLSX_DATASET_ID,
      availableSheetNames: sheetNames,
    },
    parseOptions: {
      type: "xlsx_file",
      sheetName: sheetNames[0],
      hasHeader: true,
      dateFormat: null,
      timestampFormat: null,
      numRowsToSkip: 0,
    },
  };
}

describe("DatasetImportForm", () => {
  beforeEach(() => {
    saveDatasetMock.mockReset();
  });

  it("reparse uses parse options edited immediately before the click", () => {
    const onRequestDataReparse = vi.fn();
    const initialMetadata = _csvDataSourceMetadata();
    const metadataWithColonDelimiter: CsvDataSourceMetadata = {
      ...initialMetadata,
      parseOptions: {
        type: "csv_file",
        numRowsToSkip: 0,
        delimiter: ":",
      },
    };

    function ControlledMetadataHarness(): JSX.Element {
      const [currentMetadata, setCurrentMetadata] =
        useState<DataSourceMetadata>(metadataWithColonDelimiter);

      return (
        <DatasetImportForm
          rows={[{ city: "LA" }]}
          initialDatasetName="cities.csv"
          onRequestDataReparse={onRequestDataReparse}
          onDataSourceMetadataChange={setCurrentMetadata}
          dataSourceMetadata={currentMetadata}
          parseOptions={currentMetadata.parseOptions}
        />
      );
    }

    render(
      <AvandarUiProvider>
        <ControlledMetadataHarness />
      </AvandarUiProvider>,
    );

    fireEvent.change(screen.getByLabelText("Delimiter"), {
      target: { value: "," },
    });
    fireEvent.change(screen.getByLabelText("Number of rows to skip"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process data again" }));

    expect(onRequestDataReparse).toHaveBeenCalledWith({
      type: "csv_file",
      numRowsToSkip: 1,
      delimiter: ",",
    });
  });

  it("renders CSV parse controls and updates metadata", () => {
    const onDataSourceMetadataChange = vi.fn();
    const metadata = _csvDataSourceMetadata();
    render(
      <AvandarUiProvider>
        <DatasetImportForm
          rows={[{ city: "LA" }]}
          initialDatasetName="cities.csv"
          onRequestDataReparse={vi.fn()}
          onDataSourceMetadataChange={onDataSourceMetadataChange}
          dataSourceMetadata={metadata}
          parseOptions={metadata.parseOptions}
        />
      </AvandarUiProvider>,
    );

    fireEvent.change(screen.getByLabelText("Delimiter"), {
      target: { value: ";" },
    });
    expect(onDataSourceMetadataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parseOptions: expect.objectContaining({
          delimiter: ";",
        }),
      }),
    );
  });

  it("disables sheet picker when xlsx has one sheet", () => {
    const metadata = _xlsxDataSourceMetadata(["Sheet1"]);
    render(
      <AvandarUiProvider>
        <DatasetImportForm
          rows={[{ city: "LA" }]}
          initialDatasetName="cities.xlsx"
          onRequestDataReparse={vi.fn()}
          onDataSourceMetadataChange={vi.fn()}
          dataSourceMetadata={metadata}
          parseOptions={metadata.parseOptions}
        />
      </AvandarUiProvider>,
    );

    expect(
      screen.getByLabelText("Sheet name", { selector: "input" }),
    ).toBeDisabled();
  });

  it("renders xlsx parse controls and updates header option", () => {
    const onDataSourceMetadataChange = vi.fn();
    const metadata = _xlsxDataSourceMetadata(["Sheet1", "Sheet2"]);
    render(
      <AvandarUiProvider>
        <DatasetImportForm
          rows={[{ city: "LA" }]}
          initialDatasetName="cities.xlsx"
          onRequestDataReparse={vi.fn()}
          onDataSourceMetadataChange={onDataSourceMetadataChange}
          dataSourceMetadata={metadata}
          parseOptions={metadata.parseOptions}
        />
      </AvandarUiProvider>,
    );

    expect(
      screen.getByLabelText("Sheet name", { selector: "input" }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByLabelText("The sheet has a header row"));
    expect(onDataSourceMetadataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parseOptions: expect.objectContaining({
          hasHeader: false,
        }),
      }),
    );
  });

  it("shows and hides offline-only warning while updating online storage metadata", () => {
    const onDataSourceMetadataChange = vi.fn();
    const metadata = _csvDataSourceMetadata();

    function ControlledMetadataHarness(): JSX.Element {
      const [currentMetadata, setCurrentMetadata] =
        useState<DataSourceMetadata>(metadata);

      return (
        <DatasetImportForm
          rows={[{ city: "LA" }]}
          initialDatasetName="cities.csv"
          onRequestDataReparse={vi.fn()}
          onDataSourceMetadataChange={(nextMetadata) => {
            onDataSourceMetadataChange(nextMetadata);
            setCurrentMetadata(nextMetadata);
          }}
          dataSourceMetadata={currentMetadata}
          parseOptions={currentMetadata.parseOptions}
        />
      );
    }

    render(
      <AvandarUiProvider>
        <ControlledMetadataHarness />
      </AvandarUiProvider>,
    );

    const warningRegex = /This dataset will no longer be stored online/i;
    const onlineStorageCheckbox = screen.getByLabelText(
      /This dataset can be stored in the cloud/i,
    );

    expect(screen.queryByText(warningRegex)).not.toBeInTheDocument();

    fireEvent.click(onlineStorageCheckbox);

    expect(screen.getByText(warningRegex)).toBeInTheDocument();
    expect(onDataSourceMetadataChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onlineStorageAllowed: false,
      }),
    );

    fireEvent.click(onlineStorageCheckbox);

    expect(screen.queryByText(warningRegex)).not.toBeInTheDocument();
    expect(onDataSourceMetadataChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onlineStorageAllowed: true,
      }),
    );
  });
});
