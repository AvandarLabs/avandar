import { useLingui } from "@lingui/react/macro";
import { UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogMetadataChips/DataCatalogMetadataChips.module.css";
import type { ReactNode, RefObject } from "react";

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

/** One value's chip: a button that selects the value. */
function _Chip({
  value,
  actionLabel,
  buttonRef,
  onSelect,
}: {
  value: string;
  actionLabel: string;
  buttonRef: RefObject<HTMLButtonElement | null> | undefined;
  onSelect: (value: string) => void;
}): ReactNode {
  return (
    <li>
      <UnstyledButton
        ref={buttonRef}
        className={css.dataCatalogMetadataChip}
        aria-label={actionLabel}
        onClick={() => {
          onSelect(value);
        }}
      >
        {value}
      </UnstyledButton>
    </li>
  );
}

/** The button that reveals the chips past the first few. */
function _MoreButton({
  label,
  ariaLabel,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
}): ReactNode {
  return (
    <li>
      <UnstyledButton
        className={css.dataCatalogMetadataChipsMore}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {label}
      </UnstyledButton>
    </li>
  );
}

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
  const firstRevealedChipRef = useRef<HTMLButtonElement>(null);

  // The clicked more button is gone, so focus the first chip it revealed.
  useEffect(() => {
    if (isShowingAll) {
      firstRevealedChipRef.current?.focus();
    }
  }, [isShowingAll]);

  return (
    <ul className={css.dataCatalogMetadataChips}>
      {shownValues.map((value, index) => {
        return (
          <_Chip
            key={value}
            value={value}
            actionLabel={getActionLabel(value)}
            buttonRef={index === numVisible ? firstRevealedChipRef : undefined}
            onSelect={onSelect}
          />
        );
      })}
      {numHidden > 0 ? (
        <_MoreButton
          label={t`+${numHidden} more`}
          ariaLabel={t`Show ${numHidden} more`}
          onClick={() => {
            setIsShowingAll(true);
          }}
        />
      ) : null}
    </ul>
  );
}
