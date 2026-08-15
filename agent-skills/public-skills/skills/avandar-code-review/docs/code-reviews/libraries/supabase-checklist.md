# Supabase Checklist

Use this checklist when the repo under review manages its database with
Supabase, meaning it has a `supabase/migrations/` or `supabase/schemas/`
directory. If it has neither, **skip this entire checklist**, even when the
diff contains other `.sql` files. These rules are specific to Supabase's
migration runner and declarative-schema tooling, not to SQL in general.

**Load the `supabase-declarative-schema` skill first if it is available.**
It is the authority on this workflow and carries the full reasoning behind
every rule here. This checklist is the review-time subset: what to flag, and
how to tell a real violation from a false positive. Where the two disagree,
the skill wins and this file should be corrected.

Four independently gated sections follow. Run only the ones whose gate the
diff matches.

| Section | Gate |
| --- | --- |
| Migration files | the diff adds a file under `supabase/migrations/` |
| Storage migrations | the diff adds or modifies a migration touching `storage.objects` or `storage.buckets` |
| Schema file numbering | the diff adds, renames, or removes a file under `supabase/schemas/` |
| Session `null` normalization | the diff introduces a `null` on a value from a Supabase auth call |

The first three sections are judged against the **set** of files a diff
touches, not against a single `+` line. Build that list first.

# Migration files

The two rules here are independent and both apply. Ordering says *where* a
new migration may sit in the timeline; consolidation says *how many* files
the branch should end up with.

## New migrations must sort last

- Every newly added migration must sort after the latest migration already
  present in the review base's `supabase/migrations/` directory, and new
  migrations must sort after one another in their dependency order. Compare
  the 14-digit timestamp prefix, not the descriptive suffix. Supabase
  applies pending migrations in timestamp order and tracks those timestamps
  in `supabase_migrations.schema_migrations`, so inserting a branch
  migration before an already-applied one can leave a deployed environment's
  history out of sync, or run a migration before the objects it depends on.
  This most often happens after a rebase with the base branch.

  **Find candidates:**

  ```bash
  git diff --name-status <base>...HEAD -- supabase/migrations/
  git ls-tree -r --name-only <base> supabase/migrations/ \
    | sed 's#supabase/migrations/##' | sort
  ```

  **Exceptions:** none for a new migration. Never rename or edit a migration
  that may already be applied remotely to make room in the timeline; add a
  new migration with a later timestamp instead. Renaming is allowed only for
  a migration that is itself new in this diff, which is what makes the
  consolidation rule below possible.

  This is bad:

  ```text
  base:   20260813214231_restore_storage_policies.sql
  branch: 20260813175930_backfill_gis_roles.sql
  ```

  This is good:

  ```text
  base:   20260813214231_restore_storage_policies.sql
  branch: 20260814010032_backfill_gis_roles.sql
  ```

## Consolidate successive new migrations

- Combine a run of successive new migrations in the same diff into a
  single migration file, preserving the exact resulting schema. A reader
  reviewing eight files that create a table, then alter it, then rename a
  column, then fix its grants has to replay the whole chain in their head
  to learn what the schema ends up as; one file states it directly. Each
  file is also a permanent row in `supabase_migrations.schema_migrations`
  and a separate step on every future `db reset`, so a chain of drafting
  steps becomes permanent history for what is logically one change.

  Only migrations that are **new in this diff** may be combined. A
  migration that already exists on the base branch may have been applied
  to a remote environment, so it must never be edited, renamed, or folded
  into another file.

  **Find candidates:**

  ```bash
  git diff --name-status <base>...HEAD -- supabase/migrations/ \
    | grep '^A'
  ```

  Two or more added files with no storage migration between them are a
  finding. Flag it once, on the first added migration, and name every file
  that should be folded in.

  **Exceptions:**

  1. **A storage migration breaks the run.** A migration is a storage
     migration when every statement in it touches only the `storage`
     schema (for example `storage.objects` policies or bucket rows) and
     nothing outside it. Storage migrations must stay storage-exclusive
     and must stay in their own file, so they act as a barrier: combine
     the run before one and the run after one, but never across it. This
     ordering is normal and correct:

     ```text
     20260814230000_add_analytics_tables.sql
     20260814231000_STORAGE-gate-workspaces-bucket.sql
     20260814232000_add_analytics_views.sql
     ```

     Three files, two consolidation runs of one file each, no finding.

  2. **A statement that cannot share a transaction with the rest.** Some
     statements, such as `alter type ... add value` on an enum used later
     in the same migration, fail when run in the same transaction as their
     dependents. Keep those in their own file and say so in a comment.

  Combining must not change what the migrations do. Fold a later fix-up
  into the definition it corrects rather than replaying create-then-alter,
  keep every statement in dependency order, and give the combined file the
  timestamp of the **last** migration in the run, which is what keeps it
  compliant with "New migrations must sort last" above. Consolidating is
  never a reason to move a migration earlier in the timeline.

  This is bad:

  ```text
  20260815002802_add_analytics_emitters.sql     -- creates helper fn
  20260815012320_add_analytics_schema.sql       -- creates schema
  20260815015518_harden_helper_search_paths.sql -- alters the fn above
  ```

  This is good:

  ```text
  20260815015518_add_analytics_reporting.sql
  ```

  ```sql
  -- The helper is created once, already hardened, instead of being
  -- created and then altered by a later migration in the same diff.
  create or replace function util__email_domain(email text)
  returns text
  language sql
  immutable
  set search_path = ''
  as $$
    select lower(split_part(email, '@', 2));
  $$;
  ```

# Storage migrations

**Gate:** the diff adds or modifies a migration containing any statement
against `storage.objects` or `storage.buckets`. Skip otherwise.

Storage inverts the "never hand-write migrations" rule, because
`supabase db diff` cannot author storage changes and actively destroys
them: `db diff` compares the live database against `supabase/schemas/`, and
if the storage policies are not declared there, it sees policies present in
the database, absent from the desired state, and writes a migration to drop
them. Every rule below exists to close that loop, so a violation of any one
of them silently ends with a bucket that has no policies on a remote
environment. Flag all five.

- **A storage migration must contain storage statements and nothing else.**
  No `public` table changes, no helper functions, no grants, no statement
  touching anything outside the `storage` schema. This is a correctness
  requirement, not tidiness: the file is replayed wholesale by the seed
  pass against an already-migrated database, so a non-storage statement
  runs a second time and out of order. A helper that a storage policy calls
  belongs in its own separate, non-storage migration ordered before it.

  A migration that merely *mentions* storage, such as one adding a `public`
  helper used by a storage policy, is not a storage migration and must not
  be treated as one.

- **Name it `{timestamp}_STORAGE-<description>.sql`.** The `_STORAGE` marker
  is what declares the file exclusively storage and therefore safe to
  replay. It is load-bearing, not cosmetic: only files carrying it may
  appear in `[db.seed] sql_paths`, so a storage-only migration without the
  marker cannot be wired up correctly, and a marked file that contains
  non-storage statements breaks the replay. Flag either mismatch.

- **A new bucket must be created in the migration itself**, with an
  idempotent insert, rather than by hand in the dashboard or by a seed
  script. A bucket that exists only in one environment is invisible to
  every other one.

  ```sql
  insert into storage.buckets (id, name, public)
  values ('my_bucket', 'my_bucket', false)
  on conflict (id) do nothing;
  ```

- **Every statement in the file must be idempotent.** The file runs a
  second time via the seed pass against a database that already applied it
  as a migration, so a bare `create policy` aborts `supabase db reset` with
  `SQLSTATE 42710`. Pair each `create policy` with a preceding
  `drop policy if exists`, and each insert with `on conflict do nothing`.

- **Every policy the migration creates must be reachable from
  `[db.seed] sql_paths` in `supabase/config.toml`.** The seed pass runs
  after the migration pass, which is what makes it the last word on storage
  locally, so a policy that no listed file creates does not survive a
  `db reset`.

  The check is per policy, not per file. It is satisfied either by listing
  the new migration itself, or by a later listed file that recreates the
  same policy. **Do not flag an unlisted storage migration whose policies a
  listed file already recreates** — that is the normal shape once a
  consolidating "restore" file exists, and only files that satisfy the
  idempotency rule may be listed at all. A non-idempotent legacy migration
  deliberately stays out of the list and is superseded by a later
  idempotent one, never edited in place.

  Two traps worth checking by eye rather than trusting:
  1. **Order in the list is significant and is not timestamp order.** A
     file that narrows an earlier file's policies must be listed after it.
  2. **A path matching no file is a warning, not an error.** A typo leaves
     the bucket with zero policies and `supabase db reset` still reports
     success. Verify each listed path against the actual filename character
     by character.

  ```bash
  # policies created by the diff's storage migration, and whether any
  # sql_paths entry recreates them
  grep -oE 'create policy "[^"]+"' supabase/migrations/<new-file>.sql | sort -u
  ```

- **Every policy must also be declared in
  `supabase/schemas/99.storage.sql`.** This is the rule that stops future
  `db diff` runs from dropping the policies, so a storage migration that
  adds or changes a policy without a matching mirror entry is always a
  finding. The mirror holds `create policy` statements only: no
  `drop policy if exists` and no bucket inserts, because a declarative file
  describes desired state and `db diff` does not track DML.

  **Match on policy name, target table, and meaning, not on text.** The two
  files legitimately differ in surface form: a migration generated from
  `pg_dump` carries the normalized rendering (`"storage"."objects"`,
  `as permissive`, `'workspaces'::text`, extra parentheses) while the
  hand-written mirror carries the readable one (`storage.objects`,
  `'workspaces'`). Postgres compares the parsed expression, so those are the
  same policy. Flagging a text difference here is a false positive; flag a
  policy that is **missing** from the mirror, or one whose condition differs
  in substance.

  The authoritative check is an empty diff, not a text comparison:

  ```bash
  # after any storage change, this must print nothing
  supabase stop && PGSSLMODE=disable supabase db diff

  # and the live policy list should match the mirror's names
  psql "$DATABASE_URL" -c "select policyname from pg_policies \
    where schemaname = 'storage' and tablename = 'objects' order by policyname;"
  ```

# Schema file numbering

**Gate:** the diff adds, renames, or removes a file under
`supabase/schemas/`. Skip otherwise.

Supabase applies `supabase/schemas/*.sql` in lexicographic order when it
builds a database, so the two-digit prefix is the dependency graph rather
than decoration. Read it as two levels.

- **Tens are broad layers; units are sub-layers within one.** Each
  multiple of ten opens a layer, and anything in it may depend on any
  earlier layer. Step the units digit by one only when a file directly
  depends on something defined at the index just above it: `31.*` may use
  what `30.*` defines, and stays in the same broad layer because it is the
  same kind of thing.

- **Files that do not depend on each other take the same index.** Five
  independent trigger files are all `31.`, never `31.` through `35.`.
  Distinct numbers assert a dependency that does not exist, and the next
  reader has to re-derive whether the order matters. This is the most
  common violation: a series of files added one at a time, each taking the
  next number out of habit.

  **Find candidates:**

  ```bash
  # For each added or renamed schema file, list the objects it defines and
  # the objects it references, then compare prefixes.
  git diff --name-status <base>...HEAD -- supabase/schemas/
  grep -nE '^\s*create (or replace )?(function|table|type|view) ' \
    supabase/schemas/*.sql
  ```

  A same-index pair is a finding only when one file actually references an
  object the other defines. Independence is the default, so do not flag a
  shared index without finding that reference.

- **Never index with letters.** `10.a.workspaces.sql`, `10b.workspaces.sql`,
  and any other letter-based step are invalid. The index is numeric; if
  another step is needed, use the next number.

- **Renumbering an existing schema file is safe** and is the correct fix
  when the numbering misstates dependencies, because these files are
  declarative: `db diff` compares the final state and the filename never
  reaches the database. Do not carry over the migrations rule here. That
  one forbids renaming a file that may already be applied, and it does not
  apply to `supabase/schemas/`.

This is bad, four independent emitter files claiming a dependency chain:

```text
32.analytics_auth_emitters.sql
33.analytics_workspace_emitters.sql
34.analytics_invite_emitters.sql
35.analytics_subscription_emitters.sql
```

This is good, one shared sub-layer above the `30.` file they all call:

```text
30.usage_analytics_events.sql          defines util__log_analytics_event
31.analytics_auth_emitters.sql
31.analytics_workspace_emitters.sql
31.analytics_invite_emitters.sql
31.analytics_subscription_emitters.sql
```

# Session `null` normalization

**Gate:** the diff introduces a `null` (a `| null` type, a `= null`
initializer, or a `return null`) on a value derived from a Supabase
auth/session call such as `refreshSession`, `getSession`, or `getUser`.
Skip otherwise.

- **Normalize Supabase's `null` to `undefined` at the boundary.** The
  Supabase client returns `Session | null`, but our own signatures use
  `undefined` for absence, so a wrapper that propagates `Session | null`
  outward forces every caller to guard two empty states. Convert with
  `?? undefined` in the wrapper that owns the signature.

  **Exception:** the `onAuthStateChange` callback parameter
  (`(event, session: Session | null) => ...`), whose type Supabase
  dictates. Keep `null` there.

  This is bad:

  ```ts
  let onSessionExpired: (() => void) | null = null;

  async function doRefresh(): Promise<Session | null> {
    const { data } = await supabase.auth.refreshSession();
    return data.session;
  }
  ```

  This is good:

  ```ts
  let onSessionExpired: (() => void) | undefined = undefined;

  async function doRefresh(): Promise<Session | undefined> {
    const { data } = await supabase.auth.refreshSession();
    return data.session ?? undefined;
  }
  ```
