import { Modal, Stack, Text } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral";
import { Subscription } from "$/models/Subscription/Subscription";
import { WorkspaceBillingView } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";

type Props = {
  subscription: Subscription.T | undefined;
  workspaceSlug: string;
  isOpened: boolean;
};

export function DatasetLimitReachedModal({
  subscription,
  workspaceSlug,
  isOpened,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const elements = {
    noSubscriptionFound: () => {
      return (
        <Text>
          Your workspace is on the Free plan, which supports up to 5 datasets.
          To add more datasets, upgrade to a paid plan.
        </Text>
      );
    },
  };

  return (
    <Modal
      title="Dataset limit reached"
      opened={isOpened}
      onClose={() => {
        navigate({
          to: "/$workspaceSlug/data-manager",
          params: {
            workspaceSlug,
          },
        });
      }}
      closeOnClickOutside={false}
      size="100%"
    >
      <Stack>
        {subscription === undefined ?
          elements.noSubscriptionFound()
        : matchLiteral(subscription.featurePlanType, {
            free: () => {
              return (
                <>
                  <Text>
                    Your current plan only supports up to
                    {subscription.maxDatasetsAllowed} datasets. Upgrade to our
                    Starter or Impact plan to increase the number of datasets
                    you can add to your workspace.
                  </Text>
                  <WorkspaceBillingView hideTitle hideIntroText />
                </>
              );
            },
            basic: () => {
              return (
                <>
                  <Text>
                    Your current plan only supports up to
                    {subscription.maxDatasetsAllowed} datasets. Upgrade to our
                    Impact plan to increase the number of datasets you can add
                    to your workspace.
                  </Text>
                  <WorkspaceBillingView hideTitle hideIntroText />
                </>
              );
            },
            premium: () => {
              return (
                <>
                  <Text>
                    Your current plan only supports up to
                    {subscription.maxDatasetsAllowed} datasets. To increase the
                    number of datasets you can add to your workspace you can
                    purchase more seats. Each seat allows you to add 10 more
                    datasets!
                  </Text>
                  <WorkspaceBillingView hideTitle hideIntroText />
                </>
              );
            },
          })
        }
      </Stack>
    </Modal>
  );
}

/*
          1. if no ugprade, say they need to delete some datasets
          2. when saving, check the backend
            permission again.
          */
