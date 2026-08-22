import type { ReactNode, RefCallback, RefObject } from "react";

import { useLingui } from "@lingui/react/macro";

import css from "./MapShell.module.css";
import { MapShellChrome } from "./MapShellChrome";

type Props = {
  /** The map itself, rendered as the substrate under every panel. */
  canvas: ReactNode;
  topBar: ReactNode;
  layerPanel: ReactNode;
  inspector: ReactNode;
  legend: ReactNode;
  toolCluster: ReactNode;
  statusCard: ReactNode;
  timeSlider?: ReactNode;
  furnitureBar: ReactNode;

  /** In-flow drawer docked under the map, sharing height with the canvas. */
  featureDrawer?: ReactNode;

  /** The map substrate the feature drawer measures when it resizes. */
  canvasSurfaceRef?: RefObject<HTMLDivElement | null>;

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

/**
 * Renders the map inside the app canvas with floating chrome, an in-flow
 * feature drawer, and furniture.
 */
export function MapShell({
  canvas,
  topBar,
  layerPanel,
  inspector,
  legend,
  toolCluster,
  statusCard,
  timeSlider,
  furnitureBar,
  featureDrawer,
  firstRunCard,
  mapLabel,
  isChromeHidden,
  canvasSurfaceRef,
  topBarRef,
  leftColumnRef,
  rightColumnRef,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapShell}>
      <div
        className={css.mapShellSurface}
        ref={canvasSurfaceRef}
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
          timeSlider={timeSlider}
          firstRunCard={firstRunCard}
          isChromeHidden={isChromeHidden}
          topBarRef={topBarRef}
          leftColumnRef={leftColumnRef}
          rightColumnRef={rightColumnRef}
          readOnlyHeading={t`Viewing only on this screen size.`}
          readOnlyBody={t`Pan, zoom and tap a feature to read it. To edit layers, open this map on a tablet or a laptop.`}
        />
      </div>
      {featureDrawer}
      {furnitureBar}
    </div>
  );
}
