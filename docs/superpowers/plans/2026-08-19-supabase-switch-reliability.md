# Supabase Switch Reliability Implementation Plan

> **Execution constraint:** Implement this plan inline in the active worktree.
> Do not delegate implementation tasks to subagents. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Make `ava supabase switch` use the repository-pinned Supabase CLI,
show live startup output without exposing generated credentials, and ensure
database scripts query the switched worktree's Postgres instance.

**Architecture:** Extend the local command runner with an opt-in streaming mode
that tees child stdout and stderr to the parent while retaining captured output.
Route Supabase commands through `pnpm exec supabase`, enable streaming only for
the switch startup stage, and read the local database identity and port from
the switched `supabase/config.toml`.

**Tech Stack:** Node.js child processes, TypeScript, Vitest, pnpm, Supabase CLI.

## Global Constraints

- Do not change Supabase schemas, migrations, or seed data.
- Do not print `supabase status` JSON or generated credentials.
- Preserve startup rollback and seed behavior.
- Use red-green TDD for every behavioral change.
- Do not commit, push, merge, or publish.

---

## File Structure

- Create
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand/RunLocalCommand.test.ts`
  to test real child-process streaming behavior.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand/RunLocalCommand.ts`
  to add capture and stream execution modes.
- Create
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseCommandOutput/SupabaseCommandOutput.ts`
  and its test to redact generated credentials from startup lines.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types.ts`
  to describe Supabase command output mode.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createDockerIO.ts`
  to select the pinned CLI with pnpm and propagate output mode.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/__tests__/createSupabaseLocalEnvironmentIO.test.ts`
  to verify deterministic CLI invocation.
- Create
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/__tests__/createSupabaseLocalEnvironmentIO.streaming.test.ts`
  to verify streamed adapter output and credential redaction.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.switchRollback.test.ts`
  and
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO.ts`
  to verify startup-only streaming.
- Modify
  `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.ts`
  to stream startup output.
- Move `scripts/db/lib/psql.ts` to
  `scripts/db/lib/PsqlUtils/PsqlUtils.ts` with its focused test, then update its
  two database-script importers.

### Task 1: Stream and capture child-process output

**Interfaces:**

- Consumes: command, arguments, working directory, and optional environment.
- Produces: `RunLocalCommand.run({ ..., outputMode: "stream" })` with the same
  `Promise<CommandResult>` contract as capture mode.

- [ ] Add a behavioral test that starts a Node child, observes stdout before
      the child exits, and verifies captured stdout and stderr.
- [ ] Run the focused test and confirm it fails because streaming mode is not
      supported.
- [ ] Add the minimal spawn-based streaming implementation.
- [ ] Run the focused test and confirm it passes.
- [ ] Add a failing test for a streamed non-zero exit.
- [ ] Implement failed-result capture and confirm both tests pass.
- [ ] Add a failing test for line transformation across child-process chunks,
      implement buffered line forwarding, and confirm it passes.

### Task 2: Select the repository Supabase CLI

**Interfaces:**

- Consumes: `runSupabase(commandArguments, options?)`.
- Produces: execution of
  `pnpm exec supabase ...commandArguments` with optional output mode.

- [ ] Change the Docker adapter test to expect `pnpm exec supabase` and verify
      the streaming option reaches `RunLocalCommand`.
- [ ] Run the focused adapter test and confirm it fails against the bare
      `supabase` invocation.
- [ ] Extend the I/O type and adapter implementation minimally.
- [ ] Run the focused adapter test and confirm it passes.

### Task 3: Stream only the switch startup stage

**Interfaces:**

- Consumes: the optional output mode supported by `runSupabase`.
- Produces: `supabase start` with `outputMode: "stream"`; status remains in
  capture mode.

- [ ] Change the switch workflow test to assert startup streams and status does
      not.
- [ ] Run the focused workflow test and confirm it fails.
- [ ] Enable streaming on the startup call only.
- [ ] Run rollback, status-secret, and seed tests and confirm they pass.

### Task 4: Redact generated startup credentials

**Interfaces:**

- Consumes: one complete Supabase output line.
- Produces: the same line with credential values replaced by `[redacted]`.

- [ ] Add failing tests for JSON credentials, human-readable credential rows,
      and ordinary progress lines.
- [ ] Implement the minimal Supabase output redactor.
- [ ] Route streamed Supabase output through the redactor.
- [ ] Run command-runner, adapter, and workflow tests and confirm they pass.

### Task 5: Route database scripts to the switched Postgres port

**Interfaces:**

- Consumes: the project id and `[db].port` in this worktree's
  `supabase/config.toml`.
- Produces: a SQL runner whose host `psql` arguments use that exact port and
  whose fallback targets the exact project container.

- [ ] Add failing tests for config parsing, switched host-port selection,
      exact-container fallback, and malformed configuration.
- [ ] Replace the implicit `54322` host argument with explicit local database
      configuration.
- [ ] Update both database-script callers to pass the parsed configuration.
- [ ] Run the focused test and confirm it passes.
- [ ] Run a read-only query through the runner in the active switched worktree
      and prove it reaches the configured port.

### Task 6: Verify the complete fix

**Interfaces:**

- Consumes: the completed command runner, adapter, and workflow changes.
- Produces: evidence that the wrapper uses Supabase CLI 2.114.0, streams startup
  progress, and completes a valid isolated switch.

- [ ] Run Prettier on only the changed TypeScript and Markdown files.
- [ ] Run all focused Supabase local-environment Vitest tests.
- [ ] Run Ava CLI type checking and linting for the changed files.
- [ ] Run a real isolated switch with a disposable project id and observe live
      Supabase startup output.
- [ ] Inspect `ava supabase status` and Docker health for the switched project.
- [ ] Preserve the switched instance for branch validation and report the exact
      restore responsibility to the user.
