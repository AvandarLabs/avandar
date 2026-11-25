import { EditableDisplayText } from "@avandar/ui";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { columns, NAME } from "../importFixtures";
import { SavedSourceActions } from "./SavedSourceActions";
import type { ReactNode } from "react";

const _noop = () => {};
/** Show the saved dataset name and the original fixture facts. */
export function SavedSourceHeader(): ReactNode {
  return (
    <AppViewHeader
      title={
        <EditableDisplayText
          name="dataset name"
          value={NAME}
          onChange={_noop}
          onSave={_noop}
          onCancel={_noop}
          isSaving={false}
          isSaveDisabled={false}
          minRows={1}
          maxRows={2}
          emptyDisplayText="Untitled dataset"
          displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
          fz="inherit"
          fw="inherit"
        />
      }
      facts={[
        "CSV file",
        "240 rows",
        `${columns.length} columns`,
        "Updated Oct 14, 2026",
      ]}
      actions={<SavedSourceActions />}
    />
  );
}
