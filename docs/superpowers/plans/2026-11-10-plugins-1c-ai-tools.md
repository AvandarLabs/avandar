# Plugins Slice 1c: AI Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the hosted data agent call the epidemiology plugin's `fitRegression` on the result already on screen, and send the slope, intercept, r², row count, and truncation flag back to the model.

**Architecture:** `contributes.aiTools` in `ava.yaml` is the source. A generated module in `shared/agent/dataAgent/` is what the agent proxy and the browser both import. The proxy appends a tool only for a plugin whose install is active. The browser runs the handler on the Data Explorer's current result, or re-runs the latest chat result's stored SQL on the device, and returns the handler's JSON under a 2,048-byte cap.

**Tech Stack:** TypeScript, Zod 4, Vitest, Deno (the agent proxy), Pi agent (`@earendil-works/pi-agent-core` and `pi-schema` 1.5.0), the existing plugin SDK and epidemiology plugin.

**Spec:** `docs/superpowers/specs/2026-11-09-plugins-1c-ai-tools-design.md`

**Branch:** `feat/plugins-columns`. It merges into `demo/measles`, never `develop`, and only when Pablo asks.

## Global Constraints

- Tool `name` matches `^[a-z][A-Za-z0-9]{0,63}$`, unique within a plugin and across bundled plugins. The model sees that name with no prefix.
- Tool `description` is plain text, 1 to 600 characters. Each parameter `description` is at most 200 characters. Neither is a `%message%` key.
- `parameters` is a JSON Schema object with `additionalProperties: false`. Properties are string, number, boolean, or an enum of one of those. Nested objects and arrays are rejected.
- Host messages, exact: `No result is on screen.` `The tool failed.` `The tool result was too large.`
- `InvalidToolInput` messages this plugin may throw, exact: `X and Y are the same column.` `Column "<name>" is not on the result.` `Not enough numeric rows to fit a line.`
- Success payload: `{ slope, intercept, rSquared, n, isTruncated }` with `rSquared: null` when the fit has none. UTF-8 JSON over 2,048 bytes is discarded.
- `fetchRows` is called with no limit, so the cap stays `DEFAULT_FETCH_ROWS_LIMIT` (50,000). The tool description's `50,000` is that constant.
- Prompt id becomes `data-agent-v4`. v1, v2, and v3 stay byte for byte. The new sentence is one TOOLS bullet: `A plugin tool, when one is listed with the others, runs on the user's device against the result already on screen. Follow that tool's description. You may state the numbers it returns, and the call leaves your turn open so you can explain them.`
- The offline agent (`queryTools: "plan"`) does not gain plugin tools.
- No new user-facing string, no new npm dependency, no `pnpm-lock.yaml` change, no `supabase/config.toml` change.
- Files Deno can reach (`shared/`, `supabase/functions/`, `packages/shared/`) import with `.ts` extensions.
- Exported functions use `make`, `get`, `is`, or `assert`. Private helpers may use `_build`, never `_resolve`. No em dashes.
- Keep functions at or under 45 lines. Plugin code stays out of the chat's initial agent module: load it with a dynamic `import()` from the tool's `execute`.

## Review Focus

These are the cases a person would notice, and each one has a test in the task that owns it.

1. A chat-result re-run that throws a DuckDB error quoting a cell. The model must see `No result is on screen.` and not the cell. Task 8.
2. An empty Data Explorer must not fall back to an older chat result. Task 8.
3. A disabled install, and an install that has not granted every manifest permission, must not be offered. Task 6.
4. A column named `Age` is not the column `age`. Task 11.
5. A JSON object under 2,048 bytes that also carries a `rows` array is forwarded unchanged. The epidemiology handler itself returns only the five fields. Task 9 and Task 11.

## Decisions made while planning

1. **The chat cannot see the explorer's React state.** `useDataExplorerPluginContext` writes the settled result into `ExplorerPluginResultStore` and clears it on unmount. The agent reads the store.
2. **Chat results store SQL, not rows.** Off the Data Explorer, the host re-runs that SQL through `WorkspaceQuerySession.runQuery` and fits the rows. A failure uses the fixed "nothing on screen" message. The DuckDB text is dropped.
3. **One pure rule for "active".** `isPluginContributionActive` is the granted-and-enabled check. `getPluginInstallStatusFromInstallation` uses it for the `installed` versus `needs_review` branch, and the proxy uses it on the rows it reads. The two cannot drift.
4. **Tools are rebuilt on each `ask`.** `createDataAgent` calls `getPluginAiTools()` at the start of `ask`, then sets `agent.state.tools`. The proxy already rebuilds its list on every request.
5. **The fit question is not one of the 45.** `runEval.ts` gains a selector `F`, like `P` and `M`. The default 45 questions and their tool list stay as they are. `--questions F` is the new case.
6. **The host does not filter keys.** Size and "is a JSON object" are the rails, as the spec says. The epidemiology handler's test locks the five keys.

## Task index

| # | Task | Produces |
| --- | --- | --- |
| 1 | Manifest `aiTools` | Schema and `PluginAiTool` |
| 2 | SDK handler types | `AiToolHandler`, `AgentToolContext`, `InvalidToolInput` |
| 3 | Generated tool list | `pluginAiTools.gen.ts` |
| 4 | Pi tool conversion | `makeDataAgentToolsFromPluginAiTools` |
| 5 | Prompt v4 | `data-agent-v4` |
| 6 | Proxy offers active tools | `loadInstalledPluginAiTools` |
| 7 | Explorer result store | `ExplorerPluginResultStore` |
| 8 | Which result is on screen | `getOnScreenQueryResult`, `release` |
| 9 | Run a handler | `runPluginAiTool` |
| 10 | Register tools on the hosted agent | `createDataAgent` option |
| 11 | `fitRegression` | Epidemiology handler and manifest |
| 12 | Scripted turn | Agent calls the tool and continues |
| 13 | Authoring | `docs/plugin-authoring.md` section 12 |
| 14 | Eval case F | One live question, outside the default 45 |
| 15 | Final verification | The checks below, each on its own |

---

### Task 1: Manifest `aiTools`

**Files:**
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`
- Modify: `packages/shared/plugin-manifest/src/index.ts`
- Modify: `packages/shared/plugin-manifest/README.md`
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `PluginManifestSchema` accepts `contributes.aiTools`, default `[]`. Export type `PluginAiTool` as the element type of `PluginManifest["contributes"]["aiTools"]`.

- [ ] **Step 1: Write the failing tests**

Add the cases to `PluginManifestSchema.test.ts`. Build each input from `_makeValidManifest()` in that file, and set `contributes.aiTools` on the copy.

```ts
it("accepts an ai tool whose parameters are strings", () => {
  const manifest = _makeValidManifest();
  manifest.contributes = {
    ...(manifest.contributes as object),
    aiTools: [
      {
        name: "fitRegression",
        description: "Fits a line.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["xColumn"],
          properties: {
            xColumn: { type: "string", description: "The predictor." },
          },
        },
      },
    ],
  };
  const parsed = PluginManifestSchema.parse(manifest);
  expect(parsed.contributes.aiTools[0]?.name).toBe("fitRegression");
});

it("defaults aiTools to an empty list", () => {
  expect(PluginManifestSchema.parse(_makeValidManifest()).contributes.aiTools).toEqual([]);
});

it("rejects a dotted name, a duplicate name, a nested property, an array property, a 601-character description, and a 201-character parameter description", () => {
  expect(_issuesForTool({ name: "fit.regression" })).not.toEqual([]);
  expect(_issuesForTools(["fitRegression", "fitRegression"])).not.toEqual([]);
  expect(_issuesForProperty({ type: "object" })).not.toEqual([]);
  expect(_issuesForProperty({ type: "array" })).not.toEqual([]);
  expect(_issuesForTool({ description: "a".repeat(601) })).not.toEqual([]);
  expect(_issuesForProperty({ type: "string", description: "a".repeat(201) })).not.toEqual([]);
});
```

`_issuesForTool`, `_issuesForTools`, and `_issuesForProperty` are local helpers in the test file. Each starts from `_makeValidManifest()`, sets the one field the case names, and returns `PluginManifestSchema.safeParse(...).error?.issues ?? []`. A valid tool used by those helpers is the object in the first test.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`

Expected: FAIL. `aiTools` is an unrecognized key, or the default assertion fails.

- [ ] **Step 3: Add `AiToolSchema`**

In `PluginManifestSchema.ts`, add the schema and `aiTools: z.array(AiToolSchema).default([])` on `contributes`. Refine duplicate names the same way commands already refine duplicate ids. Export `PluginAiTool` from `src/index.ts` and add a README row.

Property schema: `type` is `string`, `number`, or `boolean`. Optional `enum` is an array of that same type. Optional `description` max 200. `parameters.required` is an array of strings, and every entry must be a property name.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/plugin-manifest
git commit -m "feat(plugins): accept aiTools on the plugin manifest"
```

---

### Task 2: SDK handler types

**Files:**
- Modify: `packages/web/plugin-sdk/src/PluginApi.types.ts`
- Modify: `packages/web/plugin-sdk/src/PluginError/PluginError.ts`
- Modify: `packages/web/plugin-sdk/src/definePlugin/definePlugin.ts`
- Modify: `packages/web/plugin-sdk/src/index.ts`
- Modify: `packages/web/plugin-sdk/README.md`
- Test: `packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts` (create it if the package has no test there; follow the package's existing test layout)

**Interfaces:**
- Consumes: nothing from Task 1
- Produces:
  - `AgentToolContext`: `{ slotId: "agent.tool"; queryHandle: QueryHandle; columns: DataExplorerToolbarContext["columns"]; rowCount: number }`
  - `PluginInvocationContext` gains that variant
  - `AiToolHandler`: `(avandar: AvandarApi, args: Readonly<Record<string, string | number | boolean>>) => Promise<Readonly<Record<string, unknown>>> | Readonly<Record<string, unknown>>`
  - `PluginDefinition.aiTools`: `Readonly<Record<string, AiToolHandler>>`
  - `PluginErrorCode` gains `"InvalidToolInput"`

- [ ] **Step 1: Write the failing tests**

```ts
it("accepts a definition that omits aiTools", () => {
  expect(isPluginDefinition(definePlugin({ commands: {}, vizTypes: {} }))).toBe(true);
});

it("keeps a handler that is a function and drops one that is not", () => {
  const definition = definePlugin({
    aiTools: { fitRegression: async () => ({ slope: 1 }) },
  });
  expect(typeof definition.aiTools.fitRegression).toBe("function");
});

it("rejects a definition whose aiTools is not an object", () => {
  expect(isPluginDefinition({ kind: "avandar-plugin", commands: {}, vizTypes: {}, aiTools: null })).toBe(false);
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts`

Expected: FAIL. `definePlugin` does not accept `aiTools`.

- [ ] **Step 3: Add the types and the optional map**

`definePlugin` defaults `aiTools` to `{}` and returns it. `isPluginDefinition` treats a missing `aiTools` as valid, and a present non-object as invalid. Document `InvalidToolInput` on `PluginError` as the code whose message the host may show to the model. Export `AiToolHandler` and `AgentToolContext` from the package index. Add README rows. Update the `PluginErrorCode` row to include `InvalidToolInput`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/plugin-sdk
git commit -m "feat(plugin-sdk): declare AI tool handlers"
```

---

### Task 3: Generated tool list

**Files:**
- Create: `packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts`
- Create: `packages/shared/plugin-manifest/src/node/__tests__/emitPluginAiTools.integration.test.ts`
- Create: `shared/agent/dataAgent/pluginAiTools.types.ts`
- Create: `shared/agent/dataAgent/pluginAiTools.gen.ts`
- Modify: `packages/shared/plugin-manifest/src/node/index.ts`
- Modify: `packages/shared/plugin-manifest/README.md`

**Interfaces:**
- Consumes: `PluginAiTool` from Task 1, `readBundledPlugins(repoRoot)`
- Produces:
  - `PluginAiToolDeclaration` in `pluginAiTools.types.ts`: `{ pluginId: string; permissions: readonly string[]; name: string; description: string; parameters: { type: "object"; additionalProperties: false; required: readonly string[]; properties: Readonly<Record<string, { type: "string" | "number" | "boolean"; description?: string; enum?: readonly (string | number | boolean)[] }>> } }`. This file does not import `@avandar/plugin-manifest`.
  - `assertUniquePluginAiToolNames(tools: readonly Pick<PluginAiToolDeclaration, "pluginId" | "name">[]): void` throws `Error` with message `duplicate ai tool name "<name>" on <pluginId> and <pluginId>`
  - `emitPluginAiToolsFile(repoRoot: string): string` the file text
  - `PLUGIN_AI_TOOLS` in the generated file, typed as `readonly PluginAiToolDeclaration[]`
  - Command: `pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts` writes the file when executed directly

- [ ] **Step 1: Write the failing tests**

```ts
it("names both plugins in a duplicate-name error", () => {
  expect(() => {
    assertUniquePluginAiToolNames([
      { pluginId: "avandar.epidemiology", name: "fitRegression" },
      { pluginId: "avandar.other", name: "fitRegression" },
    ]);
  }).toThrow('duplicate ai tool name "fitRegression" on avandar.epidemiology and avandar.other');
});

it("writes an empty list while no bundled plugin declares a tool", () => {
  const text = emitPluginAiToolsFile(repoRoot);
  expect(text).toContain("export const PLUGIN_AI_TOOLS");
  expect(text).toContain("readonly PluginAiToolDeclaration[]");
  expect(readFileSync(genPath, "utf8")).toBe(text);
});
```

`repoRoot` is the worktree root. `genPath` is `shared/agent/dataAgent/pluginAiTools.gen.ts`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run packages/shared/plugin-manifest/src/node/__tests__/emitPluginAiTools.integration.test.ts`

Expected: FAIL. The emitter does not exist.

- [ ] **Step 3: Emit the file from bundled manifests**

Read `readBundledPlugins`. For each directory, map `compiled.manifest.contributes.aiTools` to declarations that also carry `pluginId` and `permissions`. Run the uniqueness assert. Write a generated file whose first line is a comment that it is generated and must not be edited by hand. Running the module as a script writes that text to `genPath`. Export the two functions from `@avandar/plugin-manifest/node` and add README rows.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run packages/shared/plugin-manifest/src/node/__tests__/emitPluginAiTools.integration.test.ts`

Expected: PASS. `PLUGIN_AI_TOOLS` is an empty array.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/plugin-manifest shared/agent/dataAgent/pluginAiTools.types.ts shared/agent/dataAgent/pluginAiTools.gen.ts
git commit -m "feat(plugins): generate the data-agent tool list from manifests"
```

---

### Task 4: Pi tool conversion

**Files:**
- Create: `shared/agent/dataAgent/isPluginContributionActive.ts`
- Create: `shared/agent/dataAgent/isPluginContributionActive.test.ts`
- Create: `shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.ts`
- Create: `shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.test.ts`
- Modify: `src/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation.ts`

**Interfaces:**
- Consumes: `PluginAiToolDeclaration` from Task 3
- Produces:
  - `isPluginContributionActive(options: { isEnabled: boolean; grantedPermissions: readonly string[]; manifestPermissions: readonly string[] }): boolean`
  - `makeDataAgentToolLabelFromName(name: string): string` (`fitRegression` becomes `Fit regression`)
  - `makeDataAgentToolsFromPluginAiTools(tools: readonly PluginAiToolDeclaration[]): Array<{ name: string; label: string; description: string; parameters: Schema }>` using `obj`, `str`, `num`, `bool`, and `oneOf` from `@earendil-works/pi-schema`. Required properties are required. Enum properties use `oneOf`.

- [ ] **Step 1: Write the failing tests**

```ts
it("is active only when enabled and every permission is granted", () => {
  expect(isPluginContributionActive({
    isEnabled: true,
    grantedPermissions: ["data:context"],
    manifestPermissions: ["data:context"],
  })).toBe(true);
  expect(isPluginContributionActive({
    isEnabled: false,
    grantedPermissions: ["data:context"],
    manifestPermissions: ["data:context"],
  })).toBe(false);
  expect(isPluginContributionActive({
    isEnabled: true,
    grantedPermissions: [],
    manifestPermissions: ["data:context"],
  })).toBe(false);
});

it("labels fitRegression as Fit regression", () => {
  const [tool] = makeDataAgentToolsFromPluginAiTools([FIT_REGRESSION_DECLARATION]);
  expect(tool?.label).toBe("Fit regression");
  expect(tool?.name).toBe("fitRegression");
  expect(tool?.description).toBe(FIT_REGRESSION_DECLARATION.description);
});
```

`FIT_REGRESSION_DECLARATION` uses `xColumn` and `yColumn` as required strings. Add one assertion that a number enum property compiles: the test only checks `makeDataAgentToolsFromPluginAiTools` does not throw for `{ type: "number", enum: [1, 2] }`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run shared/agent/dataAgent/isPluginContributionActive.test.ts shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.test.ts`

Expected: FAIL. Both modules are missing.

- [ ] **Step 3: Implement the two functions**

Point `getPluginInstallStatusFromInstallation`'s enabled-and-granted branch at `isPluginContributionActive`. Disabled, missing install, and unavailable stay as they are. Run the existing status tests with the new ones.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run shared/agent/dataAgent/isPluginContributionActive.test.ts shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.test.ts src/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/agent/dataAgent/isPluginContributionActive.ts shared/agent/dataAgent/isPluginContributionActive.test.ts shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.ts shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.test.ts src/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation.ts
git commit -m "feat(agent): convert plugin tool declarations into Pi tools"
```

---

### Task 5: Prompt v4

**Files:**
- Modify: `shared/agent/dataAgent/dataAgentTools.ts`
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts`
- Modify: `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts` only where it lists served prompt ids

**Interfaces:**
- Consumes: nothing
- Produces: `DATA_AGENT_PROMPT_IDS` includes `"data-agent-v4"`. `DATA_AGENT_PROMPT_ID` is `"data-agent-v4"`. `buildDataAgentSystemPrompt` serves it.

- [ ] **Step 1: Write the failing test**

```ts
const PLUGIN_TOOL_SENTENCE =
  "A plugin tool, when one is listed with the others, runs on the user's device against the result already on screen. Follow that tool's description. You may state the numbers it returns, and the call leaves your turn open so you can explain them.";

it("adds the plugin-tool sentence to v4 only, as the last TOOLS bullet", () => {
  const v3 = buildDataAgentSystemPrompt({ datasets: DATASETS, today: "2026-11-09", promptId: "data-agent-v3" });
  const v4 = buildDataAgentSystemPrompt({ datasets: DATASETS, today: "2026-11-09", promptId: "data-agent-v4" });
  expect(v3).not.toContain(PLUGIN_TOOL_SENTENCE);
  expect(v4.slice(0, v4.indexOf("\n\nSQL\n"))).toBe(
    `${v3.slice(0, v3.indexOf("\n\nSQL\n"))}\n- ${PLUGIN_TOOL_SENTENCE}`,
  );
  expect(DATA_AGENT_PROMPT_ID).toBe("data-agent-v4");
});
```

The existing v1 and v2 hash tests must stay untouched.

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts`

Expected: FAIL. `data-agent-v4` is not a prompt id.

- [ ] **Step 3: Serve v4 as v3 plus that bullet**

Do not edit the v1, v2, or v3 instruction strings. Append the bullet at the end of the TOOLS section for v4 only. Update the proxy context test's list of served ids so v4 is served and v3 still is.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts`

Expected: PASS. v1 and v2 hashes unchanged.

- [ ] **Step 5: Commit**

```bash
git add shared/agent/dataAgent/dataAgentTools.ts shared/agent/dataAgent/buildDataAgentSystemPrompt.ts shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts
git commit -m "feat(agent): tell the data agent about plugin tools in prompt v4"
```

---

### Task 6: Proxy offers active tools

**Files:**
- Create: `shared/agent/dataAgent/getActivePluginAiToolsFromInstallations.ts`
- Create: `shared/agent/dataAgent/getActivePluginAiToolsFromInstallations.test.ts`
- Create: `supabase/functions/chat/PostAgentStream/loadInstalledPluginAiTools.ts`
- Create: `supabase/functions/chat/PostAgentStream/loadInstalledPluginAiTools.test.ts`
- Modify: `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.ts`
- Modify: `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts`
- Modify: `supabase/functions/chat/PostAgentStream/PostAgentStream.ts`

**Interfaces:**
- Consumes: `isPluginContributionActive`, `PLUGIN_AI_TOOLS`, `makeDataAgentToolsFromPluginAiTools`
- Produces:
  - `getActivePluginAiToolsFromInstallations(options: { installations: readonly { pluginId: string; isEnabled: boolean; grantedPermissions: readonly string[] }[]; tools: readonly PluginAiToolDeclaration[] }): PluginAiToolDeclaration[]`
  - `loadInstalledPluginAiTools(options: { supabaseClient: AvaSupabaseClient; workspaceId: string }): Promise<PluginAiToolDeclaration[]>`
  - `buildDataAgentProxyContext` takes `pluginTools: readonly PluginAiToolDeclaration[]` and appends their Pi forms after `DATA_AGENT_TOOLS`

- [ ] **Step 1: Write the failing tests**

```ts
it("drops a disabled install and an install missing a permission", () => {
  const active = getActivePluginAiToolsFromInstallations({
    tools: [EPIDEMIOLOGY_TOOL],
    installations: [
      { pluginId: "avandar.epidemiology", isEnabled: false, grantedPermissions: ["data:context", "query:addColumns"] },
    ],
  });
  expect(active).toEqual([]);
  const pending = getActivePluginAiToolsFromInstallations({
    tools: [EPIDEMIOLOGY_TOOL],
    installations: [
      { pluginId: "avandar.epidemiology", isEnabled: true, grantedPermissions: ["data:context"] },
    ],
  });
  expect(pending).toEqual([]);
});

it("refuses fitRegression when the proxy was not given the tool", () => {
  expect(() => {
    buildDataAgentProxyContext({
      clientMessages: [{ role: "assistant", content: [{ type: "toolCall", name: "fitRegression" }] }],
      datasets: [],
      today: "2026-11-10",
      promptId: "data-agent-v4",
      pluginTools: [],
    });
  }).toThrow('The data agent has no tool "fitRegression"');
});

it("offers fitRegression when the proxy was given the tool", () => {
  const context = buildDataAgentProxyContext({
    clientMessages: [],
    datasets: [],
    today: "2026-11-10",
    promptId: "data-agent-v4",
    pluginTools: [EPIDEMIOLOGY_TOOL],
  });
  expect(context.tools.map((tool) => tool.name)).toContain("fitRegression");
});
```

`EPIDEMIOLOGY_TOOL.permissions` is `["data:context", "query:addColumns"]`. `loadInstalledPluginAiTools` takes an optional `tools` argument and defaults it to `PLUGIN_AI_TOOLS`. The loader test passes `tools: [EPIDEMIOLOGY_TOOL]` and a fake client whose `from("plugin_installations").select("plugin_id, is_enabled, granted_permissions").eq("workspace_id", id).throwOnError()` resolves `{ data: [{ plugin_id: "avandar.epidemiology", is_enabled: true, granted_permissions: ["data:context", "query:addColumns"] }] }`, and expects that declaration back. The production call in `PostAgentStream` omits `tools`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run shared/agent/dataAgent/getActivePluginAiToolsFromInstallations.test.ts supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts supabase/functions/chat/PostAgentStream/loadInstalledPluginAiTools.test.ts`

Expected: FAIL. The option and the loader are missing.

- [ ] **Step 3: Read installations and append tools**

`PostAgentStream` loads the tools with the same `supabaseClient` and `workspaceId` it already uses, and passes them in. Unknown tools stay refused. `DATA_AGENT_TOOLS` itself stays the built-in list.

- [ ] **Step 4: Run the tests**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/agent/dataAgent/getActivePluginAiToolsFromInstallations.ts shared/agent/dataAgent/getActivePluginAiToolsFromInstallations.test.ts supabase/functions/chat/PostAgentStream
git commit -m "feat(agent): offer installed plugin tools from the proxy"
```

---

### Task 7: Explorer result store

**Files:**
- Create: `src/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore.ts`
- Create: `src/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore.test.ts`
- Modify: `src/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext.ts`
- Modify: `src/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext.test.ts`

**Interfaces:**
- Consumes: the settled result `useDataExplorerPluginContext` already computes
- Produces: `ExplorerPluginResultStore.get(): ExplorerPluginResult | undefined`, `.set(result: ExplorerPluginResult | undefined): void`, `.clear(): void`. `ExplorerPluginResult` is `{ columns: DataExplorerToolbarContext["columns"]; rows: readonly Readonly<Record<string, unknown>>[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
it("returns the result that was set and nothing after clear", () => {
  ExplorerPluginResultStore.set({ columns: [{ name: "x", dataType: "double" }], rows: [{ x: 1 }] });
  expect(ExplorerPluginResultStore.get()?.rows).toEqual([{ x: 1 }]);
  ExplorerPluginResultStore.clear();
  expect(ExplorerPluginResultStore.get()).toBeUndefined();
});
```

Extend the context hook test: while a settled result is in the hook, the store returns those columns and rows. When the hook unmounts, the store is clear. While `isLoadingResults` is true, the store keeps the last settled result.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run src/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore.test.ts src/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext.test.ts`

Expected: FAIL. The store does not exist.

- [ ] **Step 3: Write the store and publish the settled result**

A module-level value, the same shape as `PluginDrawerStore`, with no React import. The hook sets it from the settled result and clears it in an effect cleanup.

- [ ] **Step 4: Run the tests**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/plugins/ExplorerPluginResultStore src/views/DataExplorerApp/useDataExplorerPluginContext
git commit -m "feat(plugins): publish the explorer result for the data agent"
```

---

### Task 8: Which result is on screen

**Files:**
- Modify: `src/lib/plugins/QueryHandleRegistry/QueryHandleRegistry.ts`
- Modify: `src/lib/plugins/QueryHandleRegistry/QueryHandleRegistry.test.ts`
- Create: `src/lib/agent/dataAgent/getOnScreenQueryResult/getOnScreenQueryResult.ts`
- Create: `src/lib/agent/dataAgent/getOnScreenQueryResult/getOnScreenQueryResult.test.ts`

**Interfaces:**
- Consumes: `ExplorerPluginResultStore`, `QueryHandleRegistry.getOrCreate`, `AgentQueryResultData`
- Produces:
  - `QueryHandleRegistry.release(handle: QueryHandle): void`
  - `getOnScreenQueryResult(options: { isDataExplorer: boolean; chatResults: readonly AgentQueryResultData[]; runQuery: (sql: string) => Promise<QueryResult.T | { error: string }> }): Promise<{ kind: "none" } | { kind: "rows"; source: "explorer" | "chat"; handle: QueryHandle; columns: DataExplorerToolbarContext["columns"]; rows: readonly Readonly<Record<string, unknown>>[]; rowCount: number }>`

- [ ] **Step 1: Write the failing tests**

```ts
it("releases one handle and leaves another readable", () => {
  const explorer = QueryHandleRegistry.getOrCreate([{ x: 1 }]);
  const chat = QueryHandleRegistry.getOrCreate([{ x: 2 }]);
  QueryHandleRegistry.release(chat);
  expect(QueryHandleRegistry.getRows(explorer)).toEqual([{ x: 1 }]);
  expect(QueryHandleRegistry.getRows(chat)).toBeUndefined();
});

it("uses the explorer result and does not call runQuery", async () => {
  ExplorerPluginResultStore.set({ columns: COLUMNS, rows: [{ x: 1, y: 2 }] });
  const runQuery = vi.fn();
  const result = await getOnScreenQueryResult({
    isDataExplorer: true,
    chatResults: [{ version: 1, sql: "select 1", chartType: "table", title: "Earlier", display: "embed" }],
    runQuery,
  });
  expect(result.kind).toBe("rows");
  expect(runQuery).not.toHaveBeenCalled();
});

it("does not use a chat result when the explorer has nothing", async () => {
  ExplorerPluginResultStore.clear();
  const runQuery = vi.fn();
  const result = await getOnScreenQueryResult({
    isDataExplorer: true,
    chatResults: [CHAT_RESULT],
    runQuery,
  });
  expect(result).toEqual({ kind: "none" });
  expect(runQuery).not.toHaveBeenCalled();
});

it("re-runs the last chat SQL off the explorer", async () => {
  const runQuery = vi.fn().mockResolvedValue(QUERY_RESULT);
  const result = await getOnScreenQueryResult({
    isDataExplorer: false,
    chatResults: [CHAT_RESULT],
    runQuery,
  });
  expect(runQuery).toHaveBeenCalledWith(CHAT_RESULT.sql);
  expect(result).toMatchObject({ kind: "rows", source: "chat" });
});

it("hides a query error that quotes a cell", async () => {
  const runQuery = vi.fn().mockResolvedValue({ error: "could not convert 'Los Angeles'" });
  const result = await getOnScreenQueryResult({
    isDataExplorer: false,
    chatResults: [CHAT_RESULT],
    runQuery,
  });
  expect(result).toEqual({ kind: "none" });
});
```

`COLUMNS` is `[{ name: "x", dataType: "double" }, { name: "y", dataType: "double" }]`. `QUERY_RESULT` is a `QueryResult.T` with those columns and one row. Clear the store and the registry in `afterEach`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run src/lib/plugins/QueryHandleRegistry/QueryHandleRegistry.test.ts src/lib/agent/dataAgent/getOnScreenQueryResult/getOnScreenQueryResult.test.ts`

Expected: FAIL. `release` and `getOnScreenQueryResult` are missing.

- [ ] **Step 3: Implement both**

`release` deletes that handle from both maps inside `makeQueryHandleRegistry`. On the explorer, register the store's rows with `getOrCreate` and set `source: "explorer"`. Off it, call `runQuery` with the last chat result's `sql`. Map a `QueryResult.T` to columns (`name`, `dataType`) and rows. Any `{ error }` or thrown error becomes `{ kind: "none" }`.

- [ ] **Step 4: Run the tests**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/plugins/QueryHandleRegistry src/lib/agent/dataAgent/getOnScreenQueryResult
git commit -m "feat(agent): choose the on-screen result a plugin tool fits"
```

---

### Task 9: Run a handler

**Files:**
- Create: `src/lib/plugins/runPluginAiTool/runPluginAiTool.ts`
- Create: `src/lib/plugins/runPluginAiTool/runPluginAiTool.test.ts`

**Interfaces:**
- Consumes: `getOnScreenQueryResult`, `QueryHandleRegistry.release`, `AgentToolContext`, `AiToolHandler`, `PluginError`
- Produces: `runPluginAiTool(options: { declaration: PluginAiToolDeclaration; args: Readonly<Record<string, string | number | boolean>>; isDataExplorer: boolean; chatResults: readonly AgentQueryResultData[]; runQuery: (sql: string) => Promise<QueryResult.T | { error: string }>; invoke: (context: AgentToolContext, args: Readonly<Record<string, string | number | boolean>>) => Promise<unknown> }): Promise<{ text: string; isError: boolean }>`

- [ ] **Step 1: Write the failing tests**

```ts
it("returns the no-result message and does not invoke", async () => {
  const invoke = vi.fn();
  const result = await runPluginAiTool({ ...BASE, isDataExplorer: true, chatResults: [], invoke });
  expect(result).toEqual({ text: "No result is on screen.", isError: true });
  expect(invoke).not.toHaveBeenCalled();
});

it("forwards an InvalidToolInput message", async () => {
  const invoke = vi.fn().mockRejectedValue(new PluginError("InvalidToolInput", "X and Y are the same column."));
  const result = await runPluginAiTool({ ...ROWS_READY, invoke });
  expect(result).toEqual({ text: "X and Y are the same column.", isError: true });
});

it("replaces any other throw with The tool failed", async () => {
  const invoke = vi.fn().mockRejectedValue(new PluginError("InvalidHandle", "row secret"));
  const result = await runPluginAiTool({ ...ROWS_READY, invoke });
  expect(result.text).toBe("The tool failed.");
  expect(result.text).not.toContain("secret");
});

it("forwards a JSON object under the cap, including an extra rows key", async () => {
  const payload = { slope: 2, rows: ["secret"] };
  const invoke = vi.fn().mockResolvedValue(payload);
  const result = await runPluginAiTool({ ...ROWS_READY, invoke });
  expect(result).toEqual({ text: JSON.stringify(payload), isError: false });
});

it("replaces an array and an oversized object", async () => {
  const arrayResult = await runPluginAiTool({
    ...ROWS_READY,
    invoke: vi.fn().mockResolvedValue([{ secret: 1 }]),
  });
  expect(arrayResult).toEqual({ text: "The tool failed.", isError: true });
  const oversized = await runPluginAiTool({
    ...ROWS_READY,
    invoke: vi.fn().mockResolvedValue({ blob: "x".repeat(2048) }),
  });
  expect(oversized.text).toBe("The tool result was too large.");
  expect(oversized.text).not.toContain("xxx");
});

it("releases a chat handle and leaves the explorer handle", async () => {
  // source chat: after the call, QueryHandleRegistry.getRows(chatHandle) is undefined
  // and the explorer handle from the store is still readable
});
```

`ROWS_READY` sets the explorer store and `isDataExplorer: true`. The last test's comment is the assertion: capture the chat handle by spying on `getOrCreate`, then expect `getRows` of that handle to be undefined and the explorer handle to still return its rows.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run src/lib/plugins/runPluginAiTool/runPluginAiTool.test.ts`

Expected: FAIL. `runPluginAiTool` is missing.

- [ ] **Step 3: Implement `runPluginAiTool`**

Call `getOnScreenQueryResult`. On `none`, return the no-result message. Otherwise build `AgentToolContext` with `slotId: "agent.tool"` and `invoke`. In a `finally`, `release` the handle only when `source` is `"chat"`. Measure UTF-8 size with `TextEncoder`. `JSON.stringify` the object for the success text. `InvalidToolInput` forwards `error.message`. Everything else, including a non-object JSON value, is `The tool failed.`

- [ ] **Step 4: Run the tests**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/plugins/runPluginAiTool
git commit -m "feat(plugins): run an AI tool against the on-screen result"
```

---

### Task 10: Register tools on the hosted agent

**Files:**
- Modify: `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`
- Modify: `src/lib/agent/dataAgent/createDataAgent/createDataAgent.test.ts`
- Create: `src/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool.ts`
- Create: `src/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` (the object that sets `chatGeneration`)

**Interfaces:**
- Consumes: `makeDataAgentToolsFromPluginAiTools`, `PluginAiToolDeclaration`, `runPluginAiTool`
- Produces: `CreateDataAgentOptions.getPluginAiTools?: () => readonly PluginAiToolDeclaration[]` and `runPluginAiTool?: (request: { declaration: PluginAiToolDeclaration; args: Readonly<Record<string, string | number | boolean>> }) => Promise<{ text: string; isError: boolean }>`. `createPluginAiTool` returns an `AgentTool` whose `execute` calls that function and maps `{ text, isError }` to Pi content `[{ type: "text", text }]`. It does not set `terminate`. `DataAgentTurnOptions.getPluginAiTools` is the same optional getter. `runDataAgentTurn` passes it through. `createChatModelAdapter` sets it from `ActivePluginsContext`: the `PLUGIN_AI_TOOLS` entries whose `pluginId` is in that list.

- [ ] **Step 1: Write the failing tests**

```ts
it("adds the plugin tool on ask and leaves it off the plan tool list", async () => {
  const getPluginAiTools = vi.fn(() => [FIT_DECLARATION]);
  const agent = createDataAgent({
    ...OPTIONS,
    getPluginAiTools,
    runPluginAiTool: vi.fn().mockResolvedValue({ text: "{\"slope\":2}", isError: false }),
    streamFn: STOP_STREAM,
  });
  await agent.ask("fit it");
  expect(getPluginAiTools).toHaveBeenCalled();
  expect(agent.agent.state.tools.map((tool) => tool.name)).toContain("fitRegression");

  const planAgent = createDataAgent({ ...OPTIONS, queryTools: "plan", getPluginAiTools, streamFn: STOP_STREAM });
  await planAgent.ask("fit it");
  expect(planAgent.agent.state.tools.map((tool) => tool.name)).not.toContain("fitRegression");
});
```

`STOP_STREAM` is the existing aborted stream in this test file. An aborted turn resolves, so `await agent.ask("fit it")` returns.

Add this test to `runDataAgentTurn.test.ts`, using the file's `_lastAgentOptions()` helper:

```ts
it("passes the turn's plugin tools into the agent", async () => {
  const getPluginAiTools = () => [];
  await runDataAgentTurn({ ..._turn("workspace-1", "Fit a line."), getPluginAiTools });
  expect(_lastAgentOptions().getPluginAiTools).toBe(getPluginAiTools);
});
```

`_turn` is the helper already in that file. If its name or arguments differ, use the helper the other tests use to build a turn, and add `getPluginAiTools`. The dynamic `import()` of `runPluginAiTool` lives in the chat wiring inside `runDataAgentTurn`, not in `createDataAgent.ts`. `createChatModelAdapter` is the caller that supplies the getter from `ActivePluginsContext`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run src/lib/agent/dataAgent/createDataAgent/createDataAgent.test.ts src/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool.test.ts src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts`

Expected: FAIL. `getPluginAiTools` is not an option.

- [ ] **Step 3: Rebuild tools at the start of `ask`**

Spread the built-in tools, then the plugin tools, only when `queryTools` is not `"plan"`. Default the getter to an empty list. The chat wiring reads the active plugins current at `ask` time, not only at conversation creation. `execute` dynamic-imports `runPluginAiTool`.

- [ ] **Step 4: Run the tests**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/dataAgent/createDataAgent src/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool.ts src/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool.test.ts src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts
git commit -m "feat(agent): register installed plugin tools on each ask"
```

---

### Task 11: `fitRegression`

**Files:**
- Create: `plugins/epidemiology/src/fitRegression/runFitRegression.ts`
- Create: `plugins/epidemiology/src/fitRegression/runFitRegression.test.ts`
- Modify: `plugins/epidemiology/src/index.tsx`
- Modify: `plugins/epidemiology/ava.yaml`
- Modify: `shared/agent/dataAgent/pluginAiTools.gen.ts` by running the emitter
- Modify: `plugins/epidemiology/src/index.test.tsx` if it asserts the manifest command list only. Do not change command assertions. Add the tool key.

**Interfaces:**
- Consumes: `AiToolHandler`, `fitLinearRegression`, `makeRegressionPointsFromRows`, `PluginError`, `DEFAULT_FETCH_ROWS_LIMIT`
- Produces: `runFitRegression(avandar: AvandarApi, args: Readonly<{ xColumn: string; yColumn: string }>): Promise<FitRegressionResult>`. `FitRegressionResult` is `{ slope: number; intercept: number; rSquared: number | null; n: number; isTruncated: boolean }`. The plugin's `aiTools.fitRegression` is `runFitRegression`.

- [ ] **Step 1: Write the failing tests**

Use the exact line from `fitLinearRegression.test.ts`: points `[1, 2, 3, 4, 5]` mapped to `[x, 2 * x + 1]`.

```ts
it("returns the same line the button fits", async () => {
  const result = await runFitRegression(avandarWithRows(EXACT_LINE_ROWS, ["x", "y"]), {
    xColumn: "x",
    yColumn: "y",
  });
  expect(result.slope).toBeCloseTo(2);
  expect(result.intercept).toBeCloseTo(1);
  expect(result.rSquared).toBeCloseTo(1);
  expect(result.n).toBe(5);
  expect(result.isTruncated).toBe(false);
  expect(Object.keys(result).sort()).toEqual(["intercept", "isTruncated", "n", "rSquared", "slope"]);
});

it("returns null rSquared when Y never varies", async () => {
  const result = await runFitRegression(
    avandarWithRows([{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }], ["x", "y"]),
    { xColumn: "x", yColumn: "y" },
  );
  expect(result.rSquared).toBeNull();
  expect(result.slope).toBe(0);
});

it("rejects age when the column is Age", async () => {
  await expect(
    runFitRegression(avandarWithRows([{ Age: 1, y: 2 }], ["Age", "y"]), {
      xColumn: "age",
      yColumn: "y",
    }),
  ).rejects.toThrow('Column "age" is not on the result.');
});

it("rejects the same column and too little data", async () => {
  await expect(runFitRegression(READY, { xColumn: "x", yColumn: "x" })).rejects.toThrow(
    "X and Y are the same column.",
  );
  await expect(runFitRegression(avandarWithRows([{ x: 1, y: 1 }], ["x", "y"]), {
    xColumn: "x",
    yColumn: "y",
  })).rejects.toThrow("Not enough numeric rows to fit a line.");
});
```

`avandarWithRows` implements `context.columns`, `context.queryHandle`, and `data.fetchRows` returning those rows plus `isTruncated`. One test sets `isTruncated: true` and expects the flag through. `fetchRows` is called with `{ columns: [xColumn, yColumn] }` and no `limit`.

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run plugins/epidemiology/src/fitRegression/runFitRegression.test.ts`

Expected: FAIL. `runFitRegression` is missing.

- [ ] **Step 3: Implement the handler and declare the tool**

Copy the tool `description` from the spec's Manifest section verbatim. Check the invocation columns before `fetchRows`. Skip non-numeric rows by calling `makeRegressionPointsFromRows`. Map `rSquared: undefined` to `null`. Wire `aiTools` in `definePlugin`. Regenerate `pluginAiTools.gen.ts`. The drift test from Task 3 must pass.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run plugins/epidemiology/src/fitRegression/runFitRegression.test.ts plugins/epidemiology/src/index.test.tsx packages/shared/plugin-manifest/src/node/__tests__/emitPluginAiTools.integration.test.ts`

Expected: PASS. The generated list contains `avandar.epidemiology` / `fitRegression` and permissions `data:context` and `query:addColumns`.

- [ ] **Step 5: Commit**

```bash
git add plugins/epidemiology shared/agent/dataAgent/pluginAiTools.gen.ts
git commit -m "feat(plugins): fit a regression from the data agent"
```

---

### Task 12: Scripted turn

**Files:**
- Modify: `src/lib/agent/dataAgent/createDataAgent/createDataAgent.test.ts`

**Interfaces:**
- Consumes: `createDataAgent`, `runPluginAiTool`, `runFitRegression`, `ExplorerPluginResultStore`

- [ ] **Step 1: Write the failing test**

```ts
it("returns the five fields and lets the model state the slope", async () => {
  ExplorerPluginResultStore.set({ columns: LINE_COLUMNS, rows: EXACT_LINE_ROWS });
  const dataAgent = createDataAgent({
    ...OPTIONS,
    getPluginAiTools: () => [EPIDEMIOLOGY_DECLARATION],
    runPluginAiTool: (request) => {
      return runPluginAiTool({
        ...request,
        isDataExplorer: true,
        chatResults: [],
        runQuery: vi.fn(),
        invoke: (_context, args) => {
          return runFitRegression(avandarWithRows(EXACT_LINE_ROWS, ["x", "y"]), args);
        },
      });
    },
    streamFn: scriptedStream([
      toolCallMessage("fitRegression", { xColumn: "x", yColumn: "y" }),
      textMessage("The slope is 2."),
    ]),
  });
  const reply = await dataAgent.ask("Fit y on x.");
  expect(reply.text).toBe("The slope is 2.");
  const toolResult = dataAgent.agent.state.messages.find((message) => message.role === "toolResult");
  expect(JSON.parse(toolResultText(toolResult))).toMatchObject({
    slope: expect.closeTo(2),
    intercept: expect.closeTo(1),
    rSquared: expect.closeTo(1),
    n: 5,
    isTruncated: false,
  });
});

it("still ends the turn when run_query returns rows", async () => {
  // existing run_query terminate behavior, with getPluginAiTools returning the fit tool
});
```

Define `avandarWithRows` in this test file. It is the same contract as Task 11: `context.columns`, `context.queryHandle`, and `data.fetchRows` returning those rows with `isTruncated: false`. Do not import the plugin test's helper.

`scriptedStream` follows `_createEndingStreamFn`: the first response's content is one `{ type: "toolCall", id: "call-1", name, arguments }` block and `stopReason: "toolUse"`. The second is text and `stopReason: "stop"`. Clear the store in `afterEach`. The second test's host `showQuery` resolves `{ kind: "rows", columns: [], rowCount: 1 }` and the reply is that query's summary, with no second model call.

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run src/lib/agent/dataAgent/createDataAgent/createDataAgent.test.ts`

Expected: FAIL until `scriptedStream` matches Pi's tool-call message. If `toolUse` is not a `StopReason`, use the member Pi's `AssistantMessage` uses for a tool call. Do not change production code to satisfy a wrong stop reason.

- [ ] **Step 3: Adjust only the test stream**

No production change if Task 10 and Task 11 are in place. If `run_query` no longer terminates because plugin tools were appended, fix `createRunQueryTool` so a rows result still sets `terminate`. That is the only production edit this task may make.

- [ ] **Step 4: Run the test**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/dataAgent/createDataAgent src/lib/agent/dataAgent/createDataAgentTools/runQueryTool.ts
git commit -m "test(agent): a scripted fit returns the slope and continues"
```

---

### Task 13: Authoring

**Files:**
- Modify: `docs/plugin-authoring.md`

**Interfaces:**
- Consumes: the manifest and handler from Task 11

- [ ] **Step 1: Add section 12, "Add a tool the chat can call"**

The section states these facts and no others:

- Declare `contributes.aiTools` with `name`, a plain-text `description` the model sees, and `parameters`.
- Export `aiTools.<name>` from the plugin entry. The key matches `name`.
- The handler reads rows with `avandar.data.fetchRows` on `avandar.context.queryHandle`. It does not receive rows as an argument.
- Return a JSON object. Throw `PluginError("InvalidToolInput", message)` for a caller mistake. The message must not contain a cell value. Any other throw becomes `The tool failed.` for the model.
- The tool runs only when the plugin's install status is `installed`, and only on the hosted data agent.
- Point at `plugins/epidemiology/src/fitRegression/runFitRegression.ts` and the `fitRegression` block in `ava.yaml`.

- [ ] **Step 2: Check the section**

Run: `git diff --no-ext-diff -- docs/plugin-authoring.md`

Expected: section 12 exists, sections 1 through 11 are unchanged, and the file has no em dash.

- [ ] **Step 3: Commit**

```bash
git add docs/plugin-authoring.md
git commit -m "docs(plugins): document data-agent tools"
```

---

### Task 14: Eval case F

**Files:**
- Modify: `scripts/ai-eval/EvalQuestion.ts`
- Modify: `scripts/ai-eval/harnesses/EvalHarness.ts`
- Modify: `scripts/ai-eval/harnesses/pi/PiHarness.ts`
- Modify: `scripts/ai-eval/runtime/gradeEvalAnswer.ts`
- Modify: `scripts/ai-eval/runtime/gradeEvalAnswer.test.ts`
- Create: `scripts/ai-eval/covid/fitRegressionQuestions.ts`
- Modify: `scripts/ai-eval/runEval.ts`

**Interfaces:**
- Consumes: `PLUGIN_AI_TOOLS`, `ExplorerPluginResultStore`, `createDataAgent`'s new options
- Produces: `EvalQuestion.fitRegression?: { rows: readonly Readonly<Record<string, unknown>>[]; columns: readonly string[]; xColumn: string; yColumn: string; slope: number }`. `EvalAnswer.toolNames: readonly string[]`. Selector `F` in `runEval.ts`.

- [ ] **Step 1: Write the failing grader test**

```ts
it("passes F01 when the tool was called and the reply states the slope", () => {
  const verdict = gradeEvalAnswer(FIT_QUESTION, {
    ...EMPTY_ANSWER,
    assistantText: "The slope is 2.",
    toolNames: ["fitRegression"],
  }, {});
  expect(verdict.pass).toBe(true);
});

it("fails F01 when the slope is missing or the tool was not called", () => {
  expect(gradeEvalAnswer(FIT_QUESTION, { ...EMPTY_ANSWER, assistantText: "The slope is 2.", toolNames: [] }, {}).pass).toBe(false);
  expect(gradeEvalAnswer(FIT_QUESTION, { ...EMPTY_ANSWER, assistantText: "I fitted a line.", toolNames: ["fitRegression"] }, {}).pass).toBe(false);
});
```

`FIT_QUESTION` uses the exact line `y = 2x + 1` on columns `x` and `y`, `slope: 2`, and `clarification: "not_needed"`. The reply matches when it contains the slope as a number (`2`) and does not contain a row's raw pair as a table. Keep the check to: `toolNames` includes `fitRegression`, and `assistantText` matches `/\b2\b/`.

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run scripts/ai-eval/runtime/gradeEvalAnswer.test.ts`

Expected: FAIL. `fitRegression` is not a question field.

- [ ] **Step 3: Wire the question outside the default 45**

`PiHarness` records tool-call names onto `toolNames`. The baseline harness sets `toolNames: []`. Before `ask` of a question that has `fitRegression`, set `ExplorerPluginResultStore` to those rows and columns (data type `double`) and pass `getPluginAiTools` returning the epidemiology declaration from `PLUGIN_AI_TOOLS`. Clear the store afterward. `runEval.ts` treats `--questions F` like `--questions P`: it runs `FIT_REGRESSION_QUESTIONS` and not the 45. The question prompt is `Fit y on x for the result on screen.` The page context app is `data-explorer`.

- [ ] **Step 4: Run the grader test**

Run: `pnpm vitest run scripts/ai-eval/runtime/gradeEvalAnswer.test.ts scripts/ai-eval/harnesses/pi/PiHarness.test.ts`

Expected: PASS. Do not run the live eval in this task.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-eval
git commit -m "test(agent): grade a fitRegression question outside the default eval"
```

---

### Task 15: Final verification

**Files:** none, unless a check fails. A failure goes back to the task that owns it. Do not patch it here without a failing test.

- [ ] **Step 1: Run each check on its own**

```bash
pnpm vitest run packages/shared/plugin-manifest packages/web/plugin-sdk shared/agent/dataAgent src/lib/plugins src/lib/agent/dataAgent plugins/epidemiology scripts/ai-eval/runtime/gradeEvalAnswer.test.ts supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts supabase/functions/chat/PostAgentStream/loadInstalledPluginAiTools.test.ts
pnpm type-check:deno
pnpm exec oxfmt --check packages/shared/plugin-manifest packages/web/plugin-sdk shared/agent/dataAgent src/lib/plugins src/lib/agent/dataAgent plugins/epidemiology supabase/functions/chat/PostAgentStream scripts/ai-eval
pnpm exec eslint packages/shared/plugin-manifest packages/web/plugin-sdk shared/agent/dataAgent src/lib/plugins src/lib/agent/dataAgent plugins/epidemiology supabase/functions/chat/PostAgentStream scripts/ai-eval
node apps/ava-cli/dist/main.cjs plugin validate epidemiology
```

The `ava` binary in `apps/ava-cli/dist` may be stale. Build it with `pnpm --filter @avandar/ava-cli build` first if `plugin validate` is missing. Do not relink the global `ava`.

Expected: each command exits 0.

- [ ] **Step 2: Run the fit question, then the default 45**

Needs `OPEN_ROUTER_API_KEY` and `~/cleaned-test-data`. If either is missing, stop and ask. Do not skip the check silently.

```bash
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5 --questions F
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5
```

`anthropic/claude-haiku-5.5` is `DATA_AGENT_MODEL_ROSTER.primary.openRouterId`. Expected: F passes, and the default 45 score is not lower than the last recorded run in `.temp/ai-eval/`. If there is no recorded run, report the score and do not invent a baseline.

- [ ] **Step 3: Commit only fixes that a failing test required**

No empty commit. No commit that only reformats an unrelated file.
