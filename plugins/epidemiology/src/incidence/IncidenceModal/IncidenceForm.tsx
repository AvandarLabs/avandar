import { useT } from "@avandar/plugin-sdk";
import { Select, Stack, Text } from "@avandar/plugin-ui";
import { AddColumnsFooter } from "../../derivedColumns/AddColumnsFooter";
import { PopulationFields } from "./PopulationFields";
import { RateBaseControl } from "./RateBaseControl";
import { useIncidenceForm } from "./useIncidenceForm";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  initialCasesColumn: string;

  /** Undefined when the result has one numeric column. */
  initialPopulationColumn: string | undefined;
};

/**
 * The cases, population, and rate base fields, and the button that adds the
 * incidence columns. `IncidenceModal` renders it once the result has a
 * numeric column.
 */
export function IncidenceForm(props: Readonly<Props>): ReactNode {
  const t = useT();
  const form = useIncidenceForm(props);
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("incidence.description")}
      </Text>
      <Select
        label={t("incidence.casesColumn")}
        data={props.numericColumnNames}
        value={form.casesColumn}
        allowDeselect={false}
        onChange={(columnName) => {
          if (columnName !== null) {
            form.setCasesColumn(columnName);
          }
        }}
      />
      <PopulationFields
        numericColumnNames={props.numericColumnNames}
        value={form.populationInput}
        onChange={form.setPopulationInput}
      />
      <RateBaseControl base={form.base} onBaseChange={form.setBase} />
      <AddColumnsFooter
        buttonLabel={t("incidence.add")}
        errorText={
          form.errorMessage === undefined
            ? undefined
            : t("incidence.failed", { message: form.errorMessage })
        }
        isAdding={form.isAdding}
        isDisabled={form.isAddDisabled}
        onAdd={form.onAdd}
      />
    </Stack>
  );
}
