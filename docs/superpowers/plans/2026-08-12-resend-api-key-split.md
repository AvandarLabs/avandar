# Resend API Key Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Resend email-sending operations through a sending-only API key
and all resource-management operations through a full-access API key.

**Architecture:** Each Resend wrapper retains its existing public methods and
owns two lazily initialized SDK clients. Methods choose the credential by
operation, so callers cannot select or accidentally broaden credential access.

**Tech Stack:** TypeScript, Resend Node SDK, Vitest, Node and Deno environment
accessors, shell-based CI environment preparation.

## Global Constraints

- Use `RESEND_SENDING_API_KEY` only for `emails.send` and `broadcasts.send`.
- Use `RESEND_FULL_ACCESS_API_KEY` for every other Resend API operation.
- Do not fall back to the legacy single-key environment variable.
- Keep Deno-reachable imports extension-qualified.
- Do not commit, push, merge, publish, or access external Resend state.

---

### Task 1: Runtime Environment Accessors

**Files:**

- Create: `shared/env/getResendAPIKeys.test.ts`
- Create: `shared/env/getResendSendingAPIKey.ts`
- Create: `shared/env/getResendFullAccessAPIKey.ts`
- Delete: `shared/env/getResendAPIKey.ts`
- Modify: `shared/EmailClient/EmailClient.tsx`

**Interfaces:**

- Produces: `getResendSendingAPIKey(): string`
- Produces: `getResendFullAccessAPIKey(): string`

- [ ] **Step 1: Write failing Node-runtime accessor tests**

```ts
import { getResendFullAccessAPIKey } from "$/env/getResendFullAccessAPIKey.ts";
import { getResendSendingAPIKey } from "$/env/getResendSendingAPIKey.ts";
import { afterEach, describe, expect, it } from "vitest";

describe("Resend API key accessors", () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("returns the sending API key", () => {
    process.env.RESEND_SENDING_API_KEY = "sending-key";
    expect(getResendSendingAPIKey()).toBe("sending-key");
  });

  it("returns the full-access API key", () => {
    process.env.RESEND_FULL_ACCESS_API_KEY = "full-access-key";
    expect(getResendFullAccessAPIKey()).toBe("full-access-key");
  });
});
```

- [ ] **Step 2: Verify the tests fail because the new modules do not exist**

Run: `pnpm exec vitest run shared/env/getResendAPIKeys.test.ts`

Expected: FAIL resolving `getResendSendingAPIKey.ts` or
`getResendFullAccessAPIKey.ts`.

- [ ] **Step 3: Add the two strict runtime accessors**

Each accessor follows the current Node/Deno/browser branching, reads only its
named new variable, throws in browser environments, and has JSDoc on its main
export. Update `EmailClient.tsx` to validate the sending accessor and name the
new variable in its error.

- [ ] **Step 4: Verify the focused accessor tests pass**

Run: `pnpm exec vitest run shared/env/getResendAPIKeys.test.ts`

Expected: PASS with two tests.

### Task 2: Active Shared Resend Client Routing

**Files:**

- Create: `shared/EmailClient/ResendClient.routing.test.ts`
- Modify: `shared/EmailClient/ResendClient.ts`

**Interfaces:**

- Consumes: `RESEND_SENDING_API_KEY` and `RESEND_FULL_ACCESS_API_KEY`
- Preserves: `ResendClient.sendEmail`, `createBroadcast`, `sendBroadcast`,
  `createContact`, `updateContact`, `getContact`, and `listTopics`

- [ ] **Step 1: Write failing operation-routing tests**

Mock the Resend constructor so each SDK instance records its constructor key.
Mock the Upstash limiter to return `{ success: true }`. Invoke every wrapper
method and assert:

```ts
expect(operationCalls).toContainEqual({
  apiKey: "sending-key",
  operation: "emails.send",
});
expect(operationCalls).toContainEqual({
  apiKey: "sending-key",
  operation: "broadcasts.send",
});
expect(operationCalls).toContainEqual({
  apiKey: "full-access-key",
  operation: "broadcasts.create",
});
expect(operationCalls).toContainEqual({
  apiKey: "full-access-key",
  operation: "contacts.create",
});
expect(operationCalls).toContainEqual({
  apiKey: "full-access-key",
  operation: "contacts.update",
});
expect(operationCalls).toContainEqual({
  apiKey: "full-access-key",
  operation: "contacts.get",
});
expect(operationCalls).toContainEqual({
  apiKey: "full-access-key",
  operation: "topics.list",
});
```

Also remove each new key in an isolated test, invoke an operation needing it,
and assert that the rejection names the missing new variable.

- [ ] **Step 2: Verify routing tests fail against the single-client wrapper**

Run: `pnpm exec vitest run shared/EmailClient/ResendClient.routing.test.ts`

Expected: FAIL because every operation currently uses one constructor key.

- [ ] **Step 3: Implement lazy permission-specific SDK clients**

Keep the wrapper API unchanged. Add private getters that validate and cache the
sending SDK client or full-access SDK client. Route only `sendEmail` and
`sendBroadcast` to the sending getter; route all remaining methods to the
full-access getter. Keep the shared rate limiter around every request.

- [ ] **Step 4: Verify shared-client routing passes**

Run: `pnpm exec vitest run shared/EmailClient/ResendClient.routing.test.ts`

Expected: PASS with all routing and missing-key cases.

### Task 3: Duplicate Client and Deployment Configuration

**Files:**

- Create: `src/clients/ResendClient/ResendClient.test.ts`
- Modify: `src/clients/ResendClient/ResendClient.ts`
- Modify: `.env.example`
- Modify: `.env.example.edge`
- Modify: `.github/workflows/pr-develop.yaml`
- Modify: `.github/workflows/production.yaml`
- Modify: `.github/workflows/staging.yaml`
- Modify: `scripts/ci/prepare-envs/prepare-env-development.sh`
- Modify: `scripts/ci/prepare-envs/prepare-env-edge.sh`

**Interfaces:**

- Preserves the duplicate wrapper's `IResendClient` interface.
- Produces both new variables in local examples and CI-prepared environment
  files.

- [ ] **Step 1: Write failing duplicate-client routing tests**

Use the same behavioral constructor-key harness as Task 2 and verify the seven
methods route to the same permission-specific keys.

- [ ] **Step 2: Verify the duplicate-client tests fail**

Run: `pnpm exec vitest run src/clients/ResendClient/ResendClient.test.ts`

Expected: FAIL because the duplicate wrapper still constructs one SDK client.

- [ ] **Step 3: Implement the same strict routing in the duplicate wrapper**

Use lazy permission-specific SDK clients, exact missing-variable errors, and no
legacy-key lookup. Do not otherwise refactor or remove the duplicate wrapper.

- [ ] **Step 4: Update tracked environment configuration**

Replace the legacy variable entry with both new variables in examples and CI
preparation arrays. Map each workflow variable to a same-named GitHub secret.

- [ ] **Step 5: Run focused verification**

```bash
pnpm exec vitest run \
  shared/env/getResendAPIKeys.test.ts \
  shared/EmailClient/ResendClient.routing.test.ts \
  src/clients/ResendClient/ResendClient.test.ts
legacy_resend_key="RESEND"_"API"_"KEY"
git grep -n -w "$legacy_resend_key"
pnpm format
pnpm lint
```

Expected: all tests pass; the exact legacy-variable search returns no matches;
formatting and lint finish successfully.
