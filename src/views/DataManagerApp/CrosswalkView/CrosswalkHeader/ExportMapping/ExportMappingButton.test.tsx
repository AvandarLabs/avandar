import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { ExportMappingButton } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/ExportMappingButton";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

const mocks = vi.hoisted(() => {
  return { downloadTextFile: vi.fn() };
});

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/downloadTextFile",
  () => {
    return { downloadTextFile: mocks.downloadTextFile };
  },
);

const KINGS = "layout-kings" as CrosswalkLayout.Id;
const QUEENS = "layout-queens" as CrosswalkLayout.Id;
const CASE_ID = "column-case-id" as CrosswalkColumn.Id;
const SEX = "column-sex" as CrosswalkColumn.Id;
const SEX_129 = "list-sex-129" as DataDictionaryCodeList.Id;
const SEX_ENTRY = "entry-sex" as DataDictionaryEntry.Id;
const KINGS_DATASET = "dataset-kings-03" as Dataset.Id;
const QUEENS_DATASET = "dataset-queens-03" as Dataset.Id;

function _mapping(
  fill: CrosswalkMapping.Fill,
  status: CrosswalkMapping.Status,
): CrosswalkDraft.Mapping {
  return {
    id: `mapping-${JSON.stringify(fill)}` as CrosswalkMapping.Id,
    fill,
    status,
    confidence: undefined,
    reason: undefined,
  };
}

function _layout(
  id: CrosswalkLayout.Id,
  datasetIds: readonly Dataset.Id[],
  overrides: Partial<CrosswalkDraft.Layout> = {},
): CrosswalkDraft.Layout {
  return {
    id,
    key: id,
    signature: `l1.${id}`,
    columnNames: [],
    isReference: false,
    status: "review",
    datasetIds,
    ...overrides,
  };
}

function _makeDraft(
  overrides: Partial<CrosswalkDraft.T> = {},
): CrosswalkDraft.T {
  return {
    crosswalkId: "crosswalk-1" as Crosswalk.Id,
    isSaved: true,
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [
      {
        id: CASE_ID,
        name: "case_id",
        position: 0,
        dataType: "varchar",
        entryId: undefined,
      },
      {
        id: SEX,
        name: "sex",
        position: 1,
        dataType: "varchar",
        entryId: SEX_ENTRY,
      },
    ],
    layouts: [
      _layout(KINGS, [KINGS_DATASET], { isReference: true, status: "mapped" }),
      _layout(QUEENS, [QUEENS_DATASET]),
    ],
    mappings: {
      [KINGS]: {
        [CASE_ID]: _mapping(
          {
            kind: "column",
            sourceColumn: "CaseNo",
            convert: undefined,
            codeListId: undefined,
            holdsLabels: false,
          },
          "confirmed",
        ),
        [SEX]: _mapping(
          {
            kind: "column",
            sourceColumn: "GENDER",
            convert: undefined,
            codeListId: SEX_129,
            holdsLabels: false,
          },
          "confirmed",
        ),
      },
      [QUEENS]: {
        [CASE_ID]: _mapping(
          {
            kind: "column",
            sourceColumn: "case id",
            convert: { kind: "trim_and_fix_case", letterCase: "upper" },
            codeListId: undefined,
            holdsLabels: false,
          },
          "suggested",
        ),
      },
    },
    ...overrides,
  };
}

const SEX_ENTRY_MATCH: DictionaryMatch.Entry = {
  dictionaryId: "dictionary-1" as DataDictionary.Id,
  dictionaryRank: 0,
  entryId: SEX_ENTRY,
  entryName: "sex",
  columnNames: ["GENDER"],
  kind: "categorical",
  position: 0,
  codeLists: [{ id: SEX_129, name: "Sex (1/2/9)", pairs: [] }],
};

function _makeContext(kingsName = "Kings line list 2026-03"): CrosswalkContext {
  return {
    datasetsById: new Map([
      [KINGS_DATASET, { id: KINGS_DATASET, name: kingsName, columns: [] }],
      [
        QUEENS_DATASET,
        { id: QUEENS_DATASET, name: "Queens, March", columns: [] },
      ],
    ]),
    entriesById: new Map([[SEX_ENTRY, SEX_ENTRY_MATCH]]),
  };
}

function _exportedText(): string {
  return (mocks.downloadTextFile.mock.calls[0]?.[0] as { text: string }).text;
}

describe("ExportMappingButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("downloads every dataset's mapping as a CSV named after the crosswalk", () => {
    render(
      <ExportMappingButton draft={_makeDraft()} context={_makeContext()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));

    expect(mocks.downloadTextFile).toHaveBeenCalledWith({
      text: [
        "\uFEFFLayout,Dataset,Column of the combined dataset,How it is filled,Filled from,Change to the values,Code list,Status",
        "Kings line list 2026-03 (reference),Kings line list 2026-03,case_id,A column,CaseNo,,,Confirmed",
        "Kings line list 2026-03 (reference),Kings line list 2026-03,sex,A column,GENDER,Translate source values,Sex (1/2/9),Confirmed",
        '"Queens, March","Queens, March",case_id,A column,case id,"Trim spaces, UPPERCASE",,Suggested',
        '"Queens, March","Queens, March",sex,Not filled yet,,,,Not filled yet',
      ].join("\r\n"),
      fileName: "Measles line lists mapping.csv",
      mimeType: "text/csv;charset=utf-8",
    });
  });

  it("replaces the characters a file name cannot hold", () => {
    render(
      <ExportMappingButton
        draft={_makeDraft({ name: 'Kings/Queens: "March"' })}
        context={_makeContext()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));

    expect(mocks.downloadTextFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "Kings-Queens- -March- mapping.csv",
      }),
    );
  });

  it("keeps a dataset name a spreadsheet would run as a formula as text", () => {
    render(
      <ExportMappingButton
        draft={_makeDraft()}
        context={_makeContext("=SUM(A1:A9)")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));

    expect(_exportedText()).toContain(`,"'=SUM(A1:A9)",case_id,`);
  });

  it("keeps a value a spreadsheet would run after leading spaces, or that starts with a line break, as text", () => {
    render(
      <ExportMappingButton
        draft={_makeDraft()}
        context={_makeContext("  =SUM(A1:A9)")}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));
    expect(_exportedText()).toContain(`,"'  =SUM(A1:A9)",case_id,`);

    mocks.downloadTextFile.mockClear();
    cleanup();
    render(
      <ExportMappingButton
        draft={_makeDraft()}
        context={_makeContext("\n=1+1")}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));
    expect(_exportedText()).toContain(`,"'\n=1+1",case_id,`);
  });

  it("does not touch a value that only contains a formula character", () => {
    render(
      <ExportMappingButton
        draft={_makeDraft()}
        context={_makeContext("Kings - March")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));

    expect(_exportedText()).toContain(",Kings - March,case_id,");
  });

  it("keeps a multi-line value that starts like a formula as text", () => {
    const base = _makeDraft();
    const draft = _makeDraft({
      mappings: {
        ...base.mappings,
        [KINGS]: {
          ...base.mappings[KINGS],
          [CASE_ID]: _mapping(
            { kind: "constant", value: "=1+1\nx" },
            "confirmed",
          ),
        },
      },
    });
    render(
      <ExportMappingButton draft={draft} context={_makeContext("=1+1\nx")} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mapping" }));

    const text = _exportedText();
    expect(text).toContain(`"'=1+1\nx",case_id,A fixed value,"'=1+1\nx"`);
    expect(text).not.toMatch(/,"=1\+1\nx"/);
  });

  it("is disabled while the crosswalk has no dataset", () => {
    render(
      <ExportMappingButton
        draft={_makeDraft({
          layouts: [
            _layout(KINGS, [], { isReference: true, status: "mapped" }),
          ],
        })}
        context={_makeContext()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Export mapping" }),
    ).toBeDisabled();
  });
});
