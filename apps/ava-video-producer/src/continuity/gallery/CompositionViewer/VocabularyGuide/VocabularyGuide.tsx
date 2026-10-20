import { CONTINUITY_CATALOG } from "../../../continuityCatalog";
import { useContinuityCopy } from "../../../useContinuityCopy";
import { VocabularyControl } from "./VocabularyControl";
import css from "./VocabularyGuide.module.css";
import type { ContinuityVocabularyEntry } from "../../../continuityCatalog";

type Props = { entry: ContinuityVocabularyEntry };

/** Practical reuse guidance linked to the study's complete source argument. */
export function VocabularyGuide({ entry }: Props) {
  const translate = useContinuityCopy();
  const source = CONTINUITY_CATALOG.find(
    (film) => film.family === "films" && film.id === entry.sourceFilm,
  );
  return (
    <section
      className={css.vocabularyGuide}
      aria-label={translate("Reuse this study")}
    >
      <h3>{translate("Reuse this study")}</h3>
      <dl className={css.vocabularyGuideAdvice}>
        <div>
          <dt>{translate("Good for")}</dt>
          <dd>{translate(entry.goodFor)}</dd>
        </div>
        <div>
          <dt>{translate("Creative direction")}</dt>
          <dd>{translate(entry.creativeDirection)}</dd>
        </div>
        <div>
          <dt>{translate("Keywords / tags")}</dt>
          <dd>{entry.tags.map((tag) => translate(tag)).join(" · ")}</dd>
        </div>
        <div>
          <dt>{translate("Avoid when")}</dt>
          <dd>{translate(entry.avoid)}</dd>
        </div>
      </dl>
      <h4>{translate("Controls to adapt")}</h4>
      <p>
        {translate(
          "These paths refer to the continuity beat schema. Adjust the authored input, then inspect the result at native scale.",
        )}
      </p>
      <ul className={css.vocabularyGuideControls}>
        {entry.controls.map((control) => (
          <VocabularyControl key={control.path} control={control} />
        ))}
      </ul>
      {source && (
        <p className={css.vocabularyGuideSource}>
          {translate("See it in a full film:")}{" "}
          <a href={`?film=${encodeURIComponent(source.id)}`}>
            {translate(source.title)}
          </a>
        </p>
      )}
    </section>
  );
}
