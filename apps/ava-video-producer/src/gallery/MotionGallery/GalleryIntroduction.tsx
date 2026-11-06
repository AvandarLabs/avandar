import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import { STOCK_CATALOG, STOCK_CATEGORIES } from "../../stock/catalog";
import type { ReactNode } from "react";

/** Introduction and size of the current motion collection. */
export function GalleryIntroduction(): ReactNode {
  const { t } = useGalleryLingui();

  return (
    <section className="library-intro" aria-labelledby="page-title">
      <div className="intro-copy">
        <p className="eyebrow">
          <span className="tiny-dot" />
          <Trans>THE MOTION REFERENCE COLLECTION</Trans>
        </p>
        <h1 id="page-title">
          <Trans>
            Motion, with <em>meaning.</em>
          </Trans>
        </h1>
        <p>
          <Trans>
            Small movements. Clear ideas. {STOCK_CATALOG.length} reusable motion
            presets for the moments a screenshot can’t explain.
          </Trans>
        </p>
      </div>
      <div
        className="collection-stamp"
        aria-label={t`${STOCK_CATALOG.length} presets in ${STOCK_CATEGORIES.length} families`}
      >
        <span className="stamp-top">
          <Trans>CURATED COLLECTION</Trans>
        </span>
        <strong>
          {String(STOCK_CATALOG.length).padStart(2, "0")}
          <span>
            <Trans>/</Trans>
          </span>
        </strong>
        <div>
          <span>
            <Trans>MOTION PRESETS</Trans>
          </span>
          <span>
            <Trans>
              {String(STOCK_CATEGORIES.length).padStart(2, "0")} FAMILIES
            </Trans>
          </span>
        </div>
      </div>
    </section>
  );
}
