import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PluginCapabilityInstall } from "../../PluginCapabilityInstall";
import { DEFAULT_INPUT } from "../../PluginCapabilityInstall.fixtures";
import { type Input } from "../../PluginCapabilityInstall.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(PluginCapabilityInstall, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const isInstalled = input.installation.choice === "install" && frame >= 90;
  return [
    input.copy.workspace,
    input.copy.records,
    input.copy.example,
    input.utility.fieldLabel,
    ...input.records.flatMap((row) => {
      return [
        ...(input.showRecordIds ? [row.id] : []),
        input.categories.find(propEq("id", row.categoryId))!.label,
      ];
    }),
    ...input.categories.map(prop("label")),
    ...(frame >= 12
      ? [
          input.utility.label,
          input.utility.operationLabel,
          input.installation.decisionLabel,
        ]
      : []),
    isInstalled
      ? input.copy.installed
      : input.installation.choice === "defer" && frame >= 56
        ? input.copy.deferred
        : input.copy.emptySocket,
    ...(isInstalled && frame >= 91 ? [input.copy.result] : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "categoryId", "choice"];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PluginCapabilityInstallTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
};
