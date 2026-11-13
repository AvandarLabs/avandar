import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import { MatchColumnsStep } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  data: ApplyDictionariesData;
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
};

function ReadingColumns({
  datasetName,
}: Readonly<{ datasetName: string }>): ReactNode {
  return (
    <Center flex={1} p="lg">
      <Stack align="center" gap="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          <Trans>Reading the columns of {datasetName} on this device</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/** The current step, or why it cannot show yet. */
export function ApplyStepBody(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { flow } = props;
  if (flow.hasReadFailed) {
    return (
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`The columns could not be read`}
          message={t`Avandar could not read this dataset's columns to match them. Please try again later or reach out to support.`}
        />
      </Center>
    );
  }
  if (flow.isMatching || flow.state.dictionaryIds === undefined) {
    return <ReadingColumns datasetName={props.dataset.name} />;
  }
  if (flow.state.step === "attach") {
    return (
      <AttachStep
        dataset={props.dataset}
        columns={props.data.columns ?? []}
        existingBindings={props.data.existingBindings}
        flow={flow}
        counts={props.counts}
        lookups={props.lookups}
        summary={props.summary}
      />
    );
  }
  return (
    <MatchColumnsStep
      flow={flow}
      dictionaries={props.data.dictionaries}
      lookups={props.lookups}
      summary={props.summary}
    />
  );
}
