import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { useMemo, useState } from "react";
import { uuid } from "$/lib/uuid";
import { AppView } from "@/components/layouts/AppView/AppView";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { CrosswalkFlowView } from "@/views/DataManagerApp/CrosswalkView/CrosswalkFlowView/CrosswalkFlowView";
import { CrosswalkNoAccess } from "@/views/DataManagerApp/CrosswalkView/CrosswalkNoAccess";
import { useCrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import { useCrosswalkContents } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkContents/useCrosswalkContents";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

type Props = {
  /** Undefined for a new crosswalk. */
  crosswalkId: Crosswalk.Id | undefined;
};

function CrosswalkLoading({ label }: Readonly<{ label: string }>): ReactNode {
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Loader size="sm" role="status" aria-label={label} />
      </Center>
    </AppView>
  );
}

function CrosswalkUnavailable(
  props: Readonly<{ title: string; message: string }>,
): ReactNode {
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Callout maw={520} title={props.title} message={props.message} />
      </Center>
    </AppView>
  );
}

/**
 * A crosswalk that does not exist yet, saved for the first time from Choose
 * datasets.
 */
function NewCrosswalk(): ReactNode {
  const { t } = useLingui();
  const [initialDraft] = useState(() => {
    return CrosswalkDraft.makeEmpty({
      crosswalkId: uuid<Crosswalk.Id>(),
      name: t`Untitled crosswalk`,
    });
  });
  return (
    <CrosswalkFlowView
      crosswalk={undefined}
      initialDraft={initialDraft}
      isSaved={false}
    />
  );
}

/**
 * A saved crosswalk, opened once its tables and the datasets it maps have
 * loaded.
 */
function SavedCrosswalk({
  crosswalkId,
}: Readonly<{ crosswalkId: Crosswalk.Id }>): ReactNode {
  const { t } = useLingui();
  const { status, contents } = useCrosswalkContents(crosswalkId);
  const datasetIds = useMemo(() => {
    return (contents?.datasets ?? []).map((membership) => {
      return membership.datasetId;
    });
  }, [contents]);
  const catalog = useCrosswalkCatalog(datasetIds);
  const { datasetsById } = catalog.context;
  const initialDraft = useMemo(() => {
    return contents && !catalog.isLoading
      ? CrosswalkDraft.fromContents(contents, { datasetsById })
      : undefined;
  }, [contents, catalog.isLoading, datasetsById]);
  if (status === "failed") {
    return (
      <CrosswalkUnavailable
        title={t`Crosswalk failed to load`}
        message={t`The crosswalk failed to load. Please try again later or reach out to support.`}
      />
    );
  }
  if (status === "missing") {
    return (
      <CrosswalkUnavailable
        title={t`This crosswalk no longer exists`}
        message={t`It may have been deleted. Open another one from Data Sources.`}
      />
    );
  }
  if (!contents || !initialDraft) {
    return <CrosswalkLoading label={t`Loading the crosswalk`} />;
  }
  return (
    <CrosswalkFlowView
      crosswalk={contents.crosswalk}
      initialDraft={initialDraft}
      isSaved
    />
  );
}

/**
 * A crosswalk: many datasets with different column layouts mapped onto one
 * reference layout, one layout at a time, and saved as a combined dataset.
 * Opened from Data Sources' New crosswalk or its Crosswalks list. Only
 * someone who can edit crosswalks gets in, and nothing is read before that
 * is checked.
 */
export function CrosswalkView({ crosswalkId }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [, areRolesLoading] = useUserAppRoles();
  const canEditCrosswalks = useHasPermission(
    "data_sources__can_edit_crosswalks",
  );
  if (areRolesLoading) {
    return <CrosswalkLoading label={t`Checking your access`} />;
  }
  if (!canEditCrosswalks) {
    return <CrosswalkNoAccess />;
  }
  return crosswalkId ? (
    <SavedCrosswalk crosswalkId={crosswalkId} />
  ) : (
    <NewCrosswalk />
  );
}
