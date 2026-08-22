import { useLingui } from "@lingui/react/macro";
import { Button, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import css from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.module.css";
import type { ReactNode } from "react";

type Props = { onBack: () => void };

/** Back control and title for the focused classification editor. */
export function ClassificationEditorHeader({ onBack }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.classificationEditorHeader}>
      <Button
        variant="subtle"
        onClick={onBack}
        leftSection={<IconArrowLeft size={14} />}
      >
        {t`Back`}
      </Button>
      <Title order={3}>{t`Classification`}</Title>
    </div>
  );
}
