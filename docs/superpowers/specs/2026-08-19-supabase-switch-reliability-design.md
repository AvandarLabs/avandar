# Supabase Switch Reliability Design

## Context

`ava supabase switch` currently invokes a bare `supabase` executable through
the caller's `PATH`. A globally installed CLI can therefore override the
repository dependency. On the affected machine, Ava selected Supabase CLI
2.98.2 while the repository lockfile provides 2.114.0.

The command also buffers every child process until completion. During a slow
`supabase start`, the user sees no progress and cannot distinguish image pulls,
health checks, migrations, or a genuine hang.

## Goals

- Always run the Supabase CLI version installed by this repository.
- Stream all `supabase start` stdout and stderr while the command runs.
- Preserve every startup line while replacing generated credential values with
  `[redacted]`.
- Preserve streamed output in the returned command result so startup errors
  retain their diagnostic details.
- Keep machine-readable `supabase status` output private because it contains
  generated credentials.
- Preserve transactional rollback when startup or status collection fails.
- Ensure local database scripts target the switched worktree database instead
  of the shared `avandar` database.
- Cover binary selection and streaming with behavioral tests.

## Non-Goals

- Change Supabase schemas, migrations, or seed contents.
- Change which Supabase services start.
- Print generated credentials from `supabase status`.
- Add a second health-check system around the Supabase CLI. `supabase start`
  performs health checks unless explicitly passed `--ignore-health-check`,
  which Ava does not pass.
- Redesign cross-worktree port allocation in this change.

## Considered Approaches

### Invoke the bare `supabase` executable

This preserves the current implementation but continues to depend on the
caller's `PATH`. It cannot guarantee the repository version and is rejected.

### Resolve `node_modules/.bin/supabase` directly

This selects the local dependency without another process, but platform-specific
launcher names and command execution behavior become Ava's responsibility.
This is deterministic but unnecessarily couples Ava to package-manager bin
layout.

### Invoke `pnpm exec supabase`

This uses the package manager already required by the repository, resolves the
workspace dependency consistently across supported platforms, and avoids
depending on Supabase package internals. This is the selected approach.

### Resolve the local Postgres port from Docker

Docker reports the port published by a running container, but it is an
unnecessary second source of truth. More importantly, falling back to `54322`
when Docker inspection fails can silently reconnect a switched worktree to the
shared database. This approach is rejected.

### Resolve the local Postgres port from `supabase/config.toml`

The switch already writes the isolated database port into the worktree's
configuration before starting Supabase. Database scripts can therefore read the
project id and `[db].port` together and pass both explicitly to their SQL
runner. Missing configuration is an error rather than permission to query the
shared stack. This is the selected approach.

## Architecture

`RunLocalCommand` will support two output modes:

- `capture`: the existing default, which buffers stdout and stderr.
- `stream`: pipes both streams, forwards each complete line promptly to the
  parent process, and accumulates the original chunks for the final
  `CommandResult`.

The streaming implementation will use `spawn` rather than `execFile` because
`execFile` exposes output only after the process exits. Spawn errors and
non-zero exit codes will become `{ ok: false, stdout, stderr }`, matching the
existing command contract.

Streaming will forward complete lines through an optional transformation. This
prevents a credential split across child-process chunks from bypassing
redaction. Supabase startup output will transform JSON credential fields and
human-readable credential rows while preserving URLs, progress, warnings, and
diagnostics.

`createDockerIO` will invoke every Supabase command as
`pnpm exec supabase <arguments>`. Its `runSupabase` method will accept an
optional output mode and pass it to `RunLocalCommand`.

`SupabaseLocalEnvironment` will request streaming only for `supabase start`.
The subsequent `supabase status -o json` remains captured because its stdout
contains keys that are used to rewrite development environment files.

The shared database-script SQL runner will consume an explicit local project id
and host port. Host `psql` will use that port. If the host client is unavailable,
the existing container fallback will still execute `psql` inside the exact
project container on its internal port `5432`.

## Data Flow

1. Switch preparation validates project identity, Docker ownership, and ports.
2. Ava rewrites the temporary local Supabase configuration.
3. Ava starts `pnpm exec supabase start` in streaming mode.
4. Supabase stdout and stderr appear in the terminal as they are emitted;
   generated credential values appear as `[redacted]`.
5. Ava receives the complete captured output and checks the exit status.
6. Ava captures `pnpm exec supabase status -o json` without printing it.
7. Ava rewrites environment files and seeds the isolated project.
8. Any startup or status failure enters the existing rollback path.
9. Later migration and privilege scripts read the switched `[db].port` and
   connect to that database rather than hardcoding the shared port.

## Error Handling

- A process launch error returns a failed `CommandResult` with the launch
  message in stderr.
- A non-zero exit retains all streamed stdout and stderr for the existing
  stage-specific error.
- `supabase status` output is never streamed or included in an error message.
- Raw captured startup output remains internal to its command result and is not
  included in switch errors; only stderr is used for the stage error.
- Missing or malformed local project and database-port configuration fails
  before any SQL connection is attempted.

## Testing

- A focused `RunLocalCommand` test launches a real Node child process that
  emits stdout, waits, then emits stderr. The test verifies the first chunk is
  forwarded before process completion and both streams are captured.
- A non-zero child-process test verifies streamed diagnostics remain available
  in the failed result.
- Output transformation tests verify redaction across split child-process
  chunks and both JSON and human-readable credential formats.
- Docker adapter tests verify Supabase commands use
  `pnpm exec supabase` and propagate streaming mode.
- Switch workflow tests verify `start` streams while `status -o json` remains
  captured.
- Existing rollback, seed, port, and environment tests run as regressions.
- Database-script tests verify switched ports reach host `psql`, host-client
  failures use the exact project container, and malformed config never falls
  back to the shared port.
- Final validation runs the focused Ava CLI test suite and a real isolated
  `ava supabase switch` followed by status inspection.
