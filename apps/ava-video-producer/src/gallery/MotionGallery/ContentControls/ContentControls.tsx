import { Trans } from "@lingui/react/macro";
import { stockContracts } from "../../../stock/registry/stockContracts";
import styles from "./ContentControls.module.css";
import {
  type ContentDraft,
  ContentDraftModule,
} from "./ContentDraftModule/ContentDraftModule";
import { ContentFeedback } from "./ContentFeedback/ContentFeedback";
import { ContentField } from "./ContentField/ContentField";
import type { StockPresetId } from "../../../stock/contracts/StockContract.types";
import type { ReactNode } from "react";
/** Inputs for ContentControls. */
type Props = {
  preset: StockPresetId;
  state: ContentDraft;
  onChange: (state: ContentDraft) => void;
};

/**
 * Bounded content editors keep invalid drafts and valid preview input separate.
 */
export function ContentControls({
  preset,
  state,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <section
      className={styles.contentControlsEditor}
      aria-labelledby="content-heading"
    >
      <div className={styles.contentControlsHeading}>
        <h3 id="content-heading">
          <Trans>Content</Trans>
        </h3>
        <button
          onClick={() => onChange(ContentDraftModule.resetFromPreset(preset))}
        >
          <Trans>Reset content</Trans>
        </button>
      </div>
      <p className={styles.contentControlsHelp}>
        <Trans>
          Edit this preset for the current visit. Preview, copied JSON, and
          download use the same validated content.
        </Trans>
      </p>
      {stockContracts[preset].controls.map((control) => (
        <ContentField
          key={control.path}
          control={control}
          parentPath={[]}
          itemPath={[]}
          preset={preset}
          state={state}
          onChange={onChange}
        />
      ))}
      <ContentFeedback state={state} />
    </section>
  );
}
