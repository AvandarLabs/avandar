import { EditableDisplayText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

type Props = {
  flow: CrosswalkFlow;
};

/**
 * The crosswalk's name as inline-editable text. A crosswalk that exists is
 * saved on rename. A new one keeps the name until its first save, which
 * happens when Choose datasets moves on to Map each dataset, so a new
 * crosswalk abandoned on step 1 leaves no row behind.
 */
export function CrosswalkNameField({ flow }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { draft } = flow.state;
  const [name, setName] = useState(draft.name);
  useEffect(() => {
    setName(draft.name);
  }, [draft.name]);

  return (
    <EditableDisplayText
      name={t`crosswalk name`}
      value={name}
      onChange={setName}
      onSave={(newName) => {
        const action = { type: "renamed", name: newName.trim() } as const;
        if (draft.isSaved) {
          void flow.dispatchAndSave(action);
          return;
        }
        flow.dispatch(action);
      }}
      onCancel={() => {
        setName(draft.name);
      }}
      isSaving={flow.isSaving}
      isSaveDisabled={name.trim().length === 0}
      emptyDisplayText={t`Untitled crosswalk`}
      displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
      fz="inherit"
      fw="inherit"
    />
  );
}
