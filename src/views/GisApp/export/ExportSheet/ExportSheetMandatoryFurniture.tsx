import type { ReactNode } from "react";

import { noop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Stack } from "@mantine/core";

/**
 * The three furniture rows the export can never omit: source attribution,
 * boundary disclaimer, and production date. Each stays `checked` and
 * `aria-disabled` but not `disabled`, so a screen-reader user can still
 * reach and learn about the constraint rather than have it silently
 * disappear (shell §9.4's "unavailable but reachable" pattern).
 */
export function ExportSheetMandatoryFurniture(): ReactNode {
  const { t } = useLingui();
  const rows = [
    t`Source attribution (Always included)`,
    t`Boundary disclaimer (Always included)`,
    t`Production date (Always included)`,
  ];

  return (
    <Stack gap={4}>
      {rows.map((label) => {
        return (
          <Checkbox
            key={label}
            label={label}
            checked
            aria-disabled
            onChange={noop}
          />
        );
      })}
    </Stack>
  );
}
