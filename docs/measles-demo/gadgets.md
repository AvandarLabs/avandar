# Gadgets

A **gadget** is anything a case comment can reference: a dashboard, a single
dashboard tile, a dataset, a map, a case type, or another case. "Gadget" is
the umbrella term in code, schema, and docs only. The UI never says it: each
gadget is called by its own noun, and the verbs are "link" and "embed".

This page is the registry of which tables are gadgets, which never will be,
and which are not gadgets yet. The design is in
[gadget-references-design.md](gadget-references-design.md).

## How it works

Typing `@` in the comment composer opens one menu for teammates and gadgets.
Teammates are filtered in the browser and listed first, then the gadget
groups (Dashboards, Datasets, Maps, Case types, Cases). Gadget results arrive
after a search, so they append below the teammates and never move the
highlight. Gadgets come from
`rpc_gadgets__search`, which runs as the caller (security invoker), so RLS
filters every branch and a gadget the author cannot read never appears. It
returns at most five rows per gadget type, returns nothing to a caller who is
not a member of the workspace (even a public dashboard), and sets
`has_limited_audience` for a draft or restricted dashboard, a restricted
dataset or map, and any tile on such a dashboard. The menu then warns the
author, without blocking, that some teammates will see "Unavailable".

**Enter** inserts a `gadgetLink` node, drawn inline as a chip. **Shift+Enter**
inserts a `gadgetEmbed` node, drawn as a card on its own line. In the editor,
a chip or card opens a menu with Open, "Show as embed" or "Show as link", and
"Copy link". In the feed, a chip is a plain link and a card has an Open link.

Both nodes are strict: their only attributes are `{ gadgetType, gadgetId,
subId }` (`Gadget.Ref`), and `RichTextDocument` rejects anything else. A
gadget's name is **never stored**, so a renamed gadget always shows its
current name and the stored document never reveals a name to a member who
cannot open the gadget. For the same reason `richTextToPlainText` writes each
gadget into `body_text` as its type noun in brackets, such as `[dashboard]`.
The `userMention` node is strict in the same way and stores only the member's
id.

A reader resolves each ref through `GADGET_REGISTRY`
(`src/components/RichText/Gadget/gadgetRegistry/`), one entry per
`Gadget.Type`, enforced complete by its type. Each entry has:

| Field | Purpose |
| --- | --- |
| `Icon` | The type's icon on chips, cards, and menu rows. |
| `label` | The capitalized type name, such as "Dashboard". |
| `loadingLabel` | Accessible name while the summary loads. |
| `unavailableLabel` | Shown when the gadget is deleted or the reader lacks access, such as "Unavailable dashboard". |
| `openLabel` | The editor menu's open action, such as "Open dashboard". |
| `limitedAudienceHint` | The `@` menu's warning for a gadget with a limited audience. |
| `useGadgetSummary(ref, { withFacts })` | Resolves the ref with the reader's own access. A chip passes `withFacts: false` to skip secondary lookups. |

Each state is a whole translated message rather than a noun spliced into a
sentence, so translators can inflect it. A lookup that returns no row is
unavailable: RLS makes a restricted gadget and a deleted one look the same,
and the UI does not tell them apart. A row from another workspace is
unavailable too. A stored ref can name any uuid, so every summary hook
compares the row's `workspaceId` with the current workspace before it draws
anything under that workspace's links.

A trigger, `comments__sync_gadget_refs`, mirrors every gadget node in a
comment's stored document into `comment_gadget_refs` (one row per distinct
type, id, tile id, and display), so backlinks and notifications can find
references without scanning bodies. It skips nodes with an unknown type or a
non-uuid id. It keeps `subId` only for `dashboard_tile`: a tile needs a
non-empty one, and a node of any other type that carries one is skipped. It
clears the rows when the comment is deleted. It does not
check that the gadget exists or is in the comment's workspace, so **any
reader of `comment_gadget_refs` must also filter by the gadget's own
workspace**. Members can select the table; only the trigger writes it.

The chat composer has its own `@` menu, shown with the agent switch on
(`variant: "chat"` on the same `MentionMenu`, the same gadget search, and the
same chip). It lists only the chat's gadget types (dashboards, tiles,
datasets, maps, and case types), never cases or teammates, and inserts links
only: there is no embed and no audience hint, since only the user sees their
chat. Each chip is written into the message text as a ref token such as
`@{dataset:<uuid>}` (`ChatMentionToken`), never as a name, and sent messages
draw the tokens back as chips. The context tray above the composer, filled by
the "Add context" picker, holds up to five refs per chat in localStorage, and
stores no names either. Names are resolved with the user's own access each
time, so an unavailable gadget shows its unavailable label. See
[the Phase 1B spec](../ai-agent/specs/phase-1b.md) for what reaches the
agent.

## Gadgets

| Gadget type | Table | User-facing noun | Id | Open goes to | Card facts |
| --- | --- | --- | --- | --- | --- |
| `dashboard` | `dashboards` | dashboard | `dashboards.id` | `/$ws/dashboards/preview/<id>` | Tiles, Audience (draft, workspace, public), Updated |
| `dashboard_tile` | a DataViz block inside `dashboards.config` | tile ("Dashboard tile") | dashboard id, plus the block's `props.id` as `subId` | `/$ws/dashboards/preview/<id>?tile=<block id>` | Dashboard, Chart, Updated (the dashboard's) |
| `dataset` | `datasets` | dataset | `datasets.id` | `/$ws/data-manager/<id>` | Source, Columns, Updated |
| `map` | `maps` | map | `maps.id` | `/$ws/map/<id>` | Layers, Updated |
| `concept` | `concepts` | case type | `concepts.id` | `/$ws/individual-manager/<id>` | Records, Fields |
| `individual` | `individuals` | case | `individuals.id` | `/$ws/individual-manager/<concept id>/<id>` | Case type, Updated |

Notes:

- Dashboards and tiles open the **preview** route, not `/$ws/d/<id>`: the
  published route denies draft dashboards to everyone, while preview renders
  for editors at any visibility and for viewers of published dashboards.
- With `?tile=<block id>`, the preview scrolls to the tile and highlights it
  briefly. The DataViz block renders `data-tile-id` for this. An unknown id
  is ignored.
- A tile's name is its query prompt, or "Untitled chart". Search skips tiles
  with a blank prompt. A dashboard that no longer holds the block makes the
  tile unavailable while the dashboard still resolves.
- The case card has no Status fact because case status sets do not exist
  yet.
- No summary downloads dataset data or runs a query. Summaries share the
  TanStack Query cache, so a gadget referenced many times is fetched once.

## Never gadgets

| Table or schema | Why |
| --- | --- |
| `subscriptions` | Billing state, not something a teammate opens. |
| `usage_analytics_events`, the `analytics` schema | Internal telemetry. |
| `tokens__google` | OAuth secrets. |
| `db_connections`, `db_connections__*` | Database credentials. |
| `dexie_dbs`, `user_nux_progress` | Per-browser and per-user bookkeeping. |
| `pipeline_executions`, `pipeline_execution_scopes`, `pipeline_scope_checkpoints` | Internal ETL run state. |
| `workspaces`, `workspace_invites`, `workspace_memberships` | The workspace is the container, not content. Invites and memberships are administration. |
| `user_profiles` | People are referenced as `userMention`, not as gadgets. |
| `role_groups`, `role_group_app_roles`, `user_groups`, `user_group_memberships`, `resource_shares`, `user_workspace_policies` | Permissions machinery. |
| `comment_reactions`, `comment_revisions`, `comment_mentions`, `comment_gadget_refs`, `activity_events` | Comment internals. |
| `dataset_columns`, `datasets__*`, `concept_attributes`, `attribute_mappings__*`, `data_catalog_listings__relation_columns` | Parts of another gadget. Reference the parent instead. |

## Not gadgets yet

- **Saved queries:** there is no saved-query object; Data Explorer state
  lives in URL params. Needs a `queries` table first.
- **Comments:** already addressable by `?comment=<id>` on the case page, so
  could become a gadget.
- **Data catalog listings:** workspace-independent open-data entries. A
  candidate once catalog search is on `develop`.

## How to add a gadget type

1. Add the value to `public.gadget_type` (`00.enum.gadget_type.sql`) and to
   `GADGET_TYPES` in `shared/models/gadgets/Gadget/Gadget.ts`, then
   regenerate the migration and the database types. `GADGET_TYPES` must
   satisfy the generated `gadget_type` enum, so a value missing from the
   database fails to compile.
2. Add a branch to `rpc_gadgets__search` (`50.rpc_gadgets__search.sql`),
   filtered to the workspace, with its `has_limited_audience` rule. The
   client's search limit in `createMentionMenuSuggestion.ts` is
   `GADGET_TYPES.length` times the per-type cap, which mirrors
   `type_position <= 5` in that function, so keep the two in sync.
3. Add a summary hook to `useGadgetSummaries.ts` and a `GADGET_REGISTRY`
   entry. The registry's type fails to compile until the entry exists.
4. Add the type's plain-text noun to `GADGET_PLAIN_TEXT_NOUNS` in
   `RichTextDocument.ts`, and its `@` menu group to
   `buildMentionMenuGroups.ts`.
5. Add a row to the table above, and remove the type from "Not gadgets yet".
6. Cover it: a pgTAP case in `supabase/tests/database/gadgets/`, and Vitest
   cases for the summary hook and the registry.

## Follow-ups

- Live bodies in the embed card (2b): a running tile, a dataset preview, a
  map. The card's header stays; the body replaces the facts.
- Paste an Avandar URL to convert it into a link or embed.
- A `/` block menu.
- Backlinks: "Comments that reference this" on each gadget, reading
  `comment_gadget_refs`.
- Notifications when a gadget you own is referenced.
- Search performance: split the blank-query and non-blank paths, and add
  trigram indexes on the searched names.
- A Status fact on the case card once case status sets exist.
- Multi-word `@` queries. The menu closes on a space (TipTap's default
  `allowSpaces: false`), so "measles by borough" is found by typing one word.
  Allowing spaces needs a rule for when the menu closes instead. This also
  applies to mentioning a teammate by full name.
- Comments, saved queries, and catalog listings as gadgets, and gadgets in
  dashboard text blocks and notes. The chat already references gadgets
  (above).
