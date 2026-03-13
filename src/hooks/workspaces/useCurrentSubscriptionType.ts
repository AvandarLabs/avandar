import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "./useCurrentWorkspace";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";

export function useFeaturePlanType(): FeaturePlanType {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();

  if (workspace && workspace.subscription) {
    return workspace.subscription.featurePlanType;
  }

  if (!workspace.subscription) {
    navigate({
      to: AppLinks.invalidWorkspace.to,
      search: {
        redirectReason: "NO_SUBSCRIPTION",
      },
      replace: true,
    });
  }

  return "free";
}
