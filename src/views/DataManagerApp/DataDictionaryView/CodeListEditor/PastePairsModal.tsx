import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  onAdd: (pairs: DataDictionaryCodeList.Pair[]) => void;
};

/**
 * Adds many values at once from pasted text, one per line, such as
 * `1 = Male` or `1, Male`. Typing twelve race codes one row at a time is
 * the chore a dictionary exists to remove.
 */
export function PastePairsModal({
  opened,
  onClose,
  onAdd,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState("");
  const pairs = DataDictionary.parsePastedPairs(text);

  return (
    <Modal opened={opened} onClose={onClose} title={t`Paste a list`}>
      <Stack gap="md">
        <Textarea
          label={t`Values to add`}
          description={t`One per line, with the source value first: 1 = Male, 1: Male, or 1, Male.`}
          autosize
          minRows={6}
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value);
          }}
          data-autofocus
        />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            <Plural
              value={pairs.length}
              one="# value found"
              other="# values found"
            />
          </Text>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              disabled={pairs.length === 0}
              onClick={() => {
                onAdd(pairs);
                setText("");
                onClose();
              }}
            >
              <Plural
                value={pairs.length}
                one="Add # value"
                other="Add # values"
              />
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
