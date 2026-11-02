import type {
  ANALYTICS_EVENT_NAMES,
  CLIENT_ANALYTICS_EVENT_NAMES,
  DB_ANALYTICS_EVENT_NAMES,
  SERVER_ANALYTICS_EVENT_NAMES,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { Dashboard } from "$/models/Dashboard/Dashboard.ts";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource.ts";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress.ts";
import type { DashboardFilterMode } from "$/types/dashboard.types.ts";
import type { Database } from "$/types/database.types.ts";

/** App surface an event originated from. */
export type AnalyticsApp = Database["public"]["Enums"]["app_type"];

/** Event names emitted from browser and desktop clients. */
export type ClientAnalyticsEventName =
  (typeof CLIENT_ANALYTICS_EVENT_NAMES)[number];
/** Event names emitted from edge functions. */
export type ServerAnalyticsEventName =
  (typeof SERVER_ANALYTICS_EVENT_NAMES)[number];
/** Event names emitted by database triggers. */
export type DbAnalyticsEventName = (typeof DB_ANALYTICS_EVENT_NAMES)[number];
/** Every analytics event name accepted by the platform. */
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/** Which surface executed a query. Recorded on failures from every surface. */
export type QueryAnalyticsSurface =
  | "data_explorer"
  | "dashboard_block"
  | "viz_config";

/**
 * What caused a query to run.
 *
 * `dataset_opened` covers opening a saved dataset from the Data Explorer
 * drawer. `block_render` is what dashboard blocks and viz-config previews
 * report, since neither has a user-initiated trigger: they run whenever their
 * SQL changes.
 */
export type QueryAnalyticsTrigger =
  | "sql_submit"
  | "structured_change"
  | "chat_generated"
  | "url_hydration"
  | "dataset_opened"
  | "block_render";

/**
 * The triggers a user can actually cause.
 *
 * `block_render` is what dashboard blocks and viz-config previews report for
 * having no user behind them, so a Data Explorer position that holds a trigger
 * can never legitimately be that value.
 */
export type UserQueryAnalyticsTrigger = Exclude<
  QueryAnalyticsTrigger,
  "block_render"
>;

/**
 * Coarse classification of a failed query, derived from the runtime error.
 * Classifying at the emitter is what makes failures groupable in SQL without
 * storing the error text that would be needed to group them after the fact.
 */
export type QueryErrorClass =
  | "offline"
  | "syntax"
  | "missing_column"
  | "missing_table"
  | "permission"
  | "timeout"
  | "network"
  | "unknown";

/** What a completed chat turn produced. */
export type ChatTurnOutcome =
  | "sql"
  | "clarification"
  | "dashboard_block"
  | "text"
  | "empty";

/** Coarse classification of a chat turn that never produced a response. */
export type ChatTurnErrorClass =
  | "upstream_error"
  | "network"
  | "parse"
  | "unknown";

type DatasetImportedPayload = {
  datasetId: string;
  sourceType: DatasetSource.ImportableSourceType;
  columnCount: number;
  rowCount: number;
  isFirstInWorkspace: boolean;
};

/**
 * Written by the `datasets` delete trigger, not by a TypeScript emitter. Named
 * here so reporting has one place to look up the shape.
 */
type DashboardBlockAddedViaChatPayload = {
  blockKind: string;
  vizType?: string;
  dashboardId?: string;
  blockCountAfter?: number;
};

type DashboardFilterChangedPayload = {
  dashboardId: string;
  filterId: string;
  mode: DashboardFilterMode;
  wasCleared: boolean;
};

type ChatMessageSentPayload = {
  promptChars: number;
  pageApp: ChatPageContext.ChatApp;
  modelId?: string;
  runtimeMode: "cloud" | "local";
  hasOpenDataset: boolean;
};

/**
 * Written by the `workspace_invites` insert trigger. The invite id, never a
 * hashed address, is the join key to `workspace.invite_accepted`.
 */
type WorkspaceInviteSentPayload = {
  inviteId: string;
  invitedEmailDomain: string | null;
  inviteeAlreadyRegistered: boolean;
  memberCountBefore: number;
};

type FeaturePlanType =
  Database["public"]["Enums"]["subscriptions__feature_plan_type"];
type SubscriptionStatus = Database["public"]["Enums"]["subscriptions__status"];

/**
 * Written by the `subscriptions` update trigger. `lateral` is reachable only
 * when a plan has been added to the enum without being ranked in
 * `util__subscription_plan_rank`, so a non-zero `lateral` count is a bug
 * signal rather than a business one.
 */
type SubscriptionPlanChangedPayload = {
  fromPlan: FeaturePlanType;
  toPlan: FeaturePlanType;
  direction: "upgrade" | "downgrade" | "lateral";
  seats: number;
};

/**
 * Recorded for Data Explorer executions only. A dashboard with twelve blocks
 * would otherwise report twelve queries per page view and drown the
 * activation signal, so the other two surfaces record failures only.
 */
type QueryRanPayload = {
  trigger: QueryAnalyticsTrigger;
  source: "rawSql" | "structured";
  dataSourceType: "dataset" | "entity" | "none";
  rowCount: number;
  columnCount: number;
  durationMs: number;
  didAutoLimit: boolean;
};

/**
 * Recorded from every workspace-authenticated surface. `errorMessage` is
 * sanitised before it gets here: first line only, SQL echo removed, quoted
 * literals and long digit runs masked, truncated to 500 characters. Raw SQL
 * and customer literals must never reach this column.
 *
 * `isOffline` and `errorClass: "offline"` are equivalent by construction: a
 * device that is offline classifies as `offline` whatever the underlying
 * driver reported on the way down. Both are kept because the event catalog
 * names `isOffline` and `errorClass` is what reporting groups by.
 */
type QueryFailedPayload = {
  surface: QueryAnalyticsSurface;
  trigger: QueryAnalyticsTrigger;
  errorClass: QueryErrorClass;
  errorMessage: string;
  isOffline: boolean;
};

/**
 * Recorded by the chat edge function, the only layer that knows the model,
 * the latency, and how many attempts the empty-response escalation took.
 *
 * `wasSampled` and `piiSeverity` describe chat-sample retention. Nothing
 * retains samples yet, so `wasSampled` is always false and `piiSeverity` is
 * always absent until the capture pipeline exists.
 *
 * `attemptCount`, `latencyMs`, and `outcome` are read out of `payload` with
 * `->>` by `supabase/schemas/91.analytics_view__chat_health.sql`. Renaming one
 * silently degrades that report rather than failing anything: the attempt and
 * latency columns go null, and the outcome mix collapses to `unknown` because
 * the view coalesces a missing key to that value. A rename has to update the
 * view in the same change.
 */
type ChatTurnCompletedPayload = {
  modelId: string;
  latencyMs: number;
  attemptCount: number;
  outcome: ChatTurnOutcome;
  promptChars: number;
  responseChars: number;
  schemaDatasetCount: number;
  wasSampled: boolean;
  piiSeverity?: "clean" | "warning" | "critical";
};

/**
 * `mode` distinguishes the two export paths: `direct` renders the dashboard
 * straight to a file, `annotated` goes through the annotation step first.
 */
type DashboardPdfExportedPayload = {
  dashboardId: string;
  blockCount: number;
  durationMs: number;
  mode: "direct" | "annotated";
};

/**
 * Payload shape for every event that carries one.
 *
 * Keyed by event name rather than written as a conditional chain: a chain
 * this long indents its tail arms past the 80-column limit no matter how
 * short their contents are.
 *
 * Payloads must never contain raw PII: no email addresses, no SQL text, no
 * chat content.
 */
type AnalyticsEventPayloadMap = {
  "dataset.imported": DatasetImportedPayload;
  "query.ran": QueryRanPayload;
  "query.failed": QueryFailedPayload;
  "dashboard.published": {
    dashboardId: string;
    blockCount: number;
    hasVanitySlug: boolean;
    visibility: Dashboard.Visibility;
  };
  "dashboard.share_settings_updated": {
    dashboardId: string;
    slugAction: "set" | "clear" | "unchanged";
    visibility: Dashboard.Visibility;
  };
  "dashboard.unpublished": {
    dashboardId: string;
    priorVisibility: Dashboard.Visibility;
  };
  "dashboard.block_added_via_chat": DashboardBlockAddedViaChatPayload;
  "dashboard.filter_changed": DashboardFilterChangedPayload;
  "dashboard.pdf_export_opened": { dashboardId: string; blockCount: number };
  "dashboard.pdf_exported": DashboardPdfExportedPayload;
  "dataset.deleted": {
    datasetId: string;
    sourceType: Database["public"]["Enums"]["datasets__source_type"];
    ageDays: number;
  };
  "dashboard.deleted": {
    dashboardId: string;
    wasPublic: boolean;
    ageDays: number;
  };
  "chat.message_sent": ChatMessageSentPayload;
  "chat.sql_generated": { sqlChars: number };
  "chat.turn_completed": ChatTurnCompletedPayload;
  "chat.turn_failed": {
    modelId: string;
    errorClass: ChatTurnErrorClass;
    latencyMs: number;
  };
  "nux.started": { startedAtMilestone: NuxProgress.MilestoneKey };
  "nux.milestone_completed": { milestoneKey: NuxProgress.MilestoneKey };

  // `milestoneKey` is absent when the user dismissed from the checklist with
  // no milestone open, rather than while walking one.
  "nux.dismissed": {
    milestoneKey?: NuxProgress.MilestoneKey;
    completedCount: number;
  };

  // Written by the `auth.users` insert trigger. `emailDomain` is null when
  // the account has no email address, which is the case for phone-based
  // signups.
  "user.registered": {
    emailDomain: string | null;
    provider: string | null;
    hadPendingInvite: boolean;
  };
  "user.email_confirmed": {
    emailDomain: string | null;
    secondsToConfirm: number | null;
  };
  "user.signed_in": {
    isFirstSignIn: boolean;
    daysSinceLastSignIn: number | null;
  };
  "workspace.created": {
    isFirstWorkspaceForUser: boolean;
    secondsSinceUserRegistered: number | null;
  };
  "workspace.invite_sent": WorkspaceInviteSentPayload;
  "workspace.invite_accepted": {
    inviteId: string;
    secondsFromInviteToAccept: number;
    memberCountAfter: number;
  };
  "member.removed": { memberCountAfter: number };
  "subscription.created": {
    plan: FeaturePlanType;
    isPolarBacked: boolean;
    status: SubscriptionStatus;
  };
  "subscription.plan_changed": SubscriptionPlanChangedPayload;
  "subscription.status_changed": {
    fromStatus: SubscriptionStatus;
    toStatus: SubscriptionStatus;
    plan: FeaturePlanType;
  };
};

/**
 * Payload type for every event name, including the ones that carry nothing.
 *
 * Mapped over `AnalyticsEventName` rather than over the payload map, so this
 * stays total: an event with no entry in `AnalyticsEventPayloadMap` resolves
 * to `undefined`, meaning it carries no payload yet. Each event gains one
 * when its emitter has data to record.
 */
export type AnalyticsEventPayloads = {
  [K in AnalyticsEventName]: K extends keyof AnalyticsEventPayloadMap
    ? AnalyticsEventPayloadMap[K]
    : undefined;
};

type AnalyticsEventWithPayload<K extends AnalyticsEventName> =
  AnalyticsEventPayloads[K] extends undefined
    ? { event: K; payload?: undefined }
    : { event: K; payload: AnalyticsEventPayloads[K] };

/**
 * Discriminated union pairing each client-emitted event with its own payload,
 * so `logEvent` narrows `payload` by `event`. A union rather than a generic
 * function, because `withQueryHooks` wraps the client's mutations and infers
 * their signatures.
 */
export type ClientAnalyticsEvent = {
  [K in ClientAnalyticsEventName]: AnalyticsEventWithPayload<K>;
}[ClientAnalyticsEventName];

/** The same pairing for edge-function emitted events. */
export type ServerAnalyticsEvent = {
  [K in ServerAnalyticsEventName]: AnalyticsEventWithPayload<K>;
}[ServerAnalyticsEventName];
