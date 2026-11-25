import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { describe, expect, it } from "vitest";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { compileCrosswalk } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraftT } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft.types";

/*
 * The combined dataset's SQL, compiled from three layouts and run on real
 * DuckDB. Kings has two datasets, one with a hostile name; Queens codes sex
 * with a second list; Bronx holds sex as labels and builds its case id with
 * a Combine expression.
 */

const KINGS_MARCH = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const KINGS_HOSTILE = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const QUEENS = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const BRONX = "44444444-4444-4444-8444-444444444444" as Dataset.Id;

const LIST_129 =
  "55555555-5555-4555-8555-555555555555" as DataDictionaryCodeList.Id;
const LIST_MFU =
  "66666666-6666-4666-8666-666666666666" as DataDictionaryCodeList.Id;
const ENTRY_SEX =
  "77777777-7777-4777-8777-777777777777" as DataDictionaryEntry.Id;

/** Each dataset as a table named by its id, the way QETL registers it. */
const TABLES_SQL = [
  `CREATE TABLE "${KINGS_MARCH}" AS SELECT * FROM (VALUES
    ('K1', 1, '03/02/2026', 501, 24),
    ('K2', 2, '13/45/2026', 10451, 6)
  ) AS t("CaseNo", "GENDER", onset_dt, zip, age_mo)`,
  `CREATE TABLE "${KINGS_HOSTILE}" AS SELECT * FROM (VALUES
    ('K3', 9, '04/01/2026', 1234567, 18)
  ) AS t(caseno, gender, "ONSET_DT", zip, age_mo)`,
  `CREATE TABLE "${QUEENS}" AS SELECT * FROM (VALUES
    ('Q1', 'M', DATE '2026-03-05', '11368'),
    ('Q2', 'X', DATE '2026-03-06', '11101')
  ) AS t(case_id, sex, rash_onset, zip_code)`,
  `CREATE TABLE "${BRONX}" AS SELECT * FROM (VALUES
    (7, 2026, ' female '),
    (8, 2026, 'Male')
  ) AS t("Case No", "Year", sex)`,
];

function _pair(code: string, label: string): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing: false };
}

const CODE_LISTS: CrosswalkSql.CodeLists = {
  codeListsById: new Map([
    [
      LIST_129,
      {
        pairs: [
          _pair("1", "Male"),
          _pair("2", "Female"),
          _pair("9", "Unknown"),
        ],
      },
    ],
    [
      LIST_MFU,
      {
        pairs: [_pair("M", "Male"), _pair("F", "Female"), _pair("X", "Other")],
      },
    ],
  ]),
  primaryCodeListIdByEntryId: new Map([
    [ENTRY_SEX as string, LIST_129 as string],
  ]),
};

function _column(
  name: string,
  dataType: CrosswalkSql.Column["dataType"],
  entryId?: DataDictionaryEntry.Id,
): CrosswalkSql.Column {
  return { id: `col-${name}` as CrosswalkColumn.Id, name, dataType, entryId };
}

function _columnFill(
  sourceColumn: string,
  changes: Partial<Extract<CrosswalkMapping.Fill, { kind: "column" }>> = {},
): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
    ...changes,
  };
}

function _layout(
  layoutId: string,
  datasets: CrosswalkSql.Layout["datasets"],
  fills: Record<string, CrosswalkMapping.Fill>,
): CrosswalkSql.Layout {
  return {
    layoutId: layoutId as CrosswalkLayout.Id,
    datasets,
    fillsByColumnId: new Map(
      Object.entries(fills).map(([name, fill]) => {
        return [`col-${name}`, fill] as const;
      }),
    ),
  };
}

const LAYOUTS = [
  _layout(
    "layout-kings",
    [
      { id: KINGS_MARCH, name: "Kings 2026-03" },
      { id: KINGS_HOSTILE, name: "Kings O'Brien $& --" },
    ],
    {
      case_id: _columnFill("CaseNo"),
      sex: _columnFill("GENDER", { codeListId: LIST_129 }),
      rash_onset_date: _columnFill("onset_dt", {
        convert: { kind: "parse_date", format: "%m/%d/%Y" },
      }),
      zip: _columnFill("zip", { convert: { kind: "pad_text", length: 5 } }),
      age_years: _columnFill("age_mo", {
        convert: { kind: "multiply", factor: 1 / 12 },
      }),
      county: { kind: "constant", value: "Kings" },
    },
  ),
  _layout("layout-queens", [{ id: QUEENS, name: "Queens 2026-03" }], {
    case_id: _columnFill("case_id"),
    sex: _columnFill("sex", { codeListId: LIST_MFU }),
    rash_onset_date: _columnFill("rash_onset"),
    zip: _columnFill("zip_code"),
    county: { kind: "constant", value: "Queens" },
    outbreak_associated: { kind: "empty" },
  }),
  _layout("layout-bronx", [{ id: BRONX, name: "Bronx 2026-03" }], {
    case_id: { kind: "expression", sql: "concat({Case No}, '-', {year})" },
    sex: _columnFill("sex", { codeListId: LIST_129, holdsLabels: true }),
  }),
];

function _compile(codesOutputAs: "labels" | "codes"): CrosswalkSql.Output {
  return CrosswalkSql.compile({
    ...CODE_LISTS,
    codesOutputAs,
    sourceColumnName: "source_dataset",
    columns: [
      _column("case_id", "varchar"),
      _column(
        "sex",
        codesOutputAs === "labels" ? "varchar" : "bigint",
        ENTRY_SEX,
      ),
      _column("rash_onset_date", "date"),
      _column("zip", "varchar"),
      _column("age_years", "double"),
      _column("county", "varchar"),
      _column("outbreak_associated", "boolean"),
    ],
    layouts: LAYOUTS,
  });
}

type CombinedRead = {
  rows: Array<Record<string, unknown>>;
  types: Record<string, string>;
};

async function _readCombined(sql: string): Promise<CombinedRead> {
  return await withDuckDb(async (connection) => {
    for (const tableSql of TABLES_SQL) {
      await connection.run(tableSql);
    }
    await connection.run(`CREATE VIEW combined AS ${sql}`);
    const rows = await connection.runAndReadAll(
      `SELECT * FROM combined ORDER BY case_id`,
    );
    const described = await connection.runAndReadAll(
      `SELECT column_name, column_type FROM (DESCRIBE combined)`,
    );
    return {
      rows: rows.getRowObjectsJson() as Array<Record<string, unknown>>,
      types: Object.fromEntries(
        described.getRowObjectsJson().map((row) => {
          return [String(row.column_name), String(row.column_type)];
        }),
      ),
    };
  });
}

describe("CrosswalkSql.compile on DuckDB", () => {
  it("stacks every layout into the combined columns, in labels mode", async () => {
    const { rows } = await _readCombined(_compile("labels").sql);

    expect(rows).toEqual([
      {
        source_dataset: "Bronx 2026-03",
        case_id: "7-2026",
        sex: "Female",
        rash_onset_date: null,
        zip: null,
        age_years: null,
        county: null,
        outbreak_associated: null,
      },
      {
        source_dataset: "Bronx 2026-03",
        case_id: "8-2026",
        sex: "Male",
        rash_onset_date: null,
        zip: null,
        age_years: null,
        county: null,
        outbreak_associated: null,
      },
      {
        source_dataset: "Kings 2026-03",
        case_id: "K1",
        sex: "Male",
        rash_onset_date: "2026-03-02",
        zip: "00501",
        age_years: 2,
        county: "Kings",
        outbreak_associated: null,
      },
      {
        source_dataset: "Kings 2026-03",
        case_id: "K2",
        sex: "Female",
        rash_onset_date: null,
        zip: "10451",
        age_years: 0.5,
        county: "Kings",
        outbreak_associated: null,
      },
      {
        source_dataset: "Kings O'Brien $& --",
        case_id: "K3",
        sex: "Unknown",
        rash_onset_date: "2026-04-01",
        zip: "1234567",
        age_years: 1.5,
        county: "Kings",
        outbreak_associated: null,
      },
      {
        source_dataset: "Queens 2026-03",
        case_id: "Q1",
        sex: "Male",
        rash_onset_date: "2026-03-05",
        zip: "11368",
        age_years: null,
        county: "Queens",
        outbreak_associated: null,
      },
      {
        source_dataset: "Queens 2026-03",
        case_id: "Q2",
        sex: "Other",
        rash_onset_date: "2026-03-06",
        zip: "11101",
        age_years: null,
        county: "Queens",
        outbreak_associated: null,
      },
    ]);
  });

  it("types every column as the crosswalk says", async () => {
    const { types } = await _readCombined(_compile("labels").sql);

    expect(types).toEqual({
      source_dataset: "VARCHAR",
      case_id: "VARCHAR",
      sex: "VARCHAR",
      rash_onset_date: "DATE",
      zip: "VARCHAR",
      age_years: "DOUBLE",
      county: "VARCHAR",
      outbreak_associated: "BOOLEAN",
    });
  });

  it("reconciles every coding to the primary codes in codes mode, emptying a code with no counterpart", async () => {
    const { rows, types } = await _readCombined(_compile("codes").sql);

    expect(
      rows.map((row) => {
        return [row.case_id, row.sex];
      }),
    ).toEqual([
      ["7-2026", "2"],
      ["8-2026", "1"],
      ["K1", "1"],
      ["K2", "2"],
      ["K3", "9"],
      ["Q1", "1"],
      ["Q2", null],
    ]);
    expect(types.sex).toBe("BIGINT");
  });
});

/** Runs `setupSql`, then `sql`, and reads every row as a JSON object. */
async function _readRows(
  setupSql: readonly string[],
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    for (const statement of setupSql) {
      await connection.run(statement);
    }
    const reader = await connection.runAndReadAll(sql);
    return reader.getRowObjectsJson() as Array<Record<string, unknown>>;
  });
}

/** A one-layout draft that fills `case_id` from the layout's `CaseNo`. */
function _singleLayoutDraft(options: {
  columns: CrosswalkDraftT["columns"];
  fills: Record<string, CrosswalkMapping.Fill>;
  datasetIds: readonly string[];
  columnNames: readonly string[];
}): CrosswalkDraftT {
  const layoutId = "layout-1" as CrosswalkLayout.Id;
  return {
    crosswalkId: "crosswalk-1" as Crosswalk.Id,
    isSaved: true,
    name: "Executed",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: false,
    outputDatasetId: undefined,
    columns: options.columns,
    layouts: [
      {
        id: layoutId,
        key: CrosswalkLayout.buildLayoutKey(options.columnNames),
        signature: CrosswalkLayout.buildSignature(options.columnNames),
        columnNames: options.columnNames,
        isReference: true,
        status: "mapped",
        datasetIds: options.datasetIds as Dataset.Id[],
      },
    ],
    mappings: {
      [layoutId]: Object.fromEntries(
        Object.entries(options.fills).map(([columnId, fill]) => {
          return [
            columnId,
            {
              id: `mapping-${columnId}` as CrosswalkMapping.Id,
              fill,
              status: "confirmed" as const,
              confidence: undefined,
              reason: undefined,
            },
          ];
        }),
      ),
    },
  };
}

describe("space-padded column names on DuckDB", () => {
  const PADDED = "88888888-8888-4888-8888-888888888881";
  const PLAIN = "88888888-8888-4888-8888-888888888882";
  const TABLES = [
    `CREATE TABLE "${PLAIN}" AS SELECT 'P1' AS "CaseNo"`,
    `CREATE TABLE "${PADDED}" AS SELECT 'S1' AS "CaseNo "`,
  ];

  it("keeps `CaseNo ` apart from CaseNo when stacking, so layouts must not merge them", async () => {
    const rows = await _readRows(
      TABLES,
      `SELECT * FROM "${PLAIN}" UNION ALL BY NAME SELECT * FROM "${PADDED}"`,
    );

    expect(Object.keys(rows[0] ?? {})).toEqual(["CaseNo", "CaseNo "]);
  });

  it("groups the two spellings into two layouts that each stack their own", async () => {
    const datasets: CrosswalkLayout.Dataset[] = [
      {
        id: PLAIN as Dataset.Id,
        name: "Plain",
        columns: [{ name: "CaseNo", dataType: "varchar" }],
      },
      {
        id: PADDED as Dataset.Id,
        name: "Padded",
        columns: [{ name: "CaseNo ", dataType: "varchar" }],
      },
    ];
    const groups = CrosswalkLayout.groupDatasetsByLayout(datasets);
    const output = CrosswalkSql.compile({
      ...CODE_LISTS,
      codesOutputAs: "labels",
      sourceColumnName: undefined,
      columns: [_column("case_id", "varchar")],
      layouts: groups.map((group, index) => {
        return _layout(
          `layout-${index}`,
          group.datasetIds.map((id) => {
            return { id, name: id === PLAIN ? "Plain" : "Padded" };
          }),
          { case_id: _columnFill(group.columnNames[0] ?? "") },
        );
      }),
    });
    const rows = await _readRows(
      TABLES,
      `SELECT * FROM (${output.sql}) ORDER BY case_id`,
    );

    expect(groups).toHaveLength(2);
    expect(rows).toEqual([{ case_id: "P1" }, { case_id: "S1" }]);
  });
});

describe("stacking datasets that type a column differently on DuckDB", () => {
  const IDS = {
    bigint: "99999999-9999-4999-8999-999999999991",
    double: "99999999-9999-4999-8999-999999999992",
    date: "99999999-9999-4999-8999-999999999993",
    text: "99999999-9999-4999-8999-999999999994",
  };
  const TABLES = [
    `CREATE TABLE "${IDS.bigint}" AS SELECT 1::BIGINT AS cnt`,
    `CREATE TABLE "${IDS.double}" AS SELECT 2.5::DOUBLE AS cnt`,
    `CREATE TABLE "${IDS.date}" AS SELECT DATE '2026-03-02' AS cnt`,
    `CREATE TABLE "${IDS.text}" AS SELECT '7' AS cnt`,
  ];

  function _typed(
    id: string,
    name: string,
    dataType: AvaDataType.T,
  ): CrosswalkLayout.Dataset {
    return { id: id as Dataset.Id, name, columns: [{ name: "cnt", dataType }] };
  }

  const DATASETS = [
    _typed(IDS.bigint, "A bigint", "bigint"),
    _typed(IDS.double, "B double", "double"),
    _typed(IDS.date, "C date", "date"),
    _typed(IDS.text, "D text", "varchar"),
  ];

  function _compileTyped(): ReturnType<typeof compileCrosswalk> {
    return compileCrosswalk({
      draft: _singleLayoutDraft({
        columns: [
          {
            id: "col-cnt" as CrosswalkColumn.Id,
            name: "cnt",
            position: 0,
            dataType: "double",
            entryId: undefined,
          },
        ],
        fills: { "col-cnt": _columnFill("cnt") },
        datasetIds: DATASETS.map((dataset) => {
          return dataset.id;
        }),
        columnNames: ["cnt"],
      }),
      datasetsById: new Map(
        DATASETS.map((dataset) => {
          return [dataset.id as string, dataset] as const;
        }),
      ),
      entriesById: new Map<string, DictionaryMatch.Entry>(),
    });
  }

  it("fails on DuckDB when an incompatible dataset is stacked in", async () => {
    await expect(
      _readRows(
        TABLES,
        `SELECT cnt FROM (SELECT * FROM "${IDS.bigint}" UNION ALL BY NAME SELECT * FROM "${IDS.date}")`,
      ),
    ).rejects.toThrow();
  });

  it("stacks numbers and text, and leaves the date dataset out with a problem", async () => {
    const result = _compileTyped();

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }
    const rows = await _readRows(
      TABLES,
      `SELECT * FROM (${result.sql}) ORDER BY cnt`,
    );

    expect(result.includedDatasetIds).toEqual([
      IDS.bigint,
      IDS.double,
      IDS.text,
    ]);
    expect(result.problems).toContainEqual({
      kind: "column_types_differ",
      datasetId: IDS.date,
      datasetName: "C date",
    });
    expect(rows).toEqual([{ cnt: 1 }, { cnt: 2.5 }, { cnt: 7 }]);
  });
});

describe("hostile text on DuckDB", () => {
  const HOSTILE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const COLUMN_NAME = `it's $& -- "x"`;
  const DATE_FORMAT = "%m'%d--%Y$&";
  const CONSTANT = `it's $& -- ok`;
  const LABEL = `O'Brien $& --`;
  const HOSTILE_LIST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("keeps a quote, $& and -- in a column name, a constant, a date format, and a label as data", async () => {
    const output = CrosswalkSql.compile({
      codeListsById: new Map([
        [
          HOSTILE_LIST,
          { pairs: [{ ..._pair("1", LABEL) }, { ..._pair("2", "Other") }] },
        ],
      ]),
      primaryCodeListIdByEntryId: new Map(),
      codesOutputAs: "labels",
      sourceColumnName: undefined,
      columns: [
        _column("name_out", "varchar"),
        _column("when_out", "date"),
        _column("const_out", "varchar"),
        _column("coded_out", "varchar"),
        _column("expr_out", "varchar"),
      ],
      layouts: [
        _layout(
          "layout-hostile",
          [{ id: HOSTILE as Dataset.Id, name: LABEL }],
          {
            name_out: _columnFill(COLUMN_NAME),
            when_out: _columnFill("when", {
              convert: { kind: "parse_date", format: DATE_FORMAT },
            }),
            const_out: { kind: "constant", value: CONSTANT },
            coded_out: _columnFill("code", {
              codeListId: HOSTILE_LIST as DataDictionaryCodeList.Id,
            }),
            expr_out: { kind: "expression", sql: `{${COLUMN_NAME}} || '--'` },
          },
        ),
      ],
    });
    const rows = await _readRows(
      [
        `CREATE TABLE "${HOSTILE}" AS SELECT ${quoteSqlLiteral("row $&")} AS ${quoteSqlIdentifier(COLUMN_NAME)}, ${quoteSqlLiteral("03'02--2026$&")} AS "when", '1' AS code`,
      ],
      `SELECT * FROM (${output.sql})`,
    );

    expect(rows).toEqual([
      {
        name_out: "row $&",
        when_out: "2026-03-02",
        const_out: CONSTANT,
        coded_out: LABEL,
        expr_out: "row $&--",
      },
    ]);
  });
});
