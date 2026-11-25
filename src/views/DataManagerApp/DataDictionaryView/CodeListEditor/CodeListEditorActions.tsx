import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconClipboardText, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { PastePairsModal } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/PastePairsModal";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  pairs: readonly DataDictionaryCodeList.Pair[];
  onPairsChange: (pairs: DataDictionaryCodeList.Pair[]) => void;
};

function _isBlank(pairs: readonly DataDictionaryCodeList.Pair[]): boolean {
  return pairs.every((pair) => {
    return pair.code.trim() === "" && pair.label.trim() === "";
  });
}

/**
 * The Add value and Paste a list buttons of a code list. Pasted values
 * replace a list that is still only blank rows.
 */
export function CodeListEditorActions({
  pairs,
  onPairsChange,
}: Readonly<Props>): ReactNode {
  const [isPasteOpen, setIsPasteOpen] = useState(false);

  return (
    <Group gap="sm">
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconPlus size={14} aria-hidden />}
        onClick={() => {
          onPairsChange([...pairs, DataDictionary.makeEmptyPair()]);
        }}
      >
        <Trans>Add value</Trans>
      </Button>
      <Button
        variant="subtle"
        size="compact-sm"
        leftSection={<IconClipboardText size={14} aria-hidden />}
        onClick={() => {
          setIsPasteOpen(true);
        }}
      >
        <Trans>Paste a list</Trans>
      </Button>
      <PastePairsModal
        opened={isPasteOpen}
        onClose={() => {
          setIsPasteOpen(false);
        }}
        onAdd={(pasted) => {
          onPairsChange(_isBlank(pairs) ? pasted : [...pairs, ...pasted]);
        }}
      />
    </Group>
  );
}
