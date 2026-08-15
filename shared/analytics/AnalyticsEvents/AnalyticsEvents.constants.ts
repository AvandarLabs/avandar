/**
 * The event-name lists the platform records, one per emitting runtime.
 *
 * These are the source of truth for {@link AnalyticsEventName} and its
 * per-runtime variants in `AnalyticsEvents.types.ts`, so adding a name here is
 * what makes the type system demand a payload for it.
 */

// Types for the `usage_analytics_events__category` and
// `usage_analytics_events__client` enums are deliberately not re-exported here.
// Nothing currently consumes them: the category is never sent by a client, and
// each emitter writes its own `client` literal.

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
  "dataset.deleted",
  "dashboard.deleted",
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
