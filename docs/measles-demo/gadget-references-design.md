# Gadget references in case comments (2a) - design

- **Status:** Approved in brainstorming, awaiting written-spec review
- **Date:** 2026-11-06
- **Author:** pablo@avandarlabs.com
- **Branch:** `feat/comment-embeds`, from `demo/measles`
- **Builds on:** [case-comments-design.md](case-comments-design.md) and
  [case-activity-architecture.md](case-activity-architecture.md)
- **Scope:** 2a of two. 2a is the reference model, the `@` picker, inline
  link chips, and static embed cards for every gadget type. 2b (its own spec,
  after 2a is QA'd) fills the embed card's body with live content: a running
  dashboard tile, a dataset preview, a map.

## 1. Summary

A case comment can reference any **gadget**: a dashboard, a single dashboard
tile, a dataset, a map, a case type, or another case. Typing `@` in the
comment composer searches teammates and gadgets together. Enter inserts the
gadget as an inline **link chip**; Shift+Enter inserts it as an **embed
card** on its own line. While editing, either one can be switched to the
other from its hover menu, the way a Notion page can be a mention or an
embedded block.

"Gadget" is the umbrella term in code, schema, and docs. User-facing copy
never says it: each gadget is called by its own noun (dashboard, tile,
dataset, map, case type, case), and the verbs are "link" and "embed".

## 2. Goals and non-goals

### Goals

- Reference six gadget types from a comment, as a link chip or an embed card.
- One `@` menu for teammates and gadgets, grouped by type, searched on the
  server so it scales to thousands of cases.
- An embed card whose header (icon, name, type, Open) stays fixed and whose
  body holds key facts in 2a and live content in 2b, so 2b only changes the
  body.
- Never leak a gadget the reader cannot see: no name, no facts, no link.
- Warn the author, without blocking, when a gadget has a limited audience.
- A written registry of which tables are gadgets, which never will be, and
  which are not yet referenceable.

### Non-goals (2a)

- Live content in embed cards (2b).
- Pasting an Avandar URL to convert it into a link or embed.
- A `/` block menu.
- A backlinks screen ("comments that reference this dashboard").
- Notifications about references.
- Referencing comments, catalog listings, or saved queries (section 9).
- Gadget references on public dashboards or anywhere outside case comments.

## 3. Vocabulary

| Concept | Code and schema | User-facing |
| --- | --- | --- |
| Anything a comment can reference | Gadget | (never shown) |
| Which kind of gadget | `GadgetType`, `gadget_type` enum | The noun below |
| A pointer to one gadget | `GadgetRef` | (never shown) |
| Inline form | `gadgetLink` node, link chip | "link" |
| Block form | `gadgetEmbed` node, embed card | "embed" |

| `gadget_type` | Table | User-facing noun |
| --- | --- | --- |
| `dashboard` | `dashboards` | dashboard |
| `dashboard_tile` | a DataViz block inside `dashboards.config` | tile |
| `dataset` | `datasets` | dataset |
| `map` | `maps` | map |
| `concept` | `concepts` | case type |
| `individual` | `individuals` | case |

Internal names follow the codebase (`concept`, `individual`); UI strings use
the user's nouns, per `AGENTS.md` "Copy and nomenclature".

## 4. Data model

### 4.1 `gadget_type` enum

`00.enum.gadget_type.sql`: `dashboard`, `dashboard_tile`, `dataset`, `map`,
`concept`, `individual`.

### 4.2 `GadgetRef`

`shared/models/gadgets/Gadget/` holds the namespace `Gadget` with:

- `Gadget.Type`: the enum's values, plus `GADGET_TYPES` as a readonly tuple.
- `Gadget.Ref = { gadgetType: Gadget.Type; gadgetId: string; subId: string | undefined }`.
  `subId` is set only for `dashboard_tile`, where it is the Puck block's
  `props.id` and `gadgetId` is the dashboard id.
- A parser that validates a ref (uuid `gadgetId`, known type, `subId`
  present exactly when the type is `dashboard_tile`).

### 4.3 `comment_gadget_refs`

Every gadget a comment references, rebuilt from the stored document by a
trigger, for backlinks and notifications later.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `comment_id` | `uuid` not null | fk `comments`, cascade |
| `workspace_id` | `uuid` not null | |
| `gadget_type` | `gadget_type` not null | |
| `gadget_id` | `uuid` not null | No fk: it points at one of six tables |
| `sub_id` | `text` | Tile block id, else null |
| `display` | `text` not null | `link` or `embed`, checked |
| `created_at` | `timestamptz` | |

Unique on `(comment_id, gadget_type, gadget_id, coalesce(sub_id, ''), display)`.
Members select (workspace predicate); only the trigger writes; service role
has full DML. Index on `(gadget_type, gadget_id)` for future backlinks.

**Trigger `comments__sync_gadget_refs`** (`23.comments__audit_triggers.sql`,
after insert or update, no column list): when `body` changed, delete the
comment's rows; if `body` is not null, insert one row per distinct
`gadgetLink` or `gadgetEmbed` node, read with
`jsonb_path_query(body, 'lax $.** ? (@.type == "gadgetLink" || @.type == "gadgetEmbed")')`,
keeping only nodes whose `gadgetType` is a valid enum value and whose
`gadgetId` is a valid uuid. Security definer, pinned `search_path`, execute
revoked, exactly like `comments__sync_mentions`. It does not check that the
gadget exists or that the author can see it: a reference is a pointer, and
reading it goes through the reader's own access (section 6).

## 5. Editor

### 5.1 Nodes

Two TipTap nodes in `src/components/RichText/Gadget/`, both atoms, with the
same attributes `{ gadgetType, gadgetId, subId }`:

| Node | Group | Drawn as |
| --- | --- | --- |
| `gadgetLink` | inline | `GadgetChip` |
| `gadgetEmbed` | block | `GadgetCard` |

Both are added to `createRichTextExtensions`, so the editor and the static
renderer stay in step, and both are mapped in `RichTextView`'s
`nodeMapping`. "Show as embed" replaces a `gadgetLink` with a `gadgetEmbed`
holding the same attributes, inserted after the paragraph that held the
link (a block cannot live inside a paragraph); "Show as link" replaces the
embed with a paragraph holding a `gadgetLink`.

### 5.2 What the document stores

Only the attributes above. **Never a name.** `richTextToPlainText` writes a
gadget as its type noun in brackets, for example `[dashboard]`, so the
stored `body_text` (readable by every member) never contains the name of a
gadget some members cannot open. The `@` menu still shows names, because the
search itself runs with the author's access.

`shared/models/RichTextDocument` adds both node types to
`RICH_TEXT_NODE_TYPES` and the node schema, with strict attribute checks
(`gadgetType` in `GADGET_TYPES`, uuid `gadgetId`, `subId` string or null).
The change only adds node types, so `RICH_TEXT_SCHEMA_VERSION` stays `1`; an
older client renders such a comment through the existing plain-text
fallback.

### 5.3 The `@` menu

The existing mention suggestion becomes a combined menu:

- Teammates are filtered in the browser, as today.
- Gadgets come from `rpc_gadgets__search` (section 7), called after a
  150 ms pause in typing, with the query after `@`.
- Results are grouped: People, then Dashboards (dashboards and tiles),
  Datasets, Maps, Case types, and Cases; at most 5 per group; groups with
  no results are hidden. Keyboard navigation runs across groups. People
  come first because they filter synchronously in the browser, so gadget
  results that arrive later append below them and never move the highlight.
- **Enter** inserts a `gadgetLink` (or a `userMention` for a person).
  **Shift+Enter** on a gadget inserts a `gadgetEmbed`. A footer shows both.
- When the highlighted row's `has_limited_audience` is true, a hint under the
  list reads "Only some people can open this {noun}. Teammates on this case
  without access will see Unavailable." It never blocks inserting.
- While the search is in flight, the gadget groups show a single loading
  row; if it fails, they show "Couldn't search. Keep typing to retry." and
  people still work.

### 5.4 Menus on chips and cards

In the editor (composing or editing a comment), hovering or focusing a chip
or card shows: **Open {noun}**, **Show as embed** or **Show as link**, and
**Copy link**. In the feed, a chip is a plain link to the gadget and a card
has an Open button; there is no switch outside the editor.

## 6. Resolving and rendering

### 6.1 `GadgetRegistry`

`src/components/RichText/Gadget/gadgetRegistry.ts`: one entry per
`Gadget.Type`, enforced complete by its type
(`Readonly<Record<Gadget.Type, GadgetDefinition>>`):

```ts
type GadgetDefinition = {
  Icon: Icon;
  noun: MessageDescriptor;
  useGadgetSummary: (ref: Gadget.Ref) => GadgetSummary;
};

type GadgetSummary =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "available";
      name: string;
      facts: ReadonlyArray<{ label: MessageDescriptor; value: string }>;
      href: string;
    };
```

2b extends `GadgetDefinition` with an optional live body renderer; the card
shows it in place of the facts when present.

### 6.2 Per type

All summaries use the existing clients through TanStack Query, so a gadget
referenced by several comments is fetched once. None downloads dataset
parquet or runs a query.

| Type | Name | Facts | Open goes to |
| --- | --- | --- | --- |
| Dashboard | `name` | Tiles (DataViz blocks in config), Audience (draft, workspace, public), Updated | `/$ws/d/$id`, through `DashboardRouteResolver` |
| Tile | the block's `nlQuery.prompt`, else "Untitled chart" | Dashboard (name), Chart (viz type), Updated (dashboard) | the same dashboard route with `?tile=<block id>` |
| Dataset | `name` | Source (source type), Columns (count), Updated | `AppLinks.dataManagerDatasetView` |
| Map | `name` | Layers (count from config), Updated | `AppLinks.mapEditor` |
| Case type | `name` | Records (count), Fields (count) | `AppLinks.individualManagerHome` |
| Case | `name` | Status, Case type (name), Updated | `AppLinks.individualManagerIndividualView` |

A tile is found with `findDashboardTile(config, blockId)`, which walks the
Puck tree including nested slots (`Grid`, `Columns`), following
`getDatasetIdsFromDashboardConfig`'s traversal. A dashboard that exists but
no longer holds the block makes the tile **unavailable**.

**`?tile=` support.** The dashboard viewer reads an optional `tile` search
param and, once the page has rendered, scrolls the block with that id into
view and highlights it briefly (the same fade used for linked comments). If
the block's rendered element has no stable id, the DataViz block renders
one (`data-tile-id`). An unknown id is ignored.

### 6.3 States

| State | Chip | Card |
| --- | --- | --- |
| Loading | Icon plus a short skeleton | Header skeleton, three fact skeletons |
| Available | Icon plus name, links to `href` | Header (icon, name, noun, Open) over the facts |
| Unavailable | Lock icon plus "Unavailable {noun}", dashed, no link | Lock header "Unavailable {noun}", body "It may have been deleted, or you don't have access. Ask the comment's author to share it." |

"No row" from any lookup is unavailable: RLS makes a restricted gadget and a
deleted one indistinguishable, and the UI does not try to tell them apart.

## 7. Search: `rpc_gadgets__search`

`50.rpc_gadgets__search.sql`:

```sql
rpc_gadgets__search (
  p_workspace_id uuid,
  p_query text,
  p_limit integer default 20
) returns table (
  gadget_type public.gadget_type,
  gadget_id uuid,
  sub_id text,
  label text,
  sub_label text,
  has_limited_audience boolean,
  updated_at timestamptz,
  rank real
)
```

- `language sql`, `stable`, **security invoker** (RLS filters every branch),
  `set search_path = ''`, execute granted to `authenticated` only.
- A `union all` of six branches, each filtered to `p_workspace_id`:
  - dashboards (`label` = name, `sub_label` = null);
  - tiles: each DataViz block in every visible dashboard's `config`, found
    with `jsonb_path_query(config, 'lax $.** ? (@.type == "DataViz")')`,
    `sub_id` = `props.id`, `label` = `props.nlQuery.prompt` (blank prompts
    are skipped), `sub_label` = the dashboard name;
  - datasets, maps, concepts (`label` = name);
  - individuals (`label` = name, `sub_label` = the concept's name).
- `has_limited_audience`: `is_restricted` for dashboards, datasets, and maps;
  a tile takes its dashboard's value; false for concepts and individuals,
  which every member can read.
- Ranking: with a non-blank query, keep rows where `label ilike '%' || q || '%'`
  or `similarity(label, q) > 0.2` (pg_trgm, already installed), ranked by
  prefix match first, then similarity, then `updated_at`. With a blank query,
  rank by `updated_at` desc. Returns at most `p_limit` rows overall, and the
  client trims to 5 per group.

## 8. Error handling and edge cases

| Case | Behavior |
| --- | --- |
| Gadget deleted after linking | Unavailable state; the ref row stays until the comment is edited. |
| Reader lacks access | Unavailable state, identical to deleted. |
| Tile removed from its dashboard | Unavailable, while the dashboard itself still resolves. |
| Gadget renamed | Chip and card show the current name (names are never stored). |
| Same gadget linked twice in one comment | Two nodes, one ref row per display. |
| Search fails | Gadget groups show the retry message; people still work. |
| Many embeds in one feed | Summaries share the query cache; cards render facts only, no queries. |
| Old client reads a new comment | Plain-text fallback, gadgets as `[noun]`. |

## 9. The gadget registry document

New `docs/measles-demo/gadgets.md`, linked from
`case-activity-architecture.md` and the roadmap:

- **Gadgets:** the six types with their table, id, open route, and facts.
- **Never gadgets, and why:** `subscriptions`, `usage_analytics_events` and
  the `analytics` schema, `tokens__google`, `dexie_dbs`, `user_nux_progress`,
  `pipeline_executions` and its scopes and checkpoints, `db_connections*`
  (credentials), `workspace_invites`, `workspace_memberships`, `role_groups`,
  `role_group_app_roles`, `user_groups` and memberships, `resource_shares`,
  `user_workspace_policies`, comment internals (`comment_reactions`,
  `comment_revisions`, `comment_mentions`, `comment_gadget_refs`,
  `activity_events`), and child tables that are part of another gadget
  (`dataset_columns`, `datasets__*`, `concept_attributes`,
  `attribute_mappings__*`, `data_catalog_listings__relation_columns`).
- **Not gadgets yet:**
  - Saved queries: there is no saved-query object; Data Explorer state lives
    in URL params. Needs a `queries` table first.
  - Comments: already addressable by `?comment=<id>`; could become a gadget.
  - Data catalog listings: workspace-independent open-data entries; a
    candidate once catalog search is on `develop`.
- **How to add a gadget type:** enum value, search branch, registry entry,
  plain-text noun, docs row, tests.

## 10. Testing

**pgTAP** (`supabase/tests/database/gadgets/`):

- Search: a member finds each of the six types; a tile inside a `Grid` slot
  is found with its `sub_id`; a restricted dashboard is invisible to a member
  without a share and visible to its owner; an outsider gets nothing;
  `has_limited_audience` is true for a restricted dataset and its tiles
  inherit the dashboard's value; a blank query returns rows ordered by
  `updated_at`; `p_limit` is honored.
- `comment_gadget_refs`: inserting a comment with a link and an embed writes
  two rows; editing replaces them; soft delete removes them; invalid
  `gadgetType` or non-uuid ids are skipped; `authenticated` cannot write the
  table; grants test updated.

**Vitest:**

- `Gadget` parser and `GADGET_TYPES`.
- `RichTextDocument`: both nodes validate; bad attributes are rejected;
  `richTextToPlainText` writes `[dashboard]` and never the name.
- `findDashboardTile`: top level, nested slot, missing block.
- Registry completeness and each `useGadgetSummary` (available,
  unavailable, tile missing from its dashboard).
- The `@` menu: grouping and order, 5 per group, Enter inserts a link,
  Shift+Enter an embed, the limited-audience hint, the search-failure row.
- `GadgetChip` and `GadgetCard`: loading, available, unavailable; the
  link/embed switch in the editor.
- Dashboard viewer: `?tile=` scrolls to and highlights the block.

**E2E** (`tests/e2e/case-gadgets.spec.ts`, UI-driven): seed a dashboard with
one DataViz tile (setup only), link the dashboard with `@`, switch it to an
embed, add the tile as an embed with Shift+Enter, post, check the card facts
in the feed, and open the tile to land on the dashboard with it
highlighted.

## 11. Documentation and roadmap

- New `docs/measles-demo/gadgets.md` (section 9).
- `case-activity-architecture.md`: replace the "Extension points for object
  references and embeds" section with a description of what was built and a
  pointer to `gadgets.md`.
- `docs/production-plan-world-humanitarian-day.md`: note gadget references
  under P5c, and list the follow-ups in section 12.
- `docs/measles-demo/pr-feature-log.md`: log this as its own feature.

## 12. Follow-ups

- 2b: live tile, dataset preview, and map bodies in the embed card.
- Paste an Avandar URL to convert it into a link or embed.
- A `/` block menu.
- Backlinks: "Comments that reference this" on each gadget, reading
  `comment_gadget_refs`.
- Notifications when a gadget you own is referenced.
- Comments, saved queries, and catalog listings as gadgets.
- Gadgets in places other than case comments (dashboard text blocks, notes).

## 13. Decisions

| Decision | Chosen | Rejected and why |
| --- | --- | --- |
| Scope | 2a framework plus static cards; 2b live bodies | One spec for everything (maps and dataset previews dominate the risk). |
| Umbrella term | Gadget | Resource (collides with the permissions meaning), Object, Entity (banned in UI), Item. |
| Insertion | One `@` menu for people and gadgets | `/` menu (a second menu to learn), paste-to-convert (deferred). |
| Card style | Framed card: fixed header, swappable body | Compact row (would reflow when 2b adds live content). |
| No access | Neutral "Unavailable" placeholder plus a non-blocking author hint | Showing the name with a lock (leaks restricted names). |
| Search | One security-invoker RPC across all types | Browser filtering (does not scale for cases, tiles live in config JSON). |
| Names in the document | Never stored; plain text uses the type noun | Storing names (leaks through `body_text`, goes stale on rename). |
