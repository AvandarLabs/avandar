import { Trans } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** Back to Pick is offered only when the flow started there. */
  hasBack: boolean;
  hasIncludedEntry: boolean;
  /** Next goes to Map values, or straight to Describe when nothing is coded. */
  hasValuesToMap: boolean;
  hasNameIssue: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * Back and Next under the Review step. Next is held, with a line saying
 * why, until something is included and every included entry has a name the
 * save will accept.
 */
export function ReviewColumnsFooter({
  hasBack,
  hasIncludedEntry,
  hasValuesToMap,
  hasNameIssue,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        hasBack ? (
          <Button
            variant="default"
            onClick={() => {
              dispatch({ type: "go_to_step", step: "pick" });
            }}
          >
            <Trans>Back</Trans>
          </Button>
        ) : null
      }
    >
      {hasNameIssue ? (
        <Text size="sm" c="dimmed">
          <Trans>Fix the entry names marked above to go on.</Trans>
        </Text>
      ) : null}
      {hasIncludedEntry ? null : (
        <Text size="sm" c="dimmed">
          <Trans>Include at least one entry to go on.</Trans>
        </Text>
      )}
      <Button
        disabled={!hasIncludedEntry || hasNameIssue}
        onClick={() => {
          dispatch({
            type: "go_to_step",
            step: hasValuesToMap ? "label" : "describe",
          });
        }}
      >
        {hasValuesToMap ? (
          <Trans>Next: map values</Trans>
        ) : (
          <Trans>Next: describe columns</Trans>
        )}
      </Button>
    </NewDictionaryFooter>
  );
}
