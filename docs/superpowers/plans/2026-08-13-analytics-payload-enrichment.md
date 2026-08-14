# Analytics Payload Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich active browser analytics events with approved, privacy-safe payloads and distinguish first dashboard publication from later sharing updates.

**Architecture:** Keep emission at existing product call sites. Extract only non-trivial payload derivation into feature-local pure helpers, then harden the shared event union so a payload is required whenever the event defines one. Each feature task updates its payload type and emitter together so every checkpoint is type-correct.

**Tech Stack:** TypeScript 5.9, React 19, Vitest, Testing Library, TanStack Query, Mantine, Puck, Lingui, and `AnalyticsClient`.

## Global Constraints

- Work only in the `feat/analytics-payloads` worktree based on current `origin/develop`.
- Use red/green TDD for every behavioral change.
- Do not change Supabase schemas, migrations, RPCs, generated files, PDF components, or translation catalogs.
- Never write to the Avandar Supabase production database.
- Never put SQL text, chat content, filter values, filter labels, dataset names, or other raw user content in analytics payloads.
- Analytics must remain fire-and-forget and must not block product behavior.
- Public dashboard filter interactions must not emit authenticated usage analytics.
- Debounce contains-filter analytics by exactly 500 milliseconds and cancel pending emission on unmount.
- `chat.message_sent.runtimeMode` records the initially selected route.
- Keep new functions at 45 lines or fewer. Do not refactor unrelated existing functions.
- Add no user-facing text. If that changes, route it through Lingui.
- Do not use em dashes in comments or documentation.
- Do not commit, push, merge, or publish without separate user authorization. Skip conditional commit steps when authorization is absent.
- Run focused frontend tests only. Do not run the complete end-to-end suite.

---

## File Map

**Shared contract**

- Modify `shared/analytics/analyticsEvents/analyticsEvents.ts`.
- Modify `src/lib/analytics/AnalyticsClient.test.ts`.

**Dataset import**

- Create `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.ts`.
- Create `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.test.ts`.
- Create `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.test.tsx`.
- Modify `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts`.

**Dashboard publishing**

- Create `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.ts`.
- Create `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts`.
- Create `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx`.
- Modify `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx`.

**Chat**

- Create `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts`.
- Create `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts`.
- Modify `src/components/ChatPanel/useAvandarChatRuntime.ts`.

**Dashboard filters**

- Create `src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx`.
- Modify `src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.tsx`.

---

## Execution Preflight

The worktree was created at `05bf4181`. Before Task 1, verify whether
`origin/develop` advanced:

```bash
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/develop
git diff --name-only HEAD..origin/develop -- \
  shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/lib/analytics/AnalyticsClient.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal \
  src/components/ChatPanel/useAvandarChatRuntime.ts \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock \
  docs/rules/typescript.md \
  docs/rules/testing.md
```

If the branch is behind, stop and request authorization before fast-forwarding
or rebasing it. After an authorized sync, reread any changed rule or target file
before starting red/green work. Do not implement against a stale target file.

---

### Task 1: Enrich `dataset.imported`

**Files:**

- Create: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.test.ts`
- Create: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.ts`
- Create: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.test.tsx`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts:91-93`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts:1-20,79-92,179-220`

**Interfaces:**

- Consumes: `DataSourceMetadata`, `DatasetClient.useGetAll`, and `AnalyticsEventPayloads["dataset.imported"]`.
- Produces: `makeDatasetImportedPayloadFromSaveResult(options): AnalyticsEventPayloads["dataset.imported"]`.
- Payload: `{ datasetId, sourceType, columnCount, rowCount, isFirstInWorkspace }`.

- [ ] **Step 1: Write failing payload tests**

Create `makeDatasetImportedPayloadFromSaveResult.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeDatasetImportedPayloadFromSaveResult } from "./makeDatasetImportedPayloadFromSaveResult";

describe("makeDatasetImportedPayloadFromSaveResult", () => {
  it.each([
    {
      datasetId: "dataset-1",
      source: {
        sourceType: "csv_file" as const,
        datasetLoadResult: { numRows: 12, columns: [{}, {}, {}] },
      },
      isFirstInWorkspace: true,
      expected: {
        datasetId: "dataset-1",
        sourceType: "csv_file",
        columnCount: 3,
        rowCount: 12,
        isFirstInWorkspace: true,
      },
    },
    {
      datasetId: "dataset-2",
      source: {
        sourceType: "xlsx_file" as const,
        datasetLoadResult: { numRows: 20, columns: [{}, {}] },
      },
      isFirstInWorkspace: false,
      expected: {
        datasetId: "dataset-2",
        sourceType: "xlsx_file",
        columnCount: 2,
        rowCount: 20,
        isFirstInWorkspace: false,
      },
    },
  ])("derives $source.sourceType dimensions", (fixture) => {
    expect(
      makeDatasetImportedPayloadFromSaveResult({
        datasetId: fixture.datasetId,
        source: fixture.source,
        isFirstInWorkspace: fixture.isFirstInWorkspace,
      }),
    ).toEqual(fixture.expected);
  });

  it("reads Google Sheets columns from sheet metadata", () => {
    expect(
      makeDatasetImportedPayloadFromSaveResult({
        datasetId: "dataset-3",
        source: {
          sourceType: "google_sheets",
          datasetLoadResult: {
            numRows: 7,
            sheetLoadMetadata: { columns: [{}, {}, {}, {}] },
          },
        },
        isFirstInWorkspace: false,
      }),
    ).toEqual({
      datasetId: "dataset-3",
      sourceType: "google_sheets",
      columnCount: 4,
      rowCount: 7,
      isFirstInWorkspace: false,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify red**

```bash
pnpm test:frontend src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Add the dataset payload contract and helper**

Replace the `dataset.imported` payload branch:

```ts
K extends "dataset.imported" ?
  {
    datasetId: string;
    sourceType: "csv_file" | "google_sheets" | "xlsx_file";
    columnCount: number;
    rowCount: number;
    isFirstInWorkspace: boolean;
  }
```

Create `makeDatasetImportedPayloadFromSaveResult.ts`:

```ts
import type { AnalyticsEventPayloads } from "$/analytics/analyticsEvents/analyticsEvents";

type FileImportAnalyticsSource = {
  sourceType: "csv_file" | "xlsx_file";
  datasetLoadResult: {
    numRows: number;
    columns: readonly unknown[];
  };
};

type GoogleSheetsImportAnalyticsSource = {
  sourceType: "google_sheets";
  datasetLoadResult: {
    numRows: number;
    sheetLoadMetadata: { columns: readonly unknown[] };
  };
};

type DatasetImportAnalyticsSource =
  | FileImportAnalyticsSource
  | GoogleSheetsImportAnalyticsSource;

/** Derives privacy-safe analytics dimensions from a successful dataset save. */
export function makeDatasetImportedPayloadFromSaveResult(options: {
  datasetId: string;
  source: DatasetImportAnalyticsSource;
  isFirstInWorkspace: boolean;
}): AnalyticsEventPayloads["dataset.imported"] {
  const { source } = options;
  const columnCount =
    source.sourceType === "google_sheets" ?
      source.datasetLoadResult.sheetLoadMetadata.columns.length
    : source.datasetLoadResult.columns.length;

  return {
    datasetId: options.datasetId,
    sourceType: source.sourceType,
    columnCount,
    rowCount: source.datasetLoadResult.numRows,
    isFirstInWorkspace: options.isFirstInWorkspace,
  };
}
```

- [ ] **Step 4: Run the helper tests and verify green**

Run the Step 2 command.

Expected: 3 cases PASS.

- [ ] **Step 5: Write failing hook integration tests**

Create `useSaveDataset.test.tsx`. Mock `useMutation` to capture `onMutate` and `onSuccess`, mock `DatasetClient.useGetAll`, `AnalyticsClient.logEvent`, notifications, navigation, and current workspace. Use typed CSV and saved-dataset fixtures. Add:

```tsx
it("emits first-import metadata from the pre-save snapshot", async () => {
  workspaceDatasetsMock.mockReturnValue([]);
  renderHook(() => useSaveDataset());

  const context = capturedMutationOptions.onMutate?.(CSV_PARAMS);
  await capturedMutationOptions.onSuccess?.(SAVED_DATASET, CSV_PARAMS, context);

  expect(logEventMock).toHaveBeenCalledOnce();
  expect(logEventMock).toHaveBeenCalledWith({
    event: "dataset.imported",
    workspaceId: TEST_WORKSPACE.id,
    app: "data_sources",
    payload: {
      datasetId: SAVED_DATASET.id,
      sourceType: "csv_file",
      columnCount: CSV_PARAMS.datasetLoadResult.columns.length,
      rowCount: CSV_PARAMS.datasetLoadResult.numRows,
      isFirstInWorkspace: true,
    },
  });
});

it("marks a later import as non-first", async () => {
  workspaceDatasetsMock.mockReturnValue([SAVED_DATASET]);
  renderHook(() => useSaveDataset());

  const context = capturedMutationOptions.onMutate?.(CSV_PARAMS);
  await capturedMutationOptions.onSuccess?.(SAVED_DATASET, CSV_PARAMS, context);

  expect(logEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({ isFirstInWorkspace: false }),
    }),
  );
});

it("does not block save success when the analytics snapshot is unavailable", async () => {
  workspaceDatasetsMock.mockReturnValue(undefined);
  const onAfterSave = vi.fn();
  renderHook(() => useSaveDataset({ onAfterSave }));

  const context = capturedMutationOptions.onMutate?.(CSV_PARAMS);
  await capturedMutationOptions.onSuccess?.(SAVED_DATASET, CSV_PARAMS, context);

  expect(logEventMock).not.toHaveBeenCalled();
  expect(onAfterSave).toHaveBeenCalledWith(SAVED_DATASET);
});
```

- [ ] **Step 6: Run the hook tests and verify red**

```bash
pnpm test:frontend src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.test.tsx
```

Expected: FAIL because the hook does not snapshot the dataset list or build the full payload.

- [ ] **Step 7: Snapshot the existing query and emit**

Import `where` and the helper. Add:

```ts
type SaveDatasetMutationContext = {
  isFirstInWorkspace?: boolean;
};

const [workspaceDatasets] = DatasetClient.useGetAll(
  where("workspace_id", "eq", workspace.id),
);
```

Update the exported hook's return annotation so its fourth generic carries the
same context:

```ts
): UseMutationResultTuple<
  Dataset.T,
  DatasetImportFormValues & DataSourceMetadata,
  Error,
  SaveDatasetMutationContext
> {
```

Add the generic context and `onMutate` to the existing mutation:

```ts
return useMutation<
  Dataset.T,
  DatasetImportFormValues & DataSourceMetadata,
  Error,
  SaveDatasetMutationContext
>({
  queryToInvalidate: DatasetClient.QueryKeys.getAll(),
  onMutate: () => {
    return {
      isFirstInWorkspace:
        workspaceDatasets === undefined ?
          undefined
        : workspaceDatasets.length === 0,
    };
  },
```

Change the success signature and analytics block:

```ts
onSuccess: async (savedDataset, params, mutationContext) => {
  // Existing notification and upload code remains unchanged above emission.
  if (mutationContext?.isFirstInWorkspace !== undefined) {
    void AnalyticsClient.logEvent({
      event: "dataset.imported",
      workspaceId: workspace.id,
      app: "data_sources",
      payload: makeDatasetImportedPayloadFromSaveResult({
        datasetId: savedDataset.id,
        source: params,
        isFirstInWorkspace: mutationContext.isFirstInWorkspace,
      }),
    });
  }
  // Existing callbacks and navigation remain unchanged below emission.
},
```

Keep the existing mutation function and all non-analytics success behavior unchanged.

- [ ] **Step 8: Verify Task 1**

```bash
pnpm test:frontend \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.test.tsx
pnpm type-check
```

Expected: all focused tests PASS and TypeScript exits 0.

- [ ] **Step 9: Conditional commit**

If authorized:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset
git commit -m "feat(analytics): enrich dataset import events"
```

Otherwise skip.

---

### Task 2: Classify dashboard publication and sharing updates

**Files:**

- Create: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts`
- Create: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.ts`
- Create: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts:93-95`
- Modify: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx:82-111`

**Interfaces:**

- Consumes the dashboard before mutation and the successful returned dashboard.
- Produces `makeDashboardPublishAnalyticsEventFromDashboards`.
- Returns either the `dashboard.published` or `dashboard.share_settings_updated` branch of `ClientAnalyticsEvent`.

- [ ] **Step 1: Write failing classification tests**

Create a typed `_makeDashboard({ isPublic, slug, blockCount })` fixture and test:

```ts
it("classifies a first publication", () => {
  const previousDashboard = _makeDashboard({
    isPublic: false,
    slug: undefined,
    blockCount: 1,
  });
  const updatedDashboard = _makeDashboard({
    isPublic: true,
    slug: "sales-overview",
    blockCount: 3,
  });

  expect(
    makeDashboardPublishAnalyticsEventFromDashboards({
      previousDashboard,
      updatedDashboard,
    }),
  ).toEqual({
    event: "dashboard.published",
    payload: {
      dashboardId: updatedDashboard.id,
      blockCount: 3,
      hasVanitySlug: true,
    },
  });
});

it.each([
  [undefined, "new-slug", "set"],
  ["old-slug", "new-slug", "set"],
  ["old-slug", undefined, "clear"],
  ["same-slug", "same-slug", "unchanged"],
] as const)(
  "classifies slug transition as %s -> %s",
  (previousSlug, updatedSlug, slugAction) => {
    const previousDashboard = _makeDashboard({
      isPublic: true,
      slug: previousSlug,
      blockCount: 2,
    });
    const updatedDashboard = _makeDashboard({
      isPublic: true,
      slug: updatedSlug,
      blockCount: 2,
    });

    expect(
      makeDashboardPublishAnalyticsEventFromDashboards({
        previousDashboard,
        updatedDashboard,
      }),
    ).toEqual({
      event: "dashboard.share_settings_updated",
      payload: {
        dashboardId: updatedDashboard.id,
        slugAction,
      },
    });
  },
);
```

- [ ] **Step 2: Run and verify red**

```bash
pnpm test:frontend src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Add payload types and helper**

Add:

```ts
: K extends "dashboard.published" ?
  { dashboardId: string; blockCount: number; hasVanitySlug: boolean }
: K extends "dashboard.share_settings_updated" ?
  { dashboardId: string; slugAction: "set" | "clear" | "unchanged" }
```

Create the helper:

```ts
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ClientAnalyticsEvent } from "$/analytics/analyticsEvents/analyticsEvents";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type DashboardPublishAnalyticsEvent = Extract<
  ClientAnalyticsEvent,
  {
    event: "dashboard.published" | "dashboard.share_settings_updated";
  }
>;

function _getSlugAction(options: {
  previousSlug: string | undefined;
  updatedSlug: string | undefined;
}): "set" | "clear" | "unchanged" {
  if (options.previousSlug === options.updatedSlug) {
    return "unchanged";
  }
  return options.updatedSlug === undefined ? "clear" : "set";
}

/** Classifies analytics for a successful dashboard publishing mutation. */
export function makeDashboardPublishAnalyticsEventFromDashboards(options: {
  previousDashboard: Dashboard.T;
  updatedDashboard: Dashboard.T;
}): DashboardPublishAnalyticsEvent {
  const { previousDashboard, updatedDashboard } = options;
  if (previousDashboard.isPublic) {
    return {
      event: "dashboard.share_settings_updated",
      payload: {
        dashboardId: updatedDashboard.id,
        slugAction: _getSlugAction({
          previousSlug: previousDashboard.slug,
          updatedSlug: updatedDashboard.slug,
        }),
      },
    };
  }

  // Dashboard config is generated as JSON, while the editor guarantees the
  // Ava Page shape before the publishing modal can be opened.
  const config = updatedDashboard.config as AvaPageGenericData;
  return {
    event: "dashboard.published",
    payload: {
      dashboardId: updatedDashboard.id,
      blockCount: config.content.length,
      hasVanitySlug: Boolean(updatedDashboard.slug),
    },
  };
}
```

- [ ] **Step 4: Run helper tests and verify green**

Run the Step 2 command.

Expected: 5 cases PASS.

- [ ] **Step 5: Write failing modal integration tests**

Create `PublishDashboardModal.test.tsx`. Mock `PublishDashboardModalContent` as one test button calling `onSubmit`. Mock dashboard client hooks so the publish function invokes captured `onSuccess` with `currentUpdatedDashboard`. Add:

```tsx
it("emits exactly one publication event", () => {
  currentUpdatedDashboard = _makeDashboard({
    isPublic: true,
    slug: "sales",
    blockCount: 2,
  });
  render(
    <PublishDashboardModal
      dashboard={_makeDashboard({
        isPublic: false,
        slug: undefined,
        blockCount: 2,
      })}
      onClose={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit publish" }));

  expect(logEventMock).toHaveBeenCalledOnce();
  expect(logEventMock).toHaveBeenCalledWith({
    event: "dashboard.published",
    workspaceId: currentUpdatedDashboard.workspaceId,
    app: "dashboards",
    payload: {
      dashboardId: currentUpdatedDashboard.id,
      blockCount: 2,
      hasVanitySlug: true,
    },
  });
});

it("emits exactly one share-update event for a public dashboard", () => {
  currentUpdatedDashboard = _makeDashboard({
    isPublic: true,
    slug: undefined,
    blockCount: 2,
  });
  render(
    <PublishDashboardModal
      dashboard={_makeDashboard({
        isPublic: true,
        slug: "sales",
        blockCount: 2,
      })}
      onClose={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit publish" }));

  expect(logEventMock).toHaveBeenCalledOnce();
  expect(logEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      event: "dashboard.share_settings_updated",
      payload: expect.objectContaining({ slugAction: "clear" }),
    }),
  );
});
```

Reset the mutable updated dashboard and mocks in `beforeEach`.

- [ ] **Step 6: Run and verify red**

```bash
pnpm test:frontend src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx
```

Expected: FAIL because both paths currently emit `dashboard.published`.

- [ ] **Step 7: Emit the classified event**

Replace the current hard-coded event:

```ts
const analyticsEvent = makeDashboardPublishAnalyticsEventFromDashboards({
  previousDashboard: currentDashboard,
  updatedDashboard,
});
void AnalyticsClient.logEvent({
  ...analyticsEvent,
  workspaceId: updatedDashboard.workspaceId,
  app: "dashboards",
});
```

Keep notification, local state, slug synchronization, and modal title behavior unchanged.

- [ ] **Step 8: Verify Task 2**

```bash
pnpm test:frontend \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx
pnpm type-check
```

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 9: Conditional commit**

If authorized:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal
git commit -m "feat(analytics): classify dashboard sharing events"
```

Otherwise skip.

---

### Task 3: Enrich chat analytics

**Files:**

- Create: `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts:95-100`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime.ts:115-180,294-349,376-405,461-474`

**Interfaces:**

- Consumes `ChatPageContext.T`, initial `ChatRuntimeMode`, SQL, generated dashboard block, and current `DashboardEditorAppState`.
- Produces `ChatAnalyticsPayloads.fromMessage`, `.fromSql`, and `.fromDashboardBlock`.

- [ ] **Step 1: Write failing payload tests**

Create `ChatAnalyticsPayloads.test.ts` with a typed editor-state fixture and:

```ts
it("describes the initially selected local route", () => {
  expect(
    ChatAnalyticsPayloads.fromMessage({
      content: "show monthly sales",
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: "dataset-1",
      }),
      selectedModelId: "offline:qwen-1.5b",
      runtimeMode: { kind: "local", localChatModelId: "qwen-1.5b" },
    }),
  ).toEqual({
    promptChars: 18,
    pageApp: "data-explorer",
    modelId: "offline:qwen-1.5b",
    runtimeMode: "local",
    hasOpenDataset: true,
  });
});

it("classifies an offered fallback as the attempted cloud route", () => {
  expect(
    ChatAnalyticsPayloads.fromMessage({
      content: "hello",
      pageContext: ChatPageContext.createOtherViewContext(),
      runtimeMode: { kind: "offer_local_fallback" },
    }),
  ).toEqual({
    promptChars: 5,
    pageApp: "other",
    runtimeMode: "cloud",
    hasOpenDataset: false,
  });
});

it("counts SQL without retaining SQL", () => {
  const payload = ChatAnalyticsPayloads.fromSql("select secret from data");
  expect(payload).toEqual({ sqlChars: 23 });
  expect(payload).not.toHaveProperty("sql");
});

it("counts a generated block without retaining prompt or SQL", () => {
  const payload = ChatAnalyticsPayloads.fromDashboardBlock({
    block: {
      kind: "DataViz",
      prompt: "show sales",
      sql: "select secret from sales",
      vizType: "bar",
    },
    pageContext: ChatPageContext.createDashboardsViewContext({
      dashboardId: "dashboard-1",
    }),
    editorState: EDITOR_STATE_WITH_TWO_BLOCKS,
  });

  expect(payload).toEqual({
    blockKind: "DataViz",
    vizType: "bar",
    dashboardId: "dashboard-1",
    blockCountAfter: 3,
  });
  expect(payload).not.toHaveProperty("sql");
  expect(payload).not.toHaveProperty("prompt");
});

it("omits block count when editor content is unavailable", () => {
  expect(
    ChatAnalyticsPayloads.fromDashboardBlock({
      block: { kind: "HeadingBlock", text: "Sales" },
      pageContext: ChatPageContext.createDashboardsViewContext({
        dashboardId: "dashboard-1",
      }),
      editorState: {
        ...EDITOR_STATE_WITH_TWO_BLOCKS,
        editorData: undefined,
      },
    }),
  ).toEqual({
    blockKind: "HeadingBlock",
    dashboardId: "dashboard-1",
  });
});
```

- [ ] **Step 2: Run and verify red**

```bash
pnpm test:frontend src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add chat payload contracts**

Add:

```ts
: K extends "dashboard.block_added_via_chat" ?
  {
    blockKind: string;
    vizType?: string;
    dashboardId?: string;
    blockCountAfter?: number;
  }
: K extends "chat.message_sent" ?
  {
    promptChars: number;
    pageApp: ChatPageContext.ChatApp;
    modelId?: string;
    runtimeMode: "cloud" | "local";
    hasOpenDataset: boolean;
  }
: K extends "chat.sql_generated" ? { sqlChars: number }
```

- [ ] **Step 4: Implement `ChatAnalyticsPayloads`**

```ts
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { AnalyticsEventPayloads } from "$/analytics/analyticsEvents/analyticsEvents";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { ChatRuntimeMode } from "$/types/offlineChat.types";

function _fromMessage(options: {
  content: string;
  pageContext: ChatPageContext.T;
  selectedModelId?: string;
  runtimeMode: ChatRuntimeMode;
}): AnalyticsEventPayloads["chat.message_sent"] {
  return {
    promptChars: options.content.length,
    pageApp: options.pageContext.app,
    ...(options.selectedModelId ? { modelId: options.selectedModelId } : {}),
    runtimeMode: options.runtimeMode.kind === "local" ? "local" : "cloud",
    hasOpenDataset: options.pageContext.openDatasetId !== undefined,
  };
}

function _fromSql(sql: string): AnalyticsEventPayloads["chat.sql_generated"] {
  return { sqlChars: sql.length };
}

function _fromDashboardBlock(options: {
  block: ChatGeneratedDashboardBlock;
  pageContext: ChatPageContext.T;
  editorState: DashboardEditorAppState;
}): AnalyticsEventPayloads["dashboard.block_added_via_chat"] {
  const dashboardId = options.pageContext.dashboardId;
  const editorData =
    dashboardId === options.editorState.activeDashboardId ?
      options.editorState.editorData
    : undefined;
  const blockCountAfter =
    editorData ? editorData.content.length + 1 : undefined;

  return {
    blockKind: options.block.kind,
    ...(options.block.kind === "DataViz" ?
      { vizType: options.block.vizType }
    : {}),
    ...(dashboardId ? { dashboardId } : {}),
    ...(blockCountAfter !== undefined ? { blockCountAfter } : {}),
  };
}

/** Privacy-safe payload builders for browser chat analytics. */
export const ChatAnalyticsPayloads = {
  fromMessage: _fromMessage,
  fromSql: _fromSql,
  fromDashboardBlock: _fromDashboardBlock,
};
```

- [ ] **Step 5: Run helper tests and verify green**

Run the Step 2 command.

Expected: 5 tests PASS.

- [ ] **Step 6: Keep current editor state in a ref**

In `useAvandarChatRuntime.ts`:

```ts
const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
const dashboardEditorState = DashboardEditorStateManager.useState();
const dashboardEditorStateRef = useRef(dashboardEditorState);
```

Set `dashboardEditorStateRef.current = dashboardEditorState` in `synchronizeChatRuntimeDependencies`, and add `dashboardEditorState` to that effect's dependencies. Do not add it to the adapter `useMemo` dependencies.

- [ ] **Step 7: Resolve the initial runtime before message emission**

After consent acknowledgements:

```ts
const initialRuntimeMode = resolveChatRuntimeMode({
  navigatorOnLine: navigator.onLine,
  selectedChatModelId: model,
});
devLogOfflineChat("useAvandarChatRuntime:mode", {
  mode: initialRuntimeMode,
  navigatorOnLine: navigator.onLine,
  selectedChatModelId: model,
  pageContext: currentPageContext,
});

if (lastUserMsg && !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content)) {
  void AnalyticsClient.logEvent({
    event: "chat.message_sent",
    workspaceId,
    app:
      currentPageContext.app === "data-explorer" ? "data_explorer"
      : currentPageContext.app === "dashboards" ? "dashboards"
      : currentPageContext.app === "data-sources" ? "data_sources"
      : undefined,
    payload: ChatAnalyticsPayloads.fromMessage({
      content: lastUserMsg.content,
      pageContext: currentPageContext,
      selectedModelId: model,
      runtimeMode: initialRuntimeMode,
    }),
  });
}
```

Remove the later duplicate resolution and use:

```ts
if (initialRuntimeMode.kind === "local") {
  return runOfflineTurn(initialRuntimeMode.localChatModelId);
}
```

Leave cloud fallback resolution unchanged and emit no second message event.

- [ ] **Step 8: Enrich SQL and block events**

SQL:

```ts
void AnalyticsClient.logEvent({
  event: "chat.sql_generated",
  workspaceId,
  app: "data_explorer",
  payload: ChatAnalyticsPayloads.fromSql(sql),
});
```

Block:

```ts
const payload = ChatAnalyticsPayloads.fromDashboardBlock({
  block,
  pageContext: currentPageContext,
  editorState: dashboardEditorStateRef.current,
});
dashboardEditorDispatch.queuePendingBlock({
  pendingId: crypto.randomUUID(),
  block: buildPendingDashboardBlock(block),
  dashboardId: currentPageContext.dashboardId,
});
void AnalyticsClient.logEvent({
  event: "dashboard.block_added_via_chat",
  workspaceId,
  app: "dashboards",
  payload,
});
```

- [ ] **Step 9: Verify Task 3**

```bash
pnpm test:frontend \
  src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts \
  src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.test.ts \
  src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts
pnpm type-check
```

Expected: focused chat tests PASS and TypeScript exits 0.

- [ ] **Step 10: Conditional commit**

If authorized:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/components/ChatPanel/useAvandarChatRuntime.ts \
  src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads
git commit -m "feat(analytics): enrich chat usage events"
```

Otherwise skip.

---

### Task 4: Instrument authenticated dashboard filters

**Files:**

- Create: `src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts:97-98`
- Modify: `src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.tsx:1-7,56-72,123-171`

**Interfaces:**

- Consumes Puck metadata from `useAvaPageMetadata(puck)`.
- Produces `dashboard.filter_changed` with dashboard, filter, mode, and clear dimensions plus top-level workspace scope.
- Emits only for `auth: "workspace"`.

- [ ] **Step 1: Write failing component tests**

Use `render` from `@/test-utils`, `DashboardFilterStateManager.Provider`, a typed fake `PuckContext`, and a mocked `AnalyticsClient.logEvent`. Test:

```tsx
it("emits a workspace select change immediately", () => {
  renderFilter({ mode: "select_single", auth: "workspace" });

  fireEvent.click(screen.getByPlaceholderText("All"));
  fireEvent.click(screen.getByRole("option", { name: "North" }));

  expect(logEventMock).toHaveBeenCalledOnce();
  expect(logEventMock).toHaveBeenCalledWith({
    event: "dashboard.filter_changed",
    workspaceId: TEST_WORKSPACE_ID,
    app: "dashboards",
    payload: {
      dashboardId: TEST_DASHBOARD_ID,
      filterId: "region-filter",
      mode: "select_single",
      wasCleared: false,
    },
  });
});

it("coalesces contains changes for 500 milliseconds", () => {
  vi.useFakeTimers();
  renderFilter({ mode: "contains", auth: "workspace" });
  const input = screen.getByPlaceholderText("Contains…");

  fireEvent.change(input, { target: { value: "n" } });
  vi.advanceTimersByTime(400);
  fireEvent.change(input, { target: { value: "no" } });
  vi.advanceTimersByTime(499);
  expect(logEventMock).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(logEventMock).toHaveBeenCalledOnce();
  expect(logEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({ wasCleared: false }),
    }),
  );
});

it("marks an empty contains value as cleared", () => {
  vi.useFakeTimers();
  renderFilter({ mode: "contains", auth: "workspace" });
  const input = screen.getByPlaceholderText("Contains…");

  fireEvent.change(input, { target: { value: "north" } });
  vi.advanceTimersByTime(500);
  logEventMock.mockClear();
  fireEvent.change(input, { target: { value: "" } });
  vi.advanceTimersByTime(500);

  expect(logEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({ wasCleared: true }),
    }),
  );
});

it("suppresses public dashboard analytics", () => {
  vi.useFakeTimers();
  renderFilter({ mode: "contains", auth: "public" });
  fireEvent.change(screen.getByPlaceholderText("Contains…"), {
    target: { value: "north" },
  });
  vi.advanceTimersByTime(500);
  expect(logEventMock).not.toHaveBeenCalled();
});

it("cancels a pending event on unmount", () => {
  vi.useFakeTimers();
  const { unmount } = renderFilter({
    mode: "contains",
    auth: "workspace",
  });
  fireEvent.change(screen.getByPlaceholderText("Contains…"), {
    target: { value: "north" },
  });
  unmount();
  vi.advanceTimersByTime(500);
  expect(logEventMock).not.toHaveBeenCalled();
});
```

Add one multi-select option test asserting `mode: "select_multi"`. Restore real timers in `afterEach`.

- [ ] **Step 2: Run and verify red**

```bash
pnpm test:frontend src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx
```

Expected: FAIL because Puck metadata and contains analytics are absent.

- [ ] **Step 3: Update the payload contract**

```ts
: K extends "dashboard.filter_changed" ?
  {
    dashboardId: string;
    filterId: string;
    mode: "select_single" | "select_multi" | "contains";
    wasCleared: boolean;
  }
```

- [ ] **Step 4: Accept Puck context and add scoped logging**

Change the signature to `WithPuckProps<Props>`, destructure `puck`, and call `useAvaPageMetadata(puck)`. Add:

```ts
const containsAnalyticsTimeoutIdRef = useRef<number | undefined>(undefined);

const logFilterChanged = (wasCleared: boolean): void => {
  if (metadata.auth !== "workspace") {
    return;
  }
  void AnalyticsClient.logEvent({
    event: "dashboard.filter_changed",
    workspaceId: metadata.workspaceId,
    app: "dashboards",
    payload: {
      dashboardId: metadata.dashboardId,
      filterId,
      mode,
      wasCleared,
    },
  });
};

const scheduleContainsAnalytics = (value: string): void => {
  if (containsAnalyticsTimeoutIdRef.current !== undefined) {
    window.clearTimeout(containsAnalyticsTimeoutIdRef.current);
  }
  containsAnalyticsTimeoutIdRef.current = window.setTimeout(() => {
    logFilterChanged(value.length === 0);
    containsAnalyticsTimeoutIdRef.current = undefined;
  }, 500);
};

useEffect(function cancelContainsAnalyticsOnUnmount() {
  return () => {
    if (containsAnalyticsTimeoutIdRef.current !== undefined) {
      window.clearTimeout(containsAnalyticsTimeoutIdRef.current);
    }
  };
}, []);
```

If hook lint requires stable callbacks, use `useCallback` with exact dependencies. Do not move analytics into filter registration.

- [ ] **Step 5: Wire user-change handlers**

After state dispatch:

```ts
// Multi-select
logFilterChanged(value.length === 0);

// Contains
scheduleContainsAnalytics(event.currentTarget.value);

// Single-select
logFilterChanged(value === null);
```

Rename current `v` and `e` callback parameters to `value` and `event`. Do not log initial registration or config changes.

- [ ] **Step 6: Verify Task 4**

```bash
pnpm test:frontend \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.test.tsx
pnpm type-check
```

Expected: focused tests PASS and TypeScript exits 0.

- [ ] **Step 7: Conditional commit**

If authorized:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock
git commit -m "feat(analytics): track dashboard filter changes"
```

Otherwise skip.

---

### Task 5: Require defined payloads

**Files:**

- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts:103-122`
- Modify: `src/lib/analytics/AnalyticsClient.test.ts:1-153`

**Interfaces:**

- Consumes all enriched call sites from Tasks 1 through 4.
- Produces a conditional event union with required object payloads and optional `undefined` payloads.

- [ ] **Step 1: Update valid analytics test fixtures**

Add:

```ts
const CHAT_MESSAGE_SENT_EVENT = {
  event: "chat.message_sent" as const,
  payload: {
    promptChars: 5,
    pageApp: "other" as const,
    runtimeMode: "cloud" as const,
    hasOpenDataset: false,
  },
};

const FILTER_CHANGED_EVENT = {
  event: "dashboard.filter_changed" as const,
  payload: {
    dashboardId: "dashboard-1",
    filterId: "filter-1",
    mode: "select_multi" as const,
    wasCleared: false,
  },
};
```

Use these fixtures in existing tests. Give `chat.sql_generated` `{ payload: { sqlChars: 8 } }`. Update warning expectations to include the message fixture.

- [ ] **Step 2: Make payloads conditionally required**

Add:

```ts
type AnalyticsEventWithPayload<K extends AnalyticsEventName> =
  AnalyticsEventPayloads[K] extends undefined ?
    { event: K; payload?: undefined }
  : { event: K; payload: AnalyticsEventPayloads[K] };
```

Replace unions:

```ts
export type ClientAnalyticsEvent = {
  [K in ClientAnalyticsEventName]: AnalyticsEventWithPayload<K>;
}[ClientAnalyticsEventName];

export type ServerAnalyticsEvent = {
  [K in ServerAnalyticsEventName]: AnalyticsEventWithPayload<K>;
}[ServerAnalyticsEventName];
```

Do not add a runtime test that restates TypeScript. Real call sites and `pnpm type-check` are the contract test.

- [ ] **Step 3: Verify Task 5**

```bash
pnpm type-check
pnpm test:frontend src/lib/analytics/AnalyticsClient.test.ts
```

Expected: TypeScript exits 0 and all 7 client tests PASS. Fix missing payloads at owning call sites rather than weakening the type.

- [ ] **Step 4: Conditional commit**

If authorized:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/lib/analytics/AnalyticsClient.test.ts
git commit -m "refactor(analytics): require defined event payloads"
```

Otherwise skip.

---

### Task 6: Final verification

**Files:**

- Review all files in the File Map.
- Do not modify database files, PDF components, generated files, or translation catalogs.

**Interfaces:**

- Consumes completed Tasks 1 through 5.
- Produces a formatted, linted, type-correct, focused-test-green diff for user review.

- [ ] **Step 1: Run the focused test set**

```bash
pnpm test:frontend \
  shared/analytics/analyticsEvents/analyticsEvents.test.ts \
  src/lib/analytics/AnalyticsClient.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.test.tsx \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx \
  src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts \
  src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.test.ts \
  src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.test.tsx
```

Expected: every listed file PASS. Do not substitute a full end-to-end run.

- [ ] **Step 2: Format and inspect**

```bash
pnpm format
git diff --stat
git diff --check
```

Expected: formatter exits 0, only scoped files change, and `git diff --check` prints nothing.

- [ ] **Step 3: Type-check and lint scoped files**

```bash
pnpm type-check
pnpm exec eslint \
  shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/lib/analytics/AnalyticsClient.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal \
  src/components/ChatPanel/useAvandarChatRuntime.ts \
  src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock
```

Expected: both commands exit 0.

- [ ] **Step 4: Run React diagnostics**

```bash
pnpm lint:react-doctor
```

Expected: no new actionable diagnostic in changed React files. Record unrelated baseline findings without modifying out-of-scope files.

- [ ] **Step 5: Scan privacy and scope**

```bash
rg -n "payload:.*(sql|prompt|filterValue|label)" \
  src/components/ChatPanel/useAvandarChatRuntime.ts \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.tsx \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts || true
git diff --name-only
git status --short --branch
```

Expected: no raw-content payload assignment, the changed files match this plan, and the branch is `feat/analytics-payloads`.

- [ ] **Step 6: Conditional final commit**

If authorized and prior commit steps were skipped:

```bash
git add shared/analytics/analyticsEvents/analyticsEvents.ts \
  src/lib/analytics/AnalyticsClient.test.ts \
  src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal \
  src/components/ChatPanel/useAvandarChatRuntime.ts \
  src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock \
  docs/superpowers/specs/2026-08-13-analytics-payload-enrichment-design.md \
  docs/superpowers/plans/2026-08-13-analytics-payload-enrichment.md
git commit -m "feat(analytics): enrich client event payloads"
```

Otherwise skip and present the uncommitted diff.
