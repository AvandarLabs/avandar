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
});
