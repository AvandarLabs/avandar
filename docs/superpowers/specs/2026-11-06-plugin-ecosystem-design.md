# Plugin Ecosystem Design

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-06
**Status:** Architecture approved. Each milestone in
"Build order" gets its own spec, plan, and implementation cycle.

## Context

Avandar's goal is to be a fully configurable platform for any social-sector
problem, and eventually a self-configuring one: a user describes their work,
the AI reads their workspace description and datasets, and proposes (for
approval) the configuration that fits.

Plugins are the last step toward that goal. They let Avandar grow new
capabilities without bloating the core product, because a workspace only loads
what it installed, and only when it is used.

Today every extension point is a closed, hardcoded set:

| Extension point | Today | Where |
| --- | --- | --- |
| Sidebar apps and views | Hardcoded navbar links, plus the `app_type` Postgres enum that scopes per-app roles | `src/components/AppShell/Navbar/Navbar.tsx`, `supabase/schemas/00.enum.app_type.sql` |
| Viz types | A fixed set of `Ava*VizConfig` models | `shared/models/vizs/` |
| Dataset sources | The `datasets__source_type` enum, plus one table and RPC per type | `docs/adding-new-data-source-types.md` |
| AI tools | A literal `generateSql \| clarify` union built server-side | `supabase/functions/chat/buildDataExplorerToolDefinitions/` |
| Routes | TanStack file routes generated at build time | `src/routes/_auth/$workspaceSlug/` |
| Share principals | `user`, `user_group`, `workspace` | `supabase/schemas/00.enum.share_principal_type.sql` |
| Billing | Seat-based Polar subscriptions only | `supabase/functions/subscriptions/` |

A plugin system turns these into open registries.

## Goals

- One-click installs, scoped to a single workspace.
- Zero cost until used: plugins are lazy-loaded on first use.
- Broad reach. A plugin can add features to existing views, add whole new
  views, bundle datasets, add behavior across the whole platform, or change
  how the platform looks.
- Community-built, open-source plugins, distributed through a curated,
  private registry that Avandar owns.
- Private plugins built under contract for specific clients.
- An AI that builds workspace-only plugins on demand when the marketplace
  cannot meet a need, and that eventually configures whole workspaces.
- Safety for sensitive health and humanitarian data, including against
  malicious plugins and prompt-injected AI.

## Non-goals

- Paid third-party plugins and revenue sharing with plugin authors.
- Server-side code from community or AI-generated plugins.
- An in-app code editor for plugins.
- Installing a plugin across every workspace in an organization at once.
  Installs are always per workspace.

## Reference plugins

These plugins are the acceptance tests for the architecture. Each milestone
names which ones must work by its end.

| Plugin | Tier | What it exercises |
| --- | --- | --- |
| **Epidemiology** | Trusted (first-party, open source) | Data Explorer toolbar commands (linear regression), a new viz type (epicurve), AI tools, data slots |
| **Spatial statistics** | Trusted (first-party, open source) | GIS toolbar commands, map layers, AI tools |
| **Disease communication toolkit** | Community or trusted | A full sidebar view (see the outreach kit mockup: priority districts, audiences, generated SMS, flyers, provider letters and CHW scripts, review and export), AI generation, plugin storage, a dependency on the epidemiology plugin's scenarios, small-count suppression |
| **Mozambique pack** | Content | Bundled and registry-hosted datasets (shapefiles), dataset creation, no code |
| **Twilio SMS** | Community | Value types (every phone number becomes clickable), the outbound proxy, managed services and bring your own key (BYOK), webhooks |
| **DHIS2 connector** | Community | Scheduled jobs, secrets, writing to datasets with no client open |
| **Theme** | Content | Design token overrides and layout presets |

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Trust model | Tiered hybrid: content, community (sandboxed), workspace (sandboxed), trusted (in-process). Built in that order of risk: first-party trusted plugins first, sandbox second |
| 2 | AI-built plugins | The AI builds plugins on demand. They live only in the workspace, always run sandboxed, and can be published later |
| 3 | Data binding | Typed data slots, filled by ontology concepts or dataset columns. Slots drive a generic install wizard the AI can prefill |
| 4 | Registry | Avandar's registry instance is private. The registry protocol is open. Self-hosted instances install from a URL, a file, or deployment config, or connect to Avandar's registry with a paid license key |
| 5 | Plugin licensing | Avandar's own plugins are open source. Contract plugins follow the contract's terms and are distributed privately. They cannot be bundled into this public monorepo, so they ship as `.ava` files from Milestone 2 onward |
| 6 | Package format | `.ava` files. Manifests are authored as `ava.yaml` and compiled to a canonical `manifest.json` inside the package |
| 7 | Server-side | Avandar-provided server building blocks (proxy, webhook inbox, scheduled jobs, storage, AI) for every tier. Trusted plugins may also ship reviewed server functions |
| 8 | Third-party services | Avandar-managed accounts, billed by usage. BYOK is always available so a workspace can avoid Avandar billing for a service |
| 9 | Permissions | Contributions to existing apps follow that app's role. Full-view plugins get their own app row. The `app_type` enum becomes an `apps` table |
| 10 | Plugin UI | Remote React, built on Shopify's Remote DOM: plugins write React against `@avandar/plugin-ui`, and Avandar renders real components |

## Tiers

| Tier | Author | Source | Runtime | Who can install |
| --- | --- | --- | --- | --- |
| **Content** | Anyone, including the AI | Manifest plus data files, no code | None. Avandar interprets the manifest | Marketplace or one workspace |
| **Community** | Anyone | Public GitHub repo, built by Avandar's CI | Sandbox | Marketplace |
| **Workspace** | The AI or a user, on demand | Stored in the workspace | Sandbox | That workspace only |
| **Trusted** | The Avandar team, including contract work | Avandar's repos (private for contracts) | In-process | Marketplace, or an allowlist of workspaces or organizations |

A plugin runs **trusted** only when the registry signed it **and** the
registry's metadata marks it trusted. Every other plugin runs sandboxed. The
one exception is a self-hosting operator, who may mark plugins bundled
through their own deployment config as trusted, since they control that build
anyway.

## Architecture overview

Every plugin interacts with Avandar through three layers.

| Layer | What it is | Why |
| --- | --- | --- |
| **Manifest** (static) | Declares where a plugin plugs in, what it needs, and when its code must run | Avandar reads manifests at startup, never plugin code. This is what makes lazy loading free |
| **Avandar services** (`avandar.*`, async and permission-scoped) | The only path to data, AI, storage, and the network | One choke point for permission checks and audit logging |
| **UI surfaces** (Remote React) | How plugin UI appears in the app | Plugins look native without running in the app's JavaScript context |

```text
Avandar app (main thread, app origin)
├─ Manifest registry ──── loads every installed manifest at startup, never plugin code
├─ Slot renderers ─────── draw toolbar buttons, menus and value actions from manifests
├─ Remote DOM receivers ─ render plugin UI with real @avandar/ui components
└─ Plugin broker ──────── checks permissions and routes every avandar.* call
        │ one MessagePort per installed plugin
        ▼
Hidden sandboxed iframe (opaque origin, CSP blocks all network)
└─ Web Worker: plugin bundle plus @avandar/plugin-sdk
```

### Contribution points

| Contribution point | Example IDs | Reference plugin |
| --- | --- | --- |
| `views` | A new sidebar app filling the slate | Disease communication toolkit |
| `commands` and `menus` | `dataExplorer.toolbar`, `gis.toolbar`, `dataset.contextMenu`, `row.contextMenu` | Epidemiology, spatial statistics |
| `panels` | Drawers in Data Explorer or GIS, settings sections | Epidemiology (regression results) |
| `vizTypes` | `epicurve` | Epidemiology |
| `mapLayers`, `gisTools` | Hotspot layers | Spatial statistics |
| `aiTools` | `fitRegression` | Epidemiology, spatial statistics |
| `valueTypes` | A phone number recognizer with a "Send SMS" action | Twilio SMS |
| `content` | Datasets, dashboards, templates | Mozambique pack |
| `themes`, `layouts` | Design token overrides, sidebar order, home widgets | Theme |
| `dataSourceTypes`, `jobs`, `webhooks` | Scheduled DHIS2 pulls, Twilio delivery receipts | DHIS2 connector, Twilio SMS |
| `dataSlots`, `settings`, `services` | Install wizard inputs | All |

**High-cardinality spots stay declarative.** A spot that can appear thousands
of times on screen, such as a value action in every table cell, is rendered by
Avandar from the manifest. Plugin code runs only when the user acts on it.

### Example manifest

```yaml
# ava.yaml
id: avandar.epidemiology
version: "1.2.0"
engines:
  avandar: "^1"
permissions:
  - data:slots
  - ai:invoke
dataSlots:
  cases:
    concept: Case
    attributes:
      onsetDate: date
      district: geo.admin2
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear%"   # resolved from locales/<lang>.json
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }   # structured condition, no expression language
  vizTypes:
    - id: epicurve
      title: "%viz.epicurve%"
  aiTools:
    - name: fitRegression
      description: Fit a linear regression on the current query result.
      parameters: {}   # JSON Schema
```

## 1. Plugin model, registry, and `.ava` format

### Two codebases

The open-source app contains the `.ava` loader, a registry protocol client,
and the install tables. The registry is a **separate private service** that
speaks the open protocol.

- Avandar Cloud points at Avandar's registry with a service credential.
- A self-hosted instance points at it with a license key, or at a registry of
  its own.

### Registry protocol

The protocol is plain HTTP and JSON. It covers searching and listing plugins,
fetching a plugin's metadata and versions, and downloading a signed `.ava`.
Each request is checked against the caller's entitlement: a Cloud credential,
a license key, or a private allowlist. Plugin visibility is `public`,
`unlisted`, or `private`.

### Identity and versions

Plugin IDs take the form `publisher.name`, for example `avandar.epidemiology`
or `nycdoh.measles-kit`. Publishers are verified accounts. Versions follow
semver and are immutable once published.

### Submission

Authors submit with `ava plugin submit <repo>@<tag>` or through a developer
portal. Avandar's CI builds the plugin from the pinned commit, so the code
the community reviews is the code that ships. Updates are new submissions
that pin a newer commit. The index lives in the registry's private database.

### Manifest authoring

Authors write `ava.yaml`. `ava plugin build` parses it as strict YAML 1.2
(the `yaml` package already used in `apps/ava-video-producer`), validates it
against a Zod schema, and emits a canonical `manifest.json`.

- The schema catches YAML's type coercion surprises. For example, an unquoted
  `version: 1.10` becomes a number and fails validation.
- A published JSON Schema gives editor autocomplete through the YAML language
  server.
- Hand-written JSON manifests also work, since JSON is valid YAML 1.2.

### `.ava` contents

A `.ava` file is a zip:

```text
manifest.json     compiled from ava.yaml
bundle/           worker entry (sandboxed), plus an optional in-process entry (trusted only)
locales/<lang>.json
assets/           icons, images, templates
content/          small bundled datasets (parquet), dashboards, templates
SIGNATURE         Ed25519 signature over every file's hash, made with the registry's key
```

Large data, such as country shapefiles, is not embedded. The manifest
references **registry-hosted data**, which is downloaded subject to the
caller's entitlement. The desktop app registers the `.ava` extension so
double-clicking a file starts an install.

### Tables in the open-source app

| Table | Holds |
| --- | --- |
| `plugin_installations` | Workspace, plugin ID, version, source (`registry`, `url`, `file`, `config`, `workspace`), tier, enabled flag, granted permissions, settings |
| `plugin_data_slot_bindings` | The ontology concept or dataset column bound to each slot |
| `plugin_secrets` | References to BYOK keys in Supabase Vault. Secret values never reach the browser |
| `workspace_plugins` | Source, versions, provenance, and approval state of plugins the AI or a user built in the workspace |
| `plugin_storage` | Documents a plugin saves, scoped to its install (and optionally to a user), protected by RLS |
| `plugin_webhook_events` | Webhook payloads received for an install |
| `apps` | Replaces the `app_type` enum. Built-in rows plus one row per installed full-view plugin |

### Updates

- Minor and patch versions update automatically.
- An update that adds permissions or data slots stays on the old version until
  an admin re-approves it, through a diff of what changed.
- Admins can pin a version and roll back.

## 2. Runtime and sandbox

### Isolation

Plugin code runs in a Web Worker inside a hidden, sandboxed iframe with an
opaque origin (`sandbox="allow-scripts"`, no `allow-same-origin`).

- The opaque origin cuts off the app's OPFS, where DuckDB stores datasets, and
  its IndexedDB.
- The iframe's CSP (`connect-src 'none'`) blocks direct network access. All
  network traffic goes through `avandar.http`, where it is audited.
- The Worker has no DOM and no WebRTC, and runs off the main thread, so a
  stuck plugin cannot freeze the app.

A same-origin Worker alone is not a sandbox, because it can read the app's
storage.

### Lazy activation

1. Avandar reads manifests at startup.
2. A plugin's bundle is downloaded, and its worker started, the first time
   something needs it: its view opens, a command runs, its viz type renders,
   the AI calls its tool, or a user acts on its value type.
3. Idle workers shut down after a few minutes. Plugins persist state in
   `plugin_storage`.

`onStartup` activation requires a stated reason, and the marketplace shows it
as a cost.

### Trusted plugins

Trusted plugins use the same SDK. A build alias points `@avandar/plugin-ui` at
the real components, and Avandar loads the bundle with `import()` after
checking its hash against the signed manifest. Plugin code is identical
across tiers, only the transport differs. A plugin can move between the
community and trusted tiers without a rewrite.

Trusted plugins have two extra capabilities:

- Raw React slots, for complete reskins.
- Server functions (see section 3, Avandar services).

### Remote component catalog (`@avandar/plugin-ui`)

- **Layout and inputs:** Stack, Group, Grid, Card, Tabs, Button, TextInput,
  Select, DatePicker, Markdown, Alert, Modal, Drawer.
- **Avandar components:** DatasetPicker, ColumnPicker, VizRenderer (any
  built-in or plugin viz type), MapView (layer specs), DashboardEmbed.

Data-heavy components accept a **query handle** instead of rows. Avandar runs
the query and renders the result. Large data never crosses the message
boundary, and a plugin can show data to a user without reading it itself.

Plugin strings resolve against the plugin's `locales/` in the current user's
language. Since Avandar renders the components, right-to-left layouts,
themes, dark mode, and accessibility come for free.

**URL props are sanitized.** Because Avandar renders props that come from
plugins, a URL-bearing prop could smuggle data out. Image sources and link
targets must be bundle assets or `data:` URIs, or they must go through the
proxy.

### Escape hatch: `<CustomFrame>`

A separate sandboxed iframe for D3, canvas, or other custom drawing. It
receives data through messages and the theme as CSS variables. It cannot draw
overlays outside its box, and its accessibility is the plugin's
responsibility.

### Compute

- `avandar.data.query` runs in Avandar's DuckDB and streams Arrow buffers to
  the plugin worker as transferables.
- Heavier compute runs in the plugin's own worker. Plugins may ship WASM, such
  as a statistics library.

### Plugin dependencies

A plugin may expose functions in its manifest (`provides: epi.scenarios`) that
other plugins declare they need. Avandar routes those calls and checks
permissions on each one. Plugins never talk to each other directly.

### Offline and desktop

Installed bundles are cached by hash in OPFS. A plugin works offline as long
as the services it declares do not need the network. The manifest declares
its offline support, and the UI disables features that need a connection.

### Failure handling

- Each contribution has its own error boundary. A crash renders "Plugin X
  failed" with an option to disable the plugin.
- A watchdog terminates unresponsive workers.
- Community bundles have a size cap, for example 2 MB compressed.

## 3. Avandar services (`avandar.*`)

### Rules

- Every call is async and passes only serializable data.
- Every call is checked twice: against the permissions granted at install,
  **and** against what the current user can see. A plugin never sees data
  that the user it runs for could not see.
- Failures return typed errors (`PermissionDenied`, `SlotNotBound`,
  `SlotBroken`, `Offline`, `QuotaExceeded`), never silent empty results.
  `SlotNotBound` opens the install wizard at that slot.
- The manifest declares `engines.avandar`. The SDK follows semver, and Avandar
  supports the current and previous major versions.

### Namespaces

| Namespace | Purpose | Permission |
| --- | --- | --- |
| `context` | What the plugin was invoked on: the current query handle and columns in Data Explorer, map extent and selection in GIS, the row and value for a value action | None |
| `data` | Read the query result the plugin was invoked on, query bound slots, write to datasets the plugin created, create datasets | `data:context` (only the result the plugin was invoked on), `data:slots` (default for slot-based plugins), `data:read` (every dataset the user can see, flagged in the wizard), `data:write` |
| `ontology` | Read concepts and attributes, propose mappings for admin approval | `ontology:read`, `ontology:write` |
| `storage` | A document store scoped to the install, optionally per user, with a quota | Implicit |
| `ai` | Call the workspace's AI with structured output. Sending row data goes through the existing consent system (`ConsentAuditEntry`) | `ai:invoke` (metered) |
| `http` | Outbound requests through the proxy | `http:<domain>`, one per domain |
| `services` | Named external services such as `twilio`, on BYOK or a managed account | `services:<id>` |
| `users`, `notify` | List workspace members, send in-app notifications | `users:read`, `notify:send` |
| `privacy` | Avandar's small-count suppression applied to a query handle | None |
| `export` | Downloads and PDF export, only after a user action | None |
| `ui`, `navigation` | Toasts, modals, opening views and routes | None |
| `events` | `dataset.updated`, `selection.changed`, `locale.changed`, and others | None |

Data access defaults to bound slots: binding a slot in the wizard is the
permission grant.

AI tool schemas live in the manifest, so the chat edge function can offer
them to the model without loading plugin code. The tool runs in the browser,
next to the data.

### Proxy, BYOK, and metering

A plugin calls `avandar.http.fetch(url, { service: "twilio" })`. The
`plugins-proxy` edge function then:

1. Checks the install, permission, domain allowlist, and rate limits.
2. Adds credentials: the workspace's BYOK key from Supabase Vault, or
   Avandar's managed sub-account for that workspace.
3. Caps the response size.
4. Writes a privacy-log entry (endpoint, user, byte count, status, no payload).
5. In managed mode, reports usage events to Polar usage meters.

Plugin code does not know which mode it runs in. The same plugin works with
BYOK, managed accounts, and on self-hosted instances.

- Each workspace gets its own sub-account for each managed service, so one
  workspace's abuse or suspension does not affect others.
- Every workspace has a spend cap. The wizard sets a default and shows
  estimated costs before install.

### Server building blocks

- **Webhook inbox:** `POST /plugins/{installationId}/webhooks/{name}` verifies
  signatures using the scheme the manifest declares (`twilio`,
  `hmac-sha256`), then stores the event in `plugin_webhook_events`. The event
  is applied by a declarative mapping (append to a dataset, update a storage
  document) or waits until the plugin's worker next runs. Trusted plugins may
  process events with a server function.
- **Scheduled jobs:** declarative steps run on `apps/pipeline-server`: fetch
  through the proxy, transform with DuckDB SQL, write to a dataset. Transforms
  are SQL because the AI already writes it, and `@avandar/etl` already wraps
  DuckDB on Node.
- **Background identity:** a new `plugin_installation` value in
  `share_principal_type` gives jobs and webhooks their own identity. Admins
  share specific datasets with the plugin as they would with a user group.
  Every grant is explicit, audited, and revocable.
- **Trusted server functions:** deployed as edge functions after Avandar's
  review. Supabase edge-runtime user workers are the path to opening server
  code to more tiers later, if demand appears.

**Approval workflows** (for example, "comms and epidemiology sign-off before
anything sends") start as `users` plus `notify` plus the plugin's own
storage. They become a first-class service once a second plugin needs them.

## 4. Install wizard

### Entry points

- The marketplace "Install" button.
- Pasting a URL or uploading a `.ava` file.
- Asking the AI in chat.
- An admin approving a workspace plugin.
- A dependency pulled in by another plugin's install.

Only admins with the new `settings__can_manage_plugins` permission key can
install. Editors get "Request install", which notifies admins.

### Steps

Steps are generated from the manifest. Steps that do not apply are skipped,
so a theme plugin shows only Review and Confirm.

| # | Step | What happens |
| --- | --- | --- |
| 1 | Review | A plain-language summary of what the plugin adds, plus the tier badge, publisher, license, source link, permissions grouped by risk, and estimated costs. Unverified installs require an explicit acknowledgement |
| 2 | Dependencies | Required plugins install in the same flow. One version per plugin per workspace. A conflict blocks the install with an explanation |
| 3 | Data slots | See below |
| 4 | Settings and services | A form generated from the manifest's JSON Schema. For each service, choose Managed (estimated cost and spend cap) or BYOK (key stored in Vault and verified with a test call through the proxy). Managed SMS adds a compliance registration step |
| 5 | Access | Role levels per role group for full-view plugins. Dataset shares for the plugin's background principal |
| 6 | Content | Choose which bundled datasets, dashboards, and templates to import. Hosted data downloads in the background |
| 7 | Confirm | One RPC writes the install, bindings, secrets, app row, role rows, and shares atomically |

### Slot matching

Each slot declares a semantic shape, for example
`Case { onsetDate: date, district: geo.admin2 }`. Candidates come from:

1. **Ontology concepts** with matching attributes. These are the strongest
   matches, and binding a concept automatically includes every source mapped
   to it.
2. **Dataset columns**, ranked by type, name, and a DuckDB profile of sample
   values (dates that parse, district codes that match known boundaries).
3. **Content from other installed plugins.** For example, the Mozambique
   pack's district boundaries can satisfy a geography slot.

The AI proposes a binding for every slot and explains each choice. Each
binding is validated with a test query that shows completeness, type fit, and
sample rows. Optional slots may stay unbound until a feature first needs them.

### AI-driven install

In chat, the AI shows the same summary as one approval card with editable
fields and an "Open full wizard" link. The AI never skips approval. In
particular, it cannot grant `data:read` or start managed spending without an
explicit click from a person.

### After install

Settings → Plugins → *plugin name* shows the same steps as tabs: re-bind
slots, rotate keys, switch between managed and BYOK, pin a version.

A schema check marks a binding broken when a bound column is renamed,
removed, or changes type. The plugin then receives `SlotBroken`, and admins
are prompted to re-bind.

### Disable and uninstall

| Action | Contributions | Plugin storage and webhook events | Secrets | Imported content and plugin-created datasets |
| --- | --- | --- | --- | --- |
| Disable | Hidden | Kept | Kept | Kept |
| Uninstall | Removed immediately | Kept 30 days so a reinstall restores them, then purged. Exportable as JSON first | Deleted immediately. Managed sub-accounts are closed and billing finalized | Kept by default, since the workspace owns them. Each item gets a keep or delete choice |

A plugin cannot be uninstalled while other installed plugins depend on it.
The wizard lists them.

## 5. AI authoring loop

### The marketplace first

When a user asks for something the workspace cannot do, the AI checks, in
order:

1. Installed plugins and built-in features.
2. The registry. This step is available only on Cloud and licensed instances.
3. Building a workspace plugin.

### The loop

```text
1. Plan     → contribution points, data slots, permissions. User approves
2. Generate → ava.yaml + src/*.tsx + locales/, written against the SDK reference
3. Validate → manifest schema, esbuild bundle, tsc against SDK types, permission lint
4. Test     → run as a draft in the user's browser sandbox: every contribution renders,
              commands run against sample data, AI tool schemas are valid
5. Fix      → errors return to the AI, up to 5 rounds, then it reports what still fails
6. Preview  → personal draft, visible only to its creator, marked "Draft"
7. Iterate  → each requested change becomes a new version with a code diff
8. Approve  → an admin reviews permissions, slots, the AI's summary, and the diff;
              the install wizard runs
```

### Where each part runs

| Part | Where | Why |
| --- | --- | --- |
| Running the loop | The user's browser | Tests need the data, which lives in the browser. Drafts save after every step. Avoids edge-function time limits |
| LLM calls | The chat edge function, using a strong coding model chosen separately from the chat model | Metered against the workspace's AI quota. A cost estimate is shown at the plan step |
| Build | `apps/pipeline-server`, through a shared `@avandar/plugin-build` library also used by the CLI and registry CI | Builds are identical everywhere. The build parses and bundles but never executes plugin code, so building AI-written source is safe |
| npm dependencies | An approved list, for example `simple-statistics`, `d3-array`, `@turf/turf`, `date-fns` | No supply-chain risk. Fast builds |

The SDK ships a reference file in the style of `llms.txt`, generated from its
types, with the component catalog, contribution points, and examples. The AI
writes against that reference, not from memory.

### Prompt-injection defenses

Dataset contents can try to steer the AI. Therefore:

- AI-written plugins are always sandboxed.
- Network access is off by default. Any `http` or `services` permission in an
  AI-written plugin is highlighted and needs an admin's approval, even while
  it is a draft.
- While authoring, the AI sees schemas and summary statistics, not raw rows,
  unless the user consents through the existing consent system.
- Drafts run only with their creator's permissions.

### Versions and provenance

- Each version's source is stored in Supabase Storage and tracked in
  `workspace_plugins`.
- Each version links to the conversation that produced it.
- Rollback is one click.
- When the SDK's major version changes, the AI proposes a migration for each
  workspace plugin, for an admin to approve.

### Hand-editing

"Download as project" exports a zip a developer edits locally with
`ava plugin dev` and uploads back.

### Publishing

"Publish" pushes the source to a GitHub repo in the user's account under a
license they choose, then submits it to the registry with `ava plugin submit`.
Before pushing, a scan flags data embedded in the code, such as values copied
from the workspace, and publishing requires explicit confirmation that nothing
sensitive leaks.

### Self-configuration

Self-configuration is this loop plus the install wizard, batched. The AI
reads the workspace description and datasets, then proposes one
configuration plan containing:

- Marketplace plugins, with slot bindings filled in.
- One or two workspace plugins for the gaps.

The plan is approved as a single unit.

## Changes to existing Avandar code

| Today | Change |
| --- | --- |
| `app_type` enum | An `apps` table with built-in rows and one row per full-view plugin. Every RLS helper that reads `app_type` migrates |
| Hardcoded navbar links | Built-in apps plus plugin views from the manifest registry |
| Fixed viz type set | A viz type registry: built-ins plus plugin viz types rendered through `VizRenderer`. Plugin types use one open `plugin` variant in the `AvaVizConfig` union, routed through the registry, because the closed union is checked exhaustively in 15 to 20 places |
| `generateSql \| clarify` tool union | The chat edge function accepts tool definitions from installed manifests. Plugin tools run in the browser, and their results return to the model through a new tool-result path. Today results only reach the model as page context on the next user turn |
| `share_principal_type` | Add `plugin_installation` |
| Permission catalog | Add `settings__can_manage_plugins` |
| Seat-only Polar billing | Add usage meters for managed services, plus spend caps |
| `apps/pipeline-server` placeholder | Runs declarative plugin jobs and plugin builds |
| Static Mantine theme | Token overrides and layout presets from installed theme plugins |
| `packages/` | New MIT packages: `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, `@avandar/plugin-ui`, `@avandar/plugin-build` |
| `ava` CLI | New `ava plugin` commands: `init` and `validate` (Milestone 1), `build` and `dev` (Milestone 2), `submit` (Milestone 4) |

## Build order

Each milestone gets its own spec, plan, and implementation cycle. The order
follows decision 1: build first-party trusted plugins first, to learn which
contribution points matter, while keeping the API async and serializable so
it works across the sandbox boundary later.

### Milestone 1: first-party plugins

The plugin model and an in-process runtime for trusted plugins. First-party
plugins live in `plugins/<name>/` in this monorepo and are **bundled at build
time**, each as its own lazy chunk. A per-workspace install is a row in
`plugin_installations`.

Milestone 1 installs come only from the build. Installing a file before the
sandbox exists would run uploaded code in-process, which the tier design
forbids. File installs therefore move to Milestone 2. Permissions are
declared and shown in Milestone 1, but are not enforced until the
Milestone 2 broker.

Milestone 1 is split into slices. Each slice gets its own spec, plan, and
implementation cycle.

| Slice | Delivers | Done when |
| --- | --- | --- |
| **1a. Plugin core and commands** (spec: `2026-11-06-plugins-1a-core-commands-design.md`) | Manifest schema and compiler, `plugin-manifest`/`plugin-sdk`/`plugin-ui` packages, build-time bundling, `plugin_installations`, Settings → Plugins, `commands` and `menus` in the Data Explorer toolbar, `context`, `data.fetchRows`, `ui`, `i18n`, `ava plugin init` and `validate` | The epidemiology plugin's "Linear regression" button works on the current query result |
| **1b. Viz types and derived columns** (spec: `2026-11-07-plugins-1b-viz-types-design.md`) | The open `plugin` viz variant, a registry, settings descriptors, transform and component render paths, persistence in the Explorer and dashboards, and an API for commands to add query columns | An epicurve renders in the Explorer and on a dashboard, and the incidence command adds rate columns that the rate plot draws |
| 1c. AI tools | A generic tool-call path in chat, with client-run plugin tools whose results return to the model | The chat calls `fitRegression` |
| 1d. Data slots, content, minimal wizard | Slot declarations, manual binding, content import | The Mozambique pack installs, and the epidemiology plugin binds a `Case` slot |
| 1e. Views and plugin roles | A catch-all route, sidebar links, per-plugin app roles, chat page context, plugin storage | A plugin view appears in the sidebar, gated by role |
| 1f. GIS contributions | `gis.toolbar` commands and map layers through `MapSpec` | The first spatial statistics tool works |

**Done when** the epidemiology plugin and the Mozambique pack install and work
as first-party plugins.

### Milestone 2: sandbox

The isolated runtime that community and AI-built plugins will use.

- **Distribution:**
  - The `.ava` format, `ava plugin build`, and `ava plugin dev`.
  - File installs, always sandboxed and marked Unverified.
  - Contract plugins ship as sandboxed `.ava` files. They can run trusted
    once registry signing exists in Milestone 4.
- **Isolation:**
  - The opaque-origin iframe plus Worker runtime. Run the browser-support
    spike first (see risks).
  - Remote DOM with the `@avandar/plugin-ui` catalog, including
    query-handle components and `<CustomFrame>`.
- **Enforcement:**
  - Permission checks in the broker, using the intersection rule.
  - URL prop sanitization.
  - The watchdog.
- **Other:**
  - The OPFS bundle cache.
  - `themes` and `layouts`.

**Done when** the epidemiology plugin runs sandboxed with no code changes, and
the disease communication toolkit ships as a sandboxed full view.

### Milestone 3: server building blocks

Server-side support for secrets, external services, and background work.

- **Secrets and outbound calls:**
  - `plugins-proxy`.
  - Vault secrets.
  - BYOK.
- **Managed services and billing:**
  - Managed services with sub-accounts for each workspace.
  - Polar usage meters and spend caps.
- **Background work:**
  - The webhook inbox.
  - Scheduled jobs on the pipeline server.
  - The `plugin_installation` principal.
- **New contribution points and services:** `valueTypes`, `users`, `notify`.

**Done when** the Twilio SMS plugin works with both BYOK and managed accounts,
and the DHIS2 connector syncs on a schedule.

### Milestone 4: registry and marketplace

The private registry, the marketplace, and the full install wizard.

- **Registry service:**
  - The private registry and the open protocol.
  - Publisher accounts and `ava plugin submit`.
  - Builds from pinned commits, a review queue, and Ed25519 signing.
- **Marketplace and access:**
  - The marketplace UI.
  - URL installs, marked Unverified.
  - License keys for self-hosted instances.
  - Private visibility for contract plugins.
- **Full wizard:** dependencies, AI slot prefill, access, content, costs,
  updates and re-approval, and uninstall retention.

**Done when** all four of these work:

- A community plugin is submitted, reviewed, and installed in one click.
- A licensed self-hosted instance installs from the registry.
- An unlicensed self-hosted instance installs a plugin from a URL.
- A contract plugin is visible only to its allowlisted workspace.

### Milestone 5: AI authoring

The loop that lets the AI build workspace plugins on demand.

- **Authoring:**
  - The authoring loop and the SDK reference for LLMs.
  - Builds on the pipeline server.
  - The browser test harness.
- **Drafts and approval:**
  - Personal drafts.
  - Versions with provenance.
  - Admin approval.
- **Getting code out:**
  - "Download as project".
  - Publishing, with the embedded-data scan.

**Done when** a user asks for a capability the marketplace lacks, and the AI
builds a working sandboxed plugin that an admin approves.

### Milestone 6: self-configuration

The AI configures a whole workspace in one approved plan.

- Configuration plans: batched marketplace installs, prefilled bindings, and
  gap-filling workspace plugins, approved as one unit.

**Done when** a new workspace with a description and datasets receives a plan
that, once approved, installs and binds everything.

## Testing strategy

| Layer | Tests |
| --- | --- |
| Manifest and build | Unit tests for the schema, YAML edge cases (coerced versions, country codes), and canonical output |
| SDK contract | One shared contract suite that runs against both the trusted (in-process) and sandboxed transports, proving that the same plugin behaves identically in both |
| Sandbox security | Escape attempts: reading OPFS or IndexedDB, calling `fetch` to an external host, exfiltrating through image URLs, a stuck loop, calling a service without its permission |
| Permissions | pgTAP tests for RLS on the plugin tables and for the intersection rule (plugin grant AND user access) |
| Install flows | Playwright E2E tests that drive the wizard through the UI, one spec per flow |
| Reference plugins | Each milestone's reference plugins serve as its acceptance suite |

## Open questions and risks

- **Workers inside opaque-origin iframes.** Browser support varies. The
  fallback is to run the plugin directly in the sandboxed iframe, which keeps
  storage and network isolation but loses the Worker's other protections. Run
  this spike at the start of Milestone 2.
- **Low-end devices.** Each active sandboxed plugin costs an iframe and a
  worker. Idle shutdown and lazy activation must be tuned against the
  hardware common in the sector.
- **Remote DOM scope.** Which components the v1 catalog includes, and how
  large full views perform over the message boundary.
- **Decision 9 is up for review in slice 1e.** Replacing the `app_type` enum
  with an `apps` table is roughly a 300 to 600 line migration through every
  RLS policy. A cheaper alternative gives users the same behavior: keep
  `app_type` for the built-in apps and add a separate `plugin_app_roles`
  table with its own role-check helper. Two known traps apply either way.
  `parseAppTypeFromPermissionKey` and `userAppRolesMatrixToRows` silently
  drop apps that are not in `RESTRICTABLE_APPS`.
- **License keys for self-hosting.** How they are validated, including
  offline, how they expire, and how they are priced.
- **Registry hosting.** Where the registry runs, and the layout of its
  private repository.
- **Managed SMS compliance.** With managed SMS, Avandar is the sender of
  record (US A2P 10DLC registration, opt-out handling). The registration
  flow and its liability need legal review.
- **Default spend caps** and storage quotas.
- **Plugin-created datasets.** Whether these need a new
  `datasets__source_type` value.
- **Desktop file association** for `.ava` in the Tauri shell.
