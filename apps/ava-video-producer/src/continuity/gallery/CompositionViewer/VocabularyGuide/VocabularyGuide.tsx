import { CONTINUITY_CATALOG, isSceneEntry } from "../../../continuityCatalog";
import { VocabularyControl } from "./VocabularyControl";
import css from "./VocabularyGuide.module.css";
import type { ContinuityVocabularyEntry } from "../../../continuityCatalog";

type Props = { entry: ContinuityVocabularyEntry };

/** Practical reuse guidance linked to the study's complete source argument. */
export function VocabularyGuide({ entry }: Props) {
  const source = CONTINUITY_CATALOG.find(
    (film) => film.family === "films" && film.id === entry.sourceFilm,
  );
  return (
    <section className={css.vocabularyGuide} aria-label={"Reuse this study"}>
      <h3>{"Reuse this study"}</h3>
      <dl className={css.vocabularyGuideAdvice}>
        <div>
          <dt>{"Good for"}</dt>
          <dd>{entry.goodFor}</dd>
        </div>
        <div>
          <dt>{"Creative direction"}</dt>
          <dd>{entry.creativeDirection}</dd>
        </div>
        <div>
          <dt>{"Keywords / tags"}</dt>
          <dd>{entry.tags.map((tag) => tag).join(" · ")}</dd>
        </div>
        <div>
          <dt>{"Avoid when"}</dt>
          <dd>{entry.avoid}</dd>
        </div>
      </dl>
      <h4>{"Controls to adapt"}</h4>
      <p>
        {isSceneEntry(entry)
          ? "These paths are fields of a storyboard shot: its scene props, transition and theme. Adjust the plan in storyboards/vocabulary, then validate and preview it with the video CLI."
          : "These paths refer to the continuity beat schema. Adjust the authored input, then inspect the result at native scale."}
      </p>
      <ul className={css.vocabularyGuideControls}>
        {entry.controls.map((control) => (
          <VocabularyControl key={control.path} control={control} />
        ))}
      </ul>
      {source && (
        <p className={css.vocabularyGuideSource}>
          {"See it in a full film:"}{" "}
          <a href={`?film=${encodeURIComponent(source.id)}`}>{source.title}</a>
        </p>
      )}
    </section>
  );
}
