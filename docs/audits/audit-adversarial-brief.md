# Adversarial pass brief

Paste this into a fresh agent session, **started in the `fix/audit-<tier>`
worktree**, before doing the human review pass on that tier. Fill in the two
`<>` slots and the tier focus block.

This is not the same as `avandar-code-review` or `/code-review`. Those check
work against a standard. This pass assumes the work is wrong and tries to prove
it. Run this first; run the convention checklists after, if at all.

---

## The prompt

> You are doing an adversarial review of one tier of a catch-up audit. Read
> `docs/audits/2026-08-19-catchup-audit.md` first for context and ground
> rules.
>
> **Tier:** `<t1-sql>`
> **The diff under review:**
>
> ```sh
> git diff review/base review/<t1-sql>            # everything in this tier
> git diff review/base review/<t1-sql> -- <path>  # one file
> ```
>
> **Premise.** Every line of this diff was written by an AI agent working
> against a deadline, without human review. The tests in the diff were written
> by the same agents that wrote the code, so a passing test is evidence that
> the code matches its author's belief about the code, and nothing more. Where
> a test and the code it covers share an assumption, treat the test as
> complicit rather than as confirmation.
>
> **Your job is to refute, not to assess.** For each behaviour the code claims,
> try to construct a case where it does the wrong thing. A finding is only real
> if you can state a concrete failure scenario: specific inputs or state, and
> the specific wrong output, corruption, or exposure that results. "This is
> fragile", "consider extracting", and "this could be clearer" are not
> findings. If you cannot produce the failing scenario, it is not a finding.
> Default to silence.
>
> **Bias.** Prefer one proven defect over ten plausible ones. If you are
> unsure, say so explicitly and mark it unverified rather than padding.
>
> **Tier focus.** <see below>
>
> **What to do with what you find.**
> 1. Append each finding to `docs/audits/2026-08-19-catchup-audit.md`
>    under `## Findings`, in the existing F-N format, with the severity scale
>    already defined there. Include the failure scenario.
> 2. Fix what you are confident about, in this worktree. Where a fix is a
>    judgement call or changes product behaviour, write the finding and leave
>    the code alone.
> 3. Where the gap is missing coverage, write the test rather than describing
>    it. A test that fails before your fix and passes after is worth more than
>    any prose.
> 4. Run the tier's suite before you finish and report the actual output.
>
> **Rules.**
> - All edits happen in this worktree, on `fix/audit-<tier>`. This branch is
>   what merges back to `develop`.
> - Never check out, commit to, or merge a `review/*` ref. Those are
>   regenerated read-only lenses, not branches. Read them with `git diff` only.
> - Do not touch `develop`.
> - Report honestly. If a test fails, say so and paste the output. If you ran
>   out of road on part of the tier, say which part.

---

## Tier focus blocks

Substitute the matching block for `<see below>`.

### t1-sql

> Concentrate on the multi-tenant boundary, in this order:
> 1. **Cross-tenant reads and writes.** For every new or changed policy, ask
>    whether a member of workspace A can reach workspace B's rows. Check the
>    predicate actually constrains `workspace_id`, and that it does so on the
>    table being protected rather than on a joined table.
> 2. **SECURITY DEFINER functions.** These run as owner and bypass RLS. Check
>    each one pins `search_path`, validates its arguments against the caller's
>    workspace, and cannot be called with another workspace's ids.
> 3. **GRANT/REVOKE.** This repo's schemas declare GRANTs only, so functions
>    need explicit REVOKE. There is a known open item: roughly 33 functions are
>    executable by `anon` without a declared grant. Check whether anything
>    added in this window widens that.
> 4. **Migration correctness.** Are the migrations idempotent, ordered
>    correctly against the declarative schemas, and free of statements that
>    silently no-op on a database that already has the object?
> 5. **RPCs as an RLS bypass.** A `security definer` RPC that takes an id and
>    returns rows is an RLS hole unless it re-checks membership itself.
>
> Suite: `pnpm test:db` (pgTAP, privilege validation, publishing migrations).
> This suite gates `migrate` in CI, so a test you add here blocks a bad
> migration rather than merely reporting one.

### t2-edge

> Focus on untrusted input reaching SQL or the model: request-body validation,
> workspace authorization on every route, SQL construction in the chat and QETL
> paths, and whether a caller can name a relation they do not own.
> Suite: the edge function tests under `supabase/functions`.

### t2-core, t3-ui, t4-e2e

> Focus on correctness of state handling and data flow rather than the security
> boundary. Ask what happens on empty, partial, very large, and error inputs,
> and whether the failure is visible to the user or silent.

