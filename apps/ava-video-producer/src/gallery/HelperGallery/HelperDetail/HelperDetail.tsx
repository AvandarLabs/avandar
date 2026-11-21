import { propEq } from "@avandar/utils";
import { HELPER_CATALOG } from "../HelperFilmIds";
import { CodeBlock } from "./CodeBlock/CodeBlock";
import css from "./HelperDetail.module.css";
import { HelperReference } from "./HelperReference/HelperReference";
import type { HelperEntry } from "../helperCatalog.types";
import type { ReactNode } from "react";

type Props = { helper: HelperEntry };

/** The selected helper's purpose, API, usage and guidance. */
export function HelperDetail({ helper }: Readonly<Props>): ReactNode {
  const category = HELPER_CATALOG.categories.find(
    propEq("id", helper.category),
  );
  return (
    <article
      className={css.helperDetailDetail}
      aria-labelledby="helper-detail-title"
    >
      <header className={css.helperDetailSummary}>
        <p className={css.helperDetailEyebrow}>
          {category ? category.title : null}
        </p>
        <h2 id="helper-detail-title">{helper.title}</h2>
        <p>{helper.description}</p>
      </header>
      <div className={css.helperDetailColumns}>
        <div className={css.helperDetailMain}>
          <h3>API</h3>
          <CodeBlock code={helper.signature} />
          <h3>Usage</h3>
          <CodeBlock code={helper.usage} isCopyable />
          <dl className={css.helperDetailAdvice}>
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
