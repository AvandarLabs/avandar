# Unified Chat Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One workspace chat session across Data Explorer and Dashboards, with append-only hidden view events, a frozen prompt/tool prefix, localStorage persistence of the live thread, and an instant New chat control.

**Architecture:** Keep `useLocalRuntime`. Coalesce view snapshots into a trailing hidden user message (`startRun: false`) and freeze it by sending a real user turn after it. Persist committed messages (no trailing view event) per workspace+user. The edge function always sends the union system prompt and the full tool catalog; live SQL/errors/spatial docs/retry notes append as a turn suffix.

**Tech Stack:** TypeScript, React 19, assistant-ui `useLocalRuntime` 0.14, Mantine 9, Lingui, Vitest, Testing Library, Playwright, OpenRouter via `supabase/functions/chat`.

**Spec:** `docs/superpowers/specs/2026-08-17-unified-chat-sessions-design.md`

## Global Constraints

- One live thread per `(workspaceId, userId)`. Storage key: `ava.chat.thread.<workspaceId>.<userId>`.
- Persist only when both ids are present; otherwise memory-only.
- Full tool catalog every turn, stable order: `clarify`, `generateSql`, `addDashboardBlock`.
- Do not branch the system prompt or tools on `context.app`.
- Do not put last SQL, last error, result columns, spatial-docs-for-this-prompt, or retry notes in the system prompt.
- View events fire on app, route, open dataset id, and dashboard id only.
- Coalesce to at most one trailing pending view event between sends.
- `addDashboardBlock` applies only when `pageContext.dashboardId` is set.
- Data Manager composer stays disabled. New chat stays available.
- No session list, tabs, undo, or confirm on New chat.
- Lingui for every new displayable string. CSS Modules, no Tailwind.
- Do not edit `*.gen.*` or compiled `messages.ts` catalogs.
- Do not implement AVA-318 (targeted off-page apply / navigate).
- Red/green TDD. Do not commit, push, merge, or publish unless the user authorizes it.

## File structure

| File                                                                               | Responsibility                                                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/ChatPanel/ChatViewEvent/ChatViewEvent.ts`                          | Snapshot, format, equality, coalesce onto a message list, hidden metadata.        |
| `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.ts`                      | localStorage read/write/clear of committed `ThreadMessageLike[]`.                 |
| `src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.ts`          | Sync current page into the runtime via `thread.reset`.                            |
| `src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.tsx`                     | Title, New chat, Close.                                                           |
| `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`            | Frozen union prefix.                                                              |
| `supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.ts`           | Volatile turn suffix.                                                             |
| `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts` | Always-on tools.                                                                  |
| `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`       | Export spatial-docs helper; chat stops putting spatial docs in the prefix.        |
| `src/components/ChatPanel/useAvandarChatRuntime.ts`                                | Hydrate, persist, generation abort, skip bias on view events, dashboard-id guard. |
| `src/components/ChatPanel/useChatPageContext.ts`                                   | Classify `/data-manager` as `data-sources`.                                       |
| `src/components/ChatPanel/ChatThread/UserMessage/UserMessage.tsx`                  | Also hide view events.                                                            |
| `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx`        | Also hide view events (defensive).                                                |

---

### Task 1: ChatViewEvent snapshot, format, and coalesce

**Files:**

- Create: `src/components/ChatPanel/ChatViewEvent/ChatViewEvent.ts`
- Test: `src/components/ChatPanel/ChatViewEvent/ChatViewEvent.test.ts`

**Interfaces:**

- Produces: `ChatViewEvent.Snapshot`, `ChatViewEvent.CONTENT_PREFIX`, `ChatViewEvent.metadata`, `ChatViewEvent.isInternal`, `ChatViewEvent.isViewChangeContent`, `ChatViewEvent.equals`, `ChatViewEvent.format`, `ChatViewEvent.fromPageContext`, `ChatViewEvent.toThreadMessageLike`, `ChatViewEvent.applyToMessages`.

- [ ] **Step 1: Write the failing tests**

```ts
/** Behavioral tests for hidden chat view-change events. */
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { describe, expect, it } from "vitest";
import { ChatViewEvent } from "./ChatViewEvent";
import type { ThreadMessageLike } from "@assistant-ui/react";

const EXPLORER = ChatViewEvent.fromPageContext(
  ChatPageContext.createDataExplorerViewContext({
    openDatasetId: "ds-1",
    lastSql: "select 1",
    lastError: "boom",
  }),
  "/acme/data-explorer",
);

const DASHBOARD = ChatViewEvent.fromPageContext(
  ChatPageContext.createDashboardsViewContext({
    dashboardId: "11111111-1111-4111-8111-111111111111",
  }),
  "/acme/dashboards/edit/11111111-1111-4111-8111-111111111111",
);

describe("ChatViewEvent", () => {
  it("omits live SQL and errors from the snapshot", () => {
    expect(EXPLORER).toEqual({
      app: "data-explorer",
      route: "/acme/data-explorer",
      openDatasetId: "ds-1",
    });
    expect(EXPLORER).not.toHaveProperty("lastSql");
  });

  it("formats a stable view-changed line", () => {
    expect(ChatViewEvent.format(EXPLORER)).toBe(
      "[View changed: app=data-explorer; route=/acme/data-explorer; dataset=ds-1; dashboard=none]",
    );
    expect(ChatViewEvent.format(DASHBOARD)).toBe(
      "[View changed: app=dashboards; route=/acme/dashboards/edit/11111111-1111-4111-8111-111111111111; dataset=none; dashboard=11111111-1111-4111-8111-111111111111]",
    );
  });

  it("includes route, dataset, and dashboard in equality", () => {
    expect(ChatViewEvent.equals(EXPLORER, { ...EXPLORER })).toBe(true);
    expect(ChatViewEvent.equals(EXPLORER, DASHBOARD)).toBe(false);
    expect(
      ChatViewEvent.equals(EXPLORER, { ...EXPLORER, openDatasetId: "ds-2" }),
    ).toBe(false);
  });

  it("recognizes view-change content and metadata", () => {
    expect(
      ChatViewEvent.isViewChangeContent(ChatViewEvent.format(EXPLORER)),
    ).toBe(true);
    expect(ChatViewEvent.isViewChangeContent("How many rows?")).toBe(false);
    expect(ChatViewEvent.isInternal(ChatViewEvent.metadata)).toBe(true);
    expect(ChatViewEvent.isInternal(undefined)).toBe(false);
    expect(
      ChatViewEvent.isInternal({ custom: { isDiscoveryContinuation: true } }),
    ).toBe(false);
  });

  it("appends a trailing view event when the snapshot is new", () => {
    const next = ChatViewEvent.applyToMessages([], EXPLORER);
    expect(next).toHaveLength(1);
    expect(next[0]?.content).toBe(ChatViewEvent.format(EXPLORER));
    expect(next[0]?.metadata).toEqual(ChatViewEvent.metadata);
    expect(next[0]?.role).toBe("user");
  });

  it("replaces a trailing view event instead of stacking", () => {
    const first = ChatViewEvent.applyToMessages([], EXPLORER);
    const second = ChatViewEvent.applyToMessages(first, DASHBOARD);
    expect(second).toHaveLength(1);
    expect(second[0]?.content).toBe(ChatViewEvent.format(DASHBOARD));
  });

  it("does not add an event when the trailing view already matches", () => {
    const first = ChatViewEvent.applyToMessages([], EXPLORER);
    const second = ChatViewEvent.applyToMessages(first, EXPLORER);
    expect(second).toEqual(first);
  });

  it("appends a new view event after a real user message", () => {
    const withUser: ThreadMessageLike[] = [
      ...ChatViewEvent.applyToMessages([], EXPLORER),
      { role: "user", content: "count rows" },
    ];
    const next = ChatViewEvent.applyToMessages(withUser, DASHBOARD);
    expect(next).toHaveLength(3);
    expect(next[2]?.content).toBe(ChatViewEvent.format(DASHBOARD));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatViewEvent/ChatViewEvent.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `ChatViewEvent`**

```ts
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

export type ChatViewSnapshot = {
  app: ChatPageContext.ChatApp;
  route: string;
  openDatasetId?: string;
  dashboardId?: string;
};

const CONTENT_PREFIX = "[View changed:";

function _messageText(message: ThreadMessageLike): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  return message.content
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text";
    })
    .map((part) => {
      return part.text;
    })
    .join("\n");
}

function _isViewMessage(message: ThreadMessageLike): boolean {
  return ChatViewEvent.isViewChangeContent(_messageText(message));
}

export const ChatViewEvent = {
  CONTENT_PREFIX,

  metadata: {
    custom: {
      isViewChange: true,
    },
  } as const,

  isInternal: (
    messageMetadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  ): boolean => {
    return messageMetadata?.custom?.isViewChange === true;
  },

  isViewChangeContent: (content: string): boolean => {
    return content.startsWith(CONTENT_PREFIX);
  },

  fromPageContext: (
    pageContext: ChatPageContext.T,
    route: string,
  ): ChatViewSnapshot => {
    return {
      app: pageContext.app,
      route,
      ...(pageContext.openDatasetId
        ? { openDatasetId: pageContext.openDatasetId }
        : {}),
      ...(pageContext.dashboardId
        ? { dashboardId: pageContext.dashboardId }
        : {}),
    };
  },

  equals: (left: ChatViewSnapshot, right: ChatViewSnapshot): boolean => {
    return ChatViewEvent.format(left) === ChatViewEvent.format(right);
  },

  format: (snapshot: ChatViewSnapshot): string => {
    return `[View changed: app=${snapshot.app}; route=${snapshot.route}; dataset=${snapshot.openDatasetId ?? "none"}; dashboard=${snapshot.dashboardId ?? "none"}]`;
  },

  toThreadMessageLike: (snapshot: ChatViewSnapshot): ThreadMessageLike => {
    return {
      role: "user",
      content: ChatViewEvent.format(snapshot),
      metadata: ChatViewEvent.metadata,
    };
  },

  applyToMessages: (
    messages: readonly ThreadMessageLike[],
    snapshot: ChatViewSnapshot,
  ): ThreadMessageLike[] => {
    const formatted = ChatViewEvent.format(snapshot);
    const lastMessage = messages.at(-1);
    if (
      lastMessage &&
      _isViewMessage(lastMessage) &&
      _messageText(lastMessage) === formatted
    ) {
      return [...messages];
    }
    if (lastMessage && _isViewMessage(lastMessage)) {
      return [
        ...messages.slice(0, -1),
        ChatViewEvent.toThreadMessageLike(snapshot),
      ];
    }
    return [...messages, ChatViewEvent.toThreadMessageLike(snapshot)];
  },
};
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatViewEvent/ChatViewEvent.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatViewEvent/ChatViewEvent.ts src/components/ChatPanel/ChatViewEvent/ChatViewEvent.test.ts
git commit -m "Add ChatViewEvent coalesce for hidden view-change messages."
```

---

### Task 2: Hide view events in the transcript renderers

**Files:**

- Modify: `src/components/ChatPanel/ChatThread/UserMessage/UserMessage.tsx`
- Modify: `src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx`
- Modify: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx`
- Modify: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx`

**Interfaces:**

- Consumes: `ChatViewEvent.isInternal`, `DiscoveryContinuationMessage.isInternal`.

- [ ] **Step 1: Extend the failing renderer tests**

Add to `UserMessage.test.tsx`:

```ts
it("omits an internal view-change message", () => {
  messageState.metadata = {
    custom: { isViewChange: true },
  };

  render(<UserMessage />);

  expect(screen.queryByTestId("message-root")).not.toBeInTheDocument();
});
```

Add the same case to `AssistantMessage.test.tsx`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx`

Expected: FAIL on the new cases (message root still present).

- [ ] **Step 3: Omit view events**

In both renderers, hide when either helper matches:

```ts
const isHidden = useMessage((message) => {
  return (
    DiscoveryContinuationMessage.isInternal(message.metadata) ||
    ChatViewEvent.isInternal(message.metadata)
  );
});
```

Render `null` when `isHidden`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThread/UserMessage/UserMessage.tsx src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx
git commit -m "Hide view-change messages from the visible chat transcript."
```

---

### Task 3: ChatThreadStore localStorage slot

**Files:**

- Create: `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.ts`
- Test: `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

**Interfaces:**

- Produces: `ChatThreadStore.storageKey(workspaceId, userId)`, `read`, `write`, `clear`.
- `write` strips a trailing view-change message so pending events are not persisted.

- [ ] **Step 1: Write the failing tests**

```ts
/** Behavioral tests for the live chat thread localStorage slot. */
import { afterEach, describe, expect, it } from "vitest";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { ChatThreadStore } from "./ChatThreadStore";
import type { ThreadMessageLike } from "@assistant-ui/react";

const WORKSPACE_ID = "ws-1";
const USER_ID = "user-1";

afterEach(() => {
  window.localStorage.clear();
});

describe("ChatThreadStore", () => {
  it("round-trips committed messages including frozen view events", () => {
    const messages: ThreadMessageLike[] = [
      ChatViewEvent.toThreadMessageLike({
        app: "data-explorer",
        route: "/acme/data-explorer",
      }),
      { role: "user", content: "count rows" },
      { role: "assistant", content: "42" },
    ];
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual(messages);
  });

  it("does not persist a trailing pending view event", () => {
    const messages: ThreadMessageLike[] = [
      { role: "user", content: "count rows" },
      { role: "assistant", content: "42" },
      ChatViewEvent.toThreadMessageLike({
        app: "dashboards",
        route: "/acme/dashboards",
      }),
    ];
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual(messages.slice(0, 2));
  });

  it("returns an empty thread for missing or corrupt blobs", () => {
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
    window.localStorage.setItem(
      ChatThreadStore.storageKey(WORKSPACE_ID, USER_ID),
      "{not-json",
    );
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
  });

  it("clear deletes the slot", () => {
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages: [{ role: "user", content: "hi" }],
    });
    ChatThreadStore.clear({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the store**

Follow `ChatModelStorage` try/catch. Key: `` `ava.chat.thread.${workspaceId}.${userId}` ``.

`write`: if `workspaceId` or `userId` is empty, return. Clone messages, while the last message is a view-change (`ChatViewEvent.isViewChangeContent` on string content, or metadata `isViewChange`), pop it. `JSON.stringify({ messages })`. Catch quota errors and ignore.

`read`: parse `{ messages: ThreadMessageLike[] }`. If missing/invalid, return `[]`.

`clear`: `removeItem`. Catch and ignore.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThreadStore/ChatThreadStore.ts src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts
git commit -m "Persist the live chat thread in a per-user localStorage slot."
```

---

### Task 4: Frozen union prompt, always-on tools, turn suffix

**Files:**

- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`
- Create: `supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.ts`
- Create: `supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.test.ts`
- Create: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseClarify.test.ts`

**Interfaces:**

- Produces: `unifiedSystemPrefix` (or `buildUnifiedSystemPrefix()`), `buildChatTurnSuffix({ context, retryContext, lastUserPrompt })`.
- Produces: `makeChatToolConfigFromOptions({ clarificationCapReached })` with no app flags.
- Consumes: `buildSqlSystemPrompt` for schema only; spatial docs via a new export.

- [ ] **Step 1: Write failing tests**

`makeChatToolConfigFromOptions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeChatToolConfigFromOptions } from "./makeChatToolConfigFromOptions.ts";

describe("makeChatToolConfigFromOptions", () => {
  it("always advertises clarify, generateSql, and addDashboardBlock in that order", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
    });
    const tools = config.tools as Array<{ function: { name: string } }>;
    expect(tools.map((tool) => tool.function.name)).toEqual([
      "clarify",
      "generateSql",
      "addDashboardBlock",
    ]);
  });
});
```

`buildChatTurnSuffix.test.ts`:

```ts
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import { describe, expect, it } from "vitest";
import { buildChatTurnSuffix } from "./buildChatTurnSuffix.ts";
import { unifiedSystemPrefix } from "./buildSystemPrompts.ts";

describe("buildChatTurnSuffix", () => {
  it("puts live SQL and errors in the suffix, not the frozen prefix", () => {
    expect(unifiedSystemPrefix).not.toContain("Previous SQL");
    expect(unifiedSystemPrefix.toLowerCase()).not.toContain(
      "currently in the data explorer",
    );
    const suffix = buildChatTurnSuffix({
      context: ChatPageContext.createDataExplorerViewContext({
        lastSql: "select 1",
        lastError: "boom",
        lastResultColumns: [{ name: "n", dataType: "bigint" }],
      }),
      lastUserPrompt: "fix it",
    });
    expect(suffix).toContain("select 1");
    expect(suffix).toContain("boom");
    expect(suffix).toContain("n (bigint)");
  });
});
```

Add to `parseClarify.test.ts`:

```ts
it("does not count view-change lines as clarification answers", () => {
  expect(
    countClarificationsInHistory([
      {
        role: "user",
        content:
          "[View changed: app=data-explorer; route=/x; dataset=none; dashboard=none]",
      },
      { role: "user", content: "count rows" },
    ]),
  ).toBe(0);
});
```

Import `countClarificationsInHistory` in that test file if it is not already imported.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.test.ts supabase/functions/chat/PostChatMessages/parsing/parseClarify.test.ts`

Expected: FAIL (missing exports / still app-branched tools).

- [ ] **Step 3: Implement**

1. In `buildSqlSystemPrompt.ts`, export:

```ts
export function buildSpatialSqlDocumentation(prompt: string): string {
  if (!isSpatialPrompt(prompt)) {
    return "";
  }
  return `Reference documentation:\nIf the query requires any geospatial operations, refer to the following document:\n${DuckDbSpatialExtensionDocumentation}`;
}
```

Keep existing `buildSqlSystemPrompt` behavior for the queries function (still may attach spatial docs there). Chat will pass `prompt: ""` **or** you add `includeSpatialDocumentation = true` default for queries and `false` for chat. Prefer an options flag so chat never gets spatial in the prefix:

```ts
export function buildSqlSystemPrompt(args: {
  prompt: string;
  datasets: readonly Dataset[];
  columns: readonly DatasetColumn[];
  includeSpatialDocumentation?: boolean;
}): string;
```

Default `includeSpatialDocumentation` to `true` so queries stay unchanged. Chat passes `false`.

2. Replace `dataExplorerSystemPrefix` / `dashboardsSystemPrefix` / `genericSystemPrompt` usage in `PostChatMessages` with `unifiedSystemPrefix`: persona + SQL/clarify rules (without "The user is currently in the Data Explorer") + dashboard-block rules (without "The user is currently editing a dashboard") + a short note: `[View changed]` client messages tell you the active app, route, open dataset, and dashboard. Tools listed are always available.

3. `makeChatToolConfigFromOptions`:

```ts
export function makeChatToolConfigFromOptions(
  options: Readonly<{ clarificationCapReached: boolean }>,
): Record<string, unknown> {
  const tools = [
    ...buildDataExplorerToolDefinitions(options.clarificationCapReached),
    ...DASHBOARD_TOOL_DEFINITIONS,
  ];
  return { tools, tool_choice: "auto" };
}
```

Read `buildDataExplorerToolDefinitions` and concatenate so the OpenRouter `tools` array is exactly `clarify`, `generateSql`, `addDashboardBlock`. Do not rely on object-key order.

4. `buildChatTurnSuffix.ts`: return `""` or a block starting with `[Turn context]` containing previous SQL, error, result columns, spatial docs (`buildSpatialSqlDocumentation(lastUserPrompt)`), and `buildRetryContextNote(retryContext)` without wrapping it in the system prompt.

5. `PostChatMessages.ts`:

```ts
const sqlSystemPrompt = needsSchema
  ? buildSqlSystemPrompt({
      prompt: lastUserPrompt,
      datasets: schema.datasets,
      columns: schema.columns,
      includeSpatialDocumentation: false,
    })
  : "";

const systemContent = `${unifiedSystemPrefix}\n\n${sqlSystemPrompt}`;
const turnSuffix = buildChatTurnSuffix({
  context,
  retryContext,
  lastUserPrompt,
});
const requestBody = {
  model,
  messages: [
    { role: "system", content: systemContent },
    ...messages,
    ...(turnSuffix ? [{ role: "user", content: turnSuffix }] : []),
  ],
  temperature: 0.3,
};
Object.assign(
  requestBody,
  makeChatToolConfigFromOptions({ clarificationCapReached }),
);
```

Keep fetching schema when `app` is data-explorer **or** dashboards **or** whenever tools need it. Because tools are always on, fetch schema on every chat request (still cheap relative to a cache bust). Set `needsSchema = true` always in this handler.

Update `parseOpenRouterResponse` callers: `isDataExplorer` / `isDashboards` currently gate parsing. Keep parsing **both** SQL and dashboard blocks on every turn so whichever tool the model called works. Pass `isDataExplorer: true, isDashboards: true` into `parseOpenRouterResponse` (or simplify that function in this task if flags become unused).

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.test.ts supabase/functions/chat/PostChatMessages/parsing/parseClarify.test.ts`

Expected: PASS.

Also run any existing `buildSqlSystemPrompt` / queries tests if present so spatial docs still attach on the queries endpoint.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.ts supabase/functions/chat/PostChatMessages/prompt/buildChatTurnSuffix.test.ts supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts supabase/functions/chat/PostChatMessages/PostChatMessages.ts supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts supabase/functions/chat/PostChatMessages/parsing/parseClarify.test.ts
git commit -m "Freeze the chat system prompt and always advertise the full tool catalog."
```

---

### Task 5: Classify Data Manager as `data-sources`

**Files:**

- Modify: `src/components/ChatPanel/useChatPageContext.ts`
- Create: `src/components/ChatPanel/useChatPageContext/useChatPageContext.test.ts`

Put the test beside the hook. If the hook file stays at `useChatPageContext.ts`, colocate as `useChatPageContext.test.ts` in the same directory (`src/components/ChatPanel/useChatPageContext.test.ts`).

**Interfaces:**

- Consumes: existing `ChatPageContext.createDataSourcesViewContext`.
- Produces: `app: "data-sources"` for `/data-manager` routes.

- [ ] **Step 1: Write a failing test of a pure helper**

Extract `chatPageContextFromPathname` from the hook so the test does not need the router:

```ts
/** Maps a workspace pathname plus explorer state into ChatPageContext. */
export function chatPageContextFromPathname(args: {
  pathname: string;
  openDatasetId?: string;
  lastSql?: string;
  lastResultColumns?: ChatPageContext.ResultColumn[];
  lastError?: string;
}): ChatPageContext.T;
```

Test:

```ts
it("classifies data-manager routes as data-sources", () => {
  expect(
    chatPageContextFromPathname({
      pathname: "/acme/data-manager",
    }).app,
  ).toBe("data-sources");
  expect(
    chatPageContextFromPathname({
      pathname: "/acme/data-manager/data-import",
    }).app,
  ).toBe("data-sources");
});
```

Keep existing explorer/dashboard behavior.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/useChatPageContext.test.ts`

Expected: FAIL (`/data-manager` currently becomes `other`).

- [ ] **Step 3: Implement**

```ts
if (
  pathname.includes("/data-manager") ||
  pathname.includes("/data-import") ||
  pathname.includes("/data-sources")
) {
  return ChatPageContext.createDataSourcesViewContext();
}
```

Hook becomes a thin wrapper around `chatPageContextFromPathname`.

- [ ] **Step 4: Run the test and make sure it passes**

Run: `pnpm exec vitest run src/components/ChatPanel/useChatPageContext.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useChatPageContext.ts src/components/ChatPanel/useChatPageContext.test.ts
git commit -m "Classify Data Manager routes as the data-sources chat app."
```

---

### Task 6: Sync view events into the live thread

**Files:**

- Create: `src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.ts`
- Create: `src/components/ChatPanel/useChatViewTranscript/threadMessagesToLikes.ts`
- Modify: `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`

**Interfaces:**

- Consumes: `ChatViewEvent.applyToMessages`, `useChatPageContext`, `useRouterState` pathname, `useThreadRuntime`.
- Produces: a hook that calls `thread.reset(next)` when the coalesced list changes. Never `startRun`.

- [ ] **Step 1: Write failing tests for the message conversion + apply used by the hook**

Test `threadMessagesToLikes` + `ChatViewEvent.applyToMessages` with a fake `ThreadMessage` shape (id, role, content parts, metadata). Assert `reset` payload:

- empty thread + explorer snapshot → one view message
- replacing dashboard snapshot replaces that one message
- after a user text message, a new view message is appended

Keep this in `useChatViewTranscript/useChatViewTranscript.test.ts` as a function `nextThreadMessages(messages, snapshot)` re-exported from the hook module for tests:

```ts
export function nextThreadMessages(
  messages: readonly ThreadMessageLike[],
  snapshot: ChatViewSnapshot,
): ThreadMessageLike[] {
  return ChatViewEvent.applyToMessages(messages, snapshot);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.test.ts`

Expected: FAIL until the module exists.

- [ ] **Step 3: Implement the hook**

```ts
export function useChatViewTranscript(): void {
  const threadRuntime = useThreadRuntime();
  const pageContext = useChatPageContext();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const snapshot = ChatViewEvent.fromPageContext(pageContext, pathname);

  useEffect(() => {
    const current = threadRuntime.getState().messages.map(threadMessageToLike);
    const next = ChatViewEvent.applyToMessages(current, snapshot);
    if (JSON.stringify(current) === JSON.stringify(next)) {
      return;
    }
    threadRuntime.reset(next);
  }, [
    pathname,
    pageContext.app,
    pageContext.openDatasetId,
    pageContext.dashboardId,
    snapshot,
    threadRuntime,
  ]);
}
```

`threadMessageToLike` must copy `metadata.custom` so discovery internals and view events survive `reset`.

Mount inside `AssistantRuntimeProvider` in `ChatPanel.tsx`:

```tsx
<AssistantRuntimeProvider runtime={runtime}>
  <ChatViewTranscriptSync />
  <ChatThread />
</AssistantRuntimeProvider>
```

`ChatViewTranscriptSync` is a one-line component that calls the hook and returns `null`.

Do not depend on `lastSql` / `lastError` / `lastResultColumns` in the effect, or every query will rewrite the thread.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.test.ts src/components/ChatPanel/ChatViewEvent/ChatViewEvent.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.ts src/components/ChatPanel/useChatViewTranscript/useChatViewTranscript.test.ts src/components/ChatPanel/ChatPanel/ChatPanel.tsx
git commit -m "Append coalesced hidden view events when the user changes pages."
```

---

### Task 7: Runtime hydrate, persist, abort-on-new-chat, bias skip, dashboard-id guard

**Files:**

- Modify: `src/components/ChatPanel/useAvandarChatRuntime.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent.test.ts`
- Modify: `src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.ts` only if you move the dashboard guard into apply; prefer keeping it in the `queueDashboardBlock` closure.

**Interfaces:**

- Consumes: `ChatThreadStore.read/write/clear`, `ChatViewEvent.isViewChangeContent`, `runtime.thread.export`, `runtime.thread.reset`, `runtime.thread.cancelRun`.
- Produces: `useAvandarChatRuntime()` still returns `useLocalRuntime(...)`, plus a `startNewChat()` function. Easiest API: return `{ runtime, startNewChat }` and update `ChatPanel`.

- [ ] **Step 1: Write failing tests**

```ts
/** View-change lines must not go through user-message bias/consent. */
import { describe, expect, it } from "vitest";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { shouldSkipUserMessageConsent } from "./shouldSkipUserMessageConsent";

describe("shouldSkipUserMessageConsent", () => {
  it("skips view-change and clarification-answer lines", () => {
    expect(
      shouldSkipUserMessageConsent(
        ChatViewEvent.format({
          app: "data-explorer",
          route: "/acme/data-explorer",
        }),
      ),
    ).toBe(true);
    expect(
      shouldSkipUserMessageConsent("[Clarification answer: California]"),
    ).toBe(true);
    expect(shouldSkipUserMessageConsent("count rows")).toBe(false);
  });
});
```

Add an `applyChatTurnResponse` test only if you change that module. For the dashboard guard, extract:

```ts
export function shouldQueueDashboardBlock(
  dashboardId: string | undefined,
): boolean {
  return dashboardId !== undefined && dashboardId.length > 0;
}
```

Test: `undefined` → false; uuid → true.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent.test.ts`

Expected: FAIL.

- [ ] **Step 3: Wire the runtime**

1. `shouldSkipUserMessageConsent`: true if `ChatViewEvent.isViewChangeContent` or existing `CLARIFICATION_ANSWER_RE`.

2. In `run()`, skip bias/consent when `shouldSkipUserMessageConsent(lastUserMsg.content)`. Also skip `chat.message_sent` analytics for view-change lines.

3. `queueDashboardBlock`: if `!shouldQueueDashboardBlock(currentPageContext.dashboardId)` return without `queuePendingBlock`. Still fine to skip analytics for a dropped block.

4. Hydrate:

```ts
const initialMessages =
  user && workspace.id
    ? ChatThreadStore.read({ workspaceId: workspace.id, userId: user.id })
    : [];
return useLocalRuntime(adapter, { initialMessages });
```

Read initial messages once (useState lazy init) so later writes do not reset the runtime.

5. After a successful `applyResponse` (and after offline apply), persist:

```ts
const exported = runtimeRef.current.thread
  .getState()
  .messages.map(threadMessageToLike);
ChatThreadStore.write({
  workspaceId,
  userId: currentUser.id,
  messages: exported,
});
```

You cannot call `runtime.thread` inside the adapter before `useLocalRuntime` returns. Use a `runtimeRef` assigned after `useLocalRuntime`, and persist in a `useEffect` that subscribes to `runtime.thread.subscribe` and writes when `isRunning` flips to false. Strip trailing view events via `ChatThreadStore.write`.

6. Generation abort: `chatGenerationRef`. `startNewChat`:

```ts
chatGenerationRef.current += 1;
runtime.thread.cancelRun();
runtime.thread.reset([]);
ChatThreadStore.clear({ workspaceId, userId });
chatPanelDispatch.setPendingClarification(undefined);
```

At the start of `run()`, capture `generation = chatGenerationRef.current`. Before returning a result, if `chatGenerationRef.current !== generation`, return `{ content: [] }` (do not persist, do not apply SQL).

7. Change the hook return type to `{ runtime, startNewChat }`. Update `ChatPanel` to pass `runtime` into the provider.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent.test.ts src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

Expected: PASS.

Manually typecheck the hook: `pnpm exec tsc -b --pretty false` if it is fast enough, or rely on the next UI task compile.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime.ts src/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent src/components/ChatPanel/ChatPanel/ChatPanel.tsx
git commit -m "Hydrate, persist, and abort the live chat thread on New chat."
```

---

### Task 8: New chat header button

**Files:**

- Create: `src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.tsx`
- Create: `src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.test.tsx`
- Modify: `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`

**Interfaces:**

- Consumes: `startNewChat`, `dispatch.close`.
- Produces: translated New chat control left of Close.

- [ ] **Step 1: Write the failing header test**

```tsx
/** Behavioral tests for the chat panel header New chat control. */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { ChatPanelHeader } from "./ChatPanelHeader";

describe("ChatPanelHeader", () => {
  it("invokes onNewChat from the header control", async () => {
    const user = userEvent.setup();
    const onNewChat = vi.fn();
    const onClose = vi.fn();
    render(<ChatPanelHeader onNewChat={onNewChat} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.test.tsx`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the header**

Match the existing Close `ActionIcon` (`variant="subtle"`, `size="sm"`, `color="neutral"`). Use `IconPlus` from Tabler. Tooltip + `aria-label`: `t\`New chat\``. Order: title group on the left; on the right, New chat then Close.

Do not confirm. Do not disable the button when the composer is disabled.

Wire in `ChatPanel`:

```tsx
<ChatPanelHeader onNewChat={startNewChat} onClose={dispatch.close} />
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `pnpm exec vitest run src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatPanelHeader src/components/ChatPanel/ChatPanel/ChatPanel.tsx
git commit -m "Add an instant New chat button to the chat panel header."
```

---

### Task 9: Offline prompts stop claiming a single current app

**Files:**

- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`

**Interfaces:**

- Consumes: same `pageContext` for open-dataset SQL hints only.
- Produces: analyze prompt without "The user is in the Data Explorer" / "editing a dashboard" exclusive framing.

- [ ] **Step 1: Write a failing test**

```ts
it("does not lock the offline analyze prompt to a single app", () => {
  const prompt = buildOfflineAnalyzePrompt({
    schema: SCHEMA,
    pageContext: ChatPageContext.createDashboardsViewContext({
      dashboardId: "11111111-1111-4111-8111-111111111111",
    }),
    lastUserPrompt: "deaths",
  });
  expect(prompt.toLowerCase()).not.toContain("currently");
  expect(prompt).toContain("offline assistant");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`

Expected: FAIL (dashboards surface sentence still present).

- [ ] **Step 3: Replace the `surface` sentence** with a stable line: tools/SQL are available; `[View changed]` messages (already in `lastUserPrompt` history via the thread) describe the UI. Keep `formatOpenDatasetHint` and `formatSqlTurnContext` (those are per-turn suffixes, not a frozen prefix). Keep `formatSqlOutputInstruction` if it still helps SQL-only output; it may still branch on app for output shape. If it branches, leave it: that is output instruction for this turn, appended after the user question, not the cached system prefix.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts
git commit -m "Stop branching the offline chat analyze prompt on the current app."
```

---

### Task 10: E2E unified session, New chat, reload, Data Manager

**Files:**

- Modify: `tests/e2e/helpers/chatPanelFlow.ts`
- Create: `tests/e2e/unified-chat-session.spec.ts`

**Interfaces:**

- Consumes: existing `e2e.fixture`, `mountMockChat` pattern from `tests/e2e/chat-interactive-workflows.spec.ts`, `seedDashboard`.

- [ ] **Step 1: Extend chat panel helpers**

```ts
export function getChatComposerInput(page: Page): Locator {
  return page.getByPlaceholder(
    /ask about your data|ask me to add a chart to this dashboard/i,
  );
}

export function getNewChatButton(page: Page): Locator {
  return page.getByRole("button", { name: /new chat/i });
}

export function getChatPanel(): ... use getByRole('complementary') or the Ask Avandar heading
```

Visible user bubbles: `page.getByText("42 rows")` from mocked `assistantText`. View-change strings must **not** be visible: `expect(page.getByText(/View changed:/)).toHaveCount(0)`.

Copy `mountMockChat` into the spec (do not import from the other spec). Return assistant text `"From explorer"` then `"From dashboard"` based on `turnIndex`.

- [ ] **Step 2: Write the spec (this is the test; no production code unless a helper is missing)**

Four tests, local timeout default (do not raise above 45s):

1. Send in Data Explorer, open seeded dashboard edit, send again: both assistant strings visible; no `View changed` text.
2. After a send, click New chat: explorer assistant text gone; empty-state "Ask about your data" (or dashboard equivalent) visible.
3. After a send, `page.reload()`, open chat: assistant text restored.
4. After a send, goto Data Manager: composer disabled (`toBeDisabled()`), assistant text still visible, New chat still enabled.

Seed dashboard in tests 1 via `seedDashboard` before UI, then `page.goto(\`/${slug}/dashboards/edit/${id}\`)`.

Sign in with `e2eWorkerDb.primaryUser` like `dashboard-chat-block.spec.ts`.

- [ ] **Step 3: Run one test at a time**

```bash
pnpm test:e2e tests/e2e/unified-chat-session.spec.ts
```

If the file has four tests, run with `-g` one title at a time first.

Expected: PASS. If reload fails because persist writes after `isRunning` false never fired, fix the persist subscription from Task 7 (write on `runEnd` / `isRunning` false, and also at the end of `applyResponse`).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/chatPanelFlow.ts tests/e2e/unified-chat-session.spec.ts
git commit -m "Cover unified chat session, New chat, and reload in Playwright."
```

---

## Spec coverage

| Spec requirement                                              | Task                    |
| ------------------------------------------------------------- | ----------------------- |
| Hidden coalesced view events (app, route, dataset, dashboard) | 1, 6                    |
| Hidden from UI                                                | 2                       |
| Not counted as clarifications                                 | 4 (`parseClarify` test) |
| Skip bias/consent                                             | 7                       |
| Frozen union system prompt + full tools                       | 4                       |
| Turn suffix for SQL/error/columns/spatial/retry               | 4                       |
| Persist committed thread; not pending                         | 3, 7                    |
| New chat instant discard + abort in-flight                    | 7, 8                    |
| Header New chat left of Close                                 | 8                       |
| Data Manager disabled composer, thread remains                | 5, 10                   |
| `addDashboardBlock` requires dashboard id                     | 7                       |
| Offline prefix not app-locked                                 | 9                       |
| E2E same thread / new chat / reload / Data Manager            | 10                      |
| AVA-318 / history UI / confirm                                | out of scope            |
