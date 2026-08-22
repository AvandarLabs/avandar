import type { ComboboxStore } from "@mantine/core";

import { useCombobox } from "@mantine/core";

/** Creates the keyboard-aware combobox store for the chat model picker. */
export function useChatModelCombobox(): ComboboxStore {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
    onDropdownOpen: () => {
      // The dropdown renders after this synchronous callback, so selection
      // waits until its option elements exist.
      requestAnimationFrame(() => {
        combobox.selectActiveOption();
      });
    },
  });
  return combobox;
}
