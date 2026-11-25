import { useT } from "@avandar/plugin-sdk";
import { SegmentedControl, Stack, Text } from "@avandar/plugin-ui";
import { useId } from "react";
import type { IncidenceBase } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type { ReactNode } from "react";

type Props = {
  base: IncidenceBase;
  onBaseChange: (base: IncidenceBase) => void;
};

/** The rate bases the user can pick, smallest first. */
const RATE_BASES: readonly IncidenceBase[] = [
  1_000, 10_000, 100_000, 1_000_000,
];

/**
 * The rate base picker: how many people the rate is expressed per, written
 * in the workspace's number format. `IncidenceForm` owns the value.
 */
export function RateBaseControl(props: Readonly<Props>): ReactNode {
  const t = useT();
  const labelId = useId();
  return (
    <Stack gap="xs">
      <Text id={labelId} size="sm" fw={500}>
        {t("incidence.base")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        value={String(props.base)}
        data={RATE_BASES.map((base) => {
          return {
            value: String(base),
            label: t("incidence.base.option", { base }),
          };
        })}
        onChange={(value) => {
          const base = RATE_BASES.find((rateBase) => {
            return String(rateBase) === value;
          });
          if (base !== undefined) {
            props.onBaseChange(base);
          }
        }}
      />
    </Stack>
  );
}
