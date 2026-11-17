import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** The list Accept and next list accepts, if there is one. */
  selectedKey: string | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
  /** Called when the user accepts the selected list. */
  onAccepted: () => void;
};

/** Back, Accept and next list, and Next: save, under the Map values step. */
export function LabelValuesFooter({
  selectedKey,
  dispatch,
  onAccepted,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Button
          variant="default"
          onClick={() => {
            dispatch({ type: "go_to_step", step: "review" });
          }}
        >
          <Trans>Back</Trans>
        </Button>
      }
    >
      {selectedKey ? (
        <Button
          variant="default"
          onClick={() => {
            onAccepted();
            dispatch({ type: "accept_code_list", codeListKey: selectedKey });
          }}
        >
          <Trans>Accept and next list</Trans>
        </Button>
      ) : null}
      <Button
        onClick={() => {
          dispatch({ type: "go_to_step", step: "save" });
        }}
      >
        <Trans>Next: save</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
