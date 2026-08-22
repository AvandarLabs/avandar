import { unknownToString } from "@avandar/utils";
import { Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

function expandTabsForHTML(str: string): string {
  // Replace all tab characters with four &nbsp;
  return str.replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0");
}

/**
 * An alert that should never go into production.
 *
 * This is a helper function intended as a placeholder during
 * development. It's useful to check that certain callbacks, such as
 * button clicks, are working.
 */
export function notifyDevAlert(...messages: unknown[]): void {
  if (import.meta.env?.DEV === true) {
    notifications.show({
      title: "Alert",
      message: (
        <Stack gap="xs">
          {/* the index is a stable key here and below: both lists are pure
              functions of the arguments, rendered once, never reordered */}
          {messages.map((message, messageIndex) => {
            const strMsg = unknownToString(message, {
              prettifyObject: true,
            });

            // if the string contains newlines, then split them into multiple
            // separate Text components, and wrap in a Stack
            return strMsg.includes("\n") ? (
              <Stack key={messageIndex} gap="xxs">
                {strMsg.split("\n").map((line, lineIndex) => {
                  return (
                    <Text key={lineIndex} span>
                      {expandTabsForHTML(line)}
                    </Text>
                  );
                })}
              </Stack>
            ) : (
              <Text key={messageIndex} span>
                {expandTabsForHTML(strMsg)}
              </Text>
            );
          })}
        </Stack>
      ),
      color: "red",
    });
  }
}
