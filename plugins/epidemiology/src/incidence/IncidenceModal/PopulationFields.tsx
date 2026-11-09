import { useT } from "@avandar/plugin-sdk";
import {
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@avandar/plugin-ui";
import { useId } from "react";
import type { PopulationInput } from "./IncidenceModal.types";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  value: PopulationInput;
  onChange: (value: PopulationInput) => void;
};

/**
 * Where the population comes from, a numeric column or a fixed number, and
 * the field for whichever is chosen. `IncidenceForm` owns the values.
 */
export function PopulationFields(props: Readonly<Props>): ReactNode {
  const { value, onChange } = props;
  const t = useT();
  const labelId = useId();
  return (
    <Stack gap="xs">
      <Text id={labelId} size="sm" fw={500}>
        {t("incidence.population")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        value={value.kind}
        data={[
          { value: "column", label: t("incidence.population.column") },
          { value: "fixed", label: t("incidence.population.fixed") },
        ]}
        onChange={(kind) => {
          onChange({ ...value, kind: kind === "fixed" ? "fixed" : "column" });
        }}
      />
      {value.kind === "column" ? (
        <Select
          label={t("incidence.populationColumn")}
          data={props.numericColumnNames}
          value={value.columnName}
          allowDeselect={false}
          onChange={(columnName) => {
            onChange({ ...value, columnName: columnName ?? value.columnName });
          }}
        />
      ) : (
        <NumberInput
          label={t("incidence.populationSize")}
          min={1}
          allowNegative={false}
          value={value.size}
          onChange={(size) => {
            onChange({ ...value, size });
          }}
        />
      )}
    </Stack>
  );
}
