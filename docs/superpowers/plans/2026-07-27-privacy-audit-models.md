# Privacy Audit AvaModels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone consent and clarification IndexedDB databases with two standard Dexie AvaModels, hook-enabled clients, and `AvaDexie.DB` persistence.

**Architecture:** `ConsentAuditEntry` and `ClarificationAuditEntry` become app-local `DexieCrudModelSpec` models under `src/models/privacy/`, with identity parser registries and tables registered together in `AvaDexie` v5. Clients under `src/clients/privacy/` own persistence behavior and are wrapped with `createUsableServiceClient`; imperative chat paths call promise methods while the Privacy Log consumes generated query and mutation hooks.

**Tech Stack:** TypeScript, Dexie, fake-indexeddb, Zod, Vitest, TanStack Query hooks through `withQueryHooks`, Ava CLI.

## Global Constraints

- Keep audit data local to the browser and never persist submitted values, clarification question text, or clarification answers.
- Do not migrate rows from `AvandarConsentAuditDB` or `AvandarClarificationAuditDB`.
- Preserve the existing 90-day consent retention rule and non-blocking audit failure behavior.
- Use `DexieCrudModelSpec`, identity parsers, `createDexieCrudClient`, and `createUsableServiceClient`.
- Register both models in one `AvaDexie` v5 schema.
- Do not modify Supabase schemas, migrations, generated database types, or production data.
- All new public model and client interfaces need concise JSDoc.
- Use red-green TDD for every behavior change.

---

### Task 1: Scaffold and define the two privacy audit models

**Files:**

- Create: `src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.ts`
- Create: `src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.types.ts`
- Create: `src/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers.ts`
- Create: `src/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers.test.ts`
- Create: `src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry.ts`
- Create: `src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry.types.ts`
- Create: `src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers.ts`
- Create: `src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers.test.ts`

**Interfaces:**

- Produces: `ConsentAuditEntry.T`, `ConsentAuditEntry.Id`, `ConsentAuditEntryParsers`
- Produces: `ClarificationAuditEntry.T`, `ClarificationAuditEntry.Id`, `ClarificationAuditEntryParsers`
- Both model specs use primary key `"id"` and make `Insert` equal to `Read`.

- [ ] **Step 1: Run and discard the Ava CLI exploration scaffold**

Run:

```bash
pnpm build:ava-cli
ava new model ConsentAuditEntry --models-dir privacy
ava new model ClarificationAuditEntry --models-dir privacy
```

Expected: the CLI creates basic scaffolds under
`shared/models/privacy/{ConsentAuditEntry,ClarificationAuditEntry}`.

Inspect the generated namespace and branded-ID conventions, then remove only
those newly generated exploratory directories. The final models are app-local
Dexie models under `src/models/privacy/`, so the generated shared model files
must not remain.

- [ ] **Step 2: Write failing parser tests**

Create representative complete rows in each parser test. For consent, include
array fields and nullable metadata; for clarification, include a settled
outcome and elapsed time.

```ts
import { describe, expect, it } from "vitest";
import { ConsentAuditEntryParsers } from "./ConsentAuditEntryParsers";
import type { ConsentAuditEntry } from "./ConsentAuditEntry";

const row: ConsentAuditEntry.T = {
  id: "consent-1" as ConsentAuditEntry.Id,
  workspaceId: "workspace-1",
  userId: "user-1",
  threadId: null,
  timestamp: 1_700_000_000_000,
  decision: "approved",
  context: "user_message_text",
  mode: "clean",
  detectedPii: [],
  detectedBias: [],
  sourceColumn: null,
  valueCount: 1,
  contentLengthChars: 12,
  warningShown: [],
  warningDismissed: [],
  suggestionUsed: null,
  patternLocale: "en",
  detectorVersion: "1.0.0",
  medicalTierTriggeredBy: null,
  typedConfirmationCorrect: null,
  ackTokenNonce: null,
};

describe("ConsentAuditEntryParsers", () => {
  it("round trips the Dexie row without changing it", () => {
    expect(ConsentAuditEntryParsers.fromDBReadToModelRead(row)).toEqual(row);
    expect(ConsentAuditEntryParsers.fromModelInsertToDBInsert(row)).toEqual(row);
  });
});
```

The clarification test follows the same structure with:

```ts
const row: ClarificationAuditEntry.T = {
  id: "clarification-1" as ClarificationAuditEntry.Id,
  workspaceId: "workspace-1",
  threadId: null,
  timestamp: 1_700_000_000_000,
  turnNumber: 1,
  responseShape: "free_text",
  questionLengthChars: 20,
  rationaleProvided: false,
  optionsCount: null,
  outcome: "answered",
  biasReprompts: 0,
  timeToAnswerMs: 500,
  ledToSuccessfulSql: null,
  patternLocale: "en",
};
```

- [ ] **Step 3: Run the parser tests and verify RED**

Run:

```bash
pnpm vitest run src/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers.test.ts src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers.test.ts
```

Expected: FAIL because the model and parser modules do not exist.

- [ ] **Step 4: Implement the model types and identity parsers**

Define branded IDs with `UUID<"ConsentAuditEntry">` and
`UUID<"ClarificationAuditEntry">`. Move the existing entry fields and literal
unions from the two privacy helper files into the corresponding model types.
Use this model-spec shape for each model:

```ts
export type ConsentAuditEntryModel = DexieCrudModelSpec<{
  modelName: "ConsentAuditEntry";
  primaryKey: "id";
  primaryKeyType: ConsentAuditEntryId;
  dbTypes: {
    DBRead: ConsentAuditEntryRead;
    DBUpdate: Partial<ConsentAuditEntryRead>;
  };
  modelTypes: {
    Read: ConsentAuditEntryRead;
    Update: Partial<ConsentAuditEntryRead>;
  };
}>;
```

The namespace entry file must expose only the main model entry:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
} from "./ConsentAuditEntry.types";

export namespace ConsentAuditEntry {
  export type T<K extends keyof ConsentAuditEntryModel = "Read"> =
    ConsentAuditEntryModel[K];
  export type Id = ConsentAuditEntryId;
}
```

Build each parser with `makeParserRegistry`, a complete Zod object for every
stored field, and `identity` for read, insert, and update transforms. Retain the
`ZodConsistencyTests` type assertion used by `LocalDatasetParsers`.

- [ ] **Step 5: Run the parser tests and verify GREEN**

Run:

```bash
pnpm vitest run src/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers.test.ts src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers.test.ts
```

Expected: PASS, 2 test files.

- [ ] **Step 6: Commit the model task**

```bash
git add src/models/privacy
git commit -m "feat(privacy): add audit entry AvaModels"
```

---

### Task 2: Register both audit models in AvaDexie v5

**Files:**

- Create: `src/db/dexie/dexieVersions.test.ts`
- Modify: `src/db/dexie/dexieVersions.ts`

**Interfaces:**

- Consumes: `ConsentAuditEntryModel`, `ClarificationAuditEntryModel`
- Produces: `AvaDexie.DB.ConsentAuditEntry`
- Produces: `AvaDexie.DB.ClarificationAuditEntry`
- Produces: `CURRENT_AVA_DEXIE_VERSION === "v5"`

- [ ] **Step 1: Write a failing v5 schema test**

Use `fake-indexeddb/auto`, import `AvaDexieVersionManager`, open v5, and assert
the table and index names:

```ts
import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion("v5");

afterAll(async () => {
  await db.delete();
});

describe("AvaDexie v5 privacy audit schema", () => {
  it("registers both audit models and their query indexes", async () => {
    await db.open();
    expect(CURRENT_AVA_DEXIE_VERSION).toBe("v5");
    expect(db.ConsentAuditEntry.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "workspaceId",
        "userId",
        "timestamp",
        "context",
        "decision",
      ]),
    );
    expect(
      db.ClarificationAuditEntry.schema.indexes.map(({ name }) => name),
    ).toEqual(
      expect.arrayContaining([
        "workspaceId",
        "timestamp",
        "outcome",
        "turnNumber",
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the schema test and verify RED**

Run:

```bash
pnpm vitest run src/db/dexie/dexieVersions.test.ts
```

Expected: FAIL because schema key `v5` is not registered.

- [ ] **Step 3: Add the v5 schema**

Extend `Schemas` with:

```ts
v5: {
  version: 5;
  models: [
    LocalDatasetModel,
    LocalPublicDatasetModel,
    ConsentAuditEntryModel,
    ClarificationAuditEntryModel,
  ];
};
```

Append `defineVersion<5>` with the existing v4 indexes plus:

```ts
ConsentAuditEntry: {
  primaryKey: "id",
  columnsToIndex: [
    "workspaceId",
    "userId",
    "timestamp",
    "context",
    "decision",
  ],
},
ClarificationAuditEntry: {
  primaryKey: "id",
  columnsToIndex: ["workspaceId", "timestamp", "outcome", "turnNumber"],
},
```

Use an empty upgrader and set:

```ts
export const CURRENT_AVA_DEXIE_VERSION =
  "v5" as const satisfies keyof Schemas;
```

- [ ] **Step 4: Run the schema test and verify GREEN**

Run:

```bash
pnpm vitest run src/db/dexie/dexieVersions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the schema task**

```bash
git add src/db/dexie/dexieVersions.ts src/db/dexie/dexieVersions.test.ts
git commit -m "feat(privacy): register audit models in AvaDexie"
```

---

### Task 3: Build the consent audit client and CSV utility

**Files:**

- Create: `src/clients/privacy/ConsentAuditEntryClient.ts`
- Create: `src/clients/privacy/ConsentAuditEntryClient.test.ts`
- Create: `src/clients/privacy/buildConsentAuditCsv.ts`
- Create: `src/clients/privacy/buildConsentAuditCsv.test.ts`

**Interfaces:**

- Produces: `ConsentAuditEntryClient.recordConsentDecision(input): Promise<void>`
- Produces: `ConsentAuditEntryClient.listConsentLog(options): Promise<ConsentAuditEntry.T[]>`
- Produces: `ConsentAuditEntryClient.clearConsentLog(): Promise<void>`
- Produces hooks: `useListConsentLog`, `useRecordConsentDecision`, `useClearConsentLog`
- Produces: `buildConsentAuditCsv(entries): string`

- [ ] **Step 1: Write failing client and CSV tests**

Use `fake-indexeddb/auto`, clear `AvaDexie.DB.ConsentAuditEntry` in
`beforeEach`, and use fake timers for deterministic retention tests. Cover:

- `recordConsentDecision` inserts the computed warnings and metadata.
- `listConsentLog` excludes rows older than 90 days by default.
- workspace, context, and decision filters compose.
- results are newest first.
- `clearConsentLog` deletes every consent row.
- CSV quotes arrays, commas, quotes, and newlines exactly as the old helper.

Assert that the hook methods exist without invoking React:

```ts
expect(ConsentAuditEntryClient.useListConsentLog).toBeTypeOf("function");
expect(ConsentAuditEntryClient.useRecordConsentDecision).toBeTypeOf("function");
expect(ConsentAuditEntryClient.useClearConsentLog).toBeTypeOf("function");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
pnpm vitest run src/clients/privacy/ConsentAuditEntryClient.test.ts src/clients/privacy/buildConsentAuditCsv.test.ts
```

Expected: FAIL because the client and utility do not exist.

- [ ] **Step 3: Implement the consent client**

Create the base client:

```ts
const consentAuditEntryClient = createDexieCrudClient({
  db: AvaDexie.DB,
  modelName: "ConsentAuditEntry",
  parsers: ConsentAuditEntryParsers,
  queries: ({ dbTable }) => ({
    listConsentLog: async (
      options: ConsentLogQueryOptions = {},
    ): Promise<ConsentAuditEntry.T[]> => {
      const sinceTimestamp =
        options.sinceTimestamp ??
        Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const rows = await dbTable.where("timestamp").above(sinceTimestamp)
        .reverse()
        .sortBy("timestamp");
      return rows.filter((entry) => {
        return (
          (!options.workspaceId || entry.workspaceId === options.workspaceId) &&
          (!options.context || entry.context === options.context) &&
          (!options.decision || entry.decision === options.decision)
        );
      });
    },
  }),
  mutations: ({ dbTable }) => ({
    recordConsentDecision: async (
      input: RecordConsentDecisionInput,
    ): Promise<void> => {
      const warningShown: ConsentAuditEntry.T["warningShown"] = [
        input.detectedPii.length > 0 ? ("pii" as const) : undefined,
        input.detectedBias.length > 0 ? ("bias" as const) : undefined,
        input.isMedical ? ("medical" as const) : undefined,
      ].filter(isDefined);
      try {
        await dbTable.add({
          id: uuid() as ConsentAuditEntry.Id,
          workspaceId: input.workspaceId,
          userId: input.userId,
          threadId: input.threadId ?? null,
          timestamp: Date.now(),
          decision: input.decision,
          context: input.context,
          mode: input.mode,
          detectedPii: input.detectedPii,
          detectedBias: input.detectedBias,
          sourceColumn: input.sourceColumn ?? null,
          valueCount: input.valueCount ?? 0,
          contentLengthChars: input.contentLengthChars ?? null,
          warningShown,
          warningDismissed:
            input.decision === "cancelled" ? warningShown : [],
          suggestionUsed:
            input.decision === "used_suggestion" ? true
            : warningShown.includes("bias") ? false
            : null,
          patternLocale: "en",
          detectorVersion: "1.0.0",
          medicalTierTriggeredBy: input.isMedical ? "column" : null,
          typedConfirmationCorrect: input.typedConfirmationCorrect,
          ackTokenNonce: input.ackTokenNonce ?? null,
        });
      } catch (error) {
        console.warn("[privacy] consent audit write failed:", error);
      }
    },
    clearConsentLog: async (): Promise<void> => {
      await dbTable.clear();
    },
  }),
});
```

Export it through:

```ts
export const ConsentAuditEntryClient = createUsableServiceClient(
  consentAuditEntryClient,
  {
    queryFns: ["listConsentLog"],
    mutationFns: ["recordConsentDecision", "clearConsentLog"],
  },
);
```

Catch insert errors inside `recordConsentDecision`, log the existing privacy
warning, and do not rethrow. Implement CSV output as the same pure escaping
algorithm currently in `ConsentAuditLog.consentLogToCsv`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm vitest run src/clients/privacy/ConsentAuditEntryClient.test.ts src/clients/privacy/buildConsentAuditCsv.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the consent client task**

```bash
git add src/clients/privacy/ConsentAuditEntryClient.ts src/clients/privacy/ConsentAuditEntryClient.test.ts src/clients/privacy/buildConsentAuditCsv.ts src/clients/privacy/buildConsentAuditCsv.test.ts
git commit -m "feat(privacy): add consent audit client"
```

---

### Task 4: Build the clarification audit client

**Files:**

- Create: `src/clients/privacy/ClarificationAuditEntryClient.ts`
- Create: `src/clients/privacy/ClarificationAuditEntryClient.test.ts`

**Interfaces:**

- Produces: `recordShown(options): Promise<ClarificationAuditEntry.Id>`
- Produces: `recordOutcome(options): Promise<void>`
- Produces: `listClarificationLog(workspaceId): Promise<ClarificationAuditEntry.T[]>`
- Produces hooks: `useRecordShown`, `useRecordOutcome`, `useListClarificationLog`

- [ ] **Step 1: Write failing clarification client tests**

Use `fake-indexeddb/auto`, clear the clarification table in `beforeEach`, and
use fake timers. Cover:

- fixed-option requests store their option count and response-shape label.
- discovery requests store `optionsCount: null`.
- `recordOutcome` computes elapsed time and updates the existing row.
- an outcome update without an in-memory pending entry writes
  `timeToAnswerMs: null`.
- workspace listing filters and sorts newest first.
- record and update failures do not reject the user flow.
- the three custom hook functions exist.

- [ ] **Step 2: Run the client test and verify RED**

Run:

```bash
pnpm vitest run src/clients/privacy/ClarificationAuditEntryClient.test.ts
```

Expected: FAIL because the client does not exist.

- [ ] **Step 3: Implement the clarification client**

Keep `PENDING` and `_responseShape` private to the client module. Configure
`createDexieCrudClient` with:

```ts
queries: ({ dbTable }) => ({
  listClarificationLog: async (
    workspaceId: string,
  ): Promise<ClarificationAuditEntry.T[]> => {
    const rows = await dbTable.where("workspaceId").equals(workspaceId)
      .toArray();
    return rows.sort((firstEntry, secondEntry) => {
      return secondEntry.timestamp - firstEntry.timestamp;
    });
  },
}),
mutations: ({ dbTable }) => ({
  recordShown: async (options: {
    workspaceId: string;
    threadId?: string;
    request: ChatClarifyRequest;
  }): Promise<ClarificationAuditEntry.Id> => {
    const id = uuid() as ClarificationAuditEntry.Id;
    const askedAtMs = Date.now();
    const optionsCount =
      options.request.responseShape.kind === "fixed_options" ?
        options.request.responseShape.options.length
      : null;
    PENDING.set(id, { id, askedAtMs });
    try {
      await dbTable.add({
        id,
        workspaceId: options.workspaceId,
        threadId: options.threadId ?? null,
        timestamp: askedAtMs,
        turnNumber: options.request.turnNumber,
        responseShape: _responseShape(options.request),
        questionLengthChars: options.request.question.length,
        rationaleProvided: Boolean(options.request.rationale),
        optionsCount,
        outcome: "answered",
        biasReprompts: 0,
        timeToAnswerMs: null,
        ledToSuccessfulSql: null,
        patternLocale: "en",
      });
    } catch (error) {
      console.warn("[privacy] clarification audit write failed:", error);
    }
    return id;
  },
  recordOutcome: async (options: {
    id: ClarificationAuditEntry.Id;
    outcome: ClarificationOutcome;
  }): Promise<void> => {
    const pending = PENDING.get(options.id);
    PENDING.delete(options.id);
    try {
      await dbTable.update(options.id, {
        outcome: options.outcome,
        timeToAnswerMs:
          pending ? Date.now() - pending.askedAtMs : null,
      });
    } catch (error) {
      console.warn(
        "[privacy] clarification audit outcome write failed:",
        error,
      );
    }
  },
}),
```

Wrap it with:

```ts
export const ClarificationAuditEntryClient = createUsableServiceClient(
  clarificationAuditEntryClient,
  {
    queryFns: ["listClarificationLog"],
    mutationFns: ["recordShown", "recordOutcome"],
  },
);
```

- [ ] **Step 4: Run the client test and verify GREEN**

Run:

```bash
pnpm vitest run src/clients/privacy/ClarificationAuditEntryClient.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the clarification client task**

```bash
git add src/clients/privacy/ClarificationAuditEntryClient.ts src/clients/privacy/ClarificationAuditEntryClient.test.ts
git commit -m "feat(privacy): add clarification audit client"
```

---

### Task 5: Replace direct audit-log database usage

**Files:**

- Modify: `src/components/privacy/privacy-helpers/crossBoundary.tsx`
- Modify: `src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.tsx`
- Modify: every existing `ClarificationAuditLog.recordShown` call site found by `rg`
- Modify: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`
- Test: existing focused tests for the modified components

**Interfaces:**

- Consumes the two client promise APIs in imperative chat paths.
- Consumes `useListConsentLog`, `useClearConsentLog`, and
  `useListClarificationLog` in the Privacy Log.

- [ ] **Step 1: Write failing integration assertions**

Update or add the narrowest component tests so they mock the clients rather than
the old modules. For the Privacy Log, assert:

- the consent list hook receives `{ workspaceId }`.
- the clarification list hook receives the current workspace id.
- confirming clear invokes the clear mutation.
- CSV download passes the hook-provided consent entries to
  `buildConsentAuditCsv`.

For `PendingClarificationBlock`, assert answer and cancellation paths call
`ClarificationAuditEntryClient.recordOutcome` with the audit id.

- [ ] **Step 2: Run the focused component tests and verify RED**

Run each relevant file individually:

```bash
pnpm vitest run src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx
pnpm vitest run src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx
```

Expected: FAIL because the components still import the old audit-log modules.
If either test file does not exist, create it with only the assertions above.

- [ ] **Step 3: Replace imports and manual loading**

Use client model namespaces for types:

```ts
import { ConsentAuditEntryClient } from "@/clients/privacy/ConsentAuditEntryClient";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient";
import { buildConsentAuditCsv } from "@/clients/privacy/buildConsentAuditCsv";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
```

Replace `useEffect` and local entry loading with:

```ts
const [entries = [], isLoading] =
  ConsentAuditEntryClient.useListConsentLog({
    workspaceId: workspace.id,
  });
```

Use the corresponding clarification hook with the singleton primitive argument:

```ts
const [entries = [], isLoading] =
  ClarificationAuditEntryClient.useListClarificationLog({
    arg: workspace.id,
  });
```

Configure the clear mutation to invalidate the active consent query:

```ts
const [clearConsentLog] =
  ConsentAuditEntryClient.useClearConsentLog({
    queryToInvalidate:
      ConsentAuditEntryClient.queryKeys.listConsentLog({
        workspaceId: workspace.id,
      }),
  });
```

Replace `ConsentAuditLog.recordConsentDecision` in `crossBoundary.tsx` with
`ConsentAuditEntryClient.recordConsentDecision`. Replace every
`ClarificationAuditLog.recordShown` and `.recordOutcome` call with the matching
`ClarificationAuditEntryClient` method. Replace imported entry and union types
with the model namespaces. Keep the same arguments, await behavior, and
translated UI copy.

- [ ] **Step 4: Run the focused component tests and verify GREEN**

Run:

```bash
pnpm vitest run src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx
pnpm vitest run src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the call-site task**

```bash
git add src/components/privacy/privacy-helpers/crossBoundary.tsx src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.tsx src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx
git add src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx
git commit -m "refactor(privacy): consume audit clients"
```

---

### Task 6: Remove legacy databases and verify the complete refactor

**Files:**

- Delete: `src/components/privacy/privacy-helpers/ConsentAuditLog.ts`
- Delete: `src/components/privacy/privacy-helpers/ClarificationAuditLog.ts`
- Modify: `.difit/refactor-g3/ai-chat-panel_explanations.md`

**Interfaces:**

- No imports of either legacy module remain.
- No standalone `AvandarConsentAuditDB` or `AvandarClarificationAuditDB`
  database remains.

- [ ] **Step 1: Prove the legacy modules are still referenced before deletion**

Run:

```bash
rg -n "ConsentAuditLog|ClarificationAuditLog|AvandarConsentAuditDB|AvandarClarificationAuditDB" src
```

Expected before the final call-site cleanup: matches identify any remaining
legacy imports or class declarations. Replace remaining call sites before
deleting the files.

- [ ] **Step 2: Delete the legacy modules**

Delete only the two helper files after `rg` shows no consumers outside those
files. Append concise `ARCHITECTURE` and `REFACTOR` entries to the branch
explanations log for the models, clients, v5 schema, hook integration, and
legacy database removal.

- [ ] **Step 3: Run the focused regression suite**

Run:

```bash
pnpm vitest run \
  src/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers.test.ts \
  src/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers.test.ts \
  src/db/dexie/dexieVersions.test.ts \
  src/clients/privacy/ConsentAuditEntryClient.test.ts \
  src/clients/privacy/ClarificationAuditEntryClient.test.ts \
  src/clients/privacy/buildConsentAuditCsv.test.ts \
  src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx \
  src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx
```

Expected: all focused tests PASS with zero failures.

- [ ] **Step 4: Run static verification**

Run:

```bash
pnpm type-check
pnpm eslint \
  src/models/privacy \
  src/clients/privacy \
  src/db/dexie/dexieVersions.ts \
  src/components/privacy/privacy-helpers/crossBoundary.tsx \
  src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.tsx \
  src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx
```

Expected: both commands exit 0.

- [ ] **Step 5: Verify scope and legacy removal**

Run:

```bash
rg -n "AvandarConsentAuditDB|AvandarClarificationAuditDB|from .*ConsentAuditLog|from .*ClarificationAuditLog" src
git diff --check
git status --short
```

Expected: `rg` returns no matches, `git diff --check` exits 0, and only the
intended task files are modified.

- [ ] **Step 6: Commit the final cleanup**

```bash
git add src/components/privacy/privacy-helpers/ConsentAuditLog.ts src/components/privacy/privacy-helpers/ClarificationAuditLog.ts
git commit -m "refactor(privacy): remove standalone audit databases"
```

- [ ] **Step 7: Refresh review artifacts and reply**

Regenerate the `develop` diff guide so every newly added model, client, test,
and plan file appears in the markdown guide, structured guide, and reviewed
state. Post a terse `Done.` reply to both open reviewer comments at their exact
file paths and positions.
