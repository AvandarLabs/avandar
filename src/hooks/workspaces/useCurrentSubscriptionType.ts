import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { FeaturePlanType } from "@/models/Subscription";
import { useCurrentWorkspace } from "./useCurrentWorkspace";

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
        redirectReason: "This workspace does not have a valid subscription",
      },
      replace: true,
    });
  }

  return "free";
}
