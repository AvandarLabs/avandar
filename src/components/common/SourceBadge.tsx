import { Tooltip } from "@mantine/core";
import {
  IconBrandGoogle,
  IconFileTypeCsv,
  IconTable,
} from "@tabler/icons-react";
import { match } from "ts-pattern";
import { DatasetSourceType } from "@/models/datasets/Dataset";

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
        Icon: (props: React.ComponentProps<typeof IconFileTypeCsv>) => {
          return <IconFileTypeCsv {...props} color="#666" />;
        },
        tooltip: "From CSV",
      };
    })
    .with("google_sheets", () => {
      return {
        Icon: (props: React.ComponentProps<typeof IconBrandGoogle>) => {
          return <IconBrandGoogle {...props} color="#34a853" />;
        },
        tooltip: "From Google Sheets",
      };
    })
    .otherwise(() => {
      return {
        Icon: (props: React.ComponentProps<typeof IconTable>) => {
          return <IconTable {...props} color="#999" />;
        },
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
