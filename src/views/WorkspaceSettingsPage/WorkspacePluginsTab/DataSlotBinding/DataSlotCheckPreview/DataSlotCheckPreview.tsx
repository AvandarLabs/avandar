import { useQuery } from "@avandar/query-hooks";
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { checkDataSlotBinding } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import { DataSlotCheckSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSummary";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  source: DataSlotSource;

  /** The field behind each attribute, from a `bound` binding status. */
  fieldsByAttributeKey: Readonly<
    Record<string, DataSlotSourceField | undefined>
  >;
}>;

function useDataSlotCheck(
  props: Props,
): UseQueryResultTuple<DataSlotCheckResult> {
  const { slot, source, fieldsByAttributeKey } = props;
  const workspace = useCurrentWorkspace();
  return useQuery({
    // Keyed by content, so the check runs again whenever the source or a
    // mapped field changes.
    queryKey: [
      "pluginDataSlots",
      "check",
      workspace.id,
      slot,
      source,
      fieldsByAttributeKey,
    ],
    queryFn: () => {
      return checkDataSlotBinding({
        workspaceId: workspace.id,
        slot,
        source,
        fieldsByAttributeKey,
      });
    },
    // The sample holds workspace records, so it is never written to disk.
    meta: { persist: false },
    retry: false,
  });
}

/**
 * Runs a data slot's query on the mapping an admin is choosing and shows
 * what it reads: the row count, how many rows fill each attribute, and the
 * first rows. It runs again whenever the source or a mapped field changes.
 * A data slot panel shows it once every required attribute has a field.
 */
export function DataSlotCheckPreview(props: Props): JSX.Element {
  const { t } = useLingui();
  const [result, isLoading, query] = useDataSlotCheck(props);
  if (isLoading) {
    return (
      <Group gap="xs" role="status">
        <Loader size="xs" aria-hidden />
        <Text size="sm">{t`Checking these records`}</Text>
      </Group>
    );
  }
  if (result === undefined) {
    const reason = query.error?.message ?? "";
    return (
      <Callout
        messageSize="sm"
        message={t`Could not read these records. ${reason}`}
      />
    );
  }
  return <DataSlotCheckSummary {...props} result={result} />;
}
