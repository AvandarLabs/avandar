# Seamless Discovery Transcript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep successful auto-discovery questions and answers out of the
visible chat transcript while showing neutral progress and preserving the
existing continuation pipeline.

**Architecture:** Tag discovery-only continuation messages with custom
assistant-ui metadata and omit tagged messages in the user and assistant
renderers. Keep the messages in thread state for model context, and let the
pending discovery state decide when the clarification header becomes visible.

**Tech Stack:** TypeScript, React, assistant-ui, Mantine, Lingui, Vitest,
Testing Library, Playwright.

## Global Constraints

- Preserve candidate generation and normalized exact-match semantics.
- Preserve the local-data privacy boundary and consent requirements.
- Keep manual and non-discovery clarification transcript behavior unchanged.
- Use Lingui for every new displayable string.
- Use CSS Modules instead of inline styles.
- Do not edit generated `*.gen.*` files or compiled `messages.ts` catalogs.
- Do not commit, push, merge, or publish unless the user authorizes it.
- Do not modify unrelated files already dirty in the worktree.

---

### Task 1: Mark internal discovery continuation messages

**Files:**

- Create: `src/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage.ts`
- Create: `src/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage.test.ts`
- Modify: `src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.ts`
- Test: `src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts`

**Interfaces:**

- Produces: `DiscoveryContinuationMessage.metadata`, a readonly assistant-ui
  metadata object with `custom.isDiscoveryContinuation: true`.
- Produces: `DiscoveryContinuationMessage.isInternal(metadata): boolean`.
- Consumes: `ChatModelRunResult["metadata"]` and `ThreadMessage["metadata"]`.

- [ ] **Step 1: Add failing metadata behavior tests**

Create the module test with behavioral assertions:

```ts
/** Behavioral tests for internal discovery continuation metadata. */
import { describe, expect, it } from "vitest";
import { DiscoveryContinuationMessage } from "./DiscoveryContinuationMessage";

describe("DiscoveryContinuationMessage", () => {
  it("recognizes only explicitly tagged continuation metadata", () => {
    expect(
      DiscoveryContinuationMessage.isInternal(
        DiscoveryContinuationMessage.metadata,
      ),
    ).toBe(true);
    expect(DiscoveryContinuationMessage.isInternal(undefined)).toBe(false);
    expect(
      DiscoveryContinuationMessage.isInternal({ custom: { other: true } }),
    ).toBe(false);
  });
});
```

Add this separate case to `applyChatTurnResponse.test.ts`:

```ts
it("marks a discovery clarification as an internal continuation", async () => {
  const handlers = _createHandlers();
  const response = Model.make("ChatResponse", {
    assistantText: "Which stored state represents California?",
    clarification: {
      question: "Which stored state represents California?",
      responseShape: {
        kind: "discovery",
        query: 'SELECT DISTINCT "state" FROM "mortality"',
        column: "state",
        multi: false,
        candidateValues: ["California", "CA"],
      },
      turnNumber: 1,
    },
  });

  const result = await applyChatTurnResponse({
    response,
    sqlApplied: false,
    handlers,
  });

  expect(result.metadata?.custom).toEqual({
    isDiscoveryContinuation: true,
  });
});

it("keeps an ordinary clarification visible", async () => {
  const handlers = _createHandlers();
  const response = Model.make("ChatResponse", {
    assistantText: "Which period?",
    clarification: {
      question: "Which period?",
      responseShape: {
        kind: "fixed_options",
        options: ["This month", "Last month"],
        multi: false,
      },
      turnNumber: 1,
    },
  });

  const result = await applyChatTurnResponse({
    response,
    sqlApplied: false,
    handlers,
  });

  expect(result.metadata).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```bash
pnpm test:frontend -- \
  src/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage.test.ts \
  src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts
```

Expected: FAIL because `DiscoveryContinuationMessage` does not exist and the
discovery response does not contain custom metadata.

- [ ] **Step 3: Implement the metadata contract**

Create `DiscoveryContinuationMessage.ts`:

```ts
type MessageMetadata =
  | {
      readonly custom?: Record<string, unknown>;
    }
  | undefined;

const metadata = {
  custom: {
    isDiscoveryContinuation: true,
  },
} as const;

function _isInternal(messageMetadata: MessageMetadata): boolean {
  return messageMetadata?.custom?.isDiscoveryContinuation === true;
}

/** Identifies model-facing discovery messages hidden from the transcript. */
export const DiscoveryContinuationMessage = {
  metadata,
  isInternal: _isInternal,
};
```

In `applyChatTurnResponse.ts`, import the module and attach metadata only to a
discovery clarification result:

```ts
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";

const isDiscoveryContinuation =
  response.clarification?.responseShape.kind === "discovery";

return {
  content: assistantParts,
  ...(isDiscoveryContinuation
    ? { metadata: DiscoveryContinuationMessage.metadata }
    : {}),
};
```

- [ ] **Step 4: Run the focused tests and verify green**

Run the command from Step 2.

Expected: both test files PASS with no warnings.

---

### Task 2: Hide only automatic discovery answers

**Files:**

- Modify: `src/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer.ts`
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.tsx`
- Modify: `src/components/ChatPanel/PendingClarificationBlock/useClarificationSubmission.ts`
- Test: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx`
- Test: `src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx`

**Interfaces:**

- Produces: `ClarificationSubmissionOptions` with optional
  `isInternalDiscovery: boolean`.
- Changes: `ClarificationAnswerHandler(answer, options?)` accepts the submission
  presentation options.
- Consumes: `DiscoveryContinuationMessage.metadata` from Task 1.

- [ ] **Step 1: Add failing automatic-versus-manual submission tests**

Update the unique-match expectation in `DiscoveryBody.test.tsx`:

```ts
await waitFor(() => {
  expect(onSubmit).toHaveBeenCalledWith(
    {
      kind: "preset",
      value: "California",
    },
    { isInternalDiscovery: true },
  );
});
```

Update the clarification-card mock harness in
`PendingClarificationBlock.test.tsx` so `onAnswer` accepts the optional second
argument, then add this test:

```ts
it("hides an accepted automatic discovery answer from presentation", async () => {
  useStateMock.mockReturnValue({
    pendingClarification: {
      ...pendingClarification,
      responseShape: {
        kind: "discovery",
        query: 'SELECT DISTINCT "state" FROM "mortality"',
        column: "state",
        multi: false,
        candidateValues: ["California", "CA"],
      },
    },
  });
  decideIfDataCanCrossBoundaryMock.mockResolvedValue({ approved: true });
  render(<PendingClarificationBlock />);

  await act(async () => {
    await clarificationCardHarness.onAnswer?.(
      { kind: "preset", value: "California" },
      { isInternalDiscovery: true },
    );
  });

  expect(appendMock).toHaveBeenCalledWith({
    role: "user",
    content: [
      { type: "text", text: "[Clarification answer: California]" },
    ],
    metadata: {
      custom: { isDiscoveryContinuation: true },
    },
  });
});
```

Strengthen the existing answered-outcome test with this assertion so manual
answers remain visible:

```ts
expect(appendMock).toHaveBeenCalledWith("[Clarification answer: First]");
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```bash
pnpm test:frontend -- \
  src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx \
  src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx
```

Expected: FAIL because automatic submission has no visibility option and all
answers are appended as visible strings.

- [ ] **Step 3: Add the submission option and hidden append shape**

Add these types to `ClarificationAnswer.ts`:

```ts
/** Controls transcript presentation for an accepted clarification answer. */
export type ClarificationSubmissionOptions = {
  isInternalDiscovery?: boolean;
};

/** Handles a clarification answer and reports whether it was accepted. */
export type ClarificationAnswerHandler = (
  answer: ClarificationSubmitAnswer,
  options?: Readonly<ClarificationSubmissionOptions>,
) => boolean | void | Promise<boolean | void>;
```

In `DiscoveryBody.tsx`, mark only the unique automatic match:

```ts
const onUniqueMatch = useCallback(
  (storedValue: string) => {
    return onSubmit(
      { kind: "preset", value: storedValue },
      { isInternalDiscovery: true },
    );
  },
  [onSubmit],
);
```

Update `useClarificationSubmission.ts` to accept the second argument and append
the accepted answer in one of two forms:

```ts
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import type {
  ClarificationSubmissionOptions,
  ClarificationSubmitAnswer,
} from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";

): (
  answer: ClarificationSubmitAnswer,
  options?: Readonly<ClarificationSubmissionOptions>,
) => Promise<boolean> {

const answerText = ClarificationAnswer.formatForThread(resolvedAnswer);
runtime?.append(
  options?.isInternalDiscovery ?
    {
      role: "user",
      content: [{ type: "text", text: answerText }],
      metadata: DiscoveryContinuationMessage.metadata,
    }
  : answerText,
);
```

- [ ] **Step 4: Run the focused tests and verify green**

Run the command from Step 2.

Expected: both test files PASS. The consent-rejected automatic path still
returns `false` and does not append a message.

---

### Task 3: Omit internal messages from both transcript renderers

**Files:**

- Modify: `src/components/ChatPanel/ChatThread/UserMessage/UserMessage.tsx`
- Create: `src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx`
- Modify: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx`
- Create: `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx`

**Interfaces:**

- Consumes: `DiscoveryContinuationMessage.isInternal(metadata)` from Task 1.
- Consumes: assistant-ui `useMessage` selectors.

- [ ] **Step 1: Add failing renderer tests**

Create `UserMessage.test.tsx`:

```ts
/** Behavioral tests for user transcript message visibility. */
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { UserMessage } from "./UserMessage";

const { messageState } = vi.hoisted(() => {
  return {
    messageState: {
      metadata: { custom: {} } as {
        custom: Record<string, unknown>;
      },
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useMessage: (
      selector: (state: typeof messageState) => unknown,
    ): unknown => {
      return selector(messageState);
    },
    MessagePrimitive: {
      Root: ({ children }: { children: ReactNode }) => {
        return <div data-testid="message-root">{children}</div>;
      },
      Parts: () => {
        return <span>Message content</span>;
      },
    },
  };
});

describe("UserMessage", () => {
  beforeEach(() => {
    messageState.metadata = { custom: {} };
  });

it("omits an internal discovery continuation", () => {
  messageState.metadata = {
    custom: { isDiscoveryContinuation: true },
  };

  const { container } = render(<UserMessage />);

  expect(container).toBeEmptyDOMElement();
});

it("renders an ordinary transcript message", () => {
  render(<UserMessage />);

  expect(screen.getByTestId("message-root")).toBeVisible();
});
});
```

Create `AssistantMessage.test.tsx`:

```ts
/** Behavioral tests for assistant transcript message visibility. */
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { AssistantMessage } from "./AssistantMessage";

const { messageState } = vi.hoisted(() => {
  return {
    messageState: {
      metadata: { custom: {} } as {
        custom: Record<string, unknown>;
      },
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useMessage: (
      selector: (state: typeof messageState) => unknown,
    ): unknown => {
      return selector(messageState);
    },
    MessagePrimitive: {
      Root: ({ children }: { children: ReactNode }) => {
        return <div data-testid="message-root">{children}</div>;
      },
      If: ({ children }: { children: ReactNode }) => {
        return <>{children}</>;
      },
      Parts: () => {
        return <span>Message content</span>;
      },
    },
    ActionBarPrimitive: {
      Root: ({ children }: { children: ReactNode }) => {
        return <div>{children}</div>;
      },
      Reload: ({ children }: { children: ReactNode }) => {
        return <button type="button">{children}</button>;
      },
    },
  };
});

describe("AssistantMessage", () => {
  beforeEach(() => {
    messageState.metadata = { custom: {} };
  });

  it("omits an internal discovery continuation", () => {
    messageState.metadata = {
      custom: { isDiscoveryContinuation: true },
    };

    const { container } = render(<AssistantMessage />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders an ordinary transcript message", () => {
    render(<AssistantMessage />);

    expect(screen.getByTestId("message-root")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the renderer tests and verify red**

Run:

```bash
pnpm test:frontend -- \
  src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx \
  src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx
```

Expected: FAIL because both renderers still create visible message rows for
tagged messages.

- [ ] **Step 3: Add the internal-message guard to each renderer**

Import `useMessage` and `DiscoveryContinuationMessage` in both files. At the
top of each component, add:

```ts
const isInternalDiscovery = useMessage((message) => {
  return DiscoveryContinuationMessage.isInternal(message.metadata);
});
if (isInternalDiscovery) {
  return null;
}
```

Keep the existing visible JSX unchanged after the guard.

- [ ] **Step 4: Run the renderer tests and verify green**

Run the command from Step 2.

Expected: all four renderer cases PASS with no React warnings.

---

### Task 4: Show neutral progress and defer the question header

**Files:**

- Modify: `src/components/ChatPanel/ClarificationCard/ClarificationCard.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/ClarificationCardBody.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryStateBody.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryLoadingBody.tsx`
- Test: `src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx`
- Regenerate: `src/i18n/locales/*/messages.po`

**Interfaces:**

- Adds: `discoveryHeader?: React.ReactNode` on `ClarificationCardBody`.
- Adds: `header: React.ReactNode` on `DiscoveryBody` and
  `DiscoveryStateBody`.
- Changes: `DiscoveryLoadingBody` takes no column or attempt props and renders
  neutral translated progress.

- [ ] **Step 1: Add failing loading and fallback presentation tests**

Define a deferred resolver in `DiscoveryBody.test.tsx`, pass
`header={<h2>Which stored state represents California?</h2>}` to every
`DiscoveryBody`, and add:

```ts
it("shows neutral progress without exposing the question while loading", () => {
  const pendingResult = new Promise<{ values: string[] }>(() => undefined);
  render(
    <DiscoveryBody
      {...DISCOVERY_PROPS}
      header={<h2>Which stored state represents California?</h2>}
      candidateValues={["California", "CA"]}
      resolveDiscovery={vi.fn().mockReturnValue(pendingResult)}
      onSubmit={vi.fn()}
    />,
  );

  expect(screen.getByText("Checking your data…")).toBeVisible();
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  expect(
    screen.queryByText("Which stored state represents California?"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/California/)).not.toBeInTheDocument();
  expect(screen.queryByText(/state/i)).not.toBeInTheDocument();
});
```

Strengthen the ambiguous and declined cases:

```ts
expect(
  await screen.findByText("Which stored state represents California?"),
).toBeVisible();
```

- [ ] **Step 2: Run the discovery component test and verify red**

Run:

```bash
pnpm test:frontend -- \
  src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx
```

Expected: FAIL because the loading copy exposes the column and the header is
currently rendered before discovery state is known.

- [ ] **Step 3: Move discovery header presentation under discovery state**

In `ClarificationCard.tsx`, create the header once. For a discovery response,
render `ClarificationCardBody` directly and pass it as `discoveryHeader`. Keep
the existing header followed by the scrollable body wrapper for every other
response shape:

```tsx
const header = (
  <ClarificationCardHeader
    question={question}
    rationale={rationale}
    turnNumber={turnNumber}
  />
);
const body = (
  <ClarificationCardBody
    responseShape={responseShape}
    onAnswer={onAnswer}
    resolveDiscovery={resolveDiscovery}
    onRequestDifferentDiscovery={onRequestDifferentDiscovery}
    discoveryHeader={header}
  />
);

return (
  <Paper shadow="xs" radius="md" p="md" bg="blue.0">
    <Stack gap="sm">
      {responseShape.kind === "discovery" ? (
        body
      ) : (
        <>
          {header}
          <div
            className={css.clarificationCardBody}
            data-testid="clarification-card-body"
          >
            {body}
          </div>
        </>
      )}
    </Stack>
  </Paper>
);
```

Add the prop to `ClarificationCardBody` and pass it into the discovery branch:

```tsx
type Props = {
  responseShape: ChatClarifyResponseShape;
  onAnswer: ClarificationAnswerHandler;
  resolveDiscovery?: DiscoveryResolver;
  onRequestDifferentDiscovery?: () => void;
  discoveryHeader?: React.ReactNode;
};

export function ClarificationCardBody({
  responseShape,
  onAnswer,
  resolveDiscovery,
  onRequestDifferentDiscovery,
  discoveryHeader,
}: Readonly<Props>): React.ReactNode {
```

The discovery match arm passes the node explicitly:

```tsx
<DiscoveryBody
  header={discoveryHeader}
  query={query}
  column={column}
  multi={multi}
  candidateValues={candidateValues}
  resolveDiscovery={resolveDiscovery}
  onRequestDifferentDiscovery={onRequestDifferentDiscovery}
  onSubmit={onAnswer}
/>
```

Add `header: React.ReactNode` to `DiscoveryBody`'s `Props`, destructure it, and
pass it to the state renderer:

```tsx
<DiscoveryStateBody
  discoveryState={discoveryState}
  header={header}
  column={column}
  multi={multi}
  queryPreview={queryPreview}
  onRequestDifferentDiscovery={onRequestDifferentDiscovery}
  onSubmit={onSubmit}
/>
```

Replace `DiscoveryStateBody.tsx` with the complete state-owned layout:

```tsx
import { match } from "ts-pattern";
import { DiscoveryLoadingBody } from "./DiscoveryLoadingBody";
import { DiscoveryUnavailableBody } from "../DiscoveryUnavailableBody/DiscoveryUnavailableBody";
import { FixedOptionsBody } from "../FixedOptionsBody";
import css from "../ClarificationCard.module.css";
import type { ClarificationAnswerHandler } from "../ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolution } from "../useDiscoveryOptions/useDiscoveryOptions";

type Props = {
  discoveryState: DiscoveryResolution;
  header: React.ReactNode;
  column: string;
  multi: boolean;
  queryPreview: string;
  onRequestDifferentDiscovery?: () => void;
  onSubmit: ClarificationAnswerHandler;
};

/** Renders discovery progress or the clarification controls when required. */
export function DiscoveryStateBody({
  discoveryState,
  header,
  column,
  multi,
  queryPreview,
  onRequestDifferentDiscovery,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const body = match(discoveryState)
    .with({ kind: "loading" }, () => {
      return <DiscoveryLoadingBody />;
    })
    .with({ kind: "ready" }, ({ values }) => {
      return (
        <FixedOptionsBody options={values} multi={multi} onSubmit={onSubmit} />
      );
    })
    .with({ kind: "error" }, ({ error, retry }) => {
      return (
        <DiscoveryUnavailableBody
          column={column}
          error={error}
          queryPreview={queryPreview}
          onRetry={retry}
          onRequestDifferentDiscovery={onRequestDifferentDiscovery}
          onSubmit={onSubmit}
        />
      );
    })
    .with({ kind: "empty" }, () => {
      return (
        <DiscoveryUnavailableBody
          column={column}
          queryPreview={queryPreview}
          onSubmit={onSubmit}
        />
      );
    })
    .exhaustive();
  const shouldShowHeader = discoveryState.kind !== "loading";

  return (
    <>
      {shouldShowHeader ? header : null}
      <div
        className={css.clarificationCardBody}
        data-testid="clarification-card-body"
      >
        {body}
      </div>
    </>
  );
}
```

Replace `DiscoveryLoadingBody` with neutral translated progress:

```tsx
import { Trans } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";

/** Renders neutral progress while local discovery is running. */
export function DiscoveryLoadingBody(): React.ReactNode {
  return (
    <Group gap="xs" role="status" aria-live="polite">
      <Loader size="xs" />
      <Text size="xs" c="dimmed">
        <Trans>Checking your data…</Trans>
      </Text>
    </Group>
  );
}
```

- [ ] **Step 4: Extract catalogs and run the focused test**

Run:

```bash
pnpm i18n:extract
pnpm test:frontend -- \
  src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx
```

Expected: catalogs include `Checking your data…`; the discovery component test
PASSes. Do not edit compiled `messages.ts` files.

---

### Task 5: Verify the seamless user flow

**Files:**

- Modify: `tests/e2e/chat-interactive-workflows.spec.ts`

**Interfaces:**

- Verifies: internal messages still reach the mock backend but never appear in
  the rendered transcript.

- [ ] **Step 1: Strengthen the existing auto-discovery E2E regression**

After the final-response assertion in
`discovery auto-resolves one prompt-derived candidate locally`, add:

```ts
await expect(
  page.getByText("Which stored state represents California?", { exact: true }),
).toHaveCount(0);
await expect(
  page.getByText("[Clarification answer: California]", { exact: true }),
).toHaveCount(0);
expect(lastUserMessage).toContain("[Clarification answer: California]");
```

The last assertion proves the hidden answer still crossed the existing model
continuation boundary.

- [ ] **Step 2: Run the one related E2E test**

Run:

```bash
pnpm test:e2e tests/e2e/chat-interactive-workflows.spec.ts \
  --grep "discovery auto-resolves one prompt-derived candidate locally"
```

Expected: PASS. Do not run the full Playwright suite.

- [ ] **Step 3: Run all focused unit regressions together**

Run:

```bash
pnpm test:frontend -- \
  src/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage.test.ts \
  src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts \
  src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx \
  src/components/ChatPanel/ClarificationCard/DiscoveryBody/DiscoveryBody.test.tsx \
  src/components/ChatPanel/ChatThread/UserMessage/UserMessage.test.tsx \
  src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.test.tsx
```

Expected: all focused tests PASS with no errors or warnings.

- [ ] **Step 4: Run static verification scoped to the finished change**

Run:

```bash
pnpm exec eslint \
  src/components/ChatPanel/DiscoveryContinuationMessage \
  src/components/ChatPanel/applyChatTurnResponse \
  src/components/ChatPanel/PendingClarificationBlock \
  src/components/ChatPanel/ClarificationCard \
  src/components/ChatPanel/ChatThread/UserMessage \
  src/components/ChatPanel/ChatThread/AssistantMessage \
  tests/e2e/chat-interactive-workflows.spec.ts
pnpm type-check
pnpm i18n:check
git diff --check
```

Expected: every command exits 0. `pnpm i18n:check` produces no additional
catalog diff after extraction.

- [ ] **Step 5: Inspect the final scoped diff**

Run:

```bash
git diff -- \
  docs/superpowers/specs/2026-08-14-seamless-discovery-transcript-design.md \
  docs/superpowers/plans/2026-08-14-seamless-discovery-transcript.md \
  src/components/ChatPanel/DiscoveryContinuationMessage \
  src/components/ChatPanel/applyChatTurnResponse \
  src/components/ChatPanel/PendingClarificationBlock \
  src/components/ChatPanel/ClarificationCard \
  src/components/ChatPanel/ChatThread/UserMessage \
  src/components/ChatPanel/ChatThread/AssistantMessage \
  src/i18n/locales \
  tests/e2e/chat-interactive-workflows.spec.ts
```

Expected: the diff contains only internal-message metadata, transcript hiding,
neutral discovery presentation, focused tests, catalogs, and the approved
design and plan documents.
