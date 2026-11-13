import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Center,
  CloseButton,
  Group,
  Loader,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import css from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/ApplyPreviewDrawer.module.css";
import { buildPreviewColumns } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/previewColumns";
import { PreviewTable } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/PreviewTable";
import {
  PREVIEW_ROW_COUNT,
  usePreviewRows,
} from "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { PreviewColumnPlan } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/previewColumns";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { PreviewRow } from "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { ReactNode } from "react";

/** The drawer's id, for the Preview data button's `aria-controls`. */
export const PREVIEW_DRAWER_ID = "apply-dictionaries-preview";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  flow: ApplyFlow;
  lookups: ApplyLookups;
  onClose: () => void;
};

/** Every column's plan, from the picks, resolutions, and unmatched values. */
function usePreviewPlans(props: Readonly<Props>): PreviewColumnPlan[] {
  const { columns, flow, lookups } = props;
  const { picks, resolutions } = flow.state;
  const { unmatched } = flow;
  return useMemo(() => {
    return buildPreviewColumns({
      columns,
      picks,
      codeLists: lookups.codeLists,
      resolutions,
      unmatchedByColumnId:
        unmatched.status === "ready" ? unmatched.result : new Map(),
    });
  }, [columns, picks, resolutions, unmatched, lookups.codeLists]);
}

function DrawerHeader(
  props: Readonly<{
    headingId: string;
    isOnlyTouched: boolean;
    onOnlyTouchedChange: (isOnlyTouched: boolean) => void;
    onClose: () => void;
  }>,
): ReactNode {
  const { t, i18n } = useLingui();
  const rowCountText = i18n.number(PREVIEW_ROW_COUNT);
  return (
    <Group
      className={css.applyPreviewHeader}
      justify="space-between"
      wrap="nowrap"
    >
      <Group gap="xs" align="baseline" wrap="nowrap">
        <Title order={2} size="h6" id={props.headingId}>
          <Trans>Preview data</Trans>
        </Title>
        <Text size="xs" c="dimmed">
          {t`First ${rowCountText} rows`}
        </Text>
      </Group>
      <Group gap="md" wrap="nowrap">
        <Switch
          size="xs"
          label={t`Only columns this touches`}
          checked={props.isOnlyTouched}
          onChange={(event) => {
            props.onOnlyTouchedChange(event.currentTarget.checked);
          }}
        />
        <CloseButton aria-label={t`Close preview`} onClick={props.onClose} />
      </Group>
    </Group>
  );
}

function DrawerBody(
  props: Readonly<{
    rows: TaggedRead<PreviewRow[]>;
    shown: ReadonlyArray<{ index: number; plan: PreviewColumnPlan }>;
  }>,
): ReactNode {
  const { t } = useLingui();
  if (props.rows.status === "reading") {
    return (
      <Center p="lg">
        <Loader size="sm" />
      </Center>
    );
  }
  if (props.rows.status === "failed") {
    return (
      <Center p="lg">
        <Callout
          maw={520}
          title={t`The preview could not be read`}
          message={t`Avandar could not read this dataset's first rows. Saving still works.`}
        />
      </Center>
    );
  }
  return <PreviewTable shown={props.shown} rows={props.rows.result} />;
}

/**
 * The preview drawer: the dataset's first rows as they would look if saved
 * now, open at any step. It takes focus when it opens and closes on
 * Escape; the flow returns focus to Preview data.
 */
export function ApplyPreviewDrawer(props: Readonly<Props>): ReactNode {
  const headingId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const [isOnlyTouched, setIsOnlyTouched] = useState(false);
  const plans = usePreviewPlans(props);
  const rows = usePreviewRows({
    dataset: props.dataset,
    columns: plans,
    isEnabled: true,
  });
  useEffect(() => {
    regionRef.current?.focus();
  }, []);
  const shown = plans.flatMap((plan, index) => {
    return !isOnlyTouched || plan.isTouched ? [{ index, plan }] : [];
  });
  return (
    <section
      id={PREVIEW_DRAWER_ID}
      ref={regionRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={css.applyPreviewDrawer}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          props.onClose();
        }
      }}
    >
      <DrawerHeader
        headingId={headingId}
        isOnlyTouched={isOnlyTouched}
        onOnlyTouchedChange={setIsOnlyTouched}
        onClose={props.onClose}
      />
      <div className={css.applyPreviewBody}>
        <DrawerBody rows={rows} shown={shown} />
      </div>
    </section>
  );
}
