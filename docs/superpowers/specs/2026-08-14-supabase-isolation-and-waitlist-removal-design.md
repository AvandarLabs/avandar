# Supabase Isolation and Waitlist Removal Design

## Context

Avandar's local Supabase stack is shared by default because every worktree uses
the same project id and ports from `supabase/config.toml`. A migration reset or
schema diff in one worktree can therefore stop or overwrite the database used
by another worktree.

The analytics growth phase also assumed that the platform waitlist remained a
supported acquisition path. That assumption is no longer true. Registration
must support either direct self-registration or a fully disabled state, without
signup codes, waitlist records, waitlist email notifications, or waitlist
analytics events.

This design introduces a reusable branch-scoped local Supabase isolation
workflow, removes the waitlist feature, and revises growth analytics around the
remaining account, workspace, invite, and subscription facts.

## Goals

- Let a worktree start an isolated Supabase stack without disturbing another
  worktree's stack.
- Make temporary local configuration changes reversible and branch-scoped.
- Remove the waitlist table and all active application support for waitlist
  signup codes.
- Remove waitlist analytics events and reporting columns.
- Complete the remaining growth analytics triggers and reporting views.

## Non-Goals

- Running more than one temporary Supabase switch for the same branch.
- Changing production or staging environment files.
- Deleting Docker images shared by multiple Supabase projects.
- Rewriting historical migrations that originally introduced the waitlist.
- Adding an in-app analytics dashboard or platform-administrator reader.

## Branch-Scoped Supabase Isolation

### Command interface

`ava supabase switch [new-id] [port]` creates and starts an isolated local
Supabase stack. When `new-id` is omitted, the command kebab-cases the current
Git branch (`feat/analytics-p2` becomes `feat-analytics-p2`). The optional
port is the API base port. When it is omitted, the command chooses a base port
whose complete derived Supabase port set is free.

A branch may have only one switch. A second id, or an omitted id when a switch
already exists, names the existing project and asks whether to start it. A
no means restore first, then switch to a new id.

`ava supabase restore` stops the current branch's temporary stack, restores the
original local files, and removes only resources owned by that temporary
project.

Both commands require a named Git branch. Detached worktrees cannot create or
restore a branch-scoped backup because they lack an unambiguous backup key.

### Backup ownership

Backups live below `.ava/backups/supabase/` and are associated with the
current branch and worktree. Both values are encoded into filesystem-safe
identifiers, so Gitflow names such as `feat/analytics-p2` cannot create
ambiguous nested paths and a copied backup from another worktree cannot block
the current worktree.

Each backup includes exact copies of:

- `supabase/config.toml`
- `.env.development`
- every `.env.development.*` file present when the switch begins

A manifest records the branch, worktree path, temporary project id, selected
base port, derived ports, backed-up files, and lifecycle state. A second switch
on the same branch in the same worktree cannot create another project until
restore completes; the command offers to start the existing one instead.
Backups belonging to other branches or worktrees do not block the current
worktree.

The `.ava/` directory is gitignored because it contains local configuration
backups and development credentials.

### Port selection

The command reads the current API port and every Supabase port field from
`supabase/config.toml`. It preserves each port's offset from the API port when
building the temporary port set.

For an explicit base port, the command verifies the complete derived set is
within the valid TCP port range and available before writing any file. Without
an explicit port, it searches candidate base ports until the complete derived
set is available. A candidate is rejected if any required port is listening or
already published by a running Docker container. Node bind probes cannot see
every Docker Desktop mapping, so switch also reads `docker ps` published host
ports before choosing a set.

### Switch lifecycle

The switch operation is transactional:

1. Validate the Git branch, arguments, backup state, source files, ports, and
   that no Docker resource already carries the temporary project label.
2. Create the branch-scoped backup and manifest.
3. Rewrite the project id and Supabase ports in `supabase/config.toml`.
4. Start Supabase for the temporary project.
5. Read the generated local URLs and credentials from `supabase status`.
6. Rewrite only Supabase-related values in `.env.development*` files.
7. Mark the manifest active and report the temporary project details without
   printing secret values.

If a step after backup creation fails, the command stops the temporary project,
restores the exact original files, and removes the incomplete backup. The
reported error includes the failed stage without including credentials.

### Restore lifecycle

Restore resolves only the current branch's manifest and verifies that its
recorded worktree matches the current worktree. It then:

1. Stops the recorded temporary Supabase project without preserving its local
   database volume.
2. Removes containers, networks, and volumes owned solely by that project.
3. Restores the exact backed-up configuration and development environment
   files.
4. Removes the branch-scoped backup after restoration succeeds.

Shared Docker images and resources belonging to other projects remain intact.
If cleanup partially fails, the original files are still restored and the
remaining resource identifiers are reported for manual cleanup.

## Waitlist Removal

### Registration behavior

`disable-self-registration` remains supported. When enabled, the registration
page explains that registration is unavailable and provides the existing
contact path. When disabled, the page shows direct email and password
registration.

The `require-sign-up-code` flag, waitlist URL, signup-code search parameters,
verification and claim requests, waitlist links, and waitlist-specific UI state
are removed. Registration no longer depends on an edge function or a waitlist
row.

### Removed runtime components

The active waitlist feature is removed from every runtime boundary:

- Delete the `waitlist` edge function and its API type registration.
- Remove the waitlist function block from `supabase/config.toml`.
- Remove `waitlist_signups` from the declarative schema and desktop sync list.
- Remove waitlist signup-code notification types, configuration, rendering,
  and templates. Delete the manual notification-email command because its only
  supported runtime behavior is sending waitlist signup codes.
- Regenerate derived database types and translation catalogs through their
  existing generators rather than editing generated files manually.

Historical migrations remain unchanged. A new generated migration drops the
waitlist table from databases that previously applied those migrations.

## Revised Growth Analytics

The growth phase records ten trigger-owned events:

- `user.registered`
- `user.email_confirmed`
- `user.signed_in`
- `workspace.created`
- `member.removed`
- `workspace.invite_sent`
- `workspace.invite_accepted`
- `subscription.created`
- `subscription.plan_changed`
- `subscription.status_changed`

`waitlist.code_verified` and `waitlist.code_claimed` are removed from the event
registry and the database category mapping. The TypeScript email-domain helper
planned only for waitlist emission is not added. The SQL email-domain helper
remains necessary for database trigger payloads.

The `analytics` schema remains unexposed to PostgREST and readable only by the
service role over a direct connection. Its seven views retain their approved
purposes, with one acquisition change: `analytics.acquisition_funnel` starts at
registration and reports email confirmation and first workspace creation by
registration cohort. It has no waitlist verification or claim columns.

The activation and chat-health views may expose empty columns for Phase 3
events, as described by the analytics design. No Phase 3 emitters are added
here.

## Error Handling and Safety

Every analytics trigger body catches all exceptions and returns `null`, so
analytics failures cannot break signup, workspace, invite, membership, or
subscription writes. Trigger functions use `security definer`, an empty search
path, and fully qualified object names. Each new trigger function revokes
`execute` from `public`, `anon`, and `authenticated` so it is not a callable
public API.

The isolation CLI never accesses a remote Supabase project. It invokes only
local Supabase commands and never uses linked or database URL flags. It does
not print backed-up keys or generated secret values.

Production database writes remain prohibited.

## Testing

The isolation CLI is covered with unit tests around:

- explicit and automatic base-port selection
- complete derived-port availability checks
- branch-safe backup identity
- same-branch nested-switch refusal
- other-branch backup tolerance
- configuration and environment rewriting
- startup failure rollback
- successful restore and branch-owned cleanup

Command execution and port probing are injected boundaries so tests do not
start Docker or bind real project ports.

Waitlist removal starts with failing tests that assert the table and event
names are absent from the desired system. Registration tests verify that the
page no longer branches through a signup-code flow. Existing type checks and
frontend tests verify that deleted API and email types have no remaining call
sites.

Each analytics task follows red/green TDD with focused pgTAP or Vitest tests.
Database migrations and pgTAP suites run only after `ava supabase switch` has
successfully created the isolated stack. Final verification includes an empty
declarative schema diff, the complete database suite, type checks, frontend
tests, lint, and a final code review.
