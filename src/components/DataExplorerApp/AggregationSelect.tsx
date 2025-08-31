import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";

type Props = {
  column: DatasetColumn;
  value: QueryAggregationType; // <-- add
  onChange: (aggregation: QueryAggregationType) => void;
};

export function AggregationSelect({
  column,
  value,
  onChange,
}: Props): JSX.Element {
  const looksMoneyName = (s: string) => {
    return /cost|price|amount|total|oop|charge|median|est/i.test(
      s.replace(/\u00A0/g, " ").toLowerCase(),
    );
  };

  const allowNumericAggs =
    column.dataType === "number" || looksMoneyName(column.name);

  const NUMERIC_OPTS: SelectData<QueryAggregationType> = [
    { value: "sum", label: "Sum" },
    { value: "avg", label: "Average" },
    { value: "max", label: "Max" },
    { value: "min", label: "Min" },
  ];

  const AGG_OPTS: SelectData<QueryAggregationType> = [
    { value: "none", label: "None" },
    ...(allowNumericAggs ? NUMERIC_OPTS : []),
    { value: "count", label: "Count" },
  ];

  return (
    <Select<QueryAggregationType>
      key={column.id}
      label={column.name}
      placeholder="Select aggregation"
      value={value} // <-- controlled
      data={AGG_OPTS}
      onChange={(v) => {
        if (v) onChange(v as QueryAggregationType);
      }}
    />
  );
}
