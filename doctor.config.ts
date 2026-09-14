import { defineConfig } from "react-doctor/api";

/**
 * react-doctor configuration. react-doctor runs as a standalone CLI (not an
 * ESLint plugin) and is wired into `pnpm lint` so every engineer runs it.
 */
export default defineConfig({
  ignore: {
    // `js-combine-iterations` flags `.map().filter()`-style chains as two
    // passes and tells you to fold them into one `for`/`reduce`. This repo
    // deliberately prefers functional style over imperative loops: a second
    // pass over an array is a negligible cost until N gets very large (see the
    // functional-style exceptions in the `avandar-code-review` skill), so this
    // rule fights our conventions more than it helps. Disabled repo-wide.
    rules: ["react-doctor/js-combine-iterations"],
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
