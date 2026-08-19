import { useCombobox } from "@mantine/core";
import { useState } from "react";
import type { ComboboxStore } from "@mantine/core";

function _normalize(value: string): string {
  return value.trim().toLowerCase();
}

type FieldState = {
  combobox: ComboboxStore;
  search: string;
  setSearch: (search: string) => void;
  trimmedSearch: string;
  isKnownValue: boolean;
  matchingSuggestions: string[];
  addValue: (nextValue: string) => void;
  removeValue: (removedValue: string) => void;
};

/** Search text, dropdown state, and add/remove behavior for one value list. */
export function useValuesFieldState(
  value: readonly string[],
  suggestions: readonly string[],
  onChange: (value: string[]) => void,
): FieldState {
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
  });
  const trimmedSearch = search.trim();
  const normalizedSearch = _normalize(trimmedSearch);
  const isKnownValue = [...value, ...suggestions].some((known) => {
    return _normalize(known) === normalizedSearch;
  });
  // Membership as a set, so filtering the suggestions stays one pass over them
  // rather than one pass per suggestion over the chosen values.
  const chosenValues = new Set(value);
  const matchingSuggestions = suggestions.filter((suggestion) => {
    return (
      !chosenValues.has(suggestion) &&
      _normalize(suggestion).includes(normalizedSearch)
    );
  });
  return {
    combobox,
    search,
    setSearch,
    trimmedSearch,
    isKnownValue,
    matchingSuggestions,
    addValue: (nextValue) => {
      onChange([...value, nextValue]);
      setSearch("");
      combobox.closeDropdown();
    },
    removeValue: (removedValue) => {
      onChange(
        value.filter((existing) => {
          return existing !== removedValue;
        }),
      );
    },
  };
}
