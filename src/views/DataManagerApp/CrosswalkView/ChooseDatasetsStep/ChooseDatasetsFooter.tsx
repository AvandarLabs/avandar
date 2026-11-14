import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  canContinue: boolean;
  isWorking: boolean;
  onNext: () => void;
};

/** Under Choose datasets: **Next**, which saves and opens Map each dataset. */
export function ChooseDatasetsFooter({
  canContinue,
  isWorking,
  onNext,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter>
      <Button onClick={onNext} loading={isWorking} disabled={!canContinue}>
        <Trans>Next</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
