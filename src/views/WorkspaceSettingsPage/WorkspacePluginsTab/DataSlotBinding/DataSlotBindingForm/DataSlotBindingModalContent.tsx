import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { DataSlotBindingForm } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingForm";
import type { ComponentProps } from "react";

type Props = Readonly<
  Omit<ComponentProps<typeof DataSlotBindingForm>, "initialDraft">
>;

/**
 * What `openDataSlotBindingModal` shows: the slot's current binding loads
 * first, then the form starts from it.
 */
export function DataSlotBindingModalContent(props: Props): JSX.Element {
  const { t } = useLingui();
  const [bindings, isLoading] = PluginDataSlotBindingClient.useGetAll({
    where: {
      installation_id: { eq: props.installation.id },
      slot_id: { eq: props.slotId },
    },
  });
  if (isLoading) {
    return (
      <Loader size="sm" role="status" aria-label={t`Loading the records`} />
    );
  }
  const binding = bindings?.[0];
  return (
    <DataSlotBindingForm
      {...props}
      initialDraft={
        binding === undefined
          ? undefined
          : {
              slotId: binding.slotId,
              sourceType: binding.sourceType,
              conceptId: binding.conceptId,
              datasetId: binding.datasetId,
              attributeMap: binding.attributeMap,
            }
      }
    />
  );
}
