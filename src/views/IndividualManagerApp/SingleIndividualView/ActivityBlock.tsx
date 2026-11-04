import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Flex, Stack } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { notifyNotImplemented } from "@/utils/notifications/notifyNotImplemented";
import type { ReactNode } from "react";

/**
 * Note composer on a record, under the record page's Activity heading.
 * Notes are not saved yet.
 */
export function ActivityBlock(): ReactNode {
  const { t } = useLingui();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Highlight,
      Placeholder.configure({
        placeholder: t`Add a note`,
      }),
    ],
    content: "",
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        notifyNotImplemented();
      }}
    >
      <Stack gap="sm">
        <RichTextEditor editor={editor}>
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.BulletList />
              <RichTextEditor.Link />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>
        <Flex justify="flex-end">
          <Button type="submit" variant="light" size="compact-sm">
            <Trans>Add note</Trans>
          </Button>
        </Flex>
      </Stack>
    </form>
  );
}
