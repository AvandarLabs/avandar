import { Trans } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { ReactNode } from "react";

type Props = {
  status: MeaningMatchStatus;
};

/**
 * Says while the search for columns that mean the same thing is running,
 * and when it did not finish. A polite live region, so the change is heard.
 */
export function MeaningMatchStatusLine({ status }: Readonly<Props>): ReactNode {
  return (
    <div aria-live="polite">
      {status === "finding" ? (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            <Trans>Looking for columns that mean the same thing</Trans>
          </Text>
        </Group>
      ) : null}
      {status === "failed" ? (
        <Text size="sm" c="dimmed">
          <Trans>
            Could not look for columns that mean the same thing. The matches
            here are by name and values.
          </Trans>
        </Text>
      ) : null}
    </div>
  );
}
