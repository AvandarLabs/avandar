import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { SUPPORT_EMAIL } from "$/config/AppConfig";
import { Logger } from "$/lib/Logger/Logger";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { FeaturePlanType } from "@/models/Subscription";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { goToBillingPortal } from "../../BillingPortalButton";
import { SubscriptionPlan } from "../../SubscriptionPlan.types";
import { ChangePlanModalContents } from "./ChangePlanModalContents";

function featurePlanTypeToLevel(featurePlanType: FeaturePlanType): number {
  return match(featurePlanType)
    .with("free", () => {
      return 0;
    })
    .with("basic", () => {
      return 1;
    })
    .with("premium", () => {
      return 2;
    })
    .exhaustive();
}

type OpenChangePlanModalOptions = {
  newPlan: SubscriptionPlan;
  currentSubscriptionId: string;
  currentPlan: SubscriptionPlan;
};

/**
 * @returns A function that opens the change plan modal.
 */
export function useChangePlanModal(): (
  options: OpenChangePlanModalOptions,
) => void {
  const user = useCurrentUser();
  const [sendUpdateSubscriptionRequest] = useMutation({
    mutationFn: async ({
      newPlan,
      currentSubscriptionId,
    }: {
      newPlan: SubscriptionPlan;
      currentSubscriptionId: string;
    }) => {
      await APIClient.patch({
        route: "subscriptions/:subscriptionId/product",
        pathParams: {
          subscriptionId: currentSubscriptionId,
        },
        body: {
          newPolarProductId: newPlan.polarProductId,
        },
      });
    },
    onSuccess: () => {
      notifySuccess("Subscription updated successfully");
      modals.closeAll();
    },
    onError: (error) => {
      Logger.error("There was an error updating the subscription", {
        errorMessage: error.message,
      });
      notifyError(
        `We were unable to update your subscription. Please contact ${SUPPORT_EMAIL}`,
      );
    },
    queryToInvalidate: WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
  });

  const openChangePlanModal = ({
    newPlan,
    currentPlan,
    currentSubscriptionId,
  }: OpenChangePlanModalOptions) => {
    const newLevel = featurePlanTypeToLevel(newPlan.featurePlan.type);
    const currentLevel = featurePlanTypeToLevel(currentPlan.featurePlan.type);
    const isUpgradingPlan = newLevel > currentLevel;
    const newPlanName = newPlan.featurePlan.metadata.featurePlanName;
    const newPlanSubType =
      newPlan.priceType === "seat_based" ?
        newPlan.planInterval === "month" ?
          "Monthly"
        : "Annual"
      : newPlan.priceType === "custom" ? "Pay What You Want"
      : "Free";

    const modalId = modals.openConfirmModal({
      title: (
        <Text size="xl" fw={600} span>
          {isUpgradingPlan ?
            `Upgrading plan to ${newPlanName} (${newPlanSubType})`
          : `Changing plan to ${newPlanName} (${newPlanSubType})`}
        </Text>
      ),
      labels: {
        confirm:
          newPlan.priceType === "custom" ?
            "Go to billing portal"
          : "Update subscription",
        cancel: "Cancel",
      },
      closeOnConfirm: false,
      size: "xxl",
      children: <ChangePlanModalContents newPlan={newPlan} />,
      onConfirm: () => {
        if (newPlan.priceType === "custom" && user) {
          goToBillingPortal({ userId: user.id });
        } else {
          sendUpdateSubscriptionRequest({
            newPlan,
            currentSubscriptionId,
          });
        }
        modals.updateModal({
          modalId,
          confirmProps: {
            loading: true,
            disabled: true,
          },
        });
      },
    });
  };

  return openChangePlanModal;
}
