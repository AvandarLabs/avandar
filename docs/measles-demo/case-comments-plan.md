# Case Comments and Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a team comment on a case (rich text, markdown, `@` mentions, reactions, edit and delete) in a per-case activity feed that is built on an append-only audit log.

**Architecture:** Postgres holds `comments` (current state) plus four trigger-maintained tables: `comment_revisions` (every earlier body), `comment_mentions` (extracted from the stored document), `activity_events` (the append-only log the feed reads), and `comment_reactions`. The record page moves onto the `AppView` layout with the case's fields in the rail and a feed plus docked TipTap 3 composer in the content column. One shared TipTap extension list drives both the editor and a static renderer, which is the seam Phase 2 embeds plug into.

**Tech Stack:** Supabase Postgres (declarative schemas, RLS, plpgsql triggers, pgTAP), TypeScript, React 19, Mantine 9, TipTap 3.23.4 (`@mantine/tiptap`, `@tiptap/extension-mention`, `@tiptap/markdown`, `@tiptap/static-renderer`), TanStack Query and Router, zod 4, Lingui, Vitest, Playwright.

**Spec:** [`docs/measles-demo/case-comments-design.md`](case-comments-design.md). Read it before Task 1.

---

## Before you start

Read these once. They are the rules this plan's code follows.

- `CLAUDE.md` (root): scope, naming, comments, i18n, the Supabase switch stop condition, e2e rules.
- `docs/rules/typescript.md`, `docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`.
- `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md` (required before touching `src/views/`).
- `agent-skills/public-skills/skills/supabase-declarative-schema/SKILL.md` (load the `supabase-declarative-schema` skill before Task 2).
- `agent-skills/public-skills/skills/ava-model-creation/SKILL.md` (load the `ava-model-creation` skill before Task 8). Its client example is out of date: use `createRdbCrudClient` as shown in this plan.

House conventions this plan relies on:

- `shared/` files import siblings with a `.ts` extension and never import from `src/`. `src/` files import `shared/` through `$/` without the extension.
- Import a model's entry file (`$/models/X/X.ts`) and use its namespace (`X.T`, `X.Id`). Never import `X.types.ts` from outside the model folder.
- All user-facing strings go through Lingui (`useLingui` + `` t`...` ``, `<Trans>`, or `msg` + `i18n._()` outside components).
- No em dashes anywhere (code, comments, docs, copy).
- Component tests use `render`, `screen`, `fireEvent`, `waitFor` from `@/test-utils`. There is no `user-event`. Wrap with a `QueryClientProvider` through `render(ui, { wrapper })` when a component uses query hooks.
- Run one Vitest file: `pnpm vitest run <path>`.
- Commit by path, never `git add -A` (a Supabase switch rewrites `supabase/config.toml`, which must never be committed).

## File structure

**Database (`supabase/`)**

| File | Responsibility |
| --- | --- |
| `schemas/00.enum.activity_events__kind.sql` | Event kinds |
| `schemas/00.enum.activity_events__source.sql` | Where an event came from |
| `schemas/00.enum.comment_reactions__kind.sql` | The six reactions |
| `schemas/00.enum.comment_revisions__reason.sql` | Why a revision was kept |
| `schemas/21.comments.sql` | `comments` table, RLS, grants, subject validation trigger |
| `schemas/22.comment_revisions.sql` | Earlier bodies (service role only) |
| `schemas/22.comment_reactions.sql` | One reaction per person per comment |
| `schemas/22.comment_mentions.sql` | Mentioned users, trigger-owned |
| `schemas/22.activity_events.sql` | Append-only log |
| `schemas/23.comments__audit_triggers.sql` | Revision, activity, and mention triggers on `comments` |
| `tests/database/permissions/rls_case_activity.test.sql` | RLS for the five tables |
| `tests/database/case_activity/comment_audit_triggers.test.sql` | Triggers, constraints, Sync safety |
| `tests/database/permissions/exact_data_api_grants.test.sql` | Modify: expected grants |
| `migrations/<timestamp>_case_comments.sql` | Generated |

**Shared models (`shared/models/`)**

| File | Responsibility |
| --- | --- |
| `RichTextDocument/RichTextDocument.ts` | Namespace, document types, constants, parser, plain text, mention extraction |
| `RichTextDocument/RichTextDocument.test.ts` | Tests |
| `comments/Comment/{Comment.ts,Comment.types.ts,CommentParsers.ts,CommentParsers.test.ts}` | Comment model |
| `comments/CommentReaction/{CommentReaction.ts,CommentReaction.types.ts,CommentReactionParsers.ts}` | Reaction model |
| `activity/ActivityEvent/{ActivityEvent.ts,ActivityEvent.types.ts,ActivityEventParsers.ts,ActivityEventParsers.test.ts}` | Activity event model |

**Clients (`src/clients/`)**

| File | Responsibility |
| --- | --- |
| `comments/CommentClient.ts` | CRUD for comments |
| `comments/CommentReactionClient.ts` | CRUD for reactions |
| `activity/ActivityEventClient.ts` | `getCaseActivityPage` feed query |

**Rich text (`src/components/RichText/`)**

| File | Responsibility |
| --- | --- |
| `createRichTextExtensions.ts` | The one extension list |
| `RichTextMembersContext.ts` | Resolves a user id to a current name |
| `UserMention/UserMention.ts` | The `userMention` node |
| `UserMention/UserMentionChip.tsx` (+ `.module.css`) | How a mention looks, in the editor and the feed |
| `UserMention/filterMentionCandidates.ts` (+ test) | Typeahead matching |
| `UserMention/UserMentionList.tsx` (+ `.module.css`, test) | The `@` dropdown |
| `UserMention/createUserMentionSuggestion.ts` | Wires the dropdown into the suggestion plugin |
| `PasteMarkdown/PasteMarkdown.ts` (+ test) | Markdown on paste |
| `RichTextView/RichTextView.tsx` (+ `.module.css`, test) | Static rendering |
| `RichTextComposer/RichTextComposer.tsx` (+ `.module.css`, test) | Editor plus toolbar |

**Record page (`src/views/IndividualManagerApp/`)**

| File | Responsibility |
| --- | --- |
| `index.tsx` | Modify: outlet layout so `AppViewBody` owns scrolling |
| `SingleIndividualView/index.tsx` | Rewrite on `AppView` |
| `SingleIndividualView/CaseDetailsRail.tsx` (+ test) | Fields in the rail |
| `SingleIndividualView/CaseActivityFeed/CaseActivityFeed.tsx` (+ `.module.css`, test) | The feed |
| `.../CaseActivityFeed/useCaseActivityFeed.ts` | Paging and comment-link loading |
| `.../CaseActivityFeed/activityFeedItemRenderers.tsx` (+ test) | Kind to row component |
| `.../CaseActivityFeed/groupActivityByDay.ts` (+ test) | Day separators |
| `.../CaseActivityFeed/CommentCard/CommentCard.tsx` (+ `.module.css`, test) | One comment |
| `.../CaseActivityFeed/CommentCard/CommentActionsMenu.tsx` | Edit, copy link, delete |
| `.../CaseActivityFeed/CommentReactions/commentReactionKinds.ts` (+ test) | Labels, icons, toggle and summary logic |
| `.../CaseActivityFeed/CommentReactions/CommentReactions.tsx` (+ `.module.css`, test) | Reaction row and picker |
| `.../CaseActivityFeed/CaseActivityComposer/CaseActivityComposer.tsx` (+ test) | Docked composer, drafts, offline |
| `.../CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage.ts` (+ test) | Per-case drafts |
| `SingleIndividualView/ActivityBlock.tsx` | Delete |
| `SingleIndividualView/RecordAttributesList.tsx` (+ test, + `.module.css`) | Delete (replaced by `CaseDetailsRail`) |

**Other**

| File | Responsibility |
| --- | --- |
| `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx` | Modify: `comment` search param |
| `apps/desktop/sync/syncable-tables.ts` | Modify: exclude the five tables |
| `tests/e2e/helpers/seedCaseRecord.ts` | E2E setup helper |
| `tests/e2e/case-activity.spec.ts` | E2E spec |
| `docs/measles-demo/case-activity-architecture.md` | New architecture doc |
| `docs/ontology-architecture.md`, `docs/production-plan-world-humanitarian-day.md` | Modify |

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 1: Confirm the worktree and branch**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/comments`

- [ ] **Step 2: Check the Supabase switch (stop condition)**

Run: `ava supabase status`
Expected: the first line is green and names a switched project for this branch, not the shared `avandar` stack. If it is yellow, run `ava supabase switch`, then `ava supabase status` again. If `ava` is not found, run `pnpm build:ava-cli` first. Do not run any database command until status is green.

- [ ] **Step 3: Confirm the baseline is green**

Run: `pnpm vitest run src/views/IndividualManagerApp`
Expected: PASS.

---

### Task 1: Install TipTap packages

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Add the packages at the installed TipTap version**

Run: `pnpm add @tiptap/extension-mention@3.23.4 @tiptap/suggestion@3.23.4 @tiptap/markdown@3.23.4 @tiptap/static-renderer@3.23.4`
Expected: the four packages appear in `dependencies` next to the other `@tiptap/*` entries. Pin exactly `3.23.4` so every `@tiptap/*` package shares one ProseMirror copy.

- [ ] **Step 2: Verify one copy of `@tiptap/core`**

Run: `pnpm why @tiptap/core | grep -c "@tiptap/core 3.23.4"`
Expected: a count of 1 or more, and no other `@tiptap/core` version listed by `pnpm why @tiptap/core`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(comments): add TipTap mention, markdown, and static renderer packages"
```

---

### Task 2: pgTAP tests for the audit triggers (red)

Load the `supabase-declarative-schema` and `supabase-postgres-best-practices` skills now.

**Files:**
- Create: `supabase/tests/database/case_activity/comment_audit_triggers.test.sql`

- [ ] **Step 1: Write the failing test file**

```sql
\set ON_ERROR_STOP on

/**
 * Triggers and constraints on `comments`: every change writes a revision and
 * an activity event, mentions are extracted from the stored document, and
 * Sync's upsert leaves comments intact.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e1000001-0000-4000-8000-000000000001'::uuid, 'activity_author@test.dev', 'authenticated', 'authenticated'),
  ('e1000002-0000-4000-8000-000000000002'::uuid, 'activity_member@test.dev', 'authenticated', 'authenticated'),
  ('e1000003-0000-4000-8000-000000000003'::uuid, 'activity_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e1100001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid, 'activity ws', 'activity-ws'),
  ('e1100002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid, 'activity other ws', 'activity-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e1200001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid),
  ('e1200002-0000-4000-8000-000000000002'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'e1000002-0000-4000-8000-000000000002'::uuid),
  ('e1200003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values
  ('e1300001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'activity concept', true),
  ('e1300002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'other concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values
  ('e1400001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'Case one', 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-1'),
  ('e1400002-0000-4000-8000-000000000002'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'Case two', 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-2'),
  ('e1400003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'Other case', 'e1300002-0000-4000-8000-000000000002'::uuid, 'ext-9')
on conflict (id) do nothing;

-- The actor every trigger records.
select set_config('request.jwt.claims', '{"sub":"e1000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e1500001-0000-4000-8000-000000000001'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"first"}]}]}'::jsonb,
  'first'
);

select plan (16);

-- 1. Insert writes one comment_created event.
select is (
  (
    select jsonb_build_object('kind', e.kind, 'actor', e.actor_user_id, 'case', e.individual_id, 'payload', e.payload)
    from public.activity_events e
    where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'kind', 'comment_created',
    'actor', 'e1000001-0000-4000-8000-000000000001',
    'case', 'e1400001-0000-4000-8000-000000000001',
    'payload', '{}'::jsonb
  ),
  'inserting a comment logs comment_created with the actor and the case'
);

update public.comments
set
  body = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"second"}]}]}'::jsonb,
  body_text = 'second'
where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

-- 2. Editing keeps the old body as an edit revision.
select is (
  (
    select r.body_text || ':' || r.reason::text
    from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid
  ),
  'first:edit',
  'editing stores the previous body as an edit revision'
);

-- 3. Editing sets edited_at.
select isnt (
  (select edited_at from public.comments where id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  null,
  'editing sets edited_at'
);

-- 4. Editing logs comment_edited pointing at the revision.
select is (
  (
    select (e.payload ->> 'revision_id')::uuid
    from public.activity_events e
    where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and e.kind = 'comment_edited'
  ),
  (
    select r.id from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and r.reason = 'edit'
  ),
  'comment_edited carries the revision id'
);

-- 5. An update that changes neither the body nor deleted_at logs nothing.
update public.comments set body_schema_version = 1 where id = 'e1500001-0000-4000-8000-000000000001'::uuid;
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  2,
  'a no-op update writes no activity event'
);

-- 6 and 7. Mentions: duplicates collapse, non-members are ignored, nested nodes are found.
update public.comments
set
  body = '{"type":"doc","content":[
    {"type":"paragraph","content":[{"type":"userMention","attrs":{"id":"e1000002-0000-4000-8000-000000000002"}}]},
    {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[
      {"type":"userMention","attrs":{"id":"e1000002-0000-4000-8000-000000000002"}},
      {"type":"userMention","attrs":{"id":"e1000003-0000-4000-8000-000000000003"}},
      {"type":"userMention","attrs":{"id":"not-a-uuid"}}
    ]}]}]}
  ]}'::jsonb,
  body_text = '@member @member @outsider'
where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

select is (
  (select count(*)::int from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  1,
  'mentions are de-duplicated and limited to workspace members'
);
select is (
  (select m.mentioned_user_id from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  'e1000002-0000-4000-8000-000000000002'::uuid,
  'the member mentioned in a nested list is extracted'
);

-- 8 to 11. Soft delete.
update public.comments set deleted_at = now() where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

select is (
  (
    select r.body_text from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and r.reason = 'delete'
  ),
  '@member @member @outsider',
  'deleting stores the last body as a delete revision'
);
select is (
  (select coalesce(body::text, 'null') || '|' || coalesce(body_text, 'null') from public.comments where id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  'null|null',
  'deleting clears the body and its text'
);
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and e.kind = 'comment_deleted'),
  1,
  'deleting logs comment_deleted'
);
select is (
  (select count(*)::int from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  0,
  'a deleted comment has no mentions'
);

-- 12. A deleted comment cannot be restored.
select throws_ok (
  $$ update public.comments set deleted_at = null where id = 'e1500001-0000-4000-8000-000000000001'::uuid $$,
  '22023',
  null,
  'a deleted comment cannot be restored'
);

-- 13. A comment cannot point at a case from another workspace.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    'e1400003-0000-4000-8000-000000000003'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc"}'::jsonb,
    ''
  )
  $$,
  '23514',
  null,
  'a comment cannot be attached to a case in another workspace'
);

-- 14. Text over 10,000 characters is rejected.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    'e1400001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc"}'::jsonb,
    repeat('x', 10001)
  )
  $$,
  '23514',
  null,
  'body_text is capped at 10,000 characters'
);

-- 15. Sync's upsert (diffStagedIndividualsHelpers.ts) leaves comments on the case.
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e1500002-0000-4000-8000-000000000002'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400002-0000-4000-8000-000000000002'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc"}'::jsonb,
  ''
);
insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
values ('e1100001-0000-4000-8000-000000000001'::uuid, 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-2', 'Case two renamed', null)
on conflict (external_id, concept_id) do update
set name = excluded.name, missing_from_source_at = excluded.missing_from_source_at;
select is (
  (select individual_id from public.comments where id = 'e1500002-0000-4000-8000-000000000002'::uuid),
  'e1400002-0000-4000-8000-000000000002'::uuid,
  'a Sync upsert of the case keeps its comments'
);

-- 16. Deleting the case removes its comments and their events.
delete from public.individuals where id = 'e1400002-0000-4000-8000-000000000002'::uuid;
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500002-0000-4000-8000-000000000002'::uuid),
  0,
  'deleting the case cascades to its comments and activity'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Run it and watch it fail**

Run: `supabase test db supabase/tests/database/case_activity/comment_audit_triggers.test.sql`
Expected: FAIL with `relation "public.comments" does not exist`. If your Supabase CLI rejects a path argument, run `pnpm test:db` and look for this file in the output.

No commit yet: Task 6 commits the tests together with the schema that makes them pass.

---

### Task 3: pgTAP tests for RLS and grants (red)

**Files:**
- Create: `supabase/tests/database/permissions/rls_case_activity.test.sql`
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql`

- [ ] **Step 1: Write the RLS test file**

```sql
\set ON_ERROR_STOP on

/**
 * RLS for the case activity tables: members read, only authors change their
 * comments, only reactors change their reactions, and nobody but triggers
 * writes the audit tables.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e2000001-0000-4000-8000-000000000001'::uuid, 'rls_activity_author@test.dev', 'authenticated', 'authenticated'),
  ('e2000002-0000-4000-8000-000000000002'::uuid, 'rls_activity_member@test.dev', 'authenticated', 'authenticated'),
  ('e2000003-0000-4000-8000-000000000003'::uuid, 'rls_activity_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'rls activity ws', 'rls-activity-ws'),
  ('e2100002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, 'rls activity other', 'rls-activity-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e2200001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid),
  ('e2200002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid),
  ('e2200003-0000-4000-8000-000000000003'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('e2300001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'rls concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e2400001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'Case', 'e2300001-0000-4000-8000-000000000001'::uuid, 'ext-1')
on conflict (id) do nothing;

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values
  ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'live'),
  ('e2500002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'to delete');

update public.comments set deleted_at = now() where id = 'e2500002-0000-4000-8000-000000000002'::uuid;

select plan (13);

-- 1. A member reads a teammate's comment and the case activity.
select lives_ok (
  $t$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member cannot read a teammate''s comment';
    end if;
    if (select count(*)::int from public.activity_events where individual_id = 'e2400001-0000-4000-8000-000000000001'::uuid) < 1 then
      raise exception 'a member cannot read the case activity';
    end if;
  end $chk$;
  $t$,
  'a member reads comments and activity on cases in their workspace'
);

-- 2. An outsider sees nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comments) + (select count(*)::int from public.activity_events where individual_id = 'e2400001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider can read another workspace''s activity';
    end if;
  end $chk$;
  $t$,
  'an outsider reads no comments or activity'
);

-- 3. A member cannot post as someone else.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'spoof');
  $t$,
  '42501',
  null,
  'a member cannot insert a comment authored by someone else'
);

-- 4. A member's update of someone else's comment changes nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.comments set body_text = 'hijacked', body = '{"type":"doc"}'::jsonb where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 'live' then
      raise exception 'a member edited someone else''s comment';
    end if;
  end $chk$;
  $t$,
  'only the author can edit a comment'
);

-- 5. The author edits their own comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments set body_text = 'edited', body = '{"type":"doc","content":[]}'::jsonb where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 'edited' then
      raise exception 'the author could not edit their comment';
    end if;
  end $chk$;
  $t$,
  'the author edits their own comment'
);

-- 6. Nobody hard-deletes a comment through the API.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  $t$,
  '42501',
  null,
  'authenticated has no DELETE on comments'
);

-- 7. The author cannot edit a deleted comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments set body_text = 'revived', body = '{"type":"doc"}'::jsonb where id = 'e2500002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500002-0000-4000-8000-000000000002'::uuid) is not null then
      raise exception 'a deleted comment was edited';
    end if;
  end $chk$;
  $t$,
  'a deleted comment cannot be edited'
);

-- 8. A member reacts for themselves.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'celebrate');
  $t$,
  'a member reacts to a comment'
);

-- 9. A member cannot react for someone else.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');
  $t$,
  '42501',
  null,
  'a member cannot react on behalf of someone else'
);

-- 10. Nobody reacts to a deleted comment.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500002-0000-4000-8000-000000000002'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');
  $t$,
  '42501',
  null,
  'reacting to a deleted comment is rejected'
);

-- 11. The client cannot write the activity log.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.activity_events (workspace_id, individual_id, kind)
  values ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'comment_created');
  $t$,
  '42501',
  null,
  'authenticated cannot insert activity events'
);

-- 12. The client cannot read revisions.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select count(*) from public.comment_revisions;
  $t$,
  '42501',
  null,
  'authenticated cannot read comment revisions'
);

-- 13. The client cannot write mentions.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.comment_mentions (comment_id, mentioned_user_id, workspace_id)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid);
  $t$,
  '42501',
  null,
  'authenticated cannot insert mentions'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Add the new tables to the exact grants test**

In `supabase/tests/database/permissions/exact_data_api_grants.test.sql`:

1. In the `standard_authenticated_tables` exclusion list (the `table_name not in (...)` block), add these lines in alphabetical position:

```sql
      'activity_events',
      'comment_mentions',
      'comment_revisions',
      'comments',
```

`comment_reactions` gets full `authenticated` DML, so it stays standard and needs no entry.

2. In the `union all` block that lists SELECT-only tables for `authenticated` (the block with `'SELECT', false from public_tables where table_name in (...)`), add `'activity_events'` and `'comment_mentions'`.

3. Directly after that block, add:

```sql
  union all
  select
    'comments',
    'authenticated',
    privilege_type,
    false
  from
    unnest(array['INSERT', 'SELECT']) as privileges (privilege_type)
```

`comment_revisions` gets nothing for `authenticated`, so it needs only the exclusion entry.

4. In `expected_column_privileges`, after the `usage_analytics_events` select, add:

```sql
  union all
  select
    'comments'::text as table_name,
    column_name,
    'authenticated'::text as grantee,
    'UPDATE'::text as privilege_type,
    false as is_grantable
  from
    unnest(
      array[
        'body',
        'body_schema_version',
        'body_text',
        'deleted_at'
      ]
    ) as columns (column_name)
```

- [ ] **Step 3: Run and watch both fail**

Run: `supabase test db supabase/tests/database/permissions/rls_case_activity.test.sql supabase/tests/database/permissions/exact_data_api_grants.test.sql`
Expected: FAIL (`relation "public.comments" does not exist` and a grants mismatch).

---

### Task 4: Enums and the `comments` table

**Files:**
- Create: `supabase/schemas/00.enum.activity_events__kind.sql`
- Create: `supabase/schemas/00.enum.activity_events__source.sql`
- Create: `supabase/schemas/00.enum.comment_reactions__kind.sql`
- Create: `supabase/schemas/00.enum.comment_revisions__reason.sql`
- Create: `supabase/schemas/21.comments.sql`

- [ ] **Step 1: Write the enums**

`00.enum.activity_events__kind.sql`:

```sql
/**
 * What an activity event records. Each value is one kind of change to a case.
 *
 * Enum values:
 *
 * `comment_created` - A member posted a comment.
 * `comment_edited` - The author changed a comment's body. The payload names
 *   the revision that holds the previous body.
 * `comment_deleted` - The author deleted a comment. The payload names the
 *   revision that holds the deleted body.
 *
 * Planned kinds, documented in docs/measles-demo/case-activity-architecture.md:
 * `case_created`, `case_status_changed`, `case_assigned`,
 * `case_field_value_changed`, `case_external_record`.
 */
create type public.activity_events__kind as enum('comment_created', 'comment_edited', 'comment_deleted');
```

`00.enum.activity_events__source.sql`:

```sql
/**
 * Where an activity event came from.
 *
 * Enum values:
 *
 * `avandar` - A change made in Avandar.
 * `external` - History pulled from a connected third-party service.
 */
create type public.activity_events__source as enum('avandar', 'external');
```

`00.enum.comment_reactions__kind.sql`:

```sql
/**
 * The reactions a member can leave on a comment, modeled on LinkedIn's set.
 *
 * Enum values:
 *
 * `like` - The default one-click reaction.
 * `celebrate` - Good news.
 * `support` - Solidarity.
 * `love` - Warm appreciation.
 * `insightful` - A useful finding.
 * `funny` - Light humor.
 */
create type public.comment_reactions__kind as enum('like', 'celebrate', 'support', 'love', 'insightful', 'funny');
```

`00.enum.comment_revisions__reason.sql`:

```sql
/**
 * Why a comment revision was kept.
 *
 * Enum values:
 *
 * `edit` - The author changed the body. The revision holds the body before
 *   the change.
 * `delete` - The author deleted the comment. The revision holds the body
 *   that was deleted.
 */
create type public.comment_revisions__reason as enum('edit', 'delete');
```

- [ ] **Step 2: Write `21.comments.sql`**

```sql
/**
 * A comment on a case. Holds only the comment's current state: every earlier
 * body is kept in `comment_revisions` and every change is logged in
 * `activity_events`, both by the triggers in
 * `23.comments__audit_triggers.sql`. Deleting is soft: the author sets
 * `deleted_at` and a trigger clears the body.
 */
create table public.comments (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this comment belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The case this comment is on. A later subject (a dashboard, a dataset)
  -- adds its own nullable column and joins `comments__exactly_one_subject`.
  individual_id uuid references public.individuals (id) on update cascade on delete cascade,
  -- Author. Cleared if the auth user is deleted, so the comment outlives them.
  author_user_id uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- The rich text document as ProseMirror JSON. Null only once deleted.
  body jsonb,
  -- Version of the document shape in `body`
  body_schema_version smallint not null default 1,
  -- Plain text of `body`, for previews, length checks, and future search and
  -- notifications. Null only once deleted.
  body_text text,
  -- Timestamp of when the comment was posted
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to the row
  updated_at timestamptz not null default now(),
  -- Set by trigger when `body` changes
  edited_at timestamptz,
  -- Set when the author deletes the comment
  deleted_at timestamptz,
  constraint comments__exactly_one_subject check (num_nonnulls(individual_id) = 1),
  constraint comments__body_present_unless_deleted check (
    (deleted_at is null) = (
      body is not null and
      body_text is not null
    )
  ),
  constraint comments__body_text_length check (char_length(body_text) <= 10000),
  constraint comments__body_size check (pg_column_size(body) <= 262144)
);

create index idx_comments__individual_created on public.comments (individual_id, created_at);

alter table public.comments enable row level security;

-- Data API privileges. Members insert and read. Authors change only the body
-- columns and `deleted_at`; there is no DELETE grant because deleting is
-- setting `deleted_at`.
grant
select
,
  insert on table public.comments to authenticated;

grant
update (body, body_schema_version, body_text, deleted_at) on public.comments to authenticated;

grant
select
,
  insert,
update,
delete on table public.comments to service_role;

create policy "User can SELECT comments in their workspace" on public.comments for
select
  to authenticated using (
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can INSERT their own comments in their workspace" on public.comments for insert to authenticated
with
  check (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Author can UPDATE their own live comments" on public.comments
for update
  to authenticated using (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.deleted_at is null and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

/**
 * Keeps a comment on its case: the case must be in the comment's workspace,
 * the subject, workspace, and author never change after posting (except the
 * author becoming null when their account is deleted), and a deleted comment
 * is never restored.
 */
create or replace function public.comments__validate_subject () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.individual_id is distinct from old.individual_id
      or new.workspace_id is distinct from old.workspace_id
      or (new.author_user_id is distinct from old.author_user_id and new.author_user_id is not null)
    then
      raise exception 'A comment cannot move to another case, workspace, or author'
        using errcode = '22023';
    end if;
    if old.deleted_at is not null and new.deleted_at is null then
      raise exception 'A deleted comment cannot be restored'
        using errcode = '22023';
    end if;
  end if;

  if new.individual_id is not null and not exists (
    select 1
    from public.individuals i
    where i.id = new.individual_id and i.workspace_id = new.workspace_id
  ) then
    raise exception 'The case belongs to a different workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.comments__validate_subject ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__validate_subject before insert or
update on public.comments for each row
execute function public.comments__validate_subject ();

create trigger tr__comments__set_updated_at before
update on public.comments for each row
execute function public.util__set_updated_at ();
```

No commit yet: Task 6 commits the schema with its migration.

---

### Task 5: Child tables and the audit triggers

**Files:**
- Create: `supabase/schemas/22.comment_revisions.sql`
- Create: `supabase/schemas/22.comment_reactions.sql`
- Create: `supabase/schemas/22.comment_mentions.sql`
- Create: `supabase/schemas/22.activity_events.sql`
- Create: `supabase/schemas/23.comments__audit_triggers.sql`

- [ ] **Step 1: `22.comment_revisions.sql`**

```sql
/**
 * Every body a comment has had before its current one, kept for audit.
 * Written only by `comments__record_revision`. No member can read it yet:
 * a viewer for earlier versions is future work.
 */
create table public.comment_revisions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The comment this revision belongs to
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Whether the body was replaced by an edit or removed by a delete
  reason public.comment_revisions__reason not null,
  -- The body before the change
  body jsonb not null,
  -- Version of the document shape in `body`
  body_schema_version smallint not null,
  -- Plain text of `body`
  body_text text not null,
  -- Who made the change. Cleared if their account is deleted.
  revised_by_user_id uuid references auth.users (id) on update cascade on delete set null,
  -- When the change happened. Uses the statement's wall clock so two changes
  -- in one transaction still order correctly.
  created_at timestamptz not null default clock_timestamp()
);

create index idx_comment_revisions__comment_created on public.comment_revisions (comment_id, created_at);

alter table public.comment_revisions enable row level security;

-- Data API privileges. Service role only: this is an audit store.
grant
select
,
  insert,
update,
delete on table public.comment_revisions to service_role;
```

- [ ] **Step 2: `22.comment_reactions.sql`**

```sql
/**
 * One member's reaction to one comment. A member has at most one reaction
 * per comment: changing it is an upsert on `(comment_id, user_id)`.
 * Reactions are not activity and write no events.
 */
create table public.comment_reactions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- The comment reacted to
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Who reacted
  user_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete cascade,
  -- Workspace of the comment, kept here for the RLS predicate
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Which reaction
  kind public.comment_reactions__kind not null,
  -- Timestamp of the first reaction
  created_at timestamptz not null default now(),
  -- Timestamp of the last change of reaction
  updated_at timestamptz not null default now(),
  constraint comment_reactions__one_per_user unique (comment_id, user_id)
);

alter table public.comment_reactions enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.comment_reactions to authenticated,
service_role;

create policy "User can SELECT comment_reactions in their workspace" on public.comment_reactions for
select
  to authenticated using (
    public.comment_reactions.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can INSERT their own reaction to a live comment" on public.comment_reactions for insert to authenticated
with
  check (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    ) and
    exists (
      select
        1
      from
        public.comments c
      where
        c.id = public.comment_reactions.comment_id and
        c.workspace_id = public.comment_reactions.workspace_id and
        c.deleted_at is null
    )
  );

create policy "User can UPDATE their own reaction to a live comment" on public.comment_reactions
for update
  to authenticated using (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    )
  )
with
  check (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    ) and
    exists (
      select
        1
      from
        public.comments c
      where
        c.id = public.comment_reactions.comment_id and
        c.workspace_id = public.comment_reactions.workspace_id and
        c.deleted_at is null
    )
  );

create policy "User can DELETE their own reaction" on public.comment_reactions for delete to authenticated using (
  public.comment_reactions.user_id = (
    select
      auth.uid ()
  )
);

create trigger tr__comment_reactions__set_updated_at before
update on public.comment_reactions for each row
execute function public.util__set_updated_at ();
```

- [ ] **Step 3: `22.comment_mentions.sql`**

```sql
/**
 * Workspace members a comment mentions. Owned by `comments__sync_mentions`,
 * which rebuilds a comment's rows from its stored document on every body
 * change. Future notifications read this table.
 */
create table public.comment_mentions (
  -- The comment that mentions someone
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- The member mentioned
  mentioned_user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- When the mention was recorded
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index idx_comment_mentions__mentioned_user on public.comment_mentions (mentioned_user_id);

alter table public.comment_mentions enable row level security;

-- Data API privileges. Members read; only the trigger writes.
grant
select
  on table public.comment_mentions to authenticated;

grant
select
,
  insert,
update,
delete on table public.comment_mentions to service_role;

create policy "User can SELECT comment_mentions in their workspace" on public.comment_mentions for
select
  to authenticated using (
    public.comment_mentions.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
```

- [ ] **Step 4: `22.activity_events.sql`**

```sql
/**
 * Append-only log of every change to a case, and the source of the case
 * activity feed. Only database triggers write it, so no client or write path
 * can skip it. See docs/measles-demo/case-activity-architecture.md for every kind and its
 * payload.
 */
create table public.activity_events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this event belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The case this event is about. A later subject adds its own nullable
  -- column and joins `activity_events__exactly_one_subject`.
  individual_id uuid references public.individuals (id) on update cascade on delete cascade,
  -- What happened
  kind public.activity_events__kind not null,
  -- Whether it happened in Avandar or in a connected service
  source public.activity_events__source not null default 'avandar',
  -- Who did it. Null for system and external events, or once the account is
  -- deleted.
  actor_user_id uuid references auth.users (id) on update cascade on delete set null,
  -- The comment, for comment kinds
  comment_id uuid references public.comments (id) on update cascade on delete cascade,
  -- When it happened. For external events, the third party's timestamp.
  occurred_at timestamptz not null default now(),
  -- When Avandar recorded it
  recorded_at timestamptz not null default now(),
  -- Kind-specific detail
  payload jsonb not null default '{}'::jsonb,
  -- Version of the payload shape for this kind
  payload_version smallint not null default 1,
  constraint activity_events__exactly_one_subject check (num_nonnulls(individual_id) = 1)
);

create index idx_activity_events__individual_occurred on public.activity_events (individual_id, occurred_at desc);

create index idx_activity_events__comment on public.activity_events (comment_id);

alter table public.activity_events enable row level security;

-- Data API privileges. Members read; only triggers write.
grant
select
  on table public.activity_events to authenticated;

grant
select
,
  insert,
update,
delete on table public.activity_events to service_role;

create policy "User can SELECT activity_events in their workspace" on public.activity_events for
select
  to authenticated using (
    public.activity_events.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
```

- [ ] **Step 5: `23.comments__audit_triggers.sql`**

```sql
/**
 * Keeps the body a comment is about to lose. On an edit it stores the old
 * body as an `edit` revision and stamps `edited_at`. On a delete it stores
 * the body as a `delete` revision and clears `body` and `body_text`.
 */
create or replace function public.comments__record_revision () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.comment_revisions (
      workspace_id, comment_id, reason, body, body_schema_version, body_text, revised_by_user_id
    )
    values (
      old.workspace_id, old.id, 'delete', old.body, old.body_schema_version, old.body_text, auth.uid()
    );
    new.body := null;
    new.body_text := null;
  elsif new.body is distinct from old.body then
    insert into public.comment_revisions (
      workspace_id, comment_id, reason, body, body_schema_version, body_text, revised_by_user_id
    )
    values (
      old.workspace_id, old.id, 'edit', old.body, old.body_schema_version, old.body_text, auth.uid()
    );
    new.edited_at := now();
  end if;

  return new;
end;
$$;

revoke
execute on function public.comments__record_revision ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__record_revision before
update on public.comments for each row
execute function public.comments__record_revision ();

/**
 * Logs a comment's creation, edits, and deletion in `activity_events`. Edits
 * and deletes carry the id of the revision `comments__record_revision` just
 * wrote. An update that changes neither the body nor `deleted_at` logs
 * nothing.
 */
create or replace function public.comments__record_activity () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  v_kind public.activity_events__kind;
  v_revision_id uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := 'comment_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_kind := 'comment_deleted';
  elsif new.body is distinct from old.body then
    v_kind := 'comment_edited';
  else
    return null;
  end if;

  if v_kind <> 'comment_created' then
    select r.id
    into v_revision_id
    from public.comment_revisions r
    where r.comment_id = new.id
    order by r.created_at desc
    limit 1;
  end if;

  insert into public.activity_events (
    workspace_id, individual_id, kind, actor_user_id, comment_id, payload
  )
  values (
    new.workspace_id,
    new.individual_id,
    v_kind,
    auth.uid(),
    new.id,
    case
      when v_revision_id is null then '{}'::jsonb
      else jsonb_build_object('revision_id', v_revision_id)
    end
  );

  return null;
end;
$$;

revoke
execute on function public.comments__record_activity ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__record_activity
after insert or update on public.comments for each row
execute function public.comments__record_activity ();

/**
 * Rebuilds a comment's `comment_mentions` from the `userMention` nodes in its
 * stored document, keeping only valid ids of workspace members. A deleted
 * comment has no mentions. Fires on every update (no column list) because a
 * delete only sets `deleted_at` in the statement and the before trigger
 * clears `body`.
 */
create or replace function public.comments__sync_mentions () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  delete from public.comment_mentions m where m.comment_id = new.id;

  if new.body is null then
    return null;
  end if;

  insert into public.comment_mentions (comment_id, mentioned_user_id, workspace_id)
  select distinct new.id, mention.user_id, new.workspace_id
  from (
    select
      case
        when (mention_id #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (mention_id #>> '{}')::uuid
      end as user_id
    from jsonb_path_query(
      new.body,
      'lax $.** ? (@.type == "userMention").attrs.id'
    ) as mention_id
  ) as mention
  where mention.user_id is not null
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = new.workspace_id and wm.user_id = mention.user_id
    );

  return null;
end;
$$;

revoke
execute on function public.comments__sync_mentions ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__sync_mentions
after insert or update on public.comments for each row
execute function public.comments__sync_mentions ();
```

---

### Task 6: Generate the migration and go green

**Files:**
- Create: `supabase/migrations/<timestamp>_case_comments.sql` (generated)
- Modify: `shared/types/database.types.ts` (generated)

- [ ] **Step 1: Re-check the switch**

Run: `ava supabase status`
Expected: green, switched project. Stop if not.

- [ ] **Step 2: Reset, then generate**

Run: `pnpm db:reset && pnpm db:new-migration case_comments`
Expected: a new `supabase/migrations/*_case_comments.sql`. Open it and confirm it creates the four enums, five tables, four functions, and their triggers, includes the `comments` column-level `UPDATE` grant (added by `reconcile-privileges --append`), and contains no `drop` of anything this plan did not touch. If it drops something else, you diffed against the wrong database: reset and regenerate.

- [ ] **Step 3: Format the SQL**

Run: `pnpm format`
Expected: the new `.sql` files are reformatted. Re-read the grants: they should now match the house layout.

- [ ] **Step 4: Run the database tests**

Run: `pnpm test:db`
Expected: PASS, including `comment_audit_triggers.test.sql`, `rls_case_activity.test.sql`, and `exact_data_api_grants.test.sql`.

- [ ] **Step 5: Regenerate types**

Run: `pnpm db:gen-types`
Expected: `shared/types/database.types.ts` gains `comments`, `comment_revisions`, `comment_reactions`, `comment_mentions`, `activity_events`, and the four enums.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/00.enum.activity_events__kind.sql supabase/schemas/00.enum.activity_events__source.sql \
  supabase/schemas/00.enum.comment_reactions__kind.sql supabase/schemas/00.enum.comment_revisions__reason.sql \
  supabase/schemas/21.comments.sql supabase/schemas/22.comment_revisions.sql supabase/schemas/22.comment_reactions.sql \
  supabase/schemas/22.comment_mentions.sql supabase/schemas/22.activity_events.sql supabase/schemas/23.comments__audit_triggers.sql \
  supabase/migrations/*_case_comments.sql shared/types/database.types.ts \
  supabase/tests/database/case_activity/comment_audit_triggers.test.sql \
  supabase/tests/database/permissions/rls_case_activity.test.sql \
  supabase/tests/database/permissions/exact_data_api_grants.test.sql
git status --short supabase/config.toml   # must print nothing
git commit -m "feat(comments): add comments, reactions, mentions, and the activity event log"
```

---

### Task 7: `RichTextDocument` shared model

**Files:**
- Create: `shared/models/RichTextDocument/RichTextDocument.ts`
- Test: `shared/models/RichTextDocument/RichTextDocument.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  getMentionedUserIds,
  isRichTextDocument,
  parseRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function _paragraph(...content: RichTextDocument.Node[]): RichTextDocument.Node {
  return { type: "paragraph", content };
}

function _text(text: string): RichTextDocument.Node {
  return { type: "text", text };
}

function _mention(id: string): RichTextDocument.Node {
  return { type: "userMention", attrs: { id } };
}

const DOCUMENT: RichTextDocument.T = {
  type: "doc",
  content: [
    _paragraph(_text("Specimens for "), _mention(MEMBER_ID)),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [_paragraph(_text("Serum"))] },
        { type: "listItem", content: [_paragraph(_mention(MEMBER_ID), _mention(OTHER_ID))] },
      ],
    },
  ],
};

describe("parseRichTextDocument", () => {
  it("accepts a document built from the comment editor's nodes", () => {
    expect(parseRichTextDocument(DOCUMENT)).toEqual(DOCUMENT);
  });

  it("rejects a node type the editor does not know", () => {
    const withEmbed = {
      type: "doc",
      content: [{ type: "objectEmbed", attrs: { id: "x" } }],
    };
    expect(() => {
      return parseRichTextDocument(withEmbed);
    }).toThrow();
    expect(isRichTextDocument(withEmbed)).toBe(false);
  });
});

describe("richTextToPlainText", () => {
  it("puts each block on its own line and labels mentions", () => {
    const plainText = richTextToPlainText(DOCUMENT, {
      getMentionLabel: (userId) => {
        return userId === MEMBER_ID ? "Priya" : undefined;
      },
    });
    expect(plainText).toBe("Specimens for @Priya\nSerum\n@Priya@member");
  });
});

describe("getMentionedUserIds", () => {
  it("returns each mentioned user once, in document order, including nested ones", () => {
    expect(getMentionedUserIds(DOCUMENT)).toEqual([MEMBER_ID, OTHER_ID]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run shared/models/RichTextDocument/RichTextDocument.test.ts`
Expected: FAIL, cannot resolve `$/models/RichTextDocument/RichTextDocument.ts`.

- [ ] **Step 3: Implement**

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";

/** A mark on a text node, such as bold or a link. */
type RichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/** One node of a rich text document, in ProseMirror JSON form. */
type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
};

/** A whole rich text document. The root node is always `doc`. */
type RichTextDocumentT = {
  type: "doc";
  content?: RichTextNode[];
};

/**
 * Version of the stored document shape. Stored next to every document so a
 * later change of shape can be migrated by a parser instead of a data
 * migration.
 */
export const RICH_TEXT_SCHEMA_VERSION = 1;

/** Longest plain text a comment may hold. Mirrors the database check. */
export const RICH_TEXT_MAX_TEXT_LENGTH = 10000;

/** Node types the comment editor produces. */
export const RICH_TEXT_NODE_TYPES = [
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "hardBreak",
  "heading",
  "horizontalRule",
  "listItem",
  "orderedList",
  "paragraph",
  "text",
  "userMention",
] as const;

/** Mark types the comment editor produces. */
export const RICH_TEXT_MARK_TYPES = [
  "bold",
  "code",
  "italic",
  "link",
  "strike",
  "underline",
] as const;

/** Nodes whose children are blocks, so each child gets its own line. */
const BLOCK_CONTAINER_TYPES: ReadonlySet<string> = new Set([
  "blockquote",
  "bulletList",
  "doc",
  "listItem",
  "orderedList",
]);

const MarkSchema = z.object({
  type: z.enum(RICH_TEXT_MARK_TYPES),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const NodeSchema: z.ZodType<RichTextNode> = z.lazy(() => {
  return z.object({
    type: z.enum(RICH_TEXT_NODE_TYPES),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(NodeSchema).optional(),
    marks: z.array(MarkSchema).optional(),
    text: z.string().optional(),
  });
});

const DocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(NodeSchema).optional(),
});

/**
 * Validates a stored or freshly edited document. Throws when the document
 * holds a node or mark the comment editor does not know.
 */
export function parseRichTextDocument(value: unknown): RichTextDocumentT {
  return DocumentSchema.parse(value);
}

/** Whether a value is a document the comment editor and renderer support. */
export function isRichTextDocument(value: unknown): value is RichTextDocumentT {
  return DocumentSchema.safeParse(value).success;
}

/**
 * Plain text of a document: one line per block, and `@name` for each
 * mention. `getMentionLabel` returns the member's current name, or
 * `undefined` to fall back to "member".
 */
export function richTextToPlainText(
  document: RichTextDocumentT | RichTextNode,
  options: Readonly<{
    getMentionLabel?: (userId: string) => string | undefined;
  }> = {},
): string {
  return _nodeToPlainText(document, options).trim();
}

function _nodeToPlainText(
  node: RichTextDocumentT | RichTextNode,
  options: Readonly<{
    getMentionLabel?: (userId: string) => string | undefined;
  }>,
): string {
  if (node.type === "text") {
    return "text" in node ? (node.text ?? "") : "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type === "userMention") {
    const userId = "attrs" in node ? String(node.attrs?.id ?? "") : "";
    return `@${options.getMentionLabel?.(userId) ?? "member"}`;
  }
  const separator = BLOCK_CONTAINER_TYPES.has(node.type) ? "\n" : "";
  return (node.content ?? [])
    .map((child) => {
      return _nodeToPlainText(child, options);
    })
    .join(separator);
}

/** Each mentioned user id once, in document order. */
export function getMentionedUserIds(
  document: RichTextDocumentT | RichTextNode,
): string[] {
  const userIds = new Set<string>();
  _collectMentions(document, userIds);
  return [...userIds];
}

function _collectMentions(
  node: RichTextDocumentT | RichTextNode,
  userIds: Set<string>,
): void {
  if (node.type === "userMention" && "attrs" in node) {
    const userId = node.attrs?.id;
    if (typeof userId === "string" && userId.length > 0) {
      userIds.add(userId);
    }
  }
  (node.content ?? []).forEach((child) => {
    _collectMentions(child, userIds);
  });
}

/** Rich text documents stored by comments and rendered in the case feed. */
export namespace RichTextDocument {
  export type T = RichTextDocumentT;
  export type Node = RichTextNode;
  export type Mark = RichTextMark;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run shared/models/RichTextDocument/RichTextDocument.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/models/RichTextDocument
git commit -m "feat(comments): add the RichTextDocument model"
```

---

### Task 8: `Comment`, `CommentReaction`, and `ActivityEvent` models

Load the `ava-model-creation` skill. You may scaffold with `ava new model Comment --models-dir comments --supabase-table comments --clients-dir comments` (and the same for the other two), then replace the generated files with the code below.

**Files:**
- Create: `shared/models/comments/Comment/Comment.types.ts`, `Comment.ts`, `CommentParsers.ts`
- Create: `shared/models/comments/CommentReaction/CommentReaction.types.ts`, `CommentReaction.ts`, `CommentReactionParsers.ts`
- Create: `shared/models/activity/ActivityEvent/ActivityEvent.types.ts`, `ActivityEvent.ts`, `ActivityEventParsers.ts`
- Test: `shared/models/comments/Comment/CommentParsers.test.ts`, `shared/models/activity/ActivityEvent/ActivityEventParsers.test.ts`

- [ ] **Step 1: Write the failing parser tests**

`shared/models/comments/Comment/CommentParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CommentParsers } from "$/models/comments/Comment/Comment.ts";
import type { Comment } from "$/models/comments/Comment/Comment.ts";

function _dbRow(overrides: Partial<Comment.T<"DBRead">> = {}): Comment.T<"DBRead"> {
  return {
    author_user_id: "11111111-1111-4111-8111-111111111111",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "userMention", attrs: { id: "22222222-2222-4222-8222-222222222222" } }],
        },
      ],
    },
    body_schema_version: 1,
    body_text: "@member",
    created_at: "2026-11-06T10:00:00+00:00",
    deleted_at: null,
    edited_at: null,
    id: "33333333-3333-4333-8333-333333333333",
    individual_id: "44444444-4444-4444-8444-444444444444",
    updated_at: "2026-11-06T10:00:00+00:00",
    workspace_id: "55555555-5555-4555-8555-555555555555",
    ...overrides,
  };
}

describe("CommentParsers", () => {
  it("keeps the document's own keys untouched when camel-casing the row", () => {
    const comment = CommentParsers.fromDBReadToModelRead(_dbRow());
    expect(comment.bodyText).toBe("@member");
    expect(comment.body?.content?.[0]?.content?.[0]).toEqual({
      type: "userMention",
      attrs: { id: "22222222-2222-4222-8222-222222222222" },
    });
  });

  it("still reads a comment whose document has a node this build does not know", () => {
    const comment = CommentParsers.fromDBReadToModelRead(
      _dbRow({ body: { type: "doc", content: [{ type: "objectEmbed", attrs: { id: "x" } }] } }),
    );
    expect(comment.body?.content?.[0]?.type).toBe("objectEmbed");
  });

  it("reads a deleted comment, whose body is gone", () => {
    const comment = CommentParsers.fromDBReadToModelRead(
      _dbRow({ body: null, body_text: null, deleted_at: "2026-11-06T11:00:00+00:00" }),
    );
    expect(comment.body).toBeUndefined();
    expect(comment.deletedAt).toBe("2026-11-06T11:00:00+00:00");
  });
});
```

`shared/models/activity/ActivityEvent/ActivityEventParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEvent.ts";

describe("ActivityEventParsers", () => {
  it("reads an edit event and keeps its payload keys as stored", () => {
    const event = ActivityEventParsers.fromDBReadToModelRead({
      actor_user_id: "11111111-1111-4111-8111-111111111111",
      comment_id: "22222222-2222-4222-8222-222222222222",
      id: "33333333-3333-4333-8333-333333333333",
      individual_id: "44444444-4444-4444-8444-444444444444",
      kind: "comment_edited",
      occurred_at: "2026-11-06T10:00:00+00:00",
      payload: { revision_id: "66666666-6666-4666-8666-666666666666" },
      payload_version: 1,
      recorded_at: "2026-11-06T10:00:00+00:00",
      source: "avandar",
      workspace_id: "55555555-5555-4555-8555-555555555555",
    });
    expect(event.kind).toBe("comment_edited");
    expect(event.payload).toEqual({ revision_id: "66666666-6666-4666-8666-666666666666" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run shared/models/comments shared/models/activity`
Expected: FAIL, modules not found.

- [ ] **Step 3: `Comment` model**

`shared/models/comments/Comment/Comment.types.ts`:

```ts
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional, UUID } from "@avandar/utils";

export type CommentId = UUID<"Comment">;

/** A comment on a case, as the app reads it. */
type CommentRead = {
  /** Undefined once the author's account is deleted. */
  authorUserId: User.Id | undefined;
  /** Undefined once the comment is deleted. */
  body: RichTextDocument.T | undefined;
  bodySchemaVersion: number;
  /** Undefined once the comment is deleted. */
  bodyText: string | undefined;
  createdAt: string;
  deletedAt: string | undefined;
  editedAt: string | undefined;
  id: CommentId;
  /** The case. The database requires exactly one subject, and cases are the only one today. */
  individualId: Individual.Id;
  updatedAt: string;
  workspaceId: Workspace.Id;
};

export type CommentModel = SupabaseCrudModelSpec<
  {
    tableName: "comments";
    modelName: "Comment";
    modelPrimaryKeyType: CommentId;
    modelTypes: {
      Read: CommentRead;
      Insert: SetOptional<
        CommentRead,
        "authorUserId" | "createdAt" | "deletedAt" | "editedAt" | "id" | "updatedAt"
      >;
      Update: Partial<
        Pick<CommentRead, "body" | "bodySchemaVersion" | "bodyText" | "deletedAt">
      >;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
```

`shared/models/comments/Comment/CommentParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import type { CommentId, CommentModel } from "$/models/comments/Comment/Comment.types.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  author_user_id: z.uuid().nullable(),
  body: supabaseJSONSchema.nullable(),
  body_schema_version: z.number(),
  body_text: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  deleted_at: z.iso.datetime({ offset: true }).nullable(),
  edited_at: z.iso.datetime({ offset: true }).nullable(),
  id: z.uuid(),
  individual_id: z.uuid().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Converts every column except `body`. The document is ProseMirror JSON
 * whose keys belong to the editor, so it is never key-cased.
 */
const _camelCaseRow = pipe(camelCaseKeysDeep, nullsToUndefinedDeep);
const _snakeCaseRow = pipe(
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
  excludeNullsExceptInProps(["deleted_at"]),
);

export const CommentParsers = makeParserRegistry<CommentModel>().build({
  modelName: "Comment",
  DBReadSchema,
  fromDBReadToModelRead: (databaseReadRow): CommentModel["Read"] => {
    const { body, ...row } = databaseReadRow;
    const modelRow = _camelCaseRow(row);
    return {
      ...modelRow,
      authorUserId: modelRow.authorUserId as User.Id | undefined,
      // Not validated here: a document with a node this build does not know
      // must still load, so `RichTextView` can fall back to its plain text.
      body: body === null ? undefined : (body as unknown as RichTextDocument.T),
      id: modelRow.id as CommentId,
      individualId: modelRow.individualId as Individual.Id,
      workspaceId: modelRow.workspaceId as Workspace.Id,
    };
  },
  fromModelInsertToDBInsert: (model) => {
    const { body, ...row } = model;
    return { ..._snakeCaseRow(row), body: body ?? null };
  },
  fromModelUpdateToDBUpdate: (model) => {
    const { body, ...row } = model;
    return { ..._snakeCaseRow(row), ...(body === undefined ? {} : { body }) };
  },
});

/** Do not remove these tests! */
type CrudTypes = CommentModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

If `tsc` reports that `_snakeCaseRow(row)` does not match `DBInsert` or `DBUpdate`, follow `shared/models/AvaMap/AvaMapParsers.ts`: give `_snakeCaseRow` an explicit return type of `Omit<CommentModel["DBInsert"], "body">` (and the `DBUpdate` equivalent) with a cast, exactly as `_snakeCaseMapInsertRow` does there.

`shared/models/comments/Comment/Comment.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type { CommentId, CommentModel } from "$/models/comments/Comment/Comment.types.ts";

export { CommentParsers } from "$/models/comments/Comment/CommentParsers.ts";

/** A comment on a case. */
export namespace Comment {
  export type T<K extends keyof CommentModel = "Read"> = CommentModel[K];
  export type Id = CommentId;
}
```

- [ ] **Step 4: `CommentReaction` model**

`shared/models/comments/CommentReaction/CommentReaction.types.ts`:

```ts
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional, UUID } from "@avandar/utils";

export type CommentReactionId = UUID<"CommentReaction">;

/** One of the six reactions. */
export type CommentReactionKind = Enums<"comment_reactions__kind">;

type CommentReactionRead = {
  commentId: Comment.Id;
  createdAt: string;
  id: CommentReactionId;
  kind: CommentReactionKind;
  updatedAt: string;
  userId: User.Id;
  workspaceId: Workspace.Id;
};

export type CommentReactionModel = SupabaseCrudModelSpec<
  {
    tableName: "comment_reactions";
    modelName: "CommentReaction";
    modelPrimaryKeyType: CommentReactionId;
    modelTypes: {
      Read: CommentReactionRead;
      Insert: SetOptional<CommentReactionRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<Pick<CommentReactionRead, "kind">>;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
```

`shared/models/comments/CommentReaction/CommentReactionParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type {
  CommentReactionId,
  CommentReactionModel,
} from "$/models/comments/CommentReaction/CommentReaction.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  comment_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  kind: z.enum(["like", "celebrate", "support", "love", "insightful", "funny"]),
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
  workspace_id: z.uuid(),
});

export const CommentReactionParsers = makeParserRegistry<CommentReactionModel>().build({
  modelName: "CommentReaction",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): CommentReactionModel["Read"] => {
      return {
        ...obj,
        commentId: obj.commentId as Comment.Id,
        id: obj.id as CommentReactionId,
        userId: obj.userId as User.Id,
        workspaceId: obj.workspaceId as Workspace.Id,
      };
    },
  ),
  fromModelInsertToDBInsert: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
  fromModelUpdateToDBUpdate: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
});

/** Do not remove these tests! */
type CrudTypes = CommentReactionModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

`shared/models/comments/CommentReaction/CommentReaction.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CommentReactionId,
  CommentReactionKind,
  CommentReactionModel,
} from "$/models/comments/CommentReaction/CommentReaction.types.ts";

export { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReactionParsers.ts";

/** A member's reaction to a comment. */
export namespace CommentReaction {
  export type T<K extends keyof CommentReactionModel = "Read"> = CommentReactionModel[K];
  export type Id = CommentReactionId;
  export type Kind = CommentReactionKind;
}
```

- [ ] **Step 5: `ActivityEvent` model**

`shared/models/activity/ActivityEvent/ActivityEvent.types.ts`:

```ts
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional, UUID } from "@avandar/utils";

export type ActivityEventId = UUID<"ActivityEvent">;
export type ActivityEventKind = Enums<"activity_events__kind">;
export type ActivityEventSource = Enums<"activity_events__source">;

/** Kind-specific detail. Keys are stored as written by the database triggers. */
export type ActivityEventPayload = Readonly<Record<string, unknown>>;

type ActivityEventRead = {
  /** Undefined for system and external events, or once the account is deleted. */
  actorUserId: User.Id | undefined;
  commentId: Comment.Id | undefined;
  id: ActivityEventId;
  individualId: Individual.Id;
  kind: ActivityEventKind;
  occurredAt: string;
  payload: ActivityEventPayload;
  payloadVersion: number;
  recordedAt: string;
  source: ActivityEventSource;
  workspaceId: Workspace.Id;
};

export type ActivityEventModel = SupabaseCrudModelSpec<
  {
    tableName: "activity_events";
    modelName: "ActivityEvent";
    modelPrimaryKeyType: ActivityEventId;
    modelTypes: {
      Read: ActivityEventRead;
      /** Only database triggers write events. These shapes exist for the CRUD spec. */
      Insert: SetOptional<
        ActivityEventRead,
        "actorUserId" | "commentId" | "id" | "occurredAt" | "payloadVersion" | "recordedAt" | "source"
      >;
      Update: Partial<ActivityEventRead>;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
```

`shared/models/activity/ActivityEvent/ActivityEventParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import type {
  ActivityEventId,
  ActivityEventModel,
  ActivityEventPayload,
} from "$/models/activity/ActivityEvent/ActivityEvent.types.ts";
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  actor_user_id: z.uuid().nullable(),
  comment_id: z.uuid().nullable(),
  id: z.uuid(),
  individual_id: z.uuid().nullable(),
  kind: z.enum(["comment_created", "comment_edited", "comment_deleted"]),
  occurred_at: z.iso.datetime({ offset: true }),
  payload: supabaseJSONSchema,
  payload_version: z.number(),
  recorded_at: z.iso.datetime({ offset: true }),
  source: z.enum(["avandar", "external"]),
  workspace_id: z.uuid(),
});

const _camelCaseRow = pipe(camelCaseKeysDeep, nullsToUndefinedDeep);

export const ActivityEventParsers = makeParserRegistry<ActivityEventModel>().build({
  modelName: "ActivityEvent",
  DBReadSchema,
  fromDBReadToModelRead: (databaseReadRow): ActivityEventModel["Read"] => {
    const { payload, ...row } = databaseReadRow;
    const modelRow = _camelCaseRow(row);
    return {
      ...modelRow,
      actorUserId: modelRow.actorUserId as User.Id | undefined,
      commentId: modelRow.commentId as Comment.Id | undefined,
      id: modelRow.id as ActivityEventId,
      individualId: modelRow.individualId as Individual.Id,
      payload: (payload ?? {}) as ActivityEventPayload,
      workspaceId: modelRow.workspaceId as Workspace.Id,
    };
  },
  fromModelInsertToDBInsert: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
  fromModelUpdateToDBUpdate: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
});

/** Do not remove these tests! */
type CrudTypes = ActivityEventModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

`shared/models/activity/ActivityEvent/ActivityEvent.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ActivityEventId,
  ActivityEventKind,
  ActivityEventModel,
  ActivityEventPayload,
  ActivityEventSource,
} from "$/models/activity/ActivityEvent/ActivityEvent.types.ts";

export { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEventParsers.ts";

/** One entry in a case's append-only activity log. */
export namespace ActivityEvent {
  export type T<K extends keyof ActivityEventModel = "Read"> = ActivityEventModel[K];
  export type Id = ActivityEventId;
  export type Kind = ActivityEventKind;
  export type Source = ActivityEventSource;
  export type Payload = ActivityEventPayload;
}
```

- [ ] **Step 6: Run tests and the type check**

Run: `pnpm vitest run shared/models/comments shared/models/activity && pnpm type-check`
Expected: PASS. The `ZodConsistencyTests` lines are part of the type check: a mismatch there means a `DBReadSchema` column type disagrees with `database.types.ts`, so fix the schema, not the test.

- [ ] **Step 7: Commit**

```bash
git add shared/models/comments shared/models/activity
git commit -m "feat(comments): add Comment, CommentReaction, and ActivityEvent models"
```

---

### Task 9: Clients

**Files:**
- Create: `src/clients/comments/CommentClient.ts`
- Create: `src/clients/comments/CommentReactionClient.ts`
- Create: `src/clients/activity/ActivityEventClient.ts`

These are thin wrappers over tested factories; the feed query is covered by the component and e2e tests in later tasks.

- [ ] **Step 1: `CommentClient.ts`**

```ts
import { CommentParsers } from "$/models/comments/Comment/Comment";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/** CRUD for case comments. Deleting a comment is an update of `deletedAt`. */
export const CommentClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Comment",
    tableName: "comments",
    dbTablePrimaryKey: "id",
    parsers: CommentParsers,
  }),
);
```

- [ ] **Step 2: `CommentReactionClient.ts`**

```ts
import { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReaction";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * CRUD for comment reactions. Setting a reaction is an `insert` with
 * `upsert` on `(comment_id, user_id)`; clearing it is a `delete`.
 */
export const CommentReactionClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CommentReaction",
    tableName: "comment_reactions",
    dbTablePrimaryKey: "id",
    parsers: CommentReactionParsers,
  }),
);
```

- [ ] **Step 3: `ActivityEventClient.ts`**

```ts
import { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEvent";
import { CommentParsers } from "$/models/comments/Comment/Comment";
import { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReaction";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** One feed entry: the event plus, for comment kinds, the comment and its reactions. */
export type ActivityFeedEntry = ActivityEvent.T & {
  comment: Comment.T | undefined;
  reactions: CommentReaction.T[];
};

/** One page of a case's feed, oldest entry first. */
export type ActivityFeedPage = {
  entries: ActivityFeedEntry[];
  hasMore: boolean;
};

/** Reads a case's activity log. Only database triggers write it. */
export const ActivityEventClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "ActivityEvent",
    tableName: "activity_events",
    dbTablePrimaryKey: "id",
    parsers: ActivityEventParsers,
    queries: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * The newest `limit` events of the given kinds that occurred before
         * `beforeOccurredAt`, returned oldest first.
         */
        getCaseActivityPage: async (params: {
          individualId: Individual.Id;
          kinds: readonly ActivityEvent.Kind[];
          beforeOccurredAt: string | undefined;
          limit: number;
        }): Promise<ActivityFeedPage> => {
          const logger = clientLogger.appendName("getCaseActivityPage");
          logger.log("Loading case activity", params);
          let query = dbClient
            .from("activity_events")
            .select("*, comment:comments(*, reactions:comment_reactions(*))")
            .eq("individual_id", params.individualId)
            .in("kind", [...params.kinds])
            .order("occurred_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(params.limit + 1);
          if (params.beforeOccurredAt !== undefined) {
            query = query.lt("occurred_at", params.beforeOccurredAt);
          }
          const { data } = await query.throwOnError();
          const rows = data.slice(0, params.limit).reverse();
          return {
            hasMore: data.length > params.limit,
            entries: rows.map((row) => {
              const { comment, ...event } = row;
              const { reactions, ...commentRow } = comment ?? { reactions: [] };
              return {
                ...parsers.fromDBReadToModelRead(event),
                comment: comment ? CommentParsers.fromDBReadToModelRead(commentRow) : undefined,
                reactions: reactions.map(CommentReactionParsers.fromDBReadToModelRead),
              };
            }),
          };
        },
      };
    },
  }),
  { queryFns: ["getCaseActivityPage"] },
);
```

If `tsc` cannot infer the embedded row types for `comment` or `reactions`, read `src/clients/datasets/DatasetClient/createDatasetQueries.ts:78-88` for the house pattern and add the same explicit destructuring there; the embed hints come from the foreign keys `activity_events.comment_id` and `comment_reactions.comment_id`.

- [ ] **Step 4: Type check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/clients/comments src/clients/activity
git commit -m "feat(comments): add comment, reaction, and activity clients"
```

---

### Task 10: Mention node, chip, and members context

**Files:**
- Create: `src/components/RichText/RichTextMembersContext.ts`
- Create: `src/components/RichText/UserMention/UserMention.ts`
- Create: `src/components/RichText/UserMention/UserMentionChip.tsx`
- Create: `src/components/RichText/UserMention/UserMentionChip.module.css`
- Create: `src/components/RichText/UserMention/filterMentionCandidates.ts`
- Test: `src/components/RichText/UserMention/filterMentionCandidates.test.ts`
- Test: `src/components/RichText/UserMention/UserMentionChip.test.tsx`

- [ ] **Step 1: Write the failing tests**

`filterMentionCandidates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

const CANDIDATES: MentionCandidate[] = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
  { userId: "3", displayName: "Amit Priyadarshi", email: "amit.p@example.org" },
  { userId: "4", displayName: "Dana Whitfield", email: "dana@example.org" },
];

describe("filterMentionCandidates", () => {
  it("matches anywhere in the name, ignoring case", () => {
    expect(
      filterMentionCandidates(CANDIDATES, "pri").map((candidate) => {
        return candidate.userId;
      }),
    ).toEqual(["1", "2", "3"]);
  });

  it("matches on email", () => {
    expect(filterMentionCandidates(CANDIDATES, "dana@")).toHaveLength(1);
  });

  it("returns at most eight people", () => {
    const many = Array.from({ length: 12 }, (_, index) => {
      return { userId: String(index), displayName: `Person ${index}`, email: `p${index}@example.org` };
    });
    expect(filterMentionCandidates(many, "")).toHaveLength(8);
  });
});
```

`UserMentionChip.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import { render, screen } from "@/test-utils";

describe("UserMentionChip", () => {
  it("shows the member's current name", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: () => {
            return "Priya Natarajan";
          },
        }}
      >
        <UserMentionChip userId="1" />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.getByText("@Priya Natarajan")).toBeInTheDocument();
  });

  it("shows a former member when the id is no longer in the workspace", () => {
    render(<UserMentionChip userId="gone" />);
    expect(screen.getByText("@Former member")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/RichText/UserMention`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`RichTextMembersContext.ts`:

```ts
import { createContext, useContext } from "react";

type RichTextMembers = {
  /** The member's current display name, or `undefined` for someone no longer in the workspace. */
  getMemberName: (userId: string) => string | undefined;
};

const NO_MEMBERS: RichTextMembers = {
  getMemberName: () => {
    return undefined;
  },
};

/**
 * Resolves the user ids stored in mentions to current names, for both the
 * editor and the static renderer.
 */
export const RichTextMembersContext = createContext<RichTextMembers>(NO_MEMBERS);

/** Reads the members lookup provided by the nearest rich text surface. */
export function useRichTextMembers(): RichTextMembers {
  return useContext(RichTextMembersContext);
}
```

`UserMention/filterMentionCandidates.ts`:

```ts
/** A workspace member who can be mentioned. */
export type MentionCandidate = {
  userId: string;
  displayName: string;
  email: string;
};

const MAX_MENTION_CANDIDATES = 8;

/**
 * Members whose name or email contains the typed query, ignoring case, at
 * most eight.
 */
export function filterMentionCandidates(
  candidates: readonly MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  return candidates
    .filter((candidate) => {
      return (
        candidate.displayName.toLowerCase().includes(normalizedQuery) ||
        candidate.email.toLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, MAX_MENTION_CANDIDATES);
}
```

`UserMention/UserMentionChip.module.css`:

```css
.chip {
  padding: 0 3px;
  border-radius: var(--mantine-radius-xs);
  background-color: var(--mantine-color-primary-0);
  color: var(--mantine-color-primary-8);
  font-weight: 500;
  white-space: nowrap;
}

.former {
  background-color: var(--mantine-color-neutral-1);
  color: var(--mantine-color-neutral-7);
}
```

`UserMention/UserMentionChip.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useRichTextMembers } from "@/components/RichText/RichTextMembersContext";
import classes from "@/components/RichText/UserMention/UserMentionChip.module.css";
import type { ReactNode } from "react";

/** How a mention reads in the editor and the feed: `@` and the member's current name. */
export function UserMentionChip({ userId }: { userId: string }): ReactNode {
  const { t } = useLingui();
  const { getMemberName } = useRichTextMembers();
  const memberName = getMemberName(userId);
  return (
    <span
      className={clsx(classes.chip, memberName === undefined && classes.former)}
      data-type="userMention"
      data-id={userId}
    >
      @{memberName ?? t`Former member`}
    </span>
  );
}
```

`UserMention/UserMention.ts`:

```ts
import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { createElement } from "react";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import type { NodeViewProps } from "@tiptap/react";

function UserMentionNodeView({ node }: NodeViewProps) {
  return createElement(
    NodeViewWrapper,
    { as: "span" },
    createElement(UserMentionChip, { userId: String(node.attrs.id ?? "") }),
  );
}

/**
 * A mention of a workspace member. Stores only the user id, never the
 * name, so a renamed member always shows their current name.
 */
export const UserMention = Mention.extend({
  name: "userMention",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-id");
        },
        renderHTML: (attributes) => {
          return { "data-id": attributes.id };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "userMention" }, HTMLAttributes), "@"];
  },

  renderText() {
    return "@";
  },

  addNodeView() {
    return ReactNodeViewRenderer(UserMentionNodeView);
  },
});
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/components/RichText/UserMention`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RichText
git commit -m "feat(comments): add the userMention node and its chip"
```

---

### Task 11: The `@` dropdown

**Files:**
- Create: `src/components/RichText/UserMention/UserMentionList.tsx`
- Create: `src/components/RichText/UserMention/UserMentionList.module.css`
- Create: `src/components/RichText/UserMention/createUserMentionSuggestion.ts`
- Test: `src/components/RichText/UserMention/UserMentionList.test.tsx`

The dropdown follows `src/components/sql/AvaSqlBlock/PillEditPopover/PillEditPopover.tsx`: a fixed, zero-height anchor at the caret and a Mantine `Combobox` opened from code.

- [ ] **Step 1: Write the failing test**

```tsx
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { UserMentionList } from "@/components/RichText/UserMention/UserMentionList";
import { render, screen, waitFor } from "@/test-utils";
import type { UserMentionListHandle } from "@/components/RichText/UserMention/UserMentionList";

const ITEMS = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
];

function _rect(): DOMRect {
  return new DOMRect(10, 10, 0, 16);
}

describe("UserMentionList", () => {
  it("lists matching members with their email", async () => {
    render(<UserMentionList items={ITEMS} clientRect={_rect} command={vi.fn()} />);
    expect(await screen.findByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByText("p.owusu@example.org")).toBeInTheDocument();
  });

  it("mentions the highlighted member on Enter after moving down", async () => {
    const command = vi.fn();
    const ref = createRef<UserMentionListHandle>();
    render(<UserMentionList ref={ref} items={ITEMS} clientRect={_rect} command={command} />);
    await screen.findByText("Priya Natarajan");
    ref.current?.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    ref.current?.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    await waitFor(() => {
      expect(command).toHaveBeenCalledWith({ id: "2" });
    });
  });

  it("says so when nobody matches", async () => {
    render(<UserMentionList items={[]} clientRect={_rect} command={vi.fn()} />);
    expect(await screen.findByText("No teammates match")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/RichText/UserMention/UserMentionList.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the list**

`UserMentionList.module.css`:

```css
.anchor {
  position: fixed;
  height: 0;
  pointer-events: none;
  z-index: 9999;
}

.option {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
}

.initials {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--ava-border-default);
  background-color: var(--mantine-color-neutral-1);
  font-size: var(--mantine-font-size-xs);
  font-weight: 600;
}
```

`UserMentionList.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Combobox, Stack, Text, useCombobox } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import classes from "@/components/RichText/UserMention/UserMentionList.module.css";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

/** Lets the suggestion plugin forward the editor's key presses. */
export type UserMentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type UserMentionListProps = {
  items: readonly MentionCandidate[];
  clientRect: (() => DOMRect | null) | null | undefined;
  command: (attributes: { id: string }) => void;
};

/** Two-letter initials for a member's avatar. */
function _initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0]?.toUpperCase() ?? "";
    })
    .join("");
}

/**
 * The `@` typeahead. The editor keeps focus, so keyboard navigation arrives
 * through `onKeyDown` from the suggestion plugin rather than from the DOM.
 */
export const UserMentionList = forwardRef<UserMentionListHandle, UserMentionListProps>(
  function UserMentionList({ items, clientRect, command }, ref) {
    const combobox = useCombobox();

    useEffect(() => {
      combobox.openDropdown();
      combobox.selectFirstOption();
      // `combobox` is a stable store; re-run only when the matches change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useImperativeHandle(ref, () => {
      return {
        onKeyDown: (event) => {
          if (event.key === "ArrowDown") {
            combobox.selectNextOption();
            return true;
          }
          if (event.key === "ArrowUp") {
            combobox.selectPreviousOption();
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            if (items.length === 0) {
              return false;
            }
            combobox.clickSelectedOption();
            return true;
          }
          return false;
        },
      };
    }, [combobox, items.length]);

    const rect = clientRect?.() ?? null;

    return (
      <div
        className={classes.anchor}
        style={{ left: rect?.left ?? 0, top: rect?.bottom ?? 0 }}
      >
        <Combobox
          store={combobox}
          position="bottom-start"
          width={300}
          withinPortal
          onOptionSubmit={(userId) => {
            command({ id: userId });
          }}
        >
          <Combobox.Target>
            <div />
          </Combobox.Target>
          <Combobox.Dropdown>
            <Combobox.Options>
              {items.length === 0 ? (
                <Combobox.Empty>
                  <Trans>No teammates match</Trans>
                </Combobox.Empty>
              ) : (
                items.map((item) => {
                  return (
                    <Combobox.Option key={item.userId} value={item.userId}>
                      <div className={classes.option}>
                        <span className={classes.initials} aria-hidden>
                          {_initials(item.displayName)}
                        </span>
                        <Stack gap={0}>
                          <Text size="sm" fw={600}>
                            {item.displayName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.email}
                          </Text>
                        </Stack>
                      </div>
                    </Combobox.Option>
                  );
                })
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      </div>
    );
  },
);
```

The inline `style` is allowed here: the position is computed at runtime from the caret.

- [ ] **Step 4: Implement the suggestion wiring**

`createUserMentionSuggestion.ts`:

```ts
import { ReactRenderer } from "@tiptap/react";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import { UserMentionList } from "@/components/RichText/UserMention/UserMentionList";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type {
  UserMentionListHandle,
  UserMentionListProps,
} from "@/components/RichText/UserMention/UserMentionList";
import type { MentionOptions } from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";

function _toListProps(props: SuggestionProps<MentionCandidate>): UserMentionListProps {
  return {
    items: props.items,
    clientRect: props.clientRect,
    command: (attributes) => {
      props.command(attributes);
    },
  };
}

/**
 * Suggestion options for `@` mentions. `getCandidates` is read on every
 * keystroke, so the list follows the latest workspace members.
 */
export function createUserMentionSuggestion(
  getCandidates: () => readonly MentionCandidate[],
): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => {
      return filterMentionCandidates(getCandidates(), query);
    },
    render: () => {
      let renderer: ReactRenderer<UserMentionListHandle, UserMentionListProps> | undefined;

      const destroy = () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = undefined;
      };

      return {
        onStart: (props: SuggestionProps<MentionCandidate>) => {
          renderer = new ReactRenderer(UserMentionList, {
            props: _toListProps(props),
            editor: props.editor,
          });
          document.body.appendChild(renderer.element);
        },
        onUpdate: (props: SuggestionProps<MentionCandidate>) => {
          renderer?.updateProps(_toListProps(props));
        },
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          if (event.key === "Escape") {
            destroy();
            return true;
          }
          return renderer?.ref?.onKeyDown(event) ?? false;
        },
        onExit: destroy,
      };
    },
  };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/components/RichText/UserMention`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/RichText/UserMention
git commit -m "feat(comments): add the @ mention typeahead"
```

---

### Task 12: Extension list and markdown paste

**Files:**
- Create: `src/components/RichText/createRichTextExtensions.ts`
- Create: `src/components/RichText/PasteMarkdown/PasteMarkdown.ts`
- Test: `src/components/RichText/PasteMarkdown/PasteMarkdown.test.ts`
- Delete: nothing yet (`ActivityBlock.tsx` goes in Task 18)

- [ ] **Step 1: Write the failing test**

```ts
import { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { afterEach, describe, expect, it } from "vitest";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import { looksLikeMarkdown } from "@/components/RichText/PasteMarkdown/PasteMarkdown";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function _paste(target: Editor, text: string, types: string[] = ["text/plain"]): boolean {
  const event = {
    clipboardData: {
      types,
      getData: (type: string) => {
        return type === "text/plain" ? text : "";
      },
    },
  } as unknown as ClipboardEvent;
  return (
    target.view.someProp("handlePaste", (handlePaste) => {
      return handlePaste(target.view, event, Slice.empty);
    }) ?? false
  );
}

describe("looksLikeMarkdown", () => {
  it("spots lists, emphasis, and links", () => {
    expect(looksLikeMarkdown("- one\n- two")).toBe(true);
    expect(looksLikeMarkdown("Rash onset **Oct 24**")).toBe(true);
    expect(looksLikeMarkdown("See [the lab](https://example.org)")).toBe(true);
  });

  it("leaves ordinary prose alone", () => {
    expect(looksLikeMarkdown("Called the clinic at 9 AM.")).toBe(false);
  });
});

describe("PasteMarkdown", () => {
  it("turns pasted markdown into formatted content", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    expect(_paste(editor, "- Serum for IgM\n- NP swab for PCR")).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("bulletList");
  });

  it("lets the browser handle a paste that carries HTML", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    expect(_paste(editor, "- one", ["text/plain", "text/html"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/RichText/PasteMarkdown`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `PasteMarkdown.ts`**

```ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const MARKDOWN_PATTERN =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

/** Whether plain text carries markdown syntax worth converting. */
export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_PATTERN.test(text);
}

/**
 * Converts a plain-text paste that looks like markdown into rich content.
 * `@tiptap/markdown` parses but has no paste handler of its own. A paste
 * that carries HTML is left to the browser, which already keeps its
 * formatting.
 */
export const PasteMarkdown = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("pasteMarkdown"),
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard || clipboard.types.includes("text/html")) {
              return false;
            }
            const text = clipboard.getData("text/plain");
            if (!looksLikeMarkdown(text) || !editor.markdown) {
              return false;
            }
            const parsedDocument = editor.markdown.parse(text);
            return editor.commands.insertContent(parsedDocument.content ?? []);
          },
        },
      }),
    ];
  },
});
```

- [ ] **Step 4: Implement `createRichTextExtensions.ts`**

```ts
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { PasteMarkdown } from "@/components/RichText/PasteMarkdown/PasteMarkdown";
import { UserMention } from "@/components/RichText/UserMention/UserMention";
import type { Extensions } from "@tiptap/core";
import type { MentionOptions } from "@tiptap/extension-mention";

/**
 * The one extension list behind every rich text surface: the composer adds
 * a placeholder and the `@` suggestion; the static renderer uses it bare.
 * New node types (Phase 2's object references and embeds) are added here so
 * the editor and the renderer can never disagree.
 */
export function createRichTextExtensions(
  options: Readonly<{
    placeholder?: string;
    mentionSuggestion?: MentionOptions["suggestion"];
  }> = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Placeholder.configure({ placeholder: options.placeholder ?? "" }),
    UserMention.configure(
      options.mentionSuggestion ? { suggestion: options.mentionSuggestion } : {},
    ),
    Markdown,
    PasteMarkdown,
  ];
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/components/RichText/PasteMarkdown`
Expected: PASS (4 tests). If the editor's mention node view complains in jsdom, the test only exercises paste; that warning is not a failure.

- [ ] **Step 6: Commit**

```bash
git add src/components/RichText/createRichTextExtensions.ts src/components/RichText/PasteMarkdown
git commit -m "feat(comments): add the shared rich text extension list and markdown paste"
```

---

### Task 13: `RichTextView` (static rendering)

**Files:**
- Create: `src/components/RichText/RichTextView/RichTextView.tsx`
- Create: `src/components/RichText/RichTextView/RichTextView.module.css`
- Test: `src/components/RichText/RichTextView/RichTextView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { render, screen } from "@/test-utils";

describe("RichTextView", () => {
  it("renders formatting and mentions without an editor", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: () => {
            return "Dana Whitfield";
          },
        }}
      >
        <RichTextView
          document={{
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "userMention",
                    attrs: { id: "11111111-1111-4111-8111-111111111111" },
                  },
                  { type: "text", text: " rash onset " },
                  { type: "text", text: "Oct 24", marks: [{ type: "bold" }] },
                ],
              },
            ],
          }}
        />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.getByText("@Dana Whitfield")).toBeInTheDocument();
    expect(screen.getByText("Oct 24").tagName).toBe("STRONG");
  });

  it("falls back to plain text for a node it does not know", () => {
    render(
      <RichTextView
        document={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "objectEmbed", content: [{ type: "text", text: "Dashboard" }] }],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/RichText/RichTextView`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`RichTextView.module.css`:

```css
.root {
  font-size: var(--mantine-font-size-md);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.root p {
  margin: var(--mantine-spacing-xxs) 0 0;
}

.root ul,
.root ol {
  margin: var(--mantine-spacing-xxs) 0 0;
  padding-inline-start: var(--mantine-spacing-lg);
}

.root blockquote {
  margin: var(--mantine-spacing-xs) 0 0;
  padding-inline-start: var(--mantine-spacing-sm);
  border-inline-start: 1px solid var(--ava-border-strong);
  color: var(--mantine-color-neutral-8);
}

.root code {
  padding: 1px 4px;
  border-radius: var(--mantine-radius-xs);
  background-color: var(--mantine-color-neutral-1);
  font-size: var(--mantine-font-size-sm);
}

.root pre {
  margin: var(--mantine-spacing-xs) 0 0;
  padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm);
  border-radius: var(--mantine-radius-sm);
  background-color: var(--mantine-color-neutral-1);
  overflow-x: auto;
}

.root a {
  color: var(--mantine-color-primary-7);
  text-underline-offset: 2px;
}
```

`RichTextView.tsx`:

```tsx
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { useMemo } from "react";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import classes from "@/components/RichText/RichTextView/RichTextView.module.css";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import {
  isRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { ReactNode } from "react";

const VIEW_EXTENSIONS = createRichTextExtensions();

/**
 * Renders a stored document without an editor, so a feed of many comments
 * costs no editor instances. A document with a node this build does not
 * know is shown as plain text instead of failing.
 */
export function RichTextView({
  document,
}: {
  document: RichTextDocument.T;
}): ReactNode {
  const content = useMemo(() => {
    if (!isRichTextDocument(document)) {
      return <p>{richTextToPlainText(document)}</p>;
    }
    return renderToReactElement({
      extensions: VIEW_EXTENSIONS,
      content: document,
      options: {
        nodeMapping: {
          userMention: ({ node }) => {
            return <UserMentionChip userId={String(node.attrs.id ?? "")} />;
          },
        },
      },
    });
  }, [document]);

  return <div className={classes.root}>{content}</div>;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/RichText/RichTextView`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RichText/RichTextView
git commit -m "feat(comments): render stored rich text without an editor"
```

---

### Task 14: `RichTextComposer`

**Files:**
- Create: `src/components/RichText/RichTextComposer/RichTextComposer.tsx`
- Create: `src/components/RichText/RichTextComposer/RichTextComposer.module.css`
- Test: `src/components/RichText/RichTextComposer/RichTextComposer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { fireEvent, render, screen, waitFor } from "@/test-utils";

const DOCUMENT = {
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: "Lab results are in" }] }],
};

describe("RichTextComposer", () => {
  it("disables the submit button while the editor is empty", () => {
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("submits the document and clears itself when the submit succeeds", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "doc" }),
        "Lab results are in",
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    });
  });

  it("keeps the text when the submit fails", async () => {
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={vi.fn().mockResolvedValue(false)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(screen.getByText("Lab results are in")).toBeInTheDocument();
    });
  });

  it("disables posting when the caller blocks it", () => {
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        isSubmitBlocked
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/RichText/RichTextComposer`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`RichTextComposer.module.css`:

```css
.editor {
  border-color: var(--ava-border-strong);
}

.editor:focus-within {
  border-color: var(--ava-border-focus);
}

.content :global(.ProseMirror) {
  min-height: 64px;
  max-height: 320px;
  overflow-y: auto;
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  padding: var(--mantine-spacing-xxs) var(--mantine-spacing-xs) var(--mantine-spacing-xs);
}

.toolbar {
  border: 0;
  padding: 0;
  background: transparent;
}

.counter {
  margin-inline-start: auto;
}
```

`RichTextComposer.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconAt } from "@tabler/icons-react";
import { Extension } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import classes from "@/components/RichText/RichTextComposer/RichTextComposer.module.css";
import { createUserMentionSuggestion } from "@/components/RichText/UserMention/createUserMentionSuggestion";
import {
  RICH_TEXT_MAX_TEXT_LENGTH,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { ReactNode } from "react";

/** Show the character counter once the text is this close to the limit. */
const COUNTER_THRESHOLD = RICH_TEXT_MAX_TEXT_LENGTH - 1000;

type Props = {
  /** Accessible name of the editing area. */
  label: string;
  placeholder: string;
  initialContent?: RichTextDocument.T;
  mentionCandidates: readonly MentionCandidate[];
  submitLabel: ReactNode;
  isSubmitting: boolean;
  /** Blocks submitting while keeping the text editable, for example offline. */
  isSubmitBlocked?: boolean;
  /** Content above the editing area, such as an offline notice. */
  notice?: ReactNode;
  /** Resolves `true` when the document was saved, which clears the editor. */
  onSubmit: (document: RichTextDocument.T, plainText: string) => Promise<boolean>;
  onChange?: (document: RichTextDocument.T) => void;
  onCancel?: () => void;
};

/**
 * The rich text editor used to write and edit comments: markdown shortcuts,
 * markdown paste, `@` mentions of workspace members, and Mod-Enter to
 * submit.
 */
export function RichTextComposer({
  label,
  placeholder,
  initialContent,
  mentionCandidates,
  submitLabel,
  isSubmitting,
  isSubmitBlocked = false,
  notice,
  onSubmit,
  onChange,
  onCancel,
}: Props): ReactNode {
  const { t } = useLingui();
  const candidatesRef = useRef(mentionCandidates);
  candidatesRef.current = mentionCandidates;
  const submitRef = useRef<() => void>(() => {});
  const [plainTextLength, setPlainTextLength] = useState(0);
  const [isEmpty, setIsEmpty] = useState(initialContent === undefined);

  const membersLookup = useMemo(() => {
    const namesById = new Map(
      mentionCandidates.map((candidate) => {
        return [candidate.userId, candidate.displayName];
      }),
    );
    return {
      getMemberName: (userId: string) => {
        return namesById.get(userId);
      },
    };
  }, [mentionCandidates]);

  const editor = useEditor({
    extensions: [
      ...createRichTextExtensions({
        placeholder,
        mentionSuggestion: createUserMentionSuggestion(() => {
          return candidatesRef.current;
        }),
      }),
      Extension.create({
        name: "submitShortcut",
        addKeyboardShortcuts: () => {
          return {
            "Mod-Enter": () => {
              submitRef.current();
              return true;
            },
          };
        },
      }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: { "aria-label": label, "aria-multiline": "true", role: "textbox" },
    },
    onCreate: ({ editor: createdEditor }) => {
      setIsEmpty(createdEditor.isEmpty);
      setPlainTextLength(createdEditor.getText().length);
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setIsEmpty(updatedEditor.isEmpty);
      setPlainTextLength(updatedEditor.getText().length);
      onChange?.(updatedEditor.getJSON() as RichTextDocument.T);
    },
  });

  const isOverLimit = plainTextLength > RICH_TEXT_MAX_TEXT_LENGTH;
  const isSubmitDisabled = isEmpty || isOverLimit || isSubmitBlocked || isSubmitting;

  submitRef.current = () => {
    if (!editor || isSubmitDisabled) {
      return;
    }
    const document = editor.getJSON() as RichTextDocument.T;
    const plainText = richTextToPlainText(document, membersLookup);
    void onSubmit(document, plainText).then((didSave) => {
      if (didSave) {
        editor.commands.clearContent(true);
      }
    });
  };

  return (
    <RichTextMembersContext.Provider value={membersLookup}>
      <RichTextEditor editor={editor} className={classes.editor}>
        {notice}
        <RichTextEditor.Content className={classes.content} />
        <div className={classes.footer}>
          <RichTextEditor.Toolbar className={classes.toolbar}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Link />
              <RichTextEditor.Code />
              <RichTextEditor.Blockquote />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control
                aria-label={t`Mention a teammate`}
                title={t`Mention a teammate`}
                onClick={() => {
                  editor?.chain().focus().insertContent("@").run();
                }}
              >
                <IconAt size={16} stroke={1.75} />
              </RichTextEditor.Control>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          {plainTextLength >= COUNTER_THRESHOLD ? (
            <Text
              size="xs"
              c={isOverLimit ? "danger" : "dimmed"}
              className={classes.counter}
            >
              {t`${plainTextLength} of ${RICH_TEXT_MAX_TEXT_LENGTH} characters`}
            </Text>
          ) : null}
          <Group gap="xs" ml={plainTextLength >= COUNTER_THRESHOLD ? 0 : "auto"}>
            {onCancel ? (
              <Button variant="default" size="compact-sm" onClick={onCancel}>
                {t`Cancel`}
              </Button>
            ) : null}
            <Button
              size="compact-sm"
              loading={isSubmitting}
              disabled={isSubmitDisabled}
              onClick={() => {
                submitRef.current();
              }}
            >
              {submitLabel}
            </Button>
          </Group>
        </div>
      </RichTextEditor>
    </RichTextMembersContext.Provider>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/RichText/RichTextComposer`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RichText/RichTextComposer
git commit -m "feat(comments): add the rich text composer"
```

---

### Task 15: Reactions

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds.ts`
- Create: `.../CommentReactions/CommentReactions.tsx`
- Create: `.../CommentReactions/CommentReactions.module.css`
- Test: `.../CommentReactions/commentReactionKinds.test.ts`
- Test: `.../CommentReactions/CommentReactions.test.tsx`

`...` below means `src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed`.

- [ ] **Step 1: Write the failing logic tests**

`commentReactionKinds.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getNextReactionKind,
  summarizeReactions,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";

function _reaction(userId: string, kind: CommentReaction.Kind): CommentReaction.T {
  return {
    commentId: "c" as CommentReaction.T["commentId"],
    createdAt: "2026-11-06T10:00:00+00:00",
    id: `r-${userId}` as CommentReaction.Id,
    kind,
    updatedAt: "2026-11-06T10:00:00+00:00",
    userId: userId as CommentReaction.T["userId"],
    workspaceId: "w" as CommentReaction.T["workspaceId"],
  };
}

describe("getNextReactionKind", () => {
  it("sets a reaction when there is none", () => {
    expect(getNextReactionKind(undefined, "like")).toBe("like");
  });

  it("swaps to a different reaction", () => {
    expect(getNextReactionKind("like", "celebrate")).toBe("celebrate");
  });

  it("removes the reaction when the same one is picked again", () => {
    expect(getNextReactionKind("like", "like")).toBeUndefined();
  });
});

describe("summarizeReactions", () => {
  it("counts reactions, orders kinds by count, and groups names", () => {
    const summary = summarizeReactions(
      [_reaction("1", "support"), _reaction("2", "support"), _reaction("3", "like")],
      (userId) => {
        return { "1": "Dana", "2": "Luis", "3": "Grace" }[userId];
      },
    );
    expect(summary.total).toBe(3);
    expect(summary.kinds).toEqual(["support", "like"]);
    expect(summary.namesByKind.support).toEqual(["Dana", "Luis"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `commentReactionKinds.ts`**

```ts
import { msg } from "@lingui/core/macro";
import {
  IconBulb,
  IconConfetti,
  IconHeartFilled,
  IconHeartHandshake,
  IconMoodHappy,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { MessageDescriptor } from "@lingui/core";
import type { Icon } from "@tabler/icons-react";

/** The six reactions in picker order. Like is the one-click default. */
export const COMMENT_REACTION_KINDS: readonly CommentReaction.Kind[] = [
  "like",
  "celebrate",
  "support",
  "love",
  "insightful",
  "funny",
];

/** Label, icon, and icon color of each reaction. */
export const COMMENT_REACTION_DISPLAY: Readonly<
  Record<CommentReaction.Kind, { label: MessageDescriptor; Icon: Icon; color: string }>
> = {
  like: { label: msg`Like`, Icon: IconThumbUpFilled, color: "primary.7" },
  celebrate: { label: msg`Celebrate`, Icon: IconConfetti, color: "success.8" },
  support: { label: msg`Support`, Icon: IconHeartHandshake, color: "grape.7" },
  love: { label: msg`Love`, Icon: IconHeartFilled, color: "danger.6" },
  insightful: { label: msg`Insightful`, Icon: IconBulb, color: "warning.8" },
  funny: { label: msg`Funny`, Icon: IconMoodHappy, color: "info.8" },
};

/**
 * The reaction after a member picks `pickedKind`: picking your current
 * reaction removes it, anything else replaces it.
 */
export function getNextReactionKind(
  currentKind: CommentReaction.Kind | undefined,
  pickedKind: CommentReaction.Kind,
): CommentReaction.Kind | undefined {
  return currentKind === pickedKind ? undefined : pickedKind;
}

/** Totals for the reaction summary chip and its tooltip. */
export type ReactionSummary = {
  total: number;
  kinds: CommentReaction.Kind[];
  namesByKind: Partial<Record<CommentReaction.Kind, string[]>>;
};

/** Counts a comment's reactions, most common kind first. */
export function summarizeReactions(
  reactions: readonly CommentReaction.T[],
  getMemberName: (userId: string) => string | undefined,
): ReactionSummary {
  const namesByKind: Partial<Record<CommentReaction.Kind, string[]>> = {};
  reactions.forEach((reaction) => {
    const names = namesByKind[reaction.kind] ?? [];
    names.push(getMemberName(reaction.userId) ?? "");
    namesByKind[reaction.kind] = names;
  });
  const kinds = COMMENT_REACTION_KINDS.filter((kind) => {
    return (namesByKind[kind]?.length ?? 0) > 0;
  }).sort((kindA, kindB) => {
    return (namesByKind[kindB]?.length ?? 0) - (namesByKind[kindA]?.length ?? 0);
  });
  return { total: reactions.length, kinds, namesByKind };
}
```

- [ ] **Step 4: Run the logic tests**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing component test**

`CommentReactions.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

const COMMENT = {
  id: "c1",
  workspaceId: "w1",
} as Comment.T;

describe("CommentReactions", () => {
  it("posts a Like with one click", async () => {
    const insertSpy = vi
      .spyOn(CommentReactionClient, "insert")
      .mockResolvedValue({} as CommentReaction.T);
    render(
      <CommentReactions
        comment={COMMENT}
        reactions={[]}
        currentUserId={"u1" as CommentReaction.T["userId"]}
        getMemberName={() => {
          return "Dana";
        }}
      />,
      { wrapper: _wrapper },
    );
    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ commentId: "c1", kind: "like", userId: "u1" }),
          upsert: true,
        }),
      );
    });
  });

  it("shows the total and your current reaction", () => {
    render(
      <CommentReactions
        comment={COMMENT}
        reactions={[
          {
            commentId: "c1",
            id: "r1",
            kind: "celebrate",
            userId: "u1",
          } as CommentReaction.T,
        ]}
        currentUserId={"u1" as CommentReaction.T["userId"]}
        getMemberName={() => {
          return "Dana";
        }}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Celebrate" })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement the component**

`CommentReactions.module.css`:

```css
.row {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xxs);
  margin-top: var(--mantine-spacing-xs);
}

.stack {
  display: inline-flex;
}

.dot {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--ava-surface-raised);
  background-color: var(--mantine-color-neutral-1);
  margin-inline-start: -5px;
}

.dot:first-child {
  margin-inline-start: 0;
}

.picker {
  display: flex;
  gap: 2px;
}
```

`CommentReactions.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Popover, Tooltip } from "@mantine/core";
import { IconThumbUp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { notifyError } from "@/utils/notifications/notify";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import {
  COMMENT_REACTION_DISPLAY,
  COMMENT_REACTION_KINDS,
  getNextReactionKind,
  summarizeReactions,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

/** How long the pointer rests on the reaction button before the picker opens. */
const PICKER_OPEN_DELAY_MS = 350;

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
};

/**
 * The reaction summary and the reaction button. A click toggles your
 * current reaction (Like by default); resting the pointer on the button, or
 * pressing the down arrow on it, opens all six.
 */
export function CommentReactions({
  comment,
  reactions,
  currentUserId,
  getMemberName,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const openTimerRef = useRef<number | undefined>(undefined);
  const myReaction = reactions.find((reaction) => {
    return reaction.userId === currentUserId;
  });
  const summary = summarizeReactions(reactions, getMemberName);
  const buttonKind = myReaction?.kind ?? "like";
  const ButtonIcon = myReaction ? COMMENT_REACTION_DISPLAY[buttonKind].Icon : IconThumbUp;

  const pickReaction = async (pickedKind: CommentReaction.Kind) => {
    setIsPickerOpen(false);
    if (!currentUserId || isSaving) {
      return;
    }
    const nextKind = getNextReactionKind(myReaction?.kind, pickedKind);
    setIsSaving(true);
    try {
      if (nextKind === undefined && myReaction) {
        await CommentReactionClient.delete({ id: myReaction.id });
      } else if (nextKind !== undefined) {
        await CommentReactionClient.insert({
          data: {
            commentId: comment.id,
            kind: nextKind,
            userId: currentUserId,
            workspaceId: comment.workspaceId,
          },
          upsert: true,
          onConflict: { columnNames: ["comment_id", "user_id"], ignoreDuplicates: false },
        });
      }
      await queryClient.invalidateQueries({
        queryKey: [ActivityEventClient.getClientName()],
      });
    } catch {
      notifyError(t`Your reaction could not be saved. Try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const tooltipLabel = summary.kinds
    .map((kind) => {
      const names = (summary.namesByKind[kind] ?? []).filter(Boolean).join(", ");
      return `${i18n._(COMMENT_REACTION_DISPLAY[kind].label)}: ${names}`;
    })
    .join("\n");

  return (
    <div className={classes.row}>
      {summary.total > 0 ? (
        <Tooltip label={tooltipLabel} multiline style={{ whiteSpace: "pre-line" }}>
          <Group gap={4} wrap="nowrap" fz="xs" fw={600}>
            <span className={classes.stack} aria-hidden>
              {summary.kinds.map((kind) => {
                const { Icon, color } = COMMENT_REACTION_DISPLAY[kind];
                return (
                  <span key={kind} className={classes.dot}>
                    <Icon size={11} color={`var(--mantine-color-${color.replace(".", "-")})`} />
                  </span>
                );
              })}
            </span>
            {summary.total}
          </Group>
        </Tooltip>
      ) : null}
      <Popover opened={isPickerOpen} onChange={setIsPickerOpen} position="top-start" shadow="md">
        <Popover.Target>
          <Button
            variant={myReaction ? "light" : "subtle"}
            color={myReaction ? "primary" : "neutral"}
            size="compact-xs"
            aria-pressed={myReaction !== undefined}
            leftSection={<ButtonIcon size={13} />}
            onClick={() => {
              void pickReaction(buttonKind);
            }}
            onMouseEnter={() => {
              openTimerRef.current = window.setTimeout(() => {
                setIsPickerOpen(true);
              }, PICKER_OPEN_DELAY_MS);
            }}
            onMouseLeave={() => {
              window.clearTimeout(openTimerRef.current);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsPickerOpen(true);
              }
            }}
          >
            {i18n._(COMMENT_REACTION_DISPLAY[buttonKind].label)}
          </Button>
        </Popover.Target>
        <Popover.Dropdown p={4} onMouseLeave={() => {
          setIsPickerOpen(false);
        }}>
          <div className={classes.picker} role="menu" aria-label={t`Reactions`}>
            {COMMENT_REACTION_KINDS.map((kind) => {
              const { Icon, color, label } = COMMENT_REACTION_DISPLAY[kind];
              return (
                <Tooltip key={kind} label={i18n._(label)}>
                  <ActionIcon
                    variant="subtle"
                    color="neutral"
                    size="lg"
                    role="menuitemradio"
                    aria-checked={myReaction?.kind === kind}
                    aria-label={i18n._(label)}
                    onClick={() => {
                      void pickReaction(kind);
                    }}
                  >
                    <Icon size={22} color={`var(--mantine-color-${color.replace(".", "-")})`} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
```

Note: the reaction button's accessible name is the reaction label ("Like", or your current reaction such as "Celebrate"), which the tests rely on.

- [ ] **Step 8: Run to verify it passes**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions
git commit -m "feat(comments): add LinkedIn-style comment reactions"
```

---

### Task 16: `CommentCard` and its menu

**Files:**
- Create: `.../CommentCard/CommentCard.tsx`, `.../CommentCard/CommentCard.module.css`, `.../CommentCard/CommentActionsMenu.tsx`
- Test: `.../CommentCard/CommentCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CommentCard } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

function _comment(overrides: Partial<Comment.T> = {}): Comment.T {
  return {
    authorUserId: "u1" as User.Id,
    body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Specimens sent" }] }] },
    bodySchemaVersion: 1,
    bodyText: "Specimens sent",
    createdAt: "2026-10-27T13:40:00+00:00",
    deletedAt: undefined,
    editedAt: undefined,
    id: "c1" as Comment.Id,
    individualId: "i1" as Comment.T["individualId"],
    updatedAt: "2026-10-27T13:40:00+00:00",
    workspaceId: "w1" as Comment.T["workspaceId"],
    ...overrides,
  };
}

const NAMES: Record<string, string> = { u1: "Luis Romero" };

function _getMemberName(userId: string): string | undefined {
  return NAMES[userId];
}

describe("CommentCard", () => {
  it("shows the author, the body, and the reaction row", () => {
    render(
      <CommentCard comment={_comment()} reactions={[]} currentUserId={"u2" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Luis Romero")).toBeInTheDocument();
    expect(screen.getByText("Specimens sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like" })).toBeInTheDocument();
  });

  it("marks an edited comment", () => {
    render(
      <CommentCard comment={_comment({ editedAt: "2026-10-27T14:00:00+00:00" })} reactions={[]} currentUserId={"u2" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("replaces a deleted comment with a placeholder and no actions", () => {
    render(
      <CommentCard comment={_comment({ body: undefined, bodyText: undefined, deletedAt: "2026-10-27T15:00:00+00:00" })} reactions={[]} currentUserId={"u1" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("This comment was deleted.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Like" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comment actions" })).not.toBeInTheDocument();
  });

  it("offers the actions menu only on your own comment", () => {
    const { rerender } = render(
      <CommentCard comment={_comment()} reactions={[]} currentUserId={"u2" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
      { wrapper: _wrapper },
    );
    expect(screen.queryByRole("button", { name: "Comment actions" })).not.toBeInTheDocument();
    rerender(
      <CommentCard comment={_comment()} reactions={[]} currentUserId={"u1" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
    );
    expect(screen.getByRole("button", { name: "Comment actions" })).toBeInTheDocument();
  });

  it("names a former member as the author when their profile is gone", () => {
    render(
      <CommentCard comment={_comment({ authorUserId: undefined })} reactions={[]} currentUserId={"u2" as User.Id} getMemberName={_getMemberName} mentionCandidates={[]} isHighlighted={false} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Former member")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `CommentActionsMenu.tsx`**

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDots, IconLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { notifySuccess } from "@/utils/notifications/notify";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  onEdit: () => void;
  onDelete: () => void;
};

/** Edit, copy a link to, or delete your own comment. */
export function CommentActionsMenu({ comment, onEdit, onDelete }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="neutral" size="sm" aria-label={t`Comment actions`}>
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>
          {t`Edit`}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconLink size={14} />}
          onClick={() => {
            const url = new URL(window.location.href);
            url.search = "";
            url.searchParams.set("comment", comment.id);
            void navigator.clipboard.writeText(url.toString()).then(() => {
              notifySuccess(t`Link copied`);
            });
          }}
        >
          {t`Copy link to comment`}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={14} />}
          onClick={() => {
            modals.openConfirmModal({
              title: t`Delete comment?`,
              children: t`The comment is removed from the case for everyone.`,
              labels: { confirm: t`Delete`, cancel: t`Cancel` },
              confirmProps: { color: "danger" },
              onConfirm: onDelete,
            });
          }}
        >
          {t`Delete`}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 4: Implement `CommentCard`**

`CommentCard.module.css`:

```css
.card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  column-gap: var(--mantine-spacing-sm);
  padding: var(--mantine-spacing-sm) 0;
  border-radius: var(--mantine-radius-sm);
  transition: background-color var(--ava-transition-interactive, 140ms ease);
}

.card + .card {
  border-top: 1px solid var(--ava-border-default);
}

.highlighted {
  background-color: var(--mantine-color-primary-0);
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--ava-border-default);
  background-color: var(--mantine-color-neutral-1);
  font-size: var(--mantine-font-size-xs);
  font-weight: 600;
}

.header {
  display: flex;
  align-items: baseline;
  gap: var(--mantine-spacing-xs);
}

.actions {
  margin-inline-start: auto;
  opacity: 0;
  transition: opacity 140ms ease;
}

.card:hover .actions,
.card:focus-within .actions {
  opacity: 1;
}

.deleted {
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .actions {
    transition: none;
  }
}
```

`CommentCard.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Text, Tooltip } from "@mantine/core";
import { formatDate } from "@avandar/utils";
import clsx from "clsx";
import { useState } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentClient } from "@/clients/comments/CommentClient";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { notifyError } from "@/utils/notifications/notify";
import { CommentActionsMenu } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentActionsMenu";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard.module.css";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import {
  isRichTextDocument,
  RICH_TEXT_SCHEMA_VERSION,
} from "$/models/RichTextDocument/RichTextDocument";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
  mentionCandidates: readonly MentionCandidate[];
  isHighlighted: boolean;
};

/** Two-letter initials for the author's avatar. */
function _initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0]?.toUpperCase() ?? "";
    })
    .join("");
}

/** One comment in a case feed: author, time, body, reactions, and, for the author, edit and delete. */
export function CommentCard({
  comment,
  reactions,
  currentUserId,
  getMemberName,
  mentionCandidates,
  isHighlighted,
}: Props): ReactNode {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const [updateComment, isSaving] = CommentClient.useUpdate({
    queriesToInvalidate: [[ActivityEventClient.getClientName()]],
  });
  const authorName =
    (comment.authorUserId && getMemberName(comment.authorUserId)) ?? t`Former member`;
  const isDeleted = comment.deletedAt !== undefined;
  const isOwn = !isDeleted && comment.authorUserId !== undefined && comment.authorUserId === currentUserId;

  const saveEdit = (body: Comment.T["body"], plainText: string): Promise<boolean> => {
    return new Promise((resolve) => {
      updateComment(
        {
          id: comment.id,
          data: { body, bodyText: plainText, bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION },
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            resolve(true);
          },
          onError: () => {
            notifyError(t`Your changes could not be saved. Try again.`);
            resolve(false);
          },
        },
      );
    });
  };

  return (
    <article
      id={`comment-${comment.id}`}
      className={clsx(classes.card, isHighlighted && classes.highlighted)}
      aria-labelledby={`comment-${comment.id}-author`}
    >
      <span className={classes.avatar} aria-hidden>
        {_initials(authorName)}
      </span>
      <div>
        <div className={classes.header}>
          <Text id={`comment-${comment.id}-author`} size="sm" fw={600}>
            {authorName}
          </Text>
          <Tooltip label={formatDate(comment.createdAt, { format: "MMM D, YYYY [at] h:mm A" })}>
            <Text size="xs" c="dimmed" component="time" dateTime={comment.createdAt}>
              {formatDate(comment.createdAt, { format: "h:mm A" })}
            </Text>
          </Tooltip>
          {comment.editedAt && !isDeleted ? (
            <Tooltip label={formatDate(comment.editedAt, { format: "MMM D, YYYY [at] h:mm A" })}>
              <Text size="xs" c="dimmed">
                <Trans>edited</Trans>
              </Text>
            </Tooltip>
          ) : null}
          {isOwn && !isEditing ? (
            <span className={classes.actions}>
              <CommentActionsMenu
                comment={comment}
                onEdit={() => {
                  if (!isRichTextDocument(comment.body)) {
                    notifyError(t`This comment has content this version of Avandar cannot edit.`);
                    return;
                  }
                  setIsEditing(true);
                }}
                onDelete={() => {
                  updateComment(
                    { id: comment.id, data: { deletedAt: new Date().toISOString() } },
                    {
                      onError: () => {
                        notifyError(t`The comment could not be deleted. Try again.`);
                      },
                    },
                  );
                }}
              />
            </span>
          ) : null}
        </div>
        {isDeleted || !comment.body ? (
          <Text size="sm" c="dimmed" className={classes.deleted}>
            <Trans>This comment was deleted.</Trans>
          </Text>
        ) : isEditing ? (
          <RichTextComposer
            label={t`Edit comment`}
            placeholder={t`Write an update`}
            initialContent={comment.body}
            mentionCandidates={mentionCandidates}
            submitLabel={t`Save`}
            isSubmitting={isSaving}
            onSubmit={saveEdit}
            onCancel={() => {
              setIsEditing(false);
            }}
          />
        ) : (
          <>
            <RichTextView document={comment.body} />
            <CommentReactions
              comment={comment}
              reactions={reactions}
              currentUserId={currentUserId}
              getMemberName={getMemberName}
            />
          </>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard
git commit -m "feat(comments): add the comment card with edit and delete"
```

---

### Task 17: Feed renderers, day grouping, composer, and the feed

**Files:**
- Create: `.../activityFeedItemRenderers.tsx`, `.../groupActivityByDay.ts`
- Create: `.../CaseActivityComposer/caseActivityDraftStorage.ts`, `.../CaseActivityComposer/CaseActivityComposer.tsx`
- Create: `.../useCaseActivityFeed.ts`, `.../CaseActivityFeed.tsx`, `.../CaseActivityFeed.module.css`
- Test: `.../activityFeedItemRenderers.test.tsx`, `.../groupActivityByDay.test.ts`, `.../CaseActivityComposer/caseActivityDraftStorage.test.ts`, `.../CaseActivityComposer/CaseActivityComposer.test.tsx`, `.../CaseActivityFeed.test.tsx`

- [ ] **Step 1: Write the failing pure-logic tests**

`groupActivityByDay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupActivityByDay } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";

describe("groupActivityByDay", () => {
  it("starts a new group whenever the local day changes, keeping order", () => {
    const groups = groupActivityByDay([
      { id: "a", occurredAt: "2026-10-27T09:14:00" },
      { id: "b", occurredAt: "2026-10-27T13:40:00" },
      { id: "c", occurredAt: "2026-10-28T10:02:00" },
    ]);
    expect(
      groups.map((group) => {
        return group.entries.map((entry) => {
          return entry.id;
        });
      }),
    ).toEqual([["a", "b"], ["c"]]);
  });
});
```

`activityFeedItemRenderers.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FEED_VISIBLE_KINDS,
  activityFeedItemRenderers,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";

describe("activityFeedItemRenderers", () => {
  it("draws comment creation as a row and folds edits and deletes into the card", () => {
    expect(activityFeedItemRenderers.comment_created).not.toBeNull();
    expect(activityFeedItemRenderers.comment_edited).toBeNull();
    expect(activityFeedItemRenderers.comment_deleted).toBeNull();
    expect(ACTIVITY_FEED_VISIBLE_KINDS).toEqual(["comment_created"]);
  });
});
```

`caseActivityDraftStorage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCaseActivityDraft,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";

const DRAFT = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "draft" }] }] };

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("caseActivityDraftStorage", () => {
  it("saves, loads, and clears a draft per case", () => {
    saveCaseActivityDraft("w1", "i1", DRAFT);
    expect(loadCaseActivityDraft("w1", "i1")).toEqual(DRAFT);
    expect(loadCaseActivityDraft("w1", "i2")).toBeUndefined();
    clearCaseActivityDraft("w1", "i1");
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });

  it("returns nothing instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });

  it("ignores a stored value that is not a document", () => {
    window.localStorage.setItem("ava:case-activity-draft:w1:i1", "{\"type\":\"nope\"}");
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed`
Expected: the new tests FAIL with missing modules (Task 15 and 16 tests still pass).

- [ ] **Step 3: Implement the pure modules**

`groupActivityByDay.ts`:

```ts
/** A run of feed entries that happened on the same local day. */
export type ActivityDayGroup<T> = {
  dayKey: string;
  date: Date;
  entries: T[];
};

/** Splits time-ordered entries into local-day groups for day separators. */
export function groupActivityByDay<T extends { occurredAt: string }>(
  entries: readonly T[],
): Array<ActivityDayGroup<T>> {
  const groups: Array<ActivityDayGroup<T>> = [];
  entries.forEach((entry) => {
    const date = new Date(entry.occurredAt);
    const dayKey = date.toDateString();
    const lastGroup = groups.at(-1);
    if (lastGroup?.dayKey === dayKey) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ dayKey, date, entries: [entry] });
    }
  });
  return groups;
}
```

`activityFeedItemRenderers.tsx`:

```tsx
import { CommentCard } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard";
import type { ActivityFeedEntry } from "@/clients/activity/ActivityEventClient";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

/** What every feed row receives. */
export type ActivityFeedItemProps = {
  entry: ActivityFeedEntry;
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
  mentionCandidates: readonly MentionCandidate[];
  highlightedCommentId: string | undefined;
};

function CommentCreatedItem({
  entry,
  currentUserId,
  getMemberName,
  mentionCandidates,
  highlightedCommentId,
}: ActivityFeedItemProps): ReactNode {
  if (!entry.comment) {
    return null;
  }
  return (
    <CommentCard
      comment={entry.comment}
      reactions={entry.reactions}
      currentUserId={currentUserId}
      getMemberName={getMemberName}
      mentionCandidates={mentionCandidates}
      isHighlighted={highlightedCommentId === entry.comment.id}
    />
  );
}

/**
 * The row component for each activity kind, or `null` for kinds that change
 * an existing row instead of adding one. A new kind (a status change, a
 * field edit) is one more entry here, drawn as a single line with an icon.
 */
export const activityFeedItemRenderers: Readonly<
  Record<ActivityEvent.Kind, ((props: ActivityFeedItemProps) => ReactNode) | null>
> = {
  comment_created: CommentCreatedItem,
  comment_edited: null,
  comment_deleted: null,
};

/** Kinds that get their own row. The feed query asks only for these. */
export const ACTIVITY_FEED_VISIBLE_KINDS: readonly ActivityEvent.Kind[] = (
  Object.keys(activityFeedItemRenderers) as ActivityEvent.Kind[]
).filter((kind) => {
  return activityFeedItemRenderers[kind] !== null;
});
```

`CaseActivityComposer/caseActivityDraftStorage.ts`:

```ts
import { isRichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

function _buildDraftKey(workspaceId: string, individualId: string): string {
  return `ava:case-activity-draft:${workspaceId}:${individualId}`;
}

/** The unsent update for a case on this device, if any. */
export function loadCaseActivityDraft(
  workspaceId: string,
  individualId: string,
): RichTextDocument.T | undefined {
  try {
    const storedValue = window.localStorage.getItem(_buildDraftKey(workspaceId, individualId));
    if (storedValue === null) {
      return undefined;
    }
    const parsedValue: unknown = JSON.parse(storedValue);
    return isRichTextDocument(parsedValue) ? parsedValue : undefined;
  } catch {
    return undefined;
  }
}

/** Keeps the unsent update for a case on this device. */
export function saveCaseActivityDraft(
  workspaceId: string,
  individualId: string,
  document: RichTextDocument.T,
): void {
  try {
    window.localStorage.setItem(_buildDraftKey(workspaceId, individualId), JSON.stringify(document));
  } catch {
    // Storage can be full or blocked; a lost draft is better than a crash.
  }
}

/** Forgets the unsent update for a case after it is posted. */
export function clearCaseActivityDraft(workspaceId: string, individualId: string): void {
  try {
    window.localStorage.removeItem(_buildDraftKey(workspaceId, individualId));
  } catch {
    // See saveCaseActivityDraft.
  }
}
```

- [ ] **Step 4: Run the pure tests**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay.test.ts src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers.test.tsx src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing composer and feed tests**

`CaseActivityComposer/CaseActivityComposer.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { CaseActivityComposer } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const isOnline = vi.hoisted(() => {
  return { value: true };
});

vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return isOnline.value;
    },
  };
});

function _wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

afterEach(() => {
  isOnline.value = true;
  window.localStorage.clear();
});

describe("CaseActivityComposer", () => {
  it("restores the draft saved for this case", () => {
    window.localStorage.setItem(
      "ava:case-activity-draft:w1:i1",
      JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Unsent contact list" }] }] }),
    );
    render(
      <CaseActivityComposer workspaceId={"w1" as Workspace.Id} individualId={"i1" as Individual.Id} mentionCandidates={[]} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Unsent contact list")).toBeInTheDocument();
  });

  it("explains that the draft is kept and blocks posting while offline", () => {
    isOnline.value = false;
    window.localStorage.setItem(
      "ava:case-activity-draft:w1:i1",
      JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Offline note" }] }] }),
    );
    render(
      <CaseActivityComposer workspaceId={"w1" as Workspace.Id} individualId={"i1" as Individual.Id} mentionCandidates={[]} />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });
});
```

`CaseActivityFeed.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { render, screen } from "@/test-utils";
import { CaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "u1" };
    },
  };
});

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe("CaseActivityFeed", () => {
  it("teaches the next move when the case has no activity", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue({ entries: [], hasMore: false });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    expect(await screen.findByText("No activity on this case yet")).toBeInTheDocument();
  });

  it("shows comments under a day separator", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue({
      hasMore: false,
      entries: [
        {
          actorUserId: "u1",
          commentId: "c1",
          id: "e1",
          individualId: "i1",
          kind: "comment_created",
          occurredAt: "2026-10-27T13:40:00",
          payload: {},
          payloadVersion: 1,
          recordedAt: "2026-10-27T13:40:00",
          source: "avandar",
          workspaceId: "w1",
          reactions: [],
          comment: {
            authorUserId: "u1",
            body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Specimens sent" }] }] },
            bodySchemaVersion: 1,
            bodyText: "Specimens sent",
            createdAt: "2026-10-27T13:40:00",
            deletedAt: undefined,
            editedAt: undefined,
            id: "c1",
            individualId: "i1",
            updatedAt: "2026-10-27T13:40:00",
            workspaceId: "w1",
          },
        },
      ] as never,
    });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    expect(await screen.findByText("Specimens sent")).toBeInTheDocument();
    expect(screen.getByText(/October 27/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer.test.tsx src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 7: Implement the composer**

`CaseActivityComposer/CaseActivityComposer.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { useMemo } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentClient } from "@/clients/comments/CommentClient";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { notifyError } from "@/utils/notifications/notify";
import {
  clearCaseActivityDraft,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";
import { RICH_TEXT_SCHEMA_VERSION } from "$/models/RichTextDocument/RichTextDocument";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Props = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  mentionCandidates: readonly MentionCandidate[];
};

/** The composer docked under a case's feed. Keeps a per-case draft on this device. */
export function CaseActivityComposer({
  workspaceId,
  individualId,
  mentionCandidates,
}: Props): ReactNode {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const initialDraft = useMemo(() => {
    return loadCaseActivityDraft(workspaceId, individualId);
  }, [workspaceId, individualId]);
  const [insertComment, isPosting] = CommentClient.useInsert({
    queriesToInvalidate: [[ActivityEventClient.getClientName()]],
  });

  const postComment = (document: RichTextDocument.T, plainText: string): Promise<boolean> => {
    return new Promise((resolve) => {
      insertComment(
        {
          data: {
            body: document,
            bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION,
            bodyText: plainText,
            individualId,
            workspaceId,
          },
        },
        {
          onSuccess: () => {
            clearCaseActivityDraft(workspaceId, individualId);
            resolve(true);
          },
          onError: () => {
            notifyError(t`Your update was not posted. It is still in the box, so you can try again.`);
            resolve(false);
          },
        },
      );
    });
  };

  return (
    <RichTextComposer
      key={`${workspaceId}:${individualId}`}
      label={t`Write an update`}
      placeholder={t`Write an update. Type @ to mention a teammate.`}
      initialContent={initialDraft}
      mentionCandidates={mentionCandidates}
      submitLabel={t`Post`}
      isSubmitting={isPosting}
      isSubmitBlocked={!isOnline}
      notice={
        isOnline ? null : (
          <Group gap="xs" px="sm" py={6} bg="neutral.1">
            <IconWifiOff size={14} aria-hidden />
            <Text size="xs">
              {t`You're offline. Your draft is saved on this device and you can post when you reconnect.`}
            </Text>
          </Group>
        )
      }
      onChange={(document) => {
        saveCaseActivityDraft(workspaceId, individualId, document);
      }}
      onSubmit={postComment}
    />
  );
}
```

- [ ] **Step 8: Implement the feed hook**

`useCaseActivityFeed.ts`:

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { ACTIVITY_FEED_VISIBLE_KINDS } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import type {
  ActivityFeedCursor,
  ActivityFeedEntry,
} from "@/clients/activity/ActivityEventClient";
import type { Individual } from "$/models/ontology/Individual/Individual";

const PAGE_SIZE = 50;

/** How many pages to load while looking for a linked comment. */
const MAX_PAGES_FOR_LINKED_COMMENT = 10;

type CaseActivityFeed = {
  entries: ActivityFeedEntry[];
  isLoading: boolean;
  isError: boolean;
  hasEarlier: boolean;
  isLoadingEarlier: boolean;
  loadEarlier: () => void;
};

/**
 * A case's feed, oldest entry first, loaded newest page first. When a
 * comment is linked, keeps loading earlier pages until it is present.
 */
export function useCaseActivityFeed(
  individualId: Individual.Id,
  linkedCommentId: string | undefined,
): CaseActivityFeed {
  const query = useInfiniteQuery({
    queryKey: [ActivityEventClient.getClientName(), "caseActivityFeed", individualId],
    queryFn: (context) => {
      return ActivityEventClient.getCaseActivityPage({
        individualId,
        kinds: ACTIVITY_FEED_VISIBLE_KINDS,
        before: context.pageParam,
        limit: PAGE_SIZE,
      });
    },
    initialPageParam: undefined as ActivityFeedCursor | undefined,
    getNextPageParam: (lastPage): ActivityFeedCursor | undefined => {
      const oldestEntry = lastPage.entries[0];
      if (!lastPage.hasMore || !oldestEntry) {
        return undefined;
      }
      return {
        occurredAt: oldestEntry.occurredAt,
        recordedAt: oldestEntry.recordedAt,
        id: oldestEntry.id,
      };
    },
    refetchOnWindowFocus: true,
  });

  const entries = useMemo(() => {
    return [...(query.data?.pages ?? [])].reverse().flatMap((page) => {
      return page.entries;
    });
  }, [query.data]);

  const isLinkedCommentLoaded =
    linkedCommentId === undefined ||
    entries.some((entry) => {
      return entry.commentId === linkedCommentId;
    });
  const pageCount = query.data?.pages.length ?? 0;

  useEffect(() => {
    if (
      !isLinkedCommentLoaded &&
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      pageCount < MAX_PAGES_FOR_LINKED_COMMENT
    ) {
      void query.fetchNextPage();
    }
  }, [isLinkedCommentLoaded, pageCount, query]);

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    hasEarlier: query.hasNextPage,
    isLoadingEarlier: query.isFetchingNextPage,
    loadEarlier: () => {
      void query.fetchNextPage();
    },
  };
}
```

- [ ] **Step 9: Implement the feed**

`CaseActivityFeed.module.css`:

```css
.feed {
  display: flex;
  flex-direction: column;
}

.day {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  margin-top: var(--mantine-spacing-sm);
}

.day::after {
  content: "";
  flex: 1;
  height: 1px;
  background-color: var(--ava-border-default);
}

.dock {
  position: sticky;
  bottom: 0;
  padding: var(--mantine-spacing-sm) 0 var(--mantine-spacing-md);
  background-color: var(--ava-surface-raised);
}

.empty {
  padding: var(--mantine-spacing-xxl) var(--mantine-spacing-lg);
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}
```

`CaseActivityFeed.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Center, Loader, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { Callout } from "@avandar/ui";
import { useEffect, useMemo, useRef } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { activityFeedItemRenderers } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import { CaseActivityComposer } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import { groupActivityByDay } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";
import { useCaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Props = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  members: readonly WorkspaceMemberProfile[];
  highlightedCommentId: string | undefined;
};

/**
 * A case's activity: every entry oldest first under day separators, with
 * the composer docked at the bottom. Phase 1 shows comments only.
 */
export function CaseActivityFeed({
  workspaceId,
  individualId,
  members,
  highlightedCommentId,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const currentUser = useCurrentUser();
  const feed = useCaseActivityFeed(individualId, highlightedCommentId);
  const endRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    return members.map((member) => {
      return {
        userId: member.userId,
        displayName: member.displayName || member.fullName,
        email: member.email,
      };
    });
  }, [members]);

  const membersLookup = useMemo(() => {
    const namesById = new Map(
      mentionCandidates.map((candidate) => {
        return [candidate.userId, candidate.displayName];
      }),
    );
    return {
      getMemberName: (userId: string) => {
        return namesById.get(userId);
      },
    };
  }, [mentionCandidates]);

  useEffect(() => {
    if (feed.isLoading || hasScrolledRef.current) {
      return;
    }
    hasScrolledRef.current = true;
    if (highlightedCommentId) {
      document.getElementById(`comment-${highlightedCommentId}`)?.scrollIntoView({ block: "center" });
    } else {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [feed.isLoading, highlightedCommentId, feed.entries.length]);

  const dayGroups = groupActivityByDay(feed.entries);

  return (
    <RichTextMembersContext.Provider value={membersLookup}>
      <AppViewSection
        title={<Trans>Activity</Trans>}
        meta={feed.entries.length > 0 ? feed.entries.length : undefined}
      >
        {feed.isLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : feed.isError ? (
          <Callout
            title={t`The activity for this case failed to load`}
            message={t`Try again in a moment, or reach out to support if it keeps happening.`}
          />
        ) : feed.entries.length === 0 ? (
          <Stack className={classes.empty} align="center" gap="xs">
            <ThemeIcon size={64} radius="xl" variant="light">
              <IconMessages size={28} />
            </ThemeIcon>
            <Title order={4} fw={650}>
              <Trans>No activity on this case yet</Trans>
            </Title>
            <Text c="dimmed" size="sm">
              <Trans>Post the first update below. Mention a teammate with @ to bring them in.</Trans>
            </Text>
          </Stack>
        ) : (
          <div className={classes.feed} role="feed" aria-busy={feed.isLoadingEarlier}>
            {feed.hasEarlier ? (
              <Button
                variant="subtle"
                color="neutral"
                size="compact-sm"
                loading={feed.isLoadingEarlier}
                onClick={feed.loadEarlier}
                style={{ alignSelf: "center" }}
              >
                <Trans>Show earlier activity</Trans>
              </Button>
            ) : null}
            {dayGroups.map((group) => {
              return (
                <div key={group.dayKey}>
                  <Text size="xs" c="dimmed" fw={500} className={classes.day}>
                    {i18n.date(group.date, { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                  {group.entries.map((entry) => {
                    const Renderer = activityFeedItemRenderers[entry.kind];
                    return Renderer ? (
                      <Renderer
                        key={entry.id}
                        entry={entry}
                        currentUserId={currentUser?.id}
                        getMemberName={membersLookup.getMemberName}
                        mentionCandidates={mentionCandidates}
                        highlightedCommentId={highlightedCommentId}
                      />
                    ) : null;
                  })}
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
        <div className={classes.dock}>
          <CaseActivityComposer
            workspaceId={workspaceId}
            individualId={individualId}
            mentionCandidates={mentionCandidates}
          />
        </div>
      </AppViewSection>
    </RichTextMembersContext.Provider>
  );
}
```

The single inline `style` on "Show earlier activity" is acceptable only if it stays one property; if the design detector flags it, move `align-self: center` into the module as `.earlier`.

- [ ] **Step 10: Run all feed tests**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed
git commit -m "feat(comments): add the case activity feed and docked composer"
```

---

### Task 18: Record page on `AppView`

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.test.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/index.tsx`
- Modify: `src/views/IndividualManagerApp/index.tsx:22-27`
- Modify: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx`
- Delete: `src/views/IndividualManagerApp/SingleIndividualView/ActivityBlock.tsx`
- Delete: `src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.tsx`, its `.test.tsx`, and its `.module.css`

- [ ] **Step 1: Write the failing rail test**

`CaseDetailsRail.test.tsx` (carries over the two behaviors `RecordAttributesList.test.tsx` guarded):

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

describe("CaseDetailsRail", () => {
  it("lists each field with its value and source, and never shows internal ids", () => {
    render(
      <CaseDetailsRail
        attributes={[
          { name: "Borough", value: "Brooklyn", sourceName: "Measles line list" },
          { name: "MMR status", value: "Unknown" },
        ]}
      />,
    );
    expect(screen.getByText("Borough")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();
    expect(screen.getByText("Measles line list")).toBeInTheDocument();
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/)).not.toBeInTheDocument();
  });

  it("says so when the record has no fields", () => {
    render(<CaseDetailsRail attributes={[]} />);
    expect(screen.getByText("No fields yet")).toBeInTheDocument();
  });

  it("waits quietly while fields load", () => {
    render(<CaseDetailsRail attributes={undefined} />);
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `CaseDetailsRail.tsx`**

```tsx
import { Trans } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { unknownToString } from "@avandar/utils";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { ReactNode } from "react";

/** One field of a case as the rail shows it. */
export type CaseDetailsRow = {
  name: string;
  value: unknown;
  sourceName?: string;
};

/** The case's fields as reference material in the properties rail. */
export function CaseDetailsRail({
  attributes,
}: {
  attributes: readonly CaseDetailsRow[] | undefined;
}): ReactNode {
  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Details</Trans>}>
        {attributes === undefined ? (
          <Loader size="xs" />
        ) : attributes.length === 0 ? (
          <Text size="sm" c="dimmed">
            <Trans>No fields yet</Trans>
          </Text>
        ) : (
          attributes.map((attribute) => {
            return (
              <AppViewRail.Fact key={attribute.name} label={attribute.name}>
                {unknownToString(attribute.value)}
                {attribute.sourceName ? (
                  <Text size="xs" c="dimmed">
                    {attribute.sourceName}
                  </Text>
                ) : null}
              </AppViewRail.Fact>
            );
          })
        )}
      </AppViewRail.Group>
    </AppViewRail>
  );
}
```

If `AppViewRail.Group` renders its `title` as something other than a heading, change the third test to `screen.getByText("Details")`.

- [ ] **Step 4: Run the rail test**

Run: `pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Rewrite `SingleIndividualView/index.tsx`**

Keep `HydratedIndividual` and `useHydratedIndividual` (lines 25-135) exactly as they are. Replace the imports block, `Props`, and the `SingleIndividualView` function with:

```tsx
import {
  isNonNullish,
  makeIdLookupMap,
  makeMap,
  prop,
  propEq,
  unknownToString,
} from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { CaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import { where } from "@avandar/utils";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Individual } from "$/models/ontology/Individual/Individual";
```

(Merge the two `@avandar/utils` imports into one; `where` is already imported in the original file.)

```tsx
type Props = {
  concept: Concept.T;
  individual: Individual.T;
  /** A comment to scroll to and highlight, from a copied comment link. */
  highlightedCommentId: string | undefined;
};

/**
 * A case's record page: its name and case type in the header band, its
 * activity feed and composer in the content column, and its fields in the
 * properties rail.
 */
export function SingleIndividualView({
  concept,
  individual,
  highlightedCommentId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [hydratedIndividual, isLoadingHydratedIndividual] = useHydratedIndividual({
    concept,
    individual,
  });
  const [members] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: individual.workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });

  const attributeRows: CaseDetailsRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <AppView>
      <AppViewHeader
        title={
          isLoadingHydratedIndividual ? (
            <Skeleton component="span" height={24} width={200} />
          ) : (
            unknownToString(hydratedIndividual.name)
          )
        }
        facts={[concept.name]}
      />
      <AppViewBody rail={<CaseDetailsRail attributes={attributeRows} />}>
        <CaseActivityFeed
          workspaceId={individual.workspaceId}
          individualId={individual.id}
          members={members ?? []}
          highlightedCommentId={highlightedCommentId}
        />
      </AppViewBody>
    </AppView>
  );
}
```

The spec lists "time of the latest activity" as a header fact. Leave it out of this task: the header would need its own feed query. Record it in the plan's follow-up list instead (Task 21 adds it to the doc).

- [ ] **Step 6: Let `AppViewBody` own scrolling**

In `src/views/IndividualManagerApp/index.tsx`, replace the `ScrollArea` wrapper (lines 22-27) with the Data Sources pattern from `src/views/DataManagerApp/DataManagerApp.tsx:41-48`:

```tsx
    <Flex align="stretch" h="100%" mih={0}>
      <IndividualNavbar concept={concept} miw={240} />
      {/* Not a scroll container: the record page's AppViewBody scrolls,
          so the header band stays put. */}
      <Flex direction="column" flex={1} miw={0} mih={0}>
        <Outlet />
      </Flex>
    </Flex>
```

Remove the now-unused `ScrollArea` import. Check `IndividualSelectionEmptyState` still centers (it renders in the same outlet): run `pnpm vitest run src/views/IndividualManagerApp/IndividualSelectionEmptyState`.

- [ ] **Step 7: Add the `comment` search param to the route**

In `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx`:

```tsx
import { z } from "zod";

const RecordSearchSchema = z.object({
  comment: z.uuid().optional().catch(undefined),
});
```

Add `validateSearch: RecordSearchSchema,` to the `createFileRoute(...)({ ... })` options, and change `RouteComponent` to:

```tsx
function RouteComponent() {
  const { concept, individual } = Route.useLoaderData();
  const { comment } = Route.useSearch();
  return (
    <SingleIndividualView
      key={individual.id}
      concept={concept}
      individual={individual}
      highlightedCommentId={comment}
    />
  );
}
```

`key={individual.id}` resets the feed's scroll memory and the composer when the user picks another record.

- [ ] **Step 8: Delete the replaced files**

```bash
git rm src/views/IndividualManagerApp/SingleIndividualView/ActivityBlock.tsx \
  src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.tsx \
  src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.test.tsx \
  src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.module.css
```

Then: `grep -rn "RecordAttributesList\|ActivityBlock" src docs`
Expected: matches only in docs, which Task 21 updates.

- [ ] **Step 9: Type check and run the view tests**

Run: `pnpm type-check && pnpm vitest run src/views/IndividualManagerApp src/components/RichText`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/views/IndividualManagerApp src/routes/_auth/\$workspaceSlug/individual-manager/\$conceptId/\$individualId.tsx
git commit -m "feat(comments): move the record page onto AppView with the activity feed"
```

---

### Task 19: Desktop exclusion and translations

**Files:**
- Modify: `apps/desktop/sync/syncable-tables.ts`
- Modify: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts` (generated)

- [ ] **Step 1: Exclude the new tables from desktop sync**

In `apps/desktop/sync/syncable-tables.ts`, add to `EXCLUDED_TABLES` (keep the list's ordering style):

```ts
  // Case activity: collaborative, server-of-truth, and audit data. The
  // desktop does not render case comments offline.
  "activity_events",
  "comment_mentions",
  "comment_reactions",
  "comment_revisions",
  "comments",
```

Also add `activity_events, comments, comment_reactions, comment_mentions, comment_revisions` to the EXCLUDED bullet of the file's header comment.

- [ ] **Step 2: Run the desktop tests**

Run: `pnpm test:desktop`
Expected: PASS. The migration generator test hard-errors on any table in a migration that is in neither list, so this proves the five tables are classified.

- [ ] **Step 3: Extract and compile translations**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: new message ids in all eight `messages.po` files.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/sync/syncable-tables.ts src/i18n/locales
git commit -m "chore(comments): exclude case activity from desktop sync and extract messages"
```

---

### Task 20: End-to-end spec

Load the `playwright-best-practices` skill.

**Files:**
- Create: `tests/e2e/helpers/seedCaseRecord.ts`
- Create: `tests/e2e/case-activity.spec.ts`

- [ ] **Step 1: Write the seed helper (setup only)**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** A case type with one record, seeded so a test can open a record page. */
export type SeededCaseRecord = {
  conceptId: string;
  individualId: string;
};

/**
 * Inserts a case type and one record. This is pre-test setup: creating a
 * case type through the UI is covered by its own specs and is slow.
 */
export async function seedCaseRecord(options: {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  caseTypeName: string;
  recordName: string;
}): Promise<SeededCaseRecord> {
  const { data: ownerId, error: ownerError } = await options.admin.rpc(
    "util__get_user_id_by_email",
    { p_email: options.ownerEmail },
  );
  if (ownerError || typeof ownerId !== "string") {
    throw new Error(`Could not find the e2e owner ${options.ownerEmail}`);
  }
  const { data: concept } = await options.admin
    .from("concepts")
    .insert({
      owner_id: ownerId,
      workspace_id: options.workspaceId,
      name: options.caseTypeName,
      allow_manual_creation: true,
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: individual } = await options.admin
    .from("individuals")
    .insert({
      workspace_id: options.workspaceId,
      concept_id: concept.id,
      external_id: `e2e-${Date.now()}`,
      name: options.recordName,
    })
    .select("id")
    .single()
    .throwOnError();
  return { conceptId: concept.id, individualId: individual.id };
}

/** Removes a seeded case type; its records, comments, and activity cascade. */
export async function deleteSeededCaseRecord(options: {
  admin: SupabaseClient;
  conceptId: string | undefined;
}): Promise<void> {
  if (!options.conceptId) {
    return;
  }
  await options.admin.from("concepts").delete().eq("id", options.conceptId).throwOnError();
}
```

- [ ] **Step 2: Write the spec**

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteSeededCaseRecord, seedCaseRecord } from "./helpers/seedCaseRecord";
import { createSupabaseAdminClient, getWorkspaceIdBySlug } from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_TEST_USER_PASSWORD } from "./setup/e2e-credentials";

test("a member posts, reacts to, edits, and deletes a case update", async ({ page, e2eWorkerDb }) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let conceptId: string | undefined;
  try {
    const workspaceId = await getWorkspaceIdBySlug({ supabaseAdminClient: admin, slug: workspaceSlug });
    const seeded = await seedCaseRecord({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      caseTypeName: "E2E measles case",
      recordName: "E2E Amara Okafor",
    });
    conceptId = seeded.conceptId;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: E2E_TEST_USER_PASSWORD,
      workspaceSlug,
    });
    await page.goto(`/${workspaceSlug}/individual-manager/${seeded.conceptId}/${seeded.individualId}`);
    await expect(page.getByText("No activity on this case yet")).toBeVisible({ timeout: MEDIUM_WAIT });

    // Write with markdown shortcuts and a mention picked from the typeahead.
    const editor = page.getByRole("textbox", { name: "Write an update" });
    await editor.click();
    await editor.pressSequentially("Lab results **pending** for ");
    await editor.pressSequentially("@test-user");
    await page.getByRole("option").first().click();
    await editor.press("Enter");
    await editor.pressSequentially("- Serum for IgM");
    await page.getByRole("button", { name: "Post" }).click();

    const comment = page.getByRole("article").filter({ hasText: "Lab results" });
    await expect(comment).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(comment.locator("strong", { hasText: "pending" })).toBeVisible();
    await expect(comment.locator('[data-type="userMention"]')).toBeVisible();
    await expect(comment.getByRole("listitem")).toHaveText("Serum for IgM");

    // React with Celebrate, then swap to Like.
    await comment.getByRole("button", { name: "Like" }).focus();
    await page.keyboard.press("ArrowDown");
    await page.getByRole("menuitemradio", { name: "Celebrate" }).click();
    await expect(comment.getByRole("button", { name: "Celebrate" })).toHaveAttribute("aria-pressed", "true");
    await comment.getByRole("button", { name: "Celebrate" }).focus();
    await page.keyboard.press("ArrowDown");
    await page.getByRole("menuitemradio", { name: "Like" }).click();
    await expect(comment.getByRole("button", { name: "Like" })).toHaveAttribute("aria-pressed", "true");

    // Edit.
    await comment.hover();
    await comment.getByRole("button", { name: "Comment actions" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editEditor = comment.getByRole("textbox", { name: "Edit comment" });
    await editEditor.press("End");
    await editEditor.pressSequentially(" and NP swab");
    await comment.getByRole("button", { name: "Save" }).click();
    await expect(comment.getByText("edited")).toBeVisible({ timeout: MEDIUM_WAIT });

    // Delete.
    await comment.hover();
    await comment.getByRole("button", { name: "Comment actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("This comment was deleted.")).toBeVisible({ timeout: MEDIUM_WAIT });
  } finally {
    await deleteSeededCaseRecord({ admin, conceptId });
  }
});
```

If `primaryUser` exposes the email under a different property name, read `tests/e2e/fixtures/e2e.fixture.ts` and adjust; if the typeahead shows no option for `@test-user`, the e2e user's email prefix differs, so read `E2E_PRIMARY_USER_EMAIL` and type its local part instead.

- [ ] **Step 3: Run the spec alone**

Run: `pnpm test:e2e case-activity.spec.ts`
Expected: PASS within the local 45-second ceiling. Fix the UI, not the timeout, if it is slow.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/seedCaseRecord.ts tests/e2e/case-activity.spec.ts
git commit -m "test(comments): cover posting, reacting, editing, and deleting a case update"
```

---

### Task 21: Documentation and roadmap

**Files:**
- Create: `docs/measles-demo/case-activity-architecture.md`
- Modify: `docs/ontology-architecture.md`
- Modify: `docs/production-plan-world-humanitarian-day.md`
- Modify: `CLAUDE.md` (Documentation list)

- [ ] **Step 1: Write `docs/measles-demo/case-activity-architecture.md`**

```markdown
# Case activity architecture

How a case records everything that happens to it, and how the activity feed
on the record page reads that record. Spec:
[case-comments-design.md](case-comments-design.md).

## The model

| Table | Holds | Written by |
| --- | --- | --- |
| `comments` | Each comment's current state | Members (insert), authors (body and `deleted_at`) |
| `comment_revisions` | Every body a comment had before its current one | `comments__record_revision` only |
| `comment_reactions` | One reaction per member per comment | Members, for themselves |
| `comment_mentions` | Members a comment mentions | `comments__sync_mentions` only |
| `activity_events` | Append-only log of every change to a case | Database triggers only |

Schemas: `supabase/schemas/21.comments.sql`, `22.*.sql`, and
`23.comments__audit_triggers.sql`. Tests:
`supabase/tests/database/case_activity/` and
`supabase/tests/database/permissions/rls_case_activity.test.sql`.

## Why only triggers write the log

An audit log a client can skip is not an audit log. Triggers fire for every
write path (the app, chat, a future API, the service role), so
`authenticated` has `SELECT` and nothing else on `activity_events`.

## Event kinds

| Kind | Status | Payload |
| --- | --- | --- |
| `comment_created` | Built | `{}` |
| `comment_edited` | Built | `{ "revision_id": uuid }` |
| `comment_deleted` | Built | `{ "revision_id": uuid }` |
| `case_created` | Planned (P5c.5) | `{}` |
| `case_status_changed` | Planned (P5c.5) | `{ "from": text, "to": text }` |
| `case_assigned` | Planned (P5c.3) | `{ "from_user_id": uuid, "to_user_id": uuid }` |
| `case_field_value_changed` | Planned (P5c.7) | `{ "attribute_id": uuid, "from": json, "to": json }` |
| `case_external_record` | Planned | `{ "provider": text, "external_id": text, "summary": text }` |

Adding a kind: add the enum value, write it from a trigger on the table that
changes, add a row component to `activityFeedItemRenderers`, and document
its payload here. Reactions never write events.

## History from connected services

External history arrives with `source = 'external'`, a null
`actor_user_id`, `occurred_at` set to the third party's timestamp, and an
`external_id` in the payload so re-imports are idempotent. The feed orders
by `occurred_at`, so pulled history lands where it happened, not where
Avandar learned of it.

## The feed

`src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/`.
`activityFeedItemRenderers` maps each kind to a row component, or to `null`
for kinds that change an existing row (an edit changes the comment card).
The feed query asks only for kinds with a row.

## Rich text

`src/components/RichText/` holds one extension list
(`createRichTextExtensions`) used by both the composer and the static
renderer (`RichTextView`), so they cannot disagree. Documents are stored as
ProseMirror JSON with `body_schema_version`, validated by
`shared/models/RichTextDocument`.

## Phase 2 extension points

- Add `objectRef` (inline) and `objectEmbed` (block) nodes to
  `createRichTextExtensions` with shared attributes, and map both in
  `RichTextView`'s `nodeMapping`.
- Extract references into a `comment_references` table with a trigger
  modeled on `comments__sync_mentions`.
- Comments are already addressable: `?comment=<id>` on the record URL.

## Future work

- Notifications for mentions and activity (P5c.8), reading `comment_mentions`.
- A workspace-wide activity feed.
- Live updates with Supabase Realtime.
- The time of the latest activity as a record header fact.
- A viewer for a comment's earlier versions, readable by workspace admins.
- Admin moderation of other members' comments.
- Mentioning user groups.
- Queueing posts made while offline.
- Comments on dashboards, datasets, and maps (each adds a subject column).
```

- [ ] **Step 2: Update `docs/ontology-architecture.md`**

1. In section 3 (Code layout), add a bullet after **Records screens**:
   `- **Case activity (comments, reactions, audit log)**: see [case-activity-architecture.md](case-activity-architecture.md)`
2. In section 9 (UI map), change the `$individualId.tsx` row's "Renders" cell to `Record page: activity feed and composer, fields in the rail` and its key files to `src/views/IndividualManagerApp/SingleIndividualView/` (`CaseDetailsRail.tsx`, `CaseActivityFeed/`).
3. In section 13, replace the italic paragraph under the flowchart (it starts `_Under the merge of 2026-10-09`) with:

```markdown
_Incremental sync (October 2026) upserts only `external_id`, `name`, and
`missing_from_source_at`, so it no longer rewrites `id`, `status`, or
`assigned_to`. All three placements now keep their data. Comments use an
`id`-keyed child table (`comments.individual_id`), covered by a Sync replay
in `supabase/tests/database/case_activity/comment_audit_triggers.test.sql`._
```

   and in the "Layers a per-case capability touches" list, change item 4 to: `**Record page**: controls in `SingleIndividualView`; new kinds of activity go through `activityFeedItemRenderers` (see case-activity-architecture.md).`
4. In section 16, delete the first table row (`Sync upserts every staged column...`), and change the "Not built" sentence to drop `comments,` from its list.

- [ ] **Step 3: Update `docs/production-plan-world-humanitarian-day.md`**

1. Replace the P5c.2 bullet with:
   `- P5c.2 **Comments / activity feed** on an ABox: built. Rich text, markdown, @mentions, reactions, edit and delete, on an append-only activity log. See [case-activity-architecture.md](case-activity-architecture.md).`
2. Replace the P5c.5 bullet with:
   `- P5c.5 \`[NEW]\` **Activity/audit log** for every change to a case: status changes, assignment, manual field values, and case creation, plus history pulled from a connected third-party service. Each is a new \`activity_events\` kind written by a trigger; the feed and table already exist (P5c.2).`
3. Append to the P5c.8 bullet: ` Mention notifications read \`comment_mentions\`.`
4. Change the sentence about `ActivityBlock` (line 260, "`ActivityBlock` (comments) calls `notifyNotImplemented`") to note that comments shipped in P5c.2.

- [ ] **Step 4: Point CLAUDE.md at the new doc**

In `CLAUDE.md`'s Documentation list, after the permissions line, add:
`- Case comments, reactions, and the case activity log: \`docs/measles-demo/case-activity-architecture.md\`.`

- [ ] **Step 5: Commit**

```bash
git add docs/measles-demo/case-activity-architecture.md docs/ontology-architecture.md docs/production-plan-world-humanitarian-day.md CLAUDE.md
git commit -m "docs(comments): document the case activity architecture and update the roadmap"
```

---

### Task 22: Final verification

**Files:** none unless a check fails

- [ ] **Step 1: Lint, types, unit tests**

Run: `pnpm lint && pnpm type-check && pnpm test:frontend`
Expected: all PASS. React Doctor runs inside `pnpm lint`; fix any finding in files this plan created.

- [ ] **Step 2: Database tests**

Run: `ava supabase status && pnpm test:db`
Expected: status green, tests PASS.

- [ ] **Step 3: Design detector**

Run: `.claude/skills/impeccable/scripts/impeccable detect --json src/components/RichText src/views/IndividualManagerApp`
Expected: no findings. Fix any in one batch, then run once more.

- [ ] **Step 4: Look at it**

Run the app (`pnpm dev`), sign in with the seeded credentials from `seed/SeedData.ts`, create a case type with one record through Case Manager, and open the record. Take a desktop screenshot and a 768px-wide screenshot into `.temp/feat-comments/`. Check against the approved mockups (layout B and the seven comment panels in `.superpowers/brainstorm/`): rail on the right, feed oldest first, composer docked, reactions and menu on hover, empty state, and the offline strip (toggle offline in devtools).

- [ ] **Step 5: Translations are current**

Run: `pnpm i18n:check`
Expected: PASS (no diff).

- [ ] **Step 6: Remind about the switch**

Do not run `ava supabase restore` unless a merge to `develop` was requested. Tell the user they own running it when they finish validating the branch.

---

## Refinements made while planning

- `comment_reactions` has its own `id` primary key plus a unique `(comment_id, user_id)` constraint, instead of a composite primary key, so it fits `createRdbCrudClient`. It keeps full `UPDATE` (not a column grant) because PostgREST upserts update every inserted column.
- `comment_revisions.created_at` defaults to `clock_timestamp()` so the activity trigger always finds the revision written in the same statement.
- `comments__validate_subject` lets `author_user_id` change to null, because the `on delete set null` cascade fires update triggers.
- The record header shows the case type only. The time of the latest activity is listed as future work, because it needs its own query.
- The `@` dropdown uses the house pattern from `PillEditPopover` (fixed anchor plus a code-driven `Combobox`) instead of the suggestion plugin's `props.mount`.
- `CommentParsers` does not validate the document, so one comment with an unknown node cannot break the whole feed. `RichTextView` falls back to plain text, and Edit refuses with a notification.
- A linked comment is highlighted when it is scrolled into view, and the highlight fades after about 2.4 seconds even while the `comment` search param is still present.
- The feed pages on a full `(occurred_at, recorded_at, id)` keyset through the security-invoker RPC `rpc_activity_events__get_case_page`, replacing Task 9's `lt("occurred_at")` cursor, which skipped events that shared a timestamp at a page boundary. `getCaseActivityPage` takes `before: ActivityFeedCursor`.
- The rich text parser requires `userMention` ids to be uuids, `text` on text nodes, and `http`, `https`, or `mailto` link hrefs.
