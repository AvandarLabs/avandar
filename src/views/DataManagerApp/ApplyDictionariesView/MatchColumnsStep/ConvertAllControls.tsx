import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, SegmentedControl, Text } from "@mantine/core";
import { useId } from "react";
import { isConvertingPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type {
  ApplyDictionariesAction,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { Dispatch, ReactNode } from "react";

type Props = {
  picks: Readonly<Record<string, ColumnPick>>;
  copy: ConversionCopy;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * Which option "For every column" shows: `convert` while every coded
 * column converts, `reference` while none does, and none for a mix or
 * when no column has codes.
 */
function _getAllModesValue(
  picks: Readonly<Record<string, ColumnPick>>,
): "convert" | "reference" | "" {
  const coded = Object.values(picks).filter((pick) => {
    return pick.codeListId !== undefined;
  });
  if (coded.length === 0) {
    return "";
  }
  if (coded.every(isConvertingPick)) {
    return "convert";
  }
  return coded.every((pick) => {
    return pick.mode === "reference";
  })
    ? "reference"
    : "";
}

/**
 * "For every column": Convert all, or attach every dictionary only as
 * reference. Choosing one sets every coded column; columns can differ
 * again afterwards, and then neither option shows as chosen. Convert all
 * is disabled, with its reason in the tooltip, when nothing can convert.
 */
export function ConvertAllControls({
  picks,
  copy,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  return (
    <Group gap="xs" wrap="nowrap">
      <Text id={labelId} size="sm" c="dimmed">
        <Trans>For every column</Trans>
      </Text>
      <SegmentedControl
        size="xs"
        aria-labelledby={labelId}
        value={_getAllModesValue(picks)}
        onChange={(value) => {
          dispatch({
            type: "set_all_modes",
            mode: value === "convert" ? "convert" : "reference",
          });
        }}
        data={[
          {
            value: "convert",
            disabled: copy.convertUnavailable !== undefined,
            label: (
              <Tooltip
                multiline
                maw={320}
                label={copy.convertUnavailable ?? copy.convertAllTooltip}
              >
                <span>{t`Convert all`}</span>
              </Tooltip>
            ),
          },
          {
            value: "reference",
            label: (
              <Tooltip multiline maw={320} label={copy.referenceAllTooltip}>
                <span>{t`Attach dictionaries only as references`}</span>
              </Tooltip>
            ),
          },
        ]}
      />
    </Group>
  );
}
