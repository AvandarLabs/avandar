import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Modal, Stack, Text } from "@mantine/core";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import type { Subscription } from "$/models/Subscription/Subscription";
import type { ReactNode } from "react";

type Props = {
  subscription: Subscription.T | undefined;
  isOpened: boolean;
  onClose: () => void;
};

/**
 * The "shareable dashboard limit reached" modal, offered when the plan will
 * not let the workspace make another dashboard reachable by anyone other than
 * its owner. It embeds the plan picker so the upgrade can happen in place, and
 * it is dismissible: everything else about the workspace still works, and only
 * this one publish is blocked.
 */
export function ShareableLimitReachedModal({
  subscription,
  isOpened,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  const messageElement =
    subscription === undefined ?
      <Text>
        <Trans>
          Your workspace is on the Free plan, which lets you share or publish
          one dashboard. Upgrade to our Starter or Impact plan to share as many
          dashboards as you like.
        </Trans>
      </Text>
    : matchLiteral(subscription.featurePlanType, {
        free: () => {
          return (
            <Text>
              <Trans>
                Your current plan only lets you share or publish{" "}
                {subscription.maxShareableDashboardsAllowed} dashboard(s).
                Upgrade to our Starter or Impact plan to share as many
                dashboards as you like.
              </Trans>
            </Text>
          );
        },
        basic: () => {
          return (
            <Text>
              <Trans>
                Your current plan only lets you share or publish{" "}
                {subscription.maxShareableDashboardsAllowed} dashboard(s).
                Upgrade to our Impact plan to share as many dashboards as you
                like.
              </Trans>
            </Text>
          );
        },
        premium: () => {
          return (
            <Text>
              <Trans>
                Your current plan only lets you share or publish{" "}
                {subscription.maxShareableDashboardsAllowed} dashboard(s).
                Contact us to raise the limit for your workspace.
              </Trans>
            </Text>
          );
        },
      });

  return (
    <Modal
      title={t`Shared dashboard limit reached`}
      opened={isOpened}
      onClose={onClose}
      size="100%"
    >
      <Stack>
        {messageElement}
        <WorkspaceBillingView hideTitle hideIntroText />
      </Stack>
    </Modal>
  );
}
