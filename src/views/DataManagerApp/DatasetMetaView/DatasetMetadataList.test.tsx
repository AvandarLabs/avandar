import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen } from "@/test-utils";
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

/** A column's codes, as `ColumnCodes.fromRows` returns them. */
function makeCodes(overrides: Partial<ColumnCodes.T> = {}): ColumnCodes.T {
  return {
    datasetColumnId: "col-gender",
    dictionaryId: "dict-nys",
    dictionaryName: "NYS codes",
    entryName: "sex",
    codeListName: "Sex (1/2/9)",
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ],
    isPinned: false,
    appliedDictionaryVersion: 1,
    currentDictionaryVersion: 1,
    isSourceDeleted: false,
    keepsOriginal: false,
    description: "Sex recorded on the case report.",
    ...overrides,
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

function getTypeCell(columnName: string): HTMLElement {
  const row = screen.getByRole("row", { name: new RegExp(columnName) });
  const headers = screen.getAllByRole("columnheader");
  const typeIdx = headers.findIndex((header) => {
    return header.textContent === "Type";
  });
  return within(row).getAllByRole("cell")[typeIdx]!;
}

describe("DatasetMetadataList", () => {
  const columnCodesByName = new Map([
    ["GENDER", makeCodes({ datasetColumnId: GENDER.id })],
    ["SEX_AT_BIRTH", makeCodes({ datasetColumnId: SEX_AT_BIRTH.id })],
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

  it("says which dictionary set a converted column's type", () => {
    render(
      <DatasetMetadataList
        dataset={DATASET}
        columnCodesByName={
          new Map([
            [
              "GENDER",
              makeCodes({
                datasetColumnId: GENDER.id,
                mode: "convert",
                direction: "encode",
              }),
            ],
          ])
        }
      />,
      { wrapper: QueryWrapper },
    );

    expect(getTypeCell("GENDER")).toHaveTextContent("Set by NYS codes");
    expect(getTypeCell("SEX_AT_BIRTH")).not.toHaveTextContent("Set by");
  });

  it("keeps a converted column's type out of the row's edit form", () => {
    render(
      <DatasetMetadataList
        dataset={DATASET}
        columnCodesByName={
          new Map([
            [
              "GENDER",
              makeCodes({
                datasetColumnId: GENDER.id,
                mode: "convert",
                direction: "encode",
              }),
            ],
          ])
        }
      />,
      { wrapper: QueryWrapper },
    );
    const row = screen.getByRole("row", { name: /GENDER/ });

    fireEvent.click(within(row).getByRole("button", { name: /Edit/ }));

    expect(getTypeCell("GENDER")).toHaveTextContent("Set by NYS codes");
    expect(within(getTypeCell("GENDER")).queryByRole("textbox")).toBeNull();
  });
});
