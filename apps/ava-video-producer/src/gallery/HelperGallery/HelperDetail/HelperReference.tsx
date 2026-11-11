import { Trans } from "@lingui/react/macro";
import css from "./HelperDetail.module.css";
import type { HelperEntry } from "../helperCatalog.types";

/** Where app-relative source paths are browsable. */
const SOURCE_BASE_URL =
  "https://github.com/AvandarLabs/avandar/blob/develop/apps/ava-video-producer/";

/** A link to one app-relative source file. */
function SourceLink({ path }: { path: string }) {
  return (
    <a href={`${SOURCE_BASE_URL}${path}`} target="_blank" rel="noreferrer">
      <code>{path}</code>
    </a>
  );
}

/** The helper's named defaults, or a note that it has none. */
function DefaultsList({ helper }: { helper: HelperEntry }) {
  if (!helper.defaults.length) {
    return (
      <p className={css.muted}>
        <Trans>
          No defaults: the value is fixed or every argument is required.
        </Trans>
      </p>
    );
  }
  return (
    <dl className={css.defaults}>
      {helper.defaults.map((item) => (
        <div key={item.name}>
          <dt>{item.name}</dt>
          <dd>
            <code>{item.value}</code>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Links to the files that import the helper, or a note that none do. */
function UsedByList({ helper }: { helper: HelperEntry }) {
  if (!helper.usedBy.length) {
    return (
      <p className={css.muted}>
        <Trans>No scene imports it yet.</Trans>
      </p>
    );
  }
  return (
    <ul className={css.links}>
      {helper.usedBy.map((path) => (
        <li key={path}>
          <SourceLink path={path} />
        </li>
      ))}
    </ul>
  );
}

/** Exports, defaults, consumers and source of the selected helper. */
export function HelperReference({ helper }: { helper: HelperEntry }) {
  return (
    <aside className={css.reference}>
      <h3>
        <Trans>Exports</Trans>
      </h3>
      <ul className={css.exports}>
        {helper.exports.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <h3>
        <Trans>Defaults</Trans>
      </h3>
      <DefaultsList helper={helper} />
      <h3>
        <Trans>Used by</Trans>
      </h3>
      <UsedByList helper={helper} />
      <h3>
        <Trans>Source</Trans>
      </h3>
      <SourceLink path={helper.source} />
    </aside>
  );
}
