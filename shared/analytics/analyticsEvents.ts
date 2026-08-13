import type { Database } from "$/types/database.types.ts";

/** App surface an event originated from, or null when not bound to one. */
export type AnalyticsApp = Database["public"]["Enums"]["app_type"];

// Types for the `usage_analytics_events__category` and
// `usage_analytics_events__client` enums are deliberately not re-exported here.
// Nothing in this phase consumes them: the category is never sent by a client,
// and each emitter writes its own `client` literal. Phase 2 adds them when the
// reporting helpers need them.

/**
 * Events emitted from the browser or the desktop shell. These describe UI
 * intent, which has no database row to hang a trigger on.
 */
export const CLIENT_ANALYTICS_EVENT_NAMES = [
  "dataset.imported",
  "query.ran",
  "query.failed",
  "dashboard.published",
  "dashboard.share_settings_updated",
  "dashboard.block_added_via_chat",
  "dashboard.filter_changed",
  "dashboard.pdf_export_opened",
  "dashboard.pdf_exported",
  "chat.message_sent",
  "chat.sql_generated",
] as const;

/**
 * Events emitted from edge functions. These describe facts only the server
 * knows, such as the model used or how many attempts a chat turn took.
 */
export const SERVER_ANALYTICS_EVENT_NAMES = [
  "waitlist.code_verified",
  "waitlist.code_claimed",
  "chat.turn_completed",
  "chat.turn_failed",
  "dashboard.public_viewed",
] as const;

/**
 * Events emitted by Postgres triggers via `util__log_analytics_event`. These
 * are row facts, so a trigger records them for every code path, including
 * seed scripts and backfills.
 */
export const DB_ANALYTICS_EVENT_NAMES = [
  "user.registered",
  "user.email_confirmed",
  "user.signed_in",
  "workspace.created",
  "workspace.invite_sent",
  "workspace.invite_accepted",
  "member.removed",
  "subscription.created",
  "subscription.plan_changed",
  "subscription.status_changed",
] as const;

/** Every event name the platform records, across all three runtimes. */
export const ANALYTICS_EVENT_NAMES = [
  ...CLIENT_ANALYTICS_EVENT_NAMES,
  ...SERVER_ANALYTICS_EVENT_NAMES,
  ...DB_ANALYTICS_EVENT_NAMES,
] as const;

// `dashboard.unpublished` is deliberately absent from every list above: no
// unpublish flow exists. `DashboardClient.usePublishDashboard` only ever writes
// `isPublic: true`, and the publish modal offers only Cancel and Publish. Add
// it back only alongside a real unpublish flow.

export type ClientAnalyticsEventName =
  (typeof CLIENT_ANALYTICS_EVENT_NAMES)[number];
export type ServerAnalyticsEventName =
  (typeof SERVER_ANALYTICS_EVENT_NAMES)[number];
export type DbAnalyticsEventName = (typeof DB_ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/**
 * Payload shape per event. Written as a mapped type over
 * `AnalyticsEventName`, so adding a name to a list above without giving it a
 * payload is a compile error.
 *
 * `undefined` means the event carries no payload yet. Phase 1B replaces those
 * as it enriches each call site, and Phases 2 and 3 fill in the server and
 * database events.
 *
 * Payloads must never contain raw PII: no email addresses, no SQL text, no
 * chat content.
 */
export type AnalyticsEventPayloads = {
  [K in AnalyticsEventName]: K extends "dataset.imported" ?
    { datasetId: string; sourceType: string }
  : K extends "dashboard.published" ?
    { dashboardId: string; wasPreviouslyPublic: boolean }
  : K extends "dashboard.block_added_via_chat" ?
    { blockKind: string; vizType?: string; dashboardId?: string }
  : K extends "dashboard.filter_changed" ? { filterId: string; mode: string }
  : K extends "dashboard.pdf_export_opened" ? { dashboardId: string }
  : undefined;
};

/**
 * Discriminated union pairing each client-emitted event with its own payload,
 * so `logEvent` narrows `payload` by `event`. A union rather than a generic
 * function, because `withQueryHooks` wraps the client's mutations and infers
 * their signatures.
 */
export type ClientAnalyticsEvent = {
  [K in ClientAnalyticsEventName]: {
    event: K;
    payload?: AnalyticsEventPayloads[K];
  };
}[ClientAnalyticsEventName];

/** The same pairing for edge-function emitted events. */
export type ServerAnalyticsEvent = {
  [K in ServerAnalyticsEventName]: {
    event: K;
    payload?: AnalyticsEventPayloads[K];
  };
}[ServerAnalyticsEventName];
