import type {
  ANALYTICS_EVENT_NAMES,
  CLIENT_ANALYTICS_EVENT_NAMES,
  DB_ANALYTICS_EVENT_NAMES,
  SERVER_ANALYTICS_EVENT_NAMES,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { Dashboard } from "$/models/Dashboard/Dashboard.ts";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource.ts";
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
 * Written by the `auth.users` insert trigger. `emailDomain` is null when the
 * account has no email address, which is the case for phone-based signups.
 */
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
 * Payload shape per event. Written as a mapped type over
 * `AnalyticsEventName`, so adding a name to a list above without giving it a
 * payload is a compile error.
 *
 * `undefined` means the event carries no payload yet. Each event gains one
 * when its emitter has data to record.
 *
 * Payloads must never contain raw PII: no email addresses, no SQL text, no
 * chat content.
 */
export type AnalyticsEventPayloads = {
  [K in AnalyticsEventName]: K extends "dataset.imported" ?
    DatasetImportedPayload
  : K extends "dashboard.published" ?
    {
      dashboardId: string;
      blockCount: number;
      hasVanitySlug: boolean;
      visibility: Dashboard.Visibility;
    }
  : K extends "dashboard.share_settings_updated" ?
    {
      dashboardId: string;
      slugAction: "set" | "clear" | "unchanged";
      visibility: Dashboard.Visibility;
    }
  : K extends "dashboard.unpublished" ?
    { dashboardId: string; priorVisibility: Dashboard.Visibility }
  : K extends "dashboard.block_added_via_chat" ?
    DashboardBlockAddedViaChatPayload
  : K extends "dashboard.filter_changed" ? DashboardFilterChangedPayload
  : K extends "dashboard.pdf_export_opened" ? { dashboardId: string }
  : K extends "dataset.deleted" ?
    {
      datasetId: string;
      sourceType: Database["public"]["Enums"]["datasets__source_type"];
      ageDays: number;
    }
  : K extends "dashboard.deleted" ?
    { dashboardId: string; wasPublic: boolean; ageDays: number }
  : K extends "chat.message_sent" ? ChatMessageSentPayload
  : K extends "chat.sql_generated" ? { sqlChars: number }
  : K extends "user.registered" ?
    {
      emailDomain: string | null;
      provider: string | null;
      hadPendingInvite: boolean;
    }
  : K extends "user.email_confirmed" ?
    { emailDomain: string | null; secondsToConfirm: number | null }
  : K extends "user.signed_in" ?
    { isFirstSignIn: boolean; daysSinceLastSignIn: number | null }
  : K extends "workspace.created" ?
    {
      isFirstWorkspaceForUser: boolean;
      secondsSinceUserRegistered: number | null;
    }
  : K extends "workspace.invite_sent" ? WorkspaceInviteSentPayload
  : K extends "workspace.invite_accepted" ?
    {
      inviteId: string;
      secondsFromInviteToAccept: number;
      memberCountAfter: number;
    }
  : K extends "member.removed" ? { memberCountAfter: number }
  : K extends "subscription.created" ?
    {
      plan: FeaturePlanType;
      isPolarBacked: boolean;
      status: SubscriptionStatus;
    }
  : K extends "subscription.plan_changed" ? SubscriptionPlanChangedPayload
  : K extends "subscription.status_changed" ?
    {
      fromStatus: SubscriptionStatus;
      toStatus: SubscriptionStatus;
      plan: FeaturePlanType;
    }
  : undefined;
};

type AnalyticsEventWithPayload<K extends AnalyticsEventName> =
  AnalyticsEventPayloads[K] extends undefined ?
    { event: K; payload?: undefined }
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
