import { Trans } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconBook, IconPlus } from "@tabler/icons-react";
import { POPOVER_Z_INDEX } from "@/config/Theme/Theme";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  /** Dictionaries not in use yet, in the order to list them. */
  available: readonly DataDictionary.T[];
  onAdd: (dictionaryId: DataDictionary.Id) => void;
};

/** Adds one more dictionary to match the dataset's columns against. */
export function AddDictionaryMenu({
  available,
  onAdd,
}: Readonly<Props>): ReactNode {
  return (
    <Menu position="bottom-start" width={280} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
        >
          <Trans>Add dictionary</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {available.map((dictionary) => {
          return (
            <Menu.Item
              key={dictionary.id}
              leftSection={<IconBook size={16} aria-hidden />}
              onClick={() => {
                onAdd(dictionary.id);
              }}
            >
              {dictionary.name}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
