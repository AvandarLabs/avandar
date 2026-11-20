import { defineConfig } from "react-doctor/api";

/**
 * react-doctor configuration. react-doctor runs as a standalone CLI (not an
 * ESLint plugin) and is wired into `pnpm lint` so every engineer runs it.
 */
export default defineConfig({
  // `pnpm lint` runs Oxlint first. React Doctor's temporary extends config
  // breaks JS import resolution, so React Doctor runs only its curated rules.
  adoptExistingLintConfig: false,
  ignore: {
    // `js-combine-iterations` flags `.map().filter()`-style chains as two
    // passes and tells you to fold them into one `for`/`reduce`. This repo
    // deliberately prefers functional style over imperative loops: a second
    // pass over an array is a negligible cost until N gets very large (see the
    // functional-style exceptions in the `avandar-code-review` skill), so this
    // rule fights our conventions more than it helps. Disabled repo-wide.
    rules: ["react-doctor/js-combine-iterations"],

    // Gitignored build output. `artifact-secret-leak` treats every `.map` as
    // browser-shipped, but `apps/ava-cli/dist` is a Node CLI bundle, and its
    // only match is the `service_role key` pattern in a log-redaction regex.
    files: ["**/dist/**"],

    overrides: [
      {
        // Applied migrations are immutable history. The waitlist table got
        // RLS two days later in `20251122032910_subscriptions_schema_changes`
        // and was dropped in `20260815141744_..._waitlist_removal`.
        files: [
          "supabase/migrations/20251120033342_added_waitlist.sql",
          "supabase/migrations/20251124021247_waitlist_schema_update.sql",
        ],
        rules: [
          "react-doctor/supabase-table-missing-rls",
          "react-doctor/supabase-rls-policy-risk",
        ],
      },
      {
        // The rule fires when `pnpm install` sits near any `secrets.*`
        // reference in the file. pnpm 10 skips dependency lifecycle scripts
        // unless a package is in `pnpm.onlyBuiltDependencies`, which allows
        // only `duckdb`, and every install uses `--frozen-lockfile`. The
        // `lint-typecheck` installs the rule points at have no secrets in
        // their environment at all.
        files: [
          ".github/workflows/pr-develop.yaml",
          ".github/workflows/production.yaml",
          ".github/workflows/staging.yaml",
        ],
        rules: ["react-doctor/build-pipeline-secret-boundary"],
      },
    ],
  },

  supplyChain: {
    // Socket's score gate stays on, but advisory rather than blocking. Two of
    // its current findings show why an automatic fail is the wrong default
    // here: it scores `supabase` 0/100 from a GitHub malware advisory that has
    // since been withdrawn (`pnpm audit` reports nothing for it), and it flags
    // `maplibre-gl` for GHSA-jrc7-96c5-q579, which is real but only reachable
    // through `AttributionControl`, the one caller of the patched
    // `DOM.sanitize`, and every map we build passes `attributionControl:
    // false`. Neither is something an engineer can act on mid-change, and a
    // blocking gate on a third-party score turns an unrelated `package.json`
    // edit into a red build. Findings still print, so a genuine malware alert
    // is still seen.
    severity: "warning",
  },
});
