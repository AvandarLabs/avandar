import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ApplyDictionariesAction } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** Whether any column converts, which names the last step Save as. */
  isConverting: boolean;
  /** Whether the dataset is a linked dataset, whose last step is Save. */
  isLinkedDataset: boolean;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function NextLabel(
  props: Readonly<{ isConverting: boolean; isLinkedDataset: boolean }>,
): ReactNode {
  if (!props.isConverting) {
    return <Trans>Next: attach</Trans>;
  }
  return props.isLinkedDataset ? (
    <Trans>Next: save</Trans>
  ) : (
    <Trans>Next: save as</Trans>
  );
}

/** Back to Match columns, and Next to the last step, by its name. */
export function UnmatchedValuesFooter({
  isConverting,
  isLinkedDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Button
          variant="default"
          onClick={() => {
            dispatch({ type: "go_to_step", step: "match" });
          }}
        >
          <Trans>Back</Trans>
        </Button>
      }
    >
      <Button
        onClick={() => {
          dispatch({ type: "go_to_step", step: "save" });
        }}
      >
        <NextLabel
          isConverting={isConverting}
          isLinkedDataset={isLinkedDataset}
        />
      </Button>
    </NewDictionaryFooter>
  );
}
