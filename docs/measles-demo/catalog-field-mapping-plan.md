# Catalog field mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every drive-index pipeline maps its source's dataset records onto a
common catalog metadata schema (organization levels 1-4, domains, tags,
description, and more) through a per-pipeline YAML file, keeps the raw source
record, and records each drive's organization labels.

**Architecture:** `@avandar/etl` gains a pipeline config parser and a
`CatalogFieldMapper` that compiles a YAML file's `from` / `value` / `script`
mappings once per run (each script imported once) into a synchronous
`mapFields(record, driveKey)`. The engine gains a drives store and writes each
listing's `drive_id`. Socrata and HDX load their YAML in `run.ts`, spread the
mapped fields into each relation, and store the raw record as
`source_metadata`. The schema renames `external_organization_name` to
`organization1_name` and adds the new columns and a `data_catalog_drives`
table.

**Tech Stack:** TypeScript, zod 4, `yaml` 2.9, vitest, Supabase (Postgres,
pgTAP, declarative schemas), Bun (pipeline server), vite-node
(`ava pipeline run`).

**Spec:** [`catalog-field-mapping-design.md`](catalog-field-mapping-design.md).
Read it first. Section numbers below (for example "spec §4.4") point into it.

---

## Ground rules for this plan

- Work in `/Users/juanpablosarmiento/src/worktrees/avandar/demo/measles`
  (branch `demo/measles`). Commit after every task, by path, never
  `git add -A`. Never stage `supabase/config.toml`.
- Red/green TDD: write the test, run it and watch it fail for the stated
  reason, then implement.
- Read `docs/rules/typescript.md` and `docs/rules/testing.md` before Task 1,
  and `docs/rules/sql.md` before Task 4.
- Code style: match the surrounding files. Docstrings on every exported
  symbol, `function` bodies with explicit `return`, no `any`, no em dashes in
  comments, full-word names.
- A column number is attached to the word: `organization1_name`, never
  `organization_1_name` (spec §3.1 explains why).
- `display_name` is never mapped by YAML (spec §4.3).
- Commands:
  - ETL package tests: `pnpm --filter @avandar/etl test`
  - ETL Supabase tests: `pnpm --filter @avandar/etl test:supabase`
  - Pipeline server tests: `pnpm --filter @avandar/pipeline-server test`
  - App and shared tests: `pnpm test:frontend`
  - Types, whole repo: `pnpm exec tsc -b`
  - Lint: `pnpm exec eslint <paths>`
  - Database tests: `pnpm test:db`
  - Format before each commit: `pnpm format`

## File map

| File | Responsibility |
|---|---|
| `packages/node/etl/src/EtlConfig/PipelineConfig.types.ts` | Create. The pipeline config's types and the list of mappable fields |
| `packages/node/etl/src/EtlConfig/parsePipelineConfig/parsePipelineConfig.ts` | Create. YAML text to a validated `PipelineConfig` |
| `packages/node/etl/src/EtlConfig/readPipelineConfigFile/readPipelineConfigFile.ts` | Create. Reads and parses one config file |
| `packages/node/etl/src/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader.ts` | Create. A `from` path to a lookup function |
| `packages/node/etl/src/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue.ts` | Create. Coerces a raw value to a field's type (spec §4.4) |
| `packages/node/etl/src/EtlConfig/resolveDriveOrganizationLabels/resolveDriveOrganizationLabels.ts` | Create. A drive's labels: its own, or the pipeline's |
| `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper.ts` | Create. Compiles a config into a `CatalogFieldMapper`, importing each script once |
| `packages/node/etl/src/EtlConfig/EtlConfig.types.ts`, `parseEtlConfig.ts`, `getWorkspaceLoadabilityRules.ts` | Modify. Per-pipeline loadability overrides move into the pipeline config |
| `packages/node/etl/src/EtlEngine/EtlEngine.types.ts` | Modify. Organization labels, drive description, new relation fields, `drivesTable` |
| `packages/node/etl/src/stores/EtlStores.types.ts`, `listingContractColumns.ts` | Modify. New listing columns, `DrivesStore` |
| `packages/node/etl/src/stores/InMemoryDrivesStore/createInMemoryDrivesStore.ts` | Create |
| `packages/node/etl/src/stores/SupabaseDrivesStore/createSupabaseDrivesStore.ts` | Create |
| `packages/node/etl/src/EtlEngine/buildListingRowFromRelation/…`, `isListingRowUnchanged/…`, `loadRelationsPage/…`, `crawlScope/…`, `createEtlEngine/…` | Modify. Write the new columns and `drive_id`, upsert drives |
| `packages/node/etl/src/index.ts`, `packages/node/etl/README.md` | Modify. Export and document the new API |
| `supabase/schemas/10.data_catalog_drives.sql` | Create. The drives table |
| `supabase/schemas/10.data_catalog_listings.sql`, `50.rpc_data_catalog_listings__upsert_with_relation_columns.sql` | Modify |
| `supabase/tests/database/data_catalog_drives.test.sql` | Create |
| `supabase/migration-upgrade-tests/catalog_field_mapping.{prelude,assertions}.sql` | Create. Proves the rename keeps values |
| `shared/connectors/open-data/SocrataDiscoveryClient/*`, `CkanClient/*` | Modify. Keep each result's raw record as `sourceRecord` |
| `apps/pipeline-server/pipelines/shared/loadPipelineDefinition/loadPipelineDefinition.ts` | Create. Reads a pipeline's YAML and builds its mapper |
| `apps/pipeline-server/pipelines/socrata/socrata.pipeline.yaml`, `socrata/mappers/*` | Create |
| `apps/pipeline-server/pipelines/hdx/hdx.pipeline.yaml`, `hdx/mappers/*` | Create |
| `apps/pipeline-server/pipelines/socrata/configuredDrives/configuredDrives.ts`, `hdx/hdxDrive.ts` | Modify. Drive types and YAML-to-drive conversion; the hardcoded drive lists go |
| Every reader of `external_organization_name` / `externalOrganizationName` | Modify. Renamed (Task 5 lists them) |

---

### Task 0: Isolated database and a green baseline

**Files:** none.

- [ ] **Step 1: Check the Supabase switch.** This is a stop condition (see
  `CLAUDE.md`, "Check the switch BEFORE any database command").

Run: `ava supabase status`
Expected: the first line is green and names a switched project for
`demo/measles`, not the shared `avandar` stack. If it is yellow, run
`ava supabase switch`, then `ava supabase status` again, and do not continue
until it is green. If `ava` is missing, run `pnpm build:ava-cli` first.

- [ ] **Step 2: Record the baseline.**

Run each and note any failure that exists before your change, so you do not
chase it later:

```bash
pnpm --filter @avandar/etl test
pnpm --filter @avandar/pipeline-server test
pnpm exec tsc -b
```

Expected: all pass. If something fails here, stop and report it rather than
fixing it in this plan.

---

### Task 1: Pipeline config types and parser

**Files:**
- Create: `packages/node/etl/src/EtlConfig/PipelineConfig.types.ts`
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts` (add the
  organization label types near `EtlScope`)
- Create: `packages/node/etl/src/EtlConfig/parsePipelineConfig/parsePipelineConfig.ts`
- Create: `packages/node/etl/src/EtlConfig/readPipelineConfigFile/readPipelineConfigFile.ts`
- Test: `packages/node/etl/src/EtlConfig/parsePipelineConfig/parsePipelineConfig.test.ts`

- [ ] **Step 1: Add the organization label types to `EtlEngine.types.ts`**,
  directly after the `EtlScope` type:

```ts
/**
 * An organization level, broadest first, the way admin1, admin2, and admin3
 * nest administrative boundaries. Level 1 might be a city and level 2 one of
 * its agencies.
 */
export type EtlOrganizationLevel = 1 | 2 | 3 | 4;

/**
 * What each organization level is called on one drive, such as `City` for
 * level 1 and `Agency` for level 2. A level with no label is one the drive
 * does not use.
 */
export type EtlOrganizationLabels = Readonly<
  Partial<Record<EtlOrganizationLevel, string>>
>;

/** What the engine records about one drive in the drives table. */
export type EtlDriveDescription = Readonly<{
  organizationLabels: EtlOrganizationLabels;
}>;
```

- [ ] **Step 2: Create `PipelineConfig.types.ts`:**

```ts
import type { EtlPipelineWorkspaceLoadability } from "@etl/EtlConfig/EtlConfig.types";
import type { EtlOrganizationLabels } from "@etl/EtlEngine/EtlEngine.types";

/**
 * The listing fields a pipeline config can map, as the listings table names
 * them. Everything else a listing carries (its ids, format, columns, display
 * name, the timestamp a crawl resumes from, its URLs, and its loadability)
 * stays computed in code, because a pipeline's correctness depends on it.
 */
export const CATALOG_MAPPABLE_FIELDS = [
  "description",
  "notes",
  "license",
  "update_frequency",
  "canonical_urls",
  "coverage_start_date",
  "coverage_end_date",
  "organization1_name",
  "organization2_name",
  "organization3_name",
  "organization4_name",
  "domains",
  "tags",
] as const;

/** One listing field a pipeline config can map. */
export type CatalogMappableField = (typeof CATALOG_MAPPABLE_FIELDS)[number];

/** The one field every drive must map. */
export const REQUIRED_CATALOG_FIELD = "organization1_name";

/**
 * Where one field's value comes from: a dotted path into the source record,
 * a constant, or the default export of a script whose path is relative to
 * the config file.
 */
export type CatalogFieldSource =
  | Readonly<{ from: string }>
  | Readonly<{ value: string | readonly string[] }>
  | Readonly<{ script: string }>;

/** A set of field mappings, keyed by the field each one fills. */
export type CatalogFieldMappings = Readonly<
  Partial<Record<CatalogMappableField, CatalogFieldSource>>
>;

/** One drive in a pipeline config. */
export type PipelineDriveConfig = Readonly<{
  /** `https://`, with no trailing slash. Also the drive's key. */
  baseUrl: string;
  /**
   * Replaces the pipeline's labels for this drive. A level this omits has
   * no label, even when the pipeline's labels name it.
   */
  organizationLabels?: EtlOrganizationLabels;
  /** Merged over the pipeline's `fields`, key by key. */
  fields?: CatalogFieldMappings;
  /** Left unparsed here: each pipeline validates its own scopes. */
  scopes?: unknown;
}>;

/**
 * One pipeline's config file, such as `socrata.pipeline.yaml`: its drives,
 * how each source record becomes catalog metadata, and its changes to the
 * shared workspace loadability rules.
 */
export type PipelineConfig = Readonly<{
  /** The labels every drive uses unless it sets its own. */
  organizationLabels?: EtlOrganizationLabels;
  /** The mappings every drive uses. */
  fields?: CatalogFieldMappings;
  /** The drives to crawl, in order. Empty switches the pipeline off. */
  drives: readonly PipelineDriveConfig[];
  /** This pipeline's changes to `etl.config.yaml`'s global rules. */
  workspaceLoadability?: EtlPipelineWorkspaceLoadability;
}>;
```

- [ ] **Step 3: Write the failing test** `parsePipelineConfig.test.ts`:

```ts
import { parsePipelineConfig } from "@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig";
import { describe, expect, it } from "vitest";

function _parse(lines: readonly string[]) {
  return parsePipelineConfig({
    yamlText: lines.join("\n"),
    sourceName: "test.pipeline.yaml",
  });
}

describe("parsePipelineConfig", () => {
  it("reads labels, shared fields, and drives with their own overrides", () => {
    const config = _parse([
      "organizationLabels:",
      "  1: City",
      "  2: Agency",
      "fields:",
      "  description: { from: resource.description }",
      "  domains: { script: ./mappers/domains.ts }",
      "drives:",
      "  - baseUrl: https://data.example.gov",
      "    organizationLabels: { 1: State }",
      "    fields:",
      "      organization1_name: { value: State of Example }",
      "      tags: { value: [health, vaccines] }",
      "    scopes: [{ key: health, categories: [Health] }]",
    ]);

    expect(config).toEqual({
      organizationLabels: { 1: "City", 2: "Agency" },
      fields: {
        description: { from: "resource.description" },
        domains: { script: "./mappers/domains.ts" },
      },
      drives: [
        {
          baseUrl: "https://data.example.gov",
          organizationLabels: { 1: "State" },
          fields: {
            organization1_name: { value: "State of Example" },
            tags: { value: ["health", "vaccines"] },
          },
          scopes: [{ key: "health", categories: ["Health"] }],
        },
      ],
    });
  });

  it("reads this pipeline's workspace loadability overrides", () => {
    const config = _parse([
      "workspaceLoadability:",
      "  loadableFormats: [XLSX]",
      "drives: []",
    ]);

    expect(config.workspaceLoadability).toEqual({ loadableFormats: ["XLSX"] });
  });

  it("refuses a field that is not mappable, naming it", () => {
    expect(() => {
      return _parse([
        "fields:",
        "  display_name: { from: resource.name }",
        "drives: []",
      ]);
    }).toThrow(/test\.pipeline\.yaml[\s\S]*display_name/);
  });

  it("refuses a mapping that sets two sources", () => {
    expect(() => {
      return _parse([
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "    fields:",
        "      organization1_name: { value: A, from: resource.name }",
      ]);
    }).toThrow("must set exactly one of from, value, or script");
  });

  it("refuses a from path that is not dotted segments", () => {
    expect(() => {
      return _parse([
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "    fields:",
        "      organization1_name: { from: 'tags[].name' }",
      ]);
    }).toThrow("must set exactly one of from, value, or script");
  });

  it("refuses a drive that maps no organization1_name, naming the drive", () => {
    expect(() => {
      return _parse(["drives:", "  - baseUrl: https://data.example.gov"]);
    }).toThrow(
      "Drive https://data.example.gov does not map organization1_name",
    );
  });

  it("accepts organization1_name from the pipeline's shared fields", () => {
    const config = _parse([
      "fields:",
      "  organization1_name: { value: Shared Org }",
      "drives:",
      "  - baseUrl: https://data.example.gov",
    ]);

    expect(config.drives).toHaveLength(1);
  });

  it.each([
    ["not https", "http://data.example.gov"],
    ["a trailing slash", "https://data.example.gov/"],
  ])("refuses a baseUrl with %s", (_name, baseUrl) => {
    expect(() => {
      return _parse([
        "fields:",
        "  organization1_name: { value: Org }",
        "drives:",
        `  - baseUrl: ${baseUrl}`,
      ]);
    }).toThrow("baseUrl");
  });

  it("refuses two drives with the same baseUrl", () => {
    expect(() => {
      return _parse([
        "fields:",
        "  organization1_name: { value: Org }",
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "  - baseUrl: https://data.example.gov",
      ]);
    }).toThrow("Drive https://data.example.gov is listed twice");
  });

  it("refuses an unknown top-level key", () => {
    expect(() => {
      return _parse(["drive: []"]);
    }).toThrow("test.pipeline.yaml is not a valid pipeline config");
  });

  it("refuses a label level outside 1-4", () => {
    expect(() => {
      return _parse(["organizationLabels: { 5: Ward }", "drives: []"]);
    }).toThrow("organizationLabels");
  });
});
```

- [ ] **Step 4: Run it and watch it fail.**

Run: `pnpm --filter @avandar/etl test parsePipelineConfig`
Expected: FAIL, `Cannot find module '@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig'`.

- [ ] **Step 5: Implement `parsePipelineConfig.ts`:**

```ts
import { parse } from "yaml";
import { z } from "zod";
import {
  CATALOG_MAPPABLE_FIELDS,
  REQUIRED_CATALOG_FIELD,
} from "@etl/EtlConfig/PipelineConfig.types";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/** Dotted segments of letters, digits, `_`, and `-`, such as `a.b.0`. */
const FIELD_PATH_PATTERN = /^[\w-]+(\.[\w-]+)*$/;

const FieldSourceSchema = z.union(
  [
    z.strictObject({ from: z.string().regex(FIELD_PATH_PATTERN) }),
    z.strictObject({
      value: z.union([
        z.string().min(1),
        z.array(z.string().min(1)).min(1),
      ]),
    }),
    z.strictObject({ script: z.string().min(1) }),
  ],
  { error: "must set exactly one of from, value, or script" },
);

const FieldMappingsSchema = z.partialRecord(
  z.enum(CATALOG_MAPPABLE_FIELDS),
  FieldSourceSchema,
);

const OrganizationLabelsSchema = z.strictObject({
  1: z.string().min(1).optional(),
  2: z.string().min(1).optional(),
  3: z.string().min(1).optional(),
  4: z.string().min(1).optional(),
});

const BaseUrlSchema = z
  .string()
  .startsWith("https://", { error: "baseUrl must start with https://" })
  .refine(
    (baseUrl) => {
      return !baseUrl.endsWith("/");
    },
    { error: "baseUrl must not end with /" },
  );

const FormatListSchema = z.array(z.string());

const PipelineConfigSchema = z.strictObject({
  organizationLabels: OrganizationLabelsSchema.optional(),
  fields: FieldMappingsSchema.optional(),
  drives: z.array(
    z.strictObject({
      baseUrl: BaseUrlSchema,
      organizationLabels: OrganizationLabelsSchema.optional(),
      fields: FieldMappingsSchema.optional(),
      scopes: z.unknown().optional(),
    }),
  ),
  workspaceLoadability: z
    .strictObject({
      loadableFormats: FormatListSchema.optional(),
      unloadableFormats: FormatListSchema.optional(),
    })
    .optional(),
});

/**
 * Throws when a drive maps no `organization1_name`, through its own fields
 * or the pipeline's, or when two drives share a `baseUrl`.
 */
function _assertValidDrives(config: PipelineConfig, sourceName: string): void {
  const seenBaseUrls = new Set<string>();
  config.drives.forEach((drive) => {
    if (seenBaseUrls.has(drive.baseUrl)) {
      throw new Error(
        `${sourceName}: Drive ${drive.baseUrl} is listed twice.`,
      );
    }
    seenBaseUrls.add(drive.baseUrl);
    const mergedFields = { ...config.fields, ...drive.fields };
    if (mergedFields[REQUIRED_CATALOG_FIELD] === undefined) {
      throw new Error(
        `${sourceName}: Drive ${drive.baseUrl} does not map ${REQUIRED_CATALOG_FIELD}, in its own fields or the pipeline's.`,
      );
    }
  });
}

/**
 * Parses one pipeline's config from YAML (see `PipelineConfig`). Unknown
 * keys, unmappable fields, and mappings with zero or two sources are
 * refused, so a typo fails the run before any network call rather than
 * silently leaving a field empty.
 *
 * @param args.yamlText - The file's contents.
 * @param args.sourceName - Names the file in error messages.
 * @returns The config.
 * @throws When the YAML does not parse, does not match the config's shape,
 * lists a drive twice, or has a drive that maps no `organization1_name`.
 */
export function parsePipelineConfig(args: {
  yamlText: string;
  sourceName: string;
}): PipelineConfig {
  const rawConfig: unknown = parse(args.yamlText) ?? {};
  const parsed = PipelineConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error(
      `${args.sourceName} is not a valid pipeline config: ${z.prettifyError(parsed.error)}`,
    );
  }
  _assertValidDrives(parsed.data, args.sourceName);
  return parsed.data;
}
```

- [ ] **Step 6: Create `readPipelineConfigFile.ts`:**

```ts
import { readFileSync } from "node:fs";
import { parsePipelineConfig } from "@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/**
 * Reads and parses one pipeline's config file.
 *
 * @param filePath - The YAML file, such as `socrata.pipeline.yaml`.
 * @returns The config.
 * @throws When the file cannot be read or is not a valid config.
 */
export function readPipelineConfigFile(filePath: string): PipelineConfig {
  return parsePipelineConfig({
    yamlText: readFileSync(filePath, "utf8"),
    sourceName: filePath,
  });
}
```

- [ ] **Step 7: Run the test and watch it pass.**

Run: `pnpm --filter @avandar/etl test parsePipelineConfig`
Expected: PASS, 12 tests. If the "not https" or label-level case fails
because zod's message differs, fix the test's expected substring only if the
thrown message still names the offending key (`baseUrl`,
`organizationLabels`).

- [ ] **Step 8: Export them** from `packages/node/etl/src/index.ts`, beside
  the existing `EtlConfig` exports, so the pipeline server can import them
  from `@avandar/etl`:

```ts
export { CATALOG_MAPPABLE_FIELDS } from "@etl/EtlConfig/PipelineConfig.types";
export type {
  CatalogFieldMappings,
  CatalogFieldSource,
  CatalogMappableField,
  PipelineConfig,
  PipelineDriveConfig,
} from "@etl/EtlConfig/PipelineConfig.types";
export { parsePipelineConfig } from "@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig";
export { readPipelineConfigFile } from "@etl/EtlConfig/readPipelineConfigFile/readPipelineConfigFile";
```

and add `EtlDriveDescription`, `EtlOrganizationLabels`, and
`EtlOrganizationLevel` to the existing `EtlEngine.types` type export list.

- [ ] **Step 9: Commit.**

```bash
pnpm --filter @avandar/etl type-check
pnpm format
git add packages/node/etl/src/EtlConfig/PipelineConfig.types.ts \
  packages/node/etl/src/EtlConfig/parsePipelineConfig \
  packages/node/etl/src/EtlConfig/readPipelineConfigFile \
  packages/node/etl/src/EtlEngine/EtlEngine.types.ts \
  packages/node/etl/src/index.ts
git commit -m "feat(etl): parse per-pipeline catalog field mapping configs"
```

---

### Task 2: `from` paths and value coercion

**Files:**
- Create: `packages/node/etl/src/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader.ts`
- Create: `packages/node/etl/src/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue.ts`
- Test: a `.test.ts` beside each

- [ ] **Step 1: Write the failing test** `buildCatalogFieldPathReader.test.ts`:

```ts
import { buildCatalogFieldPathReader } from "@etl/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader";
import { describe, expect, it } from "vitest";

const RECORD = {
  resource: { name: "Trips", attribution: null },
  groups: [{ title: "Kenya" }, { title: "Chad" }],
};

describe("buildCatalogFieldPathReader", () => {
  it("reads a nested value", () => {
    expect(buildCatalogFieldPathReader("resource.name")(RECORD)).toBe("Trips");
  });

  it("indexes an array with a numeric segment", () => {
    expect(buildCatalogFieldPathReader("groups.1.title")(RECORD)).toBe("Chad");
  });

  it.each([
    ["a missing key", "resource.description"],
    ["a path through null", "resource.attribution.name"],
    ["a non-numeric segment on an array", "groups.title"],
    ["a path past a string", "resource.name.length"],
  ])("returns undefined for %s", (_name, path) => {
    expect(buildCatalogFieldPathReader(path)(RECORD)).toBeUndefined();
  });

  it("never reads inherited properties", () => {
    expect(
      buildCatalogFieldPathReader("resource.constructor")(RECORD),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `pnpm --filter @avandar/etl test buildCatalogFieldPathReader`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `buildCatalogFieldPathReader.ts`:**

```ts
const ARRAY_INDEX_PATTERN = /^\d+$/;

function _readSegment(current: unknown, segment: string): unknown {
  if (Array.isArray(current)) {
    return ARRAY_INDEX_PATTERN.test(segment)
      ? (current as readonly unknown[])[Number(segment)]
      : undefined;
  }
  if (typeof current === "object" && current !== null) {
    return Object.hasOwn(current, segment)
      ? (current as Readonly<Record<string, unknown>>)[segment]
      : undefined;
  }
  return undefined;
}

/**
 * Compiles a `from` path, such as `classification.domain_tags` or
 * `groups.0.title`, into a function that reads it from a source record. The
 * path is split once, here, not on every read. A numeric segment indexes an
 * array. A missing key, a path through `null` or a primitive, and an
 * inherited property all read as `undefined`.
 *
 * @param path - Dotted segments, already validated by the config parser.
 * @returns The reader.
 */
export function buildCatalogFieldPathReader(
  path: string,
): (record: unknown) => unknown {
  const segments = path.split(".");
  return (record) => {
    return segments.reduce<unknown>(_readSegment, record);
  };
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run: `pnpm --filter @avandar/etl test buildCatalogFieldPathReader`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing test** `coerceCatalogFieldValue.test.ts`:

```ts
import { coerceCatalogFieldValue } from "@etl/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue";
import { describe, expect, it } from "vitest";

describe("coerceCatalogFieldValue", () => {
  describe("text fields", () => {
    it("trims a string", () => {
      expect(
        coerceCatalogFieldValue({ field: "description", value: "  Trips  " }),
      ).toEqual({ value: "Trips" });
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a blank string", "   "],
    ])("treats %s as no value, without a problem", (_name, value) => {
      expect(coerceCatalogFieldValue({ field: "license", value })).toEqual({
        value: undefined,
      });
    });

    it("reports a value that is not a string", () => {
      expect(
        coerceCatalogFieldValue({ field: "organization2_name", value: 7 }),
      ).toEqual({ value: undefined, problem: "expected text, got number" });
    });
  });

  describe("text array fields", () => {
    it("wraps a string into a one-item array", () => {
      expect(
        coerceCatalogFieldValue({ field: "domains", value: "Health" }),
      ).toEqual({ value: ["Health"] });
    });

    it("trims, drops blanks, and drops duplicates in order", () => {
      expect(
        coerceCatalogFieldValue({
          field: "tags",
          value: [" taxi ", "", "fhv", "taxi"],
        }),
      ).toEqual({ value: ["taxi", "fhv"] });
    });

    it("treats an array with nothing left as no value", () => {
      expect(
        coerceCatalogFieldValue({ field: "tags", value: ["", "  "] }),
      ).toEqual({ value: undefined });
    });

    it("reports an array holding a non-string", () => {
      expect(
        coerceCatalogFieldValue({ field: "canonical_urls", value: ["a", 1] }),
      ).toEqual({
        value: undefined,
        problem: "expected text or a list of text, got a list holding number",
      });
    });
  });

  describe("date fields", () => {
    it("parses an ISO 8601 string", () => {
      expect(
        coerceCatalogFieldValue({
          field: "coverage_start_date",
          value: "2026-01-02T00:00:00Z",
        }),
      ).toEqual({ value: new Date("2026-01-02T00:00:00Z") });
    });

    it("reports a string that is not a date", () => {
      expect(
        coerceCatalogFieldValue({
          field: "coverage_end_date",
          value: "last spring",
        }),
      ).toEqual({
        value: undefined,
        problem: 'expected an ISO 8601 date, got "last spring"',
      });
    });
  });
});
```

- [ ] **Step 6: Run it and watch it fail.**

Run: `pnpm --filter @avandar/etl test coerceCatalogFieldValue`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement `coerceCatalogFieldValue.ts`:**

```ts
import type { CatalogMappableField } from "@etl/EtlConfig/PipelineConfig.types";

/** A coerced value, and why the raw value was dropped when it was. */
export type CatalogFieldCoercion = Readonly<{
  value: string | readonly string[] | Date | undefined;
  /** Set only when a present value had the wrong type. */
  problem?: string;
}>;

const TEXT_ARRAY_FIELDS: ReadonlySet<CatalogMappableField> = new Set([
  "canonical_urls",
  "domains",
  "tags",
]);

const DATE_FIELDS: ReadonlySet<CatalogMappableField> = new Set([
  "coverage_start_date",
  "coverage_end_date",
]);

const NO_VALUE: CatalogFieldCoercion = { value: undefined };

function _describeType(value: unknown): string {
  return Array.isArray(value) ? "list" : typeof value;
}

function _coerceText(value: unknown): CatalogFieldCoercion {
  if (typeof value !== "string") {
    return { value: undefined, problem: `expected text, got ${_describeType(value)}` };
  }
  const trimmed = value.trim();
  return trimmed === "" ? NO_VALUE : { value: trimmed };
}

function _coerceTextArray(value: unknown): CatalogFieldCoercion {
  const items: readonly unknown[] = Array.isArray(value) ? value : [value];
  const nonString = items.find((item) => {
    return typeof item !== "string";
  });
  if (nonString !== undefined) {
    return {
      value: undefined,
      problem: Array.isArray(value)
        ? `expected text or a list of text, got a list holding ${_describeType(nonString)}`
        : `expected text or a list of text, got ${_describeType(value)}`,
    };
  }
  const texts = [
    ...new Set(
      (items as readonly string[])
        .map((item) => {
          return item.trim();
        })
        .filter((item) => {
          return item !== "";
        }),
    ),
  ];
  return texts.length === 0 ? NO_VALUE : { value: texts };
}

function _coerceDate(value: unknown): CatalogFieldCoercion {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(time)) {
    return {
      value: undefined,
      problem: `expected an ISO 8601 date, got ${JSON.stringify(value)}`,
    };
  }
  return { value: new Date(time) };
}

/**
 * Coerces a raw value, from a `from` path, a constant, or a script, to the
 * type its field stores (spec section 4.4 of
 * `docs/measles-demo/catalog-field-mapping-design.md`). `undefined`, `null`,
 * and blank text are no value and no problem. A value of the wrong type is
 * dropped with a problem the caller logs.
 *
 * @param args.field - The field the value is for.
 * @param args.value - The raw value.
 * @returns The coerced value, and a problem when one was dropped.
 */
export function coerceCatalogFieldValue(args: {
  field: CatalogMappableField;
  value: unknown;
}): CatalogFieldCoercion {
  const { field, value } = args;
  if (value === undefined || value === null) {
    return NO_VALUE;
  }
  if (TEXT_ARRAY_FIELDS.has(field)) {
    return _coerceTextArray(value);
  }
  if (DATE_FIELDS.has(field)) {
    return _coerceDate(value);
  }
  return _coerceText(value);
}
```

Note: the docstring above points at the spec by path, which is allowed: the
spec lives in the codebase. Do not reference this plan.

- [ ] **Step 8: Run the test and watch it pass.**

Run: `pnpm --filter @avandar/etl test coerceCatalogFieldValue`
Expected: PASS, 11 tests.

- [ ] **Step 9: Commit.**

```bash
pnpm format
git add packages/node/etl/src/EtlConfig/buildCatalogFieldPathReader \
  packages/node/etl/src/EtlConfig/coerceCatalogFieldValue
git commit -m "feat(etl): read catalog field paths and coerce mapped values"
```

---

### Task 3: The field mapper, with scripts imported once

**Files:**
- Create: `packages/node/etl/src/EtlConfig/resolveDriveOrganizationLabels/resolveDriveOrganizationLabels.ts` and its test
- Create: `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper.ts`
- Create: `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/__fixtures__/upperCaseName.ts`
- Create: `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/__fixtures__/throwsOnRecord.ts`
- Create: `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/__fixtures__/noDefaultFunction.ts`
- Test: `packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper.test.ts`

- [ ] **Step 1: Write the failing test** `resolveDriveOrganizationLabels.test.ts`:

```ts
import { resolveDriveOrganizationLabels } from "@etl/EtlConfig/resolveDriveOrganizationLabels/resolveDriveOrganizationLabels";
import { describe, expect, it } from "vitest";

const CONFIG = {
  organizationLabels: { 1: "City", 2: "Agency" },
  drives: [],
};

describe("resolveDriveOrganizationLabels", () => {
  it("gives a drive with no labels the pipeline's", () => {
    expect(
      resolveDriveOrganizationLabels({
        config: CONFIG,
        drive: { baseUrl: "https://a.example.gov" },
      }),
    ).toEqual({ 1: "City", 2: "Agency" });
  });

  it("replaces the pipeline's labels whole, not level by level", () => {
    expect(
      resolveDriveOrganizationLabels({
        config: CONFIG,
        drive: { baseUrl: "https://a.example.gov", organizationLabels: { 1: "State" } },
      }),
    ).toEqual({ 1: "State" });
  });

  it("gives no labels when neither sets any", () => {
    expect(
      resolveDriveOrganizationLabels({
        config: { drives: [] },
        drive: { baseUrl: "https://a.example.gov" },
      }),
    ).toEqual({});
  });
});
```

- [ ] **Step 2: Run it, watch it fail, then implement
  `resolveDriveOrganizationLabels.ts`:**

```ts
import type {
  PipelineConfig,
  PipelineDriveConfig,
} from "@etl/EtlConfig/PipelineConfig.types";
import type { EtlOrganizationLabels } from "@etl/EtlEngine/EtlEngine.types";

/**
 * One drive's organization labels: its own when it sets any, otherwise the
 * pipeline's. A drive's labels replace the pipeline's whole, so a drive
 * never shows a label for a level it does not fill.
 *
 * @param args.config - The pipeline config.
 * @param args.drive - One of its drives.
 * @returns The labels, possibly empty.
 */
export function resolveDriveOrganizationLabels(args: {
  config: PipelineConfig;
  drive: PipelineDriveConfig;
}): EtlOrganizationLabels {
  return args.drive.organizationLabels ?? args.config.organizationLabels ?? {};
}
```

Run: `pnpm --filter @avandar/etl test resolveDriveOrganizationLabels`
Expected: FAIL first (module not found), then PASS, 3 tests.

- [ ] **Step 3: Create the fixture scripts.**

`__fixtures__/upperCaseName.ts`:

```ts
import type { CatalogFieldScriptContext } from "@etl/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper";

/** Test fixture: the record's `name`, upper-cased, tagged with the field. */
export default function upperCaseName(
  record: unknown,
  context: CatalogFieldScriptContext,
): unknown {
  const name = (record as { name?: unknown }).name;
  return typeof name === "string"
    ? `${name.toUpperCase()} (${context.field} on ${context.driveKey})`
    : undefined;
}
```

`__fixtures__/throwsOnRecord.ts`:

```ts
/** Test fixture: always throws, as a broken mapper script would. */
export default function throwsOnRecord(): never {
  throw new Error("fixture script failure");
}
```

`__fixtures__/noDefaultFunction.ts`:

```ts
/** Test fixture: a module whose default export is not a function. */
const notAFunction = "not a function";

export default notAFunction;
```

- [ ] **Step 4: Write the failing test** `loadCatalogFieldMapper.test.ts`:

```ts
import { fileURLToPath } from "node:url";
import { loadCatalogFieldMapper } from "@etl/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper";
import { describe, expect, it, vi } from "vitest";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/** The directory the fixture configs' script paths are relative to. */
const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));
const DRIVE = "https://data.example.gov";

function _config(fields: PipelineConfig["fields"]): PipelineConfig {
  return {
    fields: { organization1_name: { value: "Example City" }, ...fields },
    drives: [{ baseUrl: DRIVE }],
  };
}

describe("loadCatalogFieldMapper", () => {
  it("maps from paths, constants, and scripts into relation fields", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        description: { from: "info.summary" },
        tags: { value: ["health", "vaccines"] },
        organization2_name: { script: "./__fixtures__/upperCaseName.ts" },
      }),
      configDir: CONFIG_DIR,
    });

    expect(
      mapper.mapFields({ name: "tlc", info: { summary: "Trips" } }, DRIVE),
    ).toEqual({
      fields: {
        organization1Name: "Example City",
        description: "Trips",
        tags: ["health", "vaccines"],
        organization2Name: `TLC (organization2_name on ${DRIVE})`,
      },
      problems: [],
    });
  });

  it("lets a drive's fields override the pipeline's, key by key", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: {
        fields: {
          organization1_name: { value: "Shared" },
          description: { from: "summary" },
        },
        drives: [
          { baseUrl: DRIVE, fields: { organization1_name: { value: "Own" } } },
          { baseUrl: "https://other.example.gov" },
        ],
      },
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({ summary: "S" }, DRIVE).fields).toEqual({
      organization1Name: "Own",
      description: "S",
    });
    expect(
      mapper.mapFields({ summary: "S" }, "https://other.example.gov").fields
        .organization1Name,
    ).toBe("Shared");
  });

  it("imports each distinct script once, however many fields and records use it", async () => {
    const importScript = vi.fn(async (url: string) => {
      return await import(/* @vite-ignore */ url);
    });
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        organization2_name: { script: "./__fixtures__/upperCaseName.ts" },
        organization3_name: { script: "__fixtures__/upperCaseName.ts" },
      }),
      configDir: CONFIG_DIR,
      importScript,
    });

    Array.from({ length: 1000 }, (_, index) => {
      return mapper.mapFields({ name: `record ${index}` }, DRIVE);
    });

    expect(importScript).toHaveBeenCalledTimes(1);
    expect(importScript.mock.calls[0]?.[0]).toMatch(
      /^file:\/\/.*__fixtures__\/upperCaseName\.ts$/,
    );
  });

  it("nulls only the field a script throws on, and reports it", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        description: { script: "./__fixtures__/throwsOnRecord.ts" },
      }),
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({}, DRIVE)).toEqual({
      fields: { organization1Name: "Example City" },
      problems: [
        {
          field: "description",
          message:
            "script ./__fixtures__/throwsOnRecord.ts threw: fixture script failure",
        },
      ],
    });
  });

  it("reports a value of the wrong type and leaves the field out", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({ license: { from: "license" } }),
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({ license: 42 }, DRIVE)).toEqual({
      fields: { organization1Name: "Example City" },
      problems: [{ field: "license", message: "expected text, got number" }],
    });
  });

  it("fails to load when a script has no function default export", async () => {
    await expect(
      loadCatalogFieldMapper({
        config: _config({
          notes: { script: "./__fixtures__/noDefaultFunction.ts" },
        }),
        configDir: CONFIG_DIR,
      }),
    ).rejects.toThrow(
      "noDefaultFunction.ts must default-export a function (record, context) => value.",
    );
  });

  it("fails to load when a script does not exist", async () => {
    await expect(
      loadCatalogFieldMapper({
        config: _config({ notes: { script: "./__fixtures__/missing.ts" } }),
        configDir: CONFIG_DIR,
      }),
    ).rejects.toThrow("missing.ts");
  });

  it("refuses a drive the config does not list", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({}),
      configDir: CONFIG_DIR,
    });

    expect(() => {
      return mapper.mapFields({}, "https://unknown.example.gov");
    }).toThrow("https://unknown.example.gov is not a drive in this pipeline's config");
  });
});
```

- [ ] **Step 5: Run it and watch it fail.**

Run: `pnpm --filter @avandar/etl test loadCatalogFieldMapper`
Expected: FAIL, module not found (the fixtures' type import fails too).

- [ ] **Step 6: Implement `loadCatalogFieldMapper.ts`:**

```ts
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildCatalogFieldPathReader } from "@etl/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader";
import { coerceCatalogFieldValue } from "@etl/EtlConfig/coerceCatalogFieldValue/coerceCatalogFieldValue";
import type {
  CatalogFieldMappings,
  CatalogFieldSource,
  CatalogMappableField,
  PipelineConfig,
} from "@etl/EtlConfig/PipelineConfig.types";

/** What a mapper script receives besides the record. */
export type CatalogFieldScriptContext = Readonly<{
  /** The drive the record came from: its `baseUrl`. */
  driveKey: string;
  /** The field the script is filling. */
  field: CatalogMappableField;
}>;

/** A mapper script's default export. */
export type CatalogFieldScript = (
  record: unknown,
  context: CatalogFieldScriptContext,
) => unknown;

/**
 * The mapped fields, named as `RelationDescription` names them, so a
 * pipeline spreads them straight into a relation.
 */
export type CatalogMappedFields = Readonly<{
  description?: string;
  notes?: string;
  license?: string;
  updateFrequency?: string;
  canonicalUrls?: readonly string[];
  coverageStartDate?: Date;
  coverageEndDate?: Date;
  organization1Name?: string;
  organization2Name?: string;
  organization3Name?: string;
  organization4Name?: string;
  domains?: readonly string[];
  tags?: readonly string[];
}>;

/** A field that was left out of one record's mapping, and why. */
export type CatalogFieldMapProblem = Readonly<{
  field: CatalogMappableField;
  message: string;
}>;

/** One record's mapped fields, and the fields that could not be mapped. */
export type CatalogFieldMapResult = Readonly<{
  fields: CatalogMappedFields;
  problems: readonly CatalogFieldMapProblem[];
}>;

/** A pipeline config, compiled. Built once per run. */
export type CatalogFieldMapper = Readonly<{
  /**
   * Maps one source record from one drive. Synchronous: it reads no file
   * and imports nothing.
   *
   * @throws When `driveKey` is not a drive in the config.
   */
  mapFields: (record: unknown, driveKey: string) => CatalogFieldMapResult;
}>;

/** How a script module is imported. Replaced in tests to count imports. */
export type CatalogFieldScriptImporter = (url: string) => Promise<unknown>;

type _MappedFieldKey = keyof CatalogMappedFields;

const RELATION_KEY_BY_FIELD = {
  description: "description",
  notes: "notes",
  license: "license",
  update_frequency: "updateFrequency",
  canonical_urls: "canonicalUrls",
  coverage_start_date: "coverageStartDate",
  coverage_end_date: "coverageEndDate",
  organization1_name: "organization1Name",
  organization2_name: "organization2Name",
  organization3_name: "organization3Name",
  organization4_name: "organization4Name",
  domains: "domains",
  tags: "tags",
} as const satisfies Record<CatalogMappableField, _MappedFieldKey>;

/** One field of one drive, compiled to a function of the record. */
type _CompiledField = Readonly<{
  field: CatalogMappableField;
  /** Describes the source in a problem, such as `script ./x.ts`. */
  sourceLabel: string;
  read: (record: unknown, driveKey: string) => unknown;
}>;

const _importModule: CatalogFieldScriptImporter = async (url) => {
  return await import(/* @vite-ignore */ url);
};

function _listScriptPaths(config: PipelineConfig): readonly string[] {
  const allMappings: CatalogFieldMappings[] = [
    config.fields ?? {},
    ...config.drives.map((drive) => {
      return drive.fields ?? {};
    }),
  ];
  return allMappings.flatMap((mappings) => {
    return Object.values(mappings).flatMap((source) => {
      return source !== undefined && "script" in source ? [source.script] : [];
    });
  });
}

/**
 * Imports every distinct script the config names, once each, keyed by its
 * absolute path.
 */
async function _importScripts(args: {
  config: PipelineConfig;
  configDir: string;
  importScript: CatalogFieldScriptImporter;
}): Promise<ReadonlyMap<string, CatalogFieldScript>> {
  const absolutePaths = [
    ...new Set(
      _listScriptPaths(args.config).map((scriptPath) => {
        return resolve(args.configDir, scriptPath);
      }),
    ),
  ];
  const entries = await Promise.all(
    absolutePaths.map(async (absolutePath) => {
      const module = (await args.importScript(
        pathToFileURL(absolutePath).href,
      )) as { default?: unknown };
      if (typeof module.default !== "function") {
        throw new Error(
          `${absolutePath} must default-export a function (record, context) => value.`,
        );
      }
      return [absolutePath, module.default as CatalogFieldScript] as const;
    }),
  );
  return new Map(entries);
}

function _compileField(args: {
  field: CatalogMappableField;
  source: CatalogFieldSource;
  configDir: string;
  scripts: ReadonlyMap<string, CatalogFieldScript>;
}): _CompiledField {
  const { field, source } = args;
  if ("from" in source) {
    const readPath = buildCatalogFieldPathReader(source.from);
    return {
      field,
      sourceLabel: `from ${source.from}`,
      read: (record) => {
        return readPath(record);
      },
    };
  }
  if ("value" in source) {
    return {
      field,
      sourceLabel: "value",
      read: () => {
        return source.value;
      },
    };
  }
  const script = args.scripts.get(resolve(args.configDir, source.script));
  if (script === undefined) {
    throw new Error(`Script ${source.script} was not imported.`);
  }
  return {
    field,
    sourceLabel: `script ${source.script}`,
    read: (record, driveKey) => {
      return script(record, { driveKey, field });
    },
  };
}

function _readField(
  compiled: _CompiledField,
  record: unknown,
  driveKey: string,
): Readonly<{ value: unknown; problem?: string }> {
  try {
    return { value: compiled.read(record, driveKey) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      value: undefined,
      problem: `${compiled.sourceLabel} threw: ${message}`,
    };
  }
}

function _mapRecord(
  compiledFields: readonly _CompiledField[],
  record: unknown,
  driveKey: string,
): CatalogFieldMapResult {
  const fields: Partial<Record<_MappedFieldKey, unknown>> = {};
  const problems: CatalogFieldMapProblem[] = [];
  compiledFields.forEach((compiled) => {
    const read = _readField(compiled, record, driveKey);
    const coerced =
      read.problem === undefined
        ? coerceCatalogFieldValue({ field: compiled.field, value: read.value })
        : { value: undefined, problem: read.problem };
    if (coerced.problem !== undefined) {
      problems.push({ field: compiled.field, message: coerced.problem });
    }
    if (coerced.value !== undefined) {
      fields[RELATION_KEY_BY_FIELD[compiled.field]] = coerced.value;
    }
  });
  return { fields: fields as CatalogMappedFields, problems };
}

/**
 * Compiles a pipeline config into a mapper, once per run. Each `from` path
 * is split here, each drive's fields are merged over the pipeline's here,
 * and each distinct script is imported here, once, however many fields and
 * records use it. `mapFields` is then synchronous, so mapping 10,000
 * records never touches a file.
 *
 * Scripts are imported by `file://` URL, which both Bun (the pipeline
 * server) and vite-node (`ava pipeline run`) resolve the same way, and both
 * run `.ts` with no build step.
 *
 * @param args.config - The parsed pipeline config.
 * @param args.configDir - The config file's directory. Script paths are
 *   relative to it.
 * @param args.importScript - Replaces the module import, for tests.
 * @returns The mapper.
 * @throws When a script cannot be imported or does not default-export a
 * function.
 */
export async function loadCatalogFieldMapper(args: {
  config: PipelineConfig;
  configDir: string;
  importScript?: CatalogFieldScriptImporter;
}): Promise<CatalogFieldMapper> {
  const { config, configDir } = args;
  const scripts = await _importScripts({
    config,
    configDir,
    importScript: args.importScript ?? _importModule,
  });
  const compiledByDrive = new Map(
    config.drives.map((drive) => {
      const merged: CatalogFieldMappings = { ...config.fields, ...drive.fields };
      const compiledFields = Object.entries(merged).flatMap(
        ([field, source]) => {
          return source === undefined
            ? []
            : [
                _compileField({
                  field: field as CatalogMappableField,
                  source,
                  configDir,
                  scripts,
                }),
              ];
        },
      );
      return [drive.baseUrl, compiledFields] as const;
    }),
  );
  return {
    mapFields: (record, driveKey) => {
      const compiledFields = compiledByDrive.get(driveKey);
      if (compiledFields === undefined) {
        throw new Error(
          `${driveKey} is not a drive in this pipeline's config.`,
        );
      }
      return _mapRecord(compiledFields, record, driveKey);
    },
  };
}
```

`loadCatalogFieldMapper` is longer than 45 lines only if you inline the
helpers. Keep the helpers separate as written.

- [ ] **Step 7: Run the test and watch it pass.**

Run: `pnpm --filter @avandar/etl test loadCatalogFieldMapper`
Expected: PASS, 8 tests. The import-count test is the one that proves
scripts load once: the import is async and `mapFields` is synchronous, so a
per-record import cannot even be written without failing the types, and the
spy confirms the one import.

- [ ] **Step 8: Prove the loader runs under Bun too** (the pipeline server's
  runtime; vitest above covered vite-node).

Run from the repo root:

```bash
bun -e '
import { fileURLToPath } from "node:url";
import { loadCatalogFieldMapper } from "./packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper.ts";
const configDir = fileURLToPath(new URL("./packages/node/etl/src/EtlConfig/loadCatalogFieldMapper/", import.meta.url));
const mapper = await loadCatalogFieldMapper({
  config: { fields: { organization1_name: { value: "X" }, organization2_name: { script: "./__fixtures__/upperCaseName.ts" } }, drives: [{ baseUrl: "https://a.example.gov" }] },
  configDir,
});
console.log(JSON.stringify(mapper.mapFields({ name: "tlc" }, "https://a.example.gov")));
'
```

Expected output:
`{"fields":{"organization1Name":"X","organization2Name":"TLC (organization2_name on https://a.example.gov)"},"problems":[]}`

If Bun cannot resolve the `@etl/` alias inside the loader, run it from
`packages/node/etl` instead (its `tsconfig.json` extends the base paths).

- [ ] **Step 9: Export them** from `packages/node/etl/src/index.ts`:

```ts
export { resolveDriveOrganizationLabels } from "@etl/EtlConfig/resolveDriveOrganizationLabels/resolveDriveOrganizationLabels";
export {
  loadCatalogFieldMapper,
  type CatalogFieldMapper,
  type CatalogFieldMapProblem,
  type CatalogFieldMapResult,
  type CatalogFieldScript,
  type CatalogFieldScriptContext,
  type CatalogMappedFields,
} from "@etl/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper";
```

- [ ] **Step 10: Commit.**

```bash
pnpm --filter @avandar/etl type-check
pnpm format
git add packages/node/etl/src/EtlConfig/resolveDriveOrganizationLabels \
  packages/node/etl/src/EtlConfig/loadCatalogFieldMapper \
  packages/node/etl/src/index.ts
git commit -m "feat(etl): compile pipeline field mappings, importing each script once"
```

---

### Task 4: Schema: drives table, new listing columns, the rename

**Load the `supabase-declarative-schema` skill before this task** and follow
it where it differs from these steps. Read `docs/rules/sql.md`.

**Files:**
- Create: `supabase/schemas/10.data_catalog_drives.sql`
- Modify: `supabase/schemas/10.data_catalog_listings.sql`
- Modify: `supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`
- Create: `supabase/tests/database/data_catalog_drives.test.sql`
- Create: `supabase/migration-upgrade-tests/catalog_field_mapping.prelude.sql`
- Create: `supabase/migration-upgrade-tests/catalog_field_mapping.assertions.sql`
- Modify: `scripts/test-dashboard-publishing-migrations.sh`
- Modify: `supabase/migration-upgrade-tests/data_catalog_listings_pipeline_name.prelude.sql`, `pipeline_scope_seed.prelude.sql`
- Generated: `supabase/migrations/<timestamp>_catalog_field_mapping.sql`, `apps/desktop/migrations/<timestamp>_catalog_field_mapping.gen.sql`, `shared/types/database.types.ts`

- [ ] **Step 1: Re-check the switch.** Run `ava supabase status`. It must read
  green before any of the database commands below.

- [ ] **Step 2: Write the failing pgTAP test**
  `supabase/tests/database/data_catalog_drives.test.sql`:

```sql
\set ON_ERROR_STOP on

-- The drives table, the listing columns the catalog field mapping adds, and
-- who can read and write them. Identifiers are `pgtap-fixture`-prefixed and
-- hosts are `.invalid`.

begin;

set search_path to extensions, public;

select plan(14);

select has_table('public', 'data_catalog_drives', 'the drives table exists');

select col_not_null('public', 'data_catalog_drives', 'pipeline_name', 'a drive names its pipeline');
select col_not_null('public', 'data_catalog_drives', 'drive_key', 'a drive has a key');
select has_column('public', 'data_catalog_drives', 'organization4_label', 'a drive labels up to four levels');

select has_column('public', 'data_catalog_listings', 'organization1_name', 'level 1 is organization1_name');
select hasnt_column('public', 'data_catalog_listings', 'external_organization_name', 'the old name is gone');
select col_not_null('public', 'data_catalog_listings', 'organization1_name', 'level 1 is required');
select col_type_is('public', 'data_catalog_listings', 'domains', 'text[]', 'domains is a text array');
select col_type_is('public', 'data_catalog_listings', 'tags', 'text[]', 'tags is a text array');
select col_type_is('public', 'data_catalog_listings', 'source_metadata', 'jsonb', 'source_metadata is jsonb');
select fk_ok('public', 'data_catalog_listings', 'drive_id', 'public', 'data_catalog_drives', 'id', 'a listing points at its drive');

insert into public.data_catalog_drives (pipeline_name, drive_key, organization1_label)
values ('pgtap-fixture', 'https://pgtap-fixture.invalid', 'City');

select throws_ok(
  $$insert into public.data_catalog_drives (pipeline_name, drive_key)
    values ('pgtap-fixture', 'https://pgtap-fixture.invalid')$$,
  '23505',
  null,
  'a pipeline lists a drive once'
);

set local role authenticated;

select results_eq(
  $$select organization1_label from public.data_catalog_drives
    where pipeline_name = 'pgtap-fixture'$$,
  $$values ('City'::text)$$,
  'a signed-in user can read drives'
);

select throws_ok(
  $$insert into public.data_catalog_drives (pipeline_name, drive_key)
    values ('pgtap-fixture', 'https://other.pgtap-fixture.invalid')$$,
  '42501',
  null,
  'a signed-in user cannot write drives'
);

select * from finish();

rollback;
```

- [ ] **Step 3: Run it and watch it fail.**

Run: `supabase test db --file supabase/tests/database/data_catalog_drives.test.sql`
(if your CLI has no `--file`, run `pnpm test:db` and read this file's
result).
Expected: FAIL, `data_catalog_drives` does not exist.

- [ ] **Step 4: Create `supabase/schemas/10.data_catalog_drives.sql`.** It
  sorts before `10.data_catalog_listings.sql`, which its foreign key needs.

```sql
/**
 * One drive a drive-index pipeline crawls, such as the NYC Open Data
 * portal, and what each organization level is called on it. Written by
 * `@avandar/etl` with the service role before it crawls the drive. Read by
 * the catalog to label a listing's `organization1_name` through
 * `organization4_name`.
 */
create table public.data_catalog_drives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The pipeline, as `data_catalog_listings.pipeline_name` names it.
  pipeline_name text not null,
  -- The drive, as the pipeline keys it: its base URL, the same value as
  -- `pipeline_scope_checkpoints.drive_key` and, on an API listing,
  -- `data_catalog_listings.api_base_url`.
  drive_key text not null,
  -- What each organization level is called on this drive, such as `City`
  -- and `Agency`. Null for a level the drive does not use.
  organization1_label text,
  organization2_label text,
  organization3_label text,
  organization4_label text,
  constraint data_catalog_drives__pipeline_drive_unique unique (
    pipeline_name,
    drive_key
  )
);

alter table public.data_catalog_drives enable row level security;

-- Data API privileges.
--
-- Read-only for users: drives are written by the pipelines.
grant
select
  on table public.data_catalog_drives to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_catalog_drives to service_role;

create policy "User can select open data catalog drives" on public.data_catalog_drives for
select
  to authenticated using (true);

create trigger tr__data_catalog_drives__set_updated_at before
update on public.data_catalog_drives for each row
execute function public.util__set_updated_at ();
```

- [ ] **Step 5: Edit `supabase/schemas/10.data_catalog_listings.sql`.**

Replace the `external_organization_name` column and its comment:

```sql
  -- External organization this dataset comes from (e.g. World Bank)
  external_organization_name text not null,
```

with:

```sql
  -- The broadest organization this dataset comes from, such as `City of New
  -- York` or `World Bank`. Organization levels nest like administrative
  -- levels; the drive's `data_catalog_drives.organization1_label` says what
  -- this level is called. The number is attached to the word so the app's
  -- camelCase round trip (`organization1Name`) lands back on this column.
  organization1_name text not null,
  -- Deeper organization levels, each inside the one above, such as an
  -- agency, then an office. Null when the source has no such level.
  organization2_name text,
  organization3_name text,
  organization4_name text,
  -- Subject areas the source files the dataset under, such as
  -- `Transportation`.
  domains text[],
  -- The source's free-form keywords.
  tags text[],
  -- The source record this listing was built from, untouched, such as a
  -- Socrata Discovery API result or a CKAN package. Keeps source metadata
  -- that has no column of its own, so a later column can be filled from it
  -- without re-crawling. As of the last write that changed another column.
  source_metadata jsonb,
  -- The drive that produced this listing. Null on a listing no drive-index
  -- pipeline wrote.
  drive_id uuid references public.data_catalog_drives (id) on delete set null,
```

Then, after the `data_catalog_listings__pipeline_drive_last_update` index,
add:

```sql
-- Serves joining a listing to its drive's labels, and the foreign key's
-- `on delete set null`.
create index data_catalog_listings__drive_id on public.data_catalog_listings (drive_id);
```

- [ ] **Step 6: Edit the upsert function**
  `supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`:
  - In the `insert into public.data_catalog_listings (...)` column list,
    replace `external_organization_name,` with `organization1_name,` and add
    after `source_download_url` (keep a comma on the line before):

    ```sql
      source_download_url,
      organization2_name,
      organization3_name,
      organization4_name,
      domains,
      tags,
      source_metadata,
      drive_id
    ```

  - In `values (...)`, replace `v_input.external_organization_name,` with
    `v_input.organization1_name,` and add, after `v_input.source_download_url`:

    ```sql
      v_input.source_download_url,
      v_input.organization2_name,
      v_input.organization3_name,
      v_input.organization4_name,
      v_input.domains,
      v_input.tags,
      v_input.source_metadata,
      v_input.drive_id
    ```

  - In `on conflict (id) do update set`, replace
    `external_organization_name = excluded.external_organization_name,` with
    `organization1_name = excluded.organization1_name,` and add after
    `source_download_url = excluded.source_download_url`:

    ```sql
      source_download_url = excluded.source_download_url,
      organization2_name = excluded.organization2_name,
      organization3_name = excluded.organization3_name,
      organization4_name = excluded.organization4_name,
      domains = excluded.domains,
      tags = excluded.tags,
      source_metadata = excluded.source_metadata,
      drive_id = excluded.drive_id
    ```

  - Do not add comments inside the `$$ … $$` body (see the memory note on
    body comments: they change the function's text).

- [ ] **Step 7: Update the existing pgTAP tests and preludes that insert
  `external_organization_name`.** They run against the current schema, so
  they break with the rename. In each of these files replace every
  `external_organization_name` with `organization1_name` and change nothing
  else:

```bash
grep -l external_organization_name \
  supabase/tests/database/*.sql \
  supabase/migration-upgrade-tests/*.prelude.sql
```

Do not edit anything under `supabase/migrations/` or `apps/desktop/migrations/`
(history), and do not edit
`apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`
(it reproduces an old migration's body).

- [ ] **Step 8: Generate the migration.**

```bash
pnpm db:reset
pnpm db:new-migration catalog_field_mapping
```

- [ ] **Step 9: Hand-fix the rename in the generated migration.** Open
  `supabase/migrations/<timestamp>_catalog_field_mapping.sql`. `db diff`
  writes the rename as a drop and an add, which would delete every existing
  organization name. Find these two statements (exact text may differ):

```sql
alter table "public"."data_catalog_listings" drop column "external_organization_name";
alter table "public"."data_catalog_listings" add column "organization1_name" text not null;
```

Delete both, and put this in their place, before any statement that
references `organization1_name`:

```sql
-- A rename, not a drop and an add, so every listing keeps its organization.
alter table "public"."data_catalog_listings" rename column "external_organization_name" to "organization1_name";
```

Then check the whole migration: `grep -n "drop" supabase/migrations/<timestamp>_catalog_field_mapping.sql`.
Expected: only drops of things this change replaces (for example the old
version of the upsert function, if `db diff` drops and recreates it). Any
`drop` of a table, column, or policy you did not touch means another
branch's objects leaked into the diff: `pnpm db:reset` and regenerate.

- [ ] **Step 10: Re-apply and run the pgTAP test.**

```bash
pnpm db:reset
supabase test db --file supabase/tests/database/data_catalog_drives.test.sql
```

Expected: PASS, 14 tests.

- [ ] **Step 11: Write the upgrade test that proves the rename keeps values.**
  The replay harness runs against the fully migrated database, so the
  prelude first puts the schema back the way it was before this migration.

`supabase/migration-upgrade-tests/catalog_field_mapping.prelude.sql`:

```sql
-- The catalog as it was before organization levels: the listings table with
-- `external_organization_name` and none of the new columns, and no drives
-- table. Then a listing of each kind, which the migration must keep. The
-- identifiers are `pgtap-fixture`-prefixed.
begin;

alter table public.data_catalog_listings
  drop column drive_id,
  drop column organization2_name,
  drop column organization3_name,
  drop column organization4_name,
  drop column domains,
  drop column tags,
  drop column source_metadata;

drop table public.data_catalog_drives;

alter table public.data_catalog_listings
  rename column organization1_name to external_organization_name;

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture api', 'City of New York', 'api_resource', 'socrata',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-rename',
   'pgtap-fixture-rename', 'CSV');

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture parquet', 'World Bank', 'pgtap-fixture-rename.parquet',
   'pgtap-fixture-pipeline', 'run-1');
```

`supabase/migration-upgrade-tests/catalog_field_mapping.assertions.sql`:

```sql
-- Verify the rename kept every organization name and the new columns start
-- empty.
do $$
begin
  if (
    select organization1_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-rename'
  ) is distinct from 'City of New York' then
    raise exception 'the API listing lost its organization in the rename';
  end if;

  if (
    select organization1_name from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture-rename.parquet'
  ) is distinct from 'World Bank' then
    raise exception 'the parquet listing lost its organization in the rename';
  end if;

  if exists (
    select 1 from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-rename'
      and (drive_id is not null or domains is not null or source_metadata is not null)
  ) then
    raise exception 'a new column was not empty after the migration';
  end if;
end;
$$;

rollback;
```

Before writing these, open one existing pair (for example
`pipeline_scope_seed.prelude.sql` and `.assertions.sql`) and match how it
ends its transaction; copy that ending rather than the `rollback;` above if
they differ.

Add the scenario to `scripts/test-dashboard-publishing-migrations.sh`, after
the last `run_migration_replay` call:

```bash
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/catalog_field_mapping.prelude.sql" \
  "$repo_root/supabase/migrations/<timestamp>_catalog_field_mapping.sql" \
  "$repo_root/supabase/migration-upgrade-tests/catalog_field_mapping.assertions.sql"
```

Use the real generated file name.

- [ ] **Step 12: Run the whole database suite.**

Run: `pnpm test:db`
Expected: PASS, including the new upgrade scenario and every existing test
you edited in Step 7.

- [ ] **Step 13: Generate the desktop migration and the types.**

```bash
pnpm desktop:sqlite:gen-migrations
pnpm db:gen-types
```

Open the generated `apps/desktop/migrations/<timestamp>_catalog_field_mapping.gen.sql`.
It should rename the column (SQLite supports `RENAME COLUMN`) and add the new
columns. If the generator flags a statement as `needs hand-edit`, follow the
instruction in its header. The desktop app is pre-release, so a destructive
local migration is acceptable if the generator cannot express the rename.

- [ ] **Step 14: Commit.** `pnpm exec tsc -b` will fail until Task 5; that is
  expected. Do not stage `supabase/config.toml`.

```bash
pnpm format
git add supabase/schemas/10.data_catalog_drives.sql \
  supabase/schemas/10.data_catalog_listings.sql \
  supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql \
  supabase/tests/database \
  supabase/migration-upgrade-tests \
  supabase/migrations/*_catalog_field_mapping.sql \
  apps/desktop/migrations/*_catalog_field_mapping.gen.sql \
  scripts/test-dashboard-publishing-migrations.sh \
  shared/types/database.types.ts
git status --short supabase/config.toml   # must print nothing staged
git commit -m "feat(db)!: add catalog drives and organization levels, rename external_organization_name

BREAKING CHANGE: data_catalog_listings.external_organization_name is now organization1_name."
```

---

### Task 5: Rename `externalOrganizationName` everywhere else

**Files:** every file `grep` lists below except the excluded ones.

- [ ] **Step 1: List the readers.**

```bash
git grep -l -E "external_organization_name|externalOrganizationName" -- \
  ':!supabase/migrations' ':!apps/desktop/migrations' \
  ':!apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts' \
  ':!docs' ':!shared/types/database.types.ts'
```

Expected: the app model (`shared/models/data-catalog-listings/DataCatalogListing/*`),
the catalog views (`src/views/DataManagerApp/DataImportView/DataCatalogView/*`),
the ETL package (`packages/node/etl/src/**`, `README.md`), the pipelines
(`apps/pipeline-server/pipelines/**`), and the open-data connector tests
(`shared/connectors/open-data/**`).

- [ ] **Step 2: Rename mechanically.**

```bash
FILES=$(git grep -l -E "external_organization_name|externalOrganizationName" -- \
  ':!supabase/migrations' ':!apps/desktop/migrations' \
  ':!apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts' \
  ':!docs' ':!shared/types/database.types.ts')
sed -i '' -e 's/external_organization_name/organization1_name/g' \
  -e 's/externalOrganizationName/organization1Name/g' $FILES
```

- [ ] **Step 3: Fix the prose the rename made wrong.** Read every changed
  comment and docstring (`git diff -U0 | grep -E '^\+.*(//|\*)'`). For
  example `configuredDrives.ts` says "Used as every discovered dataset's
  `organization1_name`": that field is about to leave the drive types in
  Task 9, so leave it for now, but fix any sentence that now reads wrong,
  such as one calling it "the external organization".

- [ ] **Step 4: Type-check and test.**

```bash
pnpm exec tsc -b
pnpm --filter @avandar/etl test
pnpm --filter @avandar/pipeline-server test
pnpm test:frontend -- DataCatalog
pnpm test:frontend -- shared/connectors/open-data
```

Expected: all pass. The model's `ZodSchemaEqualsTypes` check in
`DataCatalogListingParsers.ts` now compares against the regenerated
`database.types.ts`, so a missed rename fails `tsc`.

- [ ] **Step 5: Add the new columns to the app model.** The regenerated
  types add `organization2_name` … `organization4_name`, `domains`, `tags`,
  `source_metadata`, and `drive_id`, and the parser's type-equality check
  fails until the zod schema lists them. In
  `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts`,
  add to `DBReadSchema`, after `source_download_url`:

```ts
  organization2_name: z.string().nullable(),
  organization3_name: z.string().nullable(),
  organization4_name: z.string().nullable(),
  domains: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  source_metadata: supabaseJSONSchema.nullable(),
  drive_id: z.uuid().nullable(),
```

and the matching fields to `DataCatalogListingRead` in
`DataCatalogListing.types.ts`, after `isWorkspaceLoadable` (follow the file's
existing docstring style):

```ts
  /** Deeper organization levels, inside `organization1Name`. */
  organization2Name: string | undefined;
  organization3Name: string | undefined;
  organization4Name: string | undefined;
  /** Subject areas the source files the dataset under. */
  domains: readonly string[] | undefined;
  /** The source's free-form keywords. */
  tags: readonly string[] | undefined;
  /** The source record the listing was built from, untouched. */
  sourceMetadata: Json | undefined;
  /** The drive that produced the listing. */
  driveId: string | undefined;
```

In `fromDBReadToModelRead`, cast `sourceMetadata` the way `metadata` is
cast: `sourceMetadata: obj.sourceMetadata as Json | undefined`. Then look
for the `Omit`/`Pick` near line 211 of `DataCatalogListing.types.ts` that
names `isWorkspaceLoadable`, and add the new keys there if that type lists
every read-only column. Update `DataCatalogListingParsers.test.ts` and
`DataCatalogListingModule.test.ts` fixtures with the new keys (`null` in the
DB row, `undefined` in the model).

Run: `pnpm exec tsc -b && pnpm test:frontend -- DataCatalogListing`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
pnpm format
git add -u
git status --short   # confirm only renamed files and the model are staged; no supabase/config.toml
git commit -m "refactor(catalog): read organization1_name and the new listing columns"
```

---

### Task 6: The ETL row contract writes the new columns

**Files:**
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts` (`RelationDescription`)
- Modify: `packages/node/etl/src/stores/EtlStores.types.ts` (`ListingRowValues`)
- Modify: `packages/node/etl/src/stores/listingContractColumns.ts`
- Modify: `packages/node/etl/src/EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation.ts` and its test
- Modify: `packages/node/etl/src/EtlEngine/isListingRowUnchanged/isListingRowUnchanged.ts` and its test

- [ ] **Step 1: Write the failing tests.** In
  `buildListingRowFromRelation.test.ts`, extend the file's `_build` helper's
  `options` with `driveId?: string` and pass `driveId: options.driveId` to
  `buildListingRowFromRelation`. Then add:

```ts
  it("writes the organization levels, domains, tags, source record, and drive", () => {
    const row = _build(
      {
        ...API_RELATION,
        organization2Name: "Taxi and Limousine Commission",
        organization3Name: "Licensing",
        domains: ["Transportation"],
        tags: ["taxi", "fhv"],
        sourceMetadata: { resource: { id: "8wbx-tsch" } },
      },
      { driveId: "6f7e2c1a-0000-4000-8000-000000000001" },
    );

    expect(row).toMatchObject({
      organization2_name: "Taxi and Limousine Commission",
      organization3_name: "Licensing",
      organization4_name: null,
      domains: ["Transportation"],
      tags: ["taxi", "fhv"],
      source_metadata: { resource: { id: "8wbx-tsch" } },
      drive_id: "6f7e2c1a-0000-4000-8000-000000000001",
    });
  });

  it("writes null for every new column a relation leaves unset", () => {
    const row = _build(API_RELATION);

    expect(row).toMatchObject({
      organization2_name: null,
      organization3_name: null,
      organization4_name: null,
      domains: null,
      tags: null,
      source_metadata: null,
      drive_id: null,
    });
  });
```

In `isListingRowUnchanged.test.ts`, add the seven new keys to the `_row`
helper's defaults (`organization2_name: null`, …, `source_metadata: null`,
`drive_id: null`), then add:

```ts
  it("ignores a change to source_metadata alone", () => {
    // Socrata's record carries page_views and download_count, which change
    // daily: counting them would rewrite every listing on every full run.
    expect(
      isListingRowUnchanged({
        stored: _stored({ source_metadata: { page_views: 1 } }),
        next: _row({ source_metadata: { page_views: 2 } }),
      }),
    ).toBe(true);
  });

  it("counts a change to a mapped column", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ tags: ["taxi"] }),
        next: _row({ tags: ["taxi", "fhv"] }),
      }),
    ).toBe(false);
  });

  it("counts a change of drive", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ drive_id: null }),
        next: _row({ drive_id: "6f7e2c1a-0000-4000-8000-000000000001" }),
      }),
    ).toBe(false);
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `pnpm --filter @avandar/etl test buildListingRowFromRelation isListingRowUnchanged`
Expected: FAIL on type errors (`driveId`, `organization2Name`, … do not
exist) or on the missing keys.

- [ ] **Step 3: Extend `RelationDescription`** in `EtlEngine.types.ts`. The
  rename in Task 5 already made `organization1Name: string`. Directly after
  it, add:

```ts
  /** Organization level 2, inside level 1, such as an agency. */
  organization2Name?: string;
  /** Organization level 3, inside level 2. */
  organization3Name?: string;
  /** Organization level 4, inside level 3. */
  organization4Name?: string;
  /** Subject areas the source files the dataset under. */
  domains?: readonly string[];
  /** The source's free-form keywords. */
  tags?: readonly string[];
  /**
   * The source record the relation was built from, untouched, written to
   * `source_metadata`. Must survive `JSON.stringify`.
   */
  sourceMetadata?: unknown;
```

- [ ] **Step 4: Extend `ListingRowValues`** in `EtlStores.types.ts`, after
  `source_download_url`:

```ts
  organization2_name: string | null;
  organization3_name: string | null;
  organization4_name: string | null;
  domains: readonly string[] | null;
  tags: readonly string[] | null;
  /** The raw source record. Never counts as a change on its own. */
  source_metadata: unknown;
  /** The drive's `data_catalog_drives.id`, when the run has a drives store. */
  drive_id: string | null;
```

- [ ] **Step 5: Add the columns to `LISTING_CONTRACT_COLUMNS`**, after
  `"source_download_url"`:

```ts
  "organization2_name",
  "organization3_name",
  "organization4_name",
  "domains",
  "tags",
  "source_metadata",
  "drive_id",
```

- [ ] **Step 6: Write them in `buildListingRowFromRelation.ts`.** Add
  `driveId: string | undefined;` to `_BuildArgs`, and to
  `_buildSharedColumns`'s returned object, after `source_asset_type`:

```ts
    organization2_name: relation.organization2Name ?? null,
    organization3_name: relation.organization3Name ?? null,
    organization4_name: relation.organization4Name ?? null,
    domains: relation.domains ? [...relation.domains] : null,
    tags: relation.tags ? [...relation.tags] : null,
    source_metadata: relation.sourceMetadata ?? null,
    drive_id: args.driveId ?? null,
```

Update the function's docstring `@param` list with
`@param args.driveId - Written to `drive_id`, or null when undefined.`

- [ ] **Step 7: Ignore `source_metadata` in the change check.** In
  `isListingRowUnchanged.ts`, add it to `IGNORED_COLUMNS` and extend the
  comment:

```ts
/**
 * Columns that never count as a change: two change on every write, the app
 * writes `date_column_type_last_verified` when it verifies a listing, and
 * `source_metadata` carries counters like Socrata's `page_views` that change
 * daily, so it is written only alongside a change to another column.
 */
const IGNORED_COLUMNS: ReadonlySet<keyof ListingRowValues> = new Set([
  "pipeline_run_id",
  "date_of_last_sync",
  "date_column_type_last_verified",
  "source_metadata",
]);
```

- [ ] **Step 8: Thread `driveId` through the page load.** In
  `loadRelationsPage.ts`, add to `LoadRelationsPageContext`:

```ts
  /** The drive's `data_catalog_drives.id`, or undefined with no drives store. */
  driveId: string | undefined;
```

and pass `driveId: context.driveId,` in `_buildRelationsWithRows`'s call to
`buildListingRowFromRelation`. In `crawlScope.ts`, add
`driveId: string | undefined;` to `CrawlScopeArgs` (after `driveKey`, with a
docstring like the one above) and `driveId: args.driveId,` to
`_buildLoadContext`. In `createEtlEngine.ts`, pass `driveId: undefined` to
`crawlScope` for now; Task 7 fills it in.

- [ ] **Step 9: Fix the fixtures `tsc` now flags.** Every test that builds a
  `ListingRowValues` or `StoredListingRow` by hand needs the seven new keys
  (`null`). Run `pnpm --filter @avandar/etl type-check` and add them where it
  points, including the Supabase store tests and `loadRelationsPage.test.ts`
  (which builds a `LoadRelationsPageContext`: add `driveId: undefined`).

- [ ] **Step 10: Run the package tests.**

Run: `pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl type-check`
Expected: PASS.

- [ ] **Step 11: Run the Supabase-backed store tests** against the switched
  local stack, which now has the new columns and the updated upsert
  function:

Run: `pnpm --filter @avandar/etl test:supabase`
Expected: PASS. A failure naming `organization2_name` or `drive_id` means
the upsert function in Task 4 Step 6 missed a column.

- [ ] **Step 12: Commit.**

```bash
pnpm format
git add packages/node/etl
git commit -m "feat(etl): write organization levels, domains, tags, and the source record"
```

---

### Task 7: The drives store, and the engine writes each drive once

**Files:**
- Modify: `packages/node/etl/src/stores/EtlStores.types.ts` (add `DrivesStore`, `DriveRow`)
- Create: `packages/node/etl/src/stores/InMemoryDrivesStore/createInMemoryDrivesStore.ts` and its test
- Create: `packages/node/etl/src/stores/SupabaseDrivesStore/createSupabaseDrivesStore.ts` and `createSupabaseDrivesStore.supabase.test.ts`
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts` (`EtlStores.drives`, `EtlOutput.drivesTable`, `EtlEngineConfig.describeDrive`)
- Modify: `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.ts` and its test

- [ ] **Step 1: Add the store types** to `EtlStores.types.ts`:

```ts
/** One drive as the drives table stores it. */
export type DriveRow = Readonly<{
  pipelineName: string;
  driveKey: string;
  organizationLabels: EtlOrganizationLabels;
}>;

/** Writes the drives table. */
export type DrivesStore = Readonly<{
  /**
   * Inserts the drive, or replaces its labels when the pipeline already
   * wrote it, and resolves to its id.
   */
  upsert: (drive: DriveRow) => Promise<string>;
}>;
```

Import `EtlOrganizationLabels` from `@etl/EtlEngine/EtlEngine.types` as a
type-only import.

- [ ] **Step 2: Write the failing test** `createInMemoryDrivesStore.test.ts`:

```ts
import { createInMemoryDrivesStore } from "@etl/stores/InMemoryDrivesStore/createInMemoryDrivesStore";
import { describe, expect, it } from "vitest";

const DRIVE = {
  pipelineName: "socrata",
  driveKey: "https://data.cityofnewyork.us",
  organizationLabels: { 1: "City", 2: "Agency" },
};

describe("createInMemoryDrivesStore", () => {
  it("keeps one row and one id per pipeline and drive key", async () => {
    const store = createInMemoryDrivesStore();

    const firstId = await store.upsert(DRIVE);
    const secondId = await store.upsert({
      ...DRIVE,
      organizationLabels: { 1: "Town" },
    });

    expect(secondId).toBe(firstId);
    expect(store.getDrives()).toEqual([
      { id: firstId, ...DRIVE, organizationLabels: { 1: "Town" } },
    ]);
  });

  it("gives a different drive its own id", async () => {
    const store = createInMemoryDrivesStore();

    const nycId = await store.upsert(DRIVE);
    const stateId = await store.upsert({
      ...DRIVE,
      driveKey: "https://data.ny.gov",
    });

    expect(stateId).not.toBe(nycId);
    expect(store.getUpsertCount()).toBe(2);
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement
  `createInMemoryDrivesStore.ts`:**

```ts
import { randomUUID } from "node:crypto";
import type { DriveRow, DrivesStore } from "@etl/stores/EtlStores.types";

/** A stored drive, with its id. */
export type StoredDriveRow = DriveRow & Readonly<{ id: string }>;

/** A drives store held in memory, plus accessors for asserting on it. */
export type InMemoryDrivesStore = DrivesStore &
  Readonly<{
    /** A copy of every drive, in the order each was first written. */
    getDrives: () => readonly StoredDriveRow[];
    /** How many times `upsert` was called. */
    getUpsertCount: () => number;
  }>;

function _buildMapKey(drive: DriveRow): string {
  return JSON.stringify([drive.pipelineName, drive.driveKey]);
}

/**
 * Creates a drives store that keeps drives in memory, for testing a
 * pipeline or the engine without Supabase.
 *
 * @returns The store.
 */
export function createInMemoryDrivesStore(): InMemoryDrivesStore {
  const drivesByKey = new Map<string, StoredDriveRow>();
  let upsertCount = 0;
  return {
    upsert: async (drive) => {
      upsertCount += 1;
      const key = _buildMapKey(drive);
      const id = drivesByKey.get(key)?.id ?? randomUUID();
      drivesByKey.set(key, {
        id,
        pipelineName: drive.pipelineName,
        driveKey: drive.driveKey,
        organizationLabels: { ...drive.organizationLabels },
      });
      return id;
    },
    getDrives: () => {
      return [...drivesByKey.values()].map((drive) => {
        return { ...drive, organizationLabels: { ...drive.organizationLabels } };
      });
    },
    getUpsertCount: () => {
      return upsertCount;
    },
  };
}
```

Run: `pnpm --filter @avandar/etl test createInMemoryDrivesStore`
Expected: PASS, 2 tests.

- [ ] **Step 4: Implement `createSupabaseDrivesStore.ts`** (modeled on
  `createSupabaseCheckpointStore.ts`):

```ts
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { DrivesStore } from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The conflict key: one row per pipeline and drive. */
const DRIVE_CONFLICT = "pipeline_name,drive_key";

/** The Supabase client and table a drives store writes. */
export type SupabaseDrivesStoreOptions = Readonly<{
  /** A service-role client: only the service role writes drives. */
  client: SupabaseClient;
  /** The drives table, such as `data_catalog_drives`. */
  drivesTable: string;
}>;

/**
 * Creates a drives store over a Supabase table with the columns
 * `pipeline_name`, `drive_key`, and `organization1_label` through
 * `organization4_label`, unique on the first two. `upsert` throws with the
 * table name and Supabase's message when the request fails.
 *
 * @param options - The client and the table.
 * @returns The store.
 */
export function createSupabaseDrivesStore(
  options: SupabaseDrivesStoreOptions,
): DrivesStore {
  const { client, drivesTable } = options;
  return {
    upsert: async (drive) => {
      const labels = drive.organizationLabels;
      const { data, error } = await client
        .from(drivesTable)
        .upsert(
          {
            pipeline_name: drive.pipelineName,
            drive_key: drive.driveKey,
            organization1_label: labels[1] ?? null,
            organization2_label: labels[2] ?? null,
            organization3_label: labels[3] ?? null,
            organization4_label: labels[4] ?? null,
          },
          { onConflict: DRIVE_CONFLICT },
        )
        .select("id")
        .single();
      throwOnSupabaseError({
        error,
        action: `writing drive ${drive.driveKey} to ${drivesTable}`,
      });
      return (data as Readonly<{ id: string }>).id;
    },
  };
}
```

- [ ] **Step 5: Write its Supabase test**
  `createSupabaseDrivesStore.supabase.test.ts`, modeled on
  `createSupabaseCheckpointStore.supabase.test.ts` (copy its client setup and
  cleanup exactly; read that file first):

```ts
// Use the same imports, client creation, and afterEach cleanup as
// createSupabaseCheckpointStore.supabase.test.ts, with pipeline name
// "pgtap-fixture-drives" so cleanup deletes only these rows:
//   await client.from("data_catalog_drives").delete().eq("pipeline_name", PIPELINE);

describe("createSupabaseDrivesStore", () => {
  it("writes a drive's labels and returns the same id on a rewrite", async () => {
    const store = createSupabaseDrivesStore({
      client,
      drivesTable: "data_catalog_drives",
    });
    const drive = {
      pipelineName: PIPELINE,
      driveKey: "https://pgtap-fixture.invalid",
      organizationLabels: { 1: "City", 2: "Agency" },
    };

    const firstId = await store.upsert(drive);
    const secondId = await store.upsert({
      ...drive,
      organizationLabels: { 1: "State" },
    });

    expect(secondId).toBe(firstId);
    const { data } = await client
      .from("data_catalog_drives")
      .select("organization1_label, organization2_label")
      .eq("id", firstId)
      .single();
    expect(data).toEqual({ organization1_label: "State", organization2_label: null });
  });
});
```

Run: `pnpm --filter @avandar/etl test:supabase createSupabaseDrivesStore`
Expected: PASS.

- [ ] **Step 6: Extend the engine types** in `EtlEngine.types.ts`:
  - `EtlStores`: add
    `/** Where drives are recorded. Omit to write no drive and no drive_id. */ drives?: DrivesStore;`
  - `EtlOutput`: add
    `/** The drives table, such as `data_catalog_drives`. Omit to record no drives. */ drivesTable?: string;`
  - `EtlEngineConfig`: add, after `getDriveKey`:

    ```ts
    /**
     * What the drives table records about a drive, such as its organization
     * labels. Omit to record each drive with no labels.
     */
    describeDrive?: (drive: TDrive) => EtlDriveDescription;
    ```

- [ ] **Step 7: Write the failing engine tests.** In
  `createEtlEngine.test.ts`, extend `_config`'s `args` with
  `describeDrive?: FakeConfig["describeDrive"];` and spread it into the
  returned config the way `listScopes` is spread. Then add a new
  `describe("drives", ...)` block inside `describe("createEtlEngine")`:

```ts
  describe("drives", () => {
    it("records each drive once, with its labels, and writes its id on every listing", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore();
      const drives = createInMemoryDrivesStore();

      await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)], [_connection("a2", 2)]]),
            _drive("b", [[_connection("b1", 3)]]),
          ],
          recorder,
          stores: { ..._stores(listings), drives },
          listScopes: () => {
            return [{ key: "one" }, { key: "two" }];
          },
          describeDrive: (drive) => {
            return { organizationLabels: { 1: `Label ${drive.key}` } };
          },
        }),
      );

      expect(drives.getUpsertCount()).toBe(2);
      const [driveA, driveB] = drives.getDrives();
      expect(driveA).toMatchObject({
        pipelineName: PIPELINE_NAME,
        driveKey: "a",
        organizationLabels: { 1: "Label a" },
      });
      const driveIdByDataset = Object.fromEntries(
        listings.getRows().map((row) => {
          return [row.external_dataset_id, row.drive_id];
        }),
      );
      expect(driveIdByDataset).toEqual({
        a1: driveA?.id,
        a2: driveA?.id,
        b1: driveB?.id,
      });
    });

    it("fails only that drive's crawls when its drive row cannot be written", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore();
      const drives = createInMemoryDrivesStore();
      const failingDrives = {
        upsert: async (drive: Parameters<typeof drives.upsert>[0]) => {
          if (drive.driveKey === "a") {
            throw new Error("drives table unavailable");
          }
          return await drives.upsert(drive);
        },
      };

      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 2)]]),
          ],
          recorder,
          stores: { ..._stores(listings), drives: failingDrives },
        }),
      );

      expect(_statusesOf(report)).toEqual([
        ["a", "failed", expect.stringContaining("drives table unavailable")],
        ["b", "ok", undefined],
      ]);
      expect(_datasetIds(listings)).toEqual(["b1"]);
    });

    it("writes no drive_id when the stores have no drives store", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("a1", 1)]])],
          recorder,
          stores: _stores(listings),
        }),
      );

      expect(listings.getRows()[0]?.drive_id).toBeNull();
    });
  });
```

Import `createInMemoryDrivesStore` at the top. `_statusesOf` returns
`[driveKey, status, error]` per crawl and `_datasetIds` returns sorted
unique dataset ids.

Run: `pnpm --filter @avandar/etl test createEtlEngine`
Expected: the three new tests FAIL (no upserts happen, `drive_id` is null).

- [ ] **Step 8: Upsert drives in `createEtlEngine.ts`.**
  - In `_createSupabaseStores`, add to the returned stores:

    ```ts
    drives:
      output.drivesTable === undefined
        ? undefined
        : createSupabaseDrivesStore({ client, drivesTable: output.drivesTable }),
    ```

  - Add a resolver that writes each drive once per run and remembers its id:

    ```ts
    /**
     * Resolves a drive's id, writing its row the first time the run reaches
     * it. A failed write is not remembered, so the drive's next scope tries
     * again. Resolves to `undefined` when there is no drives store.
     */
    function _createDriveIdResolver<TDrive, TConnection, TScope extends EtlScope>(args: {
      config: EtlEngineConfig<TDrive, TConnection, TScope>;
      stores: EtlStores;
    }): (drive: TDrive, driveKey: string) => Promise<string | undefined> {
      const idsByDriveKey = new Map<string, string>();
      return async (drive, driveKey) => {
        const { drives } = args.stores;
        if (drives === undefined) {
          return undefined;
        }
        const knownId = idsByDriveKey.get(driveKey);
        if (knownId !== undefined) {
          return knownId;
        }
        const id = await drives.upsert({
          pipelineName: args.config.name,
          driveKey,
          organizationLabels:
            args.config.describeDrive?.(drive).organizationLabels ?? {},
        });
        idsByDriveKey.set(driveKey, id);
        return id;
      };
    }
    ```

  - Add `resolveDriveId: (drive: TDrive, driveKey: string) => Promise<string | undefined>;`
    to `_CrawlTasksArgs`. In `_runRecorded`, add
    `resolveDriveId: _createDriveIdResolver({ config, stores: args.stores }),`
    to the object it passes to `_crawlInOrder`. `_crawlInOrder` already
    spreads its args into `_runCrawlTask`, so it reaches there unchanged.
  - In `_runCrawlTask`, after the `!task.isListed` branch, resolve the id and
    fail the crawl when the write fails:

    ```ts
    let driveId: string | undefined;
    try {
      driveId = await args.resolveDriveId(task.drive, task.driveKey);
    } catch (error) {
      return buildUncrawledCrawlResult({
        driveKey: task.driveKey,
        scopeKey: task.scope.key,
        options: args.options,
        outcome: { status: "failed", error },
        startedAt: args.clock.now(),
        finishedAt: args.clock.now(),
      });
    }
    ```

    and pass `driveId` to `crawlScope` in place of the `undefined` Task 6
    left there.

    `let` is the narrowest way to keep `driveId` in scope across the
    `try`; if the codebase's lint forbids it, extract a
    `_resolveDriveIdOrFailure` helper that returns
    `{ driveId } | { failure: CrawlScopeResult }` instead.

- [ ] **Step 9: Run the engine tests.**

Run: `pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl type-check`
Expected: PASS.

- [ ] **Step 10: Export the drives stores** from
  `packages/node/etl/src/index.ts`:

```ts
export {
  createInMemoryDrivesStore,
  type InMemoryDrivesStore,
  type StoredDriveRow,
} from "@etl/stores/InMemoryDrivesStore/createInMemoryDrivesStore";
export {
  createSupabaseDrivesStore,
  type SupabaseDrivesStoreOptions,
} from "@etl/stores/SupabaseDrivesStore/createSupabaseDrivesStore";
```

and add `DriveRow` and `DrivesStore` to the existing `EtlStores.types` type
export list.

- [ ] **Step 11: Commit.**

```bash
pnpm --filter @avandar/etl type-check
pnpm format
git add packages/node/etl
git commit -m "feat(etl): record each drive's organization labels and link listings to it"
```

---

### Task 8: Per-pipeline loadability overrides move into the pipeline config

**Files:**
- Modify: `packages/node/etl/src/EtlConfig/EtlConfig.types.ts`
- Modify: `packages/node/etl/src/EtlConfig/parseEtlConfig/parseEtlConfig.ts` and its test
- Modify: `packages/node/etl/src/EtlConfig/getWorkspaceLoadabilityRules/getWorkspaceLoadabilityRules.ts` and its test
- Modify: `apps/pipeline-server/pipelines/etl.config.yaml`
- Modify: `apps/pipeline-server/pipelines/shared/getPipelineWorkspaceLoadability/getPipelineWorkspaceLoadability.ts` and its test

- [ ] **Step 1: Update the tests first.** In
  `getWorkspaceLoadabilityRules.test.ts`, replace `CONFIG` and both tests:

```ts
const CONFIG: EtlConfig = {
  workspaceLoadability: { unloadableFormats: ["PDF", ".xlsx", "ZIP"] },
};

describe("getWorkspaceLoadabilityRules", () => {
  it("gives a pipeline without overrides the global formats, normalized", () => {
    expect(getWorkspaceLoadabilityRules({ config: CONFIG })).toEqual({
      unloadableFormats: ["pdf", "xlsx", "zip"],
    });
  });

  it("lets a pipeline make a global format loadable and add its own", () => {
    expect(
      getWorkspaceLoadabilityRules({
        config: CONFIG,
        pipelineOverrides: {
          loadableFormats: ["xlsx"],
          unloadableFormats: ["JSON"],
        },
      }),
    ).toEqual({ unloadableFormats: ["pdf", "zip", "json"] });
  });
});
```

In `parseEtlConfig.test.ts`, drop `pipelines` from every input and expected
value, and add:

```ts
  it("refuses the per-pipeline section, which moved to each pipeline's config", () => {
    expect(() => {
      return parseEtlConfig({
        yamlText: "pipelines: {}",
        sourceName: "etl.config.yaml",
      });
    }).toThrow("etl.config.yaml is not a valid ETL config");
  });
```

In `getPipelineWorkspaceLoadability.test.ts`, change the two calls to
`getPipelineWorkspaceLoadability({ drives: [] })` (an empty pipeline config).

Run: `pnpm --filter @avandar/etl test getWorkspaceLoadabilityRules parseEtlConfig`
Expected: FAIL.

- [ ] **Step 2: Implement.**
  - `EtlConfig.types.ts`: remove the `pipelines` field from `EtlConfig`.
  - `parseEtlConfig.ts`: remove the `pipelines` key from
    `EtlConfigSchema` (the schema is `.strict()`, so the key is now refused).
    Update the docstring.
  - `getWorkspaceLoadabilityRules.ts`: change the signature and docstring:

    ```ts
    /**
     * The loadability rules one pipeline's engine applies: the shared
     * config's global unloadable formats, minus the ones the pipeline can
     * load anyway, plus the pipeline's own.
     *
     * @param args.config - The shared ETL config.
     * @param args.pipelineOverrides - The pipeline config's
     *   `workspaceLoadability`. Omit for none.
     * @returns The rules, with every format normalized and listed once.
     */
    export function getWorkspaceLoadabilityRules(args: {
      config: EtlConfig;
      pipelineOverrides?: EtlPipelineWorkspaceLoadability;
    }): EtlWorkspaceLoadabilityRules {
      const overrides = args.pipelineOverrides ?? {};
      // ...the rest of the body is unchanged.
    }
    ```

  - `etl.config.yaml`: delete the trailing `# Per-pipeline overrides …`
    comment block and `pipelines: {}`. In the header comment, change "(or
    add it to a pipeline's `loadableFormats`)" to "(or add it to a
    pipeline's `workspaceLoadability.loadableFormats` in its
    `<pipeline>.pipeline.yaml`)".
  - `getPipelineWorkspaceLoadability.ts`: take the pipeline config instead
    of a name:

    ```ts
    /**
     * The formats a workspace cannot load from one pipeline's listings:
     * `pipelines/etl.config.yaml`'s global rules with the pipeline config's
     * own `workspaceLoadability` applied.
     *
     * @param pipelineConfig - The pipeline's parsed config.
     * @returns The rules to pass to the pipeline's engine.
     * @throws When the shared config file cannot be read or is invalid.
     */
    export function getPipelineWorkspaceLoadability(
      pipelineConfig: PipelineConfig,
    ): EtlWorkspaceLoadabilityRules {
      return getWorkspaceLoadabilityRules({
        config: readEtlConfigFile(ETL_CONFIG_PATH),
        pipelineOverrides: pipelineConfig.workspaceLoadability,
      });
    }
    ```

    with `import type { PipelineConfig } from "@avandar/etl";` (exported in
    Task 1).

  The callers in `socrata/run.ts` and `hdx/run.ts` change in Tasks 11 and 12.
  Until then, change their calls to `getPipelineWorkspaceLoadability({ drives: [] })`
  so the build stays green.

- [ ] **Step 3: Run the tests.**

```bash
pnpm --filter @avandar/etl test
pnpm --filter @avandar/pipeline-server test getPipelineWorkspaceLoadability
```

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
pnpm format
git add packages/node/etl apps/pipeline-server/pipelines/etl.config.yaml \
  apps/pipeline-server/pipelines/shared/getPipelineWorkspaceLoadability \
  apps/pipeline-server/pipelines/socrata/run.ts apps/pipeline-server/pipelines/hdx/run.ts
git commit -m "refactor(etl)!: read per-pipeline loadability overrides from the pipeline config

BREAKING CHANGE: getWorkspaceLoadabilityRules takes pipelineOverrides instead of pipelineName, and etl.config.yaml no longer accepts pipelines."
```

---

### Task 9: Document the new ETL API

The exports landed with the code in Tasks 1, 3, and 7. `packages/CLAUDE.md`
requires the README to list every public export before the change is
finished, so this task must land before any PR is opened.

**Files:**
- Modify: `packages/node/etl/README.md`

- [ ] **Step 1: List what changed.**

Run: `git diff develop -- packages/node/etl/src/index.ts`
Expected: the exports added in Tasks 1, 3, and 7. Each must appear in the
README after Step 2.

- [ ] **Step 2: Document them in `README.md`:**
  - "Output contract" table: replace `external_organization_name` with
    `organization1_name` in the "every row" row, add a row
    `| \`organization2_name\` … \`organization4_name\`, \`domains\`, \`tags\`, \`source_metadata\` | every row, \`null\` when unset |`
    and a row `| \`drive_id\` | every row, \`null\` with no drives store |`.
    Add a sentence that `source_metadata` never counts as a change.
  - The workspace loadability section (around line 264): replace the
    per-pipeline `pipelines:` description with the pipeline config's
    `workspaceLoadability` and the new `getWorkspaceLoadabilityRules`
    signature.
  - A new section "Pipeline config and field mapping" after it, covering:
    the file shape (copy the YAML example from spec §4.1), the three
    mapping kinds, the mappable fields, coercion, that scripts load once
    per run, and a table of the new exports (`parsePipelineConfig`,
    `readPipelineConfigFile`, `loadCatalogFieldMapper`,
    `resolveDriveOrganizationLabels`, `CATALOG_MAPPABLE_FIELDS`, the types),
    following the format of the README's existing tables.
  - The stores table or section: add `createInMemoryDrivesStore` and
    `createSupabaseDrivesStore`, `EtlOutput.drivesTable`, and
    `EtlEngineConfig.describeDrive`.

- [ ] **Step 3: Verify and commit.**

```bash
pnpm format
git add packages/node/etl/README.md
git commit -m "docs(etl): document pipeline configs, field mapping, and drives"
```

---

### Task 10: Keep each source record

**Files:**
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts`, `SocrataDiscoveryClient.ts`, its test
- Modify: `shared/connectors/open-data/CkanClient/CkanClient.types.ts`, `CkanClient.ts`, `createCkanPackageFromWire/createCkanPackageFromWire.ts`
- Modify: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts`, its test

- [ ] **Step 1: Write the failing tests.** In `SocrataDiscoveryClient.test.ts`,
  in the test that parses a valid result, assert:

```ts
    expect(page.results[0]?.sourceRecord).toEqual(RAW_RESULT);
```

where `RAW_RESULT` is the raw object the test's fake HTTP response returns
(name it to match the file). In `CkanDiscoveryClient.test.ts`, likewise:

```ts
    expect(page.datasets[0]?.sourceRecord).toEqual(RAW_PACKAGE);
```

Run: `pnpm test:frontend -- shared/connectors/open-data/SocrataDiscoveryClient shared/connectors/open-data/CkanDiscoveryClient`
Expected: FAIL (`sourceRecord` is undefined).

- [ ] **Step 2: Implement.**
  - `SocrataDiscoveryResult`: add

    ```ts
    /**
     * The result exactly as the Discovery API returned it, before any of it
     * was narrowed to the fields above. A pipeline maps catalog metadata
     * from it and stores it as the listing's `source_metadata`.
     */
    sourceRecord: unknown;
    ```

    and in `_splitValidResults`, add `sourceRecord: rawResult,` to the
    pushed object.
  - `CkanPackage`: add the same field, worded for CKAN ("as `package_show`
    or `package_search` returned it").
  - `createCkanPackageFromWire(wire, sourceRecord: unknown)`: add the
    parameter (document it) and set `sourceRecord` on the result.
  - `CkanClient.ts:34`: `createCkanPackageFromWire(CkanPackageSchema.parse(result), result)`.
  - `CkanDiscoveryClient.ts`: keep the raw result beside the parse in
    `_buildSearchPage`'s rows (`{ sortKey, rawResult, parsed }`) and pass it:
    `createCkanPackageFromWire(parsed.data, rawResult)`.

- [ ] **Step 3: Fix fixtures.** `pnpm exec tsc -b` now flags every
  hand-built `SocrataDiscoveryResult` and `CkanPackage` in tests (for
  example `createSocrataEtlEngine.test.ts`'s `_catalog` and
  `makeApiResourceRelationsFromCkanPackage.test.ts`). Add
  `sourceRecord: {}` to each, or a small object when the test later asserts
  on mapped fields.

- [ ] **Step 4: Run and commit.**

```bash
pnpm exec tsc -b
pnpm test:frontend -- shared/connectors/open-data
pnpm --filter @avandar/pipeline-server test
pnpm format
git add -u shared apps/pipeline-server
git commit -m "feat(open-data): keep each Socrata and CKAN result's raw record"
```

---

### Task 11: Socrata reads its drives and mappings from YAML

**Files:**
- Create: `apps/pipeline-server/pipelines/shared/loadPipelineDefinition/loadPipelineDefinition.ts` and its test
- Create: `apps/pipeline-server/pipelines/socrata/socrata.pipeline.yaml`
- Create: `apps/pipeline-server/pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue.ts` and its test
- Create: `apps/pipeline-server/pipelines/socrata/mappers/socrataDomains/socrataDomains.ts` and its test
- Create: `apps/pipeline-server/pipelines/socrata/mappers/socrataUpdateFrequency/socrataUpdateFrequency.ts` and its test
- Create: `apps/pipeline-server/pipelines/socrata/mappers/socrataOfficeDivision/socrataOfficeDivision.ts` and its test
- Modify: `apps/pipeline-server/pipelines/socrata/configuredDrives/configuredDrives.ts` and its test
- Modify: `apps/pipeline-server/pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult.ts` and its test
- Modify: `apps/pipeline-server/pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.ts` and its test
- Modify: `apps/pipeline-server/pipelines/socrata/run.ts`
- Modify: `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts`

- [ ] **Step 1: The shared loader.** Write
  `loadPipelineDefinition.test.ts`:

```ts
import { fileURLToPath } from "node:url";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import { describe, expect, it } from "vitest";

describe("loadPipelineDefinition", () => {
  it("loads the shipped Socrata config and maps a recorded NYC result", async () => {
    const { config, mapper } = await loadPipelineDefinition(
      fileURLToPath(new URL("../../socrata/socrata.pipeline.yaml", import.meta.url)),
    );

    expect(
      config.drives.map((drive) => {
        return drive.baseUrl;
      }),
    ).toEqual([
      "https://data.cityofnewyork.us",
      "https://data.ny.gov",
      "https://health.data.ny.gov",
    ]);
    expect(
      mapper.mapFields(
        {
          resource: { description: "Active FHVs", attribution: "TLC" },
          classification: { domain_category: "Transportation", domain_tags: ["fhv"] },
        },
        "https://data.cityofnewyork.us",
      ).fields,
    ).toMatchObject({
      organization1Name: "City of New York",
      organization2Name: "TLC",
      description: "Active FHVs",
      domains: ["Transportation"],
      tags: ["fhv"],
    });
  });
});
```

Then `loadPipelineDefinition.ts`:

```ts
import { dirname } from "node:path";
import { loadCatalogFieldMapper, readPipelineConfigFile } from "@avandar/etl";
import type { CatalogFieldMapper, PipelineConfig } from "@avandar/etl";

/** A pipeline's parsed config and its compiled field mapper. */
export type PipelineDefinition = Readonly<{
  config: PipelineConfig;
  mapper: CatalogFieldMapper;
}>;

/**
 * Reads one pipeline's `<pipeline>.pipeline.yaml` and compiles its field
 * mappings, importing each mapper script once. Call once per run.
 *
 * @param configPath - The YAML file's absolute path. Script paths in it are
 *   relative to its directory.
 * @returns The config and its mapper.
 * @throws When the file is invalid or a script cannot be loaded.
 */
export async function loadPipelineDefinition(
  configPath: string,
): Promise<PipelineDefinition> {
  const config = readPipelineConfigFile(configPath);
  const mapper = await loadCatalogFieldMapper({
    config,
    configDir: dirname(configPath),
  });
  return { config, mapper };
}
```

Steps 2-4 create what this test loads; run it after Step 4.

- [ ] **Step 2: The mapper scripts, test first.** Write
  `readSocrataDomainMetadataValue.test.ts`:

```ts
import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";
import { describe, expect, it } from "vitest";

const RECORD = {
  classification: {
    domain_metadata: [
      { key: "Dataset-Summary_Posting-Frequency", value: "Monthly" },
      { key: "Dataset-Summary_Office/Division", value: "Office of Quality" },
    ],
  },
};

describe("readSocrataDomainMetadataValue", () => {
  it("returns the first listed key's value", () => {
    expect(
      readSocrataDomainMetadataValue(RECORD, [
        "Update_Update-Frequency",
        "Dataset-Summary_Posting-Frequency",
      ]),
    ).toBe("Monthly");
  });

  it("returns undefined when no key matches or the record has no metadata", () => {
    expect(readSocrataDomainMetadataValue(RECORD, ["Nope"])).toBeUndefined();
    expect(readSocrataDomainMetadataValue({}, ["Nope"])).toBeUndefined();
  });
});
```

`readSocrataDomainMetadataValue.ts`:

```ts
type _DomainMetadataEntry = Readonly<{ key?: unknown; value?: unknown }>;

function _readDomainMetadata(record: unknown): readonly _DomainMetadataEntry[] {
  const entries = (
    record as { classification?: { domain_metadata?: unknown } } | null
  )?.classification?.domain_metadata;
  return Array.isArray(entries) ? entries : [];
}

/**
 * The value of the first of `keys` a Socrata result's
 * `classification.domain_metadata` lists. Each portal names its custom
 * metadata differently: NYC says `Update_Update-Frequency` where the NY
 * State portals say `Dataset-Summary_Posting-Frequency`.
 *
 * @param record - A raw Discovery API result.
 * @param keys - The keys to try, in order.
 * @returns The value, or `undefined` when no key is present.
 */
export function readSocrataDomainMetadataValue(
  record: unknown,
  keys: readonly string[],
): unknown {
  const entries = _readDomainMetadata(record);
  const matched = keys
    .map((key) => {
      return entries.find((entry) => {
        return entry.key === key;
      });
    })
    .find((entry) => {
      return entry !== undefined;
    });
  return matched?.value;
}
```

Then the three scripts, each with a test of the same shape (one case with
the value present, one with it absent). Each is a default export so the YAML
can point at it:

`socrataDomains/socrataDomains.ts`:

```ts
function _readStrings(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => {
        return typeof item === "string";
      })
    : [];
}

/**
 * Mapper script for `domains`: the portal's own category
 * (`classification.domain_category`) followed by Socrata's global
 * categories (`classification.categories`), which most portals leave empty.
 */
export default function socrataDomains(record: unknown): readonly string[] {
  const classification = (
    record as { classification?: { domain_category?: unknown; categories?: unknown } } | null
  )?.classification;
  return [
    ..._readStrings(classification?.domain_category),
    ..._readStrings(classification?.categories),
  ];
}
```

Test: `{ classification: { domain_category: "Health", categories: ["health", "Health"] } }`
maps to `["Health", "health", "Health"]` (the mapper's coercion removes the
exact duplicate later; this function does not), and `{}` maps to `[]`.

`socrataUpdateFrequency/socrataUpdateFrequency.ts`:

```ts
import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";

/** NYC's key, then the NY State portals'. */
const UPDATE_FREQUENCY_KEYS = [
  "Update_Update-Frequency",
  "Dataset-Summary_Posting-Frequency",
];

/** Mapper script for `update_frequency`, such as `Daily` or `Monthly`. */
export default function socrataUpdateFrequency(record: unknown): unknown {
  return readSocrataDomainMetadataValue(record, UPDATE_FREQUENCY_KEYS);
}
```

`socrataOfficeDivision/socrataOfficeDivision.ts`:

```ts
import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";

/**
 * Mapper script for the office or division inside a NY State department,
 * which health.data.ny.gov records in its custom metadata rather than in
 * `resource.attribution` (that names the department itself).
 */
export default function socrataOfficeDivision(record: unknown): unknown {
  return readSocrataDomainMetadataValue(record, [
    "Dataset-Summary_Office/Division",
  ]);
}
```

Run: `pnpm --filter @avandar/pipeline-server test socrata/mappers`
Expected: FAIL before each file exists, PASS after.

- [ ] **Step 3: Create `socrata/socrata.pipeline.yaml`:**

```yaml
# The Socrata pipeline's drives, and how each Discovery API result becomes
# catalog metadata. Read once per run by `run.ts`.
#
# A field maps from exactly one of:
#   from:   a dotted path into the raw Discovery API result
#   value:  a constant
#   script: a .ts file, relative to this file, that default-exports
#           (record, context) => value
# A drive's fields override these shared ones, key by key. A drive's
# organizationLabels replace these whole.
#
# See docs/measles-demo/catalog-field-mapping-design.md.

organizationLabels:
  1: City
  2: Agency

fields:
  description: { from: resource.description }
  license: { from: metadata.license }
  organization2_name: { from: resource.attribution }
  domains: { script: ./mappers/socrataDomains/socrataDomains.ts }
  tags: { from: classification.domain_tags }
  update_frequency:
    { script: ./mappers/socrataUpdateFrequency/socrataUpdateFrequency.ts }

# Each drive is crawled and resumed on its own, so adding one indexes it from
# scratch on the next run. A drive must have at most 10,000 assets, the most
# the Discovery API can page through. A drive may list `scopes`, each a
# `key` with optional `categories` and `tags`; omit them to index the whole
# portal as one scope, `all`.
drives:
  - baseUrl: https://data.cityofnewyork.us
    fields:
      organization1_name: { value: City of New York }

  - baseUrl: https://data.ny.gov
    organizationLabels: { 1: State, 2: Agency }
    fields:
      organization1_name: { value: State of New York }

  - baseUrl: https://health.data.ny.gov
    organizationLabels: { 1: State, 2: Department, 3: Office }
    fields:
      organization1_name: { value: State of New York }
      organization2_name: { value: Department of Health }
      organization3_name:
        { script: ./mappers/socrataOfficeDivision/socrataOfficeDivision.ts }
```

Note: health.data.ny.gov's level-1 organization changes from "New York State
Department of Health" to "State of New York", with the department moving to
level 2. That is intended (spec §4.1).

- [ ] **Step 4: Run the loader test.**

Run: `pnpm --filter @avandar/pipeline-server test loadPipelineDefinition`
Expected: PASS.

- [ ] **Step 5: Drive types from the config.** Replace the body of
  `configuredDrives.ts` (keep the file name, so `extractSocrataDrive.ts`'s
  imports stay put). Keep `SocrataScope` as it is. Replace `ConfiguredDrive`
  and `CONFIGURED_DRIVES` with:

```ts
/** One Socrata portal (drive) the pipeline enumerates, from its config. */
export type ConfiguredDrive = Readonly<{
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /** What each organization level is called on this portal. */
  organizationLabels: EtlOrganizationLabels;
  /** Crawled in this order. Omit to index the whole portal as `all`. */
  scopes?: readonly SocrataScope[];
}>;

const SocrataScopesSchema = z.array(
  z.strictObject({
    key: z.string(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
);

/**
 * The drives `socrata.pipeline.yaml` lists, with each drive's labels
 * resolved and its `scopes` validated as Socrata scopes.
 *
 * @param config - The parsed Socrata pipeline config.
 * @returns The drives, in config order.
 * @throws When a drive's `scopes` is not a list of Socrata scopes.
 */
export function listConfiguredDrives(
  config: PipelineConfig,
): readonly ConfiguredDrive[] {
  return config.drives.map((drive) => {
    const scopes =
      drive.scopes === undefined
        ? undefined
        : SocrataScopesSchema.parse(drive.scopes);
    return {
      baseUrl: drive.baseUrl,
      organizationLabels: resolveDriveOrganizationLabels({ config, drive }),
      ...(scopes === undefined ? {} : { scopes }),
    };
  });
}
```

with imports `import { resolveDriveOrganizationLabels } from "@avandar/etl";`,
`import { z } from "zod";`, and
`import type { EtlOrganizationLabels, EtlScope, PipelineConfig } from "@avandar/etl";`.
If `apps/pipeline-server/package.json` does not list `zod`, add
`"zod": "catalog:"` to its dependencies and run `pnpm install`.

Replace `configuredDrives.test.ts` with tests of `listConfiguredDrives`:

```ts
import { listConfiguredDrives } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { describe, expect, it } from "vitest";

describe("listConfiguredDrives", () => {
  it("resolves each drive's labels and passes its scopes through", () => {
    expect(
      listConfiguredDrives({
        organizationLabels: { 1: "City" },
        fields: { organization1_name: { value: "X" } },
        drives: [
          { baseUrl: "https://a.example.gov" },
          {
            baseUrl: "https://b.example.gov",
            organizationLabels: { 1: "State" },
            scopes: [{ key: "health", categories: ["Health"] }],
          },
        ],
      }),
    ).toEqual([
      { baseUrl: "https://a.example.gov", organizationLabels: { 1: "City" } },
      {
        baseUrl: "https://b.example.gov",
        organizationLabels: { 1: "State" },
        scopes: [{ key: "health", categories: ["Health"] }],
      },
    ]);
  });

  it("refuses scopes that are not Socrata scopes", () => {
    expect(() => {
      return listConfiguredDrives({
        drives: [{ baseUrl: "https://a.example.gov", scopes: [{ name: "x" }] }],
      });
    }).toThrow();
  });
});
```

(The https and trailing-slash checks the old test made now live in
`parsePipelineConfig`, Task 1.)

- [ ] **Step 6: The transform takes the mapped fields.** Write the failing
  tests in `makeApiResourceRelationFromSocrataResult.test.ts` first. Update
  its existing calls to pass `mappedFields` and drop
  `organizationName` from its drive fixture, then add:

```ts
  it("spreads the mapped fields and keeps the raw record", () => {
    const relation = makeApiResourceRelationFromSocrataResult({
      drive: { baseUrl: "https://data.cityofnewyork.us", organizationLabels: {} },
      result: { ...RESULT, sourceRecord: { resource: { id: RESULT.datasetId } } },
      mappedFields: {
        organization1Name: "City of New York",
        organization2Name: "TLC",
        tags: ["fhv"],
      },
    });

    expect(relation).toMatchObject({
      organization1Name: "City of New York",
      organization2Name: "TLC",
      tags: ["fhv"],
      sourceMetadata: { resource: { id: RESULT.datasetId } },
    });
  });
```

(`RESULT` stands for the file's existing valid result fixture.) Then change
the function:

```ts
export function makeApiResourceRelationFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
  mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
}): ApiResourceRelation {
  // ...as before, with these changes in the returned object:
  //   remove:  organization1Name: drive.organizationName,
  //   add, as the object's first entries, before `kind`:
  //     ...params.mappedFields,
  //     sourceMetadata: result.sourceRecord,
}
```

Put `...params.mappedFields` before the code-computed fields
(`externalDatasetId`, `apiResourceId`, …) so a mapping can never overwrite
one. Update the docstring: metadata comes from the pipeline config's
mapping, and the raw result is kept as `sourceMetadata`.

- [ ] **Step 7: The engine maps each result.** Write the failing test in
  `createSocrataEtlEngine.test.ts` first. Change `DRIVE` to
  `{ baseUrl: "https://data.cityofnewyork.us", organizationLabels: { 1: "City" } }`,
  build a mapper in the helper, and give `_catalog`'s results a
  `sourceRecord`:

```ts
async function _mapper(
  fields: PipelineConfig["fields"] = {},
): Promise<CatalogFieldMapper> {
  return await loadCatalogFieldMapper({
    config: {
      fields: { organization1_name: { value: "City of New York" }, ...fields },
      drives: [{ baseUrl: DRIVE.baseUrl }],
    },
    configDir: "/",
  });
}
```

`_engine` becomes `async` and passes `mapper: await _mapper()`; every call
site adds `await`. Then add:

```ts
  it("maps each result's metadata and records the drive's labels", async () => {
    const listings = createInMemoryListingsStore();
    const drives = createInMemoryDrivesStore();
    const catalog = _catalog(1).map((result) => {
      return {
        ...result,
        sourceRecord: { resource: { attribution: "TLC" } },
      };
    });
    const engine = createSocrataEtlEngine({
      output: OUTPUT,
      discovery: _discoveryOver(catalog),
      drives: [DRIVE],
      mapper: await _mapper({
        organization2_name: { from: "resource.attribution" },
      }),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
        drives,
      },
      workspaceLoadability: { unloadableFormats: [] },
    });

    await engine.run({ mode: "full" });

    expect(listings.getRows()[0]).toMatchObject({
      organization1_name: "City of New York",
      organization2_name: "TLC",
      source_metadata: { resource: { attribution: "TLC" } },
      drive_id: drives.getDrives()[0]?.id,
    });
    expect(drives.getDrives()[0]?.organizationLabels).toEqual({ 1: "City" });
  });

  it("skips a result whose organization1_name maps to nothing, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const listings = createInMemoryListingsStore();
    const engine = createSocrataEtlEngine({
      output: OUTPUT,
      discovery: _discoveryOver(_catalog(1)),
      drives: [DRIVE],
      mapper: await loadCatalogFieldMapper({
        config: {
          fields: { organization1_name: { from: "missing.path" } },
          drives: [{ baseUrl: DRIVE.baseUrl }],
        },
        configDir: "/",
      }),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    });

    await engine.run({ mode: "full" });

    expect(listings.getRows()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("skipped ds-0: organization1_name mapped to nothing"),
    );
    warn.mockRestore();
  });
```

Then change `createSocrataEtlEngine`:
  - Args: replace `drives?: readonly ConfiguredDrive[]` with
    `drives: readonly ConfiguredDrive[]` and add `mapper: CatalogFieldMapper`.
    Remove the `CONFIGURED_DRIVES` import and default.
  - Add `describeDrive: (drive) => { return { organizationLabels: drive.organizationLabels }; },`
  - Replace `transform` with:

    ```ts
    transform: ({ drive, connection }) => {
      const { fields, problems } = mapper.mapFields(
        connection.sourceRecord,
        drive.baseUrl,
      );
      problems.forEach((problem) => {
        console.warn(
          `[socrata] drive ${drive.baseUrl}: ${connection.datasetId} ${problem.field}: ${problem.message}`,
        );
      });
      const { organization1Name } = fields;
      if (organization1Name === undefined) {
        console.warn(
          `[socrata] drive ${drive.baseUrl}: skipped ${connection.datasetId}: organization1_name mapped to nothing`,
        );
        return [];
      }
      return [
        makeApiResourceRelationFromSocrataResult({
          drive,
          result: connection,
          mappedFields: { ...fields, organization1Name },
        }),
      ];
    },
    ```

  - Update the docstring's `@param` list.

- [ ] **Step 8: Wire `run.ts`.**

```ts
import { fileURLToPath } from "node:url";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import { listConfiguredDrives } from "@pipelines/socrata/configuredDrives/configuredDrives";
// ...existing imports, minus nothing

/** This pipeline's drives and field mappings. */
const SOCRATA_PIPELINE_CONFIG_PATH = fileURLToPath(
  new URL("./socrata.pipeline.yaml", import.meta.url),
);

async function _createEngine(): Promise<EtlEngineInstance> {
  const { config, mapper } = await loadPipelineDefinition(
    SOCRATA_PIPELINE_CONFIG_PATH,
  );
  const discovery = createSocrataDiscoveryClient(
    createSocrataHttpClient({
      appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN"),
    }),
  );
  return createSocrataEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
    drives: listConfiguredDrives(config),
    mapper,
    workspaceLoadability: getPipelineWorkspaceLoadability(config),
  });
}
```

and `await _createEngine()` in `run` and `listScopes`.

In `getPipelineEtlDestination.ts`, add `drivesTable: "data_catalog_drives",`
to `output`, and mention the drives table in its docstring.

- [ ] **Step 9: Run everything for the pipeline server.**

```bash
pnpm --filter @avandar/pipeline-server test
pnpm exec tsc -b
pnpm exec eslint apps/pipeline-server
```

Expected: PASS. `git grep CONFIGURED_DRIVES -- apps` prints nothing.

- [ ] **Step 10: Commit.**

```bash
pnpm format
git add apps/pipeline-server
git commit -m "feat(socrata): map catalog metadata from socrata.pipeline.yaml"
```

---

### Task 12: HDX reads its drive and mappings from YAML

**Files:**
- Create: `apps/pipeline-server/pipelines/hdx/hdx.pipeline.yaml`
- Create: `apps/pipeline-server/pipelines/hdx/mappers/hdxGroupTitles/hdxGroupTitles.ts`, `hdxTagNames/hdxTagNames.ts`, `hdxUpdateFrequency/hdxUpdateFrequency.ts`, each with a test
- Modify: `apps/pipeline-server/pipelines/hdx/hdxDrive.ts`
- Modify: `apps/pipeline-server/pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage.ts` and its test
- Modify: `apps/pipeline-server/pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.ts` and its test
- Modify: `apps/pipeline-server/pipelines/hdx/run.ts`

- [ ] **Step 1: Mapper scripts, test first.** Each with a present and an
  absent case, like Task 11 Step 2.

`hdxGroupTitles/hdxGroupTitles.ts`:

```ts
/**
 * Mapper script for `domains`: the title of each group a CKAN package is
 * in. On HDX, groups are mostly countries.
 */
export default function hdxGroupTitles(record: unknown): readonly string[] {
  const groups = (record as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups.flatMap((group: unknown) => {
    const title = (group as { title?: unknown } | null)?.title;
    return typeof title === "string" ? [title] : [];
  });
}
```

`hdxTagNames/hdxTagNames.ts`: the same shape over `tags[].name`, docstring
"Mapper script for `tags`: each CKAN tag's `name`."

`hdxUpdateFrequency/hdxUpdateFrequency.ts`:

```ts
/**
 * HDX's `data_update_frequency` codes, in words. The codes are the number of
 * days between updates, plus three special values.
 */
const UPDATE_FREQUENCY_BY_CODE: Readonly<Record<string, string>> = {
  "0": "Live",
  "1": "Every day",
  "7": "Every week",
  "14": "Every two weeks",
  "30": "Every month",
  "90": "Every three months",
  "180": "Every six months",
  "365": "Every year",
  "-1": "Never",
  "-2": "As needed",
};

/**
 * Mapper script for `update_frequency`: HDX's code in words. An unknown
 * code is kept as written, so a new code still shows up rather than
 * vanishing.
 */
export default function hdxUpdateFrequency(record: unknown): unknown {
  const code = (record as { data_update_frequency?: unknown } | null)
    ?.data_update_frequency;
  if (typeof code !== "string") {
    return undefined;
  }
  return UPDATE_FREQUENCY_BY_CODE[code] ?? code;
}
```

Test cases: `"1"` gives `"Every day"`, `"-2"` gives `"As needed"`, `"45"`
gives `"45"`, and a missing field gives `undefined`. Before committing,
confirm the code list against two or three live HDX packages
(`curl -s "https://data.humdata.org/api/3/action/package_search?rows=20" | jq '[.result.results[].data_update_frequency] | unique'`)
and add any code you see that the table lacks.

- [ ] **Step 2: `hdx/hdx.pipeline.yaml`:**

```yaml
# The HDX pipeline's one drive, and how each CKAN package becomes catalog
# metadata. Read once per run by `run.ts`. Every mapping reads the raw
# package; each of its resource listings shares the result. See
# socrata.pipeline.yaml for the mapping kinds, and
# docs/measles-demo/catalog-field-mapping-design.md.

organizationLabels:
  1: Organization

fields:
  organization1_name: { from: organization.title }
  description: { from: notes }
  license: { from: license_title }
  domains: { script: ./mappers/hdxGroupTitles/hdxGroupTitles.ts }
  tags: { script: ./mappers/hdxTagNames/hdxTagNames.ts }
  update_frequency: { script: ./mappers/hdxUpdateFrequency/hdxUpdateFrequency.ts }

# HDX is one CKAN deployment, so this lists one drive. An empty list switches
# the pipeline off.
drives:
  - baseUrl: https://data.humdata.org
```

Note: `organization1_name` for HDX changes from "Humanitarian Data Exchange"
on every listing to each package's real publisher, such as "World Health
Organization". That is intended (spec §7).

- [ ] **Step 3: `hdxDrive.ts`.** Keep `HDX_BASE_URL` (the HTTP client and
  its test use it). Replace `HdxDrive` and `HDX_DRIVE` with:

```ts
/** The HDX drive, from `hdx.pipeline.yaml`. */
export type HdxDrive = Readonly<{
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  organizationLabels: EtlOrganizationLabels;
}>;

/**
 * The drives `hdx.pipeline.yaml` lists, with labels resolved.
 *
 * @param config - The parsed HDX pipeline config.
 * @returns At most one drive.
 * @throws When the config lists more than one drive, or one that is not
 * `HDX_BASE_URL`, or gives a drive `scopes` (HDX's scopes are by format and
 * live in `hdxScopes.ts`).
 */
export function listHdxDrives(config: PipelineConfig): readonly HdxDrive[] {
  if (config.drives.length > 1) {
    throw new Error("hdx.pipeline.yaml lists more than one drive. HDX is one CKAN deployment.");
  }
  return config.drives.map((drive) => {
    if (drive.baseUrl !== HDX_BASE_URL) {
      throw new Error(`hdx.pipeline.yaml's drive must be ${HDX_BASE_URL}, not ${drive.baseUrl}.`);
    }
    if (drive.scopes !== undefined) {
      throw new Error("hdx.pipeline.yaml's drive cannot set scopes: HDX's scopes are in hdxScopes.ts.");
    }
    return {
      baseUrl: drive.baseUrl,
      organizationLabels: resolveDriveOrganizationLabels({ config, drive }),
    };
  });
}
```

Keep the file's existing explanation of why HDX has one drive in the new
docstrings. Write a small `hdxDrive.test.ts` with one passing case and the
three throwing cases.

- [ ] **Step 4: The transform.** In
  `makeApiResourceRelationsFromCkanPackage.ts`, add
  `mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>`
  to the exported function's params and to `_toRelation`'s params, pass it
  through, and in `_toRelation`'s returned object replace
  `organization1Name: drive.organizationName,` with
  `...params.mappedFields,` placed before the code-computed fields, plus
  `sourceMetadata: ckanPackage.sourceRecord,`. Update the tests' calls (they
  pass a `mappedFields` of `{ organization1Name: "Test Org" }`) and add one
  test asserting every resource relation of a two-resource package carries
  the same `sourceMetadata` and mapped `tags`.

- [ ] **Step 5: The engine.** In `createHdxEtlEngine.ts`:
  - Args: replace `drive?: HdxDrive | undefined` with
    `drives: readonly HdxDrive[]` and add `mapper: CatalogFieldMapper`.
    Remove the `HDX_DRIVE` import and the `"drive" in args` logic;
    `listDrives` returns `drives`.
  - Add `describeDrive`, as in Socrata.
  - In `transform`, map before building relations, with the same warning
    and skip as Socrata (prefix `[hdx]`, id `ckanPackage.name`):

    ```ts
    transform: async ({ drive: current, scope, connection, metrics }) => {
      const { fields, problems } = mapper.mapFields(
        connection.sourceRecord,
        current.baseUrl,
      );
      problems.forEach((problem) => {
        console.warn(
          `[hdx] ${connection.name} ${problem.field}: ${problem.message}`,
        );
      });
      const { organization1Name } = fields;
      if (organization1Name === undefined) {
        console.warn(
          `[hdx] skipped ${connection.name}: organization1_name mapped to nothing`,
        );
        return [];
      }
      return await makeApiResourceRelationsFromCkanPackage({
        drive: current,
        ckanPackage: connection,
        scope,
        metrics,
        mappedFields: { ...fields, organization1Name },
        readFileColumns:
          readFileColumns ??
          createHdxFileColumnReader({ baseUrl: current.baseUrl }),
      });
    },
    ```

  - Update `createHdxEtlEngine.test.ts` the way Task 11 Step 7 updated
    Socrata's: a `_mapper()` helper, `drives: [HDX_TEST_DRIVE]`, and a test
    that a package's organization title lands in `organization1_name` with
    the drive's labels recorded. The old test that passed `drive: undefined`
    to crawl nothing becomes `drives: []`.

- [ ] **Step 6: `run.ts`**, mirroring Socrata:

```ts
const HDX_PIPELINE_CONFIG_PATH = fileURLToPath(
  new URL("./hdx.pipeline.yaml", import.meta.url),
);

async function _createEngine(): Promise<EtlEngineInstance> {
  const { config, mapper } = await loadPipelineDefinition(HDX_PIPELINE_CONFIG_PATH);
  const discovery = createCkanDiscoveryClient(
    createHdxHttpClient({ baseUrl: HDX_BASE_URL }),
  );
  return createHdxEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
    drives: listHdxDrives(config),
    mapper,
    workspaceLoadability: getPipelineWorkspaceLoadability(config),
  });
}
```

Update the `run` docstring: its drive comes from `hdx.pipeline.yaml`.

- [ ] **Step 7: Run and commit.**

```bash
pnpm --filter @avandar/pipeline-server test
pnpm exec tsc -b
pnpm exec eslint apps/pipeline-server
git grep -n "HDX_DRIVE\|organizationName" -- apps/pipeline-server   # expect nothing
pnpm format
git add apps/pipeline-server
git commit -m "feat(hdx): map catalog metadata from hdx.pipeline.yaml"
```

---

### Task 13: World Bank and anything left

**Files:** `apps/pipeline-server/pipelines/world-bank__wdi/makeWdiParquetRelation/makeWdiParquetRelation.ts`
(already renamed in Task 5), anything `tsc` or a grep still flags.

- [ ] **Step 1: Sweep.**

```bash
git grep -n -E "externalOrganizationName|external_organization_name|organizationName\b" -- \
  apps packages shared src scripts \
  ':!supabase/migrations' ':!apps/desktop/migrations' \
  ':!apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts'
```

Expected: no output, except unrelated uses of a local `organizationName`
variable you can confirm by reading them. The World Bank relation keeps a
hardcoded `organization1Name: "World Bank"`; it is a `pipeline_parquet`
pipeline and out of scope for YAML mapping (spec §10).

- [ ] **Step 2: Full verification.**

```bash
pnpm exec tsc -b
pnpm --filter @avandar/etl test
pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/pipeline-server test
pnpm test:frontend
pnpm test:db
pnpm exec eslint packages/node/etl apps/pipeline-server shared src/views/DataManagerApp
```

Expected: all pass. Record the output of each in your report; do not
summarize a failure as a pass.

- [ ] **Step 3: Commit any sweep fixes** with
  `fix(catalog): finish the organization1_name rename`.

---

### Task 14: Run the pipelines end to end against the local stack

**Files:** none. This proves the YAML, the scripts (under vite-node), the
drives table, and the new columns work together on real data.

- [ ] **Step 1: Confirm the switch is green** (`ava supabase status`).

- [ ] **Step 2: Run each pipeline on a few datasets.** Use
  `.env.pipelines.local` the way `apps/pipeline-server/README.md` describes,
  pointed at the local switched stack, never at demo or production.

```bash
ava pipeline run socrata --limit 30
ava pipeline run hdx --limit 10
```

Expected: both reports end `ok`, with no `organization1_name mapped to
nothing` warnings. A handful of field warnings (for example a missing
license) are fine; read them and confirm each is a source gap, not a wrong
path.

- [ ] **Step 3: Check the rows.** Against the local database:

```sql
select api_base_url, organization1_name, organization2_name,
       organization3_name, domains[1], array_length(tags, 1) as tag_count,
       left(description, 40) as description, update_frequency,
       source_metadata is not null as has_source, drive_id is not null as has_drive
from public.data_catalog_listings
where pipeline_name in ('socrata', 'hdx')
order by api_base_url
limit 40;

select pipeline_name, drive_key, organization1_label, organization2_label,
       organization3_label
from public.data_catalog_drives
order by pipeline_name, drive_key;
```

Expected:
- NYC rows: `City of New York`, an agency in level 2, a category in
  `domains`, tags, a description, `has_source` and `has_drive` true.
- health.data.ny.gov rows (if the limit reached them; rerun with
  `--scopes` or a higher limit if not): `State of New York`,
  `Department of Health`, an office in level 3.
- HDX rows: a real publisher in level 1, countries in `domains`.
- Drives: NYC `City`/`Agency`, data.ny.gov `State`/`Agency`,
  health.data.ny.gov `State`/`Department`/`Office`, HDX `Organization`.

- [ ] **Step 4: Prove the server runtime loads the YAML and scripts.** Start
  the pipeline server (`pnpm --filter @avandar/pipeline-server dev`, Bun),
  trigger a Socrata run through it the way its README describes with a
  small limit, and confirm it ends `ok` with the same columns filled. This
  is the Bun half of the loader check (Task 3 Step 8 was the unit-level
  half).

- [ ] **Step 5: Save screenshots or query output** under
  `.temp/demo-measles/` (gitignored) for the report.

---

### Task 15: Docs and the PR feature log

**Files:**
- Modify: `docs/measles-demo/open-data-catalog-architecture.md`
- Modify: `apps/pipeline-server/README.md`
- Modify: `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1: Architecture doc.** In section 6.2 ("The drive registry"),
  replace the description of `configuredDrives.ts` and `hdxDrive.ts` with
  the per-pipeline YAML files, and link
  [`catalog-field-mapping-design.md`](catalog-field-mapping-design.md). In
  section 4 (schema), mention the drives table and the new columns. Replace
  every `external_organization_name` in the doc's present-tense prose with
  `organization1_name`; leave historical sentences that describe what an
  earlier version did.

- [ ] **Step 2: Pipeline server README.** Replace references to
  `configuredDrives.ts` / `hdxDrive.ts` with the YAML files, and add a short
  "Adding a portal" how-to: add a drive to `socrata.pipeline.yaml` with its
  `organization1_name` and, if its levels differ, its `organizationLabels`;
  run `ava pipeline run socrata --limit 20` locally and check the rows.

- [ ] **Step 3: PR feature log.** Add a feature entry (next free `F` number)
  for "Catalog field mapping": purpose, value, a PR title
  (`feat(catalog)!: map catalog metadata from per-pipeline YAML`), merge
  order (after the loadability feature, F16), the commits of Tasks 1-15 with
  the files each takes, and add each commit to the branch coverage
  checklist. Follow the log's own "How to use this log" rules: group by
  feature, never per commit, and flag mixed commits.

- [ ] **Step 4: Commit and sync the Downloads copy.**

```bash
pnpm format
git add docs/measles-demo apps/pipeline-server/README.md
git commit -m "docs(measles-demo): document catalog field mapping and log it as a feature"
D="/Users/juanpablosarmiento/Library/Mobile Documents/com~apple~CloudDocs/Downloads/avandar_demo-measles/catalog-field-mapping"
cp docs/measles-demo/catalog-field-mapping-design.md docs/measles-demo/catalog-field-mapping-plan.md "$D/"
```

---

## After the plan

Not part of this plan, and each needs Pablo:

- **Backfilling the demo instance.** One full run of each pipeline against
  demo (`ava pipeline run socrata --env demo`, then `hdx`) after the branch
  deploys there, so existing listings get the new columns. Incremental runs
  only touch changed datasets. The demo database is not production, but
  confirm before writing to it.
- **`ava supabase restore`** when the branch is done being validated, before
  any merge to `develop`.
- **The catalog UI** (showing organizations, domains and tags, filtering by
  them, and search) is the next design.
