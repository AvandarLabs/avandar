# Limit Chat Model Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 139-model OpenRouter-curated chat model picker with a hardcoded six-model catalog, deleting the curation pipeline, the cached catalog JSON, the regeneration script, and the `GET /chat/models` endpoint. Along the way, disambiguate the two objects currently both named `AppConfig` into `GlobalAppConfig` and `WebAppConfig`.

**Architecture:** A new `ChatModelOptionModule` in `shared/models/chat/` holds the six models as a compile-time constant, exposed as `ChatModelOption.Catalog` and following the existing `LocalChatModel.Catalog` pattern in the sibling directory. The web client reads it directly through `useChatModelCatalog`, which partitions it into two translated groups; the edge function reads it to validate the model on the send path. No runtime OpenRouter call remains for the catalog.

**Tech Stack:** TypeScript, React 19, Mantine `Combobox`, Lingui, Vitest, Deno (Supabase edge functions), pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-08-12-limit-chat-model-picker-design.md`

---

## Orientation for the implementer

Read this section before Task 1. It explains conventions you will otherwise get wrong.

**Path aliases.** Configured in `vite.config.ts:177-191` and mirrored for Deno in `supabase/functions/chat/deno.json`:

| Alias | Resolves to |
| --- | --- |
| `@/` | `src/` (web app only) |
| `$/` | `shared/` |
| `@sbfn/` | `supabase/functions/` |
| `@avandar/models`, `@avandar/utils`, `@avandar/ui` | published workspace packages under `packages/` |

**File-extension rule.** Files under `shared/` and `supabase/functions/` MUST use explicit `.ts` extensions in their imports, because the edge function runs under Deno. Files under `src/` MUST NOT. Compare `shared/models/chat/LocalChatModel/LocalChatModelModule/LocalChatModelModule.ts:2` (with extension) against `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts:2` (without). Getting this wrong breaks the edge function at deploy time, not at `pnpm type-check` time.

**Arrow-body style.** ESLint requires braces and an explicit `return` in arrow function bodies. Write `(x) => { return x.id; }`, never `(x) => x.id`. Every code block in this plan already follows this.

**Import ordering.** ESLint enforces a non-obvious import order. Do not hand-sort. After editing any file, run:

```bash
pnpm lint:ts:fix-changed
```

**Model branding.** `ChatModelOptionRead` is a `Model.Base`, so every instance needs a `__type: "ChatModelOption"` property. You get it by constructing with `Model.make("ChatModelOption", {...})` rather than a bare object literal. This is why the catalog cannot be a plain array of literals the way `LOCAL_CHAT_MODELS` is (`LocalChatModelT` is not a `Model.Base`).

**Two different objects are named `AppConfig` today. Task 1 fixes that.** Until Task 1 lands you will see both; after it, the bare name `AppConfig` exists nowhere in the repo.

| Before Task 1 | After Task 1 | Contents |
| --- | --- | --- |
| `AppConfig` in `shared/config/AppConfig.ts` | `GlobalAppConfig` in `shared/config/GlobalAppConfig.ts` | Config meaningful in every runtime: web, desktop, edge functions |
| `AppConfig` in `src/config/AppConfig.tsx` | `WebAppConfig` in `src/config/WebAppConfig.ts` | Config meaningful only inside the browser bundle |

The alias prefix is the tell throughout: `$/config/GlobalAppConfig` is shared, `@/config/WebAppConfig` is web-only.

**The `Catalog` name is overloaded between Task 2 and Task 5.** `ChatModelOption.ts` currently declares a *type* named `Catalog` (`{ groups: ChatModelOptionGroup[] }`, the old endpoint's response envelope). Task 2 adds a *value* member also named `Catalog`. TypeScript keeps type and value declaration spaces separate, so both coexist and compile: `ChatModelOption.Catalog.values` resolves against the value, `ChatModelOption.Catalog` in a type annotation resolves against the namespace. This overlap is deliberate and temporary. Task 5 deletes the type once its last consumers go. Do not try to resolve it earlier.

**Commands you will use:**

| Purpose | Command |
| --- | --- |
| Run one test file | `pnpm vitest run <path>` |
| Run all frontend/shared/edge tests | `pnpm test:frontend` |
| Type-check | `pnpm type-check` |
| Lint | `pnpm lint` |
| Autofix imports and formatting | `pnpm lint:ts:fix-changed` |
| Extract i18n strings | `pnpm i18n:extract` |
| Compile i18n catalogs | `pnpm i18n:compile` |

Vitest picks up tests under `shared/`, `src/`, and `supabase/functions/` from the root config (`vite.config.ts:193-206`); `apps/**` and `packages/**` are excluded and belong to other suites.

---

## File Structure

**Created**

| Path | Responsibility |
| --- | --- |
| `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts` | The six-model constant, the default id, and `isValidId`. Runtime-agnostic: no React, no Lingui, no Deno globals. |
| `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.test.ts` | Catalog invariants, including the default-id-is-in-catalog guard. |
| `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts` | Coerces a client-supplied model id to an allowlisted one. Extracted from `PostChatMessages.ts` so it is testable. |
| `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.test.ts` | Allowlist coercion cases. |
| `src/components/ChatPanel/useChatModelCatalog.test.ts` | Group shape, ordering, and offline-group prepending. |

**Renamed**

| From | To |
| --- | --- |
| `shared/config/AppConfig.ts` | `shared/config/GlobalAppConfig.ts` |
| `src/config/AppConfig.tsx` | `src/config/WebAppConfig.ts` (no JSX in the file, so it loses the `x`) |

**Modified**

| Path | Change |
| --- | --- |
| `shared/config/GlobalAppConfig.ts` | Rename the export; absorb `dataManagerApp` and `WAITLIST_URL`; later drop the `chat` key. |
| `src/config/WebAppConfig.ts` | Rename the export; keep only `logoFilename`. |
| 18 config consumer files | Point at the new names (enumerated in Task 1). |
| `shared/models/chat/ChatModelOption/ChatModelOption.ts` | Add the namespace-merge value re-export; later drop the dead `Catalog` type. |
| `shared/types/chat.types.ts:1-10` | Drop the OpenRouter-envelope mention from the file doc comment. |
| `src/components/ChatPanel/useChatModelCatalog.ts` | Read the local catalog; drop the query, `isLoading`, `isError`, `hasDownloadedOfflineModels`. |
| `src/components/ChatPanel/ChatModelPicker/ChatModelPicker.tsx` | Drop loading/error branches and the search field. |
| `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts` | Point at `Catalog.defaultId`; drop `honorStoredWhenMissing`. |
| `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.test.ts` | Follow both changes. |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts` | Delegate to `enforceChatModelAllowlist`. |
| `supabase/functions/chat/ChatRoutes.ts` | Remove the `/models` route. |
| `supabase/functions/chat/ChatRoutes.types.ts` | Remove `/models` from the path tuple *and* the body. |
| `package.json:55` | Remove `chat:regenerate-models`. |

**Deleted**

| Path | Lines |
| --- | --- |
| `supabase/functions/chat/GetChatModels.ts` | 63 |
| `supabase/functions/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts` | 256 |
| `supabase/functions/chat/utils/curateOpenRouterModels/curateOpenRouterModels.test.ts` | 175 |
| `supabase/functions/chat/chat-models-catalog.gen.json` | ~1,100 |
| `scripts/regenerateChatModels.ts` | 84 |

---

## Task 1: Split `AppConfig` into `GlobalAppConfig` and `WebAppConfig`

**Files:**
- Rename: `shared/config/AppConfig.ts` → `shared/config/GlobalAppConfig.ts`
- Rename: `src/config/AppConfig.tsx` → `src/config/WebAppConfig.ts`
- Modify: 18 consumer files, enumerated below

This task is behavior-preserving. It adds no features and changes no runtime values, so there is no new test to write first; the existing suite plus `pnpm type-check` is the regression net. Every rename is mechanical and every move is justified below.

### What moves where, and why

`src/config/AppConfig.tsx` holds five things. Only one of them is actually web-specific.

| Key | Destination | Reasoning |
| --- | --- | --- |
| `logoFilename` | **Stays** in `WebAppConfig` | Documented as "relative to the `public/` directory", which is the Vite web bundle's asset root. Sole consumer is `src/components/AppShell/Logo.tsx`. |
| `dataManagerApp.maxDatasetNameLength` | `GlobalAppConfig` | A domain validation limit on dataset names. A server-side validator would want the identical number. |
| `dataManagerApp.maxDatasetDescriptionLength` | `GlobalAppConfig` | Same. |
| `dataManagerApp.maxPreviewRows` | `GlobalAppConfig` | An ingest/preview limit sent *to* import services as a request parameter, not a rendering concern. |
| `supportEmail` | **Deleted** | Dead. A pure alias of `SUPPORT_EMAIL`, which already lives in the shared file. Zero consumers. |
| `infoEmail` | **Deleted** | Dead. A pure alias of `INFO_EMAIL`. Zero consumers. |
| `featurePlansMetadata` | **Deleted** | Dead. A pure re-wrap of `FreePlanConfig`/`BasicPlanConfig`/`PremiumPlanConfig` from `$/config/FeaturePlansConfig`, which consumers can and do import directly. Zero consumers. |
| `WAITLIST_URL` (standalone const) | `GlobalAppConfig.ts` as a standalone const | A brand-level URL, the same kind of fact as `SUPPORT_EMAIL` and `INFO_EMAIL`, which are already standalone consts in the shared file. Kept standalone to match its new siblings rather than folded into the object. |

The four standalone named exports already in the shared file (`APP_NAME`, `SUPPORT_EMAIL`, `INFO_EMAIL`, `MAX_FREE_PLAN_SEATS`) stay standalone and keep their names. They have seven consumers between them and renaming them is out of scope.

- [ ] **Step 1: Prove the three deleted keys really are dead**

Run:

```bash
grep -rn "supportEmail\|infoEmail\|featurePlansMetadata" \
  src/ shared/ supabase/ tests/ apps/ packages/ 2>/dev/null \
  | grep -v node_modules \
  | grep -v "src/i18n/locales" \
  | grep -v "src/config/AppConfig.tsx"
```

Expected: no output. If anything appears, do not delete that key; move it to `GlobalAppConfig` instead and note the deviation.

(The `src/i18n/locales` exclusion matters: the compiled `messages.ts` catalogs are single enormous lines that will otherwise flood your terminal.)

- [ ] **Step 2: Rename the shared config file**

```bash
git mv shared/config/AppConfig.ts shared/config/GlobalAppConfig.ts
```

- [ ] **Step 3: Rewrite the shared config**

Replace the entire contents of `shared/config/GlobalAppConfig.ts` with the following. The `chat` key is carried over verbatim for now; Task 5 removes it once nothing reads it.

```ts
// ============================================================================
// Core app configurations
// ============================================================================
export const APP_NAME = "Avandar";

/** The email address to use for support inquiries */
export const SUPPORT_EMAIL = "support@avandarlabs.com";

/** The email address to use for general inquiries */
export const INFO_EMAIL = "info@avandarlabs.com";

/**
 * The URL to the waitlist page. This is only used if self-registration is
 * disabled or if we require a sign up code to register.
 */
export const WAITLIST_URL = "https://avandarlabs.com/waitlist";

// ============================================================================
// Subscription plan configurations
// ============================================================================

/** The maximum number of seats allowed for the free plan. */
export const MAX_FREE_PLAN_SEATS = 2;

// ============================================================================
// Global app configuration object
// ============================================================================

/**
 * Configuration that is meaningful in every runtime: the web app, the desktop
 * app, and the Supabase edge functions. Prefer importing from here when a
 * setting must stay in sync everywhere.
 *
 * Settings that only make sense inside the browser bundle belong in
 * `WebAppConfig` (`src/config/WebAppConfig.ts`) instead.
 */
export const GlobalAppConfig = {
  chat: {
    /** Default OpenRouter model when the client does not send a selection. */
    defaultModelId: "openai/gpt-4o-mini",

    /**
     * Model class tokens matched against OpenRouter id, canonical_slug, and
     * display name. A model must match at least one token to appear in the
     * picker (in addition to tool-support and stability filters).
     */
    allowedModelClasses: [
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-5",
      "o1",
      "o3",
      "o4",
      "claude",
      "gemini",
      "llama",
      "kimi",
      "deepseek",
      "mistral",
      "qwen",
    ],

    /**
     * Class tokens for proprietary-hosted models (OpenAI, Anthropic, Google).
     * Checked before `openModelClasses` when assigning a license tier.
     */
    proprietaryModelClasses: [
      "openai",
      "gpt",
      "o1",
      "o3",
      "o4",
      "anthropic",
      "claude",
      "google",
      "gemini",
    ],

    /** Class tokens for open-weights / open-model families. */
    openModelClasses: [
      "meta-llama",
      "llama",
      "kimi",
      "moonshot",
      "qwen",
      "deepseek",
      "mistral",
      "gemma",
    ],
  },

  /** Limits for dataset ingest and preview in the data manager app. */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: 100,

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: 500,

    /** Maximum number of rows to preview */
    maxPreviewRows: 200,
  },
} as const;
```

- [ ] **Step 4: Rename the web config file**

The file contains no JSX, so it does not need the `.tsx` extension it currently carries.

```bash
git mv src/config/AppConfig.tsx src/config/WebAppConfig.ts
```

- [ ] **Step 5: Rewrite the web config**

Replace the entire contents of `src/config/WebAppConfig.ts` with:

```ts
type WebAppConfigType = {
  logoFilename: string;
};

/**
 * Configuration that only means something inside the browser bundle.
 *
 * Anything meaningful outside the browser (the desktop app, the edge
 * functions, a server-side validator) belongs in `GlobalAppConfig`
 * (`shared/config/GlobalAppConfig.ts`) instead.
 */
export const WebAppConfig = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  // TODO(jpsyx): move this to an environment variable so it does not get
  // bundled in every page of the app
  logoFilename: "logoWhite.png",
} as const satisfies WebAppConfigType;
```

Two details that are easy to get wrong here:

- **`as const satisfies`, not bare `satisfies`.** Every sibling config object in this repo uses the combined form: `shared/config/GlobalVizConfig.ts:29`, `shared/config/FeaturePlansConfig.ts:23`, `src/config/FeatureFlagConfig.ts:82`, `src/config/queryOptions.constants.ts:22`. Bare `satisfies` would leave `logoFilename` a mutable `string`.
- **Docs go on the exported object, not the private type.** `WebAppConfigType` is unexported and used once, so JSDoc attached to it reaches nobody: hovering `WebAppConfig` at its call site would show nothing. Attaching the module doc and the `logoFilename` doc to the literal makes both surface at `Logo.tsx`.

Note what disappeared: the `$/config/AppConfig` and `$/config/FeaturePlansConfig` imports (both only fed the three dead keys), the `WAITLIST_URL` const (moved to the shared file in Step 3), and the "split this up into individually exported consts" TODO (moot now that one key remains).

- [ ] **Step 6: Repoint the imports that only pull named constants**

These seven files import `APP_NAME`, `SUPPORT_EMAIL`, or `INFO_EMAIL` and never reference the `AppConfig` identifier, so only the module path changes.

```bash
sed -i '' 's|\$/config/AppConfig|$/config/GlobalAppConfig|g' \
  src/components/AppShell/MobileHeader.tsx \
  src/components/AppShell/Navbar/Navbar.tsx \
  src/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanCard.tsx \
  src/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/openChangePlanModal/useChangePlanModal.tsx \
  src/routes/register.tsx \
  shared/emails/lib/EmailTemplate.tsx \
  shared/utils/http/AvaHTTPError.ts
```

This is safe because `$/config/AppConfig.ts` (with extension, in the two `shared/` files) also matches the pattern and becomes `$/config/GlobalAppConfig.ts`, which is exactly right.

- [ ] **Step 7: Repoint the four files that use the `AppConfig` identifier from `shared/`**

Each of these imports `{ AppConfig }` and reads `AppConfig.chat.*`. Change both the import and every reference.

| File | Import line becomes | References become |
| --- | --- | --- |
| `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts:2` | `import { GlobalAppConfig } from "$/config/GlobalAppConfig";` | `GlobalAppConfig.chat.defaultModelId` (3 sites: lines 54, 63, 64) |
| `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.test.ts:1` | `import { GlobalAppConfig } from "$/config/GlobalAppConfig";` | `GlobalAppConfig.chat.defaultModelId` (3 sites: lines 23, 43, 46) |
| `supabase/functions/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts:2` | `import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";` | `GlobalAppConfig.chat.allowedModelClasses` (line 83), `.proprietaryModelClasses` (line 91), `.openModelClasses` (line 99) |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts:22` | `import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";` | `GlobalAppConfig.chat.defaultModelId` (line 41) |

Note the `.ts` extension on the two `supabase/functions/` files and its absence on the two `src/` files.

Tasks 3, 4, and 5 delete every one of these references again. Repointing them here anyway keeps this task self-contained and every commit green.

- [ ] **Step 8: Repoint the `dataManagerApp` consumers**

These five files import `{ AppConfig }` from `@/config/AppConfig` and read `AppConfig.dataManagerApp.*`. That config now lives in the shared module, so both the path and the identifier change.

In each file, replace:

```ts
import { AppConfig } from "@/config/AppConfig";
```

with:

```ts
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
```

and then replace every `AppConfig.dataManagerApp` with `GlobalAppConfig.dataManagerApp`:

| File | Sites |
| --- | --- |
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx` | line 61 (`numRows:`) |
| `src/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView.tsx` | line 93 (`numRows:`) |
| `src/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView.test.tsx` | line 280 (`preview:`) |
| `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.test.tsx` | line 202 (`preview:`) |
| `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.tsx` | lines 97-98 (destructure), 125 (doc comment), 215 (`rows.slice`) |

In `DatasetImportForm.tsx` the destructure at lines 97-98 becomes:

```ts
const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  GlobalAppConfig.dataManagerApp;
```

and the doc comment at line 125 becomes:

```ts
  /**
   * Regardless of how many rows are passed in, only the first
   * `GlobalAppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
```

- [ ] **Step 9: Repoint the `logoFilename` consumer**

`src/components/AppShell/Logo.tsx` is the only file that keeps using the web config. Replace its entire contents with:

```tsx
import { useLingui } from "@lingui/react/macro";
import { WebAppConfig } from "@/config/WebAppConfig";

type Props = {
  size: "small" | "medium";
};

export function Logo({ size }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <img
      src={`/${WebAppConfig.logoFilename}`}
      className="logo"
      alt={t`Logo`}
      width={size === "small" ? 25 : 28}
    />
  );
}
```

- [ ] **Step 10: Repoint the `WAITLIST_URL` consumer**

`src/routes/register.tsx` currently imports from *both* config modules: `INFO_EMAIL` from `$/config/AppConfig` (line 21, already repointed by Step 6) and `WAITLIST_URL` from `@/config/AppConfig` (line 30). Both constants now live in the same shared module, so merge them into one import and delete the second.

The line 21 import becomes:

```ts
import { INFO_EMAIL, WAITLIST_URL } from "$/config/GlobalAppConfig";
```

Delete line 30 entirely:

```ts
import { WAITLIST_URL } from "@/config/AppConfig";
```

The three `WAITLIST_URL` usages (lines 198, 236, 302) are unchanged.

- [ ] **Step 11: Verify no stale references survive**

Run:

```bash
grep -rn "AppConfig" src/ shared/ supabase/ scripts/ tests/ apps/ packages/ 2>/dev/null \
  | grep -v node_modules \
  | grep -v "src/i18n/locales" \
  | grep -vE "GlobalAppConfig|WebAppConfig"
```

Expected: no output at all. Both bare `AppConfig` identifiers and both old module paths are gone; the final `grep -vE` filters out the two new names, which are of course everywhere.

If `tests/e2e/helpers/constants.ts:14` still shows up, that is a doc comment referencing `AppConfig.dataManagerApp.maxPreviewRows`. Update it to `GlobalAppConfig.dataManagerApp.maxPreviewRows`.

- [ ] **Step 12: Type-check, lint, and run the full non-e2e suite**

Run:

```bash
pnpm lint:ts:fix-changed && pnpm type-check && pnpm test:frontend
```

Expected: type-check clean, all tests pass. Nothing in this task changed a runtime value, so any test failure means a reference was missed.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor(config): split AppConfig into GlobalAppConfig and WebAppConfig"
```

---

## Task 2: The hardcoded catalog module

**Files:**
- Create: `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts`
- Create: `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.test.ts`
- Modify: `shared/models/chat/ChatModelOption/ChatModelOption.ts`

Nothing outside these three files changes in this task. The old endpoint keeps working, so the app stays green throughout.

- [ ] **Step 1: Write the failing test**

Create `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.test.ts`:

```ts
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import { describe, expect, it } from "vitest";

const { Catalog } = ChatModelOption;

describe("ChatModelOption.Catalog", () => {
  it("offers exactly six models, three per license tier", () => {
    expect(Catalog.values).toHaveLength(6);

    const proprietary = Catalog.values.filter((model) => {
      return model.licenseTier === "proprietary";
    });
    const open = Catalog.values.filter((model) => {
      return model.licenseTier === "open";
    });
    expect(proprietary).toHaveLength(3);
    expect(open).toHaveLength(3);
  });

  it("orders every proprietary model ahead of every open model", () => {
    // Count-agnostic on purpose: adding a fourth frontier model is a
    // legitimate catalog edit and should not break the ordering test as well
    // as the count test above.
    const tiers = Catalog.values.map((model) => {
      return model.licenseTier;
    });
    const firstOpenIndex = tiers.indexOf("open");
    expect(firstOpenIndex).toBeGreaterThan(-1);
    expect(tiers.lastIndexOf("proprietary")).toBeLessThan(firstOpenIndex);
  });

  it("uses unique model ids", () => {
    const ids = Catalog.values.map((model) => {
      return model.id;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses OpenRouter's vendor/model id shape, with provider matching the id prefix", () => {
    // Each row hand-repeats the vendor three times (id prefix, name prefix,
    // provider) and the model name twice. These two tests guard the
    // copy-paste edit that is most likely to go wrong.
    Catalog.values.forEach((model) => {
      expect(model.id).toMatch(/^[a-z0-9.-]+\/[a-z0-9.-]+$/);
      expect(model.id.split("/")[0]).toBe(model.provider);
    });
  });

  it("keeps nameWithoutProvider consistent with name", () => {
    Catalog.values.forEach((model) => {
      expect(model.name.endsWith(model.nameWithoutProvider)).toBe(true);
    });
  });

  it("gives every model a non-empty name and nameWithoutProvider", () => {
    // Regression guard: nameWithoutProvider used to be derived by splitting
    // OpenRouter's `name` on ":", which yielded "" for models that ship
    // without a "Vendor: " prefix and rendered a blank picker button.
    Catalog.values.forEach((model) => {
      expect(model.name.length).toBeGreaterThan(0);
      expect(model.nameWithoutProvider.length).toBeGreaterThan(0);
    });
  });

  it("declares tool support for every model", () => {
    Catalog.values.forEach((model) => {
      expect(model.supportsTools).toBe(true);
    });
  });

  it("includes the default model id in the catalog", () => {
    // This is the assertion that would have caught defaultModelId drifting
    // to openai/gpt-4o-mini after that model left the curated catalog.
    const ids = Catalog.values.map((model) => {
      return model.id;
    });
    expect(ids).toContain(Catalog.defaultId);
  });

  it("isValidId accepts every catalog id and rejects unknown ids", () => {
    Catalog.values.forEach((model) => {
      expect(Catalog.isValidId(model.id)).toBe(true);
    });
    expect(Catalog.isValidId("openai/gpt-5.5-pro")).toBe(false);
    expect(Catalog.isValidId("not-a-model")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm vitest run shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.test.ts
```

Expected: FAIL. `ChatModelOption` currently exports only types, so destructuring `Catalog` from it yields `undefined` and the first assertion throws `TypeError: Cannot read properties of undefined (reading 'values')`.

- [ ] **Step 3: Create the catalog module**

Create `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts`:

```ts
import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
// This import must stay `import type`. `ChatModelOption.ts` value-re-exports
// this module, so a value import here would close a real runtime cycle.
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

/**
 * Cloud chat models offered in the picker, proprietary models first so the
 * picker renders "Frontier models" above "Open models".
 *
 * Deliberately tiny: one model per frontier lab, plus the three most-used
 * open-weights families. Every id is an undated alias, so a provider shipping
 * a dated revision needs no edit here.
 *
 * Verified against the OpenRouter catalog on 2026-08-12. To re-verify an id:
 * `curl -s https://openrouter.ai/api/v1/models | jq '.data[] | select(.id == "z-ai/glm-5.2")'`
 *
 * `nameWithoutProvider` is authored by hand rather than derived from `name`.
 * OpenRouter is inconsistent about the "Vendor: " prefix: its
 * `anthropic/claude-opus-5` (not in this catalog) is named plain "Claude Opus
 * 5", while `claude-sonnet-5` is "Anthropic: Claude Sonnet 5". Deriving the
 * short name by splitting on ":" produced an empty string for the unprefixed
 * ones, which rendered a blank picker button.
 */
const CHAT_MODEL_OPTIONS = [
  Model.make("ChatModelOption", {
    id: "anthropic/claude-sonnet-5",
    name: "Anthropic: Claude Sonnet 5",
    nameWithoutProvider: "Claude Sonnet 5",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "anthropic",
  }),
  Model.make("ChatModelOption", {
    id: "openai/gpt-5.6-terra",
    name: "OpenAI: GPT-5.6 Terra",
    nameWithoutProvider: "GPT-5.6 Terra",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "openai",
  }),
  Model.make("ChatModelOption", {
    id: "google/gemini-3.6-flash",
    name: "Google: Gemini 3.6 Flash",
    nameWithoutProvider: "Gemini 3.6 Flash",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "google",
  }),
  Model.make("ChatModelOption", {
    id: "z-ai/glm-5.2",
    name: "Z.ai: GLM 5.2",
    nameWithoutProvider: "GLM 5.2",
    supportsTools: true,
    licenseTier: "open",
    provider: "z-ai",
  }),
  Model.make("ChatModelOption", {
    id: "moonshotai/kimi-k2.6",
    name: "MoonshotAI: Kimi K2.6",
    nameWithoutProvider: "Kimi K2.6",
    supportsTools: true,
    licenseTier: "open",
    provider: "moonshotai",
  }),
  Model.make("ChatModelOption", {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek: DeepSeek V4 Pro",
    nameWithoutProvider: "DeepSeek V4 Pro",
    supportsTools: true,
    licenseTier: "open",
    provider: "deepseek",
  }),
] as const satisfies readonly ChatModelOption.T[];

/** Union of the six catalog ids, derived so it cannot drift from the list. */
type ChatModelCatalogId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];

/**
 * Model used when the client sends no selection, or sends one that is not in
 * the catalog. Tool-calling into the Data Explorer is the chat panel's core
 * job, so the default favors reliability there over per-token price.
 */
const DEFAULT_CHAT_MODEL_ID: ChatModelCatalogId = "anthropic/claude-sonnet-5";

const CHAT_MODEL_ID_SET = new Set<string>(CHAT_MODEL_OPTIONS.map(prop("id")));

function _isValidId(id: string): boolean {
  return CHAT_MODEL_ID_SET.has(id);
}

/**
 * Runtime surface for the {@link ChatModelOption} model. Groups the static
 * catalog of cloud models under `Catalog` so callers reference it as
 * `ChatModelOption.Catalog.values`, mirroring `LocalChatModel.Catalog`.
 *
 * Grouping and group labels live in the picker, not here: this module also
 * runs under Deno on the edge function, where Lingui's `t` is unavailable.
 */
export const ChatModelOptionModule = {
  /** Catalog of cloud chat models offered in the chat model picker. */
  Catalog: {
    values: CHAT_MODEL_OPTIONS,
    defaultId: DEFAULT_CHAT_MODEL_ID,
    isValidId: _isValidId,
  },
};
```

Why `as const satisfies` rather than a `readonly ChatModelOption.T[]` annotation:

- `Model.make` declares `const MProps` (`packages/shared/models/src/Model/ModelModule/ModelModule.ts:15`), so each entry's `id` is already inferred as a literal. An explicit `readonly ChatModelOption.T[]` annotation throws that away and widens `defaultId` to `string`.
- `satisfies` still enforces conformance to `ChatModelOption.T`, so nothing is lost.
- Keeping the literals lets `ChatModelCatalogId` be derived, which turns "the default must be in the catalog" into a **compile error** rather than only a test failure. The test stays as a second net.
- It matches the house style for literal config objects: `shared/config/GlobalVizConfig.ts:29`, `shared/config/FeaturePlansConfig.ts:23`, `src/config/FeatureFlagConfig.ts:82`.

Note for Task 4: `Catalog.values` is now a readonly tuple. The `.filter(...)` in `useChatModelCatalog` returns a fresh mutable array, so the planned code is unaffected. `as const` does not make the element objects deeply readonly, because they come from a function call rather than an object literal.

- [ ] **Step 4: Wire the module into the `ChatModelOption` namespace**

Modify `shared/models/chat/ChatModelOption/ChatModelOption.ts`. Add `import-x/export` to the existing eslint-disable comment and add the value re-export. Leave the namespace body untouched, including the `Catalog` type (Task 5 removes it).

Replace the first line:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
```

with:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
```

Then insert this line immediately after the `import type { ... }` block and before `export namespace ChatModelOption {`:

```ts
export { ChatModelOptionModule as ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts";
```

The finished file:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ChatModelLicenseTier,
  ChatModelOptionGroup,
  ChatModelOptionId,
  ChatModelOptionModel,
} from "$/models/chat/ChatModelOption/ChatModelOption.types.ts";

export { ChatModelOptionModule as ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts";

export namespace ChatModelOption {
  export type T<K extends keyof ChatModelOptionModel = "Read"> =
    ChatModelOptionModel[K];
  export type Id = ChatModelOptionId;
  export type LicenseTier = ChatModelLicenseTier;
  export type OptionGroup = ChatModelOptionGroup;
  export type Catalog = { groups: ChatModelOptionGroup[] };
}
```

This matches `shared/models/chat/LocalChatModel/LocalChatModel.ts` and `shared/models/chat/ChatPageContext/ChatPageContext.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
pnpm vitest run shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 6: Type-check and lint**

Run:

```bash
pnpm lint:ts:fix-changed && pnpm type-check
```

Expected: no errors. If `type-check` complains that `ChatModelOption.Catalog` is not callable or that the value and type conflict, re-read the "The `Catalog` name is overloaded" note in the Orientation section; the value re-export and the namespace type are allowed to coexist.

- [ ] **Step 7: Commit**

```bash
git add shared/models/chat/ChatModelOption/
git commit -m "feat(chat): add hardcoded six-model chat catalog"
```

---

## Task 3: Allowlist the model on the send path

**Files:**
- Create: `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts`
- Create: `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts:34-42,116`

`PostChatMessages.ts:35` currently validates the incoming model with `OPENROUTER_MODEL_ID_PATTERN`, a shape check that accepts any `vendor/model-name` string. Any client can therefore bill us for a model that is not in the picker. We replace the shape check with a real allowlist. The logic moves into its own directory so it is testable, matching the sibling pattern of `PostChatMessages/parsing/parseClarify.ts` + `parseClarify.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.test.ts`:

```ts
import { enforceChatModelAllowlist } from "@sbfn/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import { describe, expect, it } from "vitest";

describe("enforceChatModelAllowlist", () => {
  it("keeps a model that is in the catalog", () => {
    expect(enforceChatModelAllowlist("z-ai/glm-5.2")).toBe("z-ai/glm-5.2");
  });

  it("falls back to the default when no model is sent", () => {
    expect(enforceChatModelAllowlist(undefined)).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("rejects a well-formed model id that is not in the catalog", () => {
    // Shape-only validation used to let this through, which meant a crafted
    // request could bill us for a model the picker never offers.
    expect(enforceChatModelAllowlist("openai/gpt-5.5-pro")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("keeps a non-default catalog model", () => {
    // Guards against a future bug where the function always returns the
    // default and every other test still passes.
    expect(enforceChatModelAllowlist("openai/gpt-5.6-terra")).toBe(
      "openai/gpt-5.6-terra",
    );
  });

  it("rejects a model id that is no longer in the catalog", () => {
    // Still the pre-Task-4 client default, so at this point in the branch this
    // is the mainline path for any user who never touched the picker.
    expect(enforceChatModelAllowlist("openai/gpt-4o-mini")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("rejects malformed input", () => {
    expect(enforceChatModelAllowlist("")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
    expect(enforceChatModelAllowlist("garbage")).toBe(
      ChatModelOption.Catalog.defaultId,
    );
  });

  it("never returns a value outside the catalog", () => {
    // The security contract, stated once. Also the only place the repo
    // records the deliberate verdicts on case, whitespace, and OpenRouter's
    // `:free` / `:batch` variant suffixes: all of them coerce. Accepting
    // `:free` would route to endpoints whose rate limits and data-retention
    // terms we never vetted; accepting `:batch` would change the latency SLA
    // under a synchronous handler. Suffix-stripping would be worse still,
    // silently upgrading a `:free` request to paid billing.
    const adversarialInputs = [
      "",
      " ",
      "garbage",
      "Z-AI/GLM-5.2",
      " z-ai/glm-5.2 ",
      "z-ai/glm-5.2:free",
      "z-ai/glm-5.2:batch",
      "openai/gpt-5.5-pro",
      "../../etc/passwd",
      "z-ai/glm-5.2\n",
      "z-ai/glm-5.2​",
    ];
    adversarialInputs.forEach((input) => {
      expect(
        ChatModelOption.Catalog.isValidId(enforceChatModelAllowlist(input)),
      ).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.test.ts
```

Expected: FAIL with a module-resolution error, because `enforceChatModelAllowlist.ts` does not exist yet.

- [ ] **Step 3: Create the helper**

Create `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts`:

```ts
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

/**
 * Coerces the client-supplied model id to one we actually offer.
 *
 * The picker is a fixed six-model catalog, so anything else is either a stale
 * value in a client's local storage or a crafted request. Both cases fall back
 * to the default rather than erroring, so the chat keeps working.
 *
 * This is a spend control, not just input validation. OpenRouter will happily
 * accept any real model id and bill us at that model's rate, so a passed-
 * through off-catalog id is a live cost lever for any authenticated client.
 *
 * Named `enforce…` rather than `resolve…` to keep it distinct from the
 * client-side `ChatModelStorage.resolveChatModelId`, which answers a different
 * question: which of the models the picker is currently *showing* should be
 * selected. Only this function is a trust boundary.
 */
export function enforceChatModelAllowlist(model: string | undefined): string {
  if (model === undefined) {
    return ChatModelOption.Catalog.defaultId;
  }
  if (ChatModelOption.Catalog.isValidId(model)) {
    return model;
  }
  // Nothing in this edge function has a logger, so `console` is the only
  // signal available; it lands in the Supabase edge function logs. Without
  // this, a stale client and a deliberate off-catalog probe are
  // indistinguishable: both produce a silent, successful, correctly-billed
  // request.
  console.warn(
    `Rejected off-catalog chat model "${model}"; falling back to ${ChatModelOption.Catalog.defaultId}`,
  );
  return ChatModelOption.Catalog.defaultId;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Use the helper in `PostChatMessages.ts`**

In `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`, delete this block (lines 34-42, as rewritten by Task 1 Step 7):

```ts
/** Matches OpenRouter model ids such as `openai/gpt-4o-mini`. */
const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9._-]+$/i;

function _resolveChatModel(model: string | undefined): string {
  if (model && OPENROUTER_MODEL_ID_PATTERN.test(model)) {
    return model;
  }
  return GlobalAppConfig.chat.defaultModelId;
}
```

Add this import alongside the other `@sbfn/chat/PostChatMessages/...` imports:

```ts
import { enforceChatModelAllowlist } from "@sbfn/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts";
```

Change line 116 from:

```ts
    const model = _resolveChatModel(requestedModel);
```

to:

```ts
    const model = enforceChatModelAllowlist(requestedModel);
```

`GlobalAppConfig` is now unused in this file. Delete its import (line 22):

```ts
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
```

- [ ] **Step 6: Verify nothing else in the file needed the config**

Run:

```bash
grep -n "GlobalAppConfig" supabase/functions/chat/PostChatMessages/PostChatMessages.ts
```

Expected: no output. If there is output, keep the import and only remove the parts this task replaced.

- [ ] **Step 7: Type-check, lint, and run the chat tests**

Run:

```bash
pnpm lint:ts:fix-changed && pnpm type-check && pnpm vitest run supabase/functions/chat
```

Expected: type-check clean; all existing chat tests plus the new seven pass.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/
git commit -m "fix(chat): allowlist the requested model instead of shape-checking it"
```

### Deploy-sequencing constraint: Tasks 3 and 4 must ship together

Between this task and Task 4 the two layers disagree, silently and almost completely. The picker is still served by `GetChatModels.ts`, filtered by `GlobalAppConfig.chat.allowedModelClasses`, whose tokens do not include `glm` at all; so `z-ai/glm-5.2` cannot even appear in the picker while the send path already restricts to the six. And `GlobalAppConfig.chat.defaultModelId` is still `openai/gpt-4o-mini`, which is off-catalog, so even the client's own default gets coerced.

Concretely, at the Task 3 commit: a user picks Mistral Large, the request returns HTTP 200, and the answer comes from Claude Sonnet 5 with nothing saying so. The model picker is a decorative control.

This repo deploys the edge functions and the frontend independently, so **do not deploy the edge function from a commit between Task 3 and Task 4.** The branch is only coherent from Task 4 onward. Merging the whole branch at once, which is the plan, avoids this entirely. Task 6 Step 7 is where you confirm the two layers agree in a running app.

---

## Task 4: Read the catalog on the client

**Files:**
- Modify: `src/components/ChatPanel/useChatModelCatalog.ts`
- Create: `src/components/ChatPanel/useChatModelCatalog.test.ts`
- Modify: `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts`
- Modify: `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.test.ts`
- Modify: `src/components/ChatPanel/ChatModelPicker/ChatModelPicker.tsx`

After this task the picker no longer calls `GET /chat/models`. The endpoint still exists and still works; Task 5 removes it.

- [ ] **Step 1: Write the failing hook test**

Create `src/components/ChatPanel/useChatModelCatalog.test.ts`:

```ts
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { afterEach, describe, expect, it } from "vitest";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { renderHook, TestProviders } from "@/test-utils";

function renderCatalog() {
  return renderHook(
    () => {
      return useChatModelCatalog();
    },
    { wrapper: TestProviders },
  );
}

describe("useChatModelCatalog", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns frontier models before open models", () => {
    const { result } = renderCatalog();

    expect(
      result.current.groups.map((entry) => {
        return entry.group;
      }),
    ).toEqual(["Frontier models", "Open models"]);
  });

  it("exposes every catalog model exactly once", () => {
    const { result } = renderCatalog();

    const flattenedIds = result.current.models.map((model) => {
      return model.id;
    });
    const catalogIds = ChatModelOption.Catalog.values.map((model) => {
      return model.id;
    });
    expect([...flattenedIds].sort()).toEqual([...catalogIds].sort());
  });

  it("partitions models by license tier", () => {
    // Without this, swapping the two `modelsInTier` arguments would ship
    // Claude Sonnet 5 under "Open models" and every other test would pass:
    // the label test only checks labels, and the coverage test sorts both
    // sides before comparing.
    const { result } = renderCatalog();

    expect(
      result.current.groups[0]?.models.every((model) => {
        return model.licenseTier === "proprietary";
      }),
    ).toBe(true);
    expect(
      result.current.groups[1]?.models.every((model) => {
        return model.licenseTier === "open";
      }),
    ).toBe(true);
  });

  it("prepends an offline group when a local model is downloaded", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");

    const { result } = renderCatalog();

    expect(result.current.groups).toHaveLength(3);
    expect(result.current.groups[0]?.group).toBe("Offline models");
    expect(result.current.models).toHaveLength(
      ChatModelOption.Catalog.values.length + 1,
    );
  });
});
```

Note: `@/test-utils` re-exports `renderHook` straight from `@testing-library/react` without providers (`src/test-utils/index.ts:17`), so the `{ wrapper: TestProviders }` option is required. Without it, `useLingui()` throws.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm vitest run src/components/ChatPanel/useChatModelCatalog.test.ts
```

Expected: FAIL. The current hook fetches from `APIClient` and returns whatever the mocked-out query gives it, so `groups` will be empty or the group labels will be the old `"Open models · DeepSeek"` shape rather than `["Frontier models", "Open models"]`.

- [ ] **Step 3: Rewrite the hook**

Replace the entire contents of `src/components/ChatPanel/useChatModelCatalog.ts` with:

```ts
import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { useMemo } from "react";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { useDownloadedLocalChatModelIds } from "@/components/ChatPanel/useChatModelCatalog/useDownloadedLocalChatModelIds/useDownloadedLocalChatModelIds";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";

type UseChatModelCatalogResult = {
  groups: ChatModelOption.OptionGroup[];
  models: ChatModelOption.T[];
};

/**
 * The curated cloud catalog plus any downloaded offline models, as picker
 * groups.
 *
 * The cloud catalog is a compile-time constant, so there is nothing to fetch
 * and no loading or error state. Group labels live here rather than in the
 * shared catalog module because only the client can translate them.
 */
export function useChatModelCatalog(): UseChatModelCatalogResult {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const downloadedOfflineIds = useDownloadedLocalChatModelIds();

  const cloudGroups = useMemo(() => {
    const modelsInTier = (
      licenseTier: ChatModelOption.LicenseTier,
    ): ChatModelOption.T[] => {
      return ChatModelOption.Catalog.values.filter((model) => {
        return model.licenseTier === licenseTier;
      });
    };
    return [
      { group: t`Frontier models`, models: modelsInTier("proprietary") },
      { group: t`Open models`, models: modelsInTier("open") },
    ].filter((entry) => {
      return entry.models.length > 0;
    });
  }, [t]);

  const offlineGroup = useMemo(() => {
    return OfflineChatPickerModels.buildGroup(
      downloadedOfflineIds,
      getLocalChatModelCopy,
      t`Offline models`,
    );
  }, [downloadedOfflineIds, getLocalChatModelCopy, t]);

  const groups = useMemo(() => {
    return offlineGroup ? [offlineGroup, ...cloudGroups] : cloudGroups;
  }, [cloudGroups, offlineGroup]);

  const models = useMemo(() => {
    return groups.flatMap(prop("models"));
  }, [groups]);

  return {
    groups,
    models,
  };
}
```

`hasDownloadedOfflineModels` is gone: its only two call sites were the loading and error branches in `ChatModelPicker`, both removed in Step 7.

- [ ] **Step 4: Run the hook test to verify it passes**

Run:

```bash
pnpm vitest run src/components/ChatPanel/useChatModelCatalog.test.ts
```

Expected: PASS, 3 tests. `pnpm type-check` will still fail at this point because `ChatModelPicker.tsx` destructures `isLoading`, `isError`, and `hasDownloadedOfflineModels`. Step 7 fixes that.

- [ ] **Step 5: Update `ChatModelStorage`**

In `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts`, replace the import on line 2 (rewritten by Task 1 Step 7):

```ts
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
```

with:

```ts
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
```

Then replace the whole `resolveChatModelId` member with this version, which drops `honorStoredWhenMissing` (it existed only to tolerate an async catalog) and reads the default from the catalog:

```ts
  /**
   * Resolves the preferred usable model id from the available catalog.
   */
  resolveChatModelId: ({
    availableModels,
    selectedModelId,
  }: Readonly<{
    availableModels: ReadonlyArray<{ id: string }>;
    selectedModelId?: string;
  }>): string => {
    const candidateModelId = selectedModelId ?? _readStoredChatModelId();
    const isCandidateAvailable =
      candidateModelId !== undefined &&
      availableModels.some(propEq("id", candidateModelId));
    const defaultModelId = ChatModelOption.Catalog.defaultId;
    const isDefaultAvailable = availableModels.some(
      propEq("id", defaultModelId),
    );

    return (
      isCandidateAvailable ? candidateModelId
      : isDefaultAvailable ? defaultModelId
      : (availableModels[0]?.id ?? defaultModelId)
    );
  },
```

Leave the `propEq` import on line 1 alone; it is still used.

- [ ] **Step 6: Update `ChatModelStorage.test.ts`**

Replace the entire contents of `src/components/ChatPanel/ChatModelStorage/ChatModelStorage.test.ts` with:

```ts
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CHAT_MODEL_LOCAL_STORAGE_KEY,
  ChatModelStorage,
} from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";

const DEFAULT_MODEL_ID = ChatModelOption.Catalog.defaultId;

describe("chatModelStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the selected model id", () => {
    ChatModelStorage.writeStoredChatModelId("z-ai/glm-5.2");
    expect(window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY)).toBe(
      "z-ai/glm-5.2",
    );
  });

  it("uses the stored model when it is still available", () => {
    const modelId = ChatModelStorage.resolveChatModelId({
      availableModels: [{ id: DEFAULT_MODEL_ID }, { id: "z-ai/glm-5.2" }],
      selectedModelId: "z-ai/glm-5.2",
    });
    expect(modelId).toBe("z-ai/glm-5.2");
  });

  it("falls back to the default when the stored id is stale", () => {
    // A user who picked openai/gpt-5.4 before the catalog shrank lands here.
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: DEFAULT_MODEL_ID }],
        selectedModelId: "openai/gpt-5.4",
      }),
    ).toBe(DEFAULT_MODEL_ID);
  });

  it("falls back to the default when storage is empty", () => {
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: DEFAULT_MODEL_ID }],
        selectedModelId: undefined,
      }),
    ).toBe(DEFAULT_MODEL_ID);
  });

  it("falls back to the first available model when the default is missing", () => {
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: "offline:qwen-1.5b" }],
        selectedModelId: undefined,
      }),
    ).toBe("offline:qwen-1.5b");
  });
});
```

The old `"honors a stored id that is not in the catalog yet when requested"` test is deleted along with the parameter it exercised.

- [ ] **Step 7: Simplify `ChatModelPicker`**

Replace the entire contents of `src/components/ChatPanel/ChatModelPicker/ChatModelPicker.tsx` with:

```tsx
import { useAui } from "@assistant-ui/react";
import { Tooltip } from "@avandar/ui";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Combobox, Group, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import css from "./ChatModelPicker.module.css";

type Props = {
  disabled?: boolean;
};

/**
 * Compact model picker for the chat composer. Shows a small "Model" control;
 * the active model name appears in a tooltip. Clicking opens the grouped
 * catalog.
 *
 * The catalog is a synchronous six-model constant, so there is no loading
 * state, no error state, and no search field.
 */
export function ChatModelPicker({ disabled = false }: Props): JSX.Element {
  const { groups, models } = useChatModelCatalog();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      return ChatModelStorage.readStoredChatModelId();
    },
  );
  const { t } = useLingui();
  const assistantClient = useAui();

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
    onDropdownOpen: () => {
      // `onDropdownOpen` fires synchronously inside `openDropdown`, before
      // React re-renders, and the dropdown below is rendered conditionally.
      // Selecting here without deferring finds no `[data-combobox-option]`
      // elements and silently does nothing, leaving the list unhighlighted.
      requestAnimationFrame(() => {
        combobox.selectActiveOption();
      });
    },
  });

  const resolvedModelId = useMemo(() => {
    return ChatModelStorage.resolveChatModelId({
      availableModels: models,
      selectedModelId,
    });
  }, [models, selectedModelId]);

  useEffect(
    function persistSelectedOfflineModel() {
      const localModelId =
        OfflineChatPickerModels.parseModelId(resolvedModelId);
      if (localModelId) {
        LocalChatModelStore.writeSelectedId(localModelId);
      }
    },
    [resolvedModelId],
  );

  useEffect(
    function writeResolvedModelIdToStorage() {
      if (ChatModelStorage.readStoredChatModelId() === resolvedModelId) {
        return;
      }
      ChatModelStorage.writeStoredChatModelId(resolvedModelId);
    },
    [resolvedModelId],
  );

  // Register the resolved model id with assistant-ui's ModelContext so the
  // chat adapter can read `context.config.modelName` on each run.
  useEffect(
    function registerResolvedModelIdWithAssistantUi() {
      // `register` returns an unsubscribe; returning it as the effect cleanup
      // is what assistant-ui's own `makeAssistantVisible` does. Without it,
      // every model switch and every remount permanently appends a provider
      // to the registry. Behavior stays correct (the last registration wins)
      // but the list grows without bound.
      return assistantClient.modelContext().register({
        getModelContext: () => {
          return {
            config: {
              modelName: resolvedModelId,
            },
          };
        },
      });
    },
    [assistantClient, resolvedModelId],
  );

  const selectedModel = models.find(propEq("id", resolvedModelId));

  const tooltipLabel =
    selectedModel ? t`Using ${selectedModel.name}` : t`Choose a model`;

  return (
    <Combobox
      store={combobox}
      width={300}
      position="top-start"
      withinPortal
      preventPositionChangeWhenVisible
      onOptionSubmit={(modelId) => {
        setSelectedModelId(modelId);
        combobox.closeDropdown();
      }}
    >
      <Tooltip label={tooltipLabel} disabled={combobox.dropdownOpened}>
        {/*
          `targetType="button"` matters now that the search input is gone and
          the trigger is the focused element. Mantine's default `"input"`
          gives the button `aria-activedescendant` without `role="combobox"`
          or `aria-expanded`, which screen readers do not announce, and it
          skips the Space/Enter handling that a button target expects.
        */}
        <Combobox.Target targetType="button" withExpandedAttribute>
          <Button
            type="button"
            variant="light"
            color="neutral"
            size="compact-sm"
            className={css.trigger}
            disabled={disabled}
            aria-label={t`Choose chat model`}
            onClick={() => {
              combobox.toggleDropdown();
            }}
          >
            {selectedModel?.nameWithoutProvider ?? t`Model`}
          </Button>
        </Combobox.Target>
      </Tooltip>

      {combobox.dropdownOpened ?
        <Combobox.Dropdown className={css.dropdown}>
          <Combobox.Options className={css.options}>
            {groups.map((entry) => {
              return (
                <Combobox.Group label={entry.group} key={entry.group}>
                  {entry.models.map((model) => {
                    const isSelected = model.id === resolvedModelId;
                    return (
                      <Combobox.Option
                        value={model.id}
                        key={model.id}
                        active={isSelected}
                      >
                        <Group gap="xs" wrap="nowrap" justify="space-between">
                          <Text size="sm" className={css.optionLabel}>
                            {model.name}
                          </Text>
                          {isSelected ?
                            <IconCheck
                              size={14}
                              className={css.selectedIcon}
                              aria-hidden
                            />
                          : null}
                        </Group>
                      </Combobox.Option>
                    );
                  })}
                </Combobox.Group>
              );
            })}
          </Combobox.Options>
        </Combobox.Dropdown>
      : null}
    </Combobox>
  );
}
```

Changes from the previous version, for review:

- Return type narrows from `JSX.Element | null` to `JSX.Element`; the only `null` path was the `isError` branch.
- `search` state, the `filteredGroups` memo, `Combobox.Search`, and `Combobox.Empty` are gone. `groups` always holds at least the two cloud groups, so there is nothing to filter and no empty state.
- `resolvedModelId` is now always a `string`, so the `if (!resolvedModelId) return;` guards inside the three effects are gone.
- `isTriggerDisabled` collapses to the `disabled` prop.

- [ ] **Step 8: Run the touched tests, type-check, and lint**

Run:

```bash
pnpm lint:ts:fix-changed \
  && pnpm type-check \
  && pnpm vitest run src/components/ChatPanel
```

Expected: type-check clean and all `src/components/ChatPanel` tests pass. `pnpm type-check` should now be green again, since `ChatModelPicker` no longer destructures the removed hook fields.

- [ ] **Step 9: Commit**

```bash
git add src/components/ChatPanel/
git commit -m "refactor(chat): read the model catalog locally instead of fetching it"
```

---

## Task 5: Delete the curation pipeline

**Files:**
- Delete: `supabase/functions/chat/GetChatModels.ts`
- Delete: `supabase/functions/chat/utils/curateOpenRouterModels/` (both files, then the directory)
- Delete: `supabase/functions/chat/chat-models-catalog.gen.json`
- Delete: `scripts/regenerateChatModels.ts`
- Modify: `supabase/functions/chat/ChatRoutes.ts`
- Modify: `supabase/functions/chat/ChatRoutes.types.ts`
- Modify: `shared/config/GlobalAppConfig.ts`
- Modify: `shared/models/chat/ChatModelOption/ChatModelOption.ts`
- Modify: `shared/types/chat.types.ts:1-10`
- Modify: `package.json:55`

Nothing reads any of this after Task 4. This task is pure removal.

- [ ] **Step 1: Confirm the endpoint has no remaining callers**

Run:

```bash
grep -rn "chat/models\|GetChatModels\|curateOpenRouterModels\|chat-models-catalog\|regenerateChatModels" \
  src/ shared/ supabase/ tests/ scripts/ package.json \
  | grep -v node_modules
```

Expected: hits only inside the files this task deletes or modifies (`ChatRoutes.ts`, `ChatRoutes.types.ts`, `GetChatModels.ts`, `scripts/regenerateChatModels.ts`, `package.json`), plus one decoy described next. If anything under `src/` still appears, stop: Task 4 was incomplete.

**One expected decoy hit.** `shared/ServerApiClient/createBrowserServerApiClient.test.ts` uses `"chat/models"` as an arbitrary route string in a generic client test. Its `route` param is typed `string`, so deleting the endpoint does not break it. While you are here, rename that literal to something obviously synthetic such as `"fake/route"` so nobody greps `chat/models` later and concludes the endpoint survived. That file is otherwise out of scope; change only the route literal.

- [ ] **Step 2: Delete the files**

```bash
git rm supabase/functions/chat/GetChatModels.ts \
       supabase/functions/chat/chat-models-catalog.gen.json \
       scripts/regenerateChatModels.ts
git rm -r supabase/functions/chat/utils/curateOpenRouterModels
```

- [ ] **Step 3: Remove the route registration**

Replace the entire contents of `supabase/functions/chat/ChatRoutes.ts` with:

```ts
import { defineRoutes } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GetChatSessionSecret } from "@sbfn/chat/GetChatSessionSecret.ts";
import { PostChatMessages } from "@sbfn/chat/PostChatMessages/PostChatMessages.ts";
import type { ChatAPI } from "@sbfn/chat/ChatRoutes.types.ts";

/** Combines the chat endpoint definitions into the chat edge function API. */
export const ChatRoutes = defineRoutes<ChatAPI>("chat", {
  "/:workspaceId/messages": { POST: PostChatMessages },
  "/:workspaceId/session-secret": { GET: GetChatSessionSecret },
});
```

- [ ] **Step 4: Remove the route type**

The MiniServer DSL writes every route's shape twice: once in the path tuple and once in the body. Both need editing.

Replace the entire contents of `supabase/functions/chat/ChatRoutes.types.ts` with:

```ts
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatRetryContext,
  ChatSessionSecretResponse,
  ConsentAck,
} from "$/types/chat.types.ts";

export type ChatAPI = APITypeDef<
  "chat",
  ["/:workspaceId/messages", "/:workspaceId/session-secret"],
  {
    "/:workspaceId/messages": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          messages: ChatClientMessage.T[];
          context: ChatPageContext.T;
          model?: string;
          consentAcks?: ConsentAck[];
          retryContext?: ChatRetryContext;
        };
        returnType: ChatResponse.T;
      };
    };
    "/:workspaceId/session-secret": {
      GET: {
        pathParams: {
          workspaceId: string;
        };
        returnType: ChatSessionSecretResponse;
      };
    };
  }
>;
```

The `import type { ChatModelOption } ...` line is gone with the route that used it.

- [ ] **Step 5: Delete the dead `Catalog` type**

`ChatModelOption.Catalog` as a *type* had exactly three consumers, all now deleted: `GetChatModels.ts`, `ChatRoutes.types.ts`, and `scripts/regenerateChatModels.ts`. Remove it so only the runtime `Catalog` remains and the name stops being overloaded.

In `shared/models/chat/ChatModelOption/ChatModelOption.ts`, delete this line from the namespace body:

```ts
  export type Catalog = { groups: ChatModelOptionGroup[] };
```

`ChatModelOptionGroup` is still imported and still used by `export type OptionGroup`, so leave that import alone.

**Also delete the dead `Id` type in the same pass.** `ChatModelOption.Id` is declared as `UUID<"ChatModelOption">` (`ChatModelOption.types.ts:8`), but `ChatModelOptionRead` overrides `id` to a plain `string` holding an OpenRouter slug like `z-ai/glm-5.2`. The type is therefore both unreferenced and actively wrong, and it is a trap for the next person who adds a `find(id: ChatModelOption.Id)`. First confirm it is unused:

```bash
grep -rn "ChatModelOption.Id\|ChatModelOptionId" src/ shared/ supabase/ tests/ | grep -v node_modules
```

Expected: only the declaration in `ChatModelOption.types.ts` and the re-export in `ChatModelOption.ts`. If so, delete from `ChatModelOption.ts` its `export type Id = ChatModelOptionId;` line and the now-unused `ChatModelOptionId` entry in the `import type` block, and delete from `ChatModelOption.types.ts` the `ChatModelOptionId` declaration plus the `UUID` import if nothing else in that file uses it.

The finished `ChatModelOption.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ChatModelLicenseTier,
  ChatModelOptionGroup,
  ChatModelOptionModel,
} from "$/models/chat/ChatModelOption/ChatModelOption.types.ts";

export { ChatModelOptionModule as ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts";

export namespace ChatModelOption {
  export type T<K extends keyof ChatModelOptionModel = "Read"> =
    ChatModelOptionModel[K];
  export type LicenseTier = ChatModelLicenseTier;
  export type OptionGroup = ChatModelOptionGroup;
}
```

- [ ] **Step 6: Delete the `chat` key from `GlobalAppConfig`**

Everything under `GlobalAppConfig.chat` is now unread: `defaultModelId` was replaced by `ChatModelOption.Catalog.defaultId` in Tasks 3 and 4, and the three token arrays died with `curateOpenRouterModels.ts` in Step 2.

In `shared/config/GlobalAppConfig.ts`, delete the entire `chat` key, leaving `dataManagerApp` as the object's only member:

```ts
/**
 * Configuration that is meaningful in every runtime: the web app, the desktop
 * app, and the Supabase edge functions. Prefer importing from here when a
 * setting must stay in sync everywhere.
 *
 * Settings that only make sense inside the browser bundle belong in
 * `WebAppConfig` (`src/config/WebAppConfig.ts`) instead.
 */
export const GlobalAppConfig = {
  /** Limits for dataset ingest and preview in the data manager app. */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: 100,

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: 500,

    /** Maximum number of rows to preview */
    maxPreviewRows: 200,
  },
} as const;
```

Leave the standalone named exports above it (`APP_NAME`, `SUPPORT_EMAIL`, `INFO_EMAIL`, `WAITLIST_URL`, `MAX_FREE_PLAN_SEATS`) untouched.

Chat model configuration now lives in `ChatModelOption.Catalog`, next to the model it describes and matching `LocalChatModel.Catalog`.

This step also closes out a bundling concern that Task 1 inherited. The old `src/config/AppConfig.tsx` carried a TODO about not bundling the whole config object into every page. Task 1 pointed five `src/` route files at `GlobalAppConfig`, and because a single object literal is not tree-shakeable per key, those routes were temporarily pulling in the ~40 strings of `chat` token arrays. Deleting `chat` here removes them, so no TODO needs to be carried forward.

- [ ] **Step 7: Verify `GlobalAppConfig.chat` has no readers**

Run:

```bash
grep -rn "GlobalAppConfig.chat" src/ shared/ supabase/ scripts/ tests/ | grep -v node_modules
```

Expected: no output.

- [ ] **Step 8: Update the `chat.types.ts` doc comment**

In `shared/types/chat.types.ts`, the header comment still advertises a type that no longer exists. Change lines 1-5 from:

```ts
/**
 * Auxiliary chat types not yet promoted to dedicated models under
 * `shared/models/chat/`. These cover clarifications, dashboard-block
 * generation, retry context, voice hints, session secrets, consent acks, and
 * the OpenRouter models endpoint envelope.
```

to:

```ts
/**
 * Auxiliary chat types not yet promoted to dedicated models under
 * `shared/models/chat/`. These cover clarifications, dashboard-block
 * generation, retry context, voice hints, session secrets, and consent acks.
```

- [ ] **Step 9: Remove the regeneration script entry**

In `package.json`, delete line 55:

```json
    "chat:regenerate-models": "pnpm vite-script scripts/regenerateChatModels.ts",
```

- [ ] **Step 10: Type-check, lint, and run the full non-e2e suite**

Run:

```bash
pnpm lint:ts:fix-changed && pnpm type-check && pnpm test:frontend
```

Expected: type-check clean, all tests pass. The deleted `curateOpenRouterModels.test.ts` should no longer appear in the run.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor(chat): delete the OpenRouter model curation pipeline"
```

---

## Task 6: i18n catalogs and final verification

**Files:**
- Modify: `src/i18n/locales/*/messages.po` (regenerated, not hand-edited)

- [ ] **Step 1: Extract and compile the message catalogs**

Run:

```bash
pnpm i18n:extract && pnpm i18n:compile
```

- [ ] **Step 2: Review the catalog diff**

Run:

```bash
git diff --stat src/i18n/locales
git diff src/i18n/locales/en/messages.po
```

Expected in the `en` diff:

| Direction | String |
| --- | --- |
| Added | `Frontier models` |
| Added | `Open models` |
| Removed | `Search models` |
| Removed | `No models match your search` |
| Removed | `Loading models...` |

`Offline models`, `Choose a model`, `Choose chat model`, `Model`, and `Using {0}` should all survive. Model display names are proper nouns and are deliberately not translated, so no model name should appear in the catalogs.

If `Open models` shows as added *and* removed, that is fine: the source reference moved from the edge function's group builder to `useChatModelCatalog.ts`.

- [ ] **Step 3: Verify the i18n check passes**

Run:

```bash
pnpm i18n:check
```

Expected: exit 0. This is the CI gate; it re-extracts and fails if `src/i18n/locales` is dirty afterwards.

- [ ] **Step 4: Full lint and type-check**

Run:

```bash
pnpm lint && pnpm type-check
```

Expected: no errors. `pnpm lint` also runs `react-doctor` on the changed files against `develop`; its score output is advisory and cannot fail the command.

- [ ] **Step 5: Run the full test suite except e2e**

Run:

```bash
pnpm test -- --quick
```

Expected: every workspace suite passes. `--quick` skips Playwright.

- [ ] **Step 6: Run the chat e2e tests**

Run:

```bash
pnpm test:e2e tests/e2e/dashboard-chat-block.spec.ts tests/e2e/chat-interactive-workflows.spec.ts
```

Expected: pass, unchanged. Both specs mock the messages endpoint, not `/models`, so removing the catalog endpoint should not affect them. If either fails on a missing model in the picker, check that the stored model id in the test fixture is one of the six catalog ids.

- [ ] **Step 7: Verify the picker in the running app**

Run `pnpm dev`, open the Data Explorer, and open the chat panel's model picker.

Confirm:
- exactly two groups, "Frontier models" then "Open models", three models each
- no search box in the dropdown
- the trigger button shows a short name such as "Claude Sonnet 5", never blank
- selecting a different model and reloading the page keeps that selection
- sending a message still returns a response

Then confirm the config split did not break anything visible: the sidebar logo still renders (`WebAppConfig.logoFilename`), and a dataset import still enforces the name and description length limits (`GlobalAppConfig.dataManagerApp`).

- [ ] **Step 8: Commit**

```bash
git add src/i18n/locales
git commit -m "chore(i18n): refresh catalogs after chat model picker trim"
```

---

## Verification summary

| Claim | Command that proves it |
| --- | --- |
| No bare `AppConfig` symbol remains | `grep -rn "AppConfig" src/ shared/ supabase/ \| grep -v node_modules \| grep -v src/i18n/locales \| grep -vE "GlobalAppConfig\|WebAppConfig"` |
| Catalog holds six models with a valid default | `pnpm vitest run shared/models/chat/ChatModelOption` |
| Off-catalog models cannot be billed | `pnpm vitest run supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist` |
| Picker groups are correct and translated | `pnpm vitest run src/components/ChatPanel/useChatModelCatalog.test.ts` |
| Stale stored model ids fall back safely | `pnpm vitest run src/components/ChatPanel/ChatModelStorage` |
| Nothing references the deleted pipeline | `pnpm type-check` |
| Message catalogs are in sync | `pnpm i18n:check` |
| Nothing else regressed | `pnpm test -- --quick` then `pnpm test:e2e` |

## Findings for separate triage, surfaced by Task 3's review

Locking the model down caps price *per token*. It does not cap tokens, and the review of Task 3 traced `PostChatMessages.ts`'s `bodySchema` and found the larger levers still open. None of these are defects in this branch, and none are fixed here. They want their own ticket.

| Field | Cap today | Reaches OpenRouter |
| --- | --- | --- |
| `messages[].content` | none | yes, verbatim, up to 3 attempts |
| `messages` array length | none | yes |
| `context.lastSql` | none | yes, and twice when `lastError` is also set |
| `context.lastError` | none | yes |
| `context.lastResultColumns` | none (unbounded array, unbounded strings) | yes, fully rendered into the prompt |
| `consentAcks` | none | no, but see below |
| `retryContext.*` | 2000 / 8000 / 400 / 40 | yes |

`retryContext` is the only capped object, and there is no `max_tokens` on the request at all, so output length is unbounded too and the retry-on-empty ladder can fire the whole thing three times. An authenticated client can therefore still drive one request to arbitrary input and output token count on the priciest allowlisted model. Model choice was a bounded ~10x lever; unbounded `messages` is not bounded at all.

Two adjacent non-cost findings from the same trace:

- **Client-supplied system-role messages.** `messages[].role` accepts `"system"`, and client messages are spread in *after* our own system message. A client can append its own system turn, which is a guardrail-bypass lever.
- **Unbounded `consentAcks` with per-element crypto.** `verifyChatConsentAcks` does an async hash plus an HMAC verify per element in a serial loop, before any LLM call. That is a cheap CPU-exhaustion path against the isolate.

Suggested minimum for that ticket: `.max()` on `messages` content and array length, on `context.lastSql` / `lastError`, on `lastResultColumns` length, and on `consentAcks` length; plus an explicit `max_tokens` in the request body; plus rejecting a client-supplied `"system"` role.

## Out of scope

- The four standalone named exports in `shared/config/GlobalAppConfig.ts` (`APP_NAME`, `SUPPORT_EMAIL`, `INFO_EMAIL`, `MAX_FREE_PLAN_SEATS`) keep their current names and stay outside the `GlobalAppConfig` object. Folding them in would touch seven unrelated call sites for no functional gain.
- `supportsTools`, `provider`, and `description` on `ChatModelOption` are written by both the cloud catalog and the offline path and read by neither. `OfflineChatPickerModels.ts:41-48` formats a `description` that is never rendered. Trimming these was considered during design and deliberately deferred to keep this change contained.
- No `useCache` replacement is needed anywhere: the catalog is a module constant, so it is already as cached as it can be.
