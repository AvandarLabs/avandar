import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivateCaseConversation } from "../../PrivateCaseConversation";
import { DEFAULT_INPUT } from "../../PrivateCaseConversation.fixtures";
import { type Input } from "../../PrivateCaseConversation.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(PrivateCaseConversation, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "permissionId",
  "projectId",
  "role",
  "kind",
  "before",
  "after",
  "participantResponse",
  "partition",
  "symbol",
  "tallyArrangement",
];

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.example,
    input.requestLabel,
    input.roomLabels.meeting,
    input.copy.hold,
    ...input.people
      .filter((person) => {
        return (
          person.role !== "supporter" ||
          input.showWaitingSupporter ||
          frame < 96
        );
      })
      .map(prop("label")),
    ...(input.showWaitingSupporter || frame < 96
      ? [input.roomLabels.waiting, input.copy.acknowledgement]
      : []),
  ];
}

function _escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PrivateCaseConversationTestState = {
  render: _render,
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
};
