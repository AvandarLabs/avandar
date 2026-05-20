import { useMutation } from "@hooks";
import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifyError, notifySuccess } from "@ui";
import { SUPPORT_EMAIL } from "$/config/AppConfig";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { Logger } from "@/utils/Logger";
import { goToBillingPortal } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/goToBillingPortal";
import { ChangePlanModalContents } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/openChangePlanModal/ChangePlanModalContents";
import type { SubscriptionPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";

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
  const { t } = useLingui();
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
      notifySuccess(t`Subscription updated successfully`);
      modals.closeAll();
    },
    onError: (error) => {
      Logger.error("There was an error updating the subscription", {
        errorMessage: error.message,
      });
      notifyError(
        t`We were unable to update your subscription. Please contact ${SUPPORT_EMAIL}`,
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
          t`Monthly`
        : t`Annual`
      : newPlan.priceType === "custom" ? t`Pay What You Want`
      : t`Free`;

    const modalId = modals.openConfirmModal({
      title: (
        <Text size="xl" fw={600} span>
          {isUpgradingPlan ?
            t`Upgrading plan to ${newPlanName} (${newPlanSubType})`
          : t`Changing plan to ${newPlanName} (${newPlanSubType})`}
        </Text>
      ),
      labels: {
        confirm:
          newPlan.priceType === "custom" ?
            t`Go to billing portal`
          : t`Update subscription`,
        cancel: t`Cancel`,
      },
      closeOnConfirm: false,
      size: "xxl",
      children: <ChangePlanModalContents newPlan={newPlan} />,
      onConfirm: () => {
        if (newPlan.priceType === "custom" && user) {
          goToBillingPortal({ userId: user.id, t });
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
