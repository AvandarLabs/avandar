import { clsx } from "clsx";
import { AtlasSectionNames, type AtlasSectionName } from "./AtlasSectionNames";
import css from "./AtlasSections.module.css";
import type { ReactNode } from "react";

type Props = {
  section: AtlasSection;
};

/** The four collections in the Motion Atlas. */
export type AtlasSection = AtlasSectionName;

/** Shared top-level collection navigation for every Atlas section. */
export function AtlasSections({ section }: Readonly<Props>): ReactNode {
  return (
    <nav className={css.atlasSectionsSections} aria-label="Atlas sections">
      {AtlasSectionNames.values.map((item) => {
        return (
          <a
            key={item}
            href={`motion.html?section=${item}`}
            className={clsx(
              css.atlasSectionsSection,
              item === section && css.atlasSectionsActive,
            )}
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
