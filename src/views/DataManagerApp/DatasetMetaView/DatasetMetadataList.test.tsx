import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { render, screen } from "@/test-utils";
import { DatasetMetadataList } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetadataList";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ComponentProps, ReactNode } from "react";

const NOW = "2026-11-13T00:00:00.000Z";
const DATASET_ID = uuid<Dataset.Id>();

function makeColumn(
  name: string,
  description: string | undefined,
  columnIdx: number,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: DATASET_ID,
    workspaceId: uuid(),
    createdAt: NOW,
    updatedAt: NOW,
    name,
    originalName: name,
    originalDataType: "BIGINT",
    dataType: "bigint",
    detectedDataType: "BIGINT",
    description,
    columnIdx,
  });
}

function makeCodes(datasetColumnId: string): ColumnCodes.T {
  return {
    datasetColumnId,
    dictionaryId: "dict-1",
    dictionaryName: "NYS codes",
    entryName: "sex",
    codeListName: "Sex (1/2/9)",
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    description: "Sex recorded on the case report.",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    ],
  };
}

const GENDER = makeColumn("GENDER", undefined, 0);
const SEX_AT_BIRTH = makeColumn("SEX_AT_BIRTH", "Sex assigned at birth.", 1);

const DATASET = {
  id: DATASET_ID,
  columns: [GENDER, SEX_AT_BIRTH],
  source: undefined,
} as unknown as ComponentProps<typeof DatasetMetadataList>["dataset"];

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function getDescriptionCell(columnName: string): HTMLElement {
  const row = screen.getByRole("row", { name: new RegExp(columnName) });
  const headers = screen.getAllByRole("columnheader");
  const descriptionIdx = headers.findIndex((header) => {
    return header.textContent === "Description";
  });
  return within(row).getAllByRole("cell")[descriptionIdx]!;
}

describe("DatasetMetadataList", () => {
  const columnCodesByName = new Map([
    ["GENDER", makeCodes(GENDER.id)],
    ["SEX_AT_BIRTH", makeCodes(SEX_AT_BIRTH.id)],
  ]);

  it("shows a bound entry's description in the Description column of a column with none", () => {
    render(
      <DatasetMetadataList
        dataset={DATASET}
        columnCodesByName={columnCodesByName}
      />,
      { wrapper: QueryWrapper },
    );

    const descriptionCell = getDescriptionCell("GENDER");
    expect(
      within(descriptionCell).getByText("Sex recorded on the case report."),
    ).toBeInTheDocument();
    expect(
      within(descriptionCell).getByText("From NYS codes"),
    ).toBeInTheDocument();
  });

  it("lets a column's own description win", () => {
    render(
      <DatasetMetadataList
        dataset={DATASET}
        columnCodesByName={columnCodesByName}
      />,
      { wrapper: QueryWrapper },
    );

    const descriptionCell = getDescriptionCell("SEX_AT_BIRTH");
    expect(descriptionCell).toHaveTextContent("Sex assigned at birth.");
    expect(
      within(descriptionCell).queryByText("Sex recorded on the case report."),
    ).toBeNull();
  });
});
