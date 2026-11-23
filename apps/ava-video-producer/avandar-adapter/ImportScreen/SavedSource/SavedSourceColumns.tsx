import { ObjectDescriptionList } from "@avandar/ui";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { columns } from "../importFixtures";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";
/** Show the native editable column-description table over fixture metadata. */
export function SavedSourceColumns(): ReactNode {
  return (
    <AppViewSection title="Columns" meta={columns.length}>
      <ObjectDescriptionList
        data={columns}
        renderAsTable
        editable
        maxHeight={420}
        renderTableHeader={(key: string) => {
          return {
            name: "Name",
            dataType: "Type",
            description: "Description",
          }[key];
        }}
        itemRenderOptions={{
          includeKeys: ["name", "dataType", "description"],
          keyRenderOptions: {
            description: { renderAsType: "text" },
            dataType: {
              renderValue: (value: string) => {
                return avaDataTypeLabel(value as AvaDataType.T);
              },
            },
          },
        }}
        onSubmitChange={async () => {}}
      />
    </AppViewSection>
  );
}
