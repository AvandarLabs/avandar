import { STOCK_CATALOG, STOCK_CATEGORIES } from "../../stock/catalog";
import type { ReactNode } from "react";

/** Introduction and size of the current motion collection. */
export function GalleryIntroduction(): ReactNode {
  return (
    <section className="library-intro" aria-labelledby="page-title">
      <div className="intro-copy">
        <p className="eyebrow">
          <span className="tiny-dot" />
          THE MOTION REFERENCE COLLECTION
        </p>
        <h1 id="page-title">
          Motion, with <em>meaning.</em>
        </h1>
        <p>
          Small movements. Clear ideas. {STOCK_CATALOG.length} reusable motion
          presets for the moments a screenshot can’t explain.
        </p>
      </div>
      <div
        className="collection-stamp"
        aria-label={`${STOCK_CATALOG.length} presets in ${STOCK_CATEGORIES.length} families`}
      >
        <span className="stamp-top">CURATED COLLECTION</span>
        <strong>
          {String(STOCK_CATALOG.length).padStart(2, "0")}
          <span>/</span>
        </strong>
        <div>
          <span>MOTION PRESETS</span>
          <span>
            {String(STOCK_CATEGORIES.length).padStart(2, "0")} FAMILIES
          </span>
        </div>
      </div>
    </section>
  );
}
