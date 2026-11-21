import { Select, type SelectProps } from "@mantine/core";
import { useState } from "react";
import css from "./AtlasSelect.module.css";
import type { ReactNode } from "react";

type Props = SelectProps;

/** Compact Mantine select whose menu stays inside the native preview dialog. */
export function AtlasSelect(props: Readonly<Props>): ReactNode {
  const [opened, setOpened] = useState(false);
  const closeDropdown = () => {
    setOpened(false);
    props.onDropdownClose?.();
  };
  return (
    <div
      className={css.atlasSelectControl}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeDropdown();
        }
      }}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && opened) {
          event.preventDefault();
          event.stopPropagation();
          closeDropdown();
        }
      }}
    >
      <Select
        size="xs"
        allowDeselect={false}
        withScrollArea={false}
        comboboxProps={{ withinPortal: false }}
        maxDropdownHeight={280}
        classNames={SELECT_CLASSES}
        {...props}
        dropdownOpened={opened}
        onDropdownOpen={() => {
          return setOpened(true);
        }}
        onDropdownClose={closeDropdown}
      />
    </div>
  );
}

const SELECT_CLASSES = {
  root: css.atlasSelectRoot,
  label: css.atlasSelectLabel,
  wrapper: css.atlasSelectWrapper,
  input: css.atlasSelectInput,
  dropdown: css.atlasSelectDropdown,
  option: css.atlasSelectOption,
};
