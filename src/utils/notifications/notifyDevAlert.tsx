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
          {messages.map((message) => {
            const strMsg = unknownToString(message, {
              prettifyObject: true,
            });

            // if the string contains newlines, then split them into multiple
            // separate Text components, and wrap in a Stack
            return strMsg.includes("\n") ?
                <Stack gap="xxs">
                  {strMsg.split("\n").map((line, lineIndex) => {
                    // the index is a stable key here: the list is a pure
                    // function of `strMsg` and is never reordered or mutated
                    return (
                      <Text key={lineIndex} span>
                        {expandTabsForHTML(line)}
                      </Text>
                    );
                  })}
                </Stack>
              : <Text span>{expandTabsForHTML(strMsg)}</Text>;
          })}
        </Stack>
      ),
      color: "red",
    });
  }
}
