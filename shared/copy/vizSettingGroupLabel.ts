import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { VizSettingGroup } from "$/models/vizs/SettingDescriptor.ts";

/** Returns the translated display heading for a viz setting group. */
export function vizSettingGroupLabel(group: VizSettingGroup): string {
  return matchLiteral(group, {
    "X axis": () => {
      return t`X axis`;
    },
    "Y axis": () => {
      return t`Y axis`;
    },
    "Category axis": () => {
      return t`Category axis`;
    },
    Legend: () => {
      return t`Legend`;
    },
    Style: () => {
      return t`Style`;
    },
    Layout: () => {
      return t`Layout`;
    },
    Grid: () => {
      return t`Grid`;
    },
    Identity: () => {
      return t`Identity`;
    },
  });
}
