import { Trans, useLingui } from "@lingui/react/macro";
import { Modal, Stack, Text } from "@mantine/core";
import { matchLiteral } from "@utils";
import { Subscription } from "$/models/Subscription/Subscription";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";

type Props = {
  subscription: Subscription.T | undefined;
  isOpened: boolean;
  onClose: () => void;
};

/**
 * Renders the "dataset limit reached" modal that appears when a workspace
 * cannot add another dataset under its current plan. The modal always shows
 * the plan selection UI so the user can upgrade, but it can be dismissed —
 * the workspace remains usable, only new dataset uploads are blocked.
 */
export function DatasetLimitReachedModal({
  subscription,
  isOpened,
  onClose,
}: Props): JSX.Element {
  const { t } = useLingui();

  const messageElement =
    subscription === undefined ?
      <Text>
        <Trans>
          Your workspace is on the Free plan, which supports up to 5 datasets.
          Upgrade to our Starter or Impact plan to increase the number of
          datasets you can add to your workspace.
        </Trans>
      </Text>
    : matchLiteral(subscription.featurePlanType, {
        free: () => {
          return (
            <Text>
              <Trans>
                Your current plan only supports up to{" "}
                {subscription.maxDatasetsAllowed} datasets. Upgrade to our
                Starter or Impact plan to increase the number of datasets you
                can add to your workspace.
              </Trans>
            </Text>
          );
        },
        basic: () => {
          return (
            <Text>
              <Trans>
                Your current plan only supports up to{" "}
                {subscription.maxDatasetsAllowed} datasets. Upgrade to our
                Impact plan to increase the number of datasets you can add to
                your workspace.
              </Trans>
            </Text>
          );
        },
        premium: () => {
          return (
            <Text>
              <Trans>
                Your current plan only supports up to{" "}
                {subscription.maxDatasetsAllowed} datasets. To increase the
                number of datasets you can add to your workspace you can
                purchase more seats. Each seat allows you to add 10 more
                datasets!
              </Trans>
            </Text>
          );
        },
      });

  return (
    <Modal
      title={t`Dataset limit reached`}
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
