import { useNavigate } from "@tanstack/react-router";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";

/**
 * Resolves the current workspace's feature plan type. Redirects to the
 * invalid-workspace page when no subscription row exists yet, and returns
 * "free" as a placeholder while the redirect is in flight.
 */
export function useFeaturePlanType(): FeaturePlanType {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();

  const resolved = SubscriptionModule.resolveFeaturePlanTypeForWorkspace({
    subscription: workspace.subscription,
  });

  if (resolved.type === "no_subscription") {
    navigate({
      to: AppLinks.invalidWorkspace.to,
      search: {
        redirectReason: "NO_SUBSCRIPTION",
      },
      replace: true,
    });
    return "free";
  }

  return resolved.featurePlanType;
}
