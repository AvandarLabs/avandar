import type { Database } from "$/types/database.types";

export type AnalyticsApp = Database["public"]["Enums"]["app_type"];

/**
 * Stable event names tracked by the platform. New event names must be added
 * here so consumers cannot accidentally pass typos; the backend table accepts
 * any string but query dashboards rely on these stable names.
 */
export type AnalyticsEventName =
  | "dataset.imported"
  | "query.ran"
  | "query.failed"
  | "dashboard.published"
  | "dashboard.unpublished"
  | "dashboard.block_added_via_chat"
  | "dashboard.filter_changed"
  | "chat.message_sent"
  | "chat.sql_generated";

export type AnalyticsEventPayload = Record<string, unknown>;
