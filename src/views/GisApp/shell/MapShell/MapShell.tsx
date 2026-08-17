import { useLingui } from "@lingui/react/macro";
import css from "./MapShell.module.css";
import { MapShellChrome } from "./MapShellChrome";
import type { ReactNode, RefCallback } from "react";

type Props = {
  /** The map itself, rendered as the substrate under every panel. */
  canvas: ReactNode;
  topBar: ReactNode;
  layerPanel: ReactNode;
  inspector: ReactNode;
  legend: ReactNode;
  toolCluster: ReactNode;
  statusCard: ReactNode;
  furnitureBar: ReactNode;

  /** Centred over the map, shown only when the map has no layers. */
  firstRunCard: ReactNode;

  /** Name announced for the map region, e.g. "Map of Cholera response". */
  mapLabel: string;

  /** Whether floating map chrome, including skip links, is hidden. */
  isChromeHidden: boolean;

  topBarRef: RefCallback<HTMLDivElement>;
  leftColumnRef: RefCallback<HTMLDivElement>;
  rightColumnRef: RefCallback<HTMLDivElement>;
};

/** Renders the full-bleed map with floating chrome and a furniture strip. */
export function MapShell({
  canvas,
  topBar,
  layerPanel,
  inspector,
  legend,
  toolCluster,
  statusCard,
  furnitureBar,
  firstRunCard,
  mapLabel,
  isChromeHidden,
  topBarRef,
  leftColumnRef,
  rightColumnRef,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapShell}>
      <div
        className={css.mapShellSurface}
        role="region"
        aria-label={t`${mapLabel}. Use the layer panel to change what is shown.`}
      >
        {canvas}
        <MapShellChrome
          topBar={topBar}
          layerPanel={layerPanel}
          inspector={inspector}
          legend={legend}
          toolCluster={toolCluster}
          statusCard={statusCard}
          firstRunCard={firstRunCard}
          isChromeHidden={isChromeHidden}
          topBarRef={topBarRef}
          leftColumnRef={leftColumnRef}
          rightColumnRef={rightColumnRef}
          readOnlyHeading={t`Viewing only on this screen size.`}
          readOnlyBody={t`Pan, zoom and tap a feature to read it. To edit layers, open this map on a tablet or a laptop.`}
        />
      </div>
      {furnitureBar}
    </div>
  );
}
