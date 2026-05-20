import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { resolveFeaturePlanTypeForWorkspace } from "@/hooks/workspaces/resolveFeaturePlanTypeForWorkspace";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";

export function useFeaturePlanType(): FeaturePlanType {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();

  const resolved = resolveFeaturePlanTypeForWorkspace({
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
