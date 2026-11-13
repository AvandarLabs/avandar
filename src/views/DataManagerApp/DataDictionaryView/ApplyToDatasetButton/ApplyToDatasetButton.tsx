import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ApplyToDatasetModal } from "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** The Dictionary view's main action: applying it to a dataset. */
export function ApplyToDatasetButton({
  dictionary,
}: Readonly<Props>): ReactNode {
  const [isOpen, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button onClick={open}>
        <Trans>Apply to a dataset</Trans>
      </Button>
      <ApplyToDatasetModal
        dictionary={dictionary}
        isOpen={isOpen}
        onClose={close}
      />
    </>
  );
}
