import { hasDefinedProps, isPlainObject } from "@avandar/utils";
import { Box } from "@mantine/core";
import { EditableDisplayTextActions } from "./EditableDisplayTextActions";
import { EditableDisplayTextMultilineInput } from "./EditableDisplayTextMultilineInput";
import { EditableDisplayTextSingleLineInput } from "./EditableDisplayTextSingleLineInput";
import type { EditableDisplayTextEditorProps as Props } from "./EditableDisplayTextEditor.types";

/** Input and actions shown while EditableDisplayText is being edited. */
export function EditableDisplayTextEditor({
  passThroughProps,
  ...props
}: Readonly<Props>): JSX.Element {
  const hasExplicitWidth =
    (!passThroughProps.textarea && hasDefinedProps(passThroughProps, "w")) ||
    (isPlainObject(passThroughProps.style) &&
      hasDefinedProps(passThroughProps.style, "width"));
  const shouldFillWidth = !passThroughProps.textarea && !hasExplicitWidth;
  return (
    <Box
      p="xs"
      bdrs="sm"
      bd="1px dashed var(--mantine-color-neutral-4)"
      bg="neutral.0"
      w={shouldFillWidth ? "100%" : undefined}
      maw="100%"
      miw={0}
    >
      {passThroughProps.textarea ? (
        <EditableDisplayTextMultilineInput
          {...props}
          passThroughProps={passThroughProps}
          shouldFillWidth={shouldFillWidth}
        />
      ) : (
        <EditableDisplayTextSingleLineInput
          {...props}
          passThroughProps={passThroughProps}
          shouldFillWidth={shouldFillWidth}
        />
      )}
      <EditableDisplayTextActions
        {...props}
        isTextarea={Boolean(passThroughProps.textarea)}
      />
    </Box>
  );
}
