import { matchLiteral } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
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
 * What a workspace with no subscription row at all is told. It is on the Free
 * plan by default, whose allowance is one.
 */
function _renderNoSubscriptionMessage(): ReactNode {
  return (
    <Text>
      <Trans>
        Your workspace is on the Free plan, which lets you share or publish one
        dashboard. Upgrade to our Starter or Impact plan to share as many
        dashboards as you like.
      </Trans>
    </Text>
  );
}

/**
 * What a workspace on a given plan is told, which differs only in where it can
 * go next: Free and Starter have a higher tier to buy, Impact does not.
 *
 * @param options.maxAllowed The plan's allowance. A plan with none recorded is
 *   reported as zero rather than as a gap in the sentence.
 */
function _renderPlanLimitMessage(
  options: Readonly<{
    featurePlanType: Subscription.FeaturePlanType;
    maxAllowed: number | undefined;
  }>,
): ReactNode {
  const maxAllowed = options.maxAllowed ?? 0;
  return matchLiteral(options.featurePlanType, {
    free: () => {
      return (
        <Text>
          <Trans>
            Your current plan only lets you share or publish{" "}
            <Plural value={maxAllowed} one="# dashboard" other="# dashboards" />
            . Upgrade to our Starter or Impact plan to share as many dashboards
            as you like.
          </Trans>
        </Text>
      );
    },
    basic: () => {
      return (
        <Text>
          <Trans>
            Your current plan only lets you share or publish{" "}
            <Plural value={maxAllowed} one="# dashboard" other="# dashboards" />
            . Upgrade to our Impact plan to share as many dashboards as you
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
            <Plural value={maxAllowed} one="# dashboard" other="# dashboards" />
            . Contact us to raise the limit for your workspace.
          </Trans>
        </Text>
      );
    },
  });
}

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

  return (
    <Modal
      title={t`Shared dashboard limit reached`}
      opened={isOpened}
      onClose={onClose}
      size="100%"
    >
      <Stack>
        {subscription === undefined ?
          _renderNoSubscriptionMessage()
        : _renderPlanLimitMessage({
            featurePlanType: subscription.featurePlanType,
            maxAllowed: subscription.maxShareableDashboardsAllowed,
          })
        }
        <WorkspaceBillingView hideTitle hideIntroText />
      </Stack>
    </Modal>
  );
}
