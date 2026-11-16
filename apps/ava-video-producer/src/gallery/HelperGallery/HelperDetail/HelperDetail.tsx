import { HELPER_CATALOG } from "../helperCatalog";
import { CodeBlock } from "./CodeBlock";
import css from "./HelperDetail.module.css";
import { HelperReference } from "./HelperReference";
import type { HelperEntry } from "../helperCatalog.types";

/** The selected helper's purpose, API, usage and guidance. */
export function HelperDetail({ helper }: { helper: HelperEntry }) {
  const category = HELPER_CATALOG.categories.find(
    (item) => item.id === helper.category,
  );
  return (
    <article className={css.detail} aria-labelledby="helper-detail-title">
      <header className={css.summary}>
        <p className={css.eyebrow}>{category ? category.title : null}</p>
        <h2 id="helper-detail-title">{helper.title}</h2>
        <p>{helper.description}</p>
      </header>
      <div className={css.columns}>
        <div className={css.main}>
          <h3>API</h3>
          <CodeBlock code={helper.signature} />
          <h3>Usage</h3>
          <CodeBlock code={helper.usage} isCopyable />
          <dl className={css.advice}>
            <div>
              <dt>Good for</dt>
              <dd>{helper.goodFor}</dd>
            </div>
            <div>
              <dt>Avoid</dt>
              <dd>{helper.avoid}</dd>
            </div>
          </dl>
        </div>
        <HelperReference helper={helper} />
      </div>
    </article>
  );
}
