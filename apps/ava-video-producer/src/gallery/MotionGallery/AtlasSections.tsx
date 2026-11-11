import { Trans, useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { CONTINUITY_CATALOG } from "../../continuity/continuityCatalog";
import css from "./AtlasSections.module.css";

/** The four collections in the Motion Atlas. */
export type AtlasSection = "motions" | "compositions" | "films" | "helpers";

/** Every Atlas section, in navigation order. */
const ATLAS_SECTIONS: readonly AtlasSection[] = [
  "motions",
  "compositions",
  "films",
  "helpers",
];

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
  if (parameters.has("helper")) {
    return "helpers";
  }
  return ATLAS_SECTIONS.find((item) => item === section) ?? "motions";
}

/** Shared top-level collection navigation for every Atlas section. */
export function AtlasSections({ section }: { section: AtlasSection }) {
  const { t } = useLingui();
  return (
    <nav className={css.sections} aria-label={t`Atlas sections`}>
      {ATLAS_SECTIONS.map((item) => (
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
          ) : item === "films" ? (
            <Trans>Sample films</Trans>
          ) : (
            <Trans>Helpers</Trans>
          )}
        </a>
      ))}
    </nav>
  );
}
