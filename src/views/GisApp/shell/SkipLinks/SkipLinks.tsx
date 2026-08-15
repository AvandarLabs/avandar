import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/shell/SkipLinks/SkipLinks.module.css";
import type { MouseEvent, ReactNode } from "react";

type Props = { isChromeHidden: boolean };

/**
 * Element ids the skip links target. Exported so the panels that own them
 * cannot drift from the links that point at them.
 */
export const GIS_SKIP_TARGET_IDS = {
  inspectorBody: "gis-inspector-body",
  toolCluster: "gis-map-tools",
} as const;

function _focusHashTarget(event: MouseEvent<HTMLAnchorElement>): void {
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (target instanceof HTMLElement) {
    target.focus();
  }
}

/** Two links, hidden until focused, that jump past the layer stack. */
export function SkipLinks({ isChromeHidden }: Props): ReactNode {
  const { t } = useLingui();
  if (isChromeHidden) {
    return null;
  }

  return (
    <div className={css.skipLinks}>
      <a
        className={css.skipLink}
        href={`#${GIS_SKIP_TARGET_IDS.inspectorBody}`}
        onClick={_focusHashTarget}
      >
        {t`Skip to layer settings`}
      </a>
      <a
        className={css.skipLink}
        href={`#${GIS_SKIP_TARGET_IDS.toolCluster}`}
        onClick={_focusHashTarget}
      >
        {t`Skip to map tools`}
      </a>
    </div>
  );
}
