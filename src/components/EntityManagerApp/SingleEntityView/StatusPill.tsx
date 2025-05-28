import { Combobox, Group, Pill, useCombobox } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";

export function StatusPill(): JSX.Element {
  const { hovered, ref } = useHover();
  const [isEditing, setIsEditing] = useState(false);
  const combobox = useCombobox({
    onDropdownOpen: () => {
      setIsEditing(true);
    },
    onDropdownClose: () => {
      setIsEditing(false);
    },
  });

  return (
    <Combobox store={combobox} width={300} position="bottom-start">
      <Combobox.Target>
        <Pill
          bg="primary"
          c="white"
          ref={ref}
          className="transition-all"
          styles={{ label: { cursor: hovered ? "pointer" : "default" } }}
          onClick={() => {
            combobox.toggleDropdown();
          }}
        >
          <Group wrap="nowrap" gap="xxs">
            Active
            {hovered || isEditing ?
              <IconPencil size={12} />
            : null}
          </Group>
        </Pill>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <Combobox.Option value="active">Active</Combobox.Option>
          <Combobox.Option value="inactive">Inactive</Combobox.Option>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
