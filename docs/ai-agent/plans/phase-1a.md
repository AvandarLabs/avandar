# Phase 1A: Page-Agnostic Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The data agent answers chat on every page (except the case
designer), always knows what is on screen, and shows results outside the
Data Explorer in the chat instead of moving the user.

**Architecture:** One Pi agent per conversation, as today. Each turn's
message starts with a `<current_page>` block built by shared code from an
`AgentPageContext`, so the cached system prompt never changes between pages
(D35). The browser host reads the current turn through a ref and sends a
query's result to the Data Explorer when the user is on it, or into the
chat as an assistant-ui `data` part that re-runs in DuckDB-Wasm when shown
(D36). The proxy serves prompt `data-agent-v2` beside `v1`.

**Tech Stack:** TypeScript, React 19, Mantine 9, assistant-ui 0.14
(`data` message parts), Pi 1.5.0, TanStack Query and Router, Vitest,
Playwright, the eval in `scripts/ai-eval`.

**Spec:** [../specs/phase-1a.md](../specs/phase-1a.md). Rules R1 to R3 in
[../specs/phase-1.md](../specs/phase-1.md).

---

## Before you start

- Work in `~/src/worktrees/avandar/feat/agent-default` (branch
  `feat/agent-default`, based on `demo/measles`). Never push or merge.
- Read `CLAUDE.md`, `docs/rules/typescript.md`, `docs/rules/testing.md`,
  and `docs/ai-agent/HANDOFF.md` ("Lessons that cost time").
- Formatting: `pnpm exec oxfmt --ignore-path .oxfmtignore <files>`, then
  `pnpm exec eslint --fix <files>`. ESLint wants 80-character lines and
  block-bodied arrow functions. Functions stay at 45 lines or fewer.
- Files under `shared/` import each other with a `.ts` extension and must
  not import anything from `src/` (they run in Deno too).
- Run a single test file with `pnpm vitest run <path>`.
- Every user-facing string goes through Lingui (`t`, `msg`, `<Trans>`).
  Model-facing text (the page block, prompts) is never translated.
- No database command runs in this plan until Task 15. Task 15 starts
  with `ava supabase status` and `ava supabase switch`.

## Decisions made while planning (fold into the spec in Task 17)

| Spec said | Plan does | Why |
|---|---|---|
| An open case: its name and case type name | The case type name only, plus "one case is open" | A case's name is usually a person's name, which is personal data. Phase 3.5 sends personal data only with consent. |
| Visible dashboard tiles | Tiles on the open dashboard, in page order, at most 12 | The editor has no viewport tracking; page order is what the user scrolls through. |
| Page block on every turn | The full block when the page changed since the last turn, otherwise one "unchanged" line | Keeps a long conversation on one page from paying for the same tiles every turn. |
| Result part stores dataset ids | Stores SQL, chart type, title, and display only | Nothing reads the ids: an unrunnable query already shows as unavailable. |
| `DataAgentHost` renamed `AgentHost`; `createBrowserAgentHost` | Names kept; `createBrowserDataAgentHost` takes `showQuery`; routing lives in `createConversationAgentHost` | Renaming touches the eval and offline agent for no behavior change. |
| `run_query`'s description changes | Unchanged | It never mentioned the Data Explorer. Only the system prompt changes. |
| Explorer SQL sent as today | Also cut at 1,500 characters | Same cap as tiles, bounding the uncached block. |

## File structure

Created:

| File | Responsibility |
|---|---|
| `shared/agent/pageContext/AgentPageContext.ts` | The `AgentPageContext` type and its constants. |
| `shared/agent/pageContext/buildAgentPageContextBlock.ts` | Renders the `<current_page>` block. |
| `shared/agent/pageContext/buildAgentTurnText.ts` | Prefixes a message with the block, or the "unchanged" line. |
| `shared/agent/pageContext/*.test.ts` | Tests for the two builders. |
| `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute.ts` | Pathname to app and ids. |
| `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles.ts` | Puck data to tiles. |
| `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext.ts` | Builds the context from page state and loaders. |
| `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader.ts` | Loads dashboard, map, and case type names with the user's session. |
| `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult.ts` | The stored result: create, parse, to a `data` part. |
| `src/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView.ts` | Runs the stored SQL and builds the chart config. |
| `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.tsx` | The embed card and inline chip. |
| `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css` | Card body sizing. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat.ts` | Runs a query for the chat destination. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts` | Per-conversation host that reads the current turn. |
| `scripts/ai-eval/covid/covidPageQuestions.ts` | P01 to P06. |
| `tests/e2e/agent-chat-result.spec.ts` | Mocked-proxy browser spec. |

Modified (main ones): `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`,
`shared/agent/dataAgent/dataAgentTools.ts`,
`shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`,
`supabase/functions/chat/PostAgentStream/{PostAgentStream,buildDataAgentProxyContext}.ts`,
`src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`,
`src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts`,
`src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`,
`.../runDataAgentTurn/runDataAgentTurn.ts`,
`.../runOfflineDataAgentTurn/runOfflineDataAgentTurn.ts`,
`.../createChatModelAdapter/createChatModelAdapter.ts`,
`src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts`,
`src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx`,
`src/components/RichText/Gadget/GadgetCard/GadgetCardHeader.tsx`,
`shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`,
`scripts/ai-eval/{EvalQuestion,runEval}.ts`, both harnesses.

Outside `src/components/ChatPanel` and the agent folders, this plan touches
`GadgetCardHeader.tsx` (its `definition` prop narrows to the fields it
reads, so the result card can reuse it) and `AnalyticsEvents.types.ts`
(a `chat_result` query surface). Report both in the final summary, per
`CLAUDE.md`'s scope rule.

---

### Task 1: Map table names back to aliases

The Data Explorer and dashboard tiles hold SQL with real DuckDB table names.
The model only knows `t0`, `t1`, ... so the page block must show aliases.

**Files:**
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- Test: `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`

- [ ] **Step 1: Write the failing test.** Append to the existing
  `describe` in `SqlTableAlias.test.ts` (it already imports
  `SqlTableAlias`):

```ts
  it("rewrites table names back to aliases, quoted or not", () => {
    const aliases = SqlTableAlias.fromDatasets([
      { id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", name: "a.csv" },
      { id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb", name: "b.csv" },
    ]);
    const original = 'SELECT * FROM "t0" JOIN t1 USING ("id")';
    const resolved = SqlTableAlias.applyToSql(original, aliases);

    expect(SqlTableAlias.toAliasedSql(resolved, aliases)).toBe(
      'SELECT * FROM "t0" JOIN "t1" USING ("id")',
    );
  });

  it("leaves SQL that already uses aliases unchanged", () => {
    const aliases = SqlTableAlias.fromDatasets([
      { id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", name: "a.csv" },
    ]);

    expect(SqlTableAlias.toAliasedSql('SELECT 1 FROM "t0"', aliases)).toBe(
      'SELECT 1 FROM "t0"',
    );
  });
```

- [ ] **Step 2: Run it and see it fail.**
  Run: `pnpm vitest run shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
  Expected: FAIL, `SqlTableAlias.toAliasedSql is not a function`.

- [ ] **Step 3: Implement.** In `SqlTableAliasModule.ts`, add after
  `_applyToSql`:

```ts
function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _toAliasedSql(
  sql: string,
  aliases: readonly SqlTableAliasT[],
): string {
  const longestFirst = [...aliases].sort((left, right) => {
    return right.tableName.length - left.tableName.length;
  });
  return longestFirst.reduce((current, entry) => {
    const name = _escapeRegExp(entry.tableName);
    const quoted = new RegExp(`"${name}"`, "g");
    const unquoted = new RegExp(`(?<![\\w"])${name}(?![\\w"])`, "g");
    return current
      .replace(quoted, `"${entry.alias}"`)
      .replace(unquoted, `"${entry.alias}"`);
  }, sql);
}
```

  And register it in `SqlTableAliasModule`, after `applyToSql`:

```ts
  /** Rewrites DuckDB table names back to quoted aliases, for prompts. */
  toAliasedSql: _toAliasedSql,
```

- [ ] **Step 4: Run it and see it pass.** Same command. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add shared/models/chat/SqlTableAlias
git commit -m "feat(ai-agent): map DuckDB table names back to prompt aliases"
```

---

### Task 2: The page context and its block

**Files:**
- Create: `shared/agent/pageContext/AgentPageContext.ts`
- Create: `shared/agent/pageContext/buildAgentPageContextBlock.ts`
- Create: `shared/agent/pageContext/buildAgentTurnText.ts`
- Test: `shared/agent/pageContext/buildAgentPageContextBlock.test.ts`
- Test: `shared/agent/pageContext/buildAgentTurnText.test.ts`

- [ ] **Step 1: Create the type** (no test; it is only types and
  constants):

```ts
/**
 * Where the user is in the app, as the agent sees it. `case-manager` is the
 * case designer, which still uses today's chat; it is listed so a route
 * always maps to something.
 */
export type AgentPageApp =
  | "data-explorer"
  | "dashboards"
  | "dashboard"
  | "dataset"
  | "data-sources"
  | "map"
  | "case-type"
  | "case"
  | "case-manager"
  | "other";

/** A chart on the open dashboard. */
export type AgentPageTile = {
  title: string;
  chartType: string;
  /** The tile's SQL with DuckDB table names, as stored. */
  sql: string;
};

/**
 * What is on screen when the user sends a message. Holds metadata only:
 * names, SQL the user's page already shows, column names and types. Never
 * rows, and never a case's own details.
 */
export type AgentPageContext = {
  app: AgentPageApp;
  dataset?: { id: string; name: string };
  explorer?: {
    sql?: string;
    resultColumns: ReadonlyArray<{ name: string; dataType: string }>;
  };
  dashboard?: { id: string; name: string; tiles: readonly AgentPageTile[] };
  map?: { id: string; name: string };
  caseType?: { id: string; name: string };
};

/** Tiles listed in the block; the rest are counted. */
export const MAX_PAGE_TILES = 12;

/** Characters of any one SQL statement shown in the block. */
export const MAX_PAGE_SQL_CHARACTERS = 1_500;
```

- [ ] **Step 2: Write the failing block tests.**

```ts
import { describe, expect, it } from "vitest";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import { MAX_PAGE_SQL_CHARACTERS } from "./AgentPageContext.ts";
import { buildAgentPageContextBlock } from "./buildAgentPageContextBlock.ts";
import type { AgentPageContext } from "./AgentPageContext.ts";

const ALIASES = SqlTableAlias.fromDatasets([
  { id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", name: "deaths.csv" },
]);
const TABLE = ALIASES[0]!.tableName;

function _block(context: AgentPageContext): string {
  return buildAgentPageContextBlock({ context, aliases: ALIASES });
}

describe("buildAgentPageContextBlock", () => {
  it("names the open dataset by alias and shows the explorer query", () => {
    const block = _block({
      app: "data-explorer",
      dataset: { id: ALIASES[0]!.datasetId, name: "deaths.csv" },
      explorer: {
        sql: `SELECT "state" FROM "${TABLE}"`,
        resultColumns: [{ name: "state", dataType: "varchar" }],
      },
    } as AgentPageContext);

    expect(block).toBe(
      [
        "<current_page>",
        "Page: Data Explorer",
        'Open dataset: t0 = "deaths.csv"',
        'Query on screen: SELECT "state" FROM "t0"',
        "Result columns: state varchar",
        "</current_page>",
      ].join("\n"),
    );
  });

  it("lists at most 12 dashboard charts and counts the rest", () => {
    const tiles = Array.from({ length: 14 }, (_, index) => {
      return {
        title: `Chart ${index + 1}`,
        chartType: "bar",
        sql: `SELECT ${index} FROM "${TABLE}"`,
      };
    });
    const block = _block({
      app: "dashboard",
      dashboard: { id: "d1", name: "Measles 2026", tiles },
    });

    expect(block).toContain('Dashboard: "Measles 2026"');
    expect(block).toContain('1. "Chart 1" (bar): SELECT 0 FROM "t0"');
    expect(block).toContain('12. "Chart 12" (bar)');
    expect(block).not.toContain("Chart 13");
    expect(block).toContain("2 more charts not listed");
  });

  it("cuts long SQL", () => {
    const sql = `SELECT ${"x, ".repeat(1_000)}1 FROM "${TABLE}"`;
    const block = _block({
      app: "data-explorer",
      explorer: { sql, resultColumns: [] },
    });
    const queryLine = block.split("\n").find((line) => {
      return line.startsWith("Query on screen: ");
    })!;

    expect(queryLine.length).toBeLessThanOrEqual(
      "Query on screen: ".length + MAX_PAGE_SQL_CHARACTERS + 4,
    );
    expect(queryLine.endsWith(" ...")).toBe(true);
  });

  it("names a case's type and never the case", () => {
    const block = _block({
      app: "case",
      caseType: { id: "c1", name: "Measles case" },
    });

    expect(block).toContain('Case type: "Measles case"');
    expect(block).toContain("One case is open; its details are not shared.");
  });

  it("names only the page when there is nothing else", () => {
    expect(_block({ app: "other" })).toBe(
      "<current_page>\nPage: Other\n</current_page>",
    );
  });
});
```

- [ ] **Step 3: Run and see them fail.**
  Run: `pnpm vitest run shared/agent/pageContext/buildAgentPageContextBlock.test.ts`
  Expected: FAIL, cannot find module `./buildAgentPageContextBlock.ts`.

- [ ] **Step 4: Implement the block builder.**

```ts
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import {
  MAX_PAGE_SQL_CHARACTERS,
  MAX_PAGE_TILES,
} from "./AgentPageContext.ts";
import type {
  AgentPageApp,
  AgentPageContext,
  AgentPageTile,
} from "./AgentPageContext.ts";

const APP_LABELS: Record<AgentPageApp, string> = {
  "data-explorer": "Data Explorer",
  dashboards: "Dashboard list",
  dashboard: "Dashboard",
  dataset: "Dataset",
  "data-sources": "Data sources",
  map: "Map",
  "case-type": "Case type",
  case: "Case",
  "case-manager": "Case designer",
  other: "Other",
};

type Aliases = readonly SqlTableAlias.T[];

function _formatSql(sql: string, aliases: Aliases): string {
  const aliased = SqlTableAlias.toAliasedSql(sql.trim(), aliases);
  return aliased.length > MAX_PAGE_SQL_CHARACTERS
    ? `${aliased.slice(0, MAX_PAGE_SQL_CHARACTERS)} ...`
    : aliased;
}

function _datasetLine(
  dataset: NonNullable<AgentPageContext["dataset"]>,
  aliases: Aliases,
): string {
  const entry = aliases.find((candidate) => {
    return candidate.kind === "dataset" && candidate.datasetId === dataset.id;
  });
  return entry
    ? `Open dataset: ${entry.alias} = "${dataset.name}"`
    : `Open dataset: "${dataset.name}"`;
}

function _explorerLines(
  explorer: NonNullable<AgentPageContext["explorer"]>,
  aliases: Aliases,
): string[] {
  const columns = explorer.resultColumns.map((column) => {
    return `${column.name} ${column.dataType}`;
  });
  return [
    ...(explorer.sql ? [`Query on screen: ${_formatSql(explorer.sql, aliases)}`] : []),
    ...(columns.length > 0 ? [`Result columns: ${columns.join(", ")}`] : []),
  ];
}

function _tileLine(tile: AgentPageTile, index: number, aliases: Aliases): string {
  return `${index + 1}. "${tile.title}" (${tile.chartType}): ${_formatSql(tile.sql, aliases)}`;
}

function _dashboardLines(
  dashboard: NonNullable<AgentPageContext["dashboard"]>,
  aliases: Aliases,
): string[] {
  const listed = dashboard.tiles.slice(0, MAX_PAGE_TILES);
  const hiddenCount = dashboard.tiles.length - listed.length;
  return [
    `Dashboard: "${dashboard.name}"`,
    ...(listed.length > 0 ? ["Charts on this dashboard:"] : []),
    ...listed.map((tile, index) => {
      return _tileLine(tile, index, aliases);
    }),
    ...(hiddenCount > 0 ? [`${hiddenCount} more charts not listed.`] : []),
  ];
}

function _caseTypeLines(context: AgentPageContext): string[] {
  if (!context.caseType) {
    return [];
  }
  return [
    `Case type: "${context.caseType.name}"`,
    ...(context.app === "case"
      ? ["One case is open; its details are not shared."]
      : []),
  ];
}

/**
 * The block that starts each agent turn's message: what the user has on
 * screen, so "this dataset" or "this chart" resolves. SQL shows prompt
 * aliases (`t0`), never DuckDB table names. Shared by the browser and the
 * eval, so both send the same text.
 */
export function buildAgentPageContextBlock(
  options: Readonly<{ context: AgentPageContext; aliases: Aliases }>,
): string {
  const { context, aliases } = options;
  const lines = [
    `Page: ${APP_LABELS[context.app]}`,
    ...(context.dataset ? [_datasetLine(context.dataset, aliases)] : []),
    ...(context.explorer ? _explorerLines(context.explorer, aliases) : []),
    ...(context.dashboard ? _dashboardLines(context.dashboard, aliases) : []),
    ...(context.map ? [`Map: "${context.map.name}"`] : []),
    ..._caseTypeLines(context),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
}
```

  Run oxfmt and `eslint --fix` on the file: the long template lines above
  will be wrapped for you.

- [ ] **Step 5: Run and see them pass.** Same command. Expected: PASS.

- [ ] **Step 6: Write the failing turn-text test.**

```ts
import { describe, expect, it } from "vitest";
import {
  buildAgentTurnText,
  PAGE_UNCHANGED_BLOCK,
} from "./buildAgentTurnText.ts";

const BLOCK = "<current_page>\nPage: Map\n</current_page>";

describe("buildAgentTurnText", () => {
  it("puts the page block before the message", () => {
    expect(
      buildAgentTurnText({ message: "How many cases?", pageBlock: BLOCK }),
    ).toBe(`${BLOCK}\n\nHow many cases?`);
  });

  it("says the page is unchanged instead of repeating the block", () => {
    expect(
      buildAgentTurnText({
        message: "And deaths?",
        pageBlock: BLOCK,
        previousPageBlock: BLOCK,
      }),
    ).toBe(`${PAGE_UNCHANGED_BLOCK}\n\nAnd deaths?`);
  });

  it("sends the message alone when there is no page block", () => {
    expect(buildAgentTurnText({ message: "Hi" })).toBe("Hi");
  });
});
```

- [ ] **Step 7: Run and see it fail.**
  Run: `pnpm vitest run shared/agent/pageContext/buildAgentTurnText.test.ts`
  Expected: FAIL, cannot find module.

- [ ] **Step 8: Implement.**

```ts
/** Sent instead of a page block identical to the previous turn's. */
export const PAGE_UNCHANGED_BLOCK =
  "<current_page>Unchanged since the last message.</current_page>";

/**
 * The text of one agent turn: the page block, then the user's message. A
 * block identical to the previous turn's becomes one short line, so a long
 * conversation on one page does not resend the same charts every turn.
 */
export function buildAgentTurnText(
  options: Readonly<{
    message: string;
    pageBlock?: string;
    previousPageBlock?: string;
  }>,
): string {
  const { message, pageBlock, previousPageBlock } = options;
  if (pageBlock === undefined) {
    return message;
  }
  const block =
    pageBlock === previousPageBlock ? PAGE_UNCHANGED_BLOCK : pageBlock;
  return `${block}\n\n${message}`;
}
```

- [ ] **Step 9: Run both test files and see them pass.**

- [ ] **Step 10: Commit.**

```bash
git add shared/agent/pageContext
git commit -m "feat(ai-agent): describe the current page at the start of each turn"
```

---

### Task 3: Prompt version 2

**Files:**
- Modify: `shared/agent/dataAgent/dataAgentTools.ts`
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`
- Modify: `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`
- Test: `shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to the existing
  `describe` in `buildDataAgentSystemPrompt.test.ts` (it uses the file's
  existing `DATASETS` fixture):

```ts
  it("keeps v1's text exactly for tabs opened before the deploy", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });

    expect(prompt.startsWith(
      "You are Avandar's data assistant in the Data Explorer.",
    )).toBe(true);
    expect(prompt).not.toContain("CURRENT PAGE");
  });

  it("tells v2 how to read the current page block", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });

    expect(prompt.startsWith("You are Avandar's data assistant.")).toBe(true);
    expect(prompt).toContain("CURRENT PAGE");
    expect(prompt).toContain("<current_page>");
  });
```

- [ ] **Step 2: Run and see them fail** (`promptId` is not accepted, and
  v2 text is missing).
  Run: `pnpm vitest run shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts`

- [ ] **Step 3: Add the prompt ids.** In `dataAgentTools.ts`, replace the
  `DATA_AGENT_PROMPT_ID` constant and its docstring with:

```ts
/**
 * Every prompt version the agent proxy serves. A tab opened before a deploy
 * keeps naming the version it loaded, so older versions stay served until
 * no open tab can still use them.
 */
export const DATA_AGENT_PROMPT_IDS = [
  "data-agent-v1",
  "data-agent-v2",
] as const;

/** One served prompt version. */
export type DataAgentPromptId = (typeof DATA_AGENT_PROMPT_IDS)[number];

/**
 * The version of the data agent's prompt and tools this build uses. The
 * browser names it in the proxy URL. v2 adds the current page block.
 */
export const DATA_AGENT_PROMPT_ID: DataAgentPromptId = "data-agent-v2";

/** Whether the proxy serves a prompt version. */
export function isDataAgentPromptId(value: string): value is DataAgentPromptId {
  return (DATA_AGENT_PROMPT_IDS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Add v2's instructions.** In
  `buildDataAgentSystemPrompt.ts`:
  1. Rename the constant `DATA_AGENT_INSTRUCTIONS` to
     `DATA_AGENT_INSTRUCTIONS_V1` without changing its text.
  2. Below it add:

```ts
const V1_OPENING = "You are Avandar's data assistant in the Data Explorer.";

const CURRENT_PAGE_RULES = `

CURRENT PAGE
- A user message can start with <current_page>...</current_page>: what the user has on screen. "This", "here", "this dataset", and "this chart" mean what it lists. "Unchanged since the last message" means the last block still holds.
- To change a chart listed there, start from its SQL. When "this" could mean several listed charts and the user named none, ask_user with their titles as options.
- A question that does not refer to the page is answered from DATASETS as usual. Never mention the block to the user.`;

/**
 * v2: the agent answers on every page. Same rules as v1, a page-neutral
 * opening, and how to read the current page block.
 */
const DATA_AGENT_INSTRUCTIONS_V2 =
  DATA_AGENT_INSTRUCTIONS_V1.replace(
    V1_OPENING,
    "You are Avandar's data assistant. You answer from any page of the app.",
  ) + CURRENT_PAGE_RULES;

const INSTRUCTIONS_BY_PROMPT_ID: Record<DataAgentPromptId, string> = {
  "data-agent-v1": DATA_AGENT_INSTRUCTIONS_V1,
  "data-agent-v2": DATA_AGENT_INSTRUCTIONS_V2,
};
```

  3. Import the type at the top:
     `import type { DataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";`
  4. Change `buildDataAgentSystemPrompt`'s options to
     `Readonly<{ datasets: readonly DataAgentDataset[]; today: string; promptId: DataAgentPromptId }>`
     and its return to start with
     `${INSTRUCTIONS_BY_PROMPT_ID[options.promptId]}` instead of
     `${DATA_AGENT_INSTRUCTIONS}`. Update its docstring: "Builds the
     system prompt for one prompt version: ...".

- [ ] **Step 5: Fix the callers the compiler now reports.**
  - `createDataAgent.ts`: add to `CreateDataAgentOptions`:

```ts
  /**
   * The prompt version, which must match what the proxy serves for it.
   * Defaults to `DATA_AGENT_PROMPT_ID`.
   */
  promptId?: DataAgentPromptId;
```

    and in `_createAgent` pass
    `promptId: options.promptId ?? DATA_AGENT_PROMPT_ID` to
    `buildDataAgentSystemPrompt`. Import both from
    `$/agent/dataAgent/dataAgentTools`.
  - Existing tests calling `buildDataAgentSystemPrompt` without
    `promptId` (`buildDataAgentSystemPrompt.test.ts`,
    `buildDataAgentProxyContext.test.ts`): add
    `promptId: "data-agent-v1"` to the calls that check v1 behavior.
  - Run `pnpm exec tsc -b --noEmit` and fix any other call site the same
    way.

- [ ] **Step 6: Run the tests and see them pass.**
  Run: `pnpm vitest run shared/agent src/lib/agent`

- [ ] **Step 7: Commit.**

```bash
git add shared/agent src/lib/agent supabase/functions/chat/PostAgentStream
git commit -m "feat(ai-agent): add prompt v2 that reads the current page block"
```

---

### Task 4: The proxy serves both versions

**Files:**
- Modify: `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.ts`
- Modify: `supabase/functions/chat/PostAgentStream/PostAgentStream.ts`
- Test: `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts`

- [ ] **Step 1: Write the failing test.** Append inside the existing
  `describe`:

```ts
  it("builds the prompt for the version the path names", () => {
    const options = {
      clientMessages: [USER],
      datasets: DATASETS,
      today: "2026-11-08",
    };

    const v1 = buildDataAgentProxyContext({
      ...options,
      promptId: "data-agent-v1",
    });
    const v2 = buildDataAgentProxyContext({
      ...options,
      promptId: "data-agent-v2",
    });

    expect(v1.systemPrompt).not.toContain("CURRENT PAGE");
    expect(v2.systemPrompt).toContain("CURRENT PAGE");
  });
```

- [ ] **Step 2: Run and see it fail.**
  Run: `pnpm vitest run supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts`

- [ ] **Step 3: Implement.** In `buildDataAgentProxyContext.ts`, add
  `promptId: DataAgentPromptId;` to the options type, pass
  `promptId: options.promptId` into `buildDataAgentSystemPrompt`, and
  import the type from `$/agent/dataAgent/dataAgentTools.ts`. Add
  `promptId: "data-agent-v1"` to the other calls in the test file.

  In `PostAgentStream.ts`:

```ts
import { isDataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";
```

  replacing the `DATA_AGENT_PROMPT_ID` import, and:

```ts
    const { promptId } = pathParams;
    if (!isDataAgentPromptId(promptId)) {
      throw new AvaHTTPError(
        `Unknown agent prompt "${promptId}". Reload the page.`,
        BAD_REQUEST,
      );
    }
```

  then pass `promptId` into `buildDataAgentProxyContext`. Update the route
  docstring: "the path names the prompt version (every version in
  `DATA_AGENT_PROMPT_IDS` is served)".

- [ ] **Step 4: Run the test and the Deno type check.**
  Run: `pnpm vitest run supabase/functions/chat/PostAgentStream && pnpm type-check:deno`
  Expected: PASS, and `deno check` reports no errors.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/chat/PostAgentStream
git commit -m "feat(ai-agent): serve data agent prompts v1 and v2 from the proxy"
```

---

### Task 5: Read the page from the route and the dashboard

**Files:**
- Create: `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles.ts`
- Test: `.../agentPageContext/parseAgentPageRoute.test.ts`
- Test: `.../agentPageContext/extractDashboardTiles.test.ts`

- [ ] **Step 1: Write the failing route tests.**

```ts
import { describe, expect, it } from "vitest";
import { parseAgentPageRoute } from "./parseAgentPageRoute";

const ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const CHILD_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

describe("parseAgentPageRoute", () => {
  it.each([
    ["/acme/data-explorer", { app: "data-explorer" }],
    [`/acme/dashboards/edit/${ID}`, { app: "dashboard", id: ID }],
    [`/acme/dashboards/preview/${ID}`, { app: "dashboard", id: ID }],
    [`/acme/d/${ID}`, { app: "dashboard", id: ID }],
    ["/acme/dashboards", { app: "dashboards" }],
    [`/acme/data-manager/${ID}`, { app: "dataset", id: ID }],
    ["/acme/data-manager/data-import", { app: "data-sources" }],
    ["/acme/data-manager", { app: "data-sources" }],
    [`/acme/map/${ID}`, { app: "map", id: ID }],
    [`/acme/individual-manager/${ID}`, { app: "case-type", id: ID }],
    [
      `/acme/individual-manager/${ID}/${CHILD_ID}`,
      { app: "case", id: CHILD_ID, parentId: ID },
    ],
    ["/acme/ontology-designer", { app: "case-manager" }],
    ["/acme/settings", { app: "other" }],
  ])("reads %s", (pathname, expected) => {
    expect(parseAgentPageRoute(pathname)).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run and see them fail.**
  Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/agentPageContext`

- [ ] **Step 3: Implement the route parser.**

```ts
import type { AgentPageApp } from "$/agent/pageContext/AgentPageContext";

/** The page a pathname shows, and the ids in it. */
export type AgentPageRoute = {
  app: AgentPageApp;
  id?: string;
  /** For a case: its case type's id. */
  parentId?: string;
};

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

/** Most specific first. Every pathname starts with the workspace slug. */
const ROUTES: ReadonlyArray<{ app: AgentPageApp; pattern: RegExp }> = [
  { app: "data-explorer", pattern: /^\/[^/]+\/data-explorer(?:\/|$)/ },
  {
    app: "dashboard",
    pattern: new RegExp(`^/[^/]+/dashboards/(?:edit|preview)/${UUID}`, "i"),
  },
  { app: "dashboard", pattern: new RegExp(`^/[^/]+/d/${UUID}`, "i") },
  { app: "dashboards", pattern: /^\/[^/]+\/dashboards(?:\/|$)/ },
  { app: "dataset", pattern: new RegExp(`^/[^/]+/data-manager/${UUID}`, "i") },
  {
    app: "data-sources",
    pattern: /^\/[^/]+\/data-(?:manager|import|sources)(?:\/|$)/,
  },
  { app: "map", pattern: new RegExp(`^/[^/]+/map/${UUID}`, "i") },
  {
    app: "case",
    pattern: new RegExp(`^/[^/]+/individual-manager/${UUID}/${UUID}`, "i"),
  },
  {
    app: "case-type",
    pattern: new RegExp(`^/[^/]+/individual-manager/${UUID}`, "i"),
  },
  { app: "case-manager", pattern: /^\/[^/]+\/ontology-designer(?:\/|$)/ },
];

/**
 * Reads which page a workspace pathname shows. A case's route holds its
 * case type id first and its own id second.
 */
export function parseAgentPageRoute(pathname: string): AgentPageRoute {
  for (const route of ROUTES) {
    const match = pathname.match(route.pattern);
    if (!match) {
      continue;
    }
    if (route.app === "case") {
      return { app: "case", id: match[2]!, parentId: match[1]! };
    }
    return match[1] ? { app: route.app, id: match[1] } : { app: route.app };
  }
  return { app: "other" };
}
```

- [ ] **Step 4: Run and see the route tests pass.**

- [ ] **Step 5: Write the failing tile tests.**

```ts
import { describe, expect, it } from "vitest";
import { extractDashboardTiles } from "./extractDashboardTiles";

function _dataViz(prompt: string, rawSql: string, vizType = "bar"): unknown {
  return {
    type: "DataViz",
    props: { id: prompt, vizType, nlQuery: { prompt, rawSql } },
  };
}

describe("extractDashboardTiles", () => {
  it("lists charts in page order, including charts inside layout blocks", () => {
    const tiles = extractDashboardTiles({
      content: [
        _dataViz("Cases by month", "SELECT 1"),
        { type: "HeadingBlock", props: { text: "Deaths" } },
        {
          type: "Columns",
          props: { left: [_dataViz("Deaths by state", "SELECT 2", "line")] },
        },
      ],
    });

    expect(tiles).toEqual([
      { title: "Cases by month", chartType: "bar", sql: "SELECT 1" },
      { title: "Deaths by state", chartType: "line", sql: "SELECT 2" },
    ]);
  });

  it("skips charts with no SQL and names untitled ones", () => {
    expect(
      extractDashboardTiles({
        content: [_dataViz("", "SELECT 3"), _dataViz("Empty", "  ")],
      }),
    ).toEqual([{ title: "Untitled chart", chartType: "bar", sql: "SELECT 3" }]);
  });

  it("returns nothing for data it cannot read", () => {
    expect(extractDashboardTiles(undefined)).toEqual([]);
    expect(extractDashboardTiles({ content: "nope" })).toEqual([]);
  });
});
```

- [ ] **Step 6: Run and see them fail.**

- [ ] **Step 7: Implement.**

```ts
import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext";

/** Deep enough for any layout block nesting a dashboard uses. */
const MAX_DEPTH = 8;

type DataVizLike = {
  type?: unknown;
  props?: { vizType?: unknown; nlQuery?: { prompt?: unknown; rawSql?: unknown } };
};

function _toTile(item: DataVizLike): AgentPageTile | undefined {
  const sql = item.props?.nlQuery?.rawSql;
  if (typeof sql !== "string" || sql.trim().length === 0) {
    return undefined;
  }
  const prompt = item.props?.nlQuery?.prompt;
  const title = typeof prompt === "string" ? prompt.trim() : "";
  const vizType = item.props?.vizType;
  return {
    title: title || "Untitled chart",
    chartType: typeof vizType === "string" ? vizType : "table",
    sql,
  };
}

function _collect(value: unknown, depth: number, tiles: AgentPageTile[]): void {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      _collect(item, depth + 1, tiles);
    });
    return;
  }
  const item = value as DataVizLike;
  const tile = item.type === "DataViz" ? _toTile(item) : undefined;
  if (tile) {
    tiles.push(tile);
    return;
  }
  Object.values(value).forEach((child) => {
    _collect(child, depth + 1, tiles);
  });
}

/**
 * The charts on a dashboard, in page order, from its Puck data (the editor's
 * live data or a saved config). Reads defensively: a saved config is JSON
 * of any age.
 */
export function extractDashboardTiles(data: unknown): AgentPageTile[] {
  const content = (data as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  const tiles: AgentPageTile[] = [];
  _collect(content, 0, tiles);
  return tiles;
}
```

- [ ] **Step 8: Run all tests in the folder and see them pass.**

- [ ] **Step 9: Commit.**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/agentPageContext
git commit -m "feat(ai-agent): read the current page from the route and dashboard"
```

---

### Task 6: Build the page context

**Files:**
- Create: `.../agentPageContext/createAgentPageContext.ts`
- Create: `.../agentPageContext/agentPageNameLoader.ts`
- Test: `.../agentPageContext/createAgentPageContext.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { createAgentPageContext } from "./createAgentPageContext";
import type { AgentPageNameLoader } from "./createAgentPageContext";

const DASHBOARD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const DATASETS = [{ id: DATASET_ID, name: "cases.csv", columns: [] }];
const TILE_DATA = {
  root: { props: { title: "Measles 2026" } },
  content: [
    {
      type: "DataViz",
      props: { vizType: "line", nlQuery: { prompt: "Cases", rawSql: "SELECT 1" } },
    },
  ],
};

function _loader(overrides: Partial<AgentPageNameLoader> = {}): AgentPageNameLoader {
  return {
    getDashboard: vi.fn().mockResolvedValue(undefined),
    getMapName: vi.fn().mockResolvedValue(undefined),
    getCaseTypeName: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function _create(
  pathname: string,
  options: Partial<Parameters<typeof createAgentPageContext>[0]> = {},
) {
  return createAgentPageContext({
    pathname,
    chatPageContext: Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: { activeDashboardId: undefined, editorData: undefined },
    datasets: DATASETS,
    loader: _loader(),
    ...options,
  });
}

describe("createAgentPageContext", () => {
  it("reads the Data Explorer's open dataset and query", async () => {
    const context = await _create("/acme/data-explorer", {
      chatPageContext: Model.make("ChatPageContext", {
        app: "data-explorer",
        openDatasetId: DATASET_ID,
        lastSql: "SELECT 1",
        lastResultColumns: [{ name: "n", dataType: "bigint" }],
      }),
    });

    expect(context).toEqual({
      app: "data-explorer",
      dataset: { id: DATASET_ID, name: "cases.csv" },
      explorer: {
        sql: "SELECT 1",
        resultColumns: [{ name: "n", dataType: "bigint" }],
      },
    });
  });

  it("reads an open editor's unsaved charts without loading", async () => {
    const loader = _loader();
    const context = await _create(`/acme/dashboards/edit/${DASHBOARD_ID}`, {
      dashboardEditorState: {
        activeDashboardId: DASHBOARD_ID,
        editorData: TILE_DATA as never,
      },
      loader,
    });

    expect(context.dashboard).toEqual({
      id: DASHBOARD_ID,
      name: "Measles 2026",
      tiles: [{ title: "Cases", chartType: "line", sql: "SELECT 1" }],
    });
    expect(loader.getDashboard).not.toHaveBeenCalled();
  });

  it("loads a dashboard that is not open in the editor", async () => {
    const context = await _create(`/acme/dashboards/preview/${DASHBOARD_ID}`, {
      loader: _loader({
        getDashboard: vi
          .fn()
          .mockResolvedValue({ name: "Saved", config: TILE_DATA }),
      }),
    });

    expect(context.dashboard?.name).toBe("Saved");
    expect(context.dashboard?.tiles).toHaveLength(1);
  });

  it("names a case's type through the loader", async () => {
    const context = await _create(
      `/acme/individual-manager/${CONCEPT_ID}/${DATASET_ID}`,
      { loader: _loader({ getCaseTypeName: vi.fn().mockResolvedValue("Measles case") }) },
    );

    expect(context).toEqual({
      app: "case",
      caseType: { id: CONCEPT_ID, name: "Measles case" },
    });
  });

  it("keeps only the page when a name cannot be loaded", async () => {
    const context = await _create(`/acme/map/${DASHBOARD_ID}`, {
      loader: _loader({
        getMapName: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    });

    expect(context).toEqual({ app: "map" });
  });
});
```

- [ ] **Step 2: Run and see them fail.**
  Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext.test.ts`

- [ ] **Step 3: Implement `createAgentPageContext.ts`.**

```ts
import { extractDashboardTiles } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { AgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

/** Loads names the page state does not hold, with the user's own access. */
export type AgentPageNameLoader = {
  getDashboard: (
    id: string,
  ) => Promise<{ name: string; config: unknown } | undefined>;
  getMapName: (id: string) => Promise<string | undefined>;
  getCaseTypeName: (id: string) => Promise<string | undefined>;
};

type CreateAgentPageContextOptions = {
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: Pick<
    DashboardEditorAppState,
    "activeDashboardId" | "editorData"
  >;
  datasets: readonly DataAgentDataset[];
  loader: AgentPageNameLoader;
};

/** A name the page can do without: a failed load leaves it out. */
async function _tryLoad<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch {
    return undefined;
  }
}

function _findDataset(
  datasets: readonly DataAgentDataset[],
  id: string | undefined,
): AgentPageContext["dataset"] {
  const dataset = datasets.find((candidate) => {
    return candidate.id === id;
  });
  return dataset ? { id: dataset.id, name: dataset.name } : undefined;
}

async function _readDashboard(
  id: string,
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<AgentPageContext["dashboard"]> {
  const { activeDashboardId, editorData } = options.dashboardEditorState;
  if (activeDashboardId === id && editorData) {
    return {
      id,
      name: String(editorData.root?.props?.title ?? ""),
      tiles: extractDashboardTiles(editorData),
    };
  }
  const saved = await _tryLoad(() => {
    return options.loader.getDashboard(id);
  });
  return saved
    ? { id, name: saved.name, tiles: extractDashboardTiles(saved.config) }
    : undefined;
}

async function _readNamed(
  id: string | undefined,
  load: (id: string) => Promise<string | undefined>,
): Promise<{ id: string; name: string } | undefined> {
  if (!id) {
    return undefined;
  }
  const name = await _tryLoad(() => {
    return load(id);
  });
  return name ? { id, name } : undefined;
}

function _readExplorer(
  chatPageContext: ChatPageContext.T,
): AgentPageContext["explorer"] {
  return {
    ...(chatPageContext.lastSql ? { sql: chatPageContext.lastSql } : {}),
    resultColumns: chatPageContext.lastResultColumns ?? [],
  };
}

async function _readPageParts(
  route: AgentPageRoute,
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<Omit<AgentPageContext, "app">> {
  const { chatPageContext, datasets, loader } = options;
  switch (route.app) {
    case "data-explorer":
      return {
        dataset: _findDataset(datasets, chatPageContext.openDatasetId),
        explorer: _readExplorer(chatPageContext),
      };
    case "dataset":
      return { dataset: _findDataset(datasets, route.id) };
    case "dashboard":
      return { dashboard: await _readDashboard(route.id!, options) };
    case "map":
      return { map: await _readNamed(route.id, loader.getMapName) };
    case "case-type":
    case "case":
      return {
        caseType: await _readNamed(
          route.parentId ?? route.id,
          loader.getCaseTypeName,
        ),
      };
    default:
      return {};
  }
}

/** Drops keys whose value is undefined, so contexts compare cleanly. */
function _withoutEmpty(context: AgentPageContext): AgentPageContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => {
      return value !== undefined;
    }),
  ) as AgentPageContext;
}

/**
 * What is on screen when the user sends a message, for the agent's page
 * block: the route, the Data Explorer's state, the dashboard editor's live
 * data, and names loaded with the user's access. A name that fails to load
 * is left out rather than failing the turn.
 */
export async function createAgentPageContext(
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<AgentPageContext> {
  const route = parseAgentPageRoute(options.pathname);
  const parts = await _readPageParts(route, options);
  return _withoutEmpty({ app: route.app, ...parts });
}
```

  Check `editorData.root?.props?.title` compiles against `AvaPageData`.
  If Puck's type makes `root.props` required, drop the `?.`.

- [ ] **Step 4: Run and see the tests pass.**

- [ ] **Step 5: Implement the loader** (exercised by the browser spec in
  Task 15, not unit tested, since it only calls clients):

```ts
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";

/**
 * Loads page names with the user's own session, so RLS decides what the
 * agent may name. A row from another workspace counts as missing, as in the
 * gadget summaries: a route can name any uuid.
 */
export function createAgentPageNameLoader(
  workspaceId: Workspace.Id,
): AgentPageNameLoader {
  const inWorkspace = <T extends { workspaceId: string }>(
    row: T | undefined,
  ): T | undefined => {
    return row?.workspaceId === workspaceId ? row : undefined;
  };
  return {
    getDashboard: async (id) => {
      const dashboard = inWorkspace(
        await DashboardClient.getById({ id: id as Dashboard.Id }),
      );
      return dashboard
        ? { name: dashboard.name, config: dashboard.config }
        : undefined;
    },
    getMapName: async (id) => {
      return inWorkspace(await AvaMapClient.getById({ id: id as AvaMap.Id }))
        ?.name;
    },
    getCaseTypeName: async (id) => {
      return inWorkspace(
        await ConceptClient.getById({ id: id as Concept.Id }),
      )?.name;
    },
  };
}
```

  Run `pnpm exec tsc -b --noEmit`. If any client's `getById` returns
  `T | null`, change `inWorkspace` to accept `T | null | undefined`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/agentPageContext
git commit -m "feat(ai-agent): build the agent's page context from page state"
```

---

### Task 7: The stored query result

**Files:**
- Create: `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult.ts`
- Test: `.../AgentQueryResultPart/AgentQueryResult.test.ts`
- Test: `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from "vitest";
import { AgentQueryResult } from "./AgentQueryResult";

describe("AgentQueryResult", () => {
  it("becomes a data part the thread can store", () => {
    const result = AgentQueryResult.create({
      sql: 'SELECT 1 AS "n"',
      chart: "bar",
      title: "How many?",
    });

    expect(AgentQueryResult.toDataPart(result)).toEqual({
      type: "data",
      name: "agent-query-result",
      data: {
        version: 1,
        sql: 'SELECT 1 AS "n"',
        chartType: "bar",
        title: "How many?",
        display: "embed",
      },
    });
  });

  it("shows a result without a chart as a table", () => {
    expect(
      AgentQueryResult.create({ sql: "SELECT 1", title: "t" }).chartType,
    ).toBe("table");
  });

  it("parses stored data and refuses anything else", () => {
    const result = AgentQueryResult.create({ sql: "SELECT 1", title: "t" });

    expect(AgentQueryResult.parse(result)).toEqual(result);
    expect(AgentQueryResult.parse({ ...result, chartType: "radar" })).toBe(
      undefined,
    );
    expect(AgentQueryResult.parse({ sql: 1 })).toBe(undefined);
    expect(AgentQueryResult.parse(undefined)).toBe(undefined);
  });
});
```

  And in `ChatThreadStore.test.ts`, inside the existing `describe`:

```ts
  it("round-trips a query result part without storing rows", () => {
    const part = {
      type: "data" as const,
      name: "agent-query-result",
      data: {
        version: 1,
        sql: "SELECT 1",
        chartType: "table",
        title: "How many?",
        display: "embed",
      },
    };
    const messages: ThreadMessageLike[] = [
      { role: "user", content: "How many?" },
      { role: "assistant", content: [{ type: "text", text: "One." }, part] },
    ];
    ChatThreadStore.write({ workspaceId: WORKSPACE_ID, userId: USER_ID, messages });

    expect(
      ChatThreadStore.read({ workspaceId: WORKSPACE_ID, userId: USER_ID }),
    ).toEqual(messages);
    expect(
      window.localStorage.getItem(
        ChatThreadStore.storageKey({ workspaceId: WORKSPACE_ID, userId: USER_ID }),
      ),
    ).not.toContain("rows");
  });
```

- [ ] **Step 2: Run and see them fail.** The `ChatThreadStore` case may
  already pass (the store keeps content as JSON); it stays as a guard. The
  `AgentQueryResult` cases must fail on the missing module.
  Run: `pnpm vitest run src/components/ChatPanel/ChatThread/AgentQueryResultPart src/components/ChatPanel/ChatThreadStore`

- [ ] **Step 3: Implement.**

```ts
import { z } from "zod";

const CHART_TYPES = ["table", "bar", "line", "area", "scatter", "pie"] as const;

const AgentQueryResultSchema = z.object({
  version: z.literal(1),
  sql: z.string().min(1),
  chartType: z.enum(CHART_TYPES),
  title: z.string(),
  display: z.enum(["embed", "link"]),
});

/**
 * A query the agent ran for the user outside the Data Explorer, as the
 * chat thread stores it. Holds the SQL and how to show it, never rows: the
 * result runs again in the browser whenever the message is shown.
 */
export type AgentQueryResultData = z.infer<typeof AgentQueryResultSchema>;

/** The assistant-ui `data` part name the chat renders results by. */
const PART_NAME = "agent-query-result";

/** Creates, stores, and reads the agent's query results in the chat. */
export const AgentQueryResult = {
  PART_NAME,

  /** A result from one `run_query` call. No chart shows as a table. */
  create: (
    options: Readonly<{ sql: string; chart?: string; title: string }>,
  ): AgentQueryResultData => {
    const chartType = CHART_TYPES.find((type) => {
      return type === options.chart;
    });
    return {
      version: 1,
      sql: options.sql,
      chartType: chartType ?? "table",
      title: options.title,
      display: "embed",
    };
  },

  /** The message part that carries a result in an assistant reply. */
  toDataPart: (
    result: AgentQueryResultData,
  ): { type: "data"; name: string; data: AgentQueryResultData } => {
    return { type: "data", name: PART_NAME, data: result };
  },

  /** Reads stored data, or undefined when it is not a valid result. */
  parse: (value: unknown): AgentQueryResultData | undefined => {
    const parsed = AgentQueryResultSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  },
};
```

- [ ] **Step 4: Run and see them pass.**

- [ ] **Step 5: Commit.**

```bash
git add src/components/ChatPanel/ChatThread/AgentQueryResultPart src/components/ChatPanel/ChatThreadStore
git commit -m "feat(ai-agent): store agent query results in the chat thread"
```

---

### Task 8: The host sends results to the explorer or the chat

**Files:**
- Modify: `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`
- Test: `.../dataAgentTurnHelpers/showQueryInChat.test.ts`
- Test: `.../dataAgentTurnHelpers/createConversationAgentHost.test.ts`

- [ ] **Step 1: Rename the host option.** In
  `createBrowserDataAgentHost.ts`, rename `showQueryInExplorer` to
  `showQuery` in `BrowserDataAgentHostOptions` (docstring: "Runs SQL and
  shows the result: in the Data Explorer or in the chat, as the caller
  decides.") and in the returned object (`showQuery: options.showQuery`).
  Update the function's docstring first sentence to "Queries run where
  the caller's `showQuery` sends them". Fix the one caller in
  `dataAgentTurnHelpers.ts` (`showQuery: createExplorerShowQuery(options)`).

- [ ] **Step 2: Write the failing `showQueryInChat` tests.**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { showQueryInChat } from "./showQueryInChat";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";

const WORKSPACE_ID = "workspace-1" as never;

function _mockRun(data: Array<Record<string, unknown>>) {
  return vi.spyOn(WorkspaceQuerySession, "runQuery").mockResolvedValue({
    columns: [{ name: "state", dataType: "varchar" }],
    data,
    numRows: data.length,
  } as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("showQueryInChat", () => {
  it("adds a result for rows and reports only their shape", async () => {
    _mockRun([{ state: "Ohio" }, { state: "Utah" }]);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "Which states?",
      results,
      request: { sql: "SELECT 1", summary: "s", chart: "bar" },
    });

    expect(outcome).toEqual({
      kind: "rows",
      columns: [{ name: "state", type: "varchar" }],
      rowCount: 2,
    });
    expect(results).toEqual([
      expect.objectContaining({ sql: "SELECT 1", chartType: "bar", title: "Which states?" }),
    ]);
  });

  it("adds nothing for an empty or all-blank result", async () => {
    _mockRun([{ state: null }]);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results,
      request: { sql: "SELECT 1", summary: "s" },
    });

    expect(outcome.kind).toBe("empty");
    expect(results).toEqual([]);
  });

  it("reports a failed query with its message", async () => {
    vi.spyOn(WorkspaceQuerySession, "runQuery").mockRejectedValue(
      new Error('Binder Error: column "x" not found'),
    );

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results: [],
      request: { sql: "SELECT x", summary: "s" },
    });

    expect(outcome).toEqual({
      kind: "failed",
      error: 'Binder Error: column "x" not found',
    });
  });
});
```

- [ ] **Step 3: Run and see them fail.**
  Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat.test.ts`

- [ ] **Step 4: Implement `showQueryInChat.ts`.**

```ts
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgentQueryOutcome } from "@/lib/agent/dataAgent/DataAgentHost";

function _isAllBlank(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  return rows.every((row) => {
    return Object.values(row).every((cell) => {
      return cell === null || cell === undefined;
    });
  });
}

/**
 * Runs the agent's query for a page other than the Data Explorer: through
 * the workspace query session (the fail-closed analyzer, then DuckDB-Wasm),
 * adding a chat result when it has rows. The agent gets the result's shape
 * only. A result whose cells are all empty counts as empty, as in the
 * explorer.
 */
export async function showQueryInChat(
  options: Readonly<{
    workspaceId: Workspace.Id;
    title: string;
    results: AgentQueryResultData[];
    request: Readonly<{ sql: string; summary: string; chart?: string }>;
  }>,
): Promise<DataAgentQueryOutcome> {
  const { request } = options;
  try {
    const result = await WorkspaceQuerySession.runQuery({
      rawSql: request.sql,
      workspaceId: options.workspaceId,
    });
    const isEmpty = result.numRows === 0 || _isAllBlank(result.data);
    if (!isEmpty) {
      options.results.push(
        AgentQueryResult.create({
          sql: request.sql,
          chart: request.chart,
          title: options.title,
        }),
      );
    }
    return {
      kind: isEmpty ? "empty" : "rows",
      columns: result.columns.map((column) => {
        return { name: column.name, type: String(column.dataType) };
      }),
      rowCount: result.numRows,
    };
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 5: Run and see them pass.**

- [ ] **Step 6: Write the failing conversation host tests.** These pin
  the two behaviors that matter: the destination follows the page of the
  *current* turn, and question cards go to the current turn's panel.

```ts
import { describe, expect, it, vi } from "vitest";
import { createConversationAgentHost } from "./createConversationAgentHost";
import type { DataAgentTurnOptions } from "./dataAgentTurnHelpers";

const { showQueryInChatMock, explorerShowQueryMock } = vi.hoisted(() => {
  return {
    showQueryInChatMock: vi.fn().mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
    explorerShowQueryMock: vi.fn().mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
  };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat",
  () => {
    return { showQueryInChat: showQueryInChatMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers",
  async (importOriginal) => {
    const original = await importOriginal<object>();
    return {
      ...original,
      createExplorerShowQuery: () => {
        return explorerShowQueryMock;
      },
    };
  },
);

function _turn(app: "data-explorer" | "dashboard"): DataAgentTurnOptions {
  return {
    apiMessages: [{ role: "user", content: "How many?" }],
    workspaceId: "workspace-1",
    currentUser: undefined,
    chatGeneration: 0,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    pageContext: { app },
  } as unknown as DataAgentTurnOptions;
}

const REQUEST = { sql: "SELECT 1", summary: "s" };

describe("createConversationAgentHost", () => {
  it("shows results in the explorer on the Data Explorer", async () => {
    const state = { turnRef: { current: _turn("data-explorer") }, results: [] };
    await createConversationAgentHost(state).showQuery(REQUEST);

    expect(explorerShowQueryMock).toHaveBeenCalledWith(REQUEST);
    expect(showQueryInChatMock).not.toHaveBeenCalled();
  });

  it("follows the page of the current turn, not the first", async () => {
    const state = { turnRef: { current: _turn("data-explorer") }, results: [] };
    const host = createConversationAgentHost(state);
    state.turnRef.current = _turn("dashboard");

    await host.showQuery(REQUEST);

    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "How many?", request: REQUEST }),
    );
  });

  it("shows question cards in the current turn's panel", async () => {
    const state = { turnRef: { current: _turn("dashboard") }, results: [] };
    const host = createConversationAgentHost(state);
    const laterTurn = _turn("dashboard");
    state.turnRef.current = laterTurn;

    await host.askUser({ question: "Which?", options: ["A", "B"], isMulti: false, kind: "choice" });

    expect(laterTurn.chatPanelDispatch.setPendingClarification).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run and see them fail.**

- [ ] **Step 8: Extend `DataAgentTurnOptions` and implement the host.**
  In `dataAgentTurnHelpers.ts`, add to `DataAgentTurnOptions`:

```ts
  /**
   * What is on screen for this turn. Decides where a query's result goes:
   * the Data Explorer when the user is on it, the chat everywhere else.
   * Absent for offline turns, which run only in the Data Explorer.
   */
  pageContext?: AgentPageContext;
```

  (import type `AgentPageContext` from
  `$/agent/pageContext/AgentPageContext`). Then create
  `createConversationAgentHost.ts`:

```ts
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { createExplorerShowQuery } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { showQueryInChat } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/**
 * What a conversation's host reads on every call: the turn being answered
 * (the agent outlives each turn, so it must never keep the first one) and
 * the results this turn added to the chat.
 */
export type AgentConversationState = {
  turnRef: { current: DataAgentTurnOptions };
  results: AgentQueryResultData[];
};

function _isOnDataExplorer(turn: DataAgentTurnOptions): boolean {
  return (
    turn.pageContext === undefined || turn.pageContext.app === "data-explorer"
  );
}

/**
 * The browser host for one conversation's agent. Each call reads the
 * current turn, so a follow-up sent from another page shows its result
 * there: in the Data Explorer when the user is on it, in the chat otherwise
 * (rule R3, the agent never changes the page).
 */
export function createConversationAgentHost(
  state: AgentConversationState,
): DataAgentHost {
  const firstTurn = state.turnRef.current;
  return createBrowserDataAgentHost({
    workspaceId: firstTurn.workspaceId,
    userId: firstTurn.currentUser?.id,
    showQuery: (request) => {
      const turn = state.turnRef.current;
      if (_isOnDataExplorer(turn)) {
        return createExplorerShowQuery(turn)(request);
      }
      return showQueryInChat({
        workspaceId: turn.workspaceId,
        title: getLastQuestionFromMessages(turn.apiMessages),
        results: state.results,
        request,
      });
    },
    showQuestionCard: (clarification) => {
      state.turnRef.current.chatPanelDispatch.setPendingClarification(
        clarification,
      );
    },
  });
}
```

  Leave `createExplorerDataAgentHost` in place for now; Task 9 replaces
  its two callers and deletes it.

- [ ] **Step 9: Run the folder's tests and the type check.**
  Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers && pnpm exec tsc -b --noEmit`

- [ ] **Step 10: Commit.**

```bash
git add src/lib/agent/dataAgent/browser src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers
git commit -m "feat(ai-agent): send agent results to the explorer or the chat by page"
```

---

### Task 9: Conversations carry the page and the results

**Files:**
- Modify: `.../dataAgentTurnHelpers/dataAgentTurnHelpers.ts` (`askConversationDataAgent`)
- Modify: `.../runDataAgentTurn/runDataAgentTurn.ts`
- Modify: `.../runOfflineDataAgentTurn/runOfflineDataAgentTurn.ts`
- Test: `.../dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to
  `dataAgentTurnHelpers.test.ts` (add `askConversationDataAgent` and the
  `DataAgentConversation` type to its imports):

```ts
describe("askConversationDataAgent", () => {
  function _fakeConversation(): DataAgentConversation & {
    asked: string[];
  } {
    const asked: string[] = [];
    const conversation = {
      asked,
      turnRef: { current: _createTurnOptions() },
      results: [],
      dataAgent: {
        ask: vi.fn(async (text: string) => {
          asked.push(text);
          conversation.results.push(
            AgentQueryResult.create({ sql: "SELECT 1", title: "t" }),
          );
          return { text: "Here it is." };
        }),
      },
    } as unknown as DataAgentConversation & { asked: string[] };
    return conversation;
  }

  function _turn(content: string): DataAgentTurnOptions {
    return {
      ..._createTurnOptions(),
      apiMessages: [{ role: "user", content }],
      chatPanelDispatch: { setPendingClarification: vi.fn() },
    } as unknown as DataAgentTurnOptions;
  }

  it("sends the page block first, then 'unchanged' on the same page", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const pageBlock = "<current_page>\nPage: Map\n</current_page>";

    await askConversationDataAgent({
      conversations,
      turn: _turn("How many?"),
      pageBlock,
      createConversation: vi.fn(),
    });
    await askConversationDataAgent({
      conversations,
      turn: _turn("And deaths?"),
      pageBlock,
      createConversation: vi.fn(),
    });

    expect(conversation.asked[0]).toBe(`${pageBlock}\n\nHow many?`);
    expect(conversation.asked[1]).toContain("Unchanged since the last message.");
  });

  it("returns the reply with this turn's results as data parts", async () => {
    const conversation = _fakeConversation();
    conversation.results.push(
      AgentQueryResult.create({ sql: "SELECT 0", title: "old" }),
    );

    const reply = await askConversationDataAgent({
      conversations: new Map([["workspace-1:0", conversation]]),
      turn: _turn("How many?"),
      createConversation: vi.fn(),
    });

    expect(reply.content).toEqual([
      { type: "text", text: "Here it is." },
      AgentQueryResult.toDataPart(
        AgentQueryResult.create({ sql: "SELECT 1", title: "t" }),
      ),
    ]);
  });
});
```

  (Import `AgentQueryResult` from
  `@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult`.)

- [ ] **Step 2: Run and see them fail.**

- [ ] **Step 3: Implement.** In `dataAgentTurnHelpers.ts`, replace
  `askConversationDataAgent` with:

```ts
/** One conversation's agent, the turn it is answering, and its results. */
export type DataAgentConversation = AgentConversationState & {
  dataAgent: DataAgent;
  /** The page block sent last, to send "unchanged" instead of repeats. */
  lastPageBlock?: string;
};

/**
 * Asks this conversation's agent the turn's message, creating the
 * conversation on its first turn, and returns the reply with any results
 * this turn added to the chat. `conversations` holds one per
 * `${workspaceId}:${chatGeneration}`, so follow-ups see earlier turns. The
 * page block, when given, starts the message (D35).
 */
export async function askConversationDataAgent(
  options: Readonly<{
    conversations: Map<string, DataAgentConversation>;
    turn: Readonly<DataAgentTurnOptions>;
    pageBlock?: string;
    createConversation: (
      turnRef: AgentConversationState["turnRef"],
    ) => Promise<DataAgentConversation>;
  }>,
): Promise<ChatModelRunResult> {
  const { turn } = options;
  const key = `${turn.workspaceId}:${turn.chatGeneration}`;
  const existing = options.conversations.get(key);
  const conversation =
    existing ?? (await options.createConversation({ current: turn }));
  options.conversations.set(key, conversation);
  conversation.turnRef.current = turn;
  conversation.results.length = 0;
  turn.chatPanelDispatch.setPendingClarification(undefined);
  const reply = await conversation.dataAgent.ask(
    buildAgentTurnText({
      message: _buildPromptText(turn.apiMessages, !existing),
      pageBlock: options.pageBlock,
      previousPageBlock: conversation.lastPageBlock,
    }),
  );
  conversation.lastPageBlock = options.pageBlock ?? conversation.lastPageBlock;
  return {
    content: [
      { type: "text", text: reply.text },
      ...conversation.results.map(AgentQueryResult.toDataPart),
    ],
  };
}
```

  Imports to add: `buildAgentTurnText` from
  `$/agent/pageContext/buildAgentTurnText`, `AgentQueryResult`, and type
  `AgentConversationState` from `./createConversationAgentHost` path.

- [ ] **Step 4: Rewire `runDataAgentTurn.ts`.** The page context is
  built here, inside the lazily loaded agent chunk, so none of it lands in
  the main bundle. The adapter (Task 10) passes the raw page state.

```ts
/** The page state the adapter has when a turn starts. */
export type AgentPageInputs = {
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: DashboardEditorAppState;
};

/** One conversation per chat, so follow-ups see earlier turns. */
const conversationsByChat = new Map<string, DataAgentConversation>();

/**
 * The host must hold the same object the conversation map keeps, since
 * `askConversationDataAgent` updates its turn and results in place.
 */
async function _createConversation(
  turnRef: AgentConversationState["turnRef"],
  datasets: readonly DataAgentDataset[],
): Promise<DataAgentConversation> {
  const conversation = {
    turnRef,
    results: [],
  } as unknown as DataAgentConversation;
  conversation.dataAgent = createDataAgent({
    datasets,
    host: createConversationAgentHost(conversation),
    policy: _createModelPolicy(),
    streamFn: _createProxyStreamFn(turnRef.current.workspaceId),
    today: new Date().toISOString().slice(0, 10),
    sessionId: crypto.randomUUID(),
  });
  return conversation;
}

/**
 * Answers a chat message on any page with the Pi-based data agent. The
 * agent runs in the browser; only model requests go to the server, through
 * the agent proxy. The current page starts each turn's message (D35).
 */
export async function runDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
  page?: Readonly<AgentPageInputs>,
): Promise<ChatModelRunResult> {
  const datasets = await loadDataAgentDatasets(options.workspaceId);
  const pageContext = page
    ? await createAgentPageContext({
        ...page,
        datasets,
        loader: createAgentPageNameLoader(options.workspaceId),
      })
    : undefined;
  return askConversationDataAgent({
    conversations: conversationsByChat,
    turn: { ...options, pageContext },
    pageBlock: pageContext
      ? buildAgentPageContextBlock({
          context: pageContext,
          aliases: SqlTableAlias.fromSchema({ datasets }),
        })
      : undefined,
    createConversation: (turnRef) => {
      return _createConversation(turnRef, datasets);
    },
  });
}
```

  Imports to add: `buildAgentPageContextBlock`, `SqlTableAlias`,
  `createAgentPageContext`, `createAgentPageNameLoader`, and the types
  `ChatPageContext`, `DashboardEditorAppState`, `DataAgentDataset`,
  `DataAgentConversation`, `AgentConversationState`. Remove the old
  `agentsByConversation` map and `_createAgent`.

- [ ] **Step 5: Rewire `runOfflineDataAgentTurn.ts` the same way**, with
  no page block (offline stays Data Explorer only):

```ts
/** One offline conversation per chat, so follow-ups see earlier turns. */
const offlineConversationsByChat = new Map<string, DataAgentConversation>();

async function _createOfflineConversation(
  turnRef: AgentConversationState["turnRef"],
): Promise<DataAgentConversation> {
  const conversation = { turnRef, results: [] } as unknown as DataAgentConversation;
  conversation.dataAgent = createOfflineDataAgent({
    datasets: await loadDataAgentDatasets(turnRef.current.workspaceId),
    host: {
      ...createConversationAgentHost(conversation),
      // The model runs on this device, so values never cross a boundary and
      // there is nothing to ask consent for.
      approveValuesForModel: async () => {
        return true;
      },
    },
    llm: OfflineChatEngineStore,
    models: LocalChatModel.OFFLINE_BUNDLE,
    contextWindow: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    today: new Date().toISOString().slice(0, 10),
  });
  return conversation;
}
```

  and call `askConversationDataAgent({ conversations:
  offlineConversationsByChat, turn: options, createConversation:
  _createOfflineConversation })`. If `createOfflineDataAgent` returns a
  type other than `DataAgent`, check `DataAgentConversation["dataAgent"]`
  only needs `ask`; narrow the field type to `Pick<DataAgent, "ask">` if
  needed.

  Then delete `createExplorerDataAgentHost` from
  `dataAgentTurnHelpers.ts`: neither runner uses it any more.

- [ ] **Step 6: Run the tests and the type check.**
  Run: `pnpm vitest run src/components/ChatPanel && pnpm exec tsc -b --noEmit`
  Expected: PASS, no type errors.

- [ ] **Step 7: Commit.**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime
git commit -m "feat(ai-agent): carry the page and results through each agent turn"
```

---

### Task 10: Route every page's chat to the agent

**Files:**
- Modify: `.../createChatModelAdapter/createChatModelAdapter.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts`
- Test: `.../createChatModelAdapter/createChatModelAdapter.test.ts`

- [ ] **Step 1: Write the failing tests.** In
  `createChatModelAdapter.test.ts`, add to the hoisted mocks
  `runDataAgentTurnMock: vi.fn()` and `isAgentEnabledMock: vi.fn()`, then:

```ts
vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn",
  () => {
    return { runDataAgentTurn: runDataAgentTurnMock };
  },
);

vi.mock("@/lib/agent/dataAgent/browser/DataAgentFeature", () => {
  return { DataAgentFeature: { isEnabled: isAgentEnabledMock } };
});

describe("createChatModelAdapter with the agent on", () => {
  beforeEach(() => {
    _setNavigatorOnLine(true);
    isAgentEnabledMock.mockReturnValue(true);
    runDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "agent reply" }],
    });
  });

  it.each(["data-explorer", "dashboards", "data-sources", "other"] as const)(
    "answers on %s with the agent",
    async (app) => {
      await _ask(_createAdapter(app));

      expect(runDataAgentTurnMock).toHaveBeenCalledTimes(1);
      expect(apiPostMock).not.toHaveBeenCalled();
    },
  );

  it("passes the page state to the agent", async () => {
    await _ask(_createAdapter("dashboards"));

    expect(runDataAgentTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1" }),
      expect.objectContaining({
        pathname: "/acme/dashboards",
        chatPageContext: expect.objectContaining({ app: "dashboards" }),
      }),
    );
  });

  it("keeps the case designer on today's chat", async () => {
    await _ask(_createAdapter("case-manager"));

    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });

  it("uses today's chat everywhere while the switch is off", async () => {
    isAgentEnabledMock.mockReturnValue(false);

    await _ask(_createAdapter("data-explorer"));

    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });
});
```

  Add `pathnameRef: ref("/acme/dashboards")` to `_createAdapter`'s
  options. If existing tests in this file relied on the real
  `DataAgentFeature`, set `isAgentEnabledMock.mockReturnValue(false)` in
  their `beforeEach`.

- [ ] **Step 2: Run and see them fail.**
  Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter`

- [ ] **Step 3: Implement.** In `createChatModelAdapter.ts`:
  1. Add to `CreateChatModelAdapterOptions`:
     `pathnameRef: MutableRefObject<string>;` and destructure it.
  2. Replace the agent branch with:

```ts
      if (
        currentPageContext.app !== "case-manager" &&
        DataAgentFeature.isEnabled()
      ) {
        return finishIfCurrent(
          await _runAgentTurn({
            dataAgentTurn,
            pathname: pathnameRef.current,
            chatPageContext: currentPageContext,
            dashboardEditorState: dashboardEditorStateRef.current,
          }),
        );
      }
```

  3. Add at module level:

```ts
/**
 * Runs a turn with the data agent on any page. The agent, and the code
 * that reads the page, load on first use so they stay out of the main
 * bundle. The case designer keeps today's chat until case management
 * moves into the agent.
 */
async function _runAgentTurn(
  options: Readonly<{
    dataAgentTurn: DataAgentTurnOptions;
    pathname: string;
    chatPageContext: ChatPageContext.T;
    dashboardEditorState: DashboardEditorAppState;
  }>,
): Promise<ChatModelRunResult> {
  const { runDataAgentTurn } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn");
  return runDataAgentTurn(options.dataAgentTurn, {
    pathname: options.pathname,
    chatPageContext: options.chatPageContext,
    dashboardEditorState: options.dashboardEditorState,
  });
}
```

  4. In `useAvandarChatRuntime.ts`, pass the existing `pathnameRef` into
     `createChatModelAdapter({... pathnameRef ...})`. If the hook has no
     `pathnameRef` before `adapter` is built, move its declaration above.

- [ ] **Step 4: Run and see them pass.** Then run the whole chat panel
  suite: `pnpm vitest run src/components/ChatPanel`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime
git commit -m "feat(ai-agent): answer chat on every page with the agent"
```

---

### Task 11: The result card and chip

**Files:**
- Modify: `src/components/RichText/Gadget/GadgetCard/GadgetCardHeader.tsx`
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
- Create: `src/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView.ts`
- Create: `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.tsx`
- Create: `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css`
- Test: `.../AgentQueryResultPart/AgentQueryResultPart.test.tsx`

Read `docs/design/app-view-layout.md` and `DESIGN.md`'s Named Rules first.
This is not a new surface (it reuses the gadget card), so the `impeccable`
skill is not needed.

- [ ] **Step 1: Narrow `GadgetCardHeader`'s prop.** In
  `GadgetCardHeader.tsx`, change `definition: GadgetDefinition;` to:

```ts
  /** The parts of a gadget type the header draws. */
  definition: Pick<
    GadgetDefinition,
    "Icon" | "label" | "loadingLabel" | "unavailableLabel"
  >;
```

  `GadgetCardTitle` takes `Omit<Props, "menu">`, so it follows. Export
  `GadgetCardHeader` is already exported. Run
  `pnpm vitest run src/components/RichText/Gadget` to confirm nothing
  broke.

- [ ] **Step 2: Add the analytics surface.** In
  `AnalyticsEvents.types.ts`, add `| "chat_result"` to
  `QueryAnalyticsSurface`, and extend its docstring: "`chat_result`: an
  agent result re-run in the chat."

- [ ] **Step 3: Write the failing component tests.**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { AgentQueryResult } from "./AgentQueryResult";
import { AgentQueryResultPart } from "./AgentQueryResultPart";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

const { useAgentQueryResultViewMock } = vi.hoisted(() => {
  return { useAgentQueryResultViewMock: vi.fn() };
});

// Renders the link target into `href`, as GadgetCard.test.tsx does, so a
// test can assert params and search without a router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params = {},
      search,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
      search?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      const query = search ? `?${new URLSearchParams(search).toString()}` : "";
      return createElement("a", { href: `${path}${query}`, ...rest }, children);
    },
  };
});

vi.mock("./useAgentQueryResultView", () => {
  return { useAgentQueryResultView: useAgentQueryResultViewMock };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: () => { return { id: "ws-1", slug: "acme" }; } };
});

vi.mock("@/components/VisualizationContainer/VisualizationContainer", () => {
  return {
    VisualizationContainer: () => {
      return <div data-testid="viz" />;
    },
  };
});

function _props(data: unknown): DataMessagePartProps {
  return {
    type: "data",
    name: AgentQueryResult.PART_NAME,
    data,
    status: { type: "complete" },
  } as DataMessagePartProps;
}

const RESULT = AgentQueryResult.create({
  sql: 'SELECT 1 AS "n"',
  chart: "bar",
  title: "How many cases?",
});

describe("AgentQueryResultPart", () => {
  it("shows the result as a card with a live chart and an Open link", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "ready" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(screen.getByRole("group", { name: "How many cases?" })).toBeVisible();
    expect(screen.getByTestId("viz")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open How many cases?" }),
    ).toHaveAttribute(
      "href",
      `/acme/data-explorer?${new URLSearchParams({ sql: RESULT.sql })}`,
    );
  });

  it("says the result is loading while it runs", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "loading" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(screen.getByText("Loading result")).toBeInTheDocument();
  });

  it("says the result is unavailable when it cannot run", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "unavailable" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(screen.getByText("Unavailable result")).toBeInTheDocument();
    expect(screen.queryByTestId("viz")).not.toBeInTheDocument();
  });

  it("shows a link result as an inline chip", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "ready" });
    render(
      <AgentQueryResultPart {..._props({ ...RESULT, display: "link" })} />,
    );

    expect(screen.getByRole("link", { name: "How many cases?" })).toBeVisible();
    expect(screen.queryByTestId("viz")).not.toBeInTheDocument();
  });

  it("draws nothing for data it cannot read", () => {
    const { container } = render(
      <AgentQueryResultPart {..._props({ sql: 3 })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
```

  `@/test-utils`'s `render` wraps Mantine and Lingui, as in
  `GadgetCard.test.tsx`. If its `container` holds provider markup, assert
  the last case with
  `expect(screen.queryByRole("group")).not.toBeInTheDocument()` instead.

- [ ] **Step 4: Run and see them fail.**
  Run: `pnpm vitest run src/components/ChatPanel/ChatThread/AgentQueryResultPart`

- [ ] **Step 5: Implement the view hook.**

```ts
import { useMemo } from "react";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { UnknownDataFrame } from "@avandar/utils";

/** What the result card draws. */
export type AgentQueryResultView =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "ready";
      columns: readonly QueryResult.ColumnWithId[];
      rawColumns: readonly QueryResult.Column[];
      data: UnknownDataFrame;
      dateColumns: ReadonlySet<string>;
      vizConfig: AvaVizConfig.T;
    };

/**
 * Runs a stored agent result the way the Data Explorer runs a query (its
 * query hook, column bindings, and chart config), so the chat card draws
 * the same chart the explorer would.
 */
export function useAgentQueryResultView(
  result: AgentQueryResultData,
  workspaceId: Workspace.Id,
): AgentQueryResultView {
  const emptyQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);
  const [queryResult, isLoading, query] = useDataQuery({
    query: emptyQuery,
    rawSql: result.sql,
    auth: "workspace",
    workspaceId,
    analyticsSurface: "chat_result",
  });
  const projections = useMemo(() => {
    return makeProjectionDescriptorsFromSql({
      sql: result.sql,
      columns: queryResult?.columns ?? [],
    });
  }, [result.sql, queryResult?.columns]);
  const schema = useQueryResultColumnBindings({
    scopeKey: `${workspaceId}:chat-result:${result.sql}`,
    sqlKey: result.sql,
    resultSqlKey: queryResult?.executedSql,
    result: isLoading ? undefined : queryResult,
    projections,
    initialRegistry: undefined,
  });
  const columns = schema?.columns;
  const vizConfig = useMemo(() => {
    return AvaVizConfigs.hydrateFromQueryResult(
      AvaVizConfigs.makeEmptyConfig(result.chartType),
      columns ?? [],
    );
  }, [result.chartType, columns]);
  if (query.isError) {
    return { status: "unavailable" };
  }
  if (isLoading || !queryResult || !columns) {
    return { status: "loading" };
  }
  const data = queryResult.data;
  return {
    status: "ready",
    columns,
    rawColumns: queryResult.columns,
    data,
    dateColumns: getDateColumns(columns, data),
    vizConfig,
  };
}
```

  If `AvaVizConfig.T` is not the namespace's type name, use the type
  `VisualizationContainer`'s `vizConfig` prop declares.

- [ ] **Step 6: Implement the component.**

```tsx
import { msg } from "@lingui/core/macro";
import { IconChartBar } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { GadgetCardHeader } from "@/components/RichText/Gadget/GadgetCard/GadgetCardHeader";
import chipClasses from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import classes from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { GadgetSummary } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

/** The result card's header copy, in the gadget card's shape. */
const RESULT_DEFINITION = {
  Icon: IconChartBar,
  label: msg`Result`,
  loadingLabel: msg`Loading result`,
  unavailableLabel: msg`Unavailable result`,
};

function _openLink(result: AgentQueryResultData, workspaceSlug: string) {
  const link = AppLinks.dataExplorer(workspaceSlug);
  return { to: link.to, params: link.params, search: { sql: result.sql } };
}

function ResultCard({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  const view = useAgentQueryResultView(result, workspace.id);
  const titleId = useId();
  const summary: GadgetSummary =
    view.status === "ready"
      ? {
          status: "available",
          name: result.title,
          facts: [],
          link: _openLink(result, workspace.slug),
        }
      : { status: view.status };
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={view.status === "loading" ? true : undefined}
      className={cardClasses.card}
    >
      <GadgetCardHeader
        definition={RESULT_DEFINITION}
        summary={summary}
        titleId={titleId}
        menu={undefined}
      />
      {view.status === "ready" ? (
        <div className={classes.body}>
          <VisualizationContainer
            columns={view.columns}
            rawColumns={view.rawColumns}
            data={view.data}
            dateColumns={view.dateColumns}
            vizConfig={view.vizConfig}
          />
        </div>
      ) : null}
    </div>
  );
}

function ResultChip({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  return (
    <Link {..._openLink(result, workspace.slug)} className={chipClasses.chip}>
      <IconChartBar size={13} aria-hidden className={chipClasses.icon} />
      <span className={chipClasses.label}>{result.title}</span>
    </Link>
  );
}

/**
 * A query the agent ran for the user, inside an assistant message: an
 * embed card with the live chart or table and an Open link to the Data
 * Explorer, or an inline chip. Reuses the gadget card and chip, so results
 * read like the dashboards and datasets linked in comments. Rendered by
 * `MessagePrimitive.Parts` for `data` parts named
 * `AgentQueryResult.PART_NAME`.
 */
export function AgentQueryResultPart({ data }: DataMessagePartProps): ReactNode {
  const result = AgentQueryResult.parse(data);
  if (!result) {
    return null;
  }
  return result.display === "link" ? (
    <ResultChip result={result} />
  ) : (
    <ResultCard result={result} />
  );
}
```

  The card's header gets its "Loading result" and "Unavailable result"
  text from `GadgetCardHeader` through `RESULT_DEFINITION`, translated
  there.

- [ ] **Step 7: Add the CSS module.**

```css
/*
 * The chart body inside a result card in the chat. The chat column is
 * narrow, so the chart takes a fixed height and the full width.
 */
.body {
  block-size: 260px;
  padding: var(--mantine-spacing-xs);
}
```

- [ ] **Step 8: Run and see the tests pass.** Then
  `pnpm exec stylelint src/components/ChatPanel/ChatThread/AgentQueryResultPart/*.css`.

- [ ] **Step 9: Commit.**

```bash
git add src/components/ChatPanel/ChatThread/AgentQueryResultPart src/components/RichText/Gadget/GadgetCard shared/analytics
git commit -m "feat(ai-agent): draw agent results in the chat as gadget cards"
```

---

### Task 12: Render result parts in assistant messages

**Files:**
- Modify: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx`
- Test: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx`

- [ ] **Step 1: Write the failing test.** `AssistantMessage.test.tsx`
  mocks `@assistant-ui/react`, with `MessagePrimitive.Parts` rendering a
  fixed string. Make that mock record its props, then assert the part
  renderer is registered:
  1. Add `partsProps: { current: undefined as unknown }` to the object
     returned by the existing `vi.hoisted` call, and destructure it.
  2. Change the mock's `Parts` to:

```tsx
      Parts: (props: unknown) => {
        partsProps.current = props;
        return <span>Message content</span>;
      },
```

  3. Add the imports and the test:

```tsx
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AgentQueryResultPart } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart";

  it("draws agent query results with the result part", () => {
    render(<AssistantMessage />);

    const props = partsProps.current as {
      components: { data: { by_name: Record<string, unknown> } };
    };
    expect(props.components.data.by_name[AgentQueryResult.PART_NAME]).toBe(
      AgentQueryResultPart,
    );
  });
```

- [ ] **Step 2: Run and see it fail.**
  Run: `pnpm vitest run src/components/ChatPanel/ChatThread/AssistantMessage`

- [ ] **Step 3: Implement.** In `AssistantMessage.tsx`:

```tsx
          <MessagePrimitive.Parts
            components={{
              Text: MarkdownTextPart,
              data: {
                by_name: {
                  [AgentQueryResult.PART_NAME]: AgentQueryResultPart,
                },
              },
            }}
          />
```

  with the two imports. Keep the components object in a module-level
  constant (`const MESSAGE_PART_COMPONENTS = { ... }`) so it is not
  rebuilt each render.

- [ ] **Step 4: Run and see it pass.** Then run
  `pnpm vitest run src/components/ChatPanel`.

- [ ] **Step 5: Translations.**
  Run: `pnpm i18n:extract && pnpm i18n:compile`
  Expected: new messages "Result", "Loading result", "Unavailable
  result". Fill any non-English catalogs the way the repo's other recent
  commits did (check `git log -p -1 -- src/i18n/locales` for the pattern);
  never hand-edit `messages.ts`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ChatPanel/ChatThread src/i18n/locales
git commit -m "feat(ai-agent): show agent results inside assistant messages"
```

---

### Task 13: Page questions in the eval

**Files:**
- Modify: `scripts/ai-eval/EvalQuestion.ts`
- Create: `scripts/ai-eval/covid/covidPageQuestions.ts`
- Modify: `scripts/ai-eval/covid/covidQuestions.ts`
- Modify: `scripts/ai-eval/runEval.ts`
- Modify: `scripts/ai-eval/harnesses/pi/PiHarness.ts`
- Modify: `scripts/ai-eval/harnesses/baseline/BaselineHarness.ts`

The eval runs in Node through `pnpm vite-script`, which cannot load UI
modules. Everything below imports only `shared/` and `scripts/` code.

- [ ] **Step 1: Add the question fields.** In `EvalQuestion.ts`:
  - Add `"page_context"` to `category`.
  - Add:

```ts
  /**
   * What is on screen when the user asks. The Pi harness renders it with
   * the app's `buildAgentPageContextBlock`; the baseline harness passes the
   * Data Explorer part as today's chat's page context.
   */
  pageContext?: AgentPageContext;
```

    with `import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";`
    (use the import alias the other eval files use for `shared/`; check
    `PiHarness.ts`'s imports).

- [ ] **Step 2: Write the six questions** in `covidPageQuestions.ts`.
  Truth SQL runs on the readable views; page SQL is written with aliases
  and resolved, the way the app stores it.

```ts
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import { COVID_DATASETS } from "./covidWorkspace";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

const ALIASES = SqlTableAlias.fromDatasets(COVID_DATASETS);
const US_DEATHS = "t0";
const US_CASES = "t1";
const GLOBAL_DEATHS = "t2";

/** Page SQL as the app stores it: written with aliases, then resolved. */
function _stored(sql: string): string {
  return SqlTableAlias.applyToSql(sql, ALIASES);
}

const CASES_2022_MONTHLY = _stored(
  `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_cases") AS "cases" FROM "${US_CASES}" WHERE year("date") = 2022 GROUP BY 1 ORDER BY 1`,
);
const DEATHS_2022_MONTHLY = _stored(
  `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE year("date") = 2022 GROUP BY 1 ORDER BY 1`,
);
const DEATHS_2021_MONTHLY = _stored(
  `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE year("date") = 2021 GROUP BY 1 ORDER BY 1`,
);

const CASES_TILE = {
  title: "Monthly US cases in 2022",
  chartType: "bar",
  sql: CASES_2022_MONTHLY,
};
const DEATHS_TILE = {
  title: "Monthly US deaths in 2022",
  chartType: "line",
  sql: DEATHS_2022_MONTHLY,
};

const ONE_TILE_DASHBOARD: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: "dash-1", name: "COVID 2022", tiles: [CASES_TILE] },
};

function _scalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

function _weeklyTotal(context: GradeContext, weekCount: number): Verdict {
  const rowCount = context.result.rows.length;
  if (Math.abs(rowCount - weekCount) > 2) {
    return { pass: false, detail: `expected about ${weekCount} weekly rows, got ${rowCount}` };
  }
  return ResultChecks.hasColumnSum(context.result, _scalar(context, "total"), {
    tolerance: 0.05,
  });
}

/** Questions that only make sense with what is on screen. */
export const PAGE_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "P01",
    category: "page_context",
    prompt: "How many deaths are in this dataset in total?",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: { id: COVID_DATASETS[2]!.id, name: COVID_DATASETS[2]!.name },
      explorer: { resultColumns: [] },
    },
    truth: { total: Sql.total("global_deaths") },
    grade: (context) => {
      return ResultChecks.anyOf([
        () => {
          return ResultChecks.hasValue(context.result, _scalar(context, "total"));
        },
        () => {
          return ResultChecks.hasColumnSum(context.result, _scalar(context, "total"), {
            tolerance: 0.001,
          });
        },
      ]);
    },
  },
  {
    id: "P02",
    category: "page_context",
    prompt: "break this down by state",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: { id: COVID_DATASETS[0]!.id, name: COVID_DATASETS[0]!.name },
      explorer: {
        sql: DEATHS_2021_MONTHLY,
        resultColumns: [
          { name: "month", dataType: "date" },
          { name: "deaths", dataType: "bigint" },
        ],
      },
    },
    truth: { total: Sql.total("us_deaths", `year("date") = 2021`) },
    grade: (context) => {
      if (context.result.rows.length < 50) {
        return { pass: false, detail: "fewer than 50 rows is not a breakdown by state" };
      }
      return ResultChecks.hasColumnSum(context.result, _scalar(context, "total"), {
        tolerance: 0.001,
      });
    },
  },
  {
    id: "P03",
    category: "page_context",
    prompt: "show this chart by week instead",
    clarification: "not_needed",
    pageContext: ONE_TILE_DASHBOARD,
    truth: { total: Sql.total("us_cases", `year("date") = 2022`) },
    grade: (context) => {
      return _weeklyTotal(context, 52);
    },
  },
  {
    id: "P04",
    category: "page_context",
    prompt: "make this a pie chart",
    clarification: "expected",
    expectsChart: true,
    user: { choose: /death/i, say: "the deaths chart" },
    pageContext: {
      app: "dashboard",
      dashboard: {
        id: "dash-2",
        name: "COVID 2022",
        tiles: [CASES_TILE, DEATHS_TILE],
      },
    },
    truth: { monthly: Sql.monthly("us_deaths", `year("date") = 2022`) },
    grade: (context) => {
      return ResultChecks.matchTruthRows(context.result, context.truth.monthly!, {
        keys: ["month"],
        values: ["value"],
        mode: "all",
        exactRows: true,
      });
    },
  },
  {
    id: "P05",
    category: "page_context",
    prompt: "Which state had the most covid deaths?",
    clarification: "not_needed",
    pageContext: { app: "map", map: { id: "map-1", name: "Clinic locations" } },
    truth: { top: Sql.ranked("us_deaths", `"Province_State"`, { limit: 1 }) },
    grade: (context) => {
      return ResultChecks.matchTruthRows(context.result, context.truth.top!, {
        keys: ["name"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 1,
      });
    },
  },
  {
    id: "P06",
    category: "page_context",
    prompt: "only the first half of the year",
    followsId: "P03",
    clarification: "not_needed",
    pageContext: ONE_TILE_DASHBOARD,
    truth: {
      total: Sql.total("us_cases", `year("date") = 2022 AND month("date") <= 6`),
    },
    grade: (context) => {
      return _weeklyTotal(context, 26);
    },
  },
];
```

  Check `Sql.monthly`'s output column is `month` (the existing
  `MONTH_SERIES` spec in `covidQuestions.ts` uses `keys: ["month"]`, so it
  is). P04's truth matches the deaths tile, which is what the simulated
  user picks.

- [ ] **Step 3: Wire them in.** In `covidQuestions.ts`, import
  `PAGE_QUESTIONS` and append `...PAGE_QUESTIONS` to `COVID_QUESTIONS`.
  In `runEval.ts`, extend the usage comment: `--questions P` runs the page
  questions. `_selectQuestions` already matches by first letter.

  Keep the default run on the original 45, so archived numbers stay
  comparable. In `runEval.ts`, change the empty-ids branch of
  `_selectQuestions`:

```ts
  if (!ids) {
    // The default run stays the audit's 45 questions, so archived runs
    // compare. Page questions run with `--questions P`.
    return COVID_QUESTIONS.filter((question) => {
      return question.category !== "page_context";
    });
  }
```

- [ ] **Step 4: The Pi harness sends the page block.** In `PiHarness.ts`,
  inside `createPiConversation`'s `ask`, keep a `lastPageBlock` variable
  in the closure (declared next to `recorder`) and replace
  `dataAgent.ask(question.prompt)` with:

```ts
      const pageBlock = question.pageContext
        ? buildAgentPageContextBlock({
            context: question.pageContext,
            aliases: SqlTableAlias.fromDatasets(COVID_DATASETS),
          })
        : undefined;
      const reply = await dataAgent.ask(
        buildAgentTurnText({
          message: question.prompt,
          pageBlock,
          previousPageBlock: lastPageBlock,
        }),
      );
      lastPageBlock = pageBlock ?? lastPageBlock;
```

  The harness's `createDataAgent` call keeps the default prompt id (v2),
  so page questions and the 45 questions both run on v2.

- [ ] **Step 5: The baseline harness passes today's page context where it
  has one.** In `BaselineHarness.ts`, at the start of `ask`, when
  `question.pageContext?.app === "data-explorer"`, set:

```ts
      this.context = {
        app: "data-explorer",
        ...(question.pageContext.explorer?.sql
          ? { lastSql: question.pageContext.explorer.sql }
          : {}),
        ...(question.pageContext.explorer?.resultColumns.length
          ? { lastResultColumns: [...question.pageContext.explorer.resultColumns] }
          : {}),
      };
```

  and add `openDatasetId?: string` to `ExplorerContext`, set from
  `question.pageContext.dataset?.id`. For any other page context the
  baseline keeps its Data Explorer context: today's chat sees no tiles,
  maps, or case types, so P03, P04, and P06 are agent-only and are not
  compared.

- [ ] **Step 6: Smoke-check without spending.** Run
  `pnpm exec tsc -b --noEmit` and
  `pnpm vitest run scripts/ai-eval` (the grader tests).

- [ ] **Step 7: Commit.**

```bash
git add scripts/ai-eval
git commit -m "test(ai-eval): add six page-context questions for the agent"
```

---

### Task 14: Run the evals

Prerequisites from `docs/ai-agent/eval.md` ("Reproducing every result"):
the three CSVs in `~/cleaned-test-data`, `OPEN_ROUTER_API_KEY`, and Deno.

- [ ] **Step 1: The 45 questions on prompt v2** (about $0.01, 2 minutes):

```sh
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 6 --label phase-1a:agent-45
```

  Expected: 44 or 45 of 45. Rerun any single miss with
  `--questions <id>` four times before calling it a regression (N05 and
  H06 each missed once before and then passed 4 of 4).

- [ ] **Step 2: The page questions on the agent:**

```sh
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P --concurrency 3 --label phase-1a:agent-page
```

  Expected: 6 of 6, with P04 asking one question and the others none. Run
  it twice more (`#2`, `#3` labels) since model runs vary.

- [ ] **Step 3: Today's chat on the comparable page questions:**

```sh
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-haiku-5.5 --questions P01,P02,P05 --concurrency 3 --label phase-1a:today-page
```

  Expected: the agent scores at least as well on P01, P02, and P05.

- [ ] **Step 4: Read every failure by hand.** For each miss, open its
  line in `.temp/ai-eval/runs/<run>/results.jsonl` and decide: model
  noise (passes on rerun), a prompt gap (fix the v2 rules in
  `buildDataAgentSystemPrompt.ts`, then rerun Steps 1 and 2), or a grader
  gap (fix the grader and record it in eval.md's "Changes made while
  running the eval"). Do not move on with an unexplained miss.

- [ ] **Step 5: Compare cost.** From each run's summary, record cost per
  question and input tokens per call against the D10 runs ($0.00028 to
  $0.00055, 2,795 to 2,817 tokens).

- [ ] **Step 6: Archive.**

```sh
pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts
git add docs/ai-agent/eval-runs
git commit -m "docs(ai-eval): archive the phase 1A eval runs"
```

---

### Task 15: Browser spec with the agent proxy mocked

**Files:**
- Create: `tests/e2e/agent-chat-result.spec.ts`

- [ ] **Step 1: Prepare the local stack.**
  Run `ava supabase status`. If its first line does not name this
  branch's own project, run `ava supabase switch` and check again. Never
  run the e2e suite against the shared `avandar` stack. Never stage
  `supabase/config.toml`.

- [ ] **Step 2: Write the spec.**

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * The agent answers on a dashboard page and shows its result in the chat,
 * without leaving the page (rule R3). The model is mocked at the agent
 * proxy, so the test checks the browser's side: the page block reaches the
 * proxy, the query runs in DuckDB-Wasm, the result card draws, and it runs
 * again after a reload.
 */

const RESULT_SQL = `SELECT 'California' AS "state", 42 AS "cases"`;

/** Pi `streamProxy` events for one `run_query` call that ends the turn. */
function _runQueryStream(): string {
  const usage = {
    input: 10,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 15,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  const toolCall = {
    type: "toolCall",
    id: "call-1",
    name: "run_query",
    arguments: { sql: RESULT_SQL, summary: "Cases in California." },
  };
  const events = [
    { type: "start" },
    { type: "toolcall_start", contentIndex: 0, id: "call-1", toolName: "run_query" },
    { type: "toolcall_end", contentIndex: 0, toolCall },
    { type: "done", reason: "toolUse", usage },
  ];
  return events
    .map((event) => {
      return `data: ${JSON.stringify(event)}\n\n`;
    })
    .join("");
}

test.describe("agent results in the chat", () => {
  test("a question on a dashboard shows its result in the chat", async ({
    page,
    e2eWorkerDb,
  }) => {
    const proxyBodies: string[] = [];
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
    });
    await page.route(
      "**/functions/v1/chat/*/agent/data-agent-v2/api/stream",
      async (route) => {
        proxyBodies.push(route.request().postData() ?? "");
        await route.fulfill({
          contentType: "text/event-stream",
          body: _runQueryStream(),
        });
      },
    );

    const admin = createSupabaseAdminClient();
    const createdDashboardIds: string[] = [];
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page.goto(`/${e2eWorkerDb.workspaceSlug}/dashboards`);
      await page
        .getByRole("button", { name: "Create a dashboard" })
        .first()
        .click();
      await expect(page).toHaveURL(/\/dashboards\/edit\//, {
        timeout: LONG_WAIT,
      });
      const dashboardUrl = page.url();
      const dashboardId = parseDashboardIdFromEditorUrl(dashboardUrl);
      if (dashboardId) {
        createdDashboardIds.push(dashboardId);
      }

      const chatToggle = page.getByRole("button", { name: /^chat$/i });
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      const composer = page
        .getByPlaceholder(/Ask me/i)
        .or(page.locator('[data-testid="composer-input"]'))
        .first();
      await composer.fill("How many cases in California?");
      await composer.press("Enter");

      const card = page.getByRole("group", {
        name: "How many cases in California?",
      });
      await expect(card.getByRole("link", { name: /^Open / })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText("Cases in California.")).toBeVisible();
      expect(page.url()).toBe(dashboardUrl);
      expect(proxyBodies[0]).toContain("<current_page>");
      expect(proxyBodies[0]).toContain("Page: Dashboard");
      await page.screenshot({
        path: ".temp/feat-agent-default/agent-chat-result.png",
      });

      await page.reload();
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      await expect(card.getByRole("link", { name: /^Open / })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
```

  If the dashboard composer's placeholder differs, read it from
  `src/components/ChatPanel/ChatThread/Composer/Composer.tsx`.

- [ ] **Step 3: Run it on its own.**
  Run: `pnpm test:e2e agent-chat-result.spec.ts`
  Expected: PASS. On failure, open the screenshot and the trace before
  changing anything.

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/agent-chat-result.spec.ts
git commit -m "test(ai-agent): browser spec for agent results on a dashboard"
```

---

### Task 16: Try it in the real app

- [ ] **Step 1:** Start the app (see the `avandar-dev-server-ngrok`
  memory: if `pnpm dev` exits on ngrok, run Vite and the edge functions
  directly). Use the seeded user from `seed/SeedData.ts`.
- [ ] **Step 2:** In a headless Playwright MCP session, turn the switch on
  (`localStorage.setItem("avandar:data-agent", "on")`), then ask one real
  question from each of: the Data Explorer (result goes to the explorer),
  a dashboard ("show this chart by week"), a map page, and a case type
  page. Screenshot each into `.temp/feat-agent-default/`.
- [ ] **Step 3:** Confirm the case designer page still answers with
  today's chat (its kickoff card still appears on "New chat").
- [ ] **Step 4:** Note anything that looks wrong for the summary; fix
  only what this plan covers.

---

### Task 17: Docs and final checks

- [ ] **Step 1: Fold the planning decisions into the spec.** Update
  `docs/ai-agent/specs/phase-1a.md` with every row of "Decisions made
  while planning" above (case name never sent, tiles in page order, the
  unchanged line, no dataset ids, names kept, `run_query` unchanged,
  explorer SQL capped). Update D35's privacy bullet in `decisions.md` to
  say a case's name is never sent.
- [ ] **Step 2: Record results.** Add a "Phase 1A" subsection to
  `docs/ai-agent/eval.md` with the runs from Task 14 (correct, needless
  or missed questions, cost per question, input tokens, latency) and the
  `--questions P` command under "Reproducing every result".
- [ ] **Step 3: Update the roadmap and architecture.** Mark 1A done in
  `roadmap.md`. In `architecture.md` section 3, add the page block and the
  chat result part; in section 2's diagram, change "Data Explorer ->
  DuckDB-Wasm" to "Data Explorer or chat result -> DuckDB-Wasm". Update
  `README.md`'s "Try it": with the switch on, the agent answers on every
  page except the case designer.
- [ ] **Step 4: Full checks.**

```sh
pnpm exec tsc -b --noEmit
pnpm type-check:deno
pnpm lint
pnpm vitest run src/components/ChatPanel src/lib/agent shared supabase/functions/chat scripts/ai-eval
```

  Expected: all pass. Known flaky tests unrelated to this work:
  `CaseTypeDraftBlock.test.tsx` under full-suite load and the timing test
  in `withRateLimit`.

- [ ] **Step 5: Copy the docs to downloads.** Copy the updated spec and
  this plan to
  `/Users/pablo/jpsyx-downloads/avandar_agent-default/ai-agent/` and
  regenerate their PDFs with `markdown-to-pdf`.

- [ ] **Step 6: Commit.**

```bash
git add docs/ai-agent
git commit -m "docs(ai-agent): record phase 1A results and mark it done"
```

## Self-review notes

- Spec coverage: one agent everywhere (Task 10), page block (2, 5, 6, 9),
  host destination (8), result part stored and re-run (7, 11, 12),
  prompt v2 served beside v1 (3, 4), case designer excluded (10), offline
  unchanged (9 keeps offline without a block), errors (8 for failed and
  empty, 11 for unavailable, 3's rule for ambiguous "this", 6 for failed
  name loads), eval with P01 to P06 and the bar (13, 14), browser spec
  (15), docs (17).
- Every task ends with a commit that type-checks and passes its tests.
- Names used across tasks: `AgentPageContext`, `buildAgentPageContextBlock`,
  `buildAgentTurnText`, `PAGE_UNCHANGED_BLOCK`, `AgentQueryResult`
  (`PART_NAME`, `create`, `toDataPart`, `parse`), `AgentQueryResultData`,
  `showQueryInChat`, `createConversationAgentHost`,
  `AgentConversationState`, `DataAgentConversation`,
  `askConversationDataAgent({ conversations, turn, pageBlock,
  createConversation })`, `runDataAgentTurn(turn, page?)`,
  `AgentPageInputs`, `createAgentPageContext`, `createAgentPageNameLoader`,
  `DATA_AGENT_PROMPT_IDS`, `isDataAgentPromptId`.
