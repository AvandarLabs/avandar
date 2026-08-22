import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Select } from "@mantine/core";

type Props = {
  sourceCrs: number | undefined;
  onChange: (sourceCrs: number | undefined) => void;
};

const UTM_NORTH_CODES = [
  32628, 32629, 32630, 32631, 32632, 32633, 32634, 32635, 32636, 32637, 32638,
];
const UTM_SOUTH_CODES = [32733, 32734, 32735, 32736, 32737];
const PRESET_CODES = [4326, 3857, 4258, ...UTM_NORTH_CODES, ...UTM_SOUTH_CODES];

function _setCustomCrs(
  onChange: (sourceCrs: number | undefined) => void,
  value: string | number,
): void {
  if (value === "") {
    onChange(undefined);
    return;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    onChange(value);
  }
}

function _getPresetData(i18n: I18n): Array<{ value: string; label: string }> {
  return [
    { value: "4326", label: i18n._(msg`4326 - WGS 84`) },
    { value: "3857", label: i18n._(msg`3857 - Web Mercator`) },
    { value: "4258", label: i18n._(msg`4258 - ETRS89`) },
    ...UTM_NORTH_CODES.map((code) => {
      return {
        value: String(code),
        label: i18n._(msg`${code} - UTM north zone ${code - 32600}`),
      };
    }),
    ...UTM_SOUTH_CODES.map((code) => {
      return {
        value: String(code),
        label: i18n._(msg`${code} - UTM south zone ${code - 32700}`),
      };
    }),
  ];
}

/** Selects a common source CRS or accepts any positive EPSG integer. */
export function CrsOverrideField({ sourceCrs, onChange }: Props): ReactNode {
  const { i18n, t } = useLingui();
  const presetValue =
    sourceCrs !== undefined && PRESET_CODES.includes(sourceCrs)
      ? String(sourceCrs)
      : null;
  return (
    <>
      <Select
        label={t`Source CRS`}
        description={t`Leave empty when the geometry is already WGS 84.`}
        data={_getPresetData(i18n)}
        value={presetValue}
        clearable
        onChange={(value) => {
          onChange(value === null ? undefined : Number(value));
        }}
      />
      <NumberInput
        label={t`EPSG code`}
        description={t`Enter a positive integer for any CRS not listed above.`}
        value={sourceCrs ?? ""}
        min={1}
        step={1}
        allowDecimal={false}
        clampBehavior="blur"
        onChange={(value) => {
          _setCustomCrs(onChange, value);
        }}
      />
    </>
  );
}
