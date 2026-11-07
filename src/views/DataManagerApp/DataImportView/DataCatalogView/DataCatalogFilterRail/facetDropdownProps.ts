import type { ComboboxProps } from "@mantine/core";

/**
 * A facet's dropdown opens wider than the narrow rail it sits in, so long
 * names and their counts fit on a line, and hangs from the field's start
 * edge into the results beside it.
 */
export const FACET_DROPDOWN_PROPS: ComboboxProps = {
  width: "18rem",
  position: "bottom-start",
};
