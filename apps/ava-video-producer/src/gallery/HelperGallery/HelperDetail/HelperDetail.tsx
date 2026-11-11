import { Trans } from "@lingui/react/macro";
import { HELPER_CATALOG } from "../helperCatalog";
import { useHelperCopy } from "../useHelperCopy";
import { CodeBlock } from "./CodeBlock";
import css from "./HelperDetail.module.css";
import { HelperReference } from "./HelperReference";
import type { HelperEntry } from "../helperCatalog.types";

/** The selected helper's purpose, API, usage and guidance. */
export function HelperDetail({ helper }: { helper: HelperEntry }) {
  const translate = useHelperCopy();
  const category = HELPER_CATALOG.categories.find(
    (item) => item.id === helper.category,
  );
  return (
    <article className={css.detail} aria-labelledby="helper-detail-title">
      <header className={css.summary}>
        <p className={css.eyebrow}>
          {category ? translate(category.title) : null}
        </p>
        <h2 id="helper-detail-title">{translate(helper.title)}</h2>
        <p>{translate(helper.description)}</p>
      </header>
      <div className={css.columns}>
        <div className={css.main}>
          <h3>
            <Trans>API</Trans>
          </h3>
          <CodeBlock code={helper.signature} />
          <h3>
            <Trans>Usage</Trans>
          </h3>
          <CodeBlock code={helper.usage} isCopyable />
          <dl className={css.advice}>
            <div>
              <dt>
                <Trans>Good for</Trans>
              </dt>
              <dd>{translate(helper.goodFor)}</dd>
            </div>
            <div>
              <dt>
                <Trans>Avoid</Trans>
              </dt>
              <dd>{translate(helper.avoid)}</dd>
            </div>
          </dl>
        </div>
        <HelperReference helper={helper} />
      </div>
    </article>
  );
}
