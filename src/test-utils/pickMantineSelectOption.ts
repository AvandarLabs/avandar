import { fireEvent, screen, within } from "@testing-library/react";

/**
 * Picks an option from a Mantine `Select` in unit tests.
 *
 * Mantine 9 keeps dropdown portals mounted with `display: none` and does not
 * toggle `aria-expanded` under happy-dom when using `fireEvent.click`. Dropdown
 * nodes are rendered in the same order as their combobox inputs, so we resolve
 * the target list by combobox index and fall back to the smallest matching
 * dropdown when labels overlap across selects.
 */
export function pickMantineSelectOption(
  comboboxLabel: RegExp | string,
  optionLabel: string,
): void {
  const comboboxes = screen.getAllByRole("combobox");
  const combobox = screen.getByRole("combobox", { name: comboboxLabel });
  const comboboxIndex = comboboxes.indexOf(combobox);
  fireEvent.click(combobox);
  fireEvent.focus(combobox);

  const dropdowns = Array.from(
    document.querySelectorAll<HTMLElement>(".mantine-Select-dropdown"),
  );

  const dropdownByIndex = dropdowns[comboboxIndex];
  if (
    dropdownByIndex &&
    within(dropdownByIndex).queryByRole("option", {
      name: optionLabel,
      hidden: true,
    })
  ) {
    fireEvent.click(
      within(dropdownByIndex).getByRole("option", {
        name: optionLabel,
        hidden: true,
      }),
    );
    return;
  }

  const dropdownsWithOption = dropdowns.filter((dropdown) => {
    return Boolean(
      within(dropdown).queryByRole("option", {
        name: optionLabel,
        hidden: true,
      }),
    );
  });

  if (dropdownsWithOption.length === 0) {
    throw new Error(
      `Could not find option "${optionLabel}" for combobox: ${String(comboboxLabel)}`,
    );
  }

  const sortedDropdowns = [...dropdownsWithOption].sort(
    (dropdownA, dropdownB) => {
      const optionCountA = within(dropdownA).queryAllByRole("option", {
        hidden: true,
      }).length;
      const optionCountB = within(dropdownB).queryAllByRole("option", {
        hidden: true,
      }).length;
      return optionCountA - optionCountB;
    },
  );
  const targetDropdown = sortedDropdowns[0];
  if (targetDropdown === undefined) {
    throw new Error(
      `Could not find option "${optionLabel}" for combobox: ${String(comboboxLabel)}`,
    );
  }

  fireEvent.click(
    within(targetDropdown).getByRole("option", {
      name: optionLabel,
      hidden: true,
    }),
  );
}

/**
 * Returns the Mantine Select dropdown portal for a labeled combobox.
 */
export function getMantineSelectDropdown(
  comboboxLabel: RegExp | string,
): HTMLElement {
  const comboboxes = screen.getAllByRole("combobox");
  const combobox = screen.getByRole("combobox", { name: comboboxLabel });
  const comboboxIndex = comboboxes.indexOf(combobox);
  const dropdowns = Array.from(
    document.querySelectorAll<HTMLElement>(".mantine-Select-dropdown"),
  );
  const dropdown = dropdowns[comboboxIndex];
  if (!dropdown) {
    throw new Error(
      `Could not find dropdown for combobox: ${String(comboboxLabel)}`,
    );
  }
  return dropdown;
}
