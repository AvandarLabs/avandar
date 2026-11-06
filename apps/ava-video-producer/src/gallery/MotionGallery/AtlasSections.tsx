import { Trans, useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { CONTINUITY_CATALOG } from "../../continuity/continuityCatalog";
import css from "./AtlasSections.module.css";

/** The three collections in the Motion Atlas. */
export type AtlasSection = "motions" | "compositions" | "films";

/** Read deep links, including composition links authored before section routing. */
export function getAtlasSection(): AtlasSection {
  const parameters = new URLSearchParams(location.search);
  const entry = CONTINUITY_CATALOG.find(
    (item) => item.id === parameters.get("film"),
  );
  if (entry) {
    return entry.family === "films" ? "films" : "compositions";
  }
  const section = parameters.get("section");
  return section === "compositions" || section === "films"
    ? section
    : "motions";
}

/** Shared top-level collection navigation for every Atlas section. */
export function AtlasSections({ section }: { section: AtlasSection }) {
  const { t } = useLingui();
  return (
    <nav className={css.sections} aria-label={t`Atlas sections`}>
      {(["motions", "compositions", "films"] as const).map((item) => (
        <a
          key={item}
          href={`motion.html?section=${item}`}
          className={clsx(css.section, item === section && css.active)}
          aria-current={item === section ? "page" : undefined}
        >
          {item === "motions" ? (
            <Trans>Motions</Trans>
          ) : item === "compositions" ? (
            <Trans>Compositions</Trans>
          ) : (
            <Trans>Sample films</Trans>
          )}
        </a>
      ))}
    </nav>
  );
}
