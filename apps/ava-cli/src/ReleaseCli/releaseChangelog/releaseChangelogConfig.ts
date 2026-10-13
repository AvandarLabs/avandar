/**
 * Tunable constants for the `ava release` / `ava release notes` changelog
 * pipeline. Kept in one small file, deliberately free of any logic, so the
 * model or budget can change without touching the code that uses them.
 */

/**
 * The OpenAI model used to turn a release's raw commits into human-readable
 * release notes. Change this single constant to point both `ava release`
 * and `ava release notes` at a different model.
 */
export const RELEASE_CHANGELOG_MODEL = "gpt-5.6-luna";

/**
 * Reasoning effort for the changelog call. This is more interpretive than a
 * straight transduction task (it has to judge whether a subject is already
 * clear, decide what counts as a "nit", and write original summaries from a
 * diff), so it is left at the model's default "medium" rather than pinned
 * low, unlike the i18n translation script this pattern was copied from.
 */
export const RELEASE_CHANGELOG_REASONING_EFFORT = "medium";

export const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

/**
 * Per-commit diff character budget. A release can include one huge
 * squash-merge; without a cap, that single commit's diff could dwarf every
 * other commit's context and blow past a reasonable prompt size.
 */
export const MAX_DIFF_CHARS_PER_COMMIT = 4000;

/** The fixed vocabulary the model must classify every bullet into. */
export const RELEASE_NOTE_GROUPS = [
  "Features",
  "Fixes",
  "Chores",
  "Nits",
] as const;

/**
 * How long to wait for the OpenAI call before giving up. A release can
 * include many commits and a non-trivial amount of diff context, but this
 * step must not be able to hang the release indefinitely.
 */
export const RELEASE_CHANGELOG_FETCH_TIMEOUT_MS = 90_000;
