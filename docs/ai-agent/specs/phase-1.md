# Phase 1: the agent becomes the default, everywhere

Status: approved by Pablo on 2026-11-08 (D34). Each sub-project below gets
its own spec, plan, and implementation, in order. This page holds what they
share: the rules that came out of speccing Phase 1, the split, and what was
added to the roadmap.

## Why Phase 1 changed

The roadmap's Phase 1 had four items: dashboards in the agent, "Try
again", a browser test, and the agent on by default for Data Explorer
questions. While speccing the first item, Pablo widened it: the agent is no
longer tied to a page. Any action works from any page, users can attach
context with `@` mentions and a context picker, results show in the chat,
and the chat holds several sessions with an archive. That pulls roadmap 2.4
(the general host) into Phase 1 and adds work the roadmap did not have.

## Rules

These hold for every sub-project and for every later phase.

| # | Rule |
|---|---|
| R1 | **The agent is not page-specific.** Every action it has works from every page. The page decides only what "this" means. |
| R2 | **The current page is always in context.** Each turn tells the agent what is on screen (app, open dataset, dashboard and its visible tiles, explorer query, map, case type, case), so "this page", "this dataset", and "this chart" resolve. |
| R3 | **The agent never changes the user's page.** Results show in the chat, as gadget links (inline chips) or gadget embeds (cards with a live body). The Data Explorer keeps showing its own results in the explorer, because that is the page the user is on. |
| R4 | **Every AI entry point opens a new session in the AI chat panel.** A button or text box anywhere in the app that starts AI work (the case manager's "add new case", a future dataset question box in the data catalog) sends the request to the main chat panel as a new session, so the user's current session is never lost. All AI work happens in one place; entry points can live wherever they are easiest to find. |

## Sub-projects

| # | Sub-project | What ships | Spec |
|---|---|---|---|
| 1A | **Page-agnostic agent** | The agent answers on every page through a general host. The current page travels in each turn. Results outside the Data Explorer render in the chat as gadget embeds and links. | [phase-1a.md](phase-1a.md) |
| 1B | **Attachable context** | `@` mentions of dashboards, tiles, datasets, maps, case types, and cases in the chat composer (reusing the comment composer's mention menu and `rpc_gadgets__search`), and a context picker for attaching them without typing. The model sees each gadget's metadata, never rows. | [phase-1b.md](phase-1b.md) |
| 1C | **Multiple chats and an archive** | Several open sessions shown as tabs at the top of the chat panel (two or three visible, the rest in a list), an archive of closed sessions to browse and reopen, all stored in the browser for now. A button expands the panel into the wide drawer with the dimmed background the case manager uses today. Entry points open new sessions (R4); the case manager's chat moves into the main panel this way. Sessions get titles from a cheap online model, from the offline model when offline, or a placeholder that is renamed when the connection returns. | To write |
| 1D | **Dashboard actions from anywhere** | `add_dashboard_block` on the current, mentioned, or asked-for dashboard, with dashboard eval questions graded against today's chat first. | To write |
| 1E | **"Try again" and parity** | Regenerating rolls the agent back to before the last turn and reruns it with the previous attempt as context. An edited message resyncs the agent's history too. The agent's `ask_user` cards get today's audit log and bias check, and the agent logs today's chat analytics events (D40). | To write |
| 1F | **Browser test, then on by default** | One Playwright spec of the whole agent flow, the agent as the default, and the switch removed after a week on the demo without regressions. | To write |

Until 1C, the case manager's chat keeps running on today's `chat` function
as it does now. After 1C it opens as a new session in the main panel, still
answered by today's case-manager chat until Phase 3.5 moves case management
into the agent.

## Added to the roadmap

- **Chat history in the database** (future work): 1C keeps sessions and the
  archive in the browser only; real persisted history of every chat comes
  later.
- **Chat session limits** for free and basic accounts, alongside metering
  (F1 to F3).
