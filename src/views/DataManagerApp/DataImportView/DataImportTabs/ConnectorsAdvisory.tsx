import { Trans, useLingui } from "@lingui/react/macro";
import { Text, UnstyledButton } from "@mantine/core";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";

/**
 * Standing advisory for the Connectors tab, shared across every connector
 * row rather than owned by any one of them - duplicating it per-connector
 * would repeat the same sentence once for every connector this tab ever
 * grows to hold.
 */
export function ConnectorsAdvisory(): JSX.Element {
  const { t } = useLingui();
  return (
    <Text size="xs" c="dimmed" maw="65ch">
      <Trans>
        New connectors are added every month. If there is a database or
        service you need,{" "}
        <UnstyledButton
          type="button"
          aria-label={t`Request a data source connection via feedback`}
          display="inline"
          p={0}
          h="auto"
          td="underline"
          c="primary"
          fz="xs"
          fw={500}
          style={{ verticalAlign: "baseline" }}
          onClick={() => {
            openFeaturebaseFeedbackWidget({
              boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
            });
          }}
        >
          tell us so we can prioritize it
        </UnstyledButton>
        .
      </Trans>
    </Text>
  );
}
