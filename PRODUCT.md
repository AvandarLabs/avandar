# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The desktop shell (`apps/desktop`) renders the same React application with a
local DuckDB attached. It is a distribution and offline-capability wrapper, not
a second design language.

It has **not shipped to production yet**, and it is mid-rewrite: the Electrobun
shell is being migrated to Tauri on a separate worktree. So desktop parity is a
real constraint that is **not yet in force**. Until launch, do not let desktop
considerations block or reshape a web decision. At launch it becomes binding,
so avoid designing anything that would be expensive to make work in a desktop
window: browser-chrome assumptions, tab-dependent flows, and anything that
needs a URL bar or a browser-native affordance to make sense.

## Register

product

## Users

Mission-driven teams in the social sector: public-health, humanitarian, and
nonprofit staff who have outgrown spreadsheets but are not running a
data-engineering shop. They work in a browser (or the desktop app) inside a
workspace, often under time pressure, switching between importing data,
exploring it, and briefing others.

The target segment is the "missing middle": organizations holding roughly
1,000 to 10 million rows. Below that, free tools are adequate. Above it,
enterprise software is affordable. Roughly 80% of the sector sits in between,
where Avandar competes.

Secondary audiences that design must serve on their own terms:

- **Public dashboard viewers.** Anyone with a link can open `/d/$slugOrId`
  without an account. They never see the app shell and have no product
  training.
- **Workspace admins.** They configure per-app roles, role groups, user
  groups, per-resource shares, tags, language, billing, and the privacy log.
- **Invited members mid-onboarding.** They arrive through an invite link
  before they have a workspace.

## Product Purpose

Avandar is the data platform for the social sector. It unifies datasets,
queries, dashboards, maps, and case types in one workspace so a small team can
clean, analyze, and report without Big Data tooling. Success looks like: a user
can go from a file or open-data source to a trusted chart, map, or case record
without leaving the product.

The stated value proposition is enabling resource-constrained teams to do more
with less. Affordability is treated as an ethical commitment, never as a reason
to ship lower-quality software.

## Positioning

No competitor evaluated satisfies all four of: affordable for
resource-constrained teams, built for social-sector use cases, covering the
full data lifecycle rather than one stage, and self-serve without an
enterprise contract or consultants. Four mechanisms hold that position, and
all four are true today or actively under construction:

- **A real ontology layer.** Concepts, attributes, and OBDA-style mappings
  (Description Logic: TBox/ABox, see `docs/description-logic-nomenclature.md`)
  let a team define a shared vocabulary once and derive individuals from many
  messy sources. Avandar models the act of data modeling rather than any one
  domain, so a new domain does not require new engineering.
- **The whole loop in one workspace.** Import, clean, query, chart, map,
  publish, and case records, with no pipeline tooling, no warehouse, and no
  data engineer.
- **It runs where the data is.** Browser-local DuckDB, OPFS, and WebAssembly,
  plus an offline-capable desktop shell, so a team can work on sensitive data
  at speed without shipping it to a vendor warehouse. Query-time data
  integration (QETL) resolves only the data a query needs instead of
  maintaining a pipeline.
- **Built for the social sector specifically.** Consent and clarification
  logs, eight locales including Arabic and Swahili, and humanitarian data
  conventions. The domain fit is part of the moat, not a skin on a generic
  tool.

A fifth mechanism is roadmap, not shipped: a **plugin marketplace** that would
let any organization install the exact functionality its mission needs
(one-click epidemic, HIV/PrEP, or volunteer-management plugins), making
Avandar infinitely customizable for the sector. No social-sector plugin
marketplace exists today. Do not present it as an existing capability.

## Operating Context

- **Workspaces are the unit of everything.** A user can belong to several,
  like Slack. Each workspace carries its own subscription, members, roles,
  tags, language, data, and privacy log. Routes are workspace-scoped under
  `/$workspaceSlug`.
- **The apps.** User-facing names are Home, Data Sources, Data Explorer,
  Dashboards, Maps, Case Manager, and Settings. Permission-bearing app types
  today are `data_sources`, `data_explorer`, `dashboards`, and `settings`.
- **Permissions are Google Drive-shaped.** Per-app role levels
  (`viewer` < `editor` < `admin`), role groups as named presets, user groups
  as share principals, per-resource shares, and a `restricted` flag that
  disables the workspace-wide default. Workspace owners and Settings Admins
  are unconditional admins. Canonical reference:
  `docs/permissions-architecture.md`.
- **Data arrives messy and from many places.** CSV and XLSX upload, Google
  Sheets, PDF table extraction, and virtual SQL-derived datasets, with resync
  for replayable sources. Interoperability means connecting to existing
  sources without a migration project.
- **The scene is often bad.** Field and crisis contexts, low bandwidth,
  shared or borrowed machines, time pressure, and staff who are domain experts
  rather than data professionals.
- **Publishing is a growth loop, not a side feature.** Public dashboards are
  supported on every plan, including Free, and are an intended acquisition
  channel. A public dashboard is a first impression of the product for someone
  who has never signed in.

## Capabilities and Constraints

Durable constraints every future design must preserve:

- **Offline and low-bandwidth.** Browser-local datasets, offline-only sources,
  and desktop DuckDB. Working without a reliable connection is a supported
  scene, not a degraded one. Designs must not assume a round trip is cheap or
  even possible.
- **RTL and eight locales.** `en`, `es`, `pt`, `fr`, `sw`, `ar`, `zh-Hans`,
  `zh-Hant`, with Arabic right-to-left (`src/i18n/locales.ts`). Every layout
  must survive mirroring, and all user-facing copy goes through Lingui. No
  hardcoded strings, no direction-dependent spacing.
- **Public unauthenticated dashboards.** `/d/$slugOrId` is a real surface with
  a real audience who will never sign in. It cannot borrow app affordances or
  assume product knowledge.
- **Consent and privacy logging.** Consent decisions, clarification audits,
  and private resources are first-class settings, not compliance decoration.
  Sensitive-population data is the normal case, so defaults must be
  conservative and provenance must stay visible.
- **The ontology layer is a query target, not a separate feature.** Querying
  must reach both raw datasets and semantically defined ontology objects
  through one path. The ontology is a business-logic layer over the data, and
  any query, chart, map, or case surface must be able to sit on either.
- **The apps are an ecosystem, not silos.** Today each app is separate. The
  near-term vision is an interconnected ecosystem in the shape of Google
  Drive: Data Explorer results get sent to a Dashboard; clicking a row of
  Individuals in that dashboard opens that Individual's profile in Case
  Manager; a map on that profile takes the user into the GIS tool. Design
  every app surface as a place data can arrive from somewhere else and be
  handed onward, with an identity that survives the crossing. Do not build
  affordances that only make sense inside one app, and do not treat a
  selection, a row, or an Individual as belonging to the app that happens to
  be displaying it.

Confirmed functionality and product facts:

- Data lifecycle coverage: dataset management and import, processing, the Data
  Explorer, querying, visualizations, dashboard building, maps and GIS, and
  case management over ontology individuals.
- An AI assistant ("Ask Avandar") is present in the app shell as a chat panel.
  Privacy-preserving AI-driven data exploration tested as a standout feature
  and is a current priority, so AI surfaces should be treated as core, not
  bolt-on.
- Business model: freemium SaaS, self-serve signup, no contract, subscription
  per workspace. Public plan names are **Free**, **Starter**, **Impact**, and
  **Enterprise** (Starter and Impact are the public names for what internal
  documents call Basic and Premium). Starter is $4/user/month billed yearly or
  $6 monthly; Impact is $15/user/month billed yearly or $25 monthly;
  Enterprise is contact-sales. Tiers gate team size, data-source count,
  external dashboard count, and AI usage. The canonical plan definitions live
  in the marketing site (`~/src/avandar-website`,
  `configs/WebsiteConfig/WebsiteConfig.tsx`), not here; any surface that shows
  prices must read them from live configuration rather than from this file.
- The product is open source under CPAL-1.0. Open source is a deliberate
  trust-building lever for a sector with low vendor trust, not an
  implementation detail.
- The platform is in beta.

Terminology (internal vs. user-facing) is not interchangeable:

- Internal ontology code uses Description Logic terms: ontology, TBox, ABox,
  concept, individual, attribute, assertion, mapping.
- User-facing copy does not. Users read "Case Manager", "case type", and the
  domain nouns they brought with them (a County is a County). The words
  "entity", "profile manager", and "concept" must never appear in the UI.
- The app shell has its own vocabulary (slate, sidebar, gutter, chat aside,
  docked drawer) defined in `docs/app-shell-nomenclature.md`. Use those words
  in code and in design discussion.

## Brand Commitments

- **Name.** Avandar, by Avandar Labs. Site: `www.avandarlabs.com`. Community:
  a public Discord.
- **Personality.** Calm, precise, mission-serious. Three words: **restrained,
  credible, useful**. The interface should disappear into the task. Confidence
  comes from familiar chrome, honest empty states, and the same nouns
  everywhere, not from decoration.
- **Trust is the brand's job.** Market research found vendor trust to be a top
  concern alongside affordability. Overstatement, dark patterns, invented
  proof, and anything that reads as a growth trick cost more here than they
  would elsewhere.
- **Cheap must never look cheap.** Affordability is an ethical position.
  Nothing in the product may imply that a lower price bought lower quality.
- **Accessibility and localization are commitments, not settings.** See below.

## Evidence on Hand

Nothing outside this repository is cleared for citation. Future work must not
invent or imply otherwise.

- **No customer logos, testimonials, named users, metrics, case studies, or
  press mentions may appear on any surface.** Real proof points exist in the
  internal business plan, and none of them are approved for use. Do not
  reintroduce them from that document or from any other source without a new
  decision from the user.
- The Sudan cholera 2025 material in `docs/` is a **demo scenario**, not a
  deployment. It must never be described as a real response, a customer, or a
  field result.
- Usable real content is limited to what the repository actually contains:
  the product itself, its seed and fixture data, and the public README.
- When a design needs proof, the honest move is to show the product doing the
  work, not to assert an outcome.

## Product Principles

- **Do more with less, for people who have less.** Every added step, wait,
  megabyte, or concept is charged to a team that cannot afford it. Cost is a
  design dimension, not just an infrastructure one.
- **Generalize instead of bespoking.** The platform models the act of data
  modeling, so a surface built for one domain must be expressible for any
  domain. If a screen only works for cholera, it is the wrong screen.
- **One ecosystem, not a suite of silos.** Data, selections, and individuals
  travel between apps and keep their identity. A surface is a stop on a path,
  never a terminus.
- **Earn trust by being verifiable.** Show provenance, respect consent, name
  the source, and never claim what cannot be checked. Open source, honest
  empty states, and legible permissions are all the same principle.
- **The task is the point.** The interface recedes so the work is visible.
  Brand lives in precision and restraint, not in ornament.

## Accessibility & Inclusion

WCAG AA contrast (body text >= 4.5:1). Keyboard-complete primary flows,
visible focus, labeled icon buttons, and `respectReducedMotion`. All
user-facing copy goes through Lingui. Color is never the only state signal.

Localization is an accessibility requirement here, not a nice-to-have: layouts
must hold under RTL mirroring and under the length changes that come with
eight locales. Users are frequently non-native English speakers, on older
hardware, on poor connections, and are domain experts rather than software
experts.

## Visual System

The visual world lives in [`DESIGN.md`](DESIGN.md): identity, palette,
typography, elevation, components, design principles, and anti-references. It
is the single source of truth for how Avandar looks, and none of it is
duplicated here. App shell nomenclature (slate, gutter, chat aside, and the
z-index tiers) is in
[`docs/app-shell-nomenclature.md`](docs/app-shell-nomenclature.md).
