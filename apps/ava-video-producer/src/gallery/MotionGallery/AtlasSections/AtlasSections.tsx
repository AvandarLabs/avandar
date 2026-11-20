import { clsx } from "clsx";
import { ATLAS_SECTIONS } from "../getAtlasSection";
import css from "./AtlasSections.module.css";
import type { ReactNode } from "react";

/** The four collections in the Motion Atlas. */
export type AtlasSection = "motions" | "compositions" | "films" | "helpers";

/** Shared top-level collection navigation for every Atlas section. */
export function AtlasSections({
  section,
}: {
  section: AtlasSection;
}): ReactNode {
  return (
    <nav className={css.sections} aria-label="Atlas sections">
      {ATLAS_SECTIONS.map((item) => {
        return (
          <a
            key={item}
            href={`motion.html?section=${item}`}
            className={clsx(css.section, item === section && css.active)}
            aria-current={item === section ? "page" : undefined}
          >
            {item === "motions"
              ? "Motions"
              : item === "compositions"
                ? "Compositions"
                : item === "films"
                  ? "Sample films"
                  : "Helpers"}
          </a>
        );
      })}
    </nav>
  );
}
