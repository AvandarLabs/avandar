import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { AtlasCard } from "../../../gallery/AtlasLayout/AtlasCard/AtlasCard";
import { isSceneEntry } from "../../continuityCatalog";
import { useContinuityCopy } from "../../useContinuityCopy";
import css from "./CompositionCard.module.css";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = {
  entry: ContinuityCatalogEntry;
  category: string;
  onOpen: (id: string) => void;
};

/**
 * A composition or sample film card. Its thumbnail is the tracked poster
 * that `pnpm atlas:posters` renders from the live composition; the live
 * player itself opens in the preview modal.
 */
export function CompositionCard({ entry, category, onOpen }: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const [isPosterMissing, setPosterMissing] = useState(false);
  const seconds = Math.round(entry.frames / 30);
  return (
    <AtlasCard
      title={translate(entry.title)}
      category={category}
      description={translate(entry.description)}
      reference={entry.id}
      badge={
        <span className="card-state">
          <i />
          {isSceneEntry(entry) ? t`STORYBOARD SCENES` : t`CONTINUITY`} ·{" "}
          {t`${seconds} SEC`}
        </span>
      }
      thumbnail={
        isPosterMissing ? (
          <span className={css.missing}>{t`NO POSTER YET`}</span>
        ) : (
          <img
            className={css.poster}
            src={`assets/atlas/${entry.id}.jpg`}
            alt=""
            loading="lazy"
            onError={() => setPosterMissing(true)}
          />
        )
      }
      onOpen={() => onOpen(entry.id)}
    />
  );
}
