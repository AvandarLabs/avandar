import { Select, type SelectProps } from "@mantine/core";
import { useState } from "react";
import css from "./AtlasSelect.module.css";

/** Compact Mantine select whose menu stays inside the native preview dialog. */
export function AtlasSelect(props: SelectProps) {
  const [opened, setOpened] = useState(false);
  const closeDropdown = () => {
    setOpened(false);
    props.onDropdownClose?.();
  };
  return (
    <div
      className={css.control}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeDropdown();
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
        classNames={{
          root: css.root,
          label: css.label,
          wrapper: css.wrapper,
          input: css.input,
          dropdown: css.dropdown,
          option: css.option,
        }}
        {...props}
        dropdownOpened={opened}
        onDropdownOpen={() => setOpened(true)}
        onDropdownClose={closeDropdown}
      />
    </div>
  );
}
