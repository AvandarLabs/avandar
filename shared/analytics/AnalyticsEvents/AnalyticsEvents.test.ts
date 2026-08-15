import { ANALYTICS_EVENT_NAMES } from "$/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
import type { Database } from "$/types/database.types.ts";

type FeaturePlanType =
  Database["public"]["Enums"]["subscriptions__feature_plan_type"];
type SubscriptionStatus = Database["public"]["Enums"]["subscriptions__status"];

type WorkspaceInviteSentPayload = {
  inviteId: string;
  invitedEmailDomain: string | null;
  inviteeAlreadyRegistered: boolean;
  memberCountBefore: number;
};

type SubscriptionPlanChangedPayload = {
  fromPlan: FeaturePlanType;
  toPlan: FeaturePlanType;
  direction: "upgrade" | "downgrade" | "lateral";
  seats: number;
};

type TriggerEventPayloads = {
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

describe("analytics event registry", () => {
  it("maps no registered name to the other fallback", () => {
    expect(ANALYTICS_EVENT_NAMES).not.toContain("other");
  });

  it("does not register retired waitlist events", () => {
    expect(ANALYTICS_EVENT_NAMES).not.toContain("waitlist.code_verified");
    expect(ANALYTICS_EVENT_NAMES).not.toContain("waitlist.code_claimed");
  });
});

describe("analytics trigger event payloads", () => {
  it("documents every privacy-safe trigger payload shape", () => {
    expectTypeOf<
      Pick<AnalyticsEventPayloads, keyof TriggerEventPayloads>
    >().toEqualTypeOf<TriggerEventPayloads>();
  });
});
