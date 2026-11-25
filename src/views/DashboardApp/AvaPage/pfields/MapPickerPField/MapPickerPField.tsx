import { Select } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

type Props = AvaPageFieldProps<AvaMap.Id | undefined>;

/** Picks which of the workspace's maps a Map block shows. */
export function MapPickerPField({
  value,
  onChange,
  readOnly,
}: Props): ReactElement {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [avaMaps = [], isLoading] = AvaMapClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  return (
    <Select
      label={t`Map`}
      placeholder={isLoading ? t`Loading maps` : t`Pick a map`}
      data={avaMaps.map((avaMap) => {
        return { value: avaMap.id, label: avaMap.name };
      })}
      value={value ?? null}
      searchable
      nothingFoundMessage={t`No maps match`}
      disabled={readOnly}
      onChange={(selectedId) => {
        onChange(
          avaMaps.find((avaMap) => {
            return avaMap.id === selectedId;
          })?.id,
        );
      }}
    />
  );
}
