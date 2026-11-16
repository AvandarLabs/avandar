import { useLingui } from "@lingui/react/macro";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * The words naming a data slot's source by its kind, such as "Case type:
 * Measles cases" or "Dataset: line_list.csv". Use it wherever a bound slot
 * is listed, for example the install wizard's summary or a plugin's card.
 */
export function useDataSlotSourceLabels(): Record<
  DataSlotSource["kind"],
  (name: string) => string
> {
  const { t } = useLingui();
  return {
    concept: (name) => {
      return t`Case type: ${name}`;
    },
    dataset: (name) => {
      return t`Dataset: ${name}`;
    },
  };
}
