import css from "@/views/GisApp/shell/MapShell/MapShell.module.css";
import { SkipLinks } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import type { ReactNode, RefCallback } from "react";

type Props = {
  topBar: ReactNode;
  layerPanel: ReactNode;
  inspector: ReactNode;
  legend: ReactNode;
  toolCluster: ReactNode;
  statusCard: ReactNode;
  firstRunCard: ReactNode;
  isChromeHidden: boolean;
  topBarRef: RefCallback<HTMLDivElement>;
  leftColumnRef: RefCallback<HTMLDivElement>;
  rightColumnRef: RefCallback<HTMLDivElement>;
  readOnlyHeading: string;
  readOnlyBody: string;
};

/** Renders floating map chrome over the canvas, or hides it when requested. */
export function MapShellChrome({
  topBar,
  layerPanel,
  inspector,
  legend,
  toolCluster,
  statusCard,
  firstRunCard,
  isChromeHidden,
  topBarRef,
  leftColumnRef,
  rightColumnRef,
  readOnlyHeading,
  readOnlyBody,
}: Props): ReactNode {
  return (
    <div className={css.mapShellChrome}>
      <SkipLinks isChromeHidden={isChromeHidden} />
      <div className={css.mapShellReadOnlyNotice} role="status">
        <span>
          <strong>{readOnlyHeading}</strong> {readOnlyBody}
        </span>
      </div>
      {isChromeHidden ? null : (
        <>
          <div className={css.mapShellTopBar} ref={topBarRef}>
            {topBar}
          </div>
          {firstRunCard ?
            <div className={css.mapShellFirstRun}>{firstRunCard}</div>
          : null}
          <div className={css.mapShellLeftColumn} ref={leftColumnRef}>
            {layerPanel}
          </div>
          <div className={css.mapShellRightColumn} ref={rightColumnRef}>
            {inspector}
          </div>
          <div className={css.mapShellBottomLeft}>{legend}</div>
          <div className={css.mapShellBottomCenter}>
            {statusCard}
            {toolCluster}
          </div>
        </>
      )}
    </div>
  );
}
