import { Select } from "@avandar/ui";
import { isPlainObject } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuidType } from "$/lib/zodHelpers";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactElement } from "react";

type Props = AvaPageFieldProps<MapViewerCamera>;

/** Select value standing for the map's saved view. */
const SAVED_VIEW_VALUE = "saved";

/** Reads the picked map id the block config puts in this field's metadata. */
function _getMapIdFromFieldMetadata(metadata: unknown): AvaMap.Id | undefined {
  const parsed = uuidType<AvaMap.Id>().safeParse(
    isPlainObject(metadata) ? metadata.mapId : undefined,
  );
  return parsed.success ? parsed.data : undefined;
}

function _selectValueToCamera(
  options: Readonly<{
    selectedValue: string | null;
    bookmarks: readonly AvaMapConfig.Bookmark[];
  }>,
): MapViewerCamera {
  const bookmark = options.bookmarks.find((candidate) => {
    return candidate.id === options.selectedValue;
  });
  return bookmark
    ? { type: "bookmark", bookmarkId: bookmark.id }
    : { type: "saved" };
}

/** Picks whether a Map block opens on the map's saved view or a bookmark. */
export function MapViewPField({
  field,
  value,
  onChange,
  readOnly,
}: Props): ReactElement {
  const { t } = useLingui();
  const mapId = _getMapIdFromFieldMetadata(field.metadata);
  const [avaMap] = AvaMapClient.useGetById({
    id: mapId,
    useQueryOptions: { enabled: mapId !== undefined },
  });
  const bookmarks = avaMap?.config.bookmarks ?? [];
  return (
    <Select
      label={t`Opens on`}
      data={[
        { value: SAVED_VIEW_VALUE, label: t`The map's saved view` },
        ...bookmarks.map((bookmark) => {
          return { value: bookmark.id, label: bookmark.name };
        }),
      ]}
      value={value.type === "saved" ? SAVED_VIEW_VALUE : value.bookmarkId}
      allowDeselect={false}
      disabled={readOnly || mapId === undefined}
      onChange={(selectedValue) => {
        onChange(_selectValueToCamera({ selectedValue, bookmarks }));
      }}
    />
  );
}
