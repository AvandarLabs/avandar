# Privacy Audit AvaModels Design

## Goal

Replace the standalone consent and clarification Dexie databases with standard
Dexie AvaModels and hook-enabled clients backed by `AvaDexie.DB`.

The refactor preserves the current local-only privacy boundary: audit records
remain on the user's device and store metadata rather than submitted values,
question text, or clarification answers.

## Architecture

Add two app-local Dexie models under `src/models/privacy/`:

- `ConsentAuditEntry`
- `ClarificationAuditEntry`

Each model uses `DexieCrudModelSpec`, defines its primary key as `id`, and has an
identity parser registry because the model and IndexedDB representations match.
The model types become the source of truth for the audit entry unions and record
shapes currently declared in the privacy helper modules.

Register both models together in one new `AvaDexie` version. The consent table
indexes `workspaceId`, `userId`, `timestamp`, `context`, and `decision`. The
clarification table indexes `workspaceId`, `timestamp`, `outcome`, and
`turnNumber`.

No data is migrated from `AvandarConsentAuditDB` or
`AvandarClarificationAuditDB`. These databases exist only in the unshipped
feature branch, and their local telemetry can start empty in the standard
database.

## Clients

Add these clients under `src/clients/privacy/`:

- `ConsentAuditEntryClient`
- `ClarificationAuditEntryClient`

Both clients use `createDexieCrudClient` with `AvaDexie.DB` and their model
parsers. They are wrapped with `createUsableServiceClient`, which uses
`withQueryHooks` to expose React Query hooks for standard CRUD operations and
the clients' named operations.

`ConsentAuditEntryClient` owns:

- recording a consent decision
- listing retained entries with workspace, context, and decision filters
- clearing the local consent log

`ClarificationAuditEntryClient` owns:

- recording a shown clarification
- settling its outcome and elapsed time
- listing workspace entries in reverse chronological order

The in-memory map that pairs a shown clarification with its start time remains
private to the clarification client.

CSV serialization is a pure utility rather than a client method because it does
not access persistence and should not receive a query or mutation hook.

## Data Flow

Imperative chat and privacy-boundary code calls the clients' promise methods to
record or update audit rows. Audit failures remain non-blocking: recording a
decision or clarification must not interrupt the user's chat action.

The Privacy Log uses the generated query hooks instead of manual `useEffect`
loading. Clearing the consent log uses the generated mutation hook and
invalidates or refetches the list query through the standard client behavior.

## Testing

Use red-green TDD for:

1. Parser round trips for both model shapes.
2. Client filtering, ordering, retention, insert, update, and clear behavior.
3. The new `AvaDexie` schema version and required indexes.
4. Privacy Log hook integration and refresh behavior where existing component
   tests cover the panel.
5. CSV serialization after it moves to a pure utility.

Run the focused unit tests first, followed by TypeScript checking and the
project's relevant lint command. No Supabase schema or production database work
is involved.

## Scope

This change addresses only the consent and clarification audit persistence
architecture and its direct call sites. It does not change audit fields,
retention duration, displayed copy, consent behavior, or clarification behavior.
