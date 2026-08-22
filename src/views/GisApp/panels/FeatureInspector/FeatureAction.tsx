import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

import { isNullish } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";

import { isSafePopupUrlTemplate } from "$/models/AvaMap/AvaMapConfig/isSafePopupUrlTemplate";

type Props = {
  action: MapLayer.PopupAction | undefined;
  properties: Readonly<Record<string, unknown>>;
};

/** Fills `{columnName}` placeholders from a feature's properties. */
function _buildActionUrl(
  options: Readonly<{
    urlTemplate: string;
    properties: Readonly<Record<string, unknown>>;
  }>,
): string {
  const { urlTemplate, properties } = options;
  return urlTemplate.replace(/\{([^}]+)\}/g, (placeholder, columnName) => {
    const value = properties?.[columnName];
    return isNullish(value) ? placeholder : encodeURIComponent(String(value));
  });
}

/** Links to the selected feature's configured record action. */
export function FeatureAction({ action, properties }: Props): ReactNode {
  const { t } = useLingui();
  if (
    !action ||
    action.urlTemplate === "" ||
    !isSafePopupUrlTemplate(action.urlTemplate)
  ) {
    return null;
  }
  return (
    <Anchor
      href={_buildActionUrl({ urlTemplate: action.urlTemplate, properties })}
      target="_blank"
      rel="noreferrer"
      size="sm"
    >
      {action.label === "" ? t`Open the record` : action.label}
    </Anchor>
  );
}
