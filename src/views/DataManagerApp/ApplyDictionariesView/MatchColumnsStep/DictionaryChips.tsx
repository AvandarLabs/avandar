import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Pill, Text } from "@mantine/core";
import { AddDictionaryMenu } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/AddDictionaryMenu";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionaryIds: readonly DataDictionary.Id[];
  /** Every dictionary in the workspace. */
  dictionaries: readonly DataDictionary.T[];
  onAdd: (dictionaryId: DataDictionary.Id) => void;
  onRemove: (dictionaryId: DataDictionary.Id) => void;
  /** Controls on the band's trailing edge, such as Convert all. */
  end?: ReactNode;
};

/** One dictionary in use, with a button to stop using it. */
function DictionaryChip(
  props: Readonly<{ name: string; onRemove: () => void }>,
): ReactNode {
  const { t } = useLingui();
  const { name } = props;
  return (
    <Pill
      size="md"
      withRemoveButton
      onRemove={props.onRemove}
      // Pill hides its remove button from assistive tech and the tab order,
      // since inside an input Backspace removes a pill. Here the button is
      // the only way to stop using a dictionary.
      removeButtonProps={{
        "aria-label": t`Stop using ${name}`,
        "aria-hidden": false,
        tabIndex: 0,
      }}
    >
      {name}
    </Pill>
  );
}

/**
 * The dictionaries the columns are matched against, each removable, and a
 * menu to add another.
 */
export function DictionaryChips({
  dictionaryIds,
  dictionaries,
  onAdd,
  onRemove,
  end,
}: Readonly<Props>): ReactNode {
  const available = dictionaries.filter((dictionary) => {
    return !dictionaryIds.includes(dictionary.id);
  });
  return (
    <Group
      gap="sm"
      justify="space-between"
      wrap="nowrap"
      className={css.matchColumnsChips}
    >
      <Group gap="xs">
        <Text size="sm" c="dimmed">
          <Trans>Using</Trans>
        </Text>
        {dictionaryIds.map((dictionaryId) => {
          const name =
            dictionaries.find((dictionary) => {
              return dictionary.id === dictionaryId;
            })?.name ?? "";
          return (
            <DictionaryChip
              key={dictionaryId}
              name={name}
              onRemove={() => {
                onRemove(dictionaryId);
              }}
            />
          );
        })}
        {available.length > 0 ? (
          <AddDictionaryMenu available={available} onAdd={onAdd} />
        ) : null}
      </Group>
      {end}
    </Group>
  );
}
