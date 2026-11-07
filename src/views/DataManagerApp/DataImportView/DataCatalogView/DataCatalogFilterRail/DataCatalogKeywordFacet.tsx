import { Trans, useLingui } from "@lingui/react/macro";
import { Pill } from "@mantine/core";
import { useId } from "@mantine/hooks";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import type { ReactNode } from "react";

type Props = {
  chosenKeywords: readonly string[];
  onChange: (chosenKeywords: string[]) => void;
};

/**
 * The rail's Keywords section: each chosen keyword as a removable chip.
 * Keywords have no options to browse, since a user picks one from a dataset,
 * so the section exists only to show and undo those picks and is not
 * rendered while none is chosen.
 */
export function DataCatalogKeywordFacet({
  chosenKeywords,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  if (chosenKeywords.length === 0) {
    return null;
  }

  return (
    <div role="group" aria-labelledby={labelId}>
      <div id={labelId} className={css.dataCatalogFilterRailFacetLabel}>
        <Trans>Keywords</Trans>
      </div>
      <Pill.Group gap={6}>
        {chosenKeywords.map((keyword) => {
          return (
            <Pill
              key={keyword}
              size="sm"
              radius="sm"
              withRemoveButton
              // Pill hides its remove button from assistive tech and the tab
              // order, since inside an input Backspace removes a pill. Here
              // the button is the only way to remove one.
              removeButtonProps={{
                "aria-label": t`Remove keyword ${keyword}`,
                "aria-hidden": false,
                tabIndex: 0,
              }}
              onRemove={() => {
                onChange(
                  chosenKeywords.filter((chosenKeyword) => {
                    return chosenKeyword !== keyword;
                  }),
                );
              }}
              className={css.dataCatalogFilterRailChip}
            >
              {keyword}
            </Pill>
          );
        })}
      </Pill.Group>
    </div>
  );
}
