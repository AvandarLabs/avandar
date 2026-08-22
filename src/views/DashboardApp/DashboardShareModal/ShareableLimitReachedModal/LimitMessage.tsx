import type { Subscription } from "$/models/Subscription/Subscription";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { Plural, Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";

type Props = {
  subscription: Subscription.T | undefined;
};

/**
 * Explains why another dashboard cannot be shared, and where the workspace can
 * go next: Free and Starter have a higher tier to buy, Impact does not.
 *
 * A workspace with no subscription row is on the Free plan by default, whose
 * allowance is one. A plan with no allowance recorded is reported as zero
 * rather than as a gap in the sentence.
 */
export function LimitMessage({ subscription }: Readonly<Props>): ReactNode {
  if (subscription === undefined) {
    return (
      <Text>
        <Trans>
          Your workspace is on the Free plan, which lets you share or publish
          one dashboard. Upgrade to our Starter or Impact plan to share as many
          dashboards as you like.
        </Trans>
      </Text>
    );
  }

  const maxAllowed = subscription.maxShareableDashboardsAllowed ?? 0;
  return matchLiteral(subscription.featurePlanType, {
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
