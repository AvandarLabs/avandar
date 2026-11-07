import { useLingui } from "@lingui/react/macro";
import { UnstyledButton } from "@mantine/core";
import { useState } from "react";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogMetadataChips/DataCatalogMetadataChips.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The values to show, one chip each, in the order given. */
  values: readonly string[];

  /**
   * How many chips show before a "+{n} more" button reveals the rest. Every
   * value shows when this is not set.
   */
  numVisible?: number;

  /**
   * What clicking a value's chip does, as its accessible name. It should
   * contain the value, so a user who sees the chip can say its name.
   */
  getActionLabel: (value: string) => string;

  /** Called with a chip's value when it is clicked. */
  onSelect: (value: string) => void;
};

/**
 * A listing's metadata values, such as its topics or keywords, as a run of
 * small chips. Each chip is a button that narrows the catalog to that value,
 * which is navigation within the view rather than an action on the listing.
 */
export function DataCatalogMetadataChips({
  values,
  numVisible,
  getActionLabel,
  onSelect,
}: Props): ReactNode {
  const { t } = useLingui();
  const [isShowingAll, setIsShowingAll] = useState(false);
  // Slicing to an undefined end keeps every value.
  const shownValues = values.slice(0, isShowingAll ? undefined : numVisible);
  const numHidden = values.length - shownValues.length;

  return (
    <ul className={css.dataCatalogMetadataChips}>
      {shownValues.map((value) => {
        return (
          <li key={value}>
            <UnstyledButton
              className={css.dataCatalogMetadataChip}
              aria-label={getActionLabel(value)}
              onClick={() => {
                onSelect(value);
              }}
            >
              {value}
            </UnstyledButton>
          </li>
        );
      })}
      {numHidden > 0 ? (
        <li>
          <UnstyledButton
            className={css.dataCatalogMetadataChipsMore}
            onClick={() => {
              setIsShowingAll(true);
            }}
          >
            {t`+${numHidden} more`}
          </UnstyledButton>
        </li>
      ) : null}
    </ul>
  );
}
