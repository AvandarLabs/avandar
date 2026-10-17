# Open Data Catalog: Prebuilt Metacatalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pipeline that enumerates every CKAN and Socrata dataset
inside a short, hardcoded list of drives, and upserts a `catalog_entries__open_data`
row (`access_kind: 'api_resource'`) for each one it finds - closing the gap
that today there is no way at all to get an `api_resource` row into the
catalog (no pipeline, no admin UI, no CLI command).

**Architecture:** A new `CkanDiscoveryClient` (CKAN has no equivalent to
Socrata's `package_list`-style listing yet) and a widened
`SocrataDiscoveryClient.search()` (optional `query`, new `offset` for
pagination) do the enumeration. A new pipeline,
`apps/pipeline-server/pipelines/open-data-metacatalog/`, reads a hardcoded
drive registry, calls the right discovery client per drive, filters CKAN
resources through the same readable-format rule the acquisition path already
enforces, and upserts rows - never touching the `cached_*` columns, so the
write-back cache this plan's sibling feature already built is completely
unaffected.

**Tech Stack:** TypeScript, Zod (wire validation), Vitest, `@supabase/supabase-js`
(service-role client, matching the existing `world-bank__wdi` pipeline's
convention), `ts-pattern` not needed here (only two services, a plain
`if`/`else` on `apiService` is clearer at this size).

**Spec:** [`open-data-catalog-architecture.md`](open-data-catalog-architecture.md)
section 6. Read it before starting; this plan does not re-explain the design
decisions, only how to build them.

---

### Task 1: Export a reusable "is this CKAN resource readable" predicate

The acquisition path (`getCkanResourceFromPackage.ts`) already enforces two
rules resource-by-resource, each with its own failure code for a precise
error message: `url_type === "upload"` (not an upstream API link) and
`format` in `["csv", "parquet"]` (case-insensitive). The metacatalog pipeline
needs the same two rules collapsed into one yes/no answer - it does not need
to explain *why* a resource was skipped, only whether to make a row for it.
This task adds that as a new exported function in the same file, built from
the same two constants, so the two call sites can never drift apart on what
counts as readable.

**Files:**
- Modify: `shared/connectors/open-data/getCkanResourceFromPackage.ts`
- Test: `shared/connectors/open-data/getCkanResourceFromPackage.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Add to `getCkanResourceFromPackage.test.ts` (the file already imports
`describe`, `expect`, `it` from `vitest` and `getCkanResourceFromPackage`
from this module - extend the import to add `isReadableCkanResource`, and
add a new `describe` block near the others):

```ts
import { getCkanResourceFromPackage, isReadableCkanResource } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
```

```ts
describe("isReadableCkanResource", () => {
  it("accepts an uploaded CSV resource", () => {
    expect(
      isReadableCkanResource({
        id: "r1",
        name: "data.csv",
        format: "CSV",
        url: "https://data.humdata.org/dataset/x/resource/r1/download/data.csv",
        url_type: "upload",
        size: 100,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
      }),
    ).toBe(true);
  });

  it("accepts an uploaded Parquet resource regardless of format casing", () => {
    expect(
      isReadableCkanResource({
        id: "r2",
        name: "data.parquet",
        format: "Parquet",
        url: "https://data.humdata.org/dataset/x/resource/r2/download/data.parquet",
        url_type: "upload",
        size: 100,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
      }),
    ).toBe(true);
  });

  it("rejects a resource whose url_type is an upstream api link", () => {
    expect(
      isReadableCkanResource({
        id: "r3",
        name: "api link",
        format: "CSV",
        url: "https://upstream.example/api",
        url_type: "api",
        size: undefined,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
      }),
    ).toBe(false);
  });

  it("rejects an uploaded resource in an unsupported format", () => {
    expect(
      isReadableCkanResource({
        id: "r4",
        name: "readme.txt",
        format: "TXT",
        url: "https://data.humdata.org/dataset/x/resource/r4/download/readme.txt",
        url_type: "upload",
        size: 100,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/getCkanResourceFromPackage.test.ts`
Expected: FAIL with `isReadableCkanResource is not a function` (or a module
export error), since the function does not exist yet.

- [ ] **Step 3: Implement `isReadableCkanResource`**

In `getCkanResourceFromPackage.ts`, add this new exported function right
after the existing `READABLE_FORMATS`/`HOSTED_FILE_URL_TYPE` constants and
before `_getHost` (the two constants already exist in this file - do not
redefine them, just reference them from the new function):

```ts
/**
 * Whether a CKAN resource is worth reading at all - the same two rules
 * `getCkanResourceFromPackage` enforces one at a time with a distinct
 * failure code each, collapsed into a single yes/no answer for a caller
 * (the open-data-metacatalog pipeline) that only needs to decide whether to
 * register the resource, not explain why it was skipped.
 */
export function isReadableCkanResource(resource: Readonly<CkanResource>): boolean {
  if (resource.url_type !== HOSTED_FILE_URL_TYPE) {
    return false;
  }
  return READABLE_FORMATS.includes(resource.format.toLowerCase());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/getCkanResourceFromPackage.test.ts`
Expected: PASS, every existing test in this file still green alongside the
4 new ones.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data/getCkanResourceFromPackage.ts shared/connectors/open-data/getCkanResourceFromPackage.test.ts
git commit -m "feat(open-data): export isReadableCkanResource for reuse by the metacatalog pipeline"
```

---

### Task 2: Widen `SocrataDiscoveryClient.search()` for full-drive enumeration

Real Socrata Discovery API calls can omit `q` entirely to list a domain's
whole catalog, and the API paginates with `offset`. Today's client requires
`query` and has no `offset`. Widen both - this is backward compatible,
since nothing besides this client's own test file calls `search()` today.

**Files:**
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts`
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts`
- Test: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Add to `SocrataDiscoveryClient.test.ts`, inside the existing
`describe("SocrataDiscoveryClient.search", ...)` block (after the existing
4 tests, before its closing `});`):

```ts
  it("lists a domain's full catalog when no query is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?domains=data.cityofnewyork.us`,
    );
  });

  it("passes an offset through when given, for paginating a large drive", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
      limit: 100,
      offset: 200,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?domains=data.cityofnewyork.us&limit=100&offset=200`,
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/SocrataDiscoveryClient`
Expected: FAIL - `search({domains: [...]})` with no `query` is a type error
today (`query` is required), and `offset` is not a recognized property.

- [ ] **Step 3: Widen the type**

In `SocrataDiscoveryClient.types.ts`, change:

```ts
  search: (params: {
    query: string;
    domains?: readonly string[];
    limit?: number;
  }) => Promise<SocrataDiscoveryResult[]>;
```

to:

```ts
  search: (params: {
    /** Free-text search. Omitted lists the domain's full catalog. */
    query?: string;
    domains?: readonly string[];
    limit?: number;
    /** Pages past the first `limit` results, for enumerating a large domain. */
    offset?: number;
  }) => Promise<SocrataDiscoveryResult[]>;
```

- [ ] **Step 4: Update the implementation**

In `SocrataDiscoveryClient.ts`, change:

```ts
    search: async ({
      query,
      domains,
      limit,
    }): Promise<SocrataDiscoveryResult[]> => {
      const params = new URLSearchParams({ q: query });
      if (domains && domains.length > 0) {
        params.set("domains", domains.join(","));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
```

to:

```ts
    search: async ({
      query,
      domains,
      limit,
      offset,
    }): Promise<SocrataDiscoveryResult[]> => {
      const params = new URLSearchParams();
      if (query !== undefined) {
        params.set("q", query);
      }
      if (domains && domains.length > 0) {
        params.set("domains", domains.join(","));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
      if (offset !== undefined) {
        params.set("offset", String(offset));
      }
```

(The rest of the function - the `http.getJson` call and the result mapping -
is unchanged; only the params-building block above it changes.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/SocrataDiscoveryClient`
Expected: PASS, all 6 tests green (4 existing + 2 new).

- [ ] **Step 6: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add shared/connectors/open-data/SocrataDiscoveryClient
git commit -m "feat(open-data): make SocrataDiscoveryClient.search's query optional, add offset pagination"
```

---

### Task 3: `CkanDiscoveryClient`

CKAN has no cross-drive index (unlike Socrata's Discovery API), but every
CKAN deployment exposes `package_list`, which returns every dataset's slug
in that one deployment in a single, unpaginated call. This mirrors
`SocrataDiscoveryClient`'s separate-module shape rather than adding a
listing method onto `CkanClient`, for the same reason the two Socrata
clients are already split: one client reads a *known* dataset, the other
*discovers* which datasets exist.

**Files:**
- Create: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts`
- Create: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts`
- Create: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts`
- Create: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.test.ts`

- [ ] **Step 1: Write the types**

```ts
// CkanDiscoveryClient.types.ts
/** Lists every dataset slug in one CKAN deployment. */
export type CkanDiscoveryClient = {
  /**
   * Reads `package_list`, which returns every dataset's slug in this one
   * CKAN deployment. CKAN has no cross-deployment index - unlike Socrata's
   * Discovery API, there is no `domains`-style parameter here, because a
   * CKAN drive has nothing else to scope by.
   */
  listDatasets: (params: { baseUrl: string }) => Promise<string[]>;
};
```

- [ ] **Step 2: Write the Zod schema**

```ts
// CkanDiscoveryClient.schemas.ts
import { z } from "zod";

/** `package_list`'s successful result: every dataset slug, unpaginated. */
export const CkanPackageListResultSchema = z.array(z.string());
```

- [ ] **Step 3: Write the failing tests**

```ts
// CkanDiscoveryClient.test.ts
import { describe, expect, it, vi } from "vitest";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const BASE_URL = "https://data.humdata.org";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        success: true,
        result: ["movement-range-maps", "hdx-hapi-operational-presence"],
      };
    }),
    getBytes: vi.fn(),
    ...overrides,
  };
}

describe("CkanDiscoveryClient.listDatasets", () => {
  it("requests the package_list action for the given deployment", async () => {
    const http = _http();

    await createCkanDiscoveryClient(http).listDatasets({ baseUrl: BASE_URL });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/3/action/package_list?`,
    );
  });

  it("returns every dataset slug", async () => {
    const http = _http();

    const slugs = await createCkanDiscoveryClient(http).listDatasets({
      baseUrl: BASE_URL,
    });

    expect(slugs).toEqual([
      "movement-range-maps",
      "hdx-hapi-operational-presence",
    ]);
  });

  it("raises ckan-action-failed when the action reports failure", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return {
          success: false,
          error: { __type: "Some Error", message: "boom" },
        };
      }),
    });

    await expect(
      createCkanDiscoveryClient(http).listDatasets({ baseUrl: BASE_URL }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "ckan-action-failed");
    });
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/CkanDiscoveryClient`
Expected: FAIL with "Cannot find module" (`CkanDiscoveryClient.ts` does not
exist yet).

- [ ] **Step 5: Implement `CkanDiscoveryClient`**

```ts
// CkanDiscoveryClient.ts
import { CkanEnvelopeSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { CkanPackageListResultSchema } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const ACTION_PATH = "/api/3/action";

/** CKAN's `__type` for an action requiring a logged-in user. */
const AUTHORIZATION_ERROR_TYPE = "Authorization Error";

function _unwrapEnvelope(action: string, body: unknown): unknown {
  const envelope = CkanEnvelopeSchema.parse(body);
  if (envelope.success) {
    return envelope.result;
  }
  const ckanErrorType = envelope.error.__type ?? "unknown";
  if (ckanErrorType === AUTHORIZATION_ERROR_TYPE) {
    throw new OpenDataAcquisitionFailed({
      code: "ckan-authorization-required",
      action,
    });
  }
  throw new OpenDataAcquisitionFailed({
    code: "ckan-action-failed",
    action,
    ckanErrorType,
  });
}

/**
 * Lists CKAN dataset slugs over an injected HTTP layer.
 *
 * Stateless, mirroring `CkanClient`'s shape: every call takes its base URL
 * as an argument, so one client serves any number of CKAN deployments.
 * Separate from `CkanClient` because it discovers *which* datasets exist
 * rather than reading one already-known dataset - the same split
 * `SocrataDiscoveryClient` already draws against `SocrataClient`.
 */
export function createCkanDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): CkanDiscoveryClient {
  return {
    listDatasets: async ({ baseUrl }): Promise<string[]> => {
      const root = baseUrl.replace(/\/+$/, "");
      const url = `${root}${ACTION_PATH}/package_list?`;
      const body = await http.getJson(url);
      const result = _unwrapEnvelope("package_list", body);
      return CkanPackageListResultSchema.parse(result);
    },
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/CkanDiscoveryClient`
Expected: PASS

- [ ] **Step 7: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 8: Commit**

```bash
git add shared/connectors/open-data/CkanDiscoveryClient
git commit -m "feat(open-data): add CkanDiscoveryClient to list every dataset in one drive"
```

---

### Task 4: The drive registry

The hardcoded, short list of drives this feature is scoped to. A deployer
(Avandar or a fork) edits this one file to add or remove a drive - no
schema change, no new connector.

**Files:**
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.ts`
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// configuredDrives.test.ts
import { describe, expect, it } from "vitest";
import { CONFIGURED_DRIVES } from "@pipelines/open-data-metacatalog/configuredDrives";

describe("CONFIGURED_DRIVES", () => {
  it("has no duplicate (apiService, baseUrl) pair", () => {
    const seen = new Set<string>();
    for (const drive of CONFIGURED_DRIVES) {
      const key = `${drive.apiService}:${drive.baseUrl}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("every baseUrl is https", () => {
    for (const drive of CONFIGURED_DRIVES) {
      expect(drive.baseUrl.startsWith("https://")).toBe(true);
    }
  });

  it("every baseUrl has no trailing slash", () => {
    for (const drive of CONFIGURED_DRIVES) {
      expect(drive.baseUrl.endsWith("/")).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.test.ts`
Expected: FAIL with "Cannot find module" (`configuredDrives.ts` does not
exist yet).

- [ ] **Step 3: Implement the registry**

```ts
// configuredDrives.ts
/** One drive (CKAN deployment or Socrata portal) the metacatalog pipeline enumerates. */
export type ConfiguredDrive = {
  apiService: "ckan" | "socrata";
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /**
   * Used as every discovered dataset's `external_organization_name`.
   * Neither client parses an organization field from its own API today
   * (CKAN's `package_show` has one, Socrata's Discovery API has a
   * different one, and the two are not alike enough to normalize), so the
   * registry names it once per drive instead.
   */
  organizationName: string;
};

/**
 * The short, hardcoded list of drives this Avandar deployment prebuilds a
 * metacatalog for. A fork maintains its own list; nothing here is shared
 * across deployments. See `open-data-catalog-architecture.md` section 6.2.
 */
export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [
  {
    apiService: "ckan",
    baseUrl: "https://data.humdata.org",
    organizationName: "Humanitarian Data Exchange",
  },
];
```

(The one seed entry above is deliberately the same HDX instance already
used throughout this codebase's CKAN tests and fixtures - a real, known-good
drive to exercise the pipeline against on day one. Add further drives here
as the deployer decides; that is a data change to this file, not a code
change anywhere else.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.ts apps/pipeline-server/pipelines/open-data-metacatalog/configuredDrives.test.ts
git commit -m "feat(open-data): add the open-data-metacatalog pipeline's drive registry"
```

---

### Task 5: Pure row-building functions

The part of the pipeline with real logic worth unit-testing in isolation:
turning one discovered CKAN package or Socrata dataset into zero or more
plain, upsert-ready row objects. No network, no database - these are pure
functions over already-fetched data.

**Files:**
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.ts`
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// buildMetacatalogRows.test.ts
import { describe, expect, it } from "vitest";
import {
  buildCkanMetacatalogRows,
  buildSocrataMetacatalogRow,
} from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts";

const CKAN_DRIVE: ConfiguredDrive = {
  apiService: "ckan",
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};

const SOCRATA_DRIVE: ConfiguredDrive = {
  apiService: "socrata",
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "NYC Open Data",
};

describe("buildCkanMetacatalogRows", () => {
  it("builds one row per readable resource", () => {
    const ckanPackage: CkanPackage = {
      id: "c3429f0e",
      name: "movement-range-maps",
      metadata_modified: "2025-11-19T10:29:46.280529",
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
        {
          id: "csv-1",
          name: "data.csv",
          format: "CSV",
          url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
          url_type: "upload",
          size: 200,
          hash: "abc",
          last_modified: "2026-01-01T00:00:00Z",
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    const rows = buildCkanMetacatalogRows({ drive: CKAN_DRIVE, ckanPackage });

    expect(rows).toEqual([
      {
        access_kind: "api_resource",
        api_service: "ckan",
        api_base_url: "https://data.humdata.org",
        external_dataset_id: "movement-range-maps",
        api_resource_id: "csv-1",
        api_resource_format: "CSV",
        display_name: "data.csv",
        external_organization_name: "Humanitarian Data Exchange",
      },
    ]);
  });

  it("returns no rows when the dataset has no readable resource", () => {
    const ckanPackage: CkanPackage = {
      id: "c3429f0e",
      name: "docs-only-dataset",
      metadata_modified: undefined,
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    expect(
      buildCkanMetacatalogRows({ drive: CKAN_DRIVE, ckanPackage }),
    ).toEqual([]);
  });
});

describe("buildSocrataMetacatalogRow", () => {
  it("builds one row, always formatted as csv", () => {
    const result: SocrataDiscoveryResult = {
      datasetId: "erm2-nwe9",
      name: "311 Service Requests from 2020 to Present",
      domain: "data.cityofnewyork.us",
    };

    expect(
      buildSocrataMetacatalogRow({ drive: SOCRATA_DRIVE, result }),
    ).toEqual({
      access_kind: "api_resource",
      api_service: "socrata",
      api_base_url: "https://data.cityofnewyork.us",
      external_dataset_id: "erm2-nwe9",
      api_resource_id: "erm2-nwe9",
      api_resource_format: "CSV",
      display_name: "311 Service Requests from 2020 to Present",
      external_organization_name: "NYC Open Data",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.test.ts`
Expected: FAIL with "Cannot find module" (the file does not exist yet).

- [ ] **Step 3: Implement the row builders**

```ts
// buildMetacatalogRows.ts
import { isReadableCkanResource } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts";

/**
 * One `catalog_entries__open_data` row, upsert-ready. Deliberately never
 * carries `cached_object_path`/`cached_source_version`/`cached_at`: the
 * upsert in `upsertMetacatalogRows.ts` relies on their absence to leave an
 * existing row's cache untouched on a re-run.
 */
export type MetacatalogRow = {
  access_kind: "api_resource";
  api_service: "ckan" | "socrata";
  api_base_url: string;
  external_dataset_id: string;
  api_resource_id: string;
  api_resource_format: string;
  display_name: string;
  external_organization_name: string;
};

/**
 * Builds one row per CKAN resource worth reading, using the exact same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields no rows at all - it is still visible
 * via `package_list`, just not catalog-worthy.
 */
export function buildCkanMetacatalogRows(params: {
  drive: Readonly<ConfiguredDrive>;
  ckanPackage: Readonly<CkanPackage>;
}): MetacatalogRow[] {
  const { drive, ckanPackage } = params;
  return ckanPackage.resources
    .filter(isReadableCkanResource)
    .map((resource) => {
      return {
        access_kind: "api_resource",
        api_service: "ckan",
        api_base_url: drive.baseUrl,
        external_dataset_id: ckanPackage.name,
        api_resource_id: resource.id,
        api_resource_format: resource.format.toUpperCase(),
        display_name: resource.name,
        external_organization_name: drive.organizationName,
      };
    });
}

/**
 * Builds the one row a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export
 * regardless of what else the view offers, so that is what this row will
 * actually be read as, not a value read from any Socrata metadata field.
 */
export function buildSocrataMetacatalogRow(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): MetacatalogRow {
  const { drive, result } = params;
  return {
    access_kind: "api_resource",
    api_service: "socrata",
    api_base_url: drive.baseUrl,
    external_dataset_id: result.datasetId,
    api_resource_id: result.datasetId,
    api_resource_format: "CSV",
    display_name: result.name,
    external_organization_name: drive.organizationName,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.ts apps/pipeline-server/pipelines/open-data-metacatalog/buildMetacatalogRows.test.ts
git commit -m "feat(open-data): add pure row-building functions for the metacatalog pipeline"
```

---

### Task 6: The upsert function

Writes `MetacatalogRow`s to `catalog_entries__open_data`, against the
existing partial unique index on `(api_service, api_base_url,
external_dataset_id, api_resource_id)`. Mirrors
`world-bank__wdi/catalogOpenDataInsert.ts`'s plain-`@supabase/supabase-js`,
hand-built-row convention rather than going through `@avandar/models` (that
model's only exported method is a DB-row-to-domain-type reader, with no
insert/upsert helper, so there is nothing to reuse there - the existing
pipeline convention already covers this exact need).

**Files:**
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.ts`
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// upsertMetacatalogRows.test.ts
import { describe, expect, it, vi } from "vitest";
import { upsertMetacatalogRows } from "@pipelines/open-data-metacatalog/upsertMetacatalogRows";
import type { MetacatalogRow } from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROW: MetacatalogRow = {
  access_kind: "api_resource",
  api_service: "ckan",
  api_base_url: "https://data.humdata.org",
  external_dataset_id: "movement-range-maps",
  api_resource_id: "csv-1",
  api_resource_format: "CSV",
  display_name: "data.csv",
  external_organization_name: "Humanitarian Data Exchange",
};

function _fakeSupabase(overrides: { upsertResult?: { error: { message: string } | null } } = {}) {
  const upsert = vi.fn(async () => {
    return overrides.upsertResult ?? { error: null };
  });
  const client = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient;
  return { client, upsert };
}

describe("upsertMetacatalogRows", () => {
  it("does nothing when there are no rows", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertMetacatalogRows({ supabase: client, rows: [] });

    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts every row against the api_resource unique index", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertMetacatalogRows({ supabase: client, rows: [ROW] });

    expect(client.from).toHaveBeenCalledWith("catalog_entries__open_data");
    expect(upsert).toHaveBeenCalledWith([ROW], {
      onConflict: "api_service,api_base_url,external_dataset_id,api_resource_id",
    });
  });

  it("throws with the upstream message when the upsert fails", async () => {
    const { client } = _fakeSupabase({
      upsertResult: { error: { message: "constraint violation" } },
    });

    await expect(
      upsertMetacatalogRows({ supabase: client, rows: [ROW] }),
    ).rejects.toThrow("constraint violation");
  });
});
```

This test file runs under Vitest in `apps/pipeline-server` (Node/Bun, not
Deno). The one `as unknown as SupabaseClient` cast is necessary because the
fake only implements the one method (`from`) this function actually calls,
not the full `SupabaseClient` surface - matching the same cast shape
`CkanDiscoveryClient.test.ts`'s and `SocrataDiscoveryClient.test.ts`'s own
fakes use for their injected dependencies.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.test.ts`
Expected: FAIL with "Cannot find module" (the file does not exist yet).

- [ ] **Step 3: Implement the upsert function**

```ts
// upsertMetacatalogRows.ts
import type { MetacatalogRow } from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upserts one `catalog_entries__open_data` row per discovered resource,
 * against the existing partial unique index on `(api_service, api_base_url,
 * external_dataset_id, api_resource_id)`.
 *
 * Deliberately never writes `cached_object_path`/`cached_source_version`/
 * `cached_at`: `MetacatalogRow` has no such fields (see
 * `buildMetacatalogRows.ts`), so a re-run of this pipeline can never
 * overwrite an existing row's write-back cache - it only ever touches the
 * metadata columns this pipeline actually knows about.
 */
export async function upsertMetacatalogRows(params: {
  supabase: SupabaseClient;
  rows: readonly MetacatalogRow[];
}): Promise<void> {
  const { supabase, rows } = params;
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("catalog_entries__open_data")
    .upsert([...rows], {
      onConflict: "api_service,api_base_url,external_dataset_id,api_resource_id",
    });

  if (error) {
    throw new Error(`catalog_entries__open_data upsert failed: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.ts apps/pipeline-server/pipelines/open-data-metacatalog/upsertMetacatalogRows.test.ts
git commit -m "feat(open-data): add the metacatalog pipeline's upsert function"
```

---

### Task 7: `run.ts` - wiring it all together

The pipeline's entry point: loop the drive registry, dispatch by
`apiService`, enumerate, build rows, upsert. Unlike every other pipeline in
this repo, this does not use `EtlEngine.create(...)` - that abstraction is
for extracting/transforming/loading *data* into Parquet, and this pipeline
does neither.

**Files:**
- Create: `apps/pipeline-server/pipelines/open-data-metacatalog/run.ts`

No test file for `run.ts` itself: it is pure orchestration (network + DB
side effects, no branching logic of its own beyond "which service is
this"), matching this repo's own precedent - `world-bank__wdi/run.ts` has no
test today either; every piece of real logic it calls into
(`buildMetacatalogRows.ts`, `upsertMetacatalogRows.ts`, the two discovery
clients) is already unit-tested in isolation by Tasks 1-6.

- [ ] **Step 1: Read the real current `createOpenDataHttp` signature first**

Before writing `run.ts`, confirm `createOpenDataHttp({maxBytes: number})`'s
exact signature by reading `shared/connectors/open-data/createOpenDataHttp.ts`
- it is already used this way by `supabase/functions/open-data/OpenDataRoutes.ts`
and should not need any change here; this step is a sanity check, not an
edit.

- [ ] **Step 2: Implement `run.ts`**

```ts
// run.ts
import { randomUUID } from "node:crypto";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp.ts";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts";
import {
  buildCkanMetacatalogRows,
  buildSocrataMetacatalogRow,
} from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import { CONFIGURED_DRIVES } from "@pipelines/open-data-metacatalog/configuredDrives";
import { upsertMetacatalogRows } from "@pipelines/open-data-metacatalog/upsertMetacatalogRows";
import { createSupabaseAdminClient } from "@pipelines/world-bank__wdi/catalogOpenDataInsert";
import type { MetacatalogRow } from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** One Discovery API page, matching Socrata's own reasonable page size. */
const SOCRATA_PAGE_SIZE = 100;

async function _enumerateCkanDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<MetacatalogRow[]> {
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const slugs = await discovery.listDatasets({ baseUrl: drive.baseUrl });
  const rows: MetacatalogRow[] = [];
  // Sequential on purpose: this is an offline batch job, not a user-facing
  // request, and each iteration is independent - no ordering dependency,
  // just no need yet for the added complexity of a concurrency limiter.
  for (const slug of slugs) {
    const ckanPackage = await client.getPackage({
      baseUrl: drive.baseUrl,
      ckanDatasetId: slug,
    });
    rows.push(...buildCkanMetacatalogRows({ drive, ckanPackage }));
  }
  return rows;
}

async function _enumerateSocrataDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<MetacatalogRow[]> {
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createSocrataDiscoveryClient(http);
  const domain = new URL(drive.baseUrl).host;

  const rows: MetacatalogRow[] = [];
  let offset = 0;
  // Sequential pagination on purpose: each page's offset depends on the
  // previous page's result count, so this cannot run concurrently.
  for (;;) {
    const page = await discovery.search({
      domains: [domain],
      limit: SOCRATA_PAGE_SIZE,
      offset,
    });
    for (const result of page) {
      rows.push(buildSocrataMetacatalogRow({ drive, result }));
    }
    if (page.length < SOCRATA_PAGE_SIZE) {
      break;
    }
    offset += SOCRATA_PAGE_SIZE;
  }
  return rows;
}

/**
 * Enumerates every configured drive and upserts one
 * `catalog_entries__open_data` row per readable resource it finds.
 *
 * Not an `EtlEngine` pipeline: nothing here extracts, transforms, or loads
 * data into Parquet. It only discovers metadata and writes catalog rows -
 * the actual resource bytes are still fetched live on first query, by the
 * existing `acquireOpenDataResourceWithCache` path, completely unchanged.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();
  const supabase = createSupabaseAdminClient();

  const rowsPerDrive = await Promise.all(
    CONFIGURED_DRIVES.map((drive) => {
      return drive.apiService === "ckan"
        ? _enumerateCkanDrive(drive)
        : _enumerateSocrataDrive(drive);
    }),
  );

  const rows = rowsPerDrive.flat();
  console.log(
    `[open-data-metacatalog] discovered ${String(rows.length)} resources across ${String(CONFIGURED_DRIVES.length)} drives`,
  );
  await upsertMetacatalogRows({ supabase, rows });

  return pipelineRunId;
}
```

(`createSupabaseAdminClient` is already exported from
`world-bank__wdi/catalogOpenDataInsert.ts` and reads `SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY` from the environment - reuse it directly rather
than writing a second copy of the same four lines. Every other pipeline's
`run()` returns a `pipelineRunId` it got from `EtlEngine.run()`; this
pipeline has no `EtlEngine` run to source one from, so it mints its own via
`randomUUID()` - this is purely a return value for `runPipelineOnce.ts` to
print, it is not written to any row by this pipeline.)

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 4: Run every test this plan added, end to end**

```bash
pnpm vitest run shared/connectors/open-data/getCkanResourceFromPackage.test.ts \
  shared/connectors/open-data/SocrataDiscoveryClient \
  shared/connectors/open-data/CkanDiscoveryClient \
  apps/pipeline-server/pipelines/open-data-metacatalog
```

Expected: PASS, every test from Tasks 1-6 green.

- [ ] **Step 5: Manual dry run against the real HDX drive**

This step exercises `run()` against the one real, live drive already seeded
in `configuredDrives.ts` (HDX, `data.humdata.org`), on a switched local
Supabase stack (confirm with `ava supabase status` first - never run this
against the shared stack). This is a live network call and a real database
write, so run it deliberately, not as part of automated CI:

```bash
pnpm exec vite-node --config vite.script.config.ts scripts/runPipelineOnce.ts open-data-metacatalog
```

Expected: prints a pipeline run id on its last line of output, with no
thrown error above it. Afterward, confirm rows actually landed:

```sql
select api_service, api_base_url, external_dataset_id, api_resource_id, display_name
from catalog_entries__open_data
where access_kind = 'api_resource' and api_service = 'ckan'
order by external_dataset_id;
```

Run it a second time immediately after and confirm the row count is
unchanged (idempotent upsert, not duplicate inserts), and that
`cached_object_path`/`cached_source_version`/`cached_at` are still `null`
for every row the dry run touched (confirming the upsert never wrote cache
columns it has no opinion about).

- [ ] **Step 6: Commit**

```bash
git add apps/pipeline-server/pipelines/open-data-metacatalog/run.ts
git commit -m "feat(open-data): wire the open-data-metacatalog pipeline's run() entry point"
```

---

## After all tasks: full verification

- [ ] Run the complete affected-area test suite:

```bash
pnpm vitest run shared/connectors/open-data apps/pipeline-server/pipelines/open-data-metacatalog
pnpm type-check
```

- [ ] Confirm `git log --oneline` shows one commit per task, in order, with
  no task's commit containing an unrelated file.

- [ ] Re-read `open-data-catalog-architecture.md` section 6 against what
  actually landed, and update any function/file name that moved during TDD,
  per this branch's own documentation convention.
