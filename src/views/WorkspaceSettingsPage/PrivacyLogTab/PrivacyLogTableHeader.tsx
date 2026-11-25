import { Table } from "@mantine/core";

type Props = { labels: readonly string[] };

/** Column headers for the consent and clarification metadata tables. */
export function PrivacyLogTableHeader({
  labels,
}: Readonly<Props>): JSX.Element {
  return (
    <Table.Thead>
      <Table.Tr>
        {labels.map((label) => {
          return <Table.Th key={label}>{label}</Table.Th>;
        })}
      </Table.Tr>
    </Table.Thead>
  );
}
