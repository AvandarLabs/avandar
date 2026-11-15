import { propEq } from "@avandar/utils";
import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import {
  STOCK_CATALOG,
  STOCK_CATEGORIES,
  type StockPresetId,
} from "../../stock/catalog";
import { Icon, type IconName } from "./Icon";
import type { ReactNode } from "react";

const CATEGORY_ICONS: Record<string, IconName> = {
  Networks: "network",
  "Data flow": "flow",
  Code: "code",
  Charts: "chart",
  Interface: "interface",
};
type Props = {
  category: string;
  selectCategory: (value: string) => void;
  saved: StockPresetId[];
};
/** Motion families and saved-reference navigation. */
export function GalleryNavigation({
  category,
  selectCategory,
  saved,
}: Readonly<Props>): ReactNode {
  const { t } = useGalleryLingui();

  return (
    <aside className="sidebar" aria-label={t`Library navigation`}>
      <div className="sidebar-top">
        <p className="eyebrow">
          <Trans>BROWSE THE COLLECTION</Trans>
        </p>
        <button
          className={`category-button ${category === "All motions" ? "active" : ""}`}
          onClick={() => selectCategory("All motions")}
          aria-pressed={category === "All motions"}
        >
          <Icon name="grid" />
          <span>
            <Trans>All motions</Trans>
          </span>
          <span className="category-count">{STOCK_CATALOG.length}</span>
        </button>
        <div className="category-list">
          {STOCK_CATEGORIES.map((name) => (
            <button
              key={name}
              className={`category-button ${category === name ? "active" : ""}`}
              onClick={() => selectCategory(name)}
              aria-pressed={category === name}
            >
              <Icon name={CATEGORY_ICONS[name] ?? "grid"} />
              <span>{name}</span>
              <span className="category-count">
                {STOCK_CATALOG.filter(propEq("category", name)).length}
              </span>
            </button>
          ))}
        </div>
        <div className="saved-nav">
          <button
            className={`category-button ${category === "Saved references" ? "active" : ""}`}
            onClick={() => selectCategory("Saved references")}
            aria-pressed={category === "Saved references"}
          >
            <Icon name="bookmark" />
            <span>
              <Trans>Saved references</Trans>
            </span>
            <span className="category-count">{saved.length}</span>
          </button>
        </div>
      </div>
      <div className="sidebar-note">
        <span className="note-symbol" aria-hidden="true">
          <Trans>✳</Trans>
        </span>
        <h2>
          <Trans>Find the movement.</Trans>
          <br />
          <Trans>Shape the story.</Trans>
        </h2>
        <p>
          <Trans>
            Save a few references, then copy a creative brief for your next
            film.
          </Trans>
        </p>
        <div className="note-rule" />
        <span>
          <Trans>CONCEPTUAL GRAPHICS</Trans>
          <br />
          <Trans>NOT PRODUCT FOOTAGE</Trans>
        </span>
      </div>
      <div className="sidebar-bottom">
        <span className="tiny-dot" />
        <Trans>LOCAL MOTION LIBRARY</Trans>
        <span>
          <Trans>01</Trans>
        </span>
      </div>
    </aside>
  );
}
