import { Trans } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ApplyDictionariesAction } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** The header's facts, joined, so the summary stays in view. */
  summary: string;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/** What the matches add up to, and Next to the Unmatched values step. */
export function MatchColumnsFooter({
  summary,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Text size="sm" c="dimmed">
          {summary}
        </Text>
      }
    >
      <Button
        onClick={() => {
          dispatch({ type: "go_to_step", step: "unmatched" });
        }}
      >
        <Trans>Next: unmatched values</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
