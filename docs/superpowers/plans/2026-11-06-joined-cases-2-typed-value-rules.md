# Joined Cases 2: Typed Value Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every value rule emit a declared type (umbrella §3.3), make every authoring path offer only the rules a column's type allows and store the rule's output type as the field's `data_type`, refuse a stale disallowed rule at planning time, and correct existing rows with a data migration.

**Architecture:** A pure `ValuePickerRule` module in `shared/` holds the rule table and is imported by the browser and the Deno edge function. The concept view stops casting `max`, `min`, and `count` to `DOUBLE`. The chat parser, `createdCaseTypeToFormValues`, the draft card, and the concept creator form all go through `ValuePickerRule`. The query planner throws on a rule its column's current type disallows. A hand-written migration rewrites disallowed stored rules to `most_frequent` and sets every dataset-column field's `data_type` to its output type.

**Tech Stack:** TypeScript, `ts-pattern`, Vitest, DuckDB (QETL executed tests), Deno edge functions, React, Mantine, Lingui, Postgres (hand-written data migration, migration upgrade test).

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-2-typed-value-rules-design.md`. Section numbers (§) below refer to it unless they say "umbrella". **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`. Every ground rule there applies to every task here.

**Prerequisite:** plan 1 (`2026-11-06-joined-cases-1-record-page-concept-view.md`) has landed on `feat/joined-cases`:

- `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` exists, replaces `getSQLSelectOfMapping`, quotes identifiers with `quoteSqlIdentifier`, and every rule ignores NULLs.
- Both arms of `ConceptAttributeColumn` carry `attributeId: ConceptAttribute.Id`.
- The record page reads the concept view.

---

## Required skills

- **`test-driven-development`** throughout.
- **`supabase-declarative-schema`** before Task 9, for its hand-written migration rules. This plan edits no file under `supabase/schemas/`.
- Not `impeccable`: the draft card and the form only change which options a select lists and two labels. No surface is new or replaced.

## Database command rule

Every step that runs `pnpm db:reset`, `pnpm test:db`, or `supabase migration new` starts with:

```bash
ava supabase status
```

Expected: the first line says this branch is on a switched local Supabase database and names the `feat-joined-cases` project. If it says `This is the develop local Supabase`, stop and run `ava supabase switch`. If `ava` is missing, run `pnpm build:ava-cli`.

## No schema change

G2 changes data, not structure. There is no generated migration, no `pnpm db:new-migration`, no `pnpm db:gen-types`, and no desktop SQLite migration. The one migration is hand-written DML (Task 9).

## File map

| File | Responsibility |
| --- | --- |
| `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts` (new) | Public entry: `ValuePickerRule` values and the `ValuePickerRule.T` type |
| `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts` (new) and its test | The rule table (§4.1) |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (from plan 1) | `_buildReducedValueSql`: `count`, `max`, `min` stop casting |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts` | View column types, ties, NULLs |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Planning-time refusal of a disallowed rule |
| `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts` | Its tests |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` and test | Hold proposed rules to catalog column types |
| `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts` and test | Pass the catalog columns to the parser |
| `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts` and test | Same, required |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts` | Hands `schema.columns` over |
| `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts`, `makeChatToolConfigFromOptions.ts` and tests | Rule guidance for the model |
| `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` and test | Allowed rule and output type for every chat-created field |
| `src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts`, `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftBlock.tsx`, `CaseTypeDraftBlock.test.tsx` | Per-row allowed options in the draft card |
| `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts` and test | `getDatasetColumnAttributeDataType`, `withFieldDataTypes` |
| `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx` | `transformValues` stores field data types |
| `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`, `index.tsx`, new `DatasetColumnMappingCreator.test.tsx` | Allowed options in the form |
| `supabase/migrations/<ts>_correct_value_rule_data_types.sql` (new, hand-written) | Data migration (§4.8) |
| `supabase/migration-upgrade-tests/value_rule_data_types.{prelude,assertions}.sql` (new) | Its replay |
| `scripts/test-dashboard-publishing-migrations.sh` | Runs the replay |
| `src/i18n/locales/*` (generated) | Four new strings |
| `docs/ontology-architecture.md` | Typed rules |

---

## Task 1: The `ValuePickerRule` module

**Files:**
- Create: `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts`
- Create: `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts`
- Test: `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.test.ts`

Spec §4.1, umbrella §3.3 and §6.

- [ ] **Step 1: Write the failing test**

Create `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";

/**
 * The rule table that the authoring paths, the query planner, and the data
 * migration all agree on. Cases run every column type, because a table that
 * is right only for the types someone thought of is not the table.
 */
describe("ValuePickerRule.getOutputDataType", () => {
  it.each(AvaDataType.Types)(
    "keeps a %s column's type under first, most frequent, max, and min",
    (columnDataType) => {
      const outputDataTypes = (
        ["first", "most_frequent", "max", "min"] as const
      ).map((ruleType) => {
        return ValuePickerRule.getOutputDataType({ ruleType, columnDataType });
      });

      expect(outputDataTypes).toEqual([
        columnDataType,
        columnDataType,
        columnDataType,
        columnDataType,
      ]);
    },
  );

  it.each(["bigint", "double"] as const)(
    "emits a decimal for the sum and average of a %s column",
    (columnDataType) => {
      expect(
        ValuePickerRule.getOutputDataType({ ruleType: "sum", columnDataType }),
      ).toBe("double");
      expect(
        ValuePickerRule.getOutputDataType({ ruleType: "avg", columnDataType }),
      ).toBe("double");
    },
  );

  it.each(AvaDataType.Types)(
    "emits a whole number for the count of a %s column",
    (columnDataType) => {
      expect(
        ValuePickerRule.getOutputDataType({ ruleType: "count", columnDataType }),
      ).toBe("bigint");
    },
  );
});

describe("ValuePickerRule.getAllowedRuleTypes", () => {
  const EVERY_RULE = [
    "most_frequent",
    "first",
    "sum",
    "avg",
    "count",
    "max",
    "min",
  ] as const;
  const ORDERABLE_RULES = [
    "most_frequent",
    "first",
    "count",
    "max",
    "min",
  ] as const;

  it.each([
    ["bigint", EVERY_RULE],
    ["double", EVERY_RULE],
    ["varchar", ORDERABLE_RULES],
    ["date", ORDERABLE_RULES],
    ["time", ORDERABLE_RULES],
    ["timestamp", ORDERABLE_RULES],
    ["boolean", ["most_frequent", "first", "count"]],
  ] as const)(
    "offers a %s column exactly its allowed rules, in menu order",
    (columnDataType, expectedRuleTypes) => {
      expect(ValuePickerRule.getAllowedRuleTypes({ columnDataType })).toEqual(
        expectedRuleTypes,
      );
    },
  );
});

describe("ValuePickerRule.isAllowedForColumnType", () => {
  it("refuses a sum over a text column", () => {
    expect(
      ValuePickerRule.isAllowedForColumnType({
        ruleType: "sum",
        columnDataType: "varchar",
      }),
    ).toBe(false);
  });

  it("refuses a max over a yes/no column", () => {
    expect(
      ValuePickerRule.isAllowedForColumnType({
        ruleType: "max",
        columnDataType: "boolean",
      }),
    ).toBe(false);
  });
});

describe("ValuePickerRule.toAllowedRuleType", () => {
  it("replaces a sum over a text column with most_frequent", () => {
    expect(
      ValuePickerRule.toAllowedRuleType({
        ruleType: "sum",
        columnDataType: "varchar",
      }),
    ).toBe("most_frequent");
  });

  it("keeps a max over a date column", () => {
    expect(
      ValuePickerRule.toAllowedRuleType({
        ruleType: "max",
        columnDataType: "date",
      }),
    ).toBe("max");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend shared/models/ontology/ValuePickerRule`
Expected: FAIL, `Failed to resolve import "$/models/ontology/ValuePickerRule/ValuePickerRule.ts"`.

- [ ] **Step 3: Write the module**

Create `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts`:

```ts
import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

/** A value rule applied to a column of one Ava data type. */
type RuleOnColumn = Readonly<{
  ruleType: ValuePickerRuleType;
  columnDataType: AvaDataType.T;
}>;

/** The rule every column type allows, used in place of one that is not. */
const DEFAULT_RULE_TYPE: ValuePickerRuleType = "most_frequent";

/**
 * The type of the value a rule produces from a column. `first`,
 * `most_frequent`, `max`, and `min` return one of the column's own values,
 * so they keep its type. `sum` and `avg` return a decimal, and `count` a
 * whole number.
 *
 * It does not check that the rule is allowed for the column. Use
 * `isAllowedForColumnType` for that.
 */
function getOutputDataType(options: RuleOnColumn): AvaDataType.T {
  return match(options.ruleType)
    .with("first", "most_frequent", "max", "min", () => {
      return options.columnDataType;
    })
    .with("sum", "avg", () => {
      return "double" as const;
    })
    .with("count", () => {
      return "bigint" as const;
    })
    .exhaustive();
}

/**
 * Whether a rule can be applied to a column of this type. `sum` and `avg`
 * need numbers. `max` and `min` work on every type except yes/no values,
 * where "largest" means nothing to a reader. On text they compare
 * alphabetically, so "10" comes before "9".
 */
function isAllowedForColumnType(options: RuleOnColumn): boolean {
  return match(options.ruleType)
    .with("first", "most_frequent", "count", () => {
      return true;
    })
    .with("max", "min", () => {
      return options.columnDataType !== "boolean";
    })
    .with("sum", "avg", () => {
      return AvaDataType.isNumeric(options.columnDataType);
    })
    .exhaustive();
}

/**
 * The rules a column of this type allows, in the order option lists show
 * them.
 */
function getAllowedRuleTypes(
  options: Readonly<{ columnDataType: AvaDataType.T }>,
): ValuePickerRuleType[] {
  return DatasetColumnMappings.ValuePickerTypes.filter((ruleType) => {
    return isAllowedForColumnType({
      ruleType,
      columnDataType: options.columnDataType,
    });
  });
}

/**
 * The rule itself when the column's type allows it, otherwise
 * `DEFAULT_RULE_TYPE`.
 */
function toAllowedRuleType(options: RuleOnColumn): ValuePickerRuleType {
  return isAllowedForColumnType(options) ? options.ruleType : DEFAULT_RULE_TYPE;
}

/**
 * The value rule table: what type each rule emits, and which column types
 * each rule may be applied to.
 */
export const ValuePickerRuleModule = {
  DEFAULT_RULE_TYPE,
  getOutputDataType,
  isAllowedForColumnType,
  getAllowedRuleTypes,
  toAllowedRuleType,
};
```

Create `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

export { ValuePickerRuleModule as ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts";

export namespace ValuePickerRule {
  /** One of the seven rules that reduce a field's rows to one value. */
  export type T = ValuePickerRuleType;
}
```

- [ ] **Step 4: Run the test to verify it passes, and check it loads in Deno**

Run: `pnpm test:frontend shared/models/ontology/ValuePickerRule`
Expected: PASS.

Run: `pnpm type-check:deno`
Expected: PASS. The edge function imports this module in Task 4.

- [ ] **Step 5: Commit**

```bash
git add shared/models/ontology/ValuePickerRule
git commit -m "feat(joined-cases): add the ValuePickerRule output type table"
```

---

## Task 2: The concept view emits each rule's output type

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (created by plan 1): `_buildReducedValueSql`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts` (append a `describe`)

Spec §4.2, §1.1.

- [ ] **Step 1: Write the failing test**

Append to `buildConceptViewSql.executed.test.ts`. Add these imports beside the file's others if plan 1 has not added them already:

```ts
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
```

Then append:

```ts
const DATASET_TYPED = "dddddddd-4444-4444-8444-dddddddddddd";
const TYPED_VIEW = "concept_eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
const TYPED_SPINE = `${TYPED_VIEW}__individuals`;

/**
 * One dataset with a column of every type a rule can keep, for checking the
 * type each rule emits.
 *
 * `p1` ties at the maximum twice (two rows share the latest `seen_on`, and
 * two share the most `visits`) and has a row of NULLs, so a rule that counted
 * or compared NULL would show it. `p2` has only a NULL row. `p3` has no row.
 */
async function _seedTyped(connection: DuckDBConnection): Promise<void> {
  const path = join(tmpdir(), "ava-concept-typed.parquet");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', '9', 3::BIGINT, 1.5::DOUBLE, DATE '2024-03-01', TIME '08:00', TIMESTAMP '2024-03-01 08:00'),
        ('p1', '10', 3::BIGINT, NULL::DOUBLE, DATE '2024-03-01', TIME '17:30', TIMESTAMP '2024-03-09 17:30'),
        ('p1', NULL, NULL::BIGINT, 2.5::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP),
        ('p2', NULL, NULL::BIGINT, NULL::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP)
      ) AS t(person_id, code, visits, weight, seen_on, seen_time, seen_at)
    ) TO '${path}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${DATASET_TYPED}" AS SELECT * FROM read_parquet('${path}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_TYPED)}" AS
      SELECT * FROM read_parquet('${path}', file_row_number = true);
    CREATE TABLE "${TYPED_SPINE}" AS
      SELECT * FROM (VALUES ('p1', 'Active'), ('p2', 'Active'), ('p3', 'Active'))
        AS t(external_id, status);
  `);
}

/** One single-value field over the typed dataset. */
function _typedColumn(
  options: Readonly<{
    attributeName: string;
    selectColumnName: string;
    ruleType: ValuePickerRule.T;
  }>,
): ConceptAttributeColumn {
  return {
    kind: "dataset_column",
    attributeId: `attr-${options.attributeName}` as ConceptAttribute.Id,
    attributeName: options.attributeName,
    selectColumnName: options.selectColumnName,
    datasetId: DATASET_TYPED,
    primaryKeyColumnName: "person_id",
    valuePickerRuleType: options.ruleType,
    isArray: false,
  };
}

const TYPED_COLUMNS: readonly ConceptAttributeColumn[] = [
  _typedColumn({ attributeName: "latest_seen", selectColumnName: "seen_on", ruleType: "max" }),
  _typedColumn({ attributeName: "earliest_time", selectColumnName: "seen_time", ruleType: "min" }),
  _typedColumn({ attributeName: "latest_seen_at", selectColumnName: "seen_at", ruleType: "max" }),
  _typedColumn({ attributeName: "last_code", selectColumnName: "code", ruleType: "max" }),
  _typedColumn({ attributeName: "first_code", selectColumnName: "code", ruleType: "min" }),
  _typedColumn({ attributeName: "most_visits", selectColumnName: "visits", ruleType: "max" }),
  _typedColumn({ attributeName: "code_count", selectColumnName: "code", ruleType: "count" }),
  _typedColumn({ attributeName: "total_visits", selectColumnName: "visits", ruleType: "sum" }),
  _typedColumn({ attributeName: "average_weight", selectColumnName: "weight", ruleType: "avg" }),
];

async function _createTypedView(connection: DuckDBConnection): Promise<void> {
  await _seedTyped(connection);
  await connection.run(
    buildConceptViewSql({
      viewName: TYPED_VIEW,
      spineTableName: TYPED_SPINE,
      attributeColumns: TYPED_COLUMNS,
    }),
  );
}

/** The typed view's DuckDB column types, by column name. */
async function _describeTypedView(): Promise<Record<string, string>> {
  return await withDuckDb(async (connection) => {
    await _createTypedView(connection);
    const reader = await connection.runAndReadAll(`DESCRIBE "${TYPED_VIEW}"`);
    return Object.fromEntries(
      reader.getRowObjectsJson().map((row) => {
        return [String(row.column_name), String(row.column_type)];
      }),
    );
  });
}

/**
 * The typed view's rows in DuckDB's JSON form: dates and times as text,
 * `BIGINT` as a string, `DOUBLE` as a number.
 */
async function _queryTypedView(): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _createTypedView(connection);
    const reader = await connection.runAndReadAll(
      `SELECT * FROM "${TYPED_VIEW}" ORDER BY external_id`,
    );
    return reader.getRowObjectsJson();
  });
}

describe("buildConceptViewSql value rule output types", () => {
  it("emits each rule's output type as the view column's type", async () => {
    expect(await _describeTypedView()).toMatchObject({
      latest_seen: "DATE",
      earliest_time: "TIME",
      latest_seen_at: "TIMESTAMP",
      last_code: "VARCHAR",
      first_code: "VARCHAR",
      most_visits: "BIGINT",
      code_count: "BIGINT",
      total_visits: "DOUBLE",
      average_weight: "DOUBLE",
    });
  });

  it("takes the latest date and time when two rows tie and one is NULL", async () => {
    const [p1, p2, p3] = await _queryTypedView();

    expect([p1?.latest_seen, p1?.latest_seen_at, p1?.earliest_time]).toEqual([
      "2024-03-01",
      "2024-03-09 17:30:00",
      "08:00:00",
    ]);
    expect([p2?.latest_seen, p3?.latest_seen]).toEqual([null, null]);
  });

  it("orders text alphabetically under max and min, so '9' beats '10'", async () => {
    const [p1] = await _queryTypedView();

    expect([p1?.last_code, p1?.first_code]).toEqual(["9", "10"]);
  });

  it("counts the non-NULL values, and zero for a record no row matches", async () => {
    const rows = await _queryTypedView();

    expect(
      rows.map((row) => {
        return row.code_count;
      }),
    ).toEqual(["2", "0", "0"]);
  });

  it("sums whole numbers into a decimal and skips NULLs", async () => {
    const [p1, p2] = await _queryTypedView();

    expect([p1?.total_visits, p1?.average_weight, p1?.most_visits]).toEqual([
      6,
      2,
      "3",
    ]);
    expect(p2?.total_visits).toBeNull();
  });
});
```

`max` and `min` ties cannot change the value, since tied rows hold the same value. The ties are there so a rule that broke on duplicates, or counted a NULL row, would show it. The `first` and `most_frequent` tie tests belong to plan 1 and are unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:executed buildConceptViewSql`
Expected: FAIL. The type test reports `latest_seen: "DOUBLE"` where it expects `"DATE"`, and `code_count: "DOUBLE"` where it expects `"BIGINT"`. The value tests throw `Conversion Error: Unimplemented type for cast (DATE -> DOUBLE)`.

- [ ] **Step 3: Stop casting `count`, `max`, and `min`**

In plan 1's `buildAttributeValueSql.ts`, every cast lives in `_buildReducedValueSql`, whose inner `aggregateSql` wraps each aggregate in `CAST(... AS DOUBLE)`:

```ts
  const aggregateSql = (aggregate: string): string => {
    return `SELECT CAST(${aggregate}(${value}) AS DOUBLE) FROM ${datasetView} ${DATASET_ALIAS} WHERE ${rowFilter}`;
  };
```

Make `aggregateSql` take the whole aggregate expression:

```ts
  // Each rule passes its aggregate in the rule's output type
  // (`ValuePickerRule.getOutputDataType`). COUNT is already BIGINT, and is 0,
  // not NULL, over no rows. MAX and MIN keep the column's type, so dates,
  // times, and text work as well as numbers. Text compares by bytes, so '10'
  // sorts before '9'.
  const aggregateSql = (aggregateExpression: string): string => {
    return `SELECT ${aggregateExpression} FROM ${datasetView} ${DATASET_ALIAS} WHERE ${rowFilter}`;
  };
```

and replace the five aggregate arms of the `match` with:

```ts
    .with("sum", () => {
      return aggregateSql(`CAST(SUM(${value}) AS DOUBLE)`);
    })
    .with("avg", () => {
      return aggregateSql(`CAST(AVG(${value}) AS DOUBLE)`);
    })
    .with("count", () => {
      return aggregateSql(`COUNT(${value})`);
    })
    .with("max", () => {
      return aggregateSql(`MAX(${value})`);
    })
    .with("min", () => {
      return aggregateSql(`MIN(${value})`);
    })
```

Leave the `first`, `most_frequent`, and list SQL, `rowFilter` (with its `IS NOT NULL`), and `buildAttributeValueSql` itself unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:executed buildConceptViewSql`
Expected: PASS.

Run: `pnpm test:executed conceptRelation`
Expected: PASS. Plan 1's `buildAttributeValueSql.executed.test.ts` ("ignores NULL in sum, avg, count, max, and min") still passes: its `_normalize` turns a `bigint` into a number, so `count: 2` and `max: 4` read the same.

Run: `rg -n "AS DOUBLE" src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts`
Expected: exactly two hits, the `sum` and `avg` arms of `_buildReducedValueSql`.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts \
  src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts
git commit -m "feat(joined-cases): emit each value rule's own type from the concept view"
```


---

## Task 3: The planner refuses a rule its column's type disallows

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` (`_buildAttributeColumn`, and a new `_assertRuleAllowedForColumn`)
- Test: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`

Spec §4.3.

- [ ] **Step 1: Let fixtures name a column's type**

In the test file, give `_mapping` a `columnDataType` option and put it on the fixture column. Add `import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";` beside the other type imports.

```ts
function _mapping(
  options: Readonly<{
    attributeName: string;
    datasetId: Dataset.Id;
    columnName: string;
    ruleType?: DatasetColumnMapping["valuePickerRuleType"];
    // The column's Ava type. `bigint` by default, a type every rule allows,
    // so a fixture names one only when its test is about the type.
    columnDataType?: AvaDataType.T;
  }>,
): MappedColumn {
```

and in its returned `datasetColumn`:

```ts
    datasetColumn: {
      id: datasetColumnId,
      name: options.columnName,
      datasetId: options.datasetId,
      dataType: options.columnDataType ?? "bigint",
    } as DatasetColumn.T,
```

Keep every other field plan 1 put on the fixture.

- [ ] **Step 2: Write the failing test**

Append inside `describe("makeConceptAttributeColumnsFromMetadata", ...)`:

```ts
  // A column whose type was changed after the field was made can leave a rule
  // the new type does not allow. DuckDB would refuse the whole view with an
  // error that names neither the field nor the rule.
  it("refuses a sum over a text column", () => {
    const total = _attribute({ name: "total", dataType: "double" });
    const metadata = _metadata({
      attributes: [PERSON_ID, total],
      mappings: [
        PERSON_ID_MAPPING,
        _mapping({
          attributeName: "total",
          datasetId: DATASET_A,
          columnName: "tag",
          ruleType: "sum",
          columnDataType: "varchar",
        }),
      ],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(
      /applies 'sum' to dataset column 'tag', whose type 'varchar' does not allow it/,
    );
  });

  // A list field keeps every value and applies no rule, so the rule its
  // mapping happens to store cannot break it.
  it("reads a list field whatever rule its mapping stores", async () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, TAGS],
      mappings: [
        PERSON_ID_MAPPING,
        _mapping({
          attributeName: "tags",
          datasetId: DATASET_A,
          columnName: "tag",
          ruleType: "sum",
          columnDataType: "varchar",
        }),
      ],
    });

    const rows = await _queryConcept(metadata);

    expect(
      rows.map((row) => {
        return row.tags;
      }),
    ).toEqual([["blue", "green"], ["red"], []]);
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:executed conceptAttributeColumns`
Expected: FAIL on "refuses a sum over a text column" with `expected [Function] to throw an error`. "reads a list field whatever rule its mapping stores" already passes. It guards the list exemption in Step 4.

- [ ] **Step 4: Add the check**

In `makeConceptAttributeColumnsFromMetadata.ts`, add the import:

```ts
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
```

Add this function above `_buildAttributeColumn`:

```ts
/**
 * Throws when a single-value attribute applies a rule its column's current
 * type does not allow, which happens only when the column's type is edited
 * after the attribute was made. DuckDB would otherwise refuse the whole view
 * (`sum(VARCHAR)` does not bind), or answer `max` over a yes/no column with
 * a value the rule table calls meaningless, and neither names the field.
 * A list attribute applies no rule, so it is not checked.
 */
function _assertRuleAllowedForColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    datasetColumn: DatasetColumn.T;
  }>,
): void {
  const { attribute, mapping, datasetColumn } = options;
  if (
    attribute.isArray ||
    ValuePickerRule.isAllowedForColumnType({
      ruleType: mapping.valuePickerRuleType,
      columnDataType: datasetColumn.dataType,
    })
  ) {
    return;
  }
  throw new Error(
    `Concept attribute '${attribute.name}' (${attribute.id}) applies ` +
      `'${mapping.valuePickerRuleType}' to dataset column ` +
      `'${datasetColumn.name}', whose type '${datasetColumn.dataType}' ` +
      `does not allow it.`,
  );
}
```

In `_buildAttributeColumn`, call it right after the block that throws when `datasetColumn` does not exist:

```ts
  _assertRuleAllowedForColumn({ attribute, mapping, datasetColumn });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:executed conceptAttributeColumns`
Expected: PASS.

Run: `pnpm test:frontend src/clients/qetl`
Expected: PASS. Their fixtures use `first` and `most_frequent`, which every column type allows.

- [ ] **Step 6: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts \
  src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts
git commit -m "feat(joined-cases): refuse a value rule its column type does not allow"
```

---

## Task 4: Chat holds proposed rules to their column types

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts:30-38,58`
- Modify: `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts:21-62`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts:168-177`
- Test: `parseProposeCaseType.test.ts`, `parseOpenRouterResponse.test.ts`, `runChatAttemptsWithEscalation.test.ts`

Spec §4.4 (chat rows). `parseCreateCaseTypes.ts` does not change: it never reads a rule.

- [ ] **Step 1: Write the failing parser tests**

Append to `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.test.ts`:

```ts
const DEATHS_TOTAL_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";

/** The catalog's column types, as `fetchWorkspaceSchema` returns them. */
const CATALOG_COLUMNS = [
  { id: STATE_COLUMN_ID, data_type: "varchar" },
  { id: DEATHS_TOTAL_COLUMN_ID, data_type: "bigint" },
];

/** A one-field draft over the deaths dataset, reading `columnId`. */
function _draftReading(columnId: string, ruleType: string): string {
  return JSON.stringify({
    name: "County record",
    sourceDatasets: [
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
    ],
    attributes: [
      {
        datasetId: DEATHS_DATASET_ID,
        columnId,
        name: "Field",
        isIncluded: true,
        valuePickerRuleType: ruleType,
      },
    ],
    manualEntryAttributes: [],
  });
}

describe("parseProposeCaseType value rules", () => {
  it("replaces a sum over a text column with most_frequent", () => {
    const parsed = parseProposeCaseType(_draftReading(STATE_COLUMN_ID, "sum"), {
      columns: CATALOG_COLUMNS,
    });

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("most_frequent");
  });

  it("keeps a sum over a whole-number column", () => {
    const parsed = parseProposeCaseType(
      _draftReading(DEATHS_TOTAL_COLUMN_ID, "sum"),
      { columns: CATALOG_COLUMNS },
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("sum");
  });

  it("keeps the model's rule for a column the catalog does not list", () => {
    const parsed = parseProposeCaseType(_draftReading(STATE_COLUMN_ID, "sum"), {
      columns: [],
    });

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("sum");
  });
});
```

Append to `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts`, inside its `describe`:

```ts
  it("holds a proposed value rule to its catalog column's type", () => {
    const keyColumnId = "1a2b3c4d-cccc-4ccc-8ccc-ddddeeeeffff";
    const districtColumnId = "2b3c4d5e-cccc-4ccc-8ccc-ddddeeeeffff";
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "proposeCaseType",
              arguments: JSON.stringify({
                name: "Cholera case",
                sourceDatasets: [
                  { datasetId: CHOLERA_ID, primaryKeyColumnId: keyColumnId },
                ],
                attributes: [
                  {
                    datasetId: CHOLERA_ID,
                    columnId: districtColumnId,
                    name: "District",
                    isIncluded: true,
                    valuePickerRuleType: "avg",
                  },
                ],
                manualEntryAttributes: [],
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "propose it",
      priorClarifications: 0,
      columns: [{ id: districtColumnId, data_type: "varchar" }],
      skipSqlExtraction: true,
    });

    expect(
      parsed.proposedCaseType?.attributes[0]?.valuePickerRuleType,
    ).toBe("most_frequent");
  });
```

In `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.test.ts`, add `columns: []` to the object `_run` passes, then append inside its `describe`:

```ts
  it("hands the catalog columns to the parser", async () => {
    parseOpenRouterResponseMock.mockReturnValue(USABLE);
    const columns = [{ id: "column-1", data_type: "varchar" }];

    await runChatAttemptsWithEscalation({
      requestBody: { model: "m" },
      apiKey: "key",
      referer: "https://example.test",
      lastUserPrompt: "show revenue",
      priorClarifications: 0,
      columns,
    });

    expect(parseOpenRouterResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({ columns }),
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages`
Expected: FAIL. "replaces a sum over a text column with most_frequent" gets `sum`. "holds a proposed value rule to its catalog column's type" gets `avg`. "hands the catalog columns to the parser" sees no `columns` in the call.

- [ ] **Step 3: Teach the parser the catalog's types**

In `parseProposeCaseType.ts`, add imports:

```ts
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
```

Add below `DEFAULT_VALUE_PICKER_RULE_TYPE`:

```ts
/**
 * A catalog column as the edge function reads it from `dataset_columns`. Its
 * Ava data type arrives as plain text.
 */
export type ProposeCaseTypeCatalogColumn = Readonly<{
  id?: string;
  data_type: string;
}>;

/** Each catalog column's Ava data type, by column id. */
type ColumnDataTypesById = ReadonlyMap<string, AvaDataType.T>;

function _getColumnDataTypesById(
  columns: readonly ProposeCaseTypeCatalogColumn[],
): ColumnDataTypesById {
  return new Map(
    columns.flatMap((column) => {
      const dataType = AvaDataType.Types.find((type) => {
        return type === column.data_type;
      });
      return column.id && dataType ? [[column.id, dataType] as const] : [];
    }),
  );
}

/**
 * The model's rule, unless the column's type does not allow it, in which
 * case the rule every type allows. A column the catalog does not list keeps
 * the model's rule: the client drops that attribute when it resolves columns.
 */
function _toCatalogAllowedRuleType(
  options: Readonly<{
    rawRuleType: unknown;
    columnDataType: AvaDataType.T | undefined;
  }>,
): ChatCaseValuePickerRuleType {
  const ruleType = _asValuePickerRuleType(options.rawRuleType);
  return options.columnDataType
    ? ValuePickerRule.toAllowedRuleType({
        ruleType,
        columnDataType: options.columnDataType,
      })
    : ruleType;
}
```

Change `_parseAttribute` to take the lookup and use the helper:

```ts
function _parseAttribute(
  raw: unknown,
  columnDataTypesById: ColumnDataTypesById,
): ChatProposedCaseAttribute | undefined {
```

and replace its `valuePickerRuleType` line with:

```ts
    valuePickerRuleType: _toCatalogAllowedRuleType({
      rawRuleType: record.valuePickerRuleType,
      columnDataType: columnDataTypesById.get(columnId),
    }),
```

Change `_parseSourceAttributes` to take and pass the lookup:

```ts
function _parseSourceAttributes(
  options: Readonly<{
    rawAttributes: unknown;
    sourceDatasets: readonly ChatCaseSourceDataset[];
    columnDataTypesById: ColumnDataTypesById;
  }>,
): ChatProposedCaseAttribute[] {
  const sourceDatasetIds = new Set(
    options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  return _parseList(options.rawAttributes, (item) => {
    return _parseAttribute(item, options.columnDataTypesById);
  }).filter((attribute) => {
    return sourceDatasetIds.has(attribute.datasetId);
  });
}
```

Give `parseProposeCaseType` the catalog. Add to its docstring: "A value rule its column's catalog type does not allow becomes `most_frequent`." Then:

```ts
export function parseProposeCaseType(
  argsJson: string | undefined,
  options: Readonly<{
    columns: readonly ProposeCaseTypeCatalogColumn[];
  }> = { columns: [] },
): ChatProposedCaseType | undefined {
```

and in its body:

```ts
  const attributes = _parseSourceAttributes({
    rawAttributes: record.attributes,
    sourceDatasets,
    columnDataTypesById: _getColumnDataTypesById(options.columns),
  });
```

- [ ] **Step 4: Thread the catalog through**

In `parseOpenRouterResponse.ts`, import the type and add the option:

```ts
import type { ProposeCaseTypeCatalogColumn } from "@sbfn/chat/PostChatMessages/parsing/parseProposeCaseType.ts";
```

```ts
  datasets?: ReadonlyArray<{ id: string; name: string }>;
  concepts?: ReadonlyArray<{ id: string; name: string }>;
  /** Catalog columns, so proposed value rules are held to their types. */
  columns?: readonly ProposeCaseTypeCatalogColumn[];
  skipSqlExtraction?: boolean;
```

and pass it:

```ts
      proposedCaseType = parseProposeCaseType(proposeCall.function.arguments, {
        columns: options.columns ?? [],
      });
```

In `runChatAttemptsWithEscalation.ts`, import the same type and add a required option, so `PostChatMessages` cannot leave it out:

```ts
    concepts?: ReadonlyArray<{ id: string; name: string }>;
    /** Catalog columns, so proposed value rules are held to their types. */
    columns: readonly ProposeCaseTypeCatalogColumn[];
    skipSqlExtraction?: boolean;
```

Destructure `columns` with the others and pass it to `parseOpenRouterResponse` beside `datasets` and `concepts`.

In `PostChatMessages.ts`, add `columns: schema.columns,` to the `runChatAttemptsWithEscalation({ ... })` call, after `concepts: schema.concepts,`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages`
Expected: PASS, including the existing "rejects an unknown value picker rule instead of passing it on".

Run: `pnpm type-check:deno`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts \
  supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.test.ts \
  supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts \
  supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts \
  supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts \
  supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.test.ts \
  supabase/functions/chat/PostChatMessages/PostChatMessages.ts
git commit -m "feat(joined-cases): hold chat-proposed value rules to their column types"
```

---

## Task 5: Tell the model which rules each column type allows

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts:92`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts:209-210`
- Test: `buildCaseManagerSystemPrompt.test.ts`, `makeChatToolConfigFromOptions.test.ts`

Spec §4.6.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("buildCaseManagerSystemPrompt", ...)`:

```ts
  it("tells the model which column types each value rule needs", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain(
      "sum and avg only work on bigint and double columns",
    );
    expect(prompt).toContain("compare alphabetically");
  });
```

Append inside `describe("makeChatToolConfigFromOptions", ...)`:

```ts
  it("tells proposeCaseType which column types sum, avg, max, and min need", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            attributes?: {
              items: {
                properties: { valuePickerRuleType?: { description: string } };
              };
            };
          };
        };
      };
    }>;
    const propose = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    });
    const ruleDescription =
      propose?.function.parameters.properties.attributes?.items.properties
        .valuePickerRuleType?.description;

    expect(ruleDescription).toContain(
      "sum and avg need a bigint or double column",
    );
    expect(ruleDescription).toContain(
      "max and min never apply to a boolean column",
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt`
Expected: FAIL, both new tests report the expected text missing.

- [ ] **Step 3: Write the guidance**

In `buildCaseManagerSystemPrompt.ts`, directly after the line that starts `- Choose the value picker per column:`, add:

```text
- sum and avg only work on bigint and double columns. max and min work on every column type except boolean, and on a varchar column they compare alphabetically, so "10" comes before "9": never use them for numbers stored as text. count, first, and most_frequent work on every column.
```

In `makeChatToolConfigFromOptions.ts`, change the `proposeCaseType` attribute `valuePickerRuleType` description to:

```ts
                  description:
                    "Which value to keep when a dataset holds several rows per case. Use sum or max for cumulative measures, first for dates, most_frequent for categories. sum and avg need a bigint or double column; max and min never apply to a boolean column.",
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts \
  supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.test.ts \
  supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts \
  supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts
git commit -m "feat(joined-cases): tell the case manager model which rules each column type allows"
```

---

## Task 6: Chat-created fields store their rule's output type

**Files:**
- Modify: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts:37-72` (`_makeMappedAttribute`)
- Test: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.test.ts`

Spec §4.4. Both chat tools reach the database through this function (`applyCreatedCaseTypes.ts:21-28`), so it is the gate for chat.

- [ ] **Step 1: Write the failing tests**

Add these type imports:

```ts
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
```

Add this helper below `_covidCase`, above `describe("createdCaseTypeToFormValues", ...)`:

```ts
/** Converts a case type with one field, "Field", reading `columnId`. */
function _convertField(options: {
  columnId: string;
  datasetId: string;
  valuePickerRuleType: ValuePickerRule.T;
}): AttributeFormValues | undefined {
  const formValues = createdCaseTypeToFormValues({
    caseType: _covidCase({
      identities: [
        { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
        {
          datasetId: CENSUS_DATASET_ID,
          primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
        },
      ],
      attributes: [
        {
          name: "Field",
          kind: "dataset_column",
          datasetId: options.datasetId,
          columnId: options.columnId,
          valuePickerRuleType: options.valuePickerRuleType,
        },
      ],
    }),
    workspaceId: WORKSPACE_ID,
    columns: COLUMNS,
  });
  return formValues.attributes.find((attribute) => {
    return attribute.name === "Field";
  });
}
```

Append inside `describe("createdCaseTypeToFormValues", ...)`:

```ts
  it("stores a count over a text column as a whole number", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "count",
    });

    expect(field?.dataType).toBe("bigint");
  });

  it("stores a sum of whole numbers as a decimal", () => {
    const field = _convertField({
      columnId: POPULATION_COLUMN_ID,
      datasetId: CENSUS_DATASET_ID,
      valuePickerRuleType: "sum",
    });

    expect(field?.dataType).toBe("double");
  });

  it("keeps a text column's type under max", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "max",
    });

    expect(field?.dataType).toBe("varchar");
  });

  it("replaces a sum over a text column with most_frequent", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "sum",
    });

    expect(field?.mappings.datasetColumn.valuePickerRuleType).toBe(
      "most_frequent",
    );
    expect(field?.dataType).toBe("varchar");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend createdCaseTypeToFormValues`
Expected: FAIL. The count test gets `varchar`, the sum test gets `bigint`, and the replacement test gets `sum`. "keeps a text column's type under max" already passes.

- [ ] **Step 3: Hold the rule and store its output type**

In `createdCaseTypeToFormValues.ts`, add the import:

```ts
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
```

In `_makeMappedAttribute`, after `const conceptAttributeId = ...`, add:

```ts
  // Chat's rule is held to the column's type here as well as in the edge
  // function, because every chat-created case type passes through this step.
  // A field stores the type its rule emits.
  const ruleOnColumn = {
    ruleType: ValuePickerRule.toAllowedRuleType({
      ruleType: options.valuePickerRuleType,
      columnDataType: options.column.dataType,
    }),
    columnDataType: options.column.dataType,
  };
```

Then replace `dataType: options.column.dataType,` with:

```ts
    dataType: ValuePickerRule.getOutputDataType(ruleOnColumn),
```

and, inside `mappings.datasetColumn`, replace `valuePickerRuleType: options.valuePickerRuleType,` with:

```ts
        valuePickerRuleType: ruleOnColumn.ruleType,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend createdCaseTypeToFormValues proposedCaseTypeToCreatedCaseType`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts \
  src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.test.ts
git commit -m "feat(joined-cases): store each chat-created field's rule output type"
```

---

## Task 7: The draft card offers only allowed rules

**Files:**
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftAttributeRow.tsx:12-32,83-97`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftSourceSection.tsx:11-35,88-101`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx:17,20-30,49,100`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx:49-68`
- Test: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`

Spec §4.4 (draft card) and §4.5.

- [ ] **Step 1: Give the mocked catalog column types**

In `CaseTypeDraftBlock.test.tsx`, the `DatasetColumnClient` mock returns columns with only `id` and `name`. Add a `dataType` to each:

```ts
          [
            { id: FIPS_COLUMN_ID, name: "fips", dataType: "varchar" },
            { id: STATE_COLUMN_ID, name: "state", dataType: "varchar" },
            { id: DEATHS_COLUMN_ID, name: "deaths_total", dataType: "bigint" },
            {
              id: CENSUS_FIPS_COLUMN_ID,
              name: "county_fips",
              dataType: "varchar",
            },
            {
              id: POPULATION_COLUMN_ID,
              name: "population",
              dataType: "bigint",
            },
          ],
```

- [ ] **Step 2: Write the failing tests**

Add `within` to the `@/test-utils` import and add:

```ts
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
```

Add this helper above `describe("CaseTypeDraftBlock", ...)`:

```ts
/** The option labels a row's value rule select offers, in order. */
function _offeredRules(selectLabel: string): string[] {
  return within(getMantineSelectDropdown(selectLabel))
    .queryAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}
```

Append inside the `describe`:

```ts
  it("offers neither sum nor average for a text column, and names max and min alphabetically", () => {
    render(<CaseTypeDraftBlock />);

    expect(_offeredRules("Value to keep for State")).toEqual([
      "Most frequent",
      "First",
      "Count",
      "Alphabetically last",
      "Alphabetically first",
    ]);
  });

  it("offers every rule for a whole-number column", () => {
    render(<CaseTypeDraftBlock />);

    expect(_offeredRules("Value to keep for Total deaths")).toEqual([
      "Most frequent",
      "First",
      "Sum",
      "Average",
      "Count",
      "Max",
      "Min",
    ]);
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:frontend CaseTypeDraftBlock`
Expected: FAIL on the text-column test. The State select lists all seven rules, including `Sum`, `Average`, `Max`, and `Min`. The whole-number test already passes.

- [ ] **Step 4: Make the options depend on the column's type**

Replace `src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts` with:

```ts
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/**
 * Short localized value-picker labels for the draft card, offering only the
 * rules the column's type allows. The concept creator form uses full
 * sentences, which do not fit the chat panel's narrow rows.
 *
 * Until the column's type is known every rule is offered: the edge function
 * already held the model's rule to the same catalog, and creation checks it
 * again.
 *
 * On a text column `max` and `min` compare alphabetically, so they are named
 * for that rather than "Max" and "Min", which would suggest "10" beats "9".
 */
export function useValuePickerOptions(
  columnDataType: AvaDataType.T | undefined,
): ReadonlyArray<{ value: ValuePickerRule.T; label: string }> {
  const { t } = useLingui();
  const isText = columnDataType === "varchar";
  const maxLabel = isText ? t`Alphabetically last` : t`Max`;
  const minLabel = isText ? t`Alphabetically first` : t`Min`;
  const ruleTypes = columnDataType
    ? ValuePickerRule.getAllowedRuleTypes({ columnDataType })
    : DatasetColumnMappings.ValuePickerTypes;
  return ruleTypes.map((ruleType) => {
    return {
      value: ruleType,
      label: matchLiteral(ruleType, {
        most_frequent: t`Most frequent`,
        first: t`First`,
        sum: t`Sum`,
        avg: t`Average`,
        count: t`Count`,
        max: maxLabel,
        min: minLabel,
      }),
    };
  });
}
```

In `CaseTypeDraftAttributeRow.tsx`, replace the `valuePickerOptions` prop with the column's type and compute the options in the row:

```ts
import { useValuePickerOptions } from "./useValuePickerOptions";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
```

```ts
type Props = {
  attribute: ChatProposedCaseAttribute;
  columnLabel: string;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  editor: CaseTypeDraftEditor;
};
```

Destructure `columnDataType` instead of `valuePickerOptions`, and add as the first line after `const { t } = useLingui();`:

```ts
  const valuePickerOptions = useValuePickerOptions(columnDataType);
```

In `CaseTypeDraftSourceSection.tsx`, replace the `valuePickerOptions` prop with:

```ts
  /** Catalog column types, keyed by column id, for each row's value rules. */
  columnDataTypesById: Readonly<Record<string, AvaDataType.T>>;
```

(import `AvaDataType` as a type the same way), destructure `columnDataTypesById` instead of `valuePickerOptions`, and in the row replace `valuePickerOptions={valuePickerOptions}` with:

```tsx
              columnDataType={columnDataTypesById[attribute.columnId]}
```

In `CaseTypeDraftCard.tsx`, delete the `useValuePickerOptions` import and the `const valuePickerOptions = useValuePickerOptions();` line, add the prop:

```ts
  /** Catalog column types, keyed by column id, for each row's value rules. */
  columnDataTypesById: Readonly<Record<string, AvaDataType.T>>;
```

(with `import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";`), destructure it, and pass `columnDataTypesById={columnDataTypesById}` to `CaseTypeDraftSourceSection` in place of `valuePickerOptions={valuePickerOptions}`.

In `CaseTypeDraftBlock.tsx`, after `columnNamesById`, add:

```ts
  const columnDataTypesById = useMemo(() => {
    return Object.fromEntries(
      (datasetColumns ?? []).map((column) => {
        return [column.id, column.dataType];
      }),
    );
  }, [datasetColumns]);
```

and pass `columnDataTypesById={columnDataTypesById}` to `CaseTypeDraftCard`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:frontend CaseTypeDraftBlock`
Expected: PASS, including the existing persistence tests (`Total deaths` keeps `sum` over a whole-number column, `Population` keeps `max`).

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftAttributeRow.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftSourceSection.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx
git commit -m "feat(joined-cases): offer only allowed value rules in the case type draft card"
```

---

## Task 8: The concept creator form offers allowed rules and stores output types

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts` (two new functions)
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx:148-151`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx:9-38`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx:249-261`
- Test: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.test.ts`
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.test.tsx`

Spec §4.4 (form rows) and §4.5.

- [ ] **Step 1: Write the failing tests for the stored type**

Append to `conceptFormTypes.test.ts`, extending its imports:

```ts
import { uuid } from "$/lib/uuid";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
  withFieldDataTypes,
} from "./conceptFormTypes";
import type {
  DatasetId,
  DatasetWithColumns,
} from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AttributeFormValues } from "./conceptFormTypes";

const CONCEPT_ID = uuid<ConceptId>();
// Fixtures carry only the fields `withFieldDataTypes` and
// `makeDefaultDatasetColumnAttribute` read, so they are cast once here.
const DISTRICT_COLUMN = {
  id: uuid<DatasetColumnId>(),
  name: "district",
  dataType: "varchar",
} as DatasetColumnRead;
// `readonly`, matching `DatasetWithColumns.columns`, so one `as` suffices.
const DISTRICT_COLUMNS: readonly DatasetColumnRead[] = [DISTRICT_COLUMN];
const DATASET = {
  id: uuid<DatasetId>(),
  columns: DISTRICT_COLUMNS,
} as DatasetWithColumns;

/** A "district" field over a text column, with the given rule. */
function _districtField(options: {
  ruleType: ValuePickerRule.T;
  isArray?: boolean;
}): AttributeFormValues {
  const attribute = makeDefaultDatasetColumnAttribute({
    conceptId: CONCEPT_ID,
    name: "district",
    dataset: DATASET,
    datasetColumn: DISTRICT_COLUMN,
  });
  return {
    ...attribute,
    isArray: options.isArray ?? false,
    mappings: {
      ...attribute.mappings,
      datasetColumn: {
        ...attribute.mappings.datasetColumn,
        valuePickerRuleType: options.ruleType,
      },
    },
  };
}

describe("withFieldDataTypes", () => {
  it("stores a count over a text column as a whole number", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count" })],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(field?.dataType).toBe("bigint");
  });

  it("stores a field that keeps every value as its column's type", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count", isArray: true })],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(field?.dataType).toBe("varchar");
  });

  it("keeps the type of a field whose column is not among the sources", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count" })],
      sourceDatasets: [],
    });

    expect(field?.dataType).toBe("varchar");
  });
});
```

- [ ] **Step 2: Write the failing tests for the options**

Create `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.test.tsx`:

```tsx
import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { render, within } from "@/test-utils";
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnMappingCreator } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

// `makeDefaultDatasetColumnAttribute` reads only the dataset's id.
const DATASET = { id: uuid<DatasetId>() } as Dataset.T;

/** The creator for one field, "district", over a column of the given type. */
function CreatorHarness({
  columnDataType,
}: Readonly<{ columnDataType: AvaDataType.T }>): ReactNode {
  const defaults = getDefaultConceptFormValues();
  const conceptForm: FormType<ConceptFormValues> = useForm({
    mode: "uncontrolled",
    initialValues: {
      ...defaults,
      datasetColumnAttributes: [
        makeDefaultDatasetColumnAttribute({
          conceptId: defaults.id,
          name: "district",
          dataset: DATASET,
          datasetColumn: {
            id: uuid<DatasetColumnId>(),
            name: "district",
            dataType: columnDataType,
          } as DatasetColumnRead,
        }),
      ],
    },
  });
  return (
    <ConceptCreatorStore.Provider>
      <DatasetColumnMappingCreator
        conceptForm={conceptForm}
        attributeIdx={0}
        attributeName="district"
        columnDataType={columnDataType}
      />
    </ConceptCreatorStore.Provider>
  );
}

/** The option labels the field's value rule select offers, in order. */
function _offeredRules(): string[] {
  return within(getMantineSelectDropdown(/If there are multiple district values/))
    .queryAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}

describe("DatasetColumnMappingCreator", () => {
  it("offers no sum or average for a text column, and names max and min alphabetically", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
      "Choose the value that comes last alphabetically",
      "Choose the value that comes first alphabetically",
    ]);
  });

  it("offers neither maximum nor minimum for a yes/no column", () => {
    render(<CreatorHarness columnDataType="boolean" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
    ]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:frontend ConceptCreatorView`
Expected: FAIL. `withFieldDataTypes` is not exported (`withFieldDataTypes is not a function`), and both creator tests see all seven rules.

- [ ] **Step 4: Add the stored-type functions**

In `conceptFormTypes.ts`, add imports:

```ts
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
```

Append:

```ts
/**
 * The type a dataset-column field stores. A field that keeps every value
 * stores its column's type, because each element is one of the column's
 * values. A field that keeps one value stores its rule's output type.
 */
export function getDatasetColumnAttributeDataType(
  options: Readonly<{
    isArray: boolean;
    ruleType: ValuePickerRule.T;
    columnDataType: AvaDataType.T;
  }>,
): AvaDataType.T {
  return options.isArray
    ? options.columnDataType
    : ValuePickerRule.getOutputDataType({
        ruleType: options.ruleType,
        columnDataType: options.columnDataType,
      });
}

/**
 * Returns the attributes with each dataset-column field's `dataType` set to
 * the type it stores, reading each column's type from `sourceDatasets`.
 *
 * While the user edits, the form keeps `dataType` as the column's type, and
 * the rule select and "Only allow one value" both change what the field
 * stores, so the stored type is set once, on submit. A field whose column is
 * not among `sourceDatasets` keeps its `dataType`.
 */
export function withFieldDataTypes(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    sourceDatasets: ConceptFormValues["sourceDatasets"];
  }>,
): AttributeFormValues[] {
  const columnDataTypesById = new Map<string, AvaDataType.T>(
    options.sourceDatasets.flatMap(({ dataset }) => {
      return dataset.columns.map((column) => {
        return [column.id, column.dataType] as const;
      });
    }),
  );
  return options.attributes.map((attribute) => {
    const { datasetColumnId, valuePickerRuleType } =
      attribute.mappings.datasetColumn;
    const columnDataType = datasetColumnId
      ? columnDataTypesById.get(datasetColumnId)
      : undefined;
    if (
      attribute.mappingType !== "dataset_column" ||
      columnDataType === undefined
    ) {
      return attribute;
    }
    return {
      ...attribute,
      dataType: getDatasetColumnAttributeDataType({
        isArray: attribute.isArray,
        ruleType: valuePickerRuleType,
        columnDataType,
      }),
    };
  });
}
```

In `ConceptCreatorView/index.tsx`, import `withFieldDataTypes` from `conceptFormTypes` with the file's other imports from it, and make `transformValues` return:

```ts
      return {
        ...values,
        attributes: withFieldDataTypes({
          attributes: allAttributes,
          sourceDatasets: values.sourceDatasets,
        }),
      };
```

- [ ] **Step 5: Filter the form's options by the column's type**

In `DatasetColumnMappingCreator.tsx`, replace the `DatasetColumnMappings` import with:

```ts
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
```

Add the prop:

```ts
type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
  /** The type of the dataset column this field reads. */
  columnDataType: AvaDataType.T;
};
```

Replace `useValuePickerOptions` with:

```ts
/**
 * Returns the localized value-picker rule options the column's type allows.
 * On a text column `max` and `min` compare alphabetically, so their labels
 * say so instead of suggesting "10" beats "9".
 */
function useValuePickerOptions(columnDataType: AvaDataType.T): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const { t } = useLingui();
  const isText = columnDataType === "varchar";
  const maxLabel = isText
    ? t`Choose the value that comes last alphabetically`
    : t`Choose the maximum value`;
  const minLabel = isText
    ? t`Choose the value that comes first alphabetically`
    : t`Choose the minimum value`;
  return ValuePickerRule.getAllowedRuleTypes({ columnDataType }).map(
    (ruleType) => {
      return {
        value: ruleType,
        label: matchLiteral(ruleType, {
          most_frequent: t`Choose the most frequent value`,
          first: t`Choose the first value we see`,
          sum: t`Get a sum of the values`,
          avg: t`Get an average of the values`,
          count: t`Get a count of how many values there are`,
          max: maxLabel,
          min: minLabel,
        }),
      };
    },
  );
}
```

Destructure `columnDataType` in `DatasetColumnMappingCreator` and call `useValuePickerOptions(columnDataType)`.

In `DatasetColumnAttributesBlock/index.tsx`, after `const { sourceDatasets } = conceptForm.getValues();`, add:

```ts
  // The field being configured and the column it reads, whose type decides
  // which value rules the field may use.
  const selectedAttribute = addedAttributes.find(
    propEq("id", selectedAttributeId),
  );
  const selectedColumnId =
    selectedAttribute?.mappings.datasetColumn.datasetColumnId;
  const selectedColumn = selectedColumnId
    ? datasetColumnLookup[selectedColumnId]?.column
    : undefined;
```

and replace the `{selectedAttributeId ? ( ... ) : null}` block that renders `DatasetColumnMappingCreator` with:

```tsx
          {selectedAttribute && selectedColumn ? (
            <Box pt="sm">
              <DatasetColumnMappingCreator
                conceptForm={conceptForm}
                attributeIdx={addedAttributes.findIndex(
                  propEq("id", selectedAttribute.id),
                )}
                attributeName={selectedAttribute.name}
                columnDataType={selectedColumn.dataType}
              />
            </Box>
          ) : null}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend ConceptCreatorView`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts \
  src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.test.ts \
  src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx \
  src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx \
  src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.test.tsx \
  src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx
git commit -m "feat(joined-cases): offer only allowed value rules in the case type form"
```

---

## Task 9: Correct existing rows

**Files:**
- Create: `supabase/migrations/<ts>_correct_value_rule_data_types.sql` (hand-written DML)
- Create: `supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql`
- Create: `supabase/migration-upgrade-tests/value_rule_data_types.assertions.sql`
- Modify: `scripts/test-dashboard-publishing-migrations.sh` (append one replay)

Spec §4.8. Load `supabase-declarative-schema` first.

- [ ] **Step 1: Check the switch and create the empty migration**

```bash
ava supabase status
supabase migration new correct_value_rule_data_types
```

Expected: the status line names `feat-joined-cases`. Note the created path, `supabase/migrations/<ts>_correct_value_rule_data_types.sql`, and leave it empty for now.

- [ ] **Step 2: Write the replay prelude**

Create `supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql`:

```sql
-- Case types the way authoring left them before value rules were typed:
-- every field's `data_type` is its column's type whatever its rule, and some
-- rules are ones the column's type no longer allows. The schema did not
-- change, so nothing is lifted. The second case type maps two identifier
-- fields into one dataset, which the label-and-identifier trigger refuses on
-- any update. Every fixture id starts with `ae`.
begin;

insert into auth.users (id, email, aud, role)
values ('ae000001-0000-4000-8000-000000000001'::uuid, 'value_rule_types@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'value rule types ws', 'value-rule-types-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('ae001101-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('ae001201-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae001101-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values ('ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001201-0000-4000-8000-000000000001'::uuid, 'value rule types dataset', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

-- One column of each type the fixtures need.
insert into public.dataset_columns (
  id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
)
values
  ('ae006001-0000-4000-8000-000000000001'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'case_id', 'case_id', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('ae006002-0000-4000-8000-000000000002'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'district', 'district', 'VARCHAR', 'VARCHAR', 'varchar', 1),
  ('ae006003-0000-4000-8000-000000000003'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'visits', 'visits', 'BIGINT', 'BIGINT', 'bigint', 2),
  ('ae006004-0000-4000-8000-000000000004'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'weight', 'weight', 'DOUBLE', 'DOUBLE', 'double', 3),
  ('ae006005-0000-4000-8000-000000000005'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'seen_on', 'seen_on', 'DATE', 'DATE', 'date', 4),
  ('ae006006-0000-4000-8000-000000000006'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'vaccinated', 'vaccinated', 'BOOLEAN', 'BOOLEAN', 'boolean', 5);

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('ae002001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'value rule case type', false, 'ae007001-0000-4000-8000-000000000001'::uuid),
  ('ae002002-0000-4000-8000-000000000002'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'case type with two keys in one dataset', false, 'ae007002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('ae007001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('ae007002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

-- Every field's `data_type` is its column's type, as authoring stored it.
-- Attributes go in before mappings, as `rpc_concepts__create` inserts them,
-- so the identifier check passes on insert.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('ae003001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Case ID', 'varchar', 'dataset_column', true, true, false, false),
  ('ae003002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'District count', 'varchar', 'dataset_column', false, false, false, false),
  ('ae003003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Weight count', 'double', 'dataset_column', false, false, false, false),
  ('ae003004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Total visits', 'bigint', 'dataset_column', false, false, false, false),
  ('ae003005-0000-4000-8000-000000000005'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Latest visit', 'date', 'dataset_column', false, false, false, false),
  ('ae003006-0000-4000-8000-000000000006'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'First district', 'varchar', 'dataset_column', false, false, false, false),
  ('ae003007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'District total', 'varchar', 'dataset_column', false, false, false, false),
  ('ae003008-0000-4000-8000-000000000008'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Ever vaccinated', 'boolean', 'dataset_column', false, false, false, false),
  ('ae003009-0000-4000-8000-000000000009'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Districts', 'varchar', 'dataset_column', false, false, true, false),
  ('ae003010-0000-4000-8000-000000000010'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Lost column count', 'varchar', 'dataset_column', false, false, false, false),
  ('ae003011-0000-4000-8000-000000000011'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Notes', 'varchar', 'manual_entry', false, false, false, false);

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('ae003101-0000-4000-8000-000000000101'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key A', 'varchar', 'dataset_column', true, true, false, false),
  ('ae003102-0000-4000-8000-000000000102'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key B', 'varchar', 'dataset_column', false, true, false, false),
  ('ae003103-0000-4000-8000-000000000103'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'District count', 'varchar', 'dataset_column', false, false, false, false);

-- Mapping `ae004010` names a column that no longer exists.
insert into public.attribute_mappings__dataset_column (
  id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id
)
values
  ('ae004001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003001-0000-4000-8000-000000000001'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006001-0000-4000-8000-000000000001'::uuid),
  ('ae004002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003002-0000-4000-8000-000000000002'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid),
  ('ae004003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003003-0000-4000-8000-000000000003'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006004-0000-4000-8000-000000000004'::uuid),
  ('ae004004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003004-0000-4000-8000-000000000004'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006003-0000-4000-8000-000000000003'::uuid),
  ('ae004005-0000-4000-8000-000000000005'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003005-0000-4000-8000-000000000005'::uuid, 'max', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006005-0000-4000-8000-000000000005'::uuid),
  ('ae004006-0000-4000-8000-000000000006'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003006-0000-4000-8000-000000000006'::uuid, 'min', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid),
  ('ae004007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003007-0000-4000-8000-000000000007'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid),
  ('ae004008-0000-4000-8000-000000000008'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003008-0000-4000-8000-000000000008'::uuid, 'max', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006006-0000-4000-8000-000000000006'::uuid),
  ('ae004009-0000-4000-8000-000000000009'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003009-0000-4000-8000-000000000009'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid),
  ('ae004010-0000-4000-8000-000000000010'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003010-0000-4000-8000-000000000010'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006099-0000-4000-8000-000000000099'::uuid),
  ('ae004101-0000-4000-8000-000000000101'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003101-0000-4000-8000-000000000101'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006001-0000-4000-8000-000000000001'::uuid),
  ('ae004102-0000-4000-8000-000000000102'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003102-0000-4000-8000-000000000102'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid),
  ('ae004103-0000-4000-8000-000000000103'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003103-0000-4000-8000-000000000103'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid);
```

- [ ] **Step 3: Write the replay assertions**

Create `supabase/migration-upgrade-tests/value_rule_data_types.assertions.sql`:

```sql
-- Verify every field stores its rule's output type, every disallowed rule
-- became most_frequent, rows the migration cannot judge were left alone, the
-- case type that breaks the identifier rule was corrected anyway, and the
-- label-and-identifier trigger is enabled again.
do $$
declare
  mismatch record;
begin
  for mismatch in
    select
      ca.name,
      ca.data_type::text as actual_data_type,
      expected.data_type as expected_data_type
    from
      (
        values
          ('ae003001-0000-4000-8000-000000000001'::uuid, 'varchar'),
          ('ae003002-0000-4000-8000-000000000002'::uuid, 'bigint'),
          ('ae003003-0000-4000-8000-000000000003'::uuid, 'bigint'),
          ('ae003004-0000-4000-8000-000000000004'::uuid, 'double'),
          ('ae003005-0000-4000-8000-000000000005'::uuid, 'date'),
          ('ae003006-0000-4000-8000-000000000006'::uuid, 'varchar'),
          ('ae003007-0000-4000-8000-000000000007'::uuid, 'varchar'),
          ('ae003008-0000-4000-8000-000000000008'::uuid, 'boolean'),
          ('ae003009-0000-4000-8000-000000000009'::uuid, 'varchar'),
          ('ae003010-0000-4000-8000-000000000010'::uuid, 'varchar'),
          ('ae003011-0000-4000-8000-000000000011'::uuid, 'varchar'),
          ('ae003103-0000-4000-8000-000000000103'::uuid, 'bigint')
      ) as expected (attribute_id, data_type)
      join public.concept_attributes ca on ca.id = expected.attribute_id
    where
      ca.data_type::text is distinct from expected.data_type
  loop
    raise exception 'field "%" stores %, expected %',
      mismatch.name, mismatch.actual_data_type, mismatch.expected_data_type;
  end loop;

  for mismatch in
    select
      dcm.id,
      dcm.value_picker_rule_type::text as actual_rule_type,
      expected.rule_type as expected_rule_type
    from
      (
        values
          ('ae004002-0000-4000-8000-000000000002'::uuid, 'count'),
          ('ae004004-0000-4000-8000-000000000004'::uuid, 'sum'),
          ('ae004005-0000-4000-8000-000000000005'::uuid, 'max'),
          ('ae004006-0000-4000-8000-000000000006'::uuid, 'min'),
          ('ae004007-0000-4000-8000-000000000007'::uuid, 'most_frequent'),
          ('ae004008-0000-4000-8000-000000000008'::uuid, 'most_frequent'),
          ('ae004009-0000-4000-8000-000000000009'::uuid, 'most_frequent'),
          ('ae004010-0000-4000-8000-000000000010'::uuid, 'count')
      ) as expected (mapping_id, rule_type)
      join public.attribute_mappings__dataset_column dcm on dcm.id = expected.mapping_id
    where
      dcm.value_picker_rule_type::text is distinct from expected.rule_type
  loop
    raise exception 'mapping % has rule %, expected %',
      mismatch.id, mismatch.actual_rule_type, mismatch.expected_rule_type;
  end loop;

  if (
    select
      tgenabled
    from
      pg_trigger
    where
      tgrelid = 'public.concept_attributes'::regclass and
      tgname = 'tr_concept_attributes__validate_label_and_identifiers'
  ) is distinct from 'O' then
    raise exception 'the label and identifier trigger was left disabled';
  end if;
end
$$;

rollback;
```

- [ ] **Step 4: Add the replay to the runner**

Append to `scripts/test-dashboard-publishing-migrations.sh`, using the real file name from Step 1:

```bash
# Value rule data types: replace rules a column's type does not allow with
# most_frequent, and store each field's rule output type, even in a case type
# that already breaks the identifier rule.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql" \
  "$repo_root/supabase/migrations/<ts>_correct_value_rule_data_types.sql" \
  "$repo_root/supabase/migration-upgrade-tests/value_rule_data_types.assertions.sql"
```

- [ ] **Step 5: Run the replay to verify it fails**

```bash
ava supabase status
pnpm test:db
```

Expected: the pgTAP suites pass, and the new replay fails with `field "District count" stores varchar, expected bigint`, because the migration is still empty.

- [ ] **Step 6: Write the migration**

Fill `supabase/migrations/<ts>_correct_value_rule_data_types.sql`:

```sql
-- Brings stored value rules and field data types in line with the rule table
-- in `shared/models/ontology/ValuePickerRule/`. A rule its column's type does
-- not allow becomes `most_frequent`, which every type allows. Each
-- dataset-column field's `data_type` becomes the type the concept view emits
-- for it: the column's type for a list field, `double` for `sum` and `avg`,
-- `bigint` for `count`, and the column's type for every other rule.
--
-- Hand-written because `db diff` never emits DML. A mapping whose column no
-- longer exists, or belongs to another dataset, is left alone: there is no
-- type to judge it by, and the query planner already refuses it. Each
-- statement skips rows that are already right, so a re-run changes nothing.
do $$
declare
  replaced_rule_count integer;
  corrected_type_count integer;
begin
  update public.attribute_mappings__dataset_column dcm
  set
    value_picker_rule_type = 'most_frequent'
  from
    public.dataset_columns dc
  where
    dc.id = dcm.dataset_column_id and
    dc.dataset_id = dcm.dataset_id and
    (
      (
        dcm.value_picker_rule_type in ('sum', 'avg') and
        dc.data_type not in ('bigint', 'double')
      ) or
      (
        dcm.value_picker_rule_type in ('max', 'min') and
        dc.data_type = 'boolean'
      )
    );
  get diagnostics replaced_rule_count = row_count;

  -- The update below changes only `data_type`, which the label and
  -- identifier check never reads. That check runs after every update and
  -- inspects the whole case type, so one case type that already breaks it
  -- would otherwise abort this migration for every workspace.
  alter table public.concept_attributes
  disable trigger tr_concept_attributes__validate_label_and_identifiers;

  with
    field_type as (
      select
        ca.id,
        case
          when ca.is_array then dc.data_type
          when dcm.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
          when dcm.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
          else dc.data_type
        end as output_data_type
      from
        public.concept_attributes ca
        join public.attribute_mappings__dataset_column dcm on dcm.concept_attribute_id = ca.id
        join public.dataset_columns dc on dc.id = dcm.dataset_column_id and
        dc.dataset_id = dcm.dataset_id
      where
        ca.mapping_type = 'dataset_column'
    )
  update public.concept_attributes ca
  set
    data_type = field_type.output_data_type
  from
    field_type
  where
    field_type.id = ca.id and
    ca.data_type is distinct from field_type.output_data_type;
  get diagnostics corrected_type_count = row_count;

  alter table public.concept_attributes
  enable trigger tr_concept_attributes__validate_label_and_identifiers;

  raise notice 'value rules replaced with most_frequent: %; field data types corrected: %',
    replaced_rule_count, corrected_type_count;
end
$$;
```

- [ ] **Step 7: Apply it locally and run the replay to verify it passes**

```bash
ava supabase status
pnpm db:reset
pnpm test:db
```

Expected: `db:reset` applies every migration, including this one, with no error. `test:db` passes, including the `value_rule_data_types` replay.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/*_correct_value_rule_data_types.sql \
  supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql \
  supabase/migration-upgrade-tests/value_rule_data_types.assertions.sql \
  scripts/test-dashboard-publishing-migrations.sh
git commit -m "feat(joined-cases): correct stored value rules and field data types"
```

Do not stage `supabase/config.toml`.

---

## Task 10: Translations and full verification

**Files:**
- Modify: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts` (generated)

- [ ] **Step 1: Extract and compile the catalogs**

```bash
pnpm i18n:extract
pnpm i18n:compile
```

Expected: `src/i18n/locales/en/messages.po` gains `Alphabetically last`, `Alphabetically first`, `Choose the value that comes last alphabetically`, and `Choose the value that comes first alphabetically`, referenced from `useValuePickerOptions.ts` and `DatasetColumnMappingCreator.tsx`.

- [ ] **Step 2: Run every suite this plan touches**

```bash
ava supabase status
pnpm test:db
pnpm test:frontend
pnpm test:executed
pnpm type-check
pnpm lint
pnpm i18n:check
```

Expected: all PASS. `i18n:check` exits 0 once the catalogs from Step 1 are in the working tree.

- [ ] **Step 3: Check the exit-criteria query against the local database**

```bash
psql "$(supabase status -o json | jq -er '.DB_URL')" -c "
  select count(*)
  from public.concept_attributes a
  join public.attribute_mappings__dataset_column m on m.concept_attribute_id = a.id
  join public.dataset_columns c on c.id = m.dataset_column_id and c.dataset_id = m.dataset_id
  where a.mapping_type = 'dataset_column' and (
    (m.value_picker_rule_type in ('sum', 'avg') and c.data_type not in ('bigint', 'double'))
    or (m.value_picker_rule_type in ('max', 'min') and c.data_type = 'boolean')
    or (a.is_identifier and m.value_picker_rule_type <> 'most_frequent')
    or a.data_type is distinct from (
      case
        when a.is_array or a.is_identifier then c.data_type
        when m.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
        when m.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
        else c.data_type
      end
    ));"
```

Expected: `0`.

- [ ] **Step 4: Check the running app**

Run `pnpm dev` and, in a headless browser (Playwright MCP), sign in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `seed/SeedData.ts` and open the `TEST_WORKSPACE_SLUG` workspace. If it has no dataset with a text column and a date column, import a small CSV through Data Sources with `case_id`, `district`, and `seen_on` columns and at least two rows per `case_id`.

1. Open `/<workspace>/ontology-designer/concept-creator`. Add `district` as a field. Expected: its value rule select offers no sum or average, and lists "Choose the value that comes last alphabetically". Screenshot to `.temp/feat-joined-cases/form-text-rules.png`.
2. Set `district` to "Get a count of how many values there are", add `seen_on` with "Choose the maximum value", pick `case_id` as the join key and the title, and create the case type.
3. Run Refresh records on the case type page, open its records, and open one record. Expected: the `seen_on` field shows a date, not an error. Screenshot to `.temp/feat-joined-cases/record-latest-date.png`.
4. Open the Data Explorer on the case type and pick the `district` field. Expected: its aggregation menu offers Sum and Average, because the field is now a whole number. Screenshot to `.temp/feat-joined-cases/explorer-count-field.png`.

- [ ] **Step 5: Commit the catalogs**

```bash
git add src/i18n/locales
git commit -m "chore(joined-cases): extract and compile translations"
```

---

## Task 11: Update the ontology architecture doc

**Files:**
- Modify: `docs/ontology-architecture.md` (sections 5.2, 5.3, 7.1, 8, 10, 15, 16)

Plan 1 rewrote section 7 and parts of 8 and 16. Apply each edit below to the text as plan 1 left it. Where plan 1 already removed or reworded a sentence named here, make the equivalent change to its wording. No em dashes.

- [ ] **Step 1: Section 5.2 (form path)**

Add this bullet to the end of the section's list:

```markdown
- The value rule select offers only the rules the field's column type allows
  (`ValuePickerRule.getAllowedRuleTypes`). On submit, `transformValues` runs
  every field through `withFieldDataTypes`, which stores the column's type for
  a field that keeps every value and the rule's output type otherwise.
```

- [ ] **Step 2: Section 5.3 (chat path)**

In the `parseProposeCaseType` bullet, replace "and defaults unknown value pickers to `most_frequent`." with:

```markdown
defaults unknown value pickers to `most_frequent`, and replaces a value
picker its column's catalog type does not allow with `most_frequent` too
(`ValuePickerRule.toAllowedRuleType`; the catalog columns come from
`fetchWorkspaceSchema` through `runChatAttemptsWithEscalation`).
```

In step 2 of the two-step conversion (`createdCaseTypeToFormValues`), add after its first sentence:

```markdown
   It holds each field's rule to its column's type and stores the rule's
   output type as the field's `data_type`.
```

- [ ] **Step 3: Section 7.1 (value rules)**

Replace the rows of the rule table that describe `sum`, `avg`, `count`, `max`, and `min` with:

```markdown
| `max`, `min` | `MAX(col)`, `MIN(col)`, in the column's own type. Text compares by bytes, so `'10' < '9'` and `'Z' < 'a'` | Ties share one value |
| `count` | `COUNT(col)`, `BIGINT`. `0` when no row matches | Exact |
| `sum`, `avg` | `CAST(<agg>(col) AS DOUBLE)` | Floating-point |
```

Then add after the table:

```markdown
**Typed rules.** Every rule has an output type, and a field's `data_type` is
always that type: `first`, `most_frequent`, `max`, and `min` keep the column's
type; `sum` and `avg` emit `double`; `count` emits `bigint`. A list field
stores its column's type. `sum` and `avg` are allowed only on `bigint` and
`double` columns, and `max` and `min` on every type but `boolean`.
`ValuePickerRule` (`shared/models/ontology/ValuePickerRule/`) is the one
implementation of this table, used by every authoring path. The query planner
refuses a stored rule its column's current type does not allow, which can
only happen when the column's type is edited after the field was made.
Rows created before this rule were corrected by the hand-written migration
`*_correct_value_rule_data_types.sql`.
```

In the paragraph that lists where the rule names are hand-written, add:

```markdown
`ValuePickerRule` matches the rules exhaustively, so a new enum value does not
compile until its output type and allowed column types are declared. The
correction migration also lists them, once, in SQL.
```

- [ ] **Step 4: Section 8 (concepts as QETL relations)**

In the "Column resolution" row of the pieces table, append to the "What it guarantees" cell:

```markdown
; a single-value attribute whose rule its column's type does not allow throws
```

- [ ] **Step 5: Section 10 (invariants)**

Add these rows to the table:

```markdown
| A field's `data_type` is its rule's output type (its column's type for a list field) | `ValuePickerRule.getOutputDataType` in `createdCaseTypeToFormValues` and the form's `withFieldDataTypes`; the correction migration for older rows | A column type edited later in the Data Manager can leave it stale (section 16) |
| A stored rule is one its column's type allows | Option lists use `ValuePickerRule.getAllowedRuleTypes`; `parseProposeCaseType` and `createdCaseTypeToFormValues` replace a disallowed rule; `makeConceptAttributeColumnsFromMetadata` throws on one | List fields apply no rule and are not checked |
```

- [ ] **Step 6: Section 15 (testing)**

Add these rows to the coverage table:

```markdown
| Value rule table | `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.test.ts` | `pnpm test:frontend ValuePickerRule` |
| Value rule output types against real DuckDB | `buildConceptViewSql.executed.test.ts` (`value rule output types`) | `pnpm test:executed buildConceptViewSql` |
| Rule and data type correction of older rows | `supabase/migration-upgrade-tests/value_rule_data_types.*.sql` | `pnpm test:db`, after the switch check |
```

- [ ] **Step 7: Section 16 (known limitations)**

Delete the row that starts "`max`/`min` cast to `DOUBLE`". Add:

```markdown
| A dataset column's type edited after a field reads it leaves the field's `data_type` stale | The Data Explorer offers menus for the old type; a rule the new type disallows makes the case type fail to plan, with a message naming the field | Read |
```

- [ ] **Step 8: Check and commit**

Run: `rg -n "AS DOUBLE\b" docs/ontology-architecture.md`
Expected: only the `sum`, `avg` row.

```bash
git add docs/ontology-architecture.md
git commit -m "docs(joined-cases): describe typed value rules in the ontology architecture"
```

---

## Verification checklist

- [ ] `ava supabase status` named `feat-joined-cases` before every database command, and nothing ran against production.
- [ ] The only new migration is the hand-written `<ts>_correct_value_rule_data_types.sql`. No file under `supabase/schemas/` changed, and `shared/types/database.types.ts` did not change.
- [ ] `pnpm test:db` passes, including the `value_rule_data_types` replay.
- [ ] `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, `pnpm lint`, and `pnpm i18n:check` pass.
- [ ] `rg -n "AS DOUBLE" src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/` prints only the `sum` and `avg` arms of `_buildReducedValueSql`.
- [ ] The exit-criteria query in Task 10 Step 3 returns `0` locally.
- [ ] The three screenshots in `.temp/feat-joined-cases/` show the text-column options, a `max` date on a record, and Sum offered for a count field.
- [ ] `git status` shows only `supabase/config.toml` modified.
