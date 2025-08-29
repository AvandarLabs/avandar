// src/lib/ui/Icons/sourceBadge.tsx
import { Tooltip } from "@mantine/core";
import {
  IconBrandGoogle,
  IconFileTypeCsv,
  IconProps,
  IconTable,
} from "@tabler/icons-react";
import { match } from "ts-pattern";
import { DatasetSourceType } from "@/models/datasets/Dataset";

type TablerIconComponent = React.ComponentType<IconProps>;

// Accept e.g. "local_csv" | "google_sheets" | "airtable"
export function SourceBadge({
  sourceType,
  sourceName,
  size = 18,
}: {
  sourceType?: DatasetSourceType;
  sourceName?: string;
  size?: number;
}): JSX.Element | null {
  if (!sourceType) return null;

  const { Icon, tooltip } = match(sourceType)
    .with("local_csv", () => {
      return {
        Icon: IconFileTypeCsv as TablerIconComponent,
        tooltip: "From CSV",
      };
    })
    .with("google_sheets", () => {
      return {
        Icon: IconBrandGoogle as TablerIconComponent,
        tooltip: "From Google Sheets",
      };
    })
    // .with("airtable", () => {
    //   return {
    //     Icon: IconBrandAirtable as TablerIconComponent,
    //     tooltip: "From Airtable",
    //   };
    // })
    .otherwise(() => {
      return {
        Icon: IconTable as TablerIconComponent,
        tooltip: "From dataset",
      };
    });

  const label = sourceName ? `${tooltip} (${sourceName})` : tooltip;

  return (
    <Tooltip label={label} withArrow>
      <Icon size={size} />
    </Tooltip>
  );
}
