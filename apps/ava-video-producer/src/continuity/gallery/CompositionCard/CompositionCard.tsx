import { AtlasCard } from "../../../gallery/AtlasLayout/AtlasCard/AtlasCard";
import { isSceneEntry } from "../../isSceneEntry";
import { PosterThumbnail } from "./PosterThumbnail/PosterThumbnail";
import type { ContinuityCatalogEntry } from "../../isSceneEntry";
import type { ReactNode } from "react";

type Props = {
  entry: ContinuityCatalogEntry;
  category: string;
  /** The active video theme. A theme with no poster shows the `classic` one. */
  themeId?: string;
  onOpen: (id: string) => void;
};

/**
 * A composition or sample film card. Its thumbnail is the tracked poster
 * that `pnpm atlas:posters --theme <id>` renders from the live composition,
 * falling back to the `classic` poster with a badge when the active theme
 * has none. The live player itself opens in the preview modal.
 */
export function CompositionCard({
  entry,
  category,
  themeId = "classic",
  onOpen,
}: Props): ReactNode {
  const seconds = Math.round(entry.frames / 30);
  return (
    <AtlasCard
      title={entry.title}
      category={category}
      description={entry.description}
      reference={entry.id}
      badge={
        <span className="card-state">
          <i />
          {isSceneEntry(entry) ? "STORYBOARD SCENES" : "CONTINUITY"} ·{" "}
          {`${seconds} SEC`}
        </span>
      }
      thumbnail={<PosterThumbnail id={entry.id} themeId={themeId} />}
      onOpen={() => {
        return onOpen(entry.id);
      }}
    />
  );
}
