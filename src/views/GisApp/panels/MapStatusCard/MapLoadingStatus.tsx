import { msg } from "@lingui/core/macro";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = { layerName: string; i18n: I18n };

/** Renders the loading message for the selected layer. */
export function MapLoadingStatus({ layerName, i18n }: Props): ReactNode {
  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(msg`Loading ${layerName}`)}
      </span>
      <span className={css.mapStatusCardBody}>
        {i18n._(msg`Running the layer's query.`)}
      </span>
    </>
  );
}
